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
import { recordRoutedHere, clearRoutedHere } from './routedHere.js';

const AUTO_ROUTE_CONFIDENCE = 0.85;
// Matches HINT_CHARS in api/dashboard/room-activity.js — the room digests are built there.
const HINT_CHARS = 200;
const ROUTE_TIMEOUT_MS = 8000;

const live = () => !!supabase || demoFixtureActive();
const bareSlug = (s) => (s && String(s).includes(':') ? String(s).split(':').pop() : String(s || ''));
const initialsOf = (s) => (String(s || '?').trim().slice(0, 2) || '?').toUpperCase();

// Recursively flatten a missions tree/list into flat candidate rows.
// hintMap: { "projectSlug:bareSlug" → preview string } for semantic context.
function flattenMissions(nodes, projectSlug, out, hintMap, activity) {
  for (const m of (nodes || [])) {
    if (!m) continue;
    const slug = bareSlug(m.slug || m.folder_name || m.id);
    // The tree these nodes come from (useProjectMissions) is folders on disk — it carries no
    // message data at all, so recency/preview have to be joined in from missionActivity.
    const act = (activity && activity[`${projectSlug}:${slug}`]) || null;
    if (slug) out.push({
      slug,
      project_slug: projectSlug,
      name: m.name || slug,
      last_message_at: m.last_message_at || (act && act.last_message_at) || 0,
      // room-activity's digest FIRST: hintMap and the tree node both carry a single line.
      hint: String((act && act.last_message_text) || (hintMap && hintMap[`${projectSlug}:${slug}`]) || m.last_message_text || '').trim().slice(0, HINT_CHARS),
    });
    if (Array.isArray(m.children) && m.children.length) flattenMissions(m.children, projectSlug, out, hintMap, activity);
  }
  return out;
}

// Build the compact candidate set + recent-room list the brain ranks against,
// straight from the data Home already holds in memory (no extra fetch).
// Attaches a short `hint` (recent message preview) to each project/mission so
// the router has semantic context beyond just the room name.
// `roomActivity` is /api/dashboard/room-activity's payload — { projects: {slug: {…}},
// missions: {"project:slug": {…}} } — and it is what makes ranking real. Home's own
// projectRooms only learn recency from supabase-status's `limit=100` message window, which
// on live data covered ONE project: without this overlay every candidate arrives at
// timestamp 0 with no hint, the router's recency sort is a no-op, and its top-18 cut falls
// alphabetically. Optional on purpose — if the fetch fails the composer still sends.
export function assembleCandidates(data, missionsByProject, roomActivity) {
  const actProjects = roomActivity?.projects || {};
  const actMissions = roomActivity?.missions || {};
  // Build a preview map for missions keyed by "projectSlug:bareSlug".
  // data.recent[] carries the normalised preview text for recently active rooms.
  const previewByMission = {};
  for (const r of (data?.recent || [])) {
    if (r.kind === 'mission' && (r.missionSlug || r.id)) {
      const bare = bareSlug(r.missionSlug || r.id);
      const proj = r.project || r.projectSlug || '';
      if (proj && bare) previewByMission[`${proj}:${bare}`] = String(r.preview || '').slice(0, 120);
    }
  }
  const projects = (data?.projects || []).map((p) => {
    const slug = p.slug || p.id;
    const act = actProjects[slug] || null;
    return {
      slug,
      name: p.name || p.slug || p.id,
      last_message_at: p.last_message_at || act?.last_message_at || 0,
      // last_message_text is the raw preview text on the projectRooms shape.
      // room-activity's digest FIRST: projectRooms only ever carries a single last line.
      hint: String(act?.last_message_text || p.last_message_text || '').trim().slice(0, HINT_CHARS),
    };
  }).filter((p) => p.slug);
  const agents = (data?.agents || []).map((a) => ({
    slug: a.id || a.slug,
    name: a.name || a.title || a.id,
  })).filter((a) => a.slug);
  const missions = [];
  // Recency from Home when it has it (that is the live poll, so it is fresher), but the HINT
  // always from room-activity. Home only ever knows a room's single last line, and a single
  // line is a lottery ticket as a description of what a room is about — letting it win here
  // would overwrite the multi-message digest with exactly the noise the digest exists to
  // survive. See room-activity.js for the day-3-reel case that proved it.
  const activity = {};
  for (const [k, v] of Object.entries(actMissions)) activity[k] = v;
  for (const [k, v] of Object.entries(data?.missionActivity || {})) {
    activity[k] = { ...v, last_message_text: actMissions[k]?.last_message_text || v.last_message_text };
  }
  for (const [projectSlug, nodes] of Object.entries(missionsByProject || {})) {
    flattenMissions(nodes, projectSlug, missions, previewByMission, activity);
  }
  const recent_rooms = (data?.recent || []).map((r) => {
    if (r.kind === 'mission') return { id: bareSlug(r.missionSlug || r.id), name: r.name, isMission: true, isProject: false, missionSlug: r.missionSlug || '', projectSlug: r.project || '' };
    if (r.kind === 'project') return { id: r.id || r.project, name: r.name, isMission: false, isProject: true, missionSlug: '', projectSlug: '' };
    return { id: r.agent || r.id, name: r.name, isMission: false, isProject: false, missionSlug: '', projectSlug: '' };
  }).filter((r) => r.id).slice(0, 6);
  return { candidates: { projects, missions, agents }, recent_rooms };
}

// Per-tab memo: the payload is edge-cached and describes "which rooms were active lately",
// so re-fetching it on every keystroke-to-send would be waste. Refreshed on a short TTL so
// a room the user just worked in still climbs the ranking within the same session.
const ACTIVITY_TTL_MS = 120000;
const ACTIVITY_TIMEOUT_MS = 2500;
let activityCache = { worldId: '', at: 0, value: null };

async function fetchRoomActivity(worldId) {
  const now = Date.now();
  if (activityCache.value && activityCache.worldId === worldId && (now - activityCache.at) < ACTIVITY_TTL_MS) {
    return activityCache.value;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ACTIVITY_TIMEOUT_MS);
  try {
    const res = await authFetch(`/api/dashboard/room-activity?client=${encodeURIComponent(worldId)}`, { signal: controller.signal });
    const value = res && res.ok ? await res.json() : null;
    if (value && (value.projects || value.missions)) {
      activityCache = { worldId, at: now, value };
      return value;
    }
    return null;
  } catch {
    return null;   // ranking degrades to Home's own data; the send still goes through
  } finally {
    clearTimeout(timer);
  }
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
    // authFetch only rejects on a network failure, so a 4xx/5xx resolves normally —
    // without this check the composer reports a successful seed for a message the room
    // never received.
    const res = await authFetch('/api/dashboard/supabase-messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res || !res.ok) return null;
    // The row's id is what makes the destination correctable: moving the message later
    // needs to know which row to retract from the room the router picked.
    const d = await res.json().catch(() => null);
    return { id: d?.message?.id || null };
  } catch { return null; }
}

export function useIntakeRoute({ worldId, onOpenRoom, data, missionsByProject }) {
  const [mode, setMode] = useState('idle');     // idle | routing | confirm | creating
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const pendingRef = useRef({ text: '', mode: 'work' });
  const inFlight = useRef(false);

  // `auto` marks a room CORNER chose rather than one the user picked. Only those leave a
  // routedHere record, so the room can name the destination and offer to move it — the
  // whole point being that an automatic choice is the one the user never got to see.
  const openAndSeed = useCallback(async (room, text, interactionMode, auto) => {
    onOpenRoom(room, worldId);
    // Carry the door's Work/Plan choice into the room's own composer.
    try { localStorage.setItem(`cv6.chatMode.${room.isMission ? bareSlug(room.missionSlug || room.id) : room.id}`, interactionMode === 'plan' ? 'plan' : 'work'); } catch { /* private mode */ }
    const seeded = await seedRoom(worldId, room, text, interactionMode);
    if (auto && seeded?.id) {
      recordRoutedHere({
        room, messageId: seeded.id, text, worldId,
        confidence: auto.confidence, reasoning: auto.reasoning, interactionMode,
      });
    } else {
      // A room the user chose supersedes any earlier automatic pick still on record.
      clearRoutedHere();
    }
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
      // Real per-room recency + last line for the router to rank on. Edge-cached, so this
      // is normally a few ms; capped short and swallowed on failure because a slow or dead
      // activity lookup must never hold up the user's send — worst case the router ranks
      // on what Home already had.
      const roomActivity = await fetchRoomActivity(worldId);
      const { candidates, recent_rooms } = assembleCandidates(data, missionsByProject, roomActivity);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ROUTE_TIMEOUT_MS);
      let decision = null;
      try {
        // authFetch resolves to a Response, NOT parsed JSON — it is a thin wrapper that
        // only attaches the bearer token. This await was being treated as the decision
        // object itself, so `decision.route`, `.target`, `.confidence` and `.proposal`
        // were ALL undefined on every send since the composer shipped: autoRoute could
        // never be true, and control fell straight through to the editable new-mission
        // draft with an empty proposal. The router was answering correctly the whole
        // time and nothing was reading it — the "it doesn't place the project properly,
        // it just takes a sentence from my prompt and attaches it randomly" report.
        // Verified against the live endpoint: the Response carried route "existing" with
        // a real target while the object the composer inspected was {}.
        const res = await authFetch('/api/dashboard/intake-route', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ client_id: worldId, message: body, interaction_mode: pendingRef.current.mode, last_room: readLastRoom(worldId), recent_rooms, candidates }),
        });
        decision = res && res.ok ? await res.json() : null;
      } finally { clearTimeout(timer); }

      const autoRoute = decision && (decision.route === 'continue' || decision.route === 'existing')
        && decision.target && decision.source === 'llm' && !decision.degraded
        && Number(decision.confidence) >= AUTO_ROUTE_CONFIDENCE;

      if (autoRoute) {
        const room = roomFromTarget(decision.target);
        if (room) {
          await openAndSeed(room, body, pendingRef.current.mode, { confidence: decision.confidence, reasoning: decision.reasoning });
          setMode('idle');
          return;
        }
      }

      if (decision && (decision.route === 'continue' || decision.route === 'existing') && decision.target) {
        // Matched an existing room but below the auto bar → confirm as a room pick
        // the user can accept or redirect (still no creation).
        toConfirm({ kind: 'existing', matchedRoom: decision.target, name: decision.target.name, reasoning: decision.reasoning || '', task_breakdown: [] }, '');
        return;
      }

      // route 'new' (or degraded/no-decision) → editable new-mission draft.
      // Server guarantees a non-verbatim name via synthesizeName; never use
      // firstWords(body) which would paste the raw user message as the title.
      const p = (decision && decision.proposal) || {};
      toConfirm({
        kind: p.kind === 'project' ? 'project' : 'mission',
        name: p.name || '',
        project_slug: p.project_slug || '',
        project_name: p.project_name || '',
        is_new_project: !!p.is_new_project,
        task_breakdown: Array.isArray(p.task_breakdown) ? p.task_breakdown : [],
        reasoning: (decision && decision.reasoning) || '',
      }, decision?.degraded ? 'offline' : '');
    } catch (e) {
      // Never lose the text: fall to the editable new-mission draft.
      // Leave name empty — the user will see "Name this work…" placeholder and type it.
      toConfirm({ kind: 'mission', name: '', project_slug: '', is_new_project: false, task_breakdown: [] }, 'offline');
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
      // Empty name so the user is prompted via the "Name this work…" placeholder.
      setProposal({ kind: 'mission', name: '', project_slug: '', is_new_project: false, task_breakdown: [] });
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
