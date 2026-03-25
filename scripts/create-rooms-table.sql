-- Create the rooms table for persistent room layout + position storage.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Required for: world isolation, room position persistence, custom room ordering.

CREATE TABLE IF NOT EXISTS rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  color text DEFAULT '#60A5FA',
  type text DEFAULT 'agent',
  hidden boolean DEFAULT false,
  grid_order integer,
  client_id text DEFAULT 'aom',
  pos_x real,
  pos_y real,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_all" ON rooms FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read rooms for their world
CREATE POLICY "users_read_own_world" ON rooms FOR SELECT
  USING (
    client_id = (auth.jwt() -> 'user_metadata' ->> 'world')
    OR client_id = 'aom'
  );

-- Enable Realtime so CanvasOffice gets instant layout updates
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- Seed AOM's default rooms from gridSpec layout
INSERT INTO rooms (id, name, color, type, hidden, grid_order, client_id) VALUES
  ('elon', 'Elon', '#4CAF50', 'agent', false, 0, 'aom'),
  ('bobby', 'Bobby', '#9C27B0', 'agent', false, 1, 'aom'),
  ('steffen', 'Steffen', '#C9A84C', 'agent', false, 2, 'aom'),
  ('cleo', 'Cleo', '#F97316', 'agent', false, 3, 'aom'),
  ('jacob', 'Jacob', '#EF4444', 'agent', false, 4, 'aom'),
  ('aom-team', 'AOM Team', '#F59E0B', 'special', false, 5, 'aom'),
  ('patrik', 'Patrik', '#E85D26', 'agent', false, 6, 'aom'),
  ('corner', 'Corner', '#3B82F6', 'project', false, 7, 'aom'),
  ('ambition-mechanical', 'Ambition', '#E85D26', 'project', false, 8, 'aom'),
  ('kohrs', 'KOHRS', '#FDD835', 'project', false, 9, 'aom'),
  ('isa-energy', 'ISA Energy', '#4CAF50', 'project', false, 10, 'aom'),
  ('skylar', 'Skylar', '#AB47BC', 'project', false, 11, 'aom'),
  ('brandon-wiley', 'Brandon Wiley', '#EF5350', 'project', false, 12, 'aom'),
  ('nabi', 'NABI', '#FFB300', 'project', false, 13, 'aom'),
  ('outreach', 'Outreach', '#26A69A', 'project', false, 14, 'aom'),
  ('ai-advisory', 'AI Advisory', '#29B6F6', 'project', false, 15, 'aom'),
  ('included-health', 'Included Health', '#78909C', 'project', true, 16, 'aom')
ON CONFLICT (id) DO NOTHING;

-- Seed Q's first agent: Jarvis
INSERT INTO rooms (id, name, color, type, hidden, grid_order, client_id) VALUES
  ('jarvis', 'Jarvis', '#4CAF50', 'agent', false, 0, 'q')
ON CONFLICT (id) DO NOTHING;
