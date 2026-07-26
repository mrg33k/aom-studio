// POST /api/dashboard/move-message
//
// Move a just-sent front-door message out of the room the router picked and into the room
// the user actually meant, leaving no trace in the wrong one.
//
// WHY (corner:front-door R8, 2026-07-25). The router auto-opens a room when it claims
// confidence >= 0.85. Measured against 74 of Patrik's real messages it reports ~0.9 almost
// regardless of how thin its reasoning is, so that bar gates very little and roughly one in
// five sends still opens the wrong room. Calibrating the number further was tried and barely
// moved. The structural answer is not a better guess: it is showing the user where the
// message went and letting them correct it in one tap.
//
// Correcting has to be a real move, not a second copy. The wrong room must end up looking
// like the message was never sent there — otherwise "change it" leaves a mess behind and
// nobody uses it twice.
//
// Body:
//   { client_id, message_id, text, to: { project?, mission_slug?, agent? }, interaction_mode? }
//
// Deletes message_id, plus any ASSISTANT rows in that same room that landed after it (the
// agent's reply to a message that is being retracted, which would otherwise be orphaned).
// That sweep is bounded: only rows between the moved message and now, only when the move
// happens within MOVE_WINDOW_MS, and only in that one room — so a slow reply to some
// earlier message in a busy room is never collected.

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';
import { writeMessageRow } from '../_lib/write-message.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const DEFAULT_CLIENT_ID = 'aom';
// A move is a correction of something the user JUST sent. Past this, the reply sweep is
// unsafe (the conversation has moved on) so the original is left where it is.
const MOVE_WINDOW_MS = 15 * 60 * 1000;

async function sb(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { ok: res.ok, status: res.status, json, text };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: 'Supabase not configured' });

  const body = req.body || {};
  const requested = (body.client_id && String(body.client_id).trim())
    ? String(body.client_id).trim().toLowerCase()
    : DEFAULT_CLIENT_ID;
  let clientId;
  try {
    ({ tenant: clientId } = await verifyTenant(requested, req));
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message });
    throw err;
  }

  // Sweep-only pass. The reply sweep below can only remove what EXISTS when the move runs,
  // and the agent in the wrong room is typically mid-reply at that moment — so its answer
  // lands a second later and survives, leaving an orphan reply under no question. (Found by
  // the Front Door room auditing its own transcript after a live test, 2026-07-25.) The
  // client fires this second pass a little later to collect exactly that straggler.
  if (body.sweep_for) {
    const s = body.sweep_for;
    const after = String(s.after || '').trim();
    if (!after) return res.status(400).json({ error: 'sweep_for.after required' });
    if (Date.now() - new Date(after).getTime() > MOVE_WINDOW_MS) {
      return res.status(200).json({ ok: true, removed_count: 0, reason: 'outside the correction window' });
    }
    const filter = s.mission_slug
      ? `metadata->>mission_slug=eq.${encodeURIComponent(s.mission_slug)}`
      : s.project
        ? `project=eq.${encodeURIComponent(s.project)}&metadata->>mission_slug=is.null`
        : `agent=eq.${encodeURIComponent(s.agent || '')}&project=is.null`;
    const rows = await sb('GET',
      `messages?client_id=eq.${encodeURIComponent(clientId)}&${filter}`
      + `&role=neq.user&timestamp=gt.${encodeURIComponent(after)}&select=id&order=timestamp.asc&limit=20`);
    let n = 0;
    for (const r of (Array.isArray(rows.json) ? rows.json : [])) {
      // eslint-disable-next-line no-await-in-loop -- a handful of rows at most.
      const d = await sb('DELETE', `messages?id=eq.${encodeURIComponent(r.id)}`);
      if (d.ok) n += 1;
    }
    return res.status(200).json({ ok: true, removed_count: n, sweep_only: true });
  }

  const messageId = String(body.message_id || '').trim();
  const to = body.to || {};
  const text = String(body.text || '').trim();
  if (!messageId) return res.status(400).json({ error: 'message_id required' });
  if (!text) return res.status(400).json({ error: 'text required' });
  if (!to.project && !to.mission_slug && !to.agent) {
    return res.status(400).json({ error: 'to.project, to.mission_slug or to.agent required' });
  }

  // Read the original first: it proves the row belongs to this tenant, and its room +
  // timestamp are what bound the reply sweep.
  const found = await sb('GET', `messages?id=eq.${encodeURIComponent(messageId)}&select=id,client_id,project,agent,metadata,timestamp,role&limit=1`);
  const original = Array.isArray(found.json) ? found.json[0] : null;
  if (!original) return res.status(404).json({ error: 'message not found' });
  if (original.client_id !== clientId) return res.status(403).json({ error: 'not your message' });
  if (original.role !== 'user') return res.status(400).json({ error: 'only a message you sent can be moved' });

  const sentAt = original.timestamp ? new Date(original.timestamp).getTime() : 0;
  const withinWindow = sentAt > 0 && (Date.now() - sentAt) < MOVE_WINDOW_MS;

  // 1. Write into the destination FIRST. If this fails the user still has their message
  //    where it was, which is recoverable; deleting first could lose it outright.
  //
  // Goes through writeMessageRow, the same writer supabase-messages uses, rather than a
  // hand-rolled insert: it mints the row id (the table has no default — a direct insert
  // fails 23502 on a null id), derives room_id, and canonicalizes the mission slug. A
  // moved message has to be indistinguishable from one sent to that room in the first
  // place, and reusing the canonical writer is the only way to keep that true as the row
  // shape changes.
  const mode = body.interaction_mode === 'plan' ? 'plan' : 'work';
  const inserted = await writeMessageRow({
    supabaseUrl: SUPABASE_URL,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    text,
    role: 'user',
    source: 'corner-dashboard',
    agent: to.agent || 'corner',
    clientId,
    project: to.mission_slug ? (to.project || String(to.mission_slug).split(':')[0]) : (to.project || null),
    mission: to.mission_slug ? String(to.mission_slug) : null,
    metadata: {
      interaction_mode: mode,
      // Provenance: this message was re-homed by the user after the router guessed wrong.
      // Keeps the routing miss auditable instead of silently disappearing.
      moved_from: { project: original.project || null, mission_slug: original?.metadata?.mission_slug || null, agent: original.agent || null },
    },
  });
  if (!inserted.ok) {
    return res.status(inserted.status || 500).json({ error: `could not write to the new room: ${String(inserted.error || '').slice(0, 160)}` });
  }

  // 2. Remove the original, and the reply it drew, from the room it should never have
  //    been in. Scoped to that exact room and that exact time slice.
  const removed = [];
  const delOriginal = await sb('DELETE', `messages?id=eq.${encodeURIComponent(messageId)}`);
  if (delOriginal.ok) removed.push(messageId);

  if (withinWindow) {
    const roomFilter = original?.metadata?.mission_slug
      ? `metadata->>mission_slug=eq.${encodeURIComponent(original.metadata.mission_slug)}`
      : original.project
        ? `project=eq.${encodeURIComponent(original.project)}&metadata->>mission_slug=is.null`
        : `agent=eq.${encodeURIComponent(original.agent || '')}&project=is.null`;
    const replies = await sb(
      'GET',
      `messages?client_id=eq.${encodeURIComponent(clientId)}&${roomFilter}`
      + `&role=neq.user&timestamp=gt.${encodeURIComponent(original.timestamp)}&select=id&order=timestamp.asc&limit=20`
    );
    for (const r of (Array.isArray(replies.json) ? replies.json : [])) {
      // eslint-disable-next-line no-await-in-loop -- a handful of rows at most.
      const d = await sb('DELETE', `messages?id=eq.${encodeURIComponent(r.id)}`);
      if (d.ok) removed.push(r.id);
    }
  }

  return res.status(200).json({
    ok: true,
    message: inserted.row || null,
    removed_count: removed.length,
    swept_replies: withinWindow,
    // Everything the client needs to run the follow-up sweep for a reply that was still
    // being written when this pass ran.
    sweep_for: {
      project: original.project || null,
      mission_slug: original?.metadata?.mission_slug || null,
      agent: original.agent || null,
      after: original.timestamp,
    },
  });
}
