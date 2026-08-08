# Integrations — Mission Context

**Mission path:** `corner:integrations`
**What it is:** Deployment and external-service environment contracts for Corner.
**Status:** IN PROGRESS
**Scaffolded:** 2026-08-08

## Current state

The deployment contract is corrected and live. `aom-studio` and `aheadofmarket.com/dashboard` are the default production target. Lab is opt-in staging, its workflow is manual-only, this checkout points to production, and the release staleness guard checks production directly. R2's OpenAI picker, server route, and authenticated tenant/user meter are implemented with no BYOK in the first release. The live OpenAI Platform project has no credits, so successful hosted OpenAI answers remain blocked until billing is enabled. R3’s Corner Runner is shipped on production: each user can pair their own computer and route selected rooms through that machine’s locally authenticated Codex subscription without uploading ChatGPT credentials to Corner. The central bridge now yields verified local turns, preventing hosted spend and duplicate replies.
