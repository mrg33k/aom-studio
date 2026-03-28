-- sourcing.directory MVP schema
-- Multi-vertical industry directory (semiconductor, space, biotech, etc.)
-- Run this in the Supabase SQL editor at:
--   https://mcngatprgluexjjcqpkp.supabase.co/sql

-- ─── Organizations (Space Rising, SC3, etc.) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS directory_organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  logo_url        text,
  website         text,
  vertical        text NOT NULL,  -- 'semiconductor', 'space', 'biotech', etc.
  membership_tiers jsonb DEFAULT '[]'::jsonb,
  -- example: [{"name":"Basic","price_yearly":500,"benefits":["Directory listing"]},
  --           {"name":"Pro","price_yearly":2000,"benefits":["Featured badge","RFQ inbox"]}]
  created_at      timestamptz DEFAULT now()
);

-- ─── Companies ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS directory_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  logo_url        text,
  website         text,
  phone           text,
  email           text,
  vertical        text NOT NULL,  -- 'semiconductor', 'space', 'biotech', etc.
  city            text,
  state           text,
  country         text DEFAULT 'US',
  employee_count  text,           -- range string: '1-10', '11-50', etc.
  year_founded    int,
  membership_tier text DEFAULT 'free',  -- 'free', 'basic', 'pro', 'enterprise'
  organization_id uuid REFERENCES directory_organizations(id) ON DELETE SET NULL,
  status          text DEFAULT 'pending',  -- 'active', 'pending', 'expired'
  featured        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dir_companies_vertical  ON directory_companies(vertical);
CREATE INDEX IF NOT EXISTS idx_dir_companies_status    ON directory_companies(status);
CREATE INDEX IF NOT EXISTS idx_dir_companies_org       ON directory_companies(organization_id);

-- Full-text search index on name + description
CREATE INDEX IF NOT EXISTS idx_dir_companies_fts ON directory_companies
  USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'')));

-- ─── Certifications (flexible per vertical) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS directory_certifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES directory_companies(id) ON DELETE CASCADE,
  cert_name   text NOT NULL,   -- 'ISO 9001', 'AS9100', 'ITAR Registered', etc.
  cert_value  text DEFAULT 'true',  -- 'true' | 'false' | actual cert number
  vertical    text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dir_certs_company ON directory_certifications(company_id);
CREATE INDEX IF NOT EXISTS idx_dir_certs_vertical ON directory_certifications(vertical);

-- ─── Listings (equipment, jobs, events, articles) ─────────────────────────────
CREATE TABLE IF NOT EXISTS directory_listings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES directory_companies(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  price       numeric,
  category    text NOT NULL,  -- 'equipment', 'job', 'event', 'article'
  status      text DEFAULT 'active',  -- 'active', 'sold', 'expired'
  image_url   text,
  contact_email text,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dir_listings_company   ON directory_listings(company_id);
CREATE INDEX IF NOT EXISTS idx_dir_listings_category  ON directory_listings(category);
CREATE INDEX IF NOT EXISTS idx_dir_listings_status    ON directory_listings(status);

-- ─── RLS (Row Level Security) ─────────────────────────────────────────────────
-- Public read on active companies/orgs/certs/listings
-- Write restricted to service role (admin panel only for now)

ALTER TABLE directory_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_companies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE directory_listings      ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "public read orgs"    ON directory_organizations    FOR SELECT USING (true);
CREATE POLICY "public read companies" ON directory_companies      FOR SELECT USING (status = 'active');
CREATE POLICY "public read certs"   ON directory_certifications   FOR SELECT USING (true);
CREATE POLICY "public read listings" ON directory_listings        FOR SELECT USING (status = 'active');

-- Service role can do everything (no policy restriction at service role level)

-- ─── Seed: Verticals reference data ───────────────────────────────────────────
-- Semiconductor certifications available in AZ
-- Space certifications available in AZ

-- ─── Sample Organizations ─────────────────────────────────────────────────────
INSERT INTO directory_organizations (name, slug, description, website, vertical, membership_tiers)
VALUES
  (
    'SC3 Arizona',
    'sc3-arizona',
    'Semiconductor cluster advancing Arizona''s semiconductor ecosystem through workforce development, supply chain, and business growth.',
    'https://sc3az.org',
    'semiconductor',
    '[{"name":"Member","price_yearly":500,"benefits":["Directory listing","RFQ inbox","Events access"]},{"name":"Sponsor","price_yearly":2500,"benefits":["Featured badge","Homepage placement","Logo on events"]}]'
  ),
  (
    'Space Rising',
    'space-rising',
    'Connecting Arizona''s space industry ecosystem. From aerospace manufacturers to satellite companies, Space Rising grows the state''s space economy.',
    'https://spacerising.org',
    'space',
    '[{"name":"Member","price_yearly":750,"benefits":["Directory listing","Member directory","Monthly networking"]},{"name":"Premier","price_yearly":3000,"benefits":["Featured listing","Speaking slots","Sponsor branding"]}]'
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── Sample Companies (AZ Semiconductor) ─────────────────────────────────────
INSERT INTO directory_companies (name, slug, description, website, phone, email, vertical, city, state, employee_count, year_founded, membership_tier, status, featured)
VALUES
  (
    'Intel Chandler',
    'intel-chandler',
    'Intel''s Chandler campus is one of the company''s largest manufacturing sites globally, producing cutting-edge microprocessors and SoCs.',
    'https://intel.com',
    '(480) 765-8080',
    'chandler@intel.com',
    'semiconductor',
    'Chandler', 'AZ', '10000+', 1980, 'enterprise', 'active', true
  ),
  (
    'TSMC Arizona',
    'tsmc-arizona',
    'Taiwan Semiconductor Manufacturing Company''s first US fab, producing 4nm and 3nm chips in North Phoenix.',
    'https://tsmc.com',
    NULL,
    NULL,
    'semiconductor',
    'Phoenix', 'AZ', '2000+', 2021, 'enterprise', 'active', true
  ),
  (
    'Microchip Technology',
    'microchip-technology',
    'Chandler-headquartered leader in microcontrollers, mixed-signal, analog, and Flash-IP solutions for thousands of diverse applications.',
    'https://microchip.com',
    '(480) 792-7200',
    'info@microchip.com',
    'semiconductor',
    'Chandler', 'AZ', '5000+', 1989, 'pro', 'active', false
  ),
  (
    'ON Semiconductor',
    'on-semiconductor',
    'Phoenix-based global leader in energy-efficient power, signal management, logic, standard products and custom devices for automotive, industrial, and cloud.',
    'https://onsemi.com',
    '(602) 244-6600',
    NULL,
    'semiconductor',
    'Scottsdale', 'AZ', '10000+', 1999, 'pro', 'active', false
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── Sample Companies (AZ Space) ─────────────────────────────────────────────
INSERT INTO directory_companies (name, slug, description, website, phone, email, vertical, city, state, employee_count, year_founded, membership_tier, status, featured)
VALUES
  (
    'Honeywell Aerospace',
    'honeywell-aerospace',
    'Honeywell''s Aerospace division in Phoenix develops avionics, flight controls, engines, and space systems for commercial and defense markets.',
    'https://aerospace.honeywell.com',
    '(602) 365-3099',
    NULL,
    'space',
    'Phoenix', 'AZ', '10000+', 1914, 'enterprise', 'active', true
  ),
  (
    'World View Enterprises',
    'world-view-enterprises',
    'Tucson-based stratospheric exploration company operating high-altitude balloons for science, defense, and commercial Earth observation missions.',
    'https://worldview.space',
    '(520) 441-1490',
    'info@worldview.space',
    'space',
    'Tucson', 'AZ', '100-500', 2012, 'pro', 'active', false
  ),
  (
    'Near Space Corporation',
    'near-space-corporation',
    'Tillamook-based but AZ-expanding high-altitude balloon and stratospheric launch vehicle company for scientific and commercial payloads.',
    'https://nearspacecorp.com',
    NULL,
    'info@nearspacecorp.com',
    'space',
    'Chandler', 'AZ', '11-50', 2004, 'basic', 'active', false
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── Sample Certifications ────────────────────────────────────────────────────
-- (These would be populated by the signup form in production)
-- Intel Chandler
INSERT INTO directory_certifications (company_id, cert_name, cert_value, vertical)
SELECT id, 'ISO 9001', 'true', 'semiconductor' FROM directory_companies WHERE slug = 'intel-chandler'
ON CONFLICT DO NOTHING;

INSERT INTO directory_certifications (company_id, cert_name, cert_value, vertical)
SELECT id, 'ISO 14001', 'true', 'semiconductor' FROM directory_companies WHERE slug = 'intel-chandler'
ON CONFLICT DO NOTHING;

INSERT INTO directory_certifications (company_id, cert_name, cert_value, vertical)
SELECT id, 'ITAR Registered', 'true', 'semiconductor' FROM directory_companies WHERE slug = 'intel-chandler'
ON CONFLICT DO NOTHING;

-- Honeywell Aerospace
INSERT INTO directory_certifications (company_id, cert_name, cert_value, vertical)
SELECT id, 'AS9100D', 'true', 'space' FROM directory_companies WHERE slug = 'honeywell-aerospace'
ON CONFLICT DO NOTHING;

INSERT INTO directory_certifications (company_id, cert_name, cert_value, vertical)
SELECT id, 'ITAR Registered', 'true', 'space' FROM directory_companies WHERE slug = 'honeywell-aerospace'
ON CONFLICT DO NOTHING;

INSERT INTO directory_certifications (company_id, cert_name, cert_value, vertical)
SELECT id, 'ISO 9001', 'true', 'space' FROM directory_companies WHERE slug = 'honeywell-aerospace'
ON CONFLICT DO NOTHING;
