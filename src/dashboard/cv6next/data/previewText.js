// previewText.js — pure helpers for room-card preview lines. No imports so
// node:test can exercise them directly (tests/api/_lib/previewText.test.js).

// A raw URL is not a preview in the user's world (qa-sweep 2026-07-17: the AZ
// Tech Council card read "Deliverable approved: https://rag.aheadofmarket.com/
// files/aom/<uuid>-aztc-prize-website.pdf"). Swap each URL for its human file
// name (uuid prefix stripped) or, with no file segment, its hostname.
export function humanizeUrls(t) {
  return String(t || '').replace(/https?:\/\/[^\s<>"'()[\]`]+/g, (url) => {
    try {
      const u = new URL(url.replace(/[.,;:!?`]+$/, ''));
      const seg = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
      const named = seg.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '');
      if (/\.[a-z0-9]{2,5}$/i.test(named)) return named;
      return u.hostname;
    } catch { return url; }
  });
}

// "Attached file: path/to/name.md" → "Shared a file: name.md"; anything else
// gets its embedded URLs humanized. Whitespace collapsed either way.
// Also strip raw markdown syntax (**bold**, *italic*, `code`, [label](url)) so
// previews never show literal asterisks — BASELINE #3.
export function normalizePreview(text) {
  let t = String(text || '').replace(/\s+/g, ' ').trim();
  // Strip markdown before humanizing
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  const m = t.match(/^(?:attached file|attachment)\s*[:\-]?\s*([^\s|,]+\.[a-z0-9]{2,5})/i);
  if (!m) return humanizeUrls(t);
  const filename = m[1].replace(/^.*[/\\]/, '');
  return `Shared a file: ${filename}`;
}
