-- Shared projects: allows a project to be visible in multiple worlds
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql

CREATE TABLE IF NOT EXISTS project_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id),
  client_id text NOT NULL,
  role text NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(project_id, client_id)
);

ALTER TABLE project_access ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_project_access_client ON project_access(client_id);
CREATE INDEX IF NOT EXISTS idx_project_access_project ON project_access(project_id);
