# R30 — desktop composer wiring (B1/B2 + L023–L026): the composer tells the truth

Mission `corner:corner-v2`. Worktree `corner-v2-integration`, branch
`codex/corner-v2-integration` (never pushed). Preview:
https://corner-v2-integration-b4udfcrc3-aheads-projects-d2a4c70f.vercel.app
(`VITE_CONVEX_URL=https://brilliant-scorpion-163.convex.cloud`,
`VITE_CONVEX_SITE_URL=https://brilliant-scorpion-163.convex.site`,
prebuilt deploy — `vercel build` then `vercel deploy --prebuilt`).

Reads first: `LOOP.md`, `rounds/R27-desktop-composer-parity.md` (extended —
its 16 e2e + the design gate stay green, see Gates),
`rounds/R26-desktop-live-walk.md` (the optimistic working line is untouched
and its 6 e2e still pass inside the 115), `punch-list.md` L023–L026,
`rounds/R33-chat-images-and-instant.md` (§1 provider survey: no image key in
the repo env, Higgsfield 0 credits, OpenAI 429 — the bridge renders any armed
tool through its local seam). Backend B1 (`sendMessage.replyTo` stored on the
block payload, returned in `getConversationSurface`) and B2
(`clearThread` + `clearedAt` filtering) were already deployed per the brief;
this round is the client wiring. No `convex/` edits.

## Gates (all run in the worktree)

| command | output |
|---|---|
| `npm run lint` | 0 errors, 11 warnings (all pre-existing; verified zero point at R30 lines — the ConversationSurface warning is the legacy FAB effect at :1275, every R30 hunk is ≤ :715) |
| `npx tsc --noEmit` | clean |
| `npx vitest run` | 23 files, 187 passed (was 184 in R26: +3 R30 — real-backend model list, image honesty, replyTo send+degrade) |
| `PW_PORT=5174 npx playwright test --output e2e/results-orch` (desktop) | 115 passed, 0 failed on a fresh server (109 pre-existing + 6 new R30), re-run green after the helper hardening below |
| `LIVE_BASE_URL=<preview> npm run test:design` | exit 0 — `R18 visual gate: 0 screens failing, 0 UI rows failing.` |
| `LIVE_BASE_URL=<preview> npx playwright test --project live` | 11 passed, 2 skipped (bar was 9/2; skips are the two pre-existing conditional `test.skip` sites — 03 needs-you with no question block, 07 deferred with no email/tracker artifact) |

## Before / after per row

- **B1 replyTo** — Before: the quote rode `clientMessageId` + a per-thread
  `v2-replymap:*` local map (same-device only, R27 §"Backend rows").
  After: `handleSend` sends `replyTo: { messageId, sender, snippet }` with
  the message (`sendThreadMessage` degrades it on old backends like the other
  extended args); the optimistic block carries the same payload shape so the
  quote paints instantly; `quoteFor` renders ONLY from
  `payload.replyTo` — the replymap state, effects, and storage are deleted.
  Offline lock: quote on the optimistic block AND on the server echo (echo
  proven by non-`temp-` id after the agent reply lands), zero `v2-replymap:*`
  keys in storage. Live lock (test 12, own probe mission): quote visible →
  reload → visible → second context signed in as the same account sees the
  quote (`R30-live-12-reply-quote.png`,
  `R30-live-12-second-context.png` — the shot shows the quote rendered from
  the payload in context 2).
- **B2 clear** — Before: `/clear` confirm cleared view-local state and said
  so ("History stays until the archive backend lands"). After:
  `handleClearRoom` awaits `v2Workspace.clearThread`, then drops optimistic /
  failed / working line / reply pick / draft; failure returns false and the
  confirm shows its retry line. Copy now: "Start fresh? This clears the chat
  on every device. Nothing is deleted — earlier messages stay in history."
  Offline lock (seeded Launch review thread): message + agent reply cleared,
  `thread-empty` owns the column, reload stays empty. Live lock (test 13, own
  probe mission): same, plus the copy asserts
  (`R30-live-13-cleared.png` — empty state, header Ready).
- **L023** — Before (`R27-review-02-commands-menu.png`): "Talk aloud"
  clipped at the menu's bottom edge. After: the popover still opens above
  the chip; its height is capped to the viewport (`min(380px, 100dvh-240px)`,
  `max-width: 100vw-32px`) with the scroll chained inside
  (`overscroll-behavior: contain`), so the last item is one menu-scroll away
  on every pane size. E2e scrolls the menu to its bottom and asserts the
  Talk row's box inside the viewport, toggles it on/off, and asserts both
  submenus fit.
- **L024** — Before: `Auto (Claude → Codex)` + Opus/Sonnet/Haiku/Spark/
  GPT-5.6/Codex — CV6's list. After: the single source `MODEL_OPTIONS` is
  Auto ("The bridge default (Claude) unless the project maps a brain
  elsewhere") / Claude / Muse / OpenAI ("No credits — unavailable until
  funded") — the bridge's `VALID_BACKENDS` minus `script`/`fake`, default
  `claude` per `R21_DEFAULT_BACKEND`. Stale stored prefs validate back to
  Auto. Unit test pins ids + both one-liners; e2e picks Claude, reloads,
  restores Auto.
- **L025** — Before: "Gemini · Ideogram · OpenAI" with "Fast, good taste" /
  "Type that renders" / "GPT image". After (R33 wired the local seam only):
  every row reads "Needs a provider — local preview for now", the section
  hint adds "No image provider is connected yet, so the reply is a local
  preview." Tool ids are unchanged, so arming + the R33 pipeline (any tool)
  + the R27 image e2e keep working; e2e asserts the honesty copy, arms, and
  disarms.
- **L026** — Before (`R27-review-04-reply-chip.png`): every tray ran past
  the thread column into the visual pane. Root cause: the tray is a flex
  item of the wrapping `.composer` row and had no basis, so it sized to its
  content (the nowrap snippet). After: `.v2-composer-tray { flex: 1 1 100%;
  width: 100%; min-width: 0; max-width: 680px; margin: 0 auto 8px }` — the
  pill's exact width contract — children capped at 100%, snippet ellipsised
  by style, `/clear` buttons wrap. E2e: tray box ≡ pill box (±2px both
  insets), snippet `text-overflow: ellipsis` + `overflow-x: hidden`, tray
  inside the viewport, Cancel/Clear Chat whole inside the viewport.
- **Optimistic working line** (R26 L021, kept consistent): `handleSend`'s
  shape is unchanged apart from the added `replyTo` — the R26 L021/L021-quiet
  e2e pass unmodified inside the 115.

## Commits (scoped, none pushed)

- Worktree (9 files, nothing else staged): `src/lib/composerCommands.ts`
  (model/image single source, `ReplyToPayload`, replyTo send+degrade),
  `src/components/Composer.tsx` (model details, image hint, clear copy),
  `src/v2/ConversationSurface.tsx` (payload quotes, replymap deleted,
  `clearThread` host), `src/v2/conversation.css` (tray flex, clear wrap),
  `src/v2/composer-commands.css` (menu viewport cap),
  `scripts/audit/fixtures.ts` (replyTo/mode/model/imageTool echo,
  `clearThread` + reload-durable watermark), `e2e/visual.spec.ts` (R30
  describe ×6, R27 /clear moved to a sandbox thread, helper hardening),
  `e2e/live.spec.ts` (tests 12+13 + hardened probe helper),
  `tests/v2/composer-commands.test.ts` (+3, ids updated).
- Left alone on purpose: `convex/*`, `.gitignore` (reverted a `vercel pull`
  side-effect line), `e2e/chat.spec.ts` (chat lane's), `e2e/results-*/`
  (generated), `/tmp` probes (deleted the worktree one).
- Mission folder (this report + `rounds/evidence/R30-live-12-*.png`,
  `R30-live-13-cleared.png` + `punch-list.md` L023–L026 cells): separate
  commit per R33 precedent.

## Still off and why (non-empty, all disclosed)

1. **Two live-suite incidents, both mine, both understood.** (a) The first
   test-12/13 versions failed in-suite while passing alone: the probe helper
   waited for `toHaveURL(/c/.+/)`, which the OLD thread already satisfies,
   so sends raced the async create→navigate and landed on the previous
   thread (proven from the trace: hover resolved to the optimistic `temp-*`
   row, which detached on remount; no backend involved). Fixed by waiting
   for the URL to actually CHANGE plus the fresh thread's empty state; the
   same latent race was hardened in the offline helper. (b) Those failed
   attempts left ~7 stray messages on prior-run e2e threads ("R30 live
   first/clear", "Tasting notes…", "Retiring…") and test 13 once passed
   vacuously (its clear hit the empty probe while its message sat on the
   main thread). The final green run is proven non-vacuous (content
   assertions on the right thread), and a read-only UI audit of the current
   run's main thread shows exactly its own tests' 6 messages — history
   intact, no strays, nothing was ever deleted (no clear ever touched it).
2. **Offline reload drops sent messages (pre-existing).** The stand-in store
   lives in browser module state, so a reload resets it — no existing test
   ever asserted otherwise. Consequence: B1's reload durability is proven
   LIVE only; offline proves echo-payload render + no-local-map. B2's
   offline reload works because the clear watermark is the exception: it
   mirrors to localStorage like the real thread row (and the fixture's own
   v2visual shim).
3. **Retry of a failed send drops the quote** (`handleRetry` re-sends bare
   text; the failed row keeps rendering its stored quote). Edge case,
   disclosed; fix is a rote follow-up.
4. **Native `ChatView.modelOptions`** still mirrors the old CV6 list (the
   code comment claimed parity). Native lane's call — flagged, not touched
   (two workers never share a file).
5. OpenAI stays "No credits" and images stay local-preview until Patrik
   funds a provider (R33 §10: Higgsfield top-up is one step away).
