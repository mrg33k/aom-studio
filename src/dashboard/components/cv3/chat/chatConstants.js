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

// Per-chat model selection. Single source: src/dashboard/data/models.json
// (gut-pruning-ship). Import is canonical; ALLOWED_MODELS in
// api/dashboard/agent-model.js validates against the same JSON.
import modelsJson from '../../data/models.json' with { type: 'json' }
export const MODEL_OPTIONS = modelsJson

// Per-surface model (corner:gemini-workers step 6). Model is decided by which
// door you came in: /cvg -> Gemini (its 'cvgModel' pick or flash), every other
// surface -> '' (no override, so the room's Claude pref / system default stands).
// Used to stamp the supabase-messages send paths (catch-up reply, support
// "discuss") so those /cvg actions run Gemini like the rest of /cvg, instead of
// silently falling to the room's Claude pref. The bridge + listener honor it.
export function surfaceModel() {
  // Gemini turned OFF for cost (2026-06-22, corner:corner-ui-cv6). No override —
  // all sends ride the room's saved Claude pref. Rebuild per GEMINI-WIRING-PRESERVED.md.
  return ''
}
