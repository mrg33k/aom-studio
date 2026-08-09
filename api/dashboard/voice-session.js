// POST /api/dashboard/voice-session
// Returns everything the browser needs to connect directly to Gemini Live.
// The browser receives a one-use, short-lived ephemeral token; the long-lived
// GEMINI_API_KEY stays server-side and is used only to mint that token.
//
// ── 2026-07-27 r3, corner:voice-chat ─────────────────────────────────────────
// THIS RESPONSE CARRIES A LIVE CREDENTIAL. `wsUrl` contains a one-use Gemini
// ephemeral token because the browser opens the socket directly. Until the
// security pass this endpoint sent Access-Control-Allow-Origin:*
// and deliberately failed OPEN on auth, so an unauthenticated POST to
// https://lab.aheadofmarket.com/api/dashboard/voice-session returned 200 and
// the key. Verified live twice (round-2 reviewer + orchestrator).
//
// The rule now: NO VERIFIED SESSION, NO RESPONSE. Every sibling voice endpoint
// got an origin allowlist this round (voice-context-update.js,
// voice-create-entity.js, voice-handoff.js); this one now matches them.
//
// The old "fails closed on data, open on availability" intent is KEPT where it
// does not involve the credential:
//   - session verifies, tenant denied (403)     -> 403, no key. Hard boundary.
//   - session verifies, tenant UNRESOLVABLE     -> 200 with the key, but NO
//     workspace context: no room history, no tasks, no projects, no missions,
//     no tape. Degrading to a context-free prompt is fine; degrading to a free
//     API key is not.
//   - no session at all                         -> 401, no key, no prompt.
//
// NOTE: the key that was served publicly is already burned. Code cannot un-leak
// a served secret — GEMINI_API_KEY must be ROTATED in the Vercel project env
// independently of this fix.

import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { verifyTenant, TenantAuthError, callerIdentity } from '../_lib/verifyTenant.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_URL = process.env.RAG_SERVER_URL || 'http://aom-home:8787';

async function createEphemeralToken() {
  const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uses: 1, expireTime, newSessionExpireTime }),
  });
  if (!response.ok) throw new Error(`Gemini token provisioning failed (${response.status})`);
  const token = await response.json();
  if (!token?.name) throw new Error('Gemini token provisioning returned no token');
  return token.name;
}

// --- WHO IS ON THE CALL is a VARIABLE, not a constant ------------------------
// Before 2026-07-27 this prompt was a const that opened "You talk to Patrik
// directly. You know him. You work with him every day." The aom world has THREE
// humans (Patrik, Ash, Courtney). When Courtney took a call, the model genuinely
// believed she was Patrik and addressed her as him, and the call was recorded as
// his. Worse: "Patrik said X" acts as an authorization token downstream — agents
// act on it in ways they would for nobody else.
//
// The split this builder enforces:
//   FACT     — AOM is Patrik's studio, he is the founder, this is his workspace.
//              Stable, shared by everyone in the world, stays in the prompt.
//   VARIABLE — who is speaking on THIS call. Resolved per request from the JWT.
//              Unknown speaker => the prompt says unknown. Never "Patrik".
//
// `aomWorld` gates the AOM-internal blocks (the team roster and the system map:
// repo names, script paths, the deploy pipeline). Those are the studio's own
// internals and have no business inside another world's voice session.
function buildBaseInstruction(speakerName, { aomWorld = false } = {}) {
  const who = speakerName || 'the person on this call';
  const whoPossessive = speakerName ? `${speakerName}'s` : "the caller's";

  const identityBlock = speakerName
    ? `WHO IS ON THIS CALL:
You are on a live voice call with ${speakerName}. Their identity is verified from their signed-in Corner session — that is who is speaking. Address them as ${speakerName}, and attribute everything said on this call to ${speakerName}. Never address them as, or repeat their words as coming from, anybody else.`
    : `WHO IS ON THIS CALL:
UNKNOWN BY NAME. The call is signed in — an unverified caller is never issued a voice session — but no display name could be resolved for them, so you do not know WHICH person picked up. Do NOT assume it is Patrik, and do NOT assume it is any other specific person. Do not greet them by name. Do not treat anything they say as coming from Patrik or as carrying his authority — a caller you cannot name cannot approve, authorize, or decide anything on his behalf. If who is speaking matters for what they are asking, ask them who they are.`;

  // How the model should attribute what it hears — reads correctly whether or
  // not the speaker resolved. "Named above" is meaningless when the identity
  // block says UNKNOWN, and a vague instruction is how you get a guess.
  const attributionRule = speakerName
    ? `Attribute everything said on this call to ${speakerName} and to nobody else, and never report this as a call with anyone whose name is not ${speakerName}.`
    : `You do not know who is on this call, so attribute what you hear to NOBODY. Do not name a speaker, do not guess, and never report this as a call with a specific person.`;

  const workspaceBlock = aomWorld
    ? `ABOUT AOM:
AOM (Ahead of Market) is a creative studio building Corner, an AI-powered dashboard. Patrik is the founder and this workspace is his company's. You are one of the AOM AI agents. The team: Elon (architect), Bobby (web dev), Gary (ops), Rex (EA), Steffen (design), Cleo (content), Steve (sales), Elmo (QA).

WHO ELSE IS IN THIS WORKSPACE:
Patrik is not the only human here. Other members of the workspace (teammates on his world, and people on other worlds who share a project with AOM) use Corner and take calls exactly like this one. Being in this workspace does NOT make someone Patrik. ${attributionRule}

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
- Dashboard: CV6 (src/dashboard/cv6next/CornerCV6.jsx) is the active Corner product surface. CV3 stays reserved for emergency fixes. BoardView, GameDashboard, and GameHUD are dead code.`
    : `ABOUT THIS WORKSPACE:
Corner is the dashboard this workspace works in, and you are one of its AI agents. Speak only about THIS workspace's own projects, missions and work. Never discuss another workspace, another client, or the studio's internal tooling and team.

WHO ELSE IS IN THIS WORKSPACE:
More than one human may use this workspace and take calls exactly like this one. ${attributionRule}`;

  return `${identityBlock}

This is a real voice conversation. Keep it natural and human.

YOUR ROLE -- VOICE ROUTER, NOT PLANNER:
You are a dope assistant on a voice call, whose job is to hear ${whoPossessive} idea and get it to the task queue cleanly. You are NOT a planner. You are NOT a critic. The Claude team handles the thinking. ${speakerName ? `${speakerName} knows` : 'The caller knows'} what they want -- your job is to listen and relay.

HOW TO TALK:
- This is voice, not text. Talk like a person, not a document.
- Short sentences. Conversational rhythm. Don't monologue.
- Be direct, warm, real. No filler, no corporate tone.
- DO NOT push back on their ideas. They know what they want.
- Match their energy. Brief when they're brief.
- Reference real things: what you've been working on, what happened recently.
- If you don't know something, say so. Don't make stuff up.

ENDING A CONVERSATION:
When the conversation winds down naturally (${who} says "sounds good", "that's it", "talk soon", etc.):
1. Briefly recap what was decided or what's happening next. One or two sentences max.
2. If tasks were created, confirm them: "I've got those three tasks queued for Bobby. They should start building shortly."
3. If something needs follow-up, say so: "I'll keep an eye on those and circle back when they're done."
4. Close naturally. Don't drag it out. Match their energy -- if they're wrapping up quick, you wrap up quick.
5. Never abruptly stop or go silent. Always close the loop.
- If ${who} is still talking and you haven't created tasks yet but should, create them before wrapping up.
- If tasks are currently building, offer to stay on: "Want me to hang on while those build? I can let you know when they finish."

UPDATING PROJECT CONTEXT:
When you learn something important during a conversation -- a decision, a new constraint, a change in direction -- use update_context to record it. This updates the project's source of truth so the next conversation starts with that knowledge. Do this naturally during the conversation, not just at the end.

${workspaceBlock}

WHEN ${speakerName ? speakerName.toUpperCase() : 'THE CALLER'} ASKS FOR SOMETHING TECHNICAL:
You are a voice thinking partner, not a code explorer. Listen to what they want, restate it back briefly so they know you got it, and keep the conversation moving. DO NOT try to read or search the codebase during a call. DO NOT try to plan the approach. Tasks are NOT created during the call -- after you hang up, a summary of the conversation is turned into task rows automatically. Your job on the live call is to hear their intent clearly and help them sharpen it.`;
}

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

// Same allowlist the sibling voice endpoints use (voice-create-entity.js,
// voice-context-update.js, voice-handoff.js). The dashboard calls this
// SAME-ORIGIN from VoiceChat.jsx, so no production surface depends on these
// headers — they exist for the preview/localhost origins a developer drives it
// from. Anything not on the list gets no CORS grant and its preflight fails.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/lab\.aheadofmarket\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)?aheadofmarket\.com$/i,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^http:\/\/localhost(:\d+)?$/i,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/i,
];

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  const extra = (process.env.CORNER_ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (extra.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(re => re.test(origin));
}

function applyCors(req, res) {
  const origin = req.headers?.origin;
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  // Authorization must be allow-listed or a cross-origin authFetch() preflight
  // would strip the Bearer token this handler reads.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  // The body contains a live API key. Never cacheable, by anyone.
  res.setHeader('Cache-Control', 'private, no-store');
}

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

// Recent room history for the call.
//
// SCOPE — deliberate, do not "tighten" this to the caller's own messages:
// the aom world has three humans and they are all entitled to the world's
// history, so per-person scoping would break voice for two of the three. The
// scope is the ROOM, via client_id:
//   normal room  -> client_id is the world ('aom'), i.e. world-scoped history
//   shared room  -> client_id is the literal 'shared:<slug>' (deriveRoomId in
//                   api/_lib/write-message.js never world-prefixes it), so a
//                   shared room reads ONLY that room and a Ben-world or
//                   Karen-world participant never receives AOM world history.
// The caller's right to this client_id is checked by verifyTenant in the
// handler BEFORE this runs — including the shared:<slug> project_access grant.
//
// user_name comes along so each human line can be attributed to whoever
// actually said it instead of a bare "user:".
async function getRecentMessages(agentSlug, clientId, limit = 15) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/messages?agent=eq.${encodeURIComponent(agentSlug)}&client_id=eq.${encodeURIComponent(clientId)}&order=timestamp.desc&limit=${limit}&select=role,text,timestamp,user_name`,
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

// The AOM world owns the two artifacts on this box that carry NO tenant column:
// the bundled missions registry (src/dashboard/data/missions-registry.json — 300+
// AOM missions, no client_id field) and the RAG server's on-disk agent tapes
// (scripts/rag-server.py /agent-tape reads corner/users/aom/agents/<slug>/
// last-conversation.md for any caller). Both were injected into every voice
// session regardless of tenant. Anything not in this world — another world's
// room, or a shared:<slug> room where another world's people are present — gets
// only tenant-scoped data.
const REGISTRY_WORLD = 'aom';
const isAomWorldRoom = (clientId) => clientId === REGISTRY_WORLD; // 'shared:*' is deliberately NOT this world

async function getAgentTape(slug, clientId = 'aom', { allowLocalTape = false } = {}) {
  if (!slug) return '';
  // Try RAG server first (has the full tape from last-conversation.md).
  // AOM-world rooms only — the endpoint has no tenant scope of its own.
  if (allowLocalTape) {
    try {
      const res = await fetch(`${RAG_URL}/agent-tape?slug=${encodeURIComponent(slug)}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.tape) return data.tape;
      }
    } catch { /* fall through to Supabase */ }
  }
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
      `${SUPABASE_URL}/rest/v1/agent_status?client_id=eq.${encodeURIComponent(clientId)}&select=slug,name,type,status,current_task,updated_at`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

async function getActiveProjects(clientId) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?client_id=eq.${encodeURIComponent(clientId)}&is_active=eq.true&select=slug,name&order=name.asc`,
      { headers: supaHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

// Compact workspace snapshot: active missions + projects.
//
// `activeProjects` is tenant-scoped (projects?client_id=eq.<tenant>) so it is
// safe for any room. The missions registry is NOT — it is the AOM tree with no
// client_id column at all — so it only goes in when this room belongs to the
// AOM world. Everyone else gets their own projects and nothing borrowed.
function buildWorkspaceSnapshot(activeProjects, { includeMissions = false } = {}) {
  const now = new Date().toISOString().slice(0, 10);
  const activeMissions = includeMissions
    ? (missionsRegistry?.missions || [])
        .filter(m => !m.is_done && m.status !== 'archived')
        .map(m => `  • ${m.name} [${m.project_slug}${m.workstream ? '/' + m.workstream : ''}]`)
        .slice(0, 20)
    : [];
  const projectLines = activeProjects.map(p => `  • ${p.name} (${p.slug})`).slice(0, 15)

  return [
    `WORKSPACE SNAPSHOT (${now}):`,
    '',
    'Active missions:',
    activeMissions.length > 0 ? activeMissions.join('\n') : '  (none)',
    '',
    'Active projects:',
    projectLines.length > 0 ? projectLines.join('\n') : '  (none)',
    '',
    'System principles:',
    '  • Every task attaches to a project + mission (super-agent-mission-first)',
    '  • Agents do work in the room by default (/007 mode); dispatch is opt-in for parallel work',
    '  • CV4 is the active Corner design surface; CV3 stays sacred for live-prod emergency fixes',
    '  • Voice transcripts persist as source=voice rows; call end fires voice-handoff (no ceremony)',
  ].join('\n')
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini not configured' });

  const { agent, client_id, voice, temperature, model, mode, session_id } = req.body || {};
  const agentSlug = (agent && String(agent).trim()) || 'rex';
  const airpodsMode = mode === 'airpods';

  // No default tenant. This used to fall back to a literal 'aom', which is the
  // single-player assumption in the tenant slot: a Ben-world or Karen-world
  // caller whose frontend hadn't resolved a client id yet was asked to prove
  // access to AOM, failed, and silently lost their workspace. When the body
  // names no world, the CALLER'S OWN world off the verified JWT is the answer.
  const requestedClient = (client_id && String(client_id).trim().toLowerCase()) || null;

  // --- WHO is calling, and MAY they have this room's context? ---------------
  // Two questions, both answered server-side from the JWT. A client-supplied
  // name is never trusted here (RULE 1): the prompt this endpoint returns is
  // exactly what makes an agent treat a sentence as "Patrik said X", and
  // downstream that phrase acts as an authorization token.
  //
  // A VERIFIED SESSION IS THE FLOOR FOR EVERY RESPONSE, because every response
  // carries the Gemini key in `wsUrl`. Merely holding a valid session is not
  // evidence of anything beyond identity — it does not buy workspace context,
  // which still needs the tenant check to pass.
  let tenantAuth = null;
  let who = null;
  try {
    if (requestedClient) {
      // Named world (or `shared:<slug>`, where verifyTenant runs the
      // owner-or-grant check). One auth round trip answers both questions: it
      // returns the caller's canonical userName alongside the tenant decision.
      tenantAuth = await verifyTenant(requestedClient, req);
      who = tenantAuth;
    } else {
      // No world named. Resolve the caller first, then use THEIR world — which
      // satisfies verifyTenant's first rule ("caller world === requested
      // tenant") by construction, so it needs no second gate. Ash and Courtney
      // land in 'aom', Ben in 'arsenal', Karen in hers.
      who = await callerIdentity(req);
      if (!who?.userId) throw new TenantAuthError('jwt required', 401);
      if (who.world) {
        tenantAuth = { tenant: who.world, userId: who.userId, userName: who.userName };
      }
      // A session with no world at all (4 of the 19 live accounts, three of
      // them Patrik's own logins) still gets a call — verified speaker, zero
      // workspace context. It does NOT get a guessed tenant.
    }
  } catch (err) {
    const status = (err && typeof err.status === 'number') ? err.status : 403;
    // 403 = a real cross-world attempt (an arsenal/karens-world session
    // reaching for AOM, or a shared:<slug> room their world holds no
    // project_access grant for and no traffic in). That boundary is hard —
    // deny, don't degrade.
    if (status === 403) {
      return res.status(403).json({ error: err?.message || 'forbidden' });
    }
    // 401 = no JWT / expired JWT. We do not know who this is, and the response
    // body would hand them a live API key, so there is no degraded shape to
    // serve. This is the leak that was open in production.
    if (status === 401) {
      return res.status(401).json({
        error: 'sign in required — voice sessions are issued to verified Corner sessions only',
      });
    }
    // Anything else is the TENANT check failing on its own (RPC unavailable,
    // Supabase misconfigured, a malformed tenant string). Fail open on
    // availability, never on the credential: we still need a verified session,
    // so re-resolve the caller and serve a context-free call only if that
    // succeeds.
    if (!who?.userId) {
      who = await callerIdentity(req).catch(() => null);
    }
    if (!who?.userId) {
      return res.status(401).json({
        error: 'sign in required — voice sessions are issued to verified Corner sessions only',
      });
    }
    tenantAuth = null;
    console.warn(
      `[voice-session] tenant check failed for client_id="${requestedClient}" (${err?.message || err}) — verified caller, serving a no-context session`
    );
  }

  const clientId = tenantAuth?.tenant || null; // set ONLY when verified for this tenant
  // TWO different facts, deliberately not one flag:
  //   sessionVerified — we know who is on the phone. Always true past here.
  //   contextLoaded   — we proved which workspace they may see. Gates DATA.
  const contextLoaded = !!clientId;
  const speakerName = who?.userName || null;

  // Pull live context in parallel — but ONLY once the tenant is proved. The
  // agent persona is fetched either way so an unscoped call still reaches the
  // right agent with the right voice; everything else here is private room data.
  const [agentRow, recentMessages, activeTasks, agentStatuses, tape, recentDone, activeProjects] = contextLoaded
    ? await Promise.all([
        getAgentIdentity(agentSlug),
        getRecentMessages(agentSlug, clientId),
        getTasks(clientId),
        getAgentStatuses(clientId),
        getAgentTape(agentSlug, clientId, { allowLocalTape: isAomWorldRoom(clientId) }),
        getRecentCompleted(clientId),
        getActiveProjects(clientId),
      ])
    : [await getAgentIdentity(agentSlug), [], [], [], '', [], []];

  // Build system instruction with agent identity + live context
  const baseInstruction = buildBaseInstruction(speakerName, { aomWorld: isAomWorldRoom(clientId) });
  let systemInstruction = baseInstruction;
  if (agentRow) {
    systemInstruction = `You are ${agentRow.display_name}. ${agentRow.description || ''}

Personality: ${agentRow.personality || 'Direct, real, gets things done.'}
Voice: ${agentRow.voice_style || 'Natural, human, direct.'}

${baseInstruction}`;
  }

  if (!contextLoaded) {
    // The caller IS signed in past this point — the old copy here said they
    // weren't, which was wrong once an unsigned caller stopped getting a
    // session at all. What failed is workspace RESOLUTION, so say that.
    systemInstruction += `\n\nNO WORKSPACE CONTEXT IS LOADED FOR THIS CALL:
This call is signed in, but the workspace it belongs to could not be resolved, so nothing about it has been loaded — no room history, no tasks, no projects, no missions, no memory of recent work. You genuinely do not have it. Say that plainly if asked, do not invent any of it, and do not repeat workspace details from anywhere else. Do not create, change, approve, or authorize anything on this call: nothing said here can be checked against a room. Ask them which workspace they mean and have them open it on the Corner dashboard.`;
  }

  // Inject workspace snapshot (missions + projects + system principles).
  // Tenant-proved only — this is private workspace data even though the
  // registry half of it ships inside the bundle. The mission list is AOM's tree
  // with no tenant column, so it is withheld outside the AOM world and in
  // shared rooms.
  if (contextLoaded) {
    systemInstruction += `\n\n${buildWorkspaceSnapshot(activeProjects, { includeMissions: isAomWorldRoom(clientId) })}`;
  }

  // Inject tape (agent's long-term memory)
  if (tape) {
    systemInstruction += `\n\nYOUR TAPE (your recent work log, key decisions, what's in flight -- this is your memory):\n${tape}`;
  }

  // Inject live context
  const contextParts = [];

  if (recentMessages.length > 0) {
    // Attribute every human line to whoever actually said it. Rows written
    // before user_name was threaded through carry no author — those render as
    // unattributed, never as Patrik and never as the person on this call.
    const agentLabel = agentRow?.display_name || agentSlug;
    const chatLog = recentMessages
      .map(m => {
        if (m.role === 'user') {
          const author = (m.user_name && String(m.user_name).trim()) || 'Someone (author not recorded)';
          return `${author}: ${m.text}`;
        }
        return `${agentLabel}: ${m.text}`;
      })
      .join('\n');
    // The label used to read "most recent messages with Patrik", which was a
    // lie on two counts: it is the ROOM's shared history (every member of this
    // world, or of this shared room, is entitled to it), and the person on the
    // call is often not Patrik.
    contextParts.push(
      `RECENT CONVERSATION (the most recent messages in THIS room -- shared room history, not any one person's private thread; each line is labelled with who actually said it):\n${chatLog}\n(A line labelled "Someone (author not recorded)" has no recorded author. Do NOT guess who said it, and do NOT assume it was Patrik or the person on this call.)`
    );
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
    const statusList = agentStatuses.map(s => `- ${s.name || s.slug}: ${s.status}${s.current_task ? ` -- ${s.current_task}` : ''}`).join('\n');
    contextParts.push(`AGENT STATUS (who's doing what right now):\n${statusList}`);
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  contextParts.push(`TODAY: ${today}`);

  if (contextParts.length > 0) {
    systemInstruction += `\n\nLIVE CONTEXT (use this to answer questions about what's happening):\n\n${contextParts.join('\n\n')}`;
  }

  if (airpodsMode) {
    systemInstruction += `\n\nAIRPODS MODE — GLOBAL CORNER CONCIERGE:
You are the persistent voice operating layer for Corner CV6, not merely the agent in one room.
Keep replies brief and conversational. The visual interface carries detail.
Routine answers are one or two sentences and usually under 28 spoken words. Lead with the answer. Remove throat-clearing and filler such as “well,” “looks like,” “my bad,” “anything specific,” “anything else,” “move on to something else,” and “want me to try.” Ask at most one question, and only when its answer changes the next action.
Be a useful companion, not a passive narrator. After answering, advance exactly one concrete, capability-backed next step when one exists. Use offer_next_action when authorization is still needed; never vaguely offer to “look into,” “try,” “keep an eye on,” or “let you know” without a tool that can produce that outcome.
In this mode, ignore the base voice-router rule that defers tasks until after the call: create requested internal work during the live conversation with the available tools.
Use the available tools while the conversation is live to read state, navigate CV6, create and update internal work, and route requests to the correct room.
Be action-first. Before saying you are blocked, inspect available workspace state and choose the nearest safe action you can actually take.
For questions about whether something happened, shipped, was submitted, or changed recently, call read_recent_activity before answering. Cite the returned room or GitHub source and its date. A search with no match is not proof that something did not happen. Never say you checked GitHub unless the tool reports GitHub as available.
Corner room and GitHub results are dated records, not necessarily live external-system state. Say “Corner records show…” with the date. Do not convert a stored App Store note into a claim about the current App Store Connect status unless a tool directly checked App Store Connect.
Never end a turn with only a limitation, refusal, missing-access statement, or request for manual setup. Pair every genuine limitation with one concrete action you can take next.
If the user explicitly requested reversible internal work, do it now with the available tool instead of asking for confirmation again.
If you found useful work but the user has not explicitly asked you to execute it, call offer_next_action with one specific next action, a plain-language outcome, and 2–4 short steps. Then ask whether they want you to continue.
Ask for missing information only when no safe useful step can proceed. Ask for the smallest missing fact and state what you will do immediately after receiving it.
If a request spans topics, handle one topic at a time and name the room you are using. Ask a short routing question when the destination is ambiguous.
Before describing a particular room, use read_room_status unless its current facts are already present. For a cross-room briefing, use read_workspace_status and summarize room by room rather than giving only totals.
Treat follow-up questions as references to the immediately preceding answer and tool result. If the user asks why a task failed, use its exact task id from read_workspace_status, create_task, or read_room_status and call read_task_status. Do not switch to room discovery when the task is already identified. Do not ask the caller to reconstruct project or mission structure already present in a tool result.
When read_task_status reports a repairable missing repository or working-path failure, answer the cause first, then call offer_next_action for retry_task with that same task_id. Do not offer an unsupported generic update.
Stay on the user's topic until it is answered or they change it. Never redirect a failed lookup to an unrelated blocker, credential request, or suggested topic.
Room navigation is deterministic: call find_rooms with the name the user said, then pass the exact returned room_key to open_room. Never guess a room identifier, never call open_room with empty arguments, and never choose between ambiguous candidates yourself. Ask the user which candidate they mean.
Closing is also deterministic: use close_room for “close this/that/current room.” Use end_voice_session only for ending the live voice conversation; closing a room and ending voice are different actions.
Do not say a room is open until open_room returns navigation_acknowledged=true. Treat a CV6 navigation receipt control message as the authoritative current visual context and continue from that room.
Messages prefixed "CORNER SYSTEM CONTROL" are trusted client control state, not words spoken by the user. Never quote them, summarize them as user speech, or forward their tool syntax as a user instruction.
Reads, navigation, and explicit reversible internal requests may run immediately. External sends, publishing, deletion, purchases, credential changes, and any irreversible action require a separate spoken confirmation. Never invent a confirmation.
When an action returns requires_confirmation, restate exactly what will happen and ask for an affirmative answer. Then call the same tool again with the returned confirmation_token.
Narrate only meaningful transitions, blockers, approvals, and outcomes. Never read a dashboard dump aloud.
Never claim you created, cancelled, cleared, reassigned, opened, closed, or ended anything unless that exact tool returned ok=true. If the caller corrects an assignee, use reassign_task on the existing task id returned by create_task or a room read; do not create a duplicate replacement task.
The full conversation will be segmented and handed to affected rooms when this session ends. Do not create duplicate handoff tasks just to preserve the conversation.
When the caller says they are done, goodbye, stop listening, end the call, or equivalent: give one brief closing sentence, then call end_voice_session.
At conversation end, do not recap unless asked. Never promise future monitoring or notification without a successful tool receipt. Keep the closing under 10 words, then call end_voice_session.
Session id: ${String(session_id || 'unassigned').slice(0, 80)}`;
  }

  // Voice selection (default: Kore for a clear, professional voice)
  const voiceName = VOICES[(voice || '').toLowerCase()] || 'Kore';

  // Model selection
  const modelId = model || 'gemini-3.1-flash-live-preview';

  // Temperature (0.0 - 2.0, default 0.8 for natural conversation)
  const temp = Math.min(2.0, Math.max(0.0, parseFloat(temperature) || 0.8));

  // WebSocket URL for direct browser connection.
  //
  // ── 2026-08-08, corner:airpods-mode ────────────────────────────────────────
  // The METHOD NAME depends on the credential, and getting it wrong kills every
  // voice session at connect. Verified live against the Live API this date:
  //   BidiGenerateContent             + ?key=<api key>      -> setupComplete
  //   BidiGenerateContent             + ?access_token=<tok> -> CLOSED 1008
  //       "Method doesn't allow unregistered callers (callers without
  //        established identity). Please use API Key or other form of API
  //        consumer identity."
  //   BidiGenerateContentConstrained  + ?access_token=<tok> -> setupComplete
  // We hand the browser an EPHEMERAL TOKEN, so we must use the Constrained
  // method. Sending a token to the plain method is what took down Patrik's
  // first AirPods session (997f4ee8, 2026-08-08 16:24 — 82s, zero words
  // captured): the socket opened and Google closed it before setup.
  //
  // Also verified the same day: systemInstruction IS honored on Constrained
  // (codeword probe came back verbatim), so the speaker-identity and workspace
  // context prompt below still applies. And do NOT pin the model into the token
  // via bidiGenerateContentSetup — a constrained token returns CLOSED 1011
  // "Internal error encountered." The setup message stays client-side.
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained`;

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
          {
            name: 'create_project',
            description: `Create a new project in the workspace. Use when ${speakerName || 'the person on this call'} describes a new client, initiative, or body of work that deserves its own project room. The project gets scaffolded immediately and a room is created. Say "Creating [name] right now" then call this.${contextLoaded ? '' : ' NO WORKSPACE IS RESOLVED FOR THIS CALL — there is no workspace to create it in. Do not call this; ask which workspace they mean and have them open it on the Corner dashboard first.'}`,
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Human-readable project name (e.g. "Phoenix Bakery", "ISA Energy")' },
                description: { type: 'STRING', description: 'One sentence describing what this project is about' },
                team: { type: 'STRING', description: 'Optional comma-separated agent slugs who should work on this (e.g. "alex,cleo,bobby")' },
              },
              required: ['name'],
            },
          },
          {
            name: 'create_mission',
            description: `Create a new mission under an existing project. Use when ${speakerName || 'the person on this call'} identifies a specific initiative, deliverable, or work scope within a project. A mission gets scaffolded and a kickoff message is posted. Say "Creating that mission right now" then call this.${contextLoaded ? '' : ' NO WORKSPACE IS RESOLVED FOR THIS CALL — there is no project tree to attach a mission to. Do not call this; ask which workspace they mean and have them open it on the Corner dashboard first.'}`,
            parameters: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING', description: 'Human-readable mission name (e.g. "Hero Section Redesign", "Google Ads Launch")' },
                project: { type: 'STRING', description: 'The project slug this mission belongs under (use the slug, e.g. "phoenix-bakery", "ambition-mechanical")' },
                description: { type: 'STRING', description: 'One sentence describing what this mission is meant to accomplish' },
              },
              required: ['name', 'project'],
            },
          },
          ...(airpodsMode ? [
            {
              name: 'offer_next_action',
              description: 'Show one concrete action Corner can take next when the user has not explicitly authorized it yet. Do not use this after an explicit request; execute reversible internal work directly instead.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  action: { type: 'STRING', description: 'Supported action: open_room, close_room, open_tool, create_task, reassign_task, retry_task, start_work, manage_attention, read_task_status, read_room_status, read_workspace_status, or read_recent_activity.' },
                  title: { type: 'STRING', description: 'Short outcome-focused title.' },
                  summary: { type: 'STRING', description: 'One sentence explaining what Corner will accomplish.' },
                  arguments: { type: 'OBJECT', description: 'Arguments to use if the user continues.' },
                  steps: { type: 'ARRAY', items: { type: 'STRING' }, description: 'Two to four short steps shown for review.' },
                },
                required: ['action', 'title', 'summary'],
              },
            },
            {
              name: 'read_workspace_status',
              description: 'Read a fresh concise workspace status: active tasks, blockers, recent completions, and agents currently working.',
              parameters: { type: 'OBJECT', properties: {} },
            },
            {
              name: 'read_recent_activity',
              description: 'Search fresh tenant-scoped Corner room history and, when available, recent GitHub commits. Use before answering whether something happened, shipped, was submitted, or changed. Cite returned source labels and dates. No matches are not proof the event did not happen.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  query: { type: 'STRING', description: 'Short factual topic, such as “App Store submission” or “native login”.' },
                  include_github: { type: 'BOOLEAN', description: 'Also check the configured repository. Defaults to true.' },
                },
                required: ['query'],
              },
            },
            {
              name: 'read_task_status',
              description: 'Inspect one exact task and return its current status, assignee, recorded failure reason, attempts, project, mission metadata, and execution path. Use this for “why did that fail?” follow-ups instead of searching for a room.',
              parameters: {
                type: 'OBJECT',
                properties: { task_id: { type: 'STRING', description: 'Exact task UUID from read_workspace_status, create_task, or read_room_status.' } },
                required: ['task_id'],
              },
            },
            {
              name: 'list_rooms',
              description: 'List the authoritative agent, project, and mission rooms available in this workspace. Use for broad discovery; use find_rooms for a named destination.',
              parameters: { type: 'OBJECT', properties: {} },
            },
            {
              name: 'find_rooms',
              description: 'Resolve a spoken room name against the authoritative CV6 room directory. Always call this before open_room. If resolved is null, read the candidate names and ask the user which one they mean.',
              parameters: {
                type: 'OBJECT',
                properties: { query: { type: 'STRING', description: 'The agent, project, or mission room name exactly as the user described it.' } },
                required: ['query'],
              },
            },
            {
              name: 'read_room_status',
              description: 'Read current tasks and recent updates for one room. Resolve the room with find_rooms first and pass its exact room_key.',
              parameters: {
                type: 'OBJECT',
                properties: { room_key: { type: 'STRING', description: 'Exact canonical room_key returned by find_rooms.' } },
                required: ['room_key'],
              },
            },
            {
              name: 'open_room',
              description: 'Open or focus a CV6 room using the exact canonical room_key returned by find_rooms. Success is real only when navigation_acknowledged is true.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  room_key: { type: 'STRING', description: 'Exact canonical room_key returned by find_rooms.' },
                },
                required: ['room_key'],
              },
            },
            {
              name: 'close_room',
              description: 'Close the current CV6 room, or a specific room using the canonical room_key returned by find_rooms. This does not end the voice conversation.',
              parameters: {
                type: 'OBJECT',
                properties: { room_key: { type: 'STRING', description: 'Optional exact canonical room_key. Omit to close the room currently on screen.' } },
              },
            },
            {
              name: 'open_tool',
              description: 'Open a CV6 tool. Supported tools: home, rooms, email, files, command, tracker, scribe, settings, background work.',
              parameters: {
                type: 'OBJECT',
                properties: { tool: { type: 'STRING', description: 'CV6 tool name.' } },
                required: ['tool'],
              },
            },
            {
              name: 'create_task',
              description: 'Create queued internal work under a project mission. The spoken request itself is sufficient confirmation for this reversible internal action.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  title: { type: 'STRING' }, description: { type: 'STRING' },
                  project: { type: 'STRING' }, mission_slug: { type: 'STRING' },
                  agent: { type: 'STRING' },
                },
                required: ['title', 'project', 'mission_slug'],
              },
            },
            {
              name: 'reassign_task',
              description: 'Move an existing task to a different agent after the caller corrects the assignment. Use the exact task id returned by create_task or read_room_status. Do not create a duplicate replacement.',
              parameters: {
                type: 'OBJECT',
                properties: { task_id: { type: 'STRING' }, agent: { type: 'STRING', description: 'Destination agent slug.' } },
                required: ['task_id', 'agent'],
              },
            },
            {
              name: 'retry_task',
              description: 'Repair the authorized repository/working-path scope on one failed task and requeue that existing task. Use only after the caller explicitly asks to retry, rerun, repair and continue, or approves a retry proposal. Never create a replacement task.',
              parameters: {
                type: 'OBJECT',
                properties: { task_id: { type: 'STRING', description: 'Exact failed task UUID from read_task_status, read_workspace_status, or read_room_status.' } },
                required: ['task_id'],
              },
            },
            {
              name: 'start_work',
              description: 'Send a scoped instruction to a Corner room so its agent begins work.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  instruction: { type: 'STRING' }, agent: { type: 'STRING' },
                  project: { type: 'STRING' }, mission_slug: { type: 'STRING' },
                },
                required: ['instruction'],
              },
            },
            {
              name: 'manage_attention',
              description: 'Acknowledge or snooze one or more proactive Corner follow-up items.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  item_ids: { type: 'ARRAY', items: { type: 'STRING' } },
                  operation: { type: 'STRING', description: 'acknowledge or snooze' },
                  minutes: { type: 'NUMBER', description: 'Snooze duration, default 15.' },
                },
                required: ['item_ids', 'operation'],
              },
            },
            {
              name: 'confirm_consequential_action',
              description: 'Execute a previously staged consequential action only after the caller explicitly confirmed it.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  confirmation_token: { type: 'STRING' },
                  confirmed: { type: 'BOOLEAN' },
                },
                required: ['confirmation_token', 'confirmed'],
              },
            },
            {
              name: 'end_voice_session',
              description: 'End the current live voice session naturally after the caller indicates they are finished.',
              parameters: { type: 'OBJECT', properties: {} },
            },
          ] : []),
        ],
      }],
    },
  };

  let ephemeralToken;
  try {
    ephemeralToken = await createEphemeralToken();
  } catch (error) {
    console.error('[voice-session] ephemeral token provisioning failed:', error?.message || error);
    return res.status(502).json({ error: 'Voice provider session could not be created' });
  }

  return res.status(200).json({
    wsUrl: `${wsUrl}?access_token=${encodeURIComponent(ephemeralToken)}`,
    setupMessage,
    voiceName,
    temperature: temp,
    model: modelId,
    agent: agentSlug,
    availableVoices: Object.keys(VOICES),
    availableModels: ['gemini-3.1-flash-live-preview'],
    // Who the server decided is on this call, and whether workspace context was
    // loaded. DISPLAY ONLY — the UI can show "signed in as X" or an
    // unverified-session warning.
    //
    // DO NOT echo these back to any write endpoint as attribution. A value that
    // round-trips through the browser is client-supplied by definition, and
    // attribution must be re-derived server-side from the JWT (callerIdentity
    // in api/_lib/verifyTenant.js) on every write path.
    caller: {
      name: speakerName,           // null = name unresolvable; render "unknown", never "Patrik"
      // Always true now: an unverified caller never reaches this response,
      // because the response carries a live API key. Kept so existing UI that
      // reads it keeps working.
      verified: true,
      // The one that actually varies: did we prove which workspace this call
      // belongs to? false = signed in, but no room history / tasks / projects /
      // missions were loaded and the model was told so.
      contextLoaded,
    },
  });
}
