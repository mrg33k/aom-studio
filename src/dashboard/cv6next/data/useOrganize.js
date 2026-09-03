// cv6next — real Organize data, shaped to the wired/ template contract.
// Phase 1 (corner:corner-ui-cv6): reads the project_files DISK MIRROR
// (/api/dashboard/files?type=mirror), so EVERY file in a project is viewable —
// not just scaffold .md. The list is metadata-only; a file's content is fetched
// lazily on open (cached) so a 7k-file world never ships its whole text at once.

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';
import { hasSession } from '../../lib/convex.js';
import { mediaAttrs } from './mediaFallback';
import { pdfShellHtml } from './pdfDocView';
import { docxShellHtml, isDocxName } from './docxDocView';
import { htmlShellHtml, isHtmlName } from './htmlDocView';
import { fileRefFromProjectFileRow, fileRefFromUploadRow } from '../../../../api/_lib/fileRef.js';
import { cornerLogoLoaderMarkup } from '../../cv6kit/cornerLogoLoaderMarkup.js';

const TINTS = ['violet', 'accent', 'pink', 'success'];

// Video bytes stream straight off the rag tunnel (Range + CORS *), never through
// the Vercel raw proxy — that path buffers the whole file and can't carry video.
// Same client-direct posture as CV3/CV4 attachments (useChatAttachments).
const TUNNEL_BASE = 'https://rag.aheadofmarket.com';

function tintFor(seed) {
  let h = 0; for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

// sessionStorage helpers for DEF-02 (state survives tool navigation).
function ssRead(key) {
  try { return JSON.parse(sessionStorage.getItem(key) || '{}'); } catch { return {}; }
}
function ssWrite(key, val) {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch { /* quota full — non-fatal */ }
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

function formatSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Extension is authoritative for real media/binary types: a PNG stamped
// 'deliverable' (or any non-media dbKind) must still resolve to 'image' — never
// fall through to fetchContent's text/markdown branch, which renders the fetched
// bytes verbatim and dumps a binary image as raw symbols. Only trust the mirror's
// kind when the extension is inconclusive ('doc'); that still lets pre-watcher
// video/link rows recover via the extension and keeps real docs (.md canon/tape/
// research-drop) on their dbKind.
function resolveKind(dbKind, name) {
  const byExt = fileKind(name);
  if (byExt !== 'doc') return byExt;
  return (dbKind && dbKind !== 'doc') ? dbKind : byExt;
}

// Top-level mission a file belongs to, from its dir path within the project
// ("missions/website/drafts" -> "website"; root files -> null).
function missionOf(relPath) {
  const segs = String(relPath || '').split('/').filter(Boolean);
  return (segs[0] === 'missions' && segs[1]) ? segs[1] : null;
}

function fileKind(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic', 'bmp'].includes(ext)) return 'image';
  if (['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi'].includes(ext)) return 'video';
  if (['wav', 'mp3', 'aac', 'm4a', 'ogg', 'flac', 'aiff', 'opus'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['url', 'webloc'].includes(ext)) return 'link';
  if (['html', 'htm'].includes(ext)) return 'sitefile';
  if (['csv', 'xlsx', 'xls'].includes(ext)) return 'sheet';
  if (['md', 'txt', 'json', 'js', 'jsx', 'py'].includes(ext)) return 'doc';
  return 'doc';
}

// Upload rows carry a mime from the chat attachment — use it when the extension
// is inconclusive (a pasted screenshot named "image" still resolves to image).
function uploadKind(name, mime) {
  const byExt = fileKind(name);
  if (byExt !== 'doc') return byExt;
  const m = String(mime || '');
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m.startsWith('audio/')) return 'audio';
  if (m === 'application/pdf') return 'pdf';
  if (m === 'text/html' || m === 'application/xhtml+xml') return 'sitefile';
  return byExt;
}

// Top-level mission key for an upload's chat scope. mission_slug can arrive
// colon-joined ("project:mission[:sub]") from nested rooms — strip a leading
// project segment and keep the first mission segment, matching missionOf()'s
// top-level-folder convention.
function uploadMissionKey(missionSlug, projectSlug) {
  const segs = String(missionSlug || '').split(':').filter(Boolean);
  if (segs.length && segs[0] === projectSlug) segs.shift();
  return segs[0] || null;
}

function initialsOf(name) {
  const s = String(name || '').trim();
  if (!s) return 'SY';
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Escape first (the source is a real file — never inject its raw bytes as HTML),
// then re-apply a small inline-markdown set on the escaped text.
function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// File content is UNTRUSTED (any file in any project now renders here). A markdown
// link must never become a javascript:/data: handler or inject an attribute. Validate
// the protocol against an allowlist and escape quotes; reject anything else to plain text.
function safeHref(escapedHref) {
  // escapedHref already had & < > escaped by escapeHtml; undo &amp; for the protocol check.
  const raw = String(escapedHref).replace(/&amp;/g, '&');
  try {
    const u = new URL(raw, 'https://aheadofmarket.com');
    if (!['http:', 'https:', 'mailto:'].includes(u.protocol)) return null;
  } catch { return null; }
  return String(escapedHref).replace(/"/g, '&quot;');
}
function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+?)`/g, '<code style="font-family:var(--font-mono);font-size:.92em;background:rgba(127,127,127,.18);padding:1px 5px;border-radius:5px;">$1</code>')
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, (m, text, href) => {
      const safe = safeHref(href);
      return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
    });
}

// Render the WHOLE file as readable HTML so the reader actually lets you read it.
function parseMarkdown(content) {
  if (!content) return { title: '', body: '' };
  // Reader hygiene (loop R11): YAML frontmatter and HTML comments are plumbing,
  // not prose — they rendered as literal text at the top of the paper reader.
  let src = String(content).replace(/^﻿?---[ \t]*\n[\s\S]*?\n---[ \t]*\n?/, '');
  src = src.replace(/<!--[\s\S]*?-->/g, '');
  const lines = src.split('\n');

  let title = '';
  for (let i = 0; i < lines.length; i++) {
    if (/^#\s+/.test(lines[i])) { title = lines[i].replace(/^#+\s+/, '').trim(); lines.splice(i, 1); break; }
  }

  const html = [];
  let para = [];
  let listItems = [];
  const flushPara = () => { if (para.length) { html.push(`<p style="margin:0 0 14px;">${inlineMd(para.join(' '))}</p>`); para = []; } };
  const flushList = () => { if (listItems.length) { html.push(`<ul style="margin:0 0 14px;padding-left:20px;">${listItems.map((li) => `<li style="margin:0 0 6px;">${inlineMd(li)}</li>`).join('')}</ul>`); listItems = []; } };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^#{1,6}\s+/.test(line)) {
      flushPara(); flushList();
      const lvl = line.match(/^#+/)[0].length;
      const size = lvl <= 2 ? 18 : 15;
      html.push(`<h${lvl <= 3 ? lvl : 3} style="font-size:${size}px;font-weight:700;letter-spacing:-.01em;margin:18px 0 8px;">${inlineMd(line.replace(/^#+\s+/, ''))}</h${lvl <= 3 ? lvl : 3}>`);
    } else if (/^\s*[-*+]\s+/.test(line)) {
      flushPara();
      listItems.push(line.replace(/^\s*[-*+]\s+/, ''));
    } else if (line.trim() === '') {
      flushPara(); flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara(); flushList();

  // O2 (census): no 'Untitled' fallback here — the caller falls through to the real
  // filename (`parsed.title || f.name`), so a JSON/data file titles as itself, never "Untitled".
  return { title, body: html.join('') };
}

// Structured-data files (json/yaml/csv/...) are code, not prose — render them monospace
// on the paper instead of pushing them through the markdown parser (O2 census defect:
// JSON previews titled "Untitled" and read as broken paragraphs).
const DATA_EXT = /\.(json|jsonl|ndjson|yaml|yml|toml|csv|tsv|xml|ini|env|lock)$/i;
function dataFilePreview(content) {
  const text = String(content);
  const shown = text.length > 20000 ? `${text.slice(0, 20000)}\n… (truncated)` : text;
  // Paper-locked ink (M7/M9): this renders on the forced-light .doc paper, so
  // var(--fg) resolves near-white in Dark/Glass — invisible JSON.
  return `<pre style="margin:0;font-family:var(--font-mono);font-size:12.5px;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:#1a1a1a;">${escapeHtml(shown)}</pre>`;
}

// Loading state while a file's content lazy-loads. Centered and sized to hold the pane,
// readable on BOTH grounds (paper card and the dark media ground) — the census caught
// the preview sitting black for seconds with no affordance (O2).
const LOADING_HTML = cornerLogoLoaderMarkup('Loading file…', { compact: true, minHeight: 180 });

// Media (video/image) still shows a black box after fetch while bytes stream off the
// tunnel — put a spinner UNDER the media and let the element hide it when real pixels
// arrive (onloadeddata / onload), mirroring the img onerror swap pattern.
const MEDIA_WAIT_HTML = cornerLogoLoaderMarkup('Loading media…', { compact: true, mediaWait: true });
const HIDE_WAIT = "var w=this.parentElement&&this.parentElement.querySelector('[data-media-wait]');if(w)w.style.display='none';";

// Honest, VISUALLY MARKED placeholder for files whose bytes we don't mirror
// (images, PDFs, sheets) — a tinted banner + kind glyph so it reads as intentional,
// never as an error or empty file.
function nonTextPreview(name, kind) {
  const label = kind === 'image' ? 'Image file' : kind === 'pdf' ? 'PDF file' : kind === 'sheet' ? 'Spreadsheet' : kind === 'video' ? 'Video file' : kind === 'audio' ? 'Audio file' : kind === 'sitefile' ? 'Web page' : 'File';
  const lower = label.toLowerCase();
  // Paper-locked ink (M7/M9): this card renders on the forced-light .doc paper,
  // where theme tokens (--fg/--muted/--accent-weak) resolve near-white in
  // Dark/Glass — the card read as an empty pane, i.e. "the file didn't load".
  // Blue is the readers' fixed action color (pdfDocView/docxDocView).
  return (
    '<div style="display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:8px;'
    + 'background:rgba(0,102,255,.08);border-left:3px solid #0066FF;">'
    + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>'
    + `<span style="font-size:13px;font-weight:600;color:#1a1a1a;">${label}</span></div>`
    + `<p style="margin:0;color:#6a6a72;">This ${lower} can't preview inline yet. Use Download to work with it.</p>`
  );
}

// Full corner path for a mirror row: corner/users/<world>/projects/<slug>/<rel>/<name>.
// rel_path is the dir within the project (no filename), '' at the project root.
// Tenant-level missions are mirrored under the pseudo-project 'missions' with
// rel_path leading with the mission slug — those live at corner/users/<world>/missions/.
// Rows mirrored from OUTSIDE the users tree (Corner platform missions at repo-root
// corner/missions/, corner:one-corner M7) carry their true repo path in
// storage_ref='ea://…' — that wins, because deriving from project+rel_path would
// point at a users-tree dir that doesn't exist.
function cornerPathOf(row, worldId) {
  if (!row || !row.project || !row.name) return '';
  const ref = String(row.storage_ref || '');
  if (ref.startsWith('ea://')) return ref.slice(5);
  const rel = row.rel_path ? `${row.rel_path}/` : '';
  const root = row.project === 'missions' ? 'missions' : `projects/${row.project}`;
  return `corner/users/${worldId}/${root}/${rel}${row.name}`;
}

// Image preview: actually SHOW the image, streaming straight off the rag tunnel like
// video does. The old path pulled bytes through the Vercel raw proxy (which 404'd
// anything under assets/ via its hidden list, and buffers whole files against the
// lambda response cap — big screenshots died). <img> needs no auth header and the
// tunnel sends CORS *; on error the img is swapped for the honest placeholder.
function imageBodyHtml(f, worldId) {
  const cornerPath = cornerPathOf(f, worldId);
  if (!cornerPath) return nonTextPreview(f.name, 'image');
  const src = `${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}`;
  const fallback = nonTextPreview(f.name, 'image').replace(/"/g, '&quot;');
  // Spinner sits under the image until real pixels arrive (O2: no more silent black pane).
  return `<div style="position:relative;min-height:180px;">${MEDIA_WAIT_HTML}`
    + `<img src="${src}" alt="${escapeHtml(f.name || 'Image')}" loading="lazy" onload="${HIDE_WAIT}" onerror="${HIDE_WAIT}this.outerHTML=this.dataset.fb" data-fb="${fallback}" style="position:relative;max-width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--hair);" />`
    + '</div>';
}

// PDF preview: the real reader (M7) — pdf.js paints every page onto stacked
// canvases inside the doc flow, hydrated by usePdfDocs on the host screen.
// One vertical scroll, whole document visible, clicks reach the pin listener
// directly (the iframe reader free-scrolled, showed one page on iOS, and
// swallowed clicks). Bytes still stream off the tunnel (inline, Range, CORS *).
function pdfBodyHtml(src, name) {
  return pdfShellHtml(src, name);
}

// Files-tool merge (corner:one-corner, 2026-07-13): the container mounts useReview
// beside this hook and passes the review join in via opts — pure derivation, no new
// endpoint. A file's review identity is its corner path (mirror rows) or its upload
// URL (uploads); queue items key by BOTH their id and their source_path-derived
// corner path, so agent hand-offs (absolute store URLs) still join their mirror row.
//   opts.reviewWaiting  Map<identity, { id, ts }>  — the waiting set (needs review)
//   opts.reviewTotal    number                     — honest waiting total across pages
//   opts.reviewDecided  Map<identity, { verdict, decisionId, itemId }> | null
//                       (only when the Reviewed toggle is on)
//   opts.reviewedOn     boolean                    — the Reviewed toggle state
//   opts.reviewItems    array — the RAW waiting queue items (useReview itemsAll).
//                       The needs-review dimension is QUEUE-driven: a waiting item
//                       whose disk file vanished (deleted after hand-off, or shared
//                       from outside the tree) still MUST show under the needs
//                       filter, or the badge says 3 while the list says 0 (the
//                       2026-07-13 design-critic dead-pill finding — M8).
export function useOrganize(worldId = null, opts = {}) {
  const reviewWaiting = opts.reviewWaiting || null;
  const reviewTotalFromReview = Number(opts.reviewTotal) || 0;
  const reviewDecided = opts.reviewDecided || null;
  const reviewedOn = !!opts.reviewedOn;
  const reviewItems = Array.isArray(opts.reviewItems) ? opts.reviewItems : [];
  const SS_KEY = `org_state_${worldId}`;
  const [projects, setProjects] = useState(null);
  const [files, setFiles] = useState(null);        // metadata rows (no content)
  // The user's own chat uploads (messages: role=user + metadata.attachment(s) —
  // the SAME identity review-queue.js uses). They live under FILES_ROOT per-chat
  // Uploads/ folders, a different root than the disk mirror scans, so without
  // this fetch they are invisible to Organize entirely (corner:one-corner M4).
  const [uploads, setUploads] = useState([]);
  const [filesTruth, setFilesTruth] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  // DEF-02: restore project/filter/mission after tool navigation via sessionStorage.
  const [selectedId, setSelectedId] = useState(() => ssRead(SS_KEY).selectedId ?? null);
  const [filter, setFilter] = useState(() => ssRead(SS_KEY).filter ?? 'recent');
  // Mission narrowing within the selected project. Stored as CANDIDATE slugs (a tree
  // node click hands in every segment of a colon-joined mission path); the first
  // candidate that exists as a mission folder with files wins, else no narrowing.
  const [missionSel, setMissionSel] = useState(() => { // null | ['__all'] | ['__root'] | [slug, ...]
    const v = ssRead(SS_KEY).missionSel;
    return Array.isArray(v) ? v : null;
  });
  // Type-to-find within the current project scope. Persists across mission/type chip
  // flips (refining, not restarting); resets when the project changes. The input is an
  // uncontrolled kept DOM node — the component clears it on project switch to match.
  const [query, setQuery] = useState('');
  // Sort is a VIEW preference (newest | az), not scope — it survives project switches.
  const [sort, setSort] = useState(() => ssRead(SS_KEY).sort ?? 'newest');
  const [openedId, setOpenedId] = useState(null);  // which file is open (preview/reader)
  const [contentCache, setContentCache] = useState({}); // id -> { title, bodyHtml, editor, editorInitials }
  const [missionTree, setMissionTree] = useState({}); // projectSlug -> tree nodes array (nested)
  const inFlight = useRef(new Set()); // file ids whose content fetch is in progress (dedup)

  // DEF-02: persist view state so navigating to another tool and back restores context.
  useEffect(() => {
    ssWrite(SS_KEY, { selectedId, filter, missionSel, sort });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, filter, missionSel, sort]);

  const load = useCallback(async (opts) => {
    // The disk mirror is the source of truth: every file in every project,
    // each row carrying project slug + folder path. Metadata only here.
    // opts.bust — post-mutation reload (rename/move): skip the missions-tree
    // lambda's 30s registry cache so the change shows now, not next poll.
    const bust = opts && opts.bust ? '&bust=1' : '';
    let gotFiles = false;
    let gotFilesTruth = false;

    // No Convex session: a signed-out page renders empty instead of firing
    // tenant-gated reads that can only answer 401.
    if (!hasSession()) {
      setFiles([]);
      setProjects([]);
      setUploads([]);
      setFilesTruth(null);
      setMissionTree({});
      setStatus('loaded');
      return;
    }

    try {
      const organizeRes = await authFetch(
        `/api/dashboard/files?type=organize&client=${encodeURIComponent(worldId)}`,
        { credentials: 'include' }
      );
      const organizeData = await organizeRes.json();
      if (Array.isArray(organizeData.files)) {
        setFiles(organizeData.files);
        setUploads(Array.isArray(organizeData.uploads) ? organizeData.uploads : []);
        setFilesTruth(organizeData.files_truth || null);
        gotFiles = true;
        gotFilesTruth = !!organizeData.files_truth;
      }
    } catch (err) {
      console.error('Failed to load files truth:', err);
    }

    if (!gotFiles) {
      try {
        const filesRes = await authFetch(
          `/api/dashboard/files?type=mirror&client=${encodeURIComponent(worldId)}`,
          { credentials: 'include' }
        );
        const filesData = await filesRes.json();
        if (Array.isArray(filesData.files)) {
          setFiles(filesData.files);
          setFilesTruth(null);
          gotFiles = true;
        }
      } catch (err) {
        console.error('Failed to load files:', err);
      }
    }

    // Secondary, best-effort: nicer project names. Never gates the state.
    try {
      const projRes = await authFetch('/api/dashboard/projects', { credentials: 'include' });
      const projData = await projRes.json();
      if (projData.ok && Array.isArray(projData.projects)) setProjects(projData.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }

    // The user's own uploads (best-effort, never gates the state). type=uploads
    // reads the messages table with the review-queue identity (role=user +
    // metadata.attachment/attachments) and carries chat scope per row.
    if (!gotFilesTruth) {
      try {
        const upRes = await authFetch(
          `/api/dashboard/files?type=uploads&client=${encodeURIComponent(worldId)}&limit=1000`,
          { credentials: 'include' }
        );
        const upData = await upRes.json();
        if (Array.isArray(upData.files)) setUploads(upData.files);
      } catch (err) {
        console.error('Failed to load uploads:', err);
      }
    }

    // Tertiary, best-effort: mission tree for nested room structure in the tree panel.
    try {
      const mtRes = await authFetch('/api/dashboard/missions-tree?client=' + encodeURIComponent(worldId) + bust, { credentials: 'include' });
      const mtData = mtRes.ok ? await mtRes.json() : null;
      if (mtData && Array.isArray(mtData.projects)) {
        const next = {};
        for (const proj of mtData.projects) { if (proj?.slug) next[proj.slug] = proj.tree || []; }
        setMissionTree(next);
      }
    } catch (err) {
      console.error('Failed to load missions tree:', err);
    }

    setStatus(gotFiles ? 'loaded' : 'error');
  }, [worldId]);

  useEffect(() => {
    // Visibility-aware polling: pause when the browser tab is hidden so the
    // 338KB mirror download doesn't run while Patrik is in another tab.
    // On return to visibility, reload immediately so data is always fresh
    // when the user looks at it — never stale on tab focus.
    load();
    let t = setInterval(load, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        clearInterval(t);
      } else {
        load();                          // immediate refresh on return
        t = setInterval(load, 30000);   // restart the interval
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [load]);

  // Lazy content fetch for one file (cached). Called on open. Deduped via a ref
  // set so a double-tap (or auto-open + tap) never fires two requests.
  const fetchContent = useCallback(async (id) => {
    if (!id || contentCache[id] || inFlight.current.has(id)) return;
    // Upload rows aren't in the mirror — their id IS the tunnel URL, and media
    // streams straight off it (same client-direct posture as the chat cards).
    // Synthesize the preview locally instead of asking the mirror for a row it
    // doesn't have (which would leave the pane on "Loading file…" forever).
    const up = (uploads || []).find((u) => u.url === id);
    if (up) {
      const kind = uploadKind(up.name, up.mime);
      const esc = (s) => String(s || '').replace(/"/g, '&quot;');
      let bodyHtml;
      if (kind === 'image') {
        const fallback = nonTextPreview(up.name, 'image').replace(/"/g, '&quot;');
        bodyHtml = `<div style="position:relative;min-height:180px;">${MEDIA_WAIT_HTML}`
          + `<img src="${esc(up.url)}" alt="${escapeHtml(up.name || 'Image')}" loading="lazy" onload="${HIDE_WAIT}" onerror="${HIDE_WAIT}this.outerHTML=this.dataset.fb" data-fb="${fallback}" style="position:relative;max-width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--hair);" />`
          + '</div>';
      } else if (kind === 'video') {
        bodyHtml = `<div style="position:relative;min-height:180px;">${MEDIA_WAIT_HTML}<video src="${esc(up.url)}" ${mediaAttrs(up.url, 'video')} controls preload="metadata" playsinline onloadeddata="${HIDE_WAIT}this.style.background='#000';" style="position:relative;width:100%;max-height:68vh;display:block;border-radius:10px;background:transparent;"></video></div>`;
      } else if (kind === 'audio') {
        bodyHtml = `<audio src="${esc(up.url)}" ${mediaAttrs(up.url, 'audio')} controls preload="metadata" style="width:100%;display:block;margin:12px 0;border-radius:8px;"></audio>`;
      } else if (kind === 'pdf') {
        // Uploads' id IS their store URL — the reader loads it directly
        // (pdfShellHtml escapes attributes itself; no esc() here).
        bodyHtml = pdfBodyHtml(up.url, up.name);
      } else if (isDocxName(up.name)) {
        // Word docs read inline (M9) — useDocxDocs hydrates the shell.
        bodyHtml = docxShellHtml(up.url, up.name);
      } else if (isHtmlName(up.name) || kind === 'sitefile') {
        bodyHtml = htmlShellHtml(up.url, up.name, up.url);
      } else {
        bodyHtml = nonTextPreview(up.name, kind);
      }
      setContentCache((cache) => ({
        ...cache,
        [id]: {
          title: up.name || 'Untitled',
          bodyHtml,
          editor: up.uploader || 'You',
          editorInitials: initialsOf(up.uploader || 'You'),
        },
      }));
      return;
    }
    // A ghost row's id is its store URL (a waiting queue item with no mirror row —
    // M8). The merged detail pane renders it through the review viewer from that
    // URL; there is no mirror row to fetch, so don't fire a doomed lookup.
    if (/^https?:\/\//i.test(id)) {
      const leaf = String(id).split('/').pop() || 'File';
      const kind = fileKind(leaf);
      setContentCache((cache) => ({
        ...cache,
        [id]: { title: leaf, bodyHtml: kind === 'sitefile' ? htmlShellHtml(id, leaf, id) : nonTextPreview(leaf, kind), editor: 'Agent', editorInitials: 'AG' },
      }));
      return;
    }
    inFlight.current.add(id);
    try {
      const res = await authFetch(
        `/api/dashboard/files?type=mirror&client=${encodeURIComponent(worldId)}&id=${encodeURIComponent(id)}&content=1`,
        { credentials: 'include' }
      );
      const d = await res.json();
      const f = d.file;
      if (!f) return;
      const kind = resolveKind(f.kind, f.name);
      let bodyHtml;
      let title;
      if (kind === 'video') {
        // Stream from the tunnel (Range-capable) — a blob fetch through the Vercel
        // proxy would buffer the whole file and die on anything video-sized.
        const cornerPath = cornerPathOf(f, worldId);
        const vsrc = cornerPath ? `${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}` : '';
        // Spinner behind the player until first frame data arrives (O2: the bare black
        // <video> box read as a dead pane for the 5-8s the tunnel takes to answer).
        // On error, mediaAttrs swaps in a "Couldn't load / Retry" card (no more dead box).
        bodyHtml = cornerPath
          ? `<div style="position:relative;min-height:180px;">${MEDIA_WAIT_HTML}<video src="${vsrc}" ${mediaAttrs(vsrc, 'video')} controls preload="metadata" playsinline onloadeddata="${HIDE_WAIT}this.style.background='#000';" style="position:relative;width:100%;max-height:68vh;display:block;border-radius:10px;background:transparent;"></video></div>`
          : nonTextPreview(f.name, 'video');
        title = f.name || 'Untitled';
      } else if (kind === 'audio') {
        // Stream audio off the tunnel — same Range-capable path as video.
        const cornerPath = cornerPathOf(f, worldId);
        const asrc = cornerPath ? `${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}` : '';
        bodyHtml = cornerPath
          ? `<audio src="${asrc}" ${mediaAttrs(asrc, 'audio')} controls preload="metadata" style="width:100%;display:block;margin:12px 0;border-radius:8px;"></audio>`
          : nonTextPreview(f.name, 'audio');
        title = f.name || 'Untitled';
      } else if (kind === 'image') {
        // Real image render, streaming off the tunnel (see imageBodyHtml).
        bodyHtml = imageBodyHtml(f, worldId);
        title = f.name || 'Untitled';
      } else if (kind === 'pdf') {
        // PDFs stream off the tunnel into the browser's native viewer (see pdfBodyHtml).
        const cornerPath = cornerPathOf(f, worldId);
        bodyHtml = cornerPath
          ? pdfBodyHtml(`${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}`, f.name)
          : nonTextPreview(f.name, 'pdf');
        title = f.name || 'Untitled';
      } else if (isDocxName(f.name)) {
        // Word docs read inline (M9) — same tunnel-streamed shell+hydrator
        // pattern as the PDF reader.
        const cornerPath = cornerPathOf(f, worldId);
        bodyHtml = cornerPath
          ? docxShellHtml(`${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}`, f.name)
          : nonTextPreview(f.name, 'doc');
        title = f.name || 'Untitled';
      } else if (kind === 'sitefile' || isHtmlName(f.name)) {
        const cornerPath = cornerPathOf(f, worldId);
        bodyHtml = cornerPath
          ? htmlShellHtml(`${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}`, f.name, cornerPath)
          : nonTextPreview(f.name, 'sitefile');
        title = f.name || 'Untitled';
      } else if (f.content && DATA_EXT.test(f.name || '')) {
        // Structured-data files: monospace verbatim, titled by their real filename (O2).
        bodyHtml = dataFilePreview(f.content);
        title = f.name || 'Untitled';
      } else if (f.content) {
        const parsed = parseMarkdown(f.content);
        bodyHtml = parsed.body || nonTextPreview(f.name, kind);
        title = parsed.title || f.name || 'Untitled';
      } else {
        bodyHtml = nonTextPreview(f.name, kind);
        title = f.name || 'Untitled';
      }
      setContentCache((cache) => ({
        ...cache,
        [id]: {
          title,
          bodyHtml,
          editor: f.last_editor || 'System',
          editorInitials: initialsOf(f.last_editor),
        },
      }));
    } catch (err) {
      console.error('Failed to load file content:', err);
    } finally {
      inFlight.current.delete(id);
    }
  }, [worldId, contentCache, uploads]);

  const openFile = useCallback((id) => { setOpenedId(id); fetchContent(id); }, [fetchContent]);

  // ── shape to the template contract ──
  const nameBySlug = {};
  (projects || []).forEach((p) => { if (p.slug) nameBySlug[p.slug] = p.name || p.slug; });

  const prettify = (slug) =>
    String(slug || 'Untitled').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const backendGhostItems = Array.isArray(filesTruth?.ghosts)
    ? filesTruth.ghosts.map((g) => ({
      id: g.review_id || g.id,
      title: g.name || String(g.review_id || g.id || '').split('/').pop() || 'File',
      whoRaw: g.project || '__personal',
      missionRaw: g.mission || '',
      ts: g.review_ts || g.date || '',
      mime: g.mime || '',
    })).filter((g) => g.id)
    : [];
  const effectiveReviewItems = filesTruth ? backendGhostItems : reviewItems;
  const reviewTotal = Number(filesTruth?.counts?.waitingTotal) || reviewTotalFromReview;

  // Group mirror rows by their project slug.
  const groups = new Map();
  (files || []).forEach((f) => {
    const slug = f.project || 'unfiled';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(f);
  });

  // Merge the user's uploads into their project groups (corner:one-corner M4).
  // Uploads live outside the mirrored repo tree, so each row is synthesized into
  // the mirror-row shape: rel_path places it under missions/<slug>/Uploads (or
  // Uploads at the project root) so mission narrowing works unchanged. Tagged
  // uploaded:true — that flag IS the "My uploads" filter. Dedupe by name+mission
  // against mirror rows so a file that also got committed never doubles up.
  (uploads || []).forEach((u) => {
    // No project home (a 1:1 agent-chat drop, a legacy upload) -> the Personal
    // bucket, a synthetic pseudo-project pinned at the top of the tree. These are
    // real files; hiding them was the old behavior and it was dishonest.
    const slug = String(u.project || '').trim().toLowerCase() || '__personal';
    if (!u.url || !u.name) return;
    const mKey = uploadMissionKey(u.mission, slug);
    if (!groups.has(slug)) groups.set(slug, []);
    const bucket = groups.get(slug);
    const nameLc = String(u.name).toLowerCase();
    const dupe = bucket.some((r) => String(r.name || '').toLowerCase() === nameLc
      && ((r.uploaded ? r.__missionKey : missionOf(r.rel_path)) || null) === (mKey || null));
    if (dupe) return;
    bucket.push({
      id: u.url, // upload urls are unique and stable — safe list key, never collides with mirror uuids
      project: slug,
      rel_path: mKey ? `missions/${mKey}/Uploads` : 'Uploads',
      name: u.name,
      kind: uploadKind(u.name, u.mime),
      size: u.size || 0,
      updated_at: u.date || null,
      last_editor: u.uploader || 'You',
      uploaded: true,
      __missionKey: mKey,
      upload_url: u.url,
      mime: u.mime || null,
      file_ref: u.file_ref || fileRefFromUploadRow(u, { tenantId: worldId }),
      health_status: u.health_status || u.file_ref?.health?.status || 'ready',
    });
  });

  // Project list = every real project in this world (so all show), counts merged in,
  // then any orphan groups whose project isn't in the table.
  const CRUFT = /(^|-)(smoke|proj-tool|loop-test|test-project|lr2test)/i;
  const worldProjects = (projects || []).filter(
    (p) => p.slug && p.client_id === worldId && !CRUFT.test(p.slug)
  );
  const seenSlugs = new Set();
  const projectList = worldProjects.map((p) => {
    seenSlugs.add(p.slug);
    return {
      id: p.slug,
      name: p.name || prettify(p.slug),
      fileCount: (groups.get(p.slug) || []).length,
      folderCount: 0, // Phase 2 turns folders on
      tint: tintFor(p.slug),
      glyph: 'folder',
      countLabel: `${(groups.get(p.slug) || []).length} file${(groups.get(p.slug) || []).length === 1 ? '' : 's'}`,
    };
  });
  for (const [slug, fs] of groups.entries()) {
    if (slug === 'unfiled' || slug === '__personal' || seenSlugs.has(slug)) continue;
    projectList.push({ id: slug, name: nameBySlug[slug] || prettify(slug), fileCount: fs.length, folderCount: 0, tint: tintFor(slug), glyph: 'folder', countLabel: `${fs.length} file${fs.length === 1 ? '' : 's'}` });
  }
  // Alphabetical by display name (case-insensitive), so the list is scannable instead of
  // arriving in the table's recency order. This order also drives the desktop tree panel.
  projectList.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  // Personal bucket pinned ABOVE the alphabetical list (person glyph, not a folder):
  // the honest home for 1:1 chat uploads with no project. Always present so the
  // "where do my 1:1 files go" answer never disappears.
  {
    const personalFiles = groups.get('__personal') || [];
    projectList.unshift({
      id: '__personal',
      name: 'Personal',
      fileCount: personalFiles.length,
      folderCount: 0,
      tint: 'accent',
      glyph: 'person',
      countLabel: `${personalFiles.length} file${personalFiles.length === 1 ? '' : 's'}`,
    });
  }

  const inList = (id) => projectList.some((p) => p.id === id);
  // Default landing skips Personal — the first REAL project stays the front door.
  const activeProjectId = (selectedId && inList(selectedId))
    ? selectedId
    : (projectList.find((p) => p.id !== '__personal')?.id || projectList[0]?.id || null);

  // Build treeNodes: d0 project rows, then d1 mission rows for the active project.
  const treeNodes = [];
  for (const p of projectList) {
    const isActive = p.id === activeProjectId;
    const missions = isActive ? (missionTree[p.id] || []) : [];
    treeNodes.push({ id: p.id, name: p.name, depth: 'd0', tint: p.tint, glyph: p.glyph || 'folder', chev: missions.length ? 'down' : (p.fileCount ? 'down' : 'none'), open: isActive });
    if (isActive) {
      for (const m of missions) {
        const mSlug = String(m.slug || '').includes(':') ? m.slug : `${p.id}:${m.slug}`;
        const mName = String(m.name || m.slug || '').includes(':') ? String(m.name || m.slug || '').slice(String(m.name || m.slug || '').lastIndexOf(':') + 1).trim() : (m.name || m.slug);
        treeNodes.push({ id: mSlug, name: mName, depth: 'd1', tint: p.tint, glyph: 'folder', chev: 'none', open: false });
      }
    }
  }

  const openProject = treeNodes.find((n) => n.id === activeProjectId) || treeNodes[0] || { id: null, name: 'Projects' };

  // Files in the current project (flat for Phase 1 — folders arrive in Phase 2),
  // newest first, narrowed by the active filter.
  // Filters (Patrik 2026-06-30): Recent (all, newest-first) · Links · Docs · Pdfs ·
  // Images · Video. "docs" is the catch-all for anything that isn't one of the typed
  // kinds, so no file is unreachable (sheets/unknowns land here too).
  const fileMatchesFilter = (f, eff) => {
    const kind = f.kind;
    switch (eff) {
      case 'needs':   return !!f.needsReview; // needs-review triage (files-tool merge)
 case 'uploads': return !!f.uploaded; // "My uploads", the files Patrik dropped into chats
      case 'links':  return kind === 'link';
      case 'pdfs':   return kind === 'pdf';
      case 'images': return kind === 'image';
      case 'video':  return kind === 'video';
      case 'audio':  return kind === 'audio';
      case 'docs':   return !['image', 'video', 'audio', 'pdf', 'link'].includes(kind);
      case 'recent':
      default:       return true;
    }
  };
  const allFiles = (groups.get(openProject.id) || [])
    .slice()
    .sort((a, b) => (sort === 'az'
      // numeric:true = natural sort, so shot-2 lands before shot-10
      ? String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base', numeric: true })
      : String(b.updated_at || '').localeCompare(String(a.updated_at || ''))))
    .map((f) => {
      const fname = f.name || 'Untitled';
      const fileRef = f.file_ref || (f.uploaded
        ? fileRefFromUploadRow({
          id: f.id,
          url: f.upload_url || f.id,
          name: fname,
          mime: f.mime,
          size: f.size,
          project: f.project,
          mission: f.__missionKey,
          date: f.updated_at,
        }, { tenantId: worldId })
        : fileRefFromProjectFileRow(f, { tenantId: worldId }));
      const kind = resolveKind(fileRef.kind || f.kind, fname);
      // Review identity join (files-tool merge): waiting set membership drives the
      // NEEDS REVIEW badge + the needs-review filter; the decided map (Reviewed
      // toggle on) drives the verdict badges + Restore on dismissed rows.
      const identities = fileRef.identities?.length ? fileRef.identities : [f.uploaded ? (f.upload_url || f.id) : cornerPathOf(f, worldId)];
      const backendHit = f.needs_review ? { id: f.review_id || fileRef.review?.id || identities[0], ts: f.review_ts || f.updated_at || '' } : null;
      const wHit = backendHit || (reviewWaiting ? identities.map((id) => reviewWaiting.get(id)).find(Boolean) : null);
      const dHit = (!wHit && reviewDecided) ? identities.map((id) => reviewDecided.get(id)).find(Boolean) : null;
      const identity = fileRef.review?.id || identities[0] || '';
      return {
        id: f.id,
        name: fname,
        edited: relTime(f.updated_at),
        size: formatSize(fileRef.sizeBytes || f.size || 0),
        kind,
        mime: fileRef.mime || f.mime || null,
        status: fileRef.health?.status || f.health_status || 'ready',
        uploaded: !!f.uploaded, // feeds the "My uploads" chip
        // The identity verdicts/pins/viewer key on: the queue item's id when the file
        // is (or was) in the review flow, else its own corner path / upload URL.
        reviewId: wHit ? wHit.id : (dHit ? (dHit.itemId || identity) : identity),
        needsReview: !!wHit,
        reviewTs: wHit ? (wHit.ts || '') : '',
        // Row badge: a badge must MEAN something — waiting files wear NEEDS REVIEW;
        // decided files (Reviewed toggle on) wear their verdict; everything else none.
        badge: wHit ? 'needs'
          : dHit ? (dHit.verdict === 'approve' ? 'approved' : dHit.verdict === 'request-changes' ? 'returned' : 'dismissed')
            : 'none',
        decisionId: dHit ? (dHit.decisionId || '') : '',
        fileRef,
        // In the 'missions' pseudo-project (tenant-level missions), the first
        // rel_path segment IS the mission slug; elsewhere it's missions/<slug>/.
        missionKey: f.uploaded
          ? (f.__missionKey || null)
          : (openProject.id === 'missions'
            ? (String(f.rel_path || '').split('/').filter(Boolean)[0] || null)
            : missionOf(f.rel_path)),
      };
    });

  // Ghost rows (M8): waiting queue items filed to THIS room that joined no
  // on-disk row — the hand-off's repo copy was deleted (or it was shared from
  // outside the tree), but the deliverable still exists at its store URL and
  // still wants a verdict. They surface ONLY in the needs-review dimension
  // (chip count + needs-filtered list), never under Recent or the type chips —
  // the browse dimensions stay disk-truth.
  const joinedReviewIds = new Set();
  for (const f of allFiles) { if (f.needsReview && f.reviewId) joinedReviewIds.add(f.reviewId); }
  const ghosts = effectiveReviewItems
    .filter((it) => it && it.id && !joinedReviewIds.has(it.id)
      && ((it.whoRaw || '__personal') === openProject.id))
    .map((it) => ({
      id: it.id,
      name: it.title || String(it.id).split('/').pop() || 'File',
      edited: it.time || '',
      size: '',
      kind: uploadKind(it.title || '', it.mime || ''),
      mime: it.mime || null,
      status: 'ready',
      uploaded: false,
      reviewId: it.id,
      needsReview: true,
      reviewTs: it.ts || '',
      badge: 'needs',
      decisionId: '',
      missionKey: uploadMissionKey(it.missionRaw, openProject.id),
      ghost: true,
    }));

  // Mission narrowing: chips are built FROM the files themselves (top-level
  // missions/<slug> folders that actually hold files), so picking one never lands
  // on an empty column. Root-level files get their own bucket when missions exist.
  const missionCounts = new Map();
  let rootCount = 0;
  for (const f of allFiles) {
    if (f.missionKey) missionCounts.set(f.missionKey, (missionCounts.get(f.missionKey) || 0) + 1);
    else rootCount += 1;
  }
  const activeMission = (() => {
    for (const cand of (Array.isArray(missionSel) ? missionSel : [])) {
      if (cand === '__all') return null;
      if (cand === '__root' && rootCount) return '__root';
      if (missionCounts.has(cand)) return cand;
    }
    return null;
  })();
  const missionFiles = activeMission == null
    ? allFiles
    : allFiles.filter((f) => (activeMission === '__root' ? !f.missionKey : f.missionKey === activeMission));

  const missionChips = missionCounts.size
    ? [
        { id: '__all', label: `All ${allFiles.length}`, active: activeMission == null ? 'on' : 'off' },
        ...[...missionCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([slug, n]) => ({ id: slug, label: `${prettify(slug)} ${n}`, active: activeMission === slug ? 'on' : 'off' })),
        ...(rootCount ? [{ id: '__root', label: `Other ${rootCount}`, active: activeMission === '__root' ? 'on' : 'off' }] : []),
      ]
    : [];

  const countKind = (k) => missionFiles.filter((f) => f.kind === k).length;
  const imageCount = countKind('image');
  const videoCount = countKind('video');
  const audioCount = countKind('audio');
  const pdfCount = countKind('pdf');
  const linkCount = countKind('link');
  const docCount = missionFiles.filter((f) => !['image', 'video', 'audio', 'pdf', 'link'].includes(f.kind)).length;
  const uploadCount = missionFiles.filter((f) => f.uploaded).length;
  // Ghosts narrowed to the active mission scope (same rule as missionFiles).
  const ghostsScoped = activeMission == null
    ? ghosts
    : ghosts.filter((f) => (activeMission === '__root' ? !f.missionKey : f.missionKey === activeMission));
  // If the active type filter has no files in the new mission/project scope, fall
  // back to Recent instead of showing an inexplicable empty column. "My uploads"
  // is exempt: the chip is always present (Patrik 2026-07-12), so staying on it
  // with an empty list is honest, not inexplicable.
  // needsCount INCLUDES ghosts: the chip, the badge, and the needs-filtered list
  // must all agree — counts tell the truth (M8).
  const needsCount = missionFiles.filter((f) => f.needsReview).length + ghostsScoped.length;
  const kindCountFor = { links: linkCount, docs: docCount, pdfs: pdfCount, images: imageCount, video: videoCount, audio: audioCount };
  // 'needs' is exempt from the zero-count fallback like 'uploads': the cleared
  // triage list must show its honest empty state, never silently flip to Recent.
  const effFilter = (filter !== 'recent' && filter !== 'uploads' && filter !== 'needs' && !kindCountFor[filter]) ? 'recent' : filter;
  const q = query.trim().toLowerCase();
  const fileList = (effFilter === 'needs'
    ? [...missionFiles.filter((f) => f.needsReview), ...ghostsScoped]
    : missionFiles.filter((f) => fileMatchesFilter(f, effFilter)))
    .filter((f) => !q || f.name.toLowerCase().includes(q))
    // Triage order: under the needs-review filter the list reads newest HAND-OFF
    // first (the queue's own byNewest), not newest file-edit first.
    .sort((a, b) => (effFilter === 'needs'
      ? String(b.reviewTs || '').localeCompare(String(a.reviewTs || ''))
      : 0));

  // The open file: the explicitly-opened one if it's in this project's list, else the first.
  const openInList = fileList.find((f) => f.id === openedId) || fileList[0] || null;
  const cached = openInList ? contentCache[openInList.id] : null;
  // The raw mirror row behind the open file, so we can build its real corner path
  // for "Open in Review" (Review loads any corner path through its authed viewer).
  const openRawRow = openInList ? (groups.get(openProject.id) || []).find((r) => r.id === openInList.id) : null;
  // DEF-01 FIX: compute corner path; if cornerPathOf fails (returns ''), try to construct it from openRawRow anyway.
  // This ensures videos and other file types always pass through to Review.
  // Uploads are NOT in the mirrored repo tree — their identity is the tunnel URL,
  // which Review's viewer loads directly (it handles full RAG-store URLs).
  let openCornerPath = openRawRow?.uploaded ? (openRawRow.upload_url || '') : cornerPathOf(openRawRow, worldId);
  if (!openCornerPath && openRawRow && openInList && !openRawRow.uploaded) {
    const rel = openRawRow.rel_path ? `${openRawRow.rel_path}/` : '';
    const root = openRawRow.project === 'missions' ? 'missions' : `projects/${openRawRow.project}`;
    openCornerPath = `corner/users/${worldId}/${root}/${rel}${openRawRow.name}`;
  }
  // mode drives the preview shell (data-switch): text-ish files read on the paper
  // card; video/image render full-width on the dark ground (media).
  const previewObj = openInList
    ? {
        fileName: openInList.name,
        title: cached?.title || openInList.name,
        bodyHtml: cached?.bodyHtml || LOADING_HTML,
        mode: ['video', 'image'].includes(openInList.kind) ? 'media' : 'paper',
      }
    : { fileName: '', title: '', bodyHtml: '<p>No file selected</p>', mode: 'paper' };

  const data = {
    tree: treeNodes,
    folder: {
      name: openProject.name,
      fileCount: fileList.length,
      folderCount: 0,
      // Under the needs-review filter the header counts what WAITS, honestly scoped.
      fileCountLabel: effFilter === 'needs'
        ? `${fileList.length} to review`
        : `${fileList.length} file${fileList.length === 1 ? '' : 's'}`,
    },
    files: fileList,
    projects: projectList,
    breadcrumb: [{ id: 'root', name: 'Corner' }, openProject].filter((x) => x.id),
    // Zero-count type chips are dropped entirely — a permanently-dead "Video 0"
    // button reads as broken. Recent always shows (it's the reset), and so does
    // "My uploads" (Patrik 2026-07-12: present at every project/mission scope —
    // a chip that comes and goes reads as removed; count is omitted at zero).
    filters: [
      { id: 'recent',  label: `Recent ${missionFiles.length}`, active: effFilter === 'recent' ? 'on' : 'off' },
      { id: 'uploads', label: `My uploads${uploadCount ? ` ${uploadCount}` : ''}`, count: uploadCount, active: effFilter === 'uploads' ? 'on' : 'off' },
      { id: 'links',  label: `Links ${linkCount}`,        count: linkCount,  active: effFilter === 'links'  ? 'on' : 'off' },
      { id: 'docs',   label: `Docs ${docCount}`,          count: docCount,   active: effFilter === 'docs'   ? 'on' : 'off' },
      { id: 'pdfs',   label: `Pdfs ${pdfCount}`,          count: pdfCount,   active: effFilter === 'pdfs'   ? 'on' : 'off' },
      { id: 'images', label: `Images ${imageCount}`,      count: imageCount, active: effFilter === 'images' ? 'on' : 'off' },
      { id: 'video',  label: `Video ${videoCount}`,       count: videoCount, active: effFilter === 'video'  ? 'on' : 'off' },
      { id: 'audio',  label: `Audio ${audioCount}`,       count: audioCount, active: effFilter === 'audio'  ? 'on' : 'off' },
    ].filter((c) => c.id === 'recent' || c.id === 'uploads' || c.count > 0),
    // The needs-review chip: FIRST in the chip row (its own template slot, left of
    // Recent), amber count = "these want you". Renders only when its scoped count
    // is > 0 — except while the filter itself is active, so the cleared state stays
    // legible until the next scope change collapses it.
    needsChip: {
      id: 'needs',
      state: (needsCount > 0 || effFilter === 'needs') ? 'show' : 'hide',
      active: effFilter === 'needs' ? 'on' : 'off',
      count: needsCount,
    },
    // All-projects top-line pill: the honest waiting total across the whole world
    // (server total, not the fetched window). Tapping it jumps into triage.
    needsPill: {
      state: reviewTotal > 0 ? 'show' : 'hide',
      label: `${reviewTotal} need${reviewTotal === 1 ? 's' : ''} your review`,
    },
    // Reviewed toggle (segmented, next to the sort control): off = normal browse;
    // on = decided files wear their verdict badge and dismissed rows offer Restore.
    reviewed: { active: reviewedOn ? 'on' : 'off' },
    // In-column empty states (the file list itself, not the whole-screen empty).
    listEmpty: (() => {
      const none = { state: 'none', title: '', body: '', actionState: 'no', actionLabel: '' };
      if (fileList.length) return none;
      if (effFilter === 'needs') {
        if (reviewTotal > 0) {
          return {
            state: 'show',
            title: 'Nothing here to review',
            body: `${reviewTotal} ${reviewTotal === 1 ? 'is' : 'are'} waiting across your other rooms.`,
            actionState: 'yes',
            actionLabel: `Browse waiting (${reviewTotal})`,
          };
        }
        return { state: 'show', title: "You're all caught up", body: 'Nothing needs your review right now. New deliverables your crew flags will land here.', actionState: 'no', actionLabel: '' };
      }
      if (q) return none; // a live search with no hits reads fine as an empty list
      if (openProject.id === '__personal') {
        return { state: 'show', title: 'Nothing personal yet', body: 'Files you drop into 1:1 chats land here.', actionState: 'no', actionLabel: '' };
      }
      return { state: 'show', title: 'No files here yet', body: 'Files your crew produces in this room will land here.', actionState: 'no', actionLabel: '' };
    })(),
    missions: missionChips,
    sorts: [
      { id: 'newest', label: 'Newest', active: sort === 'newest' ? 'on' : 'off' },
      { id: 'az',     label: 'A-Z',    active: sort === 'az'     ? 'on' : 'off' },
    ],
    preview: previewObj,
    openedId: openInList?.id || null,
    viewFile: openInList
      ? {
          id: openInList.id,
          name: openInList.name,
          path: `${openProject.name} · ${openInList.name}`,
          title: previewObj.title,
          bodyHtml: previewObj.bodyHtml,
          editor: cached?.editor || 'System',
          editorInitials: cached?.editorInitials || 'SY',
          editorTint: 'neutral',
          edited: openInList.edited,
          status: openInList.status,
          statusLabel: (openInList.status || 'ready').toUpperCase(),
          // Review identity of the open file (verdicts/pins/viewer key on this).
          reviewId: openInList.reviewId || openCornerPath || '',
          needsReview: !!openInList.needsReview,
          needs: openInList.needsReview ? 'yes' : 'no',
          mime: openInList.mime || null,
          kind: openInList.kind,
          reviewFile: openCornerPath ? { url: openCornerPath, name: openInList.name } : null,
          projectSlug: openProject.id,
        }
      : null,
    selection: { count: 0 },
    activeJob: null,
    moving: null,
    destinations: [], // Phase 2/3: folder destinations
    movePick: { name: '' },
    folders: [],      // Phase 2: subfolders

    empty: {
      title: 'No projects yet',
      body: 'Create your first project to start organizing files.',
      actionLabel: 'New project',
    },
    loading: { label: 'Preparing your files' },
    error: {
      title: "We couldn't load your files",
      body: 'Your connection dropped. Nothing was lost. Your last view is saved.',
      code: 'organize · retrying',
    },
  };

  // Auto-open the first file of the active project so the desktop preview is
  // populated by default (and its content loads). Doesn't navigate mobile.
  useEffect(() => {
    const first = fileList[0]?.id || null;
    if (first && (!openedId || !fileList.some((f) => f.id === openedId))) {
      openFile(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProjectId, fileList.length, openedId]);

  let state = 'ready';
  if (status === 'loading' && !files) state = 'loading';
  else if (status === 'error') state = 'error';
  else if (!projectList.length) state = 'empty';

  const selectProject = useCallback((id) => { setSelectedId(id); setFilter('recent'); setMissionSel(null); setQuery(''); setOpenedId(null); }, []);

  // Narrow to a mission. Accepts one slug or an ordered candidate list (a tree node
  // click passes every segment of a colon-joined mission path; the first segment
  // that exists as a mission folder with files wins).
  const selectMission = useCallback((idOrList) => {
    const list = Array.isArray(idOrList) ? idOrList : [idOrList];
    setMissionSel(list.filter(Boolean).length ? list.filter(Boolean) : null);
    setFilter('recent');
    setOpenedId(null);
  }, []);

  // projects + missionTree exposed raw for the right-click context menu
  // (rename/move needs registry paths + move destinations, not display rows).
  return { state, data, reload: load, selectProject, selectMission, setFilter, setQuery, setSort, openFile, activeProjectId, projects, missionTree };
}