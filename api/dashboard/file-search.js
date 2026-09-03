// GET /api/dashboard/file-search?world=<client_id>&q=<query>
//
// R68 (session 21): surfaces MD files across every project in the home
// search bar. Reads scaffold_file events (R55 auto-surfaces MD writes into the
// ledger) and matches the query against filename + content (case-insensitive).
// Cross-project hits return with a project label so the home dashboard can
// render "#ambition-mechanical" or similar.
//
// Response shape:
//   {
//     q: <normalized query>,
//     hits: [{
//       id:        <event id>
//       project:   <slug>          // 'ambition-mechanical', 'corner', ...
//       parent:    <slug> | null   // for nested missions: 'ambition-mechanical'
//       filename:  <basename>      // 'VISION.md', 'research/R12.md'
//       preview:   <string>        // ~220 chars around the first match
//       updated_at: <iso>
//     }]
//   }
//
// Limit 15 hits. Does not paginate; this is a search surface, not an index.
//
// corner:retire-supabase (2026-09-03): events:find on Convex, newest first,
// text match done here. The ledger is append-only, so the newest row per
// project + filename is the one that counts.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud';

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  });
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`);
  const data = await r.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token);

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status; }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null;
  return null;
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req);
  if (!token) throw new AuthError('sign-in required', 401);
  let who = null;
  try { who = await convexQuery('users:verifyToken', {}, token); } catch { who = null; }
  if (!who || !who.userId) throw new AuthError('invalid session', 401);
  const world = who.world ? String(who.world).toLowerCase() : null;
  let superAdmin = false;
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)); } catch { superAdmin = false; }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token };
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase();
  if (!t) throw new AuthError('tenant required', 400);
  const who = await requireCaller(req);
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true };
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length);
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null;
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false };
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null);
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' };
    if (who.world === t) return { ok: true, tenant: t, ...who };
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403);
}

const SLUG_RE = /^[a-z0-9][a-z0-9-_:]{0,64}$/i;
const MAX_HITS = 15;
const PREVIEW_RADIUS = 110; // chars before + after the first match
const SCAN_LIMIT = 1500; // newest scaffold rows scanned per search

function parseAgent(agent) {
  // Agent key can be a plain project slug ('corner') or parent:child ('aom:aom-lut').
  if (!agent) return { project: '', parent: null };
  if (agent.includes(':')) {
    const [parent, child] = agent.split(':', 2);
    return { project: child, parent };
  }
  return { project: agent, parent: null };
}

function buildPreview(content, qLower) {
  if (!content) return '';
  const lc = content.toLowerCase();
  const idx = lc.indexOf(qLower);
  if (idx < 0) return content.slice(0, PREVIEW_RADIUS * 2);
  const start = Math.max(0, idx - PREVIEW_RADIUS);
  const end = Math.min(content.length, idx + qLower.length + PREVIEW_RADIUS);
  let slice = content.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) slice = '...' + slice;
  if (end < content.length) slice = slice + '...';
  return slice;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const world = (req.query.world || '').toString();
  const qRaw = (req.query.q || '').toString().trim();

  if (!SLUG_RE.test(world)) return res.status(400).json({ error: 'bad_world' });

  let verified;
  try {
    verified = await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }
  const tenant = verified.tenant;

  if (qRaw.length < 2 || qRaw.length > 80) {
    return res.status(200).json({ q: qRaw, hits: [] });
  }

  try {
    const rows = await convexQuery('events:find', {
      event_type: 'scaffold_file',
      order: 'desc',
      limit: SCAN_LIMIT,
    }, verified.token);

    const qLower = qRaw.toLowerCase();
    const hits = [];
    const seen = new Set();
    for (const row of (Array.isArray(rows) ? rows : [])) {
      if (hits.length >= MAX_HITS) break;
      const filename = row?.payload?.filename || '';
      const content = row?.payload?.content || '';
      const { project, parent } = parseAgent(row.agent);
      if (!filename || !project) continue;
      // Newest row per project + filename wins; older versions are skipped.
      const key = `${row.agent}::${filename}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Tenant scope: writers tag payload.tenant_id. Cross-tenant search is
      // blocked here.
      const rowTenant = row?.payload?.tenant_id || '';
      if (rowTenant !== tenant) continue;
      const haystack = `${filename} ${content}`.toLowerCase();
      if (!haystack.includes(qLower)) continue;
      hits.push({
        id: row.id,
        project,
        parent,
        filename,
        preview: buildPreview(content, qLower),
        updated_at: row?.payload?.updated_at || row.timestamp || null,
      });
    }

    return res.status(200).json({ q: qRaw, hits });
  } catch (err) {
    return res.status(500).json({ error: 'internal', detail: String(err).slice(0, 200) });
  }
}
