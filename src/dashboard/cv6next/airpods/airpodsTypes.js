export const AIRPODS_STATES = Object.freeze([
  'off', 'armed', 'attention-prompt', 'connecting', 'listening',
  'thinking', 'speaking', 'confirming', 'paused', 'error',
]);

export const DEFAULT_AIRPODS_PREFERENCES = Object.freeze({
  enabled: false,
  wakePhrase: 'Hey Corner',
  shortcut: 'Meta+Shift+Space',
  cadenceMinutes: 2,
  quietHoursStart: '21:00',
  quietHoursEnd: '08:00',
  allowUrgentOverride: false,
  proactiveVoice: true,
  priorities: ['approval', 'blocker', 'failure', 'requested', 'completion'],
  roomFilters: [],
  wakeSensitivity: 0.58,
});

export const ATTENTION_PRIORITY = Object.freeze({
  approval: 100,
  blocker: 90,
  failure: 80,
  requested: 70,
  question: 65,
  completion: 50,
  progress: 20,
});

export const ACTION_AUTHORITY = Object.freeze({
  read_workspace_status: 'auto',
  read_room_status: 'auto',
  search_corner: 'auto',
  navigate: 'auto',
  open_room: 'auto',
  open_tool: 'auto',
  create_project: 'internal-explicit',
  create_mission: 'internal-explicit',
  create_task: 'internal-explicit',
  start_work: 'internal-explicit',
  update_context: 'internal-explicit',
  update_checklist: 'internal-explicit',
  manage_attention: 'internal-explicit',
  send_email: 'confirm',
  publish: 'confirm',
  delete: 'confirm',
  purchase: 'confirm',
  change_credentials: 'confirm',
});

export function actionAuthority(action) {
  return ACTION_AUTHORITY[String(action || '').trim()] || 'confirm';
}

export function normalizeAirPodsPreferences(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const cadence = [1, 2, 5, 15, 0].includes(Number(raw.cadenceMinutes))
    ? Number(raw.cadenceMinutes)
    : DEFAULT_AIRPODS_PREFERENCES.cadenceMinutes;
  return {
    ...DEFAULT_AIRPODS_PREFERENCES,
    ...raw,
    cadenceMinutes: cadence,
    priorities: Array.isArray(raw.priorities) ? raw.priorities : DEFAULT_AIRPODS_PREFERENCES.priorities,
    roomFilters: Array.isArray(raw.roomFilters) ? raw.roomFilters : [],
  };
}

export function inQuietHours(now, preferences) {
  const prefs = normalizeAirPodsPreferences(preferences);
  const [sh, sm] = String(prefs.quietHoursStart).split(':').map(Number);
  const [eh, em] = String(prefs.quietHoursEnd).split(':').map(Number);
  if (![sh, sm, eh, em].every(Number.isFinite)) return false;
  const minute = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

export function rankAttentionItems(items, preferences, now = new Date()) {
  const prefs = normalizeAirPodsPreferences(preferences);
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && item.id && item.status !== 'acknowledged')
    .filter((item) => prefs.priorities.includes(item.priority || 'progress'))
    .filter((item) => !prefs.roomFilters.length || prefs.roomFilters.includes(item.room_key))
    .filter((item) => {
      const key = `${item.source_type || 'item'}:${item.source_id || item.id}:${item.version || 0}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (item.snoozed_until && new Date(item.snoozed_until) > now) return false;
      return true;
    })
    .sort((a, b) => {
      const ap = ATTENTION_PRIORITY[a.priority] || 0;
      const bp = ATTENTION_PRIORITY[b.priority] || 0;
      if (ap !== bp) return bp - ap;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
}

export function attentionPrompt(count, seed = Date.now()) {
  const single = [
    'Hey, do you have a second?',
    'When you have a moment, I have something for you.',
    'Quick check-in when you are ready.',
  ];
  const multiple = [
    `Do you have a second? I have ${count} things to go over.`,
    `When you are ready, I have ${count} updates for you.`,
    `Quick check-in: I have ${count} things queued up.`,
  ];
  const choices = count > 1 ? multiple : single;
  return choices[Math.abs(Number(seed) || 0) % choices.length];
}

export function airPodsReducer(state, event) {
  switch (event.type) {
    case 'ARM': return { ...state, mode: 'armed', error: null };
    case 'DISARM': return { ...state, mode: 'off', transcript: [], pendingConfirmation: null, error: null };
    case 'CONNECT': return { ...state, mode: 'connecting', error: null };
    case 'STATUS': return { ...state, mode: AIRPODS_STATES.includes(event.status) ? event.status : state.mode };
    case 'TRANSCRIPT': return { ...state, transcript: [...state.transcript, event.turn] };
    case 'ATTENTION': return { ...state, mode: 'attention-prompt', attentionItems: event.items || [] };
    case 'CONFIRM': return { ...state, mode: 'confirming', pendingConfirmation: event.action };
    case 'ERROR': return { ...state, mode: 'error', error: event.error || 'Voice session failed.' };
    default: return state;
  }
}
