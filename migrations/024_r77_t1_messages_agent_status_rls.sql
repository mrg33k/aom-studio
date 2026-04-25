-- ============================================================
-- Migration 024: R77-t1 — messages + agent_status cross-tenant SELECT leak fix
-- Task: 3ae66986-e109-4687-9d2f-1de0ef9fe438
-- Generated: 2026-04-25
-- Mission: corner:tenant-isolation
--
-- Critical finding F7: messages has no per-row tenant SELECT gate.
-- Any authenticated user can read any tenant's messages by filtering on client_id.
-- Confirmed: Patrik (world=aom) reads arsenal + marcus messages; Marcus reads arsenal.
--
-- Additional finding: agent_status has no RLS at all (anon + any auth can read all rows).
--
-- JWT claim path (load-bearing): auth.jwt()->'user_metadata'->>'world'
-- current_client_id() already wraps this (defined in migration 023).
--
-- Pattern: dynamic drop ALL policies on each table first (same as 023b for agents/worlds),
-- then recreate. Static DROP IF EXISTS is fragile — unknown policy names from prior
-- SQL-editor sessions will remain active and OR-chain with the new scoped policies.
-- ============================================================


-- ── 1. messages: dynamic drop ALL policies ─────────────────────────────────────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', pol.policyname);
    RAISE NOTICE 'Dropped messages policy: %', pol.policyname;
  END LOOP;
END;
$$;


-- ── 2. messages: recreate scoped policies ──────────────────────────────────────

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Anon: AOM only (public widget / demo path)
CREATE POLICY "anon_read_aom_messages" ON messages
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_messages" ON messages
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

-- Authenticated: own tenant only (the SELECT gate that was missing / bypassed)
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


-- ── 3. agent_status: dynamic drop ALL policies (none exist today, belt+suspenders) ──

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agent_status'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.agent_status', pol.policyname);
    RAISE NOTICE 'Dropped agent_status policy: %', pol.policyname;
  END LOOP;
END;
$$;


-- ── 4. agent_status: enable RLS and add scoped SELECT ─────────────────────────
-- agent_status has no RLS today — any user (including anon) can read all tenant rows.
-- The SECURITY DEFINER function agent_slugs_for_world() bypasses RLS so it is unaffected.
-- Dashboard reads agent_status?client_id=eq.<world> via authenticated session — safe.

ALTER TABLE agent_status ENABLE ROW LEVEL SECURITY;

-- Authenticated: own tenant only
CREATE POLICY "tenant_select_agent_status" ON agent_status
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());

-- Service role (bypasses RLS): no policy needed; Supabase service_role skips RLS entirely.


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Post-migration verification (run as authenticated Patrik / Ben / Marcus JWTs):
--   1. messages?client_id=eq.<own>    → rows (expected)
--   2. messages?client_id=eq.<other>  → 0 rows (leak closed)
--   3. agent_status?client_id=eq.<own>    → rows (expected)
--   4. agent_status?client_id=eq.<other>  → 0 rows (leak closed)
