# Last conversation

Date: 2026-09-10

Patrik asked whether Corner's prompt caching actually works across Claude and other models, then asked for the fault to be fixed.

The live prompt now starts with one stable 1,446-token contract before agent, role, slot, facts, or context change. Claude and OpenAI cache counters now appear in each call, the turn log, state, and health. The 252-test bridge suite passes, commit `22ea08854` is pushed, and the restarted service reports contract `r74-1` with the cache meter present.

The remaining blocker is provider authentication: Claude's local OAuth session is expired and `claude auth status` reports logged out, so the live warm/repeat proof could not reach the model. Do not call the current empty meter a miss; restore the Claude login, then use two normal Corner turns to read the first real hit rate from `/health`.


### 2026-09-12 — R79 Telegram relay timeout repair (Codex)

Patrik asked to prevent the premature timeouts. Removed the default 20-minute total cap, distinguished running tools from idle model requests, kept bounded stall checks (10 minutes idle model, 30 minutes quiet tool), and added periodic progress/heartbeat plus nonblocking pipe draining. Code is `389e104b1` on AOM-EA origin/master. All 11 regression tests and a real 170-second quiet Muse command passed; relay restarted and verified healthy at PID 68550. Earlier TestFlight build 30 uploaded, but its attachment was not retried by this relay-only fix.


2026-09-13 R80: Restored stopped chat service by recovering the existing bot into ~/.config/corner/bridge-bot.env (0600) and changing runtime config to that durable path. Default Muse, explicit per-message provider routing, per-instance Claude models, and unsupported-pin response are live on master da21796d8. 255 checks pass. Native endpoint live probe returned “Your Smoke Test Project 6 message reached Muse.” at run v577gbf9c50kpm1bgrbjepys1h8eahg5, taking 65.2s. UI work R81 continues in aom-studio/.Codex/worktrees/corner-v2-ios-muse; build31 reserved.


2026-09-13 R81: Native model labels, explicit Muse default, preserved pins and queued model choices, safe transport errors, checklist spacing and visible new-list editing are verified on the 390pt simulator. Four UI flows pass; targeted unit tests pass. Evidence saved under rounds/evidence/R81-*.png. Preparing build31; not on the phone yet.
