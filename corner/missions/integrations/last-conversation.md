# Integrations — Last Conversation

## 2026-08-08 — Production/staging policy correction

Patrik clarified that Lab is staging, not production. The current round is auditing and correcting documentation, workflows, and release checks so production is the default deployment target and Lab is used only when explicitly requested.

The correction is complete. Agent guidance now makes `aom-studio` / `aheadofmarket.com/dashboard` the default and prohibits Lab use without an explicit request. The Lab workflow is manual-only, the local Vercel link points at production, the deployment staleness script queries the production project by name using JSON, and historical Lab release notes now identify those checks as staging rather than production proof. Syntax and live production-staleness validation passed. Unrelated shared-workspace changes were preserved.

Commit `d746f68d` was pushed through `main`. Production deployment `dpl_DuDDN31zBi3ipqkWfMuwzugGDrsA` reached Ready on `aom-studio`, listed the canonical AOM aliases, and the real dashboard served its new entry asset. A separate query of `aom-studio-lab` showed that Lab remained on the older `f537745c` staging deployment, confirming the push did not touch staging.

## 2026-08-08 — OpenAI room brain

Patrik approved an AOM-managed OpenAI brain for chat rooms. The first release uses a private server-side Platform key, keeps BYOK out of scope, and meters every request by authenticated tenant and user. The dashboard picker now includes OpenAI GPT-5.6, validates saved providers, and reports failed saves. Migration `20260808180000` adds a service-role-only usage ledger with atomic monthly reservation and finalization RPCs.

The bridge now hard-routes selected OpenAI rooms through the Responses API with bounded room context, `store: false`, medium reasoning, a pseudonymous safety identifier, and no silent Claude fallback. Its release commit `0fba324d0` is live and the daemon restarted cleanly. Unit, API, focused browser, build, migration, and responsive in-app checks pass. The real upstream smoke reached OpenAI and recorded a request ID, but the current project returned `credit_balance_exhausted`; enabling OpenAI Platform billing is still required for successful answers.

Dashboard commit `310bf1f8` was pushed to `main`. Vercel deployment `dpl_DNQVDyip2beokkwmA4RDT7J5uPyU` reached Ready on `aom-studio`, the production staleness guard matched the release, and the canonical deployed bundle contains the OpenAI picker. The canonical dashboard sent the unauthenticated verification browser to `/login` as expected; authenticated picker behavior remains covered by the passing focused browser test.
