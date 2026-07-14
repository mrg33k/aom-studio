// clientConfig.js -- Multi-tenant client identity layer.
//
// Priority order for resolving client_id:
//   1. Supabase auth user metadata: user.user_metadata.world
//   2. URL param: ?client=acme
//   3. No fallback: unauthenticated callers must wait for auth or pass a tenant.
//
// NOTE: localStorage removed. No persistence until offline features are built.
// Everything reads from Supabase auth or URL params only.
//
// This is the FOUNDATION layer only. No Supabase schema changes required here.
// The client_id flows into API calls so each tenant's data is isolated.

const DEFAULT_CLIENT_ID = null

// Super-admin user ID: Patrik. Has full access to all worlds.
export const SUPER_ADMIN_USER_ID = '833f6828-1dae-409c-a24b-1438f46544d0'

// sessionStorage key for admin world override.
// Takes priority over auth so admins can context-switch without re-login.
const WORLD_OVERRIDE_KEY = 'corner-world-override'

// localStorage key for world override persistence across page refreshes.
// sessionStorage would be cleared on new tab/window -- localStorage persists.
const WORLD_OVERRIDE_LS_KEY = 'corner-world-override-persist'

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
 * ISOLATION FIX 2026-05-24: Do NOT default to 'aom' when auth hasn't resolved yet.
 * Return null instead. Callers must guard against null and not render data until auth completes.
 */
export function getClientId() {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_ID

  // 1. Admin world override (sessionStorage first, then localStorage for cross-refresh persist).
  //    Admins set this via the world switcher to context-switch into any client.
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY)
    if (override && override.trim()) return override.trim().toLowerCase()
  } catch {
    // ignore
  }
  // 1b. localStorage fallback: persists across page refreshes and new tabs.
  //     Re-hydrate sessionStorage so subsequent reads are fast.
  try {
    const lsOverride = localStorage.getItem(WORLD_OVERRIDE_LS_KEY)
    if (lsOverride && lsOverride.trim()) {
      const val = lsOverride.trim().toLowerCase()
      try { sessionStorage.setItem(WORLD_OVERRIDE_KEY, val) } catch { /* ignore */ }
      return val
    }
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

  // 4. ISOLATION FIX 2026-05-24: Return null (not DEFAULT_CLIENT_ID).
  // Callers must check for null and not render/fetch until auth resolves.
  // Prevents cross-tenant data leak during initial load (Ben/Karen/Tim seeing AOM world).
  return null
}

/**
 * setWorldOverride(worldId) -- store or clear the admin world override.
 * Call with null/undefined to clear (return to own world).
 * Writes to both sessionStorage (current tab) and localStorage (persist across refresh).
 */
export function setWorldOverride(worldId) {
  if (!worldId) {
    try { sessionStorage.removeItem(WORLD_OVERRIDE_KEY) } catch { /* ignore */ }
    try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  } else {
    const val = worldId.trim().toLowerCase()
    try { sessionStorage.setItem(WORLD_OVERRIDE_KEY, val) } catch { /* ignore */ }
    try { localStorage.setItem(WORLD_OVERRIDE_LS_KEY, val) } catch { /* ignore */ }
  }
}

/**
 * getUserWorld() -- the user's own world (auth-derived), ignoring any override.
 * Use this to show "Return to My World" when an override is active.
 */
export function getUserWorld() {
  return _authClientId || null
}

/**
 * isAdminOverride() -- returns true if a world override is currently active
 * (i.e., the user is viewing a different world than their own).
 */
export function isAdminOverride() {
  if (typeof window === 'undefined') return false
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY) ||
      localStorage.getItem(WORLD_OVERRIDE_LS_KEY)
    if (!override || !override.trim()) return false
    const myWorld = getUserWorld()
    return override.trim().toLowerCase() !== myWorld
  } catch {
    return false
  }
}

/**
 * isSuperAdmin(userId) -- check if a given user ID is the super-admin.
 * Pass the Supabase user.id.
 */
export function isSuperAdmin(userId) {
  return userId === SUPER_ADMIN_USER_ID
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
  names: {},

  /**
   * getDisplayName(clientId) -- human-readable client name.
   * Falls back to title-cased id if not in the map.
   */
  getDisplayName(clientId) {
    const id = clientId || getClientId()
    if (!id) return ''
    return this.names[id] || id.charAt(0).toUpperCase() + id.slice(1)
  },
}
