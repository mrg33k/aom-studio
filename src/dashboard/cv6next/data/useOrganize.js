// cv6next — real Organize data, shaped to the wired/ template contract.
// Loads projects + text_files from Supabase; renders the file tree + preview.
// This is WIRING: real data, honest loading/empty/error states.

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

// Render the WHOLE file as readable HTML (headings, paragraphs, bullet lists, inline
// emphasis/links) so the reader actually lets you read the file — not a 300-char teaser.
function parseMarkdown(content) {
  if (!content) return { title: '', body: '' };
  const lines = String(content).split('\n');

  // Title = first top-level "# " heading; pull it out of the body.
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

export function useOrganize(worldId = 'aom') {
  const [projects, setProjects] = useState(null);
  const [files, setFiles] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error
  const [selectedId, setSelectedId] = useState(null); // which project's files show (null = first)
  const [filter, setFilter] = useState('all'); // all | docs | images

  const load = useCallback(async () => {
    // Files are the source of truth (proven endpoint). Each row carries
    // client_id = the project slug it belongs to, so we can build the
    // project tree from the files alone. Projects are a secondary lookup
    // purely to upgrade slugs to nicer display names.
    let gotFiles = false;
    try {
      const filesRes = await authFetch(
        `/api/dashboard/files?type=text&client=${encodeURIComponent(worldId)}`,
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

  // ── shape to the template contract ──
  // Files carry client_id = their project slug. Group by it to build the tree;
  // the projects list (by slug) only upgrades the display name.

  const nameBySlug = {};
  (projects || []).forEach((p) => { if (p.slug) nameBySlug[p.slug] = p.name || p.slug; });

  const prettify = (slug) =>
    String(slug || 'Untitled').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Group files by their owning project slug, preserving first-seen order.
  const groups = new Map();
  (files || []).forEach((f) => {
    const slug = f.client_id || 'unfiled';
    if (!groups.has(slug)) groups.set(slug, []);
    groups.get(slug).push(f);
  });

  const projectList = [...groups.entries()].map(([slug, fs]) => ({
    id: slug,
    name: nameBySlug[slug] || prettify(slug),
    fileCount: fs.length,
    folderCount: 0, // HELD-C: file store is flat
    tint: tintFor(slug),
  }));

  // The selected project (the one whose files show). Falls back to the first
  // when nothing is picked yet, or when the picked one is gone after a reload.
  const activeProjectId = (selectedId && groups.has(selectedId)) ? selectedId : (projectList[0]?.id || null);

  // Desktop tree: flattened with depth. `open` marks the SELECTED project so the
  // tree highlights the one whose files are showing (was hardcoded to the first).
  const treeNodes = projectList.map((p) => ({
    id: p.id,
    name: p.name,
    depth: 'd0',
    tint: p.tint,
    chev: p.fileCount ? 'down' : 'none',
    open: p.id === activeProjectId,
  }));

  // Current open project = the selected one.
  const openProject = treeNodes.find((n) => n.id === activeProjectId) || treeNodes[0] || { id: null, name: 'Projects' };

  // Files in the current project, narrowed by the active filter (all / docs / images).
  const fileMatchesFilter = (kind) => filter === 'all' ? true : (filter === 'images' ? kind === 'image' : kind !== 'image');
  const allFiles = (groups.get(openProject.id) || []).map((f) => {
    const fname = f.filename || f.name || 'Untitled';
    const { title, body } = parseMarkdown(f.content || '');
    return {
      id: f.id,
      name: fname,
      edited: relTime(f.updated_at || f.created_at),
      size: formatSize(f.content?.length || 0),
      kind: fileKind(fname),
      preview: { fileName: fname, title, bodyHtml: body },
      status: 'ready', // default status
    };
  });

  // Narrow by the active filter; keep the unfiltered set for the All count.
  const imageCount = allFiles.filter((f) => f.kind === 'image').length;
  const docCount = allFiles.length - imageCount;
  const fileList = allFiles.filter((f) => fileMatchesFilter(f.kind));

  // Desktop preview (first file by default)
  const previewFile = fileList[0] || null;

  const data = {
    tree: treeNodes,
    folder: { name: openProject.name, fileCount: fileList.length, folderCount: 0 },
    files: fileList,
    projects: projectList,
    breadcrumb: [{ id: 'root', name: 'Corner' }, openProject].filter((x) => x.id),
    // active = 'on'|'off' so the template's data-mod="is-:filter.active" yields the
    // design's .ochip.is-on highlight (a boolean would render the unknown class is-true).
    filters: [
      { id: 'all', label: `All ${allFiles.length}`, active: filter === 'all' ? 'on' : 'off' },
      { id: 'docs', label: `Docs ${docCount}`, active: filter === 'docs' ? 'on' : 'off' },
      { id: 'images', label: `Images ${imageCount}`, active: filter === 'images' ? 'on' : 'off' },
    ],
    preview: previewFile?.preview || { fileName: '', title: '', bodyHtml: '<p>No file selected</p>' },
    viewFile: previewFile
      ? {
          id: previewFile.id,
          name: previewFile.name,
          path: `${openProject.name} · ${previewFile.name}`,
          title: previewFile.preview.title,
          bodyHtml: previewFile.preview.bodyHtml,
          editor: 'System',
          editorInitials: 'SY',
          editorTint: 'neutral',
          edited: previewFile.edited,
          status: previewFile.status,
          statusLabel: previewFile.status.toUpperCase(),
        }
      : null,
    selection: { count: 0 },
    activeJob: null, // no background jobs in this mode
    moving: null,
    destinations: [], // HELD-C: folder tree not implemented
    movePick: { name: '' },

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

  let state = 'ready';
  if (status === 'loading' && !files) state = 'loading';
  else if (status === 'error') state = 'error';
  else if (!projectList.length) state = 'empty';

  // Switching projects clears any active filter so the new project opens on "All".
  const selectProject = useCallback((id) => { setSelectedId(id); setFilter('all'); }, []);

  return { state, data, reload: load, selectProject, setFilter, activeProjectId };
}
