-- ============================================================
-- Migration 029: R77-t11 — super-admin RLS path
-- Generated: 2026-04-25
-- Mission: corner:tenant-isolation
--
-- Patrik clarified mid-session: "I'm a secondary user in every world for now
-- with full admin, I should be able to see all conversations and if I reply
-- it should be as myself."
--
-- Symptom that triggered the round: Patrik cookie-switches to arsenal, the
-- world switcher updates the cookie but NOT auth.users.user_metadata.world
-- (immutable per session). RLS keys off the JWT — current_client_id() returns
-- 'aom' regardless of cookie. Result: arsenal chats render empty for Patrik.
--
-- Fix shape (replaces the JWT-refresh framing):
--   1. Seed world_members(arsenal, patrik, role='admin') and any other world
--      Patrik isn't already in. Idempotent.
--   2. SECURITY DEFINER predicate is_world_admin_for_tenant(tenant_slug, uid).
--   3. OR-extend every tenant-scoped policy (SELECT/INSERT/UPDATE/DELETE) so
--      admins of the tenant's world can also pass the gate. Primary path
--      (client_id = current_client_id()) unchanged → Ben's own login still
--      works via his JWT.
--
-- Affected tables: messages, agent_status, projects, shared_rooms,
-- shared_room_members, tasks. Skipped: tenant_users (R77-t5 will add the
-- base self-policy first), text_files (table does not exist), worlds +
-- world_members (R77-t4 already correct via is_world_member; the seed in §1
-- gives Patrik membership so is_world_member passes for arsenal).
--
-- Pattern: dynamic-drop ALL policies then recreate (mirror of 024/026/027) so
-- residual SQL-editor policies don't OR-chain stale predicates.
--
-- Pre-flight verified from prior migrations + tape:
--   • Patrik sub: 833f6828-1dae-409c-a24b-1438f46544d0 (also live in
--     api/worlds/*.js as SUPER_ADMIN_USER_ID; safe constant).
--   • Patrik world_members: aom owner, qa owner, marcus admin. Missing arsenal.
--   • Ben world_members: arsenal owner.
--   • All five worlds (aom, qa, marcus, arsenal, accept-r8a-free) exist.
-- ============================================================


-- ── 0. current_client_id (idempotent recreate; mirror of 026 §0) ─────────────
-- Belt-and-suspenders so this migration is replayable in isolation.

CREATE OR REPLACE FUNCTION current_client_id() RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT COALESCE(
      auth.jwt() -> 'user_metadata' ->> 'world',
      auth.uid()::text
    )
  $$;


-- ── 1. is_world_admin_for_tenant: SECURITY DEFINER predicate ─────────────────
-- Returns true iff user_uuid has role IN ('owner','admin') in the world whose
-- slug = tenant_slug. SECURITY DEFINER bypasses world_members RLS (which is
-- non-recursive after R77-t4: it's user-keyed self-read only).
-- Mirrors the is_world_member shape from migration 027.
-- search_path='' = security hardening; fully qualify all references.

CREATE OR REPLACE FUNCTION public.is_world_admin_for_tenant(tenant_slug text, user_uuid uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.world_members wm
    JOIN public.worlds w ON w.id = wm.world_id
    WHERE w.slug = tenant_slug
      AND wm.user_id = user_uuid
      AND wm.role IN ('owner', 'admin')
  )
$$;


-- ── 2. Data seed: Patrik as admin in every world he isn't already in ─────────
-- Slug-resilient via subquery (no hardcoded UUIDs except Patrik's own sub,
-- which is a stable platform constant — already lives in api/worlds/*.js as
-- SUPER_ADMIN_USER_ID).
-- Currently: aom (owner), qa (owner), marcus (admin) already present.
-- Will INSERT: arsenal, accept-r8a-free (and any future world).

INSERT INTO public.world_members (world_id, user_id, role)
SELECT w.id, '833f6828-1dae-409c-a24b-1438f46544d0'::uuid, 'admin'
FROM public.worlds w
WHERE NOT EXISTS (
  SELECT 1 FROM public.world_members wm
  WHERE wm.world_id = w.id
    AND wm.user_id = '833f6828-1dae-409c-a24b-1438f46544d0'::uuid
);


-- ── 3. messages: dynamic-drop + recreate with admin OR-path ──────────────────

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

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_aom_messages" ON public.messages
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_messages" ON public.messages
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_insert_messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_update_messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  )
  WITH CHECK (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_delete_messages" ON public.messages
  FOR DELETE TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );


-- ── 4. agent_status: dynamic-drop + recreate with admin OR-path ──────────────

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

ALTER TABLE public.agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_agent_status" ON public.agent_status
  FOR SELECT TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );


-- ── 5. projects: dynamic-drop + recreate with admin OR-path ──────────────────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.projects', pol.policyname);
    RAISE NOTICE 'Dropped projects policy: %', pol.policyname;
  END LOOP;
END;
$$;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_aom_projects" ON public.projects
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "tenant_select_projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_insert_projects" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_update_projects" ON public.projects
  FOR UPDATE TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  )
  WITH CHECK (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_delete_projects" ON public.projects
  FOR DELETE TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );


-- ── 6. shared_rooms: dynamic-drop + recreate with admin OR-path ──────────────
-- Special: existing policy uses EXISTS subquery on shared_room_members.
-- Admin path mirrors the same EXISTS but checks membership of any tenant the
-- caller is admin of.

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

ALTER TABLE public.shared_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_shared_rooms" ON public.shared_rooms
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_room_members srm
      WHERE srm.room_id = shared_rooms.id
        AND (
          srm.tenant_id = current_client_id()
          OR public.is_world_admin_for_tenant(srm.tenant_id, auth.uid())
        )
    )
  );


-- ── 7. shared_room_members: dynamic-drop + recreate with admin OR-path ───────

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

ALTER TABLE public.shared_room_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_shared_room_members" ON public.shared_room_members
  FOR SELECT TO authenticated
  USING (
    tenant_id = current_client_id()
    OR public.is_world_admin_for_tenant(tenant_id, auth.uid())
  );

CREATE POLICY "tenant_update_shared_room_members" ON public.shared_room_members
  FOR UPDATE TO authenticated
  USING (
    tenant_id = current_client_id()
    OR public.is_world_admin_for_tenant(tenant_id, auth.uid())
  )
  WITH CHECK (
    tenant_id = current_client_id()
    OR public.is_world_admin_for_tenant(tenant_id, auth.uid())
  );


-- ── 8. tasks: dynamic-drop + recreate with admin OR-path ─────────────────────

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tasks', pol.policyname);
    RAISE NOTICE 'Dropped tasks policy: %', pol.policyname;
  END LOOP;
END;
$$;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_aom_tasks" ON public.tasks
  FOR SELECT TO anon
  USING (client_id = 'aom');

CREATE POLICY "anon_insert_aom_tasks" ON public.tasks
  FOR INSERT TO anon
  WITH CHECK (client_id = 'aom');

CREATE POLICY "tenant_select_tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_insert_tasks" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_update_tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  )
  WITH CHECK (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );

CREATE POLICY "tenant_delete_tasks" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
  );


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Post-migration verification (Patrik JWT, world=aom):
--   1. messages?client_id=eq.arsenal  → 310 rows (admin path passes)
--   2. agent_status?client_id=eq.arsenal → 6 visible (1 super EA + 5 projects)
--   3. projects?client_id=eq.arsenal  → 6 rows (arsenal + 5 projects)
--   4. shared_rooms (no filter)       → both AOM rooms + arsenal rooms
--   5. tasks?client_id=eq.arsenal     → 1 row (arsenal-directory)
--
-- Post-migration verification (Ben JWT, world=arsenal):
--   1. messages?client_id=eq.arsenal  → 310 rows (primary path unchanged)
--   2. messages?client_id=eq.aom      → 0 rows (R77-t1 baseline holds)
--   3. agent_status?client_id=eq.aom  → 0 rows (cross-tenant denied)
--
-- Post-migration verification (Marcus JWT, world=marcus):
--   1. messages?client_id=eq.arsenal  → 0 rows (Marcus is NOT a world admin
--      anywhere except marcus, so admin path doesn't pass for arsenal)
--
-- Insert path verify (Patrik cookie-switched to arsenal, posts via dashboard):
--   - row inserts client_id='arsenal', user_id=833f6828-…  (Patrik's sub)
--   - NOT impersonating Ben (auth.uid() comes from Patrik's JWT).
