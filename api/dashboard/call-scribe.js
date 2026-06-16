// POST /api/dashboard/call-scribe
// Live call/meeting scribe brain.
// Takes the running transcript of a call and returns a building brief:
// summary, key talking points, live web research on things said, and
// suggested questions. Uses Gemini 2.5 Flash with Google Search grounding
// so the "research" is real and current, not made up.
//
// Stays on Gemini by design — no Anthropic API from any endpoint (hard rule).

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';
const MAX_TRANSCRIPT_CHARS = 6000; // keep prompt tight + fast; we send the tail

const SYSTEM_PROMPT = `You are a live scribe sitting in on a phone/video call, listening as it happens.
You are given the running transcript so far (it grows each time you are called).
Your job is to turn it into a clean, useful, building brief — the kind of notes a sharp chief of staff would hand back after the call.

Do FOUR things:
1. summary — a tight 2-4 sentence running summary of what the call is about and where it stands right now.
2. talkingPoints — the key points raised so far, as short bullets. Most important first. Max 8.
3. research — pick the 1-3 most useful things SAID on the call that are worth looking up to add richness (a company, product, claim, price, person, "do they offer X?", a market stat). Use web search to find the real, current answer. For each: a short topic, a 1-2 sentence finding, and a source URL if you have one. Only include genuinely useful lookups; if nothing is worth researching yet, return an empty array. Never invent facts — if search gives nothing solid, leave it out.
4. questions — 2-4 smart questions the caller could ask next, based on gaps or openings in the conversation.

Return ONLY a JSON object, no markdown, no commentary:
{
  "summary": "string",
  "talkingPoints": ["string", ...],
  "research": [{ "topic": "string", "finding": "string", "source": "https://..." }],
  "questions": ["string", ...]
}`;

function extractJson(text) {
  if (!text) return null;
  // strip code fences if present
  let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/,'').trim();
  // grab the outermost {...}
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

async function callGemini(transcript, callContext) {
  const ctxLine = callContext
    ? `Context for this call (who/what it's about): ${callContext}\n\n`
    : '';
  const tail = transcript.length > MAX_TRANSCRIPT_CHARS
    ? transcript.slice(-MAX_TRANSCRIPT_CHARS)
    : transcript;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: 'user',
          parts: [{ text: `${ctxLine}Running transcript so far:\n"""\n${tail}\n"""\n\nReturn the brief as JSON.` }],
        }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(28000),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Gemini ${response.status}: ${body.slice(0, 300)}`);
  }
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  return extractJson(text);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  const { transcript, context } = req.body || {};
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 12) {
    return res.status(200).json({ summary: '', talkingPoints: [], research: [], questions: [] });
  }

  try {
    const brief = await callGemini(transcript, context);
    if (!brief) {
      return res.status(200).json({ summary: '', talkingPoints: [], research: [], questions: [], note: 'no_parse' });
    }
    return res.status(200).json({
      summary: brief.summary || '',
      talkingPoints: Array.isArray(brief.talkingPoints) ? brief.talkingPoints.slice(0, 8) : [],
      research: Array.isArray(brief.research) ? brief.research.slice(0, 3) : [],
      questions: Array.isArray(brief.questions) ? brief.questions.slice(0, 4) : [],
    });
  } catch (err) {
    return res.status(502).json({ error: String(err.message || err) });
  }
}
