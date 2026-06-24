// cv6next — Review tool, desktop. Master-detail: queue list + viewer + decision panel.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useEffect } from 'react';
import { useReview } from './data/useReview.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
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

export default function ReviewDesktop({ worldId, onNav, onOpenNav }) {
  const { state, data, actions } = useReview(worldId || 'aom');
  const [pickedId, setPickedId] = useState(null);

  // Auto-open the first deliverable on entry (mirrors Organize previewing the first
  // file), so you land on something to review instead of a blank viewer.
  const firstId = data.queue.items[0]?.id || null;
  useEffect(() => {
    if (!pickedId && firstId) {
      setPickedId(firstId);
      actions.openDeliverable(firstId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedId, firstId]);

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
    deliverable: data.deliverable,
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
    openPin: (id) => { /* stub */ },
    openComments: () => { /* stub */ },
    approve: (id) => actions.approve(id),
    requestChanges: (id) => {
      const notes = prompt('What changes are needed?');
      if (notes) actions.requestChanges(id, notes);
    },
    sendChecklist: (id) => actions.sendChecklist(id),
  };

  return <TemplateScreen html={desktopHtml} data={desktopData} actions={desktopActions} aliases={aliases} state={state} style={{ width: '100%', height: '100%' }} />;
}
