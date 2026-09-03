// GET /api/dashboard/ea-system-prompt?client_id=X
// Returns the computed EA system prompt for a given tenant.
// Includes conversational naming nudge when the EA still has its default name.
// Includes active project list + novel-topic routing instructions (R78-p1).
//
// Used by:
//   - Acceptance tests (gate EAN-1: checks nudge present/absent)
//   - Mac Mini bridge (future: fetch system prompt at message-time)
//
// corner:retire-supabase (2026-09-03): the EA row is the world's `ea` agent
// (agents:listStatus) and the projects come from projects:list. The Convex
// agent row has a title and no separate display name, so: a title that ends
// in " EA" is the default name (nudge), anything else is the name the user
// gave (no nudge). Nudge timing is not stored on Convex, so lastNudgeAt is
// always null; the prompt itself tells the model to inject the nudge once.

// ---------------------------------------------------------------------------
// Convex is the only backend (corner:retire-supabase, 2026-09-03). The signed
// in person's Convex Auth token arrives as Authorization: Bearer and the
// deployment checks it in users:verifyToken. This block is repeated in each
// route on purpose until a shared helper lands in api/_lib.
// ---------------------------------------------------------------------------
const CONVEX_URL = process.env.CONVEX_URL || process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud';

async function convexCall(kind, path, args, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  });
  if (!r.ok) throw new Error(`convex ${kind} ${path}: HTTP ${r.status}`);
  const data = await r.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}
const convexQuery = (path, args, token) => convexCall('query', path, args, token);

class AuthError extends Error {
  constructor(message, status = 403) { super(message); this.name = 'AuthError'; this.status = status; }
}

function bearerToken(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim() || null;
  return null;
}

// Who is calling. Throws 401 when the request carries no valid session.
async function requireCaller(req) {
  const token = bearerToken(req);
  if (!token) throw new AuthError('sign-in required', 401);
  let who = null;
  try { who = await convexQuery('users:verifyToken', {}, token); } catch { who = null; }
  if (!who || !who.userId) throw new AuthError('invalid session', 401);
  const world = who.world ? String(who.world).toLowerCase() : null;
  let superAdmin = false;
  try { superAdmin = !!(await convexQuery('worlds:isAdmin', { worldId: 'aom' }, token)); } catch { superAdmin = false; }
  return { userId: who.userId, email: who.email || null, userName: who.name || null, world, worldId: who.worldId || null, isAdmin: !!who.isAdmin, superAdmin, token };
}

// May the caller act inside `tenant`? A world slug admits an aom admin
// (Patrik) everywhere and any member of that world. "shared:<project>" admits
// a world that holds the project or a grant on it.
async function verifyTenant(tenant, req) {
  const t = String(tenant || '').trim().toLowerCase();
  if (!t) throw new AuthError('tenant required', 400);
  const who = await requireCaller(req);
  if (who.superAdmin) return { ok: true, tenant: t, ...who, isAdmin: true };
  if (t.startsWith('shared:')) {
    const slug = t.slice('shared:'.length);
    const access = who.world ? await convexQuery('projects:hasAccess', { slug, worldId: who.world }, who.token).catch(() => null) : null;
    if (access && access.ok) return { ok: true, tenant: t, ...who, isAdmin: false };
  } else {
    const m = await convexQuery('worlds:membership', { worldId: t }, who.token).catch(() => null);
    if (m && m.role) return { ok: true, tenant: t, ...who, isAdmin: m.role === 'owner' || m.role === 'admin' };
    if (who.world === t) return { ok: true, tenant: t, ...who };
  }
  throw new AuthError(`forbidden: caller world "${who.world || '(none)'}" cannot access "${t}"`, 403);
}

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
    return `By the way, I'm still going by the default name. What would you like to call me? Totally up to you. It can be anything.`;
  }
  return `Hey, I want to make sure I ask this properly: you still haven't given me a name. I'll keep working either way, but I'd love one when you're ready. What would you like to call me?`;
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
    `Keep responses concise. Bullet points over paragraphs. Never say "I'll help you with that", just do the thing.`,
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
      `1. Engage with the topic naturally first. Don't open with "should this be a project?"`,
      `2. Once the direction is clear, ask naturally: "Sounds interesting. Is this something you want to make a project on and keep working on, or just a one-off?"`,
      `3. If yes: drop a confirmation card with the proposed slug for them to review before the project is created. Never scaffold silently.`,
      `4. If no: keep the conversation going here. No project needed.`,
      `Do NOT suggest creating a project when the topic clearly relates to an existing one above.`,
      '',
      `# MULTIPLE WORK AREAS IN ONE MESSAGE`,
      `When the user lists more than one distinct work area in a single message, e.g. "I run a consulting practice, do video on the side, and I'm building a SaaS tool", do NOT walk them through three separate confirmations. Treat it as one motion:`,
      `1. Match each ask against the active-projects list above. Things that already have a project go into that project's room; only the genuinely-new threads need scaffolding.`,
      `2. Engage with all of them in one response, then propose the batch in one card: "Sounds like three threads: *consulting*, *video*, *recipe-saas*. Want me to spin all three up so we can keep them separate from day one?"`,
      `3. On yes: call \`scaffold_projects_batch\` with all of the new ones in a single call. Each item becomes its own project with at least one mission scaffolded automatically. Never call the single-project scaffold N times when the user gave you N asks at once.`,
      `4. If they only want some of them, call the batch with just those.`,
      `5. Confirmation is batched, not three prompts in a row. Three prompts is a wizard; you are not a wizard.`,
    );
  }

  return parts.join('\n');
}

// The world's EA row: a row scoped to this world wins over the shared roster.
function pickEa(rows, worldId) {
  const eas = (Array.isArray(rows) ? rows : []).filter(r => r && r.slug === 'ea');
  if (!eas.length) return null;
  return eas.find(r => worldId && r.worldId === worldId) || eas.find(r => !r.worldId) || eas[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const clientId = (req.query.client_id || '').trim().toLowerCase();
  if (!clientId) return res.status(400).json({ error: 'client_id required' });

  // The prompt is world-scoped config: the caller's session must prove access
  // to that world (an aom admin passes for every world).
  let verified;
  try {
    verified = await verifyTenant(clientId, req);
  } catch (err) {
    if (err instanceof AuthError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  try {
    const [agents, projects, world] = await Promise.all([
      convexQuery('agents:listStatus', { worldId: clientId, includeInactive: false }, verified.token).catch(() => []),
      convexQuery('projects:list', { worldSlug: clientId, activeOnly: true }, verified.token).catch(() => []),
      convexQuery('worlds:getBySlug', { slug: clientId }, verified.token).catch(() => null),
    ]);

    const ea = pickEa(agents, world?._id);
    if (!ea) return res.status(404).json({ error: `No EA found for client_id=${clientId}` });

    const title = String(ea.title || '').trim();
    const isDefaultName = !title || title === 'EA' || /\sEA$/i.test(title);
    const displayName = isDefaultName ? null : title;
    const workspaceName = (isDefaultName ? title.replace(/\s*EA$/i, '') : '') || world?.name || clientId;
    const lastNudgeAt = null;

    const projectList = (Array.isArray(projects) ? projects : [])
      .map(p => ({ slug: p.slug, name: p.name }))
      .sort((a, b) => String(a.name || a.slug).localeCompare(String(b.name || b.slug)));

    const prompt = buildEaSystemPrompt({
      displayName,
      workspaceName,
      lastNudgeAt,
      projects: projectList,
    });

    const nudging = shouldNudge(displayName, lastNudgeAt);

    return res.status(200).json({
      prompt,
      display_name: displayName,
      effective_name: displayName || title || `${clientId} EA`,
      nudging,
      last_naming_nudge_at: lastNudgeAt,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
