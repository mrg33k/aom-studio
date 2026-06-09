-- Multi-account integrations (2026-06-09)
-- Problem: a UNIQUE(user_id, integration_slug) constraint allows only ONE gmail
-- per user, so connecting a second mailbox (e.g. hello@ alongside personal)
-- fails with 23505. The OAuth callback already keys upserts on
-- (user_id, integration_slug, config->>'account_email'); the DB constraint must
-- match so each distinct Google account is its own row.
--
-- This drops the 2-column unique constraint (whatever its name) and replaces it
-- with an account-email-aware unique index for user-owned rows. Workspace-owned
-- rows (user_id null) are unaffected — they already key on (workspace_id, slug,
-- account_email) in code and aren't covered by this index.

do $$
declare
  c text;
begin
  -- find the UNIQUE constraint on exactly (user_id, integration_slug)
  select con.conname into c
  from pg_constraint con
  where con.conrelid = 'account_integrations'::regclass
    and con.contype = 'u'
    and (
      select array_agg(att.attname::text order by att.attname::text)
      from unnest(con.conkey) as k(attnum)
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
    ) = array['integration_slug','user_id']
  limit 1;

  if c is not null then
    execute format('alter table account_integrations drop constraint %I', c);
    raise notice 'dropped constraint %', c;
  end if;
end $$;

-- Also drop a same-shaped plain unique INDEX if that's what exists instead of a constraint.
drop index if exists account_integrations_user_id_integration_slug_key;
drop index if exists account_integrations_user_id_integration_slug_idx;

-- New: one connection per (user, provider, account_email). Partial — user-owned only.
create unique index if not exists account_integrations_user_slug_email_uniq
  on account_integrations (user_id, integration_slug, (config->>'account_email'))
  where user_id is not null;
