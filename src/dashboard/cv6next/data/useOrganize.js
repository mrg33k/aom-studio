// cv6next — real Organize data, shaped to the wired/ template contract.
// Phase 1 (corner:corner-ui-cv6): reads the project_files DISK MIRROR
// (/api/dashboard/files?type=mirror), so EVERY file in a project is viewable —
// not just scaffold .md. The list is metadata-only; a file's content is fetched
// lazily on open (cached) so a 7k-file world never ships its whole text at once.

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authFetch } from '../../lib/authFetch';

const TINTS = ['violet', 'accent', 'pink', 'success'];

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

function fileKind(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  if (['md', 'txt', 'json', 'js', 'jsx', 'py'].includes(ext)) return 'doc';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['csv', 'xlsx', 'xls'].includes(ext)) return 'sheet';
  if (ext === 'pdf') return 'pdf';
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
function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/`([^`]+?)`/g, '<code style="font-family:var(--font-mono);font-size:.92em;background:rgba(0,0,0,.05);padding:1px 5px;border-radius:5px;">$1</code>')
    .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2">$1</a>');
}

// Render the WHOLE file as readable HTML so the reader actually lets you read it.
function parseMarkdown(content) {
  if (!content) return { title: '', body: '' };
  const lines = String(content).split('\n');

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

// Honest placeholder for files whose bytes we don't mirror (images, PDFs, sheets).
function nonTextPreview(name, kind) {
  const label = kind === 'image' ? 'image' : kind === 'pdf' ? 'PDF' : kind === 'sheet' ? 'spreadsheet' : 'file';
  return `<p style="margin:0;color:#888;">This is a ${label}. An inline preview isn't available yet — open it in Review to work with it.</p>`;
}

export function useOrganize(worldId = 'aom') {
  const [projects, setProjects] = useState(null);
  const [files, setFiles] = useState(null);        // metadata rows (no content)
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [selectedId, setSelectedId] = useState(null); // which project's files show
  const [filter, setFilter] = useState('all');     // all | docs | images
  const [openedId, setOpenedId] = useState(null);  // which file is open (preview/reader)
  const [contentCache, setContentCache] = useState({}); // id -> { title, bodyHtml, editor, editorInitials }

  const load = useCallback(async () => {
    // The disk mirror is the source of truth: every file in every project,
    // each row carrying project slug + folder path. Metadata only here.
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

    setStatus(gotFiles ? 'loaded' : 'error');
  }, [worldId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Lazy content fetch for one file (cached). Called on open.
  const fetchContent = useCallback(async (id) => {
    if (!id) return;
    setContentCache((cache) => {
      if (cache[id]) return cache; // already cached
      // fire the network fetch outside the setter; mark nothing here
      return cache;
    });
    // Avoid a duplicate fetch: read latest cache via functional check
    let already = false;
    setContentCache((cache) => { already = !!cache[id]; return cache; });
    if (already) return;
    try {
      const res = await authFetch(
        `/api/dashboard/files?type=mirror&client=${encodeURIComponent(worldId)}&id=${encodeURIComponent(id)}&content=1`,
        { credentials: 'include' }
      );
      const d = await res.json();
      const f = d.file;
      if (!f) return;
      const { title, body } = parseMarkdown(f.content || '');
      const bodyHtml = (f.content && body) ? body : nonTextPreview(f.name, f.kind || fileKind(f.name));
      setContentCache((cache) => ({
        ...cache,
        [id]: {
          title: (f.content && title) ? title : (f.name || 'Untitled'),
          bodyHtml,
          editor: f.last_editor || 'System',
          editorInitials: initialsOf(f.last_editor),
        },
      }));
    } catch (err) {
      console.error('Failed to load file content:', err);
    }
  }, [worldId]);

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
    };
  });
  for (const [slug, fs] of groups.entries()) {
    if (slug === 'unfiled' || seenSlugs.has(slug)) continue;
    projectList.push({ id: slug, name: nameBySlug[slug] || prettify(slug), fileCount: fs.length, folderCount: 0, tint: tintFor(slug) });
  }

  const inList = (id) => projectList.some((p) => p.id === id);
  const activeProjectId = (selectedId && inList(selectedId)) ? selectedId : (projectList[0]?.id || null);

  const treeNodes = projectList.map((p) => ({
    id: p.id, name: p.name, depth: 'd0', tint: p.tint,
    chev: p.fileCount ? 'down' : 'none', open: p.id === activeProjectId,
  }));

  const openProject = treeNodes.find((n) => n.id === activeProjectId) || treeNodes[0] || { id: null, name: 'Projects' };

  // Files in the current project (flat for Phase 1 — folders arrive in Phase 2),
  // newest first, narrowed by the active filter.
  const fileMatchesFilter = (kind) => filter === 'all' ? true : (filter === 'images' ? kind === 'image' : kind !== 'image');
  const allFiles = (groups.get(openProject.id) || [])
    .slice()
    .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .map((f) => {
      const fname = f.name || 'Untitled';
      const kind = f.kind || fileKind(fname);
      return {
        id: f.id,
        name: fname,
        edited: relTime(f.updated_at),
        size: formatSize(f.size || 0),
        kind,
        status: 'ready',
      };
    });

  const imageCount = allFiles.filter((f) => f.kind === 'image').length;
  const docCount = allFiles.length - imageCount;
  const fileList = allFiles.filter((f) => fileMatchesFilter(f.kind));

  // The open file: the explicitly-opened one if it's in this project's list, else the first.
  const openInList = fileList.find((f) => f.id === openedId) || fileList[0] || null;
  const cached = openInList ? contentCache[openInList.id] : null;
  const previewObj = openInList
    ? {
        fileName: openInList.name,
        title: cached?.title || openInList.name,
        bodyHtml: cached?.bodyHtml || '<p style="color:#888;">Loading…</p>',
      }
    : { fileName: '', title: '', bodyHtml: '<p>No file selected</p>' };

  const data = {
    tree: treeNodes,
    folder: { name: openProject.name, fileCount: fileList.length, folderCount: 0 },
    files: fileList,
    projects: projectList,
    breadcrumb: [{ id: 'root', name: 'Corner' }, openProject].filter((x) => x.id),
    filters: [
      { id: 'all', label: `All ${allFiles.length}`, active: filter === 'all' ? 'on' : 'off' },
      { id: 'docs', label: `Docs ${docCount}`, active: filter === 'docs' ? 'on' : 'off' },
      { id: 'images', label: `Images ${imageCount}`, active: filter === 'images' ? 'on' : 'off' },
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
  }, [activeProjectId, fileList.length]);

  let state = 'ready';
  if (status === 'loading' && !files) state = 'loading';
  else if (status === 'error') state = 'error';
  else if (!projectList.length) state = 'empty';

  const selectProject = useCallback((id) => { setSelectedId(id); setFilter('all'); setOpenedId(null); }, []);

  return { state, data, reload: load, selectProject, setFilter, openFile, activeProjectId };
}
