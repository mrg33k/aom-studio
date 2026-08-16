# Decision record — CV6 ScreenBoundary (the "hit a snag" screen)

## agent

Claude (Opus 5), working as Patrik's EA on `corner:convex-multi-agent`, 2026-08-16.
My call, my name on it.

## artifact

`src/dashboard/cv6next/CornerCV6.jsx` — the `ScreenBoundary` component (the crash screen a
user sees when a CV6 screen throws). Commits `a5ead717` (this change) and `3aa8afc8` (the
crash fix that made this screen stop appearing).

Scope note, stated plainly so this record is not read as more than it is: **this session
designed no screen.** The visual changes to Corner's UI in this session total zero pixels.
What I changed on this component is a `data-testid` attribute and a `componentDidCatch`
console log. I am signing a record because this component *is* a screen a real user sees,
I touched it, and I have a view about it that should be on the record rather than left
implied.

## call

I shipped two non-visual additions to the crash screen and deliberately did **not** redesign it.

1. `data-testid="cv6-screen-error"` — because detection was matching prose, and prose lies.
   A room's message preview legitimately reads "That task hit a snag and was marked failed",
   and my own verification consequently reported a perfectly healthy dashboard as crashed.
   A crash screen that cannot be distinguished from a message *about* a crash is not
   observable, and an unobservable failure state is how this outage survived a full day.
2. `componentDidCatch` logging `[cv6-screen-error]` with the view key and component stack —
   because finding the cause meant demangling a 1.1MB production bundle to learn that `g`
   was `shaped`. The boundary caught the error and told nobody which boundary it was.

What lost: redesigning this screen. I considered it — it is four flat elements on flat
ground, it has no visual anchor, and by rule 0 of the design gate it is thin. I rejected
that for this session on the grounds that production was actively down, the fix was a
one-line reorder, and bundling a visual redesign into a hotfix is how you turn a 20-minute
outage recovery into an unreviewable diff. The redesign is named in `would_change` and it
should happen on its own, with a brief.

On the gate's rule 0 as it applies to what is there today: the screen's job is "your screen
broke, you did not lose anything, get back to safety." It states the reassurance
("Nothing was lost") and gives exactly one obvious action ("Back to rooms"). It is not a
dead end. It is, however, plain.

## measured

Real tool output, pasted.

Reproduction of the failure state on the live authenticated dashboard, before the fix
(`mcp__chrome-devtools__evaluate_script`):

```json
{"url":"https://www.aheadofmarket.com/dashboard","title":"Corner — Your AI Team in a Dashboard",
 "boundary":"hit a snag","rootChildren":2,"counts":{"buttons":4,"roomish":0,"messages":0},
 "visibleText":"This screen hit a snag\nTap back and try again. Nothing was lost.\nBack to rooms\nKore\nTAP TO SPEAK"}
```

Console, same page (`list_console_messages`, type=error):

```
msgid=2 [error] ReferenceError: Cannot access 'g' before initialization
msgid=8 [error] Failed to load resource: the server responded with a status of 401 ()
```

Stack, captured by re-mounting the surface with a handler installed:

```
ReferenceError: Cannot access 'g' before initialization
    at Ip (https://www.aheadofmarket.com/assets/CornerCV6-DIOCkvwl.js:12:7921)
    at ex (https://www.aheadofmarket.com/assets/CornerCV6-DIOCkvwl.js:2578:7361)
```

`python3 scripts/design_facts.py CornerCV6`:

```
VERIFIED FACTS (from the code -- ground truth, do not contradict):
  banned serif present: no
```

Build after the change:

```
✓ built in 11.74s
emit-dashboard-html: wrote dist/dashboard.html with the Corner manifest baked in
```

Regression suite for the defect class (`node --test tests/cv6-hook-dep-order.test.mjs`):

```
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

Full node battery before vs after (`npm test`, and the same battery run in a clean worktree
at the pre-fix commit `02714227`):

```
pre-fix : ℹ tests 139  ℹ pass 107  ℹ fail 32
post-fix: ℹ tests 147  ℹ pass 118  ℹ fail 29
```

Live verification after deploy (`node tests/e2e/diagnose.mjs`):

```
=== error boundary visible? === no
=== app mounted? === #root children: 2, buttons: 9
  supabase message calls : 4
  convex calls           : 0
```

CV6 capability baseline (`node tests/e2e/run.mjs --surface cv6`): 17 pass / 7 fail / 1 gap
of 25, with all core capabilities passing except `backend.convex-only-messages`, which
correctly fails because the dashboard is still on Supabase.

I did **not** run `design_spacing_check.py`, `design_balance_probe.js` or
`design_visual_probe.js` against this component. I am not claiming their result. They grade
composition of a designed screen, and I changed no composition; running them to paste a
green line would be exactly the rubber-stamping this format exists to prevent.

## uncertain

Three things I might have got wrong, specifically.

1. **I never saw the crash screen rendered at full size.** I captured its DOM text and its
   console error, and I fixed the cause, but I did not photograph the boundary itself before
   it stopped appearing — and I deliberately did not induce a crash in production to get a
   picture. So my read that it is "four flat elements, no anchor, plain but not a dead end"
   is from the JSX and the extracted text, not from looking at it at 1:1. A sharper eye
   looking at a real close-up crop might find it worse than plain: the button is a 36px pill
   with a 1px `--hair` border on `--surface-2`, and at low opacity against the app ground
   that could read as disabled rather than as the one action. That is precisely the class of
   thing rule 2b says does not survive compression, and I did not verify it.

2. **My `componentDidCatch` may double-log.** React already logs the error itself, so on a
   crash the console now carries both React's report and mine. I judged the labelled version
   worth it because `[cv6-screen-error]` is greppable and React's is not attributable to a
   boundary. But I did not verify the combined output in a real crash after deploying — I
   verified the build and that the screen no longer appears. If it is noisy, that is on me.

3. **The `data-testid` I added is now a contract.** I wrote it into `diagnose.mjs` and into
   Muse's brief as a required hook on every surface. If someone renames it, detection
   silently reverts to matching prose, which is the false-positive I just removed. I added no
   test that asserts the attribute exists. That is a gap I am aware of and did not close.

## would_change

- **Redesign this screen properly, as its own brief.** It should carry a real visual anchor
  rather than centred text on flat ground, and the recovery action should be unmistakably the
  primary control. Right now it is honest and calm, which is the correct tone for "your
  screen broke", but it is not impressive and I would not claim otherwise.
- **Show the user something actionable.** It says "Nothing was lost" and offers "Back to
  rooms". With more time I would add a quiet retry-in-place (the boundary already clears its
  error on `viewKey` change, so a retry is nearly free) so the user is not forced all the way
  back to the room list to recover from a transient render error.
- **Assert the test hook.** A one-line test that `data-testid="cv6-screen-error"` is present
  in the boundary's JSX, so the observability I just added cannot be silently deleted.
- **Wire the labelled crash log to a real sink**, so the next occurrence pages someone
  instead of waiting to be noticed.

## risk

If I am wrong, the blast radius is small and bounded, which is why I shipped it during an
outage rather than waiting.

- The `data-testid` and the log are additive. Neither can throw, neither renders, and neither
  changes layout. Worst realistic case is console noise on an already-broken screen.
- The real risk sits in the *other* commit this record's artifact depends on: the memo reorder
  in `useHomeData.js`. If that were wrong, the dashboard would not render at all for every
  signed-in user, which is the exact outage it fixed. I verified it live and looked at the
  rendered room list, and the battery went from 32 failures to 29 with none introduced.
- The genuine residual risk is my third uncertainty: someone renames the test hook, detection
  quietly falls back to prose matching, and a future crash gets reported as healthy — the
  same failure mode that already cost a day here. Nobody would notice until the next outage,
  which is exactly the wrong time to find out.
