// Auth helpers for Corner dashboard
// Wraps Supabase auth methods with graceful fallback when Supabase is not configured.

import { supabase } from './supabase.js'

/**
 * Get the currently authenticated Supabase user.
 * Returns null if not authenticated or if Supabase is not configured.
 */
export async function getCurrentUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
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
 * Sign in or create an account with a trusted identity provider. Account auth
 * is deliberately separate from connecting Gmail/Outlook as searchable data.
 */
export async function signInWithProvider(provider, redirectTo = '/onboarding') {
  if (!supabase) return { error: new Error('Supabase not configured') }
  const target = typeof window !== 'undefined'
    ? `${window.location.origin}${redirectTo}`
    : redirectTo
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: target },
  })
  return { data, error }
}

/**
 * Sign up a new user with email + password.
 * Returns { user, error }.
 */
export async function signUp(email, password, redirectTo = '/onboarding') {
  if (!supabase) return { user: null, error: new Error('Supabase not configured') }
  const target = typeof window !== 'undefined'
    ? `${window.location.origin}${redirectTo}`
    : redirectTo
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: target },
  })
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
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
