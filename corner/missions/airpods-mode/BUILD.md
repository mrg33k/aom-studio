# Corner AirPods Mode — Build

**Mission path:** `corner:airpods-mode`

### R1 — Global voice operating layer (2026-08-08)

**Scope:**

- Promote CV6 voice from a room-composer feature to a dashboard-wide session.
- Add activation, brief narration, attention batching, safe action execution, and
  room-aware conversation handoffs.
- Add the web/native boundary and an iOS packaging path.
- Preserve tenant isolation, verified speaker attribution, and existing CV6 changes.

**Implemented:**

- Global CV6 AirPods provider with wake/shortcut/button activation, explicit states,
  settings, quiet hours, and proactive attention batching.
- Gemini Live sessions use short-lived ephemeral tokens; tool calls route through a
  tenant-verified, allowlisted, idempotent, audited action broker.
- Durable sessions, room segments, action audit entries, attention queue, and a
  structured-handoff migration with no raw-audio storage.
- Capacitor iOS shell with native on-device “Hey Corner” detection, voice audio mode,
  lock-screen audio entitlement, and media-control activation.
- Simulator target compile-check completed successfully with Xcode 26.3.

**Verification:**

- `npm run test:airpods` — 6/6 passed.
- `npm run build` — passed.
- API syntax + `Info.plist` validation — passed.
- `xcodebuild` iOS simulator compile — passed.
- Tenant context and identity contracts — passed. The aggregate tenant command still
  reports two unrelated, pre-existing hardcoded slugs in `api/client-parts.js` and
  `api/prospect-report.js`.

**Release configuration:**

- Apply `supabase/migrations/20260808000000_airpods_mode.sql` before enabling the mode.
- `AIRPODS_CONFIRMATION_SECRET` may be set to a dedicated HMAC secret; the service-role
  key is the server-only fallback.
- `VITE_CORNER_API_ORIGIN` overrides the native shell API origin; the default is
  `https://lab.aheadofmarket.com`.
- A signed physical-device/TestFlight pass remains required to validate long-running
  lock-screen behavior and permissions under App Store conditions.

**Status:** complete — implementation and simulator verification shipped; release validation remains

### R2 — Production mobile-web release (2026-08-08)

**Scope:**

- Isolate R1 from unrelated shared-workspace changes in a clean release tree.
- Apply the AirPods data migration to the production Supabase project.
- Deploy to the verified `aom-studio` Vercel project and validate the canonical
  `https://aheadofmarket.com/dashboard` surface on a mobile viewport.
- Keep native-only wake phrase and lock-screen behavior clearly separated from the
  mobile-web button experience.

**Release decision:** The native shell fallback API origin was changed from the staging
Lab host to the canonical production origin, `https://aheadofmarket.com`. A future
staging build must set `VITE_CORNER_API_ORIGIN` explicitly.

**Production migration:** Applied only `20260808000000_airpods_mode.sql` to the linked
Supabase production project and marked that exact version applied. Bulk `db push` was
not used because the local migration directory contains unrelated historical versions
that are absent from the remote ledger.

**Clean-release verification:**

- Vercel link inspected: project `aom-studio`, ID
  `prj_QevbLDIRNclQwfVBuzahOtF7NuDC`, Ahead's projects scope.
- AirPods tests — 6/6 passed.
- Tenant context and hardcoded-identity contracts — passed.
- API syntax and `git diff --check` — passed.
- Production Vite build — passed from the isolated release worktree.

**Production result:**

- Release commit `ab2f6aea` was pushed as a fast-forward to `main`.
- Vercel Git deployment `aom-studio-15z75l2kp-aheads-projects-d2a4c70f.vercel.app`
  reached READY for project `aom-studio`.
- Canonical `https://aheadofmarket.com/dashboard` returned HTTP 200 at a 390×844
  mobile viewport. The available test browser was not signed in, so it correctly
  redirected to `/login`; authenticated visual interaction remains a user smoke test.
- All four `airpods_*` tables were verified in production.
- Both new production API routes were verified present and correctly returned 401
  `jwt required` without a session.
- `npm ci` reported 29 dependency-audit findings in the existing dependency tree
  (1 low, 15 moderate, 11 high, 2 critical); no automatic breaking audit fix was run.

**Status:** complete

### R3 — Mobile legibility and voice handshake recovery (2026-08-08)

**Evidence:** Physical iPhone/AirPods testing showed the floating panel overlapping the
CV6 composer with low-contrast inherited tokens and oversized settings controls. The
microphone activated, but the session stayed on “Connecting…” and Corner never greeted
the caller or advanced into a usable conversation.

**Scope:**

- Replace the mobile panel with an opaque, compact, CV6-safe surface that never covers
  the message composer; move advanced settings into a readable sheet.
- Put one persistent headphones control in the desktop bar and the mobile Home/Chat
  headers.
- Gate microphone frames on Gemini's setup acknowledgement, send a short greeting turn,
  include the PCM sample rate, time out stalled connections, and support retry.

**Verification:**

- Focused AirPods tests — 8/8 passed, including handshake ordering and header presence.
- Production Vite build — passed from the isolated R3 release worktree.
- 390×844 visual check — menu measured 320×169 at the top edge, used opaque cool-ink
  colors, and did not overlap the composer (`menu.bottom=235`, `composer.top=758`).
- `git diff --check` — passed.

**Status:** verified — production deployment in progress
