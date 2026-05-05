-- R75-c2: archive-project primitive — hide-from-list semantic
-- archived_at NULL = active, set = archived. Reversible. Never auto-delete.
-- Daemons, files, and agent context are unaffected by archive status.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at timestamptz;
