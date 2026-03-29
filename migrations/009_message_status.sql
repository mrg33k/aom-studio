-- Add status column to messages table for read receipt persistence.
-- Values: 'sent' | 'delivered' | 'read' (mirrors WhatsApp check states in BoardView).
-- Safe to run multiple times (IF NOT EXISTS guard).
-- Run in Supabase SQL Editor: Dashboard > SQL Editor > New query.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT NULL;

-- Index for fast lookups when patching by id
CREATE INDEX IF NOT EXISTS messages_status_idx ON messages (status);
