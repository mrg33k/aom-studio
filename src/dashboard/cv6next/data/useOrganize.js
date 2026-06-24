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

function parseMarkdown(content) {
  if (!content) return { title: '', body: '' };
  const lines = (content || '').split('\n');
  let title = '';
  let bodyStart = 0;

  // Extract title from # heading
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].startsWith('# ')) {
      title = lines[i].replace(/^#+\s+/, '').trim();
      bodyStart = i + 1;
      break;
    }
  }

  // Collect body (first ~3 paragraphs)
  const bodyLines = [];
  for (let i = bodyStart; i < lines.length && bodyLines.length < 5; i++) {
    const line = lines[i].trim();
    if (line && !line.startsWith('#')) bodyLines.push(line);
  }
  const body = bodyLines.join('\n').slice(0, 300);

  // Simple HTML: paragraphs + link wrapping
  const html = body
    .split('\n\n')
    .map((p) => {
      if (!p.trim()) return '';
      const linked = p.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
      return `<p style="margin:0 0 14px;">${linked}</p>`;
    })
    .join('');

  return { title: title || 'Untitled', body: html };
}

export function useOrganize(worldId = 'aom') {
  const [projects, setProjects] = useState(null);
  const [files, setFiles] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | loaded | error

  const load = useCallback(async () => {
    let ok = false;
    try {
      // Fetch projects
      const projRes = await authFetch('/api/dashboard/projects', { credentials: 'include' });
      const projData = await projRes.json();
      if (projData.ok && Array.isArray(projData.projects)) {
        setProjects(projData.projects);
        ok = true;
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }

    try {
      // Fetch text files (global or filtered by project)
      const filesRes = await authFetch('/api/dashboard/text-files', { credentials: 'include' });
      const filesData = await filesRes.json();
      if (filesData.ok && Array.isArray(filesData.files)) {
        setFiles(filesData.files);
        ok = ok || true;
      }
    } catch (err) {
      console.error('Failed to load files:', err);
    }

    setStatus(ok && projects && files ? 'loaded' : (projects || files ? 'loaded' : 'error'));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // ── shape to the template contract ──

  const projectList = (projects || []).map((p) => ({
    id: p.id,
    name: p.name || p.slug,
    fileCount: files?.filter((f) => f.project_id === p.id).length || 0,
    folderCount: 0, // HELD-C: file store is flat
    tint: tintFor(p.slug),
  }));

  // Desktop tree: flattened with depth
  const treeNodes = projectList.map((p, idx) => ({
    id: p.id,
    name: p.name,
    depth: 'd0',
    tint: p.tint,
    chev: files?.some((f) => f.project_id === p.id) ? 'down' : 'none',
    open: idx === 0, // first project open by default
  }));

  // Current open project (first by default)
  const openProject = treeNodes[0] || { id: null, name: 'Projects' };

  // Files in the current project
  const fileList = (files || [])
    .filter((f) => f.project_id === openProject.id)
    .map((f) => {
      const { title, body } = parseMarkdown(f.content || '');
      return {
        id: f.id,
        name: f.name || 'Untitled',
        edited: relTime(f.updated_at || f.created_at),
        size: formatSize(f.content?.length || 0),
        kind: fileKind(f.name),
        preview: { fileName: f.name, title, bodyHtml: body },
        status: 'ready', // default status
      };
    });

  // Desktop preview (first file by default)
  const previewFile = fileList[0] || null;

  const data = {
    tree: treeNodes,
    folder: { name: openProject.name, fileCount: fileList.length, folderCount: 0 },
    files: fileList,
    projects: projectList,
    breadcrumb: [{ id: 'root', name: 'Corner' }, openProject].filter((x) => x.id),
    filters: [
      { id: 'all', label: `All ${fileList.length}`, active: true },
      { id: 'docs', label: 'Docs', active: false },
      { id: 'images', label: 'Images', active: false },
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
  if (status === 'loading' && !projects && !files) state = 'loading';
  else if (status === 'error') state = 'error';
  else if (!projectList.length) state = 'empty';

  return { state, data, reload: load };
}
