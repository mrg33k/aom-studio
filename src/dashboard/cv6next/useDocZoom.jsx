// cv6next — zoom + pan + swipe-between-files for the file viewer.
// Shared by Review (mobile + desktop) and the chat file modal.
//
// Patrik 2026-08-07: "I need to be able to pinch to zoom on a file inside that
// window or swipe it left and right to look at the different files in the folder
// once I'm viewing a file" and, an hour later, "technically I need a way to zoom
// on desktop as well."
//
// WHAT IT TRANSFORMS: the `.doc` element — the whole reading surface, not the
// <img> inside it. That matters because review pins are absolutely positioned
// CHILDREN of .doc at x%/y%. Scaling the image alone would leave every pin
// stranded at its old spot; scaling .doc carries the pins with the artwork, so a
// comment stays on the thing it was pointing at. Pin markers would balloon to 6x
// with it, so .doc carries a --pz-inv custom property and cv6.css counter-scales
// the markers about their drop-tip — they stay the same size on screen and keep
// pointing at the same pixel.
//
// WHY WE TAKE OVER THE SCROLLER: while zoomed we set the .doc's parent to
// overflow:hidden and pan with our own translate. Letting the native scroller and
// a transform both move the content fights on every gesture (the parent scrolls
// AND the content translates, so the artwork moves twice as far as the finger).
// At scale 1 everything is handed straight back — the doc reads and scrolls
// exactly as it did before, so text documents are untouched by this.
//
// GESTURES
//   touch    two fingers pinch about the midpoint · one finger pans WHEN ZOOMED ·
//            one-finger horizontal flick at 1x = previous/next file
//   trackpad pinch (macOS sends it as ctrlKey+wheel) · two-finger scroll pans when zoomed
//   mouse    +/− /reset buttons · drag to pan when zoomed · + - 0 keys
//
// The swipe only fires at exactly 1x. Zoomed in, a horizontal drag is a pan —
// stealing it to change files would make a zoomed photo impossible to look around.

import { useEffect, useRef, useState, useCallback } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const STEP = 1.4;            // one button press / key press
// Swipe thresholds mirror useChatSwipe so the two gestures feel like one system.
const SWIPE_MIN = 56;        // below this it is a tap
const SWIPE_ANGLE = 0.6;     // more vertical than this = the page scrolling
const SWIPE_MAX_MS = 700;    // a slow drag that travels far is a scroll, not a flick

const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

// `drawing` = the red pen is armed. Zoom stays fully live (you zoom IN to circle a
// detail — disabling the hook would throw the zoom away at the moment you need it);
// only the gestures that would COMPETE with the pen stand down: one-finger pan,
// mouse-drag pan, and swipe-to-next-file. Pinch, wheel and the buttons keep working.
export function useDocZoom({ wrapRef, enabled = true, drawing = false, onSwipe, docSelector = '.doc' }) {
  const [scale, setScale] = useState(1);
  const [anchor, setAnchor] = useState(null); // {top,right} of the doc's top-right, for the controls
  // Everything the listeners touch lives on a ref: they bind once and must never
  // go stale, the same reason ReviewPins delegates from a stable wrapper.
  const st = useRef({ s: 1, x: 0, y: 0, doc: null, onSwipe, drawing });
  st.current.onSwipe = onSwipe;
  st.current.drawing = drawing;

  const findDoc = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    return wrap.querySelector(docSelector) || null;
  }, [wrapRef, docSelector]);

  // Push the current transform onto the element. Called on every gesture frame and
  // again whenever TemplateScreen rebuilds the DOM out from under us.
  const apply = useCallback(() => {
    const s = st.current;
    const doc = s.doc;
    if (!doc) return;
    if (s.s <= MIN_SCALE) { s.s = MIN_SCALE; s.x = 0; s.y = 0; }
    const par = doc.parentElement;
    // Hand the browser's own touch handling off whenever a gesture of ours owns the
    // surface: panning a zoomed image, or drawing a red circle across it. Without
    // this the browser claims the drag as a scroll and fires pointercancel halfway
    // through, so the ring stops following the finger mid-stroke.
    doc.style.touchAction = (s.s > 1 || s.drawing) ? 'none' : '';
    if (s.s > 1) {
      doc.style.transformOrigin = '0 0';
      doc.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.s})`;
      doc.style.setProperty('--pz-inv', String(1 / s.s));
      doc.style.willChange = 'transform';
      doc.setAttribute('data-pz-zoomed', '1');
      if (par && par.dataset.pzOverflow == null) {
        par.dataset.pzOverflow = par.style.overflow || '';
        par.style.overflow = 'hidden';
      }
    } else {
      doc.style.transform = '';
      doc.style.willChange = '';
      doc.style.removeProperty('--pz-inv');
      doc.removeAttribute('data-pz-zoomed');
      if (par && par.dataset.pzOverflow != null) {
        par.style.overflow = par.dataset.pzOverflow;
        delete par.dataset.pzOverflow;
      }
    }
  }, []);

  // Keep the artwork inside its window: centre it while it is smaller than the
  // frame, and stop either edge from being dragged into the middle once it is
  // bigger. Measured from live rects rather than computed from offsets, because
  // the doc's offsetParent differs between the mobile and desktop templates.
  const clampPan = useCallback(() => {
    const s = st.current;
    const doc = s.doc;
    const par = doc?.parentElement;
    if (!doc || !par || s.s <= 1) return;
    const pr = par.getBoundingClientRect();
    const dr = doc.getBoundingClientRect();
    if (dr.width <= pr.width) s.x += (pr.left + (pr.width - dr.width) / 2) - dr.left;
    else if (dr.left > pr.left) s.x += pr.left - dr.left;
    else if (dr.right < pr.right) s.x += pr.right - dr.right;
    if (dr.height <= pr.height) s.y += (pr.top + (pr.height - dr.height) / 2) - dr.top;
    else if (dr.top > pr.top) s.y += pr.top - dr.top;
    else if (dr.bottom < pr.bottom) s.y += pr.bottom - dr.bottom;
  }, []);

  // Zoom to `next`, keeping the content under (cx,cy) pinned to (cx,cy). With
  // transform-origin 0 0 the untransformed left edge sits at rect.left - x, so the
  // doc-local point under the cursor is (cx - rect.left) / s — solve for the new x
  // that puts that same local point back under the cursor at the new scale.
  const zoomAt = useCallback((next, cx, cy) => {
    const s = st.current;
    const doc = s.doc;
    if (!doc) return;
    const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    if (ns === s.s) return;
    const r = doc.getBoundingClientRect();
    const u = (cx - r.left) / s.s;
    const v = (cy - r.top) / s.s;
    s.x = cx - (r.left - s.x) - u * ns;
    s.y = cy - (r.top - s.y) - v * ns;
    s.s = ns;
    apply();
    clampPan();
    apply();
    setScale(ns);
  }, [apply, clampPan]);

  // Centre-anchored zoom for the buttons and keys (there is no cursor to keep).
  const zoomBy = useCallback((factor) => {
    const doc = st.current.doc;
    if (!doc) return;
    const par = doc.parentElement;
    const r = (par || doc).getBoundingClientRect();
    zoomAt(st.current.s * factor, r.left + r.width / 2, r.top + r.height / 2);
  }, [zoomAt]);

  const reset = useCallback(() => {
    const s = st.current;
    s.s = 1; s.x = 0; s.y = 0;
    apply();
    setScale(1);
  }, [apply]);

  // Re-find the doc and re-apply after every TemplateScreen rebuild, and keep the
  // control cluster parked on the doc's top-right corner. One 400ms tick plus a
  // mutation observer, the same belt-and-braces the video chrome uses — the
  // template engine wipes innerHTML on unrelated data ticks.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !enabled) return undefined;
    let disposed = false;
    const tick = () => {
      if (disposed) return;
      const doc = findDoc();
      if (doc !== st.current.doc) {
        // A different file (or a rebuilt node): drop back to 1x rather than
        // inheriting the last file's zoom, which lands you on a random crop.
        st.current.doc = doc;
        st.current.s = 1; st.current.x = 0; st.current.y = 0;
        setScale(1);
      }
      if (doc) {
        apply();
        // BOTTOM-right of the viewer frame, not the top: the template already parks
        // its "Click anywhere to comment" pill on the top-right and the two stacked
        // on top of each other on the live page. Bottom-right is also where a zoom
        // control belongs by convention (maps, PDF readers), and on mobile it sits
        // clear of both the pin bar and the verdict bar below the doc.
        const wr = wrap.getBoundingClientRect();
        const par = doc.parentElement;
        const dr = (par || doc).getBoundingClientRect();
        const bottom = Math.max(8, wr.bottom - dr.bottom + 12);
        const right = Math.max(8, wr.right - dr.right + 12);
        setAnchor((a) => (a && Math.abs(a.bottom - bottom) < 2 && Math.abs(a.right - right) < 2 ? a : { bottom, right }));
      } else {
        setAnchor(null);
      }
    };
    const iv = setInterval(tick, 400);
    const mo = new MutationObserver(tick);
    mo.observe(wrap, { childList: true, subtree: true });
    tick();
    return () => {
      disposed = true;
      clearInterval(iv);
      mo.disconnect();
      // Hand the scroller back on unmount — a stranded overflow:hidden would
      // leave the next screen unable to scroll.
      const doc = st.current.doc;
      const par = doc?.parentElement;
      if (par && par.dataset.pzOverflow != null) {
        par.style.overflow = par.dataset.pzOverflow;
        delete par.dataset.pzOverflow;
      }
      if (doc) { doc.style.transform = ''; doc.removeAttribute('data-pz-zoomed'); }
      st.current.doc = null;
    };
  }, [wrapRef, enabled, findDoc, apply]);

  // Arming/disarming the pen changes touch-action — land it now, not on the next tick.
  useEffect(() => { apply(); }, [drawing, apply]);

  // Touch: pinch, pan-when-zoomed, flick-to-change-file.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !enabled) return undefined;
    let pinch = null;   // { d0, s0 }
    let pan = null;     // { x, y }
    let tap = null;     // { x, y, at }
    let moved = false;

    // Tell the pin-comment listener to ignore the click that ends a pan or pinch,
    // otherwise letting go of a two-finger zoom drops a comment popover.
    const markMoved = () => {
      moved = true;
      wrap.dataset.pzMoved = '1';
      clearTimeout(markMoved.t);
      markMoved.t = setTimeout(() => { delete wrap.dataset.pzMoved; }, 400);
    };

    const onStart = (e) => {
      if (!st.current.doc) return;
      if (e.touches.length === 2) {
        pinch = { d0: dist(e.touches[0], e.touches[1]) || 1, s0: st.current.s };
        pan = null; tap = null;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        tap = st.current.drawing ? null : { x: t.clientX, y: t.clientY, at: Date.now() };
        pan = (st.current.s > 1 && !st.current.drawing) ? { x: t.clientX, y: t.clientY } : null;
        moved = false;
      }
    };

    const onMove = (e) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        markMoved();
        const d = dist(e.touches[0], e.touches[1]) || 1;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAt(pinch.s0 * (d / pinch.d0), cx, cy);
        return;
      }
      if (pan && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - pan.x;
        const dy = t.clientY - pan.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        e.preventDefault();
        markMoved();
        pan = { x: t.clientX, y: t.clientY };
        st.current.x += dx;
        st.current.y += dy;
        apply();
        clampPan();
        apply();
      }
    };

    const onEnd = (e) => {
      if (pinch) {
        pinch = null;
        // A pinch that lands just above 1x reads as "put it back".
        if (st.current.s < 1.06) reset();
        return;
      }
      const s = tap;
      const wasPan = !!pan;
      pan = null; tap = null;
      if (wasPan || moved || !s) return;
      // Flick between files — only at 1x, where a horizontal drag means nothing else.
      if (st.current.s > 1) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < SWIPE_MIN) return;
      if (Math.abs(dy) > Math.abs(dx) * SWIPE_ANGLE) return;
      if (Date.now() - s.at > SWIPE_MAX_MS) return;
      // Same mapping as useChatSwipe, confirmed on a real device: finger left =
      // content moves left = the NEXT item comes in from the right.
      markMoved();
      st.current.onSwipe?.(dx < 0 ? 'next' : 'prev');
    };

    wrap.addEventListener('touchstart', onStart, { passive: false });
    wrap.addEventListener('touchmove', onMove, { passive: false });
    wrap.addEventListener('touchend', onEnd, { passive: true });
    wrap.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      clearTimeout(markMoved.t);
      wrap.removeEventListener('touchstart', onStart);
      wrap.removeEventListener('touchmove', onMove);
      wrap.removeEventListener('touchend', onEnd);
      wrap.removeEventListener('touchcancel', onEnd);
    };
  }, [wrapRef, enabled, zoomAt, apply, clampPan, reset]);

  // Desktop: trackpad pinch (ctrlKey wheel), two-finger pan once zoomed, drag to pan.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !enabled) return undefined;

    const onWheel = (e) => {
      const doc = st.current.doc;
      const par = doc?.parentElement;
      // A wheel outside the viewer frame belongs to whatever it is over — on desktop
      // the wrapper spans the queue list and the side panel too, and stealing their
      // scroll would make the review queue unscrollable.
      if (!doc || !par || !par.contains(e.target)) return;
      if (e.ctrlKey || e.metaKey) {
        // macOS trackpad pinch arrives here — this IS desktop pinch-to-zoom.
        // deltaY is clamped because the two devices that land here are wildly
        // different: a trackpad pinch streams many events of ±1..10, while ctrl +
        // a mouse wheel sends one event of ±120. Unclamped, exp(1.2) makes a single
        // notch a 3.3x jump — measured on the live page, 196% to the 600% ceiling in
        // one click. ±40 caps a single event at ~1.5x and leaves the trackpad smooth.
        e.preventDefault();
        const d = Math.max(-40, Math.min(40, e.deltaY));
        zoomAt(st.current.s * Math.exp(-d * 0.01), e.clientX, e.clientY);
        return;
      }
      if (st.current.s > 1) {
        e.preventDefault();
        st.current.x -= e.deltaX;
        st.current.y -= e.deltaY;
        apply();
        clampPan();
        apply();
      }
    };

    let drag = null;
    const onDown = (e) => {
      if (e.button !== 0 || st.current.s <= 1 || st.current.drawing) return;
      const doc = st.current.doc;
      if (!doc || !doc.contains(e.target)) return;
      drag = { x: e.clientX, y: e.clientY, moved: false };
    };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      drag.moved = true;
      wrap.dataset.pzMoved = '1';
      drag.x = e.clientX; drag.y = e.clientY;
      st.current.x += dx;
      st.current.y += dy;
      apply();
      clampPan();
      apply();
    };
    const onUp = () => {
      if (drag?.moved) setTimeout(() => { delete wrap.dataset.pzMoved; }, 200);
      drag = null;
    };

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(STEP); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(1 / STEP); }
      else if (e.key === '0') { e.preventDefault(); reset(); }
    };

    wrap.addEventListener('wheel', onWheel, { passive: false });
    wrap.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      wrap.removeEventListener('wheel', onWheel);
      wrap.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [wrapRef, enabled, zoomAt, zoomBy, reset, apply, clampPan]);

  const zoomControls = (enabled && anchor) ? (
    <ZoomControls
      scale={scale}
      bottom={anchor.bottom}
      right={anchor.right}
      onIn={() => zoomBy(STEP)}
      onOut={() => zoomBy(1 / STEP)}
      onReset={reset}
    />
  ) : null;

  // `anchor` is exported so the caller can stack its own viewer tools (the red-pen
  // toggle) under the zoom cluster on the same corner, instead of each tool
  // guessing at the viewer's geometry from a different hardcoded offset.
  return { scale, anchor, zoomIn: () => zoomBy(STEP), zoomOut: () => zoomBy(1 / STEP), resetZoom: reset, zoomControls };
}

// The visible control, parked on the viewer's top-right corner. Present at 1x
// too — a zoom you can only discover by guessing a gesture is not a feature on
// desktop, which is exactly the gap Patrik hit.
function ZoomControls({ scale, bottom, right, onIn, onOut, onReset }) {
  const btn = {
    width: 28, height: 28, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: 0,
    borderRadius: 8, fontFamily: 'var(--font-sans, system-ui)',
  };
  const stop = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return (
    <div
      data-zoom-controls=""
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute', bottom, right, zIndex: 24,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'rgba(5,8,11,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 2,
        boxShadow: '0 6px 20px -8px rgba(0,0,0,.6)', userSelect: 'none',
      }}
    >
      <button type="button" style={{ ...btn, opacity: scale <= MIN_SCALE ? 0.35 : 1 }} onClick={stop(onOut)} aria-label="Zoom out" title="Zoom out ( − )">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M5 12h14" /></svg>
      </button>
      <button
        type="button"
        onClick={stop(onReset)}
        aria-label="Reset zoom"
        title="Reset zoom ( 0 )"
        style={{
          ...btn, width: 'auto', padding: '0 8px',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)', fontSize: 11, fontWeight: 600,
          color: scale > 1 ? '#fff' : 'rgba(255,255,255,0.55)',
        }}
      >
        {Math.round(scale * 100)}%
      </button>
      <button type="button" style={{ ...btn, opacity: scale >= MAX_SCALE ? 0.35 : 1 }} onClick={stop(onIn)} aria-label="Zoom in" title="Zoom in ( + )">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  );
}
