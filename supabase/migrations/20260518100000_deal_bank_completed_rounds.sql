-- Deal Bank — Completed Rounds table
-- AOM-EA seed: 7 closed space-industry funding rounds from blacknight research.
-- Ben's sourcing-directory repo will add its own tables for Investments + Investors.
-- This table is AOM-EA managed (sourced from research/2026-05-18-blacknight-seed.json).
-- Apply via Supabase Studio SQL Editor OR `supabase db push --linked`.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.deal_bank_completed_rounds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company         text NOT NULL,
  amount_raised   text NOT NULL,            -- display string, e.g. "$300M"
  round           text NOT NULL,            -- e.g. "Series E", "Seed"
  date            date,                     -- close date (null if unknown)
  source_url      text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index by date descending for default sort
CREATE INDEX IF NOT EXISTS deal_bank_completed_rounds_date_idx
  ON public.deal_bank_completed_rounds (date DESC NULLS LAST);

-- Public read (no auth required for the Completed Rounds surface)
ALTER TABLE public.deal_bank_completed_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_bank_completed_rounds_public_read ON public.deal_bank_completed_rounds;
CREATE POLICY deal_bank_completed_rounds_public_read ON public.deal_bank_completed_rounds
  FOR SELECT TO anon, authenticated
  USING (true);

-- Only service role can insert/update/delete (admin tooling)
DROP POLICY IF EXISTS deal_bank_completed_rounds_service_write ON public.deal_bank_completed_rounds;
CREATE POLICY deal_bank_completed_rounds_service_write ON public.deal_bank_completed_rounds
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.deal_bank_completed_rounds IS
  'System-managed. AOM team adds rows as space rounds close. No user-add flow. '
  'Seeded 2026-05-18 from research/2026-05-18-blacknight-seed.json (7 rounds). '
  'Ben sourcing-directory tables are separate and independent.';

-- ── SEED DATA (7 confirmed-closed rounds) ────────────────────────────────────
-- Starcloud excluded — round not yet confirmed closed as of seed date.

INSERT INTO public.deal_bank_completed_rounds (company, amount_raised, round, date, source_url, notes) VALUES
  ('ORBCOMM',
   '$460M',
   'Refinancing (private credit)',
   '2026-04-29',
   'https://satellitetoday.com',
   'Private credit refinancing led by Carlyle. Co-investors: Bain Credit (Private Credit Group), Morgan Stanley Private Credit.'),
  ('Astranis Space Technologies',
   '$300M',
   'Series E',
   '2026-05-06',
   'https://spacenews.com',
   'microGEO satellite company. Co-led by Snowpoint Ventures and Franklin Templeton. Other investors: a16z, BlackRock, Baillie Gifford, Fidelity, BAM Elevate, Nimble Partners.'),
  ('Cowboy Space Corporation',
   '$275M',
   'Series B',
   '2026-05-08',
   'https://spacenews.com',
   'Orbital compute and data centers. Led by Index Ventures. Co-investors: IVP, Blossom Capital, SAIC, Breakthrough Energy Ventures, Construct Capital, a16z, NEA, Interlagos.'),
  ('Star Catcher',
   '$65M',
   'Series A',
   '2026-05-12',
   'https://spacenews.com',
   'Power-beaming networks for orbital infrastructure. Led by B Capital. Co-investors: Shield Capital, Cerberus Ventures, GreatPoint Ventures, Helena, Oceans Ventures, MVP Ventures.'),
  ('Lunar Outpost',
   '$30M',
   'Series B',
   '2026-05-07',
   'https://spacenews.com',
   'Lunar mobility (rovers). Led by Industrious Ventures. Co-investors: Type One Ventures, Eniac Ventures, Promus Ventures, Reliable Equity.'),
  ('Scout Space',
   '$18M',
   'Series A',
   '2026-05-06',
   'https://payloadspace.com',
   'Orbital tracking and space domain awareness (SDA). Led by Washington Harbour Partners. Co-investors: VIPC, Noblis Ventures, Decisive Point, Fusion Fund.'),
  ('INTALUS, Inc.',
   '$11M',
   'Seed',
   '2026-05-06',
   'https://semafor.com',
   'Advanced aerospace materials. Led by Origin Ventures. Co-investors: Lockheed Martin, Scout Ventures.')
ON CONFLICT DO NOTHING;
