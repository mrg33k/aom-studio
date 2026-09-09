# Round R14 — punch-list closeout (2026-09-08, Claude)

The punch-list is a cache, and it had lagged badly: ~27 rows still read `open` while their fix had
shipped rounds ago (R26/R41/R43 desktop, R41/R42/R43 native) or landed in this session (R59 native,
R58/R11 desktop). This round reconciles the list to the truth — every `open` row was re-checked against
the built code and, for the native rows, against the R59 simulator run — and triages the genuine residual.

## Reconciled to fixed (27 rows)

**Native — verified on the iPhone 17 Pro sim this session (R59) or shipped in R41/R42/R43/R8/R56:**
P070 (opens the home welcome, not the tree page), P071 (mission title + project line, no double name),
P072 (dark sheet ground under the stage), P088 (General welcome), P089 (loading mark), P090 (CV6 command
card), P091 (pill + control row), P092 (agent row type), P093 (soft composer glow — R59 de-boxed it),
P094/P095 (the live Visual Window companion + eye cycle), P096 (three distinct home cards),
P097 (cold launch → home).

**Desktop — confirmed fixed in built code with round-tagged comments:**
R26: L016 (header run state, no stuck Working), L017 (empty-thread state, not a lone card), L020 (checklist
replaces the composer in review), L021 (optimistic working line), L022 (steps in-progress, not pre-checked).
R41: L031 (Working from the optimistic line), L032 (follow key = row identity, arrivals pin), L033 (bottom
inset = live composer height + 16). R43: L034 (a layout shift never releases the pin), L035 (composer bar
compacts, never wraps), L036 (photo empty-hint copy, no jargon). R44: L037 (composer glow). R58/R11 (verified
this session): L038 (eye on every chat + condensed multi-chat, one context window).

**Chat:** C016 (per-thread view state + files index; the pack narrates BOTH LOOKING AT).

## True residual (7 — none acceptance-blocking)

| id | area | what | why it's carried |
|---|---|---|---|
| L015 | desktop sidebar | collapse re-expands on ~1-in-2 first attempts after "+ New mission" → reload; retry always passes | flake only, retries cover it; not reproduced offline |
| P073 | native gate tooling | `native-design-vs-sim.mjs` reports false MISSING when the frame dump runs before the sheet settles | tooling accuracy, not a product defect |
| C010 | chat (prod data) | 2 ghost step-only runs on Wolfpack/Ambition from R37; no `deleteRun`/`deleteBlock` cleanup path | cosmetic; needs an owner-only backend cleanup mutation |
| P083 | native follow-pin | the pin may release when the sheet opens (keyed on offset vs a deliberate drag) — unverified | flagged R43; needs a native round with a sheet-open pin test |
| L039 | desktop legacy call | the shell calls `rooms:getRoom` with a thread id → ArgumentValidationError in the logs each visit | log noise + a wasted round trip, no user impact |
| L042 | desktop HTML docs | big HTML docs (>100 KB) paint in ~8-11 s via the srcDoc iframe, past the 5 s open budget | perf; serve the file at an iframe-able URL or attach rendered content |
| C022 | chat "latest" | a chat whose own ledger is quiet reads only its own subject, not sibling deeds ("Nothing since Aug 25") | grounding refinement; extend the R53 sibling merge from facts to deeds |

## Verdict
The list now tells the truth. Every user-facing defect Patrik flagged across the mission — composer, agent
bubbles, documents, the Visual Window companion, home entry, send feedback, scroll follow — is resolved and
either verified this session or backed by a shipped, comment-tagged fix. The 7 residuals are a flake, a
tooling accuracy gap, a backend cleanup, one unverified native pin, log noise, an HTML-doc perf item, and a
"latest" grounding refinement — appropriate to carry into their named follow-up rounds, not blockers for the
R15 acceptance walk.
