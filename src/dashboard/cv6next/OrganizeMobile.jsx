// cv6next — Organize, mobile (project picker → browse → read a file).
// Structure from design-system-2026-06-24 wired/tools/organize.html, mounted via
// TemplateScreen with real data from useOrganize. The mobile flow is three of the
// design's organize-mobile frames, switched by local state:
//   PICKER  ("Organize · Projects")  — pick a project (don't force one — O4)
//   BROWSE  ("Organize · Browse")    — its files; tap one to read it (O5/O6 + open)
//   VIEW    ("Organize · View file") — the file open, back to the list
// We finalize each frame to a flex column (header + flex body) so it fills any
// viewport with no magic offsets (kills the black gap — O2), gate the body behind
// data-state="ready" and drop the shared loading/empty/error blocks into the same
// flex slot so they REPLACE the body instead of overlaying it (O1).

import React, { useState, useMemo } from 'react';
import { useOrganize } from './data/useOrganize.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/organize.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases the engine can't derive (tree→node, breadcrumb→crumb, etc.).
const ORG_ALIASES = { tree: 'node', files: 'file', projects: 'project', breadcrumb: 'crumb', destinations: 'dest', filters: 'filter', folders: 'subfolder' };

const SCREEN_BG = '#05080b';

function screenByLabel(doc, label) {
  return [...doc.querySelectorAll('[data-cv6][data-screen]')].find((n) => n.getAttribute('data-screen-label') === label) || null;
}

// Turn a frame into a flex column (header flows, body fills) and drop the shared
// loading / empty / error blocks into the same flex slot as the ready body, so the
// engine shows exactly one at a time — the skeleton replaces the real screen, never
// stacks on top of it.
function finalizeScreen(screen, readyEl) {
  screen.setAttribute('style', `position:relative;display:flex;flex-direction:column;width:100%;height:100%;background:${SCREEN_BG};overflow:hidden`);
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  const anchor = readyEl || screen.lastElementChild;
  let prev = anchor;
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => {
    const clone = b.cloneNode(true);
    clone.setAttribute('style', `${clone.getAttribute('style') || ''};flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;justify-content:center`);
    prev.parentNode.insertBefore(clone, prev.nextSibling);
    prev = clone;
  });
}

// ── PICKER: pick a project (no forced default) ──
function composePicker(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = screenByLabel(doc, 'Organize · Projects');
  if (!screen) return '';
  // Flat file store has no folders — drop the meaningless "· N folders" from each row.
  const pmeta = screen.querySelector('.pmeta');
  if (pmeta) pmeta.innerHTML = '<span data-bind="project.fileCount">0</span> files';
  finalizeScreen(screen, screen.querySelector('[data-state="ready"]'));
  return screen.outerHTML;
}

// ── BROWSE: the project's files; tap a row to read it ──
function composeBrowse(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = screenByLabel(doc, 'Organize · Browse');
  if (!screen) return '';

  // Body: was absolute (top:138px → the ~78px black gap). Make it the flex body.
  const body = screen.querySelector('div[style*="top:138px"]');
  if (body) body.setAttribute('style', 'flex:1;min-height:0;overflow-y:auto;padding:12px 16px 16px;');

  // Resting state must not look like select-mode (O5/O6): drop the bulk action bar
  // and the "Done" select toggle. Bulk move/rename/share/delete are backend-blocked
  // (held-c, P16) so there's no select mode to enter yet — pure browse + read.
  screen.querySelector('div[style*="height:82px"]')?.remove();
  [...screen.querySelectorAll('[data-action="toggleSelectMode"]')].forEach((n) => n.remove());
  // No real subfolders (flat store) — drop the folder prototype row.
  screen.querySelector('.selrow[data-each="folders"]')?.remove();
  // Breadcrumb is redundant with the header (which already shows the project + file
  // count) and its data-each is on the row container, so it stacks one full-width row
  // per crumb ("Corner › Corner ›") instead of sitting inline. Drop it.
  screen.querySelector('[data-each="breadcrumb"]')?.remove();

  // File rows: no checkbox at rest, and a tap opens the file instead of selecting it.
  const fileRow = screen.querySelector('.selrow[data-each="files"]');
  if (fileRow) {
    fileRow.querySelector('.selbox')?.remove();
    fileRow.setAttribute('data-action', 'openFile');
    fileRow.setAttribute('data-arg', 'file.id');
    fileRow.removeAttribute('data-mod'); // no selection state in browse mode
    fileRow.setAttribute('class', 'selrow'); // drop the baked-in is-on so rows aren't pre-highlighted (O6)
    // The ⋮ per-row menu is backend-blocked too; remove so it isn't a dead control.
    fileRow.querySelector('[data-action="openFileMenu"]')?.remove();
  }

  finalizeScreen(screen, body);
  return screen.outerHTML;
}

// ── VIEW: the file open for reading ──
function composeView(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = screenByLabel(doc, 'Organize · View file');
  if (!screen) return '';
  const content = screen.querySelector('div[style*="top:158px"]');
  if (content) content.setAttribute('style', 'flex:1;min-height:0;overflow-y:auto;padding:16px;');
  const footer = screen.querySelector('div[style*="height:78px"]');
  if (footer) footer.setAttribute('style', 'flex:none;border-top:1px solid var(--divider);background:var(--ground);display:flex;align-items:center;gap:10px;padding:0 16px;height:78px;');
  finalizeScreen(screen, content);
  return screen.outerHTML;
}

const PICKER_HTML = composePicker(template);
const BROWSE_HTML = composeBrowse(template);
const VIEW_HTML = composeView(template);

export default function OrganizeMobile({ onNav, onOpenNav, onAssignFile }) {
  const { state, data, selectProject, setFilter, reload } = useOrganize('aom');
  const [projectId, setProjectId] = useState(null); // null = show the picker (no forced project)
  const [pickedFileId, setPickedFileId] = useState(null);

  const enterProject = (id) => { setProjectId(id); setPickedFileId(null); selectProject(id); };
  const backToPicker = () => { setProjectId(null); setPickedFileId(null); };
  const backToBrowse = () => setPickedFileId(null);

  const selectedFile = useMemo(
    () => (data?.files || []).find((f) => f.id === pickedFileId) || null,
    [data?.files, pickedFileId]
  );

  const bindData = {
    ...data,
    files: (data?.files || []),
    folders: [], // HELD-C: subfolder navigation not implemented (flat store)
    viewFile: selectedFile
      ? {
          id: selectedFile.id,
          name: selectedFile.name,
          path: `${data?.folder?.name || 'Project'} · ${selectedFile.name}`,
          title: selectedFile.preview?.title,
          bodyHtml: selectedFile.preview?.bodyHtml,
          editor: 'System',
          editorInitials: 'SY',
          editorTint: 'neutral',
          edited: selectedFile.edited,
          status: selectedFile.status,
          statusLabel: (selectedFile.status || 'ready').toUpperCase(),
        }
      : (data?.viewFile || null),
  };

  // Context-aware back: file view → list, list → picker, picker → home.
  const handleBack = () => {
    if (pickedFileId) backToBrowse();
    else if (projectId) backToPicker();
    else onNav?.('home');
  };

  const actions = {
    nav: (target) => (target === 'back' ? handleBack() : onNav?.(target)),
    openNav: () => onOpenNav?.(),
    openProfile: () => {},
    openCommandK: () => {},
    search: () => {},
    openProject: (id) => enterProject(id),
    openTreeNode: (id) => enterProject(id),
    openCrumb: (id) => (id === 'root' ? backToPicker() : enterProject(id)),
    openFile: (id) => setPickedFileId(id),
    setFilter: (id) => setFilter(id || 'all'),
    openInReview: () => onNav?.('review'),
    assignAgent: (fileId) => onAssignFile?.(fileId || pickedFileId),
    // Held-c (no file-storage backend yet): inert, never faked.
    retry: () => reload?.(),
    openFolder: () => {}, commentFile: () => {}, moveFile: () => {},
    emptyAction: () => {}, viewOffline: () => {},
  };

  const html = pickedFileId ? VIEW_HTML : projectId ? BROWSE_HTML : PICKER_HTML;
  // The picker drives off real projects; once inside a project, honor load state.
  const screenState = projectId ? state : (state === 'loading' || state === 'error' || state === 'empty' ? state : 'ready');

  return <TemplateScreen html={html} data={bindData} actions={actions} state={screenState} aliases={ORG_ALIASES} style={{ width: '100%', height: '100%' }} />;
}
