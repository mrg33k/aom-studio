// RoomWorkList — what is happening in THIS room right now (Patrik 2026-08-06).
//
// His distinction, and the whole reason this exists: background work to the SYSTEM and
// background work to the USER are different things. The system's version is "a job was
// dispatched to a sub-agent". The user's version is "anything happening after I asked
// for it" — which includes the room's own agent working through steps without
// dispatching anything. The old card only knew the system's version, so a room could be
// visibly busy and show nothing, or show a single row for a dozen moving parts.
//
// So this merges two sources into ONE checklist:
//   this room  — the room agent's own goal steps (done / working / next)
//   sub-agent  — dispatched jobs and promised come-backs (useRunningTasks)
//
// Shape follows the action-items list Patrik screenshotted: a checkbox, a SHORT label,
// nothing else. Plus the thing he asked for that the screenshot didn't have — a live
// counter per item, so "how long has this been going" is answerable at a glance.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRunningTasks } from './data/useRunningTasks.js';

// Elapsed as the shortest true thing: 42s, 7m, 1h04.
function elapsedLabel(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h${String(mins % 60).padStart(2, '0')}`;
}

// One short line. Long agent prose is the thing Patrik explicitly does not want here.
function shorten(text, max = 58) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

// Admission gate: block prose chat filler that is not a real action item.
// "I'll let you know", "Sounds like a plan", "Noted" → not items.
// Concrete tasks ("Review the draft", "Deploy to staging") → pass through.
const PROSE_PREFIXES = /^(i['']?(ll|ve|m|d|will|have|am)|we['']?(ll|ve|d|re|will|have|are)|sounds|let me know|happy to|please note|sure[.,!]|got it|noted|thanks|thank you|understood|will do|no problem|of course|great[.,!])/i;
function isActionItem(text) {
  if (!text) return false;
  const t = text.trim();
  if (t.length < 4) return false;
  if (PROSE_PREFIXES.test(t)) return false;
  return true;
}

// Humanize the "who owns this" label. 'this room' is obvious in a room-scoped
// panel — hide it. 'sub-agent' is jargon — map to 'In progress'.
function humanizeOwner(owner) {
  if (!owner || owner === 'this room') return '';
  if (owner === 'sub-agent') return 'In progress';
  return owner;
}

function roomKeyFor(room) {
  if (!room) return '';
  if (room.isMission) return `m:${room.missionSlug || room.id}`;
  if (room.isProject) return `p:${room.id}`;
  return `a:${room?.id || ''}`;
}

// The room agent's steps have no timestamps — they are a checklist, not a job queue. So
// the first time we SEE a step working, we stamp it and keep that stamp in localStorage,
// which is what makes the counter survive a reload. It is an observation, not a claim
// about when the agent truly began, and it is deliberately never back-dated.
function useStepStarts(roomKey, activeLabels) {
  const [, force] = useState(0);
  const store = useRef({});
  const storeKey = `cv6.workstart.${roomKey}`;

  useEffect(() => {
    try { store.current = JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch { store.current = {}; }
    force((n) => n + 1);
  }, [storeKey]);

  useEffect(() => {
    if (!roomKey) return;
    let changed = false;
    const now = Date.now();
    for (const label of activeLabels) {
      if (!store.current[label]) { store.current[label] = now; changed = true; }
    }
    // Drop stamps for steps that are no longer running, so the file cannot grow forever.
    for (const label of Object.keys(store.current)) {
      if (!activeLabels.includes(label)) { delete store.current[label]; changed = true; }
    }
    if (changed) {
      try { localStorage.setItem(storeKey, JSON.stringify(store.current)); } catch { /* private mode */ }
      force((n) => n + 1);
    }
  }, [roomKey, storeKey, activeLabels.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  return store.current;
}

function Box({ state }) {
  const common = { width: 18, height: 18, borderRadius: 5, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  if (state === 'done') {
    return (
      <span style={{ ...common, background: 'var(--accent)', color: '#fff' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span style={{ ...common, border: '1.5px solid var(--accent)', color: 'var(--accent)' }}>
        <span className="cv6-worklist-spin" style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid currentColor', borderTopColor: 'transparent', display: 'block' }} />
      </span>
    );
  }
  return <span style={{ ...common, border: '1.5px solid var(--hair)' }} />;
}

export default function RoomWorkList({ room, goal }) {
  const { tasks, promises } = useRunningTasks(room);
  const [now, setNow] = useState(() => Date.now());

  const roomSteps = useMemo(() => {
    const list = Array.isArray(goal?.checklist) ? goal.checklist : [];
    return list
      .filter((s) => s.label && isActionItem(s.label))
      .map((s) => ({ key: `step:${s.label}`, label: s.label, state: s.state, owner: '', since: null }));
  }, [goal]);

  const activeLabels = useMemo(
    () => roomSteps.filter((s) => s.state === 'active').map((s) => s.label),
    [roomSteps],
  );
  const stepStarts = useStepStarts(roomKeyFor(room), activeLabels);

  const agentItems = useMemo(() => ([
    ...tasks.map((t) => ({ key: `task:${t.id}`, label: t.title, state: 'active', owner: '', since: t.since ? new Date(t.since).getTime() : null })),
    ...promises.map((p) => ({ key: `promise:${p.id}`, label: p.title, state: 'active', owner: '', since: p.since ? new Date(p.since).getTime() : null })),
  ]), [tasks, promises]);

  // A room's full step list is its whole history — 44 rows in Corner on the day this
  // shipped. That is the wall of text Patrik explicitly does not want. This panel answers
  // "what is happening NOW", so: every running item, a little of what just finished for
  // context, and a peek at what is next. Never more than 6 rows.
  const items = useMemo(() => {
    const all = [...roomSteps, ...agentItems];
    const active = all.filter((i) => i.state === 'active');
    if (!active.length) return [];
    const doneTail = roomSteps.filter((i) => i.state === 'done').slice(-2);
    const nextUp = roomSteps.filter((i) => i.state === 'pending').slice(0, 2);
    return [...doneTail, ...active, ...nextUp].slice(0, 6);
  }, [roomSteps, agentItems]);
  const running = items.filter((i) => i.state === 'active').length;
  const remaining = roomSteps.filter((i) => i.state === 'pending').length - items.filter((i) => i.state === 'pending').length;

  // One shared tick for every counter, and only while something is actually running.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Nothing running = no panel at all. A standing "Working" box on a quiet room is the
  // dead surface this is meant to replace, and a backlog is not work in flight.
  if (!items.length) return null;

  return (
    <div data-testid="cv6-room-work-list"
      style={{ margin: '10px 0 4px', padding: '12px 14px 8px', borderRadius: 14, border: '1px solid var(--hair)', background: 'var(--surface-2)', fontFamily: 'var(--font-sans)' }}>
      <style>{'@keyframes cv6WorklistSpin{to{transform:rotate(360deg)}}.cv6-worklist-spin{animation:cv6WorklistSpin .8s linear infinite}'}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className="eyebrow" style={{ letterSpacing: '.08em' }}>Action items</span>
        <span style={{ flex: 1 }} />
        {running ? (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {running} running
          </span>
        ) : null}
      </div>

      {items.map((item) => {
        const start = item.since || (item.state === 'active' ? stepStarts[item.label] : null);
        const timer = item.state === 'active' && start ? elapsedLabel(now - start) : '';
        return (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
            <Box state={item.state} />
            <span style={{
              flex: 1, minWidth: 0, fontSize: 13, lineHeight: 1.35,
              color: item.state === 'done' ? 'var(--faint)' : 'var(--fg)',
              textDecoration: item.state === 'done' ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{shorten(item.label)}</span>
            {humanizeOwner(item.owner) ? (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--faint)', flex: 'none', letterSpacing: '.02em' }}>{humanizeOwner(item.owner)}</span>
            ) : null}
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: timer ? 'var(--accent)' : 'transparent', minWidth: 34, textAlign: 'right', flex: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {timer}
            </span>
          </div>
        );
      })}
      {remaining > 0 ? (
        <div style={{ fontSize: 10.5, color: 'var(--faint)', padding: '4px 0 2px' }}>
          +{remaining} more on this room's list
        </div>
      ) : null}
    </div>
  );
}
