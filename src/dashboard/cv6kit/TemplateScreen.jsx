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

import { useRef, useLayoutEffect } from 'react';
import { bindTemplate } from './templateEngine.js';

export function TemplateScreen({ html, data, actions, state = 'ready', aliases, className = '', style }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    root.innerHTML = html || '';
    const cleanup = bindTemplate(root, { data: data || {}, actions: actions || {}, state, aliases: aliases || {} });
    return cleanup;
  }, [html, data, actions, state, aliases]);

  return <div ref={ref} data-cv6="" className={className} style={style} />;
}

export default TemplateScreen;
