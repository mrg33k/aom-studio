// clientConfig.js -- Multi-tenant client identity layer.
//
// Priority order for resolving the active world (client_id):
//   1. Admin world override (sessionStorage, one tab, cleared on load)
//   2. The signed-in person's home world: users:viewer worldSlug (Convex memberships)
//   3. URL param: ?client=acme
//   4. No fallback: unauthenticated callers must wait for auth or pass a tenant.
//
// NOTE: localStorage removed. No persistence until offline features are built.
// The client_id flows into every read so each world's data stays isolated.

const DEFAULT_CLIENT_ID = null;

// Super-admin accounts: full access to every world. Convex ids are per
// deployment, so admins are named by email (the same list the backend uses for
// the shared aom world).
export const SUPER_ADMIN_EMAILS = new Set([
  'patrikmatheson@gmail.com',
  'hello@aom-inhouse.com',
]);
// Legacy export: the old auth user id. Nothing on Convex carries it; kept only
// so old importers still resolve. Use isSuperAdmin(viewer) instead.
export const SUPER_ADMIN_USER_ID = '833f6828-1dae-409c-a24b-1438f46544d0';

// sessionStorage key for admin world override.
// Takes priority over auth so admins can context-switch without re-login.
// SESSION-SCOPED ONLY (corner:tenant-isolation R1): the override lives in
// sessionStorage, so it is confined to one tab and evaporates when the tab
// closes. It is ALSO cleared on every fresh page load (see the purge at the
// bottom of this module) so the dashboard always BOOTS into the user's own
// world; a cross-world view only happens after an explicit switcher click.
const WORLD_OVERRIDE_KEY = 'corner-world-override';

// LEGACY localStorage key, no longer read or written; purged on module load.
const WORLD_OVERRIDE_LS_KEY = 'corner-world-override-persist';

// Notify listeners (e.g. the "Viewing <world>" banner) that the override changed.
function notifyOverrideChange() {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent('corner:world-override')) } catch { /* ignore */ }
}

// In-memory cache: populated by setClientIdFromUser() after auth loads.
// Synchronous reads from getClientId() see this immediately.
let _authClientId = null;
let _authEmail = null;
let _authIsAdmin = false;

/**
 * setClientIdFromUser(user) -- call this after the identity resolves.
 * Accepts the users:viewer shape ({ worldSlug, email, isAdmin }) and the older
 * { user_metadata: { world } } shape so every caller keeps working.
 */
export function setClientIdFromUser(user) {
  const world = user?.worldSlug || user?.world || user?.user_metadata?.world;
  _authClientId = world && String(world).trim() ? String(world).trim().toLowerCase() : null;
  _authEmail = user?.email ? String(user.email).trim().toLowerCase() : null;
  _authIsAdmin = !!user?.isAdmin;
}

/**
 * getClientId() -- resolve the active client.
 * Returns null until the identity has resolved. Callers must guard against null
 * and not render data until then (never default to a world).
 */
export function getClientId() {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_ID;

  // 1. Admin world override (sessionStorage ONLY: one tab, cleared on load).
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY);
    if (override && override.trim()) return override.trim().toLowerCase();
  } catch {
    // ignore
  }

  // 2. Auth-derived client_id (set by setClientIdFromUser after login)
  if (_authClientId) return _authClientId;

  // 3. URL param for preview / unauthenticated overrides
  try {
    const params = new URLSearchParams(window.location.search);
    const urlClient = params.get('client');
    if (urlClient && urlClient.trim()) return urlClient.trim().toLowerCase();
  } catch {
    // ignore
  }

  // 4. Nothing resolved yet. Callers must check for null and wait.
  return null;
}

/**
 * setWorldOverride(worldId) -- store or clear the admin world override.
 * Call with null/undefined to clear (return to own world).
 * SESSION-SCOPED: writes sessionStorage only (never localStorage).
 */
export function setWorldOverride(worldId) {
  if (!worldId) {
    clearWorldOverride();
    return;
  }
  const val = worldId.trim().toLowerCase();
  try { sessionStorage.setItem(WORLD_OVERRIDE_KEY, val) } catch { /* ignore */ }
  try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  notifyOverrideChange();
}

/**
 * clearWorldOverride() -- drop any active override so the dashboard returns to
 * the user's own world. Called by the switcher's "return to my world", on
 * sign-out, and once on every fresh page load.
 */
export function clearWorldOverride() {
  try { sessionStorage.removeItem(WORLD_OVERRIDE_KEY) } catch { /* ignore */ }
  try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  notifyOverrideChange();
}

/**
 * getUserWorld() -- the user's own world (auth-derived), ignoring any override.
 * Use this to show "Return to My World" when an override is active.
 */
export function getUserWorld() {
  return _authClientId || null;
}

/**
 * isAdminOverride() -- true if a world override is currently active
 * (the user is viewing a different world than their own).
 */
export function isAdminOverride() {
  if (typeof window === 'undefined') return false;
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY);
    if (!override || !override.trim()) return false;
    const myWorld = getUserWorld();
    return override.trim().toLowerCase() !== myWorld;
  } catch {
    return false;
  }
}

/**
 * activeWorldOverride() -- the world currently being viewed via an override,
 * or null. Used by the "Viewing <world>" banner.
 */
export function activeWorldOverride() {
  if (typeof window === 'undefined') return null;
  try {
    const override = sessionStorage.getItem(WORLD_OVERRIDE_KEY);
    const val = override && override.trim() ? override.trim().toLowerCase() : null;
    if (!val) return null;
    return val === getUserWorld() ? null : val;
  } catch {
    return null;
  }
}

/**
 * isSuperAdmin(userOrId) -- true for the AOM owners. Pass the viewer object
 * (preferred), an email, or the legacy user id.
 */
export function isSuperAdmin(userOrId) {
  if (!userOrId) return false;
  if (typeof userOrId === 'object') {
    const email = String(userOrId.email || '').trim().toLowerCase();
    if (email && SUPER_ADMIN_EMAILS.has(email)) return true;
    return !!userOrId.isAdmin && String(userOrId.worldSlug || '') === 'aom';
  }
  const s = String(userOrId).trim().toLowerCase();
  if (SUPER_ADMIN_EMAILS.has(s)) return true;
  if (s === SUPER_ADMIN_USER_ID) return true;
  // Only an id was handed in: answer for the signed-in session when it is an
  // AOM owner (its own Convex id is what callers usually pass here).
  return _authIsAdmin && !!_authEmail && SUPER_ADMIN_EMAILS.has(_authEmail);
}

/**
 * CLIENT_CONFIG -- branding and display metadata for the active client.
 * Read from here; never hardcode client names in components.
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
    const id = clientId || getClientId();
    if (!id) return '';
    return this.names[id] || id.charAt(0).toUpperCase() + id.slice(1);
  },
};

// ---------------------------------------------------------------------------
// BOOT PURGE (corner:tenant-isolation R1). Runs once when this module loads,
// i.e. on every fresh page load / new tab: delete the legacy persistent override
// and clear any lingering session override so the app always BOOTS into the
// user's own world.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  try { localStorage.removeItem(WORLD_OVERRIDE_LS_KEY) } catch { /* ignore */ }
  try { sessionStorage.removeItem(WORLD_OVERRIDE_KEY) } catch { /* ignore */ }
}
