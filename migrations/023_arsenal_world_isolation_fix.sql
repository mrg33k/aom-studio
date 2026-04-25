-- ============================================================
-- Migration 023: Arsenal/Ben world isolation audit fixes
-- Task: 42836d30-f6d0-478f-b21d-7e98e16371d6
-- Generated: 2026-04-25
-- Project: mcngatprgluexjjcqpkp
--
-- Fixes 7 audit findings from 2026-04-25 /007 audit logged in as
-- Ben (ben@arsenalgpa.com, world=arsenal, user_id=429d6c82-3739-4010-a14c-93c6abc0d57f):
--
--  1. agents leak         -- 14 rows returned; should be world-scoped
--  2. projects leak       -- 20 rows returned; should be 1 (arsenal)
--  3. shared_rooms hidden -- 0 rows for Ben; should be 2
--  4. worlds recursion    -- 42P17 infinite recursion on worlds + world_members
--  5. tenant_users        -- 0 rows; Ben missing from table
--  6. messages INSERT     -- 42501 RLS violation; should succeed for client_id=arsenal
--  7. empty rooms         -- sourcing/arsenal-directory/arsenal in sidebar but no backend
--
-- Root causes (confirmed by live query):
--  - agents: no client_id column → RLS can't scope; table has permissive policy
--  - projects: policy uses auth.uid()::text instead of current_client_id()
--  - worlds + world_members: circular policy join (worlds→world_members→worlds) → 42P17
--  - tenant_users: arsenal tenant row missing; Ben's user_id not in tenant_users
--  - shared_rooms: Ben not in tenant_users → shared_room_members join returns nothing
--  - messages: INSERT policy uses auth.uid()::text; doesn't match 'arsenal' slug
--  - empty rooms: sourcing/arsenal-directory/arsenal have agent_status but no handler
-- ============================================================


-- ── 0. SECURITY DEFINER helpers ──────────────────────────────────────────────
-- These functions run as the function owner (service role), bypassing RLS.
-- Required to break worlds↔world_members circular policy dependency.

-- JWT world claim extractor (from migration 015 — recreate in case 015 wasn't applied).
-- Returns the world slug from JWT metadata (e.g. 'arsenal'), falls back to auth.uid()::text.
CREATE OR REPLACE FUNCTION current_client_id() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'world',
      auth.uid()::text
    )
  $$;

-- Returns the world_ids the current auth user is a member of.
-- SECURITY DEFINER bypasses world_members RLS so worlds policy can call it safely.
CREATE OR REPLACE FUNCTION current_user_world_ids() RETURNS SETOF uuid
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT world_id FROM world_members WHERE user_id = auth.uid()
  $$;

-- Returns agent slugs that are active in a given client_id world.
-- SECURITY DEFINER bypasses agent_status RLS so agents policy can call it safely.
CREATE OR REPLACE FUNCTION agent_slugs_for_world(p_client_id text) RETURNS SETOF text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT slug FROM agent_status WHERE client_id = p_client_id
  $$;


-- ── 1. worlds: rewrite policies to eliminate 42P17 recursion ─────────────────
-- Cause: a previous policy joined worlds→world_members while world_members
-- joined back to worlds, creating infinite recursion.
-- Fix: use SECURITY DEFINER function so worlds policy reads world_members
-- without triggering its RLS check (which would re-enter worlds policy).

ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_active_worlds"        ON worlds;
DROP POLICY IF EXISTS "authenticated_read_own_world"   ON worlds;
DROP POLICY IF EXISTS "authenticated_read_own_worlds"  ON worlds;
DROP POLICY IF EXISTS "all_read_worlds"                ON worlds;
DROP POLICY IF EXISTS "tenant_read_worlds"             ON worlds;

-- Anon: see all active worlds (world selector needs full list)
CREATE POLICY "anon_read_active_worlds" ON worlds
  FOR SELECT TO anon
  USING (true);

-- Authenticated: see only worlds the user is a member of
-- Uses SECURITY DEFINER function to avoid recursion with world_members policy
CREATE POLICY "authenticated_read_own_worlds" ON worlds
  FOR SELECT TO authenticated
  USING (id IN (SELECT current_user_world_ids()));


-- ── 2. world_members: simple user_id check, no join to worlds ────────────────
-- The simple USING (user_id = auth.uid()) policy does NOT join to worlds,
-- so even if worlds policy calls current_user_world_ids() (which reads
-- world_members without RLS), there is no cycle.

ALTER TABLE world_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_own_memberships" ON world_members;
DROP POLICY IF EXISTS "tenant_own_world_members"           ON world_members;
DROP POLICY IF EXISTS "all_read_world_members"             ON world_members;

CREATE POLICY "authenticated_read_own_memberships" ON world_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ── 3. agents: scope to slugs active in the user's world ─────────────────────
-- The live `agents` table has no client_id column (it's a type catalog).
-- Previous policy using client_id=auth.uid()::text was invalid → all rows visible.
-- Fix: filter by agent_status for the user's world (via SECURITY DEFINER to
-- avoid RLS chicken-and-egg on agent_status).

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_agents"            ON agents;
DROP POLICY IF EXISTS "tenant_own_agents"               ON agents;
DROP POLICY IF EXISTS "all_read_agents"                 ON agents;
DROP POLICY IF EXISTS "authenticated_read_agents"       ON agents;
DROP POLICY IF EXISTS "authenticated_read_world_agents" ON agents;
DROP POLICY IF EXISTS "service_role_agents"             ON agents;

-- Anon: AOM catalog only
CREATE POLICY "anon_read_aom_agents" ON agents
  FOR SELECT TO anon
  USING (slug IN (SELECT agent_slugs_for_world('aom')));

-- Authenticated: only agents active in their world
CREATE POLICY "authenticated_read_world_agents" ON agents
  FOR SELECT TO authenticated
  USING (slug IN (SELECT agent_slugs_for_world(current_client_id())));


-- ── 4. projects: fix policy (was auth.uid()::text → current_client_id()) ─────
-- Migration 010 created tenant_own_projects with USING(client_id=auth.uid()::text).
-- auth.uid() is a UUID; client_id values are world slugs ('aom', 'arsenal').
-- UUID ≠ slug → either RLS was disabled or a permissive catch-all policy remained.
-- Result: Ben sees all 20 projects. Fix: use current_client_id() throughout.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_projects"  ON projects;
DROP POLICY IF EXISTS "tenant_own_projects"     ON projects;
DROP POLICY IF EXISTS "tenant_select_projects"  ON projects;
DROP POLICY IF EXISTS "tenant_insert_projects"  ON projects;
DROP POLICY IF EXISTS "tenant_update_projects"  ON projects;
DROP POLICY IF EXISTS "tenant_delete_projects"  ON projects;
DROP POLICY IF EXISTS "all_read_projects"       ON projects;
DROP POLICY IF EXISTS "service_role_projects"   ON projects;

CREATE POLICY "anon_read_aom_projects" ON projects
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "tenant_select_projects" ON projects
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_projects" ON projects
  FOR UPDATE TO authenticated
  USING  (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_projects" ON projects
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 5. messages: fix INSERT (was auth.uid()::text → current_client_id()) ─────
-- Migration 010 created tenant_own_messages FOR ALL with auth.uid()::text.
-- Migration 015 tried to replace it, but either 015 wasn't applied or
-- residual policies conflict. Result: Ben's INSERT fails (42501).
-- Fix: drop all, recreate explicit CRUD with current_client_id().

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_messages"   ON messages;
DROP POLICY IF EXISTS "anon_insert_aom_messages" ON messages;
DROP POLICY IF EXISTS "tenant_own_messages"      ON messages;
DROP POLICY IF EXISTS "tenant_select_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_insert_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_update_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_delete_messages"   ON messages;
DROP POLICY IF EXISTS "service_role_messages"    ON messages;

CREATE POLICY "anon_read_aom_messages" ON messages
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_messages" ON messages
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_messages" ON messages
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_messages" ON messages
  FOR UPDATE TO authenticated
  USING  (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_messages" ON messages
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 6. Seed Arsenal tenant identity ──────────────────────────────────────────
-- Migration 011 seeded 'aom' as tenant zero but never seeded 'arsenal'.
-- Without this row, tenant_read_self + shared_rooms policies fail for Ben.

INSERT INTO tenants (id, display_name, plan_tier, access_level, settings)
VALUES (
  'arsenal',
  'Arsenal GPA',
  'pro',
  'owner',
  '{"notes": "Ben Neilson tenant. client_id=arsenal. Seeded by migration 023."}'::jsonb
)
ON CONFLICT (id) DO NOTHING;


-- ── 7. Seed Ben in tenant_users for arsenal ───────────────────────────────────
-- Ben user_id: 429d6c82-3739-4010-a14c-93c6abc0d57f (confirmed from auth.users)
-- Without this row: tenant_users returns 0 for Ben, shared_rooms policy fails.

INSERT INTO tenant_users (tenant_id, user_id, access_level, display_name, slug)
VALUES (
  'arsenal',
  '429d6c82-3739-4010-a14c-93c6abc0d57f'::uuid,
  'owner',
  'Ben',
  'ben'
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;


-- ── 8. Seed Ben in shared_room_members for Arsenal + Sourcing rooms ───────────
-- Room IDs confirmed from live data:
--   Arsenal (Patrik + Ben): 2a3c6d40-7153-469a-97e1-300b868af392
--   Sourcing (Patrik + Ben): 1b1e658e-2be7-4cf8-9f36-0b9b23f6a371
-- Only 'aom' was seeded as member; 'arsenal' was missing → 0 rows for Ben.

INSERT INTO shared_room_members (room_id, tenant_id, role, variable_access, accepted_at)
VALUES
  ('2a3c6d40-7153-469a-97e1-300b868af392'::uuid, 'arsenal', 'member', '{}'::jsonb, now()),
  ('1b1e658e-2be7-4cf8-9f36-0b9b23f6a371'::uuid, 'arsenal', 'member', '{}'::jsonb, now())
ON CONFLICT (room_id, tenant_id) DO NOTHING;


-- ── 9. Seed Ben in world_members for Arsenal world ────────────────────────────
-- Arsenal world_id: 032955f5-8391-40c4-9fb4-270612df359d (confirmed from live)
-- Ben's user_id already in world_members as owner; this is idempotent guard.

INSERT INTO world_members (world_id, user_id, role)
VALUES (
  '032955f5-8391-40c4-9fb4-270612df359d'::uuid,
  '429d6c82-3739-4010-a14c-93c6abc0d57f'::uuid,
  'owner'
)
ON CONFLICT (world_id, user_id) DO NOTHING;


-- ── 10. Remove empty rooms from Ben's sidebar ─────────────────────────────────
-- Spec C option 2: remove agent_status rows for rooms with no backend routing.
-- agent_status confirmed: arsenal has 4 rows (sourcing, arsenal-directory, ea, arsenal)
-- Only 'ea' has message history (160 msgs, last 2026-04-21) and a backend handler.
-- The other 3 render in sidebar but have zero messages and no tmux session.
-- Removing them prevents Ben from clicking into dead rooms.
-- A future task wires the backends; at that point, re-insert these rows.

DELETE FROM agent_status
WHERE client_id = 'arsenal'
  AND slug IN ('sourcing', 'arsenal-directory', 'arsenal');


-- ── Done ─────────────────────────────────────────────────────────────────────
-- Verification queries to run after migration (as Ben via JWT):
--   1. agents:       should return only slugs active in agent_status(client_id='arsenal')
--   2. projects:     should return 1 row (Arsenal project, client_id='arsenal')
--   3. shared_rooms: should return 2 rows (Arsenal + Sourcing)
--   4. worlds:       should return 1 row (Arsenal GPA) with no recursion error
--   5. world_members: should return Ben's row (world_id=032955f5)
--   6. tenant_users: should return Ben's row (tenant_id='arsenal')
--   7. messages INSERT with client_id='arsenal': should succeed (201, not 42501)
