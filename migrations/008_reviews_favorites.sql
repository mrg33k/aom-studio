-- Run after 001, 002, 003, 004, 005, 006, 007
-- Reviews, favorites schema, claimed + photos columns on directory_companies

-- ─── directory_reviews table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS directory_reviews (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid REFERENCES directory_companies(id) ON DELETE CASCADE,
  reviewer_name  text NOT NULL,
  reviewer_email text,
  rating         int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title          text,
  body           text,
  verified       boolean DEFAULT false,
  status         text DEFAULT 'pending',   -- 'pending', 'approved', 'rejected'
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE directory_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read approved reviews"
  ON directory_reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "public insert reviews"
  ON directory_reviews FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_directory_reviews_company ON directory_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_directory_reviews_status ON directory_reviews(status);

-- ─── Alter directory_companies ───────────────────────────────────────────────

ALTER TABLE directory_companies ADD COLUMN IF NOT EXISTS claimed boolean DEFAULT false;
ALTER TABLE directory_companies ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb;

-- ─── Seed reviews for featured companies ─────────────────────────────────────

INSERT INTO directory_reviews (company_id, reviewer_name, rating, title, body, verified, status)
SELECT id,
  'James R.', 5,
  'Best semiconductor partner in the valley',
  'We have worked with them for 3 years. Delivery times are excellent and their engineering team is responsive. Highly recommended for any AZ fab project.',
  true, 'approved'
FROM directory_companies WHERE slug = 'intel-chandler'
ON CONFLICT DO NOTHING;

INSERT INTO directory_reviews (company_id, reviewer_name, rating, title, body, verified, status)
SELECT id,
  'Michelle T.', 5,
  'Unmatched quality and scale',
  'TSMC Arizona has been a game changer for our supply chain. Lead times have shortened significantly since they opened the Phoenix facility.',
  true, 'approved'
FROM directory_companies WHERE slug = 'tsmc-arizona'
ON CONFLICT DO NOTHING;

INSERT INTO directory_reviews (company_id, reviewer_name, rating, title, body, verified, status)
SELECT id,
  'David K.', 4,
  'Reliable aerospace supplier with strong ITAR compliance',
  'We source avionics components through Honeywell Aerospace regularly. Their compliance team is thorough and documentation is always in order.',
  true, 'approved'
FROM directory_companies WHERE slug = 'honeywell-aerospace'
ON CONFLICT DO NOTHING;

INSERT INTO directory_reviews (company_id, reviewer_name, rating, title, body, verified, status)
SELECT id,
  'Sara L.', 5,
  'Go-to partner for embedded systems',
  'Microchip Technology has consistently delivered on our embedded controller needs. Their AZ team is knowledgeable and their parts have excellent availability.',
  true, 'approved'
FROM directory_companies WHERE slug = 'microchip-technology'
ON CONFLICT DO NOTHING;

-- ─── Seed photos for featured companies ──────────────────────────────────────

UPDATE directory_companies
SET photos = '["https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200", "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200"]'::jsonb
WHERE slug = 'intel-chandler' AND (photos IS NULL OR photos = '[]'::jsonb);

UPDATE directory_companies
SET photos = '["https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"]'::jsonb
WHERE slug = 'tsmc-arizona' AND (photos IS NULL OR photos = '[]'::jsonb);

UPDATE directory_companies
SET photos = '["https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200", "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"]'::jsonb
WHERE slug = 'honeywell-aerospace' AND (photos IS NULL OR photos = '[]'::jsonb);

UPDATE directory_companies
SET photos = '["https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"]'::jsonb
WHERE slug = 'microchip-technology' AND (photos IS NULL OR photos = '[]'::jsonb);
