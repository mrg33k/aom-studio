// cv6next — real Organize data, shaped to the wired/ template contract.
// Phase 1 (corner:corner-ui-cv6): reads the project_files DISK MIRROR
// (/api/dashboard/files?type=mirror), so EVERY file in a project is viewable —
// not just scaffold .md. The list is metadata-only; a file's content is fetched
// lazily on open (cached) so a 7k-file world never ships its whole text at once.

import { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../../lib/authFetch';

const TINTS = ['violet', 'accent', 'pink', 'success'];

// Video bytes stream straight off the rag tunnel (Range + CORS *), never through
// the Vercel raw proxy — that path buffers the whole file and can't carry video.
// Same client-direct posture as CV3/CV4 attachments (useChatAttachments).
const TUNNEL_BASE = 'https://rag.aheadofmarket.com';

function tintFor(seed) {
  let h = 0; for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
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

function formatSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Prefer the mirror's kind unless it's the 'doc' catch-all — rows written before
// the watcher knew video/link kinds are stamped 'doc', so the extension wins there.
function resolveKind(dbKind, name) {
  return (dbKind && dbKind !== 'doc') ? dbKind : fileKind(name);
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
  if (['csv', 'xlsx', 'xls'].includes(ext)) return 'sheet';
  if (['md', 'txt', 'json', 'js', 'jsx', 'py'].includes(ext)) return 'doc';
  return 'doc';
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
    .replace(/`([^`]+?)`/g, '<code style="font-family:var(--font-mono);font-size:.92em;background:rgba(0,0,0,.05);padding:1px 5px;border-radius:5px;">$1</code>')
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

  return { title: title || 'Untitled', body: html.join('') };
}

// Loading shimmer while a file's content lazy-loads (kinetic, on-brand — not bare text).
const LOADING_HTML =
  '<div style="display:flex;align-items:center;gap:9px;color:var(--muted,#888);">'
  + '<svg class="aspin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>'
  + '<span style="font-size:13px;">Loading file…</span></div>';

// Honest, VISUALLY MARKED placeholder for files whose bytes we don't mirror
// (images, PDFs, sheets) — a tinted banner + kind glyph so it reads as intentional,
// never as an error or empty file.
function nonTextPreview(name, kind) {
  const label = kind === 'image' ? 'Image file' : kind === 'pdf' ? 'PDF file' : kind === 'sheet' ? 'Spreadsheet' : kind === 'video' ? 'Video file' : kind === 'audio' ? 'Audio file' : 'File';
  const lower = label.toLowerCase();
  return (
    '<div style="display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:8px;'
    + 'background:var(--accent-weak);border-left:3px solid var(--accent);">'
    + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>'
    + `<span style="font-size:13px;font-weight:600;color:var(--fg);">${label}</span></div>`
    + `<p style="margin:0;color:#888;">This ${lower} can't preview inline yet. Open it in Review to work with it.</p>`
  );
}

// Full corner path for a mirror row: corner/users/<world>/projects/<slug>/<rel>/<name>.
// rel_path is the dir within the project (no filename), '' at the project root.
function cornerPathOf(row, worldId) {
  if (!row || !row.project || !row.name) return '';
  const rel = row.rel_path ? `${row.rel_path}/` : '';
  return `corner/users/${worldId}/projects/${row.project}/${rel}${row.name}`;
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
  return `<img src="${src}" alt="${escapeHtml(f.name || 'Image')}" loading="lazy" onerror="this.outerHTML=this.dataset.fb" data-fb="${fallback}" style="max-width:100%;height:auto;display:block;border-radius:10px;border:1px solid var(--hair);background:var(--surface-2);" />`;
}

export function useOrganize(worldId = 'aom') {
  const [projects, setProjects] = useState(null);
  const [files, setFiles] = useState(null);        // metadata rows (no content)
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [selectedId, setSelectedId] = useState(null); // which project's files show
  const [filter, setFilter] = useState('recent');  // recent | links | docs | pdfs | images | video | audio
  // Mission narrowing within the selected project. Stored as CANDIDATE slugs (a tree
  // node click hands in every segment of a colon-joined mission path); the first
  // candidate that exists as a mission folder with files wins, else no narrowing.
  const [missionSel, setMissionSel] = useState(null); // null | ['__all'] | ['__root'] | [slug, ...]
  // Type-to-find within the current project scope. Persists across mission/type chip
  // flips (refining, not restarting); resets when the project changes. The input is an
  // uncontrolled kept DOM node — the component clears it on project switch to match.
  const [query, setQuery] = useState('');
  // Sort is a VIEW preference (newest | az), not scope — it survives project switches.
  const [sort, setSort] = useState('newest');
  const [openedId, setOpenedId] = useState(null);  // which file is open (preview/reader)
  const [contentCache, setContentCache] = useState({}); // id -> { title, bodyHtml, editor, editorInitials }
  const [missionTree, setMissionTree] = useState({}); // projectSlug -> tree nodes array (nested)
  const inFlight = useRef(new Set()); // file ids whose content fetch is in progress (dedup)

  const load = useCallback(async (opts) => {
    // The disk mirror is the source of truth: every file in every project,
    // each row carrying project slug + folder path. Metadata only here.
    // opts.bust — post-mutation reload (rename/move): skip the missions-tree
    // lambda's 30s registry cache so the change shows now, not next poll.
    const bust = opts && opts.bust ? '&bust=1' : '';
    let gotFiles = false;
    try {
      const filesRes = await authFetch(
        `/api/dashboard/files?type=mirror&client=${encodeURIComponent(worldId)}`,
        { credentials: 'include' }
      );
      const filesData = await filesRes.json();
      if (Array.isArray(filesData.files)) {
        setFiles(filesData.files);
        gotFiles = true;
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }

    // Secondary, best-effort: nicer project names. Never gates the state.
    try {
      const projRes = await authFetch('/api/dashboard/projects', { credentials: 'include' });
      const projData = await projRes.json();
      if (projData.ok && Array.isArray(projData.projects)) setProjects(projData.projects);
    } catch (err) {
      console.error('Failed to load projects:', err);
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
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Lazy content fetch for one file (cached). Called on open. Deduped via a ref
  // set so a double-tap (or auto-open + tap) never fires two requests.
  const fetchContent = useCallback(async (id) => {
    if (!id || contentCache[id] || inFlight.current.has(id)) return;
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
        bodyHtml = cornerPath
          ? `<video src="${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}" controls preload="metadata" playsinline style="width:100%;max-height:68vh;display:block;border-radius:10px;background:#000;"></video>`
          : nonTextPreview(f.name, 'video');
        title = f.name || 'Untitled';
      } else if (kind === 'audio') {
        // Stream audio off the tunnel — same Range-capable path as video.
        const cornerPath = cornerPathOf(f, worldId);
        bodyHtml = cornerPath
          ? `<audio src="${TUNNEL_BASE}/project-file-raw?path=${encodeURIComponent(cornerPath)}" controls preload="metadata" style="width:100%;display:block;margin:12px 0;border-radius:8px;"></audio>`
          : nonTextPreview(f.name, 'audio');
        title = f.name || 'Untitled';
      } else if (kind === 'image') {
        // Real image render, streaming off the tunnel (see imageBodyHtml).
        bodyHtml = imageBodyHtml(f, worldId);
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
  }, [worldId, contentCache]);

  const openFile = useCallback((id) => { setOpenedId(id); fetchContent(id); }, [fetchContent]);

  // ── shape to the template contract ──
  const nameBySlug = {};
  (projects || []).forEach((p) => { if (p.slug) nameBySlug[p.slug] = p.name || p.slug; });

  const prettify = (slug) =>
    String(slug || 'Untitled').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Group mirror rows by their project slug.
  const groups = new Map();
  (files || []).forEach((f) => {
    const slug = f.project || 'unfiled';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(f);
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
      countLabel: `${(groups.get(p.slug) || []).length} file${(groups.get(p.slug) || []).length === 1 ? '' : 's'}`,
    };
  });
  for (const [slug, fs] of groups.entries()) {
    if (slug === 'unfiled' || seenSlugs.has(slug)) continue;
    projectList.push({ id: slug, name: nameBySlug[slug] || prettify(slug), fileCount: fs.length, folderCount: 0, tint: tintFor(slug), countLabel: `${fs.length} file${fs.length === 1 ? '' : 's'}` });
  }
  // Alphabetical by display name (case-insensitive), so the list is scannable instead of
  // arriving in the table's recency order. This order also drives the desktop tree panel.
  projectList.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const inList = (id) => projectList.some((p) => p.id === id);
  const activeProjectId = (selectedId && inList(selectedId)) ? selectedId : (projectList[0]?.id || null);

  // Build treeNodes: d0 project rows, then d1 mission rows for the active project.
  const treeNodes = [];
  for (const p of projectList) {
    const isActive = p.id === activeProjectId;
    const missions = isActive ? (missionTree[p.id] || []) : [];
    treeNodes.push({ id: p.id, name: p.name, depth: 'd0', tint: p.tint, chev: missions.length ? 'down' : (p.fileCount ? 'down' : 'none'), open: isActive });
    if (isActive) {
      for (const m of missions) {
        const mSlug = String(m.slug || '').includes(':') ? m.slug : `${p.id}:${m.slug}`;
        const mName = String(m.name || m.slug || '').includes(':') ? String(m.name || m.slug || '').slice(String(m.name || m.slug || '').lastIndexOf(':') + 1).trim() : (m.name || m.slug);
        treeNodes.push({ id: mSlug, name: mName, depth: 'd1', tint: p.tint, chev: 'none', open: false });
      }
    }
  }

  const openProject = treeNodes.find((n) => n.id === activeProjectId) || treeNodes[0] || { id: null, name: 'Projects' };

  // Files in the current project (flat for Phase 1 — folders arrive in Phase 2),
  // newest first, narrowed by the active filter.
  // Filters (Patrik 2026-06-30): Recent (all, newest-first) · Links · Docs · Pdfs ·
  // Images · Video. "docs" is the catch-all for anything that isn't one of the typed
  // kinds, so no file is unreachable (sheets/unknowns land here too).
  const fileMatchesFilter = (kind, eff) => {
    switch (eff) {
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
      const kind = resolveKind(f.kind, fname);
      return {
        id: f.id,
        name: fname,
        edited: relTime(f.updated_at),
        size: formatSize(f.size || 0),
        kind,
        status: 'ready',
        missionKey: missionOf(f.rel_path),
      };
    });

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
        ...(rootCount ? [{ id: '__root', label: `Root ${rootCount}`, active: activeMission === '__root' ? 'on' : 'off' }] : []),
      ]
    : [];

  const countKind = (k) => missionFiles.filter((f) => f.kind === k).length;
  const imageCount = countKind('image');
  const videoCount = countKind('video');
  const audioCount = countKind('audio');
  const pdfCount = countKind('pdf');
  const linkCount = countKind('link');
  const docCount = missionFiles.filter((f) => !['image', 'video', 'audio', 'pdf', 'link'].includes(f.kind)).length;
  // If the active type filter has no files in the new mission/project scope, fall
  // back to Recent instead of showing an inexplicable empty column.
  const kindCountFor = { links: linkCount, docs: docCount, pdfs: pdfCount, images: imageCount, video: videoCount, audio: audioCount };
  const effFilter = (filter !== 'recent' && !kindCountFor[filter]) ? 'recent' : filter;
  const q = query.trim().toLowerCase();
  const fileList = missionFiles
    .filter((f) => fileMatchesFilter(f.kind, effFilter))
    .filter((f) => !q || f.name.toLowerCase().includes(q));

  // The open file: the explicitly-opened one if it's in this project's list, else the first.
  const openInList = fileList.find((f) => f.id === openedId) || fileList[0] || null;
  const cached = openInList ? contentCache[openInList.id] : null;
  // The raw mirror row behind the open file, so we can build its real corner path
  // for "Open in Review" (Review loads any corner path through its authed viewer).
  const openRawRow = openInList ? (groups.get(openProject.id) || []).find((r) => r.id === openInList.id) : null;
  const openCornerPath = cornerPathOf(openRawRow, worldId);
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
    folder: { name: openProject.name, fileCount: fileList.length, folderCount: 0, fileCountLabel: `${fileList.length} file${fileList.length === 1 ? '' : 's'}` },
    files: fileList,
    projects: projectList,
    breadcrumb: [{ id: 'root', name: 'Corner' }, openProject].filter((x) => x.id),
    // Zero-count type chips are dropped entirely — a permanently-dead "Video 0"
    // button reads as broken. Recent always shows (it's the reset).
    filters: [
      { id: 'recent', label: `Recent ${missionFiles.length}`, active: effFilter === 'recent' ? 'on' : 'off' },
      { id: 'links',  label: `Links ${linkCount}`,        count: linkCount,  active: effFilter === 'links'  ? 'on' : 'off' },
      { id: 'docs',   label: `Docs ${docCount}`,          count: docCount,   active: effFilter === 'docs'   ? 'on' : 'off' },
      { id: 'pdfs',   label: `Pdfs ${pdfCount}`,          count: pdfCount,   active: effFilter === 'pdfs'   ? 'on' : 'off' },
      { id: 'images', label: `Images ${imageCount}`,      count: imageCount, active: effFilter === 'images' ? 'on' : 'off' },
      { id: 'video',  label: `Video ${videoCount}`,       count: videoCount, active: effFilter === 'video'  ? 'on' : 'off' },
      { id: 'audio',  label: `Audio ${audioCount}`,       count: audioCount, active: effFilter === 'audio'  ? 'on' : 'off' },
    ].filter((c) => c.id === 'recent' || c.count > 0),
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
          // "Open in Review": the file's real corner path + project slug, so Review
          // injects and opens THIS exact file instead of landing on the queue.
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
    loading: { label: 'Gathering your files…' },
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
