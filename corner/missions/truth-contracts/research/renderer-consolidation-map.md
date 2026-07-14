# Renderer Consolidation Map

**Mission:** `corner:truth-contracts`  
**Round:** R5-research  
**Date:** 2026-07-14  
**Scope:** Research only. No product code changes.

## Executive Finding

CV6 room chat does not have one message renderer. It has four live render branches over the same `useRoomThread()` message shape:

1. `ChatDesktop` full-chat bubbles plus `MsgExtras`.
2. Home desktop `Cv6QuickThread`.
3. Mobile full-chat `ChatLifecycle` `Message` plus `GoalTurn`.
4. Home Catch Up modal `InlineBubbleThread`.

There is also an adjacent fifth conversation renderer in Email/Support, `SupportThread`, which does not use the room-chat renderer at all. It is not one of the four room renderers Claude named, but it matters because Email/Support already drifted on agent-work truth and suggested-action display.

The highest-risk routing detail is `injectWorkSteps()` in `src/dashboard/cv6next/data/useRoomThread.js`. It converts plain agent replies into `blocks` by replacing `m.text` with a done `note` step when persisted work steps exist. That means a plain reply can bypass the normal text bubble path and render through the goal-thread/block path instead.

## Renderer Inventory

### 1. Desktop Full Chat: `ChatDesktop` / `MsgExtras`

**File:** `src/dashboard/cv6next/ChatDesktop.jsx`  
**Entry points:** `ChatDesktop()`, `PlainThread()`, `BubbleThread()`, `BubbleGroup()`, `MsgExtras()`  
**Mounted by:** `CornerCV6()` when desktop and `view === 'chatlist'` or `openedRoom` exists.  
**Surfaces:** Desktop Chat tool, including rooms rail, selected room thread, right drawer, Files shelf.  
**Routes in from:** `useRoomThread(worldId, selected)` for `messages`, `send`, `awaiting`, `liveSteps`; `useGoalThread()` for room goal. `useRoomThread()` already ran `injectWorkSteps()` before `ChatDesktop` sees messages.

**Rendering behavior:**

- Groups messages by day, then consecutive sender.
- Text uses `ChatMessageRenderer`.
- `MsgExtras` renders `AgentBlocks`, `MessageAttachments`, `ResultLinkCards`, and message-level chips.
- Live work uses shared `WorkingTurn`.
- Review handoff routes attachment review actions through `handleThreadAction()`.

### 2. Home Quick Thread: `Cv6QuickThread`

**File:** `src/dashboard/cv6next/CornerCV6.jsx`  
**Entry points:** `Cv6QuickThread()`, `groupChatMessages()`  
**Mounted by:** `Home()` inside `CornerCV6.jsx`, portaled into `[data-screen="convo"] .convo-thread`.  
**Surfaces:** Desktop Home third-column quick-reply room thread.  
**Routes in from:** `useRoomThread(worldId, knavOpenedRoom)` as `quickThread`; `useGoalThread(worldId, knavOpenedRoom)` as `quickGoal`; `injectWorkSteps()` has already transformed messages.

**Rendering behavior:**

- Groups consecutive messages by sender.
- Text uses `ChatMessageRenderer`.
- Renders `AgentBlocks`, `MessageAttachments`, `ResultLinkCards`.
- Renders shared `WorkingTurn` while awaiting.
- Does not render message-level `m.chips`.
- Uses portal + MutationObserver host tracking because the template rebinds.

### 3. Mobile Full Chat: `ChatLifecycle` `Message` + `GoalTurn`

**File:** `src/dashboard/cv6next/ChatLifecycle.jsx`  
**Entry points:** `ChatLifecycle()`, `Message()`, `GoalTurn()`, `renderItems()`, `FileGallery()`  
**Mounted by:** `Chat()` in `CornerCV6.jsx`, when mobile/non-desktop has an `openedRoom`.  
**Surfaces:** Mobile full Chat room.  
**Routes in from:** `Chat()` calls `useRoomThread(worldId, room)`, then passes transformed `messages`, `awaiting`, and `liveSteps`; `injectWorkSteps()` has already transformed messages.

**Rendering behavior:**

- Groups messages by day and folds older days.
- Normal text uses `ChatMessageRenderer`, but user text is plain `pre-wrap` instead of markdown.
- `GoalTurn` renders `GoalThreadBody` for messages with blocks.
- `renderItems()` collapses consecutive `m.isFile` rows into `FileGallery`, not `MessageAttachments`.
- Normal `Message` and `GoalTurn` both have explicit `ResultLinkCards` rendering because `injectWorkSteps()` can route completion replies into the blocks path.
- Does not render message-level `m.chips`.
- Live awaiting state is rendered as a synthetic `GoalTurn` with `liveStepsToBlocks()`, not `WorkingTurn`.

### 4. Catch Up Modal: `InlineBubbleThread`

**File:** `src/dashboard/cv6next/CornerCV6.jsx`  
**Entry points:** `InlineBubbleThread()`, used by `CatchUpModal()`  
**Mounted by:** `CatchUpModal()` inside desktop Home Catch Up flow.  
**Surfaces:** Home Catch Up modal conversation preview/reply surface.  
**Routes in from:** `CatchUpModal()` calls `useRoomThread(worldId, room)`, so `injectWorkSteps()` has already transformed messages.

**Rendering behavior:**

- Groups consecutive messages by sender.
- Text uses `ChatMessageRenderer`.
- Renders `ResultLinkCards` for agent messages.
- Does not render `AgentBlocks`, attachments, live work, goal turns, chips, or file galleries.
- It is the smallest and safest renderer to migrate first because it is read-only except for the modal composer outside the thread.

### Adjacent Email/Support Renderer: `SupportThread`

**File:** `src/dashboard/cv6next/SupportThread.jsx`  
**Entry points:** `SupportThread()`, `ThreadMessage()`  
**Mounted by:** `SupportDesktop.jsx` inside Email/Support detail pane. Mobile Email uses `SupportInbox` rather than this desktop detail pane.  
**Surfaces:** Desktop Email/Support conversation card.  
**Routes in from:** `/api/support/thread` by `wish_id` or `thread_id + account`. Separately, `SupportDesktop` fetches `/api/support/activity` and renders `AgentWorkPanel`.

**Rendering behavior:**

- Renders Gmail/support conversation truth, not room-chat messages.
- Uses plain text with `whiteSpace: pre-wrap`; no `ChatMessageRenderer`.
- Supports collapsed/expanded email messages, outbound/draft/recorded states, and fallback single-message quoted-history toggle.
- Does not render room-chat attachments, blocks, link cards, work steps, goal turns, or message-level chips.
- Suggested actions live outside the thread footer in `SupportDesktop`, not inside `SupportThread`.

## Feature Matrix

| Feature | ChatDesktop / MsgExtras | Cv6QuickThread | ChatLifecycle Message+GoalTurn | InlineBubbleThread | SupportThread |
| --- | --- | --- | --- | --- | --- |
| Plain text | Yes, agent and user through `ChatMessageRenderer` | Yes, agent and user through `ChatMessageRenderer` | Agent through `ChatMessageRenderer`; user plain `pre-wrap` | Yes, agent and user through `ChatMessageRenderer` | Yes, plain `pre-wrap` only |
| Markdown / links / code | Yes via `ChatMessageRenderer` | Yes via `ChatMessageRenderer` | Agent only via `ChatMessageRenderer`; user differs | Yes via `ChatMessageRenderer` | No markdown renderer |
| Link cards | Yes via `ResultLinkCards` in `MsgExtras` | Yes for agent messages | Yes in both `Message` and `GoalTurn` | Yes for agent messages | No |
| Attachments | Yes via `MessageAttachments` | Yes via `MessageAttachments` | Yes, but via custom `FileGallery`/`FileCollectionViewer`; not `MessageAttachments` | No | Gmail attachments are not rendered by `SupportThread`; email block attachments exist only in block renderer |
| Images / media | Yes through `MessageAttachments` | Yes through `MessageAttachments` | Yes through custom file gallery/viewer | No | No inline media renderer |
| Work steps | Yes through `AgentBlocks` after `injectWorkSteps()`; live through `WorkingTurn` | Yes through `AgentBlocks`; live through `WorkingTurn` | Yes through `GoalTurn`; live through synthetic `GoalTurn` + `liveStepsToBlocks()` | No, even if `injectWorkSteps()` creates blocks | Adjacent `AgentWorkPanel`, not `SupportThread` |
| Goal turns | Yes through `AgentBlocks` / `GoalThreadBody` | Yes through `AgentBlocks` / `GoalThreadBody` | Yes through `GoalTurn` / `GoalThreadBody` | No | No |
| Decision cards / choices | Yes inside `BlockRenderer` via `AgentBlocks` | Yes inside `BlockRenderer` via `AgentBlocks` | Yes inside `GoalThreadBody`/`BlockRenderer` | No | Suggested email actions outside the thread only |
| Suggested chips (`metadata.chips`) | Yes in `MsgExtras` | No | No | No | Email suggestions outside thread; not `metadata.chips` |
| Review handoff | Yes | Yes | Yes through mobile review handoff / file gallery | No | Add-to-Tracker/assign outside thread |
| Day folding | Yes | No | Yes | No | Collapses earlier email messages, not day grouping |
| Scroll/stick behavior | Desktop thread-specific | Portal host-specific | Mobile pin/latest/jump behavior | Simple modal scroll-to-bottom | Independent loading/fallback state |

## Drift and Known Bugs

Evidence from `BUILD.md` and code comments:

1. **Email thread missed agent-room work truth.** R6 Email Thread Product Goal Audit records that Email showed Gmail conversation truth but not the agent dispatch row or `events.message_step` ledger. Fix added `/api/support/activity` and `AgentWorkPanel`, separate from room-chat renderers.

2. **Plain replies reroute into blocks and bypass normal extras.** `injectWorkSteps()` converts plain agent text into a `step` block with `kind: 'note'` and clears `m.text`. `ChatLifecycle` has a specific comment that shipped-link cards must be rendered in `GoalTurn` because `Message` never runs for completion messages routed this way.

3. **Completed web-work links needed repeated render patches.** `ResultLinkCard.jsx` says it is rendered on every chat surface. The code has explicit render calls in `ChatDesktop` `MsgExtras`, `Cv6QuickThread`, `ChatLifecycle` normal `Message`, `ChatLifecycle` `GoalTurn`, and `InlineBubbleThread`. That is the current duplication pattern.

4. **Home quick thread previously missed live working feedback.** `Cv6QuickThread` comment says `WorkingTurn` was missing there and was added for parity with Chat.

5. **Suggested chips were dead or missing depending on renderer.** `ChatDesktop` `MsgExtras` has a comment that tapping suggestion chips was a dead no-op before wiring `onSend`. `Cv6QuickThread`, `ChatLifecycle`, and `InlineBubbleThread` still do not render `m.chips`.

6. **Attachment rendering is split.** `useRoomThread()` has comments explaining multiple file shapes and a fallback where auto-shared images otherwise became dead, unclickable, MIME-less cards. Desktop and quick thread render the normalized attachments through `MessageAttachments`; mobile has a separate custom `FileGallery`, so attachment fixes can still drift after data normalization.

7. **Home quick thread has unique scroll-host bugs.** `Cv6QuickThread` and Home host comments describe template rebinds resetting DOM/scroll, requiring portal host tracking and sticky-scroll guards. A shared renderer must leave host/scroll ownership with each surface.

8. **Catch Up modal is incomplete relative to room-chat message shape.** `InlineBubbleThread` shares the bubble look and link cards, but ignores blocks and attachments. Any message transformed by `injectWorkSteps()` can appear empty or incomplete there.

## Consolidation Proposal

### Keep/build one renderer

Build one shared room-chat renderer, tentatively:

`src/dashboard/cv6next/MessageThread.jsx`

Export:

- `Cv6MessageThread`
- `Cv6MessageGroup`
- `Cv6MessageTurn`
- `Cv6MessageExtras`
- `groupMessagesBySender()`
- optional `groupMessagesByDay()`

It should keep the existing proven primitives rather than replacing them:

- Text: `ChatMessageRenderer`
- Blocks/work/goal turns: `AgentBlocks`, `GoalThreadBody`, `WorkingTurn`, `liveStepsToBlocks`
- Attachments: `MessageAttachments` first; mobile file gallery can start as a compatibility mode
- Link cards: `ResultLinkCards`
- Chips: `ActionChips`

The first shared renderer should target the normalized `useRoomThread()` message shape only. Do not try to fold `SupportThread` into it initially; Email has a different source-of-truth contract. Instead, add a later adapter for support activity rows if Email should show room-style agent work inside the Email pane.

### Compatibility shims needed

- `variant`: `desktop`, `homeQuick`, `mobile`, `modal` for spacing/class wrappers only.
- `mode`: `plain`, `dayFolded`, `modalPreview`.
- `renderLiveWork`: choose `WorkingTurn` for desktop/home, current mobile synthetic `GoalTurn` until the scroll behavior is verified.
- `renderAttachments`: `MessageAttachments` default; `mobileGallery` compatibility flag for current mobile behavior.
- `onReviewAttachment`: accepts single attachment or array and lets host route to Review/Files.
- `onAction`: sends chip/choice labels through the host's existing `send`.
- `allowBlocks`, `allowAttachments`, `allowChips`, `allowLinkCards`: temporary flags for migrations where the current surface intentionally lacks a feature.

### Migration order

1. **InlineBubbleThread first.** It is the smallest read path and currently lacks blocks/attachments. Replace only its internal message loop with `Cv6MessageThread variant="modal" allowBlocks allowLinkCards`, initially leave attachments off if modal layout risk is too high.

2. **Home `Cv6QuickThread` second.** Same grouped-bubble look as InlineBubbleThread and already uses `MessageAttachments`, `AgentBlocks`, `ResultLinkCards`, and `WorkingTurn`. Keep the portal host and sticky-scroll code outside the renderer.

3. **Desktop `ChatDesktop` third.** Replace `BubbleThread`/`BubbleGroup`/`MsgExtras` with the shared renderer once Home quick parity is proven. Keep day folding, drawer, composer, and room selection in `ChatDesktop`.

4. **Mobile `ChatLifecycle` fourth.** This has the biggest behavior delta: day folding, long-message clamp, custom file gallery/viewer, mobile scroll pinning, and synthetic live `GoalTurn`. Migrate after the renderer accepts mobile compatibility flags or after mobile intentionally adopts `MessageAttachments`.

5. **Email/Support last and only as an adapter.** Keep `SupportThread` for Gmail chain truth. Consider a separate `SupportActivityThread` adapter that renders `/api/support/activity` messages/steps through `Cv6MessageThread`, replacing only `AgentWorkPanel` if product wants the same chat vocabulary there.

## Verification Plan

Current `tests/cv6-practical-audit.spec.mjs` verifies app navigation and no-crash only. Renderer migration needs focused specs.

Recommended new specs:

1. `tests/cv6-message-renderer.spec.mjs`
   - Open `?demo=blocks` and assert core block vocabulary: `Summary`, `Quick question`, reply/confirm chips, code, gallery, email block, artifact/open card.
   - Add a renderer fixture route if available in future, or use `?demo=blocks` plus seeded local messages.

2. Home quick thread spec
   - Desktop Home opens a room in column three.
   - Assert a plain text message renders markdown/link text.
   - Assert an attachment card renders a `Review all` or file card affordance.
   - Assert `WorkingTurn` appears while awaiting if seeded.

3. Catch Up modal spec
   - Open a Catch Up card.
   - Assert transformed block messages do not disappear.
   - Assert link card appears for a completion URL.
   - Assert modal composer still sends through `useRoomThread.send`.

4. Desktop Chat spec
   - Open Chat desktop.
   - Assert day-folded older messages, text bubble, attachment card, link card, chips, and live working row.
   - Assert Review handoff from an attachment still lands in Files/Review target state.

5. Mobile Chat spec
   - Open a room on mobile.
   - Assert latest-user-message pinning still works.
   - Assert blocks render inline as a goal turn.
   - Assert file/gallery behavior remains intentionally unchanged or has explicit new assertions if migrated to `MessageAttachments`.

6. Email/Support regression spec
   - Open Email desktop.
   - Assert `Conversation` renders Gmail thread/fallback.
   - Assert `Agent work` renders activity for wish rows.
   - Assert `Suggested actions` footer remains present for wish and raw mailbox rows.

Verification commands per migration:

- `npm run build`
- `npx playwright test tests/cv6-practical-audit.spec.mjs --reporter=line`
- New focused renderer spec for the migrated surface
- `git diff --check`

## Risk Register

| Risk | Blast radius | Why it could break | Rollback story |
| --- | --- | --- | --- |
| Shared renderer changes message spacing/classes | Chat desktop, Home quick, mobile chat, Catch Up | The surfaces share `.pconv`, `.grp`, `.pb`, `.pb-me`, but each wraps them differently | Migrate one surface at a time; rollback by restoring that surface to its local loop |
| Portal host behavior regresses | Home quick thread | Template rebinds recreate DOM; renderer must not own host discovery or scroll observer | Keep `Cv6QuickThread` portal/sticky code around shared renderer; rollback only Home quick wrapper |
| Mobile scroll pinning regresses | Mobile Chat | `ChatLifecycle` has custom pin-latest-user and jump-to-latest behavior | Migrate mobile last; keep scroll code outside renderer; rollback `ChatLifecycle` loop only |
| Attachments change layout on mobile | Mobile Chat | Mobile currently uses custom `FileGallery`, not `MessageAttachments` | Add `renderAttachments="mobileGallery"` shim; only remove after explicit mobile spec passes |
| `injectWorkSteps()` note blocks lose link cards/chips | All room-chat surfaces | Text is moved into `blocks`, bypassing normal message extras | Shared `Cv6MessageTurn` must always render link cards and chips after blocks, not only after text |
| Suggested chips send wrong action | Desktop/Home/mobile future | `ActionChips` signatures have differed; some callers previously did not pass `onAction` | Normalize `onAction(label)` in `Cv6MessageExtras`; keep host send wrappers unchanged |
| Review handoff breaks | Chat desktop, Home quick, mobile | Current surfaces pass different file shapes and project scopes | Keep `onReviewAttachment(fileOrFiles, context)` host-owned; test handoff before migrating next surface |
| Email/Support loses Gmail truth if over-consolidated | Email desktop | Support thread source is Gmail/support API, not `useRoomThread()` | Do not replace `SupportThread` in first consolidation; only adapt `AgentWorkPanel` later |
| CSS drift hidden by broad audit | All CV6 | Existing audit checks navigation/no-crash, not renderer parity | Add focused renderer specs before changing high-traffic surfaces |

## Recommended First Migration Slice

Start with `InlineBubbleThread` because it is small, contained in the Catch Up modal, and currently the most incomplete renderer. Build the shared `Cv6MessageThread` as a read-only adapter and use it only there first. Verification should prove that text, markdown, link cards, and `injectWorkSteps()` block turns render in the modal without changing the modal composer or Home quick thread.

After that passes, migrate `Cv6QuickThread` while preserving the existing portal host and sticky-scroll wrapper. That is the first high-value slice because it removes one full duplicate of text, blocks, attachments, link cards, and live work behavior without touching the larger desktop Chat shell or mobile scroll model.
