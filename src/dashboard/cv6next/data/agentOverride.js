// agentOverride.js — R-B5: correction path (TOP-20 #21)
//
// Patrik overrides in one plain sentence — "no, ask Web" — and the stick
// moves that turn. No menu, no settings trip. The override holds for the
// rest of the thread but does not silently become a permanent pin.
//
// Ships alongside B3, not after it — it is what makes B2's imperfection acceptable.

import { titleForAgent } from './agentTitles.js'
import { AGENT_ROUTING_KEYS } from './agentRouting.js'

// Map titles and slugs to canonical slugs for override detection
const TITLE_TO_SLUG = Object.fromEntries(
  Object.entries(AGENT_ROUTING_KEYS).map(([slug, cfg]) => [cfg.title.toLowerCase(), slug])
)
// Also map slugs to slugs (so "ask bobby" works)
for (const slug of Object.keys(AGENT_ROUTING_KEYS)) {
  TITLE_TO_SLUG[slug] = slug
}
// Common aliases
TITLE_TO_SLUG['creative director'] = 'director'
TITLE_TO_SLUG['creative'] = 'director'
TITLE_TO_SLUG['designer'] = 'steffen'
TITLE_TO_SLUG['engineer'] = 'bobby'
TITLE_TO_SLUG['web'] = 'bobby'
TITLE_TO_SLUG['content'] = 'cleo'
TITLE_TO_SLUG['video'] = 'cleo'
TITLE_TO_SLUG['social'] = 'tony'
TITLE_TO_SLUG['ops'] = 'gary'
TITLE_TO_SLUG['operations'] = 'gary'
TITLE_TO_SLUG['assistant'] = 'rex'
TITLE_TO_SLUG['systems'] = 'elon'
TITLE_TO_SLUG['outreach'] = 'jacob'
TITLE_TO_SLUG['strategy'] = 'alex'
TITLE_TO_SLUG['qa'] = 'elmo'

// Phrases that signal an override — plain language, not a command
const OVERRIDE_PATTERNS = [
  // Direct: "no, ask Web", "actually ask Creative", "talk to Design"
  /(?:no[,!]?\s*)?(?:actually\s*)?(?:ask|talk to|get|bring in|loop in|hand (?:this )?to|pass to|switch to)\s+(creative(?: director)?|designer|design|web|engineer|content|video|social|operations|ops|assistant|systems|outreach|strategy|advisory|qa|media|bobby|cleo|steffen|director|gary|elon|rex|jacob|tony|alex|steve|elmo|pixel)\b/i,
  // Indirect: "this is a design question", "this is creative work"
  /this is (?:a |an )?(creative|design|web|engineering|content|video|social|operations|outreach|strategy|advisory|qa|media)\s+(?:question|thing|task|work|job|issue)\b/i,
  // Correction: "no, creative should do this", "let creative handle it", "creative should do this"
  /(?:let|have)\s+(creative|design|web|content|social|operations|assistant|systems|outreach|strategy|advisory|qa|media|director|bobby|cleo|steffen|gary|elon|rex|jacob|tony)\s+(?:handle|take|do)\s+(?:this|it|that)/i,
  // Should-do: "creative should do this" without let/have
  /(creative|design|web|content|social|operations|assistant|systems|outreach|strategy|advisory|qa|media|director|bobby|cleo|steffen|gary|elon|rex|jacob|tony|steve|elmo|pixel)\s+should\s+(?:do|handle|take)\s+(?:this|it|that)/i,
]

export function detectOverride(text) {
  const body = String(text || '').trim()
  if (!body) return null
  for (const pat of OVERRIDE_PATTERNS) {
    const m = pat.exec(body)
    if (m) {
      const raw = String(m[1] || '').trim().toLowerCase()
      const slug = TITLE_TO_SLUG[raw]
      if (slug) {
        return { slug, title: titleForAgent(slug), raw, pattern: pat.source }
      }
    }
  }
  return null
}

// Override scope: holds for rest of thread, not permanently
// Stored in localStorage per room, cleared on new thread or explicit reset
export function getThreadOverrideKey(room) {
  if (!room) return ''
  if (room.isMission) return `override:mission:${room.missionSlug || room.id}`
  if (room.isProject) return `override:project:${room.id}`
  return `override:agent:${room.id}`
}

export function getThreadOverride(room) {
  try {
    const key = getThreadOverrideKey(room)
    if (!key) return null
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Expire after 2 hours — override is for this thread, not forever
    if (data.at && Date.now() - data.at > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(key)
      return null
    }
    return data.slug ? { slug: data.slug, title: titleForAgent(data.slug), at: data.at } : null
  } catch { return null }
}

export function setThreadOverride(room, slug) {
  try {
    const key = getThreadOverrideKey(room)
    if (!key || !slug) return
    localStorage.setItem(key, JSON.stringify({ slug: String(slug).toLowerCase(), at: Date.now() }))
  } catch { /* private mode */ }
}

export function clearThreadOverride(room) {
  try {
    const key = getThreadOverrideKey(room)
    if (key) localStorage.removeItem(key)
  } catch {}
}

// Test helpers
export function testOverridePhrases() {
  const cases = [
    ['no, ask Web', 'bobby'],
    ['actually ask Creative', 'director'],
    ['talk to Design', 'steffen'],
    ['this is a design question', 'steffen'],
    ['this is creative work', 'director'],
    ['let Web handle this', 'bobby'],
    ['no, creative should do this', 'director'],
    ['bring in Content', 'cleo'],
    ['switch to Operations', 'gary'],
    // Indirect — "this is a web thing" IS a valid override (web + thing), so it should match bobby
    ['this is a web thing', 'bobby'],
  ]
  return cases.map(([text, expectedSlug]) => {
    const got = detectOverride(text)
    return { text, expectedSlug, gotSlug: got?.slug || null, pass: (got?.slug || null) === expectedSlug }
  })
}
