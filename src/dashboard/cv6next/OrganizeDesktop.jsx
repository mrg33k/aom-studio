// cv6next — Organize, desktop (tree → files → preview).
// Structure from design-system-2026-06-24 wired/tools/organize.html, mounted via
// TemplateScreen with real data from useOrganize. We extract the organize-desktop
// screen node from the design fragment, inject the shared loading/error/empty states,
// and bind real data + actions behind it (no redraw).

import { useState, useMemo } from 'react';
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

export default function OrganizeDesktop({ onNav, onOpenNav }) {
  const { state, data } = useOrganize('aom');
  const [pickedId, setPickedId] = useState(null);

  // The full real data shape from useOrganize, with the picked file's preview swapped in.
  const bindData = useMemo(() => {
    if (!pickedId) return data;
    const f = (data.files || []).find((x) => x.id === pickedId);
    if (!f) return data;
    return {
      ...data,
      preview: f.preview,
      viewFile: { ...(data.viewFile || {}), id: f.id, name: f.name, title: f.preview?.title, bodyHtml: f.preview?.bodyHtml, edited: f.edited },
    };
  }, [data, pickedId]);

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => {},
    openProfile: () => {},
    search: () => {},
    openFile: (id) => setPickedId(id),
    openTreeNode: () => {},
    openProject: () => setPickedId(null),
    openFolder: () => {},
    openCrumb: () => {},
    openFileMenu: () => {},
    openJob: () => {},
    setFilter: () => {},
    toggleSelect: () => {},
    toggleSelectMode: () => {},
    openInReview: () => onNav?.('review'),
    // Held-c (the file store is flat — no folder tree): inert, never faked.
    addFile: () => {}, newFolder: () => {}, newProject: () => {}, commentFile: () => {},
    moveFile: () => {}, moveSelection: () => {}, confirmMove: () => {}, cancelMove: () => {},
    pickDestination: () => {}, deleteSelection: () => {}, renameSelection: () => {}, shareSelection: () => {},
  };

  return <TemplateScreen html={DESKTOP_HTML} data={bindData} actions={actions} state={state} aliases={ORG_ALIASES} />;
}
