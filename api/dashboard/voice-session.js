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

async function getAgentIdentity(slug) {
  if (!slug || !SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/agents?slug=eq.${encodeURIComponent(slug)}&limit=1&select=display_name,description,personality,voice_style`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) ? rows[0] : null;
  } catch { return null; }
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

  // Build system instruction with agent identity
  let systemInstruction = BASE_INSTRUCTION;
  const agentRow = await getAgentIdentity(agentSlug);
  if (agentRow) {
    systemInstruction = `You are ${agentRow.display_name}. ${agentRow.description || ''}

Personality: ${agentRow.personality || 'Direct, real, gets things done.'}
Voice: ${agentRow.voice_style || 'Natural, human, direct.'}

${BASE_INSTRUCTION}`;
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
  const setupMessage = {
    setup: {
      model: `models/${modelId}`,
      generationConfig: {
        temperature: temp,
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
