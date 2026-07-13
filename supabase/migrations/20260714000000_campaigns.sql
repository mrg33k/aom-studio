-- corner:campaign-tool R1 — campaign engine schema.
-- A campaign is a repeatable outreach loop a tenant runs without chat:
-- audience -> template -> scheduled batches -> replies -> pipeline stages.
-- Reads gated by auth.jwt() world claim (missions/mission_folders pattern).
-- Writes go through service-role API endpoints + the engine scripts;
-- dashboard JWT cannot write directly.

create table if not exists campaigns (
  id                     uuid primary key default gen_random_uuid(),
  world                  text not null default 'aom',
  slug                   text not null,
  name                   text not null,
  status                 text not null default 'draft'
                         check (status in ('draft','active','paused','closed')),
  goal_target            int,                    -- e.g. 6 (cities signed)
  goal_unit              text,                   -- e.g. 'cities signed'
  template_subject       text not null default '',
  template_body          text not null default '',
  merge_fields           jsonb not null default '[]'::jsonb,
  audience_source        text not null default 'dataset'
                         check (audience_source in ('dataset','csv_upload')),
  audience_meta          jsonb not null default '{}'::jsonb,  -- filters / csv info / dataset id
  sending_connection_id  uuid,                   -- gmail connection (mailAccess)
  sending_email          text,
  daily_cap              int not null default 50 check (daily_cap > 0),
  send_hour_local        int not null default 7, -- local hour batches go out
  autopilot              boolean not null default false,
  -- health surface (polled fast by the UI; written by engine + watchdog)
  health_status          text not null default 'unknown'
                         check (health_status in ('unknown','running','waiting','paused','problem')),
  health_problem_code    text,   -- email_disconnected | send_failed | missed_run | hygiene_hold | stale_approval | operator_needed
  health_user_action     text,   -- approve_batch | reconnect_email | retry_batch | resume | run_now | review_flagged
  health_message         text,   -- plain words shown to the user
  health_checked_at      timestamptz,
  last_run_at            timestamptz,
  last_result            text,
  next_run_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists campaigns_world_slug_uidx on campaigns (world, slug);
create index if not exists campaigns_world_status_idx on campaigns (world, status);
create index if not exists campaigns_due_idx on campaigns (status, next_run_at);

create table if not exists campaign_contacts (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references campaigns(id) on delete cascade,
  world              text not null default 'aom',
  email              text,            -- null until the contact is enriched
  place_key          text,            -- stable dataset identity (e.g. census geoid)
  name               text,
  merge_fields       jsonb not null default '{}'::jsonb,   -- first_name, city, state, population...
  stage              text not null default 'to_contact'
                     check (stage in ('to_contact','contacted','replied','call_set','won','lost','bounced','noise')),
  hygiene_flag       text,                                  -- reason held by checks, null = clean
  last_contacted_at  timestamptz,
  last_reply_at      timestamptz,
  reply_thread_id    text,                                  -- gmail threadId of the inbound thread
  follow_up_due_at   timestamptz,
  notes              text,
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index if not exists campaign_contacts_campaign_email_uidx on campaign_contacts (campaign_id, email);
create unique index if not exists campaign_contacts_place_uidx on campaign_contacts (campaign_id, place_key);
create index if not exists campaign_contacts_stage_idx on campaign_contacts (campaign_id, stage);
create index if not exists campaign_contacts_email_idx on campaign_contacts (email);
create index if not exists campaign_contacts_followup_idx on campaign_contacts (campaign_id, follow_up_due_at);

create table if not exists campaign_batches (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  world          text not null default 'aom',
  batch_date     date not null,
  status         text not null default 'pending'
                 check (status in ('pending','awaiting_approval','approved','sending','completed','failed','cancelled')),
  contact_count  int not null default 0,
  sent_count     int not null default 0,
  failed_count   int not null default 0,
  held_count     int not null default 0,        -- hygiene holds
  engine_run_id  text,
  approved_by    text,                          -- user id/email; null = autopilot
  approved_at    timestamptz,
  started_at     timestamptz,
  completed_at   timestamptz,
  error_message  text,
  created_at     timestamptz not null default now()
);

create unique index if not exists campaign_batches_campaign_date_uidx on campaign_batches (campaign_id, batch_date);
create index if not exists campaign_batches_status_idx on campaign_batches (status);

-- Send ledger. The UNIQUE constraint is the dedupe backstop: a contact can
-- never be emailed twice by the same campaign, even across crashes,
-- double-runs, or the arsenal-script cutover (seeded from Gmail Sent).
create table if not exists campaign_sends (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  contact_id     uuid references campaign_contacts(id) on delete set null,
  batch_id       uuid references campaign_batches(id) on delete set null,
  world          text not null default 'aom',
  email_address  text not null,
  message_id     text,                          -- gmail message id
  thread_id      text,
  sent_at        timestamptz not null default now(),
  source         text not null default 'engine' -- engine | import
);

create unique index if not exists campaign_sends_campaign_email_uidx on campaign_sends (campaign_id, email_address);
create index if not exists campaign_sends_campaign_date_idx on campaign_sends (campaign_id, sent_at desc);

create table if not exists campaign_events (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  contact_id   uuid references campaign_contacts(id) on delete cascade,
  batch_id     uuid references campaign_batches(id) on delete set null,
  world        text not null default 'aom',
  kind         text not null
               check (kind in ('sent','replied','bounced','flagged','stage_changed','batch_prepared',
                               'batch_approved','batch_sent','run_started','run_finished','health','import')),
  summary      text,                            -- one line for the activity feed
  details      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists campaign_events_campaign_idx on campaign_events (campaign_id, created_at desc);
create index if not exists campaign_events_contact_idx on campaign_events (contact_id, created_at desc);

-- Engine heartbeat. run_started is written BEFORE any send so a crash
-- mid-batch is detectable by the watchdog (started row with no finish).
create table if not exists campaign_run_logs (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid not null references campaigns(id) on delete cascade,
  world          text not null default 'aom',
  run_id         text not null unique,
  kind           text not null default 'send'   -- send | watchdog | reply_sync | import
                 check (kind in ('send','watchdog','reply_sync','import')),
  status         text not null default 'started'
                 check (status in ('started','completed','failed','partial')),
  batch_date     date,
  processed      int not null default 0,
  sent           int not null default 0,
  held           int not null default 0,
  failed         int not null default 0,
  error_message  text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists campaign_run_logs_campaign_idx on campaign_run_logs (campaign_id, started_at desc);
create index if not exists campaign_run_logs_open_idx on campaign_run_logs (status, started_at) where completed_at is null;

-- RLS: reads scoped to the caller's world; all writes blocked for
-- authenticated (service role bypasses RLS — endpoints + engine only).
alter table campaigns enable row level security;
alter table campaign_contacts enable row level security;
alter table campaign_batches enable row level security;
alter table campaign_sends enable row level security;
alter table campaign_events enable row level security;
alter table campaign_run_logs enable row level security;

drop policy if exists campaigns_select_own_world on campaigns;
create policy campaigns_select_own_world on campaigns
  for select to authenticated
  using (world = coalesce((auth.jwt() ->> 'world')::text, 'aom'));
drop policy if exists campaigns_write_block on campaigns;
create policy campaigns_write_block on campaigns
  for all to authenticated using (false) with check (false);

drop policy if exists campaign_contacts_select_own_world on campaign_contacts;
create policy campaign_contacts_select_own_world on campaign_contacts
  for select to authenticated
  using (world = coalesce((auth.jwt() ->> 'world')::text, 'aom'));
drop policy if exists campaign_contacts_write_block on campaign_contacts;
create policy campaign_contacts_write_block on campaign_contacts
  for all to authenticated using (false) with check (false);

drop policy if exists campaign_batches_select_own_world on campaign_batches;
create policy campaign_batches_select_own_world on campaign_batches
  for select to authenticated
  using (world = coalesce((auth.jwt() ->> 'world')::text, 'aom'));
drop policy if exists campaign_batches_write_block on campaign_batches;
create policy campaign_batches_write_block on campaign_batches
  for all to authenticated using (false) with check (false);

drop policy if exists campaign_sends_select_own_world on campaign_sends;
create policy campaign_sends_select_own_world on campaign_sends
  for select to authenticated
  using (world = coalesce((auth.jwt() ->> 'world')::text, 'aom'));
drop policy if exists campaign_sends_write_block on campaign_sends;
create policy campaign_sends_write_block on campaign_sends
  for all to authenticated using (false) with check (false);

drop policy if exists campaign_events_select_own_world on campaign_events;
create policy campaign_events_select_own_world on campaign_events
  for select to authenticated
  using (world = coalesce((auth.jwt() ->> 'world')::text, 'aom'));
drop policy if exists campaign_events_write_block on campaign_events;
create policy campaign_events_write_block on campaign_events
  for all to authenticated using (false) with check (false);

drop policy if exists campaign_run_logs_select_own_world on campaign_run_logs;
create policy campaign_run_logs_select_own_world on campaign_run_logs
  for select to authenticated
  using (world = coalesce((auth.jwt() ->> 'world')::text, 'aom'));
drop policy if exists campaign_run_logs_write_block on campaign_run_logs;
create policy campaign_run_logs_write_block on campaign_run_logs
  for all to authenticated using (false) with check (false);

-- Realtime for the surfaces the UI watches live.
do $$
begin
  begin
    alter publication supabase_realtime add table campaigns;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table campaign_contacts;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table campaign_batches;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table campaign_events;
  exception when duplicate_object then null;
  end;
end $$;

comment on table campaigns is 'Tenant outreach campaigns (Email > Campaign tool). corner:campaign-tool R1.';
comment on table campaign_sends is 'Send ledger; UNIQUE(campaign_id,email_address) is the double-send backstop.';
