// cv6next — real conversation for one room, shaped to the agent-chat kit Turn element
// (data-each="messages" -> message.agentName/text/time/...). Wiring from the existing
// /api/dashboard/supabase-messages endpoint (the same one the dashboard uses). No fake
// data: messages are the room's real thread, oldest -> newest.

import { useState, useEffect, useCallback, useRef } from 'react';
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
// Always render in Phoenix time (America/Phoenix, no DST) so the timestamp is the
// same for everyone regardless of the viewer's machine timezone — Patrik runs on
// Phoenix time. Show only the clock for today's messages; prefix the date for older
// ones so a three-week-old message never reads as if it just arrived.
const PHX = 'America/Phoenix';
function hhmm(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-US', { timeZone: PHX, hour: 'numeric', minute: '2-digit' });
  const today = new Date().toLocaleDateString('en-US', { timeZone: PHX });
  const day = d.toLocaleDateString('en-US', { timeZone: PHX });
  if (day === today) return time;
  const date = d.toLocaleDateString('en-US', { timeZone: PHX, month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
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
  // Live "agent is working" feedback. After you send, we show activity immediately
  // (a generic working indicator) and, when the bridge emits real step heartbeats
  // keyed to your message, the ticking step thread. Settles when the reply lands.
  const [awaiting, setAwaiting] = useState(false);
  const [lastSentId, setLastSentId] = useState('');
  const lastSentTsRef = useRef(0);
  const [liveSteps, setLiveSteps] = useState([]);
  // On room open we baseline to the newest existing message so a thread that simply
  // ends on your earlier message doesn't show "working" — only a genuinely NEW send does.
  const baselineRef = useRef(false);
  // Content signature of the last thread we rendered. The poll runs every 3s and rebuilds
  // an identical array when nothing changed; pushing that new ref into state forces every
  // consumer (and the Home portal) to re-render and the scroll to jump. We only commit a
  // new messages array when the signature actually changed, so a quiet room stays still.
  const sigRef = useRef('');

  // Clear the outbox when you switch rooms (those messages belong to the old thread).
  useEffect(() => { setPending([]); }, [room?.id]);
  // Switching rooms must drop the previous thread immediately. The signature guard
  // below skips re-committing an unchanged thread, but a NEW empty room produces an
  // empty signature that matches the reset sentinel — so without clearing here, the
  // old room's messages would linger and an empty room would show the last room's
  // content. Clear the rendered thread on switch and use a null sentinel so the very
  // first load (even an empty one) always commits.
  useEffect(() => { sigRef.current = null; setMessages([]); setBlocks(null); }, [room?.id]);
  // Switching rooms drops any in-flight "working" state too.
  useEffect(() => { setAwaiting(false); setLastSentId(''); setLiveSteps([]); lastSentTsRef.current = 0; baselineRef.current = false; }, [room?.id]);

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
      ? { client_id: worldId, agent: 'corner', project: room.projectSlug, text: body, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: String(room.missionSlug || room.id || '').split(':').pop() } }
      : room.isProject
        ? { client_id: worldId, agent: 'corner', project: room.id, text: body, role: 'user', source: 'corner-dashboard' }
        : { client_id: worldId, agent: room.id, text: body, role: 'user', source: 'corner-dashboard' };
    // Show "working" the instant you send, so the thread never looks dead.
    setAwaiting(true);
    setLiveSteps([]);
    lastSentTsRef.current = now.getTime();
    try {
      const r = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      // The created row id is the parent the bridge keys its step heartbeats to.
      try { const j = await r.clone().json(); const id = j?.message?.id; if (id) setLastSentId(String(id)); } catch { /* non-JSON */ }
      setReloadKey((k) => k + 1);
      return !!(r && r.ok);
    } catch { setAwaiting(false); return false; }
  }, [worldId, room?.id, room?.isProject, room?.isMission, room?.missionSlug, room?.projectSlug]);

  // Poll the live step heartbeats for the message you just sent (events table via
  // /message-steps; client-side anon reads are RLS-blocked, hence the server proxy).
  useEffect(() => {
    if (!awaiting || !worldId || !room?.id) { return undefined; }
    let alive = true;
    const agentParam = (room.isMission || room.isProject) ? 'corner' : room.id;
    const projParam = room.isMission ? room.projectSlug : (room.isProject ? room.id : '');
    const q = new URLSearchParams({ client_id: worldId, agent: agentParam, limit: '50' });
    if (projParam) q.set('project', projParam);
    const poll = () => authFetch(`/api/dashboard/message-steps?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const all = Array.isArray(d.steps) ? d.steps : [];
        // Only the steps for THIS sent message; if we don't yet have its id, show nothing
        // (the generic working indicator still renders from `awaiting`).
        const mine = lastSentId ? all.filter((s) => String(s.parent_message_id) === lastSentId) : [];
        setLiveSteps(mine);
      })
      .catch(() => {});
    poll();
    const t = setInterval(poll, 1500);
    // Safety: never spin forever if no reply/heartbeat ever arrives.
    const stop = setTimeout(() => { if (alive) setAwaiting(false); }, 120000);
    return () => { alive = false; clearInterval(t); clearTimeout(stop); };
  }, [awaiting, lastSentId, worldId, room?.id, room?.isMission, room?.isProject, room?.projectSlug]);

  useEffect(() => {
    if (!worldId || !room?.id) { setMessages([]); setStatus('loading'); return undefined; }
    let alive = true;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    const params = new URLSearchParams();
    params.set('client', worldId);
    // Mission rooms key on the mission slug; project rooms on the project slug;
    // everything else is an agent thread.
    // Agents store the BARE mission slug (e.g. "corner-ui-cv6"), but the room handle is the
    // colon-joined "project:mission" form. Query on the last segment so the thread isn't empty.
    if (room.isMission) params.set('mission_slug', String(room.missionSlug || room.id || '').split(':').pop());
    // The PROJECT chat is the project-level conversation only. Mission-room messages
    // also carry project=<slug> (so they roll up under the project), but they belong to
    // their mission room, not the project chat — otherwise a message sent in Chat or
    // Files Panel also shows in the Corner project room. `project_only` tells the API to
    // exclude any mission-tagged rows from the project thread.
    else if (room.isProject) { params.set('project', room.id); params.set('project_only', '1'); }
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
          // Most Corner-room file posts are the TEXT shape, not structured columns:
          //   single → "Attached file: NAME\nURL"
          //   multi  → "Attached N files: NAME1, NAME2\nURL1\nURL2"
          // (canonical per bridge.py / supabase-listener.py). Parse names + URLs from
          // the text so they render as cards instead of plain "Attached file:" text.
          const rawText = m.text || '';
          const lines = rawText.split('\n');
          const single = /^\s*attached file:\s*(.+?)\s*$/i.exec(lines[0] || '');
          const multi = /^\s*attached\s+\d+\s+files?:\s*(.+?)\s*$/i.exec(lines[0] || '');
          const textUrls = lines.slice(1).map((s) => s.trim()).filter(Boolean);
          // An agent auto-shared file carries its real URL on metadata.attachment (singular
          // object {url, mime, name, size}) — the announcement text is just "Attached file: NAME"
          // with NO URL line. This is the most common Corner-room file shape, so check it first.
          const metaAttach = (m.metadata && m.metadata.attachment && (m.metadata.attachment.url || m.metadata.attachment.name)) ? m.metadata.attachment : null;
          const isFile = !!m.attachment_url || !!metaAttach || !!single || !!multi;
          const fileName = m.attachment_name || (metaAttach && metaAttach.name) || (single ? single[1] : '');
          // Live Goal Thread: a structured reply carries its blocks on metadata.blocks.
          // We attach them to THIS message so the thread renders inline as that agent
          // turn (history stays above it), instead of taking over the whole screen.
          const msgBlocks = Array.isArray(m.metadata?.blocks) && m.metadata.blocks.length ? m.metadata.blocks : null;
          // Build the grouped attachments array MessageAttachments renders from. Priority:
          // structured metadata.attachments[] → single attachment_url column → parsed text.
          let attachments = [];
          let displayText = rawText;
          if (Array.isArray(m.metadata?.attachments) && m.metadata.attachments.length) {
            attachments = m.metadata.attachments;
          } else if (metaAttach) {
            attachments = [{
              url: metaAttach.url || '',
              name: metaAttach.name || fileName || 'File',
              mime: metaAttach.mime || '',
              size: metaAttach.size || 0,
            }];
            displayText = ''; // pure attachment auto-share → show the card, not the "Attached file:" note
          } else if (m.attachment_url) {
            attachments = [{
              url: m.attachment_url,
              name: m.attachment_name || 'File',
              mime: m.file_mime_type || 'application/octet-stream',
              size: m.file_size || 0,
            }];
          } else if (multi) {
            const names = multi[1].split(',').map((s) => s.trim()).filter(Boolean);
            attachments = names.map((n, i) => ({ name: n, url: textUrls[i] || textUrls[0] || '', mime: '', size: 0 }));
            displayText = ''; // pure attachment announcement → show cards, not the note
          } else if (single) {
            attachments = [{ name: single[1], url: textUrls[0] || '', mime: '', size: 0 }];
            displayText = '';
          }
          return {
            id: m.id || '',
            agentInitials: initials(name),
            agentName: name,
            agentTint: isUser ? 'accent' : tintFor(m.agent || room.name),
            isUser,
            text: displayText,
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
        // Only re-commit when the thread actually changed (see sigRef). A no-op poll keeps the
        // existing array ref, so the list doesn't re-render and the scroll holds its place.
        const sig = msgs.map((m) => `${m.ts}|${m.text}|${m.attachments?.length || 0}|${m.blocks ? m.blocks.length : 0}`).join('~');
        if (sig !== sigRef.current) {
          sigRef.current = sig;
          setMessages(msgs);
        }
        // Drive the live "working" feedback from the thread itself, so it fires no matter
        // how the message was sent (rich composer, choice tap, etc.) — not only via send().
        const tms = (m) => (m.ts ? new Date(m.ts).getTime() : 0) || 0;
        const newestUser = msgs.filter((m) => m.isUser && m.id).sort((a, b) => tms(b) - tms(a))[0];
        const newestReply = msgs.filter((m) => !m.isUser).sort((a, b) => tms(b) - tms(a))[0];
        if (!baselineRef.current) {
          // First load for this room: remember where the thread is, show nothing.
          baselineRef.current = true;
          const newestAny = msgs.map(tms).reduce((a, b) => Math.max(a, b), 0);
          lastSentTsRef.current = newestAny;
        } else if (newestUser && tms(newestUser) > lastSentTsRef.current) {
          // A newer user message than anything we've tracked → the agent is now on it.
          lastSentTsRef.current = tms(newestUser);
          setLastSentId(String(newestUser.id));
          setAwaiting(true);
          setLiveSteps([]);
        } else if (newestReply && tms(newestReply) >= lastSentTsRef.current && lastSentTsRef.current) {
          // A reply at/after our last user message → settle.
          setAwaiting(false);
        }
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
  return { messages: merged, blocks, status, send, awaiting, liveSteps };
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

// ── The editable forward plan for one room (goal-thread-plan mission) ──
// Source of truth = room-goal-steps.json (the per-room checklist), now carrying source +
// proposed so the three item types read apart: DONE history lives in the message blocks
// above; here we hold the FUTURE — user-added steps (source:user) and agent suggestions
// (source:agent, proposed). The user steers it: add / check-done / edit / accept / dismiss,
// and hands a step to the agent via the room's normal send() (a real message, not a side
// channel). Polls so an agent that proposes a next step shows up without a refresh.
export function useRoomPlan(worldId, room) {
  const [plan, setPlan] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const roomKey = roomKeyFor(room);

  useEffect(() => {
    if (!worldId || !roomKey) { setPlan([]); return undefined; }
    let alive = true;
    const load = () => authFetch(`/api/dashboard/room-goal-steps?world=${encodeURIComponent(worldId)}&room=${encodeURIComponent(roomKey)}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const list = Array.isArray(d.list) ? d.list : [];
        // Tolerate old rows written before source/proposed existed.
        setPlan(list.map((s) => ({
          id: s.id, text: s.text || '', done: !!s.done,
          source: s.source === 'agent' ? 'agent' : 'user',
          proposed: !!s.proposed,
        })));
      })
      .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId, roomKey, reloadKey]);

  const post = useCallback(async (body) => {
    if (!worldId || !roomKey) return false;
    try {
      const r = await authFetch('/api/dashboard/room-goal-steps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world: worldId, room: roomKey, ...body }),
      });
      if (r && r.ok) { setReloadKey((k) => k + 1); return true; }
    } catch { /* ignore */ }
    return false;
  }, [worldId, roomKey]);

  // Optimistic where it helps the tap feel instant; the 5s poll reconciles to truth.
  const addStep = useCallback((text) => {
    const t = String(text || '').trim(); if (!t) return Promise.resolve(false);
    setPlan((p) => [...p, { id: `tmp-${p.length}-${t.slice(0, 8)}`, text: t, done: false, source: 'user', proposed: false }]);
    return post({ action: 'add', text: t });
  }, [post]);
  const toggleStep = useCallback((id) => {
    setPlan((p) => p.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
    return post({ action: 'toggle', id });
  }, [post]);
  const editStep = useCallback((id, text) => {
    const t = String(text || '').trim(); if (!t) return Promise.resolve(false);
    setPlan((p) => p.map((s) => (s.id === id ? { ...s, text: t, source: 'user', proposed: false } : s)));
    return post({ action: 'edit', id, text: t });
  }, [post]);
  const acceptStep = useCallback((id) => {
    setPlan((p) => p.map((s) => (s.id === id ? { ...s, source: 'user', proposed: false } : s)));
    return post({ action: 'accept', id });
  }, [post]);
  const dismissStep = useCallback((id) => {
    setPlan((p) => p.filter((s) => s.id !== id));
    return post({ action: 'delete', id });
  }, [post]);

  return { plan, actions: { addStep, toggleStep, editStep, acceptStep, dismissStep } };
}
