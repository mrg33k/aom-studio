// cv6next — the real PDF reader (corner:one-corner M7). Replaces the <iframe>
// native-viewer embed, which free-scrolled (pan/zoom inside the frame), showed
// only page 1 on iOS, and swallowed clicks so pins needed the pinshield layer.
//
// Model: pdf.js renders EVERY page onto its own canvas, stacked vertically
// inside the .doc flow — the pane's own vertical scroll is the only scroll.
// Pages are measured up front (exact aspect-ratio placeholders, so total
// height is stable immediately and pin % positions hold before paint) and
// painted lazily as they approach the viewport. Clicks land on plain canvases
// and bubble to the .doc pin listener — pins work with no shield, exactly
// like images.
//
// The shell is inert HTML emitted by the data hooks (useReview / useOrganize);
// usePdfDocs() hydrates any [data-pdf-doc] node that appears under the wrapper.
// Hydration survives template ticks because the data-html guard compares the
// bound STRING (el.__cv6Html), never the live DOM (see templateEngine.js).

import { useEffect } from 'react';
import { cornerLogoLoaderMarkup } from '../../cv6kit/cornerLogoLoaderMarkup.js';

// The reader renders on the .doc paper, which is FORCED LIGHT in every app theme
// (cv6.css .doc background:#fbfbfa, no theme qualifier). Theme-reactive tokens
// (--fg/--muted/--faint/--hair) track the APP theme and resolve near-white on this
// light paper in Dark/Glass — invisible ink (Steffen design-gate send-back,
// 2026-07-13). Every color below is therefore paper-locked, never a var().
const INK = '#1a1a1a';        // titles on paper
const INK_MID = '#6a6a72';    // captions / labels / loading on paper (AA on #fbfbfa)
const PAPER_HAIR = 'rgba(0,0,0,.12)';

const WAIT_HTML = cornerLogoLoaderMarkup('Loading PDF…', {
  paper: true,
  compact: true,
  minHeight: 180,
  waitAttribute: 'data-pdf-wait',
});

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// The inert shell the data hooks embed as bodyHtml. src must already be a safe
// URL (tunnel path built with encodeURIComponent, or the upload's store URL).
export function pdfShellHtml(src, name) {
  return `<div data-pdf-doc data-pdf-src="${escAttr(src)}" data-pdf-name="${escAttr(name || 'document.pdf')}" style="position:relative;">${WAIT_HTML}</div>`;
}

const CANVAS_MAX_W = 1600;             // device px cap per page render (mobile memory)
const PAINT_MARGIN = '1400px 0px';     // start painting pages this far from the viewport

function errorCard(src, name) {
  return (
    '<div style="display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:10px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);">'
    + `<span style="font-size:13px;font-weight:600;color:${INK};">This PDF couldn't load</span>`
    + `<span style="font-size:12px;color:${INK_MID};">Open it directly or download it instead.</span>`
    + `<span><a href="${escAttr(src)}" download="${escAttr(name)}" style="font-size:12.5px;font-weight:600;color:#0066FF;text-decoration:none;">Download</a></span></div>`
  );
}

async function hydrateOne(node, registry) {
  const src = node.getAttribute('data-pdf-src') || '';
  const name = node.getAttribute('data-pdf-name') || 'document.pdf';
  if (!src) return;
  const entry = { io: null, doc: null, dead: false };
  registry.set(node, entry);
  try {
    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ url: src }).promise;
    if (entry.dead || !node.isConnected) { doc.destroy(); return; }
    entry.doc = doc;

    // Measure every page first: exact-aspect placeholders make the stack's
    // total height correct before any paint, so scroll and pin % geometry
    // never shift under the reader.
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      if (entry.dead) return;
      const vp = page.getViewport({ scale: 1 });
      pages.push({ page, w: vp.width, h: vp.height });
    }

    const frag = document.createDocumentFragment();
    // Slim header: the document stays in this in-page reader.
    const head = document.createElement('div');
    head.setAttribute('style', 'display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;');
    head.innerHTML = `<span class="mono" style="font-size:10.5px;letter-spacing:.4px;color:${INK_MID};">PDF · ${doc.numPages} PAGE${doc.numPages === 1 ? '' : 'S'}</span>`;
    frag.appendChild(head);

    const holders = [];
    pages.forEach((p, ix) => {
      const holder = document.createElement('div');
      holder.setAttribute('data-pdf-page', String(ix + 1));
      holder.setAttribute('style',
        // 4px radius, not 10: a document page is a rectangle — heavier rounding
        // shaved the corners off edge-bleed slides (full-width footer bars).
        `position:relative;width:100%;aspect-ratio:${p.w}/${p.h};margin:0 0 3px;`
        + `background:#fff;border:1px solid ${PAPER_HAIR};border-radius:4px;overflow:hidden;`);
      frag.appendChild(holder);
      // Page number lives UNDER the page, never on it — an overlay chip covered
      // real content in bottom-right corners (totals bars, slide footers).
      const cap = document.createElement('div');
      cap.className = 'mono';
      cap.setAttribute('style',
        `text-align:right;margin:0 2px 10px;font-size:10px;letter-spacing:.4px;color:${INK_MID};`);
      cap.textContent = `${ix + 1} / ${doc.numPages}`;
      frag.appendChild(cap);
      holders.push(holder);
    });

    node.innerHTML = '';
    node.appendChild(frag);

    const paint = async (holder) => {
      const ix = parseInt(holder.getAttribute('data-pdf-page'), 10) - 1;
      const p = pages[ix];
      if (!p || holder.querySelector('canvas') || entry.dead) return;
      const cssW = holder.clientWidth || 460;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(cssW * dpr, CANVAS_MAX_W) / p.w;
      const vp = p.page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      canvas.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;display:block;');
      try {
        await p.page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: vp }).promise;
        if (!entry.dead) holder.appendChild(canvas);
      } catch { /* render race on file switch — placeholder simply stays blank */ }
    };

    // First page paints immediately (the reader opens onto real content);
    // the rest paint as they near the viewport.
    if (holders[0]) paint(holders[0]);
    if (holders.length > 1) {
      entry.io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { entry.io.unobserve(e.target); paint(e.target); }
        }
      }, { rootMargin: PAINT_MARGIN });
      holders.slice(1).forEach((h) => entry.io.observe(h));
    }
  } catch {
    if (!entry.dead && node.isConnected) node.innerHTML = errorCard(src, name);
  }
}

function disposeEntry(entry) {
  if (!entry || entry.dead) return;
  entry.dead = true;
  try { entry.io?.disconnect(); } catch { /* already gone */ }
  try { entry.doc?.destroy(); } catch { /* already gone */ }
}

// Host-side hydrator. Mount once per screen next to useReviewPinUI; it watches
// the wrapper for [data-pdf-doc] shells appearing (file opened / switched) and
// disposes pdf.js state when a shell leaves the DOM.
export function usePdfDocs(wrapRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const registry = new Map(); // node -> { io, doc, dead }

    const sweep = () => {
      for (const node of wrap.querySelectorAll('[data-pdf-doc]:not([data-pdf-live])')) {
        node.setAttribute('data-pdf-live', '1');
        hydrateOne(node, registry);
      }
      for (const [node, entry] of registry) {
        if (!node.isConnected) { disposeEntry(entry); registry.delete(node); }
      }
    };

    sweep();
    const obs = new MutationObserver(sweep);
    obs.observe(wrap, { subtree: true, childList: true });
    return () => {
      obs.disconnect();
      for (const [, entry] of registry) disposeEntry(entry);
      registry.clear();
    };
  }, [wrapRef, enabled]);
}
