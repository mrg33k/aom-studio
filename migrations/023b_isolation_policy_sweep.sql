-- ============================================================
-- Migration 023b: Isolation policy sweep — drop ALL existing policies
-- on agents/worlds/world_members, then set correct ones.
-- Task: 42836d30-f6d0-478f-b21d-7e98e16371d6
-- Generated: 2026-04-25
--
-- Migration 023 created correct policies but existing policies with
-- unknown names (from SQL-Editor-applied migrations not tracked in
-- schema_migrations) were still active. Permissive policies OR together,
-- so any old USING(true) defeats the new scoped policies.
--
-- This migration uses dynamic SQL to drop ALL policies by name from
-- pg_policies, then recreates only the correct scoped policies.
-- ============================================================


-- ── 1. Drop ALL policies on agents ───────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.agents', pol.policyname);
    RAISE NOTICE 'Dropped agents policy: %', pol.policyname;
  END LOOP;
END;
$$;

-- ── 2. Drop ALL policies on worlds ───────────────────────────────────────────
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

-- ── 3. Drop ALL policies on world_members ─────────────────────────────────────
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


-- ── 4. Recreate agents policies (scoped by agent_status for user's world) ─────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_aom_agents" ON agents
  FOR SELECT TO anon
  USING (slug IN (SELECT agent_slugs_for_world('aom')));

CREATE POLICY "authenticated_read_world_agents" ON agents
  FOR SELECT TO authenticated
  USING (slug IN (SELECT agent_slugs_for_world(current_client_id())));


-- ── 5. Recreate worlds policies (SECURITY DEFINER to avoid recursion) ─────────
ALTER TABLE worlds ENABLE ROW LEVEL SECURITY;

-- Anon: see all active worlds (world selector needs world list)
CREATE POLICY "anon_read_active_worlds" ON worlds
  FOR SELECT TO anon
  USING (true);

-- Authenticated: see only worlds the user is a member of
-- Uses SECURITY DEFINER function current_user_world_ids() to avoid
-- circular dependency with world_members policies.
CREATE POLICY "authenticated_read_own_worlds" ON worlds
  FOR SELECT TO authenticated
  USING (id IN (SELECT current_user_world_ids()));


-- ── 6. Recreate world_members policies (simple user_id check, no join to worlds) ─
ALTER TABLE world_members ENABLE ROW LEVEL SECURITY;

-- Simple user_id check: no reference to worlds table, so no recursion.
CREATE POLICY "authenticated_read_own_memberships" ON world_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
