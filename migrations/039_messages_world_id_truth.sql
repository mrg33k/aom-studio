-- Migration 039: messages.world_id — drop the 'aom' DEFAULT, backfill what is
-- unambiguous, and make everything else visibly NULL.
-- Mission: corner:backend-hardening (r5, world-id truth)
-- Date: 2026-07-27
--
-- ############################################################################
-- ##  UNREVIEWED AND UNRUN. Authored by an agent; NOT executed against any   ##
-- ##  database, production or otherwise. No DDL and no UPDATE in this file   ##
-- ##  has been applied. Read it, check the counts below against live, then   ##
-- ##  run it by hand in the Supabase SQL editor.                             ##
-- ############################################################################
--
-- WHY
--   messages.world_id is declared `text DEFAULT 'aom'` and almost no writer sets
--   it. It is also the column the participation floor in api/_lib/verifyTenant.js
--   read as PROOF that a world belongs in a room. Measured over all 45,219 live
--   rows on 2026-07-27:
--
--       world_id = 'aom' ................................. 45,202  (99.96%)
--       world_id = anything else .............................. 17
--       ...every one of those 17 byte-identical to its OWN client_id
--       world_id differing from BOTH 'aom' and client_id ........ 0
--       world_id IS NULL ........................................ 0
--
--   In 45,219 rows the column has never once carried a value that client_id did
--   not already carry. It is not a record of anything; it is a default with 17
--   copies of another column mixed in. 6,472 rows sit in a NON-aom tenant while
--   claiming world 'aom'.
--
--   Consequences, both live before r5: the gate UNDER-ADMITTED every non-aom
--   world about its own rooms (Karen's karens-world rows read as 'aom', so
--   "has karens-world been here" answered no about Karen's own conversation) and
--   OVER-ADMITTED 'aom' into every room in the system, including ~15 shared
--   rooms it holds no project_access grant on.
--
--   api/_lib/write-message.js (r5) now always stamps world_id from the verified
--   tenant, so NEW rows are truthful without this migration. This migration is
--   about the 45,219 rows already on disk and about making the next writer bug
--   LOUD (absence becomes NULL) instead of silently 'aom'.
--
-- ORDER OF OPERATIONS MATTERS
--   Step 1 drops the DEFAULT before any UPDATE, so nothing written mid-migration
--   re-acquires it.
--
-- WHAT THIS TOUCHES  (counts measured 2026-07-27; re-run §0 before executing)
--   writes ....... 6,475 rows
--   leaves alone . 38,744 rows
--
-- WHAT IT WILL NOT TOUCH, AND WHY
--   * 38,730 rows with client_id='aom' AND world_id='aom'. Indistinguishable
--     from a default, but they are AOM's own rooms, so 'aom' is also the correct
--     answer. Rewriting them to NULL would destroy the one case where the
--     default happened to be right and would blind AOM's own gate.
--   * 14 rows already carrying a truthful non-'aom' world equal to their own
--     non-shared client_id (karens-world, arsenal, test-hook-*). Already right.
--
-- WHAT CANNOT BE INFERRED, AND IS SET NULL ON PURPOSE
--   * All 3,398 `shared:%` rows. A shared room's client_id is 'shared:<slug>' —
--     it names a ROOM, not a world, so the row's world is simply not recoverable
--     from client_id. 3,395 of them currently claim 'aom' (the default) and 3
--     literally contain 'shared:space-rising' in the world column, i.e. a room
--     name where a world slug belongs. 491 of the 3,398 carry a user_id and so
--     ARE recoverable — but only by resolving each uid against auth.users
--     user_metadata, which is an application-side job with a Supabase admin API
--     call per user, NOT something this DDL should attempt. They are left NULL
--     and the gate reads the author directly instead (verifyTenant.js arm B).
--   * 2,712 rows whose client_id is not a world at all: aom-autoshare-archive
--     (2,343 — an archive bucket), ben (306 — a legacy per-person client_id;
--     Ben's world is 'arsenal'), wexler-associates (45), loop-test-project-6 (6),
--     DELETEME-e2e (3), rex-health-probe (3), ethan (2), and 8 further singleton
--     probe/test tenants. Guessing 'ben' -> 'arsenal' here would be exactly the
--     kind of plausible inference that produced the mess this file cleans up.
--     NULL means unknown, and unknown is the honest answer.
--
-- SAFETY
--   * world_id is NULLABLE. Verified against the live PostgREST schema: the
--     `messages` definition lists required = [id, role, text, room_id] only.
--     §1b is a belt-and-braces DROP NOT NULL in case an environment differs.
--   * No RLS policy on messages reads world_id — 029/035 key on client_id.
--     Nulling world_id cannot hide a row from anyone.
--   * The one in-app reader, src/dashboard/cv4/CommandTracker.jsx, already ORs
--     world_id with client_id arms for "legacy rows that predate world_id
--     stamping" (its own comment), so NULL degrades to the client_id path.
--   * api/_lib/crosspost.js treats a null source world as "stamps nothing, so it
--     cannot mint presence for anyone" — its documented, safe branch.
--   * Reversible: §4 restores the previous state exactly.

-- ── 0. Measure BEFORE running. Expect the numbers in the header. ──────────────
--
--   SELECT count(*) FILTER (WHERE world_id = 'aom')                     AS aom_stamped,
--          count(*) FILTER (WHERE world_id IS NULL)                     AS null_world,
--          count(*) FILTER (WHERE world_id IS DISTINCT FROM client_id
--                             AND world_id = 'aom')                     AS defaulted_lies,
--          count(*) FILTER (WHERE client_id LIKE 'shared:%')            AS shared_rows,
--          count(*)                                                     AS total
--     FROM public.messages;
--
--   -- expected 2026-07-27: 45202 | 0 | 6472 | 3398 | 45219

BEGIN;

-- ── 1. Absence must become visible ────────────────────────────────────────────
-- The default is the whole defect: an omitting writer silently produced a false
-- claim of AOM participation. With no default, an omitting writer produces NULL,
-- which is queryable, alertable, and obviously wrong.

ALTER TABLE public.messages ALTER COLUMN world_id DROP DEFAULT;

-- 1b. Only fires if some environment added NOT NULL; live prod has not.
ALTER TABLE public.messages ALTER COLUMN world_id DROP NOT NULL;

-- ── 2. Backfill the ONE unambiguous case ──────────────────────────────────────
-- A row whose client_id is a plain (non-shared) tenant that EXISTS IN public.worlds
-- was written in that world's own namespace. That is the only inference this file
-- is willing to make, and it is made by JOIN against the worlds table rather than
-- a hardcoded list, so it stays correct if worlds gains rows before this is run.
--
-- Expected: 365 rows (karens-world 250, arsenal 108, marcus 4, qa 1, struck 1,
-- struck-tim 1). client_id='aom' rows are excluded by the IS DISTINCT FROM guard
-- because they are already correct.

UPDATE public.messages m
   SET world_id = m.client_id
  FROM public.worlds w
 WHERE w.slug = m.client_id
   AND m.client_id NOT LIKE 'shared:%'
   AND m.world_id IS DISTINCT FROM m.client_id;

-- ── 3. Everything still claiming the default without earning it -> NULL ───────
-- Two populations, both unknowable from client_id alone (see header):
--   3a. every shared:% row — client_id names a room, not a world
--   3b. every row whose client_id is neither 'aom' nor a slug in public.worlds
--
-- Deliberately NOT touched by either statement: client_id='aom' rows (correct as
-- 'aom'), and the 14 rows §2 either fixed or that were already truthful.
--
-- Expected: 3a = 3,398 rows; 3b = 2,712 rows.

-- 3a. shared rooms: the world is genuinely not in this row's client_id. This also
--     clears the 3 rows carrying 'shared:space-rising' in the world column.
UPDATE public.messages
   SET world_id = NULL
 WHERE client_id LIKE 'shared:%'
   AND world_id IS NOT NULL;

-- 3b. tenants that are not worlds (archive buckets, legacy per-person client_ids,
--     probe/test tenants). 'ben' is NOT rewritten to 'arsenal' on purpose.
UPDATE public.messages m
   SET world_id = NULL
 WHERE m.client_id <> 'aom'
   AND m.client_id NOT LIKE 'shared:%'
   AND NOT EXISTS (SELECT 1 FROM public.worlds w WHERE w.slug = m.client_id)
   AND m.world_id IS NOT NULL;

COMMIT;

-- ── 4. Rollback (restores the exact prior state) ──────────────────────────────
--
--   BEGIN;
--   UPDATE public.messages SET world_id = 'aom' WHERE world_id IS NULL;
--   UPDATE public.messages m SET world_id = 'aom'
--    FROM public.worlds w
--    WHERE w.slug = m.client_id AND m.client_id NOT LIKE 'shared:%'
--      AND m.client_id <> 'aom';
--   -- (re-strands the 3 legacy 'shared:space-rising' stamps as 'aom'; they were
--   --  wrong before this migration too, so this is a faithful-enough restore)
--   ALTER TABLE public.messages ALTER COLUMN world_id SET DEFAULT 'aom';
--   COMMIT;

-- ── 5. Verify AFTER running ───────────────────────────────────────────────────
--
--   -- the default is gone
--   SELECT column_default, is_nullable
--     FROM information_schema.columns
--    WHERE table_schema = 'public' AND table_name = 'messages'
--      AND column_name = 'world_id';
--   -- expect: NULL | YES
--
--   -- no row claims a world its own tenancy contradicts
--   SELECT count(*) FROM public.messages
--    WHERE world_id IS NOT NULL
--      AND client_id NOT LIKE 'shared:%'
--      AND world_id <> client_id;
--   -- expect: 0
--
--   -- shared rooms carry no world (the app resolves those by author)
--   SELECT count(*) FROM public.messages
--    WHERE client_id LIKE 'shared:%' AND world_id IS NOT NULL;
--   -- expect: 0
--
--   -- new writes must not be re-acquiring a default: after the next deploy this
--   -- should stay flat, and any growth points at a writer that omits world_id.
--   SELECT client_id, count(*) FROM public.messages
--    WHERE world_id IS NULL AND timestamp > now() - interval '1 day'
--    GROUP BY 1 ORDER BY 2 DESC;
