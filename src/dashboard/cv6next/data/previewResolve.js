// cv6next — pure file-preview resolution (no React, no fetch, no DOM).
//
// ONE home for "which viewer renders this file, and from what address" so the
// chat file modal (ChatLifecycle FileCollectionViewer), the Review tool
// (useReview reviewItemsFromFiles), and node:test can share identical logic.
// Extracted from useReview.js (R-CHAT-FILE-MODAL, corner:corner-ui-cv6): the
// chat modal used to fork its own kind detection and rendered a bare glyph for
// every non-image file — the "small modal that never loads the preview" bug.
//
// Identity (path + display name) is delegated to fileTargetIdentity in
// reviewTargetResolve.js so every chat file shape resolves the same way here,
// in Review's injected queue, and in the Organize deep-link resolvers.

import { fileTargetIdentity } from './reviewTargetResolve.js';

// Viewer type keys the Review renderer (buildDeliverableBody) understands.
export const REVIEW_VIEWER_TYPES = new Set(['image', 'photo', 'video', 'audio', 'doc', 'copy', 'code', 'sheet', 'siteshot', 'sitefile', 'sitelive']);
// Broad kinds that queue rows / chat mirrors stamp loosely — a concrete
// extension/mime detection must win over these (a .png stamped 'doc' is still
// an image; honoring the stamp produced binary-symbol dumps).
export const BROAD_REVIEW_TYPES = new Set(['doc', 'copy', 'code', 'sheet']);

// Detect the viewer type key from a filename / mime, for files handed straight
// in from a chat message (not the queue endpoint, which already typed them).
// `url` disambiguates a live site: an http(s) address with no recognizable file
// extension is a deployed page, not a document — review it in the sitelive viewer.
export function typeKeyOf(name, mime, url = '') {
  const ext = String(name || '').toLowerCase().split('.').pop();
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic', 'tiff', 'bmp'].includes(ext)) return 'image';
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi'].includes(ext)) return 'video';
  // Audio gets its own viewer (files-tool merge: Files browses audio too — the doc
  // branch's "no preview, download" card would be a regression vs Organize's player).
  if (m.startsWith('audio/') || ['wav', 'mp3', 'aac', 'm4a', 'ogg', 'flac', 'aiff', 'opus'].includes(ext)) return 'audio';
  if (['pdf', 'docx', 'doc', 'pptx', 'ppt'].includes(ext)) return 'doc';
  if (m === 'text/html' || m === 'application/xhtml+xml' || ['html', 'htm'].includes(ext)) return 'sitefile';
  // Structured-data + plain-text files read inline as text (monospace via the copy
  // branch) — same set Organize's dataFilePreview covered.
  if (['md', 'txt', 'json', 'jsonl', 'ndjson', 'yaml', 'yml', 'toml', 'csv', 'tsv', 'xml', 'ini', 'log'].includes(ext)) return 'copy';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'java'].includes(ext)) return 'code';
  if (/^https?:\/\//i.test(String(url || name || ''))) return 'sitelive';
  return 'doc';
}

// Resolve one chat-shaped file reference to the target the Review renderer
// loads: `{ path, title, type }` (path doubles as the queue item id — a full
// http(s) URL loads directly, a corner path goes through the tenant-gated
// project-file endpoint / RAG tunnel). Accepts every chat file shape:
//   attachments[] entries … { url, name, mime, size }
//   mobile thread messages … { attachmentUrl, fileName, fileMime, fileSize }
//   shelf / queue rows      … { path, name, mime, type }
// Returns null when the reference carries no address at all.
export function chatFileToReviewTarget(f) {
  if (!f || typeof f !== 'object') return null;
  const ident = fileTargetIdentity(f);
  const path = ident.path;
  if (!path) return null;
  const name = ident.name || 'File';
  // An explicit VIEWER type (e.g. 'sitelive' from an artifact card) wins over
  // detection. But shelf items carry a generic discriminator `type:'file'`/'link'
  // (file-vs-link, NOT a viewer key) — treating that as the viewer type sent every
  // uploaded image/pdf down the text branch and rendered "Preview is not available."
  // Fall through to extension/mime detection for those.
  const explicit = REVIEW_VIEWER_TYPES.has(f.type) ? f.type : '';
  const detected = typeKeyOf(name, f.mime || f.fileMime, path);
  // Extension/MIME wins for concrete file media. Chat and mirror rows are often
  // stamped with broad `doc`/`copy` kinds; honoring those over a real .png/.mp4/
  // .html/.pdf extension is what produced binary symbols and download-only cards.
  // Specialized explicit renderers (siteshot/sitelive/photo) remain intentional.
  const concrete = ['image', 'video', 'audio', 'sitefile'].includes(detected)
    || (detected === 'doc' && /\.(?:pdf|docx?|pptx?)$/i.test(name));
  const type = concrete && (!explicit || BROAD_REVIEW_TYPES.has(explicit)) ? detected : (explicit || detected);
  return { path, title: name, type };
}
