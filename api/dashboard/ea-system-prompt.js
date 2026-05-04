// GET /api/dashboard/ea-system-prompt?client_id=X
// Returns the computed EA system prompt for a given tenant.
// Includes conversational naming nudge when display_name IS NULL and cadence allows.
//
// Used by:
//   - Acceptance tests (gate EAN-1: checks nudge present/absent)
//   - Mac Mini bridge (future: fetch system prompt at message-time)
//
// Nudge cadence:
//   - Include nudge if display_name IS NULL AND
//     (last_naming_nudge_at IS NULL  OR  now - last_naming_nudge_at >= 3 days)
//   - Named EAs: never nudge

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const NUDGE_INTERVAL_DAYS = 3;
const ESCALATE_AFTER_DAYS = 14;

function shouldNudge(displayName, lastNudgeAt) {
  if (displayName) return false;
  if (!lastNudgeAt) return true;
  const daysSince = (Date.now() - new Date(lastNudgeAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= NUDGE_INTERVAL_DAYS;
}

function buildNudgeText(daysSinceNudge) {
  if (daysSinceNudge === null || daysSinceNudge < ESCALATE_AFTER_DAYS) {
    return `By the way — I'm still going by the default name. What would you like to call me? Totally up to you. It can be anything.`;
  }
  return `Hey — I want to make sure I ask this properly: you still haven't given me a name. I'll keep working either way, but I'd love one when you're ready. What would you like to call me?`;
}

export function buildEaSystemPrompt({ displayName, workspaceName, lastNudgeAt }) {
  const effectiveName = displayName || (workspaceName ? `${workspaceName} EA` : 'EA');
  const nudge = shouldNudge(displayName, lastNudgeAt);

  const daysSinceNudge = lastNudgeAt
    ? (Date.now() - new Date(lastNudgeAt).getTime()) / (1000 * 60 * 60 * 24)
    : null;

  const parts = [
    `You are ${effectiveName}, a personal AI executive assistant for ${workspaceName || 'your workspace'}.`,
    `You work for your user directly. You are sharp, direct, and focused. You take initiative.`,
    `Keep responses concise. Bullet points over paragraphs. Never say "I'll help you with that" — just do the thing.`,
  ];

  if (nudge) {
    parts.push('', `# NAMING NUDGE (inject once, naturally, not in every reply)`, buildNudgeText(daysSinceNudge));
  }

  return parts.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const clientId = (req.query.client_id || '').trim().toLowerCase();
  if (!clientId) return res.status(400).json({ error: 'client_id required' });

  try {
    const url = `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.ea&client_id=eq.${encodeURIComponent(clientId)}&select=name,display_name,last_naming_nudge_at&limit=1`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });

    if (!r.ok) return res.status(502).json({ error: 'Supabase query failed' });
    const rows = await r.json();
    const ea = Array.isArray(rows) ? rows[0] : null;

    if (!ea) return res.status(404).json({ error: `No EA found for client_id=${clientId}` });

    const workspaceName = (ea.name || '').replace(/ EA$/, '') || clientId;
    const prompt = buildEaSystemPrompt({
      displayName: ea.display_name || null,
      workspaceName,
      lastNudgeAt: ea.last_naming_nudge_at || null,
    });

    const nudging = shouldNudge(ea.display_name, ea.last_naming_nudge_at);

    return res.status(200).json({
      prompt,
      display_name: ea.display_name || null,
      effective_name: ea.display_name || ea.name || `${clientId} EA`,
      nudging,
      last_naming_nudge_at: ea.last_naming_nudge_at || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
