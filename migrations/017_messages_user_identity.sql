-- Add user identity to messages for multi-user support
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql

ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id uuid NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_name text NULL;
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
