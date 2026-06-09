-- Support Desk — two-door support system
-- support_wishes: one row per client wish (form or email intake)
-- support_wish_updates: timeline of status changes + responses for the status link

create table if not exists support_wishes (
  id uuid primary key default gen_random_uuid(),
  access_code text unique not null,
  email text not null,
  name text,
  message text not null,
  status text not null default 'heard',          -- heard | working | needs_team | resolved
  source text default 'web',                     -- web | email
  managed_project text,                          -- set by triage when it's a managed-site fix
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists support_wish_updates (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references support_wishes(id) on delete cascade,
  kind text not null,                            -- status_change | response | note
  status text,
  body text,
  author text not null default 'system',         -- agent | aom | system
  visible_to_client boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_support_wishes_status on support_wishes(status);
create index if not exists idx_support_wish_updates_wish on support_wish_updates(wish_id);

alter table support_wishes enable row level security;
alter table support_wish_updates enable row level security;

-- Anon may look up by access code (client status view) — endpoints use service role anyway.
create policy "support_wishes_anon_lookup" on support_wishes for select to anon using (true);
create policy "support_wishes_team_all" on support_wishes for all to authenticated using (true);
create policy "support_updates_anon_lookup" on support_wish_updates for select to anon using (true);
create policy "support_updates_team_all" on support_wish_updates for all to authenticated using (true);

-- Seed test wish for board verification
insert into support_wishes (access_code, email, name, message, status, source)
values ('SUP-T01', 'test@example.com', 'Test Client', 'This is a seed wish for board verification.', 'heard', 'web')
on conflict (access_code) do nothing;
