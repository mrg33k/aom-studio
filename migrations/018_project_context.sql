-- Migration 018: Create project_context table
-- Run in: Supabase Dashboard > SQL Editor
-- Project: mcngatprgluexjjcqpkp
--
-- Context:
--   Adds a project_context table to store per-project markdown context blobs.
--   Each project has at most one context record (unique constraint on project_id).
--   Cascades on project deletion.

CREATE TABLE IF NOT EXISTS project_context (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  context_md  text        NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_context_project_id ON project_context(project_id);

-- ── Post-migration assertion block ────────────────────────────────────────────
DO $$
DECLARE
  tbl_exists   integer;
  fk_exists    integer;
  uq_exists    integer;
BEGIN
  -- 1. Verify table exists
  SELECT COUNT(*) INTO tbl_exists
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'project_context';

  IF tbl_exists = 0 THEN
    RAISE EXCEPTION 'Migration 018: project_context table not found';
  END IF;

  -- 2. Verify foreign key constraint exists
  SELECT COUNT(*) INTO fk_exists
  FROM information_schema.referential_constraints rc
  JOIN information_schema.key_column_usage kcu
    ON rc.constraint_name = kcu.constraint_name
   AND kcu.constraint_schema = 'public'
  WHERE kcu.table_name = 'project_context'
    AND kcu.column_name = 'project_id';

  IF fk_exists = 0 THEN
    RAISE EXCEPTION 'Migration 018: foreign key on project_context.project_id not found';
  END IF;

  -- 3. Verify unique constraint exists
  SELECT COUNT(*) INTO uq_exists
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND kcu.constraint_schema = 'public'
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'project_context'
    AND kcu.column_name = 'project_id'
    AND tc.constraint_type = 'UNIQUE';

  IF uq_exists = 0 THEN
    RAISE EXCEPTION 'Migration 018: unique constraint on project_context.project_id not found';
  END IF;

  RAISE NOTICE 'Migration 018 validation passed: project_context table created with FK and unique constraint on project_id.';
END;
$$;
