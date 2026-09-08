# R44 — chat honest image reply: the driver describes what was actually made

Worker: headless builder, chat lane round eleven. Mission folder:
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Reads: `LOOP.md`, `rounds/R42-chat-cite-only-when-it-matters.md`,
`rounds/R33-chat-images-and-instant.md` §image pipeline, `punch-list.md`
rows C009 (C013 names no row in the list; the brief's C009 class is the
live bug). Code: AOM-EA `scripts/v2-team-bridge.py` (HEAD `45ff2370e`,
contract `r44-1`) + `scripts/test_v2_team_bridge.py` (148/148, plain
`python3`, never `-s`). Production `brilliant-scorpion-163` throughout;
`neat-pony-216` never touched. Report: this file.

Verdict: the 6 AM confident-wrong reply is gone by contract, not by luck.
The same ask on the same thread now answers with the no-credits disclosure
the model wrote itself (the boundary backstop fired zero times), the tab
reads "Image study", and the artifact carries `meta.provider: r33-local`.
Probe quality **7/8**, zero scold, zero repeated opener, zero trailing
cite, zero 401s. Unit suite **148/148** (143 existing + 5 R44).
Committed AOM-EA `45ff2370e` (scoped paths only, nothing pushed). Service
restarted **once**, healthy on contract **`r44-1`**. Demo bridge restarted
afterwards on the same build, pinned.

Rule compliance: every URL below is `brilliant-scorpion-163`; no
client-facing sends; production writes this round (all labelled): 1 image
ask + 4 probe questions as the tester on the Wolfpack/Ambition project
threads. Scoped commits, nothing pushed.

## 1. Before / after (same ask, same thread, 7 hours apart)

Ask (orchestrator's 6 AM send, repeated verbatim in the walk with an
"R44 walk:" label): "make an image for the Wolfpack site hero, a plumber
at a Phoenix jobsite at sunrise, wide."

Before (`r42-1`, 6:00 AM): pipeline rendered the local typeset study,
artifact in the Visual Window at 30 s, reply:

> "It shows a plumber at a Phoenix jobsite at sunrise in a wide frame.
> Let me know if you want it warmer, tighter, or with a different angle."

A description of the ask. Patrik opens the tab and sees text on a navy
card.

After (`r44-1`, 13:09-13:10 UTC, this probe's walk turn on Wolfpack
`vd73p369yk2492xr3petckqaa98dx40n`):

> "For Wolfpack I could not reach the image model, no credits. / I made
> a typeset study of your hero brief on brand colours. It is open in the
> Visual Window now. Add Higgsfield credits to render the real photo
> version."

No scene words ("plumber", "sunrise", "shows" all absent). The new
artifact on the thread: title `"Image study — R44 walk: make an image
for the Wolfpack site he…"`, `kind: photo`,
`meta: {brand: Wolfpack, provider: r33-local, status: ready}`,
`hasStorage: true`. Full text in `/tmp/r44-walk.json`.

## 2. What changed (contract diff `r42-1` → `r44-1`)

- Version pin + every R31/R33/R35/R37/R40/R42 rule stays verbatim
  (unit-pinned; the three `r42-1` version asserts bumped to `r44-1` as a
  deliberate contract bump, R42 precedent).
- `run_image_pipeline` returns `provider: r33-local` and titles what was
  actually made: `"Image study — <ask>"` on the create path.
  The upgrade path keeps the client's pending title (the backend's
  `upgradeArtifact` takes no title arg, and a strict-arg backend would
  turn a title write into version churn), but stamps the honest
  `meta.provider` either way. The reply is honest on every path.
- `image` slot task rewritten: was "say what the image shows" (the
  confabulation invitation), now "tell the person what you actually made
  and where it is", with the pipeline result (provider, title, prompt)
  handed over in facts: local renderer → the no-credits / typeset-study /
  Higgsfield-credits disclosure; real provider → describe only what it
  returned, never invent details.
- Global RULES gains the artifact-content rule: content claims about
  artifacts come only from artifact metadata (`meta.provider`,
  `meta.prompt`, `meta.status`) or a real vision read; otherwise say
  what was made and where it is.
- Boundary `honest_image_reply` (pure): on an `r33-local` turn, a reply
  with scene-claim verbs ("shows", "depicts", photographic nouns) or 2+
  of the ask's content words echoing back — without the "typeset study"
  disclosure — is rewritten to `R44_IMAGE_DISCLOSURE` (no em dash, so
  the reply gate stays clean). One overlap is just the honest title
  quoting the ask, so it passes; real providers pass through untouched.
  Wired in three places: the streamed first sentence (it lands mid-call,
  before any wording boundary), the live reply/chunks in `_answer_image`
  (after `Bridge._voice`, so scold/opener/cite gates still apply first),
  and inside `image_plan_for` as the backstop. `[r44]
  image-reply-rewritten` logging on every fire — **zero fires** on the
  walk and probe: the contract did the work, the formatter is a backstop.

## 3. Gates

- `python3 scripts/test_v2_team_bridge.py` = **148/148** (143 existing
  green + 5 new R44: pipeline provider + study title incl. the upgrade
  limitation pin, boundary rewrite of the exact 6 AM reply, honest/real
  passthroughs, plan-level gate, contract wording). Tail:
  `PASS test_r44_*` × 5, `all tests passed`.
- Walk (above, §1): disclosure carried, tab says "Image study", no
  scene claims, `meta.provider: r33-local`.
- Probe run14 (`/tmp/r44-dbg.py` → `/tmp/dbg-run14.json`): Q1 2/2, Q2
  1.5/2, Q3 2/2, Q4 1.5/2 = **7/8**. Q3's harness row was empty (12 s
  quiet vs a 15.4 s model — the R40/R42 harness-timeout class); true
  texts recovered from the backend and scored (§4). Zero 401s since
  restart (log grep 0; `/health failedTicks 0`, `lastTickError null`).
- Service-side timing (the log, not the harness): step **0.7–0.9 s**
  every turn (≤ 1.5 ✓); done 13.0–20.0 — Ambition 15.4/14.4, Wolfpack
  14.5–20.0, all of it model time on the packs (the standing R40 cost).
- Demo bridge restarted on the same build afterwards, pinned
  (`R20_THREAD=vd7f0v4dn3kjjx9qnt9acryemn8dyr95`): `:3099` health shows
  the pinned thread, paige, live, contract `r44-1`, handled 57
  preserved.

## 4. Probe (run14) and scores

- **Q1 Wolfpack latest**: ledger truthfully leads with this round's own
  `did` (the R44 hero image study is a real deliverable row, phrased as
  ledger content), thread (site live, Ross contract signed-and-closed),
  notes (approval wait + drafts hedge: "in your drafts I think;
  confirm?"). One folded-in cite, zero trailing. **2/2.**
- **Q2 Wolfpack next**: shoot-dates follow-up, one folded-in "Your
  notes still say…" cite — and the same flat Gmail restatement as R42
  §6.1 (hedge sits in Q1's tail, not per-answer). **1.5/2.**
- **Q3 Ambition brand kit** (recovered): v2 quoted exactly (navy
  `#1B2A4A`, red `#C41E3A`, ivory `#f4f1ea`, amber-numbers-only, Barlow
  800/900 + Inter, square navy cards, 6–8 px red left stripe, never
  orange), v2-not-the-attachment, footage path with "I think" on the
  location. Zero citations. **2/2.**
- **Q4 Ambition shipped/queued**: schema + buyer-question FAQs + clips
  01–03 redo, queued missions real, `R1 Vision interview` still
  unflagged (standing). **1.5/2.**

## 5. For the orchestrator

1. **Armed-flow tab titles still depend on the client.** A plain ask
   (this walk) takes the create path and titles honestly. An armed
   `imageTool` send with a client-created pending photo takes the
   upgrade path, which cannot rename the tab without a backend change
   (`upgradeArtifact` accepts `artifactId/storageId/meta` only). If you
   want "Image study" on that path too, the backend file needs an
   optional `title` — until then the reply is honest everywhere but the
   armed tab keeps whatever the client named it.
2. **Q2's per-answer hedge** is the same one-sentence brief as R42 §6.1:
   unconfirmed rows hedge in EVERY answer that states them.
3. The walk's harness `step_at` was never captured (2 s poll cadence vs
   a 0.7 s service step); service-side `step_s=0.7` on the image turn is
   the real number. The image turn's `done` (18.0 service / 32.4
   harness with the 15 s quiet rule) has no gate — render + upload +
   model will always exceed the chat 15 s.
4. Suggested next chat item: the per-answer hedge (§5.2), nothing
   structural. The C009 class closes with this round for the create
   path; the armed-title remainder is §5.1.

## 6. Still off and why

- **Wolfpack done 14.5–20.0 s, Ambition Q3 15.4 s.** Arithmetic: pickup
  ≤ 1.2 + pack ≤ 0.8 + step 0.7 + model 10–16 s single-pass Muse. The
  model-time half is the R40 still-off, unchanged; Q3 missed the 15 s
  line by 0.4 s of it.
- **Q3's probe row was empty**: 12 s-quiet window vs a 15.4 s model —
  harness timeout, not service; true texts recovered from the backend
  and scored.

## 7. Incidents (mine, all disclosed)

1. **One production restart, as briefed.** 13:08 UTC via `launchctl
   kickstart -k` on HEAD `45ff2370e`; health `ok`/`r44-1`/`failedTicks
   0`/`lastTickError null` immediately after. No second restart.
2. **My scratch recovery script 401'd once.** It sent
   `Authorization: Bearer None` on the sign-in call (header set
   unconditionally); fixed with the same conditional the walk/probe
   scripts use. Service auth was never involved — tester-side bug,
   caught before any scoring.
3. **No other thread was answered.** Every probe turn completed
   (`done`); `removeStrayStep` not needed.
