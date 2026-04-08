-- Migration 013: Agent status truthful -- task-derived status values + last_activity_at
-- Status is set by: task_runner (building/qa/done/error), gemini (responding), system (idle).
-- Dashboard reads agent_status directly via Supabase Realtime.

-- Expand allowed status values to include task-derived and chat-derived states.
-- Drop old constraint first, then re-add with full value set.
ALTER TABLE agent_status DROP CONSTRAINT IF EXISTS agent_status_value_check;

ALTER TABLE agent_status
  ADD CONSTRAINT agent_status_value_check
  CHECK (status IN (
    'idle',       -- no active task or chat
    'working',    -- legacy generic active (kept for backward compat)
    'building',   -- task runner: actively building/coding
    'qa',         -- task runner: QA review in progress
    'done',       -- task runner: task completed successfully
    'responding', -- gemini chat: actively generating a response
    'error',      -- task runner: task failed or critical error
    'blocked',    -- blocked, needs human input
    'waiting',    -- waiting on external dependency
    'paused'      -- paused by user
  ));

-- Add last_activity_at: updated on every status change, used for idle detection.
-- Distinct from updated_at (which may update on any field change).
ALTER TABLE agent_status
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Index for dashboard queries: find all actively-working agents quickly
CREATE INDEX IF NOT EXISTS idx_agent_status_active
  ON agent_status(status)
  WHERE status IN ('building', 'qa', 'responding', 'working');

-- Backfill last_activity_at from updated_at for existing rows
UPDATE agent_status
  SET last_activity_at = updated_at
  WHERE last_activity_at IS NULL AND updated_at IS NOT NULL;
