// cv6next — Files, mobile (project picker → browse → read + decide).
// The Organize drill-down with the Review tool REHOMED inside it (corner:one-corner
// files-tool merge): tapping a file opens the review viewer full-screen with the
// R15b two-row verdict bar (verdict trio + quiet Assign/Download row) — the shipped
// machinery, mounted, never rebuilt. Flow:
//   PICKER  ("Organize · Projects")   — pick a project (+ the needs-you pill)
//   BROWSE  ("Organize · Browse")     — files, chips (Needs review first), badges
//   VIEW    ("Organize · View file")  — review viewer + pins + verdict bar

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import NewComposer from './NewComposer.jsx';
import { authFetch } from '../lib/authFetch';
import { buildWaitingMap, buildDecidedMap } from './OrganizeDesktop.jsx';
import { resolveFilesTarget, filesTargetKey } from './data/reviewTargetResolve.js';
import { useWorldId } from '../lib/tenantContext.jsx';
import template from './templates/organize.html?raw';
import statesRaw from './templates/states-extra.html?raw';

// data-each item aliases the engine can't derive (tree→node, breadcrumb→crumb, etc.).
const ORG_ALIASES = {
  tree: 'node', files: 'file', projects: 'project', breadcrumb: 'crumb',
  destinations: 'dest', filters: 'filter', folders: 'subfolder', missions: 'mission',
  sorts: 'sort', 'deliverable.pins': 'pin', 'deliverable.comments': 'comment',
};

// Transparent: the Files screen shares the one viewport-fixed wallpaper
// (index.html body::before) instead of painting its own --ground box, which
// double-painted over the fixed layer and read as a boxed-in page with a
// mismatched top strip on glass (Patrik 2026-07-20).
const SCREEN_BG = 'transparent';

const VIEWER_LOADING_HTML = cornerLogoLoaderMarkup('Preparing the file', { minHeight: 220 });

function screenByLabel(doc, label) {
  return [...doc.querySelectorAll('[data-cv6][data-screen]')].find((n) => n.getAttribute('data-screen-label') === label) || null;
}

// Turn a frame into a flex column (header flows, body fills) and drop the shared
// loading / empty / error blocks into the same flex slot as the ready body.
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
  const pmeta = screen.querySelector('.pmeta');
  if (pmeta) { pmeta.innerHTML = '0 files'; pmeta.setAttribute('data-bind', 'project.countLabel'); }
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

  // Resting state must not look like select-mode: drop the bulk action bar and the
  // "Done" select toggle (bulk actions are backend-blocked, held-c).
  screen.querySelector('div[style*="height:82px"]')?.remove();
  [...screen.querySelectorAll('[data-action="toggleSelectMode"]')].forEach((n) => n.remove());
  screen.querySelector('.selrow[data-each="folders"]')?.remove();
  screen.querySelector('[data-each="breadcrumb"]')?.remove();

  // File rows: no checkbox at rest; a tap opens the file (read + decide).
  const fileRow = screen.querySelector('.selrow[data-each="files"]');
  if (fileRow) {
    fileRow.querySelector('.selbox')?.remove();
    fileRow.setAttribute('data-action', 'openFile');
    fileRow.setAttribute('data-arg', 'file.id');
    fileRow.removeAttribute('data-mod');
    fileRow.setAttribute('class', 'selrow');
    fileRow.querySelector('[data-action="openFileMenu"]')?.remove();
  }

  finalizeScreen(screen, body);
  return screen.outerHTML;
}

// ── VIEW: read + decide (the review viewer + R15b verdict bar, template-native) ──
function composeView(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = screenByLabel(doc, 'Organize · View file');
  if (!screen) return '';
  finalizeScreen(screen, screen.querySelector('[data-state="ready"]'));
  return screen.outerHTML;
}

const PICKER_HTML = composePicker(template);
const BROWSE_HTML = composeBrowse(template);
const VIEW_HTML = composeView(template);

export default function OrganizeMobile({ onNav, onOpenNav, onSearch, onAssignFile, target }) {
  const worldId = useWorldId();

  // ── review machinery (the rehomed Review tool) ──
  const review = useReview(worldId);
  const itemsAll = review.data.queue.itemsAll || [];
  const reviewWaiting = useMemo(() => buildWaitingMap(itemsAll), [itemsAll]);
  const reviewTotal = review.data.queue.waitingTotal || 0;
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
      } catch { /* badges simply don't render */ }
    })();
    return () => { dead = true; };
  }, [reviewedOn, decidedRaw]);
  const reviewDecided = useMemo(() => (reviewedOn ? buildDecidedMap(decidedRaw) : null), [reviewedOn, decidedRaw]);

  const { state, data, selectProject, selectMission, setFilter, setQuery, setSort, reload, openFile, projects } =
    useOrganize(worldId, { reviewWaiting, reviewTotal, reviewDecided, reviewedOn, reviewItems: itemsAll });

  const [projectId, setProjectId] = useState(null); // null = show the picker
  const [pickedFileId, setPickedFileId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [filterState, setFilterState] = useState('recent'); // mirror for verdict auto-return
  const setFilterBoth = useCallback((id) => { setFilter(id); setFilterState(id); }, [setFilter]);

  // Type-to-find: delegated input event (engine wires clicks only).
  const wrapRef = useRef(null);
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
  }, [projectId]);

  const enterProject = (id) => { setProjectId(id); setPickedFileId(null); selectProject(id); setFilterState('recent'); };
  const backToPicker = () => { setProjectId(null); setPickedFileId(null); };
  const backToBrowse = () => setPickedFileId(null);

  // Open a file: lazy content + review viewer keyed by its review identity.
  const tapFile = (id) => { openFile(id); setPickedFileId(id); };

  // ── open file → review viewer ──
  const openedRow = useMemo(() => (data.files || []).find((f) => f.id === pickedFileId) || null, [data.files, pickedFileId]);
  // Shared/chat files may not have a mirror row. Once useReview opens that direct
  // target, its deliverable id is the stable key for pins and verdicts.
  const openReviewId = openedRow?.reviewId || review.data.deliverable?.id || null;
  const reviewActionsRef = useRef(review.actions);
  reviewActionsRef.current = review.actions;
  useEffect(() => {
    if (!openReviewId || !openedRow) return;
    reviewActionsRef.current.openFileItem({
      id: openReviewId,
      name: openedRow.name,
      project: projectId === '__personal' ? '' : (projectId || ''),
      mime: openedRow.mime || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openReviewId]);

  const { pins, addPin, deletePin } = usePins(openReviewId, worldId);
  const { overlay: pinOverlay, openPinById, circleMode, circleToggle } = useReviewPinUI({
    wrapRef, pins, addPin, deletePin, enabled: !!pickedFileId, isMobile: true,
  });

  // Swipe left/right through the OPEN FOLDER while viewing one of its files — this
  // is the surface Patrik meant by "the different files in the folder" (2026-08-07):
  // Files is where you browse a folder, so the gesture walks data.files in the order
  // the list shows, not some other collection.
  const folderFiles = data.files;
  const stepFile = useCallback((dir) => {
    const list = folderFiles || [];
    if (list.length < 2) return;
    const at = list.findIndex((f) => f.id === pickedFileId);
    if (at < 0) return;
    const next = list[(at + (dir === 'next' ? 1 : -1) + list.length) % list.length];
    if (next && next.id !== pickedFileId) tapFile(next.id);
  }, [folderFiles, pickedFileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pinch to zoom the open file. Live while the red pen is armed (you zoom in to
  // circle a detail) — it just stops competing for the drag.
  const { zoomControls, anchor: toolAnchor } = useDocZoom({
    wrapRef, enabled: !!pickedFileId, drawing: circleMode, fileKey: pickedFileId, onSwipe: stepFile,
  });
  usePdfDocs(wrapRef); // hydrate [data-pdf-doc] shells (the M7 PDF reader)
  useDocxDocs(wrapRef); // hydrate [data-docx-doc] shells (the M9 Word reader)
  useHtmlDocs(wrapRef, !!pickedFileId); // hydrate sandboxed HTML/web-page shells

  const [changesOpen, setChangesOpen] = useState(false);
  useEffect(() => { setChangesOpen(false); }, [openReviewId]);
  const assignExtra = useCallback(() => ({
    artifactTitle: openedRow?.name || String(openReviewId || '').split('/').pop() || '',
    project: projectId === '__personal' ? '' : (projectId || ''),
    details: pins.length ? `Requested changes:\n${compileChanges(pins)}` : '',
  }), [openedRow, openReviewId, projectId, pins]);

  // ── deep-link / in-app target ──
  const targetKeyRef = useRef(null);
  const pendingOpenRef = useRef(null);
  const enteredViaTargetRef = useRef(false);
  useEffect(() => {
    if (!target) return;
    const key = filesTargetKey(target);
    if (targetKeyRef.current === key) return;
    // Shape-blind resolution (Patrik 2026-07-18 "comment lands on the projects
    // panel"): the shared resolver reads EVERY producer shape — {url,name}
    // attachments AND {attachmentUrl,fileName} message rows from the mobile
    // galleries / "Comment in Review" — so a chat hand-off can never resolve to
    // an empty identity and strand the user on the project picker.
    const { wantsFile, item, proj, pending } = resolveFilesTarget(target, itemsAll);
    if ((wantsFile || target.needsReview) && !itemsAll.length && review.state === 'loading') return;
    targetKeyRef.current = key;
    if (proj) enterProject(proj);
    // A bare ?view=review (no file) lands IN triage: newest waiting room, filter on.
    if (target.needsReview) {
      if (item) setFilterBoth('needs');
      else if (!wantsFile) {
        const it0 = itemsAll[0];
        if (it0) enterProject(it0.whoRaw || '__personal');
        setFilterBoth('needs');
      }
    }
    if (pending) {
      pendingOpenRef.current = pending;
      enteredViaTargetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, itemsAll, review.state]);
  useEffect(() => {
    const pend = pendingOpenRef.current;
    if (!pend) return;
    const row = (data.files || []).find((f) => (pend.rid && f.reviewId === pend.rid) || (!pend.rid && pend.name && f.name === pend.name));
    if (row) { pendingOpenRef.current = null; tapFile(row.id); return; }
    // Match desktop: a file outside the mirrored tree is still a complete review
    // target. Open it directly and enter the read screen so mobile never strands
    // chat attachments on the empty picker.
    if (state === 'ready' && pend.rid) {
      pendingOpenRef.current = null;
      setPickedFileId(pend.rid);
      reviewActionsRef.current.openFileItem({ id: pend.rid, name: pend.name, project: pend.project });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.files, state]);

  // viewFile comes from the hook (content fetched lazily, keyed by openedId === pickedFileId).
  const del = review.data.deliverable || {};
  const bindData = {
    ...data,
    files: (data?.files || []),
    folders: [], // Phase 2: subfolder navigation
    viewFile: pickedFileId ? (data?.viewFile || null) : null,
    deliverable: {
      ...del,
      bodyHtml: del.id ? (del.bodyHtml || VIEWER_LOADING_HTML) : VIEWER_LOADING_HTML,
      file: del.id ? del.file : (openedRow ? openedRow.name : ''),
      title: del.id ? del.title : (openedRow?.name || ''),
      // A circled comment stores the ring's CENTRE; its numbered marker rides the
      // ring's top edge so it never covers what was circled.
      pins: pins.map((p) => ({ id: p.id, n: p.n, x: p.x, y: p.ry > 0 ? Math.max(0, p.y - p.ry) : p.y })),
      comments: pins.map((p) => ({ id: p.id, n: p.n, text: p.text, anchor: p.anchor })),
      openCount: pins.length,
      notesWord: pins.length === 1 ? 'note' : 'notes',
      hasNotes: pins.length ? 'yes' : 'no',
      pinState: pins.length ? 'has' : 'none',
    },
  };

  // Census closure (mirror of desktop): mark the already-active chips aria-current.
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
  }, [bindData, projectId, pickedFileId]);

  // Context-aware back: file view → list (or app history when entered on a target),
  // list → picker, picker → home.
  const handleBack = () => {
    if (pickedFileId) {
      // Origin-aware (R15b defect 6): entered from a conversation file card or a
      // catch-up deep link? Back returns THERE via the app history pop.
      if (enteredViaTargetRef.current) { enteredViaTargetRef.current = false; onNav?.('back'); return; }
      backToBrowse();
    } else if (projectId) backToPicker();
    else onNav?.('home');
  };

  // Verdict → under the needs-review filter the flow auto-returns to the filtered
  // list (the next waiting file is ready to tap); in plain browse the file stays
  // open and only its badge clears.
  const afterVerdict = () => {
    if (filterState === 'needs') { setPickedFileId(null); }
  };

  // Jump into triage from the picker pill / empty state.
  const goToTriage = () => {
    const it = itemsAll[0];
    enterProject(it ? (it.whoRaw || '__personal') : (projectId || '__personal'));
    setFilterBoth('needs');
  };

  const actions = {
    nav: (targetId) => (targetId === 'back' ? handleBack() : onNav?.(targetId)),
    openNav: () => onOpenNav?.(),
    openProfile: () => {},
    openCommandK: () => onSearch?.(),
    search: () => onSearch?.(),
    openProject: (id) => enterProject(id),
    openTreeNode: (id) => enterProject(id),
    openCrumb: (id) => (id === 'root' ? backToPicker() : enterProject(id)),
    openFile: (id) => tapFile(id),
    setFilter: (id) => setFilterBoth(id || 'recent'),
    setMission: (id) => selectMission(id || '__all'),
    setSort: (id) => setSort(id === 'az' ? 'az' : 'newest'),
    // ── the rehomed review actions ──
    requestChanges: () => setChangesOpen(true),
    sendChecklist: (id) => review.actions.sendChecklist(id),
    download: (id) => {
      review.actions.approve(id);
      review.actions.download(id);
      afterVerdict();
    },
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
    assignAgent: (fileId) => onAssignFile?.(fileId || openReviewId, assignExtra()),
    newProject: () => setShowNew(true),
    retry: () => reload?.(),
    openFolder: () => {}, commentFile: () => {}, moveFile: () => {},
    emptyAction: () => goToTriage(), viewOffline: () => {},
    openFileMenu: () => {}, toggleSelect: () => {}, toggleSelectMode: () => {},
  };

  const html = pickedFileId ? VIEW_HTML : projectId ? BROWSE_HTML : PICKER_HTML;
  const screenState = projectId ? state : (state === 'loading' || state === 'error' || state === 'empty' ? state : 'ready');

  // Bottom-anchored undo snackbar (R15b: the top slot swallowed tree-row taps).
  const notice = review.notice;
  const noticeToast = notice ? (
    <div style={{
      position: 'absolute', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', left: '50%',
      transform: 'translateX(-50%)', zIndex: 60,
      pointerEvents: notice.onAction ? 'auto' : 'none',
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'rgba(5,8,11,0.85)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 16px',
      fontSize: 12.5, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-sans)',
      whiteSpace: 'nowrap', maxWidth: '90%',
    }}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{notice.text}</span>
      {notice.onAction && (
        <button onClick={notice.onAction}
          style={{ border: 'none', background: 'transparent', color: 'var(--accent, #3B82F6)', fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {notice.actionLabel || 'Undo'}
        </button>
      )}
    </div>
  ) : null;

  return (
    // data-swipe-guard: while a file is open this screen owns left/right (previous /
    // next file in the folder). Without it useChatSwipe fires too and navigates the
    // app away mid-swipe — the same collision the Files sheet hit.
    <div ref={wrapRef} onInput={onSearchInput} data-swipe-guard={pickedFileId ? '' : undefined} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={html} data={bindData} actions={actions} state={screenState} aliases={ORG_ALIASES} style={{ width: '100%', height: '100%' }} />
      {pickedFileId ? zoomControls : null}
      {pickedFileId && toolAnchor && (
        <div style={{ position: 'absolute', bottom: toolAnchor.bottom + 40, right: toolAnchor.right, zIndex: 24 }}>
          {circleToggle}
        </div>
      )}
      {noticeToast}
      {pinOverlay}
      {changesOpen && (
        <ReviewChangesOverlay
          pins={pins}
          title={openedRow?.name || ''}
          onSendBack={async (extraNotes = '') => {
            const compiled = compileChanges(pins, extraNotes);
            if (!openReviewId || !compiled) return;
            const sent = await review.actions.requestChanges(openReviewId, compiled);
            if (!sent) return;
            setChangesOpen(false);
            afterVerdict();
          }}
          onClose={() => setChangesOpen(false)}
        />
      )}
      {showNew ? (
        <NewComposer worldId={worldId} projects={projects || []} agents={[]} initialMode="project"
          onClose={() => setShowNew(false)} onCreated={() => reload?.({ bust: true })} />
      ) : null}
    </div>
  );
}
