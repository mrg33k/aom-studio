// WorkersBoard — the status-board data + inline answer for WorkersShell
// (R-SMOOTHNESS Round H). Its own module ON PURPOSE: a new module changes the
// chunk graph and mints fresh asset URLs (the Round D stale-CDN-chunk lesson).
import { useEffect, useState } from 'react';
import { authFetch } from '../lib/authFetch.js';

import { roomPayload, btnRow, startBtn } from './WorkersShell.jsx';

// ── The status board (R-SMOOTHNESS Round H) ─────────────────────────────────
// The whole queue in TaskQueueFAB's proven order, not just running work:
// waiting-on-you (with the actual question + an inline answer), queued, and
// the recent finished/failed tail. Polls v2-task-list every 5s while the
// window is open — same cadence the orphaned FAB used.
export function useTaskBoard(worldId) {
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
export function AnswerBox({ task, worldId }) {
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

