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
