// cv6next — real data for Command (activity dock + ledger) + Tracker (bug list).
// Command's activity dock = live Claude agent sessions (active_processes, heartbeat-backed).
// Command's ledger = rooms that had a message in the last 24h, with each room's latest line.
// The focused goal/checklist still has no honest structured source, so it binds to an honest
// summary (no invented steps). Tracker = the real CV6 bug tracker (/api/dashboard/cv6-bugs).
// No fake data.

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { getClientId, setClientIdFromUser } from '../../lib/clientConfig';
import { useCurrentUserSlug } from '../../hooks/useCurrentUserSlug';
import { useDataPipe } from '../../hooks/useDataPipe';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
const TINTS = ['violet', 'pink', 'teal', 'lime', 'amber', 'accent'];
function tintFor(seed) { let h = 0; for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TINTS[h % TINTS.length]; }
function titleCase(s) { return String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function cap(s) { const v = String(s || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; }
function firstLine(s) { return String(s || '').split('\n')[0]; }
function relTime(ts) {
  if (!ts) return '';
  const ms = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime());
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

// Resolve the viewer's world the same way Home does (auth -> world cache -> getClientId).
export function useWorldId() {
  const [worldId, setWorldId] = useState(null);
  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data?.user) return;
      setClientIdFromUser(data.user); setWorldId(getClientId());
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return worldId;
}

// ── Command: real live agent sessions (activity dock) + rooms active in 24h (ledger) ──
// For the aom world the dock is NOT empty: it shows every live Claude agent session
// (active_processes, heartbeat < 90s) and the ledger lists every room that had a message
// in the last 24h, with the room's latest line + who. No fake data; goal/watchers have no
// honest structured source yet, so they bind to honest placeholders, not invented steps.
const DAY_MS = 24 * 60 * 60 * 1000;

function shapeCommand({ sessions = [], projectRooms = [], lastByRoom = {} }) {
  // Activity dock = live agent sessions. Each is one running Claude session.
  const jobs = (sessions || []).map((s) => {
    const name = titleCase(s.agent);
    return {
      id: s.agent, kind: 'agent', title: name, shortTitle: name,
      sub: firstLine(s.task_text) || 'Active session', badge: 'LIVE',
    };
  });

  // Ledger = rooms active in the last 24h (project/mission rooms with a recent message).
  const now = Date.now();
  const liveAgents = new Set((sessions || []).map((s) => String(s.agent || '').toLowerCase()));
  const active = (projectRooms || [])
    .filter((p) => p.last_message_at && (now - p.last_message_at) <= DAY_MS)
    .sort((a, b) => b.last_message_at - a.last_message_at);

  const rooms = active.map((p) => {
    const last = lastByRoom[p.slug] || {};
    const setBy = cap(last.agent) || '';
    const live = last.agent && liveAgents.has(String(last.agent).toLowerCase());
    const status = live ? 'live' : 'ready';
    const line = firstLine(last.text).slice(0, 90);
    return {
      id: p.slug, name: p.name || titleCase(p.slug), tint: tintFor(p.name || p.slug),
      goal: line, setBy, age: relTime(p.last_message_at),
      status, statusLabel: status.toUpperCase(),
      goalShort: line.slice(0, 48),
    };
  });
  const liveCount = rooms.filter((r) => r.status === 'live').length;

  // Focused goal = honest summary of what's live right now (no fabricated checklist).
  const lead = sessions[0];
  const goal = lead
    ? { id: lead.agent, roomName: titleCase(lead.agent), tint: 'violet', status: 'live', statusLabel: 'LIVE',
        title: `${sessions.length} agent session${sessions.length > 1 ? 's' : ''} active`,
        driverLine: `${titleCase(lead.agent)} · ${firstLine(lead.task_text) || 'working'}`,
        stepCount: '', queueNote: '', checklist: [] }
    : { id: '', roomName: active[0]?.name || 'No active session', tint: 'violet', status: 'ready', statusLabel: '',
        title: active.length ? 'No agent sessions running right now' : 'Nothing active right now',
        driverLine: '', stepCount: '', queueNote: '', checklist: [] };

  return {
    ledger: { roomCount: rooms.length, liveCount, blockedCount: 0, rooms, others: rooms },
    activity: { count: jobs.length, jobs },
    goal,
    watchers: { activeCount: 0, list: [] },
  };
}

export function useCommand(worldIdArg) {
  const [currentUser, setCurrentUser] = useState(null);
  const [worldId, setWorldId] = useState(worldIdArg || null);
  const [sessions, setSessions] = useState([]);
  const [lastByRoom, setLastByRoom] = useState({});

  // Resolve the viewer + world the same way Home does so we ride the auth-derived world.
  useEffect(() => {
    if (worldIdArg) setWorldId(worldIdArg);
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data?.user) return;
      setClientIdFromUser(data.user); setCurrentUser(data.user); setWorldId(getClientId());
    }).catch(() => {});
    return () => { alive = false; };
  }, [worldIdArg]);

  const currentUserSlug = useCurrentUserSlug(currentUser, worldId);
  const { projectRooms } = useDataPipe(null, worldId, currentUserSlug);

  // Live agent sessions — poll the heartbeat-backed active-processes endpoint.
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => authFetch('/api/dashboard/active-agents?client=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setSessions(Array.isArray(d.active) ? d.active : []); })
      .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId]);

  // Latest line + who, per room, from the recent-messages feed (for the ledger rows).
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => authFetch('/api/dashboard/supabase-status?client=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || !Array.isArray(d.messages)) return;
        const map = {};
        for (const m of d.messages) {
          const key = m.project; if (!key || !m.timestamp) continue;
          const t = new Date(m.timestamp).getTime();
          if (!map[key] || t > map[key].t) map[key] = { t, text: m.text || '', agent: m.agent || '' };
        }
        setLastByRoom(map);
      })
      .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId]);

  const data = useMemo(() => shapeCommand({ sessions, projectRooms, lastByRoom }), [sessions, projectRooms, lastByRoom]);
  const state = worldId ? 'ready' : 'loading';
  return { state, data };
}

// ── Tracker: the real CV6 bug tracker ──
const BUG_STATUS = { open: 'open', 'in progress': 'progress', 'in-progress': 'progress', progress: 'progress', done: 'done', closed: 'done', resolved: 'done' };
function bugStatus(s) { return BUG_STATUS[String(s || '').toLowerCase()] || 'open'; }
function severityToPriority(sev) {
  const v = String(sev || '').toLowerCase();
  if (v === 'high' || v === 'critical' || v === '1' || v === '2') return 'high';
  if (v === 'low' || v === '4' || v === '5') return 'low';
  return 'med';
}
// The CV6 Bugs board is always present as a project tracker; it lives behind its own
// endpoint (cv6-bugs). User-created trackers come from /api/dashboard/trackers and persist.
const CV6_BOARD_ID = 'cv6';
// Space Rising is a second always-present board (read-only client ticket tracker behind
// admin-tickets). Its tickets render in OUR CV6 bug-card design.
const SPACE_BOARD_ID = 'space-rising';
const TICKET_STATUS = { needs_fix: 'open', working: 'progress', in_review: 'progress', done: 'done' };
const TICKET_STATUS_LABEL = { needs_fix: 'Needs fix', working: 'Working', in_review: 'In review', done: 'Done' };
function ticketPriority(p) {
  const v = String(p || '').toLowerCase();
  if (v === 'high' || v === 'urgent' || v === 'critical') return 'high';
  if (v === 'low') return 'low';
  return 'med';
}
function trackerShape(t, activeId) {
  return {
    id: t.id, name: t.name, scope: t.scope || '',
    count: t.count != null ? t.count : (Array.isArray(t.rows) ? t.rows.length : 0),
    dot: t.id === activeId ? 'success' : 'faint',
  };
}

export function useTrackerBugs(worldId) {
  const [bugs, setBugs] = useState([]);
  const [status, setStatus] = useState('loading');
  const [spaceTickets, setSpaceTickets] = useState([]);
  const [spaceStatus, setSpaceStatus] = useState('loading');
  const [customTrackers, setCustomTrackers] = useState([]);
  const [activeId, setActiveId] = useState(CV6_BOARD_ID);
  const [reloadKey, setReloadKey] = useState(0);

  // CV6 bug board.
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    setStatus('loading');
    authFetch('/api/dashboard/cv6-bugs').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!alive) return;
      const raw = Array.isArray(d?.bugs) ? d.bugs : [];
      setBugs(raw.map((b) => {
        const st = bugStatus(b.status);
        const pr = severityToPriority(b.severity);
        const owner = b.owner || '';
        return {
          id: b.id || '', title: b.title || b.page || 'Untitled',
          status: st, statusLabel: b.status || 'Open',
          priority: pr, priorityLabel: pr[0].toUpperCase() + pr.slice(1),
          assignee: owner, assigneeInitials: owner ? initials(owner) : '·',
          assigneeTint: tintFor(owner || b.id), updated: b.updated || '',
          mission: b.page || '', opened: '', description: b.expected || '',
          doneCount: '', stepCount: '', checklist: [],
        };
      }));
      setStatus(raw.length ? 'ready' : 'empty');
    }).catch(() => { if (alive) setStatus('error'); });
  }, [worldId]);

  // Space Rising ticket board (read-only, behind admin-tickets).
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    setSpaceStatus('loading');
    authFetch('/api/dashboard/admin-tickets').then((r) => (r && r.ok ? r.json() : null)).then((d) => {
      if (!alive) return;
      const raw = Array.isArray(d?.tickets) ? d.tickets : [];
      setSpaceTickets(raw.map((t) => {
        const key = String(t.status || 'needs_fix').toLowerCase();
        const st = TICKET_STATUS[key] || 'open';
        const pr = ticketPriority(t.priority);
        const owner = t.owner || '';
        return {
          id: t.id != null ? String(t.id) : '', title: t.title || 'Untitled',
          status: st, statusLabel: TICKET_STATUS_LABEL[key] || (t.status || 'Open'),
          priority: pr, priorityLabel: pr[0].toUpperCase() + pr.slice(1),
          assignee: owner, assigneeInitials: owner ? initials(owner) : '·',
          assigneeTint: tintFor(owner || String(t.id)), updated: relTime(t.updatedAt),
          mission: t.area || 'Space Rising', opened: '', description: t.description || '',
          doneCount: '', stepCount: '', checklist: [],
        };
      }));
      setSpaceStatus(raw.length ? 'ready' : 'empty');
    }).catch(() => { if (alive) setSpaceStatus('error'); });
    return () => { alive = false; };
  }, [worldId]);

  // User-created custom trackers (persisted). Refetched after a create.
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    authFetch('/api/dashboard/trackers?world=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setCustomTrackers(Array.isArray(d.trackers) ? d.trackers : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [worldId, reloadKey]);

  // Switch which tracker the List is showing.
  const switchTracker = (id) => setActiveId(id || CV6_BOARD_ID);
  // Create a tracker for real, then refetch + switch to it. The new-tracker form is
  // uncontrolled in the component (so typing isn't wiped on a re-bind); kind is passed in.
  const createTracker = async ({ name, scope, kind }) => {
    const k = kind === 'mission' ? 'mission' : 'project';
    try {
      const r = await authFetch('/api/dashboard/trackers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', world: worldId, name, scope, template: k }),
      });
      const d = r && r.ok ? await r.json() : null;
      setReloadKey((n) => n + 1);
      if (d?.tracker?.id) setActiveId(d.tracker.id);
      return d?.tracker || null;
    } catch { return null; }
  };

  const open = bugs.filter((b) => b.status !== 'done');
  const spaceOpen = spaceTickets.filter((b) => b.status !== 'done');
  const cv6Board = { id: CV6_BOARD_ID, name: 'CV6 Bugs', scope: 'Corner CV6', count: open.length };
  const spaceBoard = { id: SPACE_BOARD_ID, name: 'Space Rising', scope: 'Space Rising', count: spaceOpen.length };
  const projectCustom = customTrackers.filter((t) => t.template !== 'mission');
  const missionCustom = customTrackers.filter((t) => t.template === 'mission');
  const projectTrackers = [cv6Board, spaceBoard, ...projectCustom].map((t) => trackerShape(t, activeId));
  const missionTrackers = missionCustom.map((t) => trackerShape(t, activeId));

  // Resolve the active tracker + the bugs it shows. The CV6 and Space Rising boards have real
  // bug-shaped rows; a freshly-created custom tracker is an honest empty board.
  const activeCustom = customTrackers.find((t) => t.id === activeId);
  const showingCv6 = activeId === CV6_BOARD_ID;
  const showingSpace = activeId === SPACE_BOARD_ID;
  let activeTracker, listBugs, listState;
  if (showingCv6) {
    activeTracker = { id: CV6_BOARD_ID, name: 'CV6 Bugs', scope: 'Corner CV6', openCount: open.length };
    listBugs = bugs; listState = status;
  } else if (showingSpace) {
    activeTracker = { id: SPACE_BOARD_ID, name: 'Space Rising', scope: 'Space Rising', openCount: spaceOpen.length };
    listBugs = spaceTickets; listState = spaceStatus;
  } else {
    activeTracker = { id: activeId, name: activeCustom?.name || 'Tracker', scope: activeCustom?.scope || '', openCount: Array.isArray(activeCustom?.rows) ? activeCustom.rows.length : 0 };
    listBugs = []; listState = 'empty';
  }

  const data = {
    projectTrackers, missionTrackers, activeTracker,
    // Default draft state; the new-tracker form is uncontrolled (name/scope/kind read from
    // the DOM at create time), so this only seeds the initial Project selection.
    draftTracker: { name: '', scope: '', kind: 'project', isProject: 'on', isMission: 'off' },
    bugs: listBugs,
    featuredBug: listBugs[0] ? { ...listBugs[0], agentStep: '', agentTotal: '', attachments: [] } : { id: '', title: '', attachments: [] },
    attachments: { count: 0, list: [] },
    agent: { name: '', initials: '·', tint: 'violet', step: '', total: '', pct: 0, pctLabel: '', checklist: [] },
    loading: { label: 'Loading the tracker…' },
    empty: { title: 'No bugs in this tracker', body: 'Nothing logged yet. New issues land here.', actionLabel: '' },
    error: { title: "Couldn't load the tracker", body: 'Your connection dropped. Nothing was lost.', code: 'tracker · retry' },
  };
  return { state: listState, data, switchTracker, createTracker };
}
