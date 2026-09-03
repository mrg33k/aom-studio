// cv6next — real conversation for one room, shaped to the agent-chat kit Turn element
// (data-each="messages" -> message.agentName/text/time/...). The thread is a live
// Convex subscription on messages:list (corner:retire-supabase R2): the websocket
// pushes every new row, nothing polls. No fake data: messages are the room's real
// thread, oldest -> newest.

import { useState, useEffect, useCallback, useMemo, useSyncExternalStore } from 'react';
import { authFetch } from '../../lib/authFetch';
import { demoFixtureActive } from '../../lib/fixtureClient.js';
import { titleForAgent } from './agentTitles.js';
import { extractLinkCards, stripTrailingCardUrl } from './resultLinks.js';
import { useDataContext } from '../providers/DataContext.jsx';
import { deriveTurnState } from './roomStatus.js';
import {
  hasSession, ensureFreshToken, subscribeConvexQuery, convexQuery, convexMutation, convexWorldId,
} from '../../lib/convex.js';
import { refreshConvexRooms, convexUnreadSupported } from './convexRooms.js';
import { convexViewerIdentity, convexReadIdentity } from './convexIdentity.js';

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
// Ported from the native app's ChatViewModel/RoomStore: ONE live subscription,
// ONE turn subscription and ONE set of wake listeners per room — no matter how
// many components render that room. CV6's One Page renders the same
// thread in up to four places at once (the col3 quick reply, the Catch Up modal,
// mobile Chat, ChatDesktop), and the hook used to build all of that machinery per
// MOUNT: four sockets, four 10s polls, four 1.5s step polls and four
// focus/visibilitychange listeners racing on one room (frontend audit D12). Every
// extra copy was also an extra chance for one of them to wipe the thread.
//
// The thread itself is a Convex subscription: the server pushes the whole window
// (messages:list, 100 rows) every time it changes, so there is no delta cursor
// and no reconcile timer. A one-off refetch survives for the moments a person
// asks for one (Retry, coming back to the foreground).
//
// Everything about how this thing FAILS is unchanged, and must stay that way:
//   • a failed read never wipes the thread (it marks the feed stale and keeps the
//     last good load; 'error' only when there was nothing on screen to protect),
//   • a dead turn says it is dead and offers Retry / Nudge,
//   • a failed send keeps its bubble, marked "Not sent", with a one-tap retry,
//   • the websocket reconnects on its own and the next push catches the thread up.
// Those four are the shipped contract of this file. Read them before you edit it.

const THREAD_WINDOW = 100;            // rows the subscription carries for one room
const RAW_CAP = 240;                  // most merged rows we hold for one room
const ENGINE_GRACE_MS = 20000;        // keep a room warm this long after its last mount
const DEAD_TURN_MS = 90000;           // dead-agent backstop — R-A5: 180s → 90s, plain-language recovery
const BACKSTOP_TICK_MS = 5000;        // how often an open turn is checked against DEAD_TURN_MS

const rowKey = (row) => (row && row.id
  ? String(row.id)
  : `${row?.timestamp || ''}|${row?.role || ''}|${String(row?.text || '').slice(0, 80)}`);
const rowTime = (row) => {
  const t = row?.timestamp ? new Date(row.timestamp).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

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
    // Rail entries carry the exact backend room key when they know it.
    room.convexKey || '',
  ].join('|');
}

// ── Row mapping (corner:convex-multi-agent) ──────────────────────────────────
// A Convex message → the flat row shape project() consumes, so the entire
// projection (attachments, link cards, turn logic, caching) runs unchanged.
// Convex family reads can return the SAME message twice — an imported legacy
// copy and a native copy live in sibling rooms and share createdAt+text — so
// dedupe on that pair; _id would keep both and double-render the thread.
function convexRowsToThreadRows(value) {
  const rows = [];
  const indexByKey = new Map();
  const sourceRows = Array.isArray(value) ? value : [];
  const sourceById = new Map(sourceRows.filter((row) => row?._id).map((row) => [String(row._id), row]));
  for (const m of sourceRows) {
    if (!m || typeof m !== 'object') continue;
    // Imported rows can lack `role`; an agentSlug marks the agent's side.
    const role = m.role || (m.agentSlug ? 'assistant' : 'user');
    const key = `${m.createdAt}|${role}|${String(m.text || '').slice(0, 120)}`;
    const replyMetadata = m.replyTo ? (() => {
      const parent = sourceById.get(String(m.replyTo));
      if (!parent) return null;
      const parentRole = parent.role || (parent.agentSlug ? 'assistant' : 'user');
      return { reply_to: {
        message_id: String(m.replyTo),
        sender: parentRole === 'user' ? (parent.userName || 'You') : titleForAgent(parent.agentSlug || 'corner'),
        snippet: String(parent.text || '').replace(/\s+/g, ' ').trim().slice(0, 140),
      } };
    })() : null;
    const metadata = {
      ...(replyMetadata || {}),
      ...(Array.isArray(m.attachments) && m.attachments.length ? { attachments: m.attachments } : {}),
      ...(Array.isArray(m.blocks) && m.blocks.length ? { blocks: m.blocks } : {}),
      ...(Array.isArray(m.reactions) && m.reactions.length ? { reactions: m.reactions } : {}),
    };
    const mapped = {
      id: String(m._id || ''),
      text: m.text || '',
      role,
      agent: m.agentSlug || '',
      user_name: role === 'user' ? (m.userName || '') : '',
      timestamp: m.createdAt ? new Date(m.createdAt).toISOString() : null,
      source: m.source || '',
      reply_to: m.replyTo ? String(m.replyTo) : null,
      // Convex stores a real document relationship. Shape a small preview from
      // the same bounded thread window so replies stay useful after reload.
      metadata: Object.keys(metadata).length ? metadata : null,
    };
    const existingIndex = indexByKey.get(key);
    if (existingIndex !== undefined) {
      // Imported/native twins can differ only because one payload was clipped.
      // Keep the fuller truth, independent of which sibling room was read first.
      if (mapped.text.length > rows[existingIndex].text.length) rows[existingIndex] = mapped;
      continue;
    }
    indexByKey.set(key, rows.length);
    rows.push(mapped);
  }
  return rows;
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

    // No stop endpoint exists on Convex, so the Stop control stays hidden.
    this.stopUnavailable = true;
    this.convexReadMarked = false;   // markRead fires once per room open, not per push

    // ── Rows we hold. `rows` is the raw server window; the rendered thread is
    // projected from it.
    this.rows = [];
    this.newestTs = 0;

    // ── The refs the hook used to carry, now plain fields on the one engine.
    this.lastSentTs = 0;
    this.lastSentText = '';
    this.lastSentOptions = null;
    // DEDUP-11: 50ms client debounce — two identical sends 20ms apart = 1 row
    this._lastDedupText = '';
    this._lastDedupTs = 0;
    this.silentTurn = false;      // this turn was declared dead by the backstop
    this.sawLiveSteps = false;    // a turn row is streaming steps for this send
    this.didBaseline = false;
    this.sig = null;              // rendered-thread signature (no-op push guard)

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
      draft: null,          // reserved: a streamed partial reply, never persisted
      turnHealth: null,
      // ── Connection health (corner:bridge frontend-visibility, 2026-08-09) ────
      //   online   — the browser's own network state
      //   realtime — 'connecting' | 'live' | 'reconnecting' | 'off'
      //   feed     — 'live' (the last thread read succeeded) | 'stale' (it failed;
      //              what you see is the last good load, nothing was lost)
      // Rendered by RoomConnectionNotice; never used to hide or clear real messages.
      connection: {
        online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
        realtime: 'connecting',
        feed: 'live',
      },
    };
    if (cached) this.sig = cached.sig;

    // Subscriptions and timers, one of each.
    this.unsubThread = null;
    this.unsubTurns = null;
    this.roomDocId = null;
    this.turnsWanted = false;
    this.backstopTimer = null;
    this.loadInFlight = false;

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
    // to two subscriptions on one room, which is the whole thing this file exists to
    // prevent. Re-register on the way back up; start() below revives the stopped one.
    if (!engines.has(this.key)) engines.set(this.key, this);
    if (!this.started) this.start();
    return () => this.release();
  }

  release() {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs > 0) return;
    // Keep the room warm for a beat: a route change unmounts and remounts the same
    // room within a tick, and tearing the subscription down and back up for that
    // would churn the connection for nothing.
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
    const keyBefore = this.canonicalRoomKey();
    this.room = { ...room };
    // A rename changes the agent title on every rendered row, and a mission's project
    // changes the query — reproject, and resubscribe if the room key moved.
    this.sig = null;
    if (!this.started) return;
    if (this.canonicalRoomKey() !== keyBefore) {
      this.subscribeThread();
      this.subscribeTurns();
    } else {
      this.project();
    }
  }

  emit() { for (const listener of this.listeners) listener(); }

  // Commit a state patch. Only a real change rebuilds the snapshot, so a push that
  // changes nothing never re-renders the thread.
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
    this.syncBackstop();
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
    // R-A3: single turnState truth — every surface reads this one object
    const turnState = deriveTurnState({
      awaiting: s.awaiting,
      liveSteps: s.liveSteps,
      draft: s.awaiting ? s.draft : null,
      turnHealth: s.turnHealth,
      connection: s.connection,
      lastSentId: s.lastSentId,
      lastSentTs: this.lastSentTs,
      lastSentText: this.lastSentText,
      turnStartTs: this.lastSentTs,
    })
    this.snapshot = {
      messages: d.messages,
      // Raw fetch size — the only honest input for "older files exist".
      rawRowCount: this.rawRowCount ?? null,
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
      turnState,
      // The Stop control has no Convex backend; it stays hidden.
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
    this.subscribeThread();
    this.subscribeTurns();
    this.attachWakeListeners();
    this.syncBackstop();
  }

  stop() {
    this.alive = false;
    this.started = false;
    if (this.unsubThread) { try { this.unsubThread(); } catch { /* already gone */ } this.unsubThread = null; }
    if (this.unsubTurns) { try { this.unsubTurns(); } catch { /* already gone */ } this.unsubTurns = null; }
    this.turnsWanted = false;
    if (this.backstopTimer) { clearInterval(this.backstopTimer); this.backstopTimer = null; }
    this.detachWakeListeners();
  }

  // ── Room identity: the canonical room key ──────────────────────────────────
  // "aom:mission:corner:convex-multi-agent" / "aom:project:wolfpack" /
  // "aom:agent:elon" — the key corner-convex resolves rooms by (legacyRoomId).
  // Rail entries that know their exact backend key (including native rooms with
  // no legacy slug, keyed by document _id) carry it as room.convexKey and it wins
  // over derivation.
  canonicalRoomKey() {
    const room = this.room;
    if (room.convexKey) return room.convexKey;
    const world = convexWorldId(this.worldId);
    if (room.isMission) return `${world}:mission:${String(room.missionSlug || room.id || '')}`;
    if (room.isProject) return `${world}:project:${room.id}`;
    return `${world}:agent:${room.id}`;
  }

  // ── The live thread ────────────────────────────────────────────────────────
  // One subscription on messages:list for the OPEN room only. The server pushes
  // the whole window on every change. Failure contract: a failed read marks the
  // feed stale and keeps the last good thread.
  subscribeThread() {
    if (this.unsubThread) { try { this.unsubThread(); } catch { /* already gone */ } this.unsubThread = null; }
    if (!this.alive) return;
    this.updateConnection({ realtime: 'connecting' });
    this.unsubThread = subscribeConvexQuery(
      'messages:list',
      { roomId: this.canonicalRoomKey(), limit: THREAD_WINDOW },
      (value) => {
        if (!this.alive) return;
        this.updateConnection({ realtime: 'live' });
        this.applyRows(value);
      },
      () => {
        if (!this.alive) return;
        this.updateConnection({ realtime: 'reconnecting' });
        this.markFeedStale();
      },
    );
  }

  applyRows(value) {
    this.updateConnection({ feed: 'live' });
    // The RAW fetched count, before dedupe/filtering. "Older files exist" must key
    // on this: a full window means more exists regardless of how many rows survive
    // dedupe (Wolfpack: 100 raw -> 98 shown hid 150+ older files).
    this.rawRowCount = Array.isArray(value) ? value.length : 0;
    this.rows = convexRowsToThreadRows(value);
    this.newestTs = this.rows.reduce((max, row) => Math.max(max, rowTime(row)), 0);
    this.project();
    this.markConvexRead();
  }

  // One-off refetch of the same window (Retry, foreground wake, a room rename).
  // The subscription stays the live feed; this only pulls the current truth now.
  load() {
    if (!this.alive || this.loadInFlight) return Promise.resolve();
    this.loadInFlight = true;
    return convexQuery('messages:list', { roomId: this.canonicalRoomKey(), limit: THREAD_WINDOW })
      .then((value) => { if (this.alive) this.applyRows(value); })
      .catch(() => { if (this.alive) this.markFeedStale(); })
      .finally(() => { this.loadInFlight = false; });
  }

  // Reading a room clears its unread — server-side, once, on open (gauntlet R1,
  // finding 3). GUARDED: it fires only after listRooms has actually answered with
  // an `unreadCount` field. One call per room open, never per push — the Convex
  // free plan bills on Database I/O. A failure is silent by design: an unread
  // badge that did not clear is not worth an error in the user's face.
  markConvexRead() {
    if (this.convexReadMarked || !convexUnreadSupported()) return;
    this.convexReadMarked = true;
    convexViewerIdentity()
      .then((viewer) => {
        const userId = convexReadIdentity(viewer);
        if (!userId) return null;
        return convexMutation('reads:markRead', { roomId: this.canonicalRoomKey(), userId, at: Date.now() });
      })
      .then((result) => { if (result) refreshConvexRooms(); })
      .catch(() => { /* no read-state backend / renamed mutation: stay silent */ });
  }

  // A FAILED read must never look like an empty room (corner:bridge frontend-visibility
  // D2). A failed read commits nothing, caches nothing, and simply marks the feed
  // stale so the surface can say "showing the last loaded messages".
  markFeedStale() {
    this.updateConnection({ feed: 'stale' });
    // 'error' only when there is nothing on screen to protect — a first load that
    // never landed. A room already rendering keeps its thread.
    if (this.state.status === 'loading') this.commit({ status: 'error' });
  }

  // ── Live turns (turns:listTurns) ───────────────────────────────────────────
  // The agent's working steps for the message you just sent come from the turns
  // table the dispatcher writes (thinking | working | done | failed, with steps).
  // The query is keyed by the room document id, so resolve it once; a room this
  // deployment cannot resolve simply shows the generic working bar.
  subscribeTurns() {
    if (this.unsubTurns) { try { this.unsubTurns(); } catch { /* already gone */ } this.unsubTurns = null; }
    if (!this.alive) return;
    this.turnsWanted = true;
    const key = this.canonicalRoomKey();
    this.resolveRoomDocId(key).then((docId) => {
      if (!this.alive || !this.turnsWanted || !docId || key !== this.canonicalRoomKey()) return;
      this.roomDocId = docId;
      this.unsubTurns = subscribeConvexQuery(
        'turns:listTurns',
        { roomId: docId },
        (turns) => { if (this.alive) this.applyTurns(turns); },
        () => { /* no turn feed: liveSteps stay honestly empty */ },
      );
    }).catch(() => { /* same: the generic working bar is the honest rendering */ });
  }

  resolveRoomDocId(key) {
    if (key && !key.includes(':')) return Promise.resolve(key); // already a document id
    const room = this.room;
    const worldSlug = convexWorldId(this.worldId);
    const kind = room.isMission ? 'mission' : room.isProject ? 'project' : 'agent';
    const args = { worldSlug, kind, key: room.isMission ? String(room.missionSlug || room.id || '').split(':').pop() : String(room.id || '') };
    if (room.isMission && room.projectSlug) args.project = room.projectSlug;
    return convexQuery('rooms:resolveCanonical', args).then((r) => (r && r._id ? String(r._id) : null));
  }

  applyTurns(turns) {
    const list = Array.isArray(turns) ? turns : [];
    const sentId = String(this.state.lastSentId || '');
    const isoOf = (ms) => (ms ? new Date(ms).toISOString() : null);
    // Steps for THIS sent message only; a turn with no message id (an @mention
    // dispatch) counts while it is active and newer than the send.
    const mine = list.filter((t) => t && (
      (t.messageId && String(t.messageId) === sentId)
      || (!t.messageId && this.lastSentTs && t.startedAt >= this.lastSentTs - 1000)
    ));
    const active = mine.filter((t) => t.status === 'thinking' || t.status === 'working');
    const liveSteps = [];
    for (const t of active) {
      const steps = Array.isArray(t.steps) && t.steps.length ? t.steps : [{ label: 'Working', done: false }];
      steps.forEach((st, i) => liveSteps.push({
        step_index: i,
        text: st.label || 'Working',
        done: !!st.done,
        agent: t.agentSlug || '',
        parent_message_id: t.messageId ? String(t.messageId) : sentId,
        timestamp: isoOf(t.startedAt),
      }));
    }
    if (!this.state.awaiting) {
      if (this.state.liveSteps.length) this.commit({ liveSteps: [] });
      return;
    }
    if (liveSteps.length) this.sawLiveSteps = true;
    const patch = { liveSteps };
    // Every turn for this send settled: the bar ends here, not at the backstop.
    if (!active.length && mine.length && this.sawLiveSteps) {
      patch.awaiting = false;
      patch.turnHealth = mine.some((t) => t.status === 'failed')
        ? { state: 'needs_attention', cause: 'agent_silent', repaired: false }
        : null;
    }
    this.commit(patch);
  }

  // Dead-turn backstop: a turn silent past the ceiling says so out loud and offers
  // Retry / Nudge (RoomRecoveryNotice renders it at the tail). Runs only while a
  // turn is open.
  syncBackstop() {
    if (!this.started) return;
    if (!this.state.awaiting) {
      if (this.backstopTimer) { clearInterval(this.backstopTimer); this.backstopTimer = null; }
      return;
    }
    if (this.backstopTimer) return;
    this.backstopTimer = setInterval(() => {
      if (!this.alive || !this.state.awaiting) { this.syncBackstop(); return; }
      const lastActivity = Math.max(this.lastSentTs || 0, ...this.state.liveSteps.map((s) => (s.timestamp ? new Date(s.timestamp).getTime() : 0)));
      if (lastActivity && Date.now() - lastActivity > DEAD_TURN_MS) {
        this.silentTurn = true;
        const h = this.state.turnHealth;
        this.commit({
          awaiting: false,
          turnHealth: (h && h.state === 'needs_attention') ? h : { state: 'needs_attention', cause: 'agent_silent', repaired: false },
        });
      }
    }, BACKSTOP_TICK_MS);
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
        replyTo: m.reply_to || m.metadata?.reply_to?.message_id || '',
        replyPreview: m.metadata?.reply_to || null,
        reactions: Array.isArray(m.metadata?.reactions) ? m.metadata.reactions : [],
      };
    }).filter((m) => m.text || m.isFile || m.blocks || m.attachments?.length || m.linkCards?.length);
    // Only re-commit when the thread actually changed. A no-op reconcile keeps the
    // existing array ref, so the list doesn't re-render and the scroll holds its place.
    const sig = msgs.map((m) => `${m.ts}|${m.text}|${m.attachments?.length || 0}|${m.blocks ? m.blocks.length : 0}|${m.linkCards?.length || 0}|${m.replyTo || ''}|${(m.reactions || []).map((r) => `${r.emoji}:${r.actor || (r.self ? 'self' : '')}`).join(',')}`).join('~');
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
    } else if (newestReply && tms(newestReply) >= this.lastSentTs && this.lastSentTs) {
      // A real reply row IS the turn ending (the round-table's answers land as
      // rows). The turns subscription clears the bar earlier when a turn row
      // settles; this is the guarantee for an agent that answers without one.
      if (this.state.awaiting) this.commit({ awaiting: false, turnHealth: null });
    }
    // Refresh the session render cache with what this room actually shows now.
    threadCache.set(this.key, { messages: this.state.messages, blocks: liveBlocks, sig });
  }

  // ── Foreground catch-up (corner:bridge frontend-visibility D4) ──────────────
  // Inside the phone's web view, backgrounding freezes JS timers and can drop the
  // websocket. The Convex client reconnects on its own; this refreshes the token
  // FIRST, then pulls the current window so a resumed thread never sits frozen
  // until the next push. One listener set for the room, not one per mount.
  attachWakeListeners() {
    this.onWake = () => {
      if (!this.alive) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      Promise.resolve(hasSession() ? ensureFreshToken() : null).catch(() => null).then(() => {
        if (!this.alive) return;
        this.load();
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

  // ── Sending ────────────────────────────────────────────────────────────────
  async send(text, options = {}) {
    const worldId = this.worldId;
    const room = this.room;
    const body = String(text || '').trim();
    if (!worldId || !room?.id || !body) return false;
    // A signed-out page is read-only (no phantom sends); explicit ?demo= fixtures
    // keep the send path live because the fixture backend answers the mutation.
    if (!hasSession() && !demoFixtureActive()) return false;
    // DEDUP-11: 50ms client debounce — second identical POST within 50ms is a double-click
    const _dedupNow = Date.now();
    if (body === this._lastDedupText && (_dedupNow - this._lastDedupTs) < 50) {
      return true;
    }
    this._lastDedupText = body;
    this._lastDedupTs = _dedupNow;
    // Show it immediately as your turn (reconciled away when the real row arrives).
    const now = new Date();
    const optId = `${now.getTime()}-${Math.random().toString(36).slice(2)}`;
    this.updatePending((p) => [...p, {
      _opt: true, optId,
      agentInitials: initials('You'), agentName: 'You', agentTint: 'accent', isUser: true,
      text: body, time: hhmm(now.toISOString()), ts: now.toISOString(),
      isFile: false, fileName: '', attachmentUrl: '', fileMime: '', fileSize: 0, blocks: null,
      replyTo: options?.replyTo ? String(options.replyTo) : '',
      replyPreview: options?.metadata?.reply_to || null,
    }]);
    const interactionMode = options?.interactionMode === 'plan' ? 'plan' : 'work';
    // Project and mission rooms keep one shared thread, but the room's saved
    // specialist decides who handles this turn. Agent 1:1 rooms remain fixed.
    // R-B1: default host is director (Creative), not corner/elon — 0 unpinned rooms fall back to generic
    // R-B2/B3/B5: routing + handoff + override may pass agent explicitly; host stays visible in header
    const roomAgent = options?.agent || 'director';
    // R-B3/B4: allow handoff metadata to ride along so the host session can summon
    // the specialist in the same thread, in speech, running their own method
    const extraMeta = options?.metadata && typeof options.metadata === 'object' ? options.metadata : null
    const handoffMeta = options?.handoffTo ? { handoff_to: String(options.handoffTo), handoff_from: String(options.handoffFrom || roomAgent) } : null
    const clientMessageMeta = { client_message_id: optId }
    const mergedMeta = { ...(extraMeta || {}), ...(handoffMeta || {}), ...clientMessageMeta }
    // Show "working" the instant you send, so the thread never looks dead.
    this.sawLiveSteps = false;
    this.lastSentTs = now.getTime();
    this.lastSentText = body;
    this.lastSentOptions = { interactionMode, agent: roomAgent };
    this.silentTurn = false;
    // `lastSentId` is set optimistically to the pending `optId` so the turns
    // subscription matches nothing (no stale settle from the previous turn) until
    // the server id lands and project() flips it to the real row.
    this.commit({ lastSentId: optId, awaiting: true, turnHealth: { state: 'accepted', cause: null, repaired: false }, liveSteps: [], draft: null });
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
    const classify = (err) => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
      const msg = String((err && err.message) || '');
      if (/HTTP 401|not signed in|unauthenticated/i.test(msg)) return 'signed_out';
      if (/HTTP \d{3}/.test(msg)) return 'server';
      return 'offline';
    };
    // ── The write: messages:send resolves/creates the room by its canonical key,
    // inserts the row, and schedules ai.dispatchMessage — the agent reply arrives
    // as a thread row through the subscription. A failed send keeps its bubble,
    // marked "Not sent", with a one-tap retry.
    try {
      const viewer = await convexViewerIdentity();
      const id = await convexMutation('messages:send', {
        roomId: this.canonicalRoomKey(),
        text: body,
        role: 'user',
        clientId: convexWorldId(worldId),
        clientMessageId: optId,
        source: 'cv6-dashboard',
        userId: viewer.userId,
        userEmail: viewer.userEmail,
        userName: viewer.userName,
        metadata: mergedMeta,
        ...(options?.replyTo ? { replyTo: String(options.replyTo) } : {}),
      });
      if (id) {
        this.commit({ lastSentId: String(id) });
        this.updatePending((p) => p.map((m) => (m.optId === optId ? { ...m, serverId: String(id), receipt: true } : m)));
      }
      // Rooms rail: fetched on load and refreshed after a send — never polled.
      refreshConvexRooms();
      // Immediately bump this direct agent thread's recency so Recently Active
      // reflects the send before the rail refresh lands.
      if (!room.isProject && !room.isMission && this.bumpAgentThread) this.bumpAgentThread(room.id, body);
      return true;
    } catch (err) {
      markFailed((err && (err.name === 'TimeoutError' || err.name === 'AbortError')) ? 'timeout' : classify(err));
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

  // There is no server-side repair for a stuck turn on Convex. Retry / Nudge
  // (above) are the honest recovery; this stays so callers keep their shape.
  async repairTurn() {
    return false;
  }

  // No stop endpoint on Convex; the control is hidden (stopUnavailable).
  async stopTurn() {
    return false;
  }

  // The old reloadKey bump: pull the current window now.
  reload() {
    if (!this.started) return;
    this.load();
  }

  // Clear the chat: a system row with source 'room_reset' is the marker project()
  // already honors — everything before it moves to the archive, the room keeps
  // its history on the server, and every surface (web, phone) agrees on where
  // the fold is. Nothing is deleted.
  async clearRoom() {
    const worldId = this.worldId;
    const room = this.room;
    if (!worldId || !room?.id) return false;
    if (!hasSession() && !demoFixtureActive()) return false;
    try {
      const viewer = await convexViewerIdentity();
      const id = await convexMutation('messages:send', {
        roomId: this.canonicalRoomKey(),
        text: 'Chat cleared',
        role: 'system',
        clientId: convexWorldId(worldId),
        source: 'room_reset',
        userId: viewer.userId,
        userEmail: viewer.userEmail,
        userName: viewer.userName,
        metadata: { room_reset: true },
      });
      if (!id) return false;
      this.commit({ pending: [], awaiting: false, liveSteps: [] });
      this.sig = null;
      threadCache.delete(this.key);
      this.load();
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
  repairTurn: () => Promise.resolve(false),
  stopTurn: () => Promise.resolve(false),
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

// Kept for callers: there is no prefetch. Only the open room subscribes to its
// thread (Convex bills on database reads, and a room nobody opened is not worth one).
export function prefetchThread() {}

// Fetch the room's thread. `room` is an agent room { id (slug), name }.
// Thin view over the room's ONE engine: every mount of the same room shares its
// subscription and its state.
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
// Steps come from the per-room checklist (state kind dash_room_goal_steps, the
// ordered list the agent works); the goal title from the loop's goal memory
// (state kind dash_room_goals). Both are live Convex subscriptions on the world's
// state rows. Per the design guardrail, a step animates (active/spinner) ONLY when
// the agent is live right now; otherwise it renders its static state (done or
// pending), never a fake loop. Returns null when the room has no goal/steps (so the
// thread simply doesn't show).
function roomKeyFor(room) {
  if (!room?.id) return '';
  return room.isProject ? String(room.id) : `agent:${room.id}`;
}
const LIVE = new Set(['live', 'working', 'online', 'running']);
const STEPS_KIND = 'dash_room_goal_steps';
const GOALS_KIND = 'dash_room_goals';
const stateValue = (row) => (row && row.value && typeof row.value === 'object' ? row.value : null);

export function useGoalThread(worldId, room) {
  const [goal, setGoal] = useState(null);
  useEffect(() => {
    const roomKey = roomKeyFor(room);
    if (!worldId || !roomKey || !hasSession()) { setGoal(null); return undefined; }
    let alive = true;
    let list = null;
    let goalText = null;
    const worldSlug = convexWorldId(worldId);
    const shape = () => {
      if (!alive || list === null || goalText === null) return;
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
    };
    const offSteps = subscribeConvexQuery('state:get', { kind: STEPS_KIND, scopeId: 'all', worldSlug }, (row) => {
      const items = stateValue(row)?.items;
      const raw = items && typeof items === 'object' ? items[roomKey] : null;
      list = Array.isArray(raw) ? raw : [];
      shape();
    }, () => { list = list || []; shape(); });
    const offGoals = subscribeConvexQuery('state:get', { kind: GOALS_KIND, scopeId: 'all', worldSlug }, (row) => {
      const rooms = stateValue(row)?.rooms;
      goalText = String((rooms && typeof rooms === 'object' && rooms[roomKey] && rooms[roomKey].goal) || '');
      shape();
    }, () => { goalText = goalText || ''; shape(); });
    return () => { alive = false; offSteps(); offGoals(); };
  }, [worldId, room?.id, room?.isProject, room?.status]);
  return goal;
}

// ── The editable forward plan for one room (goal-thread-plan mission) ──
// Source of truth = the per-room checklist (state kind dash_room_goal_steps),
// carrying source + proposed so the three item types read apart: DONE history lives
// in the message blocks above; here we hold the FUTURE — user-added steps
// (source:user) and agent suggestions (source:agent, proposed). The user steers it:
// add / check-done / edit / accept / dismiss, and hands a step to the agent via the
// room's normal send() (a real message, not a side channel). The list is a live
// subscription, so an agent that proposes a next step shows up without a refresh;
// writes go through the room-goal-steps route, which owns the row's edit rules.
export function useRoomPlan(worldId, room) {
  const [plan, setPlan] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const roomKey = roomKeyFor(room);

  useEffect(() => {
    if (!worldId || !roomKey || !hasSession()) { setPlan([]); return undefined; }
    let alive = true;
    const off = subscribeConvexQuery('state:get', { kind: STEPS_KIND, scopeId: 'all', worldSlug: convexWorldId(worldId) }, (row) => {
      if (!alive) return;
      const items = stateValue(row)?.items;
      const raw = items && typeof items === 'object' ? items[roomKey] : null;
      const list = Array.isArray(raw) ? raw : [];
      // Tolerate old rows written before source/proposed existed.
      setPlan(list.map((s) => ({
        id: s.id, text: s.text || '', done: !!s.done,
        source: s.source === 'agent' ? 'agent' : 'user',
        proposed: !!s.proposed,
      })));
    }, () => { /* keep the last plan */ });
    return () => { alive = false; off(); };
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

  // Optimistic where it helps the tap feel instant; the live row reconciles to truth.
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
