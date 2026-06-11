-- corner:routines R2 — system loops. kind='system' rows mirror the studio's
-- recurring launchd jobs (synced by scripts/routine-daemon.py) so the panel
-- lists ALL open loops, not just panel-created ones. room/prompt optional
-- for system rows.
alter table routines add column if not exists kind text not null default 'user';
alter table routines alter column room_type drop not null;
alter table routines alter column prompt drop not null;
create index if not exists routines_kind_idx on routines (kind);
