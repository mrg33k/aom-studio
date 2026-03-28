-- Scout Messages table
-- Relay pattern: frontend writes query, backend processes it, frontend polls for results.
-- When a persistent Scout agent is added later, it watches this table and takes over processing.

CREATE TABLE IF NOT EXISTS scout_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query text NOT NULL,
  response jsonb,
  status text DEFAULT 'pending', -- pending, processing, complete, error
  session_id text, -- group messages by session
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE scout_messages ENABLE ROW LEVEL SECURITY;

-- Public can insert queries
CREATE POLICY "public insert scout" ON scout_messages
  FOR INSERT WITH CHECK (true);

-- Public can read results (needed for polling)
CREATE POLICY "public read scout" ON scout_messages
  FOR SELECT USING (true);

-- Service role can update status + write results
CREATE POLICY "service update scout" ON scout_messages
  FOR UPDATE USING (true);
