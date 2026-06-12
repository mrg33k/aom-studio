// Chat constants extracted from ChatPanel.jsx (R2b split)
// Rotating greetings and Gemini voice options used by ChatPanel + sub-views.
// R57: retired the time-of-day variant entry ("Good ${morning/afternoon/...}, Patrik")
// per VISION Pillar 1 (home hero hygiene) — no "Good morning, Patrik" line.

export const GREETINGS = [
  (name) => `Hey ${name}, what are we working on?`,
  (name) => `What's on the agenda, ${name}?`,
  (name) => `What are we shipping today, ${name}?`,
  (name) => `Let's build something great, ${name}.`,
  (name) => `Ready when you are, ${name}.`,
  (name) => `What's the move, ${name}?`,
  (name) => `Back at it, ${name}. What's first?`,
]

export const VOICE_OPTIONS = [
  { id: 'kore',          label: 'Kore',          desc: 'Firm' },
  { id: 'puck',          label: 'Puck',          desc: 'Upbeat' },
  { id: 'charon',        label: 'Charon',        desc: 'Informative' },
  { id: 'aoede',         label: 'Aoede',         desc: 'Breezy' },
  { id: 'fenrir',        label: 'Fenrir',        desc: 'Excitable' },
  { id: 'orus',          label: 'Orus',          desc: 'Firm' },
  { id: 'zephyr',        label: 'Zephyr',        desc: 'Bright' },
  { id: 'leda',          label: 'Leda',          desc: 'Youthful' },
  { id: 'callirrhoe',    label: 'Callirrhoe',    desc: 'Easy-going' },
  { id: 'autonoe',       label: 'Autonoe',       desc: 'Bright' },
  { id: 'enceladus',     label: 'Enceladus',     desc: 'Breathy' },
  { id: 'iapetus',       label: 'Iapetus',       desc: 'Clear' },
  { id: 'umbriel',       label: 'Umbriel',       desc: 'Easy-going' },
  { id: 'algieba',       label: 'Algieba',       desc: 'Smooth' },
  { id: 'despina',       label: 'Despina',       desc: 'Smooth' },
  { id: 'erinome',       label: 'Erinome',       desc: 'Clear' },
  { id: 'algenib',       label: 'Algenib',       desc: 'Gravelly' },
  { id: 'rasalgethi',    label: 'Rasalgethi',    desc: 'Informative' },
  { id: 'laomedeia',     label: 'Laomedeia',     desc: 'Upbeat' },
  { id: 'achernar',      label: 'Achernar',      desc: 'Soft' },
  { id: 'alnilam',       label: 'Alnilam',       desc: 'Firm' },
  { id: 'schedar',       label: 'Schedar',       desc: 'Even' },
  { id: 'gacrux',        label: 'Gacrux',        desc: 'Mature' },
  { id: 'pulcherrima',   label: 'Pulcherrima',   desc: 'Forward' },
  { id: 'achird',        label: 'Achird',        desc: 'Friendly' },
  { id: 'zubenelgenubi', label: 'Zubenelgenubi', desc: 'Casual' },
  { id: 'vindemiatrix',  label: 'Vindemiatrix',  desc: 'Gentle' },
  { id: 'sadachbia',     label: 'Sadachbia',     desc: 'Lively' },
  { id: 'sadaltager',    label: 'Sadaltager',    desc: 'Knowledgeable' },
  { id: 'sulafat',       label: 'Sulafat',       desc: 'Warm' },
]

// Per-chat model selection (corner:gemini-workers R3). The bridge daemon
// reads this preference per message and routes the turn: claude aliases ride
// the normal warm pool; gemini ids run the whole turn on the Gemini CLI lane.
// New model arrives → add a row here (and a lane in the daemon if it's a new
// provider). ids must match what scripts/bridge-daemon.py understands.
export const MODEL_OPTIONS = [
  { id: 'default',          label: 'Auto (Claude Sonnet)', desc: 'System default' },
  { id: 'opus',             label: 'Claude Opus',          desc: 'Deepest reasoning' },
  { id: 'sonnet',           label: 'Claude Sonnet',        desc: 'Fast + capable' },
  { id: 'haiku',            label: 'Claude Haiku',         desc: 'Fastest, light' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash',     desc: 'Low cost, full tools' },
  { id: 'gemini-3.1-pro',   label: 'Gemini 3.1 Pro',       desc: 'Gemini deep reasoning' },
]
