// CV6 TemplateScreen — corner:corner-ui-cv6
//
// Mounts a Claude Design fill-in template (raw design markup) and binds real data +
// actions behind it via the template engine. The markup is injected verbatim and
// scoped under [data-cv6] so the design stylesheet applies; we never re-draw it.
//
//   <TemplateScreen html={inboxHtml} state={status}
//                   data={{ emails, unread }}
//                   actions={{ openThread: id => open(id), nav: t => goTo(t) }} />
//
// `html` is the design fragment string (framing already stripped by the handoff).
// `data` fills data-bind / data-each. `state` selects the data-state branch
// (ready | empty | loading | error). `actions` maps data-action names to handlers.
//
// ── Scroll-stability engine (scroll-arch, 2026-07-06) ─────────────────────────
// The dashboard data pipe hands back fresh arrays every ~2.5s realtime tick while
// agents are active. Each rebind wipes+rebuilds the screen via innerHTML, which reset
// EVERY scrollable container to scrollTop 0 (Patrik's #1 frustration: "everything that
// scrolls jumps back to the top") and swapped the DOM node under a mid-click finger for
// a reordered one (H2: wrong room opens). This engine now:
//   1. Preserves the scroll of every scrolled descendant across each rebind, keyed by a
//      stable data-scroll-key (or structural path). The live capture-phase scroll listener
//      keeps the saved value at the user's LATEST scroll, so restore never fights them.
//   2. Short-circuits: never rebinds when html/data-signature/state/aliases are unchanged.
//   3. Holds rebinds during a pointer gesture (pointerdown → the resulting click), so the
//      row the user pressed is the SAME node object that receives the click — a reorder
//      can no longer land the click on a different room.

import { useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { bindTemplate } from './templateEngine.js';

// Stable key for a scrolled descendant so its position can be re-applied to the
// equivalent node after an innerHTML rebind. An explicit data-scroll-key wins;
// otherwise the structural child-index path from the template root — stable because
// the SAME html string is re-injected every bind, and data-each only changes a scroll
// container's descendants, never the container's own position in its ancestor chain.
function scrollKeyFor(el, root) {
  const explicit = el.getAttribute && el.getAttribute('data-scroll-key');
  if (explicit) return 'k:' + explicit;
  let path = '';
  let n = el;
  while (n && n !== root && n.parentElement) {
    const p = n.parentElement;
    const idx = Array.prototype.indexOf.call(p.children, n);
    path = path ? `${idx}.${path}` : String(idx);
    n = p;
  }
  return 'p:' + path;
}

function elementAtKey(root, key) {
  if (key.startsWith('k:')) {
    const v = key.slice(2);
    try { return root.querySelector(`[data-scroll-key="${CSS.escape(v)}"]`); } catch { return null; }
  }
  const parts = key.slice(2).split('.').filter(Boolean).map(Number);
  let n = root;
  for (const idx of parts) {
    if (!n || !n.children || !n.children[idx]) return null;
    n = n.children[idx];
  }
  return n;
}

// data-cv6-keep hosts (chat composer, quick thread) are grafted across rebinds — the
// same node object survives, so they own their own scroll. Never snapshot/restore them.
function insideKeep(el, root) {
  let n = el;
  while (n && n !== root) {
    if (n.hasAttribute && n.hasAttribute('data-cv6-keep')) return true;
    n = n.parentElement;
  }
  return false;
}

export function TemplateScreen({ html, data, actions, state = 'ready', aliases, className = '', style }) {
  const ref = useRef(null);
  // Keep the latest actions in a ref so bound click handlers always call the current
  // handler WITHOUT needing to re-bind (re-binding resets the DOM).
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // A content signature of the data (fresh arrays every realtime tick share the same
  // content). Binding on object identity rebuilt the DOM under the user's finger and made
  // taps miss; a content signature makes it stable.
  let sig = '';
  try { sig = JSON.stringify(data ?? {}); } catch { sig = ''; }
  const aliasSig = useMemo(() => { try { return JSON.stringify(aliases ?? {}); } catch { return ''; } }, [aliases]);

  // Latest props for the deferred-flush path (gesture-end handlers fire in a stale render).
  const propsRef = useRef();
  propsRef.current = { html, data, state, aliases, sig, aliasSig };

  // Persistent per-instance engine state.
 const scrollMemRef = useRef(new Map()); // scrollKey -> {top,left}, the user's latest scroll
  const bindCleanupRef = useRef(null);      // teardown for the current bindTemplate listeners
  const lastDescRef = useRef(null);         // signature of the last APPLIED bind (short-circuit)
  const pendingRef = useRef(false);         // a rebind was skipped during a gesture — flush on end
  const gestureRef = useRef(false);         // pointer gesture (down..click) in progress

  // Apply current props to the DOM: preserve scroll + kept nodes + focus, wipe,
  // re-inject, graft kept nodes, re-bind, restore. The ONLY place innerHTML is written.
  const rebind = () => {
    const root = ref.current;
    if (!root) return;
    const { html: h, data: d, state: st, aliases: al } = propsRef.current;
    const mem = scrollMemRef.current;

    // 1. Snapshot the scroll of every scrolled descendant (belt to the live listener,
    //    e.g. a container scrolled programmatically without a scroll event yet). Pure
    //    reads before any write → a single reflow.
    root.querySelectorAll('*').forEach((el) => {
      const keyed = el.getAttribute && el.getAttribute('data-scroll-key');
      if ((el.scrollTop > 0 || el.scrollLeft > 0 || keyed) && !insideKeep(el, root)) {
        mem.set(scrollKeyFor(el, root), { top: el.scrollTop, left: el.scrollLeft });
      }
    });

    // 2. Preserve live "host" nodes (React portal targets). Wiping + recreating one
    //    forces createPortal to re-point → REMOUNTS the input (lost focus every tick).
    //    We graft the SAME node back over its fresh placeholder and restore focus + caret
    //    synchronously (before paint) so no keystroke is dropped.
    const kept = new Map();
    root.querySelectorAll('[data-cv6-keep]').forEach((n) => {
      const k = n.getAttribute('data-cv6-keep');
      if (k) kept.set(k, n);
    });
    // SCROLL-KEEP FIX (corner:corner-ui-cv6 2026-07-17): Chrome resets scrollTop to 0
    // when an element is detached from the DOM — even if the JS object is saved in a
    // variable. The data-cv6-keep graft preserves the DOM node but the scroll position
    // is lost the moment root.innerHTML wipes the parent chain. Snapshot it here (before
    // innerHTML) and restore it after grafting so .convo-thread never jumps to scrollTop 0.
    const keptScroll = new Map();
    for (const [k, node] of kept) {
      if (node.scrollTop > 0 || node.scrollLeft > 0) {
        keptScroll.set(k, { top: node.scrollTop, left: node.scrollLeft });
      }
    }
    let focusRestore = null;
    if (kept.size) {
      const active = document.activeElement;
      for (const node of kept.values()) {
        if (active && node.contains(active)) {
          const sel = (typeof active.selectionStart === 'number')
            ? { start: active.selectionStart, end: active.selectionEnd } : null;
          focusRestore = { el: active, sel };
          break;
        }
      }
    }

    // 3. Tear down the previous bind's listeners, then rebuild.
    if (bindCleanupRef.current) { bindCleanupRef.current(); bindCleanupRef.current = null; }
    root.innerHTML = h || '';
    for (const [k, node] of kept) {
      let placeholder = null;
      try { placeholder = root.querySelector(`[data-cv6-keep="${CSS.escape(k)}"]`); } catch { placeholder = null; }
      if (placeholder && placeholder !== node) placeholder.replaceWith(node);
    }
    // Restore scroll of kept nodes after graft (scrollTop was reset to 0 during detach).
    for (const [k, pos] of keptScroll) {
      const node = kept.get(k);
      if (!node) continue;
      if (pos.top > 0) node.scrollTop = pos.top;
      if (pos.left > 0) node.scrollLeft = pos.left;
    }

    // Handlers forward to the current actions ref, so the latest handler always runs
    // even though we bound once and don't re-bind on every actions identity change.
    const forward = {};
    for (const n of Object.keys(actionsRef.current || {})) forward[n] = (...args) => actionsRef.current?.[n]?.(...args);
    bindCleanupRef.current = bindTemplate(root, { data: d || {}, actions: forward, state: st, aliases: al || {} });

    if (focusRestore && focusRestore.el && root.contains(focusRestore.el)) {
      try {
        focusRestore.el.focus({ preventScroll: true });
        if (focusRestore.sel) focusRestore.el.setSelectionRange(focusRestore.sel.start, focusRestore.sel.end);
      } catch { /* element no longer focusable — fine */ }
    }

    // 4. Restore scroll to the equivalent fresh nodes. mem always holds the user's most
    //    recent scroll, so this never restores a value older than what they last did.
    for (const [key, pos] of mem) {
      const el = elementAtKey(root, key);
      if (!el) continue;
      if (pos.top > 0 && el.scrollHeight - el.clientHeight >= pos.top - 1) el.scrollTop = pos.top;
      if (pos.left > 0 && el.scrollWidth - el.clientWidth >= pos.left - 1) el.scrollLeft = pos.left;
    }
  };

  // Decide: apply now, short-circuit (nothing changed), or defer past the gesture.
  const maybeApply = () => {
    const root = ref.current;
    if (!root) return;
    const { html: h, sig: s, state: st, aliasSig: a } = propsRef.current;
    const desc = `${h} ${s} ${st} ${a}`;
    if (lastDescRef.current === desc && bindCleanupRef.current) return; // nothing changed
    if (gestureRef.current) { pendingRef.current = true; return; }      // don't remount mid-gesture
    lastDescRef.current = desc;
    pendingRef.current = false;
    rebind();
  };
  const maybeApplyRef = useRef(maybeApply);
  maybeApplyRef.current = maybeApply;

  // Main sync — mount + whenever content/html/state/aliases change. React's dep compare
  // is the first short-circuit; maybeApply's desc guard covers the deferred-flush path.
  useLayoutEffect(() => { maybeApplyRef.current(); }, [html, sig, state, aliasSig]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const clearDelayed = () => {
      root.querySelectorAll('.cv6-loading.is-delayed').forEach((el) => {
        el.classList.remove('is-delayed');
        const label = el.querySelector('.cv6-loading__label');
        const detail = el.querySelector('.cv6-loading__detail');
        if (label && label.dataset.defaultLabel) label.textContent = label.dataset.defaultLabel;
        if (detail) detail.hidden = true;
      });
    };
    if (state !== 'loading') {
      clearDelayed();
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const current = ref.current;
      if (!current) return;
      current.querySelectorAll('.cv6-loading').forEach((el) => {
        el.classList.add('is-delayed');
        const label = el.querySelector('.cv6-loading__label');
        const detail = el.querySelector('.cv6-loading__detail');
        if (label) {
          if (!label.dataset.defaultLabel) label.dataset.defaultLabel = label.textContent || '';
          label.textContent = el.getAttribute('data-delayed-label') || 'Still working';
        }
        if (detail) {
          detail.textContent = el.getAttribute('data-delayed-detail') || 'This is taking longer than expected. Corner will show the real state as soon as it settles.';
          detail.hidden = false;
        }
      });
    }, 10000);
    return () => {
      window.clearTimeout(timer);
      clearDelayed();
    };
  }, [state, sig]);

  // One-time wiring: live scroll capture + pointer-gesture guard + unmount teardown.
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    // Capture-phase scroll: record the user's latest scroll so restore never fights them.
    const onScroll = (e) => {
      const el = e.target;
      if (!el || el.nodeType !== 1 || !root.contains(el) || insideKeep(el, root)) return;
      scrollMemRef.current.set(scrollKeyFor(el, root), { top: el.scrollTop, left: el.scrollLeft });
    };
    document.addEventListener('scroll', onScroll, true);

    // Pointer gesture: from pointerdown to just after the resulting click, hold rebinds so
    // the row the user pressed is the same node object that receives the click (H2 wrong-room).
    let safety = null;
    const endGesture = () => {
      if (!gestureRef.current) return;
      gestureRef.current = false;
      if (safety) { clearTimeout(safety); safety = null; }
      if (pendingRef.current) maybeApplyRef.current();
    };
    const startGesture = () => {
      gestureRef.current = true;
      if (safety) clearTimeout(safety);
      safety = setTimeout(endGesture, 1200); // safety: never strand a hung gesture
    };
    const onUp = () => { setTimeout(endGesture, 0); }; // let the click dispatch on the intact node first
    root.addEventListener('pointerdown', startGesture, true);
    document.addEventListener('pointerup', onUp, true);
    document.addEventListener('pointercancel', endGesture, true);

    return () => {
      document.removeEventListener('scroll', onScroll, true);
      root.removeEventListener('pointerdown', startGesture, true);
      document.removeEventListener('pointerup', onUp, true);
      document.removeEventListener('pointercancel', endGesture, true);
      if (safety) clearTimeout(safety);
      if (bindCleanupRef.current) { bindCleanupRef.current(); bindCleanupRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} data-cv6="" className={className} style={style} />;
}

export default TemplateScreen;