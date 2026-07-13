// THE uploads identity — one definition, shared by Review (review-queue.js) and
// Organize (files.js type=uploads). Review is merging into Organize soon; both
// tools MUST answer "which chat messages are the user's own uploads" identically,
// or files appear in one surface and vanish from the other (the 2026-07-13
// "my uploads are missing" investigation found exactly this drift).
//
// An upload is: a `messages` row with role='user' carrying attachment metadata.
//   - metadata.attachment  = { url, mime, size, name[, sha256, source_path] }   (single)
//   - metadata.attachments = [ { url, … }, … ]                                  (multi-file drop)
// Schema reality (verified 2026-05-25): there are NO top-level attachment columns
// on messages — the metadata object is the only home. Timestamp column is
// `timestamp` (not created_at).
//
// Uploads are ALWAYS deliberate — the user chose to attach the file — so they are
// NEVER subject to Review's HANDOFF_CUTOFF (that cutoff exists only to exclude the
// watcher's historical role=assistant auto-dump spam). Uploads are all-time.
//
// Tenancy: filter uploads by the `client_id` column, NOT `world_id`. Verified
// against live data 2026-07-13: every upload row carries world_id='aom' (a
// mis-stamped default) while client_id is truthful ('aom', 'karens-world',
// 'shared:space-rising', …) — a world_id filter silently matches nothing for
// real tenants.

// PostgREST filter fragments. PostgREST can't OR across two jsonb path filters
// cleanly, so callers run BOTH queries and merge — otherwise every multi-file
// upload is invisible.
export const UPLOADS_ROLE_FILTER = 'role=eq.user';
export const UPLOADS_PRESENCE_FILTERS = [
  'metadata->attachment=not.is.null',
  'metadata->attachments=not.is.null',
];

// Extract every attachment from one message row's metadata, normalized to one
// shape. Order: the plural array first, then the single object — the same order
// both consumers have always used. Entries without a url/path are dropped.
export function attachmentsOfMessage(metadata) {
  const meta = metadata && typeof metadata === 'object' ? metadata : {};
  const raw = [];
  if (Array.isArray(meta.attachments)) raw.push(...meta.attachments.filter((a) => a && typeof a === 'object'));
  if (meta.attachment && typeof meta.attachment === 'object') raw.push(meta.attachment);
  const out = [];
  for (const a of raw) {
    const url = String(a.url || a.path || '');
    if (!url) continue;
    out.push({
      url,
      name: a.name || null,
      mime: a.mime || null,
      size: a.size ?? null,
      sha256: a.sha256 || null,
      source_path: a.source_path || null,
    });
  }
  return out;
}
