# R74 - Provider-neutral prompt caching is live and observable

## Verdict

Corner now gives cache-capable providers one long stable prefix and reports the cache tokens they actually return.

## Root cause

The changing agent identity, role, slot, and context pack appeared before the shared rules. Prefix caches therefore diverged near byte one. The bridge also threw away Claude's cache-read/cache-write counters and OpenAI's cached-token counter, so current effectiveness could not be measured.

## Shipped

- Moved the shared answer contract and full slot-task reference before `PER-TURN INPUT`.
- Kept identity, selected slot, facts, output shape, and context after the shared prefix.
- Bumped the live contract to `r74-1`.
- Normalized Claude and OpenAI cache usage without pretending Muse exposes data it does not return.
- Added per-call, per-turn-log, state, and health cache reporting.

## Evidence

- Stable prefix: 6,353 characters, 1,446 `o200k_base` tokens.
- Tests: 252 passed.
- Commit: `22ea08854` on `origin/master`.
- Live bridge: restarted; `/health` returned `status=ok`, `contract=r74-1`, and the cache summary.

## Honest boundary

The installed Claude CLI is logged out. A live warm/repeat probe stopped before inference with `OAuth session expired`, so the code and telemetry are live but a current provider hit rate is still unknown. Restoring Claude authentication is the next gate; switching to OpenAI was not done because it changes provider behavior and spend.
