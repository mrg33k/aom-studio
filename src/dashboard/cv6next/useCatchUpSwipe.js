// Catch-up card swipe (smoothness-blitz #12).
// Adapt the useChatSwipe pattern to catch-up cards at Home top.
// Left swipe advances to the next card, right swipe goes back.
// Adds momentum + snap feel.

import { useEffect, useRef } from 'react';
import { gestureStartsOnInteractiveControl } from './useChatSwipe.js';

const MIN_DISTANCE = 48;
const MAX_ANGLE_RATIO = 0.6;
const MAX_DURATION = 600;

export function useCatchUpSwipe({ enabled, onNext, onPrev, containerRef }) {
  const start = useRef(null);
  const nextRef = useRef(onNext);
  const prevRef = useRef(onPrev);
  nextRef.current = onNext;
  prevRef.current = onPrev;

  useEffect(() => {
    if (!enabled) return undefined;

    const getContainer = () => {
      if (containerRef?.current) return containerRef.current;
      // Fallback: find the catch-up card area in the DOM
      return document.querySelector('[data-cv6] [data-screen="home-mobile"] .catchup-deck, [data-cv6] .cv6-catchup-cards');
    };

    const onTouchStart = (e) => {
      if (e.touches?.length !== 1) { start.current = null; return; }
      const container = getContainer();
      if (!container) { start.current = null; return; }
      // Only handle swipes that start within the catch-up card area
      if (!container.contains(e.target)) { start.current = null; return; }
      if (gestureStartsOnInteractiveControl(e.target)) { start.current = null; return; }
      const t = e.touches[0];
      start.current = { x: t.clientX, y: t.clientY, at: Date.now() };
    };

    const onTouchEnd = (e) => {
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

      // Left swipe (dx < 0) = advance to next card
      // Right swipe (dx > 0) = go back to previous card
      if (dx < 0) nextRef.current?.();
      else prevRef.current?.();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, containerRef]);
}
