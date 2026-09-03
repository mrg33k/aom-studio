// WorkersBoard — the status-board data + inline answer for WorkersShell
// (R-SMOOTHNESS Round H). Its own module ON PURPOSE: a new module changes the
// chunk graph and mints fresh asset URLs (the Round D stale-CDN-chunk lesson).
import { useMemo, useState } from 'react';
import { convexWorldId, useConvexLive } from './data/convexClient.js';

import { roomTarget, sendRoomMessage, btnRow, startBtn } from './WorkersShell.jsx';

// ── The status board (R-SMOOTHNESS Round H) ─────────────────────────────────
// The whole queue in TaskQueueFAB's proven order, not just running work:
// waiting-on-you (with the actual question + an inline answer), queued, and
// the recent finished/failed tail. corner:retire-supabase (2026-09-03): a live
// tasks:find subscription on the Convex socket replaces the 5s v2-task-list
// poll, so a status flip shows the moment it lands.
const EMPTY_BOARD = { needs_input: [], queued: [], done: [], failed: [] };
const BOARD_ORDER = 'priority.desc,sort_order.asc,created_at.asc';

export function useTaskBoard(worldId) {
  const live = useConvexLive('tasks:find', worldId ? { client_id: convexWorldId(worldId), order: BOARD_ORDER, limit: 50 } : null);
  return useMemo(() => {
    const rows = Array.isArray(live.value) ? live.value : [];
    if (!rows.length) return EMPTY_BOARD;
    const pick = (st) => rows.filter((t) => t.status === st);
    return {
      needs_input: pick('needs_input'),
      queued: [...pick('queued'), ...pick('waiting')],
      done: pick('done').slice(0, 5),
      failed: pick('failed').slice(0, 5),
    };
  }, [live.value]);
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
      const id = await sendRoomMessage({
        worldId,
        ...roomTarget({ project: task.project, mission: task.metadata?.mission_slug, who: task.agent }),
        text: q ? `Answering your question ("${q.slice(0, 120)}"): ${body}` : body,
        metadata: { interaction_mode: 'work' },
      });
      if (id) setSent(true); else setFailed(true);
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
