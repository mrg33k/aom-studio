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

// ── Preview hygiene (room-row contract §3) ───────────────────────────────────
// A room's preview line is what a person said, or what an agent said TO a person.
// It is never transport. The defect this exists for: the Native iOS room on the
// mobile home previewed "Received — corner-native-ios send reached the dispatcher."
// — a delivery ack for a smoke test, indistinguishable from a real reply by role
// (assistant) or source (room-bridge, the normal chat path). So the test is the
// TEXT SHAPE, not the transport that carried it.
//
// Contract: this drops the PREVIEW only. The room stays on the list with its real
// name, tint, time and unread dot — a room you touched is still a room you touched.
// isRoomActivityNoise (above) is the harsher one that drops the whole row.
const MACHINE_PREVIEW = [
  // 1. The bridge's canned delivery acknowledgement.
  /^\s*(?:received|acknowledged|ack)\s*[—–-]\s/i,
  // 2. Dispatch + task plumbing leaking into prose.
  /\[dispatch task\b/i,
  /\btask-complete(?:\.sh)?\b/i,
  /\bstatus\s*=\s*'?(?:queued|running|needs_input)'?/i,
  /\b(?:needs_input|run_in_background|task_id)\b/i,
  // 3. Test / probe / acceptance chatter.
  /\b(?:smoke|probe|acceptance|regression|e2e)[\s-](?:test|check|ping|run|probe)\b/i,
  /\b(?:test|probe)\s+(?:ping|payload|message|send)\b/i,
  /^\s*r\d+\b[^.]*\bcheck\b/i,
  // 4. Internal identifiers surfacing as prose: room_id shapes and bare uuids.
  /\b[a-z0-9][a-z0-9-]*:(?:agent|project|mission):[a-z0-9:._-]+/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  // 5. Machine paths and command text.
  /(?:^|\s)\/(?:Users|tmp|var)\//,
  /(?:^|\s)(?:src|api|scripts|node_modules)\/[a-z0-9._-]+\//i,
  /\borigin\/(?:main|master)\b/i,
  /\b(?:npm run|npx |node --test|git (?:commit|push|pull|fetch|checkout|merge|rebase|status|log|stash))\b/i,
];

export function isMachinePreview(text, message = {}) {
  const t = String(text == null ? (message.text || message.last_message_text || '') : text).trim();
  if (!t) return false;
  // A structured payload is never a sentence.
  if (t.startsWith('{') || t.startsWith('[')) return true;
  return MACHINE_PREVIEW.some((re) => re.test(t));
}

/// The one call every renderer should make: the preview a human should read, or ''.
export function humanPreview(text, message = {}) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return isMachinePreview(t, message) ? '' : t;
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
