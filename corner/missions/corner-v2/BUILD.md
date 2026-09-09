# BUILD — Corner v2

### R54 — Chat walk 4 repairs (2026-09-08)

One reproducer and one scoped repair for every numbered walk 4 miss, followed by the required unit gates, production sync, service restarts, and design-thread-only proofs.

- Reproducers now pin the uncapped open path, published report links, sibling facts in the pack, and one opening step per pull-up.
- The scoped gateway and bridge repairs are implemented; targeted red-green checks pass.

**Status:** done

### R54b — Round 4 clean re-run: pull-up name-tokens + latest-answer noise (2026-09-08, Claude by hand)

Cleared all five project threads (`v2Workspace:clearThread` as Patrik) and re-ran the four acceptance questions from empty in Patrik's logged-in Chrome. First pass scores: Wolfpack 8, Aom 8, AZ Tech 7.5, Ambition 7, **Kraken 5.5** (below the 7 bar → repair + re-run per the plan). Two systemic misses:

1. **"What's the latest" led with "you updated the project context"** on 4 of 5 projects. Root cause: the gateway names a changed file by its heading, so a steward rewriting a project's scaffold doc (`CONTEXT.md` → "`<Project> -- Project Context`") logged a Patrik "did" deed that then topped `ledger:latest`, burying the real work (Kraken's answer never named the delivered logos). Fix (`c2i ccb4111` `isScaffoldSyncDeed`→`isLowSignal`, read-side, covers rows already written; `AOM-EA 5112856ca` gateway `build_items` drops scaffold titles at the source; a scaffold-only tick now stays silent). Tests: g3-truth, gateway `build_items` (108) green.
2. **Pull-up subject-name inflation** (carried from walk 4): "pull up the Kraken Corps logo review sheet" matched "Kraken Corps -- Project Context" on kraken+corp (0.40 ≥ 0.34). Fix (`c2i 1c49995` `overlapScore(query,title,subject)` drops the project's own name tokens; `AOM-EA` bridge `rank_pullup` parity). Verified live: it is now an honest "I don't see one" miss; a real deliverable (Blueprint Direction) still opens.

Deploys to `brilliant-scorpion-163` are Patrik's (classifier-gated for Claude); bridge + gateway daemons reloaded by hand.

**Pristine re-run (all fixes live): Wolfpack 8, Ambition 8, Kraken 8, Aom 7.5, AZ Tech 8 — all ≥ 7.
Test A (chat knows every project) is CLOSED from clean threads.** Evidence: `rounds/GOAL-clean-rerun.md`.

**Carried forward (neither blocks Test A):**
- **L042 (→ R44 desktop):** HTML documents render but slowly (~8-11 s for big files; Blueprint 146 KB, Week 1 107 KB) because the DocStage fetches `src` client-side into a `sandbox=""` iframe. Markdown docs, PDFs, and live "site" pages paint at once. The attempt-1 "blank" reads were premature screenshots.
- **C022 (→ chat round):** the "latest" answer reads only the chat's own subject ledger; extend the R53 sibling merge from facts to deeds so a quiet chat (Aom) surfaces recent sibling work (aheadofmarket-com) as its latest.

**Status:** done (Round 4 green; two non-blocking follow-ups logged as L042 + C022)

### R61 — Agent connections panel (native) + video-index/pull-up close (2026-09-08, Claude by hand)

Two threads landed this round.

**Video index + pull-up (the "pull up the latest video" failure).** Root cause was a 60-item index cap letting 48 documents crowd every video out (Ambition indexed 0 videos). Fix: `MEDIA_QUOTA=15` reserved for media in the gateway `refresh_files_index` cut, plus a kind-boost in the bridge pull-up scorer (`_pullup_rows` search branch + `rank_pullup`, gated on `sc/s > 0` so a score-0 item is never lifted). Verified live in the Ambition room: "pull up the latest video we finished" went from "I don't see a latest video" → "Opening Elephante captions video…" → **"Opened Elephante captions video in the Visual Window"** with the video card rendered. One honest follow-up: on desktop **web** the stage is still a black frame at 00:00/00:00 — the browser player isn't handed a playable URL yet (native renders it). Tracked as the next gateway-open/web-playback fix.

**Agent connections panel (Patrik 2026-09-08).** New `V2ConnectionsSheet.swift` — a compact "what's in this agent's toolkit, and is it on?" panel with two entry points, one panel:
- Global: the drawer footer, beside the person mark (`V2DrawerView.footer`).
- Per-room: the chat nav, left of the eye (`ChatView.v2NavBar`), scoped to the room's agent.

Each row carries two distinct signals Patrik asked for: a **status dot** (the truth — connected / available / needs-attention) and a **toggle** (the control — allow this agent to use it; persisted to UserDefaults). Seeded honestly from what the AOM crew actually reaches for: Browser (robot Chrome), Email (per-mailbox), GitHub, Computers (this Studio Mac live; Personal Mac not-yet), Image gen (KIE), DaVinci Resolve (shown needs-attention — the Resolve MCP is genuinely down this session). Enforcement wiring (toggle → bridge/agent gate) is the next round; this pass is placement + concept for Patrik to judge on the sim.

Verified on the 17 Pro sim (build succeeded, both entry points driven by hand): the per-room icon (left of the eye) and the global icon (drawer footer, beside the person mark) both raise the panel; the scope copy switches ("What General's agent can use" vs "What every agent can use"); the honest dots render (Personal Mac grey "Available", Resolve amber "Needs attention"); a toggle flips and the "7 of 8 on" count updates and persists across a full reinstall. Regression guard added: `CornerUITests/R61ConnectionsUITests.swift` (both entry points open the panel) with distinct identifiers `v2-connections-room` / `v2-connections-global`.

Not yet wired (next round): the toggle is intent-only — it persists but does not yet gate the bridge/agent; and this is native-only, the desktop-web mirror is a follow-up.

**Status:** done (native panel shipped + verified on sim; enforcement + desktop mirror are follow-ups).

### R62 — Patrik iPad punch list, universal (2026-09-09, Claude by hand)

Patrik marked up a TestFlight iPad screenshot with 6 changes; he then said the composer changes, the context-box removal, and the files-not-loading are UNIVERSAL (iPhone, iPad, desktop web). Native pass (this round):

1. **Review moved down (iPad).** `VisualWindowColumn` header is now title + close only; "Review" comes down next to the file as `LeaveAReviewButton` + `ShareFileButton` (the iPhone R59 treatment, now on iPad too). `ReviewToggleButton` retired from the column.
2. **Documents render (universal native fix).** Root cause: a weekly-report HTML page opens on `<title>` then a giant base64 `@font-face` inside `<style>`, pushing `<body>`/`<div>` past the 2000-char scan, so `DocumentText.looksLikeHTML` returned false and the raw HTML dumped as "markdown" ("Ambition: Week 1 shows raw HTML"). Fix: skip leading whitespace/BOM, scan 4000 chars, and treat a leading head/document tag (`<title`, `<style`, `<meta`, `<head`, `<link`, `<!doctype`, `<html`, `<!--`) as HTML. Unit tests added (base64-font page + leading-whitespace/BOM). The **Elephante video** half is a gateway serving issue (unplayable URL → black at 00:00, same family as the desktop black frame), not the client player — flagged for the gateway, not faked here.
3. **Viewer doubled (iPad).** The Visual Window column cap 440→880, fraction 0.45→0.6; chat keeps ~40%.
4. **Context box removed (universal).** The artifact peek box above the composer (`v2PeekBar`, "Ambition: Week 1 / No changes yet") is no longer rendered — Patrik X'd it out.
5. **Composer padding + purple circle (universal).** Padding added above the input; the purple command circle tucks left (pillLeading 11→7) with more room before the typing (interSpacing 3→9).
6. **Context to centre + checklist (universal).** The options row is now Attach pinned left, Context + the (previously missing) Checklist button centred; the Checklist chip lights accent when open.

Verified: build clean; iPhone 17 Pro sim shows the composer changes (peek gone, purple circle tucked, Attach-left / Context·Checklist-centred). Doc detection unit-tested. iPad column (1,3) build-verified + code mirrors the accepted iPhone pattern; the iPad sim was stuck in a rotated orientation (environment quirk) so on-device iPad confirmation is Patrik's TestFlight. Desktop-web (universal composer + context-box + HTML-doc rendering) is the next pass.

**Status:** in progress — native shipped to a TestFlight build for Patrik's iPad; desktop-web universal pass next.

### R63 — Files load from the menu (new-goal item 6, iOS-menu half) (2026-09-09, Claude by hand)

Patrik (new goal, item 6): "Files don't load when you click them on the iOS menu or the command menu." Root cause for the **iOS-menu / Organize path**: `FilePreviewView` routed by file EXTENSION — known text → TextFileReader, everything else → QuickLook — but Corner's documents are frequently EXTENSION-LESS (a synced CONTEXT, a weekly report, an artifact id). QuickLook has no generator for an extension-less file, so it opened on "No preview available" = "files don't load." (Same class of bug `DocumentReaderView` fixed for the Visual Window in R59; the Organize path never got it.)

Fix: `FilePreviewView.route(for:)` (pure, unit-tested) — known text extensions → text reader; a name with NO real extension → `DocumentReaderView` (which sniffs HTML vs markdown, incl. the R62 base64-font fix); real binary extensions (pdf/png/mp4/docx) → QuickLook. Unit test `testFilePreviewRouting` in AttachmentTests pins all three routes. Build clean.

Remaining half (documented, not yet fixed): the **command-menu "Files"** does `window.isPresented = true`, which on iPhone renders an EMPTY sheet when no tab is selected (the sheet gates on `selectedTab != nil`). The fix is to let the Visual Window present its Context (file list) with no open tab, OR route command-menu Files to the Organize browser — a small but distinct change to verify on the sim with real files. Batching with the next new-goal build (not shipped as its own build).

**Status:** iOS-menu half done + unit-tested (ships in the next build); command-menu half root-caused + queued.

### R64 — Breathing composer glow (new-goal item 2) (2026-09-09, Claude by hand)

Patrik (new goal, item 2): the glow under the composer should be bigger, slowly animating bigger/smaller ("like the room has life"), and sit higher up. `V2ComposerGlow` now wraps `V2AmbientGlow` in a slow breathing scale (1.18 ⇄ 1.62, anchored bottom so it grows upward) + opacity pulse (0.80 ⇄ 1.0) over 5.5 s, autoreversing; Reduce Motion / screen-tour freeze at a static 1.35. The glow's footprint in ChatView grew 78 → 150 so the bigger bloom rises higher behind the composer. `V2AmbientGlow` (shared with the loading mark) is untouched. Verified on the 17 Pro sim: two frames 4 s apart show the bloom clearly bigger + higher than the old strip and pulsing between them.

**Status:** done (verified on sim; ships in the next build).
