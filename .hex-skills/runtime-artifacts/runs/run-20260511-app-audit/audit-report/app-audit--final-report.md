# Corner App Audit — Final Report (vision vs. built)

**Run ID:** run-20260511-app-audit
**Date:** 2026-05-11
**Target:** Corner app (aom-studio repo) graded against `corner/VISION.md` commitments
**Surfaces graded:** 8 (home, tasks, project chat, agent chat, files, voice, onboarding, settings + notifications)

---

## The headline read

Corner is **strong at the front door, mixed in the middle, weak at the back office.** Home is shipping well (87.5%). Files and project chat are mostly there (83% and 85%). Agent chat, tasks, and onboarding hover at half. Voice has the entrance but no exit. Settings + notifications is the worst-covered surface.

Several gaps are not "build this from scratch" — they're "finish what's already wired." Notification API exists but no screen reads it. Voice records but doesn't archive. Onboarding has two implementations side-by-side instead of one. Tasks has a regex fallback that fires when the LLM path doesn't, producing the engineer-log voice the vision specifically rejected.

**Composite coverage across 8 surfaces: ~60%.** Half the way there. The remaining half is the half that decides whether using Corner feels like a real product or like a half-built prototype.

| Surface | Coverage | Worst gap |
|---|---|---|
| Home | 87.5% | Time-of-day greeting copy never wired (May 5 reversal) |
| Project chat | 85% | Voice call persistence across navigation, explicit owner-EA routing |
| Files | 83% | Search results have no pagination past 15 hits |
| Tasks | 50% | Status buckets don't match vision; regex fallback paragraph fires when LLM cache empty |
| Agent chat | 50% | Voice transcripts don't write to agent tape; no rename UI; no real typing indicator |
| Onboarding | 50% | Two implementations coexist (`OnboardingVoice.jsx` + `Onboarding.jsx`); router unclear which is live |
| Voice | 44% | Records audio, but transcript flashes for 2 seconds then disappears — no diarization, no routing, no archive |
| Settings + notifications | ~30% | Notification preferences UI missing entirely; project deletion gate missing; skill-catalog notifications missing |

---

## The high-impact findings, deduplicated

### Tier 1 — ship-blocking for the experience YOU use daily

These are the items where Corner's current behavior actively contradicts the vision in a way you (or Ash, or Ben) hit every day.

1. **Two onboarding implementations exist side-by-side.** `OnboardingVoice.jsx` matches the three-question + voice-first + EA-narrates vision. `Onboarding.jsx` doesn't. Router doesn't make clear which one is live. Plus `Onboarding.jsx` spawns multiple agents on day one, conflicting with the day-one-EA-only commitment. One has to be killed; the other has to be canonical.
2. **Task status buckets diverge from vision.** Vision: Right Now / To Do / Schedule / Inbox / Done. Code: Right Now / Inbox / Blocked / Done. "To Do" and "Schedule" missing; "Blocked" added without being in vision. Either the vision is updated to match code, or the code is updated to match vision. Not the same as today.
3. **Voice has an entrance, no exit.** Recording works. Transcript appears for 2 seconds, then disappears. No speaker labels (vision: diarized post-call), no multi-mission routing (vision: spawn missions from one recording), no archive. The most ambitious feature in Corner is currently a tease.
4. **Voice transcripts never write back to the agent's tape (`last-conversation.md`).** Vision says voice calls close the loop — the agent learns what was discussed before the session closes. Today, voice fires the typing indicator but the agent never learns what was said. This is the bug the vision called out at line 105 verbatim — still a bug.
5. **Notification preferences UI doesn't exist.** The `preferences.js` API endpoint is wired. No screen consumes it. You can't toggle the bell, opt into push, or set quiet hours. The whole notifications surface is read-only as a result.
6. **Project deletion gate isn't built.** Vision: typed-"DELETE" confirmation, owner-only / admin-only. Code: nothing. Account deletion exists; project deletion doesn't.

### Tier 2 — visible mediocrity (not blocking, actively dragging quality down)

7. **The tasks-view paragraph falls back to regex when the LLM cache is empty.** Vision explicitly rejected this — "Template synthesis reads like an engineer wrote it; that's a bug." When you open the dashboard and the cache is cold (which happens after every redeploy), you see the engineer-log voice. The thing you specifically said is broken.
8. **Project cards only render when a specific project is selected.** On the default "All" tab — the view you land on — the per-project north star is hidden. The most-used view loses structure.
9. **No real typing indicator on agent chat.** Static "thinking" message instead of true real-time keystroke-level feedback. Pairs with the live-thread step emission rule.
10. **EA defaults to a generic name instead of "{workspace} EA".** Per the 2026-04-28 ratification, the EA should default to the workspace name. Code doesn't set this on scaffold.
11. **No UI to rename an agent conversationally mid-conversation.** Field exists, no surface.
12. **Search placeholder is stale.** Says "messages, tasks, agents, projects" — files have been searched since R68. One-line copy fix.
13. **Time-of-day greeting copy never made it in.** The 2026-05-05 reversal of R57: vision wants morning/afternoon/evening branch. The plumbing computes a time variant; the text doesn't use it.
14. **Cut-scene only handles stale-project nudges.** Other 6 vision sources (needs-input, approvals, etc.) aren't wired.

### Tier 3 — small but real (vision drift, code-doesn't-match-spec)

15. **Skill catalog accept/dismiss notifications missing** (vision: auto-recommend with UI).
16. **Pagination on file search** — capped at 15 hits, no "show more" surface.
17. **Upload size ceiling (25MB)** undocumented in vision; BYO-source preferred path not enforced.
18. **Shared files drawer is orphaned from vision** — message attachments live alongside canon reader but vision doesn't define expected behavior.

---

## What's working well (don't touch)

- **Home** — the greeting + live dot, real-time multi-type search, chronological-by-last-message lists, universal pin/unpin, drag-to-reorder. All built and matching vision.
- **Canon-only file reader** — exactly 5 file types, read-only, tape labeled "agent's notes." Vision-perfect.
- **Live-thread step emission + self-healing subscriptions** in project chat — the R65/R74 work shows up clean here.
- **Shared-room cross-project message isolation** — working as designed.
- **Cut-scene overlay infrastructure** — the entrance pattern is there for stale nudges; needs the other event sources wired but the primitive exists.

---

## Cross-surface duplications (resolved in this report)

- **Voice transcript → tape handoff** appears in BOTH the voice surface report and the agent chat report. Same root cause: post-call summary is never written to the agent's `last-conversation.md`. Consolidated as Tier-1 finding #4 above.
- **Voice call persistence across navigation** appears in the project chat report (because the floating bar should follow the user) and could touch home. Same primitive — top-level WebRTC provider. Consolidated.
- **Onboarding's "multiple agents on day one"** vs **agent chat's "no rename UI"** — same surface area (agent identity flow), different symptoms. Both kept.

---

## Open questions / things to clarify before fixing

1. **Task status buckets** — vision (Apr 18) vs code today. You confirmed the vision still holds. Implication: code needs to add "To Do" + "Schedule" buckets and decide what to do with "Blocked" (rename, merge, or get added to vision).
2. **Onboarding canonical path** — `OnboardingVoice.jsx` is vision-aligned. Confirm it's the keeper, then delete `Onboarding.jsx`.
3. **Shared files drawer** — is it intentionally separate from the canon reader, or vision drift?
4. **"Blocked" task status** — is this a real bucket we want, or did it sneak in during a fix?

---

## Where this leaves us

Two audits in one day:

- **Code-hygiene audit (this morning)** — Corner is safe-foundation-fail (secrets in git, no real CI, no diagnosability) but product-code-clean (concurrency 9.5/10, RLS correct, no SQL/XSS).
- **Product audit (this run)** — Corner is half-built against its own vision. Strong at the front, weakest at notifications + settings + voice. Several "almost there" items where the plumbing exists and one missing piece blocks the value.

Together: the **bones are good, the wiring is unsafe, the rooms are half-finished**. Not a teardown. A focused finishing pass.

The next move is yours. Two reasonable starting points:

- **Finish the experience YOU use daily** — start with the Tier-1 items above (onboarding canonical path, voice closes-the-loop, task status buckets, notification preferences UI). The fastest path to "Corner stops fighting me daily."
- **Close the security/foundation blockers first** — rotate keys, fix the lying build, clean git history (from this morning's audit). Then come back to the product gaps.

Both are right. The first one shows up in your day; the second shows up the moment Ben or Ash hit a path they haven't hit yet.
