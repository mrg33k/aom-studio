# corner:integrations — CONTEXT

**Status:** IN PROGRESS (R1 — Google in onboarding)

## What this mission is

Build out the Pica-style integration layer that lets users connect third-party tools (Gmail, Slack, Notion, etc.) so agents can act on their behalf. The catalog modal (`/integrations`) is one surface; the post-signup onboarding flow is the other — users get walked through connecting their tools one by one as soon as they create a Corner.

## Active surfaces

- **Catalog modal** — opened via `/integrations` slash command. Browse + connect any integration any time. Source: `src/dashboard/components/cv3/IntegrationsModal.jsx`.
- **Onboarding walkthrough** — step 4 of `/onboarding`. One card per provider, in `ONBOARDING_INTEGRATIONS` order. R1 starts with Google (gmail). Source: `src/pages/Onboarding.jsx`.

## Round history

- **R0** (research, 2026-05-12) — Reference app, data model, slash-command audit, menu UX. See `research/2026-05-12-r0-reference-and-data-model.md`.
- **R1** (2026-05-13) — Google in onboarding flow. See `BUILD.md` + `last-conversation.md`.
