-- corner:native-ios Stage 0 — make deleting an auth user actually possible.
--
-- THE BUG THIS FIXES. /api/account/delete removes the person's rows and then calls
-- the GoTrue admin delete (DELETE /auth/v1/admin/users/{id}). That last call was
-- FK-blocked for every ordinary account. Three columns reference auth.users(id)
-- with NO ACTION (pg_constraint.confdeltype = 'a'), verified live 2026-08-10:
--
--   worlds.client_id                       -> worlds_client_id_fkey
--   mission_folders.created_by             -> mission_folders_created_by_fkey
--   mission_folder_assignments.updated_by  -> mission_folder_assignments_updated_by_fkey
--
-- worlds.client_id is the fatal one. The invite flow (api/accept-invite.js) provisions
-- one world per invited user, so EVERY ordinary account in production owns a worlds row
-- — ben@arsenalgpa.com, marcus@, taryn@, tim@, karen@, and the acceptance fixture. The
-- deletion therefore ran all of its data steps, then died on the auth delete with a
-- 23503 and returned 500. The account survived. App Store guideline 5.1.1(v) requires
-- in-app account deletion to actually delete the account, so this was a rejection on the
-- standard account shape, not an edge case.
--
-- WHY SET NULL AND NOT CASCADE. These three columns are ownership/authorship POINTERS,
-- not owned rows:
--
--   * worlds is a tenant. Its `slug` is used as a loose TEXT tenancy key by ~20 tables
--     (messages.world_id, mission_folders.world, campaigns.world, device_tokens.world_id,
--     tenant_users.tenant_id, shared_rooms.created_by_tenant_id, the airpods_* tables …)
--     and NONE of them is a foreign key. Deleting a worlds row would silently orphan all
--     of it, and a later world reusing the slug would inherit a dead tenant's messages.
--     A world can also hold OTHER members (arsenal and marcus each have two today), so
--     CASCADE would delete a colleague's workspace because one member closed their login.
--     The row must survive; only the link to the person may not.
--   * mission_folders / mission_folder_assignments are shared workspace structure. The
--     author leaving does not mean the folder should vanish out of everyone's tree.
--
-- SET NULL is also the honest privacy answer and matches what the endpoint already does
-- with `messages`: keep the shared record, drop the identity. All three columns are
-- already nullable, so nothing is being loosened to make this fit.
--
-- WHY THE DATABASE AND NOT ONLY THE ENDPOINT. api/account/delete.js now nulls these
-- columns explicitly before the auth delete, and that is the path that runs in practice.
-- This migration exists so the invariant does not depend on one code path remembering:
-- an operator deleting a user from the Supabase dashboard, a future second deletion
-- path, or a GDPR script all hit the same FK. Fixing it at the constraint means the
-- database can no longer refuse to delete a person. Belt and braces, on purpose.
--
-- Recovering an orphaned world: `select * from worlds where client_id is null` lists
-- them; an admin re-points client_id at whoever inherits the account.

alter table public.worlds
  drop constraint if exists worlds_client_id_fkey;
alter table public.worlds
  add constraint worlds_client_id_fkey
  foreign key (client_id) references auth.users (id) on delete set null;

alter table public.mission_folders
  drop constraint if exists mission_folders_created_by_fkey;
alter table public.mission_folders
  add constraint mission_folders_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete set null;

alter table public.mission_folder_assignments
  drop constraint if exists mission_folder_assignments_updated_by_fkey;
alter table public.mission_folder_assignments
  add constraint mission_folder_assignments_updated_by_fkey
  foreign key (updated_by) references auth.users (id) on delete set null;
