// GET /api/dashboard/message-steps?client_id=aom&agent=elon[&project=corner][&limit=20]
//
// Returns recent message_step events for a surface.
//
// Response shape:
//   { steps: [{ id, agent, parent_message_id, step_index, text, status, timestamp, project, phase }] }
//
// corner:retire-supabase (2026-09-03): events:find on Convex, filtered by
// payload.client_id server-side.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`)
  const data = await r.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`)
  }
  return data.value
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token)

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null
  return null
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req)
  if (!token) throw new AuthError('sign-in required', 401)
  let who = null
  try { who = await convexQuery('users:verifyToken', {}, token) } catch { who = null }
  if (!who || !who.userId) throw new AuthError('invalid session', 401)
  const world = who.world ? String(who.world).toLowerCase() : null
  let superAdmin = false
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)) } catch { superAdmin = false }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token }
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase()
  if (!t) throw new AuthError('tenant required', 400)
  const who = await requireCaller(req)
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true }
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length)
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false }
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null)
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' }
    if (who.world === t) return { ok: true, tenant: t, ...who }
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403)
}

// Steps are auto-derived from the agent's raw tool calls, so they leak file paths and shell
// commands ("Running: ls -la /Users/...", "Reading v3-mobile-top.png"), a terminal log, not a
// conversation. This rewrites each step into a short, plain-language line a user understands and
// strips every path/command, so the live thread reads like work, not a console. ONE chokepoint:
// every surface reads steps through this endpoint, so this covers all agents and all history.
function humanizeStep(raw) {
  let t = String(raw || '').trim()
  if (!t) return t

  // Raw shell command ("Running: <cmd>"): never show the command or its paths; speak the intent.
  let m = t.match(/^Running:\s*(.+)$/i)
  if (m) {
    const verb = (m[1].trim().split(/\s+/)[0] || '').replace(/.*\//, '').toLowerCase()
    const byVerb = {
      ls: 'Looking through the files', find: 'Looking through the files', tree: 'Looking through the files',
      grep: 'Searching the project', rg: 'Searching the project', ag: 'Searching the project',
      cat: 'Reading the details', head: 'Reading the details', tail: 'Reading the details',
      less: 'Reading the details', sed: 'Reading the details', awk: 'Reading the details',
      git: 'Checking the latest changes', diff: 'Comparing the changes',
      npm: 'Running a quick build', npx: 'Running a quick build',
      yarn: 'Running a quick build', pnpm: 'Running a quick build', make: 'Running a quick build',
      node: 'Running a quick check', python3: 'Running a quick check', python: 'Running a quick check',
      pytest: 'Running the tests', jest: 'Running the tests', vitest: 'Running the tests', test: 'Running the tests',
      curl: 'Checking a live page', wget: 'Checking a live page', ping: 'Checking a connection',
      mkdir: 'Setting things up', cp: 'Organizing files', mv: 'Organizing files', rm: 'Tidying up',
      chmod: 'Setting things up', touch: 'Setting things up', ln: 'Setting things up',
      vercel: "Checking it's live", docker: "Checking it's live",
      launchctl: 'Checking a background service', ps: 'Checking what is running', kill: 'Restarting a service',
      open: 'Opening a preview', echo: 'Noting something down',
    }
    return byVerb[verb] || 'Working through the project'
  }

  // File op named by file ("Reading X.png", "Editing Y.jsx"): say the kind, never the filename.
  m = t.match(/^(Reading|Editing|Writing|Opening)\s+(.+)$/i)
  if (m) {
    const verb = m[1].toLowerCase()
    const name = m[2].toLowerCase()
    const isImg = /\.(png|jpe?g|gif|webp|svg|heic|bmp)$/.test(name)
    const isData = /\.(json|ya?ml|toml|env|csv)$/.test(name)
    const isCode = /\.(jsx?|tsx?|py|sh|css|html?|rb|go|rs|php)$/.test(name)
    if (verb === 'reading') {
      if (isImg) return 'Reviewing a screen'
      if (isData) return 'Checking the data'
      if (isCode) return 'Reading through the setup'
      return 'Reading the notes'
    }
    if (isImg) return 'Updating a screen'
    if (isCode) return 'Making the change'
    if (isData) return 'Updating the settings'
    return 'Writing it up'
  }

  if (/^Searching for\b/i.test(t)) return 'Searching the project'
  if (/^(Spawning|Bringing in)\b/i.test(t)) return 'Bringing in extra help'
  if (/^Using \//i.test(t)) return 'Using a built-in tool'

  // Anything else (agent-authored Bash descriptions are usually clean plain English): keep the
  // wording but scrub any leaked path or bare filename as a final safety net.
  t = t
    .replace(/(?:\/[\w.\-]+){2,}\/?/g, 'the files')
    .replace(/\b[\w\-]+\.(?:jsx?|tsx?|py|sh|json|ya?ml|md|css|html?|png|jpe?g|gif|webp|svg)\b/gi, 'the file')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // A machine-flavored label ("Count entries in current directory") must NEVER reach the user.
  if (/\b(director(?:y|ies)|subdir|cwd|std(?:out|err|in)|node_modules|localhost|entries|filesystem|grep|chmod|mkdir|rmdir|dir|repo|regex|npm|npx)\b/i.test(t)) {
    return 'Working through the project'
  }
  return t
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const _msgClient = req.query.client_id ? String(req.query.client_id).trim() : ''
  if (!_msgClient) return res.status(401).json({ error: 'Missing client' })
  let verified
  try {
    verified = await verifyTenant(_msgClient, req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const clientId = verified.tenant
  const agent = (req.query.agent || '').toString().toLowerCase()
  const project = (req.query.project || '').toString().toLowerCase()
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100)

  let rows = []
  try {
    const args = {
      event_type: 'message_step',
      payload_eq: { key: 'client_id', value: clientId },
      order: 'desc',
      limit: project ? limit * 4 : limit,
    }
    if (agent) args.agent = agent
    rows = await convexQuery('events:find', args, verified.token)
  } catch (_) { rows = [] }

  const steps = []
  for (const row of (Array.isArray(rows) ? rows : [])) {
    const p = row.payload || {}
    if ((p.client_id || clientId) !== clientId) continue
    if (project && (p.project || '') !== project) continue
    const pid = p.parent_message_id
    if (!pid) continue
    // Keep the settle sentinel verbatim (the frontend filters it by step_index/"settled");
    // humanize everything the user actually sees.
    const isSentinel = p.step_index === 9999 || p.text === 'settled'
    steps.push({
      id: row.id,
      agent: row.agent,
      parent_message_id: pid,
      step_index: p.step_index ?? 0,
      text: isSentinel ? (p.text || '') : humanizeStep(p.text || ''),
      status: p.status || 'in_progress',
      timestamp: row.timestamp,
      project: p.project || '',
      // Turn-phase tag stamped by the bridge (thinking | working | streaming | done | waiting).
      phase: p.phase || '',
    })
    if (steps.length >= limit) break
  }
  return res.status(200).json({ steps })
}
