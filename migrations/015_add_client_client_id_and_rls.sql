-- Migration 015: Multi-Tenant client_id + RLS Foundation
-- Run in: Supabase Dashboard > SQL Editor
-- Project: mcngatprgluexjjcqpkp
--
-- Context:
--   Prior migrations already added client_id + RLS to:
--     messages, agent_status (010_tenant_isolation_rls.sql in AOM-EA)
--     tasks (014_enforce_world_id_rls.sql)
--   This migration completes tenant isolation for remaining core tables:
--     members, costs, history_search
--   And reinforces existing policies on messages, agent_status, tasks
--   with full explicit CRUD coverage (select, insert, update, delete).
--
-- Type: client_id is TEXT (matches existing schema used in migrations 010 and 014).
--   The plan references UUID but TEXT is used for consistency with the existing system.
--   client_id values are world slugs (e.g. 'aom', 'acme') not UUID v4 strings.
--
-- RLS policy design (matches migration 014 pattern):
--   anon role:          SELECT/INSERT on client_id = 'aom'
--   authenticated role: explicit SELECT/INSERT/UPDATE/DELETE where client_id matches JWT world claim
--                       COALESCE(auth.jwt() -> 'user_metadata' ->> 'world', auth.uid()::text)
--   service role:       bypasses RLS automatically (agents use service role key)
--
-- Note on JWT claim: The plan references request.jwt.claims.world_id.
--   In Supabase postgres, this resolves to auth.jwt() -> 'user_metadata' ->> 'world'
--   per the existing JWT structure set during onboarding (see migration 014).


-- ── Helper: JWT world claim extractor ────────────────────────────────────────
-- Centralises the claim resolution so all policies read the same value.
-- Returns the world slug from JWT metadata, falling back to auth.uid()::text.
CREATE OR REPLACE FUNCTION current_client_id() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  AS $$
    SELECT COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'world',
      auth.uid()::text
    )
  $$;


-- ── 1. members table ──────────────────────────────────────────────────────────
-- Represents Corner platform users/members within a tenant world.

CREATE TABLE IF NOT EXISTS members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    text        NOT NULL DEFAULT 'aom',
  user_id      uuid,                         -- links to auth.users
  email        text,
  display_name text,
  role         text        DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status       text        DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  metadata     jsonb       DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE members ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE members SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_members_client_id ON members(client_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id   ON members(user_id);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_members"     ON members;
DROP POLICY IF EXISTS "anon_insert_aom_members"   ON members;
DROP POLICY IF EXISTS "tenant_select_members"     ON members;
DROP POLICY IF EXISTS "tenant_insert_members"     ON members;
DROP POLICY IF EXISTS "tenant_update_members"     ON members;
DROP POLICY IF EXISTS "tenant_delete_members"     ON members;
-- Legacy policy names from earlier attempt
DROP POLICY IF EXISTS "tenant_own_members"        ON members;

-- anon: AOM dashboard (unauthenticated)
CREATE POLICY "anon_read_aom_members" ON members
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_members" ON members
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

-- authenticated: explicit per-operation policies for tenant isolation
CREATE POLICY "tenant_select_members" ON members
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_members" ON members
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_members" ON members
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_members" ON members
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 2. messages table ─────────────────────────────────────────────────────────
-- client_id already exists from migration 010. Reinforce with explicit CRUD policies.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE messages SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_messages"   ON messages;
DROP POLICY IF EXISTS "anon_insert_aom_messages" ON messages;
DROP POLICY IF EXISTS "tenant_select_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_insert_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_update_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_delete_messages"   ON messages;
DROP POLICY IF EXISTS "tenant_own_messages"      ON messages;

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
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_messages" ON messages
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 3. agent_status table ─────────────────────────────────────────────────────
-- client_id already exists from migration 010. Reinforce with explicit CRUD policies.

ALTER TABLE agent_status ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE agent_status SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_agent_status_client_id ON agent_status(client_id);

ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_agent_status"   ON agent_status;
DROP POLICY IF EXISTS "anon_insert_aom_agent_status" ON agent_status;
DROP POLICY IF EXISTS "tenant_select_agent_status"   ON agent_status;
DROP POLICY IF EXISTS "tenant_insert_agent_status"   ON agent_status;
DROP POLICY IF EXISTS "tenant_update_agent_status"   ON agent_status;
DROP POLICY IF EXISTS "tenant_delete_agent_status"   ON agent_status;
DROP POLICY IF EXISTS "tenant_own_agent_status"      ON agent_status;

CREATE POLICY "anon_read_aom_agent_status" ON agent_status
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_agent_status" ON agent_status
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_agent_status" ON agent_status
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_agent_status" ON agent_status
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_agent_status" ON agent_status
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_agent_status" ON agent_status
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 4. tasks table ────────────────────────────────────────────────────────────
-- client_id already exists from migration 014. Reinforce with explicit CRUD policies.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE tasks SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
-- Composite index for the most common dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_tasks_client_status
  ON tasks(client_id, status, priority DESC, sort_order ASC);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_tasks"   ON tasks;
DROP POLICY IF EXISTS "anon_insert_aom_tasks" ON tasks;
DROP POLICY IF EXISTS "tenant_select_tasks"   ON tasks;
DROP POLICY IF EXISTS "tenant_insert_tasks"   ON tasks;
DROP POLICY IF EXISTS "tenant_update_tasks"   ON tasks;
DROP POLICY IF EXISTS "tenant_delete_tasks"   ON tasks;
DROP POLICY IF EXISTS "tenant_own_tasks"      ON tasks;

CREATE POLICY "anon_read_aom_tasks" ON tasks
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_tasks" ON tasks
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_tasks" ON tasks
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_tasks" ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_tasks" ON tasks
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_tasks" ON tasks
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 5. costs table ───────────────────────────────────────────────────────────
-- Tracks per-tenant API/token/compute costs for billing and monitoring.

CREATE TABLE IF NOT EXISTS costs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     text        NOT NULL DEFAULT 'aom',
  agent_slug    text,
  model         text,
  input_tokens  integer     DEFAULT 0,
  output_tokens integer     DEFAULT 0,
  cost_usd      numeric(10, 6) DEFAULT 0,
  task_id       uuid,
  session_id    text,
  recorded_at   timestamptz DEFAULT now()
);

ALTER TABLE costs ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE costs SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_costs_client_id   ON costs(client_id);
CREATE INDEX IF NOT EXISTS idx_costs_recorded_at ON costs(client_id, recorded_at DESC);

ALTER TABLE costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_costs"   ON costs;
DROP POLICY IF EXISTS "anon_insert_aom_costs" ON costs;
DROP POLICY IF EXISTS "tenant_select_costs"   ON costs;
DROP POLICY IF EXISTS "tenant_insert_costs"   ON costs;
DROP POLICY IF EXISTS "tenant_update_costs"   ON costs;
DROP POLICY IF EXISTS "tenant_delete_costs"   ON costs;
DROP POLICY IF EXISTS "tenant_own_costs"      ON costs;

CREATE POLICY "anon_read_aom_costs" ON costs
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_costs" ON costs
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_costs" ON costs
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_costs" ON costs
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_costs" ON costs
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_costs" ON costs
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 6. history_search table ───────────────────────────────────────────────────
-- Stores per-tenant search/RAG query history for audit and UX recall.

CREATE TABLE IF NOT EXISTS history_search (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    text        NOT NULL DEFAULT 'aom',
  user_id      uuid,
  query        text        NOT NULL,
  results      jsonb       DEFAULT '[]'::jsonb,
  result_count integer     DEFAULT 0,
  source       text        DEFAULT 'rag' CHECK (source IN ('rag', 'supabase', 'web')),
  session_id   text,
  searched_at  timestamptz DEFAULT now()
);

ALTER TABLE history_search ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE history_search SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_history_search_client_id   ON history_search(client_id);
CREATE INDEX IF NOT EXISTS idx_history_search_searched_at ON history_search(client_id, searched_at DESC);

ALTER TABLE history_search ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_aom_history_search"   ON history_search;
DROP POLICY IF EXISTS "anon_insert_aom_history_search" ON history_search;
DROP POLICY IF EXISTS "tenant_select_history_search"   ON history_search;
DROP POLICY IF EXISTS "tenant_insert_history_search"   ON history_search;
DROP POLICY IF EXISTS "tenant_update_history_search"   ON history_search;
DROP POLICY IF EXISTS "tenant_delete_history_search"   ON history_search;
DROP POLICY IF EXISTS "tenant_own_history_search"      ON history_search;

CREATE POLICY "anon_read_aom_history_search" ON history_search
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_history_search" ON history_search
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_history_search" ON history_search
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_history_search" ON history_search
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_history_search" ON history_search
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_history_search" ON history_search
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Summary:
--   members          -- Created (IF NOT EXISTS). client_id TEXT NOT NULL + explicit CRUD RLS.
--   messages         -- client_id ensured (idempotent). Explicit SELECT/INSERT/UPDATE/DELETE RLS.
--   agent_status     -- client_id ensured (idempotent). Explicit SELECT/INSERT/UPDATE/DELETE RLS.
--   tasks            -- client_id ensured (idempotent). Explicit SELECT/INSERT/UPDATE/DELETE RLS.
--   costs            -- Created (IF NOT EXISTS). client_id + explicit CRUD RLS. Billing ready.
--   history_search   -- Created (IF NOT EXISTS). client_id + explicit CRUD RLS. RAG history ready.
--
-- Service role (agents, scripts using SUPABASE_SERVICE_ROLE_KEY) bypasses all RLS.
-- Existing AOM data (client_id='aom') remains accessible to current anon dashboard.
-- New tenant users see only their own world's data.
--
-- Verification queries (run after migration):
--
--   -- 1. Confirm RLS is enabled on all six tables
--   SELECT table_name, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename IN ('members','messages','agent_status','tasks','costs','history_search');
--
--   -- 2. List all policies on these tables
--   SELECT tablename, policyname, cmd, roles
--   FROM pg_policies
--   WHERE tablename IN ('members','messages','agent_status','tasks','costs','history_search')
--   ORDER BY tablename, cmd;
--
--   -- 3. Confirm client_id column exists and is NOT NULL on each table
--   SELECT table_name, column_name, data_type, is_nullable, column_default
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name   IN ('members','messages','agent_status','tasks','costs','history_search')
--     AND column_name = 'client_id';
--
--   -- 4. Confirm indexes exist
--   SELECT indexname, tablename, indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND tablename   IN ('members','messages','agent_status','tasks','costs','history_search')
--   ORDER BY tablename, indexname;


-- ── Post-migration assertion block ────────────────────────────────────────────
-- Runs inline at migration time. Raises an exception (rolling back the
-- transaction) if the schema is not in the expected state after the migration.
DO $$
DECLARE
  missing_col  text;
  rls_disabled text;
  missing_fn   integer;
BEGIN
  -- 1. Verify current_client_id() helper function exists
  SELECT COUNT(*) INTO missing_fn
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'current_client_id';

  IF missing_fn = 0 THEN
    RAISE EXCEPTION 'Migration 015: current_client_id() function not found in public schema';
  END IF;

  -- 2. Verify client_id column exists on all six tables
  SELECT string_agg(tbl, ', ' ORDER BY tbl) INTO missing_col
  FROM (
    SELECT unnest(ARRAY['members','messages','agent_status','tasks','costs','history_search']) AS tbl
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = t.tbl
      AND column_name  = 'client_id'
  );

  IF missing_col IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 015: client_id column missing on table(s): %', missing_col;
  END IF;

  -- 3. Verify RLS is enabled on all six tables
  SELECT string_agg(tablename, ', ' ORDER BY tablename) INTO rls_disabled
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('members','messages','agent_status','tasks','costs','history_search')
    AND rowsecurity = false;

  IF rls_disabled IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 015: RLS not enabled on table(s): %', rls_disabled;
  END IF;

  -- 4. Verify at least one policy exists on each table
  SELECT string_agg(tbl, ', ' ORDER BY tbl) INTO missing_col
  FROM (
    SELECT unnest(ARRAY['members','messages','agent_status','tasks','costs','history_search']) AS tbl
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = t.tbl
  );

  IF missing_col IS NOT NULL THEN
    RAISE EXCEPTION 'Migration 015: No RLS policies found on table(s): %', missing_col;
  END IF;

  RAISE NOTICE 'Migration 015 validation passed: client_id column, RLS enabled, and policies confirmed on members, messages, agent_status, tasks, costs, history_search.';
END;
$$;
