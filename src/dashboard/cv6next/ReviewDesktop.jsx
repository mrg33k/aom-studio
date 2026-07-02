// cv6next — Review tool, desktop. Master-detail: queue list + viewer + decision panel.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useReview, reviewItemsFromFiles } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { PinLayer } from './PinLayer.jsx';
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
  const { state, data, actions } = useReview(worldId || 'aom', injected);
  const [pickedId, setPickedId] = useState(null);
  const { pins, addPin } = usePins(pickedId, worldId || 'aom');

  // Catch-up → Review carries a filename (+ its project); resolve it to a real queue
  // item (the queue carries real paths) so we open the exact deliverable the user came
  // to review instead of whatever happens to be first. With injected files, just open
  // the first one.
  const targetId = useMemo(() => {
    if (injected && injected.length) return injected[0].id;
    if (!target?.name) return null;
    const base = (p) => String(p || '').split('/').pop();
    const items = data.queue.items;
    const m = items.find((i) => base(i.id) === target.name && (!target.project || i.whoRaw === target.project))
      || items.find((i) => base(i.id) === target.name);
    return m ? m.id : null;
  }, [target, injected, data.queue.items]);

  // Auto-open on entry (mirrors Organize previewing the first file) so you land on
  // something to review instead of a blank viewer — preferring the catch-up target.
  const firstId = data.queue.items[0]?.id || null;
  const targetAppliedRef = useRef(false);
  useEffect(() => {
    if ((injected?.length || target?.name) && !targetAppliedRef.current) {
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
    openPin: (id) => {
      // When clicking a pin (in viewer or comments list), scroll/highlight it.
      // For now, a simple log; Patrik can request modal/edit UI later.
      const pin = pins.find((p) => p.id === id);
      if (pin) {
        console.log('[Review] opened pin:', pin.n, pin.text);
      }
    },
    openComments: () => { /* stub */ },
    approve: (id) => actions.approve(id),
    requestChanges: (id) => {
      const notes = prompt('What changes are needed?');
      if (notes) actions.requestChanges(id, notes);
    },
    sendChecklist: (id) => actions.sendChecklist(id),
    assignAgent: (id) => onAssignDeliverable?.(id),
  };

  // Add a ref to handle click interactions for pin creation
  const viewerRef = useRef(null);

  // Bind click handler to the viewer region for pin creation
  useEffect(() => {
    const viewer = viewerRef.current?.querySelector('[data-state="ready"]');
    if (!viewer) return;

    const handleViewerClick = (e) => {
      // Tap anywhere on the deliverable (.doc holds the doc / photo / site-shot /
      // video frame) to drop a pin-comment. Clicking an existing pin opens it instead.
      const docElem = e.target.closest('.doc');
      if (!docElem) return;
      if (e.target.closest('.pin')) return;
      const rect = docElem.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x < 0 || y < 0 || x > 1 || y > 1) return;
      // On a video frame, anchor the comment to the current playback time too.
      const video = docElem.querySelector('video');
      const t = (video && Number.isFinite(video.currentTime)) ? video.currentTime : null;
      const text = window.prompt('Add a comment for this spot:');
      if (text && text.trim()) addPin(x, y, text.trim(), t);
    };

    viewer.addEventListener('click', handleViewerClick);
    return () => viewer.removeEventListener('click', handleViewerClick);
  }, [addPin]);

  return (
    <div ref={viewerRef} style={{ width: '100%', height: '100%' }}>
      <TemplateScreen html={desktopHtml} data={desktopData} actions={desktopActions} aliases={aliases} state={state} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
