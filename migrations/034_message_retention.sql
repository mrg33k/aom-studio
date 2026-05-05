-- Migration 033: Message retention flagging for pruning
-- Adds explicit keep/prune flags to messages for conversation hygiene
-- Especially useful for Ben's room to distinguish real work from test noise
--
-- Schema:
--   messages.retention (text, nullable): null | 'keep' | 'prune'
--   Default (null) = no flag set, message persists forever
--   'keep' = user explicitly marked for archival
--   'prune' = user/admin flagged for deletion after grace period
--
-- Pruning policy:
--   Messages with retention='prune' AND timestamp < now() - interval '7 days' are deleted
--   Pruning runs once daily via daemon: scripts/message-retention-pruner.py

ALTER TABLE messages ADD COLUMN IF NOT EXISTS retention text;

-- Index for pruning queries (fast lookup of expired prune-flagged messages).
-- messages uses `timestamp` not `created_at`.
CREATE INDEX IF NOT EXISTS messages_retention_ts_idx
  ON messages(retention, timestamp)
  WHERE retention = 'prune';
