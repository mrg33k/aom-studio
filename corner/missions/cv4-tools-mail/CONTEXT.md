# CV4 Tools → Mail — Mission Context

**Mission path:** `corner:cv4-tools-mail`
**Worktree:** `.claude/worktrees/cv4-tools-mail` (branch `worktree-cv4-tools-mail`)
**Status:** NEW
**Scaffolded:** 2026-05-13

## Why this exists

Adds a **Tools** section to the CV4 left drawer (above Projects) whose first entry is **Mail**, an integrated Gmail-backed mail-triage experience inside Corner. The mission body is in `VISION.md`. The build log is `BUILD.md`.

## Touch surface

- `src/dashboard/cv4/Drawer.jsx` — new TreeSection above Projects.
- `src/dashboard/CornerV4.jsx` — `activeTool` state. When `'mail'`, the right docked rail renders the new MailListPanel; ContextNav title becomes "Mail Room"; tasks-drawer toggle becomes the mail toggle.
- `src/dashboard/cv4/MailListPanel.jsx` — new. Today's emails, 30s history-delta poll while visible.
- `src/dashboard/cv4/ContextNav.jsx` — render "Mail Room" + Mail toggle when `activeTool === 'mail'`.
- `src/dashboard/components/cv3/ChatPanel.jsx` — render mailContext chip on the composer.
- `api/dashboard/mail/list.js` — list today's real-human emails.
- `api/dashboard/mail/get.js` — fetch full message body for a given id.
- `api/dashboard/mail/signature.js` — fetch the user's primary send-as signature.
- `api/dashboard/mail/send.js` — send a reply through Gmail, appending the signature.
- `api/_lib/gmailClient.js` — new. Pulls + decrypts + refreshes the user's Gmail OAuth tokens.

## Dependencies that already exist

- Gmail OAuth round-trip is wired (`api/integrations/oauth/start.js` + `callback.js`).
- Provider config in `api/_lib/oauthProviders.js` already includes `gmail` with `gmail.modify` + `gmail.send` scopes.
- Tokens stored AES-GCM-encrypted in `account_integrations.config.tokens`. Helpers in `api/_lib/oauthCrypto.js`.

## Caveats

- `gmailClient.js` needs `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET` set in Vercel env to refresh tokens. `TOKEN_ENC_KEY` already required by every other oauth path.
- Gmail API quota is generous (1B units/day per project) but each `messages.list + get` per email costs 5+ units; we batch with `format=metadata` for the list and `format=full` only on click.
- Refresh strategy: client polls `/api/dashboard/mail/list?since=<historyId>` every 30s while panel is visible; falls back to 5min when document hidden. No model tokens burned by refresh — only Gmail API calls.
- Right-rail mail list **replaces** the tasks panel only when `activeTool === 'mail'`. Mobile/tablet tab toggle continues to flip the center column.
