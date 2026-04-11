-- Migration 017: Events table RLS consolidation + stale policy cleanup
-- Run in: Supabase Dashboard > SQL Editor
-- Project: mcngatprgluexjjcqpkp
--
-- Context:
--   Migration 015 added current_client_id()-based RLS to:
--     members, messages, agent_status, tasks, costs, history_search
--
--   The events table was NOT included in 015. It only has policies from:
--     - 010_tenant_isolation_rls.sql (anon_read_aom_events, tenant_own_events using auth.uid()::text)
--     - 20260408000002 (tenant_events using current_setting('app.client_id')::uuid -- incorrect type)
--
--   This migration:
--     1. Adds consistent current_client_id()-based CRUD policies to events (matching 015 pattern)
--     2. Drops stale UUID-based policies from supabase/migrations/20260331000001 and 20260408000002
--        (tenant_tasks, tenant_messages, tenant_agent_status, tenant_events)
--        These used current_setting('app.client_id')::uuid which is never set by the app.
--
-- RLS policy design (matches migration 015 pattern):
--   anon role:          SELECT on client_id = 'aom'
--   authenticated role: explicit SELECT/INSERT/UPDATE/DELETE where client_id matches JWT world claim
--                       via current_client_id() helper function (created in migration 015)
--   service role:       bypasses RLS automatically


-- ── 1. Events table: ensure client_id column + RLS ─────────────────────────────

ALTER TABLE events ADD COLUMN IF NOT EXISTS client_id text NOT NULL DEFAULT 'aom';

UPDATE events SET client_id = 'aom' WHERE client_id IS NULL OR client_id = '';

CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;


-- ── 2. Drop ALL existing events policies (stale + legacy) ──────────────────────

DROP POLICY IF EXISTS "anon_read_aom_events"   ON events;
DROP POLICY IF EXISTS "tenant_own_events"       ON events;
DROP POLICY IF EXISTS "tenant_events"           ON events;   -- UUID-based from 20260408000002
DROP POLICY IF EXISTS "tenant_select_events"    ON events;
DROP POLICY IF EXISTS "tenant_insert_events"    ON events;
DROP POLICY IF EXISTS "tenant_update_events"    ON events;
DROP POLICY IF EXISTS "tenant_delete_events"    ON events;


-- ── 3. Create consistent CRUD policies (matching 015 pattern) ──────────────────

-- anon: AOM dashboard (unauthenticated) — read-only for events
CREATE POLICY "anon_read_aom_events" ON events
  FOR SELECT TO anon
  USING (client_id = 'aom');

-- authenticated: explicit per-operation policies for tenant isolation
CREATE POLICY "tenant_select_events" ON events
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

CREATE POLICY "tenant_insert_events" ON events
  FOR INSERT TO authenticated
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_update_events" ON events
  FOR UPDATE TO authenticated
  USING (client_id = current_client_id())
  WITH CHECK (client_id = current_client_id());

CREATE POLICY "tenant_delete_events" ON events
  FOR DELETE TO authenticated
  USING (client_id = current_client_id());


-- ── 4. Drop stale UUID-based policies from supabase/migrations/20260331000001 ──
-- These use current_setting('app.client_id', TRUE)::uuid which is never set by
-- the application. They silently deny all access (NULL != any uuid), but the
-- text-based policies from 014/015 grant the correct access via OR semantics.
-- Removing them cleans up dead weight and avoids confusion.

DROP POLICY IF EXISTS "tenant_tasks"        ON tasks;
DROP POLICY IF EXISTS "tenant_messages"     ON messages;
DROP POLICY IF EXISTS "tenant_agent_status" ON agent_status;


-- ── Done ────────────────────────────────────────────────────────────────────────
-- Summary:
--   events           -- client_id ensured. Explicit SELECT/INSERT/UPDATE/DELETE RLS
--                       using current_client_id() (matching 015 pattern).
--   tasks            -- Dropped stale UUID-based "tenant_tasks" policy.
--   messages         -- Dropped stale UUID-based "tenant_messages" policy.
--   agent_status     -- Dropped stale UUID-based "tenant_agent_status" policy.
--
-- After this migration, ALL core per-tenant tables have consistent RLS:
--   tasks, messages, agent_status, events, members, costs, history_search
--
-- Verification queries:
--
--   -- 1. Confirm RLS enabled on events
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename = 'events';
--
--   -- 2. List all events policies
--   SELECT policyname, cmd, roles FROM pg_policies
--   WHERE tablename = 'events' ORDER BY cmd;
--
--   -- 3. Confirm NO stale UUID-based policies remain
--   SELECT tablename, policyname FROM pg_policies
--   WHERE policyname IN ('tenant_tasks','tenant_messages','tenant_agent_status','tenant_events');
