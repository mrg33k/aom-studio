# Superpowers Skill Plugin — Evaluation for AOM-EA Dev Workflow

**Date:** 2026-05-10  
**Requested by:** Patrik  
**Scope:** Decide whether to bring in Anthropic's Superpowers skill plugin and which parts.

---

## 1. WHAT IT IS

**Canonical source:** [`obra/superpowers`](https://github.com/obra/superpowers) (GitHub, by Jesse Vincent, October 2025).  
Distributed via the **official Anthropic plugin marketplace** — accepted January 15, 2026.  
Also listed at [`anthropics/claude-plugins-official`](https://github.com/anthropics/claude-plugins-official).

**Do not confuse with [`anthropics/skills`](https://github.com/anthropics/skills)** — that is a separate repo: Anthropic's own Skills API demo collection (document creation, data analysis, enterprise comms). Superpowers is a community plugin that Anthropic endorsed by adding it to their official marketplace.

**What it is:** "A complete software development methodology for coding agents, built on top of a set of composable skills and some initial instructions." The core premise: *AI coding agents aren't missing capability — they're missing discipline.* Superpowers enforces discipline through 14 skill documents ("Iron Laws") that agents must consult before taking common shortcuts.

**Bundle summary:**
- 14 skills shipped as markdown files
- ~580,000 installs (Anthropic marketplace as of May 2026)
- Multi-host: works with Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot CLI, OpenCode
- A session-start bootstrap hook injects a <2,000-token instruction doc to trigger the discipline loop automatically

**Distribution / install:**
- **Marketplace (one-liner):** `/plugin install superpowers@claude-plugins-official` inside Claude Code
- **Source:** `git clone https://github.com/obra/superpowers` — then register via `.claude-plugin/` manifest or host-equivalent

---

## 2. SKILLS IN THE BUNDLE

All 14 skills confirmed from the [`obra/superpowers/skills/`](https://github.com/obra/superpowers/tree/main/skills) directory listing:

| # | Skill | What it does |
|---|-------|-------------|
| 1 | `brainstorming` | Requires clarifying questions and design proposals (presented in digestible sections for validation) **before any code** |
| 2 | `writing-plans` | Breaks approved design into 2–5-minute tasks with exact file paths and pre-written verification steps |
| 3 | `executing-plans` | Follows the written plan step-by-step; blocks scope creep mid-execution |
| 4 | `test-driven-development` | Enforces RED → GREEN → REFACTOR cycle; deletes code written before tests; mandates failing test first |
| 5 | `systematic-debugging` | 4-phase root-cause process: reproduce → hypothesize → test hypothesis → fix; triggers architecture review after 3 failed attempts |
| 6 | `subagent-driven-development` | Dispatches a fresh agent per task with two-stage code review (spec review + quality review) |
| 7 | `requesting-code-review` | Agent submits its own work for review against the plan, standards, and architectural principles |
| 8 | `receiving-code-review` | Handles code review feedback by severity: critical blocks, major flags, minor notes |
| 9 | `dispatching-parallel-agents` | Parallelizes independent tasks across fresh subagents |
| 10 | `using-git-worktrees` | Creates isolated branch workspaces after design approval, establishes a clean test baseline |
| 11 | `finishing-a-development-branch` | Verifies tests pass, presents merge/PR options, cleans up worktrees |
| 12 | `verification-before-completion` | Mandates running actual verification commands and reviewing output before claiming "done" |
| 13 | `writing-skills` | Teaches the agent to author and test new skills using TDD applied to documentation |
| 14 | `using-superpowers` | Bootstrap/intro document; injects the discipline framework at session start |

> Source: [obra/superpowers README](https://github.com/obra/superpowers/blob/main/README.md) + skills directory listing.

---

## 3. OVERLAP WITH OUR EXISTING SKILLS

**Our existing skills** break into two populations:
- **aom-studio `.claude/skills/`:** 10 research skills (`research-deeply`, `research-youtube`, `research-competitor`, `research-market`, `research-person`, `research-pattern`, `research-x-community`, `research-podcast`, `research-add`, `research-deeply-webpage`)
- **AOM-EA `.claude/skills/`:** 170+ skills covering video editing, brand/design, business ops, system tooling, multi-agent coordination (`/007`, `/007-DAD`, `/007-out`, etc.)

**Overlap map:**

| Superpowers Skill | Our Equivalent | Classification |
|-------------------|---------------|----------------|
| `brainstorming` | `research-before-build.md` rule | **DIFFERENT** — ours is about finding what's already known externally before building; Superpowers is about clarifying requirements and agreeing on design before coding |
| `writing-plans` | `/007` round planning + `queue-task.py` + brief templates | **DIFFERENT** — our planning is ops/task-queue oriented; Superpowers' is pure coding task decomposition with file-level specificity |
| `executing-plans` | `task-runner.sh` + per-task briefs | **DIFFERENT** — our execution is task-runner driven; Superpowers' is within a coding session, blocking scope creep |
| `test-driven-development` | *(nothing)* | **GAP** |
| `systematic-debugging` | *(nothing)* | **GAP** |
| `subagent-driven-development` | `/007-DAD` (Dispatch-and-Deliver), `task-runner.sh` | **DIFFERENT** — ours dispatches tmux worker agents for ops/build tasks; Superpowers' dispatches per code-task with two-stage code review built in |
| `requesting-code-review` | *(nothing — no code review skill)* | **GAP** |
| `receiving-code-review` | *(nothing)* | **GAP** |
| `dispatching-parallel-agents` | `/007-DAD` (parallel task dispatch) | **DUPLICATE** — functionally similar; ours is production-hardened for our task-queue pattern |
| `using-git-worktrees` | *(nothing)* | **GAP** |
| `finishing-a-development-branch` | *(nothing — no branch lifecycle skill)* | **GAP** |
| `verification-before-completion` | `verify-before-done.md` rule + `verify-page.py` | **DUPLICATE** — same principle; ours is more opinionated (AOM stack: Vite, Supabase, Vercel) and enforced via task-complete.sh |
| `writing-skills` | *(no formal skill-authoring methodology)* | **GAP** |
| `using-superpowers` | N/A (bootstrap only) | N/A |

**Gap count:** 6 of 13 functional skills are genuine gaps (TDD, systematic-debugging, requesting-code-review, receiving-code-review, using-git-worktrees, finishing-a-development-branch).

---

## 4. SHIP-BETTER-CODE ANGLE

Patrik's frame: "made to help us ship better code."

**Which Superpowers skills directly address code quality / verification / testing / refactoring / git hygiene / PR review:**

| Superpowers Skill | Addresses |
|-------------------|-----------|
| `test-driven-development` | **Testing** — our single biggest gap in code discipline |
| `systematic-debugging` | **Code quality** — prevents guess-and-patch loops; structured 4-phase root cause |
| `verification-before-completion` | **Verification** — we have this in rules but no coding-session enforcement |
| `requesting-code-review` | **PR review** — we have no skill for this at all |
| `using-git-worktrees` | **Git hygiene** — isolates coding work; reduces contamination on main |
| `finishing-a-development-branch` | **Git hygiene / PR review** — handles merge, cleanup, PR creation systematically |
| `writing-plans` | **Refactoring** — forces upfront design before touching code |

**Comparison to our existing rules:**

- **`verify-before-done.md`** covers the same ground as `verification-before-completion` but is more prescriptive (verify-page.py, curl, query-table) and enforced at the task-complete.sh level. Superpowers' version is generic for any coding session. Ours is stronger for frontend verification; Superpowers' is stronger for library/API/pure-logic work.
- **`research-before-build.md`** covers research; `brainstorming` covers requirements clarity. Complementary, not duplicate. Research = what do we already know; Brainstorming = what exactly are we building.
- **`design-criteria-gate.md`** and **`video-criteria-gate.md`** are domain gates with no Superpowers equivalent — those stay as-is regardless.
- **`super-agent-mission-first.md`** is orthogonal — it's about routing work to the right mission home before coding begins. No conflict with Superpowers.

**The gap that bites most:** We have no TDD enforcement. The `aom-studio` codebase (Vite + React + Supabase) has test stubs but no enforced TDD loop. Every bug fix or feature is currently "build → maybe verify → ship." Superpowers' TDD skill would add the missing `test first → implement → verify → refactor` gate.

---

## 5. RECOMMENDATION

**Cherry-pick 3 skills. Do not bring in the whole plugin.**

**Why cherry-pick over whole:**
- AOM's primary workflows are video editing, brand design, and business operations. The full 14-skill Superpowers framework assumes coding is the primary activity. Most of our 170+ skills are domain skills (video, brand, ops) — adding the full coding methodology creates a large surface that agents will infrequently use and may conflict with our existing `/007` pattern.
- Our task-runner + brief-template pattern already handles planning and parallel dispatch at the ops level. Superpowers' `writing-plans` + `dispatching-parallel-agents` would create two competing planning paradigms for the same agents.
- The bootstrap hook (injected at every session start) would fire on video, design, and ops sessions — adding token overhead for workflows where it adds nothing.

**The 3 skills worth installing:**

1. **`test-driven-development`** — our largest gap. No TDD exists anywhere in our coding workflow. This skill would add the missing enforce-test-first gate for all aom-studio build work. Low conflict with existing setup (we have no TDD rules to contradict).

2. **`systematic-debugging`** — prevents agents from making 3+ guess-patch attempts on bugs. Directly complements `verify-before-done.md` (which catches broken output but doesn't prevent thrashing before it). The 4-phase root cause process is immediately applicable to aom-studio debugging.

3. **`requesting-code-review`** — we have no code review skill. When aom-studio work involves significant changes (new API routes, DB migrations, auth changes), structured self-review against the plan + standards before marking done adds a real quality gate we currently lack.

**Skills to skip and why:**
- `brainstorming` — `research-before-build.md` already covers the "stop and think first" gate; a second pre-coding gate creates confusion
- `writing-plans` / `executing-plans` — superseded by our `/007` brief pattern
- `subagent-driven-development` / `dispatching-parallel-agents` — superseded by `/007-DAD` + `task-runner.sh`
- `using-git-worktrees` — potentially useful but adds workflow complexity; evaluate separately when ready to formalize branch-per-task
- `finishing-a-development-branch` — our push-to-main flow is simpler; branch lifecycle formalization is a separate initiative
- `verification-before-completion` — already covered by `verify-before-done.md` (ours is more specific and enforced at task-complete.sh level)
- `receiving-code-review` — only needed if `requesting-code-review` is installed AND a dedicated reviewer agent is set up; defer
- `writing-skills` / `using-superpowers` — meta skills, skip if cherry-picking

**Conflicts with existing setup:**
- **CORNER_AGENT / mission-first doctrine:** No conflict. The 3 recommended skills are invoked within a coding session, after the mission home is already established. They don't affect routing or ops.
- **task-runner pattern:** No conflict — these skills operate within a single coding session, not across the task queue.
- **verify-before-done.md:** Minor conceptual overlap with `verification-before-completion`, but ours is enforced at the infra level. No change needed — keep ours, skip theirs.

---

## 6. INSTALL PATH (if recommending cherry-pick)

**Recommended: Option B — source cherry-pick (3 skills only, no unused baggage).**

```bash
# 1. Clone the Superpowers source
git clone https://github.com/obra/superpowers /tmp/superpowers-src

# 2. Copy the 3 selected skill directories into AOM-EA's skills folder
cp -r /tmp/superpowers-src/skills/test-driven-development \
       /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA/.claude/skills/
cp -r /tmp/superpowers-src/skills/systematic-debugging \
       /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA/.claude/skills/
cp -r /tmp/superpowers-src/skills/requesting-code-review \
       /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA/.claude/skills/

# 3. Register each in AOM-EA/.claude/skills/INDEX.md
# Add a new "## Code Quality (Superpowers cherry-pick)" section with:
# | /test-driven-development | ... | Enforce RED-GREEN-REFACTOR before any implementation |
# | /systematic-debugging    | ... | 4-phase root cause process for any bug (aom-studio) |
# | /requesting-code-review  | ... | Self-review against plan + standards before marking done |

# 4. Add a cross-reference in AOM-EA/CLAUDE.md under the web/coding section:
# "When doing aom-studio coding work: use /test-driven-development,
#  /systematic-debugging, and /requesting-code-review (Superpowers cherry-pick)."

# 5. Do NOT install the marketplace plugin — that installs all 14 skills + the session-start
#    bootstrap hook, which fires on every session including ops/video/design.
```

**Option A (full marketplace install) for reference only — not recommended:**
```bash
# Inside an active Claude Code session:
/plugin install superpowers@claude-plugins-official
# Then document internally: only /test-driven-development, /systematic-debugging,
# and /requesting-code-review are in-scope. Other 11 skills are installed but
# not in AOM doctrine. The bootstrap hook WILL fire on every session.
```

---

## Conclusion

Superpowers is a well-engineered, production-validated framework (580k installs, official Anthropic endorsement). Its core insight — discipline over capability — aligns with Patrik's verify-before-done + research-before-build doctrine. The fit is partial: our ops and domain skills are far ahead; our code quality layer is thin. Cherry-picking TDD + systematic-debugging + code-review fills the specific gap without disrupting 170+ existing skills or creating two competing planning paradigms.

**Top finding:** We have 170+ skills for video, brand, ops, and research — but zero skills for TDD or structured debugging. That's the gap Superpowers fills precisely.
