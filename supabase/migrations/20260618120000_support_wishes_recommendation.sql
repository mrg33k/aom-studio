-- Support asks carry an agent recommendation + alternative reply options so the
-- dashboard Support screen can render them (CV6 design bible). auto_send_at is the
-- scheduled auto-send time and stays NULL (disarmed) until auto-send is explicitly
-- armed — no client email is ever sent automatically by this migration.
-- New ALTER migration (NOT an edit of the original create-table) so it applies to
-- the already-existing support_wishes table on the live DB.

alter table support_wishes add column if not exists recommendation text;   -- JSON array of 1-3 bullet strings (the "why")
alter table support_wishes add column if not exists reply_options text;     -- JSON array of { "label": "...", "text": "..." } alternatives
alter table support_wishes add column if not exists auto_send_at timestamptz; -- scheduled send time; NULL = disarmed
