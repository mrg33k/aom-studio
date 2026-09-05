# Punch list

Format: `| id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status |`
Status: open / fixing / fixed (round) / wontfix (reason) / needs-patrik (reason)

| id | platform | screen | what is wrong | why it fails the bar | file:line | proposed fix | status |
|---|---|---|---|---|---|---|---|
| P001 | web | room (any) | The "no unread badge" test checks a class (`.unread-badge`) the code no longer renders (`.rrow-dot`), so it passes even if badges regress. | a silent test is worse than no test | corner-convex/e2e/visual.spec.ts (unread assertion); corner-convex/src/routes/Home.tsx:75 | assert on `.rrow-dot` (count and visibility) and add a fixture room with unread so the positive case is photographed | open |
| P002 | web | room / tool follow-up | Tool follow-up sends `userId: null`, the backend rejects it, and the error is swallowed, so the user sees nothing happen. | "clicked and nothing happened" is the definition of a failure | corner-convex/src/routes/Chat.tsx:143 | pass the signed-in user id; surface send failures inline like a normal send error | open |
| P003 | web | room (desktop) | Short threads sit at the top, leaving a roughly 400 px empty gap between the last message and the composer. | the emptiest screen in the suite; reads unfinished at 1440 px | corner-convex/src/routes/Chat.tsx (thread container), src/polish.css | recommendation: keep top anchoring (Slack/ChatGPT do) but let the empty welcome state fill the column with the room's agent, purpose, and three suggested prompts; Patrik decides | needs-patrik (design direction) |
| P004 | web | room (entry) | `.main > * { animation: none }` in polish.css is dead because index.css wins by import order; the 0.2 s enter fade still runs. | a rule that looks like it turns motion off but does not will mislead the next edit | corner-convex/src/polish.css:32, src/index.css:372 | delete the dead rule or make the intent explicit (keep the fade, remove the override) | open |
