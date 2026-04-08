-- Migration 014: Enforce world_id / client_id RLS on the tasks table
-- Run in: Supabase Dashboard > SQL Editor
-- Project: mcngatprgluexjjcqpkp
--
-- Context:
--   Migration 010 (AOM-EA scripts/migrations) already added client_id + RLS to:
--     messages, agent_status, events, projects, agents, rooms, section_mappings
--
--   The tasks table is the remaining core per-tenant table without enforced RLS.
--   All API endpoints (v2-task-list, v2-task-create, v2-task-reorder, v2-gemini-chat)
--   already pass client_id in queries; this migration enforces it at the DB level.
--
-- RLS policy design:
--   anon role:          SELECT/INSERT on client_id = 'aom' (current AOM dashboard, unauthenticated)
--   authenticated role: ALL ops where client_id matches the world stored in user metadata
--                       (auth.jwt() ->> 'world' resolves to the user's assigned world)
--   service role:       bypasses RLS automatically (agents and scripts use service role key)

-- ── 1. Ensure client_id column exists ──────────────────────────────────────────

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

-- Backfill any nulls (belt-and-suspenders; NOT NULL DEFAULT covers new rows)
UPDATE tasks SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);

-- Composite index for the most common dashboard query pattern:
-- WHERE client_id = ? AND status IN (?) ORDER BY priority DESC, sort_order ASC
CREATE INDEX IF NOT EXISTS idx_tasks_client_status
  ON tasks(client_id, status, priority DESC, sort_order ASC);

-- ── 2. Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ── 3. Drop stale policies before recreating ───────────────────────────────────

DROP POLICY IF EXISTS "anon_read_aom_tasks"   ON tasks;
DROP POLICY IF EXISTS "anon_insert_aom_tasks" ON tasks;
DROP POLICY IF EXISTS "tenant_own_tasks"      ON tasks;

-- ── 4. anon role: AOM dashboard (Patrik's current unauthenticated setup) ────────

-- Anon can read tasks for the 'aom' world (dashboard task list, RNB)
CREATE POLICY "anon_read_aom_tasks" ON tasks
  FOR SELECT TO anon
  USING (client_id = 'aom');

-- Anon can insert tasks for the 'aom' world (dashboard task creation)
CREATE POLICY "anon_insert_aom_tasks" ON tasks
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

-- ── 5. authenticated role: per-tenant isolation ──────────────────────────────────
-- Reads the 'world' claim from the JWT metadata set during onboarding.
-- Each authenticated user sees and modifies only their own world's tasks.

CREATE POLICY "tenant_own_tasks" ON tasks
  FOR ALL TO authenticated
  USING (
    client_id = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'world',
      auth.uid()::text
    )
  )
  WITH CHECK (
    client_id = COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'world',
      auth.uid()::text
    )
  );

-- ── 6. worlds table: ensure it exists and has RLS ──────────────────────────────
-- The worlds table is the source of truth for all tenant worlds.
-- Create it if it doesn't exist yet (idempotent).

CREATE TABLE IF NOT EXISTS worlds (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  client_id  text UNIQUE NOT NULL,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  config     jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worlds_slug      ON worlds(slug);
CREATE INDEX IF NOT EXISTS idx_worlds_client_id ON worlds(client_id);
CREATE INDEX IF NOT EXISTS idx_worlds_status    ON worlds(status);

ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_active_worlds"      ON worlds;
DROP POLICY IF EXISTS "authenticated_read_own_world" ON worlds;

-- Anyone can read active world metadata (needed for world selector dropdown)
CREATE POLICY "anon_read_active_worlds" ON worlds
  FOR SELECT TO anon
  USING (status = 'active');

CREATE POLICY "authenticated_read_own_world" ON worlds
  FOR SELECT TO authenticated
  USING (status = 'active');

-- ── 7. world_members table: ensure it exists and has RLS ───────────────────────

CREATE TABLE IF NOT EXISTS world_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id   uuid NOT NULL REFERENCES worlds(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  role       text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (world_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_world_members_user   ON world_members(user_id);
CREATE INDEX IF NOT EXISTS idx_world_members_world  ON world_members(world_id);

ALTER TABLE world_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_own_memberships" ON world_members;

-- Users can see their own world memberships
CREATE POLICY "authenticated_read_own_memberships" ON world_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── Done ────────────────────────────────────────────────────────────────────────
-- Summary:
--   tasks.client_id          -- Ensured. RLS: anon sees 'aom', authenticated users see own world.
--   worlds                   -- Table + RLS created (idempotent). All active worlds visible.
--   world_members            -- Table + RLS created (idempotent). Users see own memberships.
--
-- Service role (agents, scripts, Vercel API routes using SUPABASE_SERVICE_ROLE_KEY)
-- always bypasses RLS in Supabase -- no changes needed to existing agent scripts.
--
-- Next: run 010_tenant_isolation_rls.sql (AOM-EA repo) if not yet applied.
-- That migration covers: messages, agent_status, events, projects, agents, rooms.
