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
import { normalizePreview } from './previewText.js';

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

// ── Shaping: Convex rooms → the rail's lists ─────────────────────────────────
// Input rows: { _id, legacyRoomId?, title, subtitle?, kind, project?, specialist?,
//               createdAt, lastMessage: {text, createdAt, agentSlug} | null }.
export function shapeConvexRail(rooms, worldId) {
  const list = Array.isArray(rooms) ? rooms : [];
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
    const preview = normalizePreview(r.lastMessage?.text || '') || '';
    const name = r.title;
    const base = {
      key: `cx:${convexKey}`, id: '', kind: r.kind, name, ts, preview,
      unread: false, initials: initials(name), tint: tintFor(name),
      age: relTime(ts), status: (Date.now() - ts) < 3600000 ? 'live' : 'ready',
    };
    if (r.kind === 'mission') {
      // "aom:mission:corner:convex-multi-agent" → missionSlug "corner:convex-multi-agent"
      const missionSlug = legacyTail(r, worldId) || String(r.project ? `${r.project}:${r._id}` : r._id);
      const projectSlug = r.project || (missionSlug.includes(':') ? missionSlug.split(':')[0] : '');
      const sub = projectTitleBySlug[projectSlug] || 'Mission';
      recent.push({
        ...base, id: missionSlug, missionSlug, project: projectSlug, sub,
        roomObj: { id: missionSlug.split(':').pop(), name, initials: base.initials, isMission: true, missionSlug, projectSlug, status: 'ready', statusText: sub, convexKey },
      });
    } else if (r.kind === 'project') {
      const slug = legacyTail(r, worldId) || r.project || r._id;
      projects.push({
        id: slug, databaseId: '', slug, name, tint: base.tint, count: '',
        last_message_at: ts, last_message_text: preview,
      });
      recent.push({
        ...base, id: slug, project: slug, sub: 'Project chat',
        roomObj: { id: slug, name, initials: base.initials, isProject: true, status: 'ready', statusText: 'project chat', convexKey },
      });
    } else {
      const slug = legacyTail(r, worldId) || r.specialist || r._id;
      agents.push({ id: slug, name, status: 'idle', statusText: 'idle', initials: base.initials });
      recent.push({
        ...base, id: slug, agent: slug, sub: 'Direct chat',
        roomObj: { id: slug, name, initials: base.initials, status: 'ready', convexKey },
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
  if (store.status === 'idle') { store = { ...store, status: 'loading', worldId }; emit(); }
  convexQuery('rooms:listRooms', { worldId })
    .then((rooms) => {
      store = { status: 'ready', shaped: shapeConvexRail(rooms, worldId), worldId };
      emit();
    })
    .catch((err) => {
      // Honest failure: an empty rail with an error status — never stale fakes.
      console.error('[convex] rooms:listRooms failed:', err);
      store = { status: 'error', shaped: null, worldId };
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
