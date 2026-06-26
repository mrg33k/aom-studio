// cv6next — Organize, desktop (tree → files → preview).
// Structure from design-system-2026-06-24 wired/tools/organize.html, mounted via
// TemplateScreen with real data from useOrganize. We extract the organize-desktop
// screen node from the design fragment, inject the shared loading/error/empty states,
// and bind real data + actions behind it (no redraw).

import { useMemo } from 'react';
import { useOrganize } from './data/useOrganize.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import template from './templates/organize.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases the engine can't derive (tree→node, breadcrumb→crumb,
// destinations→dest, folders→subfolder); the singularizable ones are kept explicit too.
const ORG_ALIASES = { tree: 'node', files: 'file', projects: 'project', breadcrumb: 'crumb', destinations: 'dest', filters: 'filter', folders: 'subfolder' };

function composeOrganize(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find((n) => n.getAttribute('data-screen') === screenName);
  if (!screen) return '';
  // The shared desktop nav is mounted once by the shell, so drop this screen's baked-in
  // top bar (otherwise the page shows two stacked nav rows).
  screen.querySelector('.topbar')?.remove();
  screen.setAttribute('style', 'width:100%;height:100%');
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => screen.appendChild(b.cloneNode(true)));
  return screen.outerHTML;
}

const DESKTOP_HTML = composeOrganize(template, 'organize-desktop');

export default function OrganizeDesktop({ onNav, onOpenNav, onAssignFile }) {
  const { state, data, selectProject, setFilter, openFile } = useOrganize('aom');
  // Switching project resets the open file inside the hook (auto-opens the new
  // project's first file), so the preview always follows the selected project.
  const switchProject = (id) => { selectProject(id); };

  // Mark the open row from the hook's openedId so the highlighted row and the
  // preview never disagree. Content/preview/viewFile already come from the hook.
  const bindData = useMemo(() => {
    const effectiveId = data.openedId;
    const files = (data.files || []).map((x) => ({ ...x, picked: x.id === effectiveId ? 'open' : 'closed' }));
    return { ...data, files };
  }, [data]);

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => {},
    openProfile: () => {},
    search: () => {},
    openFile: (id) => openFile(id),
    openTreeNode: (id) => switchProject(id),
    openProject: (id) => switchProject(id),
    openFolder: (id) => switchProject(id),
    openCrumb: (id) => (id === 'root' ? switchProject(null) : switchProject(id)),
    openFileMenu: () => {},
    openJob: () => {},
    setFilter: (id) => setFilter(id || 'all'),
    toggleSelect: () => {},
    toggleSelectMode: () => {},
    openInReview: () => onNav?.('review'),
    assignAgent: (fileId) => onAssignFile?.(fileId),
    // Held-c (the file store is flat — no folder tree): inert, never faked.
    addFile: () => {}, newFolder: () => {}, newProject: () => {}, commentFile: () => {},
    moveFile: () => {}, moveSelection: () => {}, confirmMove: () => {}, cancelMove: () => {},
    pickDestination: () => {}, deleteSelection: () => {}, renameSelection: () => {}, shareSelection: () => {},
  };

  return <TemplateScreen html={DESKTOP_HTML} data={bindData} actions={actions} state={state} aliases={ORG_ALIASES} style={{ width: '100%', height: '100%' }} />;
}
