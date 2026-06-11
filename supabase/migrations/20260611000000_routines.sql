-- corner:routines R1 — registry of open loops.
-- Each row is a recurring (or manual) prompt that runs in an attached room.
-- scripts/routine-daemon.py polls this table and posts the prompt into the
-- room as a normal user message; the room's agent does the work.

create table if not exists routines (
  id               uuid primary key default gen_random_uuid(),
  client_id        text not null default 'aom',
  name             text not null,
  room_type        text not null check (room_type in ('project','mission','agent')),
  project_slug     text,
  mission_slug     text,
  agent_slug       text,
  prompt           text not null,
  model            text not null default 'sonnet' check (model in ('haiku','sonnet','opus')),
  interval_minutes int,                -- null = manual only
  status           text not null default 'running' check (status in ('running','paused','error')),
  fail_count       int not null default 0,
  last_run_at      timestamptz,
  next_run_at      timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists routines_due_idx on routines (status, next_run_at);
create index if not exists routines_client_idx on routines (client_id);
