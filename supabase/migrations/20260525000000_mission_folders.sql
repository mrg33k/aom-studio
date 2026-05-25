-- Mission folders — corner:right-menu R7
-- One level deep: project → folder → missions. No nesting (yet).
-- Reads gated by auth.jwt() world claim (mirrors missions table pattern).
-- Writes go through service-role API endpoints; dashboard JWT cannot
-- write directly.

CREATE TABLE IF NOT EXISTS public.mission_folders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world        text NOT NULL DEFAULT 'aom',
  project_slug text NOT NULL,
  slug         text NOT NULL,
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id),
  UNIQUE (world, project_slug, slug)
);

CREATE INDEX IF NOT EXISTS mission_folders_world_project_idx
  ON public.mission_folders (world, project_slug);

ALTER TABLE public.mission_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mission_folders_select_own_world ON public.mission_folders;
CREATE POLICY mission_folders_select_own_world ON public.mission_folders
  FOR SELECT TO authenticated
  USING (world = COALESCE((auth.jwt() ->> 'world')::text, 'aom'));

DROP POLICY IF EXISTS mission_folders_insert_block ON public.mission_folders;
CREATE POLICY mission_folders_insert_block ON public.mission_folders
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS mission_folders_update_block ON public.mission_folders;
CREATE POLICY mission_folders_update_block ON public.mission_folders
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS mission_folders_delete_block ON public.mission_folders;
CREATE POLICY mission_folders_delete_block ON public.mission_folders
  FOR DELETE TO authenticated USING (false);

COMMENT ON TABLE public.mission_folders IS 'Per-project sub-folders for missions. corner:right-menu R7.';


-- Mission → folder assignments. One row per mission. folder_slug NULL = ungrouped.
CREATE TABLE IF NOT EXISTS public.mission_folder_assignments (
  world        text NOT NULL DEFAULT 'aom',
  project_slug text NOT NULL,
  mission_slug text NOT NULL,
  folder_slug  text,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES auth.users(id),
  PRIMARY KEY (world, project_slug, mission_slug)
);

CREATE INDEX IF NOT EXISTS mission_folder_assignments_folder_idx
  ON public.mission_folder_assignments (world, project_slug, folder_slug)
  WHERE folder_slug IS NOT NULL;

ALTER TABLE public.mission_folder_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mission_folder_assignments_select_own_world ON public.mission_folder_assignments;
CREATE POLICY mission_folder_assignments_select_own_world ON public.mission_folder_assignments
  FOR SELECT TO authenticated
  USING (world = COALESCE((auth.jwt() ->> 'world')::text, 'aom'));

DROP POLICY IF EXISTS mission_folder_assignments_write_block ON public.mission_folder_assignments;
CREATE POLICY mission_folder_assignments_write_block ON public.mission_folder_assignments
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.mission_folder_assignments IS 'Mission → folder mapping. Latest row wins per mission. corner:right-menu R7.';
