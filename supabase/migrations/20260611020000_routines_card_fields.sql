-- corner:routines R3 — card view fields: plain-English description,
-- when the loop started, rough AI tokens/day estimate.
alter table routines add column if not exists description text;
alter table routines add column if not exists started_at timestamptz;
alter table routines add column if not exists tokens_day_est int;
