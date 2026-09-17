# Last conversation

Date: 2026-09-10

Patrik asked whether Corner's prompt caching actually works across Claude and other models, then asked for the fault to be fixed.

The live prompt now starts with one stable 1,446-token contract before agent, role, slot, facts, or context change. Claude and OpenAI cache counters now appear in each call, the turn log, state, and health. The 252-test bridge suite passes, commit `22ea08854` is pushed, and the restarted service reports contract `r74-1` with the cache meter present.

The remaining blocker is provider authentication: Claude's local OAuth session is expired and `claude auth status` reports logged out, so the live warm/repeat proof could not reach the model. Do not call the current empty meter a miss; restore the Claude login, then use two normal Corner turns to read the first real hit rate from `/health`.


### 2026-09-12 — R79 Telegram relay timeout repair (Codex)

Patrik asked to prevent the premature timeouts. Removed the default 20-minute total cap, distinguished running tools from idle model requests, kept bounded stall checks (10 minutes idle model, 30 minutes quiet tool), and added periodic progress/heartbeat plus nonblocking pipe draining. Code is `389e104b1` on AOM-EA origin/master. All 11 regression tests and a real 170-second quiet Muse command passed; relay restarted and verified healthy at PID 68550. Earlier TestFlight build 30 uploaded, but its attachment was not retried by this relay-only fix.


2026-09-13 R80: Restored stopped chat service by recovering the existing bot into ~/.config/corner/bridge-bot.env (0600) and changing runtime config to that durable path. Default Muse, explicit per-message provider routing, per-instance Claude models, and unsupported-pin response are live on master da21796d8. 255 checks pass. Native endpoint live probe returned “Your Smoke Test Project 6 message reached Muse.” at run v577gbf9c50kpm1bgrbjepys1h8eahg5, taking 65.2s. UI work R81 continues in aom-studio/.Codex/worktrees/corner-v2-ios-muse; build31 reserved.


2026-09-13 R81: Native model labels, explicit Muse default, preserved pins and queued model choices, safe transport errors, checklist spacing and visible new-list editing are verified on the 390pt simulator. Four UI flows pass; targeted unit tests pass. Evidence saved under rounds/evidence/R81-*.png. Preparing build31; not on the phone yet.

2026-09-13 R81 release: Build31 archive/export/upload succeeded; app includes CornerWidgets. Apple VALID, attached to Corner testers (204), beta review submission 201 WAITING_FOR_REVIEW. ID a25cb1af-0098-48aa-8061-4a3eb7efb744; native commit cc8af3f2 on main. Backend config c49e197b4 on master; health remains ok with Muse default and no failed ticks. Chat repaired and live, app update awaiting Apple review; live Muse reply took65.2seconds, so latency remains a limit. Full old design-tour harness was unavailable because its temporary e2e credentials are missing; new interaction tests and inspected screenshots are the proof.


## 2026-09-17 — R82 harness study (Phase 0 of the chat rebuild)

Patrik asked for the iOS app graded as a harness against the charter's four legs plus model swap, then narrowed to the chat experience, then zoomed out: "we're trying to patch but we aren't creating the real solution for the chat." The two grading passes showed why: the bridge is a regex intent chain around one toolless completion (29 round numbers, 21 gauntlet-defect markers, 83 dated fixes in one 12,677-line file; latest gauntlet 97/144, median turn 56 s), and 2 of the last 50 iOS commits touch the turn. The 2026-09-09 note had already named the fix ("give the brain real tool access") and shipped a classifier instead. The original `scripts/bridge.py` ran a real SDK session with tools; v2 removed it for latency.

Patrik corrected the frame in plan review: behind the chat is the LLM of choice; the harness is the agency's skills as one hard-working, easy-to-talk-to agent; order of operations, not rules; "never send" is a bad rule, approvals are a tier like Cursor; latency does not matter while real steps fire; build for three years; study real code before building; decide forks by cage match; guide a normal model toward an AGI-feeling experience. Decisions taken: the model's own CLI owns the loop as the working hypothesis (now Cage 1), chat turns get hands, Muse first. aom world owners: patrikmatheson@gmail.com and Ash's account.

Shipped: `corner/missions/corner-v2/research/harness-study/` — TEMPLATE.md, ten exemplar briefs, PATTERN.md. Next: Patrik reads PATTERN.md §11 (prune exemplars, define "kick ass" for the judge, which sends get a standing tier), then Phase 1 writes the Corner spec in the exemplars' terms and the fixture (hands MCP server, approval stack, item stream, skills catalog, hands station) before Cage 1. Briefs belong to `corner:assistant-gauntlet` in AOM-EA; they sit here because this session pushes to aom-studio only.
