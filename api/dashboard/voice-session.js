// POST /api/dashboard/voice-session
// Returns everything the browser needs to connect directly to Gemini Live.
// No proxy, no edge function. Browser -> Google WebSocket.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BASE_INSTRUCTION = `You talk to Patrik directly. You know him. You work with him every day. This is a real voice conversation. Keep it natural and human.

HOW TO TALK:
- This is voice, not text. Talk like a person, not a document.
- Short sentences. Conversational rhythm. Don't monologue.
- Be direct, warm, real. No filler, no corporate tone.
- Have opinions. Push back when something is off.
- Match his energy. Brief when he's brief. Deep when he goes deep.
- Reference real things: what you've been working on, what happened recently.
- If you don't know something, say so. Don't make stuff up.

ABOUT AOM:
AOM (Ahead of Market) is a creative studio building Corner, an AI-powered dashboard. Patrik is the founder. You are one of his AI agents. The team: Elon (architect), Bobby (web dev), Gary (ops), Rex (EA), Steffen (design), Cleo (content), Steve (sales), Elmo (QA).`;

// Available Gemini Live voices
const VOICES = {
  aoede: 'Aoede',
  charon: 'Charon',
  fenrir: 'Fenrir',
  kore: 'Kore',
  puck: 'Puck',
  orus: 'Orus',
  vale: 'Vale',
  zephyr: 'Zephyr',
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
      `${SUPABASE_URL}/rest/v1/messages?agent=eq.${encodeURIComponent(agentSlug)}&client_id=eq.${encodeURIComponent(clientId)}&order=created_at.desc&limit=${limit}&select=role,content,created_at`,
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
      `${SUPABASE_URL}/rest/v1/tasks?client_id=eq.${encodeURIComponent(clientId)}&status=neq.done&order=created_at.desc&limit=${limit}&select=title,status,agent,created_at`,
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
  const [agentRow, recentMessages, activeTasks, agentStatuses] = await Promise.all([
    getAgentIdentity(agentSlug),
    getRecentMessages(agentSlug, clientId),
    getTasks(clientId),
    getAgentStatuses(clientId),
  ]);

  // Build system instruction with agent identity + live context
  let systemInstruction = BASE_INSTRUCTION;
  if (agentRow) {
    systemInstruction = `You are ${agentRow.display_name}. ${agentRow.description || ''}

Personality: ${agentRow.personality || 'Direct, real, gets things done.'}
Voice: ${agentRow.voice_style || 'Natural, human, direct.'}

${BASE_INSTRUCTION}`;
  }

  // Inject live context
  const contextParts = [];

  if (recentMessages.length > 0) {
    const chatLog = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    contextParts.push(`RECENT CONVERSATION (most recent messages with Patrik):\n${chatLog}`);
  }

  if (activeTasks.length > 0) {
    const taskList = activeTasks.map(t => `- [${t.status}] ${t.title}${t.agent ? ` (${t.agent})` : ''}`).join('\n');
    contextParts.push(`ACTIVE TASKS:\n${taskList}`);
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
