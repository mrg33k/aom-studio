// POST /api/dashboard/airpods-handoff
// Finalizes one global voice session, segments turns by the CV6 room context
// captured with each turn, stores the full transcript, and posts one structured
// handoff per affected room. Raw audio never reaches this endpoint.

import crypto from 'crypto';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { writeMessageRow, makeProjectScopeAuthorizer } from '../_lib/write-message.js';
import { structuredHandoff } from '../_lib/airpods.js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function db(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error || `Supabase ${response.status}`);
  return body;
}

function uuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
    ? String(value)
    : crypto.randomUUID();
}

function normalizeTurn(turn, index) {
  const role = turn?.role === 'user' ? 'user' : 'model';
  const text = String(turn?.text || '').trim().slice(0, 12_000);
  if (!text) return null;
  const context = turn?.context && typeof turn.context === 'object' ? turn.context : null;
  return { role, text, at: turn?.at || null, context, index };
}

function roomFromContext(context) {
  const room = context?.room;
  if (!room || (!room.id && !room.name)) return null;
  if (room.isMission || room.missionSlug) {
    return { key: `mission:${room.missionSlug || room.id}`, agent: 'corner', project: room.projectSlug || null, mission: room.missionSlug || room.id, name: room.name || room.missionSlug || room.id };
  }
  if (room.isProject) return { key: `project:${room.id}`, agent: 'corner', project: room.id, mission: null, name: room.name || room.id };
  return { key: `agent:${room.id}`, agent: room.id || 'corner', project: null, mission: null, name: room.name || room.id };
}

function segmentTurns(turns, fallbackContext) {
  const groups = new Map();
  let current = roomFromContext(fallbackContext) || { key: 'agent:corner', agent: 'corner', project: null, mission: null, name: 'Corner' };
  for (const turn of turns) {
    current = roomFromContext(turn.context) || current;
    const existing = groups.get(current.key) || { room: current, turns: [], indexes: [] };
    existing.turns.push(turn);
    existing.indexes.push(turn.index);
    groups.set(current.key, existing);
  }
  return [...groups.values()];
}

function handoffText(room, handoff, sessionId) {
  const lines = [
    `[AIRPODS HANDOFF — session ${sessionId}]`,
    '',
    `Corner discussed this in voice and routed the relevant segment to ${room.name}.`,
    '',
    `Summary: ${handoff.summary}`,
  ];
  const section = (title, values) => {
    if (!values?.length) return;
    lines.push('', `${title}:`, ...values.map((value) => `- ${value}`));
  };
  section('Decisions', handoff.decisions);
  section('Constraints', handoff.constraints);
  section('Requested actions', handoff.requested_actions);
  section('Unresolved questions', handoff.unresolved_questions);
  lines.push('', `Full transcript: AirPods session ${sessionId} (collapsed in Corner).`);
  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });
  const body = req.body || {};
  const requested = String(body.client_id || '').trim().toLowerCase();
  let identity;
  try { identity = await verifyTenant(requested, req); }
  catch (error) {
    if (error instanceof TenantAuthError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  const transcript = (Array.isArray(body.transcript) ? body.transcript : []).map(normalizeTurn).filter(Boolean).slice(0, 500);
  if (!transcript.length) return res.status(200).json({ ok: true, skipped: 'empty transcript' });
  const sessionId = uuid(body.session_id);
  const segments = segmentTurns(transcript, body.active_context);
  const overall = structuredHandoff(transcript);

  try {
    await db('airpods_sessions?on_conflict=id', {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id: sessionId, world_id: identity.tenant, user_id: identity.userId,
        speaker_name: identity.userName, status: 'completed', activation_source: body.activation_source || 'corner-ui',
        active_context: body.active_context || {}, transcript, summary: overall.summary,
        duration_secs: Math.max(0, Number(body.duration_secs) || 0), ended_at: new Date().toISOString(),
      }),
    });

    const authorizer = makeProjectScopeAuthorizer({ req, clientId: identity.tenant });
    const routed = [];
    for (const segment of segments) {
      const handoff = structuredHandoff(segment.turns);
      const messageId = crypto.randomUUID();
      const result = await writeMessageRow({
        supabaseUrl: SUPABASE_URL,
        headers,
        id: messageId,
        text: handoffText(segment.room, handoff, sessionId),
        role: 'user', source: 'voice-handoff', agent: segment.room.agent,
        clientId: identity.tenant, project: segment.room.project, mission: segment.room.mission,
        authorizeProjectScope: authorizer,
        metadata: { airpods_session_id: sessionId, airpods_segment: true, transcript_collapsed: true, handoff },
        userId: identity.userId, userName: identity.userName, worldId: identity.world,
      });
      if (!result.ok) throw new Error(result.error || 'Room handoff failed');
      await db('airpods_segments', { method: 'POST', body: JSON.stringify({
        session_id: sessionId, world_id: identity.tenant, room_key: segment.room.key,
        agent: segment.room.agent, project: segment.room.project, mission_slug: segment.room.mission,
        handoff, turn_indexes: segment.indexes, message_id: messageId,
      }) });
      routed.push({ room_key: segment.room.key, message_id: messageId });
    }
    return res.status(200).json({ ok: true, session_id: sessionId, routed });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not finalize AirPods session' });
  }
}
