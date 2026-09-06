# Corner v2 punch list

Comp-match findings by the orchestrator, design (`Corner v2.dc.html`, Work state, 1440x900) vs built.
`id | screen | what differs | design value | built value | file:line (if known) | owner round | status`

| id | screen | what differs | design | built | where | round | status |
|---|---|---|---|---|---|---|---|
| P001 | sidebar | No "+ New" (accent, full width) and "Project +" buttons under the search field | two 40px buttons in a row under search | nothing between search and RECENT | `src/v2/WorkspaceSidebar.tsx` | R5-desktop | open |
| P002 | sidebar | Mission rows lack the status dot (green = live, grey = ready/done) before the title | 6px dot, `--success` / `--faint` | 2-letter monogram circle | `WorkspaceSidebar.tsx` mission row | R5-desktop | open |
| P003 | sidebar | Expanded project lacks the `Files · N` row and the `+ New mission` row beneath its missions | folder icon row 36px with count right; muted `+ New mission` row | absent | `WorkspaceSidebar.tsx` | R5-desktop | open |
| P004 | sidebar | Project rows lack the collapse/expand chevron and the needs-you dot sits before the chevron | chevron right, 16px, `--faint`; amber dot left of chevron | no chevron; projects always expanded | `WorkspaceSidebar.tsx` | R5-desktop | open |
| P005 | sidebar | Recent rows use a doc icon, not a monogram circle; rows are 38px | 16px doc icon `--muted` | 24px monogram circle | `WorkspaceSidebar.tsx` recent row | R5-desktop | open |
| P006 | sidebar | Project rows show a single-letter square mark in the project tint, not a two-letter circle | 24px rounded-square mark, tint fill, one letter | 24px circle, two letters | `WorkspaceSidebar.tsx` | R5-desktop | open |
| P007 | conversation header | Design shows the agent/project avatar + `Aster / Spring launch deck` breadcrumb on one line + a `Working` status dot at the right; built stacks path over title and shows an arrow icon button at the right | avatar 24px, breadcrumb 15px, status 12px `--success` | stacked, no avatar, arrow button | `src/v2/ConversationSurface.tsx` header | R5-desktop | open |
| P008 | composer | Missing `Record` button (mic icon, chip) and the agent label beside the send button; placeholder reads "Message Aster" not "Tell Aster what to make next" | chip 32px left of send; label `--faint` 12px | absent | `ConversationSurface.tsx` / `Composer.tsx` | R5-desktop | open |
| P009 | visual header | Missing full-screen (⤢) and more (…) buttons beside Review | two 36px icon buttons | Review only | `src/v2/VisualWindow.tsx` | R4-desktop-visual-window | open |
| P010 | sidebar footer | Missing bell (notifications) and gear (settings) beside the identity row | two 16px icon buttons at the right | identity only | `WorkspaceSidebar.tsx` footer | R5-desktop (Task 5) | open |
| P011 | sidebar | `General` appears in both RECENT and PROJECTS; recent should list recently active conversations (missions/projects by last activity), not repeat the project list | recent = last-active missions | recent = project list | `src/lib/workspace.ts` recent derivation | R5-desktop | open |
| P012 | conversation | `/` does not auto-select the most recent project (worker skipped: it broke 11 legacy tests that still boot `/` as the room list) | `/` = last active project or empty home | `/` = legacy Home | `src/routes/Home.tsx` | R5-desktop (after Task 6 removes the legacy Home tests) | open |
