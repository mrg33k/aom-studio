-- Seed projects table rows for aom-ea and aheadofmarket (the Corner platform repo room)
-- Task: 6420b28b-5972-4cda-9ed6-59ecff2f6c5f
--
-- queue-task.py --project aom-ea / --project aom-studio printed
-- "! project '...' not found in projects table. Queueing without repo hint."
-- because neither slug had a row in the projects table. project_path on task
-- rows was left empty so task-runner.sh fell back to its hardcoded paths.
--
-- Applied live 2026-05-04 via Supabase REST API. This file is the canonical
-- reference; re-run against https://mcngatprgluexjjcqpkp.supabase.co to re-seed.
--
-- 2026-05-12 (task fdfd5a39): slug renamed from 'aom-studio' → 'aheadofmarket',
-- display name 'AOM Studio' → 'aheadofmarket.com'. Repo path unchanged.
-- Migration 20260512_rename_aom_studio_to_aheadofmarket.sql applied the live DB update.

-- Remove the old slug if it still exists (idempotent cleanup)
DELETE FROM projects WHERE slug = 'aom-studio' AND client_id = 'aom';

INSERT INTO projects (slug, name, color, icon, type, team_members, recency_weight, is_active, repo_path, repo_description)
VALUES
  ('aheadofmarket', 'aheadofmarket.com', '#3B82F6', 'project', 'repo', '["elon","bobby","steve","steffen"]', 85, true,
   '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio',
   'Corner platform web app and dashboard (React/Vite)'),
  ('aom-ea',        'AOM-EA',            '#6366F1', 'project', 'repo', '["elon","rex","steve","steffen"]',   80, true,
   '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA',
   'Agent EA workspace: scripts, migrations, context, and automation')
ON CONFLICT (slug) DO UPDATE SET
  name             = EXCLUDED.name,
  color            = EXCLUDED.color,
  repo_path        = EXCLUDED.repo_path,
  repo_description = EXCLUDED.repo_description,
  is_active        = EXCLUDED.is_active;
