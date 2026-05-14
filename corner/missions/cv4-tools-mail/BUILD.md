# CV4 Tools → Mail — Build Log

## R1 — Scaffold mission + Tools section in drawer + mail UI shell — 2026-05-13

Initial round: stand up the surface, end-to-end, with the Gmail API live for users who have already connected Gmail.

**Changes**

- `corner/missions/cv4-tools-mail/` — mission scaffold (VISION, CONTEXT, BUILD, RESEARCH, last-conversation, research/README).
- `src/dashboard/cv4/Drawer.jsx` — new "Tools" section rendered above "Projects" with the Mail entry. Active when `activeTool === 'mail'`.
- `src/dashboard/CornerV4.jsx` — `activeTool` state, `selectedMail` state, `handleSelectTool`. Threaded to Drawer, ContextNav, MailListPanel, and ChatPanel.
- `src/dashboard/cv4/ContextNav.jsx` — when `activeTool === 'mail'`, title becomes "Mail Room" and the right toggle controls the mail rail (envelope icon + unread count).
- `src/dashboard/cv4/MailListPanel.jsx` — new. Fetches `/api/dashboard/mail/list`, renders today's grouped-by-time list, 30s poll while visible / 5min when hidden, click → onSelectMail.
- `src/dashboard/components/cv3/ChatPanel.jsx` — renders a "Replying to …" chip above the composer when a mail is attached; clears when the conversation moves on or send completes.
- `api/_lib/gmailClient.js` — load + decrypt + auto-refresh Gmail OAuth tokens for the active user.
- `api/dashboard/mail/list.js` — GET, returns the user's today emails after the real-human filter.
- `api/dashboard/mail/get.js` — GET, returns full body for one message.
- `api/dashboard/mail/signature.js` — GET, returns the user's primary send-as signature (HTML + text).
- `api/dashboard/mail/send.js` — POST, sends a reply via Gmail using the user's signature.
- `src/dashboard/cv4/MailChip.jsx` — composer chip for the active reply target (amber, "REPLY · subject · from").
- `src/dashboard/components/cv3/thread/ThreadInputBar.jsx` — renders the MailChip when `activeTool === 'mail' && selectedMail`.
- `src/dashboard/components/cv3/chat/useChatSend.js` — prepends a `[Mail Room context ...]` block to the user's message when `selectedMail` is set, then clears it on send. The EA reads the block and uses `/api/dashboard/mail/send` once the user confirms.

**Status:** in progress — handed off to Elon on 2026-05-13 for live walkthrough + Gmail wiring confirmation.

## R1 verification

- Syntax-checked all six new files (`node --check` for API routes; `esbuild --loader:.jsx=jsx` for the JSX/JS surface). All clean.
- Did NOT run the dev server: `src/dashboard/main.jsx:3` still imports the missing `./GameDashboard.jsx` (pre-existing breakage flagged in `aom-studio/CLAUDE.md`). Resolve that breakage separately before smoke-testing `/cv4`.
- Backend env requirements (already present for the existing Gmail OAuth round-trip): `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. No new env vars introduced by this mission.
