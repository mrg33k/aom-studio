-- Rename dashboard project room 'aom-studio' → 'aheadofmarket'
-- Task: fdfd5a39-5661-44c8-a00b-ddcbae9c18c7
--
-- The room labeled 'AOM Studio' (slug 'aom-studio') is the AOM company room,
-- whose public face is aheadofmarket.com. Renaming removes confusion with the
-- sibling repo also named aom-studio (Corner platform code, not a company room).
--
-- Display name: 'aheadofmarket.com'  |  New slug: 'aheadofmarket'
-- Repo path is unchanged: /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio
--
-- Applied live 2026-05-12 via Supabase REST API.
-- Re-run against https://mcngatprgluexjjcqpkp.supabase.co to re-apply.

UPDATE public.projects
   SET slug = 'aheadofmarket',
       name = 'aheadofmarket.com'
 WHERE slug      = 'aom-studio'
   AND client_id = 'aom';
