# GOAL walk 4 — as Patrik, in his Chrome, aheadofmarket.com/dashboard (2026-09-08 8:11 → 8:24 AM)

Astra plan Round 1: score only, no fixes mid-walk. Four questions per project (latest / next + waiting / facts /
pull-up), 0-2 each. Reply times: every reply landed within the 26 s wait; pull-ups opened (when they opened)
within ~10 s. No filesystem paths anywhere. Chat contract `r53-1`.

| Project | Latest | Next + waiting | Facts | Pull-up | Total |
|---|---|---|---|---|---|
| Wolfpack | 2 — "On Thursday, Sep 3, you found half the planned enhancements were already live… same day you started the Looker Studio report… paused on your Touch ID passkey" | 2 — mobile QA on a real phone; confirm lead attribution in GA + PM outreach | 2 — Ross Jenkins signed; live Sep 3; GA set up (scroll depth, buttons, page time, GA4 dimensions) | 1 — "latest weekly report" opened **Week 4**; the real latest is Week 5 (Sep 4), published from the reports store, not a folder file | **7** |
| Ambition | 2 — Elephante pt 2 captions started; consultant change + verified-lead definition + context draft open | 2 — same, clean | 2 — $2,000 + $1,500 Google Ads (Eric pays Google); social added Aug 28; Mo + Eric; navy/red kit | 1.5 — opened **Ambition: Week 1** with a link, but via the thread-artifact fallback after a gateway 404; the "Opening…" step showed twice | **7.5** |
| Kraken Corps | 2 — "Nothing has been logged since Aug 25… last real work: five transparent logos delivered and verified, review sheet, two direction mockups" | 2 — pick Blueprint (D) or Tactical Display (B); Matthew's contact + domain blank | 2 — K.R.A.K.E.N. Corps, Matthew's SDVOSB holding company, Aerospace Summit raffle prize, Glendale AZ | 0.5 — found `kraken-corps-logo-transparent.png`, gateway open failed (404) | **6.5** |
| Aom | 2 — Sep 3 Looker Studio plan, blocked on the passkey; contact-form redesign awaiting a yes/no | 2 — Investor Pot; same two asks | 0 — "No locked homepage hero format and no banned font list are recorded on Aom" (both ARE recorded: MasterClass hero lock, Syne banned — under the aheadofmarket.com project, which the Aom chat does not read) | 2 — opened **AOM — Brand Guidelines** with a link (sibling subject) | **6** |
| AZ Tech Council | 2 — quiet since Aug 25; files on hand named | 2 — Aerospace Booth Flyer; nothing waiting (junk mission title gone) | 1.5 — contact still TBD (honest); flyers = inaugural Arizona Aerospace Summit, July 15 2026, Tucson Convention Center | 0.5 — found `aztc-aerospace-qr-flyer.pdf`, gateway open failed | **6** |

## Misses → Round 2 (R54, Codex)
1. **Gateway opens 404 on files the backend still lists.** The local files index is capped at 60 rows and now
   ranks documents first (R53), so older stills/PDFs that `projectFiles:search` returns are gone from the
   gateway's lookup → "unknown fileId for subject". Kraken logo, AZ Tech QR flyer, Ambition Week 1 all hit it.
   Fix: the gateway resolves any stable id (uncapped id→path map, or recompute on miss); the sync and the
   open must never disagree.
2. **"Latest weekly report" = the published report, not a folder file.** Week 5 (Sep 4) lives in the reports
   store (`reports:latest`/`getWeek` on neat-pony) and renders at aheadofmarket.com/wolfpack/week-5; index the
   published weeks per client (URL artifacts) so the newest opens.
3. **Aom facts live under the site project.** The Aom chat's pack reads the `aom` card only; the hero lock and
   banned fonts are in `aheadofmarket.com`'s FACTS. The pack must merge sibling cards/facts (aom ↔
   aheadofmarket-com) or the facts sync must publish under both subjects.
4. **Doubled "Opening <title>…" step** when the gateway open fails and the turn falls back to a thread artifact.
5. **Ambition's Sep 7 6:20 PM captions delivery** (three files to Google Drive) still missing from the ledger.
6. (Tooling) The Chrome extension dropped mid-batch once and my retry re-sent three Ambition questions; the
   thread carries duplicates from 8:15 AM. Not a product miss.

## Re-proof (Astra Round 3, 2026-09-08 9:28 → 9:38 AM, after R54)
| Project | Latest | Next + waiting | Facts | Pull-up | Total |
|---|---|---|---|---|---|
| Wolfpack | 2 — "Today you changed the Wolfpack home hero stat from $5.5M to $10.5M… pushed to the branch" (a real deed logged this morning) | 2 | 2 | 2 — "latest weekly report" opened **Wolfpack: Week 5** as a live page in the Visual Window, with the link and "Last logged today…" | **8** |
| Ambition | 2 — "Today Patrik delivered the Ambition captions overlay for Elephante pt 2… all three files went to the Drive folder" | 2 | 2 | 2 — Ambition: Week 1 opened via the gateway, one step | **8** |
| Kraken Corps | 2 | 2 | 2 | 1 — "logo review sheet" opened the project context doc (the project's own name words counted toward the 0.34 bar) | **7** |
| Aom | 2 | 2 | 2 — "Homepage hero is locked to the MasterClass direction, and Syne is the one banned font… confirmed on the sibling project Ahead of Market" | 2 — AOM — Brand Guidelines | **8** |
| AZ Tech Council | 2 | 2 | 1.5 — contact TBD (honest), event right | 2 — the aerospace QR flyer PDF rendered in the Visual Window with its link | **7.5** |

**All five ≥ 7/8.** Every reply landed within 26 s; every open within ~10 s; no paths. Round 4 (clear all five
threads, re-ask from empty) is the next firing. Carry-forward for the next repair round: drop the subject's own
name tokens from the pull-up score so "logo review sheet" never matches "Kraken Corps -- Project Context".

