// GET  /api/dashboard/finance         — Returns all finance_transactions, ordered by date desc
// POST /api/dashboard/finance         — Actions: upsert, update-owner, setup
//
// Supabase REST proxy for finance. Same pattern as supabase-messages.js.
//
// SECURITY (corner:tenant-isolation R1): finance holds Patrik's PERSONAL bank
// transactions and is NOT world-scoped. Every method requires the super-admin's
// verified JWT (requireSuperAdmin). This endpoint was previously fully public —
// an unauthenticated GET returned all rows. Do not relax this gate.

import { requireSuperAdmin, TenantAuthError } from '../_lib/verifyTenant.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

const TABLE = 'finance_transactions'

const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS finance_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text DEFAULT '',
  owner text DEFAULT 'Review',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_txn_unique ON finance_transactions (date, description, amount);
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='finance_transactions' AND policyname='Allow anon select') THEN
    CREATE POLICY "Allow anon select" ON finance_transactions FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='finance_transactions' AND policyname='Allow anon insert') THEN
    CREATE POLICY "Allow anon insert" ON finance_transactions FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='finance_transactions' AND policyname='Allow anon update') THEN
    CREATE POLICY "Allow anon update" ON finance_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='finance_transactions' AND policyname='Allow service role all') THEN
    CREATE POLICY "Allow service role all" ON finance_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
`.trim()

function supabaseHeaders(extra = {}) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra,
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Cache-Control', 'no-store, no-cache')

  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  // Every method is super-admin-only — finance is Patrik-personal, never shared.
  try {
    await requireSuperAdmin(req)
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    return res.status(500).json({ error: 'Auth verification failed' })
  }

  // ---- GET: load all transactions, ordered by date desc ----------------------
  if (req.method === 'GET') {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&order=date.desc`
    const sbRes = await fetch(url, { headers: supabaseHeaders() })
    if (!sbRes.ok) {
      const err = await sbRes.text()
      return res.status(sbRes.status).json({ error: err })
    }
    const transactions = await sbRes.json()
    return res.status(200).json({ transactions })
  }

  // ---- POST: action-based dispatch -------------------------------------------
  if (req.method === 'POST') {
    const { action } = req.body || {}

    // -- setup: check if table exists, return SQL if not -----------------------
    if (action === 'setup') {
      try {
        const checkResp = await fetch(
          `${SUPABASE_URL}/rest/v1/${TABLE}?limit=0`,
          { headers: supabaseHeaders() }
        )
        if (checkResp.ok) {
          return res.status(200).json({
            status: 'already_exists',
            message: 'finance_transactions table already exists',
          })
        }
        return res.status(200).json({
          status: 'needs_creation',
          message: 'Table does not exist. Run the SQL below in Supabase SQL Editor.',
          sql: SETUP_SQL,
        })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
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
          date: t.date,
          description: t.description,
          amount: t.amount,
          category: t.category || '',
          owner: t.owner || 'Review',
          notes: t.notes || '',
        })
      }

      const url = `${SUPABASE_URL}/rest/v1/${TABLE}?on_conflict=date,description,amount`
      const sbRes = await fetch(url, {
        method: 'POST',
        headers: supabaseHeaders({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify(rows),
      })

      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }

      const inserted = await sbRes.json()
      return res.status(200).json({
        ok: true,
        inserted: inserted.length,
        total: transactions.length,
      })
    }

    // -- update-owner: update owner on a single transaction --------------------
    if (action === 'update-owner') {
      const { id, owner } = req.body || {}
      if (!id || !owner) {
        return res.status(400).json({ error: 'id and owner required' })
      }

      const url = `${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`
      const sbRes = await fetch(url, {
        method: 'PATCH',
        headers: supabaseHeaders(),
        body: JSON.stringify({ owner }),
      })

      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }

      const updated = await sbRes.json()
      return res.status(200).json({ ok: true, transaction: updated[0] || null })
    }

    // -- delete-all: clear all rows (for reset) --------------------------------
    if (action === 'delete-all') {
      const url = `${SUPABASE_URL}/rest/v1/${TABLE}?created_at=gte.1970-01-01`
      const sbRes = await fetch(url, {
        method: 'DELETE',
        headers: supabaseHeaders(),
      })

      if (!sbRes.ok) {
        const err = await sbRes.text()
        return res.status(sbRes.status).json({ error: err })
      }

      return res.status(200).json({ ok: true, message: 'All transactions deleted' })
    }

    return res.status(400).json({ error: `Unknown action: ${action}` })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
