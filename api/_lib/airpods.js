import crypto from 'crypto';

export const AIRPODS_ACTION_AUTHORITY = Object.freeze({
  read_workspace_status: 'auto', read_recent_activity: 'auto', list_rooms: 'auto', find_rooms: 'auto', read_room_status: 'auto', open_room: 'auto', close_room: 'auto', open_tool: 'auto', navigate: 'auto', end_voice_session: 'auto',
  create_task: 'internal-explicit', reassign_task: 'internal-explicit', start_work: 'internal-explicit',
  manage_attention: 'internal-explicit',
  send_email: 'confirm', publish: 'confirm', delete: 'confirm', purchase: 'confirm',
  change_credentials: 'confirm',
});

export const AIRPODS_ALLOWED_ACTIONS = new Set(Object.keys(AIRPODS_ACTION_AUTHORITY));

export function authorityForAction(action) {
  return AIRPODS_ACTION_AUTHORITY[action] || 'confirm';
}

export function cleanArguments(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function idempotencyKey({ supplied, sessionId, action, args }) {
  if (supplied && /^[a-zA-Z0-9:_-]{8,160}$/.test(supplied)) return supplied;
  const body = JSON.stringify([sessionId || '', action || '', cleanArguments(args)]);
  return crypto.createHash('sha256').update(body).digest('hex');
}

export function signConfirmation(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyConfirmation(token, secret) {
  const [encoded, signature] = String(token || '').split('.');
  if (!encoded || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

export function normalizeRoomTerm(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function publicRoomCandidate(candidate) {
  return {
    room_key: candidate.room_key,
    room_name: candidate.room_name,
    room_type: candidate.room_type,
    project: candidate.project || null,
  };
}

export function resolveRoomCandidate(candidates, input) {
  const rooms = (Array.isArray(candidates) ? candidates : []).filter((room) => room?.room_key && room?.room_name);
  const requestedKey = String(input?.room_key || '').trim();
  if (requestedKey) {
    const exactKey = rooms.find((room) => room.room_key === requestedKey);
    return exactKey
      ? { resolved: exactKey, candidates: [publicRoomCandidate(exactKey)] }
      : { resolved: null, candidates: [], reason: 'unknown_room_key' };
  }

  const rawQuery = normalizeRoomTerm(input?.room_query || input?.query || input?.room_id || input?.room_name);
  const genericRoomWords = new Set(['the', 'a', 'an', 'this', 'that', 'current', 'room', 'mission', 'project', 'agent', 'chat', 'conversation', 'under', 'main']);
  const conversationalQuery = rawQuery.split(' ').filter((token) => !genericRoomWords.has(token)).join(' ');
  const query = conversationalQuery || rawQuery;
  if (!query) return { resolved: null, candidates: [], reason: 'room_query_required' };
  const scored = rooms.map((room) => {
    const values = [room.room_name, room.slug, room.room_key, ...(room.aliases || [])]
      .map(normalizeRoomTerm).filter(Boolean);
    let score = 0;
    for (const value of values) {
      if (value === query) score = Math.max(score, 100);
      else if (value.endsWith(`:${query}`)) score = Math.max(score, 96);
      else if (value.startsWith(query)) score = Math.max(score, 82);
      else if (value.includes(query)) score = Math.max(score, 68);
      else {
        const tokens = query.split(' ').filter(Boolean);
        if (tokens.length && tokens.every((token) => value.includes(token))) score = Math.max(score, 60);
      }
    }
    return { room, score };
  }).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.room.room_name.localeCompare(b.room.room_name));

  const top = scored[0];
  const second = scored[1];
  const unambiguous = top && top.score >= 82 && (!second || top.score - second.score >= 12);
  return {
    resolved: unambiguous ? top.room : null,
    candidates: scored.slice(0, 5).map((entry) => publicRoomCandidate(entry.room)),
    reason: top ? 'ambiguous_room' : 'room_not_found',
  };
}

export function isInternalVoiceControlTurn(turn) {
  const origin = String(turn?.origin || '').toLowerCase();
  if (origin === 'control' || origin === 'qa-script') return true;
  const text = String(turn?.text || '').trim();
  return turn?.role === 'user' && /^yes, continue with [“"].+?[”"] now\. use action [a-z_]+ with these arguments:/i.test(text);
}

export function structuredHandoff(turns) {
  const safe = (Array.isArray(turns) ? turns : []).filter((turn) => turn && String(turn.text || '').trim() && !isInternalVoiceControlTurn(turn));
  const userText = safe.filter((turn) => turn.role === 'user').map((turn) => String(turn.text).trim());
  const joined = userText.join(' ');
  const sentences = joined.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
  const decisions = sentences.filter((line) => /\b(decid|will|need to|must|should|let'?s|want)\b/i.test(line)).slice(0, 8).map((line) => line.trim());
  const questions = sentences.filter((line) => /\?$/.test(line.trim())).slice(0, 8).map((line) => line.trim());
  return {
    summary: joined.slice(0, 900) || 'Voice conversation completed.',
    decisions,
    constraints: sentences.filter((line) => /\b(can't|cannot|don't|must not|constraint|only|never)\b/i.test(line)).slice(0, 8).map((line) => line.trim()),
    exact_wording: userText.filter((line) => line.length <= 280).slice(0, 6),
    requested_actions: sentences.filter((line) => /\b(create|build|send|update|run|make|open|check|notify|follow)\b/i.test(line)).slice(0, 10).map((line) => line.trim()),
    unresolved_questions: questions,
  };
}
