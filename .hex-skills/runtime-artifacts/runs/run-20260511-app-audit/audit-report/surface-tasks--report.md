# Tasks View Surface Audit vs VISION Spec

**Audit Date:** 2026-05-11  
**Surface:** Tasks View (Project-cards-and-living-paragraph dashboard)  
**Vision Source:** `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/corner/VISION.md` lines 43-56  
**Code Base:** `/Users/aom-inhouse/aom-studio-transfer/aom-studio/src/dashboard/components/cv3/`

---

## Vision Commitments vs Implementation

### 1. Living Paragraph as Story Narrative (PARTIAL)

**Vision:** "living greeting-paragraph sits above... reads like a story, not an engineer's log" (VISION.md:48-49)

**Status:** PARTIAL

**Evidence:**
- **LLM-composed path (preferred):** `LivingParagraphCard.jsx:44` fetches `/api/dashboard/project-narrative` which reads event-driven narrative from events table (event_type='project_narrative'). Source: `project-narrative.js:3` notes composition via `scripts/compose-project-narrative.py`.
- **Template fallback (when narrative cache empty):** `project-paragraph.js:87-98` composes regexed summary: "Activity across 3 projects (x, y, z). Last inbound was 2h ago. 4 open tasks queued." — mechanically generated, lacks narrative voice.

**Gap:** Fallback path is not story-like; it reads as engineer's log metrics. Quality bar unclear; no citation of reaching Ambition quality baseline. LLM path exists but adoption/trigger criteria not verified.

**Severity:** Medium. User sees fallback if narrative cache is empty; production impact depends on daemon uptime.

---

### 2. Event-Driven Composition, Not Scheduled (BUILT)

**Vision:** "Composition is event-driven, not scheduled. Triggered on: task ship, conversation end, commit, mission resolve." (VISION.md:51-53)

**Status:** BUILT

**Evidence:**
- `project-narrative.js:1-3` header: "triggered on meaningful events by scripts/project-summary-daemon.py"
- `LivingParagraphCard.jsx:81-107` Supabase realtime subscription on events table, filter `agent=eq.{scope}`, event_type='project_narrative', updates in-place on INSERT
- No polling; no cron job visible in code or API signature

**Severity:** None. Requirement met.

---

### 3. Every Project Paragraph Reaches Ambition Quality (MISSING)

**Vision:** "Every project's paragraph has to reach Corner/Ambition quality" (VISION.md:54)

**Status:** MISSING

**Evidence:**
- No quality gates or metrics defined in code
- Fallback path (project-paragraph.js) is template-based regex, not compositional
- LLM path (project-narrative.js) exists but no acceptance criteria logged
- No mention of quality bar or A/B testing vs Ambition standard

**Gap:** Code implements composition plumbing but not quality enforcement. "Has to reach" is unverified.

**Severity:** High. Narrative quality is a core pillar commitment; no enforcement mechanism.

---

### 4. "All" Tab Narrative Parity (BUILT)

**Vision:** "The 'All' tab paragraph gets the same treatment as project-scoped" (VISION.md:55)

**Status:** BUILT

**Evidence:**
- `LivingParagraphCard.jsx:22-23` `scope = !activeProject || activeProject === 'all' ? 'all' : activeProject`
- `project-paragraph.js:composeAll()` (lines 53-125) composes tenant-wide summary
- `LivingParagraphCard.jsx:81-107` realtime subscription works for scope='all'
- Same endpoint, same template logic for both paths

**Severity:** None. Requirement met.

---

### 5. Task Status Names: Right Now / To Do / Schedule / Inbox / Done (PARTIAL)

**Vision:** Implied task lifecycle with 5 status names (VISION.md, product model)

**Status:** PARTIAL

**Evidence:**
- **Found:** "Right Now" (ActiveTasksSection.jsx:39), "Inbox" (WaitingTasksSection.jsx:34), "Blocked" (BlockedTasksSection.jsx:40), "Done" (DoneTasksSection.jsx:43)
- **Missing:** "To Do" and "Schedule" as distinct status sections
- **Alternate:** PersonalTodosSection.jsx:46 "Your Todos" is user-scoped, not a status
- Only 4 status sections visible; vision calls for 5

**Gap:** "To Do" (queued tasks) and "Schedule" (scheduled future tasks) sections not implemented as separate columns.

**Severity:** High. Task lifecycle is foundational; 2 of 5 status buckets missing.

---

### 6. Clicking Task Expands Brief Inline (UNKNOWN)

**Vision:** "Clicking a task expands its brief inline via accordion" (implied in task interaction model)

**Status:** UNKNOWN

**Evidence:**
- Code reviewed shows task expand logic in `useTasksPanelCtx` (lines not specified in partial reads), toggle functions exist (`toggleTaskExpand`)
- `expandedTask` state managed but brief rendering not verified in available reads
- LivingParagraphCard shows "read more" accordion (lines 157-176) for detail block, but that's the living paragraph, not task briefs

**Gap:** Task-brief accordion behavior not confirmed in code review scope.

**Severity:** Medium. Feature unclear; cannot confirm or deny implementation.

---

### 7. Project Cards as North Star (PARTIAL)

**Vision:** "Project cards ARE the per-project north star summary. Every project card shows... active/queued/shipped/next." (VISION.md, design model)

**Status:** PARTIAL

**Evidence:**
- `TasksPanel.jsx:403-424` renders `TaskDrawerProjectSummary` + file sections
- Only rendered when `activeProject !== 'all'` (line 434): `{activeProject && <TaskDrawerProjectSummary ... />}`
- "All" scope view hides project cards entirely

**Gap:** Project cards are conditional; "All" view has no north-star summary. Vision implies every scope should see project state; implementation de-prioritizes tenant-wide view.

**Severity:** Medium. North star is shadowed in "All" view.

---

### 8. Weekly Stats Bar Chart & Metrics (BUILT)

**Vision:** "Task metrics... 'This Week' 7-day bar chart + key metrics" (VISION.md, task view structure)

**Status:** BUILT

**Evidence:**
- `WeeklyStatsCard.jsx:1-94` implements:
  - 7-day bar chart (lines 43-67): daily counts, MIN_BAR_H=2, MAX_BAR_H=19, future-day graying
  - 3 metrics (lines 78-88): Tasks (weekTotal), Pass Rate (%), Days Active (/7)
- Imported and rendered in TasksPanel.jsx:432 above ActiveTasksSection
- Uses C.accent color for active bars

**Severity:** None. Requirement met.

---

## Summary: Gap Counts

| Category | Count | Status |
|----------|-------|--------|
| BUILT | 4 | Event-driven composition, "All" parity, weekly stats, living paragraph card structure |
| PARTIAL | 3 | Living paragraph voice quality, task status names (4/5), project card visibility |
| MISSING | 1 | Quality enforcement for project narratives |
| UNKNOWN | 1 | Task brief accordion expansion behavior |

**Total Commitments Audited:** 8

**Compliance:** 4 fully built (50%), 3 partially met (37.5%), 1 missing (12.5%), 1 unclear (12.5%)

---

## Top 3 Gaps (Priority Order)

### Gap #1: Task Status Lifecycle Incomplete (HIGH)
Missing "To Do" and "Schedule" status sections. Vision calls for 5-bucket task lifecycle; only 4 implemented. Active/Inbox/Blocked/Done present; To Do/Schedule missing. **File:** `TasksPanel.jsx` (no To Do or Schedule section imports). **Impact:** Users cannot distinguish queued vs scheduled tasks in the UI; workflow incomplete.

### Gap #2: Narrative Quality Unverified (HIGH)
Template fallback generates regex-based summaries ("Activity across N projects...") lacking narrative voice. No quality gates, acceptance tests, or Ambition-standard verification. LLM path exists but adoption / trigger unknown. **File:** `project-paragraph.js:87-98`. **Impact:** Fallback path (user-facing when daemon stale) reads as engineer's log, violates vision.

### Gap #3: Project North Star Hidden in "All" View (MEDIUM)
Project cards conditionally hidden when `activeProject === 'all'`. Tenant-wide view has no per-project summary. Vision frames north star as essential; "All" view removes it. **File:** `TasksPanel.jsx:434`. **Impact:** Tenant-wide perspective loses project structure visibility.

---

## Recommendations

1. **Implement To Do / Schedule sections:** Add TasksQueuedSection and TasksScheduledSection components. Align status names to product model.
2. **Add narrative quality gates:** Deploy A/B test on fallback template vs LLM path. Measure user satisfaction. Gate fallback behind quality threshold.
3. **Show project summary in "All" view:** Render a rolled-up project-cards grid (active, queued, shipped counts per project) alongside or above the tenant-wide living paragraph.

---

**Audit completed:** 2026-05-11 Claude Code
