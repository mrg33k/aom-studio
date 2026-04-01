-- 011: Sort order + brand identity for directory tenants
-- Adds sort_order so Space Rising and SC3 appear above Biotech and Defense.
-- Also seeds brand_color and hero_text from Steffen's approved brand specs.

-- ─── Add sort_order column ────────────────────────────────────────────────────
ALTER TABLE directory_tenants ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 99;

-- ─── Space Rising: sort 1, Launch Orange #E5451F ──────────────────────────────
UPDATE directory_tenants SET
  sort_order  = 1,
  brand_color = '#E5451F',
  hero_text   = 'Arizona''s space economy is launching. The verified directory for aerospace suppliers, launch companies, and space tech.'
WHERE slug = 'space-rising';

-- ─── SC3 Semiconductor: sort 2, Aged Copper #A0522D ──────────────────────────
UPDATE directory_tenants SET
  sort_order  = 2,
  brand_color = '#A0522D',
  hero_text   = 'Arizona''s semiconductor supply chain coalition. The verified directory for chip industry suppliers, manufacturers, and service providers.'
WHERE slug = 'sc3-semiconductor';

-- ─── Biotech + Defense: keep below ───────────────────────────────────────────
UPDATE directory_tenants SET sort_order = 3 WHERE slug = 'az-biotech';
UPDATE directory_tenants SET sort_order = 4 WHERE slug = 'az-defense';

-- ─── Index for ordering ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dir_tenants_sort_order ON directory_tenants(sort_order);
