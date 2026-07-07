// cv6next — Review tool, desktop. Master-detail: queue list + viewer + decision panel.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useReview, reviewItemsFromFiles } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { useReviewPinUI } from './ReviewPins.jsx';
import { ReviewChangesOverlay, compileChanges } from './ReviewChanges.jsx';
import { useTreeContextMenu, renameNode, moveNode, createNode, findMissionNode } from './TreeContextMenu.jsx';
import { authFetch } from '../lib/authFetch';
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
  return screen.outerHTML;
}

export default function ReviewDesktop({ worldId, onNav, onOpenNav, onAssignDeliverable, target }) {
  // Files from a chat "Review all" ARE the queue — show exactly those, live.
  const injected = useMemo(
    () => (target?.files?.length ? reviewItemsFromFiles(target.files, target.project) : null),
    [target],
  );
  // A file parsed from message text can carry a name but NO url (useRoomThread's
  // "Attached file:" shape). reviewItemsFromFiles drops it (nothing to fetch), which
  // used to strand the user on the default queue instead of the file they clicked.
  // Fall back to resolving that filename against the real queue, same as Catch-up.
  const targetName = target?.name
    || ((!injected?.length && target?.files?.length) ? (target.files.find((f) => f?.name)?.name || null) : null);
  const { state, data, actions, scope, projectsRaw, missionTreeRaw, refreshTree } = useReview(worldId || 'aom', injected);
  const [pickedId, setPickedId] = useState(null);
  const { pins, addPin, deletePin } = usePins(pickedId, worldId || 'aom');
  // "Changes" overlay (R-ASSIGN part D): the bullet list of every comment with its
  // timecode, with Send-back-to-agent routing through the assign path.
  const [changesOpen, setChangesOpen] = useState(false);
  useEffect(() => { setChangesOpen(false); }, [pickedId]);
  const pickedItem = useMemo(() => (data.queue.items || []).find((i) => i.id === pickedId) || null, [data.queue.items, pickedId]);
  // Everything the assign overlay needs to make the dispatch meaningful: the real
  // file name, the project it belongs to, and the full comment list as notes.
  const assignExtra = useCallback(() => ({
    artifactTitle: pickedItem?.title || String(pickedId || '').split('/').pop() || '',
    project: pickedItem?.whoRaw || '',
    details: pins.length ? `Requested changes:\n${compileChanges(pins)}` : '',
  }), [pickedItem, pickedId, pins]);
  const sendBackToAgent = useCallback(() => {
    const compiled = compileChanges(pins);
    // Record the decision on the deliverable (real write since R-ASSIGN fixed the
    // endpoint's schema), then open the agent picker with the list attached.
    if (pickedId && compiled) actions.requestChanges(pickedId, compiled);
    setChangesOpen(false);
    onAssignDeliverable?.(pickedId, assignExtra());
  }, [pins, pickedId, actions, onAssignDeliverable, assignExtra]);

  // Pin-comment interaction: a delegated click listener on the stable wrapper (survives
  // TemplateScreen's innerHTML rebuilds — binding to the inner DOM dies on the first data
  // tick) + the design popover composer/viewer rendered outside the template DOM.
  const viewerRef = useRef(null);
  const { overlay: pinOverlay, openPinById } = useReviewPinUI({ wrapRef: viewerRef, pins, addPin, deletePin });

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
    onRename: async (target, name) => { await renameNode(authFetch, target, name, worldId || 'aom'); refreshTree(); },
    onMove: async (target, dest) => { await moveNode(authFetch, target, dest, worldId || 'aom'); refreshTree(); },
    onCreate: async (target, name) => { await createNode(authFetch, target, name, worldId || 'aom'); refreshTree(); },
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
  useEffect(() => {
    if ((injected?.length || targetName) && !targetAppliedRef.current) {
      if (!data.queue.items.length) return; // wait for the queue to land
      targetAppliedRef.current = true;
      const openId = targetId || firstId;
      if (openId) { setPickedId(openId); actions.openDeliverable(openId); }
      return;
    }
    if (!pickedId && firstId) {
      setPickedId(firstId);
      actions.openDeliverable(firstId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedId, firstId, target, targetId, data.queue.items.length]);

  const desktopHtml = useMemo(() => composeDesktopReview(reviewRaw), []);

  // Keep the selected tree node in view: with the full registry listed, a project
  // low in the alphabet lands outside the tree's scroll window the moment it is
  // clicked (TemplateScreen rebuilds the DOM, resetting scroll). Runs per data tick.
  useEffect(() => {
    const sel = viewerRef.current?.querySelector('.trow.is-d0on, .trow.is-d1on');
    sel?.scrollIntoView({ block: 'nearest' });
  });

  const desktopData = {
    ...data,
    queue: {
      ...data.queue,
      items: data.queue.items.map((i) => ({
        ...i,
        open: i.id === pickedId ? 'on' : 'off',
        who: i.who || 'Unknown',
        whoInitials: i.whoInitials || '·',
        whoTint: i.whoTint || 'green',
      })),
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
        y: p.y,
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
    // With pinned comments the Changes overlay IS the request: every note with its
    // timecode, and Send-back-to-agent. Without comments, fall back to the prompt.
    requestChanges: (id) => {
      if (pins.length) { setChangesOpen(true); return; }
      const notes = prompt('What changes are needed?');
      if (notes) actions.requestChanges(id, notes);
    },
    sendChecklist: (id) => actions.sendChecklist(id),
    assignAgent: (id) => onAssignDeliverable?.(id, assignExtra()),
  };

  return (
    <div ref={viewerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={desktopHtml} data={desktopData} actions={desktopActions} aliases={aliases} state={state} style={{ width: '100%', height: '100%' }} />
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
    </div>
  );
}
