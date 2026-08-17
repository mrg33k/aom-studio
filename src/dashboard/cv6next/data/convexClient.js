// cv6next — the Convex data plane's front door (corner:convex-multi-agent).
//
// The dashboard can run its rooms rail + room threads against the Convex backend
// (the SAME deployment web + iOS use) instead of Supabase. Plain fetch against the
// public HTTP API — no SDK, no auth header — exactly the contract the native app
// speaks (ios-native/Corner/Views/ChatViewModel.swift, corner-convex/src/routes/Chat.tsx).
//
// THE FLAG (default flipped 2026-08-16, Patrik: /dashboard IS the Convex product):
// Convex is the DEFAULT plane. `?classic=1` or localStorage["cv6.dataplane"]="supabase"
// selects the old Supabase plane; `?convex=1` still forces on. Read ONCE per
// page load and cached: a data plane cannot flip mid-session (the caches and the
// per-room thread engines are plane-specific, and internal SPA navigation rewrites
// the query string — a live re-read would silently strand half the app on each plane).
//
// Quota discipline (Convex free plan bills on Database I/O): callers must never
// poll rooms:listRooms (fetch on load + after a send only) and must poll a thread
// only for the open room while the tab is visible. Enforced at the call sites in
// convexRooms.js / useRoomThread.js.

import { RENDER_ONLY_TENANT_ID } from '../../lib/tenantContext.jsx';

const CONVEX_URL = 'https://neat-pony-216.convex.cloud';

let planeCache = null;
export function convexPlaneActive() {
  if (planeCache !== null) return planeCache;
  let on = true;
  try {
    if (typeof window !== 'undefined') {
      const qs = new URLSearchParams(window.location.search || '');
      if (qs.get('classic') === '1') on = false;
      if (on && window.localStorage && window.localStorage.getItem('cv6.dataplane') === 'supabase') on = false;
      if (qs.get('convex') === '1') on = true;
    }
  } catch { on = true; }
  planeCache = on;
  return on;
}

// The world slug Convex queries key on. Normally the auth-derived tenant worldId
// ("aom" for Patrik) passes straight through. A local render-only build (no
// Supabase env) has only the 'local-render' placeholder — honor the same ?client=
// URL override the rest of the dashboard already uses (clientConfig.js) instead
// of querying a world that cannot exist.
export function convexWorldId(worldId) {
  if (worldId && worldId !== RENDER_ONLY_TENANT_ID) return worldId;
  try {
    if (typeof window !== 'undefined') {
      const urlClient = new URLSearchParams(window.location.search || '').get('client');
      if (urlClient && urlClient.trim()) return urlClient.trim().toLowerCase();
    }
  } catch { /* fall through to the placeholder */ }
  return worldId;
}

// One call shape for both endpoints. Convex answers 200 with
// {status:"success", value} or {status:"error", errorMessage} — surface BOTH
// failure shapes as thrown Errors; no silent catches here, callers decide.
async function convexCall(kind, path, args) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
    // Same 20s ceiling the Supabase send path uses: a black-holed connection
    // fails honestly instead of hanging at the browser default.
    ...(typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(20000) } : {}),
  });
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}

export function convexQuery(path, args) { return convexCall('query', path, args); }
export function convexMutation(path, args) { return convexCall('mutation', path, args); }
