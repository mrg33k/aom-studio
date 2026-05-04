-- 031_project_access_rls.sql
-- shared-rooms SR1: RLS policies for project_access + cross-world projects visibility.
-- Task 32df28d5-0d16-4976-93a7-3ea59d3bae00
--
-- Fixes two gaps from the MVP slice plan:
--   (A) project_access had ENABLE ROW LEVEL SECURITY but no SELECT policy —
--       invited tenants couldn't read their own grant rows.
--   (B) projects SELECT policy (from 029) only allowed owned or admin — no
--       OR-EXISTS on project_access, so cross-tenant invitees couldn't see
--       the shared project rows even with a valid project_access entry.
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql

-- ── A. project_access: SELECT policy for invited tenants ─────────────────────
-- Allow a tenant to see their own grant rows (the ones scoped to their client_id).
-- INSERT/UPDATE/DELETE stay service-role-only; owner grants happen via project-invite.js.

CREATE POLICY "tenant_select_own_access" ON project_access
  FOR SELECT TO authenticated
  USING (client_id = current_client_id());


-- ── B. projects: extend SELECT policy with OR-EXISTS on project_access ────────
-- Migration 029 set tenant_select_projects to: owned by me OR I'm a world admin.
-- Add a third leg: I have a project_access row for this project.

DROP POLICY IF EXISTS "tenant_select_projects" ON public.projects;

CREATE POLICY "tenant_select_projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    client_id = current_client_id()
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM project_access pa
      WHERE pa.project_id = projects.id
        AND pa.client_id = current_client_id()
    )
  );
