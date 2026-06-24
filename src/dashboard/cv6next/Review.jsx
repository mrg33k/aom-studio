// cv6next — Review tool, mobile. Two screens: pick list and read+decide.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useCallback } from 'react';
import { useReview } from './data/useReview.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import reviewRaw from './templates/review.html?raw';
import statesRaw from './templates/states-extra.html?raw';

function composeReviewScreen(raw, { mobile = true, pick = 0 } = {}) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const nodes = doc.querySelectorAll('[data-cv6][data-screen*="review"]');
  const screen = [...nodes].find((n) => n.getAttribute('data-screen') === `review-mobile`) || nodes[pick];
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

export default function Review({ worldId, onNav, onOpenNav }) {
  const { state, data, actions } = useReview(worldId || 'aom');
  const [screen, setScreen] = useState('pick'); // pick | read
  const [pickedId, setPickedId] = useState(null);

  const picked = useMemo(() => pickedId ? data.queue.items.find((i) => i.id === pickedId) : null, [pickedId, data.queue.items]);

  const onOpenDeliverable = useCallback((id) => {
    setPickedId(id);
    setScreen('read');
    actions.openDeliverable(id);
  }, [actions]);

  const pickListHtml = useMemo(() => composeReviewScreen(reviewRaw, { mobile: true, pick: 2 }), []);
  const readHtml = useMemo(() => composeReviewScreen(reviewRaw, { mobile: true, pick: 1 }), []);

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
    };
    return <TemplateScreen html={pickListHtml} data={pickData} actions={pickActions} aliases={pickListAliases} state={state} style={{ width: '100%', height: '100%' }} />;
  }

  // read + decide screen
  const readData = {
    ...data,
    queue: {
      ...data.queue,
      items: data.queue.items.map((i) => ({ ...i, open: i.id === pickedId ? 'on' : 'off' })),
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
    openPin: (id) => { /* stub for now */ },
    openComments: () => { /* stub */ },
    approve: (id) => actions.approve(id),
    requestChanges: (id) => {
      const notes = prompt('What changes are needed?');
      if (notes) actions.requestChanges(id, notes);
    },
    sendChecklist: (id) => actions.sendChecklist(id),
  };

  return <TemplateScreen html={readHtml} data={readData} actions={readActions} aliases={readAliases} state={state} style={{ width: '100%', height: '100%' }} />;
}
