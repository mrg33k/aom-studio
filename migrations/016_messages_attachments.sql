-- Add attachment columns to messages table for file upload support in ChatPanel.
-- Safe to run multiple times (IF NOT EXISTS guards).
-- Run in Supabase Dashboard > SQL Editor.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_mime_type text DEFAULT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size bigint DEFAULT NULL;

-- Index for fast lookups of messages with attachments
CREATE INDEX IF NOT EXISTS messages_attachment_idx ON messages (attachment_url) WHERE attachment_url IS NOT NULL;

-- Create 'attachments' storage bucket (idempotent via DO block)
-- NOTE: If the bucket doesn't exist yet, create it in Supabase Dashboard >
-- Storage > New bucket, name: "attachments", public: true.
-- The policy below grants public read + authenticated uploads.

-- Storage bucket policies (run after creating the bucket in the dashboard)
-- Allow authenticated users to upload to the attachments bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true)
--   ON CONFLICT (id) DO NOTHING;

-- CREATE POLICY "public read attachments" ON storage.objects
--   FOR SELECT USING (bucket_id = 'attachments');

-- CREATE POLICY "authenticated upload attachments" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'attachments');
