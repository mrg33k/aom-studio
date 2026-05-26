-- Mission folders subfolder support — corner:mission-panel R-MP-2
-- Adds parent_folder_slug so folders can nest under each other.
-- NULL parent_folder_slug = top-level folder (default). Otherwise points to
-- another mission_folders.slug within the same world+project_slug scope.

ALTER TABLE public.mission_folders
  ADD COLUMN IF NOT EXISTS parent_folder_slug text NULL;

CREATE INDEX IF NOT EXISTS mission_folders_parent_idx
  ON public.mission_folders (world, project_slug, parent_folder_slug)
  WHERE parent_folder_slug IS NOT NULL;

COMMENT ON COLUMN public.mission_folders.parent_folder_slug IS
  'Slug of the parent folder within the same world+project_slug scope. NULL = top-level folder.';
