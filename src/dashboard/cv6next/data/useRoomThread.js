// cv6next — real conversation for one room, shaped to the agent-chat kit Turn element
// (data-each="messages" -> message.agentName/text/time/...). Wiring from the existing
// /api/dashboard/supabase-messages endpoint (the same one the dashboard uses). No fake
// data: messages are the room's real thread, oldest -> newest.

import { useState, useEffect } from 'react';
import { authFetch } from '../../lib/authFetch';

const TINTS = ['violet', 'pink', 'teal', 'lime', 'amber', 'accent'];
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function cap(s) { const v = String(s || ''); return v ? v[0].toUpperCase() + v.slice(1) : ''; }
function tintFor(seed) {
  let h = 0; for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
function hhmm(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  let h = d.getHours(); const m = d.getMinutes();
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ap}`;
}

// Fetch the room's thread. `room` is an agent room { id (slug), name }.
export function useRoomThread(worldId, room) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!worldId || !room?.id) { setMessages([]); setStatus('loading'); return undefined; }
    let alive = true;
    setStatus('loading');
    const params = new URLSearchParams();
    params.set('client', worldId);
    // Agent rooms key on the agent slug; project rooms key on the project slug.
    if (room.isProject) params.set('project', room.id);
    else params.set('agent', room.id);
    params.set('limit', '40');
    authFetch(`/api/dashboard/supabase-messages?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const raw = Array.isArray(d?.messages) ? d.messages : [];
        const msgs = raw.map((m) => {
          const isUser = m.role === 'user' || !!m.user_name;
          const name = isUser ? (m.user_name || 'You') : cap(m.agent || room.name);
          return {
            agentInitials: initials(name),
            agentName: name,
            agentTint: isUser ? 'accent' : tintFor(m.agent || room.name),
            text: m.text || '',
            time: hhmm(m.timestamp),
          };
        }).filter((m) => m.text);
        setMessages(msgs);
        setStatus(msgs.length ? 'ready' : 'empty');
      })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, [worldId, room?.id, room?.name, room?.isProject]);

  return { messages, status };
}
