// cv6next — Files, desktop (tree → files → review viewer + verdict rail).
// The Organize browser with the Review tool REHOMED inside it (corner:one-corner
// files-tool merge, spec: corner/missions/one-corner/design/files-tool-spec.md):
// useOrganize stays the browser's data source; useReview mounts HERE for exactly
// two jobs — the needs-review waiting set and the verdicts/viewer on the open
// file. The verdict machinery (approve fill / destructive dismiss + 10s Undo /
// request-changes→task / pins / j-k-a / optimistic removal) is the shipped R15b
// build, mounted — never rebuilt.

import { useMemo, useRef, useEffect, useCallback, useState } from 'react';
import { useOrganize } from './data/useOrganize.js';
import { useReview } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { useReviewPinUI } from './ReviewPins.jsx';
import { useDocZoom } from './useDocZoom.jsx';
import { usePdfDocs } from './data/pdfDocView.js';
import { useDocxDocs } from './data/docxDocView.js';
import { useHtmlDocs } from './data/htmlDocView.js';
import { ReviewChangesOverlay, compileChanges } from './ReviewChanges.jsx';
import TemplateScreen from '../cv6kit/TemplateScreen.jsx';
import { cornerLogoLoaderMarkup } from '../cv6kit/cornerLogoLoaderMarkup.js';
import { useTreeContextMenu, renameNode, moveNode, createNode, archiveNode, findMissionNode } from './TreeContextMenu.jsx';
import { resolveFilesTarget, filesTargetKey } from './data/reviewTargetResolve.js';
import NewComposer from './NewComposer.jsx';
import { authFetch } from '../lib/authFetch';
import { useWorldId } from '../lib/tenantContext.jsx';
import { buildFileRefIdentityMap } from '../../../api/_lib/fileRef.js';
import template from './templates/organize.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases the engine can't derive (tree→node, breadcrumb→crumb,
// destinations→dest, folders→subfolder); the singularizable ones are kept explicit too.
const ORG_ALIASES = {
  tree: 'node', files: 'file', projects: 'project', breadcrumb: 'crumb',
  destinations: 'dest', filters: 'filter', folders: 'subfolder', missions: 'mission',
  sorts: 'sort', 'deliverable.pins': 'pin', 'deliverable.comments': 'comment',
};

// Loading placeholder for the review viewer body while a file's bytes are in flight.
const VIEWER_LOADING_HTML = cornerLogoLoaderMarkup('Preparing the file', { minHeight: 220 });
const VIEWER_NONE_HTML = '<div style="padding:14px 0;color:#888;font-size:13.5px;">No file selected — pick one from the list.</div>';

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

// Build the identity → waiting-item map. A queue item joins by its own id (upload
// URLs match upload rows directly) AND by the corner path derived from its
// source_path (agent hand-offs carry absolute store URLs, but their disk mirror
// row keys by corner/users/... — the source_path bridges the two).
export function buildWaitingMap(itemsAll) {
  return buildFileRefIdentityMap(itemsAll, (it) => ({ id: it.id, ts: it.ts || '' }));
}

// Same dual-key mapping for decided items (?view=all rows carrying verdict +
// decision_id). Newest-first + first-wins: the NEWEST decision on a disk file is
// the authoritative badge (a re-share dismissed today beats last week's approve).
export function buildDecidedMap(decidedRaw) {
  return buildFileRefIdentityMap(decidedRaw, (it) => ({ verdict: it.verdict, decisionId: it.decision_id || '', itemId: it.path }));
}

export default function OrganizeDesktop({ onNav, onOpenNav, onSearch, onAssignFile, target }) {
  const worldId = useWorldId();

  // ── review machinery (the rehomed Review tool) ──
  const review = useReview(worldId);
  const itemsAll = review.data.queue.itemsAll || [];
  const reviewWaiting = useMemo(() => buildWaitingMap(itemsAll), [itemsAll]);
  const reviewTotal = review.data.queue.waitingTotal || 0;

  // Reviewed toggle: decided files (?view=all) fetched once on first flip.
  const [reviewedOn, setReviewedOn] = useState(false);
  const [decidedRaw, setDecidedRaw] = useState(null);
  useEffect(() => {
    if (!reviewedOn || decidedRaw) return undefined;
    let dead = false;
    (async () => {
      try {
        const r = await authFetch(`/api/dashboard/review-queue?world=${encodeURIComponent(worldId)}&view=all&limit=500`);
        if (r?.ok) {
          const d = await r.json();
          if (!dead) setDecidedRaw((d.items || []).filter((i) => i.verdict));
        }
      } catch { /* toggle stays on; badges simply don't render */ }
    })();
    return () => { dead = true; };
  }, [reviewedOn, decidedRaw, worldId]);
  const reviewDecided = useMemo(() => (reviewedOn ? buildDecidedMap(decidedRaw) : null), [reviewedOn, decidedRaw]);

  const { state, data, reload, selectProject, selectMission, setFilter, setQuery, setSort, openFile, activeProjectId, projects, missionTree } =
    useOrganize(worldId, { reviewWaiting, reviewTotal, reviewDecided, reviewedOn, reviewItems: itemsAll });

  // "New project" (tree column footer) -> the shared NewComposer overlay.
  const [showNew, setShowNew] = useState(false);

  // ── open file → review viewer (the detail pane IS review now) ──
  const openedRow = useMemo(() => (data.files || []).find((f) => f.id === data.openedId) || null, [data.files, data.openedId]);
  // A chat/shared target can live outside the mirrored Files tree. It still opens
  // through useReview.openFileItem, but there is no `openedRow` to supply the pin
  // key. Fall back to the live deliverable identity so comments persist on those
  // previews too instead of silently submitting against a null deliverable.
  const openReviewId = openedRow?.reviewId || review.data.deliverable?.id || null;
  const reviewActionsRef = useRef(review.actions);
  reviewActionsRef.current = review.actions;
  useEffect(() => {
    if (!openReviewId || !openedRow) return;
    reviewActionsRef.current.openFileItem({
      id: openReviewId,
      name: openedRow.name,
      project: activeProjectId === '__personal' ? '' : (activeProjectId || ''),
      mime: openedRow.mime || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReviewId]);

  // Pins ride the review identity (same store the Review tool used — history intact).
  const { pins, addPin, deletePin } = usePins(openReviewId, worldId);
  const wrapRef = useRef(null);
  const { overlay: pinOverlay, openPinById, circleMode, circleToggle } = useReviewPinUI({ wrapRef, pins, addPin, deletePin });
  // Zoom on desktop (Patrik 2026-08-07). Trackpad pinch arrives as ctrlKey+wheel and
  // is treated as a real pinch; the −/%/+ cluster and the + - 0 keys cover a mouse,
  // which has no pinch at all.
  const { zoomControls, anchor: toolAnchor } = useDocZoom({ wrapRef, drawing: circleMode });
  usePdfDocs(wrapRef); // hydrate [data-pdf-doc] shells (the M7 PDF reader)
  useDocxDocs(wrapRef); // hydrate [data-docx-doc] shells (the M9 Word reader)
  useHtmlDocs(wrapRef); // hydrate sandboxed HTML/web-page shells

  // Changes overlay (typed notes + pins → tracked task via the assign path).
  const [changesOpen, setChangesOpen] = useState(false);
  useEffect(() => { setChangesOpen(false); }, [openReviewId]);
  const assignExtra = useCallback((extraNotes = '') => ({
    artifactTitle: openedRow?.name || String(openReviewId || '').split('/').pop() || '',
    project: activeProjectId === '__personal' ? '' : (activeProjectId || ''),
    details: (() => {
      const compiled = compileChanges(pins, extraNotes);
      return compiled ? `Requested changes:\n${compiled}` : '';
    })(),
  }), [openedRow, openReviewId, activeProjectId, pins]);
  const sendBackToAgent = useCallback(async (extraNotes = '') => {
    const compiled = compileChanges(pins, extraNotes);
    if (!openReviewId || !compiled) return;
    const sent = await review.actions.requestChanges(openReviewId, compiled);
    if (!sent) return;
    setChangesOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pins, openReviewId]);

  // ── deep-link / in-app target: select the room, flip needs-review on, open the file ──
  const targetKeyRef = useRef(null);
  const pendingOpenRef = useRef(null);
  useEffect(() => {
    if (!target) return;
    const key = filesTargetKey(target);
    if (targetKeyRef.current === key) return;
    // Shape-blind resolution (Patrik 2026-07-18 "comment lands on the projects
    // panel"): the resolver reads EVERY producer shape — {url,name} attachments
    // AND {attachmentUrl,fileName} message rows from the mobile galleries /
    // "Comment in Review" — so a chat hand-off can never resolve to an empty
    // identity and strand the user on the tree with no document open.
    const { wantsFile, item, proj, pending } = resolveFilesTarget(target, itemsAll);
    if ((wantsFile || target.needsReview) && !itemsAll.length && review.state === 'loading') return; // queue still landing
    targetKeyRef.current = key;
    if (proj) selectProject(proj);
    // The needs-review filter goes on for triage entries; a target that is NOT in
    // the waiting set opens in plain browse (the filter would hide it). A bare
    // ?view=review (no file) lands IN triage: newest waiting room, filter on.
    if (target.needsReview) {
      if (item) setFilter('needs');
      else if (!wantsFile) {
        const it0 = itemsAll[0];
        if (it0) selectProject(it0.whoRaw || '__personal');
        setFilter('needs');
      }
    }
    if (pending) pendingOpenRef.current = pending;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, itemsAll, review.state]);
  // Resolve the pending target to a real row once the list shows it; if no row ever
  // materializes (a file outside the tree), open it directly in the review pane.
  useEffect(() => {
    const pend = pendingOpenRef.current;
    if (!pend) return;
    const row = (data.files || []).find((f) => (pend.rid && f.reviewId === pend.rid) || (!pend.rid && pend.name && f.name === pend.name));
    if (row) { pendingOpenRef.current = null; openFile(row.id); return; }
    if (state === 'ready' && pend.rid) {
      pendingOpenRef.current = null;
      reviewActionsRef.current.openFileItem({ id: pend.rid, name: pend.name, project: pend.project });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.files, state]);

  // ── keyboard triage: j/k move through the CURRENT filtered list ──
  // Keyboard navigation stays focused on moving through the current review list.
  const kbRef = useRef({});
  kbRef.current = {
    files: data.files || [],
    openedId: data.openedId,
    open: (id) => openFile(id),
    changesOpen,
  };
  useEffect(() => {
    const handler = (e) => {
      const { files, openedId, open, changesOpen: co } = kbRef.current;
      if (co) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = openedId ? files.findIndex((f) => f.id === openedId) : -1;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = files[idx + 1];
        if (next) open(next.id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) open(files[idx - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // The search input is an uncontrolled kept DOM node (see template); the engine only
  // wires clicks, so the input event is delegated from this React wrapper.
  const debRef = useRef(null);
  const onSearchInput = (e) => {
    const el = e.target;
    if (!el?.matches?.('[data-org-search]')) return;
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => setQuery(el.value), 120);
  };
  useEffect(() => {
    const el = wrapRef.current?.querySelector('[data-org-search]');
    if (el) el.value = '';
  }, [activeProjectId]);
  const switchProject = (id) => { selectProject(id); };

  // ── R-TREE-MENU: right-click / long-press on tree rows → Rename / Move ──
  const projectName = useCallback((slug) => {
    const p = (projects || []).find((x) => x.slug === slug);
    return p?.name || slug;
  }, [projects]);
  const resolveHit = useCallback((rowEl) => {
    if (!rowEl.classList.contains('trow')) return null;
    const id = rowEl.getAttribute('data-cv6-arg') || '';
    if (!id || id === '__all' || id === '__personal') return null; // Personal is synthetic — nothing to rename/move
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
      canMove: !path || path.startsWith('corner/users/'),
    };
  }, [missionTree, projectName]);
  const broadcastRegistryChange = useCallback(() => {
    try { window.dispatchEvent(new CustomEvent('cv6:data-refresh')); } catch { /* SSR — non-fatal */ }
  }, []);
  const { overlay: ctxOverlay } = useTreeContextMenu({
    wrapRef,
    resolveHit,
    listProjects: () => (projects || []).map((p) => ({ slug: p.slug, name: p.name })),
    onRename: async (t, name) => { await renameNode(authFetch, t, name, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
    onMove: async (t, dest) => { await moveNode(authFetch, t, dest, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
    onCreate: async (t, name) => { await createNode(authFetch, t, name, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
    onArchive: async (t) => { await archiveNode(authFetch, t, worldId); await reload({ bust: true }); broadcastRegistryChange(); },
  });

  // ── bind data: rows picked-marked; deliverable = review viewer + live pins ──
  const bindData = useMemo(() => {
    const effectiveId = data.openedId;
    const files = (data.files || []).map((x) => ({ ...x, picked: x.id === effectiveId ? 'open' : 'closed' }));
    const del = review.data.deliverable || {};
    const deliverable = {
      ...del,
      bodyHtml: del.id ? (del.bodyHtml || VIEWER_LOADING_HTML) : VIEWER_NONE_HTML,
      file: del.id ? del.file : (openedRow ? openedRow.name : ''),
      title: del.id ? del.title : (openedRow?.name || 'No file selected'),
      // Circled comment: the marker rides the ring's top edge, not its centre.
      pins: pins.map((p) => ({ id: p.id, n: p.n, x: p.x, y: p.ry > 0 ? Math.max(0, p.y - p.ry) : p.y })),
      comments: pins.map((p) => ({ id: p.id, n: p.n, text: p.text, anchor: p.anchor })),
      openCount: pins.length,
      notesWord: pins.length === 1 ? 'note' : 'notes',
      hasNotes: pins.length ? 'yes' : 'no',
    };
    return { ...data, files, deliverable };
  }, [data, review.data.deliverable, pins, openedRow]);

  // Census closure: the default-active sort/filter chips are already selected — mark
  // aria-current so a re-click reads as an intentional no-op, not a dead control.
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
    const obs = new MutationObserver(sync);
    obs.observe(wrap, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, [bindData]);

  // Jump into triage: newest waiting item's room + the needs-review filter on.
  const goToTriage = useCallback(() => {
    const it = itemsAll[0];
    if (it) selectProject(it.whoRaw || '__personal');
    setFilter('needs');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAll]);

  const actions = {
    nav: (t) => (t === 'back' ? onNav?.('home') : onNav?.(t)),
    openNav: () => onOpenNav?.(),
    openCommandK: () => onSearch?.(),
    openProfile: () => {},
    search: () => onSearch?.(),
    openFile: (id) => openFile(id),
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
    // ── the rehomed review actions ──
    approve: (id) => review.actions.approve(id),
    dismiss: (id) => review.actions.dismiss(id),
    requestChanges: () => setChangesOpen(true),
    sendChecklist: (id) => review.actions.sendChecklist(id),
    download: (id) => review.actions.download(id),
    openPin: (id) => openPinById(id),
    openComments: () => {},
    toggleReviewed: () => setReviewedOn((v) => !v),
    restoreDismiss: (decisionId) => {
      if (!decisionId) return;
      review.actions.undoDismiss(decisionId);
      setDecidedRaw((prev) => (prev ? prev.filter((i) => (i.decision_id || '') !== decisionId) : prev));
    },
    needsPillGo: () => goToTriage(),
    browseWaiting: () => goToTriage(),
    assignAgent: (fileId) => onAssignFile?.(fileId, assignExtra()),
    newProject: () => setShowNew(true),
    // Held-c (the file store is flat — no folder tree): inert, never faked.
    addFile: () => {}, newFolder: () => {}, commentFile: () => {},
    moveFile: () => {}, moveSelection: () => {}, confirmMove: () => {}, cancelMove: () => {},
    pickDestination: () => {}, deleteSelection: () => {}, renameSelection: () => {}, shareSelection: () => {},
  };

  // Transient verdict feedback (the dismiss toast's 10s Undo — a real control).
  const notice = review.notice;

  return (
    <div ref={wrapRef} onInput={onSearchInput} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={DESKTOP_HTML} data={bindData} actions={actions} state={state} aliases={ORG_ALIASES} style={{ width: '100%', height: '100%' }} />
      {zoomControls}
      {toolAnchor && (
        <div style={{ position: 'absolute', top: toolAnchor.top + 38, right: toolAnchor.right, zIndex: 24 }}>
          {circleToggle}
        </div>
      )}
      {ctxOverlay}
      {pinOverlay}
      {notice && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 60, pointerEvents: notice.onAction ? 'auto' : 'none',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(5,8,11,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 16px',
          fontSize: 12.5, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-sans)',
          whiteSpace: 'nowrap', maxWidth: '70%',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{notice.text}</span>
          {notice.onAction && (
            <button onClick={notice.onAction}
              style={{ border: 'none', background: 'transparent', color: 'var(--accent, #3B82F6)', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              {notice.actionLabel || 'Undo'}
            </button>
          )}
        </div>
      )}
      {changesOpen && (
        <ReviewChangesOverlay
          pins={pins}
          title={openedRow?.name || ''}
          onSendBack={sendBackToAgent}
          onClose={() => setChangesOpen(false)}
        />
      )}
      {/* keyboard hint pill — pointer-events:none so it never blocks content */}
      {data.openedId && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'none', display: 'flex', gap: 20,
          background: 'rgba(5,8,11,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
          padding: '5px 18px', fontSize: 11,
          color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-mono,ui-monospace,monospace)',
          zIndex: 40, letterSpacing: 0.3, whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          {[['j', 'next'], ['k', 'prev']].map(([key, label]) => (
            <span key={key}>
              <span style={{ color: 'rgba(255,255,255,0.62)', fontWeight: 700 }}>{key}</span>
              {' '}{label}
            </span>
          ))}
        </div>
      )}
      {showNew ? (
        <NewComposer worldId={worldId} projects={projects || []} agents={[]} initialMode="project"
          onClose={() => setShowNew(false)} onCreated={() => reload({ bust: true })} />
      ) : null}
    </div>
  );
}
