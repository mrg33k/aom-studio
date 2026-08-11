# Integrations — Last Conversation

## 2026-08-08 — Production/staging policy correction

Patrik clarified that Lab is staging, not production. The current round is auditing and correcting documentation, workflows, and release checks so production is the default deployment target and Lab is used only when explicitly requested.

The correction is complete. Agent guidance now makes `aom-studio` / `aheadofmarket.com/dashboard` the default and prohibits Lab use without an explicit request. The Lab workflow is manual-only, the local Vercel link points at production, the deployment staleness script queries the production project by name using JSON, and historical Lab release notes now identify those checks as staging rather than production proof. Syntax and live production-staleness validation passed. Unrelated shared-workspace changes were preserved.

Commit `d746f68d` was pushed through `main`. Production deployment `dpl_DuDDN31zBi3ipqkWfMuwzugGDrsA` reached Ready on `aom-studio`, listed the canonical AOM aliases, and the real dashboard served its new entry asset. A separate query of `aom-studio-lab` showed that Lab remained on the older `f537745c` staging deployment, confirming the push did not touch staging.

## 2026-08-08 — OpenAI room brain

Patrik approved an AOM-managed OpenAI brain for chat rooms. The first release uses a private server-side Platform key, keeps BYOK out of scope, and meters every request by authenticated tenant and user. The dashboard picker now includes OpenAI GPT-5.6, validates saved providers, and reports failed saves. Migration `20260808180000` adds a service-role-only usage ledger with atomic monthly reservation and finalization RPCs.

The bridge now hard-routes selected OpenAI rooms through the Responses API with bounded room context, `store: false`, medium reasoning, a pseudonymous safety identifier, and no silent Claude fallback. Its release commit `0fba324d0` is live and the daemon restarted cleanly. Unit, API, focused browser, build, migration, and responsive in-app checks pass. The real upstream smoke reached OpenAI and recorded a request ID, but the current project returned `credit_balance_exhausted`; enabling OpenAI Platform billing is still required for successful answers.

Dashboard commit `310bf1f8` was pushed to `main`. Vercel deployment `dpl_DNQVDyip2beokkwmA4RDT7J5uPyU` reached Ready on `aom-studio`, the production staleness guard matched the release, and the canonical deployed bundle contains the OpenAI picker. The canonical dashboard sent the unauthenticated verification browser to `/login` as expected; authenticated picker behavior remains covered by the passing focused browser test.

## 2026-08-08 — Corner Runner

Patrik approved a local runner so every Corner user can select `Codex on this computer`, authenticate with their own ChatGPT subscription, and let Corner work only inside a folder they choose. The release uses expiring one-time pairing, device-bound tokens stored only on the computer, outbound HTTPS polling, and the Codex CLI’s workspace sandbox. Corner never receives ChatGPT credentials and opens no inbound network port.

The production database migration `20260808213000`, dashboard pairing/status UI, queue APIs, downloadable Node runner, and central-bridge handoff are live. Dashboard commit `7d15a83c` deployed as Vercel production `dpl_5noRFqS8fvzQDsBwwuqbpNXHjez9`; bridge commit `6b56db4ad` is on `master`, and the daemon restarted cleanly as PID 1763. Eighteen Node tests, two focused browser flows, the production build, syntax checks, mobile/desktop visual QA, remote migration history, canonical runner download, and safe live API failure paths all pass. The first authenticated paired-computer turn remains the user-level acceptance check.

## 2026-08-11 — Auto falls back to Codex

Patrik reported that the Claude organization subscription was disabled and Auto exposed the failure instead of switching models. The audit found that Codex existed only as an explicit room route, the bridge's automatic ladder started with hosted providers, and the exact production banner put “disabled” before “subscription,” outside the old usage-limit matchers.

R4 makes an online paired Corner Runner the first Auto fallback. The authenticated dashboard write path strips untrusted fallback metadata and stamps the sender's verified online device. When Claude fails, the bridge reads the original message row, rechecks user, tenant, device ownership, revocation, status, and heartbeat freshness, then idempotently queues the turn before Gemini/Kimi/DeepSeek. Receipt bookkeeping cannot trigger a duplicate second lane after the durable job exists.

The authenticated dashboard session paired this Mac as `AOM Studio Mac`, limited it to the AOM-EA workspace, and installed a persistent LaunchAgent. Pairing exposed a separate production defect: `https://aheadofmarket.com` redirects to `www` and strips the runner Authorization header. The downloadable runner and this device now use the canonical `https://www.aheadofmarket.com`; the device is heartbeat-online. Focused Node and bridge suites, Python compilation, and the Vite production build pass.

Dashboard/API commit `d653658f` deployed as Vercel production `dpl_DnkcJcNED91VJoARWrqkRGjm2guf`; the canonical site serves the new Auto label and corrected runner. Bridge commits `e090cc81a` and `cb36f5376` are on `master`, and the daemon restarted healthy as PID 90621. The first live smoke exposed that the final transcript delivery path still treated the disabled-subscription banner as an answer; `cb36f5376` unified final-block API errors and limit banners under the fallback classifier. The second authenticated smoke, turn `5234926d`, then queued job `051f5a81` and returned exactly `FALLBACK_SMOKE_OK_2` from source `corner-runner` with `local_codex: true`. Live counters read one queued Codex fallback and zero unavailable.
