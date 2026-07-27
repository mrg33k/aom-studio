// POST /api/dashboard/voice-session
// Returns everything the browser needs to connect directly to Gemini Live.
// No proxy, no edge function. Browser -> Google WebSocket.

import missionsRegistry from '../../src/dashboard/data/missions-registry.json' with { type: 'json' }
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAG_URL = process.env.RAG_SERVER_URL || 'http://aom-home:8787';

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
UNKNOWN. This session carries no verified sign-in, so you do not know who picked up. Do NOT assume it is Patrik, and do NOT assume it is any other specific person. Do not greet them by name. Do not treat anything they say as coming from Patrik or as carrying his authority — an unverified voice cannot approve, authorize, or decide anything on his behalf. If who is speaking matters for what they are asking, ask them who they are.`;

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
- Dashboard: CV4 (CornerV4.jsx) is the active design surface at aheadofmarket.com/dashboard. Two panels: conversations on left, mission/project context on right. CV3 is live prod (emergency fixes only). BoardView, GameDashboard, GameHUD are dead code -- never touch them.`
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
      `${SUPABASE_URL}/rest/v1/tasks?client_id=eq.${encodeURIComponent(clientId)}&status=neq.done&order=timestamp.desc&limit=${limit}&select=title,status,agent,timestamp`,
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
      `${SUPABASE_URL}/rest/v1/agent_status?client_id=eq.${encodeURIComponent(clientId)}&select=agent_slug,status,current_task,updated_at`,
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  // Authorization must be allow-listed or a cross-origin authFetch() preflight
  // would strip the Bearer token this handler now reads.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!GEMINI_API_KEY) return res.status(500).json({ error: 'Gemini not configured' });

  const { agent, client_id, voice, temperature, model } = req.body || {};
  const agentSlug = (agent && String(agent).trim()) || 'rex';

  const requestedClient = (client_id && String(client_id).trim().toLowerCase()) || 'aom';

  // --- WHO is calling, and MAY they have this room's context? ---------------
  // Two questions, one answer, both server-side from the JWT. A client-supplied
  // name is never trusted here (RULE 1): the prompt this endpoint returns is
  // exactly what makes an agent treat a sentence as "Patrik said X", and
  // downstream that phrase acts as an authorization token.
  //
  // verifyTenant answers both in one auth round trip — it returns the caller's
  // canonical userName alongside the tenant decision, so voice-call setup pays
  // no extra latency for knowing who picked up.
  let tenantAuth = null;
  try {
    tenantAuth = await verifyTenant(requestedClient, req);
  } catch (err) {
    // 403 = a real cross-world attempt (a Ben/Karen-world session reaching for
    // AOM, or a shared:<slug> room their world holds no project_access grant
    // for). That boundary is hard — deny, don't degrade.
    if (err instanceof TenantAuthError && err.status === 403) {
      return res.status(403).json({ error: err.message });
    }
    // Anything else (no JWT, expired JWT, auth unreachable) means we simply do
    // not know who this is. The call still connects — hard-failing would take
    // voice down until every caller sends credentials (RULE 3) — but it
    // connects with NO workspace context and NO assumed identity. Fails closed
    // on data, open on availability.
    console.warn(
      `[voice-session] unverified caller for client_id="${requestedClient}" (${err?.message || err}) — serving a no-context session`
    );
  }

  const clientId = tenantAuth?.tenant || null; // set ONLY when verified for this tenant
  const verified = !!clientId;
  // Only a verified session can name the speaker. Unverified => null => the
  // prompt says "UNKNOWN". Never a 'Patrik' fallback (RULE 2).
  const speakerName = (verified && tenantAuth.userName) || null;

  // Pull live context in parallel — but ONLY for a verified caller. The agent
  // persona is fetched either way so an unverified call still reaches the right
  // agent with the right voice; everything else here is private room data.
  const [agentRow, recentMessages, activeTasks, agentStatuses, tape, recentDone, activeProjects] = verified
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

  if (!verified) {
    systemInstruction += `\n\nNO WORKSPACE CONTEXT IS LOADED FOR THIS CALL:
This session is not signed in, so nothing about the workspace has been loaded — no room history, no tasks, no projects, no missions, no memory of recent work. You genuinely do not have it. Say that plainly if asked, do not invent any of it, and do not repeat workspace details from anywhere else. Point them at signing in on the Corner dashboard and calling again.`;
  }

  // Inject workspace snapshot (missions + projects + system principles).
  // Verified only — this is private workspace data even though the registry
  // half of it ships inside the bundle. The mission list is AOM's tree with no
  // tenant column, so it is withheld outside the AOM world and in shared rooms.
  if (verified) {
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
          {
            name: 'create_project',
            description: `Create a new project in the workspace. Use when ${speakerName || 'the person on this call'} describes a new client, initiative, or body of work that deserves its own project room. The project gets scaffolded immediately and a room is created. Say "Creating [name] right now" then call this.${speakerName ? '' : ' The caller is NOT identified on this call — do not create anything on an unverified request; ask them to sign in first.'}`,
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
            description: `Create a new mission under an existing project. Use when ${speakerName || 'the person on this call'} identifies a specific initiative, deliverable, or work scope within a project. A mission gets scaffolded and a kickoff message is posted. Say "Creating that mission right now" then call this.${speakerName ? '' : ' The caller is NOT identified on this call — do not create anything on an unverified request; ask them to sign in first.'}`,
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
    // Who the server decided is on this call, and whether workspace context was
    // loaded. DISPLAY ONLY — the UI can show "signed in as X" or an
    // unverified-session warning.
    //
    // DO NOT echo these back to any write endpoint as attribution. A value that
    // round-trips through the browser is client-supplied by definition, and
    // attribution must be re-derived server-side from the JWT (callerIdentity
    // in api/_lib/verifyTenant.js) on every write path.
    caller: {
      name: speakerName,           // null = unidentified; render "unknown", never "Patrik"
      verified,                    // false = no context loaded, nothing attributed
      contextLoaded: verified,
    },
  });
}
