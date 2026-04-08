-- Migration 013: iMessage channel support
-- Tracks conversation channel (dashboard vs imessage) and external_id (phone number).
-- conversations table is the source of truth for per-user iMessage sessions.

CREATE TABLE IF NOT EXISTS conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL DEFAULT 'dashboard',
  external_id TEXT,
  client_id   TEXT NOT NULL DEFAULT 'aom',
  agent       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Idempotent column additions (safe to re-run if table pre-existed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'channel'
  ) THEN
    ALTER TABLE conversations ADD COLUMN channel TEXT DEFAULT 'dashboard';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN external_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_external_id ON conversations(external_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);

-- One conversation per phone number per client
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_external_client
  ON conversations(external_id, client_id)
  WHERE channel = 'imessage';
