// cv6next — Review tool, desktop. Master-detail: queue list + viewer + decision panel.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useReview, reviewItemsFromFiles } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { useReviewPinUI } from './ReviewPins.jsx';
import { useDocZoom } from './useDocZoom.jsx';
import { ReviewChangesOverlay, compileChanges } from './ReviewChanges.jsx';
import { useTreeContextMenu, renameNode, moveNode, createNode, archiveNode, findMissionNode } from './TreeContextMenu.jsx';
import { authFetch } from '../lib/authFetch';
import { usePdfDocs } from './data/pdfDocView.js';
import { useDocxDocs } from './data/docxDocView.js';
import { useHtmlDocs } from './data/htmlDocView.js';
import reviewRaw from './templates/review.html?raw';
import statesRaw from './templates/states-extra.html?raw';

function composeDesktopReview(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const screen = doc.querySelector('[data-cv6][data-screen="review-desktop"]');
  if (!screen) return '';
  screen.setAttribute('style', 'width:100%;height:100%');
  // Strip the baked-in topbar — the shell renders the shared DesktopNav, so the
  // template's own nav would stack a second header (matches composeScreen line 73).
  screen.querySelector('.topbar')?.remove();
  // Mount the shared states INTO the viewer's slot (right after it, flex-sized the
  // same), so loading/empty/error replace the viewer between queue and side panel —
  // not bolt on as a stray fourth column after the side panel.
  const ready = screen.querySelector('[data-state="ready"]');
  if (ready) {
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    let after = ready;
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => {
      const c = b.cloneNode(true);
      const st = c.getAttribute('data-state');
      c.setAttribute('style', `${c.getAttribute('style') || ''};flex:1;min-width:0;${st === 'loading' ? 'padding:20px 28px;box-sizing:border-box;' : 'display:flex;align-items:center;justify-content:center;'}`);
      after.parentNode.insertBefore(c, after.nextSibling);
      after = c;
    });
  }
  // WD40-R4: inject styles for the "Past decisions" section in the queue list.
  // Section-header items get is-section; past-decision items get is-past.
  // Approved badge = green tint; returned badge = amber tint. Both use the
  // existing .qcount slot (the template already renders it with data-bind).
  const style = doc.createElement('style');
  style.textContent = [
    '[data-cv6] .qitem.is-section{background:transparent!important;cursor:default;pointer-events:none;border-radius:0;padding:12px 14px 8px;border-top:1px solid rgba(255,255,255,0.06);margin-top:4px;}',
    '[data-cv6] .qitem.is-section .qglyph{display:none;}',
    '[data-cv6] .qitem.is-section .qcount{display:none;}',
    '[data-cv6] .qitem.is-section .qmeta{display:none;}',
    '[data-cv6] .qitem.is-section .qtitle{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}',
    '[data-cv6] .qitem.is-past{opacity:.7;}',
    '[data-cv6] .qcount.is-approved{background:rgba(52,211,153,.14);color:#34d399;font-size:10px;font-weight:700;letter-spacing:0;}',
    '[data-cv6] .qcount.is-returned{background:rgba(251,191,36,.14);color:#fbbf24;font-size:10px;font-weight:700;letter-spacing:0;}',
  ].join('');
  screen.insertBefore(style, screen.firstChild);
  return screen.outerHTML;
}

export default function ReviewDesktop({ worldId, onNav, onOpenNav, onAssignDeliverable, onSendBackComplete, target }) {
  // Files from a chat "Review all" ARE the queue — show exactly those, live.
  const injected = useMemo(
    () => (target?.files?.length ? reviewItemsFromFiles(target.files, target.project, target.missionSlug || '') : null),
    [target],
  );
  // A file parsed from message text can carry a name but NO url (useRoomThread's
  // "Attached file:" shape). reviewItemsFromFiles drops it (nothing to fetch), which
  // used to strand the user on the default queue instead of the file they clicked.
  // Fall back to resolving that filename against the real queue, same as Catch-up.
  const targetName = target?.name
    || ((!injected?.length && target?.files?.length) ? (target.files.find((f) => f?.name)?.name || null) : null);
  const { state, data, actions, scope, projectsRaw, missionTreeRaw, history, notice, refreshTree } = useReview(worldId, injected);
  const [pickedId, setPickedId] = useState(null);
  const { pins, addPin, deletePin } = usePins(pickedId, worldId);
  // "Changes" overlay (R-ASSIGN part D): the bullet list of every comment with its
  // timecode, with Send-back-to-agent routing through the assign path.
  const [changesOpen, setChangesOpen] = useState(false);
  useEffect(() => { setChangesOpen(false); }, [pickedId]);
  // WD40-R4: also search historyRows so clicking a past-decision row can re-open its viewer.
  // historyRows is defined below, but we defer the combined search via a lazy ref populated in the historyRows memo.
  const historyRowsRef = useRef([]);
  const pickedItem = useMemo(() => {
    return (data.queue.items || []).find((i) => i.id === pickedId)
      || historyRowsRef.current.find((i) => i.id === pickedId)
      || null;
  }, [data.queue.items, pickedId]);
  // Everything the assign overlay needs to make the dispatch meaningful: the real
  // file name, the project it belongs to, and the full comment list as notes.
  // WD40-R3: assignExtra now accepts optional typed notes from the Changes overlay
  // textarea so both pins and typed text travel through the same dispatch path.
  const assignExtra = useCallback((extraNotes = '') => ({
    artifactTitle: pickedItem?.title || String(pickedId || '').split('/').pop() || '',
    project: pickedItem?.whoRaw || '',
    details: (() => {
      const compiled = compileChanges(pins, extraNotes);
      return compiled ? `Requested changes:\n${compiled}` : '';
    })(),
  }), [pickedItem, pickedId, pins]);
  // WD40-R3: sendBackToAgent receives the typed notes string from the overlay textarea.
  const sendBackToAgent = useCallback(async (extraNotes = '') => {
    const compiled = compileChanges(pins, extraNotes);
    // review-decision queues the scoped agent task itself, so this is one click:
    // archive the annotated decision, hand the exact anchors to the agent, return.
    if (!pickedId || !compiled) return;
    const sent = await actions.requestChanges(pickedId, compiled);
    if (!sent) return;
    setChangesOpen(false);
    onSendBackComplete?.();
  }, [pins, pickedId, actions, onSendBackComplete]);

  // Pin-comment interaction: a delegated click listener on the stable wrapper (survives
  // TemplateScreen's innerHTML rebuilds — binding to the inner DOM dies on the first data
  // tick) + the design popover composer/viewer rendered outside the template DOM.
  const viewerRef = useRef(null);
  const { overlay: pinOverlay, openPinById, circleMode, circleToggle } = useReviewPinUI({ wrapRef: viewerRef, pins, addPin, deletePin });
  // Zoom on desktop (Patrik 2026-08-07: "technically I need a way to zoom on
  // desktop as well"). Trackpad pinch arrives as ctrlKey+wheel and is handled as a
  // real pinch; the −/%/+ cluster and the + - 0 keys cover a mouse, which has no
  // pinch at all — that is the case the mobile gesture work left uncovered.
  const { zoomControls, anchor: toolAnchor } = useDocZoom({ wrapRef: viewerRef, drawing: circleMode, fileKey: pickedId });
  usePdfDocs(viewerRef);
  useDocxDocs(viewerRef);
  useHtmlDocs(viewerRef);
  // ── WD40-R1: keyboard nav — ref holds live state, single listener never re-registers ──
  const kbNavRef = useRef({});

  // ── R-TREE-MENU: right-click / long-press on the queue tree → Rename / Move ──
  // Tree node ids: 'p:<projectSlug>' or 'm:<missionLeaf>' (missions render only
  // under the ACTIVE project, so the leaf resolves against scope.project).
  const resolveHit = useCallback((rowEl) => {
    if (!rowEl.classList.contains('trow')) return null;
    const id = rowEl.getAttribute('data-cv6-arg') || '';
    if (id.startsWith('p:')) {
      const slug = id.slice(2);
      const p = (projectsRaw || []).find((x) => x.slug === slug);
      return { kind: 'project', projectSlug: slug, name: p?.name || slug };
    }
    if (id.startsWith('m:')) {
      const leaf = id.slice(2);
      const proj = scope?.project;
      if (!proj || leaf === '__root') return null;
      const found = findMissionNode(missionTreeRaw?.[proj], `${proj}:${leaf}`, leaf);
      const node = found?.node;
      const path = node?.path || null;
      return {
        kind: 'mission',
        projectSlug: proj,
        missionSlug: node?.folder_name || leaf,
        name: node?.name || leaf,
        path,
        canMove: !path || path.startsWith('corner/users/'),
      };
    }
    return null;
  }, [projectsRaw, missionTreeRaw, scope]);
  const { overlay: ctxOverlay } = useTreeContextMenu({
    wrapRef: viewerRef,
    resolveHit,
    listProjects: () => (projectsRaw || []).map((p) => ({ slug: p.slug, name: p.name })),
    onRename: async (target, name) => { if (!worldId) return; await renameNode(authFetch, target, name, worldId); refreshTree(); },
    onMove: async (target, dest) => { if (!worldId) return; await moveNode(authFetch, target, dest, worldId); refreshTree(); },
    onCreate: async (target, name) => { if (!worldId) return; await createNode(authFetch, target, name, worldId); refreshTree(); },
    onArchive: async (target) => { if (!worldId) return; await archiveNode(authFetch, target, worldId); refreshTree(); },
  });

  // Catch-up → Review carries a filename (+ its project); resolve it to a real queue
  // item (the queue carries real paths) so we open the exact deliverable the user came
  // to review instead of whatever happens to be first. With injected files, just open
  // the first one.
  const targetId = useMemo(() => {
    if (injected && injected.length) return injected[0].id;
    if (!targetName) return null;
    const base = (p) => String(p || '').split('/').pop();
    // Match against the FULL queue (itemsAll), not the windowed display list — the
    // target may sit past the first page.
    const items = data.queue.itemsAll || data.queue.items;
    const m = items.find((i) => base(i.id) === targetName && (!target?.project || i.whoRaw === target.project))
      || items.find((i) => base(i.id) === targetName);
    return m ? m.id : null;
  }, [target, targetName, injected, data.queue.items]);

  // Auto-open on entry (mirrors Organize previewing the first file) so you land on
  // something to review instead of a blank viewer — preferring the catch-up target.
  const firstId = data.queue.items[0]?.id || null;
  const targetAppliedRef = useRef(false);
  // review-loop: a verdict (approve/dismiss) optimistically removes the open item
  // from the queue. When the picked id no longer resolves ANYWHERE (live queue OR
  // the past-decision rows, which are clickable), advance to the next deliverable
  // instead of leaving a blank viewer. Before verdicts persisted this was
  // unreachable — approved items never actually left the list.
  const pickedGone = !!pickedId
    && !data.queue.items.some((i) => i.id === pickedId)
    && !historyRowsRef.current.some((i) => i.id === pickedId);
  useEffect(() => {
    if ((injected?.length || targetName) && !targetAppliedRef.current) {
      if (!data.queue.items.length) return; // wait for the queue to land
      targetAppliedRef.current = true;
      const openId = targetId || firstId;
      if (openId) { setPickedId(openId); actions.openDeliverable(openId); }
      return;
    }
    if ((!pickedId || pickedGone) && firstId && firstId !== pickedId) {
      setPickedId(firstId);
      actions.openDeliverable(firstId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedId, pickedGone, firstId, target, targetId, data.queue.items.length]);

  const desktopHtml = useMemo(() => composeDesktopReview(reviewRaw), []);

  // Keep the selected tree node in view: with the full registry listed, a project
  // low in the alphabet lands outside the tree's scroll window the moment it is
  // clicked. ONCE per selection change (scroll-arch R1): this used to run on EVERY
  // render, so any unrelated re-render (e.g. clicking a queue item, or a data tick)
  // re-pinned the tree to the selected node and yanked it out from under the user's
  // own tree scroll — the same scroll-hijack the engine now prevents everywhere else.
  // A ref guard scrolls only when the selection actually moves. Same pattern as the
  // Home knav one-shot (commit 79702fd7).
  const lastTreeSelRef = useRef('');
  useEffect(() => {
    const sel = viewerRef.current?.querySelector('.trow.is-d0on, .trow.is-d1on');
    if (!sel) { lastTreeSelRef.current = ''; return; }
    const key = sel.getAttribute('data-cv6-arg') || sel.textContent || '';
    if (key === lastTreeSelRef.current) return; // already parked here — don't fight the user's scroll
    lastTreeSelRef.current = key;
    sel.scrollIntoView({ block: 'nearest' });
  });

  // WD40-R4: build history items to append below the queue list when a project is
  // selected and has past decisions. Section header + one item per decision, oldest
  // to newest so most-recent is closest to the live queue (scroll-natural order).
  // Items use queueState:'past'+'section' for CSS class injection via data-mod.
  const historyRows = useMemo(() => {
    if (!history || !history.length) return [];
    const header = {
      id: '__section__history',
      title: `Past decisions (${history.length})`,
      type: 'section', typeLabel: '', typeGlyph: '',
      who: '', whoInitials: '', whoTint: 'green',
      count: '', countState: 'zero',
      time: '', ts: '', location: '', missionLabel: '', missionRaw: '',
      status: '', statusLabel: '',
      queueState: 'section',
      file: '', bodyHtml: '', open: 'off', pins: [], comments: [], openCount: 0,
    };
    const rows = history.map((h) => ({
      id: h.deliverable_id || h.id,
      title: h.title,
      type: 'doc', typeLabel: '', typeGlyph: '',
      who: h.project || '', whoInitials: (h.project || '').slice(0, 2).toUpperCase() || '·',
      whoTint: 'green',
      count: h.action === 'approve' ? '✓' : '↩',
      countState: h.action === 'approve' ? 'approved' : 'returned',
      time: '', ts: h.decided_at || '', location: h.project || '',
      missionLabel: '', missionRaw: '',
      status: '', statusLabel: '',
      queueState: 'past',
      file: '', bodyHtml: '', open: 'off', pins: [], comments: [], openCount: 0,
    }));
    const result = [header, ...rows];
    historyRowsRef.current = result; // sync ref so pickedItem can find past-decision rows
    return result;
  }, [history]);

  const desktopData = {
    ...data,
    queue: {
      ...data.queue,
      items: [
        ...data.queue.items.map((i) => ({
          ...i,
          open: i.id === pickedId ? 'on' : 'off',
          who: i.who || 'Unknown',
          whoInitials: i.whoInitials || '·',
          whoTint: i.whoTint || 'green',
        })),
        ...historyRows,
      ],
    },
    // Use the hook's merged deliverable (it carries the fetched bodyHtml for the
    // open item). The old override re-derived from queue.items, whose bodyHtml is
    // the hardcoded blank, so the viewer never got real content.
    // Wire pins from the usePins hook: they are local component state (sample data for demo).
    deliverable: {
      ...data.deliverable,
      pins: pins.map((p) => ({
        id: p.id,
        n: p.n,
        x: p.x,
        // Circled comment: the marker rides the top edge of the ring, not its
        // centre, so it never sits on top of what was circled.
        y: p.ry > 0 ? Math.max(0, p.y - p.ry) : p.y,
      })),
      // Convert pins to the comment list shape for the right-panel.
      comments: pins.map((p) => ({
        id: p.id,
        n: p.n,
        text: p.text,
        anchor: p.anchor,
      })),
      openCount: pins.length,
      notesWord: pins.length === 1 ? 'note' : 'notes',
      // Drives the template's data-switch: the send-notes button only exists once
      // a comment is actually pinned.
      hasNotes: pins.length ? 'yes' : 'no',
    },
  };

  const aliases = {
    'queue.items': 'item',
    'queue.tree': 'node',
    'queue.filters': 'filter',
    'deliverable.pins': 'pin',
    'deliverable.comments': 'comment',
    'item': 'item',
    'node': 'node',
    'filter': 'filter',
    'pin': 'pin',
    'comment': 'comment',
  };

  const desktopActions = {
    nav: (target) => target === 'back' ? onNav?.('back') : onNav?.(target),
    openCommandK: () => { /* stub */ },
    openProfile: () => { /* stub */ },
    // Tree / chip clicks change the scope; clearing the picked id lets the
    // auto-open effect land on the first deliverable of the new scope.
    selectQueueNode: (id) => { actions.selectQueueNode(id); setPickedId(null); },
    setTypeFilter: (id) => { actions.setTypeFilter(id); setPickedId(null); },
    openDeliverable: (id) => {
      // WD40-R4: section headers are not deliverables — clicking one is a no-op.
      if (!id || String(id).startsWith('__section__')) return;
      setPickedId(id);
      actions.openDeliverable(id);
    },
    loadMore: () => actions.loadMore(),
    // Empty state's "Browse waiting" (shared states fragment fires emptyAction):
    // clear the room + chip scope back to the full waiting set. Was unwired — a
    // dead click. Clearing pickedId lets the auto-open effect land on the first
    // deliverable of the restored set.
    emptyAction: () => { actions.browseWaiting(); setPickedId(null); },
    // A pin marker (or its row in the comments panel) opens the comment popover
    // over that spot, with delete.
    openPin: (id) => openPinById(id),
    openComments: () => { /* stub */ },
    approve: (id) => actions.approve(id),
    // review-loop: Dismiss drops the item without approval. The optimistic queue
    // removal flips pickedGone, and the auto-open effect advances to the next
    // deliverable — no manual selection juggling here.
    dismiss: (id) => actions.dismiss(id),
    // WD40-R3: always open the Changes overlay — the prompt() fallback is gone.
    // The overlay has a textarea for typed notes so feedback flows without pins.
    requestChanges: () => { setChangesOpen(true); },
    sendChecklist: (id) => actions.sendChecklist(id),
    assignAgent: (id) => onAssignDeliverable?.(id, assignExtra()),
    // Download the reviewed file (any type) with its real filename.
    download: (id) => actions.download(id),
  };

  // Keyboard nav: update ref every render so the single listener always reads live state.
  // j / ArrowDown = next · k / ArrowUp = prev · a = approve + auto-advance.
  kbNavRef.current = {
    pickedId,
    // WD40-R4: history items (is-section / is-past) are decoration — j/k/a navigates
    // only through live queue items. Filter by queueState 'ready' (the only navigable state).
    items: desktopData.queue.items.filter((i) => i.queueState === 'ready' || (!i.queueState && i.id && !String(i.id).startsWith('__section__'))),
    advance: (id) => { setPickedId(id); actions.openDeliverable(id); },
    approve: (id) => actions.approve(id),
    changesOpen,
  };
  useEffect(() => {
    const handler = (e) => {
      const { pickedId: pid, items, advance, approve: approveFn, changesOpen: co } = kbNavRef.current;
      if (co) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const idx = pid ? items.findIndex((i) => i.id === pid) : -1;
      // Left/Right walk the folder the same way the mobile swipe does, so the two
      // surfaces answer "show me the next file" with the same mental model.
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = items[idx + 1];
        if (next) advance(next.id);
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (idx > 0) advance(items[idx - 1].id);
        return;
      }
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = items[idx + 1];
        if (next) advance(next.id);
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (idx > 0) advance(items[idx - 1].id);
      } else if (e.key === 'a') {
        // 'a' approves and optimistically advances; the queue refresh removes the item in the background.
        e.preventDefault();
        if (!pid) return;
        const next = items[idx + 1];
        approveFn(pid);
        if (next) advance(next.id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={viewerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={desktopHtml} data={desktopData} actions={desktopActions} aliases={aliases} state={state} style={{ width: '100%', height: '100%' }} />
      {zoomControls}
      {toolAnchor && (
        <div style={{ position: 'absolute', bottom: toolAnchor.bottom + 40, right: toolAnchor.right, zIndex: 24 }}>
          {circleToggle}
        </div>
      )}
      {/* review-loop: transient verdict feedback. With an action attached (the
          dismiss toast's Undo — R15b design gate) it's a real control. */}
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
            <button
              onClick={notice.onAction}
              style={{
                border: 'none', background: 'transparent', color: 'var(--accent, #3B82F6)',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-sans)',
                cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {notice.actionLabel || 'Undo'}
            </button>
          )}
        </div>
      )}
      {pinOverlay}
      {ctxOverlay}
      {changesOpen && (
        <ReviewChangesOverlay
          pins={pins}
          title={pickedItem?.title || ''}
          onSendBack={sendBackToAgent}
          onClose={() => setChangesOpen(false)}
        />
      )}
      {/* WD40-R1: keyboard hint pill — pointer-events:none so it never blocks content */}
      {pickedId && (
        <div style={{
          position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
          pointerEvents: 'none', display: 'flex', gap: 20,
          background: 'rgba(5,8,11,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20,
          padding: '5px 18px', fontSize: 11,
          color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-mono,ui-monospace,monospace)',
          zIndex: 40, letterSpacing: 0.3, whiteSpace: 'nowrap', userSelect: 'none',
        }}>
          {[['j', 'next'], ['k', 'prev'], ['a', 'approve'], ['←→', 'files'], ['+ −', 'zoom']].map(([key, label]) => (
            <span key={key}>
              <span style={{ color: 'rgba(255,255,255,0.62)', fontWeight: 700 }}>{key}</span>
              {' '}{label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
