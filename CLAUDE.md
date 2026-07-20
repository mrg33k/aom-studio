# aom-studio — Working conventions for AI agents

This file is loaded automatically by Claude Code and similar tools. If you are an agent (Claude Code, EA, code reviewer, etc.) about to make changes in this repo, read this first.

## Missions are mandatory

**Every non-trivial unit of work in this repo must be attached to a mission.** Missions are the unit of accountability — they are how work is scoped, tracked, and handed off across agents and sessions.

### Before you start

1. **Identify the mission.** If the user's request is open-ended, ask them which mission this belongs under, or propose one. Mission paths are colon-joined and rooted under a project, e.g. `corner:integrations`, `corner:imagegen-composer`.
2. **If no mission exists, create one before writing code.** Scaffold it under `corner/missions/<slug>/` (or the appropriate project's `missions/` folder) following the existing pattern. Minimum six files: `VISION.md`, `BUILD.md`, `CONTEXT.md`, `RESEARCH.md`, `last-conversation.md`, `research/README.md`. See `api/dashboard/scaffold-mission.js` for the canonical templates, or copy from `corner/missions/integrations/` and `corner/missions/imagegen-composer/` as exemplars.
3. **State the mission path in your first message of the session** so the user can correct if you've picked the wrong one.

### As you work

- **Update `BUILD.md`** on every significant change — when a round ships, when a blocker appears, when scope changes, when an env var is added. The format is dated rounds (R1, R2, …) with a `Status:` line at the bottom of each.
- **Update `CONTEXT.md`** when the overall mission status changes (NEW → IN PROGRESS → DONE → PARKED).
- **Append to `last-conversation.md`** with what happened in the current session so the next agent / session can pick up cold.
- **Reference the mission path in commit messages and PR titles** (e.g. `feat(corner:imagegen-composer): R3 browser smoke test`).

### Why this rule exists

Without mission attachment, work fragments across worktrees, transcripts, and tool calls. A future agent (or a future you, after compaction) has no source of truth for "what is this branch for, what's done, what's blocked." Missions are the durable answer.

### Exceptions

Trivial work — single-file typo fix, one-line config change, answering a question with no code change — does not need a mission. When in doubt, ask the user. **A worktree always needs one.**

### Background agents: extra strictness

This applies in the strongest form to **background Claude agents** — sessions launched via `claude --background`, sub-agents spawned through the Agent tool, scheduled remote agents (`/schedule`), `/loop` runs, and anything that proceeds without a human actively watching each step.

Background agents drift silently. The user isn't there to redirect you mid-stream, your output may not be read for hours, and by the time someone looks, you may have shipped six files into a worktree with no record of *why*. That's the failure mode missions exist to prevent.

If you are a background agent, you MUST:

1. **State the mission path in your very first message.** If you do not know the mission, **stop and ask** rather than guess — output `needs input: which mission does this belong to?` and wait. Do not fabricate a slug. Do not "just pick one." A wrong mission attachment is worse than no work.
2. **Write to `BUILD.md` of that mission before your first code edit**, even if it's just a stub round entry (`### R<N> — <one-line title>` + `**Status:** in progress`). The BUILD.md write is your "I have started work" signal — if it doesn't appear, you didn't start.
3. **Update `BUILD.md` again on every significant transition** — round shipped, blocker hit, env var added, key rotated, scope change, decision made. Treat it like the active-missions.md ledger: if it's not written down, it didn't happen.
4. **Append to `last-conversation.md` before returning a `result:`.** Your final report goes there too, not just into the parent agent's tool output.
5. **Reference the mission path in the worktree name** (`.claude/worktrees/<mission-slug>` or `<mission-slug>-<round>`) so an observer can see at a glance what each parallel run is for.

If you find yourself working without a mission attached and you are a background agent: **stop and surface that to the user** before continuing. Don't silently fix it after the fact.

## CV6 is the active Corner-product design surface

For any dashboard frontend work in this repo (`src/dashboard/`):

- **Default target = CV6** (`src/dashboard/cv6next/`, the default at `/dashboard` since 2026-06-17; `CornerCV6.jsx` is the orchestrator, `SharedNav.jsx` the nav). Every new brief targets CV6 unless explicitly named otherwise. Build only from the design system at the `design-system-current` symlink (corner-ui-cv6 mission, AOM-EA repo) — never freestyle.
- **One Page model (ratified 2026-07-20, corner:one-corner):** the product is ONE room screen — rooms rail (Email pinned, + New, amber needs-you badges), the chat center, this chat's files right (crossings only: From agent / You sent). Review happens in place over the room; a request-changes decision writes the agent a real task. No top tool bar; parked surfaces (Files/Organize, Tracker, Command, Scribe, Home) stay alive at their `?view=` deep links. Headers are transparent in every theme — one wallpaper, never a locally repainted ground.
- **CV4 (`/cv4`, `?cv4=1`) and CornerV3 are legacy.** Touch only for live-prod emergency fixes. Do not retire endpoints CV4 still consumes (e.g. `list-chat-files`) until CV4 is demolished.
- **Legacy dead code — never touch:** `BoardView.jsx`, `GameDashboard.jsx`, `GameHUD.jsx`.

The mission home for the One Page build is `corner/missions/one-corner/` (AOM-EA repo, sibling to this one); the design system mission is `corner/missions/general/missions/corner-ui-cv6/`. Full doctrine in AOM-EA's `.claude/playbooks/cv6-is-the-active-design-surface.md`. Scope: Corner product frontend only — does NOT apply to other AOM project sites (Ambition, Skylar, Brandon, ISA, etc.), the marketing site, or static skill-built pages.

## Worktrees

Background sessions and parallel agents must work in a `.claude/worktrees/<name>/` worktree (use `EnterWorktree`). The mission folder for the work goes in that worktree too, so it merges with the code.

## Pre-existing build state

As of 2026-05-13: `src/dashboard/main.jsx:3` imports `./GameDashboard.jsx`, which doesn't exist in the source tree or git history. This breaks `npm run dev` until resolved. If you need to run the dev server, fix this first — don't paper over it by stubbing the import.
