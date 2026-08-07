// Mobile swipe navigation inside a chat (Patrik 2026-08-06).
//
// His spec, taken literally: swipe LEFT to go back to Home, swipe RIGHT to go to the
// next chat in "Pick up where you left off".
//
// That is the inverse of what the workspace canvas does natively — it is a horizontal
// scroll-snap pager with Home first and chats to its right, so a rightward finger
// already walks back toward Home. He was asked which way he wanted and chose his own
// wording, so the native pager is turned OFF on mobile and these gestures drive
// navigation instead. Leaving both live would fight each other on every swipe.
//
// Feel, in his words: "clean and snappy if I was doing it fast so that people don't feel
// like they're waiting, but I don't want it to blink to where you don't even notice that
// it happened." So this is not instant — it is a short, eased transition long enough to
// read as movement. A flick and a slow drag get the SAME duration, because a transition
// that changes length with gesture speed reads as jitter.
//
// Anti-hijack walk: we check ancestors for horizontal scrollability so we never steal a
// swipe that belongs to a file strip, code block, or wide table. The canvas itself has
// overflow-x:hidden on mobile so it does NOT trigger the bail (hidden is not auto/scroll).

import { useEffect, useRef } from 'react';

// Below this a swipe is a tap or a scroll, not navigation.
const MIN_DISTANCE = 56;
// A gesture more vertical than this is the thread scrolling; never hijack it.
const MAX_ANGLE_RATIO = 0.6;
// Ignore a slow drag that happens to travel far — that is a scroll, not a flick.
const MAX_DURATION = 700;

export function useChatSwipe({ enabled, onHome, onNextChat }) {
  const start = useRef(null);
  const homeRef = useRef(onHome);
  const nextRef = useRef(onNextChat);
  homeRef.current = onHome;
  nextRef.current = onNextChat;

  // Surface enabled state to the console so we can instrument it during testing.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[useChatSwipe] enabled:', enabled);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    const onStart = (e) => {
      if (e.touches?.length !== 1) { start.current = null; return; }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, at: Date.now(), target: e.target };
    };

    const onEnd = (e) => {
      const s = start.current;
      start.current = null;
      if (!s) return;
      const t = e.changedTouches?.[0];
      if (!t) return;

      const dx = t.clientX - s.x;
      const dy = t.clientY - s.y;
      if (Math.abs(dx) < MIN_DISTANCE) return;
      if (Math.abs(dy) > Math.abs(dx) * MAX_ANGLE_RATIO) return;
      if (Date.now() - s.at > MAX_DURATION) return;

      // Never steal a swipe that belongs to something horizontally scrollable inside
      // the thread — a files strip, a code block, a wide table.
      // NOTE: overflow-x:hidden is NOT in this check — only auto/scroll trigger the
      // bail. The canvas itself has hidden on mobile so it won't short-circuit here.
      let node = s.target;
      while (node && node !== document.body) {
        if (node.scrollWidth > node.clientWidth + 8) {
          const overflow = getComputedStyle(node).overflowX;
          if (overflow === 'auto' || overflow === 'scroll') return;
        }
        node = node.parentElement;
      }

      // Direction confirmed backwards on real device (Patrik 2026-08-06, task 0d632c0a).
      // dx<0 = finger moved left = content scrolls right = navigate to next chat (right of canvas).
      // dx>0 = finger moved right = content scrolls left = navigate to Home (left of canvas).
      console.log('[useChatSwipe] gesture dx:', dx, dx < 0 ? '→ nextChat' : '→ home'); // unconditional for lab verification
      if (dx < 0) nextRef.current?.();   // finger left  -> next recent chat
      else homeRef.current?.();          // finger right -> Home
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [enabled]);
}
