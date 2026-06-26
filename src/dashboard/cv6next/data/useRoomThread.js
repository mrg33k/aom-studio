// cv6next — real conversation for one room, shaped to the agent-chat kit Turn element
// (data-each="messages" -> message.agentName/text/time/...). Wiring from the existing
// /api/dashboard/supabase-messages endpoint (the same one the dashboard uses). No fake
// data: messages are the room's real thread, oldest -> newest.

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../../lib/authFetch';
import { titleForAgent } from './agentTitles.js';

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
  const [blocks, setBlocks] = useState(null);
  const [status, setStatus] = useState('loading');
  const [reloadKey, setReloadKey] = useState(0);
  // Optimistic outbox: your just-sent message shows INSTANTLY (the POST + 3s poll would
  // otherwise leave the thread looking dead for a beat). Each entry is dropped once the
  // real row comes back from the server (matched by text), so there's never a duplicate.
  const [pending, setPending] = useState([]);

  // Clear the outbox when you switch rooms (those messages belong to the old thread).
  useEffect(() => { setPending([]); }, [room?.id]);

  // Post a real user message into this room (composer + choice/question taps).
  // Agent rooms POST to the agent slug; project rooms to the project slug. After
  // the write, bump reloadKey so the thread refetches and the message appears.
  const send = useCallback(async (text) => {
    const body = String(text || '').trim();
    if (!worldId || !room?.id || !body) return false;
    // Show it immediately as your turn (reconciled away when the real row arrives).
    const now = new Date();
    setPending((p) => [...p, {
      _opt: true, optId: `${now.getTime()}-${p.length}`,
      agentInitials: initials('You'), agentName: 'You', agentTint: 'accent', isUser: true,
      text: body, time: hhmm(now.toISOString()), ts: now.toISOString(),
      isFile: false, fileName: '', attachmentUrl: '', fileMime: '', fileSize: 0, blocks: null,
    }]);
    const payload = room.isMission
      ? { client_id: worldId, agent: 'corner', project: room.projectSlug, text: body, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: room.missionSlug || room.id } }
      : room.isProject
        ? { client_id: worldId, agent: 'corner', project: room.id, text: body, role: 'user', source: 'corner-dashboard' }
        : { client_id: worldId, agent: room.id, text: body, role: 'user', source: 'corner-dashboard' };
    try {
      const r = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setReloadKey((k) => k + 1);
      return !!(r && r.ok);
    } catch { return false; }
  }, [worldId, room?.id, room?.isProject, room?.isMission, room?.missionSlug, room?.projectSlug]);

  useEffect(() => {
    if (!worldId || !room?.id) { setMessages([]); setStatus('loading'); return undefined; }
    let alive = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    const params = new URLSearchParams();
    params.set('client', worldId);
    // Mission rooms key on the mission slug; project rooms on the project slug;
    // everything else is an agent thread.
    if (room.isMission) params.set('mission_slug', room.missionSlug || room.id);
    else if (room.isProject) params.set('project', room.id);
    else params.set('agent', room.id);
    params.set('limit', '40');
    const load = () => authFetch(`/api/dashboard/supabase-messages?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const raw = Array.isArray(d?.messages) ? d.messages : [];
        // Drop any optimistic message the server now reflects (matched by text), so the
        // real row replaces it with no duplicate.
        const userTexts = new Set(raw.filter((m) => m.role === 'user' || m.user_name).map((m) => (m.text || '').trim()));
        setPending((prev) => prev.filter((op) => !userTexts.has((op.text || '').trim())));
        // The live Goal Thread (agent-talk): structured blocks ride on a message's
        // metadata.blocks. The agent re-emits the current thread state in its latest
        // structured reply, so the freshest message that carries blocks IS the thread.
        let liveBlocks = null;
        for (let i = raw.length - 1; i >= 0; i -= 1) {
          const b = raw[i]?.metadata?.blocks;
          if (Array.isArray(b) && b.length) { liveBlocks = b; break; }
        }
        setBlocks(liveBlocks);
        const msgs = raw.map((m) => {
          const isUser = m.role === 'user' || !!m.user_name;
          // Agent messages show the agent's ROLE TITLE, never its persona name (titles
          // everywhere, decided 2026-06-23).
          const name = isUser ? (m.user_name || 'You') : titleForAgent(m.agent || room.name);
          // A file an agent made shows in the thread (rule: files live in the room).
          // It arrives either as a real attachment (attachment_url) or as an
          // "Attached file: <name>" note. Either way we render it as a file card.
          const fileMatch = /^\s*attached file:\s*(.+?)\s*$/i.exec(m.text || '');
          const fileName = m.attachment_name || (fileMatch ? fileMatch[1] : '');
          const isFile = !!m.attachment_url || !!fileMatch;
          // Live Goal Thread: a structured reply carries its blocks on metadata.blocks.
          // We attach them to THIS message so the thread renders inline as that agent
          // turn (history stays above it), instead of taking over the whole screen.
          const msgBlocks = Array.isArray(m.metadata?.blocks) && m.metadata.blocks.length ? m.metadata.blocks : null;
          // Attachment handling: support both single attachment (attachment_url) and
          // multiple attachments (metadata.attachments array). Group attachments for
          // rendering in MessageAttachments (galleries, file collections, etc.).
          let attachments = [];
          if (Array.isArray(m.metadata?.attachments) && m.metadata.attachments.length) {
            attachments = m.metadata.attachments;
          } else if (m.attachment_url) {
            // Fallback: single attachment fields → single-element array
            attachments = [{
              url: m.attachment_url,
              name: m.attachment_name || 'File',
              mime: m.file_mime_type || 'application/octet-stream',
              size: m.file_size || 0,
            }];
          }
          return {
            agentInitials: initials(name),
            agentName: name,
            agentTint: isUser ? 'accent' : tintFor(m.agent || room.name),
            isUser,
            text: m.text || '',
            time: hhmm(m.timestamp),
            ts: m.timestamp || null,
            isFile,
            fileName,
            attachmentUrl: m.attachment_url || '',
            fileMime: m.file_mime_type || '',
            fileSize: m.file_size || 0,
            attachments, // Array of {url, name, mime, size} for grouped rendering
            blocks: msgBlocks,
          };
        }).filter((m) => m.text || m.isFile || m.blocks || m.attachments?.length);
        setMessages(msgs);
        setStatus(msgs.length ? 'ready' : 'empty');
      })
      .catch(() => { if (alive) setStatus('error'); });
    load();
    // Live thread: poll so new agent messages + structured blocks (the step thread
    // animating from real state) appear without a manual refresh.
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId, room?.id, room?.name, room?.isProject, room?.isMission, room?.missionSlug, reloadKey]);

  // Merge the optimistic outbox at the tail (newest) so a just-sent message shows at once.
  const merged = pending.length ? [...messages, ...pending] : messages;
  return { messages: merged, blocks, status, send };
}

// ── The Goal Thread: real per-room step state (the step thread, our live conversation) ──
// Steps come from room-goal-steps (the ordered checklist the agent works); the goal title
// from room-goals. Per the design guardrail, a step animates (active/spinner) ONLY when the
// agent is live right now; otherwise it renders its static state (done or pending), never a
// fake loop. Returns null when the room has no goal/steps (so the thread simply doesn't show).
function roomKeyFor(room) {
  if (!room?.id) return '';
  return room.isProject ? String(room.id) : `agent:${room.id}`;
}
const LIVE = new Set(['live', 'working', 'online', 'running']);
export function useGoalThread(worldId, room) {
  const [goal, setGoal] = useState(null);
  useEffect(() => {
    const roomKey = roomKeyFor(room);
    if (!worldId || !roomKey) { setGoal(null); return undefined; }
    let alive = true;
    Promise.all([
      authFetch(`/api/dashboard/room-goal-steps?world=${encodeURIComponent(worldId)}&room=${encodeURIComponent(roomKey)}`).then((r) => (r && r.ok ? r.json() : null)).catch(() => null),
      authFetch(`/api/dashboard/room-goals?world=${encodeURIComponent(worldId)}`).then((r) => (r && r.ok ? r.json() : null)).catch(() => null),
    ]).then(([stepsD, goalsD]) => {
      if (!alive) return;
      const list = Array.isArray(stepsD?.list) ? stepsD.list : [];
      const goalText = goalsD?.rooms?.[roomKey]?.goal || '';
      if (!list.length && !goalText) { setGoal(null); return; }
      const live = LIVE.has(String(room.status || '').toLowerCase());
      const doneCount = list.filter((s) => s.done).length;
      const total = list.length;
      let activeAssigned = false;
      const checklist = list.map((s) => {
        let state = s.done ? 'done' : 'pending';
        if (!s.done && !activeAssigned && live) { state = 'active'; activeAssigned = true; }
        return { label: s.text || '', state };
      });
      setGoal({
        id: roomKey, title: goalText || 'Current goal',
        step: Math.min(doneCount + 1, total || 1), doneCount, total,
        pct: total ? Math.round((doneCount / total) * 100) : 0,
        checklist,
      });
    });
    return () => { alive = false; };
  }, [worldId, room?.id, room?.isProject, room?.status]);
  return goal;
}
