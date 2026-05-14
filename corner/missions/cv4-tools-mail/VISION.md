# CV4 Tools → Mail — Vision

The left drawer gains a **Tools** section above Projects. The first tool is **Mail**.

Selecting Mail flips the dashboard into "Mail Room" mode:

- **Right rail (where tasks live):** today's real, human emails. Pulled from the user's connected Gmail (default) via the existing OAuth integration. Refreshes cheaply using Gmail's `history.list` delta API so the inbox is always fresh without burning model tokens.
- **Center (chat panel):** the same EA the user already chats with, framed as the "Mail Room". The conversation is about email — triage, reply drafting, talk-through. ContextNav title becomes "Mail Room".
- **Email click flow:** clicking an email in the right rail attaches it as a context chip on the EA composer. The EA proposes a reply, the user talks it through, then says "send it". The EA calls Gmail to send the message using the user's default send-as signature.

## Why now

Email is the highest-leverage surface to put an EA on. Every other tool the EA could touch (calendar, CRM, docs) is downstream of "what does my inbox want me to do today?". Giving the EA an integrated mail screen means the user stops context-switching to Gmail/Superhuman/etc. for triage and reply.

## Scope: what counts as a "real" email

Real = a human wrote it to *you*. The list view filters out:

- `Precedence: bulk` / `List-Unsubscribe` headers (mailing lists, marketing)
- Known transactional senders (`noreply@`, `no-reply@`, `notifications@`, `mailer-daemon@`, `support@*` automated)
- `Auto-Submitted: auto-*` headers
- The user's own sent mail

Everything else is "today's mail" — the bar we want to clear is "did a human try to reach me today and I haven't responded?".

## Out of scope (v1)

- Threading view inside the right rail (we just show the latest message per thread)
- Attachments rendering in the rail (the chat can fetch + display them on demand)
- Search across all mail (the chat handles that via Gmail's `q=` query)
- Multiple connected accounts (Gmail-only; Outlook hooks come later)
- Calendar/task creation from email (Cleo already has scheduling — wire through later)

## Non-goals forever

We are not building a full mail client. Reading happens here only because *acting* on the email needs reading. The reply experience is **always** chat-mediated — there is no "edit in field, click send" path in this UI. If the user wants raw compose they can keep using Gmail.
