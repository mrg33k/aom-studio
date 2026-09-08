# Brief R29-chat-grounding — the brain knows the project: CONTEXT.md, history, sibling missions; "latest" is never "nothing"; no UI claims without events; real step labels

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R25-chat-production-bridge.md` (the service as it runs NOW on Patrik's
workspace: `com.aom-ea.corner-v2-bridge`, :3100, env `corner/state/corner-v2-bridge.env`, bot creds
file — do not stop it; you restart it once at the end with `launchctl kickstart -k
gui/$UID/com.aom-ea.corner-v2-bridge` after your tests pass), `punch-list.md` rows **C001, C002, C003**
(yours), and `scripts/v2-team-bridge.py` `context_pack` / `format_context_pack` / the `r21-1`
contract. Report: `rounds/R29-chat-grounding.md`.

You are a headless worker, BUILDER of the chat lane, round four. Nobody will answer questions.

## Patrik, 9:30 PM, on the live desktop

"I asked Wolfpack what the latest is … then Mom said there's nothing in the ledger." And earlier:
"If the agent can't … understand the project in general, work like we are right here, we have more
work to do."

## Build

1. **Context pack v2 (C003).** Per turn, in this order, each section capped so the pack stays under
   ~12k tokens: (a) the project's Mac files: `corner/users/aom/projects/<slug>/CONTEXT.md` (all),
   `BUILD.md` (the last round + Status line), `VISION.md` (first 40 lines), the weekly-update ledger
   if present (`corner/users/aom/projects/<slug>/updates/` or wherever `project_weekly_update_ledger_per_client`
   put it — find it), matched by project slug/title with a fallback table you print at startup for
   every project that has no folder; (b) the project thread's last 30 messages (migrated history
   included) even when the turn is in a mission thread; (c) the mission list with goals/status; (d) the
   thread's last N messages (existing); (e) ledger rows (existing, newest first, and now WORKSPACE-scoped
   for the project, not thread-only); (f) Visual Window state (existing). Unit-test the assembly with a
   fixture project folder.
2. **"Latest" contract.** Rewrite `r21-1` → `r21-2`: "latest / status / where are we" answers are a
   synthesis of (e) → (b) → (a) in that freshness order, named by source ("From the ledger… / From the
   thread… / From the project notes…"); the phrase "nothing in the ledger" is banned when (a) or (b)
   has content; when everything is empty the brain says what it CAN do next. Add the wording gate.
3. **No UI claims without events (C001).** The contract forbids sentences about the Visual Window,
   tabs, files, or "already up" unless the same turn emitted the matching `looking`/`artifact` event;
   the bridge validates the reply against the turn's events and strips or rewrites the offending
   sentence (log it). Unit test with a fake brain that lies.
4. **Real step labels and option subtitles (C002).** Steps are `verb + object` sentences (schema:
   3..80 chars, contains a space); question options carry `label` + `sub` (one line); the gate
   rejects one-word steps and sub-less options and retries once with the violation named.
5. **Prove it on Patrik's real project.** With the service restarted on your code: ask, as the e2e
   account's Aster thread (the demo world) AND, read-only, by replaying Patrik's Wolfpack question
   against the pack builder (do NOT send into his thread; print the pack sections and the synthesized
   answer the brain would give, with sources named, in the report). Then the chat suite live mode
   on production still 8/8.

## Hard lines

Never point at `neat-pony-216`; never restart `room-bridge`/`sse-bridge`; no email/Telegram; the
service's bot identity and env stay as they are; only ONE restart of the service, at the end, after
15 unit + chat suite green. AOM-EA commits scoped to `scripts/` + the mission folder; web worktree
commit scoped to `e2e/chat.spec.ts`; never push. Report: the pack for Wolfpack (sections + sizes),
the before/after answer, the three gates, commits, cost per turn now, "for Patrik".

## Also yours if you are still running (found 9:36 PM, `punch-list.md`)

- **C004** the service's own "Started/Finished a corner-v2-chat run" ledger rows come back as "the latest". Stop writing them as project facts (or tag and exclude them from the pack).
- **C005** a turn may not end on "I will … now": read the file and answer in the same turn, or keep the run open with steps.
- **C006** 83-110 s per turn with Muse as the driver: measure where the time goes (pack size, exec startup, model) and get first sentence under 20 s; stream `message` blocks as they arrive.
