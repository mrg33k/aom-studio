# R79-f1: Read API for Project Files — Implementation Notes

**Date:** 2026-05-19
**Round:** R79-f1 (backend half of file browser)
**Status:** SHIPPED

---

## What was built

Two new API endpoints in `aom-studio/api/dashboard/`:

### 1. `GET /api/dashboard/project-files?slug=<project-slug>`

Lists canonical files for a project and all its missions. Returns structured JSON for the R79-f2 reader UI.

**Response shape:**
```json
{
  "project": "ambition-mechanical",
  "world": "aom",
  "files": [
    {"kind":"canon",         "name":"VISION.md",            "path":"corner/users/aom/projects/ambition-mechanical/VISION.md",            "last_modified":"2026-05-19T..."},
    {"kind":"canon",         "name":"CONTEXT.md",           "path":"...", "last_modified":"..."},
    {"kind":"canon",         "name":"BUILD.md",             "path":"...", "last_modified":"..."},
    {"kind":"canon",         "name":"RESEARCH.md",          "path":"...", "last_modified":"..."},
    {"kind":"tape",          "name":"last-conversation.md", "path":"...", "last_modified":"..."},
    {"kind":"research-drop", "name":"2026-05-17-foo.md",    "path":"...", "last_modified":"..."}
  ],
  "missions": [
    {"slug":"website",    "files":[...]},
    {"slug":"google-ads", "files":[...]}
  ]
}
```

### 2. `GET /api/dashboard/project-file?path=<relative-path>`

Returns the raw markdown content + metadata for a single canonical file.
`path` is AOM_EA-relative (e.g. `corner/users/aom/projects/ambition-mechanical/VISION.md`).

**Response shape:**
```json
{
  "path": "corner/users/aom/projects/ambition-mechanical/VISION.md",
  "content": "# Vision...",
  "last_modified": "2026-05-19T12:34:56.000Z",
  "mime": "text/markdown"
}
```

---

## Transport approach: filesystem-direct

**R79-f0 research recommended** Option A (DB-only + sync script). This round implements Option B/C (filesystem-direct reads with real `fs.stat` mtime).

**Why this round diverged from the recommendation:**
- The brief explicitly requires `fs.stat` mtime for live freshness
- AOM's setup is local-only today; the DB-sync lag would make the reader feel stale mid-session
- The existing `api/local/file.js` already uses the same filesystem-direct pattern with `AOM_EA_ROOT` fallback chain
- `push-canon-md.py` already exists to handle DB sync when needed (for Realtime subscriptions in R79-f4)

**Production caveat:** These endpoints return empty files on Vercel (disk not present). This is acceptable for now since the dashboard runs locally. R79-f4 (Supabase Realtime + sync script) will add the DB-backed path for production deployment.

---

## Tenant gating approach

The tenant check derives the world from the Supabase `projects` table, not from the request:

1. Look up `projects` where `slug = <requested-slug>` → get `client_id` (= world slug like "aom", "arsenal")
2. Call `verifyTenant(client_id, req)` — validates JWT via `user.user_metadata.world` or `is_world_admin_for_tenant()`
3. If JWT world ≠ project world AND caller is not an admin → 403

The `client_id` column in the `projects` table equals the world slug (confirmed: `ambition-mechanical → aom`, `s3c → arsenal`). This is the same gate used in `project-access.js` and `files.js`.

For `project-file`, the world is additionally extracted from the path itself (`corner/users/<world>/projects/<slug>/`) and cross-checked against the DB record before the JWT gate — this prevents any path-crafting tricks even before tenant auth.

---

## Hidden file enforcement

**Never returned, never acknowledged (return 404, not 403):**
- `PHONEBOOK.md`, `history.md`, `rules.md`, `decisions.md`, `lessons.md`, `manifest.yaml`
- Directories: `archive/`, `vision-qa/`, `assets/`

The hidden check in `project-file` happens at the segment level — any path segment matching the hidden list returns 404, including paths like `missions/website/archive/old.md`.

---

## Verification results

```
# No JWT → 401 (correct)
curl /api/dashboard/project-files?slug=ambition-mechanical
→ {"error":"jwt required"}

# Non-existent project → 404
curl /api/dashboard/project-files?slug=does-not-exist
→ {"error":"Project not found"}

# Hidden file → 404 (not 403, no leakage)
curl /api/dashboard/project-file?path=corner/users/aom/projects/ambition-mechanical/PHONEBOOK.md
→ {"error":"Not found"}

# Path traversal → 400
curl /api/dashboard/project-file?path=../../../etc/passwd
→ {"error":"invalid path"}

# DB lookup confirmed: ambition-mechanical → client_id="aom" ✓
# DB lookup confirmed: s3c → client_id="arsenal" ✓ (cross-tenant isolation ready)

# Local filesystem test: ambition-mechanical returns 6 files + 8 missions
# (5 canon/tape, 1 research-drop at project level; each mission has 0-6 files)
```

---

## Open questions for R79-f2 (UI)

1. Should mission files be collapsed by default (show mission name, expand on click)?
2. Should `last-conversation.md` ("tape") have a distinct visual chip color vs canon?
3. Research drops are ordered newest-first — is that the right sort for the UI?

---

## Files changed

- `aom-studio/api/dashboard/project-files.js` — REPLACED (old endpoint read from wrong path; new one reads from `corner/users/<world>/projects/<slug>/`)
- `aom-studio/api/dashboard/project-file.js` — NEW

*Research by: background sub-agent (R79-f1), 2026-05-19*
