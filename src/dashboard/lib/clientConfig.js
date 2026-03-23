// clientConfig.js -- Multi-tenant client identity layer.
//
// Priority order for resolving client_id:
//   1. Supabase auth user metadata: user.user_metadata.world
//   2. URL param: ?client=acme
//   3. Default: 'aom' (us)
//
// NOTE: localStorage removed. No persistence until offline features are built.
// Everything reads from Supabase auth or URL params only.
//
// This is the FOUNDATION layer only. No Supabase schema changes required here.
// The client_id flows into API calls so each tenant's data is isolated.

const DEFAULT_CLIENT_ID = 'aom'

// sessionStorage key for admin world override.
// Takes priority over auth so admins can context-switch without re-login.
const WORLD_OVERRIDE_KEY = 'corner-world-override'

// In-memory cache: populated by setClientIdFromUser() after auth loads.
// Synchronous reads from getClientId() see this immediately.
let _authClientId = null

/**
 * setClientIdFromUser(user) -- call this after Supabase auth resolves.
 * Reads user.user_metadata.world and caches it for synchronous getClientId() calls.
 */
export function setClientIdFromUser(user) {
  const world = user?.user_metadata?.world
  if (world && world.trim()) {
    _authClientId = world.trim().toLowerCase()
  } else {
    _authClientId = null
  }
}

/**
 * getClientId() -- resolve the active client.
 * Safe to call on server (returns default) or client (reads auth cache, URL, localStorage).
 */
export function getClientId() {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_ID

  // 1. Admin world override (sessionStorage): persists across reload without re-login.
  //    Admins set this via the world switcher to context-switch into any client.
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY)
    if (override && override.trim()) return override.trim().toLowerCase()
  } catch {
    // ignore
  }

  // 2. Auth-derived client_id (set by setClientIdFromUser after login)
  if (_authClientId) return _authClientId

  // 3. URL param for preview / unauthenticated overrides
  try {
    const params = new URLSearchParams(window.location.search)
    const urlClient = params.get('client')
    if (urlClient && urlClient.trim()) return urlClient.trim().toLowerCase()
  } catch {
    // ignore
  }

  // 4. Default: AOM (our own instance)
  return DEFAULT_CLIENT_ID
}

/**
 * setWorldOverride(worldId) -- store or clear the admin world override.
 * Call with null/undefined to clear (return to own world).
 */
export function setWorldOverride(worldId) {
  if (!worldId) {
    try { sessionStorage.removeItem(WORLD_OVERRIDE_KEY) } catch { /* ignore */ }
  } else {
    try { sessionStorage.setItem(WORLD_OVERRIDE_KEY, worldId.trim().toLowerCase()) } catch { /* ignore */ }
  }
}

/**
 * getUserWorld() -- the user's own world (auth-derived), ignoring any override.
 * Use this to show "Return to My World" when an override is active.
 */
export function getUserWorld() {
  return _authClientId || DEFAULT_CLIENT_ID
}

/**
 * setClientId(id) -- no-op until offline features are built.
 * Previously persisted to localStorage; removed pending Supabase-only approach.
 */
export function setClientId(_id) {
  // No-op: localStorage removed. Client identity resolves from Supabase auth only.
}

/**
 * CLIENT_CONFIG -- branding and display metadata for the active client.
 * Extend this as the multi-tenant platform grows.
 * Bobby should NOT hardcode client names anywhere in components -- read from here.
 */
export const CLIENT_CONFIG = {
  // Active client id (resolved at module load time)
  // Use getClientId() at call-time for the freshest value.
  id: DEFAULT_CLIENT_ID,

  // Per-client display names. Grows as clients onboard.
  names: {
    aom: 'AOM',
  },

  /**
   * getDisplayName(clientId) -- human-readable client name.
   * Falls back to title-cased id if not in the map.
   */
  getDisplayName(clientId) {
    const id = clientId || getClientId()
    return this.names[id] || id.charAt(0).toUpperCase() + id.slice(1)
  },
}
