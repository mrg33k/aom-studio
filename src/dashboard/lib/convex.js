// The one Convex front door for the whole dashboard (corner:retire-supabase R2/R3).
//
// Convex (dev:neat-pony-216) is the only backend. This module owns:
//   - the browser session: the Convex Auth token pair, kept in localStorage,
//     refreshed before it expires, cleared on sign out;
//   - plain-fetch calls: convexQuery / convexMutation / convexAction against the
//     public HTTP API, sending the token as Authorization: Bearer when we have one;
//   - the live client: one ConvexReactClient (websocket) so surfaces can subscribe
//     to a query and re-render when the data changes, instead of polling;
//   - who am I: getViewer() (users:viewer), cached per token;
//   - small helpers every surface shares (world slug, state store rows).
//
// Fixture mode (VITE_USE_FIXTURES=1) swaps the network for the JSON snapshots in
// src/dashboard/__fixtures__/latest via fixtureClient.js. The dynamic import is
// dead-code-eliminated when the flag is off, so prod never ships the fixtures.

import { useEffect, useState } from 'react';
import { ConvexReactClient } from 'convex/react';
import { makeFunctionReference } from 'convex/server';

export const CONVEX_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CONVEX_URL)
  || 'https://neat-pony-216.convex.cloud';

// The placeholder tenant a page renders with when nobody is signed in (public
// demo routes, Playwright fixtures). Lives here so tenantContext can import it
// without a circular import.
export const RENDER_ONLY_TENANT_ID = 'local-render';

const USE_FIXTURES = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_USE_FIXTURES === '1';
let fixturePromise = null;
function fixtureModule() {
  if (!fixturePromise) fixturePromise = import('./fixtureClient.js');
  return fixturePromise;
}

// ---------------------------------------------------------------------------
// Session store
// ---------------------------------------------------------------------------

const SESSION_KEY = 'corner.convex.session';
// How close to expiry a token may get before we refresh it ahead of a call.
const REFRESH_AHEAD_MS = 60 * 1000;

let memSession; // undefined = not read from storage yet
const sessionListeners = new Set();

function readStored() {
  if (USE_FIXTURES) return { token: 'fixture-token', refreshToken: 'fixture-refresh', fixture: true };
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.token === 'string' && parsed.token ? parsed : null;
  } catch {
    return null;
  }
}

function notifySession() {
  for (const fn of sessionListeners) {
    try { fn(memSession); } catch { /* a listener must never break the store */ }
  }
}

/** The stored token pair, or null when nobody is signed in. */
export function getStoredSession() {
  if (memSession === undefined) memSession = readStored();
  return memSession;
}

/** True when a token pair is stored (the person signed in on this browser). */
export function hasSession() {
  return !!(getStoredSession() && getStoredSession().token);
}

export function setStoredSession(session) {
  memSession = session && session.token ? { ...session, savedAt: Date.now() } : null;
  viewerCache = null;
  try {
    if (typeof localStorage !== 'undefined' && !USE_FIXTURES) {
      if (memSession) localStorage.setItem(SESSION_KEY, JSON.stringify(memSession));
      else localStorage.removeItem(SESSION_KEY);
    }
  } catch { /* private mode */ }
  notifySession();
}

export function clearStoredSession() {
  if (!getStoredSession()) return;
  setStoredSession(null);
}

/** Subscribe to sign in / sign out / refresh. Returns an unsubscribe function. */
export function onSessionChange(fn) {
  sessionListeners.add(fn);
  return () => { sessionListeners.delete(fn); };
}

// Another tab signing in or out must be seen here too.
if (typeof window !== 'undefined' && !USE_FIXTURES) {
  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== SESSION_KEY) return;
      memSession = readStored();
      viewerCache = null;
      notifySession();
    });
  } catch { /* ignore */ }
}

function jwtExpiry(token) {
  try {
    const payload = String(token || '').split('.')[1];
    if (!payload) return 0;
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp === 'number' ? json.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

let refreshInFlight = null;

/**
 * Trade the refresh token for a new pair. Returns the new token, or null when the
 * refresh token is dead (the person is signed out). A network failure keeps the
 * old pair and returns the old token so a flaky connection never logs anyone out.
 */
export async function refreshSession() {
  const session = getStoredSession();
  if (!session || !session.refreshToken) return null;
  if (session.fixture) return session.token;
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    let res;
    try {
      res = await rawCall('action', 'auth:signIn', { refreshToken: session.refreshToken }, null);
    } catch {
      return session.token; // offline: keep what we have
    }
    if (!res.ok) {
      // A definite no from the server: the refresh token was revoked or expired.
      if (res.status >= 400 && res.status < 500) clearStoredSession();
      return getStoredSession()?.token || null;
    }
    if (res.data && res.data.status === 'success' && res.data.value && res.data.value.tokens) {
      const { token, refreshToken } = res.data.value.tokens;
      setStoredSession({ token, refreshToken });
      return token;
    }
    clearStoredSession();
    return null;
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

/** The token to send on the next call, refreshed first if it is about to expire. */
export async function ensureFreshToken({ force = false } = {}) {
  const session = getStoredSession();
  if (!session || !session.token) return null;
  if (session.fixture) return session.token;
  const exp = jwtExpiry(session.token);
  if (force || (exp && exp - Date.now() < REFRESH_AHEAD_MS)) return refreshSession();
  return session.token;
}

/** Synchronous read of the stored token (no refresh). For headers built in a hurry. */
export function getSessionToken() {
  return getStoredSession()?.token || null;
}

// ---------------------------------------------------------------------------
// Plain HTTP calls
// ---------------------------------------------------------------------------

function abortSignal(ms) {
  return (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? { signal: AbortSignal.timeout(ms) } : {};
}

// One request, no retries. Returns { ok, status, data } and only throws on a
// network failure.
async function rawCall(kind, path, args, token, timeoutMs = 20000) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
    ...abortSignal(timeoutMs),
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

function looksUnauthenticated(res) {
  if (res.status === 401) return true;
  const msg = String((res.data && (res.data.errorMessage || res.data.message)) || '');
  return /unauthenticated|not signed in|invalid.*token|token.*expired/i.test(msg);
}

// One call shape for query, mutation and action. Convex answers 200 with
// {status:"success", value} or {status:"error", errorMessage}. Both failure
// shapes become thrown Errors; callers decide what a failure means.
async function convexCall(kind, path, args, opts = {}) {
  if (USE_FIXTURES) {
    const fx = await fixtureModule();
    return fx.fixtureConvexCall(kind, path, args || {});
  }
  const wantAuth = opts.auth !== false;
  let token = wantAuth ? await ensureFreshToken() : null;
  let res = await rawCall(kind, path, args, token, opts.timeoutMs);
  if (wantAuth && token && looksUnauthenticated(res)) {
    // The token went stale between the check and the call. One refresh, one retry.
    const fresh = await ensureFreshToken({ force: true });
    if (fresh && fresh !== token) {
      token = fresh;
      res = await rawCall(kind, path, args, token, opts.timeoutMs);
    }
  }
  if (!res.ok) {
    const detail = res.data && (res.data.errorMessage || res.data.message);
    throw new Error(`convex ${kind} ${path}: HTTP ${res.status}${detail ? ` (${detail})` : ''}`);
  }
  if (!res.data || res.data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(res.data && (res.data.errorMessage || res.data.status)) || 'malformed response'}`);
  }
  return res.data.value;
}

export function convexQuery(path, args, opts) { return convexCall('query', path, args, opts); }
export function convexMutation(path, args, opts) { return convexCall('mutation', path, args, opts); }
export function convexAction(path, args, opts) { return convexCall('action', path, args, opts); }

// Kept for callers written while the dashboard could still pick a data plane.
// Convex is the only plane now, so this is always true.
export function convexPlaneActive() { return true; }

// The world slug Convex queries key on. The auth-derived tenant worldId ("aom")
// passes straight through. A render-only page has only the placeholder; honor the
// same ?client= URL override the rest of the dashboard uses (clientConfig.js).
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

// ---------------------------------------------------------------------------
// Who am I
// ---------------------------------------------------------------------------

let viewerCache = null; // { token, promise }

/**
 * The signed-in person (users:viewer): { userId, email, name, color, initials,
 * avatarUrl, worldId, worldSlug, worldName, role, isAdmin, mustChangePassword,
 * preferences, onboarded }. Null when nobody is signed in. Cached per token.
 */
export function getViewer({ force = false } = {}) {
  const session = getStoredSession();
  if (!session || !session.token) return Promise.resolve(null);
  if (!force && viewerCache && viewerCache.token === session.token) return viewerCache.promise;
  const token = session.token;
  const promise = (async () => {
    try {
      const v = await convexQuery('users:viewer', {});
      return v || null;
    } catch (err) {
      // Do not cache a network failure as "signed out".
      if (viewerCache && viewerCache.token === token) viewerCache = null;
      throw err;
    }
  })();
  viewerCache = { token, promise };
  return promise;
}

export function invalidateViewer() { viewerCache = null; }

// World slug -> Convex document id, for the few mutations that take v.id("worlds").
const worldIdCache = new Map();
export async function convexWorldDocId(worldSlugOrId) {
  const key = String(worldSlugOrId || '').trim().toLowerCase();
  if (!key || key === RENDER_ONLY_TENANT_ID) return null;
  if (worldIdCache.has(key)) return worldIdCache.get(key);
  let id = null;
  try {
    const viewer = await getViewer().catch(() => null);
    if (viewer && viewer.worldSlug === key && viewer.worldId) id = String(viewer.worldId);
  } catch { /* fall through */ }
  if (!id) {
    try {
      const world = await convexQuery('worlds:getBySlug', { slug: key });
      if (world && world._id) id = String(world._id);
    } catch { id = null; }
  }
  if (id) worldIdCache.set(key, id);
  return id;
}

// ---------------------------------------------------------------------------
// The live client (websocket subscriptions)
// ---------------------------------------------------------------------------

let reactClient = null;

function installAuth(client) {
  client.setAuth(async ({ forceRefreshToken } = {}) => {
    const token = await ensureFreshToken({ force: !!forceRefreshToken });
    return token || null;
  });
}

/** The one ConvexReactClient for this page. Created on first use, browser only. */
export function getConvexReactClient() {
  if (reactClient) return reactClient;
  reactClient = new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false });
  if (hasSession()) installAuth(reactClient);
  onSessionChange((session) => {
    if (!reactClient) return;
    if (session && session.token) installAuth(reactClient);
    else reactClient.clearAuth();
  });
  return reactClient;
}

const refCache = new Map();
export function queryRef(path) {
  if (!refCache.has(path)) refCache.set(path, makeFunctionReference(path));
  return refCache.get(path);
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

/**
 * Subscribe to a query outside React (engines, stores). `onValue(value)` fires with
 * the current result and again on every change; `onError(err)` when the query
 * throws. Returns an unsubscribe function. Never polls: the websocket pushes.
 */
export function subscribeConvexQuery(path, args, onValue, onError) {
  if (USE_FIXTURES) {
    let alive = true;
    fixtureModule()
      .then((fx) => fx.fixtureConvexCall('query', path, args || {}))
      .then((v) => { if (alive) onValue(v); })
      .catch((e) => { if (alive && onError) onError(e); });
    return () => { alive = false; };
  }
  const client = getConvexReactClient();
  const watch = client.watchQuery(queryRef(path), args || {});
  const push = () => {
    let value;
    try { value = watch.localQueryResult(); } catch (err) { if (onError) onError(err); return; }
    if (value !== undefined) onValue(value);
  };
  push();
  return watch.onUpdate(push);
}

/**
 * React hook: the live result of a query. `{ value, error, loading }`; value is
 * undefined until the first result lands. Pass `enabled:false` (or null args) to
 * hold the subscription off. Works without a ConvexProvider because it talks to
 * the page's one client directly.
 */
export function useConvexLive(path, args, opts = {}) {
  const enabled = opts.enabled !== false && args != null && !!path;
  const key = enabled ? `${path}|${stableStringify(args)}` : '';
  const [state, setState] = useState({ key: '', value: undefined, error: null });
  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    const unsub = subscribeConvexQuery(
      path,
      args,
      (value) => { if (alive) setState({ key, value, error: null }); },
      (error) => { if (alive) setState({ key, value: undefined, error }); },
    );
    return () => { alive = false; unsub(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!key) return { value: undefined, error: null, loading: false };
  if (state.key !== key) return { value: undefined, error: null, loading: true };
  return { value: state.value, error: state.error, loading: state.value === undefined && !state.error };
}

// ---------------------------------------------------------------------------
// State store (state.ts): the JSON documents that used to be Supabase-backed
// files behind /api/dashboard/* (room goals, room goal steps, trackers).
// Rows are keyed by kind + scopeId, scoped to a world.
// ---------------------------------------------------------------------------

export async function stateRows(kind, worldSlug) {
  const rows = await convexQuery('state:get', { kind, ...(worldSlug ? { worldSlug } : {}) });
  return Array.isArray(rows) ? rows : [];
}

export async function stateRow(kind, scopeId, worldSlug) {
  const row = await convexQuery('state:get', { kind, scopeId: String(scopeId ?? ''), ...(worldSlug ? { worldSlug } : {}) });
  return row || null;
}

export async function statePut(kind, scopeId, value, worldSlug, updatedBy) {
  return convexMutation('state:put', {
    kind,
    scopeId: String(scopeId ?? ''),
    ...(worldSlug ? { worldSlug } : {}),
    value,
    ...(updatedBy ? { updatedBy } : {}),
  });
}

/** Merge a patch into one stored object (read, spread, write). */
export async function statePatch(kind, scopeId, patch, worldSlug, updatedBy) {
  const row = await stateRow(kind, scopeId, worldSlug);
  const current = row && row.value && typeof row.value === 'object' && !Array.isArray(row.value) ? row.value : {};
  const next = { ...current, ...patch };
  await statePut(kind, scopeId, next, worldSlug, updatedBy);
  return next;
}
