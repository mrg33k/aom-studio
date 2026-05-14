# corner:integrations — BUILD log

Round-by-round build log. R0 was research only (see `RESEARCH.md` / `research/2026-05-12-r0-reference-and-data-model.md`). R1+ are real shipping rounds.

---

## R1 — Wire Google into the post-signup onboarding flow

**Date:** 2026-05-13
**Goal:** "Connect the integrations one by one starting with Google so new users can connect their integrations when they sign up." Google is the first integration walked through during the post-signup onboarding flow.

### Scope

- Insert a new step between "Meet your team" (current step 3) and the launch button in `src/pages/Onboarding.jsx`. The step presents a focused Google card with **Connect** / **Skip** controls.
- Reuse existing `/api/integrations/oauth/start` and `/api/integrations/oauth/callback`. Add a `return_to` parameter so OAuth completes back into the onboarding flow rather than landing on `/dashboard`.
- "Google" in this round = `gmail` slug (single Google OAuth consent screen covers profile + Gmail scopes). Calendar and Drive remain in the modal for follow-up rounds — keeping the onboarding flow lean for first-time users.

### Files modified

- `api/integrations/oauth/start.js` — accept `return_to` query param, validate same-origin, embed in signed state.
- `api/integrations/oauth/callback.js` — honor `return_to` from state when redirecting on success/failure.
- `src/pages/Onboarding.jsx` — add step 4 ("Connect Google") between Meet Your Team and Enter Your Corner. Reads `?connected=<slug>` / `?integrations=error` from URL on mount.

### Env vars required (already documented in oauthProviders.js)

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `TOKEN_ENC_KEY` (for state HMAC + token AES-GCM)

### Acceptance criteria

- [ ] New user completes onboarding → after "Meet your team" sees a Google connect card
- [ ] Click "Connect Google" → 302 to Google consent → return to `/onboarding?step=4&connected=gmail`
- [ ] `account_integrations` row exists with `status='connected'`, `integration_slug='gmail'`
- [ ] Click "Skip" advances to the launch button without writing a row
- [ ] Existing `/dashboard?integrations=connected` flow (from `/integrations` modal) still works — only flows that pass `return_to` are diverted
- [ ] `return_to` is validated as a same-origin path (no open redirect)

### Follow-ups (future rounds)

- R2: Add Slack as the second one-by-one card after Google
- R3: Add GitHub
- Subsequent rounds extend the same `onboardingFlow` ordered list — each round wires one provider, in sequence

### Mid-round additions (2026-05-13, after live smoke test)

Live testing surfaced that production `/onboarding` is broken at step 1 — commit `59acef8` (2026-04-16) stripped `ArchitectChat` (it was a stub returning null) and never replaced the JSX. Onboarding has been silently broken ever since: clicking Next on step 0 lands on a blank screen with no way forward, which is why nobody had seen the flow. The R1 Connect-Google step I added is unreachable until this is fixed.

Added a **minimal non-LLM step 1** to unblock the flow:

- Three text fields (`Your name`, `What you do`, `One thing you're focused on` — last is optional)
- Materializes `architectPlan = { user_profile: {name, business, focus, age_range, who_type}, agents: [], projects: [] }` from form input
- `goNext()` from step 1 → step 2 builds the plan, no Anthropic call required to advance
- Step 2's `runCreateAgents` still calls `/api/onboarding/create-agents` (server-side LLM); if Anthropic credits remain exhausted, step 2 will error out and show the existing retry UI

Two consequences for downstream:

1. With step 1 restored, the visual flow is reachable end-to-end again (modulo Anthropic credits for step 2 and OAuth env vars for step 4).
2. When the architect agent is properly re-wired in a future round, this form can move behind a `mode === 'form' | 'chat'` toggle so users get the chat experience while the form remains the no-LLM fallback.

**Status:** R1 + step 1 restoration landed in worktree. Hard blockers for end-to-end live test: (a) Anthropic credit top-up (b) `GOOGLE_OAUTH_CLIENT_ID/_SECRET` + `TOKEN_ENC_KEY` in Vercel (c) merge worktree → deploy. Onboarding visual reskin (CV4 light theme) is the next round once those land.
