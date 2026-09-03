// Auth helpers for the Corner dashboard (corner:retire-supabase R3).
//
// Sign-in is Convex Auth with the Password provider on dev:neat-pony-216:
//   sign in      action auth:signIn {provider:"password", params:{email,password,flow:"signIn"}}
//   sign up      action auth:signIn {provider:"password", params:{email,password,name,flow:"signUp"}}
//   refresh      action auth:signIn {refreshToken}
//   sign out     action auth:signOut {}
//   who am I     query  users:viewer {}   (Bearer token)
//   new password action auth:changePassword {currentPassword?, newPassword}
//
// The token pair lives in localStorage (see ./convex.js). The exported names are
// the same ones the pages used before, so Login / ChangePassword / AcceptInvite /
// the AuthGuard keep working unchanged.

import {
  convexAction,
  convexMutation,
  getViewer,
  getStoredSession,
  setStoredSession,
  clearStoredSession,
  hasSession,
  onSessionChange,
  refreshSession as refreshTokens,
  invalidateViewer,
} from './convex.js';

/**
 * The shape the pages read. `user_metadata` mirrors what the old auth put
 * there so `user.user_metadata.world` / `.temp_password` keep meaning the same.
 */
export function toLegacyUser(viewer) {
  if (!viewer) return null;
  return {
    ...viewer,
    id: String(viewer.userId || ''),
    email: viewer.email || '',
    user_metadata: {
      full_name: viewer.name || '',
      name: viewer.name || '',
      world: viewer.worldSlug || '',
      onboarded: !!viewer.onboarded,
      has_completed_onboarding: !!viewer.onboarded,
      temp_password: !!viewer.mustChangePassword,
      avatar_url: viewer.avatarUrl || null,
      avatar_initials: viewer.initials || '',
      avatar_color: viewer.color || '',
    },
    app_metadata: {},
  };
}

/**
 * The current session: { user, access_token, refresh_token }, or null when
 * nobody is signed in. `degraded: true` means the token is stored but the
 * identity read failed (offline); the caller decides whether to wait or not.
 */
export async function getSession() {
  const stored = getStoredSession();
  if (!stored || !stored.token) return null;
  try {
    const viewer = await getViewer();
    if (!viewer) {
      // A token with no user behind it is a dead session.
      clearStoredSession();
      return null;
    }
    return { user: toLegacyUser(viewer), access_token: stored.token, refresh_token: stored.refreshToken || null };
  } catch {
    return { user: null, access_token: stored.token, refresh_token: stored.refreshToken || null, degraded: true };
  }
}

/**
 * Get the currently signed-in person. Returns null when signed out.
 */
export async function getCurrentUser() {
  if (!hasSession()) return null;
  try {
    const viewer = await getViewer();
    if (viewer) return toLegacyUser(viewer);
    // One refresh before giving up: the token may just be stale.
    const token = await refreshTokens();
    if (!token) return null;
    const retry = await getViewer({ force: true }).catch(() => null);
    return toLegacyUser(retry);
  } catch {
    return null;
  }
}

function errorFrom(err, fallback) {
  const raw = String((err && err.message) || fallback || 'Sign-in failed');
  // Convex wraps the thrown message in "convex action auth:signIn: ..."; keep the tail.
  const tail = raw.includes(': ') ? raw.slice(raw.lastIndexOf(': ') + 2) : raw;
  const friendly = /InvalidSecret|InvalidAccountId|Invalid password|Could not verify|Uncaught Error/i.test(tail)
    ? 'Invalid email or password.'
    : tail;
  return new Error(friendly);
}

async function acceptTokens(value) {
  const tokens = value && value.tokens;
  if (!tokens || !tokens.token) throw new Error('Sign-in did not return a session');
  setStoredSession({ token: tokens.token, refreshToken: tokens.refreshToken });
  const viewer = await getViewer({ force: true }).catch(() => null);
  return toLegacyUser(viewer);
}

/**
 * Sign in with email + password. Returns { user, error }.
 */
export async function signInWithPassword(email, password) {
  const address = String(email || '').trim().toLowerCase();
  if (!address || !password) return { user: null, error: new Error('Email and password are required') };
  try {
    const value = await convexAction('auth:signIn', {
      provider: 'password',
      params: { email: address, password, flow: 'signIn' },
    }, { auth: false });
    const user = await acceptTokens(value);
    return { user, error: null };
  } catch (err) {
    return { user: null, error: errorFrom(err, 'Invalid email or password.') };
  }
}

// Old name, same call.
export const signIn = signInWithPassword;

/**
 * Sign up a new person with email + password. Returns { user, error }.
 */
export async function signUp(email, password, name) {
  const address = String(email || '').trim().toLowerCase();
  if (!address || !password) return { user: null, error: new Error('Email and password are required') };
  try {
    const value = await convexAction('auth:signIn', {
      provider: 'password',
      params: { email: address, password, flow: 'signUp', ...(name ? { name: String(name) } : {}) },
    }, { auth: false });
    const user = await acceptTokens(value);
    return { user, error: null };
  } catch (err) {
    return { user: null, error: errorFrom(err, 'Sign-up failed.') };
  }
}

/**
 * Sign out the current person. The server call is best effort; the local
 * session is always cleared.
 */
export async function signOut() {
  if (!hasSession()) return;
  try { await convexAction('auth:signOut', {}); } catch { /* the token may already be dead */ }
  clearStoredSession();
}

/**
 * Refresh the token pair. Returns { data: { session, user }, error } like the
 * old helper did.
 */
export async function refreshSession() {
  try {
    const token = await refreshTokens();
    if (!token) return { data: { session: null, user: null }, error: new Error('Signed out') };
    invalidateViewer();
    const session = await getSession();
    return { data: { session, user: session?.user || null }, error: null };
  } catch (err) {
    return { data: { session: null, user: null }, error: err };
  }
}

/**
 * Subscribe to auth state changes. Fires once with the current session, then
 * on every sign in, sign out and token refresh. Returns an unsubscribe function.
 */
export function onAuthStateChange(callback) {
  let lastUserId = null;
  let alive = true;
  const emit = async () => {
    const session = await getSession().catch(() => null);
    if (!alive) return;
    const nextUserId = session?.user?.id || null;
    const isAccountSwitch = lastUserId && nextUserId && lastUserId !== nextUserId;
    if (isAccountSwitch && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('corner:account-switched', { detail: { prevUserId: lastUserId, nextUserId } }));
        window.dispatchEvent(new CustomEvent('corner:rate-limit-cleared', { detail: { reason: 'account-switched' } }));
      } catch { /* ignore */ }
    }
    if (nextUserId) lastUserId = nextUserId;
    callback(session);
  };
  emit();
  const off = onSessionChange(() => { emit(); });
  return () => { alive = false; off(); };
}

/**
 * Check if the current person is signed in; if not, go to /login.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user && typeof window !== 'undefined') {
    window.location.href = '/login';
  }
  return user;
}

/**
 * True when the account still carries the temporary password the seed script
 * set (users.mustChangePassword). The person must pick a new one first.
 */
export function isTempPassword(user) {
  return user?.mustChangePassword === true || user?.user_metadata?.temp_password === true;
}

/**
 * Set a new password for the signed-in person. The current password is only
 * needed when the account is not flagged mustChangePassword. Returns { error }.
 */
export async function updatePassword(newPassword, currentPassword) {
  if (!hasSession()) return { error: new Error('Not signed in') };
  try {
    await convexAction('auth:changePassword', {
      newPassword: String(newPassword || ''),
      ...(currentPassword ? { currentPassword: String(currentPassword) } : {}),
    });
    invalidateViewer();
    return { error: null };
  } catch (err) {
    return { error: errorFrom(err, 'Failed to update password.') };
  }
}

/**
 * Merge a patch into the person's preferences (onboarded, workspaceName ...).
 * Replaces the old auth.updateUser({ data }) writes.
 */
export async function updateUserPreferences(patch) {
  if (!hasSession()) return { error: new Error('Not signed in') };
  try {
    const viewer = await getViewer().catch(() => null);
    await convexMutation('users:setPrefs', { ...(viewer?.userId ? { userId: String(viewer.userId) } : {}), patch: patch || {} });
    invalidateViewer();
    return { error: null };
  } catch (err) {
    return { error: err };
  }
}
