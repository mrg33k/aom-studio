// cv6next — the rooms rail on the Convex plane (corner:convex-multi-agent).
//
// One module-level store for rooms:listRooms, shaped into the exact lists the
// CV6 rail already consumes (useHomeData's data.recent / data.projects /
// data.agents). QUOTA RULE (hard): rooms:listRooms is NEVER polled — it is
// fetched once on load and refreshed after a send (refreshConvexRooms, called
// by the thread engine's Convex send path). Nothing else may call it.
//
// Room identity: the canonical key is legacyRoomId ("aom:project:wolfpack",
// "aom:mission:corner:convex-multi-agent", "aom:agent:elon"). Rooms minted
// natively in Convex can lack a legacyRoomId — those key on their document _id,
// which messages:list / messages:send resolve just as well. Every rail entry
// carries a prebuilt roomObj with that exact key (convexKey), so the thread
// engine never has to re-derive what the rail already knows.

import { useSyncExternalStore, useEffect } from 'react';
import { convexPlaneActive, convexQuery, convexWorldId } from './convexClient.js';
import { convexViewerIdentity, convexReadIdentity } from './convexIdentity.js';
import { roomPreviewLine } from './presentationClean.js';
import { titleForAgent } from './agentTitles.js';

// A preview is one line a person reads. lastMessage.text is a whole message BODY
// (the live workspace carries one 5,011 characters long), so the Convex rail caps
// it — the Supabase rail's source is already a first-line and passes no cap.
const PREVIEW_MAX = 160;

const TINTS = ['violet', 'accent', 'pink', 'teal', 'lime', 'amber'];
function tintFor(seed) {
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
function relTime(ts) {
  if (!ts) return '';
  const ms = Date.now() - new Date(ts).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

// ── Unread: consumed when the server authors it, never invented here ─────────
// A room row carries `unreadCount` only once the Convex API ships per-user read
// state. Until then every row reads 0 and the rail renders exactly what it renders
// today. THE rule this encodes (gauntlet R1, finding 3): a badge on 100% of rows
// carries zero information, so the client never computes one from "newer than my
// localStorage" — it renders the server's number or nothing.
function unreadCountOf(room) {
  const n = Number(room?.unreadCount);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
// True once ANY row in the last listRooms answer carried the field — the feature
// probe the markRead call gates on, so we never fire a mutation the backend has
// not deployed yet.
let unreadSupported = false;
export function convexUnreadSupported() { return unreadSupported; }

// ── Shaping: Convex rooms → the rail's lists ─────────────────────────────────
// Input rows: { _id, legacyRoomId?, title, subtitle?, kind, project?, specialist?,
//               createdAt, lastMessage: {text, createdAt, agentSlug} | null,
//               unreadCount? }.
export function shapeConvexRail(rooms, worldId) {
  const list = Array.isArray(rooms) ? rooms : [];
  unreadSupported = list.some((r) => r && typeof r.unreadCount === 'number');
  const projectTitleBySlug = {};
  for (const r of list) {
    if (r.kind !== 'project') continue;
    const slug = legacyTail(r, worldId) || r.project || '';
    if (slug) projectTitleBySlug[slug] = r.title || slug;
  }

  const agents = [];
  const projects = [];
  const recent = [];
  for (const r of list) {
    if (!r || !r.title) continue;
    const convexKey = r.legacyRoomId || r._id;
    const ts = r.lastMessage?.createdAt ?? r.createdAt ?? 0;
    // THE seam (gauntlet R1, finding 9c): this line used to call normalizePreview
    // alone, which strips markdown but does not gate machine-speak — so 40 of the
    // 390 live rooms previewed a JSON summary payload, a [BRIDGE ALERT], or a bare
    // SUPRV- correlation id. roomPreviewLine is the SAME pipeline the Supabase rail
    // runs (useHomeData's rowPreview), now named once so neither plane can ship half.
    const preview = roomPreviewLine(r.lastMessage?.text || '', { source: r.lastMessage?.source }, { max: PREVIEW_MAX });
    // listRooms persists the last answering specialist on the room. Human turns do
    // not yet persist a display name in that summary, so call them "Teammate" rather
    // than lying with "You" or omitting attribution entirely.
    const author = !preview ? '' : (r.lastMessage?.agentSlug ? titleForAgent(r.lastMessage.agentSlug) : 'Teammate');
    const name = r.title;
    // Unread, consumed only when the backend actually authors it (a per-room
    // readState + unreadCount is landing on the Convex API in a parallel lane).
    // Absent → exactly today's behavior: no badge, no dot, no client-side guess.
    // Present → the server's number is the only number this rail renders.
    const unreadCount = unreadCountOf(r);
    const base = {
      key: `cx:${convexKey}`, id: '', kind: r.kind, name, ts, preview, author,
      unread: unreadCount > 0, needsCount: unreadCount,
      initials: initials(name), tint: tintFor(name),
      age: relTime(ts), status: (Date.now() - ts) < 3600000 ? 'live' : 'ready',
    };
    if (r.kind === 'mission') {
      // "aom:mission:corner:convex-multi-agent" → missionSlug "corner:convex-multi-agent"
      const missionSlug = legacyTail(r, worldId) || String(r.project ? `${r.project}:${r._id}` : r._id);
      const projectSlug = r.project || (missionSlug.includes(':') ? missionSlug.split(':')[0] : '');
      const sub = projectTitleBySlug[projectSlug] || 'Mission';
      recent.push({
        ...base, id: missionSlug, missionSlug, project: projectSlug, sub,
        roomObj: { id: missionSlug.split(':').pop(), name, initials: base.initials, isMission: true, missionSlug, projectSlug, status: 'ready', statusText: sub, convexKey, unreadCount },
      });
    } else if (r.kind === 'project') {
      const slug = legacyTail(r, worldId) || r.project || r._id;
      projects.push({
        id: slug, databaseId: '', slug, name, tint: base.tint, count: '',
        last_message_at: ts, last_message_text: preview,
      });
      recent.push({
        ...base, id: slug, project: slug, sub: 'Project chat',
        roomObj: { id: slug, name, initials: base.initials, isProject: true, status: 'ready', statusText: 'project chat', convexKey, unreadCount },
      });
    } else {
      const slug = legacyTail(r, worldId) || r.specialist || r._id;
      agents.push({ id: slug, name, status: 'idle', statusText: 'idle', initials: base.initials, needsCount: unreadCount });
      recent.push({
        ...base, id: slug, agent: slug, sub: 'Direct chat',
        roomObj: { id: slug, name, initials: base.initials, status: 'ready', convexKey, unreadCount },
      });
    }
  }
  // listRooms already sorts newest-first; keep that order and show the WHOLE
  // list (the Convex rail is the full room directory, not a top-30 recency cut).
  agents.count = agents.length;
  projects.count = projects.length;
  projects.moreCount = 0;
  recent.count = recent.length;
  return { agents, projects, recent, total: list.length };
}

// "aom:project:wolfpack" → "wolfpack"; "aom:mission:corner:x" → "corner:x".
// '' when the room has no legacyRoomId (native-only room → key on _id).
function legacyTail(room, worldId) {
  const legacy = String(room.legacyRoomId || '');
  if (!legacy) return '';
  const prefix = `${worldId}:${room.kind}:`;
  if (legacy.startsWith(prefix)) return legacy.slice(prefix.length);
  // Foreign/odd prefix: fall back to "anything after the kind segment".
  const idx = legacy.indexOf(`:${room.kind}:`);
  return idx >= 0 ? legacy.slice(idx + room.kind.length + 2) : '';
}

// ── The store: one fetch on load, one refresh after each send ────────────────
let store = { status: 'idle', shaped: null, worldId: '' };
const listeners = new Set();
function emit() { for (const fn of listeners) fn(); }
function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function getSnapshot() { return store; }

let inFlight = false;
function fetchRooms(worldId) {
  if (!worldId || inFlight) return;
  inFlight = true;
  // A retry must visibly leave the error state, while a background refresh keeps
  // the last real directory on screen. `shaped` is never replaced with an empty
  // invention just because the network failed after one successful load.
  const hasOfflineCopy = store.worldId === worldId && !!store.shaped;
  store = { ...store, status: hasOfflineCopy ? 'refreshing' : 'loading', worldId };
  emit();
  convexViewerIdentity()
    .then((viewer) => {
      const userId = convexReadIdentity(viewer);
      return convexQuery('rooms:listRooms', { worldId, ...(userId ? { userId } : {}) });
    })
    .then((rooms) => {
      store = { status: 'ready', shaped: shapeConvexRail(rooms, worldId), worldId };
      emit();
    })
    .catch((err) => {
      // First load: a real error state. Later refresh: retain the last verified
      // rooms and mark them stale so Home can say exactly what is happening.
      console.error('[convex] rooms:listRooms failed:', err);
      store = hasOfflineCopy
        ? { status: 'stale', shaped: store.shaped, worldId }
        : { status: 'error', shaped: null, worldId };
      emit();
    })
    .finally(() => { inFlight = false; });
}

// Called by the thread engine after a successful messages:send so the rail's
// previews/order reflect the send without polling.
export function refreshConvexRooms() {
  if (!convexPlaneActive() || !store.worldId) return;
  fetchRooms(store.worldId);
}

// Hook for useHome: returns { status, shaped } on the Convex plane, null off it.
// The flag is constant for the whole page load (see convexClient.js), so the
// early-null branch never flips within a session.
export function useConvexRail(worldId) {
  const active = convexPlaneActive();
  const cxWorld = active ? convexWorldId(worldId) : '';
  useEffect(() => {
    if (!active || !cxWorld) return;
    if (store.status === 'idle' || store.worldId !== cxWorld) fetchRooms(cxWorld);
  }, [active, cxWorld]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return active ? snap : null;
}
