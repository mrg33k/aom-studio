// GET /api/support/suggest?wish_id=... (or ?access_code=...) - everything the
// Support reply pane needs for ONE ask (corner:corner-ui-cv6:support):
//
//   {
//     ok, summary: [ "bullet", ... ],          // the ask, summarized (from the wish message)
//     recommendation: [ "why bullet", ... ],   // agent's WHY for the suggested reply
//     options: [ { label, text }, ... ],       // suggested replies, primary first
//     staged: { draft_id, connection_id, body } | null,  // press-send draft, if the agent staged one
//     original: "full original message text",
//   }
//
// Sources, in order of trust:
//   1. The wish meta's recommendation/reply_options (written by
//      support-triage.py's Gemini lane for new wishes).
//   2. The staged Gmail draft tagged in the message ([staged_draft:ID|conn:ID]),
//      its real body is fetched from Gmail so "Send it as me" shows what will send.
//   3. On-demand Gemini (same key/model as analyze-logs.js) for older wishes that
//      predate the columns. The result is written back to the wish meta as cache.
//
// Never sends anything. Sending stays behind send-staged.js / reply.js.
//
// corner:retire-supabase (2026-09-03): wish + timeline from Convex via wishes.js;
// the extras (recommendation, reply_options, agent_read, auto_send_at) come from
// the wish meta store.

import { requiredTenantFromEnv, resolveTenantContext, sendTenantContextError } from '../_lib/tenantContext.js'
import { getGmailTokenByConnection, gmailFetch } from '../_lib/gmailClient.js'
import { loadWish, patchWishMeta, parseJsonish } from './wishes.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const ORIGINAL_DELIM = '--- ORIGINAL MESSAGE ---'
const STAGED_TAG = /\[staged_draft:([^|\]]+)\|conn:([^\]]+)\]/

// wish.message = summary bullets + ORIGINAL_DELIM + original text + optional staged tag
function parseWishMessage(message) {
  const raw = String(message || '')
  const tag = raw.match(STAGED_TAG)
  const cleaned = raw.replace(STAGED_TAG, '').trim()
  const [head, ...rest] = cleaned.split(ORIGINAL_DELIM)
  const lines = head.split('\n').map((l) => l.trim()).filter(Boolean)
  // The watcher writes: subject line, then bullets. Fall back to the first
  // body lines for hand-entered wishes that never got the bullet treatment.
  const bullets = lines.filter((l) => /^[•·]/.test(l)).map((l) => l.replace(/^[•·]\s*/, ''))
  return {
    subjectLine: lines[0] || '',
    summary: (bullets.length ? bullets : lines.slice(1, 4)).slice(0, 5),
    original: rest.join(ORIGINAL_DELIM).trim(),
    staged: tag ? { draft_id: tag[1], connection_id: tag[2] } : null,
  }
}

// Pull the staged Gmail draft's plain-text body so the pane shows exactly what
// "Send it as me" will fire. Best effort: a revoked draft returns null.
async function stagedDraftBody(staged) {
  try {
    const creds = await getGmailTokenByConnection(staged.connection_id)
    if (!creds) return null
    const r = await gmailFetch(creds.accessToken, `/drafts/${encodeURIComponent(staged.draft_id)}?format=full`)
    if (!r.ok) return null
    const d = await r.json()
    const payload = d?.message?.payload
    const findText = (p) => {
      if (!p) return ''
      if (p.mimeType === 'text/plain' && p.body?.data) {
        return Buffer.from(p.body.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      }
      for (const part of p.parts || []) {
        const t = findText(part)
        if (t) return t
      }
      return ''
    }
    return findText(payload).trim() || null
  } catch {
    return null
  }
}

// On-demand generation for wishes that predate the triage columns. Same model
// lane as analyze-logs.js. Returns { recommendation:[...], options:[{label,text}] }.
async function generateSuggestions(wish, original) {
  if (!GEMINI_API_KEY) return null
  const prompt =
    'You draft replies for Patrik at AOM (a hands-on creative/AI agency). ' +
    'Given this client email, return STRICT JSON: {"recommendation": ["1-3 short bullets on why/how to reply"], ' +
    '"options": [{"label": "short label", "text": "the reply body"}, {"label": "...", "text": "..."}]}. ' +
    'Two options max: first the recommended reply (warm, direct, concrete next step), then one alternative. ' +
    'Plain text replies, no subject line, no signature, never an em dash.\n\n' +
    `FROM: ${wish.name || wish.email}\nEMAIL:\n${String(original || wish.message || '').slice(0, 6000)}`
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
        }),
      }
    )
    if (!r.ok) return null
    const data = await r.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const parsed = parseJsonish(text)
    if (!parsed || !Array.isArray(parsed.options)) return null
    return {
      recommendation: Array.isArray(parsed.recommendation) ? parsed.recommendation.slice(0, 3) : [],
      options: parsed.options
        .filter((o) => o && o.text)
        .slice(0, 2)
        .map((o) => ({ label: String(o.label || 'Reply').slice(0, 40), text: String(o.text).slice(0, 4000) })),
    }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'GET only' })

  try {
    await resolveTenantContext(req, {
      fallback: requiredTenantFromEnv(['SUPPORT_TENANT_ID', 'CORNER_HOME_TENANT']),
    })
  } catch (error) {
    return sendTenantContextError(res, error)
  }

  const { wish_id, access_code } = req.query
  if (!wish_id && !access_code) return res.status(400).json({ ok: false, error: 'wish_id or access_code required' })
  const found = await loadWish(wish_id ? { id: wish_id, includeHidden: true } : { accessCode: access_code, includeHidden: true })
  if (!found) return res.status(404).json({ ok: false, error: 'wish not found' })
  const { wish, updates } = found

  const parsed = parseWishMessage(wish.message)

  let recommendation = parseJsonish(wish.recommendation) || []
  let options = parseJsonish(wish.reply_options) || []
  if (!Array.isArray(recommendation)) recommendation = []
  if (!Array.isArray(options)) options = []

  // Latest internal worker receipt ("fixed the page and checked it live") so the
  // pane can show WHAT the agent did under the staged draft (M27 Stage 4).
  let workerNote = null
  const notes = updates.filter((u) => u.kind === 'worker_note')
  if (notes.length) {
    const last = notes[notes.length - 1]
    workerNote = { body: last.body || '', created_at: last.created_at }
  }

  let staged = null
  if (parsed.staged) {
    const body = await stagedDraftBody(parsed.staged)
    staged = { ...parsed.staged, body }
    // A staged draft IS the primary suggested reply, so it goes first.
    if (body && !options.some((o) => o.text === body)) {
      options = [{ label: 'Staged by your agent', text: body }, ...options]
    }
  }

  // Older wish with nothing stored: generate once, cache on the wish meta.
  if (!options.length) {
    const gen = await generateSuggestions(wish, parsed.original)
    if (gen) {
      recommendation = recommendation.length ? recommendation : gen.recommendation
      options = gen.options
      await patchWishMeta(wish.id, { recommendation, reply_options: options }).catch(() => {})
    }
  }

  return res.status(200).json({
    ok: true,
    summary: parsed.summary,
    recommendation,
    options,
    staged,
    original: parsed.original || String(wish.message || ''),
    // The worker's actual read {who, ask, state, did, next}. When present the
    // board renders THIS as the summary, not the ingest-time paraphrase (M27).
    agent_read: parseJsonish(wish.agent_read),
    worker_note: workerNote,
    auto_send_at: wish.auto_send_at || null,
  })
}
