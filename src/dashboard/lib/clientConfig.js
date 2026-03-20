// clientConfig.js -- Multi-tenant client identity layer.
//
// Priority order for resolving client_id:
//   1. URL param: ?client=acme
//   2. localStorage: corner_client_id
//   3. Default: 'aom' (us)
//
// This is the FOUNDATION layer only. No Supabase schema changes required here.
// The client_id flows into API calls so each tenant's data is isolated.

const DEFAULT_CLIENT_ID = 'aom'

/**
 * getClientId() -- resolve the active client.
 * Safe to call on server (returns default) or client (reads URL + localStorage).
 */
export function getClientId() {
  if (typeof window === 'undefined') return DEFAULT_CLIENT_ID

  // 1. URL param takes highest priority (useful for previewing a client's view)
  try {
    const params = new URLSearchParams(window.location.search)
    const urlClient = params.get('client')
    if (urlClient && urlClient.trim()) return urlClient.trim().toLowerCase()
  } catch {
    // ignore
  }

  // 2. localStorage persistence (set once on login/onboarding)
  try {
    const stored = localStorage.getItem('corner_client_id')
    if (stored && stored.trim()) return stored.trim().toLowerCase()
  } catch {
    // ignore (private browsing, etc.)
  }

  // 3. Default: AOM (our own instance)
  return DEFAULT_CLIENT_ID
}

/**
 * setClientId(id) -- persist client selection to localStorage.
 * Called during onboarding or admin switching.
 */
export function setClientId(id) {
  if (typeof window === 'undefined') return
  try {
    if (!id || id === DEFAULT_CLIENT_ID) {
      localStorage.removeItem('corner_client_id')
    } else {
      localStorage.setItem('corner_client_id', id.trim().toLowerCase())
    }
  } catch {
    // ignore
  }
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
