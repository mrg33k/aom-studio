// cv6next — Organize, desktop (tree → files → preview).
// Structure from design-system-2026-06-24 wired/tools/organize.html, mounted via
// TemplateScreen with real data from useOrganize. We extract the organize-desktop
// screen node from the design fragment, inject the shared loading/error/empty states,
// and bind real data + actions behind it (no redraw).

import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useOrganize } from './data/useOrganize.js';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import { useTreeContextMenu, renameNode, moveNode, createNode, archiveNode, findMissionNode } from './TreeContextMenu.jsx';
import NewComposer from './NewComposer.jsx';
import { authFetch } from '../lib/authFetch';
import template from './templates/organize.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases the engine can't derive (tree→node, breadcrumb→crumb,
// destinations→dest, folders→subfolder); the singularizable ones are kept explicit too.
const ORG_ALIASES = { tree: 'node', files: 'file', projects: 'project', breadcrumb: 'crumb', destinations: 'dest', filters: 'filter', folders: 'subfolder', missions: 'mission', sorts: 'sort' };

function composeOrganize(raw, screenName) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = [...doc.querySelectorAll('[data-cv6][data-screen]')].find((n) => n.getAttribute('data-screen') === screenName);
  if (!screen) return '';
  // The shared desktop nav is mounted once by the shell, so drop this screen's baked-in
  // top bar (otherwise the page shows two stacked nav rows).
  screen.querySelector('.topbar')?.remove();
  screen.setAttribute('style', 'width:100%;height:100%');
  // The design's desktop tree column ships without a create affordance — add the same
  // dashed "New project" button the mobile picker has (opens the shared NewComposer flow).
  const treeCol = screen.querySelector('div[style*="width:280px"]');
  if (treeCol) {
    treeCol.insertAdjacentHTML('beforeend', '<button data-action="newProject" style="flex:none;margin-top:12px;width:100%;height:40px;border-radius:11px;border:1px dashed var(--hair);background:transparent;color:var(--accent);font-size:12.5px;font-weight:600;font-family:var(--font-sans);display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New project</button>');
  }
  const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
  sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => screen.appendChild(b.cloneNode(true)));
  return screen.outerHTML;
}

const DESKTOP_HTML = composeOrganize(template, 'organize-desktop');

export default function OrganizeDesktop({ onNav, onOpenNav, onAssignFile }) {
  const worldId = 'aom';
  const { state, data, reload, selectProject, selectMission, setFilter, setQuery, setSort, openFile, activeProjectId, projects, missionTree } = useOrganize(worldId);
  // "New project" (tree column footer) -> the shared NewComposer overlay (same flow as
  // Home's "New"), opened on the project tab. On create, reload with bust so it shows now.
  const [showNew, setShowNew] = useState(false);

  // The search input is an uncontrolled kept DOM node (see template); the engine only
  // wires clicks, so the input event is delegated from this React wrapper. Debounced a
  // beat so each keystroke doesn't force a full template rebind mid-word.
  const wrapRef = useRef(null);
  const debRef = useRef(null);
  const onSearchInput = (e) => {
    const el = e.target;
    if (!el?.matches?.('[data-org-search]')) return;
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setQuery(el.value), 120);
  };
  // Hook resets the query when the project changes; mirror that in the DOM node.
  useEffect(() => {
    const el = wrapRef.current?.querySelector('[data-org-search]');
    if (el) el.value = '';
  }, [activeProjectId]);
  // Switching project resets the open file inside the hook (auto-opens the new
  // project's first file), so the preview always follows the selected project.
  const switchProject = (id) => { selectProject(id); };

  // ── R-TREE-MENU: right-click / long-press on tree rows → Rename / Move ──
  // Tree row ids (stamped as data-cv6-arg by the engine): a bare slug is a
  // project, a colon-joined path is a mission of that project.
  const projectName = useCallback((slug) => {
    const p = (projects || []).find((x) => x.slug === slug);
    return p?.name || slug;
  }, [projects]);
  const resolveHit = useCallback((rowEl) => {
    if (!rowEl.classList.contains('trow')) return null;
    const id = rowEl.getAttribute('data-cv6-arg') || '';
    if (!id || id === '__all') return null;
    if (!id.includes(':')) {
      return { kind: 'project', projectSlug: id, name: projectName(id) };
    }
    const projectSlug = id.slice(0, id.indexOf(':'));
    const found = findMissionNode(missionTree?.[projectSlug], id, id.slice(id.lastIndexOf(':') + 1));
    const node = found?.node;
    const path = node?.path || null;
    return {
      kind: 'mission',
      projectSlug,
      missionSlug: node?.folder_name || String(node?.slug || id).split(':').pop(),
      name: node?.name || id.split(':').pop(),
      path,
      // Platform missions (corner/missions/...) have no per-project home to
      // move between; user-project missions do. No path = record-only, movable.
      canMove: !path || path.startsWith('corner/users/'),
    };
  }, [missionTree, projectName]);
  // O3 (census): a project/mission rename lands in the projects table and in
  // Organize's own tree (reload bust), but the chat sidebar room list and the
  // composer's project picker read a DIFFERENT pipe (useDataPipe → useHome), which
  // only refetches on a 60s poll or a `projects` realtime event that isn't reliably
  // published. Fire a same-tab signal so that pipe refetches NOW — the new name shows
  // on all three surfaces without a manual reload. Harmless if realtime also fires
  // (fetchAll is idempotent + signature-deduped). Every structural mutation
  // (rename/move/create/archive) touches the registry those surfaces render, so all
  // four broadcast.
  const broadcastRegistryChange = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent('cv6:data-refresh')); } catch { /* SSR / no window — non-fatal */ }
  }, []);
  const { overlay: ctxOverlay } = useTreeContextMenu({
    wrapRef,
    resolveHit,
    listProjects: () => (projects || []).map((p) => ({ slug: p.slug, name: p.name })),
    onRename: async (target, name) => { await renameNode(authFetch, target, name, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
    onMove: async (target, dest) => { await moveNode(authFetch, target, dest, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
    onCreate: async (target, name) => { await createNode(authFetch, target, name, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
    onArchive: async (target) => { await archiveNode(authFetch, target, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
  });

  // Mark the open row from the hook's openedId so the highlighted row and the
  // preview never disagree. Content/preview/viewFile already come from the hook.
  const bindData = useMemo(() => {
    const effectiveId = data.openedId;
    const files = (data.files || []).map((x) => ({ ...x, picked: x.id === effectiveId ? 'open' : 'closed' }));
    return { ...data, files };
  }, [data]);

  // O3-adjacent census closure: the default-active sort ("Newest") and filter
  // ("Recent") chips are ALREADY selected — re-clicking them is a no-op by design,
  // not a dead control. Stamp the active chip with aria-current + cursor:default so it
  // reads (and audits) as intentional. TemplateScreen wipes the DOM (innerHTML) on
  // every realtime tick and the page remounts under heavy agent churn, so a one-shot
  // effect can leave a transient window with no aria-current — enough for an audit to
  // catch the chip "bare". A MutationObserver re-applies it on any class/child change
  // so the marker is effectively always present.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const sync = () => {
      wrap.querySelectorAll('[data-action="setSort"],[data-action="setFilter"]').forEach((btn) => {
        const on = btn.classList.contains('is-on');
        const has = btn.getAttribute('aria-current') === 'true';
        if (on && !has) { btn.setAttribute('aria-current', 'true'); btn.style.cursor = 'default'; }
        else if (!on && has) { btn.removeAttribute('aria-current'); btn.style.cursor = ''; }
      });
    };
    sync();
    // Observe only class + childList (NOT aria-current) so our own writes don't re-fire.
    const obs = new MutationObserver(sync);
    obs.observe(wrap, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [bindData]);

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => {},
    openProfile: () => {},
    search: () => {},
    openFile: (id) => openFile(id),
    // Mission nodes arrive as "project:mission-slug" (nested missions carry more
    // segments). Select the parent project AND narrow the file list to that mission —
    // candidates run leaf-first so the deepest matching mission folder wins.
    openTreeNode: (id) => {
      const s = String(id || '');
      if (!s.includes(':')) return switchProject(s);
      const segs = s.split(':').filter(Boolean);
      switchProject(segs[0]);
      selectMission(segs.slice(1).reverse());
    },
    setMission: (id) => selectMission(id || '__all'),
    setSort: (id) => setSort(id === 'az' ? 'az' : 'newest'),
    openProject: (id) => switchProject(id),
    openFolder: (id) => switchProject(id),
    openCrumb: (id) => (id === 'root' ? switchProject(null) : switchProject(id)),
    openFileMenu: () => {},
    openJob: () => {},
    setFilter: (id) => setFilter(id || 'recent'),
    toggleSelect: () => {},
    toggleSelectMode: () => {},
    openInReview: () => {
      const rf = data.viewFile?.reviewFile;
      onNav?.('review', rf ? { files: [rf], project: data.viewFile.projectSlug || '' } : null);
    },
    assignAgent: (fileId) => onAssignFile?.(fileId),
    newProject: () => setShowNew(true),
    // Held-c (the file store is flat — no folder tree): inert, never faked.
    addFile: () => {}, newFolder: () => {}, commentFile: () => {},
    moveFile: () => {}, moveSelection: () => {}, confirmMove: () => {}, cancelMove: () => {},
    pickDestination: () => {}, deleteSelection: () => {}, renameSelection: () => {}, shareSelection: () => {},
  };

  return (
    <div ref={wrapRef} onInput={onSearchInput} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={DESKTOP_HTML} data={bindData} actions={actions} state={state} aliases={ORG_ALIASES} style={{ width: '100%', height: '100%' }} />
      {ctxOverlay}
      {showNew ? (
        <NewComposer worldId={worldId} projects={projects || []} agents={[]} initialMode="project"
          onClose={() => setShowNew(false)} onCreated={() => reload({ bust: true })} />
      ) : null}
    </div>
  );
}
