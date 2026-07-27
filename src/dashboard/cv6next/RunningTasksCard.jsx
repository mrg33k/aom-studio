// cv6next — the chat "still in flight" card.
//
// Appears ONLY while this room has work outstanding; each row counts UP from when it
// started (no fabricated ETA — we can't know a job's length) and the card vanishes the
// instant the last item clears. Patrik's 2026-07-25 ask: "show a card with a timer of the
// background agent that only appears as long as the background agent is running".
//
// TWO kinds, deliberately labelled apart (no fake UI — never claim CPU is burning when
// all we know is that an agent made a promise):
//   Working in the background — a dispatched job actually executing (tasks table).
//   Coming back to you        — a pending come-back (followups): the agent SAID it would
//                               report back and hasn't yet.
//
// The second kind is why this card exists at all. v1 read only the tasks table, and Patrik
// still asked "is it actually running?" eight times that day: work started inside a room
// turn never creates a task row, and the room's live step strip only renders while
// `awaiting` is true — so the instant the agent replied "it's building in the background",
// every indicator went dark. The pending followup is the one record that outlives that
// reply, and showing it also makes the promise itself accountable (his other complaint the
// same day: "agents say they will follow up but they never do").

// 2026-07-27 — the card stopped being a counter you watch.
//
// Patrik: "how does tracking them help? how would the user ever get the job started?"
// He was right, and the card was the proof: zero onClick, zero <button>, and a GET-only
// endpoint. You could watch a number climb and do nothing about it. Meanwhile the
// follow-up machine behind it only ever posted a chat message and closed the record, so
// four of five come-backs that day came back asking his permission and nothing shipped.
//
// So every outstanding promise now carries the two actions that were missing. This needs
// no endpoint and no new state: the card is already mounted INSIDE SendCtx.Provider on
// both surfaces (ChatLifecycle / ChatDesktop), so a tap posts a real user message into
// the room — the exact same path as tapping a chip. The instruction is visible in the
// thread afterwards, which is the point: no invisible side effects, no fake UI.

import React, { useState, useEffect, useContext } from 'react';
import { useRunningTasks } from './data/useRunningTasks.js';
import { SendCtx } from './ChatGoalThread.jsx';

function titleCaseName(s) {
  const v = String(s || '').replace(/[-_]/g, ' ').trim();
  return v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Agent';
}

// Durations are written as durations ("running 8m", "waiting 5m", "overdue 12m"), never
// as a bare clock. The card used to show m:ss ("4:57") and a design critic read it as a
// wall-clock timestamp — if the reviewer misreads it, every user will too.
// "4m" / "2h 5m" / "3d" — minutes only past an hour reads absurd ("due in 359m").
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

export default function RunningTasksCard({ room }) {
  const { tasks, promises } = useRunningTasks(room);
  const [now, setNow] = useState(() => Date.now());
  const total = tasks.length + promises.length;

  // Tick once a second only while something is outstanding — no idle timer.
  useEffect(() => {
    if (!total) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [total]);

  if (!total) return null;

  return (
    <div
      data-cv6-running-tasks=""
      // Spacing is on the 4/8 scale (design-gate R3 / spacing-density-standard). v1 shipped
      // 14px margin, 11px 13px padding and gap 9 -- eyeballed values, none on the scale.
      style={{
        margin: '16px 0 4px',
        border: '1px solid var(--hair)',
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        // 12 between siblings vs 2 inside a row (title -> meta). With both at 8 you could
        // not tell at a glance which meta line belonged to which promise; separation
        // between items must beat separation within one.
        gap: 12,
      }}
    >
      {tasks.length ? (
        <SectionHeader label="Working in the background" count={tasks.length} />
      ) : null}
      {tasks.map((t) => (
        <Row
          key={t.id}
          title={t.title}
          who={titleCaseName(t.who)}
          right={t.since ? `running ${fmtSpan(minsSince(t.since, now))}` : ''}
        />
      ))}

      {promises.length ? (
        // `spaced` only when a section precedes it: a SECTION break must out-weigh a ROW
        // break, otherwise the two groups read as one undifferentiated list.
        <SectionHeader label="Coming back to you" count={promises.length} dim spaced={tasks.length > 0} />
      ) : null}
      {promises.map((p, idx) => {
        const due = p.due ? new Date(p.due).getTime() : NaN;
        const overdue = Number.isFinite(due) && due < now;
        // ONE time per row, in the loud slot, always the most decision-relevant one:
        // how long you have been waiting -- or, once it breaks its own deadline, by how
        // much. The due countdown used to ALSO sit in the meta line; two co-equal times
        // meant neither read as THE number (Steffen, design-gate R3).
        const waited = minsSince(p.since, now);
        const right = overdue
          ? `overdue ${fmtSpan(Math.round((now - due) / 60000))}`
          : (p.since ? `waiting ${fmtSpan(waited)}` : '');
        const split = splitCount(p.title);
        return (
          <Row
            key={p.id}
            title={split.title}
            // The meta slot carries the GROUP COUNT, not an actor. On a dispatched job
            // "who" answers a real question — which worker has it. On a promise it is
            // always this room's own agent, so it printed "Corner" identically down
            // every row and cost a line each (the room slug was deleted from this same
            // line earlier for exactly that reason). The freed line now earns its keep.
            who={split.more}
            right={right}
            rightTone={overdue ? 'var(--accent)' : 'var(--muted)'}
            wrap
            actions={<PromiseActions title={split.title} />}
            // Items must separate more than the parts inside one item. With buttons in
            // the row that stopped being true at gap 12 — a row's buttons sat as close
            // to the NEXT promise as to their own title, and the list read as one blur.
            separated={idx < promises.length - 1}
          />
        );
      })}
    </div>
  );
}

function SectionHeader({ label, count, dim, spaced }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: spaced ? 8 : 0 }}>
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
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '.04em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}
      >
        {label}
        {count > 1 ? ` · ${count}` : ''}
      </span>
    </div>
  );
}

// The two things you can actually do about a promise that has stalled.
//
// Both post a real user message via the room's own send(), the same path a chip tap
// takes (ChatGoalThread's HandoffBtn is the precedent — "Posts a real instruction
// message into the room"). Nothing hidden happens.
//
// Neither is a filled primary on purpose. A card can hold several stalled promises, and
// five accent-filled buttons stacked down the chat column reads as an alarm rather than
// a set of choices; the outline still makes "Start it" the obvious move without shouting.
function PromiseActions({ title }) {
  const send = useContext(SendCtx);
  const [tapped, setTapped] = useState('');
  const [failed, setFailed] = useState(false);
  const one = String(title || '').split('\n')[0].trim();
  if (!one) return null;

  const fire = async (kind, text) => {
    // Guard the double-tap: send() is optimistic and there is no per-row busy state to
    // hang a spinner on, so the honest affordance is to disable and say what was sent.
    if (tapped) return;
    setTapped(kind);
    setFailed(false);
    // CONFIRM ONLY WHAT LANDED. `send` RESOLVES false on a failure (rejected POST,
    // read-only surface, missing room) — it does not throw, so the original bare
    // `try { send(text) } catch {}` could never see it and the card announced
    // "Told them to start it." over a send that never left the browser. Caught live
    // on production 2026-07-27 by intercepting the message POST with a 503: the
    // request failed and the card still claimed success.
    //
    // That is this card's own disease — a stated commitment with nothing behind it —
    // reproduced inside the fix for it, and in the worst spot: the user reads
    // "told them", walks away, and no one was ever told. `!== true` (not `=== false`)
    // so the no-op default context value, which resolves undefined, also reverts
    // instead of lying.
    let ok = false;
    try { ok = await send(text); } catch { ok = false; }
    if (ok !== true) { setTapped(''); setFailed(true); }
  };

  if (tapped) {
    return (
      <div style={{ ...btnRow, color: 'var(--muted)', fontSize: 12 }}>
        {tapped === 'start' ? 'Told them to start it.' : 'Asked where they are.'}
      </div>
    );
  }
  return (
    <div>
      {failed ? (
        // Restores the buttons rather than dead-ending, so the retry is one tap away.
        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--error, #F87171)' }}>
          That didn’t send. Try again.
        </div>
      ) : null}
      <div style={btnRow}>
        <button
          type="button"
          style={startBtn}
          onClick={() => fire('start', `Go ahead and start this now: ${one}`)}
        >
          Start it
        </button>
        <button
          type="button"
          style={ghostBtn}
          onClick={() => fire('chase', `Where are you on this? ${one}`)}
        >
          Chase it
        </button>
      </div>
    </div>
  );
}

// Buttons get their OWN row, never beside the text: the chat column is ~370px on a
// 1440 desktop and a promise title already wraps to two lines there.
const btnRow = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 };
const startBtn = {
  height: 32, padding: '0 16px', borderRadius: 10, border: '1px solid var(--accent)',
  background: 'transparent', color: 'var(--accent)', font: '600 13px var(--font-sans)',
  cursor: 'pointer',
};
const ghostBtn = {
  height: 32, padding: '0 16px', borderRadius: 10, border: '1px solid var(--hair)',
  background: 'transparent', color: 'var(--muted)', font: '600 13px var(--font-sans)',
  cursor: 'pointer',
};

// A grouped promise arrives as "<the promise> · +N more here" (written by
// scripts/promise-reconcile.py, which owns the other half of this convention).
// Jamming the count into the sentence made it wrap badly — "One soft check still
// holding it · +18 more" broke so that "more here" dangled alone on line two, which
// is the widow the design standard calls a FAIL. Split it out so the title is a clean
// sentence and the count becomes its own quiet line, in the slot the redundant actor
// label used to waste. Unmatched text passes straight through untouched.
const GROUPED = / · \+(\d+) more here$/;
function splitCount(title) {
  const t = String(title || '');
  const m = t.match(GROUPED);
  return m ? { title: t.replace(GROUPED, ''), more: `+${m[1]} more in this room` }
           : { title: t, more: '' };
}

function minsSince(iso, nowMs) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((nowMs - t) / 60000));
}

function Row({ title, who, right, rightTone, wrap, actions, separated }) {
  // A dispatched job's title is a short label, so one ellipsised line is right. A promise's
  // title is the sentence the agent actually said — truncating it mid-word throws away the
  // commitment, which is the whole reason the row is on screen. Those wrap to two lines.
  const titleStyle = wrap
    ? {
      fontSize: 14,
      color: 'var(--fg)',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      lineHeight: 1.35,
    }
    : {
      fontSize: 14,
      color: 'var(--fg)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
  return (
    <div style={separated ? { paddingBottom: 16, borderBottom: '1px solid var(--hair)' } : undefined}>
      <div style={{ display: 'flex', alignItems: wrap ? 'flex-start' : 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={titleStyle}>{title}</div>
        {/* The ACTOR is the answer to "by whom", so it carries body colour and weight
            rather than sitting muted behind the sentence. The room slug that used to
            trail here is gone: the card is already scoped to this room, so it was both
            redundant and an internal slug in a user-facing line (rule 4). */}
          {who ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginTop: 4 }}>{who}</div>
          ) : null}
        </div>
        {right ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: rightTone || 'var(--muted)',
              flex: 'none',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {right}
          </span>
        ) : null}
      </div>
      {actions || null}
    </div>
  );
}
