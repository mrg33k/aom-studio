// cv6next — Review tool data. Real deliverables queue shaped to the wired template.
// Loads from /api/dashboard/review-queue (search + sort in the queue panel) and
// wires approve / request-changes as real decision events. No fake data.

import { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { authFetch } from '../../lib/authFetch';
import { supabase } from '../../lib/supabase';
import { demoFixtureActive } from '../../lib/fixtureClient.js';
import { titleForAgent } from './agentTitles';
import { mediaAttrs } from './mediaFallback';
import { pdfShellHtml } from './pdfDocView';
import { docxShellHtml, isDocxName } from './docxDocView';
import { htmlShellHtml, isHtmlName } from './htmlDocView';
import { createFileRef } from '../../../../api/_lib/fileRef.js';
import { cornerLogoLoaderMarkup } from '../../cv6kit/cornerLogoLoaderMarkup.js';
// Viewer-type + identity resolution: previewResolve delegates identity to
// reviewTargetResolve's fileTargetIdentity, so this is the same contract the
// Organize deep-link resolvers use (R-CHAT-FILE-MODAL + files-target rounds).
import { REVIEW_VIEWER_TYPES, BROAD_REVIEW_TYPES, typeKeyOf, chatFileToReviewTarget } from './previewResolve.js';

marked.setOptions({ gfm: true, breaks: false });

const TINTS = ['green', 'lime', 'amber', 'violet'];
const MEDIA_WAIT_HTML = cornerLogoLoaderMarkup('Loading media…', {
  compact: true,
  mediaWait: true,
  minHeight: 180,
});
const HIDE_MEDIA_WAIT = "var w=this.parentElement&&this.parentElement.querySelector('[data-media-wait]');if(w)w.style.display='none';";

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

// authFetch with a hard timeout so a hung request degrades to an error instead of
// leaving the viewer stuck on "Loading the file…".
async function authFetchT(url, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await authFetch(url, { signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

async function readJsonOrNull(response) {
  if (!response?.ok) return null;
  const type = String(response.headers?.get?.('content-type') || '').toLowerCase();
  if (type && !type.includes('application/json')) return null;
  try { return await response.json(); }
  catch { return null; }
}

// Download a deliverable's real bytes with its true filename, for ANY type.
// A plain cross-origin `<a download href>` is IGNORED by browsers (they navigate/
// open the file instead of saving it), so we fetch the bytes ourselves and hand the
// anchor a same-origin blob: URL — that reliably preserves the filename for every
// type (image / video / doc / copy / code / live-site draft). Source order mirrors
// the viewer: (1) the RAG tunnel (CORS *, Range-capable, survives video-sized files —
// the same source images + video already stream from), then (2) the same-origin authed
// project-file proxy as a fallback, then (3) open-raw so the user can still save by hand.
async function downloadDeliverable(item) {
  const path = item?.id || '';
  if (!path) return;
  const title = item?.title || path.split('/').pop() || 'download';
  const isAbs = /^https?:\/\//i.test(path);
  const enc = encodeURIComponent(path);
  const tunnelUrl = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
  const proxyUrl = isAbs ? path : `/api/dashboard/project-file?path=${enc}&raw=1`;
  const saveBlob = (blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };
  try {
    const r = await fetch(tunnelUrl);
    if (r?.ok) { saveBlob(await r.blob()); return; }
  } catch { /* tunnel unreachable — try the authed proxy */ }
  if (!isAbs) {
    try {
      const r = await authFetch(proxyUrl);
      if (r?.ok) { saveBlob(await r.blob()); return; }
    } catch { /* fall through to raw open */ }
  }
  window.open(tunnelUrl, '_blank', 'noopener');
}

// Build the read-view innerHTML for one deliverable from its real file.
// IMPORTANT: the project-file endpoint is tenant-gated (verifyTenant needs a
// Bearer token). The dashboard session lives in localStorage, NOT a cookie, so a
// plain <img src>/<video src>/<iframe src> to the API carries no auth and 401s.
// So we fetch EVERY file through authFetch (which attaches the token) and hand the
// element a blob: URL for binaries. Text renders markdown / preformatted inline.
// `path` is the relative corner/users/... path the review queue already carries (item.id).
export async function buildDeliverableBody(item) {
  const path = item?.id || '';
  if (!path) return '';
  const enc = encodeURIComponent(path);
  // A file handed in from chat can carry a full RAG-store URL (an uploaded file), not a
  // corner path. Load those directly; corner paths still go through the tenant-gated
  // project-file endpoint. Both are fetched with authFetch (token harmless on the store).
  const isAbs = /^https?:\/\//i.test(path);
  const rawUrl = isAbs ? path : `/api/dashboard/project-file?path=${enc}&raw=1`;
  const txtUrl = isAbs ? path : `/api/dashboard/project-file?path=${enc}`;
  const type = item.type;
  const errDiv = (msg) => `<div style="padding:14px 0;color:#666;">${msg}</div>`;

  // Binary: a full store URL loads cross-origin directly as the element src (no fetch,
  // no CORS). A corner path is auth-fetched and shown via a blob URL (the element can't
  // carry the token itself).
  async function blobOf() {
    if (isAbs) return { url: path };
    const r = await authFetchT(rawUrl);
    if (!r?.ok) return { err: `This file could not be loaded (status ${r?.status || '?'}).` };
    const blob = await r.blob();
    return { url: URL.createObjectURL(blob) };
  }

  // Browser chrome (design .browser/.bchrome/.burl) wrapping site content, and the
  // pin-shield for content that swallows clicks (iframes: PDFs + live sites). The
  // shield is a transparent layer the Pin-mode toggle flips on so clicks reach the
  // pin-comment listener; off, the content scrolls/navigates normally. The toggle is
  // plain markup — the delegated Review click listener owns its behavior.
  const pinShield = () => (
    '<div class="pinshield" style="position:absolute;inset:0;display:none;cursor:crosshair;z-index:4;"></div>'
    + '<button class="pinmode-toggle" type="button" style="position:absolute;top:10px;right:10px;z-index:5;display:flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:none;border-radius:15px;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);color:#fff;font-size:11.5px;font-weight:600;cursor:pointer;">Pin mode: off</button>'
  );
  const browserChrome = (urlLabel, inner) => (
    `<div class="browser"><div class="bchrome"><span class="bdot" style="background:#f87171;"></span><span class="bdot" style="background:#fbbf24;"></span><span class="bdot" style="background:#34d399;"></span><div class="burl">${escapeHtml(urlLabel)}</div></div>`
    + `<div style="position:relative;">${inner}</div></div>`
  );

  try {
    if (type === 'image' || type === 'photo') {
      // Streams off the tunnel like video — the blob-through-proxy path 404'd
      // assets/ files and dies on big screenshots (lambda response cap).
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      return `<div style="position:relative;min-height:180px;">${MEDIA_WAIT_HTML}<img src="${src}" ${mediaAttrs(src, 'image')} onload="${HIDE_MEDIA_WAIT}" alt="${escapeHtml(item.title)}" style="position:relative;max-width:100%;height:auto;display:block;border-radius:10px;" /></div>`;
    }
    if (type === 'video') {
      // Corner-path videos stream straight off the rag tunnel (Range-capable, CORS *).
      // The old blob path pulled the WHOLE file through the Vercel raw proxy, which
      // buffers in the lambda and dies on video-sized payloads — videos never loaded.
      // No native controls: the DS7 scrub bar (ReviewPins useVideoScrub) is the player
      // chrome — timeline with numbered comment markers, play button, mono times.
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      // max-height caps vertical 9:16 drafts: at natural size they filled 1300px+
      // of a ~800px viewport, shoving the scrub bar (the ONLY play control — no
      // native controls) below the fold. Read as "videos never load." 52vh (not
      // 62) so video + caption + title + 46px bar ALSO fit the mobile read window
      // (~100dvh-250px) without scrolling; margin:auto centers the portrait.
      return `<div style="position:relative;min-height:180px;">${MEDIA_WAIT_HTML}<video src="${src}" ${mediaAttrs(src, 'video')} onloadeddata="${HIDE_MEDIA_WAIT}" preload="metadata" playsinline style="position:relative;max-width:100%;max-height:min(52vh,860px);width:auto;margin:0 auto;border-radius:10px;display:block;background:#000;"></video></div>`;
    }
    if (type === 'audio') {
      // Streams off the tunnel like video (Range-capable, CORS *). Native controls are
      // fine for audio — the DS7 scrub bar is a video-frame affordance (pins on frames).
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      return `<audio src="${src}" ${mediaAttrs(src, 'audio')} controls preload="metadata" style="width:100%;display:block;margin:12px 0;border-radius:8px;"></audio>`;
    }
    if (type === 'siteshot') {
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      return browserChrome(item.title, `<img src="${src}" alt="${escapeHtml(item.title)}" style="width:100%;height:auto;display:block;" />`);
    }
    if (type === 'sitefile' || isHtmlName(item.title || path)) {
      // A saved HTML artifact is not a live URL and must not be sent to the generic
      // document/download branch. Hydrate it into an isolated srcdoc iframe; the
      // shell includes Review's pin-shield so comments land on the visible page.
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      return htmlShellHtml(src, item.title, path);
    }
    if (type === 'sitelive') {
      // A live site delivered by link: browser-chrome canvas + sandboxed iframe with
      // the pin layer, plus the Open-live affordance (design live-site review canvas).
      // Sites that refuse framing (CSP) show blank — the Open-live link stays the out.
      const href = isAbs ? path : `https://${path}`;
      const bare = href.replace(/^https?:\/\//i, '');
      return (
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;background:rgba(0,102,255,.10);border:1px solid rgba(0,102,255,.28);border-radius:11px;padding:10px 13px;">`
        + `<span style="flex:1;font-size:12.5px;color:#c9ccd1;">Delivered as a live link. Flip on Pin mode to comment, or open it full-size.</span>`
        + `<a href="${href}" target="_blank" rel="noopener" style="text-decoration:none;height:32px;padding:0 13px;border-radius:9px;background:#0066FF;color:#fff;font-size:12px;font-weight:600;display:inline-flex;align-items:center;">Open live ↗</a></div>`
        + browserChrome(bare, `<iframe src="${href}" title="${escapeHtml(item.title)}" sandbox="allow-scripts allow-same-origin allow-forms" style="width:100%;height:62vh;border:0;display:block;background:#fff;"></iframe>${pinShield()}`)
      );
    }
    if (type === 'doc') {
      if (/\.pdf$/i.test(path)) {
        // The real PDF reader (M7): pdf.js paints every page onto stacked canvases
        // (usePdfDocs hydrates the shell on the host screen). One vertical scroll,
        // all pages visible, and clicks reach the pin listener directly — no more
        // iframe (free-scrolled, one page on iOS) and no pinshield needed. Bytes
        // still stream off the tunnel (inline, Range, CORS * — R79-f24 posture).
        const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
        return pdfShellHtml(src, item.title);
      }
      if (isDocxName(path)) {
        // Word docs read inline too (M9) — useDocxDocs hydrates the shell on the
        // host screen (mammoth converts docx→HTML in a lazy chunk); bytes stream
        // off the tunnel exactly like the PDF reader.
        const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
        return docxShellHtml(src, item.title);
      }
      // Other docs (pptx/xls/legacy .doc): auth-fetch the bytes and offer a download.
      const b = await blobOf();
      if (b.err) return errDiv(b.err);
      return errDiv(`Preview is not available for this file type. <a href="${b.url}" download="${escapeHtml(item.title)}" style="color:#0066FF;">Download ${escapeHtml(item.title)}</a>`);
    }
    // text: copy (.md / .txt) or code. A store URL is read with a plain cross-origin GET
    // (no auth header → no preflight); a corner path goes through project-file with auth.
    const r = isAbs ? await fetch(txtUrl) : await authFetchT(txtUrl);
    if (!r?.ok) return errDiv(`This file's contents could not be loaded (status ${r?.status || '?'}).`);
    // The store returns the raw file; project-file wraps it as { content }.
    const content = isAbs ? await r.text() : ((await r.json())?.content || '');
    // Never text-dump binary. If a file slips past typing (mis-stamped, no clean
    // extension) and its bytes are actually an image/video/etc., the raw content is
    // full of control chars / a magic-byte header — rendering it as <pre> is the
    // "all symbols" bug. Sniff for that and offer a download instead of dumping.
    if (looksBinary(content)) {
      const b = await blobOf();
      if (!b.err) return errDiv(`Preview is not available for this file. <a href="${b.url}" download="${escapeHtml(item.title)}" style="color:#0066FF;">Download ${escapeHtml(item.title)}</a>`);
      return errDiv('Preview is not available for this file type.');
    }
    if (/\.md$/i.test(path)) {
      try { return marked.parse(content); } catch { /* fall through to pre */ }
    }
    return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono,monospace);font-size:13px;line-height:1.6;margin:0;">${escapeHtml(content)}</pre>`;
  } catch {
    return errDiv("This file's contents could not be loaded right now.");
  }
}

// The list-row thumbnail for a visual deliverable. Uses the SAME working source as
// the open item's big preview (the RAG tunnel — /project-file-raw streams the raw
// bytes, CORS *, the blob-through-Vercel proxy 404'd assets/ and died on big files).
// Only genuinely visual types get a thumbnail; everything else keeps its type glyph.
// `hasThumb` ('yes'|'no') drives the template's data-switch between <img> and glyph.
function thumbFor(path, type) {
  const visual = type === 'image' || type === 'photo' || type === 'siteshot';
  if (!visual || !path) return { thumb: '', hasThumb: 'no' };
  const isAbs = /^https?:\/\//i.test(path);
  const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${encodeURIComponent(path)}`;
  return { thumb: src, hasThumb: 'yes' };
}

// Collapse a run of sequential same-project frames (render-0118 … render-0139) into
// ONE representative row so a single shoot can't bury the whole queue (FINDING 6).
// A frame is "<stem><digits><ext>"; frames sharing project + mission + stem + ext
// are one burst. MIN_GROUP keeps genuine pairs/triples as their own rows — only a
// real flood collapses. The group row opens the newest frame; its title carries the
// numeric range + frame count so the collapse is honest and legible.
const SEQ_RE = /^(.*?)(\d{2,})(\.[a-z0-9]+)$/i;
const MIN_GROUP = 4;
function groupSequences(items) {
  const buckets = new Map();
  const order = []; // one slot per solo item or per bucket, at first-seen position
  for (const it of items) {
    const groupable = it.type === 'image' || it.type === 'photo';
    const m = groupable ? String(it.title || '').match(SEQ_RE) : null;
    if (!m) { order.push({ solo: it }); continue; }
    const [, stem, num, ext] = m;
    const key = `${it.whoRaw}|${it.missionRaw}|${stem.toLowerCase()}|${ext.toLowerCase()}`;
    if (!buckets.has(key)) {
      const b = { key, members: [], stem, ext };
      buckets.set(key, b);
      order.push({ bucket: b });
    }
    buckets.get(key).members.push({ it, num: parseInt(num, 10), numRaw: num });
  }
  const out = [];
  const emitted = new Set();
  for (const slot of order) {
    if (slot.solo) { out.push(slot.solo); continue; }
    const b = slot.bucket;
    if (emitted.has(b.key)) continue;
    emitted.add(b.key);
    if (b.members.length < MIN_GROUP) { for (const mm of b.members) out.push(mm.it); continue; }
    const rep = b.members[0].it; // members are newest-first → newest frame represents
    const nums = b.members.map((x) => x.num);
    const pad = b.members[0].numRaw.length;
    const fmt = (n) => String(n).padStart(pad, '0');
    out.push({
      ...rep,
      isGroup: true,
      groupIds: b.members.map((x) => x.it.id),
      title: `${b.stem}${fmt(Math.min(...nums))}–${fmt(Math.max(...nums))} · ${b.members.length} frames`,
      count: b.members.length,
      countState: 'some',
    });
  }
  return out;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function tintFor(seed) {
  let h = 0;
  for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

function relTime(d) {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (Number.isNaN(ms)) return '';
  const m = Math.round(ms / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function typeLabel(type) {
  const map = {
    doc: 'Document',
    image: 'Image',
    photo: 'Photo',
    video: 'Video',
    audio: 'Audio',
    copy: 'Copy',
    code: 'Code',
    siteshot: 'Screenshot',
    sitefile: 'Web page',
    sitelive: 'Live site',
  };
  return map[type] || 'Document';
}

function typeGlyph(type) {
  const glyphs = {
    doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 13h6M9 17h4',
    image: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    photo: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z|M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    video: 'M23 7l-7 5 7 5V7Z|M1 5h22a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H1a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    copy: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 13h6M9 17h4',
    code: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z|M14 2v6h6|M9 13h6M9 17h4',
    siteshot: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z',
    sitefile: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z|M12 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    sitelive: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z|M12 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    audio: 'M9 18V5l12-2v13|M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  };
  return glyphs[type] || glyphs.doc;
}

// True when a string of "text" is really binary bytes (an image/video/etc. that
// slipped past typing). Checks the first slice for the U+FFFD replacement char, NUL,
// or a dense run of C0 control chars — text files never carry these, binaries always do.
function looksBinary(s) {
  if (!s) return false;
  const head = s.slice(0, 512);
  // Bytes off a binary file, once UTF-8-decoded to text, are riddled with the U+FFFD
  // replacement char and NUL — neither ever appears in a real text/markdown/code file.
  if (head.includes('\uFFFD') || head.includes('\u0000')) return true;
  // Plus a C0-control density backstop (tab/newline/CR excluded).
  const ctrl = (head.match(/[\x01-\x08\x0E-\x1F]/g) || []).length;
  return ctrl / head.length > 0.05;
}

// Viewer type detection + chat-file resolution live in previewResolve.js (pure,
// node:test-covered, shared with the chat file modal — R-CHAT-FILE-MODAL).
// typeKeyOf / the type sets are re-imported here so queue mapping keeps working.

// Map chat attachments ({ url, name, mime }) to review queue items so the Review tool
// can show EXACTLY the files a user tapped "Review"/"Review all" on, live from the
// message — no dependency on the pre-built queue. `url` is the corner path the viewer
// loads through project-file (same as queue item.id).
export function reviewItemsFromFiles(files, project = '') {
  return (files || [])
    .map((f) => {
      // ONE resolution contract for every producer shape ({url,name} attachments,
      // {attachmentUrl,fileName} message rows, {path} refs) — identity + viewer
      // type both come from previewResolve/reviewTargetResolve, shared with the
      // chat file modal and the Organize deep-link resolvers.
      const target = chatFileToReviewTarget(f);
      if (!target) return null;
      const { path, title: name, type: key } = target;
      const fileRef = createFileRef({
        id: path,
        url: /^https?:\/\//i.test(path) ? path : '',
        path,
        name,
        mime: f.mime || f.fileMime || '',
        project,
        source: 'injected',
        sourceKind: 'injected',
        kind: key,
        reviewStatus: 'available',
      });
      return {
        id: path, title: name,
        who: project || '', whoRaw: project || '', whoInitials: initials(project || name), whoTint: tintFor(project || name),
        type: key, typeLabel: typeLabel(key), typeGlyph: typeGlyph(key),
        ...thumbFor(path, key),
        count: 0, countState: 'zero', status: 'ready', statusLabel: 'READY', time: '', missionLabel: '', missionRaw: '',
        location: project || '', queueState: 'ready', file: typeLabel(key),
        bodyHtml: '', open: 'off', pins: [], comments: [], openCount: 0,
        fileRef,
      };
    })
    .filter(Boolean);
}

// WD40-R5: server-side paging — fetch 40 items per page. "Load older items" now
// fetches the next server page instead of just expanding a client-side window over
// a hard-capped 500-item set. The header shows "N of M" when more pages remain.
const PAGE_SIZE = 40; // items fetched per server page (initial load + each loadMore)

// Map one raw queue item (from the API) to the shape the templates expect.
// Extracted so load() and loadMore() share identical mapping logic.
function mapQueueItem(it, openId) {
  const fileRef = it.file_ref || createFileRef({
    id: it.id || it.path,
    path: it.id || it.path,
    url: /^https?:\/\//i.test(String(it.id || it.path || '')) ? (it.id || it.path) : '',
    name: it.name,
    mime: it.mime,
    sizeBytes: it.size,
    project: it.project,
    mission: it.mission,
    source: it.source_kind,
    sourceKind: it.source_kind,
    sourcePath: it.source_path,
    sha256: it.sha256,
    updatedAt: it.last_modified,
    healthStatus: it.health_status,
  });
  const rawApiKey = (it.type && typeof it.type === 'object') ? it.type.key : (it.type || 'doc');
  const apiKey = REVIEW_VIEWER_TYPES.has(rawApiKey) ? rawApiKey : '';
  // A deliverable's stored type can be mis-stamped (e.g. a .png filed as 'doc'/'copy'/a
  // deliverable kind), which sends real media down the text branch of renderBody and
  // dumps its raw bytes as symbols — the "loads as a Document, all symbols" bug. The
  // filename extension is authoritative for concrete browser-rendered files
  // (media, HTML, PDF/Word/PowerPoint) when the stored type is only a broad text/doc
  // bucket. Specialized renderers such as siteshot and sitelive remain intentional.
  const nameForType = it.name || String(it.id || it.path || '').split('/').pop() || '';
  const extKey = typeKeyOf(nameForType, it.mime || '', it.id || it.path || '');
  const concrete = ['image', 'video', 'audio', 'sitefile'].includes(extKey)
    || (extKey === 'doc' && /\.(?:pdf|docx?|pptx?)$/i.test(nameForType));
  const typeKey = concrete && (!apiKey || BROAD_REVIEW_TYPES.has(apiKey)) ? extKey : (apiKey || extKey);
  return {
    id: it.id || it.path,
    title: it.name || 'Untitled',
    who: titleForAgent(it.project || ''),
    whoRaw: it.project || '',
    whoInitials: initials(it.project || ''),
    whoTint: tintFor(it.project || ''),
    type: typeKey,
    typeLabel: typeLabel(typeKey),
    typeGlyph: typeGlyph(typeKey),
    ...thumbFor(it.id || it.path, typeKey),
    count: 0,
    countState: 'zero',
    status: 'ready',
    statusLabel: 'READY',
    time: relTime(it.last_modified),
    ts: it.last_modified || '',
    location: it.mission ? `${it.project} / ${it.mission}` : it.project,
    missionLabel: it.mission ? `/ ${it.mission}` : '',
    missionRaw: it.mission || '',
    // Content identity (share-file.py stamps both onto the hand-off message).
    // POSTed with every verdict so the server can suppress re-shares of the
    // same unchanged bytes (review-loop).
    sourcePath: it.source_path || '',
    sha256: it.sha256 || '',
    fileRef,
    healthStatus: fileRef.health?.status || it.health_status || 'ready',
    queueState: 'ready',
    file: `${typeLabel(typeKey)} · ${relTime(it.last_modified)}`,
    bodyHtml: '',
    open: it.id === openId ? 'on' : 'off',
    pins: [],
    comments: [],
    openCount: 0,
  };
}

export function useReview(worldId = null, injected = null) {
  const hasInjected = Array.isArray(injected) && injected.length > 0;
  const [queue, setQueue] = useState(null);
  const [openDelId, setOpenDelId] = useState(null);
  // Files-tool merge (corner:one-corner): any browsed file can open in review, even
  // when it is NOT in the waiting queue (already decided, or never handed off).
  // "External" items register here so the body fetch / deliverable panel / verdicts
  // resolve them exactly like queue items — shared machinery, never a fork.
  const [extraItems, setExtraItems] = useState({}); // id -> mapped item shape
  const extraItemsRef = useRef({});
  extraItemsRef.current = extraItems;
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [bodies, setBodies] = useState({}); // path -> rendered innerHTML ('' while loading)
  // review-loop: newest hand-off timestamp (pre-decision-filter) from the server —
  // drives the "Last delivery <rel> ago" header line.
  const [newestTs, setNewestTs] = useState(null);
  // review-loop: transient status line after a verdict ("Tracked as task …").
  // Shape: { text, actionLabel?, onAction? } — an action makes the toast a real
  // control (the dismiss toast is "Dismissed — Undo", per the design gate).
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);
  const flashNotice = useCallback((payload, ms = 6000) => {
    setNotice(typeof payload === 'string' ? { text: payload } : payload);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), ms);
  }, []);
  // WD40-R5: total item count reported by the server (may be larger than queue.items.length
  // when more pages exist). Drives hasMore and the "N of M" header display.
  const [queueServerTotal, setQueueServerTotal] = useState(0);
  // WD40-R5b: refs so load/loadMore read current values without appearing in useCallback deps.
  // Having `queue` in load's deps creates a cascade: load→setQueue→new load ref→useEffect→load…
  // (25+ inflight requests observed in prod). Refs give stable reads without triggering re-creates.
  const queueRef = useRef(null);
  const queueServerTotalRef = useRef(0);
  // WD40-R5c: ref tracks openDelId so load/loadMore can read the current selection
  // without openDelId appearing in their useCallback deps (which triggered a server
  // refetch on every item click — same cascade pattern as the queue dep above).
  // Assigned directly in the render body (not useEffect) so it is always current
  // when a callback fires synchronously after a render.
  const openDelIdRef = useRef(null);
  openDelIdRef.current = openDelId;
  // Queue scope (the same left-rail selection Organize uses): pick a project, then a
  // mission within it. null = all projects / every mission in the selected project;
  // '__root' = files sitting at the project root with no mission folder.
  const [projSel, setProjSel] = useState(null);
  const [missionSel, setMissionSel] = useState(null);
  // Type filter under the Files heading: null = all | doc | web | image | video.
  const [typeFilter, setTypeFilter] = useState(null);
  // The FULL project registry + mission tree (same endpoints Organize's rail uses),
  // so EVERY project lists — not just those with items in the loaded queue window.
  const [projects, setProjects] = useState(null);
  const [missionTree, setMissionTree] = useState({});

  // WD40-R4: past decisions for the selected project, shown in the queue panel as a
  // dimmed "Past decisions (N)" section. Only fetched when a project is in scope —
  // showing all-world history when browsing the full queue adds no value and noise.
  // Real local no-Supabase mode never fires tenant-gated Review reads (they can only
  // error against a Vite-only server); explicit ?demo= fixtures keep fetching because
  // their network is owned by Playwright intercepts.
  const localRenderOnly = !supabase && !demoFixtureActive();
  const [history, setHistory] = useState([]);
  useEffect(() => {
    if (!projSel || !worldId || localRenderOnly) { setHistory([]); return; }
    let dead = false;
    (async () => {
      try {
        const r = await authFetch(`/api/dashboard/review-history?world=${encodeURIComponent(worldId)}&project=${encodeURIComponent(projSel)}&limit=30`, { credentials: 'include' });
        if (!dead && r?.ok) {
          const d = await readJsonOrNull(r);
          setHistory(Array.isArray(d?.items) ? d.items : []);
        }
      } catch (e) { console.error('[Review history]', e); }
    })();
    return () => { dead = true; };
  }, [projSel, worldId]);

  // treeReload bumps after a rename/move from the context menu; >0 also busts
  // the missions-tree lambda's 30s registry cache so the change shows now.
  const [treeReload, setTreeReload] = useState(0);
  useEffect(() => {
    let dead = false;
    (async () => {
      if (!worldId || localRenderOnly) {
        setProjects([]);
        setMissionTree({});
        return;
      }
      try {
        const r = await authFetch('/api/dashboard/projects', { credentials: 'include' });
        const d = await readJsonOrNull(r);
        if (!dead && d?.ok && Array.isArray(d.projects)) setProjects(d.projects);
      } catch (e) { console.error('[Review projects]', e); }
      try {
        const r = await authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}${treeReload > 0 ? '&bust=1' : ''}`, { credentials: 'include' });
        const d = await readJsonOrNull(r);
        if (!dead && d && Array.isArray(d.projects)) {
          const next = {};
          for (const p of d.projects) { if (p?.slug) next[p.slug] = p.tree || []; }
          setMissionTree(next);
        }
      } catch (e) { console.error('[Review missions-tree]', e); }
    })();
    return () => { dead = true; };
  }, [worldId, treeReload]);

  const load = useCallback(async () => {
    if (!worldId || localRenderOnly) {
      const next = { items: [], readyCount: 0 };
      queueRef.current = next;
      setQueue(next);
      setQueueServerTotal(0);
      setStatus('loaded');
      return;
    }
    let ok = false;
    // WD40-R5: on a realtime/timer refresh, fetch enough to cover what is already on screen
    // so the list doesn't collapse back to PAGE_SIZE when a single new item arrives.
    // WD40-R5b: read via queueRef (not queue state) so queue is NOT in deps — having queue
    // in deps caused a cascade: successful load → setQueue → new load ref → useEffect fires
    // → load() again → 25+ concurrent requests observed.
    const currentCount = queueRef.current?.items?.length || 0;
    const fetchLimit = Math.max(PAGE_SIZE, currentCount);
    try {
      const r = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId)}&limit=${fetchLimit}&offset=0`);
      if (r?.ok) {
        const d = await readJsonOrNull(r);
        if (!d) {
          const next = { items: [], readyCount: 0 };
          queueRef.current = next;
          setQueue(next);
          queueServerTotalRef.current = 0;
          setQueueServerTotal(0);
          ok = true;
        } else {
          const items = (d.items || []).map((it) => mapQueueItem(it, openDelIdRef.current));
          const next = { items, readyCount: items.length };
          queueRef.current = next;
          setQueue(next);
          const total = d.total || items.length;
          queueServerTotalRef.current = total;
          setQueueServerTotal(total);
          if (d.newest_ts) setNewestTs(d.newest_ts);
          ok = true;
        }
      }
    } catch (e) {
      console.error('[Review load]', e);
    }
    setStatus((prev) => (ok ? 'loaded' : (queueRef.current ? prev : 'error')));
  // openDelId removed from deps — read via openDelIdRef; the open marker is
  // re-stamped in the render-time filtered chain so selection highlighting is
  // correct without any server refetch.
  }, [worldId]);

  // WD40-R5: "Load older items" — true server-side fetch of the next PAGE_SIZE items,
  // appended to the in-memory list. hasMore is now driven by queueServerTotal vs the
  // fetched count, so items beyond the old 500-item hard cap become reachable.
  // WD40-R5b: reads via refs (not state) so queue/queueServerTotal are NOT in deps,
  // preventing stale-closure guard kicks from triggering spurious load() calls.
  const loadMore = useCallback(async () => {
    const offset = queueRef.current?.items?.length || 0;
    if (offset >= queueServerTotalRef.current) return; // nothing more on the server
    try {
      const r = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId)}&limit=${PAGE_SIZE}&offset=${offset}`);
      if (r?.ok) {
        const d = await readJsonOrNull(r);
        if (!d) return;
        const newItems = (d.items || []).map((it) => mapQueueItem(it, openDelIdRef.current));
        if (newItems.length > 0) {
          const merged = [...(queueRef.current?.items || []), ...newItems];
          const next = { items: merged, readyCount: merged.length };
          queueRef.current = next;
          setQueue(next);
          const newTotal = d.total || queueServerTotalRef.current;
          queueServerTotalRef.current = newTotal;
          setQueueServerTotal(newTotal);
        }
      }
    } catch (e) {
      console.error('[Review loadMore]', e);
    }
  }, [worldId]); // openDelId removed — read via openDelIdRef

  useEffect(() => {
    // Injected files (from a chat "Review all") ARE the queue — show exactly those,
    // live from the message, and skip the endpoint entirely.
    if (hasInjected) {
      setQueue({ items: injected, readyCount: injected.length });
      setStatus('loaded');
      return undefined;
    }
    load();
    // Realtime contract (review R7): a new file lands as a messages INSERT (the watcher
    // posts the chat bubble at the same instant it rebuilds the queue cache), so a
    // messages INSERT is our "the queue probably changed" signal. Refetch on it, debounced
    // past the server's ~1.2s share->rebuild window so we read the fresh cache, not race
    // it. The 30s poll stays as the dropped-subscription fallback (same pattern as
    // useDataPipe).
    const t = setInterval(load, 30000);
    let debounce = null;
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`review-queue-messages-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => { debounce = null; load(); }, 3000);
        })
        .subscribe();
    }
    return () => {
      clearInterval(t);
      if (debounce) clearTimeout(debounce);
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, hasInjected, injected]);

  // Fetch the opened deliverable's real content once, cache it by path.
  // Dedupe with a ref (NOT by reading `bodies` in deps): writing the loading
  // sentinel into `bodies` must not re-run this effect, or its cleanup would
  // cancel the in-flight fetch and the content would never land ("Loading…" forever).
  const fetchedRef = useRef({});
  useEffect(() => {
    if (!openDelId) return;
    if (fetchedRef.current[openDelId]) return; // fetch already started for this id
    const item = (queue?.items || []).find((i) => i.id === openDelId) || extraItems[openDelId];
    if (!item) return;
    fetchedRef.current[openDelId] = true;
    setBodies((b) => ({ ...b, [openDelId]: '' })); // '' = loading sentinel
    buildDeliverableBody(item).then((html) => {
      setBodies((b) => ({ ...b, [openDelId]: html || ' ' }));
    });
  }, [openDelId, queue, extraItems]);

  // review-loop: every verdict POSTs the item's identity fields (source_path +
  // sha256 + mission + title + project) so the server can suppress re-shares of
  // the same unchanged bytes, not just this exact message id.
  const decisionBody = useCallback((deliverableId, action, extra = {}) => {
    const item = (queueRef.current?.items || []).find((i) => i.id === deliverableId)
      || extraItemsRef.current[deliverableId];
    return JSON.stringify({
      deliverable: deliverableId,
      action,
      world: worldId,
      source_path: item?.sourcePath || undefined,
      sha256: item?.sha256 || undefined,
      mission: item?.missionRaw || undefined,
      title: item?.title || undefined,
      project: item?.whoRaw || undefined,
      ...extra,
    });
  }, [worldId]);

  // Optimistic removal: a decided item leaves the list the moment the server
  // says 2xx — the follow-up load() reconciles with the real filtered queue.
  const removeFromQueue = useCallback((deliverableId) => {
    const cur = queueRef.current;
    if (!cur) return;
    const items = (cur.items || []).filter((i) => i.id !== deliverableId);
    if (items.length === (cur.items || []).length) return;
    const next = { items, readyCount: items.length };
    queueRef.current = next;
    setQueue(next);
    const total = Math.max(items.length, (queueServerTotalRef.current || 0) - 1);
    queueServerTotalRef.current = total;
    setQueueServerTotal(total);
  }, []);

  const approve = useCallback(async (deliverableId) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: decisionBody(deliverableId, 'approve'),
      });
      if (r?.ok) {
        removeFromQueue(deliverableId);
        load();
      } else {
        console.error('[Review approve] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review approve] exception:', e);
    }
  }, [load, decisionBody, removeFromQueue]);

  const requestChanges = useCallback(async (deliverableId, notes) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: decisionBody(deliverableId, 'request-changes', { notes }),
      });
      if (r?.ok) {
        removeFromQueue(deliverableId);
        // The server queued a real fix task — tell the reviewer it's tracked.
        try {
          const d = await r.json();
          if (d?.task_id) flashNotice(`Tracked as task ${String(d.task_id).slice(0, 8)} — the agent will pick it up.`);
        } catch { /* body optional */ }
        load();
      } else {
        console.error('[Review request-changes] response not ok:', await r?.text());
        flashNotice('Could not send the changes — nothing was recorded. Try again.');
      }
    } catch (e) {
      console.error('[Review request-changes] exception:', e);
      flashNotice('Could not send the changes — nothing was recorded. Try again.');
    }
  }, [load, decisionBody, removeFromQueue, flashNotice]);

  // review-loop: undo a dismiss — deletes the decision row server-side, then
  // refetches so the item re-enters the queue. Wired to the dismiss toast's Undo.
  const undoDismiss = useCallback(async (decisionId) => {
    if (!decisionId) return;
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'undo', world: worldId, decision_id: decisionId }),
      });
      if (r?.ok) {
        setNotice(null);
        if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
        load();
      } else {
        console.error('[Review undo] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review undo] exception:', e);
    }
  }, [worldId, load]);

  // review-loop: dismiss — drop an item from the queue without approving it
  // (not review-worthy). Recorded as a decision so it never comes back — but the
  // toast carries a 10s Undo (design gate: dismiss is destructive, so it gets an out).
  const dismiss = useCallback(async (deliverableId) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: decisionBody(deliverableId, 'dismiss'),
      });
      if (r?.ok) {
        removeFromQueue(deliverableId);
        try {
          const d = await r.json();
          if (d?.decision_id) {
            flashNotice({
              text: 'Dismissed',
              actionLabel: 'Undo',
              onAction: () => undoDismiss(d.decision_id),
            }, 10000);
          }
        } catch { /* body optional */ }
        load();
      } else {
        console.error('[Review dismiss] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review dismiss] exception:', e);
    }
  }, [load, decisionBody, removeFromQueue, flashNotice, undoDismiss]);

  const sendChecklist = useCallback(async (deliverableId) => {
    try {
      const del = (queue?.items || []).find((i) => i.id === deliverableId);
      if (!del) return;
      const checklist = del.comments.map((c) => c.text).join('\n');
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliverable: deliverableId, action: 'send-checklist', checklist, world: worldId }),
      });
      if (r?.ok) {
        load();
      } else {
        console.error('[Review send-checklist] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review send-checklist] exception:', e);
    }
  }, [load, queue, worldId]);

  // The open deliverable's body is still in flight ('' is the loading sentinel).
  // Gated on the item actually existing in the queue, so a stale/unmatched id can
  // never pin the tool on the loading cover forever.
  const bodyLoading = !!openDelId
    && ((queue?.items || []).some((i) => i.id === openDelId) || !!extraItems[openDelId])
    && !bodies[openDelId];

  const byNewest = (a, b) => String(b.ts || '').localeCompare(String(a.ts || ''));
  const byName = (x, y) => String(x || '').localeCompare(String(y || ''), undefined, { sensitivity: 'base' });
  const prettify = (slug) => String(slug || 'Untitled').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Per-project / per-mission counts from the loaded queue window.
  const allItems = queue?.items || [];
  const countsByProj = new Map();
  for (const i of allItems) {
    const key = i.whoRaw || '';
    if (!countsByProj.has(key)) countsByProj.set(key, { count: 0, missions: new Map(), rootCount: 0, tint: i.whoTint });
    const c = countsByProj.get(key);
    c.count += 1;
    if (i.missionRaw) c.missions.set(i.missionRaw, (c.missions.get(i.missionRaw) || 0) + 1);
    else c.rootCount += 1;
  }

  // EVERY project in this world (registry, same filter Organize applies), plus any
  // queue project the registry misses — so the list is complete, not queue-derived.
  const CRUFT = /(^|-)(smoke|proj-tool|loop-test|test-project|lr2test)/i;
  const registry = (projects || []).filter((p) => p.slug && p.client_id === worldId && !CRUFT.test(p.slug));
  const seenSlugs = new Set(registry.map((p) => p.slug));
  const projList = registry.map((p) => ({ slug: p.slug, name: p.name || prettify(p.slug) }));
  for (const slug of countsByProj.keys()) {
    if (slug && !seenSlugs.has(slug) && !CRUFT.test(slug)) projList.push({ slug, name: prettify(slug) });
  }
  projList.sort((a, b) => byName(a.name, b.name));

  const activeProj = projSel && projList.some((p) => p.slug === projSel) ? projSel : null;
  const activeMission = activeProj ? missionSel : null;
  // Chip tints are green|lime|amber|violet; the .folder glyph has no is-green — map it.
  const folderTint = (t) => (t === 'green' ? 'teal' : (t || 'violet'));
  // A mission node matches items filed exactly there or in its sub-missions.
  const missionMatches = (raw, slug) => raw === slug || String(raw || '').startsWith(`${slug}/`) || String(raw || '').startsWith(`${slug}:`);

  // Missions of a project = union of the missions-tree top level and whatever the
  // queue items actually carry (so nothing filed is unreachable).
  const missionRowsFor = (slug) => {
    const rows = (missionTree[slug] || []).map((m) => {
      const raw = String(m.slug || '');
      const leaf = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
      return { slug: leaf, name: (m.name && !String(m.name).includes(':')) ? m.name : prettify(leaf) };
    }).filter((m) => m.slug);
    const seen = new Set(rows.map((m) => m.slug));
    for (const mslug of (countsByProj.get(slug)?.missions || new Map()).keys()) {
      if (!seen.has(mslug)) rows.push({ slug: mslug, name: prettify(mslug) });
    }
    return rows.sort((a, b) => byName(a.name, b.name));
  };

  // The engine allows ONE is-* class per element (each is-: mod drops the previous),
  // so depth + selection ride a single mode value: d0 | d0on | d1 | d1on. Counts are
  // '' at zero so the row stays clean instead of carrying a dead 0.
  const tree = [{ id: '__all', name: 'All projects', count: allItems.length || '', tint: 'accent', mode: activeProj ? 'd0' : 'd0on' }];
  for (const p of projList) {
    const isActive = p.slug === activeProj;
    const c = countsByProj.get(p.slug);
    const tint = folderTint(c?.tint || tintFor(p.slug));
    tree.push({ id: `p:${p.slug}`, name: p.name, count: c?.count || '', tint, mode: isActive && !activeMission ? 'd0on' : 'd0' });
    if (isActive) {
      const ms = missionRowsFor(p.slug);
      for (const m of ms) {
        const count = allItems.filter((i) => i.whoRaw === p.slug && missionMatches(i.missionRaw, m.slug)).length;
        tree.push({ id: `m:${m.slug}`, name: m.name, count: count || '', tint, mode: activeMission === m.slug ? 'd1on' : 'd1' });
      }
      if ((c?.rootCount || 0) > 0 && ms.length) tree.push({ id: 'm:__root', name: 'Project files', count: c.rootCount, tint, mode: activeMission === '__root' ? 'd1on' : 'd1' });
    }
  }

  // Files scoped by the tree selection, then the type chips. Chips are generated
  // from the media types ACTUALLY present in the scoped set, each with its own
  // true count over the FULL set (not the page window). Copy and Code stand on
  // their own — folding them into "Doc" hid what the queue really held.
  const TYPE_GROUP = { doc: 'doc', copy: 'copy', code: 'code', sitelive: 'web', sitefile: 'web', siteshot: 'web', image: 'image', photo: 'image', video: 'video' };
  const groupOf = (t) => TYPE_GROUP[t] || 'doc';
  const scoped = allItems
    .filter((i) => !activeProj || i.whoRaw === activeProj)
    .filter((i) => !activeMission || (activeMission === '__root' ? !i.missionRaw : missionMatches(i.missionRaw, activeMission)));
  const CHIP_ORDER = ['image', 'video', 'doc', 'copy', 'code', 'web'];
  const chipCounts = { image: 0, video: 0, doc: 0, copy: 0, code: 0, web: 0 };
  for (const i of scoped) chipCounts[groupOf(i.type)] += 1;
  const CHIP_LABELS = { image: 'Image', video: 'Video', doc: 'Doc', copy: 'Copy', code: 'Code', web: 'Web' };
  const filters = [
    { id: 'all', label: `All ${scoped.length}`, active: !typeFilter ? 'on' : 'off' },
    ...CHIP_ORDER
      .filter((k) => chipCounts[k] > 0)
      .map((k) => ({ id: k, label: `${CHIP_LABELS[k]} ${chipCounts[k]}`, active: typeFilter === k ? 'on' : 'off' })),
  ];

  // The list = scope + chip filter over all fetched items, newest first. All matching
  // items are rendered — pagination is now server-side via loadMore, not a client window.
  // WD40-R5c: re-stamp open:'on'/'off' from live openDelId state so the selected card
  // highlights correctly even when load() ran before the selection was set (load/loadMore
  // now use openDelIdRef instead of openDelId, so they no longer refetch on every click).
  // Sort newest-first, THEN collapse sequential frame bursts (FINDING 6), THEN stamp
  // the open highlight — so the group's representative row lights up when it's picked.
  const sortedScoped = (typeFilter ? scoped.filter((i) => groupOf(i.type) === typeFilter) : scoped)
    .slice()
    .sort(byNewest);
  const filtered = groupSequences(sortedScoped)
    .map((it) => ({ ...it, open: it.id === openDelId ? 'on' : 'off' }));
  const waitingTotal = allItems.length;

  const data = {
    queue: {
      // WD40-R2: readyCount reflects the current scope (project/mission selection), not the
      // global total, so the "N deliverables waiting" header stays honest when a project is picked.
      // WD40-R5: in all-projects view, show "N of M" when more server pages remain so Patrik
      // knows the real queue depth at a glance ("40 of 312 deliverables waiting").
      readyCount: !activeProj && queueServerTotal > allItems.length
        ? `${allItems.length} of ${queueServerTotal}`
        : scoped.length,
      // R15b copy nit: the whole header phrase, pluralized ("1 deliverable to
      // review" / "N deliverables to review"). The templates bind THIS, not the
      // bare count, so count=1 can never render "1 deliverables".
      readyLabel: (() => {
        const rc = !activeProj && queueServerTotal > allItems.length
          ? `${allItems.length} of ${queueServerTotal}`
          : scoped.length;
        return `${rc} ${rc === 1 ? 'deliverable' : 'deliverables'} to review`;
      })(),
      // WD40-R5: all fetched items are rendered (no client-side window). When a type chip is
      // active all matching items in the fetched set show; on "Load older" the server sends the
      // next page and those items join the visible set automatically.
      items: filtered,
      // The FULL unscoped set (not rendered by any template) so hosts can resolve a
      // catch-up / chat target anywhere in the queue, not just the visible window.
      itemsAll: allItems,
      tree,
      filters,
      // 'yes' / 'no' drives the "Load older items" button. Show it only when the server has
      // more pages (never for injected queues or type-filtered views — those show all fetched
      // matching items already, and loading more globally is rarely what the user wants mid-filter).
      hasMore: (!hasInjected && !typeFilter && queueServerTotal > allItems.length) ? 'yes' : 'no',
      // review-loop: when the last agent hand-off landed (pre-decision-filter), from the
      // server's newest_ts. Binds into the "newest first" slot next to the Files heading.
      lastDeliveryLabel: newestTs
        ? (relTime(newestTs) === 'now' ? 'Last delivery just now' : `Last delivery ${relTime(newestTs)} ago`)
        : 'newest first',
      // Files-tool merge: the HONEST waiting total across server pages (itemsAll only
      // holds the fetched window) — drives the "N need your review" pill and the
      // needs-review chip's cross-page truth.
      waitingTotal: hasInjected ? allItems.length : (queueServerTotal || allItems.length),
    },
    deliverable: (() => {
      const open = (queue?.items || []).find((i) => i.id === openDelId) || extraItems[openDelId];
      if (!open) {
        return {
          id: '', file: '', title: '', bodyHtml: '', type: 'doc', typeLabel: 'Document',
          who: '', whoInitials: '', whoTint: 'green', location: '',
          commentsLabel: 'Pin-comments', commentsLabelLower: 'pin-comments',
          openCount: 0, pins: [], comments: [], hasNotes: 'no',
        };
      }
      // Video deliverables speak the DS7 timeline language: the comments panel is
      // "Timeline comments" and rows carry "at m:ss" anchors (set in Review.jsx).
      const isVid = open.type === 'video';
      return {
        ...open,
        bodyHtml: bodies[openDelId] || '',
        commentsLabel: isVid ? 'Timeline comments' : 'Pin-comments',
        commentsLabelLower: isVid ? 'timeline comments' : 'pin-comments',
        // The host component overrides from live pins; 'no' keeps the send-notes
        // button hidden until a comment actually exists.
        hasNotes: 'no',
      };
    })(),
    // Empty-truth: an empty VIEW is not an empty QUEUE. When the selected room /
    // filter has nothing but deliverables are waiting elsewhere, say so and make
    // "Browse waiting" carry the real count (the button jumps to the full waiting
    // set — emptyAction → browseWaiting). Only a genuinely empty queue reads
    // "all caught up".
    empty: waitingTotal > 0
      ? {
        title: 'Nothing here yet',
        body: `This room has no deliverables waiting review. ${waitingTotal} ${waitingTotal === 1 ? 'is' : 'are'} waiting across your other rooms.`,
        actionLabel: `Browse waiting (${waitingTotal})`,
      }
      : {
        title: "You're all caught up",
        body: 'Nothing needs your review right now. New deliverables the agent flags will land here.',
        actionLabel: 'Check again',
      },
    // The shared loading fragment covers the viewer BOTH while the queue gathers and
    // while an opened file's body is in flight — one standard loading look (states.html),
    // never the raw template with placeholder copy.
    loading: { label: bodyLoading ? 'Preparing the file' : 'Preparing deliverables' },
    error: { title: "We couldn't load your review queue", body: 'Your connection dropped. Nothing was lost. Your last view is saved.', code: 'review · retrying' },
  };

  return {
    // The templates gate the happy-path viewer on data-state="ready"; map our
    // internal 'loaded' to 'ready' so the document/image viewer actually shows
    // (otherwise 'loaded' matches no data-state branch and the viewer stays hidden,
    // which read as a blank read view). loading/error pass through for their branches.
    // When the queue has loaded but the current filter has ZERO deliverables, resolve
    // to 'empty' so the shared "You're all caught up" branch shows (both Review.jsx and
    // ReviewDesktop.jsx inject it) instead of a blank ready viewer. (QA #15)
    // While the OPEN deliverable's body is still fetching, stay on 'loading' so the
    // standard skeleton covers the viewer instead of a half-rendered document frame.
    state: status === 'loaded'
      ? (data.queue.items.length > 0 ? (bodyLoading ? 'loading' : 'ready') : 'empty')
      : status,
    data,
    // Raw scope + registry data for the right-click context menu: which project
    // and mission the tree currently narrows to ('m:<leaf>' node ids are only
    // meaningful inside the active project), the registry mission trees (carry
    // path/folder_name for rename+move), and the projects list for destinations.
    scope: { project: activeProj, mission: activeMission },
    projectsRaw: projects || [],
    missionTreeRaw: missionTree,
    history,       // WD40-R4: past decisions for the active project scope
    notice,        // review-loop: transient verdict feedback ("Tracked as task …")
    refreshTree: () => setTreeReload((k) => k + 1),
    actions: {
      openDeliverable: (id) => setOpenDelId(id),
      // Files-tool merge: open ANY file in review. An id already in the loaded queue
      // opens as-is (verdicts feed the waiting set); anything else registers as an
      // external item shaped by the same mapper the chat "Review all" path uses, so
      // the viewer + verdict rail work identically on it.
      openFileItem: (fileLike) => {
        const id = String(fileLike?.id || '');
        if (!id) return;
        // Register the external shape even when the id IS in the queue: a verdict
        // optimistically removes the queue item, and in browse mode the file stays
        // open — the extra item keeps the viewer alive instead of blanking it.
        if (!extraItemsRef.current[id]) {
          const [item] = reviewItemsFromFiles(
            [{ url: id, name: fileLike.name || id.split('/').pop(), mime: fileLike.mime || '' }],
            fileLike.project || '',
          );
          if (item) setExtraItems((m) => ({ ...m, [item.id]: item }));
        }
        setOpenDelId(id);
      },
      // Undo a dismiss decision by row id — the Reviewed toggle's "Restore to review"
      // reuses the exact undo the 10s snackbar fires.
      undoDismiss,
      loadMore,
      approve,
      requestChanges,
      dismiss,
      sendChecklist,
      // Download the deliverable's real file (any type). Resolves the item by id from
      // the loaded queue (covers injected chat "Review all" queues too) and streams its
      // bytes to a named download — see downloadDeliverable.
      download: (id) => {
        const item = (queue?.items || []).find((i) => i.id === id);
        if (item) downloadDeliverable(item);
      },
      // One action for every tree node: '__all' resets, 'p:<slug>' picks a project
      // (and clears the mission), 'm:<slug>' / 'm:__root' narrows within it. Any
      // scope change resets the type chips (Organize resets its filter the same way).
      selectQueueNode: (id) => {
        const s = String(id || '');
        if (s === '__all') { setProjSel(null); setMissionSel(null); }
        else if (s.startsWith('p:')) { setProjSel(s.slice(2)); setMissionSel(null); }
        else if (s.startsWith('m:')) setMissionSel(s.slice(2));
        setTypeFilter(null);
        setOpenDelId(null);
      },
      setTypeFilter: (id) => {
        setTypeFilter(['image', 'video', 'doc', 'copy', 'code', 'web'].includes(id) ? id : null);
        setOpenDelId(null);
      },
      // The empty state's button. Scoped-empty → jump to the full waiting set (clear
      // room + chip filters). Truly empty → a real re-check of the queue.
      browseWaiting: () => {
        setProjSel(null);
        setMissionSel(null);
        setTypeFilter(null);
        setOpenDelId(null);
        load();
      },
    },
  };
}

// ── Files nav badge: the live waiting-review count ─────────────────────────────
// Lightweight shell-level hook (limit=1 — the counts ride the response envelope,
// not the items). 60s poll + a realtime nudge on any messages INSERT (a new
// hand-off, upload, or decision all land as messages rows). The Files container's
// own useReview does the heavy lifting; this exists only so the nav badge can
// show "N waiting" without mounting the whole queue.
export function useReviewWaitingCount(worldId = null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let dead = false;
    const load = async () => {
      if (!worldId) {
        if (!dead) setCount(0);
        return;
      }
      try {
        const r = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId)}&limit=1`);
        if (r?.ok) {
          const d = await readJsonOrNull(r);
          const n = Number(d?.counts?.waiting ?? d?.total);
          if (!dead && Number.isFinite(n)) setCount(n);
        }
      } catch { /* keep the last known count */ }
    };
    load();
    const t = setInterval(load, 60000);
    let debounce = null;
    let channel = null;
    if (supabase) {
      channel = supabase
        .channel(`review-badge-${Math.random().toString(36).slice(2, 8)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(() => { debounce = null; load(); }, 3500);
        })
        .subscribe();
    }
    return () => {
      dead = true;
      clearInterval(t);
      if (debounce) clearTimeout(debounce);
      if (channel) supabase.removeChannel(channel);
    };
  }, [worldId]);
  return count;
}
