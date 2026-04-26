-- ============================================================
-- R-sh2c-D: dispatch_eligible flag for agent_status
-- Migration: 030
-- Generated: 2026-04-26
-- Task: 7a1e30d5-53e3-4e16-97dc-c1be44cd8028 (K7)
--
-- Purpose: Replace hardcoded DISPATCH_AGENTS = ['elon','gary','mom']
-- in api/dashboard/chat.js with a registry-driven query. Kill list item K7
-- from R-sh2-template-audit-v2 (commit 553ffa23b).
--
-- chat.js queries: SELECT slug FROM agent_status
--   WHERE client_id = 'aom' AND dispatch_eligible = true AND hidden = false
--
-- DO NOT run against prod without Patrik's explicit go.
-- ============================================================

ALTER TABLE agent_status
  ADD COLUMN IF NOT EXISTS dispatch_eligible BOOLEAN NOT NULL DEFAULT false;

-- Backfill: match the hardcoded list that was in chat.js before this migration.
-- These are the agents Haiku is permitted to dispatch task work to.
UPDATE agent_status
  SET dispatch_eligible = true
  WHERE client_id = 'aom'
    AND slug IN ('elon', 'gary', 'mom');

CREATE INDEX IF NOT EXISTS idx_agent_status_dispatch_eligible
  ON agent_status(client_id, dispatch_eligible)
  WHERE dispatch_eligible = true;

-- Verification query (run after migration):
--   SELECT slug, dispatch_eligible FROM agent_status
--   WHERE client_id = 'aom' AND dispatch_eligible = true;
-- Expected: elon, gary, mom (and any others set since).
