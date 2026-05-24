-- 035_shared_rooms_messages_rls.sql
-- Allow collaborators to read messages from shared project channels.
--
-- Problem: tenant_select_messages only allows client_id = current_client_id().
-- When a project has collaborators, messages are written with
-- client_id = 'shared:<slug>'. Collaborators' browsers query for those rows
-- but RLS silently drops them — the room shows empty.
--
-- Fix: add a third leg — if client_id starts with 'shared:', allow SELECT
-- for any authenticated user who has a project_access row for that project.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql

DROP POLICY IF EXISTS "tenant_select_messages" ON public.messages;

CREATE POLICY "tenant_select_messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    -- Own world
    client_id = current_client_id()
    -- World admin
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
    -- Collaborator reading a shared project channel (client_id = 'shared:<slug>')
    OR (
      client_id LIKE 'shared:%'
      AND EXISTS (
        SELECT 1
        FROM project_access pa
        JOIN projects p ON p.id = pa.project_id
        WHERE pa.client_id = current_client_id()
          AND messages.project = p.slug
      )
    )
  );

-- Also allow collaborators to INSERT into shared channels so they can send messages.
DROP POLICY IF EXISTS "tenant_insert_messages" ON public.messages;

CREATE POLICY "tenant_insert_messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Own world
    client_id = current_client_id()
    -- Collaborator writing to a shared project channel
    OR (
      client_id LIKE 'shared:%'
      AND EXISTS (
        SELECT 1
        FROM project_access pa
        JOIN projects p ON p.id = pa.project_id
        WHERE pa.client_id = current_client_id()
          AND messages.project = p.slug
      )
    )
  );
