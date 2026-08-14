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
import { humanizeUrls } from './previewText.js';
import { titleForAgent, AGENT_TITLES } from './agentTitles.js';
import { classifyCommandRoomStatus, isCommandBookkeepingStamp } from '../../../../api/_lib/commandTruth.js';
import { shapeCommandWorkItems, commandWorkSubLine } from '../../../../api/_lib/commandWorkStatus.js';
export { useWorldId } from '../../lib/tenantContext.jsx';

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
  // qa-sweep 2026-07-17 RC6: humanize URLs to a file name / hostname BEFORE the
  // guard strips, so a ledger line reads "Deliverable approved: aztc-prize-website.pdf"
  // instead of the stripped-to-nothing "Deliverable approved:".
  return humanizeUrls(s)
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

// Where a goal came from, in Patrik's words — honest provenance shown next to the
// set-goal control (an inferred goal is an invitation to correct it). wd40 R5.
const GOAL_SOURCE_NOTE = {
  patrik: 'You set this goal',
  board: "Set by the room's agent",
  canon: "From the room's charter",
  inferred: 'Inferred from recent chat',
};

const hasOpenQuestion = (r) => {
  const q = String((r && r.open_question) || '').trim();
  return Boolean(q) && q.toLowerCase() !== 'none' && q.toLowerCase() !== 'null';
};

// ── Real loops (Supabase routines) ── the scheduled instructions that actually run
// in a room: routine-daemon.py polls the routines table every 30s and posts a due
// routine's prompt into its room as a message. This is THE loop the ledger's Loop
// column reflects. The master-loop watcher (autopilot) is a different thing — a
// nudge flag — and renders as its own labeled switch, never as "a running loop".
function routineRoomKey(rt) {
  if (!rt || typeof rt !== 'object') return '';
  if (rt.room_type === 'agent') return rt.agent_slug ? 'agent:' + String(rt.agent_slug) : '';
  if (rt.room_type === 'mission') return normalizeRoomKey(String(rt.mission_slug || ''));
  return normalizeRoomKey(String(rt.project_slug || ''));
}

function loopCadence(rt) {
  const m = Number(rt && rt.interval_minutes);
  if (!Number.isFinite(m) || m <= 0) return 'manual: runs when you tap';
  if (m % 1440 === 0) { const d = m / 1440; return d === 1 ? 'daily' : `every ${d} days`; }
  if (m % 60 === 0) { const h = m / 60; return h === 1 ? 'every hour' : `every ${h}h`; }
  return `every ${m}m`;
}

function relDur(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'under a minute';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

// A loop that failed twice in a row (or that the daemon stopped on errors) is
// FAILING — loud red, not blocked-amber. One failure is RETRYING: the schedule
// is still trying and amber says so.
function loopFailing(rt) {
  return rt.status === 'error' || Number(rt.fail_count || 0) >= 2;
}

// One template row per loop. Visual states reuse the kit's astat chips:
// running → working (green), paused → idle (gray), one failure → blocked
// (amber, RETRYING), two+ failures → error (red, FAILING).
// `last` is the room's freshest message — the loop row shows what the room
// actually did with the last run, not just that it ran.
function shapeLoopRow(rt, now, last) {
  const failing = loopFailing(rt);
  const stumbled = !failing && Number(rt.fail_count || 0) > 0;
  const running = rt.status === 'running';
  const bits = [loopCadence(rt)];
  if (running && rt.interval_minutes && rt.next_run_at) {
    const ms = new Date(rt.next_run_at).getTime() - now;
    bits.push(ms <= 30000 ? 'next run due now' : `next in ${relDur(ms)}`);
  }
  if (rt.last_run_at) {
    const ago = relTime(rt.last_run_at);
    bits.push(ago === 'now' ? 'ran just now' : `last run ${ago} ago`);
  }
  // Outcome: the room's latest agent reply since the last run, straight off
  // the message feed. Honest empty when the loop has never run.
  let outcome = '';
  const runT = rt.last_run_at ? new Date(rt.last_run_at).getTime() : 0;
  if (runT && last && last.t > runT && last.role === 'assistant') {
    const line = cleanCell(firstLine(last.text));
    if (line) outcome = 'Since last run: ' + (line.length > 110 ? line.slice(0, 107).trimEnd() + '…' : line);
  } else if (runT && running) {
    outcome = 'No reply in the room since the last run yet.';
  }
  return {
    id: String(rt.id || ''),
    name: cleanCell(firstLine(rt.name || rt.prompt || '')) || 'Loop',
    meta: bits.join(' · '),
    state: failing ? 'error' : (stumbled ? 'blocked' : (running ? 'working' : 'idle')),
    stateLabel: failing ? 'FAILING' : (stumbled ? 'RETRYING' : (running ? 'RUNNING' : 'PAUSED')),
    toggleLabel: running ? 'Pause' : 'Resume',
    outcome,
    errorNote: (failing || stumbled) && rt.last_error ? cleanCell(firstLine(rt.last_error)).slice(0, 120) : '',
  };
}

function shapeCommand({
  sessions = [], projectRooms = [], lastByRoom = {}, goalRooms = {},
  boardRows = [], stepsByRoom = {}, routines = [], workTasks = [], selectedKey = '', handed = {}, filter = '',
  editingGoal = false,
}) {
  const now = Date.now();

  // ── Activity dock (R-CMD-BUCKETS 2026-07-18) ── the work feed, bucketed.
  // Before: only heartbeat-live sessions, every card stamped LIVE — Patrik:
  // "Command center doesn't know what's in progress vs proposed vs done."
  // Now: live sessions (heartbeat truth, always in-progress) PLUS the tasks
  // table's real lifecycle from the supabase-status feed, classified by the
  // ONE shared status map (api/_lib/commandWorkStatus.js — the API stamps
  // `bucket`, this shape renders it). job.kind = the bucket, driving the
  // is-<bucket> chip on .ad-ico/.ad-badge; job.live marks heartbeat-backed
  // cards (the float dock shows only those).
  const liveJobs = (sessions || []).map((s) => {
    const name = titleForAgent(s.agent);
    return {
      id: s.agent, kind: 'inprogress', live: true, title: name, shortTitle: name,
      sub: cleanCell(firstLine(s.task_text)) || 'Active session', badge: 'LIVE',
    };
  });
  const workItems = shapeCommandWorkItems({ tasks: workTasks, sessions, now });
  const taskJobs = workItems.map((w) => {
    const agentTitle = w.agent ? titleForAgent(w.agent) : '';
    const detail = w.summary || w.error || '';
    const sub = [agentTitle || (w.project ? titleCase(w.project) : ''), relTime(w.t), cleanCell(firstLine(detail))]
      .filter(Boolean).join(' · ');
    const title = cleanCell(firstLine(w.title)) || 'Task';
    return {
      // openJob routes by agent slug — a task card opens its worker's room.
      id: w.agent || '', kind: w.bucket, live: false,
      title, shortTitle: title.length > 26 ? title.slice(0, 25).trimEnd() + '…' : title,
 sub: sub || '·', badge: w.label,
    };
  });
  const jobs = [...liveJobs, ...taskJobs];
  const bucketCounts = { proposed: 0, inprogress: liveJobs.length, done: 0, blocked: 0, failed: 0 };
  for (const w of workItems) bucketCounts[w.bucket] += 1;

  // State board rows indexed by their canonical roomKey.
  const boardByKey = {};
  for (const b of boardRows || []) {
    if (!b || !b.entity) continue;
    const nk = normalizeRoomKey(b.entity);
    if (!boardByKey[nk] || String(b.updated_at || '') > String(boardByKey[nk].updated_at || '')) boardByKey[nk] = b;
  }

  const projectNames = {};
  for (const p of projectRooms || []) projectNames[p.slug] = p.name || titleCase(p.slug);

  // Real loops indexed by their room's canonical ledger key. System routines
  // (kind='system', launchd mirrors like the master loop itself) are NOT room
  // loops — they live in the Routines panel and never count here, or the header
  // claims "39 loops running" while every room toggle is honestly off.
  const loopsByKey = {};
  for (const rt of routines || []) {
    if (rt && rt.kind === 'system') continue;
    const lk = routineRoomKey(rt);
    if (!lk) continue;
    if (!loopsByKey[lk]) loopsByKey[lk] = [];
    loopsByKey[lk].push(rt);
  }

  // Goal memory normalized onto the canonical roomKey convention. Legacy
  // 'project:mission' keys fold into their bare slug; when both exist the
  // canonical (bare) entry wins, then the freshest review. The legacy key also
  // donates the parent-project tag for display.
  const normGoals = {};
  const canonSource = {}; // canonical key → was the winning entry stored under the canonical key?
  const tags = {};
  const projSlugByKey = {}; // canonical mission key → parent project slug (from legacy keys)
  const missionSlugByKey = {}; // canonical key → the room's TRUE mission slug (from room_id)
  for (const [k, v] of Object.entries(goalRooms || {})) {
    if (!v || typeof v !== 'object') continue;
    const nk = normalizeRoomKey(k);
    if (!nk) continue;
    if (k.includes(':') && !k.startsWith('agent:') && bareKey(k) !== 'general') {
      const proj = projectOf(k);
      if (proj && !tags[nk]) { tags[nk] = projectNames[proj] || titleCase(proj); projSlugByKey[nk] = proj; }
    }
    // Stored fields beat key-shape guesses: the goal-notetaker stamps `project`
    // and `mission_slug` straight off the room's live room_id (R-trust). The
    // mission slug is stored VERBATIM — some rooms are prefix-canonical
    // ('corner:bridge'), some are bare — only the room_id knows which, and a
    // loop or send addressed with the wrong form talks to an empty room.
    if (v.project) {
      projSlugByKey[nk] = v.project;
      tags[nk] = projectNames[v.project] || titleCase(v.project);
    }
    if (v.mission_slug && v.project) missionSlugByKey[nk] = v.mission_slug;
    const isCanon = k === nk;
    const cur = normGoals[nk];
    if (!cur
      || (isCanon && !canonSource[nk])
      || (isCanon === Boolean(canonSource[nk]) && String(v.last_reviewed || '') > String(cur.last_reviewed || ''))) {
      normGoals[nk] = v; canonSource[nk] = isCanon;
    }
  }

  // Row universe: every room the goal memory or the state board knows, plus
  // projects active in the last 24h, plus live terminal sessions. Rooms whose
  // goal is done/parked leave the ledger (test rooms, closed work) — and a
  // stale board row or old traffic must NOT sneak them back in. Only evidence
  // NEWER than the park/done stamp re-adds a room (it is genuinely alive again).
  const retiredAt = {};
  for (const [nk, v] of Object.entries(normGoals)) {
    if (['done', 'parked'].includes(String((v && v.status) || '').toLowerCase())) {
      retiredAt[nk] = v.last_reviewed ? new Date(v.last_reviewed).getTime() : 0;
    }
  }
  const stillRetired = (nk, evidenceT) => (nk in retiredAt) && !(evidenceT && evidenceT > retiredAt[nk]);
  const keys = new Set(Object.keys(normGoals).filter((k) => !(k in retiredAt)));
  for (const nk of Object.keys(boardByKey)) {
    const bT = boardByKey[nk].updated_at ? new Date(boardByKey[nk].updated_at).getTime() : 0;
    if (!stillRetired(nk, bT)) keys.add(nk);
  }
  const activeProjects = (projectRooms || [])
    .filter((p) => p.last_message_at && (now - p.last_message_at) <= DAY_MS);
  for (const p of activeProjects) {
    const nk = normalizeRoomKey(p.slug);
    if (!stillRetired(nk, p.last_message_at || 0)) keys.add(nk);
  }
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

    const workEvents = [];
    if (last && last.t) {
      workEvents.push({
        source: last.role || 'message',
        t: last.t,
        text: last.text || '',
        agent: last.agent || '',
      });
    }
    if (board && board.updated_at) {
      workEvents.push({
        source: board.updated_by || 'state_board',
        updated_at: board.updated_at,
        state_line: board.state_line || '',
        event_type: board.event_type || '',
      });
    }

    // STATUS: blocked (waiting on you) > working (live session or fresh activity) > idle.
    // C2 closure (2026-07-06): a BLOCKED claim must have a REAL, still-open question
    // behind it — the ledger's state and the room's reality must agree. A stored
    // open_question goes stale two ways while the row keeps claiming blocked:
    //   1. an agent is LIVE on the room — an actively running agent is not waiting on
    //      you, so the room reads "ready"/working and a blocked badge contradicts it;
    //   2. the room has SPOKEN since the question was asked — a chat line newer than
    //      the question means the room already moved past it (the exact C2 mismatch:
    //      Command said BLOCKED + waiting-on-you, the opened room showed a ready agent,
    //      empty of any pending question). Only an untended, still-current question blocks.
    const statusTruth = classifyCommandRoomStatus({
      liveSession: Boolean(session),
      workEvents,
      openQuestion: hasOpenQuestion(gr),
      questionAskedAt: gr.last_reviewed || null,
      now,
      workingWindowMs: WORKING_WINDOW_MS,
    });
    const { status, questionLive } = statusTruth;
    const lastActivity = statusTruth.lastActivity || 0;

    // GOAL NOW (wd40 R5 — "actual goals, not just last activity"): a goal Patrik
    // STATED always wins; then the state board (agent-stamped); then the loop's
    // memory, which since R5 carries source 'canon' (mined from the room's
    // VISION/CONTEXT charter by goal-notetaker canon-sync) or 'inferred' (chat).
    const grGoal = oneLineGoal(gr.goal || '');
    const boardGoal = oneLineGoal((board && board.goal) || '');
    const grStated = Boolean(grGoal) && (gr.source === 'patrik' || gr.goal_source === 'patrik');
    let realGoal = '';
    let goalSource = '';
    if (grStated) { realGoal = grGoal; goalSource = 'patrik'; }
    else if (boardGoal) { realGoal = boardGoal; goalSource = 'board'; }
    else if (grGoal) { realGoal = grGoal; goalSource = gr.source === 'canon' ? 'canon' : 'inferred'; }
    // Full (un-ellipsized) winning goal — pre-fills the Edit input so "Edit"
    // edits the real text instead of a 120-char display cap (Steffen R5 D-1).
    const goalFull = realGoal
      ? cleanCell(firstLine(grStated ? gr.goal : (boardGoal ? board.goal : gr.goal)))
      : '';

    // LIVE NOW: the live session's task line, else the board's latest state line,
    // else the room's latest chat line. Honest dash when nothing is live.
    // Skip the board's "Goal set: <goal>" seed line — goal-notetaker stamps it as the
    // state_line when it first creates a board row, so it just echoes GOAL NOW and reads
    // as wasted duplication across the ledger (design panel: Critic 1 + 3). Falling
    // through to the real latest chat line (or an honest dash) keeps the two columns
    // distinct without restructuring the ledger.
    const boardState = board && board.state_line ? String(board.state_line) : '';
    const boardStateIsBookkeeping = isCommandBookkeepingStamp({
      updated_by: board && board.updated_by,
      state_line: boardState,
      event_type: board && board.event_type,
    });
    const liveNow = cleanCell(firstLine(
      (session && session.task_text)
      || (boardStateIsBookkeeping ? '' : boardState)
      || (last && last.text) || ''
 )).slice(0, 110) || '·';

    const { list: steps, storeKey } = stepsEntryFor(key);
    const expanded = selectedKey && selectedKey === key;
    const checklist = checklistFromSteps(steps, status === 'working', storeKey);
    const doneCount = checklist.filter((c) => c.state === 'done').length;

    // The Loop column is REAL loops only — routines the daemon actually executes.
    // A room with none shows OFF; a room whose loop is failing shows RED at a
    // glance (the whole point: a broken loop must not look like a healthy one).
    const roomLoops = loopsByKey[key] || [];
    const loopsRunning = roomLoops.filter((l) => l.status === 'running');
    const loopsResumable = roomLoops.filter((l) => l.status !== 'running');
    const loopsFailing = roomLoops.filter(loopFailing);
    const watchOn = gr.autopilot !== false; // absent/true = watch ON (matches master-loop-tick)

    return {
      id: key, key, name, tag, tint: tintFor(name),
      stepStoreKey: storeKey,
      projectSlug: projSlugByKey[key] || '',
      missionSlug: missionSlugByKey[key] || '',
      goal: realGoal || 'No goal set', goalKind: realGoal ? 'goal' : 'fallback',
      goalSource, goalFull,
 liveNow, age: lastActivity ? relTime(lastActivity) : '·', lastActivity,
      status, statusLabel: statusTruth.statusLabel,
      statusSource: statusTruth.source,
      statusReason: statusTruth.reason,
      loop: loopsFailing.length ? 'error' : (loopsRunning.length ? 'on' : 'off'),
      loopRunningIds: loopsRunning.map((l) => String(l.id)),
      loopResumableIds: loopsResumable.map((l) => String(l.id)),
      loopCount: roomLoops.length,
      watch: watchOn ? 'on' : 'off',
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
      // Gated on questionLive (not just presence): the WAITING-ON-YOU answer card and
      // the BLOCKED badge come from the SAME predicate, so a blocked row always has a
      // reachable question and a superseded/answered one never shows (C2 closure).
      openQuestion: questionLive ? cleanCell(firstLine(gr.open_question)) : '',
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
    const tLoops = loopsByKey['agent:' + agent] || [];
    const tRunning = tLoops.filter((l) => l.status === 'running');
    const tFailing = tLoops.filter(loopFailing);
    rows.push({
      id: 'agent:' + agent, key: 'agent:' + agent, name, tag: 'Terminal', tint: tintFor(name),
      stepStoreKey: 'agent:' + agent,
      projectSlug: '', missionSlug: '',
      goal: realGoal || 'No goal set', goalKind: realGoal ? 'goal' : 'fallback',
      goalSource: realGoal ? 'board' : '',
      goalFull: realGoal ? cleanCell(firstLine((board && board.goal) || '')) : '',
      liveNow: cleanCell(firstLine(s.task_text)).slice(0, 110) || 'Active session',
      age: 'now', lastActivity: now,
      status: 'working', statusLabel: 'WORKING',
      loop: tFailing.length ? 'error' : (tRunning.length ? 'on' : 'off'),
      loopRunningIds: tRunning.map((l) => String(l.id)),
      loopResumableIds: tLoops.filter((l) => l.status !== 'running').map((l) => String(l.id)),
      loopCount: tLoops.length,
      watch: 'on',
      checklist: [], fullChecklist: [], stepNote: '', openLabel: '',
      expandedState: 'collapsed', rowState: 'row', openQuestion: '',
    });
  }

  // Blocked first (waiting on you), then working, then idle; fresh first within each.
  const RANK = { blocked: 0, working: 1, idle: 2 };
  rows.sort((a, b) => (RANK[a.status] - RANK[b.status]) || (b.lastActivity - a.lastActivity));

  const workingCount = rows.filter((r) => r.status === 'working').length;
  const blockedCount = rows.filter((r) => r.status === 'blocked').length;

  // The header count chips are FILTERS (wd40 R4b). Counts always speak for the
  // whole ledger; only the visible rows narrow. Active filter is named in the
  // sub line and the chip label carries a clear affordance.
  const visible = filter ? rows.filter((r) => r.status === filter) : rows;
  // Count only room loops (what the rail's toggles show), never system mirrors.
  const loopsRunningTotal = Object.values(loopsByKey).flat().filter((l) => l.status === 'running').length;
  const subLine = filter
    ? `Showing ${visible.length} ${filter} · tap the chip to show all`
    : `${rows.length} rooms · ${workingCount} working · ${loopsRunningTotal} ${loopsRunningTotal === 1 ? 'loop' : 'loops'} running`;
  const workingChip = (filter === 'working' ? '✕ ' : '') + `${workingCount} working`;
  const blockedChip = (filter === 'blocked' ? '✕ ' : '') + `${blockedCount} blocked`;

  // Detail panel (desktop) / featured card (mobile): the selected row, else the
  // top row of the ledger. All fields are the room's real truth.
  const focus = (selectedKey && rows.find((r) => r.key === selectedKey)) || visible[0] || rows[0] || null;
  const openQuestions = rows.filter((r) => r.openQuestion).length;
  const goal = focus
    ? {
        id: focus.key, roomName: focus.name, tint: focus.tint,
        addKey: focus.stepStoreKey || focus.key,
        status: focus.status, statusLabel: focus.statusLabel,
        title: focus.goalKind === 'goal' ? focus.goal : 'No goal set for this room yet',
 driverLine: focus.liveNow !== '·' ? focus.liveNow
          : (focus.status === 'working' ? 'Working now' : 'Nothing live right now'),
        checklist: focus.fullChecklist,
        // The full open question renders as an ANSWERABLE card (wd40 R2) — the
        // header chip just points at it instead of repeating a truncated copy.
        question: focus.openQuestion || '',
        queueNote: focus.openQuestion
          ? 'Needs your answer below'
          : (openQuestions ? `${openQuestions} open question${openQuestions > 1 ? 's' : ''} for you` : 'queue clear'),
      }
    : {
        id: '', roomName: 'No rooms yet', tint: 'violet', status: 'idle', statusLabel: '',
        addKey: '', question: '',
        title: 'No goal set for this room yet', driverLine: 'Nothing active right now',
        checklist: [], queueNote: 'queue clear',
      };
  // Goal provenance + the set-goal control (wd40 R5). The note says where the
  // goal came from; the control writes a Patrik-stated goal through edit_goal
  // (protected from every future sweep). Control only when there is a real room.
  goal.sourceNote = focus ? (GOAL_SOURCE_NOTE[focus.goalSource] || '') : '';
  goal.editLabel = focus && focus.goalKind === 'goal' ? 'Edit' : 'Set goal';
  goal.editState = (editingGoal && goal.addKey) ? 'expanded' : 'collapsed';
  goal.editPrefill = focus ? (focus.goalFull || '') : '';
  const doneCount = goal.checklist.filter((c) => c.state === 'done').length;
  goal.stepCount = goal.checklist.length ? `${doneCount}/${goal.checklist.length}` : '0';
  // The add row only shows when there is a real room to add to (no dead control while
  // the ledger is still empty/loading) — rides the kit's rowopen show/hide pattern.
  goal.addState = goal.addKey ? 'expanded' : 'collapsed';
  goal.emptyNote = goal.checklist.length ? '' : (goal.addKey
    ? 'No steps on this plan yet. Add the first one below.'
    : 'No steps on this plan yet.');
  // The answer card only exists when the room is actually waiting on the user.
  goal.questionState = goal.question ? 'expanded' : 'collapsed';
  // Hand-off control (wd40 R3, reshaped R4c per Steffen): only when the plan has a
  // next unchecked step. After a send THE BUTTON BECOMES THE RESULT — it hides and
  // a success pill takes its place, keyed to the exact step that was sent (a NEW
  // next step brings the button back).
  const nextStep = goal.checklist.find((c) => c.state !== 'done');
  goal.nextStepText = nextStep ? nextStep.label : '';
  const handedCurrent = Boolean(nextStep && goal.id && handed[goal.id] && handed[goal.id].act === nextStep.act);
  goal.handState = (goal.addKey && nextStep && !handedCurrent) ? 'expanded' : 'collapsed';
  goal.handedState = handedCurrent ? 'expanded' : 'collapsed';

  // ── Loops on the focused room (real routines, full control in place) ──
  goal.projectSlug = focus ? (focus.projectSlug || '') : '';
  goal.missionSlug = focus ? (focus.missionSlug || '') : '';
  const focusLoops = focus ? (loopsByKey[focus.key] || []) : [];
  const focusLast = focus ? findLast(focus.key) : null;
  goal.loops = focusLoops.map((rt) => shapeLoopRow(rt, now, focusLast));
  goal.loopCount = String(focusLoops.length);
  goal.loopsEmptyNote = focusLoops.length ? '' : 'No loop on this room yet. Start one below.';
  // The create form only renders when there is a real room to attach it to.
  goal.loopNewState = goal.addKey ? 'expanded' : 'collapsed';
  // "Loop this plan" prefill only offers itself when the plan has a next step.
  goal.loopPlanState = (goal.addKey && nextStep) ? 'expanded' : 'collapsed';
  // The master-loop watcher, honestly labeled — it nudges the room, it is not a loop.
  goal.watch = focus ? (focus.watch || 'off') : 'off';
  // Park / Goal done live on every real room (agent terminals have identities,
  // not goals to close — they never park).
  goal.roomControlsState = (goal.addKey && focus && !focus.key.startsWith('agent:'))
    ? 'expanded' : 'collapsed';

  return {
    ledger: {
      roomCount: rows.length, liveCount: workingCount, workingCount, blockedCount,
      subLine, workingChip, blockedChip,
      rooms: visible, others: visible,
    },
    activity: { count: jobs.length, jobs, subLine: commandWorkSubLine(bucketCounts), buckets: bucketCounts },
    goal,
  };
}

// sharedPipe (qa-sweep 2026-07-17): when the caller already owns a useDataPipe
// result (DataProvider passes its own down through CommandProvider), hand it in
// so this hook doesn't spin up a SECOND polling loop + realtime channel set.
export function useCommand(worldIdArg, selectedKey = '', filter = '', editingGoal = false, sharedPipe = null) {
  const [currentUser, setCurrentUser] = useState(null);
  const [worldId, setWorldId] = useState(worldIdArg || null);
  const [sessions, setSessions] = useState([]);
  const [lastByRoom, setLastByRoom] = useState({});
  const [workTasks, setWorkTasks] = useState([]);
  // corner:corner-ui-cv6 (2026-06-24): bail out of setState when a poll returns
  // byte-identical data (the common case). Without this, every 5s/15s tick creates
  // a fresh array/object reference and re-renders the whole command surface even
  // when nothing changed — main-thread churn Patrik felt as slow load. We keep the
  // last serialized snapshot per poll and skip the setter when it matches.
  const sessionsSig = useRef('');
  const lastByRoomSig = useRef('');
  const workTasksSig = useRef('');

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
  const ownPipe = useDataPipe(null, worldId, currentUserSlug, { enabled: !sharedPipe });
  const { projectRooms } = sharedPipe || ownPipe;

  // Live agent sessions — poll the heartbeat-backed active-processes endpoint.
  useEffect(() => {
    if (!worldId || !supabase) return undefined;
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
    if (!worldId || !supabase) return undefined;
    let alive = true;
    const load = () => authFetch('/api/dashboard/supabase-status?client=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        // R-CMD-BUCKETS (2026-07-18): keep the task lifecycle rows this feed
        // already carries (bucket-stamped by supabase-status) — they are the
        // activity dock's proposed / in-progress / done truth. Slimmed to the
        // fields the shape reads so the change-detection sig stays cheap.
        const rawWork = [...(Array.isArray(d.tasksV2) ? d.tasksV2 : []), ...(Array.isArray(d.tasks) ? d.tasks : [])];
        const work = rawWork.map((t) => (t && typeof t === 'object' ? {
          id: t.id, status: t.status, bucket: t.bucket, title: t.title, text: t.text,
          agent_identity: t.agent_identity, agent: t.agent, project: t.project,
          metadata: (t.metadata && typeof t.metadata === 'object') ? { project: t.metadata.project } : undefined,
          created_at: t.created_at, updated_at: t.updated_at, completed_at: t.completed_at,
          result: t.result, error: t.error,
        } : t));
        const wsig = JSON.stringify(work);
        if (wsig !== workTasksSig.current) { workTasksSig.current = wsig; setWorkTasks(work); }
        if (!Array.isArray(d.messages)) return;
        const map = {};
        for (const m of d.messages) {
          if (!m.timestamp) continue;
          const t = new Date(m.timestamp).getTime();
          // Mission messages ALSO key under their bare mission slug so mission
          // rows (and their loop outcome lines) resolve their own latest line,
          // not just the parent project's.
          const meta = m.metadata || {};
          const missionKey = meta.mission_slug ? String(meta.mission_slug).split(':').pop() : '';
          for (const key of [m.project, missionKey]) {
            if (!key) continue;
            if (!map[key] || t > map[key].t) map[key] = { t, text: m.text || '', agent: m.agent || '', role: m.role || '' };
          }
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
    if (!worldId || !supabase) return undefined;
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
    if (!worldId || !supabase) return undefined;
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
    if (!worldId || !supabase) return undefined;
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

  // Real loops — the routines the daemon executes (corner:routines). 30s cadence
  // matches the daemon's own poll; loopsReload forces an immediate refetch after a
  // write so optimistic state reconciles to server truth in seconds.
  const [routines, setRoutines] = useState([]);
  const [loopsReload, setLoopsReload] = useState(0);
  const routinesSig = useRef('');
  useEffect(() => {
    if (!worldId || !supabase) return undefined;
    let alive = true;
    const load = () => authFetch('/api/dashboard/routines?client_id=' + encodeURIComponent(worldId))
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d || !Array.isArray(d.routines)) return;
        const sig = JSON.stringify(d.routines);
        if (sig === routinesSig.current) return;
        routinesSig.current = sig; setRoutines(d.routines);
      })
      .catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [worldId, loopsReload]);

  // One write path for every loop control; always reconcile to server truth after.
  const loopWrite = useCallback(async (method, body) => {
    if (!worldId || !supabase) return;
    try {
      await authFetch('/api/dashboard/routines', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, ...body }),
      });
    } finally {
      routinesSig.current = ''; setLoopsReload((n) => n + 1);
    }
  }, [worldId]);

  // Create a loop on a ledger room. Key shapes: 'agent:<slug>' → agent room; a bare
  // slug with a known parent project → mission room; else project room. Mission
  // loops store the room's TRUE mission slug (verbatim off its room_id) so the
  // daemon's tick lands in the room that actually listens, never a same-named
  // empty address. Model rides the routines default (sonnet) — never a
  // front-desk-class model in a room.
  const loopCreate = useCallback(async ({ key, projectSlug = '', missionSlug = '', prompt, intervalMinutes = null, name = '' } = {}) => {
    const t = String(prompt || '').replace(/\s+/g, ' ').trim();
    const k = String(key || '');
    if (!worldId || !k || !t) return;
    const body = {
      name: String(name || '').trim() || (t.length > 44 ? t.slice(0, 43).trimEnd() + '…' : t),
      prompt: t,
      model: 'sonnet',
      interval_minutes: intervalMinutes,
    };
    if (k.startsWith('agent:')) { body.room_type = 'agent'; body.agent_slug = k.slice(6); }
    else if (projectSlug) { body.room_type = 'mission'; body.project_slug = projectSlug; body.mission_slug = missionSlug || k; }
    else { body.room_type = 'project'; body.project_slug = k; }
    await loopWrite('POST', body);
  }, [worldId, loopWrite]);

  const loopToggle = useCallback(async (id) => {
    const rt = (routines || []).find((r) => String(r.id) === String(id));
    if (!rt) return;
    const action = rt.status === 'running' ? 'pause' : 'resume';
    setRoutines((rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, status: action === 'pause' ? 'paused' : 'running' } : r)));
    await loopWrite('PATCH', { id, action });
  }, [routines, loopWrite]);

  const loopRunNow = useCallback(async (id) => {
    setRoutines((rs) => rs.map((r) => (String(r.id) === String(id) ? { ...r, status: 'running', next_run_at: new Date().toISOString() } : r)));
    await loopWrite('PATCH', { id, action: 'run_now' });
  }, [loopWrite]);

  const loopDelete = useCallback(async (id) => {
    setRoutines((rs) => rs.filter((r) => String(r.id) !== String(id)));
    await loopWrite('DELETE', { id });
  }, [loopWrite]);

  // The ledger's per-row Loop toggle: pause every running loop on the room, or
  // resume the paused ones. Returns false when the room has no loop at all — the
  // caller steps into the room instead (the create form lives in the detail panel).
  const roomLoopsToggle = useCallback(async (runningIds = [], resumableIds = []) => {
    const ids = runningIds.length ? runningIds : resumableIds;
    if (!ids.length) return false;
    for (const id of ids) await loopToggle(id);
    return true;
  }, [loopToggle]);

  // Arm/disarm the master loop for a room (the per-row toggle). Optimistic; the
  // 60s goal poll reconciles to the file the daemon actually reads. The row key is
  // canonical — resolve which stored key (canonical or legacy project:mission)
  // actually holds this room's record so the write lands on the real entry.
  const toggleWatcher = useCallback(async (key) => {
    if (!worldId || !supabase || !key) return;
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
    if (!worldId || !supabase || !room || !id) return;
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

  // Accept an agent proposal WITHOUT flipping it done (tap its Proposed tag): the
  // step becomes yours and stays on the plan as a next step. No-op on non-proposals.
  const stepAccept = useCallback(async (act) => {
    const [room, id] = String(act || '').split('|');
    if (!worldId || !supabase || !room || !id) return;
    const it = (stepsByRoom[room] || []).find((s) => s.id === id);
    if (!it || !it.proposed) return;
    setStepsByRoom((prev) => {
      const cur = prev[room] || [];
      const out = { ...prev, [room]: cur.map((s) => (s.id === id ? { ...s, proposed: false, source: 'user' } : s)) };
      stepsSig.current = JSON.stringify(out);
      return out;
    });
    try {
      await authFetch('/api/dashboard/room-goal-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept', world: worldId, room, id }),
      });
    } finally {
      stepsSig.current = ''; setStepsReload((n) => n + 1);
    }
  }, [worldId, stepsByRoom]);

  // Remove a step from the plan for real (room-goal-steps delete — also how an
  // agent proposal is dismissed). Optimistic; forced refetch reconciles.
  const stepDelete = useCallback(async (act) => {
    const [room, id] = String(act || '').split('|');
    if (!worldId || !supabase || !room || !id) return;
    setStepsByRoom((prev) => {
      const cur = prev[room] || [];
      const out = { ...prev, [room]: cur.filter((x) => x.id !== id) };
      stepsSig.current = JSON.stringify(out);
      return out;
    });
    try {
      await authFetch('/api/dashboard/room-goal-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', world: worldId, room, id }),
      });
    } finally {
      stepsSig.current = ''; setStepsReload((n) => n + 1);
    }
  }, [worldId]);

  const stepAdd = useCallback(async (room, text) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    if (!worldId || !supabase || !room || !t) return;
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

  // Shape a supabase-messages payload for a ledger room key — the same shapes the
  // Chat composer sends (agent thread / mission thread / project chat). Mission
  // sends carry the room's TRUE mission slug when the goal memory knows it —
  // a bare slug for a prefix-canonical room ('corner:bridge') lands the message
  // in a same-named empty room instead of the real one.
  const roomSendPayload = (world, key, projectSlug, body, missionSlug = '') => (key.startsWith('agent:')
    ? { client_id: world, agent: key.slice(6), text: body, role: 'user', source: 'corner-dashboard' }
    : projectSlug
      ? { client_id: world, agent: 'corner', project: projectSlug, text: body, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: missionSlug || key } }
      : { client_id: world, agent: 'corner', project: key, text: body, role: 'user', source: 'corner-dashboard' });

  // ── Hand the next unchecked step to the room's agent (wd40 R3) ── one tap
  // dispatches the plan's first not-done step into the room's conversation through
  // the real send path. `handed` records the send so the UI can say so honestly
  // and a double-tap inside 60s is ignored.
  const [handed, setHanded] = useState({});
  const handNextStep = useCallback(async ({ key, projectSlug = '', missionSlug = '', stepText = '', act = '' } = {}) => {
    const t = String(stepText || '').replace(/\s+/g, ' ').trim();
    if (!worldId || !supabase || !key || !t) return;
    if (handed[key] && handed[key].act === act) return; // this exact step already sent
    setHanded((h) => ({ ...h, [key]: { act, ts: Date.now() } }));
    const body = `Please take the next step on this room's plan and report back when it's done: "${t.slice(0, 240)}"`;
    try {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomSendPayload(worldId, key, projectSlug, body, missionSlug)),
      });
    } catch {
      setHanded((h) => { const n = { ...h }; delete n[key]; return n; }); // send failed — allow retry
    }
  }, [worldId, handed]);

  // ── Answer a blocked room right on the ledger (wd40 R2) ── two real writes:
  // 1) the answer goes INTO the room's conversation via the same supabase-messages
  //    send path the Chat composer uses, so the room's agent actually receives it;
  // 2) the loop's goal memory clears its open_question (command-deck-action
  //    clear_question — non-destructive, unlike the CommandDeck-era answer_question).
  // Optimistic: the row unblocks immediately; the 60s goal poll reconciles.
  const answerRoomQuestion = useCallback(async ({ key, projectSlug = '', missionSlug = '', question = '' } = {}, text) => {
    const t = String(text || '').trim();
    if (!worldId || !supabase || !key || !t) return;
    // Resolve which stored key (canonical or legacy project:mission) holds this
    // room's goal record, same as toggleWatcher.
    let storeKey = key;
    if (!goalRooms[storeKey]) {
      for (const k of Object.keys(goalRooms)) {
        if (normalizeRoomKey(k) === key) { storeKey = k; break; }
      }
    }
    setGoalRooms((g) => {
      const out = { ...g, [storeKey]: { ...(g[storeKey] || {}), open_question: null, last_answer: t } };
      goalRoomsSig.current = JSON.stringify(out);
      return out;
    });
    const q = String(question || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    const body = q ? `Answering your question ("${q}"): ${t}` : t;
    const payload = roomSendPayload(worldId, key, projectSlug, body, missionSlug);
    try {
      await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
    } catch { /* delivery failed; the un-cleared server question resurfaces on the next poll */ }
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, action: 'clear_question', room: storeKey, answer: t }),
      });
    } catch { /* poll reconciles */ }
  }, [worldId, goalRooms]);

  // ── Set the room's goal from the ledger (wd40 R5 — Patrik states the actual
  // goal). Writes through command-deck-action edit_goal: room-goals.json gets
  // goal + source 'patrik', which the goal-notetaker NEVER overwrites (sweep and
  // canon-sync both respect it). Optimistic; the 60s goal poll reconciles.
  const setRoomGoal = useCallback(async (key, text) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    if (!worldId || !supabase || !key || !t) return;
    let storeKey = key;
    if (!goalRooms[storeKey]) {
      for (const k of Object.keys(goalRooms)) {
        if (normalizeRoomKey(k) === key) { storeKey = k; break; }
      }
    }
    setGoalRooms((g) => {
      const out = { ...g, [storeKey]: { ...(g[storeKey] || {}), goal: t, source: 'patrik', goal_source: 'patrik' } };
      goalRoomsSig.current = JSON.stringify(out);
      return out;
    });
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, action: 'edit_goal', room: storeKey, goal: t }),
      });
    } catch { /* poll reconciles to server truth */ }
  }, [worldId, goalRooms]);

  // ── Park a room / mark its goal done, right on the ledger ── writes the
  // same set_room_status the loop already honors (master-loop-tick skips
  // parked/done rooms). Optimistic: the row leaves the ledger immediately;
  // the 60s goal poll reconciles. Reversible — fresh room activity newer than
  // the stamp re-adds the row, and the room itself is untouched.
  const setRoomStatus = useCallback(async (key, status, note = '') => {
    if (!worldId || !supabase || !key || !['active', 'parked', 'done'].includes(status)) return;
    let storeKey = key;
    if (!goalRooms[storeKey]) {
      for (const k of Object.keys(goalRooms)) {
        if (normalizeRoomKey(k) === key) { storeKey = k; break; }
      }
    }
    setGoalRooms((g) => {
      const out = { ...g, [storeKey]: { ...(g[storeKey] || {}), status, last_reviewed: new Date().toISOString() } };
      goalRoomsSig.current = JSON.stringify(out);
      return out;
    });
    try {
      await authFetch('/api/dashboard/command-deck-action', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, action: 'set_room_status', room: storeKey, status, ...(note ? { answer: note } : {}) }),
      });
    } catch { /* poll reconciles to server truth */ }
  }, [worldId, goalRooms]);

  const data = useMemo(
    () => shapeCommand({ sessions, projectRooms, lastByRoom, goalRooms, boardRows, stepsByRoom, routines, workTasks, selectedKey, handed, filter, editingGoal }),
    [sessions, projectRooms, lastByRoom, goalRooms, boardRows, stepsByRoom, routines, workTasks, selectedKey, handed, filter, editingGoal],
  );
  const state = worldId ? 'ready' : 'loading';
  return {
    state, data, toggleWatcher, stepToggle, stepAdd, stepDelete, stepAccept,
    answerRoomQuestion, handNextStep, setRoomGoal, setRoomStatus,
    loopCreate, loopToggle, loopRunNow, loopDelete, roomLoopsToggle,
  };
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

// sharedPipe: same contract as useCommand — pass the DataProvider pipe to keep
// this hook from owning a duplicate one.
export function useTrackerBugs(worldId, sharedPipe = null) {
  const [bugs, setBugs] = useState([]);
  const [status, setStatus] = useState(() => (supabase ? 'loading' : 'empty'));
  const [spaceTickets, setSpaceTickets] = useState([]);
  const [spaceStatus, setSpaceStatus] = useState(() => (supabase ? 'loading' : 'empty'));
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
  const ownPipe = useDataPipe(null, worldId, currentUserSlug, { enabled: !sharedPipe });
  const { agents } = sharedPipe || ownPipe;

  // CV6 bug board.
  useEffect(() => {
    if (!worldId || !supabase) {
      setBugs([]);
      setStatus('empty');
      return undefined;
    }
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
    if (!worldId || !supabase) {
      setSpaceTickets([]);
      setSpaceStatus('empty');
      return undefined;
    }
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
    if (!worldId || !supabase) {
      setCustomTrackers([]);
      return undefined;
    }
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
    if (!supabase) return null;
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
    if (!supabase || !title || showingSpace) return null;
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
    if (!supabase || !id || !showingCv6) return null;
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
    loading: { label: 'Preparing the tracker' },
    empty: { title: 'No bugs in this tracker', body: 'Nothing logged yet. New issues land here.', actionLabel: '' },
    error: { title: "Couldn't load the tracker", body: 'Your connection dropped. Nothing was lost.', code: 'tracker · retry' },
  };
  return { state: listState, data, switchTracker, createTracker, createBug, updateBug, canCreate: !showingSpace && !!supabase };
}