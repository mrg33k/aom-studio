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
import { titleForAgent, AGENT_TITLES } from './agentTitles.js';

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

// ── Command: the goal ledger (corner:corner-ui-cv6, rebuilt 2026-07-06) ──
// Patrik's spec (2026-06-17 + refined 2026-07-06): each row = a room/terminal with
// GOAL NOW (the actual goal sentence), STATUS (working / blocked / idle), LIVE NOW
// (the live activity line), last activity, and the per-row Master Loop toggle.
// Step in (select/expand a row) → the room's CHECKLIST, done vs not-done,
// source-tagged (you vs agent).
//
// Truth sources (merged, board wins):
//   1. state board  — Supabase board_latest, one row per entity (goal + latest
//      state line, hook-stamped). Decision 2026-07-05, corner:state-board.
//   2. room-goals   — the master loop's per-room goal memory (room-goals.json via
//      /api/dashboard/room-goals; same file the /cvg CommandTracker reads).
//   3. room-goal-steps — the per-room plan checklist (same store the Chat goal
//      thread reads/writes; plan-propose.py writes it).
//   4. active-agents — live Claude sessions (heartbeat-backed) for LIVE NOW/WORKING.
//   5. supabase-status messages — each room's latest line + last-activity time.
// A room with no goal anywhere shows an honest "No goal set" — never a fake.
const DAY_MS = 24 * 60 * 60 * 1000;
const WORKING_WINDOW_MS = 30 * 60 * 1000; // activity in the last 30m = working

// Map a step list to the template's checklist rows, source-tagged (spec: done vs
// not-done, who put it on the plan). One active row max, only when truly live.
// Each row carries `act` = "<storeKey>|<stepId>" so a tap on the rendered row can
// write back to the exact stored entry it came from (wd40 R1: actionable checklist).
function checklistFromSteps(steps, live, storeKey) {
  let activeAssigned = false;
  return (steps || []).map((s) => {
    let state = 'queued';
    let tag = s.source === 'agent' ? (s.proposed ? 'Proposed' : 'Agent') : 'You';
    if (s.done) { state = 'done'; tag = 'Done'; }
    else if (live && !activeAssigned) { state = 'active'; tag = 'Running'; activeAssigned = true; }
    return { id: s.id || '', label: s.text || '', tag, state, act: `${storeKey || ''}|${s.id || ''}` };
  });
}

const bareKey = (s) => String(s || '').split(':').pop().trim() || String(s || '');
const projectOf = (s) => (String(s || '').includes(':') ? String(s).split(':')[0] : '');

// Canonical roomKey convention (note-taker backend, 2026-07-06): bare slug for
// project/mission rooms (last path segment; ':general' collapses to the project
// slug), 'agent:<slug>' for agent rooms. room-goals.json still carries legacy
// 'project:mission' keys from the old sweep — normalize them so one room is one row.
function normalizeRoomKey(key) {
  const k = String(key || '').trim();
  if (!k) return '';
  if (k.startsWith('agent:')) return k;
  if (!k.includes(':')) return AGENT_TITLES[k] ? 'agent:' + k : k;
  const parts = k.split(':');
  const last = parts[parts.length - 1];
  if (last === 'general') return parts[parts.length - 2] || last;
  return last;
}

// Never surface absolute paths / URL blobs in a ledger cell (rule 4 — the same
// guard the /cvg CommandTracker uses).
function cleanCell(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/(?:[A-Za-z]:)?[\\/](?:Users|home)[\\/][^\s]+/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// GOAL NOW is a one-liner: first sentence, capped — real text, just shortened.
function oneLineGoal(s) {
  const clean = cleanCell(firstLine(s));
  if (!clean) return '';
  const m = clean.match(/^.*?[.!?](?=\s|$)/);
  let first = (m ? m[0] : clean).trim();
  if (first.length > 120) first = first.slice(0, 117).trimEnd() + '…';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

// Display name for a canonical ledger key: 'agent:elon' → its dashboard TITLE
// (agents never show persona names); a bare room slug → the project's real name
// when we know it, else title-cased. `tags` carries the parent project for
// mission rooms (recovered from legacy 'project:mission' keys when present).
function roomNameFor(key, projectNames = {}, tags = {}) {
  const k = String(key || '');
  if (k.startsWith('agent:')) return { name: titleForAgent(k.slice(6)), tag: 'Agent' };
  if (projectNames[k]) return { name: projectNames[k], tag: '' };
  return { name: titleCase(k), tag: tags[k] || '' };
}

const hasOpenQuestion = (r) => {
  const q = String((r && r.open_question) || '').trim();
  return Boolean(q) && q.toLowerCase() !== 'none' && q.toLowerCase() !== 'null';
};

function shapeCommand({
  sessions = [], projectRooms = [], lastByRoom = {}, goalRooms = {},
  boardRows = [], stepsByRoom = {}, selectedKey = '',
}) {
  const now = Date.now();

  // Activity dock = live agent sessions. Each is one running Claude session.
  const jobs = (sessions || []).map((s) => {
    const name = titleForAgent(s.agent);
    return {
      id: s.agent, kind: 'agent', title: name, shortTitle: name,
      sub: cleanCell(firstLine(s.task_text)) || 'Active session', badge: 'LIVE',
    };
  });

  // State board rows indexed by their canonical roomKey.
  const boardByKey = {};
  for (const b of boardRows || []) {
    if (!b || !b.entity) continue;
    const nk = normalizeRoomKey(b.entity);
    if (!boardByKey[nk] || String(b.updated_at || '') > String(boardByKey[nk].updated_at || '')) boardByKey[nk] = b;
  }

  const projectNames = {};
  for (const p of projectRooms || []) projectNames[p.slug] = p.name || titleCase(p.slug);

  // Goal memory normalized onto the canonical roomKey convention. Legacy
  // 'project:mission' keys fold into their bare slug; when both exist the
  // canonical (bare) entry wins, then the freshest review. The legacy key also
  // donates the parent-project tag for display.
  const normGoals = {};
  const canonSource = {}; // canonical key → was the winning entry stored under the canonical key?
  const tags = {};
  const projSlugByKey = {}; // canonical mission key → parent project slug (from legacy keys)
  for (const [k, v] of Object.entries(goalRooms || {})) {
    if (!v || typeof v !== 'object') continue;
    const nk = normalizeRoomKey(k);
    if (!nk) continue;
    if (k.includes(':') && !k.startsWith('agent:') && bareKey(k) !== 'general') {
      const proj = projectOf(k);
      if (proj && !tags[nk]) { tags[nk] = projectNames[proj] || titleCase(proj); projSlugByKey[nk] = proj; }
    }
    const isCanon = k === nk;
    const cur = normGoals[nk];
    if (!cur
      || (isCanon && !canonSource[nk])
      || (isCanon === Boolean(canonSource[nk]) && String(v.last_reviewed || '') > String(cur.last_reviewed || ''))) {
      normGoals[nk] = v; canonSource[nk] = isCanon;
    }
  }

  // Row universe: every room the goal memory or the state board knows, plus
  // projects active in the last 24h, plus live terminal sessions.
  const keys = new Set(Object.keys(normGoals));
  for (const nk of Object.keys(boardByKey)) keys.add(nk);
  const activeProjects = (projectRooms || [])
    .filter((p) => p.last_message_at && (now - p.last_message_at) <= DAY_MS);
  for (const p of activeProjects) keys.add(normalizeRoomKey(p.slug));
  keys.delete('');

  const sessionByAgent = {};
  for (const s of sessions || []) sessionByAgent[String(s.agent || '').toLowerCase()] = s;
  const usedSessions = new Set();

  const findSession = (key) => {
    const bk = bareKey(key).toLowerCase();
    const direct = sessionByAgent[key.toLowerCase()] || sessionByAgent[bk];
    if (direct) return direct;
    // Mission rooms: a session whose live task text names the mission slug.
    for (const s of sessions || []) {
      if (bk.length > 3 && String(s.task_text || '').toLowerCase().includes(bk)) return s;
    }
    return null;
  };

  const findLast = (key) => lastByRoom[key] || lastByRoom[bareKey(key)] || lastByRoom[projectOf(key)] || null;
  // Resolve WHERE a room's steps actually live (canonical key vs legacy bare slug) so
  // checklist writes land on the same stored list the display read from — adding under
  // the canonical key while a legacy list exists would mask it, not extend it.
  const stepsEntryFor = (key) => {
    if (Array.isArray(stepsByRoom[key])) return { list: stepsByRoom[key], storeKey: key };
    const bk = bareKey(key);
    if (Array.isArray(stepsByRoom[bk])) return { list: stepsByRoom[bk], storeKey: bk };
    return { list: [], storeKey: key };
  };

  const buildRow = (key) => {
    const gr = normGoals[key] || {};
    const board = boardByKey[key] || null;
    const session = findSession(key);
    if (session) usedSessions.add(String(session.agent || '').toLowerCase());
    const last = findLast(key);
    const { name, tag } = roomNameFor(key, projectNames, tags);

    // Last activity = the freshest of message / board stamp / loop review.
    const times = [
      last && last.t,
      board && board.updated_at ? new Date(board.updated_at).getTime() : 0,
      gr.last_reviewed ? new Date(gr.last_reviewed).getTime() : 0,
    ].filter((t) => t && !Number.isNaN(t));
    const lastActivity = times.length ? Math.max(...times) : 0;

    // STATUS: blocked (waiting on you) > working (live session or fresh activity) > idle.
    let status = 'idle';
    if (hasOpenQuestion(gr)) status = 'blocked';
    else if (session || (lastActivity && (now - lastActivity) <= WORKING_WINDOW_MS)) status = 'working';

    // GOAL NOW: state board first (source of truth), then the loop's goal memory.
    const realGoal = oneLineGoal((board && board.goal) || gr.goal || '');

    // LIVE NOW: the live session's task line, else the board's latest state line,
    // else the room's latest chat line. Honest dash when nothing is live.
    const liveNow = cleanCell(firstLine(
      (session && session.task_text)
      || (board && board.state_line)
      || (last && last.text) || ''
    )).slice(0, 110) || '—';

    const { list: steps, storeKey } = stepsEntryFor(key);
    const expanded = selectedKey && selectedKey === key;
    const checklist = checklistFromSteps(steps, status === 'working', storeKey);
    const doneCount = checklist.filter((c) => c.state === 'done').length;
    const loopOn = gr.autopilot !== false; // absent/true = loop default ON (matches master-loop-tick)

    return {
      id: key, key, name, tag, tint: tintFor(name),
      stepStoreKey: storeKey,
      projectSlug: projSlugByKey[key] || '',
      goal: realGoal || 'No goal set', goalKind: realGoal ? 'goal' : 'fallback',
      liveNow, age: lastActivity ? relTime(lastActivity) : '—', lastActivity,
      status, statusLabel: status.toUpperCase(),
      loop: loopOn ? 'on' : 'off',
      // Level 2 (step in): the room's plan. Mobile renders it inline when expanded;
      // desktop shows it in the detail panel via `goal` below.
      checklist: expanded ? checklist : [],
      fullChecklist: checklist,
      stepNote: expanded
        ? (checklist.length ? `${doneCount} of ${checklist.length} done` : 'No steps on this plan yet')
        : '',
      openLabel: expanded ? 'Open room' : '',
      expandedState: expanded ? 'expanded' : 'collapsed',
      rowState: expanded ? 'open' : 'row',
      openQuestion: hasOpenQuestion(gr) ? cleanCell(firstLine(gr.open_question)) : '',
    };
  };

  const rows = Array.from(keys).map(buildRow);

  // Terminals with a live session that matched no room get their own row (spec:
  // active terminal sessions appear alongside rooms).
  for (const s of sessions || []) {
    const agent = String(s.agent || '').toLowerCase();
    if (!agent || usedSessions.has(agent)) continue;
    const name = titleForAgent(agent);
    const board = boardByKey['agent:' + agent] || null;
    const realGoal = oneLineGoal((board && board.goal) || '');
    rows.push({
      id: 'agent:' + agent, key: 'agent:' + agent, name, tag: 'Terminal', tint: tintFor(name),
      stepStoreKey: 'agent:' + agent,
      goal: realGoal || 'No goal set', goalKind: realGoal ? 'goal' : 'fallback',
      liveNow: cleanCell(firstLine(s.task_text)).slice(0, 110) || 'Active session',
      age: 'now', lastActivity: now,
      status: 'working', statusLabel: 'WORKING',
      loop: 'off', checklist: [], fullChecklist: [], stepNote: '', openLabel: '',
      expandedState: 'collapsed', rowState: 'row', openQuestion: '',
    });
  }

  // Blocked first (waiting on you), then working, then idle; fresh first within each.
  const RANK = { blocked: 0, working: 1, idle: 2 };
  rows.sort((a, b) => (RANK[a.status] - RANK[b.status]) || (b.lastActivity - a.lastActivity));

  const workingCount = rows.filter((r) => r.status === 'working').length;
  const blockedCount = rows.filter((r) => r.status === 'blocked').length;

  // Detail panel (desktop) / featured card (mobile): the selected row, else the
  // top row of the ledger. All fields are the room's real truth.
  const focus = (selectedKey && rows.find((r) => r.key === selectedKey)) || rows[0] || null;
  const openQuestions = rows.filter((r) => r.openQuestion).length;
  const goal = focus
    ? {
        id: focus.key, roomName: focus.name, tint: focus.tint,
        addKey: focus.stepStoreKey || focus.key,
        status: focus.status, statusLabel: focus.statusLabel,
        title: focus.goalKind === 'goal' ? focus.goal : 'No goal set for this room yet',
        driverLine: focus.liveNow !== '—' ? focus.liveNow
          : (focus.status === 'working' ? 'Working now' : 'Nothing live right now'),
        checklist: focus.fullChecklist,
        queueNote: focus.openQuestion
          ? `Waiting on you: ${focus.openQuestion.slice(0, 60)}`
          : (openQuestions ? `${openQuestions} open question${openQuestions > 1 ? 's' : ''} for you` : 'queue clear'),
      }
    : {
        id: '', roomName: 'No rooms yet', tint: 'violet', status: 'idle', statusLabel: '',
        addKey: '',
        title: 'No goal set for this room yet', driverLine: 'Nothing active right now',
        checklist: [], queueNote: 'queue clear',
      };
  const doneCount = goal.checklist.filter((c) => c.state === 'done').length;
  goal.stepCount = goal.checklist.length ? `${doneCount}/${goal.checklist.length}` : '0';
  goal.emptyNote = goal.checklist.length ? '' : 'No steps on this plan yet. Add the first one below.';

  return {
    ledger: { roomCount: rows.length, liveCount: workingCount, workingCount, blockedCount, rooms: rows, others: rows },
    activity: { count: jobs.length, jobs },
    goal,
  };
}

export function useCommand(worldIdArg, selectedKey = '') {
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

  // The state board (Supabase board_latest, corner:state-board) — goal + latest
  // state line per entity. Source of truth for GOAL NOW when a row has one.
  const [boardRows, setBoardRows] = useState([]);
  const boardSig = useRef('');
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => authFetch('/api/dashboard/state-board?world=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || !Array.isArray(d.rows)) return;
        const sig = JSON.stringify(d.rows);
        if (sig === boardSig.current) return;
        boardSig.current = sig; setBoardRows(d.rows);
      })
      .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId]);

  // Every room's plan checklist in one read (the same store the Chat goal thread
  // and plan-propose.py use) — powers the step-in / expanded checklist per row.
  // stepsReload forces an immediate refetch right after a checklist write, so the
  // optimistic flip reconciles to server truth in seconds, not at the next 30s tick.
  const [stepsByRoom, setStepsByRoom] = useState({});
  const [stepsReload, setStepsReload] = useState(0);
  const stepsSig = useRef('');
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = () => authFetch(`/api/dashboard/room-goal-steps?world=${encodeURIComponent(worldId)}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || typeof d.items !== 'object' || !d.items) return;
        const sig = JSON.stringify(d.items);
        if (sig === stepsSig.current) return;
        stepsSig.current = sig; setStepsByRoom(d.items);
      })
      .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId, stepsReload]);

  // Arm/disarm the master loop for a room (the per-row toggle). Optimistic; the
  // 60s goal poll reconciles to the file the daemon actually reads. The row key is
  // canonical — resolve which stored key (canonical or legacy project:mission)
  // actually holds this room's record so the write lands on the real entry.
  const toggleWatcher = useCallback(async (key) => {
    if (!worldId || !key) return;
    let storeKey = key;
    let cur = goalRooms[key];
    if (!cur) {
      for (const [k, v] of Object.entries(goalRooms)) {
        if (normalizeRoomKey(k) === key) { storeKey = k; cur = v; break; }
      }
    }
    const next = (cur || {}).autopilot === false;
    setGoalRooms((g) => ({ ...g, [storeKey]: { ...(g[storeKey] || {}), autopilot: next } }));
    try {
      await authFetch('/api/dashboard/room-autopilot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, slug: storeKey, on: next }),
      });
    } catch { /* poll reconciles */ }
  }, [worldId, goalRooms]);

  // ── Actionable checklist (wd40 R1) ── writes ride the SAME store the little man
  // (goal-notetaker) and plan-propose.py write: /api/dashboard/room-goal-steps.
  // `act` = "<storeKey>|<stepId>" as stamped by checklistFromSteps, so the write hits
  // the exact stored list the row was rendered from. Optimistic flip, then a forced
  // refetch reconciles to server truth.
  const stepToggle = useCallback(async (act) => {
    const [room, id] = String(act || '').split('|');
    if (!worldId || !room || !id) return;
    const wasProposed = Boolean((stepsByRoom[room] || []).find((s) => s.id === id)?.proposed);
    setStepsByRoom((prev) => {
      const cur = prev[room] || [];
      const next = cur.map((s) => (s.id === id ? { ...s, done: !s.done, proposed: false } : s));
      const out = { ...prev, [room]: next };
      stepsSig.current = JSON.stringify(out);
      return out;
    });
    try {
      const post = (body) => authFetch('/api/dashboard/room-goal-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, room, id, ...body }),
      });
      // Checking off an agent SUGGESTION claims it first (the trust rule: a proposal
      // the user touched is theirs), then flips done for real.
      if (wasProposed) await post({ action: 'accept' });
      await post({ action: 'toggle' });
    } finally {
      stepsSig.current = ''; setStepsReload((n) => n + 1);
    }
  }, [worldId, stepsByRoom]);

  const stepAdd = useCallback(async (room, text) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!worldId || !room || !t) return;
    setStepsByRoom((prev) => {
      const cur = prev[room] || [];
      const out = { ...prev, [room]: [...cur, { id: 'tmp-' + Date.now().toString(36), text: t, done: false, source: 'user', proposed: false }] };
      stepsSig.current = JSON.stringify(out);
      return out;
    });
    try {
      await authFetch('/api/dashboard/room-goal-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', world: worldId, room, text: t }),
      });
    } finally {
      stepsSig.current = ''; setStepsReload((n) => n + 1);
    }
  }, [worldId]);

  const data = useMemo(
    () => shapeCommand({ sessions, projectRooms, lastByRoom, goalRooms, boardRows, stepsByRoom, selectedKey }),
    [sessions, projectRooms, lastByRoom, goalRooms, boardRows, stepsByRoom, selectedKey],
  );
  const state = worldId ? 'ready' : 'loading';
  return { state, data, toggleWatcher, stepToggle, stepAdd };
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

  // Change a CV6 bug's status (Open / In progress / Done) and/or its owner
  // (assign-to-agent, R-ASSIGN) for real and persist it. Optimistic: flip the local
  // row immediately so the control responds, then POST the real update and resync.
  // CV6 board only (Space Rising is read-only).
  const STATUS_LABELS = { Open: 'Open', 'In progress': 'In progress', Done: 'Done' };
  const updateBug = async ({ id, status, owner }) => {
    if (!id || !showingCv6) return null;
    const label = status != null ? STATUS_LABELS[status] : null;
    if (status != null && !label) return null;
    if (label == null && owner == null) return null;
    setBugs((prev) => prev.map((b) => {
      if (b.id !== id) return b;
      const next = { ...b };
      if (label) {
        const st = bugStatus(label);
        next.status = st; next.statusLabel = label;
        next.isOpen = st === 'open' ? 'on' : 'off';
        next.isProgress = st === 'progress' ? 'on' : 'off';
        next.isDone = st === 'done' ? 'on' : 'off';
      }
      if (owner != null) {
        next.assignee = owner;
        next.assigneeInitials = owner ? initials(owner) : '·';
        next.assigneeTint = tintFor(owner || id);
      }
      return next;
    }));
    try {
      const body = { action: 'update', world: worldId, id };
      if (label) body.status = label;
      if (owner != null) body.owner = owner;
      await authFetch('/api/dashboard/cv6-bugs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
