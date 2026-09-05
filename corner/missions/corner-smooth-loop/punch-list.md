# Punch list

Format: `| id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status |`
Status: open / fixing / fixed (round) / wontfix (reason) / needs-patrik (reason)

| id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status |
|---|---|---|---|---|---|---|---|
| P001 | web | room (any) | The "no unread badge" test checks a class (`.unread-badge`) the code no longer renders (`.rrow-dot`), so it passes even if badges regress. | a silent test is worse than no test | corner-convex/e2e/visual.spec.ts (unread assertion); corner-convex/src/routes/Home.tsx:75 | assert on `.rrow-dot` (count and visibility) and add a fixture room with unread so the positive case is photographed | open |
| P002 | web | room / tool follow-up | Tool follow-up sends `userId: null`, the backend rejects it, and the error is swallowed, so the user sees nothing happen. | "clicked and nothing happened" is the definition of a failure | corner-convex/src/routes/Chat.tsx:143 | pass the signed-in user id; surface send failures inline like a normal send error | open |
