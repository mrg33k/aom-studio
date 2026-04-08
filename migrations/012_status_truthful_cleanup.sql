-- Migration 012: Agent status truthful cleanup
-- Removes poke/watchdog system. agent_status table is the ONLY source of truth.
-- Status is set by: task_runner, gemini, or system safety net (pg_cron 30-min clear).
-- Dashboard reads agent_status directly. No event-derived status.

-- Ensure status_source is always one of the three allowed values
ALTER TABLE agent_status
  ADD CONSTRAINT IF NOT EXISTS agent_status_source_check
  CHECK (status_source IN ('task_runner', 'gemini', 'system'));

-- Ensure status is always a valid value
ALTER TABLE agent_status
  ADD CONSTRAINT IF NOT EXISTS agent_status_value_check
  CHECK (status IN ('working', 'idle', 'blocked', 'done', 'waiting', 'paused'));

-- Index for dashboard polling (frequently queries all agents by status)
CREATE INDEX IF NOT EXISTS idx_agent_status_working
  ON agent_status(status)
  WHERE status = 'working';
