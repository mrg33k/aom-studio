// cv6next — Review tool data. Real deliverables queue shaped to the wired template.
// Loads from /api/dashboard/review-queue, filters by Ready/Pipeline, and wires
// approve / request-changes as real decision events. No fake data.

import { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { authFetch } from '../../lib/authFetch';
import { titleForAgent } from './agentTitles';

marked.setOptions({ gfm: true, breaks: false });

const TINTS = ['green', 'lime', 'amber', 'violet'];

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

// Build the read-view innerHTML for one deliverable from its real file.
// IMPORTANT: the project-file endpoint is tenant-gated (verifyTenant needs a
// Bearer token). The dashboard session lives in localStorage, NOT a cookie, so a
// plain <img src>/<video src>/<iframe src> to the API carries no auth and 401s.
// So we fetch EVERY file through authFetch (which attaches the token) and hand the
// element a blob: URL for binaries. Text renders markdown / preformatted inline.
// `path` is the relative corner/users/... path the review queue already carries (item.id).
async function buildDeliverableBody(item) {
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

  try {
    if (type === 'image' || type === 'photo') {
      const b = await blobOf();
      return b.err ? errDiv(b.err)
        : `<img src="${b.url}" alt="${escapeHtml(item.title)}" style="max-width:100%;height:auto;display:block;border-radius:10px;" />`;
    }
    if (type === 'video') {
      const b = await blobOf();
      return b.err ? errDiv(b.err)
        : `<video src="${b.url}" controls style="max-width:100%;border-radius:10px;display:block;"></video>`;
    }
    if (type === 'doc') {
      const b = await blobOf();
      if (b.err) return errDiv(b.err);
      if (/\.pdf$/i.test(path)) {
        return `<iframe src="${b.url}" title="${escapeHtml(item.title)}" style="width:100%;height:60vh;border:0;border-radius:10px;"></iframe>`;
      }
      return errDiv(`Preview is not available for this file type. <a href="${b.url}" download="${escapeHtml(item.title)}" style="color:#0066FF;">Download ${escapeHtml(item.title)}</a>`);
    }
    // text: copy (.md / .txt) or code. A store URL is read with a plain cross-origin GET
    // (no auth header → no preflight); a corner path goes through project-file with auth.
    const r = isAbs ? await fetch(txtUrl) : await authFetchT(txtUrl);
    if (!r?.ok) return errDiv(`This file's contents could not be loaded (status ${r?.status || '?'}).`);
    // The store returns the raw file; project-file wraps it as { content }.
    const content = isAbs ? await r.text() : ((await r.json())?.content || '');
    if (/\.md$/i.test(path)) {
      try { return marked.parse(content); } catch { /* fall through to pre */ }
    }
    return `<pre style="white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono,monospace);font-size:13px;line-height:1.6;margin:0;">${escapeHtml(content)}</pre>`;
  } catch {
    return errDiv("This file's contents could not be loaded right now.");
  }
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
    copy: 'Copy',
    code: 'Code',
    siteshot: 'Screenshot',
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
    sitelive: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z|M12 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  };
  return glyphs[type] || glyphs.doc;
}

// Detect the viewer type key from a filename / mime, for files handed straight in
// from a chat message (not the queue endpoint, which already typed them).
// `url` disambiguates a live site: an http(s) address with no recognizable file
// extension is a deployed page, not a document — review it in the sitelive viewer.
function typeKeyOf(name, mime, url = '') {
  const ext = String(name || '').toLowerCase().split('.').pop();
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
  if (m.startsWith('video/') || ['mp4', 'mov', 'webm', 'mkv'].includes(ext)) return 'video';
  if (['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx'].includes(ext)) return 'doc';
  if (['md', 'txt'].includes(ext)) return 'copy';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'java'].includes(ext)) return 'code';
  if (/^https?:\/\//i.test(String(url || name || ''))) return 'sitelive';
  return 'doc';
}

// Map chat attachments ({ url, name, mime }) to review queue items so the Review tool
// can show EXACTLY the files a user tapped "Review"/"Review all" on, live from the
// message — no dependency on the pre-built queue. `url` is the corner path the viewer
// loads through project-file (same as queue item.id).
export function reviewItemsFromFiles(files, project = '') {
  return (files || [])
    .map((f) => {
      const rawUrl = String(f.url || f.path || f.attachmentUrl || '');
      // A live-site hand-in (goal-thread artifact) keeps its absolute URL intact;
      // a corner path sheds leading slashes to match queue item ids.
      const path = /^https?:\/\//i.test(rawUrl) ? rawUrl : rawUrl.replace(/^\/+/, '');
      if (!path) return null;
      const name = f.name || f.fileName || path.split('/').pop() || 'File';
      // An explicit type (e.g. 'sitelive' from an artifact card) wins over detection.
      const key = f.type || typeKeyOf(name, f.mime || f.fileMime, rawUrl);
      return {
        id: path, title: name,
        who: project || '', whoRaw: project || '', whoInitials: initials(project || name), whoTint: tintFor(project || name),
        type: key, typeLabel: typeLabel(key), typeGlyph: typeGlyph(key),
        count: 0, status: 'ready', statusLabel: 'READY', time: '',
        location: project || '', queueState: 'ready', file: typeLabel(key),
        bodyHtml: '', open: 'off', pins: [], comments: [], openCount: 0,
      };
    })
    .filter(Boolean);
}

const PAGE_SIZE = 40; // rows per page; "Load older items" grows the window by this much

export function useReview(worldId = 'aom', injected = null) {
  const hasInjected = Array.isArray(injected) && injected.length > 0;
  const [queue, setQueue] = useState(null);
  const [openDelId, setOpenDelId] = useState(null);
  const [filter, setFilter] = useState('ready'); // ready | pipeline
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [bodies, setBodies] = useState({}); // path -> rendered innerHTML ('' while loading)
  // Review R2: how many items we currently show. "Load older items" grows this; the 30s
  // poll refetches the same count (offset 0) so a refresh never drops loaded pages.
  const [shown, setShown] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    let ok = false;
    try {
      const r = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId || 'aom')}&limit=${shown}&offset=0`);
      if (r?.ok) {
        const d = await r.json();
        setHasMore(!!d.hasMore);
        const items = (d.items || []).map((it) => {
          // review-queue.js returns: { name, path, project, mission, kind, type:{key,label,color}, last_modified }
          // type is an OBJECT, not a string — extract the key for template matching
          const typeKey = (it.type && typeof it.type === 'object') ? it.type.key : (it.type || 'doc');
          return {
            id: it.id || it.path,
            title: it.name || 'Untitled',
            who: titleForAgent(it.project || ''), // use project as agent hint for now; deliverables don't have from field
            whoRaw: it.project || '',
            whoInitials: initials(it.project || ''),
            whoTint: tintFor(it.project || ''),
            type: typeKey,
            typeLabel: typeLabel(typeKey),
            typeGlyph: typeGlyph(typeKey),
            count: 0, // no comments yet from queue endpoint
            status: 'ready', // queue only returns ready items; live ones handled separately
            statusLabel: 'READY',
            time: relTime(it.last_modified),
            location: it.mission ? `${it.project} / ${it.mission}` : it.project,
            queueState: 'ready',
            // The viewer caption used to read "name · 0 KB" — a fabricated size (the queue
            // endpoint never carries file bytes in production; it walks a tunnel that returns
            // no size). Show REAL metadata we already have instead of a fake number: the type
            // and how long ago it landed (e.g. "Image · 9h"). The filename is the title below.
            file: `${typeLabel(typeKey)} · ${relTime(it.last_modified)}`,
            bodyHtml: '',
            open: it.id === openDelId ? 'on' : 'off',
            pins: [],
            comments: [],
            openCount: 0,
          };
        });
        setQueue({ items, readyCount: items.filter((i) => i.status === 'ready').length, pipelineCount: 0 });
        ok = true;
      }
    } catch (e) {
      console.error('[Review load]', e);
    }
    setStatus((prev) => (ok ? 'loaded' : (queue ? prev : 'error')));
  }, [worldId, queue, openDelId, shown]);

  // "Load older items" — grow the window by one page; the load effect refetches.
  const loadMore = useCallback(() => setShown((n) => n + PAGE_SIZE), []);

  useEffect(() => {
    // Injected files (from a chat "Review all") ARE the queue — show exactly those,
    // live from the message, and skip the endpoint entirely.
    if (hasInjected) {
      setQueue({ items: injected, readyCount: injected.length, pipelineCount: 0 });
      setStatus('loaded');
      return undefined;
    }
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
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
    const item = (queue?.items || []).find((i) => i.id === openDelId);
    if (!item) return;
    fetchedRef.current[openDelId] = true;
    setBodies((b) => ({ ...b, [openDelId]: '' })); // '' = loading sentinel
    buildDeliverableBody(item).then((html) => {
      setBodies((b) => ({ ...b, [openDelId]: html || ' ' }));
    });
  }, [openDelId, queue]);

  const approve = useCallback(async (deliverableId) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliverable: deliverableId, action: 'approve', world: worldId }),
      });
      if (r?.ok) {
        load();
      } else {
        console.error('[Review approve] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review approve] exception:', e);
    }
  }, [load, worldId]);

  const requestChanges = useCallback(async (deliverableId, notes) => {
    try {
      const r = await authFetch('/api/dashboard/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deliverable: deliverableId, action: 'request-changes', notes, world: worldId }),
      });
      if (r?.ok) {
        load();
      } else {
        console.error('[Review request-changes] response not ok:', await r?.text());
      }
    } catch (e) {
      console.error('[Review request-changes] exception:', e);
    }
  }, [load, worldId]);

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

  const data = {
    queue: {
      readyCount: queue?.readyCount || 0,
      pipelineCount: queue?.pipelineCount || 0,
      isReady: filter === 'ready' ? 'on' : 'off',
      isPipeline: filter === 'pipeline' ? 'on' : 'off',
      items: (queue?.items || []).filter((i) => filter === 'ready' ? i.status === 'ready' : i.status === 'live'),
      // 'yes' / 'no' so the template's data-switch shows the "Load older items" button only
      // when older items exist (and not while the injected-files queue or a filter hides it).
      hasMore: (!hasInjected && filter === 'ready' && hasMore) ? 'yes' : 'no',
    },
    deliverable: (() => {
      const open = (queue?.items || []).find((i) => i.id === openDelId);
      if (!open) {
        return {
          id: '', file: '', title: '', bodyHtml: '', type: 'doc', typeLabel: 'Document',
          who: '', whoInitials: '', whoTint: 'green', location: '',
          commentsLabel: 'Pin-comments', commentsLabelLower: 'pin-comments',
          openCount: 0, pins: [], comments: [],
        };
      }
      const loaded = bodies[openDelId];
      const bodyHtml = (loaded === undefined || loaded === '')
        ? '<div style="padding:14px 0;color:#888;">Loading the file…</div>'
        : loaded;
      return { ...open, bodyHtml };
    })(),
    empty: { title: "You're all caught up", body: 'Nothing needs your review right now. New deliverables the agent flags will land here.', actionLabel: 'Browse waiting' },
    loading: { label: 'Gathering deliverables…' },
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
    state: status === 'loaded' ? (data.queue.items.length > 0 ? 'ready' : 'empty') : status,
    data,
    actions: {
      setQueueFilter: (f) => { setFilter(f); setOpenDelId(null); },
      openDeliverable: (id) => setOpenDelId(id),
      loadMore,
      approve,
      requestChanges,
      sendChecklist,
    },
  };
}
