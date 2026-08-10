-- corner:native-ios Stage 0 — APNs device token store.
--
-- WHY THIS TABLE EXISTS, next to push_subscriptions (2026-08-06).
-- push_subscriptions holds Web Push endpoints (VAPID, browser-issued, keyed by
-- `endpoint` and scoped only by world_id). An APNs device token is a different
-- kind of thing: it is issued by Apple to one install of one bundle id, it is
-- addressed over HTTP/2 with a team-signed ES256 JWT, and it belongs to a PERSON
-- (the signed-in account on that phone), not to a browser profile. Overloading
-- push_subscriptions would have meant a nullable p256dh/auth pair, a discriminator
-- column, and a fan-out that has to branch on transport mid-loop. Separate table,
-- separate sender lane, one join key each.
--
-- OWNERSHIP MODEL. `user_id` is the owner and the RLS subject: a signed-in client
-- may see and revoke ITS OWN device rows and nothing else. `world_id` is denormalized
-- routing state, written server-side from the verified JWT at register time, because
-- the fan-out in api/_lib/write-message.js resolves a message row to a tenant via
-- messages.client_id (the same column api/push/notify.js uses — world_id on messages
-- is under-written and defaulted; see the r5 block comment in write-message.js).
-- Selecting tokens by world means a room's reply reaches every device signed into
-- that world, which is what "notify the room owner" means in a multi-device account.
--
-- WRITES ARE SERVER-SIDE ONLY. There is no INSERT or UPDATE policy, deliberately.
-- RLS default-denies anything without a permissive policy, so an authenticated JWT
-- physically cannot mint a row: registration goes through api/push/register-device.js,
-- which verifies the session, derives user_id + world_id from the JWT (never from the
-- body), and writes with the service role key. That is the same shape as the airpods
-- tables (20260808000000) — clients read their own audit trail, endpoints own writes.

create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  -- The APNs device token, lowercase hex. UNIQUE is load-bearing: iOS re-issues the
  -- same token on every launch, so re-registering must update one row, never append
  -- a second — a duplicate row is a duplicate banner on the same phone.
  token text not null unique,
  platform text not null default 'ios' check (platform in ('ios')),
  -- Which APNs host this token was minted against. A sandbox (debug build) token is
  -- rejected by the production gateway and vice versa, so the sender must be able to
  -- tell them apart instead of guessing from a global env var.
  environment text not null default 'production' check (environment in ('production','sandbox')),
  world_id text,
  bundle_id text,
  device_name text,
  app_version text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on device_tokens (user_id);
create index if not exists device_tokens_world_idx on device_tokens (world_id, last_seen_at desc);

alter table device_tokens enable row level security;

-- Owner-scoped read: a client may enumerate its own devices (Settings "this phone
-- is receiving notifications"), and nobody else's.
drop policy if exists device_tokens_select_own on device_tokens;
create policy device_tokens_select_own on device_tokens
  for select to authenticated
  using (user_id = auth.uid());

-- Owner-scoped revoke: turning push off on a device must work from the device,
-- and must not require the server round trip to succeed first.
drop policy if exists device_tokens_delete_own on device_tokens;
create policy device_tokens_delete_own on device_tokens
  for delete to authenticated
  using (user_id = auth.uid());

-- No INSERT / UPDATE policy on purpose — see the header block. Do not add one
-- without also explaining how a client-supplied user_id would be prevented from
-- pointing a token at somebody else's account.
