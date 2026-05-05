-- 033_shared_rooms_three_tier_roles.sql
-- R75-d4: Add three-tier role model to project_access
-- Roles: member (default for invitations), read_only (owner can demote)
-- owner is implicit (not stored as a row)

-- Drop the existing constraint to update the enum
ALTER TABLE project_access
  DROP CONSTRAINT project_access_role_check;

-- Add new check with three tiers
ALTER TABLE project_access
  ADD CONSTRAINT project_access_role_check
  CHECK (role IN ('member', 'read_only'));

-- Backfill existing 'collaborator' rows as 'member'
UPDATE project_access SET role = 'member' WHERE role = 'collaborator';

-- Confirm the update
-- SELECT COUNT(*) FROM project_access WHERE role NOT IN ('member', 'read_only');
