// reviewTargetResolve.js — pure resolution of a "review this file" nav target.
// No imports (node-testable: tests/api/_lib/reviewTargetResolve.test.js).
//
// Root cause this module kills (corner:corner-ui-cv6, Patrik 2026-07-18): chat
// surfaces hand files to Files/Review in TWO shapes — attachment objects
// ({url, name, mime}) from MessageAttachments/shelves, and raw message rows
// ({attachmentUrl, fileName, fileMime}) from the mobile galleries and the
// FileCollectionViewer's "Comment in Review" button. OrganizeDesktop and
// OrganizeMobile each re-implemented target resolution reading ONLY f.url/f.path
// and f.name, so a message-row hand-off resolved to an empty identity, no
// pending-open was ever queued, and the user landed on the projects panel
// instead of the document. One resolver, every shape, both surfaces.

const base = (p) => String(p || '').split('/').pop();

// Normalize any file-ish object (attachment, shelf item, message row, artifact
// card) to its { path, name } identity. Absolute store URLs stay absolute;
// corner paths shed leading slashes to match review-queue item ids — the same
// contract reviewItemsFromFiles applies when it builds an injected queue.
export function fileTargetIdentity(f) {
  const raw = String(f?.url || f?.path || f?.attachmentUrl || '');
  const path = /^https?:\/\//i.test(raw) ? raw : raw.replace(/^\/+/, '');
  const name = String(f?.name || f?.fileName || '') || (path ? base(path) : '');
  return { path, name };
}

// A stable key for "have we applied this target already" guards. Must see every
// shape's identity, or two different message-row targets collide as the same key
// (both used to serialize to ['', '', ['']]).
export function filesTargetKey(target) {
  const t = target || {};
  return JSON.stringify([
    t.name || '',
    t.project || '',
    (t.files || []).map((f) => {
      const id = fileTargetIdentity(f);
      return id.path || id.name || '';
    }),
    !!t.needsReview,
  ]);
}

// Resolve a nav target against the loaded review queue (itemsAll). Pure: returns
// what the surface should DO — which project to enter, whether the needs-review
// filter applies, and the pending-open handle ({ rid, name, project }) that
// ultimately opens the document view. pending === null is the bug condition:
// nothing will ever open and the user is stranded on the projects panel.
export function resolveFilesTarget(target, itemsAll) {
  const t = target || {};
  const items = Array.isArray(itemsAll) ? itemsAll : [];
  const wantsFile = !!(t.name || (t.files && t.files.length));
  let item = null;
  let rawPath = '';
  let rawName = t.name || '';
  if (t.files && t.files.length) {
    const ident = fileTargetIdentity(t.files[0] || {});
    rawPath = ident.path;
    rawName = ident.name || rawName;
    item = (rawPath && items.find((i) => i.id === rawPath))
      || (rawName ? items.find((i) => base(i.id) === rawName) : null) || null;
  } else if (t.name) {
    item = items.find((i) => base(i.id) === t.name && (!t.project || i.whoRaw === t.project))
      || items.find((i) => base(i.id) === t.name) || null;
  }
  const proj = (item && (item.whoRaw || '__personal')) || t.project || null;
  const rid = item ? item.id : rawPath;
  const pending = (rid || rawName)
    ? { rid, name: rawName, project: t.project || (item && item.whoRaw) || '' }
    : null;
  return { wantsFile, item, proj, rid, name: rawName, pending };
}

// Normalize whatever a "Comment in Review" / "Review" click hands off into the
// payload onOpenReview expects: an array of file objects, or null. Callers have
// historically wired both `onClick={() => onReview(files)}` (correct: an array)
// and `onClick={onReview}` (wrong: hands over the DOM click event) — the latter
// dropped to null and stranded the user on the projects panel with no file to
// resolve (2026-07-18). This makes the hand-off shape-proof: an array passes
// through, a lone file object with any usable address becomes a one-item list,
// and a bare event / addressless value becomes null (Review shows its queue).
export function normalizeReviewHandoff(input) {
  if (Array.isArray(input)) return input;
  if (input && typeof input === 'object'
      && !(input.nativeEvent || input.currentTarget || input.target)
      && (input.attachmentUrl || input.url || input.path || input.fileName || input.name)) {
    return [input];
  }
  return null;
}
