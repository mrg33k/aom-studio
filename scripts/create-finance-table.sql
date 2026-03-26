-- Finance Transactions table for AOM Finance Tracker
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql/new

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

-- Unique constraint to prevent duplicate transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_txn_unique
  ON finance_transactions (date, description, amount);

-- Enable RLS
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- Allow anon key full access (password-gated in the app)
CREATE POLICY "Allow anon select" ON finance_transactions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON finance_transactions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON finance_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON finance_transactions FOR DELETE TO anon USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON finance_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
