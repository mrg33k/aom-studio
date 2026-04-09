-- Migration 019: Add project_id to tasks table
-- Run in: Supabase Dashboard > SQL Editor
-- Project: mcngatprgluexjjcqpkp
--
-- Context:
--   Tasks created during a project chat should be associated with that project.
--   Adds a nullable project_id UUID FK to the tasks table.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);

-- ── Post-migration assertion block ────────────────────────────────────────────
DO $$
DECLARE
  col_exists integer;
BEGIN
  SELECT COUNT(*) INTO col_exists
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name   = 'tasks'
    AND column_name  = 'project_id';

  IF col_exists = 0 THEN
    RAISE EXCEPTION 'Migration 019: project_id column not found on tasks table';
  END IF;

  RAISE NOTICE 'Migration 019 validation passed: tasks.project_id column exists.';
END;
$$;
