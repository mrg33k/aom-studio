# Codebase Phone Book
> Auto-generated. This is WHERE things live across all AOM repos.
> Agents: use this to find files. Don't guess paths. Don't grep blindly.
## aom-studio (Dashboard, API, React frontend on Vercel)

> **Naming note (2026-05-12):** This REPO is named `aom-studio` and contains the Corner platform code.
> The AOM company **dashboard room** was also previously labeled 'aom-studio' but was renamed to
> `aheadofmarket.com` (slug: `aheadofmarket`) to remove the collision. The repo name is unchanged.

**Path:** /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio

### HARD RULE
- `src/dashboard/BoardView.jsx` is the ONLY dashboard view
- ALL chat, agent columns, task lists, message rendering live in this ONE file
- There is NO separate ChatMessageRenderer, GameView, or ChecklistMode

### Dashboard UI
| File | What it does |
|------|-------------|
| `src/dashboard/AgentInfoPage.jsx` | AgentInfoPage.jsx |
| `src/dashboard/ArchitectChat.jsx` | ArchitectChat.jsx |
| `src/dashboard/AvatarTiles.jsx` | AvatarTiles.jsx |
| `src/dashboard/BaseTierChat.jsx` | BaseTierChat.jsx |
| `src/dashboard/BoardView.jsx` | BoardView.jsx |
| `src/dashboard/ChecklistMode.jsx` | ChecklistMode.jsx |
| `src/dashboard/Dashboard.jsx` | Dashboard.jsx |
| `src/dashboard/FilesTab.jsx` | FilesTab.jsx |
| `src/dashboard/FurnitureRenderer.jsx` | FurnitureRenderer.jsx |
| `src/dashboard/GameDashboard.jsx` | GameDashboard.jsx |
| `src/dashboard/GameHUD.jsx` | GameHUD.jsx |
| `src/dashboard/HUDModeSwitcher.jsx` | HUDModeSwitcher.jsx |
| `src/dashboard/HUDNotifications.jsx` | HUDNotifications.jsx |
| `src/dashboard/HexGrid.jsx` | HexGrid.jsx |
| `src/dashboard/MegaboardMode.jsx` | MegaboardMode.jsx |

### Dashboard Components
- `src/dashboard/components/AgentInfoTab.jsx`
- `src/dashboard/components/AgentRevolver.jsx`
- `src/dashboard/components/ChildPillsDrawer.jsx`
- `src/dashboard/components/CompactStats.jsx`
- `src/dashboard/components/CreateRoomModal.jsx`
- `src/dashboard/components/FloatingActionButton.jsx`
- `src/dashboard/components/HUDConstants.jsx`
- `src/dashboard/components/ProjectCard.jsx`
- `src/dashboard/components/SkillAutocomplete.jsx`
- `src/dashboard/components/TaskContextMenu.jsx`
- `src/dashboard/components/TaskDetailAccordion.jsx`
- `src/dashboard/components/TaskLabelPill.jsx`
- `src/dashboard/components/TaskPanel.jsx`
- `src/dashboard/components/TypingIndicatorV2.jsx`
- `src/dashboard/components/VoiceChat.jsx`
- `src/dashboard/components/VoiceToggle.jsx`
- `src/dashboard/components/WorldSelector.jsx`

### Dashboard Hooks
- `src/dashboard/hooks/useDataPipe.js`
- `src/dashboard/hooks/useLongPress.js`
- `src/dashboard/hooks/useTasks.js`

### API Endpoints
- `api/dashboard/active-agents.js`
- `api/dashboard/agent-status.js`
- `api/dashboard/base-chat.js`
- `api/dashboard/chat.js`
- `api/dashboard/create-agents.js`
- `api/dashboard/files.js`
- `api/dashboard/finance.js`
- `api/dashboard/poke-agent.js`
- `api/dashboard/preferences.js`
- `api/dashboard/setup-finance.js`
- `api/dashboard/supabase-messages.js`
- `api/dashboard/supabase-status.js`
- `api/dashboard/support-chat.js`
- `api/dashboard/task-action.js`
- `api/dashboard/unstuck.js`
- `api/dashboard/v2-gemini-chat.js`
- `api/dashboard/v2-task-list.js`
- `api/dashboard/v2-task-update.js`

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
**Path:** /Users/aom-inhouse/Documents/Dev/aom-studio-transfer/AOM-EA

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

