-- Environment variables table: per-world, per-user, per-project scoped secrets
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mcngatprgluexjjcqpkp/sql

CREATE TABLE IF NOT EXISTS env_vars (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('world', 'user', 'project')),
  scope_id text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  client_id text NOT NULL DEFAULT 'aom',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(scope, scope_id, key, client_id)
);

-- RLS: service role only (secrets should never be exposed to browser)
ALTER TABLE env_vars ENABLE ROW LEVEL SECURITY;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_env_vars_lookup ON env_vars(scope, scope_id, client_id);
