-- 010_grants.sql
-- Adds grant-specific columns to directory_listings and the 'grant' category
-- Run after 009_message_status.sql

-- ─── Grant-specific columns ───────────────────────────────────────────────────
ALTER TABLE directory_listings
  ADD COLUMN IF NOT EXISTS grant_amount_min      numeric,
  ADD COLUMN IF NOT EXISTS grant_amount_max      numeric,
  ADD COLUMN IF NOT EXISTS deadline              timestamptz,
  ADD COLUMN IF NOT EXISTS eligibility_criteria  text,
  ADD COLUMN IF NOT EXISTS application_url       text,
  ADD COLUMN IF NOT EXISTS grant_type            text;   -- 'federal', 'state', 'private', 'nonprofit', etc.

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dir_listings_grant_type    ON directory_listings(grant_type);
CREATE INDEX IF NOT EXISTS idx_dir_listings_deadline      ON directory_listings(deadline);
CREATE INDEX IF NOT EXISTS idx_dir_listings_grant_amount  ON directory_listings(grant_amount_min, grant_amount_max);

-- ─── Comment on category values ───────────────────────────────────────────────
-- Valid category values now include:
--   equipment, job, event, article, grant
-- 'grant' is used for grant database entries.
-- Articles tagged with 'grants' (in the tags array) appear in the Grants page article strip.

-- ─── Sample grant listings ────────────────────────────────────────────────────
-- These use a system/admin company. Skip if directory_companies is empty.
INSERT INTO directory_listings (
  title, description, category, status,
  grant_amount_min, grant_amount_max, deadline,
  eligibility_criteria, application_url, grant_type, vertical
)
SELECT
  'CHIPS Act R&D Tax Credit',
  'Federal tax credit for domestic semiconductor research and development activities. Covers qualified research expenses including wages, supplies, and contract research costs.',
  'grant',
  'active',
  25000,
  2000000,
  '2026-12-31 23:59:00+00',
  'US-based semiconductor manufacturers or R&D facilities with qualified research expenses under IRC Section 41.',
  'https://www.irs.gov/credits-deductions/businesses/research-credit',
  'federal',
  'semiconductor'
FROM directory_companies
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO directory_listings (
  title, description, category, status,
  grant_amount_min, grant_amount_max, deadline,
  eligibility_criteria, application_url, grant_type, vertical
)
SELECT
  'Arizona Commerce Authority Innovation Grant',
  'Supports Arizona-based technology companies developing innovative products, processes, or services. Funding covers prototype development, IP filing, and commercialization activities.',
  'grant',
  'active',
  10000,
  150000,
  '2026-06-30 23:59:00+00',
  'Arizona-incorporated companies with fewer than 500 employees, operating in advanced technology sectors for at least 1 year.',
  'https://www.azcommerce.com/grants',
  'state',
  'semiconductor'
FROM directory_companies
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO directory_listings (
  title, description, category, status,
  grant_amount_min, grant_amount_max, deadline,
  eligibility_criteria, application_url, grant_type, vertical
)
SELECT
  'NSF Small Business Innovation Research (SBIR) Phase I',
  'Phase I SBIR awards support exploration of technical merit and feasibility of an innovative concept. Awardees may apply for Phase II funding of up to $1.5M.',
  'grant',
  'active',
  50000,
  275000,
  '2026-09-15 23:59:00+00',
  'US-based for-profit small businesses (< 500 employees) where the principal investigator is employed by the applicant company at time of award.',
  'https://www.nsf.gov/eng/iip/sbir',
  'federal',
  'space'
FROM directory_companies
LIMIT 1
ON CONFLICT DO NOTHING;
