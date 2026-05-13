-- ============================================================
-- /blacknight: space-company funding rounds tracker
-- Migration: 038
-- Generated: 2026-05-13
--
-- Sourced from Blacknight Space Labs LinkedIn posts. Refreshed
-- daily by /api/blacknight/refresh (Vercel Cron). Rendered at
-- /blacknight (src/pages/Blacknight.jsx).
--
-- DO NOT run against prod without Patrik's explicit go.
-- ============================================================

CREATE TABLE IF NOT EXISTS blacknight_rounds (
  id BIGSERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  amount_usd BIGINT,                 -- NULL if amount unknown / "undisclosed"
  amount_display TEXT,               -- human-friendly raw string ("$65M", "~$200M (raising)")
  round_stage TEXT,                  -- "Seed", "Series A", "Series E", "Refinancing", etc.
  sector TEXT,                       -- "Power-beaming networks", "Orbital compute", etc.
  lead_investor TEXT,
  other_investors TEXT[],            -- additional participating investors
  announced_date DATE,               -- when the round was announced (best-known)
  post_url TEXT,                     -- LinkedIn permalink to the Blacknight post
  source_url TEXT,                   -- canonical source we extracted from
  summary TEXT,                      -- one-sentence Blacknight take
  raw_post TEXT,                     -- full extracted post text (for re-extraction / audit)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Dedupe key: same company + same round stage = same row (updated, not duplicated).
  UNIQUE (company, round_stage)
);

CREATE INDEX IF NOT EXISTS idx_blacknight_announced_date
  ON blacknight_rounds (announced_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_blacknight_company
  ON blacknight_rounds (lower(company));

-- Tracks each refresh run so the UI can show "last updated" and we can debug.
CREATE TABLE IF NOT EXISTS blacknight_refresh_log (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL,              -- 'ok' | 'error'
  rows_upserted INT,
  rows_seen INT,
  error_message TEXT,
  duration_ms INT
);

CREATE INDEX IF NOT EXISTS idx_blacknight_refresh_log_ran_at
  ON blacknight_refresh_log (ran_at DESC);

-- RLS: public-readable, service-role-writable.
ALTER TABLE blacknight_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacknight_refresh_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS blacknight_rounds_anon_read ON blacknight_rounds;
CREATE POLICY blacknight_rounds_anon_read
  ON blacknight_rounds FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS blacknight_refresh_log_anon_read ON blacknight_refresh_log;
CREATE POLICY blacknight_refresh_log_anon_read
  ON blacknight_refresh_log FOR SELECT
  TO anon, authenticated
  USING (true);

-- ── Seed (extracted from Blacknight LinkedIn company page, 2026-05-13) ─────────

INSERT INTO blacknight_rounds
  (company, amount_usd, amount_display, round_stage, sector, summary, source_url)
VALUES
  ('Star Catcher',             65000000,  '$65M',                 'Series A',                'Power-beaming networks for orbital infrastructure',
   'Power-beaming networks for orbital infrastructure raise a $65M Series A.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('Cowboy Space Corporation', 275000000, '$275M',                'Series B',                'Orbital compute and data centers',
   'Orbital compute / data-center play closes a $275M Series B.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('Lunar Outpost',            30000000,  '$30M',                 'Series B',                'Lunar mobility (rovers)',
   'Lunar mobility/rover company raises a $30M Series B.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('Astranis Space Technologies', 300000000, '$300M',             'Series E',                'microGEO satellites',
   'microGEO satellite operator closes a $300M Series E.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('Scout Space',              18000000,  '$18M',                 'Series A',                'Orbital tracking / SDA',
   'Orbital tracking and space-domain-awareness raises an $18M Series A.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('INTALUS, Inc.',            11000000,  '$11M',                 'Seed',                    'Advanced aerospace materials',
   'Advanced aerospace materials startup raises an $11M seed.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('Starcloud',                NULL,      '~$200M (raising at $2.2B valuation)', 'Growth (raising)', 'Space-based compute',
   'Space-based compute is raising ~$200M at a $2.2B valuation.',
   'https://www.linkedin.com/company/blacknightspacelabs'),
  ('ORBCOMM',                  460000000, '$460M',                'Refinancing (private credit)', 'Space operator financing',
   'ORBCOMM secures a $460M private-credit refinancing.',
   'https://www.linkedin.com/company/blacknightspacelabs')
ON CONFLICT (company, round_stage) DO NOTHING;

-- Verification:
--   SELECT company, round_stage, amount_display FROM blacknight_rounds
--     ORDER BY amount_usd DESC NULLS LAST;
-- Expected: 8 rows.
