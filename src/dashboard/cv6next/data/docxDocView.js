// cv6next — inline Word-document reader (corner:one-corner M9). Before this,
// every .docx rendered "Preview is not available for this file type", which in
// the user's world reads as "the doc didn't load" — the 2026-07-13 "it's not
// just pdfs it's a lot of docs too" complaint.
//
// Model mirrors the M7 PDF reader (pdfDocView.js): the data hooks emit an
// inert [data-docx-doc] shell synchronously; useDocxDocs() hydrates any shell
// that appears under the wrapper — fetches the bytes off the tunnel (CORS *,
// no auth header needed), converts docx→HTML with mammoth (lazy chunk, only
// docx sessions download it), and writes the result into the .doc flow.
// Clicks land on plain markup and bubble to the pin listener, same as PDF.

import { useEffect } from 'react';
import { cornerLogoLoaderMarkup } from '../../cv6kit/cornerLogoLoaderMarkup.js';

// The reader renders on the .doc paper, which is FORCED LIGHT in every app
// theme — ink must be paper-locked constants, never theme tokens (M7 standing
// lesson; Steffen design-gate send-back 2026-07-13).
const INK = '#1a1a1a';
const INK_MID = '#6a6a72';
const PAPER_HAIR = 'rgba(0,0,0,.12)';

const WAIT_HTML = cornerLogoLoaderMarkup('Loading document…', {
  paper: true,
  compact: true,
  minHeight: 180,
  waitAttribute: 'data-docx-wait',
});

function escAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function docxShellHtml(src, name) {
  return `<div data-docx-doc data-docx-src="${escAttr(src)}" data-docx-name="${escAttr(name || 'document.docx')}" style="position:relative;">${WAIT_HTML}</div>`;
}

// True when a filename should route to this reader. One definition — the data
// hooks (useOrganize / useReview) must never drift on what counts as a docx.
export function isDocxName(name) {
  return /\.docx$/i.test(String(name || ''));
}

function errorCard(src, name, why) {
  return (
    '<div style="display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:10px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.25);">'
    + `<span style="font-size:13px;font-weight:600;color:${INK};">This document couldn't load</span>`
    + `<span style="font-size:12px;color:${INK_MID};">${escAttr(why || 'Open it directly or download it instead.')}</span>`
    + `<span><a href="${escAttr(src)}" download="${escAttr(name)}" style="font-size:12.5px;font-weight:600;color:#0066FF;text-decoration:none;">Download</a></span></div>`
  );
}

// Typography for mammoth's semantic output, scoped under [data-docx-body] and
// paper-locked (fixed ink, hairlines as rgba-black). A <style> element applies
// fine when injected via innerHTML — only <script> is inert.
const BODY_CSS =
  '[data-docx-body]{color:#1a1a1a;font-size:14px;line-height:1.65;word-break:break-word;}'
  + '[data-docx-body] h1{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:20px 0 8px;color:#1a1a1a;}'
  + '[data-docx-body] h2{font-size:16px;font-weight:700;letter-spacing:-.01em;margin:18px 0 8px;color:#1a1a1a;}'
  + '[data-docx-body] h3,[data-docx-body] h4,[data-docx-body] h5,[data-docx-body] h6{font-size:14.5px;font-weight:700;margin:16px 0 6px;color:#1a1a1a;}'
  + '[data-docx-body] p{margin:0 0 12px;}'
  + '[data-docx-body] ul,[data-docx-body] ol{margin:0 0 12px;padding-left:22px;}'
  + '[data-docx-body] li{margin:0 0 5px;}'
  + `[data-docx-body] table{border-collapse:collapse;margin:0 0 14px;max-width:100%;display:block;overflow-x:auto;}`
  + `[data-docx-body] td,[data-docx-body] th{border:1px solid ${PAPER_HAIR};padding:6px 10px;font-size:13px;vertical-align:top;}`
  + '[data-docx-body] img{max-width:100%;height:auto;display:block;margin:10px 0;}'
  + `[data-docx-body] a{color:#0066FF;text-decoration:none;}`
  + `[data-docx-body] strong{color:#1a1a1a;}`;

// Mammoth converts document content, not markup — but its output still gets a
// hygiene pass: strip any element/attribute that could script (defense in
// depth; the file bytes are user-supplied).
function sanitize(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  for (const el of tpl.content.querySelectorAll('script,iframe,object,embed,link,meta,style')) el.remove();
  for (const el of tpl.content.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      const n = attr.name.toLowerCase();
      const v = String(attr.value || '');
      if (n.startsWith('on')) el.removeAttribute(attr.name);
      else if ((n === 'href' || n === 'src') && /^\s*(javascript|vbscript):/i.test(v)) el.removeAttribute(attr.name);
      // Inline images arrive as data: URIs from mammoth — those stay.
    }
  }
  return tpl.innerHTML;
}

async function hydrateOne(node, registry) {
  const src = node.getAttribute('data-docx-src') || '';
  const name = node.getAttribute('data-docx-name') || 'document.docx';
  if (!src) return;
  const entry = { dead: false };
  registry.set(node, entry);
  try {
    const [mod, resp] = await Promise.all([
      // Prebundled browser build — the node entry reaches for fs/path.
      import('mammoth/mammoth.browser'),
      fetch(src),
    ]);
    if (!resp.ok) throw new Error(`fetch ${resp.status}`);
    const arrayBuffer = await resp.arrayBuffer();
    if (entry.dead || !node.isConnected) return;
    const mammoth = mod.default || mod;
    const result = await mammoth.convertToHtml({ arrayBuffer });
    if (entry.dead || !node.isConnected) return;
    const body = sanitize(result.value || '');
    if (!body.trim()) throw new Error('empty document');
    node.innerHTML =
      '<div style="display:flex;align-items:center;margin:0 0 10px;">'
      + `<span class="mono" style="font-size:10.5px;letter-spacing:.4px;color:${INK_MID};">WORD DOCUMENT</span></div>`
      + `<style>${BODY_CSS}</style>`
      + `<div data-docx-body>${body}</div>`;
  } catch (e) {
    if (!entry.dead && node.isConnected) {
      node.innerHTML = errorCard(src, name, e && /fetch (\d+)/.test(e.message)
        ? `The file couldn't be fetched (status ${e.message.match(/fetch (\d+)/)[1]}).`
        : undefined);
    }
  }
}

// Host-side hydrator — mount once per screen next to usePdfDocs.
export function useDocxDocs(wrapRef, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const registry = new Map();

    const sweep = () => {
      for (const node of wrap.querySelectorAll('[data-docx-doc]:not([data-docx-live])')) {
        node.setAttribute('data-docx-live', '1');
        hydrateOne(node, registry);
      }
      for (const [node, entry] of registry) {
        if (!node.isConnected) { entry.dead = true; registry.delete(node); }
      }
    };

    sweep();
    const obs = new MutationObserver(sweep);
    obs.observe(wrap, { subtree: true, childList: true });
    return () => {
      obs.disconnect();
      for (const [, entry] of registry) entry.dead = true;
      registry.clear();
    };
  }, [wrapRef, enabled]);
}
