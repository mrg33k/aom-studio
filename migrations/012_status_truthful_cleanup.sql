-- Migration 012: Agent status truthful cleanup
-- Adds constraints to enforce that agent_status table is the sole source of truth.
-- Status can only be written by task_runner, gemini, or system.
-- Prevents phantom "working" states from stale data.

-- Ensure status_source is always one of the three allowed values
ALTER TABLE agent_status
  ADD CONSTRAINT IF NOT EXISTS agent_status_source_check
  CHECK (status_source IN ('task_runner', 'gemini', 'system'));

-- Ensure status is always a valid value
ALTER TABLE agent_status
  ADD CONSTRAINT IF NOT EXISTS agent_status_value_check
  CHECK (status IN ('working', 'idle', 'blocked', 'done', 'waiting', 'paused'));

-- Index for dashboard polling (frequently queries agents by status=working)
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON agent_status(status) WHERE status = 'working';

-- Index for client-scoped status reads (dashboard polls by client_id)
CREATE INDEX IF NOT EXISTS idx_agent_status_client_slug ON agent_status(client_id, slug);
