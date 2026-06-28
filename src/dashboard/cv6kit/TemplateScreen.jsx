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

import { useRef, useLayoutEffect, useMemo } from 'react';
import { bindTemplate } from './templateEngine.js';

export function TemplateScreen({ html, data, actions, state = 'ready', aliases, className = '', style }) {
  const ref = useRef(null);
  // Keep the latest actions in a ref so bound click handlers always call the current
  // handler WITHOUT needing to re-bind (re-binding resets the DOM).
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Re-mount + re-bind only when the CONTENT (not identity) of data/aliases changes,
  // or html/state changes. The dashboard data pipe hands back fresh arrays every ~2.5s
  // realtime tick even when nothing changed; binding on object identity rebuilt the DOM
  // under the user's finger and made taps miss. A content signature makes it stable.
  let sig = '';
  try { sig = JSON.stringify(data ?? {}); } catch { sig = ''; }
  const aliasSig = useMemo(() => { try { return JSON.stringify(aliases ?? {}); } catch { return ''; } }, [aliases]);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;

    // Preserve live "host" nodes across the innerHTML re-bind. A node marked
    // data-cv6-keep="<id>" is a React portal target (the chat composer, the quick
    // thread): wiping + recreating it forces createPortal to re-point, which REMOUNTS
    // the portaled input — typed text survives (it lives in persistent React state) but
    // the live DOM focus is lost, so every realtime tick kicks the user out of the box.
    // We graft the SAME node object back over its fresh placeholder so the portal never
    // re-points, and restore focus + caret synchronously (still inside this layout effect,
    // before paint) to cover the brief detach during the swap — no keystroke is dropped.
    const kept = new Map();
    root.querySelectorAll('[data-cv6-keep]').forEach((n) => {
      const k = n.getAttribute('data-cv6-keep');
      if (k) kept.set(k, n);
    });
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

    root.innerHTML = html || '';

    // Swap each fresh placeholder for the preserved live node (same object → portal stays mounted).
    for (const [k, node] of kept) {
      const placeholder = root.querySelector(`[data-cv6-keep="${k}"]`);
      if (placeholder && placeholder !== node) placeholder.replaceWith(node);
    }

    // Handlers forward to the current actions ref, so the latest handler always runs
    // even though we bound once and don't re-bind on every actions identity change.
    const forward = {};
    for (const n of Object.keys(actionsRef.current || {})) forward[n] = (...args) => actionsRef.current?.[n]?.(...args);
    const cleanup = bindTemplate(root, { data: data || {}, actions: forward, state, aliases: aliases || {} });

    if (focusRestore && focusRestore.el && root.contains(focusRestore.el)) {
      try {
        focusRestore.el.focus({ preventScroll: true });
        if (focusRestore.sel) focusRestore.el.setSelectionRange(focusRestore.sel.start, focusRestore.sel.end);
      } catch { /* element no longer focusable — fine */ }
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, sig, state, aliasSig]);

  return <div ref={ref} data-cv6="" className={className} style={style} />;
}

export default TemplateScreen;
