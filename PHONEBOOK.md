# Codebase Phone Book

> ## ⚠️ THE DASHBOARD SECTION BELOW IS STALE
>
> Corrected 2026-08-16 (`corner:convex-multi-agent` R16), verified against code and the live
> site rather than documents:
>
> - `/dashboard` renders **`CornerCV6`** (`src/dashboard/cv6next/CornerCV6.jsx`), not CornerV4.
>   See `src/main.jsx:84-89` — "CV6 is now the ONLY dashboard surface."
> - `src/dashboard/main.jsx` is **NOT an entrypoint**. It mounts to `#dashboard-root`, which
>   appears in no served HTML, and nothing imports it. It is dead code. A Convex migration was
>   built there and could never have gone live.
> - The "legacy, pre-cut — still valid" path `~/aom-studio-transfer/aom-studio` is a husk with
>   no `.git`. It is not valid. See its `DEAD-MOVED.md`.
>
> **Trust `/phonebook.md` at the AOM-EA repo root** for surfaces, Convex deployments and graders.
> The per-file tables further down are still broadly useful; the routing claims are not.

> This is WHERE things live across all AOM repos.
> Agents: use this to find files. Don't guess paths. Don't grep blindly.
## aom-studio (Dashboard, API, React frontend on Vercel)
**Path (canonical, post-2026-05-14 transition):** `/Users/aom-inhouse/aom-studio-transfer/AOM-EA/aom-studio`
**Path (legacy, pre-cut — still valid):** `/Users/aom-inhouse/aom-studio-transfer/aom-studio`

> **Transition note (2026-05-14):** Per `corner:cross-repo-routing` Option A, aom-studio is moving from a peer location to nested inside AOM-EA. Scripts in AOM-EA auto-detect via `resolve_aom_studio_path()` in `scripts/task-runner.sh`. Workers should treat the nested path as canonical going forward. The actual disk move happens in a maintenance window; see `AOM-EA/corner/missions/cross-repo-routing/MOVE-RUNBOOK.md`.

### HARD RULES (as of R7.21 cutover, 2026-05-13)
- **`/dashboard` and `/dashboard/*` render `CornerV4`** — the canonical user-facing dashboard.
- **`/cv3` and `/cv3/*` render `CornerV3`** — the rollback escape hatch only. Do NOT add features here.
- **`/cv4` and `/cv4/*`** render `CornerV4` too (legacy aliases preserved for direct CV4 routes).
- Routing lives in `src/main.jsx`. If you flip a route, that's the file.
- CV4 reuses the shared `components/cv3/` tree and re-skins it via a `[data-shell="cv4"]` CSS scope set on the CornerV4 root div. **Most CV4 visual changes are CSS in CornerV4.jsx's inline `<style>` block**, not new components. Only fork into `cv4/` when behavior diverges, not just styling.
- Mission attachment is mandatory (see CLAUDE.md). Every non-trivial change goes under a `corner/missions/<slug>/`. Stub BUILD.md before your first code edit.

### Dashboard shells (top of the tree)
| File | What it does |
|------|--------------|
| `src/main.jsx` | All app routing. `/dashboard` → CornerV4, `/cv3` → CornerV3, `/cv4` → CornerV4 (alias). |
| `src/dashboard/CornerV4.jsx` | **Canonical dashboard shell.** Renders nav, CV4ContextNav, left CV4Drawer, centered ChatPanel, right TasksPanelCv4 (docked drawers on desktop, tab toggle on mobile). All CV4-specific CSS lives in the inline `<style>` block here, scoped via `[data-shell="cv4"]`. |
| `src/dashboard/CornerV3.jsx` | Rollback shell at `/cv3`. Frozen — do not extend. Reads the same `useDataPipe` / `useTasks` hooks and the same `components/cv3/` chrome as CV4. |
| `src/dashboard/CornerContext.jsx` | `CornerAuthProvider` + `CornerDataProvider` + `CornerNavProvider`. Sliced by update cadence so consumers don't re-render on unrelated changes. |
| `src/dashboard/main.jsx` | Dashboard bundle entrypoint (separate from `src/main.jsx` app router). Imports `GameDashboard.jsx` — currently broken (see CLAUDE.md "Pre-existing build state"). |
| `src/dashboard/OnboardingGuide.jsx` | First-run onboarding flow. |
| `src/dashboard/SystemToast.jsx` | Global toast surface. |

### CV4-specific components (`src/dashboard/cv4/`)
Only shells that differ behaviorally from CV3 live here. Everything else stays in `components/cv3/` and re-skins via the data-shell scope.
- `ComposerCommandsMenu.jsx` — purple sparkles icon left of the composer pill; image gen + skill commands.
- `ContextNav.jsx` — second-row nav (hamburger · title · Chat|Tasks · tasks-drawer toggle).
- `Drawer.jsx` — left "file browser" drawer: agents + projects + missions, docked on desktop ≥1024px, overlay below.
- `MissionChip.jsx` — context chip rendered on the composer when a mission is attached from the drawer.
- `TasksPanelCv4.jsx` — right-side tasks drawer with the brutalist task-card styling.

### Shared dashboard chrome (`src/dashboard/components/cv3/`)
Used by **both** CornerV3 and CornerV4. CV4 styles many of these via `[data-shell="cv4"]` selectors — when redesigning, prefer CSS overrides in CornerV4's `<style>` block over forking.
- `ChatPanel.jsx` — the centered chat column. Imports thread + project-chat sub-trees.
- `TasksPanel.jsx` — CV3 tasks panel (the one CornerV3 renders; CV4 uses `TasksPanelCv4.jsx` instead).
- `ConversationsView.jsx`, `ThreadView.jsx`, `ProjectChatView.jsx` — view-level switches inside ChatPanel.
- `NotificationsPanel.jsx`, `UserAvatar.jsx`, `IntegrationsModal.jsx`, `SlashCommandAutocomplete.jsx`, `ContextMenu.jsx`, `TaskStatusCard.jsx`, `CleoWorkspaceDetail.jsx`, `CleoWorkspacesIndex.jsx` — top-level chrome.
- `AgentCard.jsx`, `icons.jsx`, `shared.jsx` — atoms (Badge, Tab, BellIcon, icon SVGs).

Sub-trees (each is the canonical place for that surface):
- `chat/` — ChatPanelContext + hooks (`useChatSend`, `useChatAttachments`, `useChatMessages`, `useChatVoiceCtx`, `useChatContextMenuCtx`, `useChatRecording`, `useChatPrefs`, `useChatSettings`, `useChatConversations`, `useBridgeStream`).
- `thread/` — agent chat surface: `ThreadInputBar.jsx` (THE composer used by /dashboard chat), `MessageList.jsx`, `ThreadHeader.jsx`, `FilesPanel.jsx`, `VoiceChatHost.jsx`, etc.
- `project-chat/` — project chat surface: `ProjectInputBar.jsx` (composer for project rooms), `ProjectChatHeader.jsx`, `CanonFilesPanel.jsx`, `ProjectFilesPanel.jsx`, `ProjectSearchBar.jsx`, etc.
- `tasks/` — task lifecycle sections (`ActiveTasksSection`, `WaitingTasksSection`, `BlockedTasksSection`, `DoneTasksSection`, `FailedTasksSection`, `ForemanTasksSection`, `PersonalTodosSection`), `TaskInputBar.jsx`, `CreateProjectModal.jsx`, `LivingParagraphCard.jsx`, `ProjectBriefingCard.jsx`, `WeeklyStatsCard.jsx`.
- `conversations/` — home-state feed surface (`HomeSearchBar`, `HomeStateFeed`, `GreetingHero`, `EaHeroCard`, `AgentsList`, `ProjectsList`, `SearchResults`, `useHomeSearch`).
- `voice/` — `GlobalCallButton.jsx`, `FloatingCallBar.jsx` (top-nav live call entry + bottom call bar).
- `phone-recording/` — `PhoneRecordingOverlay.jsx`.
- `session/`, `shared/`, `shared-rooms/` — onboarding tooltips, paste chips, image-gen picker, shared-room settings.

### "I need to edit X" — quick map
| You want to change… | Edit… |
|---|---|
| The composer pill (input + send + attach + mic) on the agent thread | `components/cv3/thread/ThreadInputBar.jsx` |
| The composer pill on a project chat | `components/cv3/project-chat/ProjectInputBar.jsx` |
| Message bubble rendering | `components/cv3/thread/MessageList.jsx` |
| Slash-command autocomplete | `components/cv3/SlashCommandAutocomplete.jsx` |
| CV4-only visual changes (typography, drawer blend, brutalist tasks) | CornerV4.jsx inline `<style>` block, scoped `[data-shell="cv4"]` |
| Routes (`/dashboard`, `/cv3`, `/cv4`) | `src/main.jsx` |
| Left drawer (CV4 file browser) | `cv4/Drawer.jsx` |
| Second-row nav (CV4) | `cv4/ContextNav.jsx` |
| Right tasks drawer (CV4 brutalist task list) | `cv4/TasksPanelCv4.jsx` |
| CV3 task list (escape-hatch only) | `components/cv3/TasksPanel.jsx` + `components/cv3/tasks/*` |
| Send-message logic (optimistic insert, supabase write, bridge stream) | `components/cv3/chat/useChatSend.js` |
| What data ChatPanel sees (agents, projects, tasks) | `components/cv3/chat/ChatPanelContext.jsx` |
| World/tenant data pipe | `hooks/useDataPipe.js` |
| Task queries + buckets | `hooks/useTasks.js` |
| Auth / current user slug | `hooks/useCurrentUserSlug.js` |
| Voice call surface | `hooks/useVoiceChat.js` + `components/cv3/voice/*` + `components/cv3/thread/VoiceChatHost.jsx` |
| Phone-recording (long-form record → transcribe → send) | `hooks/useTelephone.js` + `components/cv3/phone-recording/PhoneRecordingOverlay.jsx` |
| Mission chip / mission attach on composer | `cv4/MissionChip.jsx`, `cv4/Drawer.jsx` (onSelectMission), CornerV4's `attachedMission` state |

### Dashboard Hooks (`src/dashboard/hooks/`)
- `useDataPipe.js` — single source of truth for agents, inboxItems, projectRooms, personalTodos. Filters by viewer slug.
- `useTasks.js` — task buckets (queued, rightNow, waiting, done, allTasks) + `addOptimisticTask`.
- `useCurrentUserSlug.js` — resolves viewer's slug inside the current tenant (`tenant_users.slug` keyed on auth.uid()).
- `useTelephone.js` — long-form recording / transcribe / dispatch to active super-agent.
- `useVoiceChat.js` — live voice call hook.
- `useProjects.js` — project list with definitions merged.
- `useCleoWorkspaces.js` — Cleo workspace list/detail.
- `useLongPress.js` — generic long-press handler (used by task cards for context menus on mobile).
- `useToast.jsx` — toast queue (alias to SystemToast).

### API Endpoints (`api/dashboard/` — 71 endpoints)
Grouped by surface. All are Vercel serverless functions.

**Chat / messaging:**
- `supabase-messages.js` — POST user/assistant messages. Primary write path from ThreadInputBar.
- `chat-bridge.js` — streaming bridge to agent tmux sessions.
- `chat.js`, `base-chat.js`, `haiku-chat.js`, `support-chat.js` — chat backends (legacy + tiered).
- `message-steps.js`, `message-retention.js` — message lifecycle metadata.
- `prune-context.js`, `clear-context.js` — context window management.

**Agents:**
- `active-agents.js`, `agent-status.js`, `agent-status-updater.js` — live agent registry + status pills.
- `agent-customize.js`, `create-agents.js`, `reset-agent.js`, `poke-agent.js`, `update-agent-order.js` — agent CRUD.
- `agent-voice.js`, `avatar.js` — agent voice + avatar.

**Tasks:**
- `task-action.js`, `retry-task.js`, `unstuck.js` — task state mutations.
- `task-success-rate.js` — agent QA scoring.
- `foreman-pause.js` — foreman gate.
- `v2-task-list.js`, `v2-task-update.js` — v2 task surface.

**Projects / missions:**
- `missions.js`, `missions-created.js`, `scaffold-mission.js` — Corner mission CRUD.
- `scaffold-project.js`, `create-project-from-chat.js`, `create-project-task.js` — project scaffolding.
- `project-access.js`, `project-invite.js`, `project-shared.js`, `project-files.js`, `project-summary.js`, `project-narrative.js`, `project-paragraph.js` — project surface APIs.

**Files / search:**
- `file-content.js`, `file-search.js`, `file-upload.js`, `files.js`.
- `recipes.js`, `doc-updates.js`, `git-history.js`.

**Voice / phone:**
- `voice-session.js`, `voice-handoff.js`, `voice-summary.js`, `voice-context-lookup.js`, `voice-context-update.js`.
- `v2-transcribe-audio.js` — audio → text for telephone mode.

**Imagegen:**
- `image-gen.js` — composer image-gen entry.

**Worlds / tenancy / auth:**
- `worlds.js`, `create-world.js`, `get-directory-tenants.js`, `set-supabase-client-context.js`, `invite-create.js`, `project-invite.js`.
- `onboarding-state.js`, `session-handoff.js`.

**EA system / infra:**
- `ea-system-prompt.js`, `ea-scaffold-batch.js`, `analyze-logs.js`, `env-vars.js`.
- `preferences.js`, `cleo-workspaces.js`.
- `finance.js`, `setup-finance.js`, `stripe-webhook.js`.
- `supabase-status.js`.

### Pages
- `src/pages/AmbitionBrandGuidelines.jsx`
- `src/pages/AmbitionBrandGuidelinesV2.jsx`
- `src/pages/AmbitionPerformance.jsx`
- `src/pages/AmbitionPerformanceV2.jsx`
- `src/pages/AuditTest.jsx`
- `src/pages/BookAudit.jsx`
- `src/pages/BrandGuidelines.jsx`
- `src/pages/BrandGuidelinesV4.jsx`
- `src/pages/Brands.jsx`
- `src/pages/BrandsHub.jsx`
- `src/pages/BriefAIAdvisory.jsx`
- `src/pages/BriefAmbitionLinkedIn.jsx`
- `src/pages/BriefAmbitionSections.jsx`
- `src/pages/BriefAmbitionStrategy.jsx`
- `src/pages/BriefAuditOnboarding.jsx`

## AOM-EA (Agent system, scripts, pipeline)
**Path:** /Users/aom-inhouse/aom-studio-transfer/AOM-EA

### Pipeline Scripts (v2)
- `scripts/v2-cost-tracker.py`
- `scripts/v2-generate-phonebook.sh`
- `scripts/v2-notify.sh`
- `scripts/v2-planner.sh`
- `scripts/v2-runner-watcher.sh`
- `scripts/v2-task-claim.sh`
- `scripts/v2-task-runner.sh`

### Agent Scripts
- `scripts/relay-respond.py`
- `scripts/spawn-agent.sh`
- `scripts/launch-super-agent.sh`
- `scripts/log-event.py`
- `scripts/agent-message.py`
- `scripts/write-checkpoint.py`
- `scripts/rag-query.py`
- `scripts/rag-server.py`

### Agent Projects
- `projects/ambition-mechanical/` ( Ambition Mechanical -- Project Config)
- `projects/aom-strategy/` ( Alex -- Deal Architect)

- `projects/bobby/` ( Bobby -- Web Dev Agent)
- `projects/brandon-wiley-documentary/` ( Brandon Wiley Documentary)
- `projects/colton/` ( Colton -- Bobby's Right Hand)
- `projects/content-agent/` ( Cleo -- Content Creation Agent)


- `projects/elmo/` ( Elmo — QA / Double-Check Agent)
- `projects/gary/` ( Gary -- AOM Operations Super Agent)
- `projects/isa-energy/` ( ISA Energy Brand Video -- Project Config)

- `projects/jacob/` ( Outreach Agent -- Jacob)
- `projects/janitor/` ( Conversation Janitor -- Elmo Jr.)
- `projects/mark/` ( Mark — Elon's Infrastructure Assistant)
- `projects/mom/` ( Mom -- Chief of Staff)
- `projects/paige/` ( Paige -- Client Success)
- `projects/pixel/` ( Pixel -- Media Librarian Agent)

- `projects/skylar/` ( Skylar Music Video -- Project Config)
- `projects/steffen/` ( Steffen (SS) -- Brand Agent)
- `projects/steve/` ( Steve -- AI Advisory Lead)
- `projects/sys/` ( System Manager Agent -- Elon)

- `projects/tony/` ( Tony -- Social Media Agent)

### Supabase
- `supabase/migrations/` (19 migrations)
- `supabase/functions/chat-responder/`

### Config
- `CLAUDE.md` -- agent instructions (auto-loaded by Claude Code)
- `CLAUDE-FULL.md` -- full protocols (read on demand)
- `.env` -- environment variables (Supabase, API keys)
- `plans/planner-system-context.md` -- architecture doc for Gemini planner
- `plans/phonebook.md` -- THIS FILE

## Supabase Tables
| Table | Purpose |
|-------|---------|
| tasks | Task queue (status, qa_score, complexity, agent_identity) |
| messages | Chat messages (agent, role, text, source, client_id) |
| agents | Agent registry (slug, display_name, personality) |
| agent_status | Live status for dashboard pills |
| events | Append-only event log (task lifecycle, runner signals) |

