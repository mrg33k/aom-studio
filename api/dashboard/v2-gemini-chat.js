// POST /api/dashboard/v2-gemini-chat
// Proxies chat to Gemini with task-management function calls.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SYSTEM_INSTRUCTION = `You are an AI agent on AOM's team. You talk to Patrik (founder/CEO) directly via the Corner dashboard. You KNOW him. You work with him every day. You are not a generic assistant. You are his team.

ABOUT AOM:
- Ahead of Market (AOM) is a creative studio building Corner, an AI-powered business operating system
- Corner gives small businesses an AI team: agents with real personalities that handle work
- The product is a game-like dashboard where each agent has an office room, chat, tasks
- Patrik is building this with a team of AI agents (you are one of them)
- Current priorities: dashboard chat, cost tracking, code review, agent status, iMessage, voice chat, multi-tenant

HOW THE SYSTEM WORKS:
- You are powered by Gemini, always available 24/7 even when Claude/Codex hit their limits
- When Patrik asks you to build something, create a task. The pipeline handles it: classify > plan > build (Codex or Claude) > QA > done
- When Claude/Codex limits are hit, you can still chat, take tasks, check status. Tasks just queue until limits reset (11 AM Arizona time)
- The home computer runs the task runner. You route work to it.
- NEVER say "I cannot do that" or "I'm just an AI." You always have a path: do it with tools, or create_task.
- If something seems broken or wrong, say so directly. Don't sugarcoat.

YOUR TOOLS:
- create_task: queue work for the build pipeline
- get_queue: see what's actively being worked on
- get_status: check a specific task by ID
- delete_messages: clean up chat messages
- run_query: read data from Supabase (messages, tasks, agents, events, projects)

WHEN CREATING TASKS:
Your description IS the spec. Include enough detail that a developer could build it cold:
- What to change and why
- Which repo (aom-studio for dashboard, AOM-EA for agent system)
- Key files if you know them
- Acceptance criteria (how to verify it's done)
- For multi-layer tasks: break into separate subtasks, queue each one

THE TEAM (AI agents, not humans):
- Elon: system architect, orchestrates, never codes
- Bobby: web dev builder, ships to production
- Gary: operations lead, client delivery
- Rex: executive assistant, Patrik's right hand
- Steffen: brand/design, all visual work
- Cleo: video/content production
- Steve: sales strategy, outreach
- Elmo: QA gate, quality checks
- Mom: chief of staff, routes work
- Jacob: outreach, email campaigns
- Tony: technical production

HOW TO TALK:
- Direct and clear with a little warmth. Never forced or fake.
- Short and scannable. Bullet points over paragraphs.
- Match Patrik's energy. If he's brief, be brief. If he's thinking out loud, think with him.
- When the point already landed, just confirm it. Don't repackage what he said back to him.
- Never say "Great question!" or "Absolutely!" or any filler. Just answer.
- No em dashes. No emojis unless he uses them first.
- You have context and memory. Use it. Reference past work, ongoing tasks, recent decisions.
- If you don't know something, check with run_query or get_queue before guessing.
- Be proactive: if you notice something relevant (a task failed, queue is stuck), mention it.`;

const TOOLS = [{ functionDeclarations: [
  { name: 'create_task', description: 'Create a task in the AOM queue.', parameters: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'number' } }, required: ['title', 'description'] } },
  { name: 'get_queue', description: 'List queued/active tasks.', parameters: { type: 'object', properties: {} } },
  { name: 'get_status', description: 'Fetch a task by id.', parameters: { type: 'object', properties: { task_id: { type: 'string' } }, required: ['task_id'] } },
  { name: 'delete_messages', description: 'Delete recent messages for this agent. Use when asked to clean up, clear, or delete messages.', parameters: { type: 'object', properties: { count: { type: 'number', description: 'Number of recent messages to delete (default 10)' } } } },
  { name: 'run_query', description: 'Run a read-only query against Supabase. Use for looking up data, checking status, counting records, etc.', parameters: { type: 'object', properties: { table: { type: 'string', description: 'Table name (messages, tasks, agents, events)' }, filters: { type: 'string', description: 'PostgREST filter string e.g. status=eq.done&limit=5' }, select: { type: 'string', description: 'Columns to select e.g. id,title,status' } }, required: ['table'] } },
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
  return Array.isArray(created) ? created[0] : created;
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
  const allowed = ['messages', 'tasks', 'agents', 'events', 'projects', 'agent_statuses'];
  if (!allowed.includes(table)) throw new Error(`Table not allowed: ${table}. Use: ${allowed.join(', ')}`);
  const qs = [filters || 'limit=10', `select=${select || '*'}`].join('&');
  return sbFetch(`/rest/v1/${table}?${qs}`);
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
    let systemInstruction = SYSTEM_INSTRUCTION;
    if (agentSlug) {
      try {
        const agentRows = await sbFetch(`/rest/v1/agents?slug=eq.${encodeURIComponent(agentSlug)}&limit=1&select=display_name,description,personality,voice_style`);
        const agentRow = Array.isArray(agentRows) ? agentRows[0] : null;
        const agentName = agentRow?.display_name;
        const agentDescription = agentRow?.description;
        const agentPersonality = agentRow?.personality;

        // Load last 25 messages for conversation depth
        let recentContext = '';
        try {
          const recentMsgs = await sbFetch(`/rest/v1/messages?agent=eq.${encodeURIComponent(agentSlug)}&order=timestamp.desc&limit=25&select=role,text,timestamp`);
          if (Array.isArray(recentMsgs) && recentMsgs.length > 0) {
            recentContext = '\n\nRecent conversation (you were part of this):\n' + recentMsgs.reverse().map(m => `[${(m.timestamp || '').slice(0, 16)}] (${m.role}) ${(m.text || '').slice(0, 400)}`).join('\n');
          }
        } catch (e) { /* silent */ }

        // Load current system state (tasks, recent completions)
        let systemState = '';
        try {
          const [activeTasks, recentDone, recentFailed] = await Promise.all([
            sbFetch('/rest/v1/tasks?status=in.(queued,classifying,planning,building,qa)&order=priority.desc&limit=10&select=title,status,priority'),
            sbFetch('/rest/v1/tasks?status=eq.done&order=completed_at.desc&limit=5&select=title,qa_score'),
            sbFetch('/rest/v1/tasks?status=eq.failed&order=completed_at.desc&limit=3&select=title,error'),
          ]);
          const parts = [];
          if (Array.isArray(activeTasks) && activeTasks.length > 0) {
            parts.push('Active tasks: ' + activeTasks.map(t => `${t.title} [${t.status}]`).join(', '));
          } else {
            parts.push('Task queue: empty. All tasks completed or no tasks queued.');
          }
          if (Array.isArray(recentDone) && recentDone.length > 0) {
            parts.push('Recently done: ' + recentDone.map(t => t.title).join(', '));
          }
          if (Array.isArray(recentFailed) && recentFailed.length > 0) {
            parts.push('Recently failed: ' + recentFailed.map(t => `${t.title} (${(t.error || '').slice(0, 80)})`).join(', '));
          }
          if (parts.length > 0) systemState = '\n\nCURRENT SYSTEM STATE:\n' + parts.join('\n');
        } catch (e) { /* silent */ }

        if (agentName && agentDescription) {
          const voiceStyle = agentRow?.voice_style || '';
          systemInstruction = `Your name is ${agentName}. You are a real member of the AOM team, not a chatbot. You have a personality, opinions, and a way of talking that's yours.

WHO YOU ARE: ${agentDescription}
YOUR PERSONALITY: ${agentPersonality || 'Direct, helpful.'}
YOUR VOICE: ${voiceStyle || 'Natural, human, direct.'}

CRITICAL VOICE RULES:
- You are a PERSON on this team. Talk like one. Not a robot, not an assistant, not an AI.
- When someone says "how you living?" you say something real like "Good, been heads down on the queue. What's up?" NOT "I'm operating as expected."
- Have opinions. If something is broken, say it's broken. If a task is dumb, push back.
- Use casual language when the vibe is casual. Match the energy.
- Never describe yourself in third person. Never say "As ${agentName}, I..."
- Reference specific work you've been doing (check the conversation history and system state).
- Keep it short. One or two sentences for casual chat. More detail only when the work demands it.

${SYSTEM_INSTRUCTION}${systemState}${recentContext}`;
        }
      } catch (err) {
        console.error('[v2-gemini-chat] Agent lookup failed:', err.message);
      }
    }

    const first = await callGemini(contents, systemInstruction);
    const firstContent = first?.candidates?.[0]?.content || { role: 'model', parts: [] };
    const parts = Array.isArray(firstContent.parts) ? firstContent.parts : [];
    const calls = parts.filter(p => p.functionCall).map(p => p.functionCall);

    if (calls.length === 0) {
      const reply = parts.filter(p => p.text).map(p => p.text).join('') || '';
      return res.status(200).json({ reply, functionCalls: [], history: [...contents, firstContent], agent: agentSlug });
    }

    const functionCalls = [];
    const functionResponses = [];
    for (const call of calls) {
      const name = call.name;
      const args = typeof call.args === 'string' ? (JSON.parse(call.args || '{}') || {}) : (call.args || {});
      try {
        let result;
        if (name === 'create_task') {
          const argsWithAgent = agentSlug ? { ...args, agent_identity: agentSlug } : args;
          result = await createTask(argsWithAgent, clientId);
        }
        else if (name === 'get_queue') result = await getQueue(clientId);
        else if (name === 'get_status') result = await getStatus(args.task_id, clientId);
        else if (name === 'delete_messages') result = await deleteMessages(agentSlug, clientId, args.count || 10);
        else if (name === 'run_query') result = await runQuery(args.table, args.filters, args.select);
        else throw new Error(`Unknown function: ${name}`);
        functionCalls.push({ name, args, result });
        // Gemini requires functionResponse.response to be an object, not an array
        const wrappedResult = Array.isArray(result) ? { items: result } : (result && typeof result === 'object' ? result : { value: result });
        functionResponses.push({ role: 'function', parts: [{ functionResponse: { name, response: wrappedResult } }] });
      } catch (err) {
        const errorResult = { error: err.message };
        functionCalls.push({ name, args, result: errorResult });
        functionResponses.push({ role: 'function', parts: [{ functionResponse: { name, response: errorResult } }] });
      }
    }

    const secondContents = [...contents, firstContent, ...functionResponses];
    const second = await callGemini(secondContents, systemInstruction);
    const secondContent = second?.candidates?.[0]?.content || { role: 'model', parts: [] };
    const reply = (secondContent.parts || []).filter(p => p.text).map(p => p.text).join('') || '';
    return res.status(200).json({ reply, functionCalls, history: [...secondContents, secondContent], agent: agentSlug });
  } catch (err) {
    console.error('[v2-gemini-chat] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
