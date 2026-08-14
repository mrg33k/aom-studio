// GET  /api/dashboard/livescribe-sessions?world=<world>
// POST /api/dashboard/livescribe-sessions { action, world, session:{...} | action:'delete', world, id }
//
// Persistent store for Live Scribe sessions (real-time meeting capture).
// Sessions include running transcript turns, extracted action items, and decisions.
//
// Storage: cm_state row per world (kind='dash_livescribe', scope_id='all',
// client_id=<world>, payload={ sessions:[...] }) — corner:live-scribe R-next.
//
// A session: { id, started, ended?, target, status, turns:[{at,text}], actionItems:[...], decisions:[...] }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { stateSet, stateGet } from '../_lib/stateStore.js';

const KIND = 'dash_livescribe';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const clean = (s, n) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const cleanMultiline = (s, n) => String(s == null ? '' : s).slice(0, n);
const newId = (pfx) => pfx + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

async function loadSessions(world) {
  const payload = await stateGet(KIND, 'all', world);
  return (payload && Array.isArray(payload.sessions)) ? payload.sessions : [];
}

async function saveSessions(world, sessions) {
  return stateSet(KIND, 'all', world, { sessions, updated: new Date().toISOString() });
}

// Extract action items and decisions from transcript using Gemini
async function extractFromTranscript(transcript) {
  if (!GEMINI_API_KEY || !transcript || transcript.trim().length < 12) {
    return { actionItems: [], decisions: [] };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract action items and decisions from this transcript. Return ONLY a JSON object (no markdown, no commentary):
{
  "actionItems": [{"text": "action item text", "owner": "optional owner name or null"}],
  "decisions": [{"text": "decision statement"}]
}

Transcript:
"""
${transcript}
"""

Be concise. Action items: things someone should do. Decisions: things the group decided. Max 5 each.`,
            }],
          }],
          generationConfig: { temperature: 0.3 },
        }),
      }
    );

    if (!response.ok) {
      console.error('[livescribe-sessions] Gemini extract error:', response.status);
      return { actionItems: [], decisions: [] };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response (strip code fences if present)
    let extracted = { actionItems: [], decisions: [] };
    try {
      let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
      const start = t.indexOf('{');
      const end = t.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        extracted = JSON.parse(t.slice(start, end + 1));
      }
    } catch (_) { /* use defaults */ }

    return {
      actionItems: Array.isArray(extracted.actionItems)
        ? extracted.actionItems.slice(0, 5).map(ai => ({
          text: cleanMultiline(ai.text || ai, 300),
          owner: ai.owner ? clean(ai.owner, 80) : null,
        }))
        : [],
      decisions: Array.isArray(extracted.decisions)
        ? extracted.decisions.slice(0, 5).map(d => ({
          text: cleanMultiline(d.text || d, 300),
        }))
        : [],
    };
  } catch (err) {
    console.error('[livescribe-sessions] Extract error:', err);
    return { actionItems: [], decisions: [] };
  }
}

// Sanitize and validate a session
function cleanSession(session) {
  if (!session || typeof session !== 'object') return null;
  return {
    id: clean(session.id, 60) || newId('sess'),
    started: clean(session.started, 30) || new Date().toISOString(),
    ended: session.ended ? clean(session.ended, 30) : null,
    target: clean(session.target, 120) || 'Meeting',
    status: ['recording', 'paused', 'completed'].includes(session.status) ? session.status : 'completed',
    turns: Array.isArray(session.turns)
      ? session.turns.slice(0, 500).map(t => ({
        at: clean(t.at, 20),
        text: cleanMultiline(t.text, 1000),
      }))
      : [],
    actionItems: Array.isArray(session.actionItems)
      ? session.actionItems.slice(0, 20).map(ai => ({
        text: cleanMultiline(ai.text || ai, 300),
        owner: ai.owner ? clean(ai.owner, 80) : null,
      }))
      : [],
    decisions: Array.isArray(session.decisions)
      ? session.decisions.slice(0, 20).map(d => ({
        text: cleanMultiline(d.text || d, 300),
      }))
      : [],
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const _worldRaw = req.query.world ? String(req.query.world).trim() : '';
    if (!_worldRaw) return res.status(401).json({ error: 'Missing client' });
    const world = clean(_worldRaw, 60);
    if (!world) return res.status(401).json({ error: 'Missing client' });
    const sessions = await loadSessions(world);
    // Return newest first, cap at 20
    return res.status(200).json({
      world,
      sessions: sessions.sort((a, b) => new Date(b.started) - new Date(a.started)).slice(0, 20),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'GET or POST only' });

  const body = req.body || {};
  const action = body.action;
  const _worldBodyRaw = body.world ? String(body.world).trim() : '';
  if (!_worldBodyRaw) return res.status(401).json({ error: 'Missing client' });
  const world = clean(_worldBodyRaw, 60);
  if (!world) return res.status(401).json({ error: 'Missing client' });

  // Every action is tenant-gated — including extract, which spends Gemini tokens
  // on whatever transcript it is handed. An ungated extract is a free LLM proxy.
  try {
    await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  if (action === 'extract') {
    const transcript = body.transcript || '';
    const extracted = await extractFromTranscript(transcript);
    return res.status(200).json(extracted);
  }

  if (action === 'save') {
    let sessions = await loadSessions(world);
    const newSession = cleanSession(body.session);
    if (!newSession) return res.status(400).json({ error: 'invalid session' });

    // Upsert by id
    const idx = sessions.findIndex(s => s.id === newSession.id);
    if (idx >= 0) {
      sessions[idx] = newSession;
    } else {
      sessions.push(newSession);
    }

    // Cap at 20 sessions, drop oldest
    if (sessions.length > 20) {
      sessions = sessions.sort((a, b) => new Date(b.started) - new Date(a.started)).slice(0, 20);
    }

    const ok = await saveSessions(world, sessions);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true, session: newSession });
  }

  if (action === 'delete') {
    let sessions = await loadSessions(world);
    const id = clean(body.id, 60);
    sessions = sessions.filter(s => s.id !== id);
    const ok = await saveSessions(world, sessions);
    if (!ok) return res.status(500).json({ error: 'write failed' });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'unknown action' });
}
