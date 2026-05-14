# Last conversation — corner:cv4-tools-mail

## 2026-05-13 — Mission scaffold + R1 implementation (background session)

User invoked `/goal` from the dashboard chat with the spec:

> Create a new section above projects on the left drawer called Tools. The first tool is Mail. Mail mode: left drawer keeps showing projects, but where tasks live on the right rail we show today's real emails from Gmail. The center chat panel becomes the EA disguised as the "Mail Room". Clicking an email pulls it into chat so the EA can draft a reply or talk it through with the user before sending. Always sign with the user's default Gmail signature.

Background agent opened the `cv4-tools-mail` worktree, scaffolded this mission folder, and started building R1.

## Open questions for the user

- **Default account if Gmail isn't connected.** We currently 401 with `integration:not-connected` and the rail surfaces a "Connect Gmail" inline button. Confirm that's the right empty state vs. silently hiding the Tools section.
- **Reply tone.** EA defaults to matching the sender's tone + length. Want a per-user override later.
- **"Send" gate.** v1 sends only after the user types a literal "send it" / "send" / "looks good — send" message. We can swap to a button + 5s undo later if that feels too chatty.

## Handoff to Elon — 2026-05-13

User asked to hand R1 off to Elon on the dashboard so they can keep working with him on it. Wrote `HANDOFF.md` in this folder with the exact paste-into-chat snippet — user will drop it into the Elon room next. Elon will message the user back once he's read the folder.
