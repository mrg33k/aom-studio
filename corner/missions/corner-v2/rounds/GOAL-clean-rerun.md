# GOAL clean re-run (Astra plan Round 4) — clear all five threads, re-ask from empty

As Patrik, in his logged-in Chrome on aheadofmarket.com/dashboard. Threads cleared with
`v2Workspace:clearThread`, verified empty (messages 0), then the four acceptance questions asked fresh.
Chat contract `r53-1`; backend `brilliant-scorpion-163`. 2026-09-08, ~11:40 AM → ~1:20 PM Phoenix.

## Attempt 1 (first clean pass) — surfaced two real misses

| Project | Latest | Next+wait | Facts | Pull-up | Total |
|---|---|---|---|---|---|
| Wolfpack | 2 | 2 | 2 | 2 — Week 5 (live site) rendered on the stage | **8** |
| Ambition | 2 | 2 | 2 | 1 — Week 1 opened + linked, stage looked blank | **7** |
| Kraken Corps | 1 — led with "you updated the project context" | 1.5 | 2 | 1 — "logo review sheet" honest miss (fix works); Blueprint opened, looked blank | **5.5** |
| Aom | 2 | 2 | 2 (sibling facts) | 2 — Brand Guidelines (markdown) rendered | **8** |
| AZ Tech Council | 1.5 — led with "you updated the project context notes" | 2 | 2 | 2 — QR flyer PDF rendered | **7.5** |

**Kraken below the 7 bar → repair + full re-run per the plan.** Two systemic misses:

1. **"What's the latest" led with "you updated the project context"** on 4 of 5 projects (all but Aom).
   Root cause: the gateway names a changed file by its first heading, so a steward rewriting a project's
   scaffold doc (`CONTEXT.md` → heading "`<Project> -- Project Context`") logged a Patrik **"did"** deed
   (`surface: gateway:karls-mac-studio`, dated today) that then topped the "latest" answer, burying real
   work (Kraken never named the delivered logos; AZ Tech buried the flyer work).

2. **Pull-up subject-name inflation** (carried from walk 4): "pull up the Kraken Corps logo review sheet"
   still matched "Kraken Corps -- Project Context" on the shared name words (kraken+corp = 0.40 ≥ the 0.34 bar).

3. **Documents "looked blank" on the stage** — turned out to be **slow render, not broken** (see the fix section).

## The repair (R54 + R54b)

- **Pull-up name tokens** (`c2i 1c49995`): `overlapScore(query, title, subject)` drops the project's own
  name tokens from the query first, but only while a real deliverable term survives. `projectFiles:search`
  passes the subject; the bridge's `rank_pullup` mirrors it. Verified live: "logo review sheet" is now an
  honest "I don't see one" and a real deliverable (Blueprint Direction) opens.
- **Scaffold-sync deeds are low-signal** (`c2i ccb4111` `isScaffoldSyncDeed`→`isLowSignal`, read-side, covers
  the rows already written; `AOM-EA` gateway `build_items` drops scaffold titles at the source so a
  scaffold-only tick stays silent; `c2i 075f197` mirrors the filter into `v2Ledger.latest`).
- **Cards rebuilt** (`projectCards:rebuild` for all five) so `lastHappened` re-derives with the filter —
  Wolfpack/Ambition now carry their real deed; Kraken/AZ Tech/Aom are honestly empty.
- **Bridge pack** (`AOM-EA`): `is_low_signal` mirrors the backend at every pack-ledger read (v2Ledger.latest
  has no server filter), and the PROJECT NOTES section is now labelled reference content, not an activity
  log, so the model never narrates a CONTEXT/notes file's recency as recent work.
- Deploys to `brilliant-scorpion-163` are Patrik's (classifier-gated for Claude); bridge + gateway reloaded by hand.
- Tests: `test_v2_team_bridge.py` (all pass, +2 cases), gateway `test_gateway.py` 108 (+3), vitest 186 (+2).

## Attempt 2 (pristine clean pass, all fixes live) — GREEN

Every thread re-cleared (empty), asked fresh. Every reply landed within ~7-20 s; every pull-up opened with a
working dashboard link; no filesystem path; no fabricated or mis-dated fact; no project confusion; one voice.

| Project | Latest | Next+wait | Facts | Pull-up | Total |
|---|---|---|---|---|---|
| Wolfpack | 2 — "Today you changed the home hero stat from $5.5M to $10.5M, built and pushed" | 2 — GA (urgent since Sep 3), mobile QA, lead attribution | 2 — Ross Jenkins signed/closed; live Sep 3 at wolfpackcompanies.com | 2 — Week 5 live page rendered on the stage (6.1 s) | **8** |
| Ambition | 2 — "Today you delivered the Elephante pt 2 captions: 31 cards + end card, ProRes 4444 alpha, to the Drive folder" | 2 — finish the caption pass; Google Ads consultant change + verified-lead pivot | 2 — $2,000/mo + $1,500 Ads (Eric pays Google); navy #1B2A4A / red #C41E3A / ivory / amber-only, never orange | 2 — Week 1 report rendered on the stage (~10 s to paint, L042) | **8** |
| Kraken Corps | 2 — "Nothing has been logged since Aug 25" (honest; no bookkeeping leak) | 2 — Website Rebuild mission; vision doc still a scaffold, needs the interview | 2 — K.R.A.K.E.N. Corps, SDVOSB holding co in Glendale, Aerospace Summit raffle prize, contact TBD | 2 — Blueprint Direction rendered on the stage (7.2 s); "logo review sheet" = honest miss | **8** |
| Aom | 1.5 — "Nothing logged for Aom since Aug 25" + the open Aug 26 contact-form thread + Investor Pot next (honest but narrow: recent AOM-website work lives under the sibling `aheadofmarket-com` and is not merged into "latest") | 2 — contact-form yes/no; Investor Pot | 2 — hero locked to MasterClass; Syne banned site-wide; monogram official (sibling-fact merge) | 2 — Brand Guidelines (markdown) rendered in the reader | **7.5** |
| AZ Tech Council | 2 — "Nothing has been logged since Aug 25" (honest; no bookkeeping leak) | 2 — Aerospace Booth Flyer; deck live at aheadofmarket.com/aztc | 2 — Arizona Aerospace Summit, Tucson Convention Center, July 15 2026 (flagged as passed), ATC media partner | 2 — QR flyer PDF rendered on the stage (7.4 s) | **8** |

**All five ≥ 7/8 from clean threads. Test A is closed.**

## Two findings carried forward (neither blocks Test A)

- **L042 — HTML documents render slowly (~8-11 s), not blank.** Markdown docs, PDFs, and live "site" pages
  render at once; the DocStage's `sandbox=""` `<iframe srcDoc>` after a client `fetch(src)` takes several
  seconds for big files (Blueprint 146 KB, Week 1 107 KB). My attempt-1 "blank" reads were premature
  screenshots; with an adequate wait, both painted correctly. Fix = serve the file at a URL the stage can
  iframe directly (like a "site"), or attach rendered content so there is no client fetch. → R44 desktop round.
- **Sibling-deed merge for "latest" (Aom).** R54 merges sibling **facts** (aom ↔ aheadofmarket-com), so Aom's
  fact check is 2/2, but the **"latest"** answer reads only the `aom` subject's own ledger — which is empty —
  so recent AOM-website work (filed under `aheadofmarket-com`) is not surfaced as Aom's latest. Extend the
  R53 sibling merge to deeds, not just facts. → chat round follow-up.
