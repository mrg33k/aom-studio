// cv6next — real Home data, shaped to wired/desktop/home.json + mobile/home.json.
// This is WIRING pulled from the existing dashboard plumbing (useDataPipe), NOT design.
// Returns { state, data } for the Home fill-in templates.
//
// Real sources today: agents + projects + the needs-you inbox (catchUp) all come
// from useDataPipe — the exact pipe the current dashboard already runs on. The
// conversation column's GOAL has no honest source yet (agent run goal/step/checklist
// is not exposed), so we bind it to honest empties (no fabricated steps/bullets)
// instead of leaving the design's sample text on screen. No fake data.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { getClientId, setClientIdFromUser } from '../../lib/clientConfig';
import { useCurrentUserSlug } from '../../hooks/useCurrentUserSlug';
import { useDataPipe } from '../../hooks/useDataPipe';

const TINTS = ['violet', 'accent', 'pink', 'teal', 'lime', 'amber'];

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

// agent status (online|working|running|blocked|needs_you|away|idle) -> contract enum
function agentStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'online' || v === 'live') return 'live';
  if (v === 'working' || v === 'running') return 'working';
  if (v === 'blocked' || v === 'needs_you' || v === 'needs you') return 'blocked';
  return 'ready';
}
function statusText(status, unread) {
  if (status === 'live') return unread ? `${unread} new` : 'online';
  if (status === 'working') return 'working';
  if (status === 'blocked') return 'needs you';
  return 'idle';
}
// project color (hex or css var) -> one of the 6 design tints, stable per name
function tintFor(seed) {
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
function cap(s) { const v = String(s || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; }
function firstLine(s) { return String(s || '').split('\n')[0].slice(0, 160); }
function relTime(ts) {
  if (!ts) return '';
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

export function shapeHome({ agents = [], projectRooms = [], inboxItems = [] } = {}) {
  const agentRooms = (agents || []).map((a) => {
    const status = agentStatus(a.status);
    return {
      id: a.id || a.slug, name: a.name || a.slug || 'Agent',
      status, statusText: statusText(status, a.unread), initials: initials(a.name || a.slug),
    };
  });
  const projects = (projectRooms || []).map((p) => ({
    id: p.id || p.slug, slug: p.slug, name: p.name || p.slug || 'Project',
    // no real item-count source on this list (tasks not loaded here) -> blank, not a fake 0.
    tint: tintFor(p.name || p.id), count: (p.tasks?.length || p.taskCount || '') || '',
  }));

  // inboxItems shape (from useDataPipe): { agent, project, missionSlug, roomKey, text, timestamp, id }.
  // Each is an unread agent message in a room — the "needs you" feed. The agent who
  // pinged is the sender; the room (project/mission/agent thread) is the subject.
  const cards = (inboxItems || []).map((it) => ({
    id: it.id,
    kind: 'agent', kindLabel: 'AGENT',
    from: cap(it.agent) || 'Your agent',
    subject: it.project ? cap(it.project) : (it.missionSlug || `${cap(it.agent)} thread`),
    summary: firstLine(it.text),
    time: relTime(it.timestamp),
    actionItems: [], attachments: [],
  }));

  const catchUp = {
    count: cards.length,
    position: cards.length ? 1 : 0,
    current: cards[0] || { id: '', kind: 'agent', kindLabel: 'AGENT', from: '', subject: '', summary: '', actionItems: [], attachments: [] },
    rest: cards.slice(1),
  };

  // agents/projects are bound BOTH as lists (data-each) and as `.count` /
  // `.moreCount` (data-bind), so the arrays carry those props (arrays are objects).
  agentRooms.count = agentRooms.length;
  projects.count = projects.length;
  projects.moreCount = 0;

  // honest convo column: real header off the first agent room, empty goal body.
  const lead = agentRooms[0] || { name: '', initials: '' };
  const data = {
    rooms: { total: agentRooms.length + projects.length },
    agents: agentRooms,
    projects,
    catchUp,
    room: { name: lead.name || 'Your rooms', initials: lead.initials || '·', count: '', statusText: '', project: '', mission: '' },
    goal: { title: lead.name ? `${lead.name} has no active goal thread yet` : 'Pick a room to see its goal', step: '', total: '', pct: 0, summary: [], checklist: [] },
  };

  let state = 'ready';
  if (!agentRooms.length && !projects.length && !cards.length) state = 'empty';
  return { state, data };
}

// The Home hook: resolve the viewer (auth -> worldId -> slug), feed the existing
// data pipe, and shape it. Mirrors how CornerVG seeds worldId so we ride the same
// auth-derived world (Patrik -> aom).
export function useHome() {
  const [currentUser, setCurrentUser] = useState(null);
  const [worldId, setWorldId] = useState(null);

  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    // setClientIdFromUser seeds the auth-derived world cache that getClientId()
    // reads — without it getClientId() returns null, useDataPipe never fetches, and
    // Home is stuck on the loading skeleton (the bug Patrik's screenshot caught).
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      if (data?.user) { setClientIdFromUser(data.user); setCurrentUser(data.user); setWorldId(getClientId()); }
    }).catch(() => {});
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return;
      if (session?.user) { setClientIdFromUser(session.user); setCurrentUser(session.user); setWorldId(getClientId()); }
      else { setCurrentUser(null); setWorldId(null); }
    });
    return () => { alive = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  const currentUserSlug = useCurrentUserSlug(currentUser, worldId);
  const { agents, projectRooms, inboxItems } = useDataPipe(null, worldId, currentUserSlug);

  // Memoize the shaped data so its identity is stable between renders (it only changes
  // when the underlying pipe arrays change). Without this, `data` was a new object every
  // render, so TemplateScreen reset the whole DOM on each data tick — rebuilding the room
  // list under the user's finger and making taps miss (the "can't open a chat" bug).
  const shaped = useMemo(() => shapeHome({ agents, projectRooms, inboxItems }), [agents, projectRooms, inboxItems]);
  const loading = !worldId || (!agents && !projectRooms && !inboxItems);
  return { state: loading ? 'loading' : shaped.state, data: shaped.data, worldId };
}

// ── Project-opened state (mobile Home state B): real missions for one project ──
const MISSION_STATUS = {
  running: 'live', building: 'live', active: 'live',
  queued: 'ready', planning: 'ready', classifying: 'ready', 'in-progress': 'ready', idle: 'ready',
  done: 'done', complete: 'done', completed: 'done',
};
function missionStatus(s) { return MISSION_STATUS[String(s || '').toLowerCase()] || 'ready'; }

export function shapeProjectState(project, missions) {
  const ms = (missions || []).map((m) => {
    const status = missionStatus(m.status);
    return {
      id: m.slug ? `/${m.slug}` : '', title: m.name || m.slug || 'Mission',
      agent: m.agent || '', status, statusLabel: status.toUpperCase(),
    };
  });
  return {
    project: { id: project?.id, name: project?.name || 'Project', missionCount: ms.length, tint: project?.tint || 'violet' },
    missions: ms,
  };
}

// Fetch missions per project from the existing missions-tree endpoint (the same one
// the CV4 home uses). Returns a { [projectSlug]: missions[] } map.
export function useProjectMissions(worldId) {
  const [byProject, setByProject] = useState({});
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    authFetch('/api/dashboard/missions-tree?client=' + encodeURIComponent(worldId), { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j || !Array.isArray(j.projects)) return;
        const next = {};
        for (const proj of j.projects) { if (proj?.slug) next[proj.slug] = proj.missions || []; }
        setByProject(next);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [worldId]);
  return byProject;
}
