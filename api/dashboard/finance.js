// GET  /api/dashboard/finance         Returns all transactions, newest date first
// POST /api/dashboard/finance         Actions: upsert, update-owner, delete-all, setup
//
// SECURITY (corner:tenant-isolation R1): finance holds Patrik's PERSONAL bank
// transactions and is NOT world-scoped. Every method requires the super-admin's
// verified session (an aom admin). Do not relax this gate.
//
// corner:retire-supabase (2026-09-03): rows live in the Convex
// financeTransactions table (finance:list / upsert / remove). Column mapping,
// because the Convex row has fewer fields than the old table:
//   owner  -> source      (who reviews it: Review, Patrik, ...)
//   notes  -> vendor      (free text; the page only ever shows it back)
//   the old unique key (date, description, amount) -> externalId, so a CSV
//   re-upload updates instead of duplicating.
// The page reads { id, date, description, amount, category, owner, notes }.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud'
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

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
const convexMutation = (path, args, token) => convexCall('mutation', path, args, token)

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

// Require the caller be the SUPER-ADMIN (an aom admin, Patrik).
async function requireSuperAdmin(req) {
  const who = await requireCaller(req)
  if (!who.superAdmin) throw new AuthError('forbidden: super-admin only', 403)
  return who
}

function externalIdFor(t) {
  return `${t.date}|${t.description}|${t.amount}`
}

function shapeRow(r) {
  return {
    id: r._id,
    date: r.date,
    description: r.description || '',
    amount: r.amount,
    category: r.category || '',
    owner: r.source || 'Review',
    notes: r.vendor || '',
    created_at: typeof r.createdAt === 'number' ? new Date(r.createdAt).toISOString() : null,
  }
}

async function listAll(token) {
  const rows = await convexQuery('finance:list', { limit: 2000 }, token)
  return (Array.isArray(rows) ? rows : []).map(shapeRow)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // Every method is super-admin-only. Finance is Patrik-personal, never shared.
  let caller
  try {
    caller = await requireSuperAdmin(req)
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }
  const token = caller.token

  // ---- GET: load all transactions, ordered by date desc ----------------------
  if (req.method === 'GET') {
    try {
      const transactions = await listAll(token)
      return res.status(200).json({ transactions })
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
  }

  // ---- POST: action-based dispatch -------------------------------------------
  if (req.method === 'POST') {
    const { action } = req.body || {}

    // -- setup: the Convex table always exists ---------------------------------
    if (action === 'setup') {
      return res.status(200).json({
        status: 'already_exists',
        message: 'financeTransactions lives on Convex; nothing to set up',
      })
    }

    // -- upsert: bulk upsert transactions (CSV upload) -------------------------
    if (action === 'upsert') {
      const { transactions } = req.body || {}
      if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: 'transactions array required' })
      }

      // Deduplicate within the batch (same date+description+amount = keep first)
      const seen = new Set()
      const rows = []
      for (const t of transactions) {
        const key = `${t.date}|${t.description}|${t.amount}`
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({
          date: String(t.date || ''),
          description: String(t.description || ''),
          amount: Number(t.amount),
          category: String(t.category || ''),
          source: String(t.owner || 'Review'),
          vendor: String(t.notes || ''),
          kind: Number(t.amount) >= 0 ? 'income' : 'expense',
          externalId: key,
        })
      }

      let inserted = 0
      const errors = []
      for (const row of rows) {
        if (!Number.isFinite(row.amount)) { errors.push(`${row.description}: bad amount`); continue }
        try {
          await convexMutation('finance:upsert', { key: CONVEX_KEY, row }, token)
          inserted += 1
        } catch (err) {
          errors.push(`${row.description}: ${err.message}`)
        }
      }
      if (inserted === 0 && errors.length) {
        return res.status(502).json({ error: errors.slice(0, 5).join('; ') })
      }
      return res.status(200).json({
        ok: true,
        inserted,
        total: transactions.length,
        errors: errors.length ? errors : undefined,
      })
    }

    // -- update-owner: update owner on a single transaction --------------------
    if (action === 'update-owner') {
      const { id, owner } = req.body || {}
      if (!id || !owner) {
        return res.status(400).json({ error: 'id and owner required' })
      }
      try {
        const all = await convexQuery('finance:list', { limit: 2000 }, token)
        const row = (Array.isArray(all) ? all : []).find(r => String(r._id) === String(id))
        if (!row) return res.status(404).json({ error: 'transaction not found' })
        await convexMutation('finance:upsert', {
          key: CONVEX_KEY,
          id: row._id,
          row: {
            date: row.date,
            amount: row.amount,
            kind: row.kind,
            category: row.category,
            description: row.description,
            vendor: row.vendor,
            source: String(owner),
            externalId: row.externalId || externalIdFor(row),
          },
        }, token)
        return res.status(200).json({ ok: true, transaction: shapeRow({ ...row, source: String(owner) }) })
      } catch (err) {
        return res.status(502).json({ error: err.message })
      }
    }

    // -- delete-all: clear all rows (for reset) --------------------------------
    if (action === 'delete-all') {
      try {
        const all = await convexQuery('finance:list', { limit: 2000 }, token)
        let deleted = 0
        for (const row of (Array.isArray(all) ? all : [])) {
          await convexMutation('finance:remove', { key: CONVEX_KEY, id: row._id }, token)
          deleted += 1
        }
        return res.status(200).json({ ok: true, message: 'All transactions deleted', deleted })
      } catch (err) {
        return res.status(502).json({ error: err.message })
      }
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
