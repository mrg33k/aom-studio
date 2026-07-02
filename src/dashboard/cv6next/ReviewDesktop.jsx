// cv6next — Review tool, desktop. Master-detail: queue list + viewer + decision panel.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useReview, reviewItemsFromFiles } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { useReviewPinUI } from './ReviewPins.jsx';
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
  // Append shared states to the viewer region
  const ready = screen.querySelector('[data-state="ready"]');
  if (ready) {
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => {
      ready.parentNode.appendChild(b.cloneNode(true));
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
  const { state, data, actions } = useReview(worldId || 'aom', injected);
  const [pickedId, setPickedId] = useState(null);
  const { pins, addPin, deletePin } = usePins(pickedId, worldId || 'aom');

  // Pin-comment interaction: a delegated click listener on the stable wrapper (survives
  // TemplateScreen's innerHTML rebuilds — binding to the inner DOM dies on the first data
  // tick) + the design popover composer/viewer rendered outside the template DOM.
  const viewerRef = useRef(null);
  const { overlay: pinOverlay, openPinById } = useReviewPinUI({ wrapRef: viewerRef, pins, addPin, deletePin });

  // Catch-up → Review carries a filename (+ its project); resolve it to a real queue
  // item (the queue carries real paths) so we open the exact deliverable the user came
  // to review instead of whatever happens to be first. With injected files, just open
  // the first one.
  const targetId = useMemo(() => {
    if (injected && injected.length) return injected[0].id;
    if (!targetName) return null;
    const base = (p) => String(p || '').split('/').pop();
    const items = data.queue.items;
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
    },
  };

  const aliases = {
    'queue.items': 'item',
    'deliverable.pins': 'pin',
    'deliverable.comments': 'comment',
    'item': 'item',
    'pin': 'pin',
    'comment': 'comment',
  };

  const desktopActions = {
    nav: (target) => target === 'back' ? onNav?.('back') : onNav?.(target),
    openCommandK: () => { /* stub */ },
    openProfile: () => { /* stub */ },
    searchQueue: () => { /* stub */ },
    setQueueFilter: (f) => actions.setQueueFilter(f),
    openDeliverable: (id) => {
      setPickedId(id);
      actions.openDeliverable(id);
    },
    loadMore: () => actions.loadMore(),
    // A pin marker (or its row in the comments panel) opens the comment popover
    // over that spot, with delete.
    openPin: (id) => openPinById(id),
    openComments: () => { /* stub */ },
    approve: (id) => actions.approve(id),
    requestChanges: (id) => {
      const notes = prompt('What changes are needed?');
      if (notes) actions.requestChanges(id, notes);
    },
    sendChecklist: (id) => actions.sendChecklist(id),
    assignAgent: (id) => onAssignDeliverable?.(id),
  };

  return (
    <div ref={viewerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={desktopHtml} data={desktopData} actions={desktopActions} aliases={aliases} state={state} style={{ width: '100%', height: '100%' }} />
      {pinOverlay}
    </div>
  );
}
