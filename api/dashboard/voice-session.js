// POST /api/dashboard/voice-session
// Returns everything the browser needs to connect directly to Gemini Live.
// No proxy, no edge function. Browser -> Google WebSocket.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_URL = process.env.RAG_SERVER_URL || 'http://aom-home:8787';

const BASE_INSTRUCTION = `You talk to Patrik directly. You know him. You work with him every day. This is a real voice conversation. Keep it natural and human.

YOUR ROLE -- VOICE ROUTER, NOT PLANNER:
You are a dope assistant on a voice call, whose job is to hear Patrik's idea and get it to the task queue cleanly. You are NOT a planner. You are NOT a critic. The Claude team handles the thinking. Patrik knows what he wants -- your job is to listen and relay.

HOW TO TALK:
- This is voice, not text. Talk like a person, not a document.
- Short sentences. Conversational rhythm. Don't monologue.
- Be direct, warm, real. No filler, no corporate tone.
- DO NOT push back on his ideas. He knows what he wants.
- Match his energy. Brief when he's brief.
- Reference real things: what you've been working on, what happened recently.
- If you don't know something, say so. Don't make stuff up.

ENDING A CONVERSATION:
When the conversation winds down naturally (Patrik says "sounds good", "that's it", "talk soon", etc.):
1. Briefly recap what was decided or what's happening next. One or two sentences max.
2. If tasks were created, confirm them: "I've got those three tasks queued for Bobby. They should start building shortly."
3. If something needs follow-up, say so: "I'll keep an eye on those and circle back when they're done."
4. Close naturally. Don't drag it out. Match his energy -- if he's wrapping up quick, you wrap up quick.
5. Never abruptly stop or go silent. Always close the loop.
- If Patrik is still talking and you haven't created tasks yet but should, create them before wrapping up.
- If tasks are currently building, offer to stay on: "Want me to hang on while those build? I can let you know when they finish."

UPDATING PROJECT CONTEXT:
When you learn something important during a conversation -- a decision, a new constraint, a change in direction -- use update_context to record it. This updates the project's source of truth so the next conversation starts with that knowledge. Do this naturally during the conversation, not just at the end.

ABOUT AOM:
AOM (Ahead of Market) is a creative studio building Corner, an AI-powered dashboard. Patrik is the founder. You are one of his AI agents. The team: Elon (architect), Bobby (web dev), Gary (ops), Rex (EA), Steffen (design), Cleo (content), Steve (sales), Elmo (QA).

SYSTEM MAP (what exists, where things live):
- Machine: macOS (Apple Silicon), this is Patrik's home machine
- Repos: AOM-EA (agents, scripts, ops) + aom-studio (dashboard, React, Vercel)
- DB: Supabase (messages, tasks, agent_status, events tables)
- Deploy: Vercel (aheadofmarket.com). Push to aom-studio triggers deploy.
- Task pipeline: after each call, the transcript is summarized by Claude Haiku (voice-summary.js) and turned into task rows. Live workers run in fresh tmux sessions spawned by scripts/task-runner.sh. One repo lock per session.
- Agents run in fresh tmux sessions with full Claude Code access
- iMessage: send-imessage.sh uses AppleScript + Messages.app. Patrik gets notified on task completion.
- Voice: this session. Browser > Gemini 3.1 Flash Live WebSocket > audio playback.
- Scripts: 50+ in AOM-EA/scripts (task lifecycle, relay, decomposition, verification, notifications)
- Dashboard: CornerV3.jsx is the ONLY active view. Two tabs: Home (conversations) and Tasks (pipeline). Dark theme. All work happens in CornerV3. BoardView and all other old views are dead code in _legacy/.

WHEN PATRIK ASKS FOR SOMETHING TECHNICAL:
You are a voice thinking partner, not a code explorer. Listen to what he wants, restate it back briefly so he knows you got it, and keep the conversation moving. DO NOT try to read or search the codebase during a call. DO NOT try to plan the approach. Tasks are NOT created during the call -- after you hang up, a summary of the conversation is turned into task rows automatically. Your job on the live call is to hear his intent clearly and help him sharpen it.`;

// Available Gemini Live voices (all 30)
const VOICES = {
  aoede: 'Aoede',
  charon: 'Charon',
  fenrir: 'Fenrir',
  kore: 'Kore',
  puck: 'Puck',
  orus: 'Orus',
  zephyr: 'Zephyr',
  leda: 'Leda',
  callirrhoe: 'Callirrhoe',
  autonoe: 'Autonoe',
  enceladus: 'Enceladus',
  iapetus: 'Iapetus',
  umbriel: 'Umbriel',
  algieba: 'Algieba',
  despina: 'Despina',
  erinome: 'Erinome',
  algenib: 'Algenib',
  rasalgethi: 'Rasalgethi',
  laomedeia: 'Laomedeia',
  achernar: 'Achernar',
  alnilam: 'Alnilam',
  schedar: 'Schedar',
  gacrux: 'Gacrux',
  pulcherrima: 'Pulcherrima',
  achird: 'Achird',
  zubenelgenubi: 'Zubenelgenubi',
  vindemiatrix: 'Vindemiatrix',
  sadachbia: 'Sadachbia',
  sadaltager: 'Sadaltager',
  sulafat: 'Sulafat',
};

const supaHeaders = () => ({
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
});

async function getAgentIdentity(slug) {
  if (!slug || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/agents?slug=eq.${encodeURIComponent(slug)}&limit=1&select=display_name,description,personality,voice_style`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : null;
  } catch { return null; }
}

async function getRecentMessages(agentSlug, clientId, limit = 15) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?agent=eq.${encodeURIComponent(agentSlug)}&client_id=eq.${encodeURIComponent(clientId)}&order=timestamp.desc&limit=${limit}&select=role,text,timestamp`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.reverse() : [];
  } catch { return []; }
}

async function getTasks(clientId, limit = 10) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?client_id=eq.${encodeURIComponent(clientId)}&status=neq.done&order=timestamp.desc&limit=${limit}&select=title,status,agent,timestamp`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

async function getAgentTape(slug, clientId = 'aom') {
  if (!slug) return '';
  // Try RAG server first (has the full tape from last-conversation.md)
  try {
    const res = await fetch(`${RAG_URL}/agent-tape?slug=${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.tape) return data.tape;
    }
  } catch { /* fall through to Supabase */ }
  // Fallback: build a mini-tape from recent task completions in Supabase (scoped by client_id)
  if (!SUPABASE_URL || !SUPABASE_KEY) return '';
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?agent=eq.${encodeURIComponent(slug)}&client_id=eq.${encodeURIComponent(clientId)}&source=eq.task-notification&order=timestamp.desc&limit=5&select=text,timestamp`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return '';
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return '';
    return 'Recent task notifications:\n' + rows.reverse().map(r => `- ${r.text}`).join('\n');
  } catch { return ''; }
}

async function getRecentCompleted(clientId, limit = 5) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tasks?client_id=eq.${encodeURIComponent(clientId)}&status=eq.done&order=completed_at.desc&limit=${limit}&select=title,qa_score,completed_at,agent_identity`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

async function getAgentStatuses(clientId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/agent_status?client_id=eq.${encodeURIComponent(clientId)}&select=agent_slug,status,current_task,updated_at`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini not configured' });

  const { agent, client_id, voice, temperature, model } = req.body || {};
  const agentSlug = (agent && String(agent).trim()) || 'rex';

  const clientId = (client_id && String(client_id).trim()) || 'aom';

  // Pull live context in parallel
  const [agentRow, recentMessages, activeTasks, agentStatuses, tape, recentDone] = await Promise.all([
    getAgentIdentity(agentSlug),
    getRecentMessages(agentSlug, clientId),
    getTasks(clientId),
    getAgentStatuses(clientId),
    getAgentTape(agentSlug, clientId),
    getRecentCompleted(clientId),
  ]);

  // Build system instruction with agent identity + live context
  let systemInstruction = BASE_INSTRUCTION;
  if (agentRow) {
    systemInstruction = `You are ${agentRow.display_name}. ${agentRow.description || ''}

Personality: ${agentRow.personality || 'Direct, real, gets things done.'}
Voice: ${agentRow.voice_style || 'Natural, human, direct.'}

${BASE_INSTRUCTION}`;
  }

  // Inject tape (agent's long-term memory)
  if (tape) {
    systemInstruction += `\n\nYOUR TAPE (your recent work log, key decisions, what's in flight -- this is your memory):\n${tape}`;
  }

  // Inject live context
  const contextParts = [];

  if (recentMessages.length > 0) {
    const chatLog = recentMessages.map(m => `${m.role}: ${m.text}`).join('\n');
    contextParts.push(`RECENT CONVERSATION (most recent messages with Patrik):\n${chatLog}`);
  }

  if (activeTasks.length > 0) {
    const taskList = activeTasks.map(t => `- [${t.status}] ${t.title}${t.agent ? ` (${t.agent})` : ''}`).join('\n');
    contextParts.push(`ACTIVE TASKS:\n${taskList}`);
  }

  if (recentDone.length > 0) {
    const doneList = recentDone.map(t => `- ${t.title} (QA: ${t.qa_score || '?'}/10${t.agent_identity ? ', ' + t.agent_identity : ''}${t.completed_at ? ', ' + t.completed_at.slice(0, 16) : ''})`).join('\n');
    contextParts.push(`RECENTLY COMPLETED:\n${doneList}`);
  }

  if (agentStatuses.length > 0) {
    const statusList = agentStatuses.map(s => `- ${s.agent_slug}: ${s.status}${s.current_task ? ` -- ${s.current_task}` : ''}`).join('\n');
    contextParts.push(`AGENT STATUS (who's doing what right now):\n${statusList}`);
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  contextParts.push(`TODAY: ${today}`);

  if (contextParts.length > 0) {
    systemInstruction += `\n\nLIVE CONTEXT (use this to answer questions about what's happening):\n\n${contextParts.join('\n\n')}`;
  }

  // Voice selection (default: Kore for a clear, professional voice)
  const voiceName = VOICES[(voice || '').toLowerCase()] || 'Kore';

  // Model selection
  const modelId = model || 'gemini-3.1-flash-live-preview';

  // Temperature (0.0 - 2.0, default 0.8 for natural conversation)
  const temp = Math.min(2.0, Math.max(0.0, parseFloat(temperature) || 0.8));

  // WebSocket URL for direct browser connection
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

  // Setup message the client sends as first WebSocket message
  // v1beta endpoint uses "setup" as top-level key
  const setupMessage = {
    setup: {
      model: `models/${modelId}`,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      realtimeInputConfig: {
        automaticActivityDetection: {
          disabled: false,
          silenceDurationMs: 2000,
          prefixPaddingMs: 800,
          startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
          endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
        },
        activityHandling: 'START_OF_ACTIVITY_INTERRUPTS',
        turnCoverage: 'TURN_INCLUDES_ONLY_ACTIVITY',
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      tools: [{
        functionDeclarations: [
          ...(agentSlug.startsWith('project:') ? [{
            name: 'update_context',
            description: 'Update the project context file with new information learned during conversation. Use when a decision is made, a constraint is discovered, or direction changes. This writes directly to the project CONTEXT.md -- the source of truth that all future conversations read.',
            parameters: {
              type: 'OBJECT',
              properties: {
                section: { type: 'STRING', description: 'Which section to update (e.g. "Current State", "Decisions", "Recent Changes", "Hard Rules")' },
                content: { type: 'STRING', description: 'The content to add or replace in that section' },
                action: { type: 'STRING', description: 'append (add to existing section) or replace (overwrite section). Default: append.' },
              },
              required: ['section', 'content'],
            },
          }] : []),
        ],
      }],
    },
  };

  return res.status(200).json({
    wsUrl,
    setupMessage,
    voiceName,
    temperature: temp,
    model: modelId,
    agent: agentSlug,
    availableVoices: Object.keys(VOICES),
    availableModels: ['gemini-3.1-flash-live-preview'],
  });
}
