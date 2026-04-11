-- Migration 020: Add active_voice_id to agents table
-- Stores the selected voice per agent for server-side persistence

ALTER TABLE agents ADD COLUMN IF NOT EXISTS active_voice_id text DEFAULT 'kore';
