// agentHandoff.js — R-B3: the handoff moment (TOP-20 #21)
//
// The host hands the turn to a specialist inside the same thread, in one
// natural line of speech. The specialist answers attributed by title, holding
// the earlier context, then hands back.
//
// Anti-mechanical standard (§3):
// - A handoff is a message, not chrome. No badge, chip, banner, status pill.
// - One line, in the host's own voice. "That's a creative question, handing this to Creative."
// - Never the same sentence twice. 10 handoffs → 10 distinct phrasings.
// - Specialist opens on intent, not restatement. "Oh, I see what you're trying to do" — then method.
// - Same standard governs liveness: progress reads as a person saying what they do.

// ── Handoff phrasings — host to specialist ──────────────────────────────
// One line, host's voice, each distinct. No templated repetition.
// The specialist's title is interpolated, but the sentence shape varies.
const HANDOFF_TEMPLATES = [
  (title) => `That's a ${title.toLowerCase()} question — handing this to ${title}.`,
  (title) => `This wants ${title}'s eyes on it. Bringing ${title} in.`,
  (title) => `Good call — ${title} should take this. Looping ${title} in.`,
  (title) => `This is right up ${title}'s alley. ${title}, over to you.`,
  (title) => `${title} will have a sharper take here — handing off to ${title}.`,
  (title) => `Let me pull ${title} in on this one.`,
  (title) => `You want ${title} for this — one sec, getting ${title}.`,
  (title) => `That's ${title} territory. Passing it to ${title}.`,
  (title) => `I know who you need for this — ${title}. Bringing them in.`,
  (title) => `This is a ${title} call. Handing it over to ${title}.`,
  (title) => `${title}'s the right person for this — pulling ${title} in.`,
  (title) => `Great question for ${title}. Let me get ${title} on it.`,
  (title) => `Looping in ${title} — they'll have the clearest view on this.`,
  (title) => `This belongs with ${title}. Handing this off to ${title}.`,
  (title) => `${title} should weigh in here — bringing ${title} into the thread.`,
]

// Deterministic but varied: pick based on hash of (parentMessageId + title) so
// same turn always gets same phrasing, but 10 consecutive handoffs vary.
// No random on render — would flicker on re-render.
function hashString(s) {
  let h = 0
  for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

export function handoffLine({ hostTitle = 'Operations', specialistTitle = 'Creative', parentMessageId = '' }) {
  const idx = hashString(`${parentMessageId}:${specialistTitle}`) % HANDOFF_TEMPLATES.length
  // Rotate by hostTitle hash as well so same specialist doesn't always get same line
  const hostIdx = hashString(hostTitle) % 3
  const finalIdx = (idx + hostIdx) % HANDOFF_TEMPLATES.length
  return HANDOFF_TEMPLATES[finalIdx](specialistTitle)
}

// Ensure 10 distinct phrasings across 10 handoffs — test helper
export function distinctHandoffLinesForTest(count = 10) {
  const titles = ['Creative', 'Design', 'Web', 'Content', 'Social', 'Operations', 'Outreach', 'Strategy', 'Advisory', 'QA', 'Media', 'Systems']
  const lines = new Set()
  for (let i = 0; i < count; i++) {
    const title = titles[i % titles.length]
    lines.add(handoffLine({ hostTitle: 'Operations', specialistTitle: title, parentMessageId: `test-${i}` }))
  }
  return [...lines]
}

// ── Specialist openings — intent, not restatement ───────────────────────
// Specialist never echoes the question back. Opens on intent: "Oh, I see what
// you're trying to do" — then the method.
const SPECIALIST_OPENERS = [
  "Oh, I see what you're trying to do — ",
  "Got it — I see the direction you're after. ",
  "I see where you're heading with this. ",
  "Yep, I know what you're going for here. ",
  "I get the intent — ",
  "I see the shape of this. ",
  "Understood — I see what you need here. ",
  "I see what you're building toward. ",
  "Got the picture — ",
  "I see what you're aiming for. ",
]

export function specialistOpener({ specialistTitle = 'Creative', parentMessageId = '' }) {
  const idx = hashString(`${parentMessageId}:${specialistTitle}:opener`) % SPECIALIST_OPENERS.length
  return SPECIALIST_OPENERS[idx]
}

// ── Handoff-back line — specialist hands back to host ───────────────────
const HANDBACK_TEMPLATES = [
  (hostTitle) => `That's my take — back to ${hostTitle}.`,
  (hostTitle) => `Looping back to ${hostTitle}.`,
  (hostTitle) => `Over to you, ${hostTitle}.`,
  (hostTitle) => `I'll hand it back to ${hostTitle} from here.`,
  (hostTitle) => `Back to ${hostTitle} for next steps.`,
]

export function handbackLine({ hostTitle = 'Operations', parentMessageId = '' }) {
  const idx = hashString(`${parentMessageId}:handback:${hostTitle}`) % HANDBACK_TEMPLATES.length
  return HANDBACK_TEMPLATES[idx](hostTitle)
}

// ── Synthetic handoff message shape ─────────────────────────────────────
// A handoff is a MESSAGE, not chrome. It renders as a normal assistant row
// from the host, with the specialist's title in the text. No badge, no pill,
// no system-event row, no ROUTING/DISPATCHING label.
export function makeHandoffMessage({ hostSlug = 'gary', hostTitle = 'Operations', specialistSlug = 'director', specialistTitle = 'Creative', parentMessageId = '', timestamp = new Date().toISOString() }) {
  return {
    id: `handoff-${parentMessageId}-${Date.now()}`,
    role: 'assistant',
    agent: hostSlug,
    agentName: hostTitle,
    text: handoffLine({ hostTitle, specialistTitle, parentMessageId }),
    timestamp,
    ts: timestamp,
    isHandoff: true,
    handoffTo: specialistSlug,
    handoffToTitle: specialistTitle,
  }
}

// ── Check: is a message a handoff? ──────────────────────────────────────
export function isHandoffMessage(m) {
  return Boolean(m && m.isHandoff)
}

// ── Validate: 0 chrome elements on a handoff ────────────────────────────
// Handoff must not render as badge/pill/banner/system row. This helper is
// for tests: asserts the rendered DOM for a handoff contains no chrome.
export function handoffChromeCheck(renderedHtml) {
  const html = String(renderedHtml || '').toLowerCase()
  const forbidden = ['badge', 'pill', 'banner', 'system-event', 'routing', 'dispatching', 'chip']
  return forbidden.filter((kw) => html.includes(kw))
}
