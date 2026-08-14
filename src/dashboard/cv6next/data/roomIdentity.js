import { useCallback, useEffect, useMemo, useState } from 'react';
import { roomChecklistKey } from './roomKeys.js';

export const ROOM_IDENTITIES_PREFERENCE = 'cv6_room_identities_v1';
export const ROOM_IDENTITIES_EVENT = 'cv6:room-identities-changed';

const PALETTE = ['#2563EB', '#7C3AED', '#0F766E', '#B45309', '#BE185D', '#047857', '#C2410C', '#4F46E5'];
const cache = new Map();

async function authenticatedFetch(...args) {
  const { authFetch } = await import('../../lib/authFetch.js');
  return authFetch(...args);
}

function worldKey(worldId) {
  return String(worldId || 'aom').trim() || 'aom';
}

function localKey(worldId) {
  return `cv6.roomIdentities.${worldKey(worldId)}`;
}

function asMap(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return asMap(JSON.parse(value)); } catch { return {}; }
  }
  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function readLocal(worldId) {
  if (typeof localStorage === 'undefined') return {};
  try { return asMap(localStorage.getItem(localKey(worldId))); } catch { return {}; }
}

function writeLocal(worldId, identities) {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(localKey(worldId), JSON.stringify(identities)); } catch { /* session state still works */ }
}

function publish(worldId, identities) {
  const key = worldKey(worldId);
  cache.set(key, { loaded: true, data: identities });
  writeLocal(key, identities);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ROOM_IDENTITIES_EVENT, { detail: { worldId: key, identities } }));
  }
}

export function roomIdentityKey(room) {
  const explicit = roomChecklistKey(room);
  if (explicit) return explicit;
  const name = String(room?.name || room?.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return name ? `room:${name}` : '';
}

export function normalizeRoomInitials(value, fallback = '·') {
  const clean = String(value || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
  return clean || String(fallback || '·').slice(0, 2).toUpperCase();
}

export function fallbackRoomColor(room) {
  const seed = roomIdentityKey(room) || String(room?.name || 'room');
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

const PRESENCE_FRESH_MS = 10 * 60 * 1000; // 10 min — raw agent_status forever = stale-forever bug (PARITY #4)

export function isActiveRoomStatus(status, at) {
  // Single truth + freshness window — one derivation, one renderer kills two-dots everywhere.
  // Without this, any status='working' binds forever and renders 2-3x per room across surfaces.
  let s = status;
  let ts = at;
  // Overload: isActiveRoomStatus(room) where room = {status, status_set_at}
  if (s && typeof s === 'object' && !Array.isArray(s) && at === undefined) {
    ts = s.status_set_at || s.statusSetAt || s.updated_at || s.updatedAt || null;
    s = s.status;
  }
  const v = String(s || '').toLowerCase();
  if (!['active', 'online', 'live', 'working', 'running', 'building', 'executing'].includes(v)) return false;
  if (!ts) return false; // no timestamp → stale by construction (fix open leak)
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return false;
  const age = Date.now() - t;
  return age >= 0 && age < PRESENCE_FRESH_MS;
}

export function isRoomActive(room) {
  if (!room) return false;
  return isActiveRoomStatus(room.status, room.status_set_at || room.statusSetAt || room.updated_at || room.updatedAt);
}

export function resolveRoomIdentity(room, identities = {}) {
  const saved = asMap(identities)[roomIdentityKey(room)] || {};
  return {
    initials: normalizeRoomInitials(saved.initials, room?.initials || room?.name || '·'),
    color: /^#[0-9a-f]{6}$/i.test(String(saved.color || '')) ? saved.color : fallbackRoomColor(room),
    image: typeof saved.image === 'string' && saved.image.startsWith('data:image/') ? saved.image : '',
  };
}

async function loadRoomIdentities(worldId) {
  const key = worldKey(worldId);
  const existing = cache.get(key);
  if (existing?.loaded) return existing.data;
  if (existing?.promise) return existing.promise;
  const local = existing?.data || readLocal(key);
  cache.set(key, { loaded: false, data: local });
  const promise = authenticatedFetch(`/api/dashboard/preferences?key=${encodeURIComponent(ROOM_IDENTITIES_PREFERENCE)}&client=${encodeURIComponent(key)}`)
    .then(async (response) => {
      if (!response.ok) throw new Error('Room identity preferences unavailable');
      const payload = await response.json();
      const merged = { ...local, ...asMap(payload?.value) };
      publish(key, merged);
      return merged;
    })
    .catch(() => {
      publish(key, local);
      return local;
    });
  cache.set(key, { loaded: false, data: local, promise });
  return promise;
}

export async function saveRoomIdentity(worldId, room, patch) {
  const key = worldKey(worldId);
  const roomKey = roomIdentityKey(room);
  if (!roomKey) return { ok: false, synced: false };
  const current = cache.get(key)?.data || readLocal(key);
  const previous = resolveRoomIdentity(room, current);
  const nextIdentity = {
    initials: normalizeRoomInitials(patch?.initials, previous.initials),
    color: /^#[0-9a-f]{6}$/i.test(String(patch?.color || '')) ? patch.color : previous.color,
    image: typeof patch?.image === 'string' && patch.image.startsWith('data:image/') ? patch.image : '',
  };
  const next = { ...current, [roomKey]: nextIdentity };
  publish(key, next);
  try {
    const response = await authenticatedFetch('/api/dashboard/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: ROOM_IDENTITIES_PREFERENCE, client_id: key, value: next }),
    });
    if (!response.ok) throw new Error('Room identity save failed');
    return { ok: true, synced: true, identity: nextIdentity };
  } catch {
    return { ok: true, synced: false, identity: nextIdentity };
  }
}

export function useRoomIdentity(room, worldId) {
  const key = worldKey(worldId);
  const [identities, setIdentities] = useState(() => cache.get(key)?.data || readLocal(key));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    const onChange = (event) => {
      if (event.detail?.worldId === key) setIdentities(event.detail.identities || {});
    };
    window.addEventListener(ROOM_IDENTITIES_EVENT, onChange);
    loadRoomIdentities(key).then((next) => { if (alive) setIdentities(next); });
    return () => { alive = false; window.removeEventListener(ROOM_IDENTITIES_EVENT, onChange); };
  }, [key]);

  const identity = useMemo(() => resolveRoomIdentity(room, identities), [room, identities]);
  const save = useCallback(async (patch) => {
    setSaving(true);
    const result = await saveRoomIdentity(key, room, patch);
    setSaving(false);
    return result;
  }, [key, room]);

  return { identity, saving, save };
}
