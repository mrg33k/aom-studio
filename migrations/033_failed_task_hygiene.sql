-- corner:failed-task-hygiene R1
-- Two changes to the tasks table lifecycle:
--   (A) Add `blocked` to the status CHECK constraint so workers can mark tasks
--       that can't succeed in their current scope and need re-routing.
--       Always paired with metadata.blocked_reason (and optionally
--       metadata.suggested_route for the re-route hint).
--   (B) Add `archived_at` timestamp so failed tasks older than N days fade
--       from the dashboard's failed pile without losing the row.
--
-- Idempotent: safe to re-run.

-- (A) Add 'blocked' status. Drop+recreate the CHECK constraint to add the value.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.tasks'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';
  IF cname IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tasks DROP CONSTRAINT ' || quote_ident(cname);
  END IF;
END $$;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('queued','running','done','failed','needs_input','blocked','cancelled','archived'));

-- (B) Add archived_at timestamp for the auto-archive pass.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Index for the failed-pile filter (status='failed' AND archived_at IS NULL).
CREATE INDEX IF NOT EXISTS idx_tasks_failed_active
  ON public.tasks (created_at DESC)
  WHERE status = 'failed' AND archived_at IS NULL;
