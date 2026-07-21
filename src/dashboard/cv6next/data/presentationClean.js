// Small, pure presentation guards shared by Home and Email. They keep machine
// plumbing and duplicate transport text out of the human-facing mobile UI.

const OPS_TEXT = /^\s*(?:chat-serving alert|bridge counter alert|supervisor alert|watchdog alert|bridge supervisor alert)\b/i;

export function isRoomActivityNoise(message = {}) {
  const metadata = message.metadata || {};
  const source = String(metadata.source || metadata.service || '').toLowerCase();
  if (metadata.kind === 'ops-alert' || metadata.supervisor_alert === true) return true;
  if (source === 'bridge-supervisor' || source === 'watchdog') return true;
  return OPS_TEXT.test(String(message.text || message.last_message_text || ''));
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function comparable(value) {
  return compact(value)
    .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, '')
    .replace(/[\s.\-–—:]+$/g, '')
    .toLowerCase();
}

export function mailListSnippet(senderValue, subjectValue, bodyValue) {
  const sender = compact(senderValue) || 'Someone';
  const subject = comparable(subjectValue);
  let body = compact(bodyValue);

  // Some mail transports hand the list the subject as their only "snippet".
  // Repeating it beneath the subject creates the doubled rows seen in production.
  if (!body || (subject && comparable(body) === subject)) return sender;

  const senderPrefix = new RegExp(`^${sender.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[·|:\-]\\s*`, 'i');
  body = body.replace(senderPrefix, '').trim();
  if (!body || (subject && comparable(body) === subject)) return sender;

  return `${sender} · ${body.slice(0, 140)}`;
}
