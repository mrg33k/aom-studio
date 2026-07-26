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

import React, { useState, useEffect } from 'react';
import { useRunningTasks } from './data/useRunningTasks.js';

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
        <SectionHeader label="Coming back to you" count={promises.length} dim />
      ) : null}
      {promises.map((p) => {
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
        return (
          <Row
            key={p.id}
            title={p.title}
            who={titleCaseName(p.who)}
            right={right}
            rightTone={overdue ? 'var(--accent)' : 'var(--muted)'}
            wrap
          />
        );
      })}
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

function minsSince(iso, nowMs) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((nowMs - t) / 60000));
}

function Row({ title, who, right, rightTone, wrap }) {
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
    <div style={{ display: 'flex', alignItems: wrap ? 'flex-start' : 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleStyle}>{title}</div>
        {/* The ACTOR is the answer to "by whom", so it carries body colour and weight
            rather than sitting muted behind the sentence. The room slug that used to
            trail here is gone: the card is already scoped to this room, so it was both
            redundant and an internal slug in a user-facing line (rule 4). */}
        <div style={{ fontSize: 12, color: 'var(--fg)', fontWeight: 600, marginTop: 2 }}>{who}</div>
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
  );
}
