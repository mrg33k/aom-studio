// GET /api/dashboard/ea-system-prompt?client_id=X
// Returns the computed EA system prompt for a given tenant.
// Includes conversational naming nudge when display_name IS NULL and cadence allows.
// Includes active project list + novel-topic routing instructions (R78-p1).
//
// Used by:
//   - Acceptance tests (gate EAN-1: checks nudge present/absent)
//   - Mac Mini bridge (future: fetch system prompt at message-time)
//
// Nudge cadence:
//   - Include nudge if display_name IS NULL AND
//     (last_naming_nudge_at IS NULL  OR  now - last_naming_nudge_at >= 3 days)
//   - Named EAs: never nudge

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

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

export function buildEaSystemPrompt({ displayName, workspaceName, lastNudgeAt, projects }) {
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

  const activeProjects = Array.isArray(projects) ? projects : [];
  if (activeProjects.length > 0) {
    const projectLines = activeProjects
      .map(p => `- ${p.slug}${p.name && p.name !== p.slug ? ` (${p.name})` : ''}`)
      .join('\n');
    parts.push(
      '',
      `# ACTIVE PROJECTS`,
      `These are the user's active projects. Use this list to route topics correctly:\n${projectLines}`,
      '',
      `# NOVEL TOPIC ROUTING`,
      `When the user brings up a topic that doesn't map to any project above:`,
      `1. Engage with the topic naturally first — don't open with "should this be a project?"`,
      `2. Once the direction is clear, ask naturally: "Sounds interesting — is this something you want to make a project on and keep working on, or just a one-off?"`,
      `3. If yes: drop a confirmation card with the proposed slug for them to review before the project is created. Never scaffold silently.`,
      `4. If no: keep the conversation going here — no project needed.`,
      `Do NOT suggest creating a project when the topic clearly relates to an existing one above.`,
      '',
      `# MULTIPLE WORK AREAS IN ONE MESSAGE`,
      `When the user lists more than one distinct work area in a single message — e.g. "I run a consulting practice, do video on the side, and I'm building a SaaS tool" — do NOT walk them through three separate confirmations. Treat it as one motion:`,
      `1. Match each ask against the active-projects list above. Things that already have a project go into that project's room; only the genuinely-new threads need scaffolding.`,
      `2. Engage with all of them in one response, then propose the batch in one card: "Sounds like three threads — *consulting*, *video*, *recipe-saas*. Want me to spin all three up so we can keep them separate from day one?"`,
      `3. On yes: call \`scaffold_projects_batch\` with all of the new ones in a single call. Each item becomes its own project with at least one mission scaffolded automatically. Never call the single-project scaffold N times when the user gave you N asks at once.`,
      `4. If they only want some of them, call the batch with just those.`,
      `5. Confirmation is batched, not three prompts in a row. Three prompts is a wizard; you are not a wizard.`,
    );
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

  // GET was unauthenticated and returned any tenant's computed EA system prompt.
  // The prompt is world-scoped config — require the caller's JWT prove access to
  // that world (super-admin passes for every world).
  try {
    await verifyTenant(clientId, req);
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    const [eaRes, projectsRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/agent_status?slug=eq.ea&client_id=eq.${encodeURIComponent(clientId)}&select=name,display_name,last_naming_nudge_at&limit=1`,
        { headers },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/projects?is_active=eq.true&client_id=eq.${encodeURIComponent(clientId)}&select=slug,name&order=name`,
        { headers },
      ),
    ]);

    if (!eaRes.ok) return res.status(502).json({ error: 'Supabase query failed' });
    const rows = await eaRes.json();
    const ea = Array.isArray(rows) ? rows[0] : null;

    if (!ea) return res.status(404).json({ error: `No EA found for client_id=${clientId}` });

    const projects = projectsRes.ok ? await projectsRes.json() : [];

    const workspaceName = (ea.name || '').replace(/ EA$/, '') || clientId;
    const prompt = buildEaSystemPrompt({
      displayName: ea.display_name || null,
      workspaceName,
      lastNudgeAt: ea.last_naming_nudge_at || null,
      projects: Array.isArray(projects) ? projects : [],
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
