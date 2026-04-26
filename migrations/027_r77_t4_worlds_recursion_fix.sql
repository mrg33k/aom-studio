-- ============================================================
-- Migration 027: R77-t4 — worlds recursion via SECURITY DEFINER fn
-- Generated: 2026-04-25
-- Mission: corner:tenant-isolation
--
-- Finding F4 (from research/2026-04-25-aom-isolation-audit.md):
-- worlds had a recursive policy that joined via world_members, while
-- world_members joined back to worlds → 42P17 infinite recursion for any
-- caller without a privileged role row terminating the chain.
--
-- Migration 023 §1-2 introduced current_user_world_ids() and a worlds
-- policy `authenticated_read_own_worlds` that uses it; whether all of 023
-- actually applied is uncertain (parts landed via SQL editor with mixed
-- success). t4 ships a clean replacement using a SECURITY DEFINER
-- predicate function `is_world_member(world_uuid, user_uuid)` and
-- guarantees correctness via the dynamic-drop pattern (mirror of 024).
--
-- Why option (a) and not option (b) JWT-denormalization:
-- production JWTs carry only user_metadata->>'world' (single slug).
-- They do NOT carry world_members data, so the policy cannot read
-- membership from the JWT. SDF predicate is the only working shape.
--
-- worlds.client_id is the OWNER user_id (UUID), NOT the tenant slug.
-- Do not use current_client_id() (returns slug) here.
--
-- Pre-flight (2026-04-25, R77-t4):
--   - Ben (429d6c82-…) has 1 world_members row: arsenal, role=owner.
--   - Patrik (833f6828-…) has 3 world_members rows: aom owner, qa owner,
--     marcus admin. No arsenal membership.
--   - 5 worlds total: aom, qa, marcus, arsenal, accept-r8a-free.
-- ============================================================


-- ── 1. is_world_member: SECURITY DEFINER predicate ────────────────────────────
-- Returns true iff (world_uuid, user_uuid) is a row in world_members.
-- DEFINER rights bypass world_members RLS so the worlds policy can call this
-- without re-entering its policy chain (the recursion fix).
-- STABLE = same input → same output within a statement (planner can cache).
-- search_path='' = security hardening; fully qualify all references.

CREATE OR REPLACE FUNCTION public.is_world_member(world_uuid uuid, user_uuid uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.world_members
    WHERE world_id = world_uuid AND user_id = user_uuid
  )
$$;


-- ── 2. worlds: dynamic drop ALL policies, recreate scoped ────────────────────
-- Static DROP IF EXISTS is fragile when prior SQL-editor sessions left
-- unknown policy names. Dynamic-drop guarantees a clean slate.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'worlds'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.worlds', pol.policyname);
    RAISE NOTICE 'Dropped worlds policy: %', pol.policyname;
  END LOOP;
END;
$$;

ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;

-- Anon: see all active worlds (world selector / signup needs the full list).
CREATE POLICY "anon_read_active_worlds" ON public.worlds
  FOR SELECT TO anon
  USING (status = 'active');

-- Authenticated: see only worlds the user is a member of.
-- is_world_member bypasses RLS on world_members so no recursion possible.
CREATE POLICY "tenant_select_worlds" ON public.worlds
  FOR SELECT TO authenticated
  USING (public.is_world_member(id, auth.uid()));


-- ── 3. world_members: dynamic drop ALL, recreate user-keyed self-read ────────
-- The simple USING (user_id = auth.uid()) policy does NOT join to worlds,
-- so even if worlds policy calls is_world_member() (which reads world_members
-- with DEFINER rights), there is no policy cycle.

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'world_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.world_members', pol.policyname);
    RAISE NOTICE 'Dropped world_members policy: %', pol.policyname;
  END LOOP;
END;
$$;

ALTER TABLE public.world_members ENABLE ROW LEVEL SECURITY;

-- Authenticated: see only own membership rows.
CREATE POLICY "tenant_select_own_memberships" ON public.world_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());


-- ── Done ──────────────────────────────────────────────────────────────────────
-- Post-migration verification (run as authenticated Patrik / Ben JWTs):
--   1. GET worlds (no filter, Patrik) → 3 rows: aom, qa, marcus
--   2. GET worlds (no filter, Ben)    → 1 row : arsenal
--   3. GET worlds?slug=eq.arsenal (Patrik) → 0 rows (cross-tenant denied)
--   4. GET worlds?slug=eq.aom     (Ben)    → 0 rows (cross-tenant denied)
--   5. GET world_members (no filter, Patrik) → 3 own rows, 0 cross-user
--   6. GET world_members (no filter, Ben)    → 1 own row,  0 cross-user
--   7. No 42P17 recursion error from any caller.
