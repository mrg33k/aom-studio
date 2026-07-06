// cv6next — real data for Command (activity dock + ledger) + Tracker (bug list).
// Command's activity dock = live Claude agent sessions (active_processes, heartbeat-backed).
// Command's ledger = rooms that had a message in the last 24h, with each room's latest line.
// The focused goal/checklist still has no honest structured source, so it binds to an honest
// summary (no invented steps). Tracker = the real CV6 bug tracker (/api/dashboard/cv6-bugs).
// No fake data.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { getClientId, setClientIdFromUser } from '../../lib/clientConfig';
import { useCurrentUserSlug } from '../../hooks/useCurrentUserSlug';
import { useDataPipe } from '../../hooks/useDataPipe';
import { titleForAgent } from './agentTitles.js';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
// An array that also carries a `.count` prop, for designs that bind both
// `data-each="x"` (iterate the rows) and `x.count` (a header count) on one path.
function withCount(arr, count) { const a = Array.isArray(arr) ? arr.slice() : []; a.count = count; return a; }
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

// The goal-detail loop view is REAL now (corner:corner-ui-cv6:command, 2026-07-01):
// the checklist is the focused room's room-goal-steps (the same per-room plan the
// Chat goal thread reads/writes) and the watchers rail is the master loop's
// per-room autopilot state from room-goals — the toggle arms/disarms the loop for
// that room via room-autopilot (master-loop-tick.py honors it). No SAMPLE data.

// Map a step list to the template's checklist rows. One active row max, and only
// when an agent is actually live (same guardrail as the Chat goal thread).
function checklistFromSteps(steps, live) {
  let activeAssigned = false;
  return (steps || []).map((s) => {
    let state = 'queued';
    let tag = s.proposed ? 'Proposed' : 'Queued';
    if (s.done) { state = 'done'; tag = 'Done'; }
    else if (live && !activeAssigned) { state = 'active'; tag = 'Running'; activeAssigned = true; }
    return { label: s.text || '', tag, state };
  });
}

const bareKey = (s) => String(s || '').split(':').pop().trim() || String(s || '');

function shapeCommand({ sessions = [], projectRooms = [], lastByRoom = {}, goalRooms = {}, focusSteps = [], focusKey = '' }) {
  // Activity dock = live agent sessions. Each is one running Claude session.
  const jobs = (sessions || []).map((s) => {
    const name = titleForAgent(s.agent);
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
    const setBy = last.agent ? titleForAgent(last.agent) : '';
    const live = last.agent && liveAgents.has(String(last.agent).toLowerCase());
    const status = live ? 'live' : 'ready';
    const line = firstLine(last.text).slice(0, 90);
    // "CURRENT GOAL" must show a goal, not the room's last chat line dressed up as one
    // (loop R8). Real goal from the goal ledger when the room has one; otherwise an
    // honest muted fallback the CSS de-emphasizes (is-fallback).
    const grEntry = goalRooms[p.slug] || (Object.entries(goalRooms).find(([k]) => bareKey(k) === p.slug) || [])[1];
    const realGoal = firstLine(String((grEntry && grEntry.goal) || '')).slice(0, 90);
    const goalText = realGoal || (line ? `Last activity — ${line}` : 'No goal set');
    return {
      id: p.slug, name: p.name || titleCase(p.slug), tint: tintFor(p.name || p.slug),
      goal: goalText, goalKind: realGoal ? 'goal' : 'fallback',
      setBy, age: relTime(p.last_message_at),
      status, statusLabel: status.toUpperCase(),
      goalShort: goalText.slice(0, 48),
    };
  });
  const liveCount = rooms.filter((r) => r.status === 'live').length;

  // Focused goal: the loop's real goal for the focused room (lead agent session,
  // else the most recently active room), with its real step checklist.
  const lead = sessions[0];
  const focusGoal = goalRooms[focusKey] || goalRooms[bareKey(focusKey)] || null;
  const live = Boolean(lead);
  const checklist = checklistFromSteps(focusSteps, live);
  const doneCount = checklist.filter((c) => c.state === 'done').length;
  const openQuestions = Object.values(goalRooms).filter((r) => r && r.open_question).length;

  const goal = lead
    ? { id: lead.agent, roomName: titleForAgent(lead.agent), tint: 'violet', status: 'live', statusLabel: 'LIVE',
        title: focusGoal?.goal || `${sessions.length} agent session${sessions.length > 1 ? 's' : ''} active`,
        driverLine: `${titleForAgent(lead.agent)} · ${firstLine(lead.task_text) || 'working'}` }
    : { id: active[0]?.slug || '', roomName: active[0]?.name || 'No active session', tint: 'violet', status: 'ready', statusLabel: '',
        title: focusGoal?.goal || (active.length ? 'No agent sessions running right now' : 'Nothing active right now'),
        driverLine: focusGoal?.status ? `Loop · ${focusGoal.status}` : '' };
  goal.stepCount = checklist.length ? `${doneCount}/${checklist.length}` : '0';
  goal.queueNote = openQuestions ? `${openQuestions} open question${openQuestions > 1 ? 's' : ''} for you` : 'queue clear';
  goal.checklist = checklist;

  // Watchers = the master loop's per-room autopilot state. Toggling is wired to
  // room-autopilot (real: master-loop-tick.py reads the flag). Rooms the loop
  // tracks appear here; 'on' means the loop keeps pushing that room by itself.
  const watcherRows = Object.entries(goalRooms)
    .filter(([, r]) => r && (r.goal || r.status))
    .sort(([, a], [, b]) => String(b.last_reviewed || '').localeCompare(String(a.last_reviewed || '')))
    .slice(0, 6)
    .map(([key, r]) => {
      const name = titleCase(bareKey(key).replace(/^agent:/, ''));
      const on = r.autopilot !== false; // absent/true = loop default ON (matches master-loop-tick)
      // Sub-label must agree with the toggle (loop R8): an off row saying "active"
      // (the goal-store status) read as a contradiction next to its off switch.
      return {
        id: key, name, role: on ? `Master loop · ${r.status || 'tracked'}` : 'Master loop · off',
        initials: name.slice(0, 2).toUpperCase(), tint: tintFor(name), on: on ? 'on' : 'off',
      };
    });
  watcherRows.activeCount = watcherRows.filter((w) => w.on === 'on').length;

  return {
    ledger: { roomCount: rooms.length, liveCount, blockedCount: 0, rooms, others: rooms },
    activity: { count: jobs.length, jobs },
    goal,
    watchers: watcherRows,
  };
}

export function useCommand(worldIdArg) {
  const [currentUser, setCurrentUser] = useState(null);
  const [worldId, setWorldId] = useState(worldIdArg || null);
  const [sessions, setSessions] = useState([]);
  const [lastByRoom, setLastByRoom] = useState({});
  // corner:corner-ui-cv6 (2026-06-24): bail out of setState when a poll returns
  // byte-identical data (the common case). Without this, every 5s/15s tick creates
  // a fresh array/object reference and re-renders the whole command surface even
  // when nothing changed — main-thread churn Patrik felt as slow load. We keep the
  // last serialized snapshot per poll and skip the setter when it matches.
  const sessionsSig = useRef('');
  const lastByRoomSig = useRef('');

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
      .then((d) => {
        if (!alive || !d) return;
        const next = Array.isArray(d.active) ? d.active : [];
        const sig = JSON.stringify(next);
        if (sig === sessionsSig.current) return; // unchanged — skip the re-render
        sessionsSig.current = sig; setSessions(next);
      })
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
        const sig = JSON.stringify(map);
        if (sig === lastByRoomSig.current) return; // unchanged — skip the re-render
        lastByRoomSig.current = sig; setLastByRoom(map);
      })
      .catch(() => {});
    load();
    // corner:corner-ui-cv6 (2026-06-24): this poll pulls the FULL supabase-status
    // payload (agents/projects/tasks/messages) only to derive the latest line per
    // room for the ledger. That does not need 15s freshness — 60s matches useDataPipe
    // and cuts this heavy fetch 4x. Combined with the unchanged-data bailout above,
    // the command surface now re-renders only on a real change. Part of the load fix.
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId]);

  // The loop's per-room goal memory (goal ledger) — 60s cadence like the ledger feed.
  const [goalRooms, setGoalRooms] = useState({});
  const goalRoomsSig = useRef('');
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => authFetch('/api/dashboard/room-goals?world=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || typeof d.rooms !== 'object') return;
        const sig = JSON.stringify(d.rooms);
        if (sig === goalRoomsSig.current) return;
        goalRoomsSig.current = sig; setGoalRooms(d.rooms || {});
      })
      .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId]);

  // The focused room's real step checklist (same store the Chat goal thread uses).
  const focusKey = sessions[0] ? `agent:${sessions[0].agent}` : (projectRooms || [])
    .filter((p) => p.last_message_at)
    .sort((a, b) => b.last_message_at - a.last_message_at)[0]?.slug || '';
  const [focusSteps, setFocusSteps] = useState([]);
  useEffect(() => {
    if (!worldId || !focusKey) { setFocusSteps([]); return undefined; }
    let alive = true;
    const load = () => authFetch(`/api/dashboard/room-goal-steps?world=${encodeURIComponent(worldId)}&room=${encodeURIComponent(focusKey)}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setFocusSteps(Array.isArray(d.list) ? d.list : []); })
      .catch(() => {});
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId, focusKey]);

  // Arm/disarm the master loop for a room (the watchers toggle). Optimistic; the
  // 60s goal poll reconciles to the file the daemon actually reads.
  const toggleWatcher = useCallback(async (key) => {
    if (!worldId || !key) return;
    const cur = goalRooms[key] || goalRooms[String(key).split(':').pop()] || {};
    const next = cur.autopilot === false;
    setGoalRooms((g) => ({ ...g, [key]: { ...(g[key] || {}), autopilot: next } }));
    try {
      await authFetch('/api/dashboard/room-autopilot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, slug: key, on: next }),
      });
    } catch { /* poll reconciles */ }
  }, [worldId, goalRooms]);

  const data = useMemo(
    () => shapeCommand({ sessions, projectRooms, lastByRoom, goalRooms, focusSteps, focusKey }),
    [sessions, projectRooms, lastByRoom, goalRooms, focusSteps, focusKey],
  );
  const state = worldId ? 'ready' : 'loading';
  return { state, data, toggleWatcher };
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
  const [currentUser, setCurrentUser] = useState(null);

  // Resolve the viewer for the data pipe (gives us the assignable-agents list).
  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive && data?.user) { setClientIdFromUser(data.user); setCurrentUser(data.user); }
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const currentUserSlug = useCurrentUserSlug(currentUser, worldId);
  const { agents } = useDataPipe(null, worldId, currentUserSlug);

  // CV6 bug board.
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
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
          // status segmented-control flags (engine binds is-:bug.isOpen etc.)
          isOpen: st === 'open' ? 'on' : 'off',
          isProgress: st === 'progress' ? 'on' : 'off',
          isDone: st === 'done' ? 'on' : 'off',
        };
      }));
      setStatus(raw.length ? 'ready' : 'empty');
    }).catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [worldId, reloadKey]);

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

  // Assignable agents for the new-issue form (real agents from the data pipe).
  const assignableAgents = (agents || []).map((a) => {
    const name = a.name || a.slug || 'Agent';
    return { id: a.slug || a.id || name, name, initials: initials(name), tint: tintFor(name), picked: 'off' };
  });
  const agentNameById = {};
  for (const a of assignableAgents) agentNameById[a.id] = a.name;

  // Create an issue for real. CV6 board -> cv6-bugs add; custom board -> trackers add-row.
  // Space Rising is read-only (the "+" never opens there). Then refetch.
  const SEVERITY = { high: 'high', med: 'medium', low: 'low' };
  const createBug = async ({ title, description, priority, status, assigneeId }) => {
    if (!title || showingSpace) return null;
    const owner = assigneeId ? (agentNameById[assigneeId] || '') : '';
    const st = STATUS_LABELS[status] || 'Open';
    try {
      if (showingCv6) {
        await authFetch('/api/dashboard/cv6-bugs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add', world: worldId, page: 'mobile', title, expected: description || '', severity: SEVERITY[priority] || 'medium', status: st, owner }),
        });
      } else {
        await authFetch('/api/dashboard/trackers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add-row', world: worldId, id: activeId, row: { Title: title, Description: description || '', Priority: priority || 'med', Status: st, __assignee: owner } }),
        });
      }
      setReloadKey((n) => n + 1);
      return true;
    } catch { return null; }
  };

  // Change a CV6 bug's status for real (Open / In progress / Done) and persist it.
  // Optimistic: flip the local row immediately so the control responds, then POST
  // the real update and resync. CV6 board only (Space Rising is read-only).
  const STATUS_LABELS = { Open: 'Open', 'In progress': 'In progress', Done: 'Done' };
  const updateBug = async ({ id, status }) => {
    if (!id || !showingCv6) return null;
    const label = STATUS_LABELS[status]; if (!label) return null;
    const st = bugStatus(label);
    setBugs((prev) => prev.map((b) => (b.id === id
      ? { ...b, status: st, statusLabel: label,
          isOpen: st === 'open' ? 'on' : 'off',
          isProgress: st === 'progress' ? 'on' : 'off',
          isDone: st === 'done' ? 'on' : 'off' }
      : b)));
    try {
      await authFetch('/api/dashboard/cv6-bugs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', world: worldId, id, status: label }),
      });
      setReloadKey((n) => n + 1);
      return true;
    } catch { setReloadKey((n) => n + 1); return null; }
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
    // Open work first, done last — so an active board never opens on a wall of closed bugs.
    const RANK = { open: 0, progress: 1, done: 2 };
    listBugs = [...bugs].sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9));
    listState = status;
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
    // New-issue form: default priority High, no agent picked. Uncontrolled in the component
    // (title/description from inputs, priority/assignee toggled in the DOM), so this only seeds.
    draftBug: { title: '', description: '', priority: 'high', isHigh: 'on', isMed: 'off', isLow: 'off' },
    assignableAgents,
    bugs: listBugs,
    featuredBug: listBugs[0] ? { ...listBugs[0], agentStep: '', agentTotal: '', attachments: [] } : { id: '', title: '', attachments: [] },
    // The design binds both `data-each="attachments"` (the rows) and
    // `attachments.count` (the header). So attachments is an ARRAY that also carries
    // a `.count` prop — iterates empty, count reads 0 — not a {count,list} object
    // (which would throw on .forEach in the engine and crash the desktop screen).
    attachments: withCount([], 0),
    agent: { name: '', initials: '·', tint: 'violet', step: '', total: '', pct: 0, pctLabel: '', checklist: [] },
    loading: { label: 'Loading the tracker…' },
    empty: { title: 'No bugs in this tracker', body: 'Nothing logged yet. New issues land here.', actionLabel: '' },
    error: { title: "Couldn't load the tracker", body: 'Your connection dropped. Nothing was lost.', code: 'tracker · retry' },
  };
  return { state: listState, data, switchTracker, createTracker, createBug, updateBug, canCreate: !showingSpace };
}
