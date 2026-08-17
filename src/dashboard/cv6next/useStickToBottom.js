// useStickToBottom — THE one stick-to-bottom implementation for chat scroll
// (R-SMOOTHNESS Round G). Extracted from ChatLifecycle (the most complete of
// the three prior copies) so desktop and mobile can never drift apart again.
//
// Carried learnings, all load-bearing:
//   - len-guard: the thread polls every 3s and hands back a fresh array each
//     time; identical count = identical re-render = never move the scroll.
//   - first load ('prev === 0') snaps instantly; a live turn follows smoothly;
//     otherwise re-pin only when the reader is already near the bottom.
//   - the pill shows only when the user deliberately scrolled away and no turn
//     is live (a live turn auto-follows, so the pill would flicker).
//   - liveKey/contentKey: steps and the streaming draft grow scrollHeight
//     WITHOUT changing the message count — the len-guard alone would strand
//     the view mid-draft. Followed only while awaiting, via rAF so layout has
//     happened.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const ROOM_SCROLL_PREFIX = 'cv6.chatScroll.';
const roomScrollPositions = new Map();

function scrollPositionKey(roomKey) {
  const key = String(roomKey || '').trim();
  return key ? `${ROOM_SCROLL_PREFIX}${key}` : '';
}

function readRoomScrollPosition(roomKey) {
  const key = scrollPositionKey(roomKey);
  if (!key) return null;
  if (roomScrollPositions.has(key)) return roomScrollPositions.get(key);
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!parsed || !Number.isFinite(parsed.top) || !Number.isFinite(parsed.fromBottom)) return null;
    roomScrollPositions.set(key, parsed);
    return parsed;
  } catch { return null; }
}

function writeRoomScrollPosition(roomKey, el) {
  const key = scrollPositionKey(roomKey);
  if (!key || !el) return;
  const position = {
    top: Math.max(0, el.scrollTop),
    fromBottom: Math.max(0, el.scrollHeight - el.scrollTop - el.clientHeight),
  };
  roomScrollPositions.delete(key);
  roomScrollPositions.set(key, position);
  if (roomScrollPositions.size > 64) roomScrollPositions.delete(roomScrollPositions.keys().next().value);
  if (typeof sessionStorage !== 'undefined') {
    try { sessionStorage.setItem(key, JSON.stringify(position)); } catch { /* per-tab continuity still works */ }
  }
}

export default function useStickToBottom({
  roomKey,
  itemsLength,
  awaiting,
  liveKey = '',
  contentKey = '',
  pillThreshold = 240,
  followThreshold = 200,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const restorePendingRef = useRef(true);
  const restoreRoomRef = useRef(roomKey);
  const [showJump, setShowJump] = useState(false);

  if (restoreRoomRef.current !== roomKey) {
    restoreRoomRef.current = roomKey;
    restorePendingRef.current = true;
  }

  const followTail = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);
  const jumpToLatest = useCallback(() => followTail('smooth'), [followTail]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    // Browsers can emit a scroll event for the new room's initial scrollTop=0
    // before our two-frame restoration runs. Never let that erase the saved read.
    if (!el || restorePendingRef.current) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    writeRoomScrollPosition(roomKey, el);
    setShowJump(!awaiting && fromBottom > pillThreshold);
  }, [awaiting, pillThreshold, roomKey]);

  // Route/back navigation unmounts the mobile room. A passive cleanup runs after
  // the node has been detached (and can observe scrollTop === 0), so capture the
  // live node and persist it during layout cleanup, before DOM removal.
  useLayoutEffect(() => {
    const roomScroller = scrollRef.current;
    return () => {
      if (!restorePendingRef.current) writeRoomScrollPosition(roomKey, roomScroller);
    };
  }, [roomKey]);

  const prevLenRef = useRef(0);
  useEffect(() => { prevLenRef.current = 0; }, [roomKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = itemsLength || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!el || !len) return;
    if (len === prev) return;
    if (prev === 0) {
      const saved = readRoomScrollPosition(roomKey);
      let settleFrame = 0;
      const layoutFrame = requestAnimationFrame(() => {
        // Message grouping, fonts, and attachment placeholders all affect the first
        // layout. A second frame restores after those synchronous measurements land.
        settleFrame = requestAnimationFrame(() => {
          const current = scrollRef.current;
          if (!current) return;
          if (saved && saved.fromBottom > followThreshold) {
            current.scrollTo({
              top: Math.min(saved.top, Math.max(0, current.scrollHeight - current.clientHeight)),
              behavior: 'auto',
            });
            setShowJump(saved.fromBottom > pillThreshold);
          } else {
            followTail('auto');
          }
          restorePendingRef.current = false;
        });
      });
      return () => {
        cancelAnimationFrame(layoutFrame);
        if (settleFrame) cancelAnimationFrame(settleFrame);
      };
    }
    if (awaiting) { followTail('smooth'); return; }
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (fromBottom < followThreshold) followTail('smooth');
  }, [itemsLength, roomKey, awaiting, followTail, followThreshold]);

  useEffect(() => {
    if (!awaiting) return undefined;
    const frame = requestAnimationFrame(() => followTail('auto'));
    return () => cancelAnimationFrame(frame);
  }, [awaiting, liveKey, contentKey, followTail]);

  return { scrollRef, bottomRef, onScroll, showJump, jumpToLatest, followTail };
}
