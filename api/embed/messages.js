// GET /api/embed/messages?embed_id=...&since=<iso>
//
// Returns any agent (role=assistant) messages for the embed's routing
// (agent + project) newer than `since`. Widget polls this every 1.5s after
// posting until a reply arrives (max ~60s).

import { getEmbed } from '../../lib/embed-registry.js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// ─── Exact origin + scheme check (TOP-20 #3 #13) ────────────────────────────
function normalizeOrigin(origin) {
  try {
    const u = new URL(String(origin).trim());
    const isLocalhost = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1' || u.hostname === '[::1]';
    if (u.protocol === 'https:') {
    } else if (u.protocol === 'http:' && isLocalhost) {
    } else {
      return null;
    }
    if (u.pathname !== '/' && u.pathname !== '') return null;
    if (u.search || u.hash) return null;
    return u.origin;
  } catch {
    return null;
  }
}
function isOriginAllowed(origin, allowlist) {
  if (!origin || !Array.isArray(allowlist) || allowlist.length === 0) return false;
  const norm = normalizeOrigin(origin);
  if (!norm) return false;
  for (const allowed of allowlist) {
    const aNorm = normalizeOrigin(allowed);
    if (aNorm && aNorm === norm) return true;
  }
  return false;
}

function sbHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

function phoenixDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' })
}

// Clean a leaked chain-of-thought preamble out of a stored assistant reply.
// Gemini sometimes wrote its private reasoning as plain text — a "THOUGHT"
// block + a "---" separator + the real reply — and it got persisted verbatim
// (fixed on the write path in chat.js on 2026-07-03). This mirrors that strip
// on the READ path so Ethan's already-stored history renders clean on reload,
// no data migration needed. A standalone "---" rule is never legitimate output
// (the Wizard is told never to use markdown), so keep only what follows it.
function stripReasoningLeak(text) {
  if (!text) return text
  let t = String(text).replace(/\r\n/g, '\n')
  const seps = [...t.matchAll(/^[ \t]*-{3,}[ \t]*$/gm)]
  if (seps.length) {
    const last = seps[seps.length - 1]
    const after = t.slice(last.index + last[0].length).trim()
    if (after) t = after
  }
  t = t.replace(/^\s*THOUGHT\b:?[ \t]*\n?/i, '')
  return t.trim()
}

// Count how many subjects are marked done in a day-ledger string.
// "Reading=done; Writing=in-progress; Math=done; note=..." → 2
function countDone(stateStr) {
  if (!stateStr || typeof stateStr !== 'string') return 0
  let n = 0
  for (const part of stateStr.split(/;(?![^(]*\))/)) {
    const m = part.match(/^\s*([^=]+?)\s*=\s*(.+?)\s*$/)
    if (!m) continue
    const key = m[1].trim()
    if (/^(note|now)$/i.test(key)) continue
    const status = (m[2].match(/^([^(\s]+)/) || [])[1]
    if ((status || '').toLowerCase() === 'done') n++
  }
  return n
}

// Running assignments for this visitor (Wizard-tracked, carry across days).
async function fetchAssignments(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_assignments')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's own projects for this visitor (his ideas, carry across days).
async function fetchProjects(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_projects')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's reminders for this visitor (his EA holds these, carry across days).
async function fetchReminders(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_reminders')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's Spellbook for this visitor (spelling + vocab, carries across days).
async function fetchSpellbook(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_spellbook')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's Stories shelf for this visitor (finished writing pieces, carries across days).
async function fetchStories(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_stories')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's Math Lab for this visitor (math skills he's mastering, carries across days).
async function fetchMathlab(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_mathlab')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's missions (parts of his projects) for this visitor.
async function fetchMissions(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_missions')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Ethan's Bookshelf for this visitor (his reading, carries across days).
async function fetchReading(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_reading')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return []
    const rows = await r.json()
    const items = rows?.[0]?.payload?.items
    return Array.isArray(items) ? items : []
  } catch (_) { return [] }
}

// Latest essay snapshot for this visitor today (Writing Desk draft).
async function fetchEssay(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_essay')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('payload->>date', `eq.${phoenixDate()}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return null
    const rows = await r.json()
    const sentences = rows?.[0]?.payload?.sentences
    return Array.isArray(sentences) ? sentences : null
  } catch (_) {
    return null
  }
}

// Game-progress base: from this visitor's day ledgers, compute all-time
// subjects completed, today's completed (so the widget can tick live without
// re-querying), and the current daily streak. One bounded query (latest-per-
// day reduced in JS) — runs only on page load, never per chat message.
async function fetchProgress(embedId, visitorId) {
  const empty = { totalDone: 0, todayDone: 0, streak: 0, activeDays: 0 }
  const since = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
  const params = new URLSearchParams()
  params.set('select', 'payload,timestamp')
  params.set('event_type', 'eq.wizard_day_state')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('timestamp', `gt.${since}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '800')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return empty
    const rows = await r.json()
    // Reduce to the latest ledger per Phoenix date (rows are newest-first).
    const latestByDate = new Map()
    for (const row of rows) {
      const d = row?.payload?.date
      const s = row?.payload?.state
      if (!d || !s || latestByDate.has(d)) continue
      latestByDate.set(d, s)
    }
    const today = phoenixDate()
    let totalDone = 0
    let todayDone = 0
    const doneDates = []
    for (const [date, state] of latestByDate) {
      const done = countDone(state)
      totalDone += done
      if (date === today) todayDone = done
      if (done > 0) doneDates.push(date)
    }
    // Streak: consecutive days (ending today or yesterday) with any completion.
    doneDates.sort((a, b) => (a < b ? 1 : -1)) // newest first
    let streak = 0
    if (doneDates.length) {
      const dayMs = 24 * 60 * 60 * 1000
      // Anchor to today if active today, else yesterday (today not over yet).
      let cursor = doneDates[0] === today ? today : null
      if (!cursor) {
        const y = new Date(Date.now() - dayMs).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' })
        cursor = doneDates[0] === y ? y : null
      }
      if (cursor) {
        const set = new Set(doneDates)
        let probe = cursor
        while (set.has(probe)) {
          streak++
          probe = new Date(new Date(probe + 'T00:00:00-07:00').getTime() - dayMs)
            .toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' })
        }
      }
    }
    return { totalDone, todayDone, streak, activeDays: doneDates.length }
  } catch (_) {
    return empty
  }
}

// Latest day ledger for this visitor today (written by api/embed/chat.js).
// Drives the widget's Today's Quests panel on page load.
async function fetchDayState(embedId, visitorId) {
  const params = new URLSearchParams()
  params.set('select', 'payload')
  params.set('event_type', 'eq.wizard_day_state')
  params.set('payload->>embed_id', `eq.${embedId}`)
  params.set('payload->>visitor_id', `eq.${visitorId || ''}`)
  params.set('payload->>date', `eq.${phoenixDate()}`)
  params.set('order', 'timestamp.desc')
  params.set('limit', '1')
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/events?${params.toString()}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
    if (!r.ok) return null
    const rows = await r.json()
    return rows?.[0]?.payload?.state || null
  } catch (_) {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const origin = req.headers.origin || ''

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'method' })

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const q = req.query || {}
  const embedId = q.embed_id
  // history=1 → initial page load: return the visitor's full recent
  // conversation (user + agent rows) so a refresh doesn't lose the thread.
  const historyMode = q.history === '1'
  const since =
    q.since ||
    new Date(
      Date.now() - (historyMode ? 7 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000)
    ).toISOString()
  const visitorId = q.visitor_id || ''
  // Conversation room (Build R19): the widget asks for one room's thread at a
  // time — 'school' or 'project:<slug>'. Untagged legacy rows count as School so
  // his existing thread never moves. Empty = no room filter (back-compat).
  const room = typeof q.room === 'string' && q.room.trim() ? q.room.trim() : ''

  const cfg = await getEmbed(embedId)
  if (!cfg) return res.status(404).json({ error: 'unknown embed_id' })

  // Exact origin + scheme check
  if (origin && !isOriginAllowed(origin, cfg.host_allowlist)) {
    return res.status(403).json({ error: 'origin not on allowlist' })
  }
  res.setHeader('Access-Control-Allow-Origin', origin || '*')

  // The visitor's own message ids — the allowlist anchor. The bridge sets
  // reply_to to the message it answers, so "replies to this visitor" is an
  // exact set. Everything else in the room (operator chat, build updates,
  // task bubbles) must NEVER reach the embed (Patrik 2026-06-11: Ethan only
  // sees the chat with his teacher).
  const visitorMsgIds = new Set()
  if (visitorId) {
    const up = new URLSearchParams()
    up.set('select', 'id,metadata')
    up.set('agent', `eq.${cfg.routing.agent}`)
    up.set('project', `eq.${cfg.routing.project}`)
    up.set('client_id', `eq.${cfg.routing.client_id}`)
    up.set('role', 'eq.user')
    up.set(
      'timestamp',
      `gt.${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`
    )
    up.set('order', 'timestamp.desc')
    up.set('limit', '200')
    try {
      const ur = await fetch(`${SUPABASE_URL}/rest/v1/messages?${up.toString()}`, {
        headers: sbHeaders(),
      })
      if (ur.ok) {
        for (const row of await ur.json()) {
          const meta = row.metadata || {}
          if ((meta.embed_visitor_id || '') === visitorId) {
            visitorMsgIds.add(row.id)
          }
        }
      }
    } catch (_) {
      // non-fatal — falls through to the strict filter below, which will
      // simply show no untagged agent rows until the next poll succeeds
    }
  }

  // Build the PostgREST query: assistant messages on the right agent+project,
  // newer than since, with the right mission_slug metadata, scoped to client.
  const params = new URLSearchParams()
  params.set('select', 'id,role,text,timestamp,metadata,reply_to')
  params.set('agent', `eq.${cfg.routing.agent}`)
  params.set('project', `eq.${cfg.routing.project}`)
  params.set('client_id', `eq.${cfg.routing.client_id}`)
  params.set(
    'role',
    historyMode ? 'in.(user,assistant,agent)' : 'in.(assistant,agent)'
  )
  params.set('timestamp', `gt.${since}`)
  // Scope to THIS visitor's rows at the query level for embeds that tag every
  // row with embed_visitor_id (the embed-ai path, e.g. summerschool). Without
  // this, on a busy shared agent+project (elon / aheadofmarket.com) the asc+200
  // window returns the oldest 200 messages in the room — never the visitor's own
  // recent ones — so his thread came back empty on refresh (R8 slice 7 fix).
  if (cfg.ai && cfg.ai.system_prompt && visitorId) {
    params.set('metadata->>embed_visitor_id', `eq.${visitorId}`)
  }
  params.set('order', 'timestamp.asc')
  params.set('limit', historyMode ? '200' : '20')

  const url = `${SUPABASE_URL}/rest/v1/messages?${params.toString()}`
  try {
    const r = await fetch(url, { headers: sbHeaders() })
    if (!r.ok) {
      const t = await r.text()
      return res.status(r.status).json({ error: t })
    }
    const rows = await r.json()
    // Filter to rows tagged for this mission. Other project messages might
    // share the same agent+project pair if multiple missions are in flight.
    // The bridge normalizes mission slugs to the short form (R16), so a
    // reply may carry "summerschool" while the embed config says
    // "aheadofmarket.com:summerschool". Match either form.
    const wantSlug = cfg.routing.mission_slug || ''
    const wantShort = wantSlug.includes(':') ? wantSlug.split(':').pop() : wantSlug
    const filtered = rows.filter((row) => {
      const m = row.metadata || {}
      // Never surface file-share / attachment messages (the mission-folder
      // watcher posts these for operators; they confuse embed visitors).
      if (m.attachment || (Array.isArray(m.attachments) && m.attachments.length)) {
        return false
      }
      // Drop empty/whitespace-only rows — the bridge occasionally writes a
      // blank assistant message after tool work; it renders as a tiny empty
      // bubble in the widget (seen live 2026-06-11).
      const bodyText =
        (row.role === 'user' && m.visitor_text) || row.text || ''
      if (!String(bodyText).trim()) return false
      const rowSlug = m.mission_slug || m.mission || ''
      const rowShort = rowSlug.includes(':') ? rowSlug.split(':').pop() : rowSlug
      if (rowSlug && rowShort !== wantShort) return false
      // Room scoping: only return this room's thread (untagged = School).
      if (room) {
        const rowRoom = m.embed_room || 'school'
        if (rowRoom !== room) return false
      }
      // User rows only ever belong to their own visitor — in history mode a
      // user row without a matching visitor tag is someone else's (operator).
      if (row.role === 'user' && (m.embed_visitor_id || '') !== visitorId) {
        return false
      }
      // Agent rows: strict allowlist. Show only rows tagged for this visitor
      // (embed-ai path) or bridge replies whose reply_to is one of the
      // visitor's own messages. Operator conversations and build/status
      // traffic in the same room never pass.
      if (row.role !== 'user' && visitorId) {
        // Embeds with their own ai block: ONLY embed-ai replies surface.
        // Bridge/operator replies in the same room are agent narration
        // ("updating the ledger... standing by") — never for the visitor
        // (seen live on /summerschool 2026-06-11).
        if (cfg.ai && cfg.ai.system_prompt && m.embed_source !== 'embed-ai') {
          return false
        }
        const tagged = m.embed_visitor_id || ''
        if (tagged) {
          if (tagged !== visitorId) return false
        } else if (!row.reply_to || !visitorMsgIds.has(row.reply_to)) {
          return false
        }
      }
      return true
    })
    // History mode = page load: include today's day ledger so the quests
    // panel renders the real state immediately (chat POSTs keep it fresh).
    // Also seed the Writing Desk (today's essay) and the Game HUD base
    // (all-time/today completions + streak) — both only on page load.
    const [dayState, essay, progress, assignments, projects, reminders, spellbook, reading, mathlab, stories, missions] = historyMode
      ? await Promise.all([
          fetchDayState(embedId, visitorId),
          fetchEssay(embedId, visitorId),
          fetchProgress(embedId, visitorId),
          fetchAssignments(embedId, visitorId),
          fetchProjects(embedId, visitorId),
          fetchReminders(embedId, visitorId),
          fetchSpellbook(embedId, visitorId),
          fetchReading(embedId, visitorId),
          fetchMathlab(embedId, visitorId),
          fetchStories(embedId, visitorId),
          fetchMissions(embedId, visitorId),
        ])
      : [null, null, null, null, null, null, null, null, null, null, null]
    return res.status(200).json({
      day_state: dayState,
      essay,
      progress,
      assignments,
      projects,
      reminders,
      spellbook,
      reading,
      mathlab,
      stories,
      missions,
      messages: filtered.map((row) => ({
        id: row.id,
        role: row.role,
        // User rows store "— Web Portal"-suffixed text; show the clean
        // visitor text preserved in metadata instead.
        text:
          row.role === 'user'
            ? (row.metadata && row.metadata.visitor_text) || row.text
            : stripReasoningLeak(row.text),
        timestamp: row.timestamp,
      })),
    })
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message) })
  }
}
