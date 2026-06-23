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
    root.innerHTML = html || '';
    // Handlers forward to the current actions ref, so the latest handler always runs
    // even though we bound once and don't re-bind on every actions identity change.
    const forward = {};
    for (const n of Object.keys(actionsRef.current || {})) forward[n] = (...args) => actionsRef.current?.[n]?.(...args);
    const cleanup = bindTemplate(root, { data: data || {}, actions: forward, state, aliases: aliases || {} });
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, sig, state, aliasSig]);

  return <div ref={ref} data-cv6="" className={className} style={style} />;
}

export default TemplateScreen;
