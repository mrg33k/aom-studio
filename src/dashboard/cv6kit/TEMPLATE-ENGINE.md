# CV6 Template Engine

The piece that lets us run Claude Design's screens **as the app** without ever
re-drawing them. A design "fill-in template" is the design markup with labels added
(see `corner/missions/corner-ui-cv6/REQUEST-TO-CLAUDE-DESIGN-templates.md`). This
engine reads those labels and binds real data + actions. The look is never touched.

## Files
- `templateEngine.js` — `bindTemplate(root, { data, actions, state })` plus pure
  helpers (`resolvePath`, `parseEach`, `singularize`, `stateMatches`). No build step.
- `TemplateScreen.jsx` — React mount: injects the template string under `[data-cv6]`
  and binds it. Re-binds when `data` / `state` change.
- `__fixtures__/inbox-template.html` — a labeled sample (stands in for the pilot).

## Label vocabulary
| label | meaning |
|---|---|
| `data-bind="room.name"` | set this element's text (or `<img>`/`<input>` value) from data |
| `data-each="email in emails"` | repeat this element per array item (alias `email`); bare `data-each="emails"` auto-singularizes |
| `data-state="empty loading error"` | show this element only in one of those states |
| `data-action="approve"` | on click, call `actions.approve(arg, event)` |
| `data-arg="email.id"` | the value passed to the action (resolved from data) |
| `data-target="review"` | a static arg (used when there's no `data-arg`, e.g. nav) |

Resolution uses a scope stack: inside a `data-each` row the item shadows the root
data, so `email.subject` hits the item and `room.name` still hits the root.

## Use
```jsx
import { TemplateScreen } from './cv6kit/TemplateScreen.jsx';

<TemplateScreen
  html={inboxHtml}            // the design fragment string (framing already stripped)
  state={status}             // 'ready' | 'empty' | 'loading' | 'error'
  data={{ unread, emails }}
  actions={{
    openThread: (id) => openThread(id),
    resolve:    (id) => resolveEmail(id),
    nav:        (target) => goToTool(target),
  }}
/>
```

## Status
Built + unit-tested (22/22: helpers + binder against a fake DOM, 2026-06-22).
Awaiting the real pilot screen (Support inbox) to confirm the format end to end on
`/dashboard`. The each-alias convention may be tightened to explicit `x in xs` once we
see the pilot — adjust here, not in the design.
