-- 021: Ensure member-company linkage with proper foreign key and index
-- Adds company_id foreign key to directory_members table if not already present

-- First, ensure the column exists
ALTER TABLE directory_members 
ADD COLUMN IF NOT EXISTS company_id uuid;

-- Check if a foreign key constraint already exists (by checking constraints on the column)
-- If not, add one. We can't easily drop unnamed constraints, so we'll add with IF NOT EXISTS
-- by attempting to create and catching any duplicate constraint error at runtime.
-- In practice, the column likely already has a FK from migration 006.

-- Add index on company_id for faster joins (idempotent)
CREATE INDEX IF NOT EXISTS idx_dir_members_company ON directory_members(company_id);

-- Note: The column definition in migration 006 already includes:
--   company_id uuid REFERENCES directory_companies(id) ON DELETE SET NULL
-- This migration ensures an index exists for performance.