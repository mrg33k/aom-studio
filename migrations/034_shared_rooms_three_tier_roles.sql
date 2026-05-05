-- 034_shared_rooms_three_tier_roles.sql
-- R75-d4: three-tier role model on project_access.
-- Roles: member (default for invitations), read_only (owner can demote).
-- owner is implicit (not stored as a row).
--
-- Idempotent: safe to re-run.

-- Drop existing constraint (if present) so backfill can normalize values.
ALTER TABLE project_access
  DROP CONSTRAINT IF EXISTS project_access_role_check;

-- Backfill: anything that isn't already 'read_only' becomes 'member'.
-- Covers legacy 'collaborator' rows + any other historic role values.
UPDATE project_access
   SET role = 'member'
 WHERE role IS NULL OR role NOT IN ('member', 'read_only');

-- Add new check with two persisted tiers (owner is implicit).
ALTER TABLE project_access
  ADD CONSTRAINT project_access_role_check
  CHECK (role IN ('member', 'read_only'));
