# Final acceptance evidence index (R15) — 2026-09-08, Claude

The R15 gate: Test A green from clean threads; Test B green on the installed TestFlight build AND the
canonical production dashboard; Test C current native + production design evidence; the punch list has no
unblocked open row; the canonical dashboard serves the exact validated production commit. Mission status
changes ONLY when every cited proof is readable. Below is the honest state — what is proven and what is
still gated on an external or Patrik-owned step. **Mission NOT labeled done: two acceptance gates are red
for reasons outside agent control.**

## Green now (proof readable)

- **Test A — chat knows every project (clean threads):** CLOSED. `rounds/GOAL-clean-rerun.md` — pristine
  re-run from empty threads scored Wolfpack 8, Ambition 8, Kraken 8, Aom 7.5, AZ Tech 8, all ≥ 7; pull-ups
  opened within budget; no invented/mis-dated fact, no path leak. Backend + bridge are the live production
  surface (Convex `brilliant-scorpion-163`, bridge running), so this holds on the canonical dashboard.
- **Test C — native design evidence (current):** the R59 iPhone 17 Pro run is the current native evidence —
  composer control row, agent bubbles, document reader (Dracula + Alucard), taller FaceTime, Preview·Context
  tabs + Leave-a-review, drawer sizing, de-boxed glow. `rounds/R59-native-visual-fixes.md`,
  `rounds/evidence/R59-after-document-reader.png`.
- **Punch list — reconciled:** `rounds/R14-punch-list-closeout.md`. 27 stale-open rows reconciled to their
  actual fixed state; 7 residual, none acceptance-blocking (a flake, gate tooling, a backend cleanup, one
  unverified native pin, log noise, an HTML-doc perf item, a "latest" grounding refinement).
- **Desktop R11 (eye + multi-chat) verified + preview-deployed:** tsc/lint/vitest 260 + R58 e2e 5/5;
  preview serves the validated bundle (`index-O6YLI-3i.js`). `c2i 3ad15d3`.
- **TestFlight build 22 shipped:** VALID, attached to Corner testers, beta review WAITING_FOR_REVIEW.
  `rounds/R59-native-visual-fixes.md`; `aom-studio 74556635`.

## Apple gate CLEARED (2026-09-08, late): build 22 beta review is APPROVED

Verified against the App Store Connect API: build 22 `processingState: VALID`,
`betaAppReviewSubmission: APPROVED` — available to the Corner testers group now. The external
Apple-review wait is resolved. Both remaining acceptance steps are now Patrik's two manual actions
(install + deploy), not a third-party wait.

## Red — gated on a Patrik-owned step (no third-party wait remains)

1. **Test B on the installed TestFlight build — build APPROVED; companion SUBSTANCE verified on the
   build-22 artifact code (sim), on-device confirmation pending Patrik's install.** Build 22 cleared Apple's
   beta review. The native companion behavior was walked on the iPhone 17 Pro sim running the exact build-22
   source and captured: the eye cycle hidden → full → FaceTime, and the document rendering on the full stage
   AND inside the taller FaceTime PiP (not black) — `rounds/evidence/R59-testB-native-hidden.png`,
   `R59-testB-native-full-document.png`, `R59-testB-native-facetime-pip.png`. What remains is the literal
   "installed TestFlight build" clause: Patrik installing build 22 on his phone (his device is his viewing
   surface). No third-party wait; the feature substance is proven, the on-device install is his.
2. **Test B on the canonical production dashboard + "serves the validated commit."** RESOLVED the deploy
   target (this matters): `aheadofmarket.com/dashboard` redirects to the **`corner-convex`** Vercel project
   (`prj_hd0EHJumhEj7Jot0M9MLgOuMEBFf`), NOT `corner-v2-integration` (which the local `.vercel` links to).
   corner-convex is a CLI-deployed vite SPA; its live prod (`corner-convex-pom6g63ne`, deployed by Patrik
   11h ago, 2026-09-08 10:42 AM) carries `viewState` but not R11's eye/multi-chat, so the canonical
   dashboard is missing R11. Deploying R11 there needs `vercel --prod` targeting corner-convex — classifier-
   gated, over Patrik's own recent live deploy — so it is his to run (reversible: Vercel rolls back to
   `corner-convex-pom6g63ne` in seconds if needed). Exact path:
   `cd corner-v2-integration && npx vercel link --project corner-convex --yes && npx vercel --prod --yes`
   (then re-link back to corner-v2-integration). R11 is verified and a preview is live. Until corner-convex
   serves R11, Test B's production half and "serves the validated commit" cannot be green. NOTE: an earlier
   handoff wrongly named `corner-v2-integration` as the target — deploying there would NOT update the
   canonical dashboard.

## Why the deploy cannot be done from local artifacts (concrete, not caution)
A local `npm run build` here produces a bundle with NO `VITE_CONVEX_URL` baked in (verified: the local
`dist/assets/index-*.js` contains no `*.convex.cloud`; the live canonical bundle carries
`brilliant-scorpion-163`). Deploying local `dist/` to corner-convex would break the dashboard's backend
connection. The correct deploy MUST build on Vercel with corner-convex's configured production env — which
`npx vercel --prod` (targeting corner-convex) does and which no local/static path reproduces. This is a hard
technical reason the deploy is Patrik's, on top of the classifier gate. Every autonomous avenue is
concretely blocked: the phone install is physical, the preview walk would require typing credentials into a
login form (prohibited), and the local artifacts carry the wrong (empty) backend env.

## Verdict
Everything inside agent control for acceptance is green: Test A closed, native Test C current, the punch
list reconciled, R11 verified, build 22 shipped. The mission is NOT done — two Test-B gates are red because
they need Apple's review to clear and the production desktop promote (a shared-surface, client-facing step)
to land, both of which are outside agent control. Per the plan, the mission stays open until those proofs
are readable. The next concrete steps are Patrik-owned: the prod promote, and installing build 22 when Apple
approves it — then the interactive Test B walk (eye modes, eight condensed chats, one context-window owner,
agent open/close, a reply naming the exact tab/page/scroll) closes R15.
