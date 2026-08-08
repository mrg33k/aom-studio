# Integrations — Last Conversation

## 2026-08-08 — Production/staging policy correction

Patrik clarified that Lab is staging, not production. The current round is auditing and correcting documentation, workflows, and release checks so production is the default deployment target and Lab is used only when explicitly requested.

The correction is complete. Agent guidance now makes `aom-studio` / `aheadofmarket.com/dashboard` the default and prohibits Lab use without an explicit request. The Lab workflow is manual-only, the local Vercel link points at production, the deployment staleness script queries the production project by name using JSON, and historical Lab release notes now identify those checks as staging rather than production proof. Syntax and live production-staleness validation passed. Unrelated shared-workspace changes were preserved.

Commit `d746f68d` was pushed through `main`. Production deployment `dpl_DuDDN31zBi3ipqkWfMuwzugGDrsA` reached Ready on `aom-studio`, listed the canonical AOM aliases, and the real dashboard served its new entry asset. A separate query of `aom-studio-lab` showed that Lab remained on the older `f537745c` staging deployment, confirming the push did not touch staging.
