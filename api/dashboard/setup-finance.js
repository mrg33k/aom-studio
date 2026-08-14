// One-time setup endpoint: creates the finance_transactions table
// POST /api/dashboard/setup-finance
// After running once, this endpoint can be deleted.
// Gated: requires tenant auth (verifyTenant) — prevents anon schema probe

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SQL = `
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_txn_unique
  ON finance_transactions (date, description, amount);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_transactions' AND policyname = 'Allow anon select') THEN
    CREATE POLICY "Allow anon select" ON finance_transactions FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_transactions' AND policyname = 'Allow anon insert') THEN
    CREATE POLICY "Allow anon insert" ON finance_transactions FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_transactions' AND policyname = 'Allow anon update') THEN
    CREATE POLICY "Allow anon update" ON finance_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_transactions' AND policyname = 'Allow anon delete') THEN
    CREATE POLICY "Allow anon delete" ON finance_transactions FOR DELETE TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'finance_transactions' AND policyname = 'Allow service role all') THEN
    CREATE POLICY "Allow service role all" ON finance_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }
  try {
    await verifyTenant('aom', req);
  } catch (e) {
    if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing Supabase credentials' });
  }

  try {
    // Use the Supabase PostgREST RPC approach won't work for DDL.
    // Instead, we'll check if table exists and return status.
    const checkResp = await fetch(
      `${SUPABASE_URL}/rest/v1/finance_transactions?limit=0`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (checkResp.ok) {
      return res.status(200).json({
        status: 'already_exists',
        message: 'finance_transactions table already exists',
      });
    }

    // Table doesn't exist. Return the SQL to run manually.
    return res.status(200).json({
      status: 'needs_creation',
      message: 'Table does not exist yet. Run the SQL below in Supabase SQL Editor.',
      sql_editor_url: `https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql/new`,
      sql: SQL.trim(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
