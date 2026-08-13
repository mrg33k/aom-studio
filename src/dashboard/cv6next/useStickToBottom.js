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
import { useCallback, useEffect, useRef, useState } from 'react';

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
  const [showJump, setShowJump] = useState(false);

  const followTail = useCallback((behavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);
  const jumpToLatest = useCallback(() => followTail('smooth'), [followTail]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowJump(!awaiting && fromBottom > pillThreshold);
  }, [awaiting, pillThreshold]);

  const prevLenRef = useRef(0);
  useEffect(() => { prevLenRef.current = 0; }, [roomKey]);
  useEffect(() => {
    const el = scrollRef.current;
    const len = itemsLength || 0;
    const prev = prevLenRef.current;
    prevLenRef.current = len;
    if (!el || !len) return;
    if (len === prev) return;
    if (prev === 0 || awaiting) { followTail(prev === 0 ? 'auto' : 'smooth'); return; }
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
