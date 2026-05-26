-- corner:right-click-menu R6 — mission_meta table for display-name overrides + soft-archive.
-- Used by /api/dashboard/mission-update (PATCH display_name, DELETE = archived_at).
-- Missing rows mean "no override" — the missions endpoint falls back to slug-derived title.

create table if not exists mission_meta (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  project_slug text not null,
  mission_slug text not null,
  display_name text,
  archived_at timestamptz,
  updated_by uuid,
  updated_at timestamptz default now(),
  unique (client_id, project_slug, mission_slug)
);

create index if not exists mission_meta_client_project_idx
  on mission_meta (client_id, project_slug);

-- RLS: authenticated read scoped by client_id; writes go through service role.
alter table mission_meta enable row level security;
create policy "mission_meta read by tenant" on mission_meta
  for select using (auth.role() = 'authenticated');
