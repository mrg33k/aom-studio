// useIntakeRoute — the front-door composer's brain-to-room wiring.
// corner:front-door Stage 3.
//
// Flow: the user types a task at the front door and sends. We ask the routing
// brain (/api/dashboard/intake-route) where it belongs, then:
//   continue|existing (and confident) → open that room + post the text.
//   new (or low-confidence / degraded) → show an EDITABLE confirm; nothing is
//   created or sent until the user commits. (M14: creation always confirms.)
//
// Nothing the user typed is ever lost: the composer text is only cleared on a
// successful open+seed; every failure path lands in the editable confirm with
// the text preserved.

import { useCallback, useRef, useState } from 'react';
import { authFetch } from '../../lib/authFetch';
import { supabase } from '../../lib/supabase.js';
import { demoFixtureActive } from '../../lib/fixtureClient.js';
import { createMissionInProject, createProjectFromHome } from './useHomeData.js';

const AUTO_ROUTE_CONFIDENCE = 0.85;
const ROUTE_TIMEOUT_MS = 8000;

const live = () => !!supabase || demoFixtureActive();
const bareSlug = (s) => (s && String(s).includes(':') ? String(s).split(':').pop() : String(s || ''));
const initialsOf = (s) => (String(s || '?').trim().slice(0, 2) || '?').toUpperCase();
const firstWords = (s, n = 6) => String(s || '').trim().split(/\s+/).slice(0, n).join(' ');

// Recursively flatten a missions tree/list into flat candidate rows.
function flattenMissions(nodes, projectSlug, out) {
  for (const m of (nodes || [])) {
    if (!m) continue;
    const slug = bareSlug(m.slug || m.folder_name || m.id);
    if (slug) out.push({ slug, project_slug: projectSlug, name: m.name || slug, last_message_at: m.last_message_at || 0 });
    if (Array.isArray(m.children) && m.children.length) flattenMissions(m.children, projectSlug, out);
  }
  return out;
}

// Build the compact candidate set + recent-room list the brain ranks against,
// straight from the data Home already holds in memory (no extra fetch).
export function assembleCandidates(data, missionsByProject) {
  const projects = (data?.projects || []).map((p) => ({
    slug: p.slug || p.id,
    name: p.name || p.slug || p.id,
    last_message_at: p.last_message_at || 0,
  })).filter((p) => p.slug);
  const agents = (data?.agents || []).map((a) => ({
    slug: a.id || a.slug,
    name: a.name || a.title || a.id,
  })).filter((a) => a.slug);
  const missions = [];
  for (const [projectSlug, nodes] of Object.entries(missionsByProject || {})) {
    flattenMissions(nodes, projectSlug, missions);
  }
  const recent_rooms = (data?.recent || []).map((r) => {
    if (r.kind === 'mission') return { id: bareSlug(r.missionSlug || r.id), name: r.name, isMission: true, isProject: false, missionSlug: r.missionSlug || '', projectSlug: r.project || '' };
    if (r.kind === 'project') return { id: r.id || r.project, name: r.name, isMission: false, isProject: true, missionSlug: '', projectSlug: '' };
    return { id: r.agent || r.id, name: r.name, isMission: false, isProject: false, missionSlug: '', projectSlug: '' };
  }).filter((r) => r.id).slice(0, 6);
  return { candidates: { projects, missions, agents }, recent_rooms };
}

function readLastRoom(worldId) {
  try {
    const saved = JSON.parse(localStorage.getItem('cv6.lastRoom') || 'null');
    if (!saved?.room?.id) return null;
    if (saved.worldId && worldId && saved.worldId !== worldId) return null;
    return saved.room;
  } catch { return null; }
}

// Map the brain's `target` (already the canonical room shape) into the room
// object onOpenRoom + useRoomThread expect.
function roomFromTarget(t) {
  if (!t) return null;
  if (t.isMission) return { id: bareSlug(t.missionSlug || t.id), name: t.name, initials: initialsOf(t.name), isMission: true, missionSlug: t.missionSlug || `${t.projectSlug}:${bareSlug(t.id)}`, projectSlug: t.projectSlug, status: 'ready', statusText: '' };
  if (t.isProject) return { id: t.id, name: t.name, initials: initialsOf(t.name), isProject: true, status: 'ready', statusText: 'project chat' };
  return { id: t.id, name: t.name, initials: initialsOf(t.name), status: 'ready' };
}

// Post the user's text into a room with the correct scope + Work/Plan mode,
// replicating useRoomThread.send's payloads so the room's poll surfaces it.
async function seedRoom(worldId, room, text, interactionMode) {
  if (!live()) return true; // read-only/local: opening the room is enough
  const mode = interactionMode === 'plan' ? 'plan' : 'work';
  const payload = room.isMission
    ? { client_id: worldId, agent: 'corner', project: room.projectSlug, text, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: String(room.missionSlug || room.id || ''), interaction_mode: mode } }
    : room.isProject
      ? { client_id: worldId, agent: 'corner', project: room.id, text, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: mode } }
      : { client_id: worldId, agent: room.id, text, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: mode } };
  try {
    await authFetch('/api/dashboard/supabase-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    return true;
  } catch { return false; }
}

export function useIntakeRoute({ worldId, onOpenRoom, data, missionsByProject }) {
  const [mode, setMode] = useState('idle');     // idle | routing | confirm | creating
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const pendingRef = useRef({ text: '', mode: 'work' });
  const inFlight = useRef(false);

  const openAndSeed = useCallback(async (room, text, interactionMode) => {
    onOpenRoom(room, worldId);
    // Carry the door's Work/Plan choice into the room's own composer.
    try { localStorage.setItem(`cv6.chatMode.${room.isMission ? bareSlug(room.missionSlug || room.id) : room.id}`, interactionMode === 'plan' ? 'plan' : 'work'); } catch { /* private mode */ }
    await seedRoom(worldId, room, text, interactionMode);
  }, [onOpenRoom, worldId]);

  // Drop into the editable confirm with a proposal (never loses the text).
  const toConfirm = useCallback((prop, reason) => {
    setProposal(prop);
    setError(reason || '');
    setMode('confirm');
  }, []);

  const submit = useCallback(async (text, interactionMode) => {
    const body = String(text || '').trim();
    if (!body || inFlight.current) return;
    inFlight.current = true;
    pendingRef.current = { text: body, mode: interactionMode === 'plan' ? 'plan' : 'work' };
    setError('');
    setMode('routing');
    try {
      const { candidates, recent_rooms } = assembleCandidates(data, missionsByProject);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);
      let decision = null;
      try {
        decision = await authFetch('/api/dashboard/intake-route', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ client_id: worldId, message: body, interaction_mode: pendingRef.current.mode, last_room: readLastRoom(worldId), recent_rooms, candidates }),
        });
      } finally { clearTimeout(timer); }

      const autoRoute = decision && (decision.route === 'continue' || decision.route === 'existing')
        && decision.target && decision.source === 'llm' && !decision.degraded
        && Number(decision.confidence) >= AUTO_ROUTE_CONFIDENCE;

      if (autoRoute) {
        const room = roomFromTarget(decision.target);
        if (room) { await openAndSeed(room, body, pendingRef.current.mode); setMode('idle'); return; }
      }

      if (decision && (decision.route === 'continue' || decision.route === 'existing') && decision.target) {
        // Matched an existing room but below the auto bar → confirm as a room pick
        // the user can accept or redirect (still no creation).
        toConfirm({ kind: 'existing', matchedRoom: decision.target, name: decision.target.name, reasoning: decision.reasoning || '', task_breakdown: [] }, '');
        return;
      }

      // route 'new' (or degraded/no-decision) → editable new-mission draft.
      const p = (decision && decision.proposal) || {};
      toConfirm({
        kind: p.kind === 'project' ? 'project' : 'mission',
        name: p.name || firstWords(body),
        project_slug: p.project_slug || '',
        project_name: p.project_name || '',
        is_new_project: !!p.is_new_project,
        task_breakdown: Array.isArray(p.task_breakdown) ? p.task_breakdown : [],
        reasoning: (decision && decision.reasoning) || '',
      }, decision?.degraded ? 'offline' : '');
    } catch (e) {
      // Never lose the text: fall to the editable new-mission draft.
      toConfirm({ kind: 'mission', name: firstWords(body), project_slug: '', is_new_project: false, task_breakdown: [] }, 'offline');
    } finally {
      inFlight.current = false;
    }
  }, [data, missionsByProject, worldId, openAndSeed, toConfirm]);

  // Commit from the editable confirm. `decision` is one of:
  //   { type:'existing', room }                    — open a room the user picked
  //   { type:'create-mission', projectSlug, name } — create a mission, open, seed
  //   { type:'create-project', name }              — create a project, open, seed
  const commitNew = useCallback(async (decision) => {
    const { text, mode: pmode } = pendingRef.current;
    if (!text) { setMode('idle'); return; }
    setError('');
    if (decision?.type === 'to-new') {
      // User rejected the matched room — offer an editable new-mission draft.
      setProposal({ kind: 'mission', name: firstWords(text), project_slug: '', is_new_project: false, task_breakdown: [] });
      setMode('confirm');
      return;
    }
    if (decision?.type === 'existing' && decision.room) {
      const room = decision.room.isMission || decision.room.isProject || decision.room.id ? decision.room : roomFromTarget(decision.room);
      await openAndSeed(room, text, pmode);
      setMode('idle'); setProposal(null); return;
    }
    setMode('creating');
    try {
      if (decision?.type === 'create-project') {
        const d = await createProjectFromHome({ worldId, name: decision.name, about: '' });
        const slug = d?.slug;
        if (!d?.ok || !slug) throw new Error('project create failed');
        const room = { id: slug, name: d.name || decision.name, initials: initialsOf(decision.name), isProject: true, status: 'ready', statusText: 'project chat' };
        await openAndSeed(room, text, pmode);
      } else {
        // create-mission (default)
        const projectSlug = decision.projectSlug;
        if (!projectSlug) throw new Error('pick a project');
        const d = await createMissionInProject({ worldId, projectSlug, title: decision.name, goal: '' });
        const missionBare = d?.mission_slug;
        if (!d?.ok || !missionBare) throw new Error('mission create failed');
        const missionSlug = `${d.parent_slug || projectSlug}:${missionBare}`;
        const room = { id: missionBare, name: d.name || decision.name, initials: initialsOf(decision.name), isMission: true, missionSlug, projectSlug: d.parent_slug || projectSlug, status: 'ready', statusText: '' };
        await openAndSeed(room, text, pmode);
      }
      setMode('idle'); setProposal(null);
    } catch (e) {
      setError(String(e.message || e));
      setMode('confirm'); // keep the draft; text still preserved
    }
  }, [worldId, openAndSeed]);

  const reset = useCallback(() => { setMode('idle'); setProposal(null); setError(''); pendingRef.current = { text: '', mode: 'work' }; }, []);

  return { mode, proposal, error, pendingText: pendingRef.current.text, submit, commitNew, reset };
}
