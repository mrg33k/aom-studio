// cv6next — real conversation for one room, shaped to the agent-chat kit Turn element
// (data-each="messages" -> message.agentName/text/time/...). Wiring from the existing
// /api/dashboard/supabase-messages endpoint (the same one the dashboard uses). No fake
// data: messages are the room's real thread, oldest -> newest.

import { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
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

// RULE (smoothness-blitz R3, RESEARCH #8): steps NEVER render as thread rows.
// The live bar (RoomWorkList StepCard + liveSteps) is the ONE place steps appear.
// Persisted workSteps are kept for the bar's history, not injected as checkmark rows.
// Two render paths for the same data is why this defect re-emerged in 3 UI generations.
// Enforced: injectWorkSteps does not push workStepsToBlocks, and ChatLifecycle/WorkingTurn
// are the only consumers of liveSteps. A thread row may only carry curated blocks
// authored by the agent itself (Array.isArray(m.blocks) early-return).
function injectWorkSteps(list, _stepsByParent, _awaiting, _awaitingId) {
  // No-op: steps belong to the bar, not the thread. Keep the function as a guard rail
  // so a future UI generation cannot re-introduce the row path by calling the old name.
  // The agent's own structured blocks (curated thread) are already left untouched above,
  // and the bridge's liveSteps continue to drive RoomWorkList's StepCard.
  return Array.isArray(list) ? list : list;
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


// ── One engine per ROOM, not per mount (corner:bridge engine-lane, 2026-08-10) ─
// Ported from the native app's ChatViewModel/RoomStore: ONE realtime subscription,
// ONE reconcile timer, ONE step poll and ONE set of wake listeners per room — no
// matter how many components render that room. CV6's One Page renders the same
// thread in up to four places at once (the col3 quick reply, the Catch Up modal,
// mobile Chat, ChatDesktop), and the hook used to build all of that machinery per
// MOUNT: four sockets, four 10s polls, four 1.5s step polls and four
// focus/visibilitychange listeners racing on one room (frontend audit D12). Every
// extra copy was also an extra chance for one of them to wipe the thread.
//
// The second half of the port is the DELTA fetch. The reconcile used to re-read the
// whole visible window every 10 seconds and rebuild the entire thread from it. It
// now asks only for rows NEWER than the newest row it already holds and merges them
// in, deduped by row id. A full refetch survives for exactly the moments the native
// app uses one — first load, realtime re-subscribe, and coming back to the
// foreground — plus a once-a-minute safety net so an edited row cannot stick.
//
// Everything about how this thing FAILS is unchanged, and must stay that way:
//   • a failed poll never wipes the thread (it marks the feed stale and keeps the
//     last good load; 'error' only when there was nothing on screen to protect),
//   • a dead turn says it is dead and offers Retry / Nudge,
//   • a failed send keeps its bubble, marked "Not sent", with a one-tap retry,
//   • the socket reconnects on exponential backoff and catches up on SUBSCRIBED.
// Those four are the shipped contract of this file. Read them before you edit it.

const DELTA_WINDOW = 40;              // rows per request — the old full-window size
const RAW_CAP = 240;                  // most merged rows we hold for one room
const RECONCILE_MS = 10000;           // reconcile cadence (unchanged)
const FULL_EVERY_N_RECONCILES = 6;    // one full refetch a minute, behind the deltas
const DELTA_OVERLAP_MS = 1000;        // two rows can share a millisecond; ask back a beat
const ENGINE_GRACE_MS = 20000;        // keep a room warm this long after its last mount
const DEAD_TURN_MS = 180000;          // dead-bridge backstop (unchanged)

const rowKey = (row) => (row && row.id
  ? String(row.id)
  : `${row?.timestamp || ''}|${row?.role || ''}|${String(row?.text || '').slice(0, 80)}`);
const rowTime = (row) => {
  const t = row?.timestamp ? new Date(row.timestamp).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

// Merge a delta window into the rows we already hold. Dedupe is by ROW ID — the same
// key the reconnect catch-up uses — so the deliberate one-second overlap on the
// request can never double-render a message. Returns the ORIGINAL array when nothing
// is actually new, so a quiet room does no downstream work at all.
function mergeRows(prev, incoming) {
  if (!Array.isArray(incoming) || !incoming.length) return prev;
  const seen = new Set(prev.map(rowKey));
  if (incoming.every((row) => seen.has(rowKey(row)))) return prev;
  const byKey = new Map();
  for (const row of prev) byKey.set(rowKey(row), row);
  for (const row of incoming) byKey.set(rowKey(row), row);
  const merged = [...byKey.values()].sort((a, b) => rowTime(a) - rowTime(b));
  return merged.length > RAW_CAP ? merged.slice(merged.length - RAW_CAP) : merged;
}

function sameList(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

// Identity of the room an engine serves. The engine KEY (worldId + kind + id) is what
// two mounts must share; the fingerprint additionally carries the fields that change
// what we render (a rename) or what we query (a mission's project), so a change there
// refreshes the engine in place instead of forking a second one.
function roomFingerprint(worldId, room) {
  if (!room?.id) return '';
  return [
    worldId, room.id,
    room.isMission ? 'm' : room.isProject ? 'p' : 'a',
    room.missionSlug || '', room.projectSlug || '', room.name || '',
  ].join('|');
}

class RoomThreadEngine {
  constructor(worldId, room) {
    this.worldId = worldId;
    this.room = { ...room };
    this.key = threadCacheKey(worldId, room);
    this.listeners = new Set();
    this.refs = 0;
    this.graceTimer = null;
    this.started = false;
    this.alive = false;
    // Set by whichever mount holds the data context — every mount passes the same fn.
    this.bumpAgentThread = null;

    // ── Rows we hold. `rows` is the raw server window (merged across deltas); the
    // rendered thread is projected from it, exactly as the old single fetch was.
    this.rows = [];
    this.newestTs = 0;
    this.reconcileTicks = 0;
    this.inFlight = false;

    // ── The refs the hook used to carry, now plain fields on the one engine.
    this.lastSentTs = 0;
    this.lastSentText = '';
    this.lastSentOptions = null;
    this.silentTurn = false;      // this turn was declared dead by the backstop
    this.sawLiveSteps = false;    // the bridge is streaming steps → it owns the stop signal
    this.didBaseline = false;
    this.sig = null;              // rendered-thread signature (no-op poll guard)
    this.stepsSig = '';

    const cached = threadCache.get(this.key);
    this.state = {
      messages: cached ? cached.messages : [],
      archivedMessages: [],
      blocks: cached ? cached.blocks : null,
      status: cached ? (cached.messages.length ? 'ready' : 'empty') : 'loading',
      pending: [],
      awaiting: false,
      lastSentId: '',
      liveSteps: [],
      stepsByParent: {},
      draft: null,          // { text, streaming: true } — live partial reply, never persisted
      turnHealth: null,
      // ── Connection health (corner:bridge frontend-visibility, 2026-08-09) ────
      //   online   — the browser's own network state
      //   realtime — 'connecting' | 'live' | 'reconnecting' | 'off'
      //   feed     — 'live' (the last thread fetch succeeded) | 'stale' (it failed;
      //              what you see is the last good load, nothing was lost)
      // Rendered by RoomConnectionNotice; never used to hide or clear real messages.
      connection: {
        online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
        realtime: 'connecting',
        feed: 'live',
      },
    };
    if (cached) this.sig = cached.sig;

    // Timers / socket, one of each.
    this.channel = null;
    this.channelRetryTimer = null;
    this.channelRetryAttempt = 0;
    this.reconcileTimer = null;
    this.stepTimer = null;
    this.stepsTimer = null;
    this.stepsCadence = 0;
    this.stewardTimer = null;
    // Live draft stream (R-SMOOTHNESS Round D): one SSE reader per live turn,
    // engine-owned like every other poll. Feeds state.draft only — never
    // messages/awaiting/liveSteps. SSE unavailable = silent no-op; the 1500ms
    // step poll is the fallback AND keeps running regardless.
    this.streamAbort = null;
    this.streamKey = '';
    this.turnPollKey = 'off';
    this.stepLastActivity = 0;
    this.stepLastCount = -1;
    this.repairAsked = false;

    this.derived = { messages: [], from: null, pending: null, steps: null, awaiting: null, lastSentId: null };
    this.snapshot = null;
    this.rebuildSnapshot();

    // Bound so React can hold them as stable identities.
    this.subscribe = this.subscribe.bind(this);
    this.getSnapshot = this.getSnapshot.bind(this);
    this.send = this.send.bind(this);
    this.clearRoom = this.clearRoom.bind(this);
    this.retrySend = this.retrySend.bind(this);
    this.retryTurn = this.retryTurn.bind(this);
    this.nudgeTurn = this.nudgeTurn.bind(this);
    this.reload = this.reload.bind(this);
    this.repairTurn = this.repairTurn.bind(this);
    this.stopTurn = this.stopTurn.bind(this);
  }

  // ── React plumbing ─────────────────────────────────────────────────────────
  subscribe(listener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getSnapshot() { return this.snapshot; }

  retain() {
    this.refs += 1;
    if (this.graceTimer) { clearTimeout(this.graceTimer); this.graceTimer = null; }
    // The grace timer can fire between the render that acquired this engine and the
    // effect that retains it — the engine is then stopped AND out of the registry, so
    // the next mount of the same room would build a SECOND engine and we would be back
    // to two sockets on one room, which is the whole thing this file exists to prevent.
    // Re-register on the way back up; start() below revives the stopped one.
    if (!engines.has(this.key)) engines.set(this.key, this);
    if (!this.started) this.start();
    return () => this.release();
  }

  release() {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs > 0) return;
    // Keep the room warm for a beat: a route change unmounts and remounts the same
    // room within a tick, and tearing the socket down and back up for that would
    // churn the connection for nothing.
    if (this.graceTimer) clearTimeout(this.graceTimer);
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      if (this.refs > 0) return;
      this.stop();
      if (engines.get(this.key) === this) engines.delete(this.key);
    }, ENGINE_GRACE_MS);
  }

  updateRoom(room) {
    if (!room?.id) return;
    const before = roomFingerprint(this.worldId, this.room);
    const after = roomFingerprint(this.worldId, room);
    if (before === after) return;
    this.room = { ...room };
    // A rename changes the agent title on every rendered row, and a mission's project
    // changes the query — reproject from a fresh full window.
    this.sig = null;
    if (this.started) this.load({ full: true });
  }

  emit() { for (const listener of this.listeners) listener(); }

  // Commit a state patch. Identical to the old setState calls: only a real change
  // rebuilds the snapshot, so a no-op poll never re-renders the thread.
  commit(patch) {
    let changed = false;
    for (const k of Object.keys(patch)) {
      const next = patch[k];
      if (this.state[k] === next) continue;
      if (k === 'pending' && sameList(this.state[k], next)) continue;
      this.state[k] = next;
      changed = true;
    }
    if (!changed) return;
    this.rebuildSnapshot();
    this.emit();
    this.syncTurnPolls();
  }

  rebuildSnapshot() {
    const s = this.state;
    const d = this.derived;
    if (d.from !== s.messages || d.pending !== s.pending || d.steps !== s.stepsByParent
      || d.awaiting !== s.awaiting || d.lastSentId !== s.lastSentId) {
      // A failed bubble carries its own retry, so every thread renderer gets
      // tap-to-retry without threading a handler through four component layers.
      // Client-only object, never cached or serialized.
      const outbox = s.pending.some((p) => p.failed)
        ? s.pending.map((p) => (p.failed ? { ...p, onRetry: () => this.retrySend(p.optId) } : p))
        : s.pending;
      d.messages = injectWorkSteps(
        outbox.length ? [...s.messages, ...outbox] : s.messages,
        s.stepsByParent, s.awaiting, s.lastSentId,
      );
      d.from = s.messages; d.pending = s.pending; d.steps = s.stepsByParent;
      d.awaiting = s.awaiting; d.lastSentId = s.lastSentId;
    }
    this.snapshot = {
      messages: d.messages,
      archivedMessages: s.archivedMessages,
      blocks: s.blocks,
      status: s.status,
      awaiting: s.awaiting,
      awaitingSince: s.awaiting ? this.lastSentTs : null,
      liveSteps: s.liveSteps,
      // Draft renders only while the turn is live; project() clears it in the
      // same synchronous pass that renders the real row (no duplicate flash).
      draft: s.awaiting ? s.draft : null,
      turnHealth: s.turnHealth,
      connection: s.connection,
      // Round E: the Stop control hides for the session after one honest
      // feature_off answer from the proxy (bridge flag/tunnel not live yet).
      stopAvailable: !this.stopUnavailable,
    };
  }

  updateConnection(patch) {
    const next = { ...this.state.connection, ...patch };
    const cur = this.state.connection;
    if (cur.online === next.online && cur.realtime === next.realtime && cur.feed === next.feed) return;
    this.commit({ connection: next });
  }

  updatePending(fn) { this.commit({ pending: fn(this.state.pending) }); }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  start() {
    if (this.started) return;
    this.started = true;
    this.alive = true;
    // 'empty' is a settled state from a previous real load (or the cache); only a
    // genuinely unknown thread shows the loader.
    if (this.state.status !== 'ready' && this.state.status !== 'empty') this.commit({ status: 'loading' });
    this.load({ full: true });
    this.subscribeRoom();
    this.attachWakeListeners();
    // Live thread: the reconcile poll is the guarantee under a socket that can drop.
    // It is a DELTA now — only rows newer than the newest we hold — with a full
    // refetch once a minute so a row edited in place cannot stick.
    this.reconcileTimer = setInterval(() => {
      this.reconcileTicks += 1;
      this.load({ full: this.reconcileTicks % FULL_EVERY_N_RECONCILES === 0 });
    }, RECONCILE_MS);
    this.startStepsPoll();
    this.syncTurnPolls();
  }

  stop() {
    this.alive = false;
    this.started = false;
    if (this.reconcileTimer) { clearInterval(this.reconcileTimer); this.reconcileTimer = null; }
    if (this.channelRetryTimer) { clearTimeout(this.channelRetryTimer); this.channelRetryTimer = null; }
    this.stopTurnPolls();
    if (this.stepsTimer) { clearInterval(this.stepsTimer); this.stepsTimer = null; this.stepsCadence = 0; }
    this.detachWakeListeners();
    if (this.channel && supabase) { try { supabase.removeChannel(this.channel); } catch { /* already gone */ } }
    this.channel = null;
  }

  // ── The thread request ─────────────────────────────────────────────────────
  buildParams(sinceIso) {
    const params = new URLSearchParams();
    params.set('client', this.worldId);
    const room = this.room;
    // Mission rooms key on the mission slug; project rooms on the project slug;
    // everything else is an agent thread.
    // Agents store the BARE mission slug (e.g. "corner-ui-cv6"), but the room handle is
    // the colon-joined "project:mission" form. Query on the last segment so the thread
    // isn't empty.
    if (room.isMission) {
      params.set('mission_slug', String(room.missionSlug || room.id || '').split(':').pop());
      // Pass the mission's project so the reader canonicalizes the bare slug within
      // the RIGHT project (Bug 1) instead of a foreign first-wins one.
      if (room.projectSlug) params.set('project', room.projectSlug);
    } else if (room.isProject) {
      // The PROJECT chat is the project-level conversation only. Mission-room messages
      // also carry project=<slug> (so they roll up under the project), but they belong
      // to their mission room, not the project chat. `project_only` tells the API to
      // exclude any mission-tagged rows from the project thread.
      params.set('project', room.id); params.set('project_only', '1');
    } else {
      params.set('agent', room.id);
    }
    params.set('limit', String(DELTA_WINDOW));
    if (sinceIso) params.set('since', sinceIso);
    return params;
  }

  // A FAILED load must never look like an empty room (corner:bridge frontend-visibility
  // D2). The old code mapped !r.ok to null and then read `d?.messages` off it, so a
  // single 401/500 on the reconcile poll produced raw=[] → setMessages([]) → status
  // 'empty' → and it CACHED that emptiness, so leaving the room and coming back
  // repainted the wipe. Most common trigger: a phone waking up and racing token
  // refresh. A failed fetch commits nothing, caches nothing, and simply marks the feed
  // stale so the surface can say "showing the last loaded messages".
  markFeedStale() {
    this.updateConnection({ feed: 'stale' });
    // 'error' only when there is nothing on screen to protect — a first load that
    // never landed. A room already rendering keeps its thread.
    if (this.state.status === 'loading') this.commit({ status: 'error' });
  }

  load({ full = false } = {}) {
    if (!this.alive) return Promise.resolve();
    // Delta only once we actually hold an anchor row. First load, a re-subscribe and a
    // foreground wake all ask for the whole window, the way the native app does.
    const useDelta = !full && this.rows.length > 0 && this.newestTs > 0;
    const params = this.buildParams(useDelta ? new Date(this.newestTs - DELTA_OVERLAP_MS).toISOString() : null);
    return authFetch(`/api/dashboard/supabase-messages?${params.toString()}`)
      .then((r) => (r && r.ok ? r.json() : null))
      .then((d) => {
        if (!this.alive) return undefined;
        if (!d) { this.markFeedStale(); return undefined; }
        this.updateConnection({ feed: 'live' });
        const incoming = Array.isArray(d.messages) ? d.messages : [];
        if (useDelta) {
          if (!incoming.length) return undefined;      // quiet room — no downstream work
          // More arrived than one window holds: this is a GAP, not a delta. Widen to a
          // full window rather than concluding anything from the middle of the thread
          // (the native catch-up makes the same call by anchor).
          if (incoming.length >= DELTA_WINDOW) return this.load({ full: true });
          const merged = mergeRows(this.rows, incoming);
          if (merged === this.rows) return undefined;  // overlap only — nothing new
          this.rows = merged;
        } else {
          this.rows = incoming;
        }
        this.newestTs = this.rows.reduce((max, row) => Math.max(max, rowTime(row)), 0);
        this.project();
        return undefined;
      })
      .catch(() => { if (this.alive) this.markFeedStale(); });
  }

  // Turn the rows we hold into the rendered thread. This is the old fetch handler,
  // unchanged below the merge — same filters, same reconciliation, same turn logic.
  project() {
    const room = this.room;
    const raw = this.rows
      // Follow-up TRIGGER rows are a system prompt to the agent (role:user,
      // source:task-followup, body "[FOLLOWUP TRIGGER ...]"), not a human message —
      // the agent's natural-voice come-back is the real reply. Drop them so a fired
      // come-back never shows a raw trigger bubble in the room.
      .filter((m) => m.source !== 'task-followup' && !(m.metadata && m.metadata.followup_trigger));
    let resetIndex = -1;
    for (let i = raw.length - 1; i >= 0; i -= 1) {
      if (raw[i]?.source === 'room_reset' || raw[i]?.metadata?.room_reset) { resetIndex = i; break; }
    }
    const archivedRaw = resetIndex >= 0 ? raw.slice(0, resetIndex) : [];
    const renderRaw = (resetIndex >= 0 ? raw.slice(resetIndex + 1) : raw)
      .filter((m) => m.source !== 'room_reset' && m.source !== 'clear_context' && m.role !== 'system');
    const archived = archivedRaw
      .filter((m) => m.role !== 'system' && m.source !== 'clear_context')
      .map((m) => ({
        id: m.id || '', isUser: m.role === 'user' || !!m.user_name,
        agentName: (m.role === 'user' || m.user_name) ? (m.user_name || 'You') : titleForAgent(m.agent || room.name),
        text: m.text || '', time: hhmm(m.timestamp), ts: m.timestamp || null,
      }));
    // Drop any optimistic message the server now reflects, so the real row replaces it
    // with no duplicate. Keyed on the row id the POST handed back — text matching
    // deleted the WRONG bubble whenever the room already contained the same words (send
    // "ok" into a thread with an older "ok" and the fresh bubble vanished for a few
    // seconds), and collapsed two identical rapid sends into one. Text is kept only as
    // the fallback for a send whose POST response never came back, and a FAILED bubble
    // is never reconciled away — it has no server row and its whole job is to stay put
    // until you retry it.
    const serverIds = new Set(raw.map((m) => String(m.id || '')).filter(Boolean));
    const userTexts = new Set(raw.filter((m) => m.role === 'user' || m.user_name).map((m) => (m.text || '').trim()));
    this.updatePending((prev) => prev.filter((op) => {
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
    const msgs = renderRaw.map((m) => {
      const isUser = m.role === 'user' || !!m.user_name;
      // Agent messages show the agent's ROLE TITLE, never its persona name.
      const name = isUser ? (m.user_name || 'You') : titleForAgent(m.agent || room.name);
      // A file an agent made shows in the thread (rule: files live in the room). It
      // arrives either as a real attachment (attachment_url) or as an "Attached file:
      // <name>" note. Either way we render it as a file card. Attachment parsing lives
      // in rowAttachments — one definition of "this message carries a file", shared
      // with the room files panel so the panel and the thread can never disagree.
      const { attachments, pure, fileName } = rowAttachments(m);
      const isFile = attachments.length > 0;
      // Live Goal Thread: a structured reply carries its blocks on metadata.blocks. We
      // attach them to THIS message so the thread renders inline as that agent turn.
      const msgBlocks = Array.isArray(m.metadata?.blocks) && m.metadata.blocks.length ? m.metadata.blocks : null;
      // Suggested-action chips ride on metadata.chips (stripped from the reply body by
      // chips.py). Render them as tappable chips at the tail of the agent's turn.
      const msgChips = Array.isArray(m.metadata?.chips) && m.metadata.chips.length ? m.metadata.chips : null;
      let displayText = pure ? '' : (m.text || '');
      // Completed web work lands as a tappable link card, never a bare URL buried in
      // the text (Patrik 2026-07-13): the structured completion payload first, then any
      // URL the agent shared in its text.
      const resultPayload = (m.metadata && typeof m.metadata.result_payload === 'object') ? m.metadata.result_payload : null;
      let linkCards = [];
      // Review-decision echoes are receipts, not shipped-work links — lifting their
      // store URLs made dead Open cards (adv2 finding 1).
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
        // file_mime_type columns — those are empty for that shape.
        attachmentUrl: m.attachment_url || (attachments[0] && attachments[0].url) || '',
        fileMime: m.file_mime_type || (attachments[0] && attachments[0].mime) || '',
        fileSize: m.file_size || (attachments[0] && attachments[0].size) || 0,
        attachments, // Array of {url, name, mime, size} for grouped rendering
        blocks: msgBlocks,
        chips: msgChips, // tappable suggestion chips from metadata.chips
        linkCards, // [{url, summary}] → ResultLinkCards on every chat surface
      };
    }).filter((m) => m.text || m.isFile || m.blocks || m.attachments?.length || m.linkCards?.length);
    // Only re-commit when the thread actually changed. A no-op reconcile keeps the
    // existing array ref, so the list doesn't re-render and the scroll holds its place.
    const sig = msgs.map((m) => `${m.ts}|${m.text}|${m.attachments?.length || 0}|${m.blocks ? m.blocks.length : 0}|${m.linkCards?.length || 0}`).join('~');
    const patch = { archivedMessages: archived, blocks: liveBlocks };
    if (sig !== this.sig) { this.sig = sig; patch.messages = msgs; }
    patch.status = msgs.length ? 'ready' : 'empty';
    this.commit(patch);
    // Drive the live "working" feedback from the thread itself, so it fires no matter
    // how the message was sent (rich composer, choice tap, etc.) — not only via send().
    const tms = (m) => (m.ts ? new Date(m.ts).getTime() : 0) || 0;
    const newestUser = msgs.filter((m) => m.isUser && m.id).sort((a, b) => tms(b) - tms(a))[0];
    const newestReply = msgs.filter((m) => !m.isUser).sort((a, b) => tms(b) - tms(a))[0];
    // A turn we declared dead that came back to life: drop the notice the moment a real
    // reply lands, so the "went quiet" row never outlives the answer.
    if (this.silentTurn && newestReply && this.lastSentTs && tms(newestReply) >= this.lastSentTs) {
      this.silentTurn = false;
      this.commit({ turnHealth: null });
    }
    // Draft vs real row (Round D): the moment any reply row for this turn is in the
    // projected thread, the draft dies in the same synchronous pass — the row is the
    // truth, the draft was only its preview. (React batches the paired emits.)
    if (this.state.draft && newestReply && this.lastSentTs && tms(newestReply) >= this.lastSentTs) {
      this.commit({ draft: null });
    }
    if (!this.didBaseline) {
      // First load for this room: remember where the thread is.
      this.didBaseline = true;
      this.lastSentTs = msgs.map(tms).reduce((a, b) => Math.max(a, b), 0);
      // If the room is opened mid-turn — newest message is the user's, no reply after
      // it, and recent — show the working bar at once, so entering a busy room reads as
      // busy (consistent "is it working" whether you sent the message or just walked in).
      if (newestUser && (!newestReply || tms(newestReply) < tms(newestUser)) && (Date.now() - tms(newestUser) < DEAD_TURN_MS)) {
        // Remember the words too: walking into a mid-turn room and watching it die must
        // offer the same Retry as sending it yourself.
        this.lastSentText = newestUser.text || this.lastSentText;
        this.sawLiveSteps = false;
        this.commit({ lastSentId: String(newestUser.id), awaiting: true, liveSteps: [], draft: null });
      }
    } else if (newestUser && tms(newestUser) > this.lastSentTs) {
      // A newer user message than anything we've tracked → the agent is now on it.
      this.lastSentTs = tms(newestUser);
      this.lastSentText = newestUser.text || this.lastSentText;
      this.silentTurn = false;
      this.sawLiveSteps = false;
      this.commit({ lastSentId: String(newestUser.id), awaiting: true, liveSteps: [], draft: null });
    } else if (!this.sawLiveSteps && newestReply && tms(newestReply) >= this.lastSentTs && this.lastSentTs) {
      // A reply at/after our last user message → settle — but ONLY when the bridge is
      // NOT streaming live steps for this turn. Once steps are flowing, the agent
      // flushes its in-progress thoughts as interim reply messages; settling on those
      // would yank the bar off a still-running turn (the exact "bar stops while it's
      // still working" bug). With steps active, the settled sentinel is the honest stop.
      this.commit({ awaiting: false });
    }
    // Refresh the session render cache with what this room actually shows now.
    threadCache.set(this.key, { messages: this.state.messages, blocks: liveBlocks, sig });
  }

  // ── Realtime: one self-healing channel per room ─────────────────────────────
  subscribeRoom() {
    if (!this.alive) return;
    if (!supabase) { this.updateConnection({ realtime: 'off' }); return; }
    // room_id single-filter subscription (corner:one-write-path R5, 2026-07-01).
    // postgres_changes supports exactly ONE `column=eq.value` filter. Every row now has
    // a canonical room_id (trigger + backfill), so one equality filter scopes the room
    // precisely. If a slug is ever non-canonical the filter just misses and the
    // reconcile still covers.
    const room = this.room;
    let roomIdFilter;
    if (room.isMission) roomIdFilter = `${this.worldId}:mission:${String(room.missionSlug || room.id || '')}`;
    else if (room.isProject) roomIdFilter = `${this.worldId}:project:${room.id}`;
    else roomIdFilter = `${this.worldId}:agent:${room.id}`;
    const filter = `room_id=eq.${roomIdFilter}`;

    try { if (this.channel) supabase.removeChannel(this.channel); } catch { /* already gone */ }
    // Self-healing channel (the cv3 R74 pattern — corner:bridge frontend-visibility D5).
    // `.subscribe()` used to be called with no status callback at all: CHANNEL_ERROR /
    // TIMED_OUT / CLOSED were never observed, there was no reconnect, and no history
    // catch-up on re-subscribe. Now: exponential-backoff resubscribe, and a FULL load()
    // on every SUBSCRIBED so rows that landed while the socket was down come straight in.
    // Channel-identity guard (PARITY #3): without it one transient
    // CHANNEL_ERROR/TIMED_OUT causes permanent live↔reconnecting
    // oscillation — the callback closes over a stale `this.channel` and
    // a new subscribeRoom() races the old retry timer, each firing
    // full refetches every 1-2s. This is a top "not responding/blinking" driver.
    const myChannel = supabase
      .channel(`cv6-thread-${this.worldId}-${this.room.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        // Targeted reload-on-insert: a delta, not a whole-window refetch.
        () => { if (this.alive && this.channel === myChannel) this.load(); },
      );
    this.channel = myChannel;
    myChannel.subscribe((channelStatus) => {
        if (!this.alive) return;
        if (myChannel !== this.channel) return; // stale channel — ignore
        if (channelStatus === 'SUBSCRIBED') {
          this.channelRetryAttempt = 0;
          this.updateConnection({ realtime: 'live' });
          this.load({ full: true });   // catch-up for anything missed while the socket was down
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT' || channelStatus === 'CLOSED') {
          this.updateConnection({ realtime: 'reconnecting' });
          const delay = Math.min(30000, 1000 * (2 ** this.channelRetryAttempt));
          this.channelRetryAttempt += 1;
          if (this.channelRetryTimer) clearTimeout(this.channelRetryTimer);
          this.channelRetryTimer = setTimeout(() => { if (this.alive && this.channel === myChannel) this.subscribeRoom(); }, delay);
        }
      });
  }

  // ── Foreground catch-up (corner:bridge frontend-visibility D4) ──────────────
  // Inside the phone's web view, backgrounding freezes JS timers and kills the realtime
  // socket. Nothing in the CV6 chat path listened for the app coming BACK, so a resumed
  // thread sat frozen until the next tick — and if that first request 401'd on a
  // not-yet-refreshed token, the old code wiped the thread. Refresh the session FIRST,
  // then reload the FULL window, then make sure the socket is really up. One listener
  // set for the room, not one per mount.
  attachWakeListeners() {
    this.onWake = () => {
      if (!this.alive) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const refreshed = (supabase && supabase.auth && supabase.auth.getSession)
        ? Promise.resolve(supabase.auth.getSession()).catch(() => null)
        : Promise.resolve(null);
      refreshed.then(() => {
        if (!this.alive) return;
        this.load({ full: true });
        // Only rebuild a socket that is actually down. Tearing a healthy channel down on
        // every tab focus would churn the connection for no reason.
        const socketState = this.channel && this.channel.state;
        if (supabase && (!this.channel || socketState === 'closed' || socketState === 'errored' || socketState === 'leaving')) this.subscribeRoom();
      });
    };
    this.onOnline = () => { this.updateConnection({ online: true }); this.onWake(); };
    this.onOffline = () => { this.updateConnection({ online: false }); };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', this.onWake);
      window.addEventListener('online', this.onOnline);
      window.addEventListener('offline', this.onOffline);
    }
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onWake);
  }

  detachWakeListeners() {
    if (typeof window !== 'undefined' && this.onWake) {
      window.removeEventListener('focus', this.onWake);
      window.removeEventListener('online', this.onOnline);
      window.removeEventListener('offline', this.onOffline);
    }
    if (typeof document !== 'undefined' && this.onWake) document.removeEventListener('visibilitychange', this.onWake);
    this.onWake = null; this.onOnline = null; this.onOffline = null;
  }

  // ── Step feeds ─────────────────────────────────────────────────────────────
  stepQuery(limit) {
    const room = this.room;
    const agentParam = (room.isMission || room.isProject) ? 'corner' : room.id;
    const projParam = room.isMission ? room.projectSlug : (room.isProject ? room.id : '');
    const q = new URLSearchParams({ client_id: this.worldId, agent: agentParam, limit: String(limit) });
    if (projParam) q.set('project', projParam);
    return q;
  }

  // The live step heartbeats for the message you just sent (events table via
  // /message-steps; client-side anon reads are RLS-blocked, hence the server proxy).
  // Runs only while a turn is open, and restarts clean on every new turn.
  startLiveStepPoll() {
    this.stepLastActivity = Date.now();
    this.stepLastCount = -1;
    const q = this.stepQuery(50);
    const poll = () => authFetch(`/api/dashboard/message-steps?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!this.alive || !d || !this.state.awaiting) return;
        const all = Array.isArray(d.steps) ? d.steps : [];
        // Only the steps for THIS sent message; if we don't yet have its id, show
        // nothing (the generic working indicator still renders from `awaiting`).
        const sentId = this.state.lastSentId;
        const mine = sentId ? all.filter((s) => String(s.parent_message_id) === sentId) : [];
        this.commit({ liveSteps: mine });
        // `settled` (step_index 9999) IS "the agent stopped working" — stop the bar on
        // it, no guessing, so working-vs-stopped is honest (Patrik 2026-06-27).
        if (mine.some((s) => s.step_index === 9999 || s.text === 'settled')) { this.commit({ awaiting: false }); return; }
        const renderable = mine.filter((s) => s.step_index !== 9999 && s.text !== 'settled').length;
        // Once a real step lands, the bridge is streaming — from here the settled
        // sentinel above (or the dead-bridge backstop) is the ONLY thing that stops the
        // bar; interim reply bubbles must not (see the project() settle guard).
        if (renderable > 0) this.sawLiveSteps = true;
        if (renderable !== this.stepLastCount) { this.stepLastCount = renderable; this.stepLastActivity = Date.now(); }
        // Dead-bridge insurance: fully silent (no new step, no reply) for a long
        // stretch. This used to just switch the working bar off, which rendered a DEAD
        // turn as a quiet settle — the room looked idle, as if you had never asked
        // (corner:bridge frontend-visibility D1, the reported symptom). It now says so
        // out loud and offers Retry / Nudge; RoomRecoveryNotice renders it at the tail.
        if (Date.now() - this.stepLastActivity > DEAD_TURN_MS) {
          this.silentTurn = true;
          const h = this.state.turnHealth;
          this.commit({
            awaiting: false,
            turnHealth: (h && h.state === 'needs_attention') ? h : { state: 'needs_attention', cause: 'agent_silent', repaired: false },
          });
        }
      })
      .catch(() => {});
    poll();
    this.stepTimer = setInterval(poll, 1500);
  }

  // Follow the exact persisted message through the steward. Inspection is read-only;
  // after 45 seconds without activity we ask once for the server's narrowly allowlisted
  // repair. Server-side retry counts prevent loops across tabs and background cron runs.
  startStewardPoll() {
    this.repairAsked = false;
    const messageId = this.state.lastSentId;
    const inspect = async () => {
      if (!this.alive || !this.state.awaiting) return;
      const shouldRepair = Date.now() - this.lastSentTs >= 45000 && !this.repairAsked;
      if (shouldRepair) this.repairAsked = true;
      try {
        const response = shouldRepair
          ? await authFetch('/api/dashboard/room-health', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ client_id: this.worldId, message_id: messageId }),
            })
          : await authFetch(`/api/dashboard/room-health?${new URLSearchParams({ client_id: this.worldId, message_id: messageId }).toString()}`);
        if (!this.alive || !response?.ok) return;
        const health = await response.json();
        if (!health?.found) return;
        this.commit({ turnHealth: health });
        if (health.state === 'settled') {
          this.commit({ awaiting: false });
          this.load({ full: true });
        } else if (health.state === 'needs_attention' && !health.repaired) {
          this.commit({ awaiting: false });
        }
      } catch { /* the message and step polls remain the fallback */ }
    };
    inspect();
    this.stewardTimer = setInterval(inspect, 10000);
  }

  stopTurnPolls() {
    if (this.stepTimer) { clearInterval(this.stepTimer); this.stepTimer = null; }
    if (this.stewardTimer) { clearInterval(this.stewardTimer); this.stewardTimer = null; }
    this.stopTurnStream();
    this.turnPollKey = '';
  }

  stopTurnStream() {
    if (this.streamAbort) { try { this.streamAbort.abort(); } catch { /* already dead */ } }
    this.streamAbort = null;
    this.streamKey = '';
  }

  // Live draft stream (R-SMOOTHNESS Round D). Reads the bridge's SSE mirror via
  // the chat-bridge proxy and feeds state.draft with the growing partial reply.
  // Contract: NEVER touches messages/awaiting/liveSteps; every failure shape is
  // a silent no-op (the step poll is the fallback and runs regardless); the
  // real row's arrival clears the draft in project().
  startTurnStream(messageId) {
    if (!messageId || this.streamKey === messageId) return;
    this.stopTurnStream();
    this.streamKey = messageId;
    const controller = new AbortController();
    this.streamAbort = controller;
    let fullText = '';
    authFetch(`/api/dashboard/chat-bridge?stream=${encodeURIComponent(messageId)}`, {
      signal: controller.signal,
    }).then(async (res) => {
      if (!res.ok || !res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }
          if (!this.alive || this.streamKey !== messageId) return;
          if (event.type === 'chunk' && event.text) {
            fullText += event.text;
            this.commit({ draft: { text: fullText, streaming: true } });
          } else if (event.type === 'done' || event.type === 'fallback'
            || event.type === 'superseded' || event.type === 'error') {
            // The durable row arrives via realtime/reconcile; pull it now so
            // the draft-to-row swap is immediate rather than next-poll.
            this.load({ full: false });
            return;
          }
        }
      }
    }).catch(() => { /* silent — the step poll carries the turn */ });
  }

  // The turn-scoped polls used to be effects keyed on [awaiting, lastSentId]. Same key,
  // same restart-on-change semantics — just driven by the engine instead of React.
  syncTurnPolls() {
    if (!this.started) return;
    const key = this.state.awaiting ? `on|${this.state.lastSentId}` : 'off';
    if (key !== this.turnPollKey) {
      this.stopTurnPolls();
      this.turnPollKey = key;
      if (this.state.awaiting) {
        this.startLiveStepPoll();
        if (this.state.lastSentId) {
          this.startStewardPoll();
          this.startTurnStream(this.state.lastSentId);
        }
      }
    }
    // While a turn is live, refresh the persisted steps a touch faster.
    const cadence = this.state.awaiting ? 3000 : 12000;
    if (cadence !== this.stepsCadence) this.startStepsPoll();
  }

  // Persist EVERY turn's working steps (not just the live one). Polls the same step feed
  // regardless of `awaiting` and groups by parent_message_id, so a finished turn's steps
  // stay available to render in the conversation — and survive a reload.
  startStepsPoll() {
    if (this.stepsTimer) { clearInterval(this.stepsTimer); this.stepsTimer = null; }
    this.stepsCadence = this.state.awaiting ? 3000 : 12000;
    const q = this.stepQuery(100);
    const load = () => authFetch(`/api/dashboard/message-steps?${q.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!this.alive || !d) return;
        const all = Array.isArray(d.steps) ? d.steps : [];
        const byParent = {};
        for (const s of all) {
          const pid = s && s.parent_message_id ? String(s.parent_message_id) : '';
          if (!pid) continue;
          (byParent[pid] = byParent[pid] || []).push(s);
        }
        // Only commit when the grouped steps actually changed (count + newest id per
        // turn). The feed is identical between polls in a quiet room; committing a fresh
        // object each time would churn a re-render and yank the scroll.
        const sig = Object.keys(byParent).sort().map((k) => `${k}:${byParent[k].length}:${byParent[k][0]?.id || ''}`).join('~');
        if (sig !== this.stepsSig) { this.stepsSig = sig; this.commit({ stepsByParent: byParent }); }
      })
      .catch(() => {});
    load();
    this.stepsTimer = setInterval(load, this.stepsCadence);
  }

  // ── Sending ────────────────────────────────────────────────────────────────
  async send(text, options = {}) {
    const worldId = this.worldId;
    const room = this.room;
    const body = String(text || '').trim();
    if (!worldId || !room?.id || !body) return false;
    // Real local no-Supabase mode is read-only (no phantom sends); explicit ?demo=
    // fixtures keep the send path live because Playwright intercepts own the POST.
    if (!supabase && !demoFixtureActive()) return false;
    // Show it immediately as your turn (reconciled away when the real row arrives).
    const now = new Date();
    const optId = `${now.getTime()}-${Math.random().toString(36).slice(2)}`;
    this.updatePending((p) => [...p, {
      _opt: true, optId,
      agentInitials: initials('You'), agentName: 'You', agentTint: 'accent', isUser: true,
      text: body, time: hhmm(now.toISOString()), ts: now.toISOString(),
      isFile: false, fileName: '', attachmentUrl: '', fileMime: '', fileSize: 0, blocks: null,
    }]);
    const interactionMode = options?.interactionMode === 'plan' ? 'plan' : 'work';
    // Project and mission rooms keep one shared thread, but the room's saved
    // specialist decides who handles this turn. Agent 1:1 rooms remain fixed.
    const roomAgent = options?.agent || 'corner';
    const payload = room.isMission
      // Send the CANONICAL "<project>:<mission>" slug (room.missionSlug), not the bare
      // tail — write-message.js passes a slug containing ':' through untouched, so the
      // mission never enters the bare-slug first-wins lottery (Bug 1).
      ? { client_id: worldId, agent: roomAgent, project: room.projectSlug, text: body, role: 'user', source: 'corner-dashboard', metadata: { mission_slug: String(room.missionSlug || room.id || ''), interaction_mode: interactionMode } }
      : room.isProject
        ? { client_id: worldId, agent: roomAgent, project: room.id, text: body, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: interactionMode } }
        : { client_id: worldId, agent: room.id, text: body, role: 'user', source: 'corner-dashboard', metadata: { interaction_mode: interactionMode } };
    // Show "working" the instant you send, so the thread never looks dead.
    this.sawLiveSteps = false;
    this.lastSentTs = now.getTime();
    this.lastSentText = body;
    this.lastSentOptions = { interactionMode, agent: roomAgent };
    this.silentTurn = false;
    this.commit({ awaiting: true, turnHealth: { state: 'accepted', cause: null, repaired: false }, liveSteps: [], draft: null });
    // A failed send KEEPS its bubble (corner:bridge frontend-visibility D3). Deleting it
    // was the single most alarming failure on the surface: your words flashed into the
    // thread and then vanished with no reason given and nothing to tap. Now the bubble
    // stays, marked "Not sent", carrying the reason and a one-tap retry.
    const markFailed = (reason) => {
      this.updatePending((p) => p.map((m) => (m.optId === optId
        ? { ...m, failed: true, failReason: reason, retryText: body, retryOptions: options }
        : m)));
      this.commit({ awaiting: false, turnHealth: { state: 'needs_attention', cause: 'write_failed', repaired: false } });
      // Tell the composer the words are safe in the thread, so it does NOT also restore
      // them into the box (one copy of your message, not two).
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
          this.commit({ lastSentId: String(id) });
          this.updatePending((p) => p.map((m) => (m.optId === optId ? { ...m, serverId: String(id) } : m)));
        }
        if (j?.turn_receipt) this.commit({ turnHealth: { state: j.turn_receipt.state || 'accepted', cause: null, repaired: false } });
      } catch { /* non-JSON */ }
      // Immediately bump this direct agent thread's recency so Recently Active reflects
      // the send before the next poll cycle picks it up.
      if (!room.isProject && !room.isMission && this.bumpAgentThread) this.bumpAgentThread(room.id, body);
      this.reload();
      return true;
    } catch (err) {
      markFailed((err && (err.name === 'TimeoutError' || err.name === 'AbortError')) ? 'timeout' : classify(null));
      return false;
    }
  }

  // Tap-to-retry on a failed bubble: drop the failed copy and send the same words again.
  retrySend(optId) {
    const entry = this.state.pending.find((m) => m.optId === optId);
    if (!entry) return Promise.resolve(false);
    this.updatePending((p) => p.filter((m) => m.optId !== optId));
    const opts = { ...(entry.retryOptions || {}) };
    delete opts.onKeptInThread;   // the retry owns its own bubble
    return this.send(entry.retryText || entry.text || '', opts);
  }

  // A turn the agent abandoned: resend the same ask, or nudge for a status.
  retryTurn() {
    const text = this.lastSentText;
    if (!text) return Promise.resolve(false);
    return this.send(text, this.lastSentOptions || {});
  }

  nudgeTurn() {
    return this.send('Are you still on this? Give me a quick status on my last message.', this.lastSentOptions || {});
  }

  // One-tap restart for a stuck turn (R-SMOOTHNESS Round E): ask the steward to
  // run its server-allowlisted repair for this exact turn, then reload. Same
  // endpoint the 45s auto-repair path uses — a human tap just asks sooner.
  async repairTurn() {
    if (!this.state.lastSentId) return false;
    try {
      const res = await authFetch('/api/dashboard/room-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: this.worldId, message_id: this.state.lastSentId }),
      });
      const j = res.ok ? await res.json() : null;
      this.load({ full: true });
      return !!j?.repaired;
    } catch { return false; }
  }

  // Stop the live turn (R-SMOOTHNESS Round E, bridge Round C). Optimistic
  // 'stopping' state; the durable stopped row arrives through the normal feed.
  // Never fakes a settled turn: awaiting only flips when the server's row or
  // sentinel says so. feature_off (bridge flag/tunnel not live) hides the
  // control for the rest of the session.
  async stopTurn() {
    if (!this.state.awaiting || !this.state.lastSentId) return false;
    this.commit({ turnHealth: { state: 'stopping', cause: null } });
    try {
      const res = await authFetch('/api/dashboard/chat-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', message_id: this.state.lastSentId, client_id: this.worldId }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.stopped) { this.load({ full: false }); return true; }
      if (j.feature_off) this.stopUnavailable = true;
      this.commit({ turnHealth: null });
      return false;
    } catch {
      this.commit({ turnHealth: null });
      return false;
    }
  }

  // The old reloadKey bump: a full window, fresh persisted steps, and a socket check.
  reload() {
    if (!this.started) return;
    this.load({ full: true });
    this.startStepsPoll();
    const socketState = this.channel && this.channel.state;
    if (supabase && (!this.channel || socketState === 'closed' || socketState === 'errored' || socketState === 'leaving')) this.subscribeRoom();
  }

  async clearRoom() {
    const worldId = this.worldId;
    const room = this.room;
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
      this.commit({
        archivedMessages: [...this.state.archivedMessages, ...this.state.messages],
        messages: [], pending: [], awaiting: false, liveSteps: [], status: 'empty',
      });
      this.rows = [];
      this.newestTs = 0;
      this.sig = null;
      threadCache.delete(this.key);
      this.reload();
      return true;
    } catch { return false; }
  }
}

// ── The registry: one engine per room key, refcounted by its mounts ───────────
const engines = new Map();

const EMPTY_SNAPSHOT = {
  messages: [], archivedMessages: [], blocks: null, status: 'loading',
  awaiting: false, awaitingSince: null, liveSteps: [], turnHealth: null,
  connection: { online: true, realtime: 'off', feed: 'live' },
};
// No world or no room: the hook must still be callable (rules of hooks), and it must
// behave like the old "nothing to load" branch — an empty thread, still loading.
const NULL_ENGINE = {
  subscribe: () => () => {},
  getSnapshot: () => EMPTY_SNAPSHOT,
  retain: () => () => {},
  release: () => {},
  updateRoom: () => {},
  send: () => Promise.resolve(false),
  clearRoom: () => Promise.resolve(false),
  retryTurn: () => Promise.resolve(false),
  nudgeTurn: () => Promise.resolve(false),
  reload: () => {},
  bumpAgentThread: null,
};

function acquireEngine(worldId, room) {
  const key = threadCacheKey(worldId, room);
  if (!worldId || !key) return NULL_ENGINE;
  let engine = engines.get(key);
  if (!engine) {
    engine = new RoomThreadEngine(worldId, room);
    engines.set(key, engine);
    // A render that never commits (StrictMode's throwaway pass) would otherwise leave an
    // inert engine in the map forever. If nothing retains it, reap it.
    engine.graceTimer = setTimeout(() => {
      engine.graceTimer = null;
      if (engine.refs === 0 && !engine.started && engines.get(key) === engine) engines.delete(key);
    }, ENGINE_GRACE_MS);
  }
  return engine;
}

// Fetch the room's thread. `room` is an agent room { id (slug), name }.
// Thin view over the room's ONE engine: every mount of the same room shares its
// subscription, its reconcile timer and its state.
export function useRoomThread(worldId, room) {
  const { bumpAgentThread } = useDataContext() || {};
  const key = threadCacheKey(worldId, room);
  const fingerprint = roomFingerprint(worldId, room);
  const engine = useMemo(() => acquireEngine(worldId, room), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { engine.bumpAgentThread = bumpAgentThread || null; }, [engine, bumpAgentThread]);
  useEffect(() => { engine.updateRoom(room); }, [engine, fingerprint]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => engine.retain(), [engine]);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot);
  return useMemo(() => ({
    ...snapshot,
    send: engine.send,
    clearRoom: engine.clearRoom,
    retryTurn: engine.retryTurn,
    nudgeTurn: engine.nudgeTurn,
    reload: engine.reload,
    repairTurn: engine.repairTurn,
    stopTurn: engine.stopTurn,
  }), [snapshot, engine]);
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
