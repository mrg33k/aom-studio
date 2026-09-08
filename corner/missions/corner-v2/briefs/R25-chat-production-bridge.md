# Brief R25-chat-production-bridge — a real brain answers EVERY v2 thread in production, as a service, starting with Patrik's own workspace

Mission: `corner:corner-v2`. Mission folder (absolute):
`/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio/corner/missions/corner-v2/`
Read `LOOP.md`, `rounds/R20-chat-team-protocol.md`, `rounds/R21-chat-live-brains.md` (the bridge you
extend: `AOM-EA/scripts/v2-team-bridge.py`, protocol, adapters, unit tests), `rounds/LEDGER.md` newest
rows (PRODUCTION LIVE: the web and the Mac's writers are on `brilliant-scorpion-163`; the deploy key
`/tmp/r18-deploy-key` lets the orchestrator deploy `convex/`). Report: `rounds/R25-chat-production-bridge.md`.

You are a headless worker, BUILDER of the chat lane, round three. Nobody will answer questions.

## Patrik, 7:10 PM

"agent is stuck opening and closing the app no testing has been done on the chat quality or the
experience." The blunt truth behind it: production has NO agent answering v2 threads. The R20/R21
bridge is a test instance that watches one probe mission for one test account. The old
`sse-room-bridge` answers legacy rooms only. When Patrik or Karen writes in the new web or the phone,
nothing replies. This round makes a real brain answer, for real accounts, as a service.

## Build

1. **A bot identity with access.** `convex/lib/members.ts` `AOM_MEMBER_EMAILS` makes a sign-up with a
   listed email an owner of the AOM world (`convex/auth.ts` createOrUpdateUser). Add
   `bridge@aom-inhouse.com` to that list (web worktree `convex/lib/members.ts`; the orchestrator
   deploys with the key — write the exact command in the report and STOP to say it is needed if the
   clone does not have it yet; do not deploy yourself). Sign the bot up through the production web
   (`https://corner-convex.vercel.app/auth`, Playwright, random password saved to
   `/tmp/corner-v2-bridge-bot.env` mode 0600, never in a report). The bot's role in the ledger and on
   every message it writes is its brain label, never "bridge".
2. **Watch every thread the bot can see.** The bridge (extend `v2-team-bridge.py` behind a
   `R25_MODE=service` switch; keep the R20/R21 test behaviour intact and its tests green) subscribes
   to the whole workspace tree (`v2Native:workspaceTree` / `v2Workspace:getNavigation` for each
   world the bot belongs to), polls `threadEvents` for each thread with a user block newer than the
   bot's last handled block (state file per thread, durable across restarts), and runs the R20
   protocol per thread: the Project's driver (map in `R20_DRIVERS_JSON`; default per
   `R20_DEFAULT_DRIVER`), context pack, structured run, ledger. Per-thread serialisation; global
   concurrency cap (env, default 3); a thread with an in-flight run never gets a second driver turn.
3. **Cost and safety rails.** Hard caps: per-turn token/seconds budget, per-hour turn cap per
   workspace (env, default 60), and a kill switch file (`/tmp/corner-bridge.STOP`) the loop checks
   every tick. Never answer its own blocks. Never answer threads older than the service start unless
   a user block arrives after it. Log one line per turn: thread, brain, seconds, cost, outcome.
4. **Run as a launch agent.** `~/Library/LaunchAgents/com.aom-ea.corner-v2-bridge.plist` (KeepAlive,
   log to `AOM-EA/corner/state/corner-v2-bridge.log`, env from a 0600 file it reads itself, never
   from the plist), a `scripts/corner-v2-bridge.sh` wrapper, and the `bridge-singleton-guard` pattern
   from the existing bridges. Refuses `neat-pony-216` (keep the unit test).
5. **Prove it on production, then on the phone.** With the service running: the chat e2e suite in
   live mode against `https://corner-convex.vercel.app` passes (it may need `TEST_BRIDGE_URL` to
   point at the service's health/state port); then Patrik's own thread: send ONE message as the bot
   into a NEW mission it creates in General ("R25 service check"), confirm the driver answers within
   30 s, screenshot the reply on the iPhone 17 Pro simulator (`971E7446-…`, signed in as the e2e
   account is NOT enough — the bot's reply must show in a thread the e2e account can see: use the
   e2e account's Aster / Spring launch deck thread for the simulator proof, the bot is a member of
   that world only if you add it; the AOM world proof is the ledger + `threadEvents` output).
   Wording gate from R21 applies to every reply.

## Hard lines

Never point at `neat-pony-216`; never restart `room-bridge`/`sse-bridge`; never send email/Telegram/
client-facing; the bot never writes into Karen's world unless she is a member of AOM (check
memberships before the first turn and list the worlds the bot can see in the report). AOM-EA commits
scoped to `scripts/`, the plist, the mission folder; web worktree commit scoped to
`convex/lib/members.ts` (+ a unit test); never push. Report: what runs where (pid, port, log), the
worlds the bot sees, the first real turn (thread, brain, seconds, cost, reply text), caps, rollback
(`launchctl bootout` + STOP file), commits, "for the orchestrator" (the deploy), "for Patrik" (driver
map per project; the bot's email in the AOM member list).
