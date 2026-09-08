# R54 — walk 4 repairs (Astra Round 2; Codex started, Claude finished by hand; 2026-09-08 8:35 → 9:45 AM)

Codex ran ~50 min (753k tokens) and hit its usage limit with the code written but uncommitted and no report;
finished by hand per the stall rule. AOM-EA `01894114e`, corner-v2-integration `691be77`. Services restarted
9:35 AM (gateway, both bridges; contract `r53-1`, pack now carries sibling facts).

| Walk 4 miss | Before | After | Proof |
|---|---|---|---|
| 1. Gateway 404s on files past the 60-row index cap (Kraken logo, AZ Tech QR flyer, Ambition Week 1) | `/gateway/open` only knew the capped per-subject list | `corner-gateway-files.json` carries an uncapped `ids` map (12,395 ids); open resolves any id the backend lists and re-walks on a miss | Kraken logo (not in the capped list, in `ids`) opened on the design thread in 1.8 s, kind photo, link |
| 2. "Latest weekly report" opened Week 4; the real Week 5 lives in the reports store | folder files only | the sync adds url rows "<Client>: Week N" from `reports:latest` + `reports:getWeek` (neat-pony, read-only); opening one creates a `site` artifact with the public page | "Wolfpack: Week 5" opened on the design thread in 0.4 s, kind web, link |
| 3. Aom said no hero lock / banned fonts are recorded | the pack read the `aom` card only | pack lists sibling cards' confirmed facts (`projectCards:list` → aom ← aheadofmarket-com: hero LOCKED MasterClass, Syne banned, monogram official) | `aheadofmarket-com` card facts confirmed in Convex; bridge test on the Aom pack |
| 4. Doubled "Opening <title>…" step on gateway-fail → thread fallback | two steps | one step per turn | bridge test |
| 5. Ambition Sep 7 captions delivery missing from the ledger | no Ambition deed after "Started…" | appended from the knowledge-base record (6:20 PM push to Drive); the session's own 6:34 PM deed had also landed by now — card last = "Delivered Ambition captions overlay for Elephante pt 2: 31 kinetic cards plus end card" | Ambition card rebuilt |

Gates: gateway 105/105 · bridge 240/240 · hook OK · convex-test 178/178. Zero sends on Patrik's threads.

## Still off
- Two ledger rows now describe the same Elephante delivery (6:20 PM Drive push, 6:34 PM overlay spec); fine as facets, not a correction case.
- Reports for kohrs/ella index under their slugs only if those subjects exist on the dashboard.
- Round 3 (re-proof) decides the scores; nothing here claims one.
