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
// SESSION-SCOPED ONLY (corner:tenant-isolation R1): the override lives in
// sessionStorage, so it is confined to one tab and evaporates when the tab
// closes. It is ALSO cleared on every fresh page load (see the purge at the
// bottom of this module) so the dashboard always BOOTS into the user's own
// world; a cross-world view only happens after an explicit switcher click.
const WORLD_OVERRIDE_KEY = 'corner-world-override'

// LEGACY localStorage key — REMOVED (corner:tenant-isolation R1). It persisted a
// world override forever (no expiry, survived new tabs, refreshes and re-logins),
// so a super-admin's transient "peek" into another world silently re-scoped the
// ENTIRE dashboard — needs-you included — to that world on every later load. We
// no longer read or write it, and we purge any stale value on module load.
const WORLD_OVERRIDE_LS_KEY = 'corner-world-override-persist'

// Notify listeners (e.g. the "Viewing <world>" banner) that the override changed.
function notifyOverrideChange() {
  if (typeof window === 'undefined') return
  try { window.dispatchEvent(new CustomEvent('corner:world-override')) } catch { /* ignore */ }
}

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

  // 1. Admin world override (sessionStorage ONLY — one tab, cleared on load).
  //    Admins set this via the world switcher to context-switch into any client.
  //    There is deliberately no localStorage fallback: a persisted override is
  //    exactly the cross-tenant leak this file was hardened against (R1).
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

  // 4. ISOLATION FIX 2026-05-24: Return null (not DEFAULT_CLIENT_ID).
  // Callers must check for null and not render/fetch until auth resolves.
  // Prevents cross-tenant data leak during initial load (Ben/Karen/Tim seeing AOM world).
  return null
}

/**
 * setWorldOverride(worldId) -- store or clear the admin world override.
 * Call with null/undefined to clear (return to own world).
 * SESSION-SCOPED: writes sessionStorage only (never localStorage). Also purges
 * any stale legacy localStorage key and notifies the override banner.
 */
export function setWorldOverride(worldId) {
  if (!worldId) {
    clearWorldOverride()
    return
  }
  const val = worldId.trim().toLowerCase()
  try { sessionStorage.setItem(WORLD_OVERRIDE_KEY, val) } catch { /* ignore */ }
  // Belt-and-suspenders: never leave a persistent copy behind.
  try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  notifyOverrideChange()
}

/**
 * clearWorldOverride() -- drop any active override (session + legacy localStorage)
 * so the dashboard returns to the user's own world. Called by the switcher's
 * "return to my world", on logout, and once on every fresh page load.
 */
export function clearWorldOverride() {
  try { sessionStorage.removeItem(WORLD_OVERRIDE_KEY) } catch { /* ignore */ }
  try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  notifyOverrideChange()
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
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY)
    if (!override || !override.trim()) return false
    const myWorld = getUserWorld()
    return override.trim().toLowerCase() !== myWorld
  } catch {
    return false
  }
}

/**
 * activeWorldOverride() -- the world currently being viewed via an override,
 * or null. Used by the "Viewing <world>" banner.
 */
export function activeWorldOverride() {
  if (typeof window === 'undefined') return null
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY)
    const val = override && override.trim() ? override.trim().toLowerCase() : null
    if (!val) return null
    return val === getUserWorld() ? null : val
  } catch {
    return null
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

// ---------------------------------------------------------------------------
// BOOT PURGE (corner:tenant-isolation R1). Runs once when this module loads,
// i.e. on every fresh page load / new tab. It (1) deletes the legacy persistent
// localStorage override that used to silently re-scope the whole dashboard, and
// (2) clears any lingering session override so the app always BOOTS into the
// user's own world. A cross-world view is then only ever the result of an
// explicit switcher click in the current session — never a stale carry-over.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  try { sessionStorage.removeItem(WORLD_OVERRIDE_KEY) } catch { /* ignore */ }
}
