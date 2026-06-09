-- Multi-account follow-up (2026-06-09)
-- The prior migration only looked in pg_constraint. The one-gmail-per-user
-- uniqueness is enforced by a unique INDEX on (user_id, integration_slug)
-- (possibly not constraint-backed), so connecting a second account still 409s.
-- This removes any unique index on exactly (user_id, integration_slug) —
-- dropping the constraint if one backs it, else dropping the index directly.
-- The account-email-aware unique index from the prior migration stays.

do $$
declare r record;
begin
  for r in
    select i.relname as idxname
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    join pg_class t on t.oid = x.indrelid
    where t.relname = 'account_integrations'
      and x.indisunique
      and i.relname <> 'account_integrations_user_slug_email_uniq'
      and (
        select array_agg(a.attname::text order by a.attname::text)
        from pg_attribute a
        where a.attrelid = t.oid and a.attnum = any(x.indkey)
      ) = array['integration_slug','user_id']
  loop
    begin
      execute format('alter table account_integrations drop constraint %I', r.idxname);
      raise notice 'dropped constraint %', r.idxname;
    exception when others then
      execute format('drop index if exists %I', r.idxname);
      raise notice 'dropped index %', r.idxname;
    end;
  end loop;
end $$;
