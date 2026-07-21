// MessageAttachments — render attachments in chat messages with Review affordances.
// Handles single/multiple images (galleries) and single/multiple files (collections).
// Images: single → thumbnail, >=2 → .cgal 3-col grid + lightbox viewer.
// Files: single → file card, >=2 → .filecoll collection card + lightbox viewer.

import React, { useState, useMemo } from 'react';

// Classify a file by mime/extension.
function fileKind(name, mime) {
  const m = String(mime || '').toLowerCase();
  const ext = String(name || '').toLowerCase().split('.').pop();
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'avif'].includes(ext)) return 'photo';
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'm4v', 'avi', 'mkv'].includes(ext)) return 'video';
  if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
  return 'file';
}

// Public tunnel base — the SAME Cloudflare tunnel host the Files/Review panel
// resolves shared files through (useReview / useOrganize `project-file-raw`).
export const TUNNEL_BASE = 'https://rag.aheadofmarket.com';

// Resolve any attachment address to a PUBLIC, credential-free URL — the ONE
// resolver the chat card AND the Files/Review panel share, so the two can never
// diverge (RANK 14). An absolute http(s) URL passes through; a corner path
// (repo-relative, leading slashes shed) becomes `${TUNNEL_BASE}/project-file-raw
// ?path=...`. This replaces the old `/api/dashboard/project-file?...&raw=1`
// endpoint, which is JWT/cookie-gated — a bare <img>/<a> can't authenticate it,
// so a corner-path card 401'd and showed a broken glyph even though the panel
// opened the very same file fine.
export function publicFileUrl(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  return `${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(u.replace(/^\/+/, ''))}`;
}

// Does this attachment carry an address we can actually open? Announcement-only
// posts ("Attached file: report.pdf" with no URL line) have none → the card
// downgrades to a non-interactive state instead of Open/Download that 400 (RANK 19a).
function hasUsableUrl(file) {
  return !!String(file?.url || '').trim();
}

// Return a file's openable URL. "Open" previews inline (the file host serves
// pdf/text/media inline; R79-f24). Corner paths resolve to the public tunnel so
// the inline <a>/<img> loads without a JWT (RANK 14).
function fileHref(url) {
  return publicFileUrl(url);
}

// Force-download props for a Download button. Both absolute tunnel files and
// corner paths resolve through the public tunnel, then take `?download=1` (the
// file host honors it → Content-Disposition: attachment, files-in-app R79-f24).
// The native `download` attr is ignored cross-origin, so the query flag carries it.
function downloadProps(file) {
  const href = publicFileUrl(file?.url);
  if (!href) return { href: undefined, 'aria-disabled': true };
  return { href: href + (href.includes('?') ? '&' : '?') + 'download=1' };
}

// <img> that degrades to a typed file-card instead of the browser's broken-image
// glyph when the source fails (an expired/again-unreachable tunnel URL), and
// reserves height so the thread doesn't jump while loading (RANK 16). The fallback
// names the file and offers a tap-to-retry (a cache-busted re-request).
function SmartImage({ src, alt, name, onClick, style, fallbackStyle }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bust, setBust] = useState(0);
  const retry = (e) => { e?.stopPropagation?.(); setFailed(false); setLoaded(false); setBust((n) => n + 1); };
  if (failed || !src) {
    return (
      <div onClick={retry} title="Couldn't load — tap to retry"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 132, padding: '20px 16px', background: 'var(--surface-2)', border: '1px solid var(--hair)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', ...fallbackStyle }}>
        {fileGlyph('photo')}
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name || alt || 'Image'}</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Couldn't load — tap to retry</span>
      </div>
    );
  }
  const finalSrc = bust ? `${src}${String(src).includes('?') ? '&' : '?'}_r=${bust}` : src;
  return (
    <img src={finalSrc} alt={alt} onClick={onClick} onError={() => setFailed(true)} onLoad={() => setLoaded(true)}
      style={{ ...(loaded ? null : { minHeight: 120 }), ...style }} />
  );
}

// Format file size (bytes) as human-readable (e.g. "2.4 MB").
function formatSize(bytes) {
  if (!bytes) return ''; // unknown/zero → show nothing (text-parsed attachments have no size)
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

// File-type icon glyph.
function fileGlyph(kind, className = '') {
  const c = kind === 'photo' ? 'var(--accent)' : kind === 'video' ? '#ec4899' : kind === 'pdf' ? '#f59e0b' : 'var(--muted)';
  const d = kind === 'photo' ? 'M3 5h18v14H3z M3 15l5-5 4 4 3-3 6 6'
    : kind === 'video' ? 'M23 7l-7 5 7 5V7Z M1 5h15v14H1z'
    : 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6';
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>;
}

// Download-to-tray glyph for the icon-button download affordance.
function downloadGlyph() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11M7 10l5 5 5-5M5 20h14" /></svg>;
}

// Single image thumbnail (rounded, click → lightbox, with Review button).
function SingleImage({ file, onReview }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SmartImage
          src={fileHref(file.url)}
          alt={file.name}
          name={file.name}
          onClick={() => setLightboxOpen(true)}
          style={{ maxWidth: '100%', maxHeight: 240, width: 'auto', height: 'auto', objectFit: 'contain', alignSelf: 'flex-start', borderRadius: 8, cursor: 'pointer' }}
          fallbackStyle={{ alignSelf: 'flex-start', maxWidth: 320 }}
        />
        <button onClick={() => onReview?.(file)} title="Open in the Review tab" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)', border: 'none', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', width: 'fit-content' }}>Review</button>
      </div>
      {lightboxOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={() => setLightboxOpen(false)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <SmartImage src={fileHref(file.url)} alt={file.name} name={file.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
            <button onClick={() => setLightboxOpen(false)} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Gallery renderer: 3-col grid with first tile .span2, "+N" on last, caption.
function ImageGallery({ files, onReview }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const showCount = 5; // Show 5 tiles, 6th gets "+N"
  const shown = files.slice(0, showCount);
  const hidden = Math.max(0, files.length - showCount);

  return (
    <>
      <div className="cgal">
        {shown.map((f, i) => (
          <div
            key={i}
            className={`ph${i === 0 ? ' span2' : ''}`}
            onClick={() => { setLightboxIdx(i); setLightboxOpen(true); }}
            style={{ cursor: 'pointer', backgroundImage: `url(${fileHref(f.url)})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {i === shown.length - 1 && hidden > 0 && <div className="more">+{hidden}</div>}
          </div>
        ))}
      </div>
      <div className="gal-cap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>
        <span>{files.length} image{files.length === 1 ? '' : 's'} · {formatSize(files.reduce((s, f) => s + (f.size || 0), 0))}</span>
      </div>

      {lightboxOpen && <GalleryLightbox files={files} idx={lightboxIdx} onIdx={setLightboxIdx} onClose={() => setLightboxOpen(false)} onReview={onReview} />}
    </>
  );
}

// Lightbox viewer for collections: look-only, prev/next, counter, "Comment in Review" button.
function GalleryLightbox({ files, idx, onIdx, onClose, onReview }) {
  const f = files[idx] || {};
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }} onClick={onClose}>
      <div className="fcviewer" onClick={(e) => e.stopPropagation()}>
        <div className="fcv-top">
          <button className="mback" onClick={onClose} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6l-12 12M6 6l12 12" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--fg)' }}>{f.name || 'Image'}</div>
            <div className="mono" style={{ fontSize: '10.5px', color: 'var(--faint)' }}>Gallery</div>
          </div>
        </div>
        <div className="fcv-stage is-dark">
          <SmartImage src={fileHref(f.url)} alt={f.name} name={f.name} style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} />
          <button
            className="fcv-arrow"
            style={{ left: 11 }}
            onClick={() => onIdx(Math.max(0, idx - 1))}
            disabled={idx === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            className="fcv-arrow"
            style={{ right: 11 }}
            onClick={() => onIdx(Math.min(files.length - 1, idx + 1))}
            disabled={idx === files.length - 1}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <div className="fcv-count">{idx + 1} / {files.length}</div>
        </div>
        <div className="fcv-foot">
          <span style={{ flex: 1, fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.4 }}>Look-only here. Swipe or tap the arrows.</span>
          <button onClick={() => onReview?.(f)} className="fc-rev" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/></svg>
            Comment in Review
          </button>
        </div>
      </div>
    </div>
  );
}

// Single file card: a contained, click-to-open row. The icon+name IS the open
// affordance (mirrors SingleImage — the file opens on click, so no separate
// "Open" pill); Download is a quiet icon button; Review is the filled primary.
// Width-capped so the actions sit beside the name, not marooned at the viewport
// edge on wide desktop. (files-in-app R79-f24, Steffen design pass.)
function SingleFile({ file, onReview }) {
  const kind = fileKind(file.name, file.mime);
  const ext = String(file.name || '').includes('.') ? String(file.name).split('.').pop() : '';
  const usable = hasUsableUrl(file);
  const glyph = <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{fileGlyph(kind)}</span>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', background: 'var(--surface-2)', border: '1px solid var(--hair)', borderRadius: 10, maxWidth: 560 }}>
      {usable ? (
        <a href={fileHref(file.url)} target="_blank" rel="noopener noreferrer" title="Preview the file" className="mfile-open" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
          {glyph}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="mfile-name" style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <span style={{ display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '.04em', color: 'var(--faint)', textTransform: 'uppercase' }}>{formatSize(file.size) || ext || kind}</span>
          </span>
        </a>
      ) : (
        // No usable address (announcement-only post) → non-interactive: name it and
        // point to where it CAN be opened, instead of an Open link that 400s (RANK 19a).
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {glyph}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <span style={{ display: 'block', fontSize: 10.5, color: 'var(--muted)' }}>Shared — open from the Files or Review tab</span>
          </span>
        </span>
      )}
      {usable && <a {...downloadProps(file)} title="Download the file" aria-label="Download" className="mfile-dl" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--hair)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{downloadGlyph()}</a>}
      <button onClick={() => onReview?.(file)} title="Open in the Review tab" style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)', border: 'none', padding: '6px 11px', borderRadius: 8, cursor: 'pointer', flex: 'none' }}>Review</button>
    </div>
  );
}

// File collection card: header + grid/list + footer with "Review all" button.
function FileCollection({ files, onReviewAll, onReview }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Classify: >=2 images → .fc-grid; otherwise → .fc-list
  const hasImages = files.some((f) => fileKind(f.name, f.mime) === 'photo');
  const gridMode = hasImages && files.filter((f) => fileKind(f.name, f.mime) === 'photo').length >= 2;
  const showCount = gridMode ? 8 : 3; // Show 8 image tiles or 3 doc rows
  const shown = files.slice(0, showCount);
  const hidden = Math.max(0, files.length - showCount);

  return (
    <>
      <div className="filecoll">
        <div className="fc-head">
          <span className="fc-ic">
            {hasImages ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="fc-t">{hasImages ? 'Shared images' : 'Shared files'}</div>
            <div className="fc-s">{files.length} {hasImages ? 'image' : 'file'}{files.length === 1 ? '' : 's'}{(() => { const t = formatSize(files.reduce((s, f) => s + (f.size || 0), 0)); return t ? ` · ${t}` : ''; })()}</div>
          </div>
        </div>
        {gridMode ? (
          <div className="fc-grid">
            {shown.map((f, i) => (
              <div key={i} className="fc-tile" onClick={() => setLightboxOpen(true)} style={{ backgroundImage: `url(${fileHref(f.url)})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}>
                {i === shown.length - 1 && hidden > 0 && <div className="more">+{hidden}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="fc-list">
            {shown.map((f, i) => {
              const usable = hasUsableUrl(f);
              return (
                <div key={i} className="fc-lrow">
                  {usable ? (
                    <a href={fileHref(f.url)} target="_blank" rel="noopener noreferrer" title="Preview the file" className="mfile-open" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                      <span className="lg">{fileGlyph(fileKind(f.name, f.mime))}</span>
                      <span className="mfile-name" style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </a>
                  ) : (
                    // No usable address → non-interactive row (RANK 19a): no Open/Download
                    // that 400s; the "Review all" footer still reaches the queue's copy.
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }} title="Open from the Files or Review tab">
                      <span className="lg">{fileGlyph(fileKind(f.name, f.mime))}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    </span>
                  )}
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--faint)', flex: 'none' }}>{formatSize(f.size)}</span>
                  {usable && <a {...downloadProps(f)} title="Download the file" aria-label="Download" className="mfile-dl" style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid var(--hair)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{downloadGlyph()}</a>}
                </div>
              );
            })}
            {hidden > 0 && (
              <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--muted)', borderTop: '1px solid var(--divider)' }}>+{hidden} more</div>
            )}
          </div>
        )}
        <div className="fc-foot">
          <span style={{ flex: 1, fontSize: '11.5px', color: 'var(--muted)' }}>Tap to preview</span>
          <button onClick={() => onReviewAll?.(files)} className="fc-rev">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>
            Review all
          </button>
        </div>
      </div>

      {lightboxOpen && <GalleryLightbox files={files} idx={0} onIdx={() => {}} onClose={() => setLightboxOpen(false)} onReview={onReview} />}
    </>
  );
}

// Main component: routes to single image, gallery, single file, or collection based on input.
export default function MessageAttachments({ attachments, onReview }) {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) return null;

  // Classify each attachment.
  const typed = attachments.map((a) => ({
    ...a,
    kind: fileKind(a.name, a.mime),
  }));

  // Split by type.
  const images = typed.filter((a) => a.kind === 'photo');
  const files = typed.filter((a) => a.kind !== 'photo');

  return (
    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Image single or gallery */}
      {images.length === 1 && <SingleImage file={images[0]} onReview={onReview} />}
      {images.length > 1 && <ImageGallery files={images} onReview={onReview} />}

      {/* File single or collection */}
      {files.length === 1 && <SingleFile file={files[0]} onReview={onReview} />}
      {files.length > 1 && <FileCollection files={files} onReviewAll={onReview} onReview={onReview} />}
    </div>
  );
}
