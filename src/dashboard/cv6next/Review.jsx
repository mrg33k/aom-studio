// cv6next — Review tool, mobile. Two screens: pick list and read+decide.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useReview, reviewItemsFromFiles } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import reviewRaw from './templates/review.html?raw';
import statesRaw from './templates/states-extra.html?raw';

function composeReviewScreen(raw, { mobile = true, pick = 0 } = {}) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const nodes = doc.querySelectorAll('[data-cv6][data-screen*="review"]');
  // The read screen and the pick-list BOTH use data-screen="review-mobile" (they
  // differ only by data-screen-label), so a .find on that attribute always returned
  // the first (read) screen for both — which dumped users onto the read/decide view
  // with no deliverable selected. Select by INDEX instead: nodes = [desktop, read,
  // pick-list], and callers pass pick=1 (read) / pick=2 (pick-list).
  const screen = nodes[pick] || [...nodes].find((n) => n.getAttribute('data-screen') === 'review-mobile');
  if (!screen) return '';
  screen.setAttribute('style', 'position:relative;width:100%;height:100%;background:#05080b;overflow:hidden');
  const body = screen.querySelector('[data-state="ready"]');
  if (body) {
    body.setAttribute('style', `${body.getAttribute('style') || ''};overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(20px, env(safe-area-inset-bottom, 0px))`);
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => screen.appendChild(b.cloneNode(true)));
  }
  return screen.outerHTML;
}

export default function Review({ worldId, onNav, onOpenNav, onAssignDeliverable, target }) {
  // Files handed in from a chat "Review"/"Review all" ARE the queue — show exactly
  // those, live from the message. Otherwise the global review queue loads.
  const injected = useMemo(
    () => (target?.files?.length ? reviewItemsFromFiles(target.files, target.project) : null),
    [target],
  );
  const { state, data, actions } = useReview(worldId || 'aom', injected);
  const [screen, setScreen] = useState('pick'); // pick | read
  const [pickedId, setPickedId] = useState(null);
  const { pins, addPin } = usePins(pickedId, worldId || 'aom');

  const picked = useMemo(() => pickedId ? data.queue.items.find((i) => i.id === pickedId) : null, [pickedId, data.queue.items]);

  const onOpenDeliverable = useCallback((id) => {
    setPickedId(id);
    setScreen('read');
    actions.openDeliverable(id);
  }, [actions]);

  // Catch-up → Review: open the specific deliverable the user tapped. The card carries
  // only the filename (+ its project), so match it against the real review queue (whose
  // items carry real paths). If it's in the queue, jump straight into the read view; if
  // not (e.g. an older file outside the queue window), stay on the pick list instead of
  // stranding the viewer on "Loading the file…". Applied once per target.
  const targetAppliedRef = useRef(null);
  useEffect(() => {
    // Chat "Review all": open the first of the handed-in files straight away.
    if (injected && injected.length) {
      const key = `files:${injected.map((i) => i.id).join(',')}`;
      if (targetAppliedRef.current === key) return;
      targetAppliedRef.current = key;
      onOpenDeliverable(injected[0].id);
      return;
    }
    if (!target?.name) return;
    const key = `${target.name}|${target.project || ''}`;
    if (targetAppliedRef.current === key) return;
    const items = data.queue.items;
    if (!items.length) return; // queue still loading — retry when it lands
    const base = (p) => String(p || '').split('/').pop();
    const match = items.find((i) => base(i.id) === target.name && (!target.project || i.whoRaw === target.project))
      || items.find((i) => base(i.id) === target.name);
    targetAppliedRef.current = key;
    if (match) onOpenDeliverable(match.id);
  }, [target, injected, data.queue.items, onOpenDeliverable]);

  const pickListHtml = useMemo(() => composeReviewScreen(reviewRaw, { mobile: true, pick: 2 }), []);
  const readHtml = useMemo(() => composeReviewScreen(reviewRaw, { mobile: true, pick: 1 }), []);

  // read-view ref + pin-creation binding. These hooks MUST run on EVERY render (both the
  // 'pick' and 'read' screens), so they live ABOVE the `if (screen === 'pick')` early return.
  // They used to sit below it, so switching pick→read added two hooks mid-life and tripped
  // React's Rules of Hooks (error #310) — the component threw and the screen showed the
  // "hit a snag" boundary the instant you opened a file. (R2)
  const readRef = useRef(null);

  // Bind a click handler to the mobile viewer for pin creation. On the pick screen the read
  // DOM isn't mounted, so the query finds nothing and the effect no-ops; it re-runs and binds
  // once we enter the read screen (screen/pickedId in deps).
  useEffect(() => {
    if (screen !== 'read') return undefined;
    const viewer = readRef.current?.querySelector('[data-state="ready"]');
    if (!viewer) return undefined;

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
  }, [addPin, screen, pickedId]);

  const pickListAliases = { 'queue.items': 'item', 'item': 'item' };
  const readAliases = {
    'queue.items': 'item',
    'deliverable.pins': 'pin',
    'deliverable.comments': 'comment',
    'item': 'item',
    'pin': 'pin',
    'comment': 'comment',
  };

  if (screen === 'pick') {
    const pickData = {
      ...data,
      queue: {
        ...data.queue,
        isReady: data.queue.isReady === 'on' ? 'on' : 'off',
        isPipeline: data.queue.isPipeline === 'on' ? 'on' : 'off',
      },
    };
    const pickActions = {
      nav: (target) => target === 'back' ? onNav?.('back') : onNav?.(target),
      openNav: onOpenNav,
      search: () => { /* stub for now */ },
      setQueueFilter: (f) => actions.setQueueFilter(f),
      openDeliverable: onOpenDeliverable,
      loadMore: () => actions.loadMore(),
    };
    return (
      <TemplateScreen html={pickListHtml} data={pickData} actions={pickActions} aliases={pickListAliases} state={state} style={{ width: '100%', height: '100%' }} />
    );
  }

  // read + decide screen with pin support
  const readData = {
    ...data,
    queue: {
      ...data.queue,
      items: data.queue.items.map((i) => ({ ...i, open: i.id === pickedId ? 'on' : 'off' })),
    },
    deliverable: {
      ...data.deliverable,
      pins: pins.map((p) => ({
        id: p.id,
        n: p.n,
        x: p.x,
        y: p.y,
      })),
      comments: pins.map((p) => ({
        id: p.id,
        n: p.n,
        text: p.text,
        anchor: p.anchor,
      })),
      openCount: pins.length,
      notesWord: pins.length === 1 ? 'note' : 'notes',
      // Drives .mpinbar.is-none: hide the whole pin-comment bar when there are no pins,
      // so the decision buttons stay the hero (no ghost "0 pin-comments" bar).
      pinState: pins.length ? 'has' : 'none',
    },
  };
  const readActions = {
    nav: (target) => {
      if (target === 'back') {
        setScreen('pick');
        setPickedId(null);
      } else {
        onNav?.(target);
      }
    },
    openNav: onOpenNav,
    search: () => { /* stub */ },
    openDeliverable: onOpenDeliverable,
    openPin: (id) => {
      const pin = pins.find((p) => p.id === id);
      if (pin) {
        console.log('[Review mobile] opened pin:', pin.n, pin.text);
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

  return (
    <div ref={readRef} style={{ width: '100%', height: '100%' }}>
      <TemplateScreen html={readHtml} data={readData} actions={readActions} aliases={readAliases} state={state} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
