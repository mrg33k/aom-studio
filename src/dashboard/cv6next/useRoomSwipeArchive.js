// useRoomSwipeArchive — TOP-20 #8 swipe-to-clean
// ArchiveRoom exists (RoomSettingsDialog + TreeContextMenu archiveNode) but had no gesture.
// This hook adds a left-swipe reveal on the Home rail's room rows (recent + project/mission)
// that drives the same PATCH /api/dashboard/project-update is_active false (and
// mission-update for missions). After the PATCH, filteredRooms in useHomeData
// hides the room because activeProjectSlugs no longer contains it, plus an
// optimistic collapse + undo toast so the action feels instant.
//
// Rows are rendered via TemplateScreen (innerHTML), so we cannot wrap them in React.
// We delegate from the stable homeWrapRef and lazily wrap each row in
// .cv6-room-swipe-wrap / .cv6-room-swipe-inner on first touch, then drive
// width (not transform) so the filename stays anchored and legible while the
// 88px Archive panel is revealed behind it — same mechanics as ChatLifecycle's
// SwipeFileRow (width shrink, not slide), but delegated.
//
// Long-press is NOT repurposed: TreeContextMenu already uses 550ms long-press
// for its Rename/Move/Archive menu on the same surface. Movement >8px clears
// that timer, so a swipe never triggers the menu and a stationary hold still
// does. The swipe threshold is 56px to snap open, 110px far-swipe to auto-archive.

import { useEffect, useRef, useState, useCallback } from 'react';
import { authFetch } from '../lib/authFetch';

const PANEL_W = 88;
const OPEN_THRESH = 56;
const CLOSE_THRESH = 28;
const FAR_THRESH = 110;
const VERTICAL_RATIO = 0.6;

function isInteractive(target) {
  if (!target || target.nodeType !== 1) return false;
  return Boolean(target.closest?.('[data-swipe-guard],[data-cv6-gesture-lock],button,a[href],input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[role="slider"]'));
}

function bareMission(s) {
  return String(s || '').split(':').pop();
}

function ensureStructure(rowEl) {
  // If already wrapped, return existing handles.
  const existingInner = rowEl.closest('.cv6-room-swipe-inner');
  if (existingInner) {
    const wrap = existingInner.parentElement;
    if (wrap && wrap.classList.contains('cv6-room-swipe-wrap')) {
      return {
        wrap,
        inner: existingInner,
        panel: wrap.querySelector('.cv6-room-swipe-archive-panel'),
        btn: wrap.querySelector('.cv6-room-swipe-archive-btn'),
        row: rowEl,
      };
    }
  }
  // Create wrapper. The row itself keeps its own border/background/radius;
  // the wrapper is the overflow clip and the panel sits behind the inner.
  const wrap = document.createElement('div');
  wrap.className = 'cv6-room-swipe-wrap';
  const panel = document.createElement('div');
  panel.className = 'cv6-room-swipe-archive-panel';
  panel.setAttribute('data-swipe-guard', '');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cv6-room-swipe-archive-btn';
  btn.setAttribute('aria-label', 'Archive room');
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></svg><span>Archive</span>';
  panel.appendChild(btn);
  const inner = document.createElement('div');
  inner.className = 'cv6-room-swipe-inner';
  inner.setAttribute('data-swipe-guard', '');
  // Insert wrap before row, then move row into inner.
  rowEl.parentNode.insertBefore(wrap, rowEl);
  wrap.appendChild(panel);
  wrap.appendChild(inner);
  inner.appendChild(rowEl);
  return { wrap, inner, panel, btn, row: rowEl };
}

export function useRoomSwipeArchive({ wrapRef, worldId, resolveHit, refetch, setMissionReload }) {
  const worldRef = useRef(worldId);
  const resolveRef = useRef(resolveHit);
  const refetchRef = useRef(refetch);
  const reloadRef = useRef(setMissionReload);
  useEffect(() => { worldRef.current = worldId; }, [worldId]);
  useEffect(() => { resolveRef.current = resolveHit; }, [resolveHit]);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);
  useEffect(() => { reloadRef.current = setMissionReload; }, [setMissionReload]);

  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const openWrapRef = useRef(null);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (toastTimerRef.current) { clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
  }, []);

  const undoArchive = useCallback(async () => {
    const t = toast;
    if (!t) return;
    dismissToast();
    const wid = t.worldId || worldRef.current;
    try {
      if (t.kind === 'project' || t.kind === 'mission') {
        await authFetch('/api/dashboard/project-update', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: t.projectSlug, is_active: true, client_id: wid }),
        });
      } else {
        await authFetch('/api/dashboard/room-title', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: wid, agent: t.slug, hidden: false }),
        });
      }
      try { localStorage.removeItem('cv6.archivedAt.' + t.key); } catch {}
      window.dispatchEvent(new CustomEvent('cv6:room-archived', { detail: { roomId: t.key, undo: true } }));
      refetchRef.current?.();
      reloadRef.current?.((k) => k + 1);
    } catch {}
  }, [toast, dismissToast]);

  // Core archive driver — mirrors RoomSettingsDialog.archiveRoom + TreeContextMenu.archiveNode
  // but with optimistic collapse and an undo toast instead of a confirm dialog. The far
  // swipe (dx < -FAR) auto-fires; the snapped-open panel requires a tap on the Archive
  // button. Both paths land here.
  const doArchive = useCallback(async (target, ctx) => {
    const wid = worldRef.current;
    if (!wid || !target) return;
    const isProj = target.kind === 'project';
    const isMission = target.kind === 'mission';
    // Agent rows are not swipable via this path (resolveHit returns null for them),
    // but handle generically if ever reached.
    const key = isMission ? (target.treeId || `${target.projectSlug}:${target.missionSlug}`) : (target.projectSlug || target.slug || '');
    const name = target.name || target.projectSlug || key;
    const kind = isMission ? 'mission' : isProj ? 'project' : 'agent';

    // Optimistic UI: collapse the wrap so the row vanishes before the poll returns.
    // filteredRooms in useHomeData will keep it hidden afterwards because
    // activeProjectSlugs is derived from projectRooms (supabase-status drops
    // is_active=false). The collapse is purely for snappiness.
    if (ctx && ctx.wrap) {
      ctx.wrap.classList.add('is-archiving');
      ctx.wrap.classList.remove('is-open');
      const inner = ctx.inner;
      if (inner) { inner.style.transition = 'width 0.22s ease'; inner.style.width = '100%'; }
      // Fade + slide the whole wrap, then zero its height so the list reflows.
      ctx.wrap.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
      ctx.wrap.style.opacity = '0';
      ctx.wrap.style.transform = 'translateX(-10px)';
      setTimeout(() => {
        if (!ctx.wrap.isConnected) return;
        ctx.wrap.style.transition = 'height 0.28s ease, margin 0.28s ease, opacity 0.2s ease';
        ctx.wrap.style.height = '0px';
        ctx.wrap.style.margin = '0';
        ctx.wrap.style.overflow = 'hidden';
        ctx.wrap.style.pointerEvents = 'none';
      }, 260);
    }
    if (openWrapRef.current === ctx?.wrap) openWrapRef.current = null;

    let ok = false;
    try {
      if (isProj || isMission) {
        // TOP-20 #8 spec + TreeContextMenu contract: swipe-to-clean archives the
        // PROJECT via PATCH /api/dashboard/project-update is_active false.
        // The same row can represent a mission recent (m:tail) but its archive
        // is still the parent project (the only lifecycle flag filteredRooms +
        // activeProjectSlugs + supabase-status respect). RoomSettingsDialog's
        // mission branch once tried PATCH mission-update is_active, but that
        // endpoint only handles rename (name required) — so the project path
        // is the one that actually hides the row.
        const r = await authFetch('/api/dashboard/project-update', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: target.projectSlug, is_active: false, client_id: wid }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d.ok === false) throw new Error(d?.error || 'Could not archive');
        ok = true;
      } else {
        const r = await authFetch('/api/dashboard/room-title', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: wid, agent: target.slug || target.projectSlug, hidden: true }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || d.ok === false) throw new Error(d?.error || 'Could not archive');
        ok = true;
      }
    } catch (e) {
      // Roll back optimistic collapse on failure so the row reappears.
      if (ctx && ctx.wrap) {
        ctx.wrap.classList.remove('is-archiving');
        ctx.wrap.style.opacity = '';
        ctx.wrap.style.transform = '';
        ctx.wrap.style.height = '';
        ctx.wrap.style.margin = '';
        ctx.wrap.style.overflow = '';
        ctx.wrap.style.pointerEvents = '';
        if (ctx.inner) ctx.inner.style.width = '';
      }
      // Surface a transient error as a toast-like message (reuses same slot).
      setToast({ kind: 'error', name, error: e?.message || 'Archive failed' });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 3000);
      return;
    }

    if (ok) {
      try { localStorage.setItem('cv6.archivedAt.' + key, Date.now().toString()); } catch {}
      window.dispatchEvent(new CustomEvent('cv6:room-archived', { detail: { roomId: key } }));
      refetchRef.current?.();
      reloadRef.current?.((k) => k + 1);
      // Undo toast — 5s window, same pattern as file-save receipt.
      setToast({
        kind,
        name,
        slug: isMission ? (target.missionSlug || bareMission(target.treeId)) : (target.projectSlug || ''),
        projectSlug: target.projectSlug || '',
        missionSlug: target.missionSlug || '',
        key,
        worldId: wid,
      });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 5200);
    }
  }, []);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;

    // Close any open swipe when the user scrolls or taps elsewhere.
    const closeOpen = () => {
      const w = openWrapRef.current;
      if (!w) return;
      const inner = w.querySelector('.cv6-room-swipe-inner');
      if (inner) { inner.style.transition = 'width 0.22s ease'; inner.style.width = '100%'; }
      w.classList.remove('is-open');
      openWrapRef.current = null;
    };

    let active = null; // { wrap, inner, panel, btn, row, target, startX, startY, startTime }
    let isDragging = false;

    const findRow = (target) => {
      const el = target.closest?.('[data-cv6-arg]');
      if (!el || !root.contains(el)) return null;
      // Only these row classes are swipe-to-clean. Others (e.g. agent rows
      // inside the accordion, checklist rows) keep their own gestures.
      if (!el.classList.contains('mresumecard') && !el.classList.contains('recentrow') && !el.classList.contains('restrow') && !el.classList.contains('projrow') && !el.classList.contains('missrow')) return null;
      // Don't hijack the same row while its archive collapse is animating.
      const maybeWrap = el.closest('.cv6-room-swipe-wrap');
      if (maybeWrap && maybeWrap.classList.contains('is-archiving')) return null;
      return el;
    };

    // Mouse/keyboard users should not have to discover a touch gesture. Add a
    // quiet action inside each archiveable desktop row; it calls the exact same
    // recoverable archive driver and never reparents the row, so the row's own
    // click remains intact.
    const enhanceDesktopRows = () => {
      if (!window.matchMedia?.('(min-width: 900px)').matches) return;
      root.querySelectorAll('[data-cv6-arg]').forEach((row) => {
        if (!findRow(row) || row.querySelector(':scope > .cv6-desktop-archive-btn')) return;
        const target = resolveRef.current?.(row);
        if (!target) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cv6-desktop-archive-btn';
        button.setAttribute('aria-label', `Archive ${target.name || 'room'}`);
        button.setAttribute('title', 'Archive room');
        button.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/></svg>';
        button.addEventListener('click', async (event) => {
          event.preventDefault();
          event.stopPropagation();
          button.disabled = true;
          button.setAttribute('aria-busy', 'true');
          await doArchive(target, null);
          button.disabled = false;
          button.removeAttribute('aria-busy');
        });
        row.appendChild(button);
      });
    };
    enhanceDesktopRows();
    const rowObserver = new MutationObserver(enhanceDesktopRows);
    rowObserver.observe(root, { childList: true, subtree: true });

    const onPointerDown = (e) => {
      // Only primary pointer, and only touch/pen — mouse drags on desktop
      // should still work for manual testing, so allow mouse with button 0
      // but ignore right-clicks. The long-press menu only cares about touch,
      // so a mouse swipe won't conflict.
      if (e.button !== 0) return;
      const row = findRow(e.target);
      if (!row) return;
      if (isInteractive(e.target)) return;
      const target = resolveRef.current?.(row, e);
      // No archiveable target (e.g. agent recent) -> not swipable.
      if (!target) return;
      // If another row is open, close it — but if the down is on that same
      // open row's panel button, let the button click handle it instead of
      // starting a new drag.
      const hitBtn = e.target.closest?.('.cv6-room-swipe-archive-btn');
      if (hitBtn) return; // button's own click will archive
      if (openWrapRef.current) {
        const open = openWrapRef.current;
        // Tap on an open row should close it, not start a new swipe.
        const openInner = open.querySelector('.cv6-room-swipe-inner');
        const isOnOpenRow = row.closest('.cv6-room-swipe-wrap') === open;
        if (isOnOpenRow) {
          // Defer close to pointerup so a tap doesn't also fire openRecent.
          // Mark that we should swallow the click.
          active = { wrap: open, inner: openInner, row, target, startX: e.clientX, startY: e.clientY, startTime: Date.now(), isCloseTap: true };
          return;
        }
        closeOpen();
      }
      // A plain tap must leave the DOM untouched until its click fires. Reparenting
      // the row here used to make Chromium cancel the synthetic click between
      // pointerdown and pointerup, so only the tiny trailing arrow appeared to open
      // desktop rooms. The swipe structure is created lazily once horizontal intent
      // is proven in onPointerMove.
      active = { row, target, startX: e.clientX, startY: e.clientY, startTime: Date.now(), isCloseTap: false };
      isDragging = false;
      // Capture so we keep receiving moves even if the finger leaves the row.
      try { e.target.setPointerCapture?.(e.pointerId); } catch {}
    };

    const onPointerMove = (e) => {
      if (!active) return;
      const dx = e.clientX - active.startX;
      const dy = e.clientY - active.startY;
      if (!isDragging) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO) { active = null; return; }
        isDragging = true;
        const { wrap, inner, panel, btn } = ensureStructure(active.row);
        Object.assign(active, { wrap, inner, panel, btn });
        // Bind/update the archive control only after this interaction is a swipe.
        if (btn._swipeBound) btn.removeEventListener('click', btn._swipeBound);
        const onBtnClick = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          doArchive(btn._swipeTarget || active?.target, btn._swipeCtx || { wrap, inner, row: active?.row });
        };
        btn._swipeTarget = active.target;
        btn._swipeCtx = { wrap, inner, row: active.row };
        btn._swipeBound = onBtnClick;
        btn.addEventListener('click', onBtnClick);
        // Once we commit to horizontal, claim the gesture so the parent
        // scroll and the long-press menu don't steal it.
        active.wrap.classList.add('is-dragging');
      }
      // If this was a close-tap on an open row, a horizontal drag should close.
      if (active.isCloseTap) {
        if (Math.abs(dx) > 8) {
          active.isCloseTap = false;
        } else {
          return;
        }
      }
      // Left swipe reveals; right swipe closes an open row.
      if (dx < 0) {
        // Shrink inner from the right: width = calc(100% + dx) where dx negative.
        // Clamp so we never shrink past the panel width.
        const clamped = Math.max(-PANEL_W, dx);
        active.inner.style.transition = 'none';
        active.inner.style.width = `calc(100% + ${clamped}px)`;
      } else if (dx > 0 && active.wrap.classList.contains('is-open')) {
        const openOffset = -PANEL_W;
        const newDx = openOffset + dx;
        if (newDx < 0) {
          active.inner.style.transition = 'none';
          active.inner.style.width = `calc(100% + ${newDx}px)`;
        } else {
          active.inner.style.transition = 'none';
          active.inner.style.width = '100%';
        }
      }
      // Prevent vertical scroll while horizontal swipe is active.
      if (isDragging && Math.abs(dx) > Math.abs(dy)) {
        e.preventDefault?.();
      }
    };

    const onPointerUp = (e) => {
      if (!active) return;
      const dx = e.clientX - active.startX;
      const dt = Date.now() - active.startTime;
      const wasCloseTap = active.isCloseTap;

      // Close-tap: tap on an already-open row closes it and swallows the click.
      if (wasCloseTap && Math.abs(dx) < 10 && dt < 400) {
        const { wrap, inner } = active;
        inner.style.transition = 'width 0.22s ease';
        inner.style.width = '100%';
        wrap.classList.remove('is-open', 'is-dragging');
        openWrapRef.current = null;
        // Swallow the click that would otherwise open the room.
        e.preventDefault?.();
        e.stopPropagation?.();
        active = null;
        isDragging = false;
        return;
      }

      // A normal tap never created or moved a wrapper. Let the template engine's
      // existing click handler open the room.
      if (!isDragging) { active = null; return; }

      const { wrap, inner, target } = active;
      const wasOpen = wrap.classList.contains('is-open');

      // Far swipe auto-archives without needing the button.
      if (dx < -FAR_THRESH) {
        inner.style.transition = 'width 0.22s ease';
        inner.style.width = `calc(100% - ${PANEL_W}px)`;
        wrap.classList.add('is-open');
        openWrapRef.current = wrap;
        // Small delay so the snap is visible before the collapse.
        setTimeout(() => doArchive(target, { wrap, inner, row: active.row }), 140);
        active = null;
        isDragging = false;
        return;
      }

      inner.style.transition = 'width 0.22s ease';
      if (dx < -OPEN_THRESH) {
        inner.style.width = `calc(100% - ${PANEL_W}px)`;
        wrap.classList.add('is-open');
        openWrapRef.current = wrap;
      } else if (dx > CLOSE_THRESH && wasOpen) {
        inner.style.width = '100%';
        wrap.classList.remove('is-open');
        openWrapRef.current = null;
      } else {
        // Snap back to prior state.
        if (wasOpen) inner.style.width = `calc(100% - ${PANEL_W}px)`;
        else { inner.style.width = '100%'; wrap.classList.remove('is-dragging'); }
      }
      wrap.classList.remove('is-dragging');
      active = null;
      isDragging = false;
    };

    const onPointerCancel = () => {
      if (!active) return;
      const { wrap, inner } = active;
      const wasOpen = wrap.classList.contains('is-open');
      inner.style.transition = 'width 0.22s ease';
      if (wasOpen) inner.style.width = `calc(100% - ${PANEL_W}px)`;
      else inner.style.width = '100%';
      wrap.classList.remove('is-dragging');
      active = null;
      isDragging = false;
    };

    // Click guard: when a row is open, a click on the row should close, not open.
    const onClickCapture = (e) => {
      const w = openWrapRef.current;
      if (!w) return;
      const row = e.target.closest?.('[data-cv6-arg]');
      if (!row) return;
      const rowWrap = row.closest('.cv6-room-swipe-wrap');
      if (rowWrap === w) {
        // Click on the open row itself (not the archive button) -> close and swallow.
        if (!e.target.closest?.('.cv6-room-swipe-archive-btn')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          closeOpen();
        }
      } else {
        // Click elsewhere -> close the open row, allow the new click through.
        closeOpen();
      }
    };

    root.addEventListener('pointerdown', onPointerDown, { passive: true });
    root.addEventListener('pointermove', onPointerMove, { passive: false });
    root.addEventListener('pointerup', onPointerUp, { passive: true });
    root.addEventListener('pointercancel', onPointerCancel, { passive: true });
    root.addEventListener('click', onClickCapture, true);
    // Also close on scroll (user scrolled the list with an open row).
    const onScroll = () => closeOpen();
    root.addEventListener('scroll', onScroll, true);
    document.addEventListener('scroll', onScroll, true);

    return () => {
      rowObserver.disconnect();
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerCancel);
      root.removeEventListener('click', onClickCapture, true);
      root.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [wrapRef, doArchive]);

  return { toast, dismissToast, undoArchive };
}
