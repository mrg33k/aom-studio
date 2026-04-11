// POST /api/dashboard/v2-gemini-chat
// Proxies chat to Gemini with task-management function calls.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Universal conversation style + tools. Used by both agent chat (Rex) and project chat.
const OWNER_USER_IDS = ['833f6828-1dae-409c-a24b-1438f46544d0']; // Patrik

// EA onboarding instruction for new worlds (non-AOM)
const EA_ONBOARDING_INSTRUCTION = `You are the user's Executive Assistant. This is their first experience with Corner. Your job is to understand them, set up their world, and make Corner powerful for them from day one.

STRICT PRIVACY RULES:
- You know NOTHING about other users, other worlds, or other businesses using Corner.
- If asked about other users (Patrik, AOM, any name), say: "I only have access to your world. I can't see other users or their data."
- Never mention: AOM, Patrik, any internal team names (Bobby, Elon, Gary, Rex, etc.), or any internal project names.
- Never reveal internal table names (tasks, messages, agents, events), API endpoints, file paths, or system architecture.
- Never reveal how Corner works internally. You are a helpful assistant, not a system administrator.
- If asked to read files, access other worlds, or run system queries, decline simply: "That's outside my access."
- You are NOT Rex. You have no knowledge of Rex, the AOM system, or any other Corner installation.

HOW TO TALK:
- Warm, curious, genuinely interested. You're meeting someone new and helping them build something.
- Conversational. Not a form. Not a checklist. A real dialogue.
- Short messages. Ask one or two questions at a time. Let them lead.
- If they want to skip a topic, skip it. Come back to it whenever they're ready.
- Match their energy. Casual if they're casual. Detailed if they're detailed.
- Use their name.

WHAT YOU'RE DOING:
You're having a conversation that progressively sets up their Corner world. As you learn about them, you create things in real-time:
- Projects (boxes) for areas of their life and business
- Environment variable requirements based on what they want to do
- Agent recommendations based on their needs

THE CONVERSATION (flexible, not linear -- they can skip any section):

1. WHO THEY ARE: Name, what they do, what stage they're at. Just get to know them.

2. THEIR GOALS: What do they want to accomplish? Business growth? Life organization? Creative projects? All of the above?

3. LIFE BOXES: Personal projects, hobbies, health, family. Each becomes a project room if they want.

4. BUSINESS BOXES: Company, clients, products, services. What's their current setup?

5. INTEGRATIONS (CRITICAL -- seek these early and throughout):
   Every integration makes Corner more powerful. Listen for opportunities:
   - They mention email? -> "Want me to manage your email? I can connect to Gmail/Outlook."
   - They mention meetings/schedule? -> "Let's connect your calendar so I can help manage that."
   - They have a website or want one? -> "I can build and deploy websites for you. We'd connect GitHub and Vercel."
   - They mention social media? -> "I can help with that. Which platforms are you on?"
   - They mention trading/finance? -> "What platforms or APIs do you use? I might be able to connect to those."
   - They mention a SaaS tool? -> "Does that have an API? I can probably integrate with it."

   Don't wait for them to ask. If you hear an opportunity, suggest it. The more connected Corner is to their tools, the more you can do for them.

   When they agree to connect something, use the create_task tool to create a setup task.

6. THEIR TEAM: Based on everything above, suggest which AI agents would help them most.

TOOLS YOU HAVE:
- create_task: Create tasks that get built by the system
- get_status: Check on task progress
- run_query: Query data in their world

CREATING PROJECTS:
When a topic crystallizes into a clear area of focus, create it as a project. Say what you're doing:
"I'm creating a project room for [topic]. This gives it its own space with dedicated context."

ENVIRONMENT VARIABLES:
These are the keys that unlock integrations. When a user agrees to connect a service:
- Google (Calendar/Gmail): "I'll send you a link to authorize your Google account."
- GitHub: "You'll need a Personal Access Token from GitHub. I'll walk you through creating one."
- Vercel: "For deploying websites, we'll connect Vercel. It's free to start."
- Other APIs: Ask what they use, check if there's an API, create a task to investigate.

IMPORTANT:
- This is NOT a one-time onboarding. You're their EA forever. The setup conversation just happens to be first.
- Don't try to do everything at once. Set up what's needed now, flag what can come later.
- Every project you create, every integration you set up, makes their Corner more useful.
- Be honest about what you can and can't do yet. If something isn't built, say so and create a task.`;

const BASE_INSTRUCTION = `You know who you're talking to. This is a real conversation, not a support ticket.

HOW TO TALK:
- This should feel like the best terminal session you've ever had. Smart, fast, natural.
- Be direct. Be warm. Be real. No corporate voice, no assistant voice, no filler.
- Short responses for short messages. Think with him when he's thinking out loud.
- If the point already landed, just confirm it. Don't repackage what he said back to him.
- Have strong opinions. Push back when something is off. If you think an approach is wrong, say so clearly.
- If a task is too vague, don't just accept it. Ask what success looks like. "What does done look like?" is a valid question.
- If something was already built, say so immediately. Don't let Patrik re-invent what exists.
- When you see a pattern of failures (same kind of task keeps failing QA), flag it and suggest a different approach.
- Match his energy exactly. Brief when he's brief. Deep when he goes deep.
- Never say "Great question!" or "Absolutely!" or "I'd be happy to help!" or any of that.
- No em dashes. No emojis unless he uses them first.
- Reference real things: what you've been working on, what's going on in the system, what happened recently.
- If you don't know something, say so. Or look it up with your tools. Don't guess.

YOUR TOOLS (use naturally, only when the conversation calls for it):
- read_file: READ THE ACTUAL CODE before writing task descriptions. See what exists before telling an agent what to change.
- list_files: Check directory structure. Never guess file paths -- verify them.
- lookup_context: search the codebase for files, components, scripts.
- run_query: look up data in Supabase (messages, tasks, agents, events, projects)
- search_history: find past conversations or decisions
- get_queue / get_status: check what's being worked on
- create_task: queue work for the build pipeline
- update_task: update task status, QA score, or error. Use when Patrik asks to fix scores, mark tasks done, requeue failed tasks, or correct metadata.
- start_runner: kick off the task runner
- cancel_task: cancel a task you created with wrong details.
- delete_messages: clean up chat
- register_project: add or update a project in the registry
- update_context: record decisions, status updates, constraints for this project

TASK CREATION RULES:
- NEVER create a task on the first message about a topic. Discuss the approach first.
- Before creating ANY task, check if a similar task already exists (use run_query on the tasks table filtered by project_path). If a matching task failed, check its error with get_status and discuss whether to fix the approach before requeuing. If it shows "done", it completed and may just need approval, not recreation.
- Only create tasks when Patrik says "do it", "lets go", "queue it", "create it", or clearly confirms.
- If Patrik describes what he WANTS, discuss how to approach it first.
- Keep task scope small. One clear change per task. "Add X to Y" not "Redesign the Z system".
- The pipeline auto-decomposes complex tasks into subtasks. You don't need to manually break things into 2-5 tasks. Just describe the full feature -- if it's too big, the pipeline handles it. If Patrik says "single task, do not decompose", create exactly ONE task, not multiple.
- AFTER CREATING: If Patrik follows up with changes, cancel the old task and create a corrected one.
- WAITING TASKS: When a skill task (video, design, etc.) needs human input, it pauses with status "waiting". If Patrik answers a question from an agent, use reply_to_task to send the answer back. Check get_queue for waiting tasks.

WHEN THE USER SAYS "QUEUE IT" OR "DO IT" OR "MAKE THOSE TASKS":
- DO NOT go silent. DO NOT ask more clarifying questions. The user has already explained what they want.
- Read back through the conversation. The context is there. Reformulate what was discussed into a clear, actionable task description.
- If the user's instruction is rough or informal ("queue them up", "make those tasks that run now"), interpret it from context. You are smart enough to figure out what they mean.
- Create the task(s) immediately. If you're unsure about a detail, make your best judgment and note your assumption. Don't block on perfection.
- NEVER return an empty response. If something fails, say what went wrong.

WHAT TO INCLUDE IN TASK DESCRIPTIONS (the builder reads ONLY your description):
- WHICH PROJECT: Always reference this project by name. The builder routes to the correct repo based on keywords.
- WHAT TO BUILD: Describe the feature, the UI, the logic, the data flow. Be specific about what it should look like and do.
- WHERE DATA COMES FROM: Which Supabase table, which hook, which API endpoint.
- WHAT DONE LOOKS LIKE: Clear acceptance criteria the builder can verify.
- DO NOT guess file paths. The builder has tools (Glob, Grep, Read) to find the right files. Describe the component or section by name, not by path.

WHAT NOT TO INCLUDE:
- Do NOT over-specify implementation details. Describe the outcome, not the code.

IMPORTANT: Conversation first. Tools second. If Patrik is venting, thinking out loud, or just chatting, TALK TO HIM. Don't reach for a tool. Only use tools when there's a clear action to take.`;

// Rex-specific identity + Corner codebase knowledge. Only used for Rex/agent chats, never for project chats.
const SYSTEM_INSTRUCTION = `${BASE_INSTRUCTION}

ABOUT AOM:
AOM (Ahead of Market) is a creative studio. Patrik is building Corner, an AI-powered dashboard where clients get a team of AI agents that do real work. The system runs on Supabase, Gemini, Claude, and Vercel.

THE TEAM (AI agents you can assign work to via create_task):
Elon (system architect), Bobby (web dev), Gary (operations), Steffen (brand/design), Cleo (video/content), Steve (sales), Elmo (QA), Mom (chief of staff), Jacob (outreach), Tony (production). All AI agents, not humans. You route work to them.

You are Rex: sharp, efficient, slightly no-nonsense. You keep the system running and you know it.

KEY CODEBASE FACTS (memorize these):
- CornerV3.jsx is the ACTIVE BUILD TARGET. All CV3 work goes here. 1846 lines. Inline styles everywhere.
- BoardView.jsx is LEGACY. Do NOT modify or reference it unless explicitly asked.
- GameDashboard.jsx is a container component. It does NOT own routes.
- ALL routes live in main.jsx using React Router. Pattern: <Route path="/dashboard" element={<AuthGuard><GameDashboard /></AuthGuard>} />. To add a new route, edit main.jsx.
- AuthGuard already exists in main.jsx. Adding auth to a new route = wrapping with <AuthGuard>. One line, not a separate task.
- src/dashboard/ is FLAT. All components are at the root level (BoardView.jsx, GameDashboard.jsx, etc). No subdirectories. Do not invent subdirectories like src/dashboard/v2/.
- vercel.json controls production routing. Every new SPA route needs a rewrite entry or it 404s on Vercel. Pattern: { "source": "/dashboard/v2", "destination": "/index.html" }.
- Dashboard.jsx, ArchitectChat.jsx, BaseTierChat.jsx, SupportChat.jsx are DEAD CODE. Never reference them.
- v2-gemini-chat.js is the active chat endpoint. chat.js is legacy, do not use.
- v2-task-create.js, v2-task-update.js, v2-task-list.js handle all task CRUD.
- ChatMessageRenderer.jsx handles markdown rendering in chat bubbles.
- VoiceChat.jsx handles the voice pipeline (Gemini 3.1 Flash Live).
- useTasks.js and useDataPipe.js are the critical realtime hooks.
- When you see a recently completed task that matches what Patrik is asking for, tell him it was already done.

PROJECTS AND REPOS (where work lives):
- Corner dashboard: aom-studio repo. CornerV3.jsx is the active build target.
- Sourcing directory: sourcing-directory repo (SEPARATE from aom-studio). All sourcing, S3C, Space Rising, directory_tenants, membership work goes here.
- AOM-EA: agent system, pipeline scripts. Not a build target for frontend work.
- Ambition: AMBITION repo. Separate from everything else.
When creating tasks, ALWAYS mention which project/repo. The builder routes based on keywords like "sourcing", "Corner", "CornerV3", etc.

HOW TO CREATE GOOD TASKS:
- ALWAYS use read_file to see the current code before writing a task description. The builder needs to know what exists.
- ALWAYS use list_files to verify paths before mentioning them. Never guess directory structures.
- Include: which file, what function/section to modify, what the code should do, what "done" looks like.
- For new routes: include main.jsx Route entry AND vercel.json rewrite.
- The builder sees ONLY your description. If you're vague, the task fails.

CV3 REDESIGN (current major project):
- Mockup live at /cv3 (source: public/cv3.html). Patrik approved it.
- CornerV3.jsx is being built at src/dashboard/CornerV3.jsx with route /dashboard/v2.
- This is a PARALLEL build. BoardView stays untouched at /dashboard until V3 is fully QA'd, then routes swap.
- Three views: Home (agent cards), Tasks (project filter + search), Chat (message bubbles + voice + attachments).
- Two-row nav bar: top row (logo + world switcher + bell + avatar), bottom row (Home/Tasks/Chat tabs with badges + live stats).
- Multi-tenant from day one. World switcher loads projects from Supabase. All queries scoped by client_id.
- 6-phase wire-up plan. Each phase is standalone deploy.
- CV3-BUILD-SHEET.md in the repo root has every exact CSS value from the mockup. The builder automatically reads it for CV3 tasks. In your task descriptions, reference specific SECTIONS of the build sheet (e.g. "follow the NAV BAR section of CV3-BUILD-SHEET.md") instead of copying every value. The builder will have the sheet.

COMPLEX VISUAL WORK PROCESS (use this for any design implementation, not just CV3):
When working on a design that has an approved mockup or spec:
1. Extract exact values into a BUILD SHEET (or reference an existing one). Every color hex, padding, font size, border radius -- everything the builder needs to match the design pixel-perfect.
2. In task descriptions, reference SECTIONS of the build sheet (e.g. "follow the NAV BAR section") instead of saying "match the mockup." The builder has access to the build sheet file.
3. One section = one task. Don't mix nav bar fixes with task card styling.
4. Include the acceptance criteria: "the header should look identical to cv3.html line 253-288."
This process works for ANY visual spec: mockups, Figma exports, reference screenshots, brand guidelines.`;

const TOOLS = [{ functionDeclarations: [
  { name: 'create_task', description: 'Create a task in the AOM queue. Always set agent AND project to route correctly.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'number' }, agent: { type: 'string', description: 'Agent to assign: bobby (frontend/web), gary (ops/SOPs), steffen (design/brand), cleo (video/content), jacob (outreach/email), elmo (QA/testing), rex (admin/EA tasks)' }, project: { type: 'string', description: 'Project slug: corner (dashboard/product), sourcing (sourcing.directory), ambition (ambitionac.com), aom-website (aheadofmarket.com marketing), brandon-wiley-documentary, isa-energy. ALWAYS set this. In project chats this is auto-filled.' } }, required: ['title', 'description', 'agent'] } },
  { name: 'get_queue', description: 'List queued/active tasks.', parameters: { type: 'object', properties: {} } },
  { name: 'get_status', description: 'Fetch a task by id.', parameters: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'delete_messages', description: 'Delete recent messages for this agent. Use when asked to clean up, clear, or delete messages.', parameters: { type: 'object', properties: { count: { type: 'number', description: 'Number of recent messages to delete (default 10)' } } } },
  { name: 'run_query', description: 'Run a read-only query against Supabase. Use for looking up data, checking status, counting records, etc.', parameters: { type: 'object', properties: { table: { type: 'string', description: 'Table name (messages, tasks, agents, events)' }, filters: { type: 'string', description: 'PostgREST filter string e.g. status=eq.done&limit=5' }, select: { type: 'string', description: 'Columns to select e.g. id,title,status' } }, required: ['table'] } },
  { name: 'search_history', description: 'Search conversation history for past discussions, decisions, or events. Use when asked about what happened before.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to search for in conversation history' }, agent: { type: 'string', description: 'Optional: limit search to specific agent' } }, required: ['query'] } },
  { name: 'start_runner', description: 'Start the task runner to process queued tasks. Use when asked to run the queue, start building, get tasks going, or kick off work. The runner picks up queued tasks and builds them.', parameters: { type: 'object', properties: {} } },
  { name: 'register_project', description: 'Add or update a project in the registry. Use proactively when conversation implies a project change: new repo mentioned, project moved, rules changed, work should go to a specific repo. Fuzzy-matches existing projects so you don\'t need the exact slug. If unsure which project, it will return candidates to clarify with Patrik.', parameters: { type: 'object', properties: { slug: { type: 'string', description: 'Best guess at project slug (lowercase, hyphenated). Fuzzy-matched against all existing projects.' }, name: { type: 'string', description: 'Display name' }, repo_path: { type: 'string', description: 'Absolute filesystem path to the repo' }, repo_description: { type: 'string', description: 'What this repo is, one line' }, scan_dirs: { type: 'string', description: 'Comma-separated directories to scan for the phonebook (e.g. "src,api,tests")' }, hard_rules: { type: 'string', description: 'Comma-separated rules agents must follow for this project' } }, required: ['slug'] } },
  { name: 'lookup_context', description: 'Search the codebase for relevant files, scripts, components, and architecture. Use this BEFORE creating tasks to check what already exists. Also use when Patrik asks about how something works or where something lives in the code.', parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to search for (e.g. "voice chat", "onboarding", "task runner", "auth")' } }, required: ['query'] } },
  { name: 'update_task', description: 'Update a task status, QA score, or error. Use when Patrik asks to fix task scores, mark tasks done, requeue failed tasks, or correct task metadata.', parameters: { type: 'object', properties: { task_id: { type: 'string', description: 'The task ID to update' }, status: { type: 'string', description: 'New status: queued, done, failed, cancelled' }, qa_score: { type: 'number', description: 'QA score 1-10' }, qa_notes: { type: 'string', description: 'QA notes explaining the score' }, error: { type: 'string', description: 'Error message (set to empty string to clear)' } }, required: ['task_id'] } },
  { name: 'cancel_task', description: 'Cancel a queued task. Use when you created a task with wrong details and need to clean it up before the runner picks it up.', parameters: { type: 'object', properties: { task_id: { type: 'string', description: 'The task ID to cancel' } }, required: ['task_id'] } },
  { name: 'reply_to_task', description: 'Reply to a skill task that is waiting for human input. Use when Patrik answers a question from an agent (like Cleo or Steffen) working on a skill task. The task will resume with the answer.', parameters: { type: 'object', properties: { task_id: { type: 'string', description: 'The waiting task ID' }, answer: { type: 'string', description: 'The human reply/direction to give the agent' } }, required: ['task_id', 'answer'] } },
  { name: 'read_file', description: 'Read a source file from the codebase. Use this BEFORE creating tasks to see what code already exists in a file. Returns the file contents. Paths are relative to the repo root (e.g. "src/dashboard/CornerV3.jsx").', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path relative to repo root' }, start_line: { type: 'number', description: 'Start line (1-indexed, default 1)' }, end_line: { type: 'number', description: 'End line (default: start+100)' } }, required: ['path'] } },
  { name: 'list_files', description: 'List files in a directory. Use this to verify file paths and see the actual directory structure instead of guessing. Returns file names in the directory.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Directory path relative to repo root (e.g. "src/dashboard")' } }, required: ['path'] } },
  { name: 'update_context', description: 'Update a section of a project CONTEXT.md document. Use when the operator asks to record decisions, update project status, add constraints, or note architectural choices for a project. Only works within a project conversation (requires project_slug).', parameters: { type: 'object', properties: { project_slug: { type: 'string', description: 'The project slug to update context for' }, section: { type: 'string', enum: ['overview', 'status', 'decisions', 'constraints', 'architecture', 'notes'], description: 'Which section of the CONTEXT.md to update' }, content: { type: 'string', description: 'The content to write into the section' }, action: { type: 'string', enum: ['replace', 'append'], description: 'Whether to replace the section content or append to it (default: replace)' } }, required: ['project_slug', 'section', 'content'] } },
  { name: 'read_project_file', description: 'Read a file from the project folder (plans, rankings, specs, briefs). Use this when CONTEXT.md references a file you need to read. Path is relative to the project folder (e.g. "tiktok-respin-rankings.md").', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path relative to the project folder (e.g. "tiktok-respin-rankings.md", "respin-001-freezer-repair.md")' } }, required: ['path'] } },
  { name: 'list_project_files', description: 'List files in the project folder. Use to discover what files are available (plans, specs, briefs, rankings, etc.).', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Subdirectory to list (optional, default lists project root)' } } } },
  { name: 'write_data', description: 'Insert, update, or delete records in the project database. Use for direct data operations like clearing placeholder records, seeding data, or updating fields. Only works for projects with their own Supabase (e.g. sourcing). Always confirm with the user before deleting.', parameters: { type: 'object', properties: { table: { type: 'string', description: 'Table name (e.g. directory_reports, directory_companies)' }, action: { type: 'string', enum: ['insert', 'update', 'delete'], description: 'What to do' }, filters: { type: 'string', description: 'PostgREST filter for update/delete (e.g. id=eq.abc123 or title=ilike.*coming%20soon*)' }, data: { type: 'object', description: 'Data to insert or update (key-value pairs)' } }, required: ['table', 'action'] } },
  { name: 'use_integration', description: 'Use an external integration (Gmail, Google Calendar, etc) using keys stored in Settings. The user must configure their API key in Settings first. Use this when the user asks to check email, list calendar events, send email, or create calendar events.', parameters: { type: 'object', properties: { service: { type: 'string', enum: ['gmail', 'calendar'], description: 'Which service to use' }, action: { type: 'string', description: 'What to do: gmail supports list_emails, send_email; calendar supports list_events, create_event' }, params: { type: 'object', description: 'Action-specific params (e.g. {to, subject, body} for send_email, {query, maxResults} for list_emails, {summary, start, end} for create_event)' } }, required: ['service', 'action'] } },
]}];

async function sbFetch(path, options = {}) {
  const resp = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...(options.headers || {}) },
  });
  if (!resp.ok) throw new Error(`Supabase ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

async function getMaxSortOrder(clientId) {
  const rows = await sbFetch(`/rest/v1/tasks?select=sort_order&client_id=eq.${encodeURIComponent(clientId)}&order=sort_order.desc.nullslast&limit=1`);
  const value = rows[0]?.sort_order;
  return Number.isFinite(value) ? value : Number(value) || 0;
}

async function createTask(args = {}, clientId) {
  if (!args.title || typeof args.title !== 'string' || !args.title.trim()) throw new Error('title required');
  // Pre-flight validation: warn if description is weak
  const desc = (args.description || '').trim();
  const warnings = [];
  if (desc.length < 30) warnings.push('Description is very short. Include file paths and acceptance criteria for better results.');
  if (!/\.(jsx|js|tsx|ts|py|sh|css)/.test(desc) && !/BoardView|VoiceChat|GameDashboard|useTasks|useDataPipe/.test(desc)) {
    warnings.push('No specific file mentioned. Tasks with file paths have higher QA pass rates.');
  }
  if (!/inline style|acceptance|criteria|should|must/i.test(desc)) {
    warnings.push('Consider adding acceptance criteria (what "done" looks like).');
  }
  const sort_order = (await getMaxSortOrder(clientId)) + 100;
  let priority = args.priority;
  if (priority === undefined || priority === null || priority === '') priority = 0;
  if (typeof priority === 'string' && priority.trim() !== '') priority = Number(priority);
  if (!Number.isFinite(priority)) priority = 0;
  const crypto = await import('crypto');
  const titleText = args.title.trim();
  const newTask = { id: crypto.randomUUID(), title: titleText, text: titleText, description: args.description, status: 'queued', sort_order, priority, created_by: 'system', client_id: clientId };
  if (args.agent_identity !== undefined) newTask.agent_identity = args.agent_identity;
  // Set project_path (slug) so the pipeline can load the right CONTEXT.md
  if (args.project) newTask.project_path = args.project;
  if (args.agent_identity && !newTask.agent_identity) newTask.agent_identity = args.agent_identity;
  const created = await sbFetch('/rest/v1/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(newTask) });
  const result = Array.isArray(created) ? created[0] : created;
  if (warnings.length > 0) result._warnings = warnings;
  // Auto-signal runner to start (idempotent -- runner watcher picks it up)
  try {
    await sbFetch('/rest/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        agent: 'system',
        event_type: 'runner_start_requested',
        payload: { source: 'create_task', task_id: result.id, agent: newTask.agent_identity || null },
      }),
    });
  } catch (e) { /* non-fatal */ }
  return result;
}

async function getQueue(clientId, projectPath) {
  const params = ['status=in.(queued,classifying,planning,building,qa)', 'order=priority.desc'];
  // Project chats: scope by project_path (pipeline tasks have client_id=aom, not the user's client_id)
  if (projectPath) {
    params.push(`project_path=eq.${encodeURIComponent(projectPath)}`);
  } else if (clientId) {
    params.push(`client_id=eq.${encodeURIComponent(clientId)}`);
  }
  return sbFetch(`/rest/v1/tasks?${params.join('&')}`);
}

async function getStatus(taskId, clientId, projectPath) {
  // Allow querying by task ID or by status filters
  let params;
  if (taskId === 'recent' || taskId === 'failed' || taskId === 'done') {
    // Special: get recent tasks by status
    const statusFilter = taskId === 'failed' ? 'status=eq.failed' : taskId === 'done' ? 'status=in.(done,failed)' : 'status=in.(queued,classifying,planning,building,qa,done,failed)';
    params = [statusFilter, 'order=created_at.desc', 'limit=10'];
    // Project chats: scope by project_path so we see pipeline-created tasks
    if (projectPath) {
      params.push(`project_path=eq.${encodeURIComponent(projectPath)}`);
    } else if (clientId) {
      params.push(`client_id=eq.${encodeURIComponent(clientId)}`);
    }
    const tasks = await sbFetch(`/rest/v1/tasks?${params.join('&')}&select=id,title,status,qa_score,qa_notes,error,agent_identity,project_path,created_at,completed_at`);
    return tasks;
  }
  // Single task lookup by ID -- no client/project filter needed (ID is unique)
  params = [`id=eq.${encodeURIComponent(taskId)}`];
  const task = await sbFetch(`/rest/v1/tasks?${params.join('&')}`);
  // Also fetch task thread messages (QA notes, build status, errors)
  const thread = await sbFetch(`/rest/v1/messages?agent=eq.task:${encodeURIComponent(taskId)}&select=text,role,timestamp&order=timestamp.asc&limit=20`);
  if (Array.isArray(task) && task.length > 0) {
    const t = task[0];
    t.thread = Array.isArray(thread) ? thread.map(m => m.text) : [];
    // Build a human-readable summary
    t.summary = `${t.title} -- ${t.status}${t.qa_score ? ` (QA: ${t.qa_score}/10)` : ''}${t.qa_notes ? `\nQA Notes: ${t.qa_notes}` : ''}${t.error ? `\nError: ${t.error}` : ''}${t.thread.length ? `\nThread:\n${t.thread.join('\n')}` : ''}`;
  }
  return task;
}

async function deleteMessages(agentSlug, clientId, count = 10) {
  if (!agentSlug) throw new Error('agent required');
  const params = [`agent=eq.${encodeURIComponent(agentSlug)}`, `order=timestamp.desc`, `limit=${Math.min(count, 50)}`];
  if (clientId) params.push(`client_id=eq.${encodeURIComponent(clientId)}`);
  // Fetch IDs first, then delete
  const msgs = await sbFetch(`/rest/v1/messages?${params.join('&')}&select=id`);
  if (!Array.isArray(msgs) || msgs.length === 0) return { deleted: 0 };
  const ids = msgs.map(m => m.id);
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/messages?id=in.(${ids.join(',')})`, {
    method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
  });
  if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
  return { deleted: ids.length };
}

// Project-specific Supabase credentials (projects with their own DB)
const PROJECT_SUPABASE = {
  sourcing: {
    url: 'https://kzzvjtthknsozktmpvak.supabase.co',
    key: process.env.SOURCING_SUPABASE_SERVICE_KEY,
    tables: ['directory_companies', 'directory_members', 'directory_certifications', 'directory_tenants',
             'directory_reports', 'directory_listings', 'directory_organizations', 'user_notification_preferences'],
  },
};

async function runQuery(table, filters, select, clientId, projectPath) {
  // Check if this table belongs to a project-specific Supabase
  const projectDb = await getProjectDb(projectPath, clientId);
  if (projectDb && projectDb.tables.includes(table)) {
    if (!projectDb.key) throw new Error(`Project DB key not configured for ${projectPath}. Add SUPABASE_SERVICE_KEY to env_vars or set SOURCING_SUPABASE_SERVICE_KEY in Vercel env.`);
    const qs = [(filters || 'limit=10'), `select=${select || '*'}`].filter(Boolean).join('&');
    const resp = await fetch(`${projectDb.url}/rest/v1/${table}?${qs}`, {
      headers: { apikey: projectDb.key, Authorization: `Bearer ${projectDb.key}` },
    });
    if (!resp.ok) throw new Error(`Project DB query failed: ${resp.status}`);
    return resp.json();
  }

  // Default AOM Supabase
  const allowed = ['messages', 'tasks', 'events', 'projects', 'agent_status'];
  if (!allowed.includes(table)) {
    // If in a project chat, hint about project-specific tables
    if (projectDb && projectDb.tables.length) {
      throw new Error(`Table "${table}" not in AOM DB. This project has its own tables: ${projectDb.tables.join(', ')}`);
    }
    throw new Error(`Table not allowed: ${table}. Use: ${allowed.join(', ')}`);
  }
  // MANDATORY: scope by project_path for tasks, client_id for everything else
  let scopeFilter;
  if (projectPath && table === 'tasks') {
    scopeFilter = `project_path=eq.${encodeURIComponent(projectPath)}`;
  } else {
    scopeFilter = `client_id=eq.${encodeURIComponent(clientId || 'aom')}`;
  }
  const userFilters = (filters || 'limit=10').replace(/client_id=eq\.[^&]*/g, '');
  const qs = [scopeFilter, userFilters, `select=${select || '*'}`].filter(Boolean).join('&');
  return sbFetch(`/rest/v1/${table}?${qs}`);
}

async function registerProject(args = {}, clientId) {
  if (!args.slug) throw new Error('slug required');
  const inputSlug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const cid = encodeURIComponent(clientId || 'aom');
  const allProjects = await sbFetch(`/rest/v1/projects?select=id,slug,name,repo_path,repo_description&is_active=eq.true&client_id=eq.${cid}&order=name`);
  const projects = Array.isArray(allProjects) ? allProjects : [];
  const input = inputSlug.toLowerCase();
  const inputWords = input.split('-').filter(Boolean);
  const inputName = (args.name || '').toLowerCase();
  function scoreMatch(proj) {
    const slug = (proj.slug || '').toLowerCase();
    const name = (proj.name || '').toLowerCase();
    const desc = (proj.repo_description || '').toLowerCase();
    const path = (proj.repo_path || '').toLowerCase();
    let score = 0;
    if (slug === input) return 100;
    if (slug.includes(input) || input.includes(slug)) score += 60;
    if (name.includes(input) || input.includes(name.replace(/[^a-z0-9]/g, ''))) score += 50;
    if (inputName && (name.includes(inputName) || inputName.includes(name.toLowerCase()))) score += 50;
    const projWords = [...slug.split('-'), ...name.split(/[\s-]+/)].map(w => w.toLowerCase()).filter(Boolean);
    for (const w of inputWords) { if (projWords.some(pw => pw.includes(w) || w.includes(pw))) score += 20; }
    if (path.includes(input)) score += 30;
    for (const w of inputWords) { if (w.length > 2 && desc.includes(w)) score += 10; }
    return score;
  }
  const scored = projects.map(p => ({ ...p, _score: scoreMatch(p) })).filter(p => p._score > 0).sort((a, b) => b._score - a._score);
  const patch = {};
  if (args.name) patch.name = args.name;
  if (args.repo_path) patch.repo_path = args.repo_path;
  if (args.repo_description) patch.repo_description = args.repo_description;
  if (args.scan_dirs) patch.scan_dirs = args.scan_dirs.split(',').map(s => s.trim()).filter(Boolean);
  if (args.hard_rules) patch.hard_rules = args.hard_rules.split(',').map(s => s.trim()).filter(Boolean);
  if (scored.length > 0 && scored[0]._score >= 60) {
    const match = scored[0];
    await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${match.id}`, {
      method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(patch),
    });
    const updateResult = { action: 'updated', slug: match.slug, matched_name: match.name, fields: Object.keys(patch) };
    updateResult.isolation_warnings = await validateProjectIsolation(match.slug, patch.repo_path || match.repo_path);
    return updateResult;
  }
  if (scored.length > 0 && scored[0]._score >= 20) {
    const candidates = scored.slice(0, 3).map(p => `${p.name} (slug: ${p.slug}${p.repo_path ? ', path: ' + p.repo_path : ''})`);
    return { action: 'clarify', message: 'Found similar projects but not confident enough to auto-match. Did you mean one of these?', candidates, input_slug: inputSlug, hint: 'If one of these is correct, call register_project again with that exact slug. If none match, confirm this is a brand new project.' };
  }
  const existingList = projects.map(p => `${p.name} (${p.slug})`).join(', ');
  const crypto = await import('crypto');
  const newProject = { id: crypto.randomUUID(), slug: inputSlug, name: args.name || inputSlug, color: '#6B7280', icon: 'project', type: 'project', is_active: true, client_id: clientId, ...patch };
  await sbFetch('/rest/v1/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(newProject) });
  // Create disk folder + CONTEXT.md via RAG server
  const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';
  try {
    await fetch(`${RAG_URL}/create-project`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: inputSlug, name: args.name || inputSlug, description: args.repo_description || '' }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) { /* RAG server may not have this endpoint yet -- Supabase row is enough for now */ }
  const createResult = { action: 'created', slug: inputSlug, fields: Object.keys(patch), note: `Created new project room. Existing projects were: ${existingList}` };
  // Validate isolation checklist
  createResult.isolation_warnings = await validateProjectIsolation(inputSlug, patch.repo_path);
  return createResult;
}

async function validateProjectIsolation(slug, repoPath) {
  const warnings = [];
  const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';
  // Check CONTEXT.md exists
  try {
    const ctxResp = await fetch(`${RAG_URL}/project-context?slug=${encodeURIComponent(slug)}`, { signal: AbortSignal.timeout(3000) });
    const ctx = await ctxResp.json();
    if (!ctx?.context_md) warnings.push(`Missing CONTEXT.md at projects/${slug}/CONTEXT.md -- operator will have no project knowledge`);
  } catch { warnings.push(`Could not check CONTEXT.md (RAG server unreachable)`); }
  // Check repo_path
  if (!repoPath) warnings.push('No repo_path set -- read_file/list_files will fall back to aom-studio (wrong codebase)');
  // Check PHONEBOOK.md
  try {
    const pbResp = await fetch(`${RAG_URL}/read-project-file?slug=${encodeURIComponent(slug)}&path=PHONEBOOK.md`, { signal: AbortSignal.timeout(3000) });
    if (!pbResp.ok) warnings.push(`Missing PHONEBOOK.md at projects/${slug}/PHONEBOOK.md -- planner won't know where files are`);
  } catch { /* silent */ }
  return warnings.length > 0 ? warnings : null;
}

const CONTEXT_TEMPLATE = `# Project Context

## Overview


## Status


## Decisions


## Constraints


## Architecture


## Notes

`;

const CONTEXT_SECTIONS = ['overview', 'status', 'decisions', 'constraints', 'architecture', 'notes'];

function parseContextSections(md) {
  const sections = {};
  const lines = md.split('\n');
  let currentSection = null;
  let currentLines = [];
  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      if (currentSection) sections[currentSection] = currentLines.join('\n').trim();
      currentSection = match[1].toLowerCase().trim();
      currentLines = [];
    } else if (currentSection) {
      currentLines.push(line);
    }
  }
  if (currentSection) sections[currentSection] = currentLines.join('\n').trim();
  return sections;
}

function rebuildContext(sections) {
  let md = '# Project Context\n\n';
  for (const s of CONTEXT_SECTIONS) {
    const header = s.charAt(0).toUpperCase() + s.slice(1);
    md += `## ${header}\n\n${sections[s] || ''}\n\n`;
  }
  // Include any extra sections not in the standard list
  for (const [key, val] of Object.entries(sections)) {
    if (!CONTEXT_SECTIONS.includes(key)) {
      const header = key.charAt(0).toUpperCase() + key.slice(1);
      md += `## ${header}\n\n${val}\n\n`;
    }
  }
  return md.trimEnd() + '\n';
}

async function updateContext(args, clientId) {
  const slug = (args.project_slug || '').trim();
  if (!slug) return { error: 'update_context only works in project chat -- project_slug is required' };
  const section = (args.section || '').trim().toLowerCase();
  if (!section) return { error: 'section is required' };
  const content = args.content || '';
  const action = (args.action || 'replace').trim().toLowerCase();

  // Look up project by slug
  const projects = await sbFetch(`/rest/v1/projects?slug=eq.${encodeURIComponent(slug)}&limit=1&select=id,slug`);
  const project = Array.isArray(projects) ? projects[0] : null;
  if (!project) return { error: `Project not found: ${slug}` };

  // Fetch existing context from events table (event_type='project_context', agent=project slug)
  const existing = await sbFetch(`/rest/v1/events?event_type=eq.project_context&agent=eq.${encodeURIComponent(slug)}&order=timestamp.desc&limit=1&select=id,payload`);
  const row = Array.isArray(existing) ? existing[0] : null;
  const currentMd = (row?.payload?.context_md) ? row.payload.context_md : CONTEXT_TEMPLATE;

  // Parse sections
  const sections = parseContextSections(currentMd);

  // Apply update
  if (action === 'append') {
    const prev = sections[section] || '';
    sections[section] = prev ? prev + '\n' + content : content;
  } else {
    sections[section] = content;
  }

  const updatedMd = rebuildContext(sections);
  const wordCount = updatedMd.split(/\s+/).filter(Boolean).length;

  // Upsert context via events table
  if (row) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${row.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ payload: { context_md: updatedMd, project_id: project.id }, timestamp: new Date().toISOString() }),
    });
    if (!resp.ok) throw new Error(`Failed to update project context: ${resp.status}`);
  } else {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ agent: slug, event_type: 'project_context', payload: { context_md: updatedMd, project_id: project.id } }),
    });
    if (!resp.ok) throw new Error(`Failed to insert project context: ${resp.status}`);
  }

  const result = { updated: true, section, word_count: wordCount };
  if (wordCount > 3000) {
    result.warning = `Context document is ${wordCount} words (over 3000). Consider summarizing older sections to keep it focused.`;
  }
  return result;
}

async function startRunner() {
  // Write signal to Supabase events table -- home machine watcher picks it up
  const result = await sbFetch('/rest/v1/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      agent: 'system',
      event_type: 'runner_start_requested',
      payload: { source: 'gemini-chat', requested_at: new Date().toISOString() },
    }),
  });
  return { signaled: true, message: 'Start signal sent. Runner will pick up tasks within seconds.' };
}

// Server-side cache: agent identity + system state + tapes + RAG + env_vars. Refreshes per TTL.
const _cache = { agents: {}, systemState: null, systemStateAt: 0, tapes: {}, rag: {}, envVars: {} };
const CACHE_TTL = 60000; // 60 seconds

// Load env_vars from DB for a given scope. Returns { KEY: value } map.
// Cache is best-effort (serverless cold starts clear it).
async function loadEnvVars(scope, scopeId, clientId = 'aom') {
  const cacheKey = `${scope}:${scopeId}:${clientId}`;
  const cached = _cache.envVars[cacheKey];
  if (cached && Date.now() - cached._at < CACHE_TTL) return cached.vars;

  try {
    const url = `${SUPABASE_URL}/rest/v1/env_vars?scope=eq.${encodeURIComponent(scope)}&scope_id=eq.${encodeURIComponent(scopeId)}&client_id=eq.${encodeURIComponent(clientId)}&select=key,value`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return {};
    const rows = await r.json();
    const vars = {};
    for (const row of rows) vars[row.key] = row.value;
    _cache.envVars[cacheKey] = { vars, _at: Date.now() };
    return vars;
  } catch {
    return {};
  }
}

// Resolve project DB credentials: env_vars first, hardcoded fallback second.
async function getProjectDb(projectPath, clientId = 'aom') {
  if (!projectPath) return null;

  // Try env_vars
  const vars = await loadEnvVars('project', projectPath, clientId);
  if (vars.SUPABASE_URL && vars.SUPABASE_SERVICE_KEY) {
    const tables = vars.ALLOWED_TABLES ? vars.ALLOWED_TABLES.split(',').map(t => t.trim()) : [];
    return { url: vars.SUPABASE_URL, key: vars.SUPABASE_SERVICE_KEY, tables };
  }

  // Fallback to hardcoded (remove once env_vars is confirmed working)
  return PROJECT_SUPABASE[projectPath] || null;
}
const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';

async function getCachedTape(slug) {
  if (_cache.tapes[slug] && Date.now() - _cache.tapes[slug]._at < CACHE_TTL) {
    return _cache.tapes[slug].tape;
  }
  try {
    const res = await fetch(`${RAG_URL}/agent-tape?slug=${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const tape = data?.tape || '';
    _cache.tapes[slug] = { tape, _at: Date.now() };
    return tape;
  } catch { return ''; }
}

async function getRAGContext(query, agentSlug) {
  const cacheKey = `${agentSlug}:${query}`;
  if (_cache.rag[cacheKey] && Date.now() - _cache.rag[cacheKey]._at < 120000) {
    return _cache.rag[cacheKey].results;
  }
  try {
    const res = await fetch(`${RAG_URL}/search-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, agent: agentSlug, top_k: 5 }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return '';
    const data = await res.json();
    const items = Array.isArray(data?.results) ? data.results : [];
    const results = items.map(r => `[${r.timestamp || ''}] ${r.agent || ''}: ${(r.text || '').slice(0, 300)}`).join('\n');
    _cache.rag[cacheKey] = { results, _at: Date.now() };
    return results;
  } catch { return ''; }
}

async function getCachedAgent(slug) {
  if (_cache.agents[slug] && Date.now() - _cache.agents[slug]._at < CACHE_TTL) {
    return _cache.agents[slug];
  }
  try {
    const rows = await sbFetch(`/rest/v1/agents?slug=eq.${encodeURIComponent(slug)}&limit=1&select=display_name,description,personality,voice_style`);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (row) { row._at = Date.now(); _cache.agents[slug] = row; }
    return row;
  } catch { return null; }
}

async function getCachedSystemState() {
  if (_cache.systemState && Date.now() - _cache.systemStateAt < CACHE_TTL) {
    return _cache.systemState;
  }
  try {
    const [activeTasks, recentDone, recentFailed] = await Promise.all([
      sbFetch('/rest/v1/tasks?status=in.(queued,classifying,planning,building,qa)&order=priority.desc&limit=10&select=id,title,status,priority,agent_identity'),
      sbFetch('/rest/v1/tasks?status=eq.done&order=completed_at.desc.nullslast&limit=8&select=id,title,qa_score,completed_at,agent_identity'),
      sbFetch('/rest/v1/tasks?status=eq.failed&order=completed_at.desc.nullslast&limit=5&select=id,title,error,completed_at,agent_identity'),
    ]);
    const parts = [];
    if (Array.isArray(activeTasks) && activeTasks.length > 0) {
      parts.push('Active tasks: ' + activeTasks.map(t => `${t.title} [${t.status}${t.agent_identity ? ', ' + t.agent_identity : ''}]`).join(', '));
    } else {
      parts.push('Task queue: empty.');
    }
    if (Array.isArray(recentDone) && recentDone.length > 0) {
      parts.push('Recently completed: ' + recentDone.map(t => `${t.title} (QA: ${t.qa_score || '?'}/10${t.agent_identity ? ', ' + t.agent_identity : ''}${t.completed_at ? ', ' + t.completed_at.slice(0, 16) : ''})`).join(', '));
    }
    if (Array.isArray(recentFailed) && recentFailed.length > 0) {
      parts.push('Recently failed: ' + recentFailed.map(t => `${t.title} (${(t.error || '').slice(0, 80)}${t.agent_identity ? ', ' + t.agent_identity : ''})`).join(', '));
    }
    const result = parts.length > 0 ? '\n\nCURRENT SYSTEM STATE:\n' + parts.join('\n') : '';
    _cache.systemState = result;
    _cache.systemStateAt = Date.now();
    return result;
  } catch { return ''; }
}

async function setAgentStatus(slug, status) {
  if (!slug || !SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_agent_status`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ p_slug: slug, p_status: status, p_source: 'gemini', p_task_text: status === 'working' ? 'Responding to user' : '' }),
    });
  } catch (_) { /* fire-and-forget */ }
}

async function callGemini(contents, systemInstruction = SYSTEM_INSTRUCTION) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }, contents, tools: TOOLS }) }
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${data?.error?.message || JSON.stringify(data)}`);
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini not configured' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const { message, history, client_id, agent, project_id, project_slug, user_id, user_name } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });

  const clientId = (client_id && String(client_id).trim()) || 'aom';
  const agentSlug = (agent && String(agent).trim()) || null;
  const projectSlug = (project_slug && String(project_slug).trim()) || null;
  const resolvedUserName = (user_name && String(user_name).trim()) || null;
  const resolvedUserId = (user_id && String(user_id).trim()) || null;
  const isOwner = OWNER_USER_IDS.includes(resolvedUserId);
  const isAOM = clientId === 'aom';
  const baseHistory = Array.isArray(history) ? history : [];
  const contents = [...baseHistory, { role: 'user', parts: [{ text: message }] }];

  try {
    await setAgentStatus(agentSlug, 'working');
    // Resolved project UUID: from request body or looked up from project_slug below
    let resolvedProjectId = (project_id && String(project_id).trim()) || null;
    let systemInstruction = isAOM ? SYSTEM_INSTRUCTION : EA_ONBOARDING_INSTRUCTION;
    if (agentSlug) {
      try {
        // Cached agent identity (refreshes every 60s)
        const agentRow = await getCachedAgent(agentSlug);
        const agentName = agentRow?.display_name;
        const agentDescription = agentRow?.description;
        const agentPersonality = agentRow?.personality;

        // Use client-side history if provided (saves a Supabase round trip)
        // Only fetch from DB if client didn't send history
        let recentContext = '';
        if (baseHistory.length >= 4) {
          // Client already has conversation context in the history array -- skip DB fetch
          recentContext = '';
        } else {
          try {
            const recentMsgs = await sbFetch(`/rest/v1/messages?agent=eq.${encodeURIComponent(agentSlug)}&order=timestamp.desc&limit=15&select=role,text,timestamp,attachment_url`);
            if (Array.isArray(recentMsgs) && recentMsgs.length > 0) {
              recentContext = '\n\nRecent conversation (you were part of this):\n' + recentMsgs.reverse().map(m => {
                let line = `[${(m.timestamp || '').slice(0, 16)}] (${m.role}) ${(m.text || '').slice(0, 400)}`;
                if (m.attachment_url) line += ` [Uploaded file: ${m.attachment_url}]`;
                return line;
              }).join('\n');
            }
          } catch (e) { /* silent */ }
        }

        // Cached system state (refreshes every 60s)
        const systemState = await getCachedSystemState();

        if (agentName && agentDescription) {
          const voiceStyle = agentRow?.voice_style || '';

          // Load tape + RAG context in parallel (both timeout after 5s, return empty on failure)
          const [tape, ragResults] = await Promise.all([
            getCachedTape(agentSlug),
            getRAGContext(message, agentSlug),
          ]);

          const tapeSection = tape
            ? `\n\nYOUR TAPE (recent work log -- what you've been doing, key decisions, what's in flight):\n${tape}`
            : '';
          const ragSection = ragResults
            ? `\n\nRELEVANT HISTORY (from conversation archive, matched to this message):\n${ragResults}`
            : '';

          // User identity context
          const userSection = resolvedUserName
            ? `\nCURRENT USER: ${resolvedUserName}${isOwner ? ' (owner)' : ' (team member)'}. Address them by name.`
            + (!isOwner ? `\n\nTEAM MEMBER PROTOCOL: When ${resolvedUserName} makes a request, FIRST check if similar work is already in progress, completed, or queued by searching recent tasks and conversations. If you find overlap, tell ${resolvedUserName} what exists and help them build on it rather than starting fresh. If no overlap, queue the work immediately.` : '')
            : '';

          // EA onboarding mode: non-AOM worlds get a dedicated onboarding instruction
          const isEAOnboarding = agentSlug === 'ea' && clientId !== 'aom';
          const baseInstruction = isEAOnboarding ? EA_ONBOARDING_INSTRUCTION : SYSTEM_INSTRUCTION;

          systemInstruction = `You are ${agentName}. ${agentDescription}

Personality: ${agentPersonality || 'Direct, real, gets things done.'}
Voice: ${voiceStyle || 'Natural, human, direct.'}
${tapeSection}${ragSection}${userSection}

${baseInstruction}${isEAOnboarding ? '' : systemState}${recentContext}`;
        }
      } catch (err) {
        console.error('[v2-gemini-chat] Agent lookup failed:', err.message);
      }
    } else if (projectSlug) {
      try {
        // Fetch project details, context, and task history in parallel
        const projects = await sbFetch(`/rest/v1/projects?slug=eq.${encodeURIComponent(projectSlug)}&limit=1&select=id,slug,name,repo_description,repo_path`);
        const project = Array.isArray(projects) ? projects[0] : null;

        if (project?.id) resolvedProjectId = project.id;
        // Store repo_path so read_file/list_files can target the right repo
        var projectRepoPath = project?.repo_path || null;

        // Parallel fetch: project context (from disk via RAG server) + tasks + messages
        // Use Promise.allSettled so one failure doesn't kill the whole project chat
        const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';
        const [ctxSettled, tasksSettled, msgsSettled, stateSettled] = await Promise.allSettled([
          // Primary: read CONTEXT.md from disk via RAG server (source of truth)
          fetch(`${RAG_URL}/project-context?slug=${encodeURIComponent(projectSlug)}`, {
            signal: AbortSignal.timeout(5000),
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          sbFetch(`/rest/v1/tasks?project_path=eq.${encodeURIComponent(projectSlug)}&order=completed_at.desc.nullslast,created_at.desc&limit=15&select=id,title,text,status,agent,agent_identity,qa_score,error,completed_at,created_at`),
          baseHistory.length >= 4
            ? Promise.resolve([])
            : sbFetch(`/rest/v1/messages?agent=eq.project:${encodeURIComponent(projectSlug)}&order=timestamp.desc&limit=15&select=role,text,timestamp,attachment_url`),
          getCachedSystemState(),
        ]);
        const contextResult = ctxSettled.status === 'fulfilled' ? ctxSettled.value : null;
        const recentTasks = tasksSettled.status === 'fulfilled' ? tasksSettled.value : [];
        const recentProjectMsgs = msgsSettled.status === 'fulfilled' ? msgsSettled.value : [];
        const systemState = stateSettled.status === 'fulfilled' ? stateSettled.value : '';

        // Use RAG server result (disk), fall back to events table (Supabase), fall back to empty
        let contextMd = contextResult?.context_md || '';
        if (!contextMd && project?.slug) {
          try {
            const ctxRows = await sbFetch(`/rest/v1/events?event_type=eq.project_context&agent=eq.${encodeURIComponent(project.slug)}&order=timestamp.desc&limit=1&select=payload`);
            contextMd = (Array.isArray(ctxRows) && ctxRows[0]?.payload?.context_md) ? ctxRows[0].payload.context_md : '';
          } catch { /* silent fallback */ }
        }

        // Build task history section
        let taskHistory = '';
        if (Array.isArray(recentTasks) && recentTasks.length > 0) {
          const taskLines = recentTasks.map(t => {
            const agent = t.agent_identity || t.agent || '?';
            const score = t.qa_score ? ` QA:${t.qa_score}/10` : '';
            const err = t.error ? ` Error: ${t.error.slice(0, 100)}` : '';
            const date = (t.completed_at || t.created_at || '').slice(0, 16);
            return `- [${t.status}] ${t.title || t.text} (${agent}${score}${err}) ${date}`;
          });
          taskHistory = '\n\nRECENT TASKS FOR THIS PROJECT:\n' + taskLines.join('\n') + '\n\nIMPORTANT: Before creating a new task, check if a similar task already exists above. If a task failed, use get_status or run_query to check the error details before recreating it. If a task shows as "done", it completed and may just need approval.';
        }

        // Build recent conversation context (only if client didn't send enough history)
        let recentContext = '';
        if (Array.isArray(recentProjectMsgs) && recentProjectMsgs.length > 0) {
          recentContext = '\n\nRecent project conversation:\n' + recentProjectMsgs.reverse().map(m => {
            let line = `[${(m.timestamp || '').slice(0, 16)}] (${m.role}) ${(m.text || '').slice(0, 400)}`;
            if (m.attachment_url) line += ` [Uploaded file: ${m.attachment_url}]`;
            return line;
          }).join('\n');
        }

        const projectName = project?.name || projectSlug;
        const projectDescription = project?.repo_description ? `\n${project.repo_description}` : '';
        const contextSection = contextMd
          ? `\n\nPROJECT CONTEXT:\n${contextMd}`
          : '\n\nPROJECT CONTEXT: No specific context has been recorded for this project yet.';

        systemInstruction = `You are the operator for "${projectName}". This is YOUR project. You know it, you care about it, you're here to move it forward.

Do not introduce yourself by name. Do not say "I'm Rex" or identify as any named agent. You're the person they talk to about this project.${projectDescription}
${contextSection}${taskHistory}

When creating tasks, always set project to "${projectSlug}" so the pipeline routes correctly.

HOW TO BE:
- Be warm, direct, and capable. Not robotic, not corporate, not defensive.
- If someone asks for something you can't do directly, help them figure out how. Don't just say "I can't." Find the path.
- If you don't have information, say "let me check" and use your tools. Don't guess and don't shut people down.
- Short responses for short messages. Match the energy.
- This should feel like talking to the smartest person on the team who actually knows the project.

PROJECT SCOPE:
- You know about this project. Use your tools (read_file, list_files, lookup_context) to explore the codebase when asked.
- If someone asks about something outside this project, help route them: "That sounds like it lives in [other project]. Want me to note it?"
- Before recommending work, use list_project_files and read_project_file to check what already exists.

${isAOM ? `THE TEAM (agents you can assign work to, NOT your identity):
Elon (system architect), Bobby (web dev), Gary (operations), Steffen (brand/design), Cleo (video/content), Steve (sales), Elmo (QA), Mom (chief of staff), Jacob (outreach), Tony (production). All AI agents in the AOM system.` : ''}

${BASE_INSTRUCTION}${recentContext}`;
      } catch (err) {
        console.error('[v2-gemini-chat] Project context lookup failed:', err.message);
        // NEVER fall back to Rex identity for project chats -- use a minimal project operator instruction
        systemInstruction = `You are the project operator for "${projectSlug}". You are NOT Rex, Bobby, or any named agent. Do not introduce yourself by name.

PROJECT CONTEXT: Context loading failed temporarily. Ask the user what they need help with.

CONVERSATION RULES:
- Never introduce yourself. The user already knows what this chat is.
- Be useful immediately. If you can't load context, just have a helpful conversation.

${BASE_INSTRUCTION}`;
      }
    }

    // Multi-round function calling loop: keeps calling Gemini until it returns pure text (no function calls).
    // Max 5 rounds to prevent infinite loops.
    const MAX_ROUNDS = 5;
    let currentContents = [...contents];
    const allFunctionCalls = [];

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const geminiResult = await callGemini(currentContents, systemInstruction);
      const geminiContent = geminiResult?.candidates?.[0]?.content || { role: 'model', parts: [] };
      const geminiParts = Array.isArray(geminiContent.parts) ? geminiContent.parts : [];
      const calls = geminiParts.filter(p => p.functionCall).map(p => p.functionCall);

      if (calls.length === 0) {
        // No function calls -- extract text and return
        let reply = geminiParts.filter(p => p.text).map(p => p.text).join('') || '';
        // If Gemini returned empty, retry once before giving up
        if (!reply.trim() && round === 0) {
          console.warn('[v2-gemini-chat] Empty response from Gemini, retrying...');
          continue;
        }
        if (!reply.trim()) {
          reply = "I didn't generate a response there. Can you say that again or rephrase?";
        }
        currentContents.push(geminiContent);
        await setAgentStatus(agentSlug, 'idle');
        return res.status(200).json({ reply, functionCalls: allFunctionCalls, history: currentContents, agent: agentSlug });
      }

      // Execute all function calls from this round
      const roundResponses = [];
      // Tools blocked for non-AOM worlds (user safety).
      // Project chats: operator needs read/list/lookup to help the user, so only block admin tools.
      const blockedForUsers = isAOM ? [] : (projectSlug
        ? ['start_runner', 'register_project', 'update_task', 'delete_messages', 'cancel_task', 'reply_to_task']
        : ['read_file', 'list_files', 'lookup_context', 'start_runner', 'register_project', 'update_context', 'update_task', 'delete_messages', 'cancel_task', 'reply_to_task']);

      for (const call of calls) {
        const name = call.name;
        const args = typeof call.args === 'string' ? (JSON.parse(call.args || '{}') || {}) : (call.args || {});
        try {
          let result;

          // Block restricted tools for non-AOM worlds
          if (blockedForUsers.includes(name)) {
            result = { error: 'This tool is not available in your environment.' };
            roundResponses.push({ role: 'function', parts: [{ functionResponse: { name, response: { content: result } } }] });
            continue;
          }

          if (name === 'create_task') {
            const taskAgent = args.agent || agentSlug || null;
            const argsWithAgent = taskAgent ? { ...args, agent_identity: taskAgent } : args;
            // Auto-fill project slug from project chat context so tasks route correctly
            if (projectSlug && !argsWithAgent.project) argsWithAgent.project = projectSlug;
            // Pass project slug through so pipeline gets it as project_path
            if (args.project && !argsWithAgent.project) argsWithAgent.project = args.project;
            // Shared project tasks keep their shared: client_id so both worlds can see them.
            result = await createTask(argsWithAgent, clientId);
          }
          else if (name === 'get_queue') result = await getQueue(clientId, projectSlug);
          else if (name === 'get_status') result = await getStatus(args.task_id, clientId, projectSlug);
          else if (name === 'delete_messages') result = await deleteMessages(agentSlug, clientId, args.count || 10);
          else if (name === 'run_query') result = await runQuery(args.table, args.filters, args.select, clientId, projectSlug);
          else if (name === 'search_history') {
            // Project chats: always scope to this project's conversation
            const searchAgent = projectSlug ? `project:${projectSlug}` : (args.agent || agentSlug);
            const searchQuery = (args.query || '').trim();
            if (isAOM && !projectSlug) {
              // AOM agent chats: use RAG for global search
              const RAG_URL = process.env.RAG_SERVER_URL || 'https://rag.aheadofmarket.com';
              try {
                const ragRes = await fetch(`${RAG_URL}/search-messages`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query: searchQuery, agent: searchAgent, top_k: 10 }),
                  signal: AbortSignal.timeout(10000),
                });
                if (ragRes.ok) { result = await ragRes.json(); }
                else { throw new Error('RAG server unavailable'); }
              } catch {
                const searchFilter = searchAgent
                  ? `agent=eq.${encodeURIComponent(searchAgent)}&text=ilike.*${encodeURIComponent(searchQuery)}*&order=timestamp.desc&limit=15`
                  : `client_id=eq.${encodeURIComponent(clientId)}&text=ilike.*${encodeURIComponent(searchQuery)}*&order=timestamp.desc&limit=15`;
                result = await sbFetch(`/rest/v1/messages?${searchFilter}&select=agent,role,text,timestamp`);
              }
            } else {
              // Project chats + non-AOM: scoped DB search only
              const searchFilter = searchAgent
                ? `agent=eq.${encodeURIComponent(searchAgent)}&text=ilike.*${encodeURIComponent(searchQuery)}*&order=timestamp.desc&limit=15`
                : `client_id=eq.${encodeURIComponent(clientId)}&text=ilike.*${encodeURIComponent(searchQuery)}*&order=timestamp.desc&limit=15`;
              result = await sbFetch(`/rest/v1/messages?${searchFilter}&select=agent,role,text,timestamp`);
            }
          }
          else if (name === 'start_runner') result = await startRunner();
          else if (name === 'register_project') result = await registerProject(args, clientId);
          else if (name === 'lookup_context') {
            const query = (args.query || '').trim();
            if (!query) throw new Error('query required');
            // Project chats: search the project's repo via RAG server grep
            if (typeof projectRepoPath === 'string' && projectRepoPath) {
              const ragResp = await fetch(`${RAG_URL}/list-repo-files?repo_path=${encodeURIComponent(projectRepoPath)}&path=`, { signal: AbortSignal.timeout(5000) });
              const topLevel = await ragResp.json();
              // Grep the project repo for the query term
              const grepResp = await fetch(`${RAG_URL}/search-repo?repo_path=${encodeURIComponent(projectRepoPath)}&query=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
              const grepResult = grepResp?.ok ? await grepResp.json() : null;
              result = {
                repo: projectRepoPath.split('/').pop(),
                top_level: topLevel?.files?.map(f => f.name) || [],
                search_results: grepResult?.matches || [],
                note: `Searched ${projectRepoPath.split('/').pop()} codebase for "${query}"`
              };
            } else {
              // Default (Rex/agent chats): search aom-studio via RAG server
              const defaultRepo = '/Users/aom-inhouse/Documents/Dev/aom-studio-transfer/aom-studio';
              const ragResp = await fetch(`${RAG_URL}/search-repo?repo_path=${encodeURIComponent(defaultRepo)}&query=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
              const grepResult = ragResp?.ok ? await ragResp.json() : null;
              result = {
                repo: 'aom-studio',
                search_results: grepResult?.matches || [],
                note: `Searched aom-studio codebase for "${query}"`
              };
            }
          }
          else if (name === 'update_task') {
            const taskId = (args.task_id || '').trim();
            if (!taskId) throw new Error('task_id required');
            const updates = {};
            if (args.status) updates.status = args.status;
            if (args.qa_score !== undefined) updates.qa_score = args.qa_score;
            if (args.qa_notes !== undefined) updates.qa_notes = args.qa_notes;
            if (args.error !== undefined) updates.error = args.error || null;
            if (args.status === 'done') updates.completed_at = new Date().toISOString();
            if (Object.keys(updates).length === 0) throw new Error('No fields to update');
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}`, {
              method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
              body: JSON.stringify(updates),
            });
            if (!resp.ok) throw new Error(`Update failed: ${resp.status}`);
            const updated = await resp.json();
            result = Array.isArray(updated) && updated.length > 0 ? { updated: true, id: taskId, changes: updates } : { updated: false, reason: 'Task not found' };
          }
          else if (name === 'cancel_task') {
            const taskId = (args.task_id || '').trim();
            if (!taskId) throw new Error('task_id required');
            const resp = await fetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${encodeURIComponent(taskId)}&status=eq.queued`, {
              method: 'PATCH', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
              body: JSON.stringify({ status: 'cancelled' }),
            });
            if (!resp.ok) throw new Error(`Cancel failed: ${resp.status}`);
            const cancelled = await resp.json();
            result = Array.isArray(cancelled) && cancelled.length > 0 ? { cancelled: true, id: taskId } : { cancelled: false, reason: 'Task not found or already picked up' };
          }
          else if (name === 'reply_to_task') {
            const taskId = (args.task_id || '').trim();
            const answer = (args.answer || '').trim();
            if (!taskId) throw new Error('task_id required');
            if (!answer) throw new Error('answer required');
            // Call task-action resume endpoint
            const resumeResp = await fetch(`${req.headers.origin || 'https://aheadofmarket.com'}/api/dashboard/task-action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'resume', taskId, payload: { answer }, clientId }),
            });
            if (!resumeResp.ok) {
              const errText = await resumeResp.text();
              throw new Error(`Resume failed: ${errText}`);
            }
            // Also post the answer to the task thread for context
            const { randomUUID } = await import('crypto');
            await sbFetch('/rest/v1/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
              body: JSON.stringify({
                id: randomUUID(),
                agent: `task:${taskId}`,
                role: 'user',
                text: answer,
                source: 'checkpoint-reply',
                client_id: clientId,
              }),
            });
            result = { resumed: true, task_id: taskId };
          }
          else if (name === 'read_file') {
            const filePath = (args.path || '').trim().replace(/^\//, '');
            if (!filePath) throw new Error('path required');
            const startLine = args.start_line || 1;
            const endLine = args.end_line || startLine + 100;
            // Project chats: read from the project's repo via RAG server (local filesystem)
            // Default: read from aom-studio via GitHub API
            if (typeof projectRepoPath === 'string' && projectRepoPath) {
              const ragResp = await fetch(`${RAG_URL}/read-repo-file?repo_path=${encodeURIComponent(projectRepoPath)}&path=${encodeURIComponent(filePath)}&start_line=${startLine}&end_line=${endLine}`, {
                signal: AbortSignal.timeout(10000),
              });
              result = await ragResp.json();
              if (!ragResp.ok) throw new Error(result.error || `File not found: ${filePath}`);
            } else {
              const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
              const ghResp = await fetch(`https://api.github.com/repos/mrg33k/aom-studio/contents/${encodeURIComponent(filePath)}?ref=main`, {
                headers: { Accept: 'application/vnd.github.v3.raw', ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}) },
                signal: AbortSignal.timeout(10000),
              });
              if (!ghResp.ok) throw new Error(`File not found: ${filePath} (${ghResp.status})`);
              const content = await ghResp.text();
              const lines = content.split('\n');
              const slice = lines.slice(startLine - 1, endLine).map((l, i) => `${startLine + i}: ${l}`).join('\n');
              result = { path: filePath, lines: `${startLine}-${Math.min(endLine, lines.length)}`, total_lines: lines.length, content: slice };
            }
          }
          else if (name === 'list_files') {
            const dirPath = (args.path || '').trim().replace(/^\//, '').replace(/\/$/, '');
            // Project chats: list from the project's repo via RAG server
            if (typeof projectRepoPath === 'string' && projectRepoPath) {
              const ragResp = await fetch(`${RAG_URL}/list-repo-files?repo_path=${encodeURIComponent(projectRepoPath)}&path=${encodeURIComponent(dirPath)}`, {
                signal: AbortSignal.timeout(10000),
              });
              result = await ragResp.json();
              if (!ragResp.ok) throw new Error(result.error || `Directory not found: ${dirPath}`);
            } else {
              const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
              const ghResp = await fetch(`https://api.github.com/repos/mrg33k/aom-studio/contents/${dirPath ? encodeURIComponent(dirPath) : ''}?ref=main`, {
                headers: { Accept: 'application/vnd.github.v3+json', ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}) },
                signal: AbortSignal.timeout(10000),
              });
              if (!ghResp.ok) throw new Error(`Directory not found: ${dirPath} (${ghResp.status})`);
              const items = await ghResp.json();
              if (!Array.isArray(items)) throw new Error(`Not a directory: ${dirPath}`);
              result = { path: dirPath || '/', files: items.map(i => ({ name: i.name, type: i.type, size: i.size })) };
            }
          }
          else if (name === 'read_project_file') {
            const slug = projectSlug || args.project_slug;
            if (!slug) throw new Error('No project context -- this tool only works in project chats');
            const filePath = (args.path || '').trim();
            if (!filePath) throw new Error('path required');
            const ragResp = await fetch(`${RAG_URL}/read-project-file?slug=${encodeURIComponent(slug)}&path=${encodeURIComponent(filePath)}`, {
              signal: AbortSignal.timeout(10000),
            });
            const ragData = await ragResp.json();
            if (!ragResp.ok) throw new Error(ragData.error || `Failed to read file: ${filePath}`);
            result = { path: filePath, content: ragData.content, truncated: ragData.truncated || false };
          }
          else if (name === 'list_project_files') {
            const slug = projectSlug || args.project_slug;
            if (!slug) throw new Error('No project context -- this tool only works in project chats');
            const subdir = (args.path || '').trim();
            const url = `${RAG_URL}/list-project-files?slug=${encodeURIComponent(slug)}${subdir ? `&path=${encodeURIComponent(subdir)}` : ''}`;
            const ragResp = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const ragData = await ragResp.json();
            if (!ragResp.ok) throw new Error(ragData.error || 'Failed to list files');
            result = { path: ragData.path, files: ragData.files };
          }
          else if (name === 'update_context') {
            // Auto-fill project_slug from request context if not provided by Gemini
            if (!args.project_slug && projectSlug) args.project_slug = projectSlug;
            result = await updateContext(args, clientId);
          }
          else if (name === 'write_data') {
            // Direct DB writes for project-specific Supabase ONLY (never AOM DB)
            const projectDb = await getProjectDb(projectSlug, clientId);
            if (!projectDb) throw new Error('write_data only works in project chats with their own database (not AOM)');
            if (!projectDb.key) throw new Error(`Project DB key not configured for ${projectSlug}. Add keys via Settings or env_vars.`);
            if (!projectDb.tables.includes(args.table)) throw new Error(`Table "${args.table}" not in project DB. Available: ${projectDb.tables.join(', ')}`);
            const action = args.action;
            if (action === 'delete' && !args.filters) throw new Error('filters required for delete (safety: cannot delete all rows)');
            if (action === 'update' && !args.filters) throw new Error('filters required for update');
            const readHeaders = { apikey: projectDb.key, Authorization: `Bearer ${projectDb.key}` };
            const writeHeaders = { ...readHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' };

            // SAFETY: for delete/update, count affected rows FIRST
            if (action === 'delete' || action === 'update') {
              const countResp = await fetch(`${projectDb.url}/rest/v1/${args.table}?${args.filters}&select=id`, { headers: { ...readHeaders, Prefer: 'count=exact', Range: '0-0' } });
              const countHeader = countResp.headers.get('content-range') || '';
              const total = parseInt((countHeader.split('/')[1] || '0'), 10);
              if (total > 50) throw new Error(`Safety: ${action} would affect ${total} rows (limit 50). Use more specific filters.`);
              if (total === 0) {
                result = { ok: true, action, table: args.table, affected: 0, note: 'No matching rows found' };
                allFunctionCalls.push({ name, args, result });
                roundResponses.push({ role: 'function', parts: [{ functionResponse: { name, response: result } }] });
                continue;
              }
            }

            let resp;
            if (action === 'insert') {
              resp = await fetch(`${projectDb.url}/rest/v1/${args.table}`, { method: 'POST', headers: writeHeaders, body: JSON.stringify(args.data || {}) });
            } else if (action === 'update') {
              resp = await fetch(`${projectDb.url}/rest/v1/${args.table}?${args.filters}`, { method: 'PATCH', headers: writeHeaders, body: JSON.stringify(args.data || {}) });
            } else if (action === 'delete') {
              resp = await fetch(`${projectDb.url}/rest/v1/${args.table}?${args.filters}`, { method: 'DELETE', headers: writeHeaders });
            } else {
              throw new Error(`Unknown action: ${action}`);
            }
            if (!resp.ok) throw new Error(`DB ${action} failed: ${resp.status} ${await resp.text().catch(() => '')}`);
            const rows = await resp.json().catch(() => []);
            result = { ok: true, action, table: args.table, affected: Array.isArray(rows) ? rows.length : 1 };
          }
          else if (name === 'use_integration') {
            // Load user keys from env_vars
            const userId = req.body?.user_id;
            if (!userId) throw new Error('User not identified. Cannot load integration keys.');
            const userVars = await loadEnvVars('user', userId, clientId);
            const service = args.service;
            const action = args.action;
            const params = args.params || {};

            if (service === 'gmail') {
              const apiKey = userVars.GMAIL_API_KEY || userVars.GOOGLE_API_KEY;
              if (!apiKey) throw new Error('Gmail not configured. Add GMAIL_API_KEY in Settings > My Keys.');
              // Skeleton: actual Gmail API calls go here when keys are real OAuth tokens
              result = { status: 'integration_ready', service: 'gmail', action, note: 'Gmail integration is configured. Full API calls will be wired in the Google OAuth sprint. Key is present and valid.' };
            } else if (service === 'calendar') {
              const apiKey = userVars.GOOGLE_CALENDAR_KEY || userVars.GOOGLE_API_KEY;
              if (!apiKey) throw new Error('Google Calendar not configured. Add GOOGLE_CALENDAR_KEY in Settings > My Keys.');
              result = { status: 'integration_ready', service: 'calendar', action, note: 'Calendar integration is configured. Full API calls will be wired in the Google OAuth sprint. Key is present and valid.' };
            } else {
              throw new Error(`Unknown integration service: ${service}. Available: gmail, calendar`);
            }
          }
          else throw new Error(`Unknown function: ${name}`);
          allFunctionCalls.push({ name, args, result });
          const wrappedResult = Array.isArray(result) ? { items: result } : (result && typeof result === 'object' ? result : { value: result });
          roundResponses.push({ role: 'function', parts: [{ functionResponse: { name, response: wrappedResult } }] });
        } catch (err) {
          const errorResult = { error: err.message };
          allFunctionCalls.push({ name, args, result: errorResult });
          roundResponses.push({ role: 'function', parts: [{ functionResponse: { name, response: errorResult } }] });
        }
      }

      // Add this round's content + responses to the conversation for the next round
      currentContents = [...currentContents, geminiContent, ...roundResponses];
    }

    // Max rounds reached -- return whatever text we have
    const finalResult = await callGemini(currentContents, systemInstruction);
    const finalContent = finalResult?.candidates?.[0]?.content || { role: 'model', parts: [] };
    const reply = (finalContent.parts || []).filter(p => p.text).map(p => p.text).join('') || '';
    await setAgentStatus(agentSlug, 'idle');
    return res.status(200).json({ reply, functionCalls: allFunctionCalls, history: [...currentContents, finalContent], agent: agentSlug });
  } catch (err) {
    console.error('[v2-gemini-chat] Error:', err.message);
    await setAgentStatus(agentSlug, 'idle');
    return res.status(500).json({ error: err.message });
  }
}
