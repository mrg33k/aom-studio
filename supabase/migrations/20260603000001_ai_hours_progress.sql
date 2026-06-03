-- ai_hours_progress: stores client checklist progress per session
-- keyed by access_code + session_number, checked_items is a jsonb array of item indices

create table if not exists ai_hours_progress (
  id uuid primary key default gen_random_uuid(),
  access_code text not null,
  session_number integer not null,
  checked_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint ai_hours_progress_unique unique (access_code, session_number)
);

-- index for fast lookup by access_code
create index if not exists ai_hours_progress_access_code_idx on ai_hours_progress (access_code);

-- RLS: service role only (all access via API route with service key)
alter table ai_hours_progress enable row level security;

-- no client-side access — all reads/writes go through /api/ai-hours/checklist with service role
