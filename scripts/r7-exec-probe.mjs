// r7:cross-world-execution probe harness.
//
// Stubs ONLY the JWT-to-user hop. Every authorization read hits the live DB.
// CAPTURES every insert / update / delete / dispatch — nothing is ever sent.
// No auth/profile/user table is ever queried: /auth/v1/* is answered entirely
// from the synthetic fixture map below, and an unknown uid answers 404 rather
// than reaching Supabase.
//
// Run:  node --env-file=../.env scripts/r7-exec-probe.mjs
// (from aom-studio/)

process.env.SUPER_ADMIN_USER_ID = '00000000-0000-4000-8000-0000000000ff';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;

const SB = process.env.SUPABASE_URL;

export const FIXTURES = {
  AOM_MEMBER_A:   { id: '00000000-0000-4000-8000-00000000a001', email: null, user_metadata: { world: 'aom' } },
  AOM_MEMBER_B:   { id: '00000000-0000-4000-8000-00000000a002', email: null, user_metadata: { world: 'aom' } },
  ARSENAL_MEMBER: { id: '00000000-0000-4000-8000-00000000b001', email: null, user_metadata: { world: 'arsenal' } },
  KARENS_MEMBER:  { id: '00000000-0000-4000-8000-00000000c001', email: null, user_metadata: { world: 'karens-world' } },
  WORLDLESS:      { id: '00000000-0000-4000-8000-00000000d001', email: null, user_metadata: {} },
  SUPER_ADMIN:    { id: '00000000-0000-4000-8000-0000000000ff', email: null, user_metadata: { world: 'aom' } },
};

export const captured = [];
let currentUser = null;

export function actAs(fixture) { currentUser = fixture; }
export function resetCapture() { captured.length = 0; }

const realFetch = globalThis.fetch;

globalThis.fetch = async function patched(input, init = {}) {
  const url = typeof input === 'string' ? input : String(input?.url || input);
  const method = (init.method || 'GET').toUpperCase();

  // ---- auth hop: answered from fixtures ONLY, never forwarded -------------
  if (url.includes('/auth/v1/')) {
    if (url.includes('/auth/v1/user')) {
      if (!currentUser) return new Response('{}', { status: 401 });
      return new Response(JSON.stringify(currentUser), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // /auth/v1/admin/users/<uid> — the participation-floor author lookup.
    const uid = decodeURIComponent(url.split('/auth/v1/admin/users/')[1] || '');
    const hit = Object.values(FIXTURES).find((f) => f.id === uid);
    if (hit) return new Response(JSON.stringify(hit), { status: 200, headers: { 'content-type': 'application/json' } });
    // Unknown uid = a real person. Answer 404 (a cacheable "no world"); we do
    // NOT look real humans up.
    return new Response('{}', { status: 404 });
  }

  // ---- every mutation is captured, never sent ----------------------------
  if (method !== 'GET' && method !== 'HEAD') {
    let body = init.body;
    try { body = JSON.parse(body); } catch { /* leave as-is */ }
    const table = (url.split('/rest/v1/')[1] || url).split('?')[0];
    captured.push({ method, table, url, body });
    // Shape a plausible PostgREST representation response so the handler
    // continues down its normal path.
    const rows = Array.isArray(body) ? body : [body || {}];
    const withIds = rows.map((r, i) => ({ id: (r && r.id) || `captured-${captured.length}-${i}`, ...(r || {}) }));
    return new Response(JSON.stringify(withIds), { status: 201, headers: { 'content-type': 'application/json' } });
  }

  // ---- reads go live ------------------------------------------------------
  return realFetch(input, init);
};

export function mkReq({ body = {}, query = {}, method = 'POST', headers = {} } = {}) {
  return {
    method,
    body,
    query,
    headers: { authorization: 'Bearer synthetic-jwt', 'content-type': 'application/json', ...headers },
  };
}

export function mkRes() {
  const out = { statusCode: null, payload: null, headers: {} };
  const res = {
    setHeader(k, v) { out.headers[k] = v; },
    status(c) { out.statusCode = c; return res; },
    json(p) { out.payload = p; return res; },
    end() { return res; },
    write() { return res; },
    flushHeaders() { return res; },
    _out: out,
  };
  return res;
}

export function taskWrites() {
  return captured.filter((c) => c.table === 'tasks');
}
