// cv6next — Review tool, mobile. Two screens: pick list and read+decide.
// Built from wired/tools/review.html + review.json, fed by real useReview.
// No design changes, only data wiring.

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useReview, reviewItemsFromFiles } from './data/useReview.js';
import { usePins } from './data/usePins.js';
import { TemplateScreen } from '../cv6kit/TemplateScreen.jsx';
import { useReviewPinUI } from './ReviewPins.jsx';
import { ReviewChangesOverlay, compileChanges } from './ReviewChanges.jsx';
import { usePdfDocs } from './data/pdfDocView.js';
import { useDocxDocs } from './data/docxDocView.js';
import { useHtmlDocs } from './data/htmlDocView.js';
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
  screen.setAttribute('style', 'position:relative;width:100%;height:100%;background:var(--ground, #05080b);overflow:hidden');
  const body = screen.querySelector('[data-state="ready"]');
  if (body) {
    body.setAttribute('style', `${body.getAttribute('style') || ''};overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:max(20px, env(safe-area-inset-bottom, 0px))`);
    const sd = new DOMParser().parseFromString(statesRaw, 'text/html');
    sd.querySelectorAll('[data-state="loading"], [data-state="error"], [data-state="empty"]').forEach((b) => screen.appendChild(b.cloneNode(true)));
  }
  // De-cage the read view's media window. The template sizes the viewer for a TEXT
  // excerpt: .doc height:392px wrapping a 320px overflow:auto body host. A vertical
  // 9:16 video (plus the 46px scrub bar, the ONLY play control) rendered below the
  // fold of BOTH nested cages — mobile showed a clipped frozen frame with no way to
  // play, which read as "videos don't load." One scroll window (.doc, sized to the
  // phone screen) instead of two; the body host flows at its natural height.
  const docEl = screen.querySelector('.doc');
  if (docEl) {
    // 290px of bottom chrome since R15b: header + chips + pin bar + the two-row
    // decision bar (verdict trio 48px + quiet Assign utility row 34px).
    docEl.setAttribute('style', String(docEl.getAttribute('style') || '').replace(/height:\s*392px/, 'height:calc(100dvh - 290px)'));
  }
  const bodyHost = screen.querySelector('[data-cv6-keep="review-body"]');
  if (bodyHost) {
    bodyHost.setAttribute('style', String(bodyHost.getAttribute('style') || '').replace(/height:\s*320px;\s*overflow:\s*auto;?/, ''));
  }
  return screen.outerHTML;
}

export default function Review({ worldId, onNav, onOpenNav, onAssignDeliverable, target }) {
  // Files handed in from a chat "Review"/"Review all" ARE the queue — show exactly
  // those, live from the message. Otherwise the global review queue loads.
  const injected = useMemo(
    () => (target?.files?.length ? reviewItemsFromFiles(target.files, target.project, target.missionSlug || '') : null),
    [target],
  );
  // A file parsed from message text can carry a name but NO url; reviewItemsFromFiles
  // drops it (nothing to fetch), which used to strand the user on the pick list instead
  // of the file they clicked. Fall back to resolving that filename against the queue.
  const targetName = target?.name
    || ((!injected?.length && target?.files?.length) ? (target.files.find((f) => f?.name)?.name || null) : null);
  const { state, data, actions, notice } = useReview(worldId, injected);
  const [screen, setScreen] = useState('pick'); // pick | read
  const [pickedId, setPickedId] = useState(null);
  const { pins, addPin, deletePin } = usePins(pickedId, worldId);

  const picked = useMemo(() => pickedId ? data.queue.items.find((i) => i.id === pickedId) : null, [pickedId, data.queue.items]);

  // "Changes" overlay (R-ASSIGN part D): every comment with its timecode + Send back
  // to agent, routed through the assign path with the full list attached.
  const [changesOpen, setChangesOpen] = useState(false);
  useEffect(() => { setChangesOpen(false); }, [pickedId]);
  const assignExtra = useCallback((pinsNow) => ({
    artifactTitle: picked?.title || String(pickedId || '').split('/').pop() || '',
    project: picked?.whoRaw || '',
    details: pinsNow.length ? `Requested changes:\n${compileChanges(pinsNow)}` : '',
  }), [picked, pickedId]);

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
    if (!targetName) return;
    const key = `${targetName}|${target?.project || ''}`;
    if (targetAppliedRef.current === key) return;
    // Match against the FULL queue (itemsAll), not the windowed display list — the
    // target may sit past the first page.
    const items = data.queue.itemsAll || data.queue.items;
    if (!items.length) return; // queue still loading — retry when it lands
    const base = (p) => String(p || '').split('/').pop();
    const match = items.find((i) => base(i.id) === targetName && (!target?.project || i.whoRaw === target.project))
      || items.find((i) => base(i.id) === targetName);
    targetAppliedRef.current = key;
    if (match) onOpenDeliverable(match.id);
  }, [target, targetName, injected, data.queue.items, onOpenDeliverable]);

  const pickListHtml = useMemo(() => composeReviewScreen(reviewRaw, { mobile: true, pick: 2 }), []);
  const readHtml = useMemo(() => composeReviewScreen(reviewRaw, { mobile: true, pick: 1 }), []);

  // Keep the selected tree node in view on the pick list (full registry = the
  // selection can land outside the tree's scroll window; rebuilds reset scroll).
  const pickWrapRef = useRef(null);
  useEffect(() => {
    if (screen !== 'pick') return;
    const sel = pickWrapRef.current?.querySelector('.trow.is-d0on, .trow.is-d1on');
    sel?.scrollIntoView({ block: 'nearest' });
  });

  // read-view ref + pin interaction. These hooks MUST run on EVERY render (both the
  // 'pick' and 'read' screens), so they live ABOVE the `if (screen === 'pick')` early return.
  // They used to sit below it, so switching pick→read added hooks mid-life and tripped
  // React's Rules of Hooks (error #310). (R2)
  // Pin-comments delegate from this stable wrapper (a listener on the template's inner DOM
  // dies on TemplateScreen's first innerHTML rebuild) and use the design popover composer.
  const readRef = useRef(null);
  const { overlay: pinOverlay, openPinById } = useReviewPinUI({
    wrapRef: readRef, pins, addPin, deletePin, enabled: screen === 'read',
  });
  usePdfDocs(readRef, screen === 'read');
  useDocxDocs(readRef, screen === 'read');
  useHtmlDocs(readRef, screen === 'read');

  const pickListAliases = { 'queue.items': 'item', 'queue.tree': 'node', 'queue.filters': 'filter', 'item': 'item', 'node': 'node', 'filter': 'filter' };

  const readAliases = {
    'queue.items': 'item',
    'deliverable.pins': 'pin',
    'deliverable.comments': 'comment',
    'item': 'item',
    'pin': 'pin',
    'comment': 'comment',
  };

  // review-loop: transient verdict feedback — shown on both screens since Dismiss
  // bounces back to the pick list. When the notice carries an action (the dismiss
  // toast's Undo, R15b design gate), the toast is a real control, not just status.
  const noticeToast = notice ? (
    <div style={{
      // Bottom-anchored snackbar (mobile standard): the top slot overlapped the
      // pick list's first tree row and swallowed its taps while visible.
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
  ) : null;

  if (screen === 'pick') {
    const pickActions = {
      nav: (target) => target === 'back' ? onNav?.('back') : onNav?.(target),
      openNav: onOpenNav,
      selectQueueNode: (id) => actions.selectQueueNode(id),
      setTypeFilter: (id) => actions.setTypeFilter(id),
      openDeliverable: onOpenDeliverable,
      loadMore: () => actions.loadMore(),
      // Empty state's "Browse waiting" (shared states fragment fires emptyAction):
      // jump to the full waiting set. Was unwired — a dead click.
      emptyAction: () => actions.browseWaiting(),
    };
    return (
      <div ref={pickWrapRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        <TemplateScreen html={pickListHtml} data={data} actions={pickActions} aliases={pickListAliases} state={state} style={{ width: '100%', height: '100%' }} />
        {noticeToast}
      </div>
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
      hasNotes: pins.length ? 'yes' : 'no',
      // Drives .mpinbar.is-none: hide the whole pin-comment bar when there are no pins,
      // so the decision buttons stay the hero (no ghost "0 pin-comments" bar).
      pinState: pins.length ? 'has' : 'none',
    },
  };
  const readActions = {
    nav: (target) => {
      if (target === 'back') {
        // R15b defect 6: the back control is ORIGIN-AWARE. Entered from a
        // conversation's file card ("Review" on a file → injected files) or a
        // catch-up card (named target)? Back returns THERE via the app history
        // pop — not to the Review index. Only a direct toolbar entry (no
        // target) backs out to the pick list as before.
        if (injected?.length || targetName) { onNav?.('back'); return; }
        setScreen('pick');
        setPickedId(null);
      } else {
        onNav?.(target);
      }
    },
    openNav: onOpenNav,
    search: () => { /* stub */ },
    // Download the reviewed file (any type) with its real filename.
    download: (id) => actions.download(id),
    openDeliverable: onOpenDeliverable,
    // "Browse waiting" from the read view's empty branch: back to the pick list,
    // scoped to the full waiting set.
    emptyAction: () => {
      setScreen('pick');
      setPickedId(null);
      actions.browseWaiting();
    },
    // A pin marker (or the pin-comment bar) opens the comment popover with delete.
    openPin: (id) => openPinById(id),
    openComments: () => { /* stub */ },
    // review-loop: a verdict removes the item from the queue for real now, so the
    // read screen would render blank if we stayed — decide, then back to the list.
    approve: (id) => {
      actions.approve(id);
      setScreen('pick');
      setPickedId(null);
    },
    // review-loop: Dismiss drops the item without approval and returns to the
    // pick list (the item is optimistically gone from the queue).
    dismiss: (id) => {
      actions.dismiss(id);
      setScreen('pick');
      setPickedId(null);
    },
    // WD40-R3: always open the Changes overlay — the prompt() fallback is gone.
    // The overlay has a textarea for typed notes so feedback flows without pins.
    requestChanges: () => { setChangesOpen(true); },
    sendChecklist: (id) => actions.sendChecklist(id),
    assignAgent: (id) => onAssignDeliverable?.(id, assignExtra(pins)),
  };

  return (
    <div ref={readRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <TemplateScreen html={readHtml} data={readData} actions={readActions} aliases={readAliases} state={state} style={{ width: '100%', height: '100%' }} />
      {noticeToast}
      {pinOverlay}
      {changesOpen && (
        <ReviewChangesOverlay
          pins={pins}
          title={picked?.title || ''}
          onSendBack={(extraNotes = '') => {
            // WD40-R3: merge pin comments + typed notes into one dispatch message.
            const compiled = compileChanges(pins, extraNotes);
            if (pickedId && compiled) actions.requestChanges(pickedId, compiled);
            setChangesOpen(false);
            onAssignDeliverable?.(pickedId, assignExtra(pins));
          }}
          onClose={() => setChangesOpen(false)}
        />
      )}
    </div>
  );
}
