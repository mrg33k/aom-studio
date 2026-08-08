import crypto from 'crypto';

export const AIRPODS_ACTION_AUTHORITY = Object.freeze({
  read_workspace_status: 'auto', list_rooms: 'auto', read_room_status: 'auto', open_room: 'auto', open_tool: 'auto', navigate: 'auto',
  create_task: 'internal-explicit', start_work: 'internal-explicit',
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

export function structuredHandoff(turns) {
  const safe = (Array.isArray(turns) ? turns : []).filter((turn) => turn && String(turn.text || '').trim());
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
