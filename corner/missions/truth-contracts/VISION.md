# Truth Contracts - Mission Vision

**Mission path:** `corner:truth-contracts`

## North star

Corner CV6 is simple, obvious, clean, fast, and dependable: a person can complete real work without repeated breaks, confusion, visual noise, or waiting on the interface.

## Pillars

- One authenticated tenant context with compatibility aliases at system boundaries.
- One canonical file identity shared by Files, Review, previews, and health checks.
- Backend-owned counts, lists, and statuses from the same domain queries.
- Shared CV6 rendering primitives and explicit loading/error/empty states.
- Tenant-and-surface regression coverage plus production verification notes.
- Practical end-to-end workflows with one obvious path, minimal friction, and responsive interaction on desktop and mobile.

## Product standard

Technical correctness is necessary but insufficient. A screen fails when its real workflow is confusing, slow, cluttered, jumpy, inconsistent, misleading, or requires avoidable choices and clicks. Every audit begins with the user's goal and ends with that goal completed end to end.

## Safety boundary

Preserve existing logins, world IDs, world slugs, memberships, and stored tenant data. Do not merge `q` with `qa`, deploy production, or run destructive migrations without explicit approval.
