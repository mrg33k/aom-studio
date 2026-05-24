-- 036_shared_rooms_owner_read.sql
-- Add a fourth leg to messages RLS: the project's OWNER (whose world matches
-- p.client_id) can also read/write the project's shared:<slug> channel.
--
-- Why: migration 035 only let collaborators (rows in project_access) read the
-- shared channel. But when a project owner shares their project, they remain
-- the owner -- no project_access row exists for them. With M10's dual-channel
-- read on the frontend, the owner's browser queries BOTH the world channel
-- AND shared:<slug>. Without this fourth leg the owner reads zero rows from
-- the shared channel and the room appears empty.
--
-- Concrete repro pre-fix: Ben (arsenal world) owns Space Rising. The project
-- has 92 messages under shared:space-rising and 0 under arsenal. Ben's
-- dual-channel fetch was returning 0 rows -- the shared channel was being
-- silently filtered by RLS because Ben has no project_access row for his own
-- project.
--
-- Applied to production via Chrome MCP on 2026-05-23 before this file
-- landed in the repo. This file is the durable record.

DROP POLICY IF EXISTS "tenant_select_messages" ON public.messages;

CREATE POLICY "tenant_select_messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    -- 1. own world
    client_id = current_client_id()
    -- 2. world admin
    OR public.is_world_admin_for_tenant(client_id, auth.uid())
    -- 3. collaborator reading the shared channel
    OR (
      client_id LIKE 'shared:%'
      AND EXISTS (
        SELECT 1 FROM project_access pa
        JOIN projects p ON p.id = pa.project_id
        WHERE pa.client_id = current_client_id()
          AND messages.project = p.slug
      )
    )
    -- 4. project OWNER reading the shared channel for their own project
    OR (
      client_id LIKE 'shared:%'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.client_id = current_client_id()
          AND messages.project = p.slug
      )
    )
  );

DROP POLICY IF EXISTS "tenant_insert_messages" ON public.messages;

CREATE POLICY "tenant_insert_messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    -- 1. own world
    client_id = current_client_id()
    -- 2. collaborator writing to the shared channel
    OR (
      client_id LIKE 'shared:%'
      AND EXISTS (
        SELECT 1 FROM project_access pa
        JOIN projects p ON p.id = pa.project_id
        WHERE pa.client_id = current_client_id()
          AND messages.project = p.slug
      )
    )
    -- 3. project OWNER writing to the shared channel for their own project
    OR (
      client_id LIKE 'shared:%'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.client_id = current_client_id()
          AND messages.project = p.slug
      )
    )
  );
