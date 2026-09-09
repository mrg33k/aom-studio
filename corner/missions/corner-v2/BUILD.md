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
