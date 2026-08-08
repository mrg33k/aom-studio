-- corner:airpods-mode R1 — auditable voice sessions, topic handoffs, actions,
-- and proactive attention. Browser/native clients never write these tables
-- directly; authenticated service-role endpoints enforce tenant + speaker scope.

create table if not exists airpods_sessions (
  id uuid primary key,
  world_id text not null,
  user_id uuid not null,
  speaker_name text,
  status text not null default 'active'
    check (status in ('active','completed','failed')),
  activation_source text not null default 'unknown',
  active_context jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  summary text,
  duration_secs integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists airpods_sessions_world_created_idx
  on airpods_sessions (world_id, created_at desc);

create table if not exists airpods_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references airpods_sessions(id) on delete cascade,
  world_id text not null,
  room_key text not null,
  agent text,
  project text,
  mission_slug text,
  handoff jsonb not null default '{}'::jsonb,
  turn_indexes jsonb not null default '[]'::jsonb,
  message_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists airpods_segments_session_idx on airpods_segments (session_id);
create index if not exists airpods_segments_room_idx on airpods_segments (world_id, room_key, created_at desc);

create table if not exists airpods_actions (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  session_id uuid,
  world_id text not null,
  user_id uuid not null,
  speaker_name text,
  action text not null,
  authority text not null,
  arguments jsonb not null default '{}'::jsonb,
  confirmation_state text not null default 'not_required'
    check (confirmation_state in ('not_required','pending','confirmed','refused','expired')),
  status text not null default 'started'
    check (status in ('started','succeeded','failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists airpods_actions_session_idx on airpods_actions (session_id, created_at);
create index if not exists airpods_actions_world_idx on airpods_actions (world_id, created_at desc);

create table if not exists airpods_attention_items (
  id uuid primary key default gen_random_uuid(),
  world_id text not null,
  source_type text not null,
  source_id text not null,
  version integer not null default 1,
  priority text not null default 'progress',
  title text not null,
  detail text,
  room_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued','prompted','acknowledged')),
  snoozed_until timestamptz,
  prompted_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (world_id, source_type, source_id, version)
);

create index if not exists airpods_attention_due_idx
  on airpods_attention_items (world_id, status, snoozed_until, created_at);

alter table airpods_sessions enable row level security;
alter table airpods_segments enable row level security;
alter table airpods_actions enable row level security;
alter table airpods_attention_items enable row level security;

-- Service-role endpoints own all writes. Authenticated users may read their
-- own world's audit trail; no JWT receives direct write permission.
do $$
declare table_name text;
begin
  foreach table_name in array array['airpods_sessions','airpods_segments','airpods_actions','airpods_attention_items']
  loop
    execute format('drop policy if exists %I on %I', table_name || '_select_world', table_name);
    execute format(
      'create policy %I on %I for select to authenticated using (world_id = lower(coalesce(auth.jwt() -> ''user_metadata'' ->> ''world'', auth.jwt() ->> ''world'', '''')))',
      table_name || '_select_world', table_name
    );
    execute format('drop policy if exists %I on %I', table_name || '_write_block', table_name);
    execute format(
      'create policy %I on %I for all to authenticated using (false) with check (false)',
      table_name || '_write_block', table_name
    );
  end loop;
end $$;
