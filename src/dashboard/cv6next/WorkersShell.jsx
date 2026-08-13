// WorkersShell — the Background work window (corner:one-corner M19).
//
// Until this round, in-flight work rendered as a card INSIDE every chat thread
// (RunningTasksCard): world-scoped in any room without a project, so the same
// stale promises followed Patrik from chat to chat with no way to clear them —
// "I don't know how to make these go away, they show up in every chat. They
// should have their own window - similar to how email does" (2026-07-28).
//
// So background work now lives where Email lives: pinned at the bottom of the
// rooms rail, opened as its own workspace column, absent from chat threads
// entirely. One window, the whole world's in-flight work, and — new — a
// Dismiss on every promise, because a promise minted by a retired mechanism
// can never prove delivery and would otherwise sit on screen forever.
//
// The two-kind honesty rule carries over unchanged (no fake UI):
//   Working in the background — a dispatched job actually executing (tasks table).
//   Coming back to you        — a pending come-back (followups): the agent SAID
//                               it would report back and hasn't. A commitment,
//                               not proof that CPU is burning.
//
// Actions post REAL user messages into the promise's own room via the same
// endpoint the composer uses (/api/dashboard/supabase-messages) — visible in
// that room's thread afterwards, no invisible side effects. Dismiss goes
// through /api/dashboard/dismiss-followup and only reports success when the
// row actually flipped.

import React, { useState, useEffect } from 'react';
import { useRunningTasks } from './data/useRunningTasks.js';
import { authFetch } from '../lib/authFetch';
import { useWorldId } from '../lib/tenantContext.jsx';
import ColumnExpandButton from './ColumnExpandButton.jsx';

function titleCaseName(s) {
  const v = String(s || '').replace(/[-_]/g, ' ').trim();
  return v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Agent';
}

// Where the user would look for this work — the room, said as the room list says
// it, never as a slug (rule 4). A mission slug arrives as "<project>:<tail>";
// the tail is what the rail shows as the room name.
function roomLabel({ mission, project, who }) {
  const m = String(mission || '');
  if (m) return titleCaseName(m.includes(':') ? m.split(':').slice(1).join(':') : m);
  if (project) return titleCaseName(project);
  if (who) return titleCaseName(who);
  return '';
}

// Durations read as durations ("running 8m", "waiting 3d 10h", "overdue 1d"),
// never as a bare clock — same rule the in-chat card learned from the critic.
function fmtSpan(totalMin) {
  const m = Math.abs(totalMin);
  if (m < 60) return `${m}m`;
  if (m < 1440) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  }
  const d = Math.floor(m / 1440);
  const remH = Math.floor((m % 1440) / 60);
  return remH ? `${d}d ${remH}h` : `${d}d`;
}

function minsSince(iso, nowMs) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((nowMs - t) / 60000));
}

// A grouped promise arrives as "<the promise> · +N more here" (written by
// scripts/promise-reconcile.py, which owns the other half of this convention).
const GROUPED = / · \+(\d+) more here$/;
function splitCount(title) {
  const t = String(title || '');
  const m = t.match(GROUPED);
  return m ? { title: t.replace(GROUPED, ''), more: `+${m[1]} more in that room` }
           : { title: t, more: '' };
}

// The message a promise's own room receives when acted on from here. Routing is
// derived from the followup row exactly the way useRoomThread.send derives it
// from the room object: mission -> corner + project + mission_slug metadata,
// project -> corner + project, otherwise the agent's own 1:1 room.
function roomPayload(p, worldId, text) {
  const base = { client_id: worldId, text, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: 'work' } };
  if (p.mission && p.project) {
    return { ...base, agent: 'corner', project: p.project, metadata: { ...base.metadata, mission_slug: String(p.mission) } };
  }
  if (p.project) return { ...base, agent: 'corner', project: p.project };
  return { ...base, agent: p.who || 'corner' };
}

// ── The status board (R-SMOOTHNESS Round H) ─────────────────────────────────
// The whole queue in TaskQueueFAB's proven order, not just running work:
// waiting-on-you (with the actual question + an inline answer), queued, and
// the recent finished/failed tail. Polls v2-task-list every 5s while the
// window is open — same cadence the orphaned FAB used.
function useTaskBoard(worldId) {
  const [board, setBoard] = useState({ needs_input: [], queued: [], done: [], failed: [] });
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    const load = async () => {
      try {
        const r = await authFetch(`/api/dashboard/v2-task-list?client_id=${encodeURIComponent(worldId)}&limit=50`);
        if (!r.ok) return;
        const d = await r.json();
        if (!alive) return;
        const rows = Array.isArray(d.tasks) ? d.tasks : [];
        const pick = (st) => rows.filter((t) => t.status === st);
        setBoard({
          needs_input: pick('needs_input'),
          queued: [...pick('queued'), ...pick('waiting')],
          done: pick('done').slice(0, 5),
          failed: pick('failed').slice(0, 5),
        });
      } catch { /* poll again */ }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId]);
  return board;
}

// Inline answer for a waiting task: the typed reply posts into the task's room
// (the documented needs_input answer path), quoting the question for context.
function AnswerBox({ task, worldId }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const q = String(task?.metadata?.question || '').trim();
  if (sent) return <div style={{ ...btnRow, color: 'var(--muted)', fontSize: 12 }}>Answer sent to the room.</div>;
  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setFailed(false);
    try {
      const r = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomPayload({ project: task.project, mission: task.metadata?.mission_slug, who: task.agent }, worldId,
          q ? `Answering your question ("${q.slice(0, 120)}"): ${body}` : body)),
      });
      if (r && r.ok) setSent(true); else setFailed(true);
    } catch { setFailed(true); }
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Type your answer…"
          style={{ flex: 1, height: 32, borderRadius: 10, border: '1px solid var(--divider)', background: 'var(--surface-2)', color: 'var(--fg)', padding: '0 10px', font: '400 13px var(--font-sans)' }}
        />
        <button type="button" style={startBtn} onClick={send}>Send</button>
      </div>
      {failed ? <div style={{ marginTop: 4, fontSize: 12, color: 'var(--accent)' }}>That didn't send. Try again.</div> : null}
    </div>
  );
}

function SectionHeader({ label, count, dim }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          flex: 'none',
          borderRadius: '50%',
          background: dim ? 'transparent' : 'var(--accent)',
          border: dim ? '1.5px solid var(--accent)' : 'none',
          boxShadow: dim ? 'none' : '0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)',
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
        {label}
        {count > 1 ? ` · ${count}` : ''}
      </span>
    </div>
  );
}

const btnRow = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 };
const startBtn = {
  height: 32, padding: '0 16px', borderRadius: 10, border: '1px solid var(--accent)',
  background: 'transparent', color: 'var(--accent)', font: '600 13px var(--font-sans)',
  cursor: 'pointer',
};
// Quiet text buttons, deliberately borderless — one bordered accent control per
// row ("Start it") wins outright; see the in-chat card's critic round 2026-07-27.
const ghostBtn = {
  height: 32, padding: '0 8px', borderRadius: 10, border: 'none',
  background: 'transparent', color: 'var(--muted)', font: '600 13px var(--font-sans)',
  cursor: 'pointer',
};

// The three things you can do about an outstanding promise, from outside its
// room: start it, chase it, or release it. Start/Chase confirm only what landed
// (send resolves ok:false on a failed POST — never claim "told them" over a
// message that never left the browser). Dismiss is the new one: the user
// deciding this promise is no longer owed.
function PromiseActions({ promise, worldId, onDismissed }) {
  const [tapped, setTapped] = useState('');
  const [failed, setFailed] = useState('');
  const one = String(promise.title || '').split('\n')[0].trim();
  if (!one) return null;

  const post = async (kind, doIt) => {
    if (tapped) return;
    setTapped(kind);
    setFailed('');
    let ok = false;
    try { ok = await doIt(); } catch { ok = false; }
    if (ok !== true) {
      setTapped('');
      setFailed(kind === 'dismiss' ? 'That didn’t clear. Try again.' : 'That didn’t send. Try again.');
    } else if (kind === 'dismiss') {
      onDismissed?.(promise.id);
    }
  };

  const sendToRoom = (text) => async () => {
    const r = await authFetch('/api/dashboard/supabase-messages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(roomPayload(promise, worldId, text)),
    });
    return Boolean(r && r.ok);
  };
  const dismiss = async () => {
    const r = await authFetch('/api/dashboard/dismiss-followup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: promise.id, client: worldId }),
    });
    return Boolean(r && r.ok);
  };

  if (tapped === 'start' || tapped === 'chase') {
    return (
      <div style={{ ...btnRow, color: 'var(--muted)', fontSize: 12 }}>
        {tapped === 'start' ? 'Told them to start it.' : 'Asked where they are.'}
      </div>
    );
  }
  return (
    <div>
      {failed ? (
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--error, #F87171)' }}>{failed}</div>
      ) : null}
      <div style={btnRow}>
        <button type="button" style={startBtn} disabled={tapped === 'dismiss'}
          onClick={() => post('start', sendToRoom(`Go ahead and start this now: ${one}`))}>
          Start it
        </button>
        <button type="button" style={ghostBtn} disabled={tapped === 'dismiss'}
          onClick={() => post('chase', sendToRoom(`Where are you on this? ${one}`))}>
          Chase it
        </button>
        <button type="button" style={ghostBtn} disabled={tapped === 'dismiss'}
          onClick={() => post('dismiss', dismiss)}>
          {tapped === 'dismiss' ? 'Clearing…' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

function Row({ title, meta, metaQuiet, right, rightTone, wrap, actions, separated }) {
  const titleStyle = wrap
    ? { fontSize: 14, color: 'var(--fg)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }
    : { fontSize: 14, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  return (
    <div style={separated ? { paddingBottom: 12, borderBottom: '1px solid var(--hair)' } : undefined}>
      <div style={{ display: 'flex', alignItems: wrap ? 'flex-start' : 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>{title}</div>
          {meta ? (
            <div style={metaQuiet
              ? { fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginTop: 4 }
              : { fontSize: 12, color: 'var(--fg)', fontWeight: 600, marginTop: 2 }}>
              {meta}
            </div>
          ) : null}
        </div>
        {right ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: rightTone || 'var(--muted)', flex: 'none', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {right}
          </span>
        ) : null}
      </div>
      {actions || null}
    </div>
  );
}

export default function WorkersShell({ onClose, expanded = false, onToggleWidth }) {
  const worldId = useWorldId();
  // room=null -> the whole world's in-flight work: this window is the one place
  // that answers "is anything running?", so it never narrows to a project.
  const { tasks, promises } = useRunningTasks(null);
  const board = useTaskBoard(worldId);
  const [now, setNow] = useState(() => Date.now());
  // Dismissed ids the server confirmed, hidden immediately; the hook's next
  // refetch (realtime on followups fires within seconds) makes it permanent.
  const [cleared, setCleared] = useState(() => new Set());
  const livePromises = promises.filter((p) => !cleared.has(p.id));
  const boardTotal = board.needs_input.length + board.queued.length + board.done.length + board.failed.length;
  const total = tasks.length + livePromises.length + boardTotal;

  useEffect(() => {
    if (!total) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [total]);

  return (
    <div className="cv6-workers-shell" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, width: '100%', flex: 1, position: 'relative', background: 'var(--ground)' }}>
      {/* Header mirrors the Email column head: quiet title, close on the right. */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid var(--divider)' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Background work</span>
        <span style={{ flex: 1 }} />
        <ColumnExpandButton expanded={expanded} onToggle={onToggleWidth} label="background work" />
        {onClose ? (
          <button type="button" className="cv6-chat-header-button cv6-column-close" aria-label="Close background work" title="Close background work" onClick={onClose}>
            <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        ) : null}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {!total ? (
            // The window can be open while nothing is in flight (unlike the old
            // in-chat card, which unmounted) — say so instead of showing a void.
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5 }}>
              Nothing is running in the background right now.
              <br />
              Jobs your agents hand off, and things they promise to come back with, show up here.
            </div>
          ) : (
            <>
              {tasks.length ? <SectionHeader label="Working in the background" count={tasks.length} /> : null}
              {tasks.map((t, idx) => (
                <Row
                  key={t.id}
                  title={t.title}
                  meta={[titleCaseName(t.who), roomLabel(t) && `in ${roomLabel(t)}`].filter(Boolean).join(' · ')}
                  right={t.since ? `running ${fmtSpan(minsSince(t.since, now))}` : ''}
                  separated={idx < tasks.length - 1 || livePromises.length > 0}
                />
              ))}

              {livePromises.length ? (
                <div style={{ marginTop: tasks.length ? 8 : 0 }}>
                  <SectionHeader label="Coming back to you" count={livePromises.length} dim />
                </div>
              ) : null}
              {livePromises.map((p, idx) => {
                const due = p.due ? new Date(p.due).getTime() : NaN;
                const overdue = Number.isFinite(due) && due < now;
                const waited = minsSince(p.since, now);
                const right = overdue
                  ? `overdue ${fmtSpan(Math.round((now - due) / 60000))}`
                  : (p.since ? `waiting ${fmtSpan(waited)}` : '');
                const split = splitCount(p.title);
                const where = roomLabel({ ...p, who: p.who });
                return (
                  <Row
                    key={p.id}
                    title={split.title}
                    // Cross-room window, so — unlike the in-room card — WHERE the
                    // promise lives is real information, not a redundant slug.
                    meta={[where && `in ${where}`, split.more].filter(Boolean).join(' · ')}
                    metaQuiet
                    right={right}
                    rightTone={overdue ? 'var(--accent)' : 'var(--muted)'}
                    wrap
                    actions={<PromiseActions promise={p} worldId={worldId} onDismissed={(id) => setCleared((s) => new Set(s).add(id))} />}
                    separated={idx < livePromises.length - 1}
                  />
                );
              })}

              {/* ── The status board (Round H): the rest of the queue, in the
                     proven FAB order. Needs-you first — it is the section that
                     can unblock a worker right now. */}
              {board.needs_input.length ? (
                <div style={{ marginTop: 8 }}>
                  <SectionHeader label="Waiting on you" count={board.needs_input.length} />
                </div>
              ) : null}
              {board.needs_input.map((t, idx) => (
                <Row
                  key={t.id}
                  title={t.title || t.text || 'A task'}
                  meta={String(t.metadata?.question || '').slice(0, 200)}
                  wrap
                  actions={<AnswerBox task={t} worldId={worldId} />}
                  separated={idx < board.needs_input.length - 1}
                />
              ))}

              {board.queued.length ? (
                <div style={{ marginTop: 8 }}>
                  <SectionHeader label="Queued" count={board.queued.length} dim />
                </div>
              ) : null}
              {board.queued.map((t, idx) => (
                <Row
                  key={t.id}
                  title={t.title || t.text || 'A task'}
                  meta={[titleCaseName(t.agent), t.project && `in ${t.project.replace(/-/g, ' ')}`].filter(Boolean).join(' · ')}
                  metaQuiet
                  separated={idx < board.queued.length - 1}
                />
              ))}

              {board.done.length ? (
                <div style={{ marginTop: 8 }}>
                  <SectionHeader label="Finished recently" count={board.done.length} dim />
                </div>
              ) : null}
              {board.done.map((t, idx) => (
                <Row key={t.id} title={t.title || t.text || 'A task'} metaQuiet separated={idx < board.done.length - 1} />
              ))}

              {board.failed.length ? (
                <div style={{ marginTop: 8 }}>
                  <SectionHeader label="Failed" count={board.failed.length} dim />
                </div>
              ) : null}
              {board.failed.map((t, idx) => (
                <Row
                  key={t.id}
                  title={t.title || t.text || 'A task'}
                  meta={String(t.error || '').slice(0, 160)}
                  metaQuiet
                  rightTone="var(--accent)"
                  separated={idx < board.failed.length - 1}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
