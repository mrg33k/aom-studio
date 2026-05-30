-- Deal Bank — Completed Rounds: ensure table + extend schema for richer data.
-- Combines the original 20260518100000_deal_bank_completed_rounds.sql shape
-- with the 2026-05-30 columns needed for Ben's deal-bank research import (178 rounds).
-- Idempotent. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.deal_bank_completed_rounds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company         text NOT NULL,
  amount_raised   text NOT NULL,
  round           text NOT NULL,
  date            date,
  source_url      text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_bank_completed_rounds
  ADD COLUMN IF NOT EXISTS amount_usd_m       numeric,
  ADD COLUMN IF NOT EXISTS segment            text,
  ADD COLUMN IF NOT EXISTS short_description  text,
  ADD COLUMN IF NOT EXISTS source             text,
  ADD COLUMN IF NOT EXISTS investors          text,
  ADD COLUMN IF NOT EXISTS region             text;

CREATE INDEX IF NOT EXISTS deal_bank_completed_rounds_date_idx
  ON public.deal_bank_completed_rounds (date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS deal_bank_completed_rounds_amount_idx
  ON public.deal_bank_completed_rounds (amount_usd_m DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS deal_bank_completed_rounds_segment_idx
  ON public.deal_bank_completed_rounds (segment);

ALTER TABLE public.deal_bank_completed_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_bank_completed_rounds_public_read ON public.deal_bank_completed_rounds;
CREATE POLICY deal_bank_completed_rounds_public_read ON public.deal_bank_completed_rounds
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS deal_bank_completed_rounds_service_write ON public.deal_bank_completed_rounds;
CREATE POLICY deal_bank_completed_rounds_service_write ON public.deal_bank_completed_rounds
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.deal_bank_completed_rounds IS
  'System-managed. Closed space-industry funding rounds. '
  'Seeded 2026-05-30 from Ben''s deal-bank research spreadsheets (178 rounds). '
  'Maintained by the Space Rising team going forward.';
