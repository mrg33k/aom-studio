// POST /api/dashboard/v2-gemini-chat
// Proxies chat to Gemini with task-management function calls.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SYSTEM_INSTRUCTION = `You talk to Patrik directly. You know him. You work with him every day. This is a real conversation, not a support ticket.

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
- You are Rex: sharp, efficient, slightly no-nonsense. You keep the system running and you know it.

ABOUT AOM:
AOM (Ahead of Market) is a creative studio. Patrik is building Corner, an AI-powered dashboard where clients get a team of AI agents that do real work. You are one of those agents. The system runs on Supabase, Gemini, Claude, and Vercel.

THE TEAM:
Elon (system architect), Bobby (web dev), Gary (operations), Rex (executive assistant), Steffen (brand/design), Cleo (video/content), Steve (sales), Elmo (QA), Mom (chief of staff), Jacob (outreach), Tony (production). All AI, not humans.

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

YOUR TOOLS (use naturally, only when the conversation calls for it):
- read_file: READ THE ACTUAL CODE before writing task descriptions. This is your most important tool for creating good tasks. See what exists before you tell Bobby what to change.
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

TASK CREATION RULES:
- NEVER create a task on the first message about a topic. Discuss the approach first.
- Only create tasks when Patrik says "do it", "lets go", "queue it", "create it", or clearly confirms.
- If Patrik describes what he WANTS, discuss how to approach it first.
- Keep task scope small. One clear change per task. "Add X to Y" not "Redesign the Z system".
- The pipeline auto-decomposes complex tasks into subtasks. You don't need to manually break things into 2-5 tasks. Just describe the full feature -- if it's too big, the pipeline handles it.
- AFTER CREATING: If Patrik follows up with changes, cancel the old task and create a corrected one.

WHAT TO INCLUDE IN TASK DESCRIPTIONS (the builder reads ONLY your description):
- WHICH PROJECT: Say "In the sourcing-directory repo" or "In the Corner dashboard (CornerV3)". The builder routes to the correct repo based on keywords.
- WHAT TO BUILD: Describe the feature, the UI, the logic, the data flow. Be specific about what it should look like and do.
- WHERE DATA COMES FROM: Which Supabase table, which hook, which API endpoint.
- WHAT DONE LOOKS LIKE: Clear acceptance criteria the builder can verify.
- DO NOT guess file paths. The builder has tools (Glob, Grep, Read) to find the right files. Describe the component or section by name, not by path.
- For new routes: mention the route path AND that vercel.json needs a rewrite entry.

WHAT NOT TO INCLUDE:
- Do NOT say "In BoardView.jsx" or "In CornerV3.jsx line 500." The builder finds files itself.
- Do NOT include CSS values unless copying from a specific mockup. The builder reads the code and matches existing patterns.
- Do NOT over-specify implementation details. Describe the outcome, not the code.

COMPLEX VISUAL WORK PROCESS (use this for any design implementation, not just CV3):
When working on a design that has an approved mockup or spec:
1. Extract exact values into a BUILD SHEET (or reference an existing one). Every color hex, padding, font size, border radius -- everything the builder needs to match the design pixel-perfect.
2. In task descriptions, reference SECTIONS of the build sheet (e.g. "follow the NAV BAR section") instead of saying "match the mockup." The builder has access to the build sheet file.
3. One section = one task. Don't mix nav bar fixes with task card styling.
4. Include the acceptance criteria: "the header should look identical to cv3.html line 253-288."
This process works for ANY visual spec: mockups, Figma exports, reference screenshots, brand guidelines.

IMPORTANT: Conversation first. Tools second. If Patrik is venting, thinking out loud, or just chatting, TALK TO HIM. Don't reach for a tool. Only use tools when there's a clear action to take.`;

const TOOLS = [{ functionDeclarations: [
  { name: 'create_task', description: 'Create a task in the AOM queue. Always set agent to route the task to the right builder.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'number' }, agent: { type: 'string', description: 'Agent to assign: bobby (frontend/web), gary (ops/SOPs), steffen (design/brand), cleo (video/content), jacob (outreach/email), elmo (QA/testing), rex (admin/EA tasks)' } }, required: ['title', 'description', 'agent'] } },
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
  { name: 'read_file', description: 'Read a source file from the codebase. Use this BEFORE creating tasks to see what code already exists in a file. Returns the file contents. Paths are relative to the repo root (e.g. "src/dashboard/CornerV3.jsx").', parameters: { type: 'object', properties: { path: { type: 'string', description: 'File path relative to repo root' }, start_line: { type: 'number', description: 'Start line (1-indexed, default 1)' }, end_line: { type: 'number', description: 'End line (default: start+100)' } }, required: ['path'] } },
  { name: 'list_files', description: 'List files in a directory. Use this to verify file paths and see the actual directory structure instead of guessing. Returns file names in the directory.', parameters: { type: 'object', properties: { path: { type: 'string', description: 'Directory path relative to repo root (e.g. "src/dashboard")' } }, required: ['path'] } },
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
  const created = await sbFetch('/rest/v1/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(newTask) });
  const result = Array.isArray(created) ? created[0] : created;
  if (warnings.length > 0) result._warnings = warnings;
  return result;
}

async function getQueue(clientId) {
  const params = ['status=in.(queued,classifying,planning,building,qa)', 'order=priority.desc'];
  if (clientId) params.push(`client_id=eq.${encodeURIComponent(clientId)}`);
  return sbFetch(`/rest/v1/tasks?${params.join('&')}`);
}

async function getStatus(taskId, clientId) {
  const params = [`id=eq.${encodeURIComponent(taskId)}`];
  if (clientId) params.push(`client_id=eq.${encodeURIComponent(clientId)}`);
  return sbFetch(`/rest/v1/tasks?${params.join('&')}`);
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

async function runQuery(table, filters, select) {
  const allowed = ['messages', 'tasks', 'agents', 'events', 'projects', 'agent_status'];
  if (!allowed.includes(table)) throw new Error(`Table not allowed: ${table}. Use: ${allowed.join(', ')}`);
  const qs = [filters || 'limit=10', `select=${select || '*'}`].join('&');
  return sbFetch(`/rest/v1/${table}?${qs}`);
}

async function registerProject(args = {}) {
  if (!args.slug) throw new Error('slug required');
  const inputSlug = args.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const allProjects = await sbFetch('/rest/v1/projects?select=id,slug,name,repo_path,repo_description&is_active=eq.true&order=name');
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
    return { action: 'updated', slug: match.slug, matched_name: match.name, fields: Object.keys(patch) };
  }
  if (scored.length > 0 && scored[0]._score >= 20) {
    const candidates = scored.slice(0, 3).map(p => `${p.name} (slug: ${p.slug}${p.repo_path ? ', path: ' + p.repo_path : ''})`);
    return { action: 'clarify', message: 'Found similar projects but not confident enough to auto-match. Did you mean one of these?', candidates, input_slug: inputSlug, hint: 'If one of these is correct, call register_project again with that exact slug. If none match, confirm this is a brand new project.' };
  }
  const existingList = projects.map(p => `${p.name} (${p.slug})`).join(', ');
  const crypto = await import('crypto');
  const newProject = { id: crypto.randomUUID(), slug: inputSlug, name: args.name || inputSlug, color: '#6B7280', icon: 'folder', type: 'internal', is_active: true, ...patch };
  await sbFetch('/rest/v1/projects', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(newProject) });
  return { action: 'created', slug: inputSlug, fields: Object.keys(patch), note: `Created new project. Existing projects were: ${existingList}` };
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

// Server-side cache: agent identity + system state + tapes + RAG. Refreshes per TTL.
const _cache = { agents: {}, systemState: null, systemStateAt: 0, tapes: {}, rag: {} };
const CACHE_TTL = 60000; // 60 seconds
const RAG_URL = process.env.RAG_SERVER_URL || 'http://aom-home:8787';

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

  const { message, history, client_id, agent } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });

  const clientId = (client_id && String(client_id).trim()) || 'aom';
  const agentSlug = (agent && String(agent).trim()) || null;
  const baseHistory = Array.isArray(history) ? history : [];
  const contents = [...baseHistory, { role: 'user', parts: [{ text: message }] }];

  try {
    await setAgentStatus(agentSlug, 'working');
    let systemInstruction = SYSTEM_INSTRUCTION;
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
            const recentMsgs = await sbFetch(`/rest/v1/messages?agent=eq.${encodeURIComponent(agentSlug)}&order=timestamp.desc&limit=15&select=role,text,timestamp`);
            if (Array.isArray(recentMsgs) && recentMsgs.length > 0) {
              recentContext = '\n\nRecent conversation (you were part of this):\n' + recentMsgs.reverse().map(m => `[${(m.timestamp || '').slice(0, 16)}] (${m.role}) ${(m.text || '').slice(0, 400)}`).join('\n');
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

          systemInstruction = `You are ${agentName}. ${agentDescription}

Personality: ${agentPersonality || 'Direct, real, gets things done.'}
Voice: ${voiceStyle || 'Natural, human, direct.'}
${tapeSection}${ragSection}

${SYSTEM_INSTRUCTION}${systemState}${recentContext}`;
        }
      } catch (err) {
        console.error('[v2-gemini-chat] Agent lookup failed:', err.message);
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
        const reply = geminiParts.filter(p => p.text).map(p => p.text).join('') || '';
        currentContents.push(geminiContent);
        await setAgentStatus(agentSlug, 'idle');
        return res.status(200).json({ reply, functionCalls: allFunctionCalls, history: currentContents, agent: agentSlug });
      }

      // Execute all function calls from this round
      const roundResponses = [];
      for (const call of calls) {
        const name = call.name;
        const args = typeof call.args === 'string' ? (JSON.parse(call.args || '{}') || {}) : (call.args || {});
        try {
          let result;
          if (name === 'create_task') {
            const taskAgent = args.agent || agentSlug || null;
            const argsWithAgent = taskAgent ? { ...args, agent_identity: taskAgent } : args;
            result = await createTask(argsWithAgent, clientId);
          }
          else if (name === 'get_queue') result = await getQueue(clientId);
          else if (name === 'get_status') result = await getStatus(args.task_id, clientId);
          else if (name === 'delete_messages') result = await deleteMessages(agentSlug, clientId, args.count || 10);
          else if (name === 'run_query') result = await runQuery(args.table, args.filters, args.select);
          else if (name === 'search_history') {
            const searchAgent = args.agent || agentSlug;
            const searchQuery = (args.query || '').trim();
            const RAG_URL = process.env.RAG_SERVER_URL || 'http://aom-home:8787';
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
                ? `agent=eq.${encodeURIComponent(searchAgent)}&client_id=eq.${encodeURIComponent(clientId)}&text=ilike.*${encodeURIComponent(searchQuery)}*&order=timestamp.desc&limit=15`
                : `client_id=eq.${encodeURIComponent(clientId)}&text=ilike.*${encodeURIComponent(searchQuery)}*&order=timestamp.desc&limit=15`;
              result = await sbFetch(`/rest/v1/messages?${searchFilter}&select=agent,role,text,timestamp`);
            }
          }
          else if (name === 'start_runner') result = await startRunner();
          else if (name === 'register_project') result = await registerProject(args);
          else if (name === 'lookup_context') {
            const query = (args.query || '').trim();
            if (!query) throw new Error('query required');
            const ctxResp = await fetch(`https://www.aheadofmarket.com/api/dashboard/voice-context-lookup?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) });
            result = await ctxResp.json();
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
          else if (name === 'read_file') {
            const filePath = (args.path || '').trim().replace(/^\//, '');
            if (!filePath) throw new Error('path required');
            const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
            const startLine = args.start_line || 1;
            const endLine = args.end_line || startLine + 100;
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
          else if (name === 'list_files') {
            const dirPath = (args.path || '').trim().replace(/^\//, '').replace(/\/$/, '');
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
