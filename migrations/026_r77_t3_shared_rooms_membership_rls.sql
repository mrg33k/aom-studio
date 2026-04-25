-- ============================================================
-- Migration 026: R77-t3 — shared_rooms membership-based RLS (JWT-keyed)
-- Generated: 2026-04-25
-- Mission: corner:tenant-isolation
--
-- Reframed finding F3 (AOM audit, 2026-04-25): shared_rooms visibility was
-- both a data gap (arsenal not seeded into shared_room_members) AND a policy
-- shape mismatch (existing policy joins through tenant_users by auth.uid(),
-- which depends on tenant_users having a row for the caller — fragile and
-- inconsistent with how every other tenant policy in the mission is shaped).
--
-- This migration:
--   1. (Data, idempotent) Re-assert arsenal as a 'member' of the two
--      Patrik+Ben shared rooms (Arsenal, Sourcing). Migration 023 §8 already
--      inserted these with ON CONFLICT DO NOTHING; re-asserting is safe and
--      catches any environment where 023 was partially applied.
--   2. (DDL) Drop ALL existing policies on shared_rooms and shared_room_members
--      (dynamic drop — same pattern as 023b/024 to handle SQL-Editor-applied
--      policy names not tracked here), then recreate JWT-keyed policies that
--      match the rest of the mission:
--        - shared_rooms SELECT: EXISTS membership row for current_client_id()
--        - shared_room_members SELECT: tenant_id = current_client_id()
--
-- JWT claim path (load-bearing): auth.jwt()->'user_metadata'->>'world'.
-- current_client_id() wraps this (defined in migration 023, recreated here
-- as belt-and-suspenders so this migration is replayable in isolation).
--
-- Verification (run as Patrik / Ben / Marcus JWTs after applying):
--   • shared_rooms (Patrik, world=aom):     2 rows
--   • shared_rooms (Ben,    world=arsenal): 2 rows
--   • shared_rooms (Marcus, world=marcus):  0 rows
--   • shared_room_members?tenant_id=eq.<other>: 0 rows for cross-tenant probe
-- ============================================================


-- ── 0. SECURITY DEFINER helper (idempotent recreate, mirrors 023 §0) ─────────

CREATE OR REPLACE FUNCTION current_client_id() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'world',
      auth.uid()::text
    )
  $$;


-- ── 1. Data: re-assert arsenal membership in Patrik+Ben shared rooms ─────────
-- Slug-based lookup (resilient to room_id drift across environments).

INSERT INTO shared_room_members (room_id, tenant_id, role, variable_access, accepted_at)
SELECT id, 'arsenal', 'member', '{}'::jsonb, now()
FROM shared_rooms
WHERE slug IN ('arsenal', 'sourcing')
ON CONFLICT (room_id, tenant_id) DO NOTHING;


-- ── 2. shared_rooms: dynamic drop ALL policies ───────────────────────────────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_rooms'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_rooms', pol.policyname);
    RAISE NOTICE 'Dropped shared_rooms policy: %', pol.policyname;
  END LOOP;
END;
$$;


-- ── 3. shared_rooms: recreate JWT-keyed membership policy ────────────────────

ALTER TABLE shared_rooms ENABLE ROW LEVEL SECURITY;

-- Authenticated: see a room iff the caller's tenant is in shared_room_members.
-- Uses EXISTS (not IN with subquery on shared_room_members) so the planner can
-- short-circuit on the membership row; also avoids any RLS-on-RLS surprises
-- on shared_room_members (its own policy is JWT-keyed below to match).
CREATE POLICY "tenant_select_shared_rooms" ON shared_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shared_room_members srm
      WHERE srm.room_id = shared_rooms.id
        AND srm.tenant_id = current_client_id()
    )
  );


-- ── 4. shared_room_members: dynamic drop ALL policies ────────────────────────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'shared_room_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_room_members', pol.policyname);
    RAISE NOTICE 'Dropped shared_room_members policy: %', pol.policyname;
  END LOOP;
END;
$$;


-- ── 5. shared_room_members: recreate JWT-keyed self-tenant policies ──────────

ALTER TABLE shared_room_members ENABLE ROW LEVEL SECURITY;

-- Authenticated: see only own-tenant membership rows.
CREATE POLICY "tenant_select_shared_room_members" ON shared_room_members
  FOR SELECT TO authenticated
  USING (tenant_id = current_client_id());

-- Authenticated: update own-tenant variable_access (preserves prior intent).
CREATE POLICY "tenant_update_shared_room_members" ON shared_room_members
  FOR UPDATE TO authenticated
  USING  (tenant_id = current_client_id())
  WITH CHECK (tenant_id = current_client_id());

-- Service role bypasses RLS — no policy needed for service-role inserts/admin.


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Post-migration verification (re-run audit-tenant-isolation.py with each JWT):
--   1. shared_rooms (Patrik):     [arsenal, sourcing]
--   2. shared_rooms (Ben):        [arsenal, sourcing]
--   3. shared_rooms (Marcus/QA):  []
--   4. messages cross-tenant (R77-t1 baseline holds):   []
--   5. agent_status cross-tenant (R77-t1 baseline holds): []
