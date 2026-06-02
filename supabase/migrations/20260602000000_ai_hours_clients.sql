-- AI Hours Clients table
-- Stores client access codes and session progress for the AI Hours Consulting program

create table if not exists ai_hours_clients (
  id uuid primary key default gen_random_uuid(),
  access_code text unique not null,
  client_name text not null,
  email text,
  current_session integer default 1,
  granted_by text default 'aom',
  notes text,
  created_at timestamptz default now()
);

alter table ai_hours_clients enable row level security;

-- Anon users can look up by access code (used by client view)
create policy "anon_lookup" on ai_hours_clients
  for select to anon using (true);

-- Authenticated AOM team members have full access
create policy "team_all" on ai_hours_clients
  for all to authenticated using (true);

-- Seed test client
insert into ai_hours_clients (access_code, client_name, current_session)
values ('AOM-TEST-001', 'Test Client', 1)
on conflict (access_code) do nothing;
