# Handoff to Elon — corner:cv4-tools-mail

Drop the message block below into the Elon chat on the dashboard. He'll
read the mission folder for everything else.

---

```
@elon — picking up mission corner:cv4-tools-mail.

R1 is on the branch worktree-cv4-tools-mail (in the worktree at
.claude/worktrees/cv4-tools-mail). It scaffolds a new Tools section above
Projects in the CV4 left drawer, with Mail as the first tool. When Mail is
active, the right rail becomes today's real-human inbox (Gmail), the
ContextNav title becomes "Mail Room", and clicking an email pins it as a
reply chip on your composer so you can talk it through and send via
/api/dashboard/mail/send.

Read in this order:
1. corner/missions/cv4-tools-mail/VISION.md
2. corner/missions/cv4-tools-mail/CONTEXT.md  (touch surface + caveats)
3. corner/missions/cv4-tools-mail/RESEARCH.md (Gmail API + filter logic)
4. corner/missions/cv4-tools-mail/BUILD.md    (what shipped in R1)
5. corner/missions/cv4-tools-mail/last-conversation.md (open questions)

What I'd love your help on next:
- Live smoke test on /cv4 once you can run dev. main.jsx still imports the
  missing GameDashboard.jsx (pre-existing breakage; resolve that first).
- Confirm GOOGLE_OAUTH_CLIENT_ID / _SECRET + TOKEN_ENC_KEY are set in Vercel
  for the prod path. Same envs as the existing Gmail OAuth round-trip.
- Decide whether send should stay chat-only ("send it" phrase) or move to
  a button + 5s undo. There's an open question on this in
  last-conversation.md.
- Once you've read the folder, message Patrik to confirm you have it and
  what you're picking up next.

Worktree: .claude/worktrees/cv4-tools-mail
Branch:   worktree-cv4-tools-mail
```

---

After Elon reads this, the mission folder is the source of truth. He
should update BUILD.md on every transition and append to
last-conversation.md before returning a result.
