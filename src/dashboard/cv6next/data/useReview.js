// cv6next — Review tool data. Real deliverables queue shaped to the wired template.
// Loads from /api/dashboard/review-queue (search + sort in the queue panel) and
// wires approve / request-changes as real decision events. No fake data.

import { useState, useEffect, useCallback, useRef } from 'react';
import { marked } from 'marked';
import { authFetch } from '../../lib/authFetch';
import { supabase } from '../../lib/supabase';
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
      return `<img src="${src}" alt="${escapeHtml(item.title)}" style="max-width:100%;height:auto;display:block;border-radius:10px;" />`;
    }
    if (type === 'video') {
      // Corner-path videos stream straight off the rag tunnel (Range-capable, CORS *).
      // The old blob path pulled the WHOLE file through the Vercel raw proxy, which
      // buffers in the lambda and dies on video-sized payloads — videos never loaded.
      // No native controls: the DS7 scrub bar (ReviewPins useVideoScrub) is the player
      // chrome — timeline with numbered comment markers, play button, mono times.
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      return `<video src="${src}" preload="metadata" playsinline style="max-width:100%;border-radius:10px;display:block;background:#000;"></video>`;
    }
    if (type === 'siteshot') {
      const src = isAbs ? path : `https://rag.aheadofmarket.com/project-file-raw?path=${enc}`;
      return browserChrome(item.title, `<img src="${src}" alt="${escapeHtml(item.title)}" style="width:100%;height:auto;display:block;" />`);
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
      const b = await blobOf();
      if (b.err) return errDiv(b.err);
      if (/\.pdf$/i.test(path)) {
        return `<div style="position:relative;"><iframe src="${b.url}" title="${escapeHtml(item.title)}" style="width:100%;height:62vh;border:0;border-radius:10px;display:block;"></iframe>${pinShield()}</div>`;
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
        count: 0, countState: 'zero', status: 'ready', statusLabel: 'READY', time: '', missionLabel: '', missionRaw: '',
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
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [bodies, setBodies] = useState({}); // path -> rendered innerHTML ('' while loading)
  // Review R2: how many items we currently show. "Load older items" grows this; the 30s
  // poll refetches the same count (offset 0) so a refresh never drops loaded pages.
  const [shown, setShown] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  // Queue scope (the same left-rail selection Organize uses): pick a project, then a
  // mission within it. null = all projects / every mission in the selected project;
  // '__root' = files sitting at the project root with no mission folder.
  const [projSel, setProjSel] = useState(null);
  const [missionSel, setMissionSel] = useState(null);

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
            countState: 'zero', // .qcount.is-zero — dim the badge instead of a bright accent 0
            status: 'ready', // queue only returns ready items; live ones handled separately
            statusLabel: 'READY',
            time: relTime(it.last_modified),
            ts: it.last_modified || '', // raw timestamp so the queue can sort by recency
            location: it.mission ? `${it.project} / ${it.mission}` : it.project,
            // Mobile row meta already shows the project (who) — this carries ONLY the
            // mission tail ("/ reports-page"), empty when the file sits at project root,
            // so the line never reads "Space-rising · space-rising / ...".
            missionLabel: it.mission ? `/ ${it.mission}` : '',
            missionRaw: it.mission || '', // raw slug the project → mission tree scopes by
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
        setQueue({ items, readyCount: items.length });
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

  // The open deliverable's body is still in flight ('' is the loading sentinel).
  // Gated on the item actually existing in the queue, so a stale/unmatched id can
  // never pin the tool on the loading cover forever.
  const bodyLoading = !!openDelId
    && (queue?.items || []).some((i) => i.id === openDelId)
    && !bodies[openDelId];

  const byNewest = (a, b) => String(b.ts || '').localeCompare(String(a.ts || ''));
  const byName = (x, y) => String(x || '').localeCompare(String(y || ''), undefined, { sensitivity: 'base' });

  // Project → mission tree, built from the queue itself (a project appears only when
  // it has deliverables). d0 = 'All projects' + one row per project; d1 = the selected
  // project's missions ('Project files' = items at project root). is-open marks the
  // active scope — exactly one node is on at a time.
  const allItems = queue?.items || [];
  const projMap = new Map();
  for (const i of allItems) {
    const key = i.whoRaw || '';
    if (!projMap.has(key)) projMap.set(key, { slug: key, name: i.who || 'Unfiled', tint: i.whoTint, count: 0, missions: new Map(), rootCount: 0 });
    const p = projMap.get(key);
    p.count += 1;
    if (i.missionRaw) p.missions.set(i.missionRaw, (p.missions.get(i.missionRaw) || 0) + 1);
    else p.rootCount += 1;
  }
  const projList = [...projMap.values()].sort((a, b) => byName(a.name, b.name));
  const activeProj = projSel && projMap.has(projSel) ? projSel : null;
  const activeMission = activeProj ? missionSel : null;
  // The queue items carry chip tints (green|lime|amber|violet); the .folder glyph has
  // no is-green — map it to the nearest folder tint.
  const folderTint = (t) => (t === 'green' ? 'teal' : (t || 'violet'));
  // The engine allows ONE is-* class per element (each is-: mod drops the previous),
  // so depth + selection ride a single mode value: d0 | d0on | d1 | d1on.
  const tree = [{ id: '__all', name: 'All projects', count: allItems.length, tint: 'accent', mode: activeProj ? 'd0' : 'd0on' }];
  for (const p of projList) {
    const isActive = p.slug === activeProj;
    tree.push({ id: `p:${p.slug}`, name: p.name, count: p.count, tint: folderTint(p.tint), mode: isActive && !activeMission ? 'd0on' : 'd0' });
    if (isActive) {
      const ms = [...p.missions.entries()].sort((a, b) => byName(a[0], b[0]));
      for (const [slug, count] of ms) tree.push({ id: `m:${slug}`, name: slug, count, tint: folderTint(p.tint), mode: activeMission === slug ? 'd1on' : 'd1' });
      if (p.rootCount && ms.length) tree.push({ id: 'm:__root', name: 'Project files', count: p.rootCount, tint: folderTint(p.tint), mode: activeMission === '__root' ? 'd1on' : 'd1' });
    }
  }
  const activeName = activeProj ? (projMap.get(activeProj)?.name || activeProj) : '';
  const scopeLabel = activeProj
    ? (activeMission ? `${activeName} / ${activeMission === '__root' ? 'project files' : activeMission}` : activeName)
    : 'All projects';

  const data = {
    queue: {
      readyCount: queue?.readyCount || 0,
      items: allItems
        .filter((i) => !activeProj || i.whoRaw === activeProj)
        .filter((i) => !activeMission || (activeMission === '__root' ? !i.missionRaw : i.missionRaw === activeMission))
        .slice()
        .sort(byNewest),
      tree,
      scopeLabel,
      // 'yes' / 'no' so the template's data-switch shows the "Load older items" button only
      // when older items exist (and not while the injected-files queue hides it).
      hasMore: (!hasInjected && hasMore) ? 'yes' : 'no',
    },
    deliverable: (() => {
      const open = (queue?.items || []).find((i) => i.id === openDelId);
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
    empty: { title: "You're all caught up", body: 'Nothing needs your review right now. New deliverables the agent flags will land here.', actionLabel: 'Browse waiting' },
    // The shared loading fragment covers the viewer BOTH while the queue gathers and
    // while an opened file's body is in flight — one standard loading look (states.html),
    // never the raw template with placeholder copy.
    loading: { label: bodyLoading ? 'Opening the file…' : 'Gathering deliverables…' },
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
    actions: {
      openDeliverable: (id) => setOpenDelId(id),
      loadMore,
      approve,
      requestChanges,
      sendChecklist,
      // One action for every tree node: '__all' resets, 'p:<slug>' picks a project
      // (and clears the mission), 'm:<slug>' / 'm:__root' narrows within it.
      selectQueueNode: (id) => {
        const s = String(id || '');
        if (s === '__all') { setProjSel(null); setMissionSel(null); }
        else if (s.startsWith('p:')) { setProjSel(s.slice(2)); setMissionSel(null); }
        else if (s.startsWith('m:')) setMissionSel(s.slice(2));
        setOpenDelId(null);
      },
    },
  };
}
