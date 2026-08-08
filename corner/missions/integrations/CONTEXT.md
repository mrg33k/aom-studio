# Integrations — Mission Context

**Mission path:** `corner:integrations`
**What it is:** Deployment and external-service environment contracts for Corner.
**Status:** DONE
**Scaffolded:** 2026-08-08

## Current state

The deployment contract is corrected. `aom-studio` and `aheadofmarket.com/dashboard` are the default production target. Lab is opt-in staging, its workflow is manual-only, this checkout points to production, and the release staleness guard checks production directly.
