// cv6next — Organize, mobile (browse + multi-select, move sheet, file view).
// Structure from design-system-2026-06-24 wired/tools/organize.html
// mounted via TemplateScreen with real data from useOrganize.

import React, { useState, useMemo } from 'react';
import { useOrganize } from './data/useOrganize.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/organize.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases the engine can't derive (tree→node, breadcrumb→crumb, etc.).
const ORG_ALIASES = { tree: 'node', files: 'file', projects: 'project', breadcrumb: 'crumb', destinations: 'dest', filters: 'filter', folders: 'subfolder' };

function composeOrganize(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find((n) => n.getAttribute('data-screen') === screenName);
  if (!screen) return '';
  screen.setAttribute('style', 'position:relative;width:100%;height:100%;background:#05080b;overflow:hidden');
  const ready = screen.querySelector('[data-state="ready"]');
  if (ready) {
    const base = ready.getAttribute('style') || '';
    ready.setAttribute('style', `${base};overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(20px, env(safe-area-inset-bottom, 0px))`);
  }
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => screen.appendChild(b.cloneNode(true)));
  return screen.outerHTML;
}

const MOBILE_HTML = composeOrganize(template, 'organize-mobile');

export default function OrganizeMobile({ onNav, onOpenNav, onAssignFile }) {
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
    assignAgent: (fileId) => onAssignFile?.(fileId),
  };

  return <TemplateScreen html={MOBILE_HTML} data={bindData} actions={handleActions} state={state} aliases={ORG_ALIASES} style={{ width: '100%', height: '100%' }} />;
}
