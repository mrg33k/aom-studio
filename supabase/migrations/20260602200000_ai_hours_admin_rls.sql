-- Tighten AI Hours admin RLS to aom-inhouse.com domain + explicit exceptions
-- Supersedes the permissive "team_all" policy from 20260602000000_ai_hours_clients.sql
-- which allowed ALL authenticated users full access.
--
-- New rule (locked by Courtney 2026-06-02):
--   1. Any email ending in @aom-inhouse.com
--   2. patrikmatheson@gmail.com (explicit exception)

-- Drop the old permissive policy
drop policy if exists "team_all" on ai_hours_clients;

-- Tight admin policy: only AOM team members
create policy "team_admin_only" on ai_hours_clients
  for all to authenticated
  using (
    split_part((auth.jwt()->>'email'), '@', 2) = 'aom-inhouse.com'
    OR lower(auth.jwt()->>'email') = 'patrikmatheson@gmail.com'
  )
  with check (
    split_part((auth.jwt()->>'email'), '@', 2) = 'aom-inhouse.com'
    OR lower(auth.jwt()->>'email') = 'patrikmatheson@gmail.com'
  );
