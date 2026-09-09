# GOAL — Corner v2 next phase (Patrik, 2026-09-09)

Set after the R62 iPad punch list + build 25 ship. Patrik's words, organized. Work top-down; each is a round (or several).

## 1. Chat e2e test — the real bar
A serious end-to-end test of chat. First things to test:
- **1a. Tools are reachable, not refused.** Agents must NOT say "I don't think I can do that" when the connection is available — if the user has the connection, the agent uses it. (Ties to the R61 connections panel: presence → capability.)
  - Sub-question Patrik wants answered: **what connections are unique to Patrik vs a walk-in user, and why?** How do we close that gap with the **desktop companion app**? How do we make onboarding simple *if* the companion app is installed? **Make sure the companion app is built.**
- **2a. Project conversation quality.** Agents converse about projects well AND can talk about gaps in the overall workflow, reading from the ledger.
- **3a. Email reach.** Agents actually reach for email when asked "what's the latest on a client project."
- **4a. Knowing the user (more JSON?).** The ledger exists, but what *seals* actually knowing the user is likely more JSON — **where does it live, and how do we ingest it from other LLMs on day one with minimal friction** ("paste this and give me the input")?

### FINDING (2026-09-09, traced the bridge) — why agents refuse tools, and what the companion is for
The Corner chat brain runs **completely toolless**. In `scripts/v2-team-bridge.py`, `ClaudeCliBrain` shells out to `claude -p --setting-sources user --model opus <prompt> --output-format json` — no `--allowedTools`, no `--mcp-config`, from a neutral cwd (`/tmp/corner-bridge-cwd`), with project settings deliberately excluded. `MuseCliBrain` is the same shape (`muse exec`). It was made toolless ON PURPOSE for latency (R49 note: loading this repo's hooks/plugins made `claude -p` hang 159 s vs 8 s). So the chat agent is a **pure text responder over the context pack** — it has no email, no browser, no web, no file access.

Consequences, directly answering Patrik's questions:
- **"Agents refuse / 'I don't think I can do that'"** is not a prompt problem — the agent genuinely has no tool to reach. Fixing 1a means giving the brain real tool access (scoped MCP servers, a tool-runner, or delegation to the companion), then telling it in the pack which connections are live so it acts instead of hedging.
- **"What connections are unique to me vs a walk-in user?"** Today: **none are wired into the chat brain** — Patrik's brain and a walk-in's brain are identical and both toolless. The real connections (mail-send.py, robot Chrome via chrome.py, the gateway, GitHub, the computer activity log) live on **Patrik's machine / terminal**, not exposed to the cloud chat.
- **"How do we close the gap with the companion app?"** This is the architecture: the **companion app on the user's machine is the tool-execution layer**. The cloud chat brain is toolless; when a turn needs email/browser/files/activity-log, it **delegates to the companion**, which holds the user's connections and runs the tool locally, then returns the result. That is also how item 5 (Arcade) plugs in — Arcade = the connection/tool layer the brain reaches through — and item 7 (activity log) — the companion reads it and feeds the ledger. So "make sure the companion app is built" = build this tool layer, not just the Visual Window.
- **Latency tension to design around:** tools were stripped for speed. The fix must keep the fast toolless path for plain replies and only pay the tool cost when a turn actually needs a tool (intent-gated tool use), so the room stays snappy.

## 2. Composer glow + the "worse than Slack" gaps
- The glow under the composer should be **bigger and slowly animating** (breathing bigger/smaller, slow) so the room feels alive; it should sit **higher up**.
- Find the UI gaps that make someone say **"this doesn't work as well as Slack"** and fix them.

## 3. Video via hyperframes
Agents can use **hyperframes** to make videos, know the viral tricks, and ask Patrik the *right questions* to make smooth output.

## 4. Live designing with an agent
A **live localhost equivalent** while working on things, so we don't waste resources pushing/pulling to figure out visuals — see changes live, save time.

**The feel Patrik wants (2026-09-09):** "Let's make a yellow website about bikes" → the agent pulls up a yellow background + UI **nearly instantly** and says *"like this?"* → the person says *"no, I imagine actual bikes, more images, better fonts"* → again **instantly** the agent works **live** to generate images and build the vision **next to the user**, with **no friction of pushing / committing / pulling** until they are ready. So: a live render surface the agent edits in real time (hot-reload / in-canvas), image-gen inlined, and the git/deploy step deferred to a "ship when ready" moment — not part of the iteration loop.

## 5. Easy-to-add connections (Arcade)
Connections need to be easy to add. **Arcade** may already give this ability — but it needs to be connected/wired.

### FINDING (2026-09-09, probed Arcade) — the tool layer exists and is keyed
`~/.config/arcade-api-key.env` holds a valid `ARCADE_API_KEY`. `GET https://api.arcade.dev/v1/health` = 200 and `/v1/tools` returns a large catalog (Airtable seen; Arcade's standard catalog covers Gmail, GitHub, Google Calendar/Drive, Slack, Notion, X, web scraping). So Arcade is the ready-made answer to the toolless-brain finding above: it's a hosted tool-calling layer with per-user OAuth. **It just isn't wired into the bridge brain yet** (that's item 5's "needs to be connected"). Rate limit note: the key 403s after a few quick calls — probe gently, cache the catalog. NEXT to build: (1) an Arcade client in the bridge that lists/authorizes the toolkits Patrik cares about (Gmail first, for 3a email), (2) intent-gated tool calls from the chat turn so latency stays low, (3) the R61 connections panel reflects real Arcade authorization state (connected dot = authorized). This wires items 1, 3a, and 5 together; the companion app can host the same Arcade auth for a walk-in user.

## 6. Files don't load from the menu
Files don't load when you click them from the **iOS menu (drawer Files)** or the **command menu**. (Distinct from the R62 HTML-render fix — this is the open/navigation path from those two entry points.)

## 7. Computer activity log → ledger truth-triage
There is a **computer activity log the agents can read all the time** (impressive — ground truth of what actually happened on the machine). The **companion app should ask permission to read it**, and this becomes part of **truth-triaging the ledger**: use the real activity log to confirm/correct agent-claimed deeds instead of trusting them blindly. Ties directly to 1's "knowing the user" (4a) and the companion-app build. Open question to answer while building: exactly which log, how the companion requests access, and how a deed gets marked confirmed-by-activity vs claimed-only.

---
Source: Patrik chat 2026-09-09, after the R62 iPad punch list. See [[project_corner_v2_astra_finish_plan]], [[project_corner_agent_connections_panel]], [[project_visual_window_companion_spec]].
