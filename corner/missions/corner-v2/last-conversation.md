# Last conversation

Date: 2026-09-10

Patrik asked whether Corner's prompt caching actually works across Claude and other models, then asked for the fault to be fixed.

The live prompt now starts with one stable 1,446-token contract before agent, role, slot, facts, or context change. Claude and OpenAI cache counters now appear in each call, the turn log, state, and health. The 252-test bridge suite passes, commit `22ea08854` is pushed, and the restarted service reports contract `r74-1` with the cache meter present.

The remaining blocker is provider authentication: Claude's local OAuth session is expired and `claude auth status` reports logged out, so the live warm/repeat proof could not reach the model. Do not call the current empty meter a miss; restore the Claude login, then use two normal Corner turns to read the first real hit rate from `/health`.
