-- corner:embed-modal R1 — embed_configs table
--
-- Replaces api/embed/_embeds.json as the source of truth for runtime embed
-- routing + placement. Created via POST /api/embed/create from the in-app
-- modal so users can ship an embed without dropping to a terminal.
--
-- The JSON file remains as a fallback registry consumed by
-- lib/embed-registry.js — if a row is missing from Supabase, the file is
-- consulted next. New embeds go to Supabase; legacy embeds keep working.

create table if not exists public.embed_configs (
  embed_id text primary key,
  surface_name text not null,
  active boolean not null default true,
  host_allowlist jsonb not null,
  placement jsonb not null,
  routing jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists embed_configs_active_idx
  on public.embed_configs (active)
  where active = true;

-- Public read of active rows is fine — the data is what the widget needs
-- to bootstrap. Origin validation still happens in /api/embed/config based
-- on host_allowlist. Writes are service-role only (already the case via
-- /api/embed/create which uses SUPABASE_SERVICE_ROLE_KEY server-side).
alter table public.embed_configs enable row level security;

drop policy if exists embed_configs_public_read on public.embed_configs;
create policy embed_configs_public_read
  on public.embed_configs
  for select
  to anon, authenticated
  using (active = true);

-- Trigger to keep updated_at fresh on writes.
create or replace function public.embed_configs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists embed_configs_touch on public.embed_configs;
create trigger embed_configs_touch
  before update on public.embed_configs
  for each row execute function public.embed_configs_touch_updated_at();
