// cv6next — Organize, mobile (browse + multi-select, move sheet, file view).
// Structure from design-system-2026-06-24 wired/tools/organize.html
// mounted via TemplateScreen with real data from useOrganize.

import React, { useState, useMemo } from 'react';
import { useOrganize } from './data/useOrganize.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/organize.html?raw';

export default function OrganizeMobile({ onNav, onOpenNav }) {
  const { state, data } = useOrganize('aom');
  const [pickedFile, setPickedFile] = useState(null);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const selectedFile = useMemo(() => pickedFile || data?.files?.[0] || null, [pickedFile, data?.files]);

  // Bind template data
  const bindData = {
    tree: data?.tree || [],
    folder: data?.folder || { name: 'Projects', fileCount: 0, folderCount: 0 },
    files: (data?.files || []).map((f) => ({
      ...f,
      selected: selectedFileIds.includes(f.id),
    })),
    folders: [], // HELD-C: subfolder navigation not implemented
    projects: data?.projects || [],
    breadcrumb: data?.breadcrumb || [],
    filters: data?.filters || [],
    preview: selectedFile?.preview || data?.preview || {},
    viewFile: selectedFile
      ? {
          id: selectedFile.id,
          name: selectedFile.name,
          path: `${data?.folder?.name || 'Projects'} · ${selectedFile.name}`,
          title: selectedFile.preview.title,
          bodyHtml: selectedFile.preview.bodyHtml,
          editor: 'System',
          editorInitials: 'SY',
          editorTint: 'neutral',
          edited: selectedFile.edited,
          status: selectedFile.status,
          statusLabel: selectedFile.status.toUpperCase(),
        }
      : null,
    selection: { count: selectedFileIds.length },
    activeJob: data?.activeJob || null,
    moving: data?.moving || null,
    destinations: data?.destinations || [],
    movePick: data?.movePick || { name: '' },
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

  const handleNav = (target) => {
    if (target === 'back') onNav?.('home');
    else onNav?.(target);
  };

  const handleOpenFile = (fileId) => {
    const f = data?.files?.find((x) => x.id === fileId);
    setPickedFile(f);
  };

  const handleToggleSelect = (fileId) => {
    setSelectedFileIds((ids) =>
      ids.includes(fileId) ? ids.filter((x) => x !== fileId) : [...ids, fileId]
    );
  };

  const handleActions = {
    nav: (target) => handleNav(target),
    openCommandK: () => console.log('command-k'),
    openProfile: () => console.log('profile'),
    openTreeNode: (nodeId) => console.log('tree node:', nodeId),
    openFile: (fileId) => handleOpenFile(fileId),
    openCrumb: (crumbId) => console.log('crumb:', crumbId),
    setFilter: (filterId) => console.log('filter:', filterId),
    toggleSelectMode: () => console.log('toggle select mode'),
    openFolder: (folderId) => console.log('open folder:', folderId),
    toggleSelect: (fileId) => handleToggleSelect(fileId),
    openFileMenu: (fileId) => console.log('file menu:', fileId),
    moveSelection: () => console.log('move selection'),
    renameSelection: () => console.log('rename selection'),
    shareSelection: () => console.log('share selection'),
    deleteSelection: () => console.log('delete selection'),
    search: () => console.log('search'),
    openNav: () => onOpenNav?.(),
    openJob: (jobId) => console.log('job:', jobId),
  };

  return (
    <TemplateScreen
      state={state}
      data={bindData}
      template={template}
      screen="organize-mobile"
      onAction={handleActions}
      fallback={<div style={{ padding: 24, color: 'var(--muted)' }}>Loading Organize…</div>}
    />
  );
}
