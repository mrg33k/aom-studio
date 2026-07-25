// cv6next — the chat "working in the background" card.
//
// Appears ONLY while ≥1 handed-off job is actively running for this room; each row counts
// UP from when the job started (no fabricated ETA — we can't know a job's length) and the
// whole card vanishes the instant the last job leaves the running state. This is the
// user-transparency half of Patrik's 2026-07-25 ask ("show a card with a timer of the
// background agent that only appears as long as the background agent is running"). The
// come-back-when-done half is the followups pipeline, separate.

import React, { useState, useEffect } from 'react';
import { useRunningTasks } from './data/useRunningTasks.js';

function titleCaseName(s) {
  const v = String(s || '').replace(/[-_]/g, ' ').trim();
  return v ? v.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Agent';
}

function fmtElapsed(ms) {
  let n = ms;
  if (!Number.isFinite(n) || n < 0) n = 0;
  const s = Math.floor(n / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (x) => String(x).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

export default function RunningTasksCard({ room }) {
  const tasks = useRunningTasks(room);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second only while something is running — no idle timer.
  useEffect(() => {
    if (!tasks.length) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tasks.length]);

  if (!tasks.length) return null;

  return (
    <div
      data-cv6-running-tasks=""
      style={{
        margin: '14px 0 4px',
        border: '1px solid var(--hair)',
        background: 'var(--surface)',
        borderRadius: 14,
        padding: '11px 13px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            flex: 'none',
            borderRadius: '50%',
            background: 'var(--accent)',
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent)',
          }}
        />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: '.04em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          Working in the background{tasks.length > 1 ? ` · ${tasks.length}` : ''}
        </span>
      </div>

      {tasks.map((t) => {
        const started = t.since ? new Date(t.since).getTime() : NaN;
        const elapsed = Number.isFinite(started) ? fmtElapsed(now - started) : '';
        return (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  color: 'var(--fg)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                {titleCaseName(t.who)}
                {t.project ? ` · ${t.project}` : ''}
              </div>
            </div>
            {elapsed ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--muted)',
                  flex: 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {elapsed}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
