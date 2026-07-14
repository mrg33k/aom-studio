# Truth Contracts - Mission Build Plan

**Started:** 2026-07-14
**Mission path:** `corner:truth-contracts`

## Rounds

### R1 - Inventory truth contracts

- Map tenant resolution across CV6 and service-role APIs.
- Map file identity across Files, Review, upload rows, storage keys, and previews.
- Map count/list and status derivation for Review, Files, Command, Campaign, and Support.
- Rank fixes by user risk, tenant isolation, and shared blast radius.

**Status:** queued for the recurring loop.

### R2 - Canonical tenant context

Build the shared authenticated tenant contract and compatibility adapters without renaming existing worlds or data.

**Status:** queued.

### R3 - Canonical file identity

Unify file identity and health across Files and Review.

**Status:** queued.

### R4 - Backend-owned truth

Make counts, lists, and statuses use the same backend snapshots and eligibility rules.

**Status:** queued.

### R5 - Shared CV6 primitives and state semantics

Consolidate message, attachment, preview, and status behavior across every live CV6 surface.

**Status:** queued.

### R6 - Product goal audit

Audit each CV6 screen and tool as a real person completing real work. For every surface:

- State the user's practical goal in one sentence.
- Run primary workflows end to end on desktop and mobile.
- Record broken actions, misleading states, latency, layout shifts, dead controls, clutter, extra clicks, unclear language, stale data, and inconsistent behavior.
- Rank failures by frequency, severity, and user impact.
- Fix one coherent high-impact workflow per round, simplifying rather than adding UI.
- Verify the complete workflow and sibling CV6 surfaces.

Do not postpone obvious user-facing breaks behind architecture work when they can be fixed safely.

**Status:** queued.
