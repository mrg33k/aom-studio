// cv6next — real conversation for one room, shaped to the agent-chat kit Turn element
// (data-each="messages" -> message.agentName/text/time/...). Wiring from the existing
// /api/dashboard/supabase-messages endpoint (the same one the dashboard uses). No fake
// data: messages are the room's real thread, oldest -> newest.

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { authFetch } from '../../lib/authFetch';
import { supabase } from '../../lib/supabase.js';
import { demoFixtureActive } from '../../lib/fixtureClient.js';
import { titleForAgent } from './agentTitles.js';
import { extractLinkCards, stripTrailingCardUrl } from './resultLinks.js';
import { useDataContext } from '../providers/DataContext.jsx';

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

function cleanFileRef(raw) {
  return String(raw || '')
    .trim()
    .replace(/^`+|`+$/g, '')
    .replace(/^["']+|["']+$/g, '');
}

function cornerPathFromText(raw) {
  const value = cleanFileRef(raw);
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const match = value.match(/(?:^|\/)(corner\/users\/[^)\s"'`]+)$/i);
  if (match) return match[1];
  return /^corner\/users\/[^)\s"'`]+$/i.test(value) ? value : '';
}

function displayNameFromFileRef(raw) {
  const value = cleanFileRef(raw);
  if (!value) return 'File';
  const noQuery = value.split(/[?#]/)[0];
  return noQuery.split('/').filter(Boolean).pop() || value;
}

// Persisted real-activity steps for a FINISHED turn → step blocks, every row done (no
// spinner). The live steps the agent ticked while working are stored server-side (events,
// keyed to the user message); turning them into the turn's blocks keeps them in the
// conversation as the durable record instead of vanishing when the turn settles.
// (Patrik 2026-06-30: the live steps should stay in the conversation after the work.)
function workStepsToBlocks(steps) {
  const real = (steps || []).filter((s) => s && s.step_index !== 9999 && s.text && s.text !== 'settled');
  const byIdx = new Map();
  for (const s of real) {
    const k = Number.isFinite(+s.step_index) ? +s.step_index : 0;
    const t = s.timestamp ? new Date(s.timestamp).getTime() : 0;
    const prev = byIdx.get(k);
    if (!prev || t >= prev._t) byIdx.set(k, { text: s.text, _t: t });
  }
  const ordered = [...byIdx.values()].sort((a, b) => a._t - b._t);
  return ordered.map((s, i) => ({ type: 'step', stepIndex: i, title: s.text, state: 'done' }));
}

// Render every agent turn as the step/checkmark thread (Patrik 2026-06-30: agent talk is dense,
// the checkmark rows read cleaner). For each plain agent message we build its blocks as: the
// turn's persisted working steps (done rows) + the reply text itself as a `note` row, so the
// whole turn is one scannable checklist. Steps are keyed to the USER message (parent_message_id)
// and hung on the FIRST agent reply of the turn. Left untouched: messages the agent already
// authored structured blocks for (curated thread), file cards, and the turn still working live
// (WorkingTurn shows that; it persists the moment it settles).
function injectWorkSteps(list, stepsByParent, awaiting, awaitingId) {
  if (!Array.isArray(list)) return list;
  const byParent = stepsByParent || {};
  let lastUserId = '';
  const usedWork = new Set();
  return list.map((m) => {
    if (m.isUser) { lastUserId = m.id ? String(m.id) : lastUserId; return m; }
    if (m.isFile) return m;                                    // file cards don't render blocks
    if (Array.isArray(m.blocks) && m.blocks.length) return m;  // agent-authored thread — leave it
    const out = [];
    // Work steps: once per turn, on the first plain agent reply, unless this turn is live now.
    if (lastUserId && !usedWork.has(lastUserId)) {
      usedWork.add(lastUserId);
      if (!(awaiting && lastUserId === String(awaitingId || ''))) {
        const steps = byParent[lastUserId];
        if (steps && steps.length) out.push(...workStepsToBlocks(steps));
      }
    }
    // The reply text becomes a done `note` row in the same checkmark thread.
    if (m.text && m.text.trim()) out.push({ type: 'step', kind: 'note', stepIndex: out.length, title: m.text, state: 'done' });
    if (!out.length) return m;
    return { ...m, blocks: out, text: '' };
  });
}

// ── rowAttachments — THE definition of "this message carries a file" ──────────
// One parser for every attachment shape in the wild, shared by the thread and the
// room files panel (corner:one-corner drop 1), so the two can never disagree:
//   1. metadata.attachments[]            — structured multi-file
//   2. metadata.attachment               — watcher auto-share {url, name, mime, size}
//   3. attachment_url column             — composer/legacy single file
//   4. "Attached file: NAME" text        — canonical bridge/listener announcement
//      ("Attached N files: ..." for multi) — the most common Corner-room shape
// Returns { attachments: [{url, name, mime, size}], pure, fileName } — `pure`
// means the message is only the announcement (render the cards, hide the note).
export function rowAttachments(m) {
  const rawText = m.text || '';
  const lines = rawText.split('\n');
  const single = /^\s*attached file:\s*(.+?)\s*$/i.exec(lines[0] || '');
  const multi = /^\s*attached\s+\d+\s+files?:\s*(.+?)\s*$/i.exec(lines[0] || '');
  const textUrls = lines.slice(1).map((s) => s.trim()).filter(Boolean);
  const metaAttach = (m.metadata && m.metadata.attachment && (m.metadata.attachment.url || m.metadata.attachment.name)) ? m.metadata.attachment : null;
  const fileName = m.attachment_name || (metaAttach && metaAttach.name) || (single ? displayNameFromFileRef(single[1]) : '');
  if (Array.isArray(m.metadata?.attachments) && m.metadata.attachments.length) {
    return { attachments: m.metadata.attachments, pure: false, fileName };
  }
  if (metaAttach) {
    return {
      // gate_status must survive this hop: the panel only ever receives the
      // objects this function returns, so anything dropped here is invisible
      // downstream no matter what the row carries. A file delivered without its
      // critic pass is stamped "not reviewed" on the card (Patrik 2026-07-27,
      // "always deliver, mark it") and that stamp died right here until fixed.
      attachments: [{ url: metaAttach.url || '', name: metaAttach.name || fileName || 'File', mime: metaAttach.mime || '', size: metaAttach.size || 0, gate_status: metaAttach.gate_status || '' }],
      pure: true, fileName,
    };
  }
  if (m.attachment_url) {
    return {
      attachments: [{ url: m.attachment_url, name: m.attachment_name || 'File', mime: m.file_mime_type || 'application/octet-stream', size: m.file_size || 0 }],
      pure: false, fileName,
    };
  }
  if (multi) {
    const names = multi[1].split(',').map((s) => s.trim()).filter(Boolean);
    return {
      // No matching URL = no invented link: pointing extra names at file 1's
      // bytes lied and then dedup swallowed the extra file (adv2 finding 4).
      attachments: names.map((n, i) => ({ name: displayNameFromFileRef(n), url: textUrls[i] || cornerPathFromText(n) || '', mime: '', size: 0 })),
      pure: true, fileName,
    };
  }
  if (single) {
    return {
      attachments: [{ name: displayNameFromFileRef(single[1]), url: textUrls[0] || cornerPathFromText(single[1]) || '', mime: '', size: 0 }],
      pure: true, fileName,
    };
  }
  return { attachments: [], pure: false, fileName };
}

// Session render cache (corner:cv6-polish R3): switching BACK to a room paints its
// last rendered thread instantly instead of a loader flash, while the normal fetch
// still runs and reconciles fresh rows. Render-only and page-scoped; the server
// thread stays the source of record.
const threadCache = new Map();
const threadCacheKey = (worldId, room) => (room?.id ? `${worldId}|${room.isMission ? 'm' : room.isProject ? 'p' : 'a'}|${room.id}` : '');

// Fetch the room's thread. `room` is an agent room { id (slug), name }.
export function useRoomThread(worldId, room) {
  const { bumpAgentThread } = useDataContext() || {};
  const [messages, setMessages] = useState([]);
  const [archivedMessages, setArchivedMessages] = useState([]);
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
  const [turnHealth, setTurnHealth] = useState(null);
  // ── Connection health (corner:bridge frontend-visibility, 2026-08-09) ────────
  // The thread used to fail SILENTLY in three different ways: a 401/500 on the
  // reconcile poll wiped the rendered conversation, a dropped realtime socket
  // degraded the room to a 10s poll with zero signal, and a backgrounded phone
  // came back to a frozen thread. `connection` is the one honest read of those:
  //   online   — the browser's own network state
  //   realtime — 'connecting' | 'live' | 'reconnecting' | 'off'
  //   feed     — 'live' (the last thread fetch succeeded) | 'stale' (it failed;
  //              what you see is the last good load, nothing was lost)
  // Rendered by RoomConnectionNotice; never used to hide or clear real messages.
  const [connection, setConnection] = useState(() => ({
    online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
    realtime: 'connecting',
    feed: 'live',
  }));
  // The exact text of the turn we're tracking, so a dead turn can be retried verbatim.
  const lastSentTextRef = useRef('');
  const lastSentOptionsRef = useRef(null);
  // True once the dead-bridge backstop has declared this turn silent; cleared when a
  // real reply finally lands (or the next send starts a new turn).
  const silentTurnRef = useRef(false);
  // Mirror of `pending` for retry lookups (a functional setState must stay pure).
  const pendingRef = useRef([]);
  // True once the bridge has emitted at least one real step for the message we're awaiting.
  // When it has, the bridge is streaming live progress and OWNS the "stopped" signal via its
  // settled sentinel — so we must NOT settle the bar off an interim reply timestamp (the agent
  // flushes its in-progress thoughts as chat messages mid-turn; those would otherwise yank the
  // bar off a still-running turn). Reset at the start of every new send/turn.
  const sawLiveStepsRef = useRef(false);
  // Every turn's working steps, grouped by the user message they answered (parent_message_id),
  // so finished turns keep the steps that ticked while the agent worked (not just the live one).
  const [stepsByParent, setStepsByParent] = useState({});
  const stepsSigRef = useRef('');
  // On room open we baseline to the newest existing message so a thread that simply
  // ends on your earlier message doesn't show "working" — only a genuinely NEW send does.
  const baselineRef = useRef(false);
  // Content signature of the last thread we rendered. The poll runs every 3s and rebuilds
  // an identical array when nothing changed; pushing that new ref into state forces every
  // consumer (and the Home portal) to re-render and the scroll to jump. We only commit a
  // new messages array when the signature actually changed, so a quiet room stays still.
  const sigRef = useRef('');

  useEffect(() => { pendingRef.current = pending; }, [pending]);

  // Clear the outbox when you switch rooms (those messages belong to the old thread).
  useEffect(() => { setPending([]); setArchivedMessages([]); }, [room?.id]);
  // Switching rooms must drop the previous thread immediately. The signature guard
  // below skips re-committing an unchanged thread, but a NEW empty room produces an
  // empty signature that matches the reset sentinel — so without clearing here, the
  // old room's messages would linger and an empty room would show the last room's
  // content. Clear the rendered thread on switch and use a null sentinel so the very
  // first load (even an empty one) always commits.
  useEffect(() => {
    const cached = threadCache.get(threadCacheKey(worldId, room));
    if (cached) {
      // Revisit: paint the cached render immediately; the load effect below still
      // fetches and the signature guard commits any real change on top.
      sigRef.current = cached.sig;
      setMessages(cached.messages);
      setBlocks(cached.blocks);
      setStatus(cached.messages.length ? 'ready' : 'empty');
    } else {
      sigRef.current = null;
      setMessages([]);
      setBlocks(null);
    }
  }, [worldId, room?.id]);
  // Switching rooms drops any in-flight "working" state too.
  useEffect(() => { setAwaiting(false); setLastSentId(''); setLiveSteps([]); setTurnHealth(null); setStepsByParent({}); lastSentTsRef.current = 0; baselineRef.current = false; silentTurnRef.current = false; lastSentTextRef.current = ''; }, [room?.id]);

  // Post a real user message into this room (composer + choice/question taps).
  // Agent rooms POST to the agent slug; project rooms to the project slug. After
  // the write, bump reloadKey so the thread refetches and the message appears.
  const send = useCallback(async (text, options = {}) => {
    const body = String(text || '').trim();
    if (!worldId || !room?.id || !body) return false;
    // Real local no-Supabase mode is read-only (no phantom sends); explicit ?demo=
    // fixtures keep the send path live because Playwright intercepts own the POST.
    if (!supabase && !demoFixtureActive()) return false;
    // Show it immediately as your turn (reconciled away when the real row arrives).
    const now = new Date();
    const optId = `${now.getTime()}-${Math.random().toString(36).slice(2)}`;
    setPending((p) => [...p, {
      _opt: true, optId,
      agentInitials: initials('You'), agentName: 'You', agentTint: 'accent', isUser: true,
      text: body, time: hhmm(now.toISOString()), ts: now.toISOString(),
      isFile: false, fileName: '', attachmentUrl: '', fileMime: '', fileSize: 0, blocks: null,
    }]);
    const interactionMode = options?.interactionMode === 'plan' ? 'plan' : 'work';
    const payload = room.isMission
      // Send the CANONICAL "<project>:<mission>" slug (room.missionSlug), not the
      // bare tail — write-message.js passes a slug containing ':' through untouched,
      // so the mission never enters the bare-slug first-wins lottery (Bug 1). The
      // bare room.id fallback is still canonicalized server-side against project.
      ? { client_id: worldId, agent: 'corner', project: room.projectSlug, text: body, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: String(room.missionSlug || room.id || ''), interaction_mode: interactionMode } }
      : room.isProject
        ? { client_id: worldId, agent: 'corner', project: room.id, text: body, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: interactionMode } }
        : { client_id: worldId, agent: room.id, text: body, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: interactionMode } };
    // Show "working" the instant you send, so the thread never looks dead.
    setAwaiting(true);
    setTurnHealth({ state: 'accepted', cause: null, repaired: false });
    setLiveSteps([]);
    sawLiveStepsRef.current = false;
    lastSentTsRef.current = now.getTime();
    lastSentTextRef.current = body;
    lastSentOptionsRef.current = { interactionMode };
    silentTurnRef.current = false;
    // A failed send KEEPS its bubble (corner:bridge frontend-visibility D3). Deleting it
    // was the single most alarming failure on the surface: your words flashed into the
    // thread and then vanished with no reason given and nothing to tap. Now the bubble
    // stays, marked "Not sent", carrying the reason and a one-tap retry.
    const markFailed = (reason) => {
      setPending((p) => p.map((m) => (m.optId === optId
        ? { ...m, failed: true, failReason: reason, retryText: body, retryOptions: options }
        : m)));
      setAwaiting(false);
      setTurnHealth({ state: 'needs_attention', cause: 'write_failed', repaired: false });
      // Tell the composer the words are safe in the thread, so it does NOT also
      // restore them into the box (one copy of your message, not two).
      try { options?.onKeptInThread?.(reason); } catch { /* caller-supplied */ }
    };
    const classify = (r) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
      if (r && r.status === 401) return 'signed_out';
      if (!r) return 'offline';
      return 'server';
    };
    try {
      const r = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        // A black-holed connection (tunnel down, radio dead) used to hang at the browser
        // default — minutes of a pending bubble before the silent delete. 20s, then fail
        // honestly and visibly.
        ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(20000) } : {}),
      });
      if (!r || !r.ok) { markFailed(classify(r)); return false; }
      // The created row id is the parent the bridge keys its step heartbeats to — and
      // the key the optimistic bubble reconciles on (never text: two sends of "ok" used
      // to collapse into one bubble).
      try {
        const j = await r.clone().json();
        const id = j?.message?.id;
        if (id) {
          setLastSentId(String(id));
          setPending((p) => p.map((m) => (m.optId === optId ? { ...m, serverId: String(id) } : m)));
        }
        if (j?.turn_receipt) setTurnHealth({ state: j.turn_receipt.state || 'accepted', cause: null, repaired: false });
      } catch { /* non-JSON */ }
      // Immediately bump this direct agent thread's recency so Recently Active
      // reflects the send before the next poll cycle picks it up.
      if (!room.isProject && !room.isMission && bumpAgentThread) bumpAgentThread(room.id, body);
      setReloadKey((k) => k + 1);
      return true;
    } catch (err) {
      markFailed((err && (err.name === 'TimeoutError' || err.name === 'AbortError')) ? 'timeout' : classify(null));
      return false;
    }
  }, [worldId, room?.id, room?.isProject, room?.isMission, room?.missionSlug, room?.projectSlug, bumpAgentThread]);

  // Tap-to-retry on a failed bubble: drop the failed copy and send the same words again.
  const retrySend = useCallback((optId) => {
    const entry = pendingRef.current.find((m) => m.optId === optId);
    if (!entry) return Promise.resolve(false);
    setPending((p) => p.filter((m) => m.optId !== optId));
    const opts = { ...(entry.retryOptions || {}) };
    delete opts.onKeptInThread;   // the retry owns its own bubble
    return send(entry.retryText || entry.text || '', opts);
  }, [send]);

  // A turn the agent abandoned: resend the same ask, or nudge for a status.
  const retryTurn = useCallback(() => {
    const text = lastSentTextRef.current;
    if (!text) return Promise.resolve(false);
    return send(text, lastSentOptionsRef.current || {});
  }, [send]);
  const nudgeTurn = useCallback(
    () => send('Are you still on this? Give me a quick status on my last message.', lastSentOptionsRef.current || {}),
    [send],
  );
  const reload = useCallback(() => { setReloadKey((k) => k + 1); }, []);

  // Follow the exact persisted message through the steward. Inspection is read-only;
  // after 45 seconds without activity we ask once for the server's narrowly allowlisted
  // repair. Server-side retry counts prevent loops across tabs and background cron runs.
  useEffect(() => {
    if (!awaiting || !worldId || !lastSentId) return undefined;
    let alive = true;
    let repairAsked = false;
    const inspect = async () => {
      const shouldRepair = Date.now() - lastSentTsRef.current >= 45000 && !repairAsked;
      if (shouldRepair) repairAsked = true;
      try {
        const response = shouldRepair
          ? await authFetch('/api/dashboard/room-health', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ client_id: worldId, message_id: lastSentId }),
            })
          : await authFetch(`/api/dashboard/room-health?${new URLSearchParams({ client_id: worldId, message_id: lastSentId }).toString()}`);
        if (!alive || !response?.ok) return;
        const health = await response.json();
        if (!health?.found) return;
        setTurnHealth(health);
        if (health.state === 'settled') {
          setAwaiting(false);
          setReloadKey((key) => key + 1);
        } else if (health.state === 'needs_attention' && !health.repaired) {
          setAwaiting(false);
        }
      } catch { /* existing message and step polls remain the fallback */ }
    };
    inspect();
    const timer = setInterval(inspect, 10000);
    return () => { alive = false; clearInterval(timer); };
  }, [awaiting, worldId, lastSentId]);

  const clearRoom = useCallback(async () => {
    if (!worldId || !room?.id) return false;
    const payload = room.isMission
      ? { client_id: worldId, agent: 'corner', project: room.projectSlug, mission_slug: String(room.missionSlug || room.id || '').split(':').pop() }
      : room.isProject
        ? { client_id: worldId, agent: 'corner', project: room.id }
        : { client_id: worldId, agent: room.id };
    try {
      const response = await authFetch('/api/dashboard/room-reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!response?.ok) return false;
      setArchivedMessages((prev) => [...prev, ...messages]);
      setMessages([]);
      setPending([]);
      setAwaiting(false);
      setLiveSteps([]);
      sigRef.current = null;
      threadCache.delete(threadCacheKey(worldId, room));
      setStatus('empty');
      setReloadKey((key) => key + 1);
      return true;
    } catch { return false; }
  }, [worldId, room?.id, room?.isProject, room?.isMission, room?.missionSlug, room?.projectSlug, messages]);

  // Poll the live step heartbeats for the message you just sent (events table via
  // /message-steps; client-side anon reads are RLS-blocked, hence the server proxy).
  useEffect(() => {
    if (!awaiting || !worldId || !room?.id) { return undefined; }
    let alive = true;
    const agentParam = (room.isMission || room.isProject) ? 'corner' : room.id;
    const projParam = room.isMission ? room.projectSlug : (room.isProject ? room.id : '');
    const q = new URLSearchParams({ client_id: worldId, agent: agentParam, limit: '50' });
    if (projParam) q.set('project', projParam);
    // The bar stops on the agent's real end-of-turn signal, not a fixed countdown that could
    // yank it off a still-running long turn. Authoritative stop = the `settled` marker the
    // bridge stamps when the turn ends (or the reply landing, handled in the thread poll).
    // The only timer is a long dead-bridge backstop, reset on every new step.
    let lastActivity = Date.now();
    let lastCount = -1;
    const poll = () => authFetch(`/api/dashboard/message-steps?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const all = Array.isArray(d.steps) ? d.steps : [];
        // Only the steps for THIS sent message; if we don't yet have its id, show nothing
        // (the generic working indicator still renders from `awaiting`).
        const mine = lastSentId ? all.filter((s) => String(s.parent_message_id) === lastSentId) : [];
        setLiveSteps(mine);
        // `settled` (step_index 9999) IS "the agent stopped working" — stop the bar on it,
        // no guessing, so working-vs-stopped is honest (Patrik 2026-06-27).
        if (mine.some((s) => s.step_index === 9999 || s.text === 'settled')) { setAwaiting(false); return; }
        const renderable = mine.filter((s) => s.step_index !== 9999 && s.text !== 'settled').length;
        // Once a real step lands, the bridge is streaming — from here the settled sentinel
        // above (or the dead-bridge backstop) is the ONLY thing that stops the bar; interim
        // reply bubbles must not (see the message-poll settle guard).
        if (renderable > 0) sawLiveStepsRef.current = true;
        if (renderable !== lastCount) { lastCount = renderable; lastActivity = Date.now(); }
        // Dead-bridge insurance: fully silent (no new step, no reply) for a long stretch.
        // This used to just switch the working bar off, which rendered a DEAD turn as a
        // quiet settle — the room looked idle, as if you had never asked (corner:bridge
        // frontend-visibility D1, the reported symptom). It now says so out loud and
        // offers Retry / Nudge; RoomRecoveryNotice renders it at the thread tail.
        if (Date.now() - lastActivity > 180000) {
          silentTurnRef.current = true;
          setAwaiting(false);
          setTurnHealth((h) => ((h && h.state === 'needs_attention') ? h : { state: 'needs_attention', cause: 'agent_silent', repaired: false }));
        }
      })
      .catch(() => {});
    poll();
    const t = setInterval(poll, 1500);
    return () => { alive = false; clearInterval(t); };
  }, [awaiting, lastSentId, worldId, room?.id, room?.isMission, room?.isProject, room?.projectSlug]);

  // Persist EVERY turn's working steps (not just the live one). Polls the same step feed
  // regardless of `awaiting` and groups by parent_message_id, so a finished turn's steps stay
  // available to render in the conversation — and survive a reload (the events live in the DB).
  useEffect(() => {
    if (!worldId || !room?.id) { setStepsByParent({}); return undefined; }
    let alive = true;
    const agentParam = (room.isMission || room.isProject) ? 'corner' : room.id;
    const projParam = room.isMission ? room.projectSlug : (room.isProject ? room.id : '');
    const q = new URLSearchParams({ client_id: worldId, agent: agentParam, limit: '100' });
    if (projParam) q.set('project', projParam);
    const load = () => authFetch(`/api/dashboard/message-steps?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        const all = Array.isArray(d.steps) ? d.steps : [];
        const byParent = {};
        for (const s of all) {
          const pid = s && s.parent_message_id ? String(s.parent_message_id) : '';
          if (!pid) continue;
          (byParent[pid] = byParent[pid] || []).push(s);
        }
        // Only commit when the grouped steps actually changed (count + newest id per turn).
        // The feed is identical between polls in a quiet room; committing a fresh object each
        // time would churn a re-render and yank the scroll (same guard as the message poll).
        const sig = Object.keys(byParent).sort().map((k) => `${k}:${byParent[k].length}:${byParent[k][0]?.id || ''}`).join('~');
        if (sig !== stepsSigRef.current) { stepsSigRef.current = sig; setStepsByParent(byParent); }
      })
      .catch(() => {});
    load();
    // While a turn is live, refresh a touch faster so a settled turn's steps land promptly;
    // otherwise a relaxed poll (the events are durable, so there's no rush).
    const t = setInterval(load, awaiting ? 3000 : 12000);
    return () => { alive = false; clearInterval(t); };
  }, [worldId, room?.id, room?.isMission, room?.isProject, room?.projectSlug, reloadKey, awaiting]);

  useEffect(() => {
    if (!worldId || !room?.id) { setMessages([]); setStatus('loading'); return undefined; }
    let alive = true;
    // 'empty' is a settled state from a previous real load (or the cache); only a
    // genuinely unknown thread shows the loader.
    setStatus((s) => (s === 'ready' || s === 'empty' ? s : 'loading'));
    const params = new URLSearchParams();
    params.set('client', worldId);
    // Mission rooms key on the mission slug; project rooms on the project slug;
    // everything else is an agent thread.
    // Agents store the BARE mission slug (e.g. "corner-ui-cv6"), but the room handle is the
    // colon-joined "project:mission" form. Query on the last segment so the thread isn't empty.
    if (room.isMission) {
      params.set('mission_slug', String(room.missionSlug || room.id || '').split(':').pop());
      // Pass the mission's project so the reader canonicalizes the bare slug within
      // the RIGHT project (Bug 1) instead of a foreign first-wins one.
      if (room.projectSlug) params.set('project', room.projectSlug);
    }
    // The PROJECT chat is the project-level conversation only. Mission-room messages
    // also carry project=<slug> (so they roll up under the project), but they belong to
    // their mission room, not the project chat — otherwise a message sent in Chat or
    // Files Panel also shows in the Corner project room. `project_only` tells the API to
    // exclude any mission-tagged rows from the project thread.
    else if (room.isProject) { params.set('project', room.id); params.set('project_only', '1'); }
    else params.set('agent', room.id);
    params.set('limit', '40');
    // A FAILED load must never look like an empty room (corner:bridge frontend-visibility
    // D2). The old code mapped !r.ok to null and then read `d?.messages` off it, so a
    // single 401/500 on the 10s reconcile poll produced raw=[] → setMessages([]) →
    // status 'empty' → and it CACHED that emptiness, so leaving the room and coming back
    // repainted the wipe. Most common trigger: a phone waking up and racing token
    // refresh. Now a failed fetch commits nothing, caches nothing, and simply marks the
    // feed stale so the surface can say "showing the last loaded messages".
    const markFeedStale = () => {
      setConnection((c) => (c.feed === 'stale' ? c : { ...c, feed: 'stale' }));
      // 'error' only when there is nothing on screen to protect — a first load that
      // never landed. A room already rendering keeps its thread.
      setStatus((s) => (s === 'loading' ? 'error' : s));
    };
    const load = () => authFetch(`/api/dashboard/supabase-messages?${params.toString()}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        if (!d) { markFeedStale(); return; }
        setConnection((c) => (c.feed === 'live' ? c : { ...c, feed: 'live' }));
        const raw = (Array.isArray(d?.messages) ? d.messages : [])
          // Follow-up TRIGGER rows are a system prompt to the agent (role:user,
          // source:task-followup, body "[FOLLOWUP TRIGGER ...]"), not a human
          // message — the agent's natural-voice come-back is the real reply. Drop
          // them so a fired come-back never shows a raw trigger bubble in the room
          // (corner:followups auto-detect, 2026-07-08).
          .filter((m) => m.source !== 'task-followup' && !(m.metadata && m.metadata.followup_trigger));
        let resetIndex = -1;
        for (let i = raw.length - 1; i >= 0; i -= 1) {
          if (raw[i]?.source === 'room_reset' || raw[i]?.metadata?.room_reset) { resetIndex = i; break; }
        }
        const archivedRaw = resetIndex >= 0 ? raw.slice(0, resetIndex) : [];
        const renderRaw = (resetIndex >= 0 ? raw.slice(resetIndex + 1) : raw)
          .filter((m) => m.source !== 'room_reset' && m.source !== 'clear_context' && m.role !== 'system');
        setArchivedMessages(archivedRaw
          .filter((m) => m.role !== 'system' && m.source !== 'clear_context')
          .map((m) => ({
            id: m.id || '', isUser: m.role === 'user' || !!m.user_name,
            agentName: (m.role === 'user' || m.user_name) ? (m.user_name || 'You') : titleForAgent(m.agent || room.name),
            text: m.text || '', time: hhmm(m.timestamp), ts: m.timestamp || null,
          })));
        // Drop any optimistic message the server now reflects, so the real row replaces
        // it with no duplicate. Keyed on the row id the POST handed back — text matching
        // deleted the WRONG bubble whenever the room already contained the same words
        // (send "ok" into a thread with an older "ok" and the fresh bubble vanished for a
        // few seconds), and collapsed two identical rapid sends into one. Text is kept
        // only as the fallback for a send whose POST response never came back, and a
        // FAILED bubble is never reconciled away — it has no server row and its whole job
        // is to stay put until you retry it.
        const serverIds = new Set(raw.map((m) => String(m.id || '')).filter(Boolean));
        const userTexts = new Set(raw.filter((m) => m.role === 'user' || m.user_name).map((m) => (m.text || '').trim()));
        setPending((prev) => prev.filter((op) => {
          if (op.failed) return true;
          if (op.serverId) return !serverIds.has(op.serverId);
          return !userTexts.has((op.text || '').trim());
        }));
        // The live Goal Thread (agent-talk): structured blocks ride on a message's
        // metadata.blocks. The agent re-emits the current thread state in its latest
        // structured reply, so the freshest message that carries blocks IS the thread.
        let liveBlocks = null;
        for (let i = renderRaw.length - 1; i >= 0; i -= 1) {
          const b = renderRaw[i]?.metadata?.blocks;
          if (Array.isArray(b) && b.length) { liveBlocks = b; break; }
        }
        setBlocks(liveBlocks);
        const msgs = renderRaw.map((m) => {
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
          // Attachment parsing lives in rowAttachments — one definition of "this
          // message carries a file", shared with the room files panel so the panel
          // and the thread can never disagree (corner:one-corner drop 1).
          const { attachments, pure, fileName } = rowAttachments(m);
          const isFile = attachments.length > 0;
          // Live Goal Thread: a structured reply carries its blocks on metadata.blocks.
          // We attach them to THIS message so the thread renders inline as that agent
          // turn (history stays above it), instead of taking over the whole screen.
          const msgBlocks = Array.isArray(m.metadata?.blocks) && m.metadata.blocks.length ? m.metadata.blocks : null;
          // Suggested-action chips ride on metadata.chips (stripped from the reply body by
          // chips.py). Render them as tappable chips at the tail of the agent's turn so the
          // suggestion reads as part of what the agent just said — not a separate panel.
          const msgChips = Array.isArray(m.metadata?.chips) && m.metadata.chips.length ? m.metadata.chips : null;
          let displayText = pure ? '' : (m.text || '');
          // Completed web work lands as a tappable link card, never a bare URL buried in
          // the text (Patrik 2026-07-13): the structured completion payload
          // (metadata.result_payload) first, then any URL the agent shared in its text —
          // bridge-voiced completions carry no payload, so the text lift covers them.
          // A trailing bare URL the card already carries leaves the bubble text.
          const resultPayload = (m.metadata && typeof m.metadata.result_payload === 'object') ? m.metadata.result_payload : null;
          let linkCards = [];
          // Review-decision echoes are receipts, not shipped-work links — lifting
          // their store URLs made dead Open cards (adv2 finding 1).
          if (!isUser && m.source !== 'review-decision') {
            linkCards = extractLinkCards({ text: displayText, resultPayload, attachments });
            if (linkCards.length) displayText = stripTrailingCardUrl(displayText, linkCards);
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
            // Auto-shared files carry url/mime/size on metadata.attachment (already
            // normalized into attachments[0] above), NOT the attachment_url /
            // file_mime_type columns — those are empty for that shape. The thread's
            // file card reads these top-level fields, so without the attachments[0]
            // fallback every auto-shared image renders as a dead, unclickable,
            // mime-less file card instead of the actual image.
            attachmentUrl: m.attachment_url || (attachments[0] && attachments[0].url) || '',
            fileMime: m.file_mime_type || (attachments[0] && attachments[0].mime) || '',
            fileSize: m.file_size || (attachments[0] && attachments[0].size) || 0,
            attachments, // Array of {url, name, mime, size} for grouped rendering
            blocks: msgBlocks,
            chips: msgChips, // tappable suggestion chips from metadata.chips
            linkCards, // [{url, summary}] → ResultLinkCards on every chat surface
          };
        }).filter((m) => m.text || m.isFile || m.blocks || m.attachments?.length || m.linkCards?.length);
        // Only re-commit when the thread actually changed (see sigRef). A no-op poll keeps the
        // existing array ref, so the list doesn't re-render and the scroll holds its place.
        const sig = msgs.map((m) => `${m.ts}|${m.text}|${m.attachments?.length || 0}|${m.blocks ? m.blocks.length : 0}|${m.linkCards?.length || 0}`).join('~');
        if (sig !== sigRef.current) {
          sigRef.current = sig;
          setMessages(msgs);
        }
        // Drive the live "working" feedback from the thread itself, so it fires no matter
        // how the message was sent (rich composer, choice tap, etc.) — not only via send().
        const tms = (m) => (m.ts ? new Date(m.ts).getTime() : 0) || 0;
        const newestUser = msgs.filter((m) => m.isUser && m.id).sort((a, b) => tms(b) - tms(a))[0];
        const newestReply = msgs.filter((m) => !m.isUser).sort((a, b) => tms(b) - tms(a))[0];
        // A turn we declared dead that came back to life: drop the notice the moment a
        // real reply lands, so the "went quiet" row never outlives the answer.
        if (silentTurnRef.current && newestReply && lastSentTsRef.current && tms(newestReply) >= lastSentTsRef.current) {
          silentTurnRef.current = false;
          setTurnHealth(null);
        }
        if (!baselineRef.current) {
          // First load for this room: remember where the thread is.
          baselineRef.current = true;
          const newestAny = msgs.map(tms).reduce((a, b) => Math.max(a, b), 0);
          lastSentTsRef.current = newestAny;
          // If the room is opened mid-turn — newest message is the user's, no reply after it,
          // and recent — show the working bar at once, so entering a busy room reads as busy
          // (consistent "is it working" whether you sent the message or just walked in).
          if (newestUser && (!newestReply || tms(newestReply) < tms(newestUser)) && (Date.now() - tms(newestUser) < 180000)) {
            setLastSentId(String(newestUser.id));
            // Remember the words too: walking into a mid-turn room and watching it die
            // must offer the same Retry as sending it yourself.
            lastSentTextRef.current = newestUser.text || lastSentTextRef.current;
            setAwaiting(true);
            setLiveSteps([]);
            sawLiveStepsRef.current = false;
          }
        } else if (newestUser && tms(newestUser) > lastSentTsRef.current) {
          // A newer user message than anything we've tracked → the agent is now on it.
          lastSentTsRef.current = tms(newestUser);
          setLastSentId(String(newestUser.id));
          lastSentTextRef.current = newestUser.text || lastSentTextRef.current;
          silentTurnRef.current = false;
          setAwaiting(true);
          setLiveSteps([]);
          sawLiveStepsRef.current = false;
        } else if (!sawLiveStepsRef.current && newestReply && tms(newestReply) >= lastSentTsRef.current && lastSentTsRef.current) {
          // A reply at/after our last user message → settle — but ONLY when the bridge is
          // NOT streaming live steps for this turn. Once steps are flowing, the agent flushes
          // its in-progress thoughts as interim reply messages; settling on those would yank
          // the bar off a still-running turn (the exact "bar stops while it's still working"
          // bug). With steps active, the settled sentinel (live-step poll) is the honest stop.
          setAwaiting(false);
        }
        setStatus(msgs.length ? 'ready' : 'empty');
        // Refresh the session render cache with what this room actually shows now.
        threadCache.set(threadCacheKey(worldId, room), { messages: msgs, blocks: liveBlocks, sig });
      })
      .catch(() => { if (alive) markFeedStale(); });
    load();

    // ── Supabase realtime subscription for live messages ──────────────────────
    // New messages appear instantly via realtime instead of waiting for the poll.
    // Subscription filters match the room-scoping logic (client_id + project/mission/agent).
    // On INSERT, call load() to refresh and render the new message immediately.
    let channel = null;
    let retryTimer = null;
    let retryAttempt = 0;
    let subscribeRoom = () => {};
    if (supabase) {
      // room_id single-filter subscription (corner:one-write-path R5, 2026-07-01).
      // postgres_changes supports exactly ONE `column=eq.value` filter; the old
      // multi-filter join('and') was invalid syntax and referenced mission_slug,
      // which isn't a messages column — realtime never matched and the 10s poll
      // carried all updates. Every row now has a canonical room_id (trigger +
      // backfill), so one equality filter scopes the room precisely. If a slug
      // is ever non-canonical the filter just misses and the poll still covers.
      let roomIdFilter;
      if (room.isMission) {
        const missionSlug = String(room.missionSlug || room.id || '');
        roomIdFilter = `${worldId}:mission:${missionSlug}`;
      } else if (room.isProject) {
        roomIdFilter = `${worldId}:project:${room.id}`;
      } else {
        roomIdFilter = `${worldId}:agent:${room.id}`;
      }
      const filter = `room_id=eq.${roomIdFilter}`;

      // Self-healing channel (the cv3 R74 pattern, ported here — corner:bridge
      // frontend-visibility D5). `.subscribe()` used to be called with no status
      // callback at all: CHANNEL_ERROR / TIMED_OUT / CLOSED were never observed, there
      // was no reconnect, and no history catch-up on re-subscribe. A socket that quietly
      // died left the room permanently 0-10s laggy with zero signal — and made the poll
      // a single point of failure. Now: exponential-backoff resubscribe, and a load() on
      // every SUBSCRIBED so rows that landed while the socket was down come straight in.
      subscribeRoom = () => {
        if (!alive || !supabase) return;
        try { if (channel) supabase.removeChannel(channel); } catch { /* already gone */ }
        channel = supabase
          .channel(`cv6-thread-${worldId}-${room.id}-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages', filter },
            () => { if (alive) load(); }
          )
          .subscribe((channelStatus) => {
            if (!alive) return;
            if (channelStatus === 'SUBSCRIBED') {
              retryAttempt = 0;
              setConnection((c) => (c.realtime === 'live' ? c : { ...c, realtime: 'live' }));
              load();   // catch-up for anything missed while the socket was down
            } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED') {
              setConnection((c) => (c.realtime === 'reconnecting' ? c : { ...c, realtime: 'reconnecting' }));
              const delay = Math.min(30000, 1000 * (2 ** retryAttempt));
              retryAttempt += 1;
              if (retryTimer) clearTimeout(retryTimer);
              retryTimer = setTimeout(subscribeRoom, delay);
            }
          });
      };
      subscribeRoom();
    } else {
      setConnection((c) => (c.realtime === 'off' ? c : { ...c, realtime: 'off' }));
    }

    // ── Foreground catch-up (corner:bridge frontend-visibility D4) ────────────
    // Inside the phone's web view, backgrounding freezes JS timers and kills the
    // realtime socket. Nothing in the CV6 chat path listened for the app coming BACK,
    // so a resumed thread sat frozen until the next 10s tick — and if that first
    // request 401'd on a not-yet-refreshed token, the old code wiped the thread. Refresh
    // the session FIRST, then reload, then make sure the socket is really up.
    const onWake = () => {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const refreshed = (supabase && supabase.auth && supabase.auth.getSession)
        ? Promise.resolve(supabase.auth.getSession()).catch(() => null)
        : Promise.resolve(null);
      refreshed.then(() => {
        if (!alive) return;
        load();
        // Only rebuild a socket that is actually down. Tearing a healthy channel
        // down on every tab focus would churn the connection for no reason.
        const socketState = channel && channel.state;
        if (supabase && (!channel || socketState === 'closed' || socketState === 'errored' || socketState === 'leaving')) subscribeRoom();
      });
    };
    const onOnline = () => { setConnection((c) => ({ ...c, online: true })); onWake(); };
    const onOffline = () => { setConnection((c) => ({ ...c, online: false })); };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onWake);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onWake);

    // Live thread: poll as a reconcile fallback. Realtime carries the live load, but
    // realtime can drop, so the poll ensures we stay in sync. Relaxed to 10s since
    // realtime now handles the instant-live case.
    const t = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(t);
      if (retryTimer) clearTimeout(retryTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onWake);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      }
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onWake);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [worldId, room?.id, room?.name, room?.isProject, room?.isMission, room?.missionSlug, reloadKey]);

  // Merge the optimistic outbox at the tail (newest) so a just-sent message shows at once.
  // Memoized so the returned array keeps a STABLE reference when nothing changed — otherwise a
  // fresh array every render defeats the message poll's no-op guard and yanks the scroll.
  const withWork = useMemo(
    () => {
      // A failed bubble carries its own retry, so every thread renderer gets tap-to-retry
      // without threading a handler through four component layers. Client-only object,
      // never cached or serialized.
      const outbox = pending.some((p) => p.failed)
        ? pending.map((p) => (p.failed ? { ...p, onRetry: () => retrySend(p.optId) } : p))
        : pending;
      return injectWorkSteps(outbox.length ? [...messages, ...outbox] : messages, stepsByParent, awaiting, lastSentId);
    },
    [messages, pending, stepsByParent, awaiting, lastSentId, retrySend],
  );
  return {
    messages: withWork, archivedMessages, blocks, status, send, clearRoom, awaiting,
    awaitingSince: awaiting ? lastSentTsRef.current : null, liveSteps, turnHealth,
    connection, retryTurn, nudgeTurn, reload,
  };
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
