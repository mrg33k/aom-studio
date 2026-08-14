// Auth helpers for Corner dashboard
// Wraps Supabase auth methods with graceful fallback when Supabase is not configured.

import { supabase } from './supabase.js'

/**
 * Get the currently authenticated Supabase user.
 * Returns null if not authenticated or if Supabase is not configured.
 */
export async function getCurrentUser() {
  if (!supabase) return null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user
    // TOP-20 #17: transient 404 after Google profile click can leave getUser null
    // even though a session exists. One refresh attempt before giving up.
    try {
      const { data: refreshed } = await supabase.auth.refreshSession().catch(() => ({ data: null }))
      if (refreshed?.user) return refreshed.user
      const { data: retry } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      return retry?.user || null
    } catch { return null }
  } catch {
    return null
  }
}

/**
 * Sign in with email + password.
 * Returns { user, error }.
 */
export async function signInWithPassword(email, password) {
  if (!supabase) return { user: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { user: data?.user || null, error }
}

/**
 * Sign up a new user with email + password.
 * Returns { user, error }.
 */
export async function signUp(email, password) {
  if (!supabase) return { user: null, error: new Error('Supabase not configured') }
  const { data, error } = await supabase.auth.signUp({ email, password })
  return { user: data?.user || null, error }
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 * callback(session) is called with the session or null.
 */
export function onAuthStateChange(callback) {
  if (!supabase) {
    callback(null)
    return () => {}
  }
  let lastUserId = null
  supabase.auth.getSession().then(({ data }) => {
    lastUserId = data?.session?.user?.id || null
  }).catch(() => {})
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const nextUserId = session?.user?.id || null
    const isAccountSwitch = lastUserId && nextUserId && lastUserId !== nextUserId
    // TOP-20 #15 + #17: re-check limit and refresh auth on account switch.
    // A Google account switch should immediately hydrate the new session and
    // clear any stale 429/404 state for the previous account.
    if (isAccountSwitch) {
      try { await supabase.auth.refreshSession().catch(() => {}) } catch {}
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('corner:account-switched', { detail: { prevUserId: lastUserId, nextUserId } }))
          window.dispatchEvent(new CustomEvent('corner:rate-limit-cleared', { detail: { reason: 'account-switched' } }))
        }
      } catch {}
    }
    lastUserId = nextUserId
    callback(session)
  })
  return () => subscription.unsubscribe()
}

/**
 * Check if the current user is authenticated.
 * If not, redirect to /login.
 * Returns the user if authenticated, null otherwise.
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user && typeof window !== 'undefined') {
    window.location.href = '/login'
  }
  return user
}

/**
 * Detect if the user logged in with a temporary/first-login password.
 * Supabase sets user_metadata.temp_password = true when an admin creates the account.
 * Returns true if user should be forced to change their password.
 */
export function isTempPassword(user) {
  return user?.user_metadata?.temp_password === true
}

/**
 * Update the user's password.
 * Returns { error }.
 */
export async function updatePassword(newPassword) {
  if (!supabase) return { error: new Error('Supabase not configured') }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  return { error }
}
