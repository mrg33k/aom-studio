// GET /api/embed/messages?embed_id=...&since=<iso>
//
// Returns any agent (role=assistant) messages for the embed's routing
// (agent + project) newer than `since`. Widget polls this every 1.5s after
// posting until a reply arrives (max ~60s).
//
// corner:retire-supabase (2026-09-03): the room thread comes from Convex
// (messages:getThread on the embed's room, the same room /api/embed/chat
// writes into) and every per-visitor ledger (day state, essay, assignments,
// projects, missions, reminders, spellbook, bookshelf, math lab, stories)
// comes from the Convex events table (events:find). Row ids are Convex
// document ids and timestamps are ISO strings, as before.
//
// The embed config itself is read here too (getEmbed, exported below): the
// Convex embeds table first (embeds:get, the row /api/embed/create writes),
// then the bundled api/embed/_embeds.json for the three embeds that predate
// the table. chat.js, steps.js and create.js import it from this file, so the
// widget endpoints no longer go through lib/embed-registry.js.

import embedsFile from './_embeds.json' with { type: 'json' }
import { convexQuery } from '../_lib/reportsStore.js'
import { deriveRoomId } from '../_lib/write-message.js'

// ─── Embed config lookup ────────────────────────────────────────────────────
// 10s in-memory cache per embed_id. It absorbs the widget's 1.5s poll without
// a stale config ever being user-visible.
const JSON_REGISTRY = embedsFile.embeds || {}
const EMBED_TTL_MS = 10_000
const embedCache = new Map() // embed_id -> { cfg, ts }

function embedFromJson(id) {
  return JSON_REGISTRY[id] || null
}

export async function getEmbed(id) {
  if (!id) return null
  const key = String(id)
  const hit = embedCache.get(key)
  if (hit && (Date.now() - hit.ts) < EMBED_TTL_MS) return hit.cfg
  let cfg = null
  try {
    cfg = await convexQuery('embeds:get', { embedId: key })
  } catch (_) {
    cfg = null
  }
  if (cfg && typeof cfg === 'object') {
    // A stored row may predate the ai block. The JSON file is the source of
    // that block for the legacy embeds, so merge it in when the row lacks one
    // (the 2026-06-11 summerschool "Wizard never replies" bug).
    const json = embedFromJson(key)
    if (json && json.ai && !cfg.ai) cfg = { ...cfg, ai: json.ai }
  } else {
    cfg = embedFromJson(key)
  }
  embedCache.set(key, { cfg, ts: Date.now() })
  return cfg
}

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

function phoenixDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' })
}

function toIso(ms) {
  const d = new Date(ms)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// `since` arrives as an ISO string (or, defensively, a millisecond number).
function toMs(value) {
  if (value === undefined || value === null || value === '') return NaN
  if (typeof value === 'number') return value
  const s = String(value)
  if (/^\d+$/.test(s)) return Number(s)
  return Date.parse(s)
}

// The embed's room: one rule for every writer (write-message.js deriveRoomId).
function embedRoomId(cfg) {
  const r = cfg.routing || {}
  return deriveRoomId({ clientId: r.client_id, agent: r.agent, project: r.project, missionSlug: r.mission_slug })
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

// ─── Convex event store reads ───────────────────────────────────────────────
// Each ledger is an append-only event row; the newest row for this embed +
// visitor (+ date, when the ledger is day-keyed) wins. Best effort: a miss
// returns the empty shape.
async function latestWizardEvent(eventType, embedId, visitorId, { date = null, limit = 500 } = {}) {
  try {
    const rows = await convexQuery('events:find', {
      event_type: eventType,
      payload_eq: { key: 'embed_id', value: embedId },
      order: 'desc',
      limit,
    })
    const want = visitorId || ''
    for (const row of Array.isArray(rows) ? rows : []) {
      const p = row?.payload || {}
      if ((p.visitor_id || '') !== want) continue
      if (date && p.date !== date) continue
      return row
    }
    return null
  } catch (_) {
    return null
  }
}

async function latestWizardItems(eventType, embedId, visitorId) {
  const row = await latestWizardEvent(eventType, embedId, visitorId)
  const items = row?.payload?.items
  return Array.isArray(items) ? items : []
}

// Running assignments for this visitor (Wizard-tracked, carry across days).
const fetchAssignments = (embedId, visitorId) => latestWizardItems('wizard_assignments', embedId, visitorId)
// Ethan's own projects for this visitor (his ideas, carry across days).
const fetchProjects = (embedId, visitorId) => latestWizardItems('wizard_projects', embedId, visitorId)
// Ethan's reminders for this visitor (his EA holds these, carry across days).
const fetchReminders = (embedId, visitorId) => latestWizardItems('wizard_reminders', embedId, visitorId)
// Ethan's Spellbook for this visitor (spelling + vocab, carries across days).
const fetchSpellbook = (embedId, visitorId) => latestWizardItems('wizard_spellbook', embedId, visitorId)
// Ethan's Stories shelf for this visitor (finished writing pieces, carries across days).
const fetchStories = (embedId, visitorId) => latestWizardItems('wizard_stories', embedId, visitorId)
// Ethan's Math Lab for this visitor (math skills he's mastering, carries across days).
const fetchMathlab = (embedId, visitorId) => latestWizardItems('wizard_mathlab', embedId, visitorId)
// Ethan's missions (parts of his projects) for this visitor.
const fetchMissions = (embedId, visitorId) => latestWizardItems('wizard_missions', embedId, visitorId)
// Ethan's Bookshelf for this visitor (his reading, carries across days).
const fetchReading = (embedId, visitorId) => latestWizardItems('wizard_reading', embedId, visitorId)

// Latest essay snapshot for this visitor today (Writing Desk draft).
async function fetchEssay(embedId, visitorId) {
  const row = await latestWizardEvent('wizard_essay', embedId, visitorId, { date: phoenixDate() })
  const sentences = row?.payload?.sentences
  return Array.isArray(sentences) ? sentences : null
}

// Game-progress base: from this visitor's day ledgers, compute all-time
// subjects completed, today's completed (so the widget can tick live without
// re-querying), and the current daily streak. One bounded query (latest-per-
// day reduced in JS) — runs only on page load, never per chat message.
async function fetchProgress(embedId, visitorId) {
  const empty = { totalDone: 0, todayDone: 0, streak: 0, activeDays: 0 }
  const since = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
  try {
    const rows = await convexQuery('events:find', {
      event_type: 'wizard_day_state',
      payload_eq: { key: 'embed_id', value: embedId },
      since,
      order: 'desc',
      limit: 800,
    })
    const want = visitorId || ''
    // Reduce to the latest ledger per Phoenix date (rows are newest-first).
    const latestByDate = new Map()
    for (const row of Array.isArray(rows) ? rows : []) {
      const p = row?.payload || {}
      if ((p.visitor_id || '') !== want) continue
      const d = p.date
      const s = p.state
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
  const row = await latestWizardEvent('wizard_day_state', embedId, visitorId, { date: phoenixDate() })
  return row?.payload?.state || null
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

  const q = req.query || {}
  const embedId = q.embed_id
  // history=1 → initial page load: return the visitor's full recent
  // conversation (user + agent rows) so a refresh doesn't lose the thread.
  const historyMode = q.history === '1'
  const sinceMs = (() => {
    const parsed = toMs(q.since)
    if (!Number.isNaN(parsed)) return parsed
    return Date.now() - (historyMode ? 7 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000)
  })()
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

  const roomId = embedRoomId(cfg)
  if (!roomId) return res.status(500).json({ error: 'embed has no routing world' })

  try {
    // One read of the room thread (newest 400 rows, chronological). Both the
    // visitor's own rows (the reply_to allowlist anchor) and the agent rows
    // come out of it.
    const thread = await convexQuery('messages:getThread', { roomId, limit: 400 })
    const rows = Array.isArray(thread) ? thread : []

    // The visitor's own message ids — the allowlist anchor. The bridge sets
    // reply_to to the message it answers, so "replies to this visitor" is an
    // exact set. Everything else in the room (operator chat, build updates,
    // task bubbles) must NEVER reach the embed (Patrik 2026-06-11: Ethan only
    // sees the chat with his teacher).
    const visitorMsgIds = new Set()
    if (visitorId) {
      for (const row of rows) {
        const meta = row.metadata || {}
        if (row.role === 'user' && (meta.embed_visitor_id || '') === visitorId) {
          visitorMsgIds.add(String(row._id))
        }
      }
    }

    // Filter to rows tagged for this mission. Other project messages might
    // share the same agent+project pair if multiple missions are in flight.
    // The bridge normalizes mission slugs to the short form (R16), so a
    // reply may carry "summerschool" while the embed config says
    // "aheadofmarket.com:summerschool". Match either form.
    const wantSlug = cfg.routing.mission_slug || ''
    const wantShort = wantSlug.includes(':') ? wantSlug.split(':').pop() : wantSlug
    const wantRoles = historyMode ? new Set(['user', 'assistant']) : new Set(['assistant'])
    const filtered = rows.filter((row) => {
      const role = row.role || (row.agentSlug ? 'assistant' : 'user')
      if (!wantRoles.has(role)) return false
      if (!(row.createdAt > sinceMs)) return false
      const m = row.metadata || {}
      // Never surface file-share / attachment messages (the mission-folder
      // watcher posts these for operators; they confuse embed visitors).
      if (m.attachment || (Array.isArray(m.attachments) && m.attachments.length)
        || (Array.isArray(row.attachments) && row.attachments.length)) {
        return false
      }
      // Drop empty/whitespace-only rows — the bridge occasionally writes a
      // blank assistant message after tool work; it renders as a tiny empty
      // bubble in the widget (seen live 2026-06-11).
      const bodyText =
        (role === 'user' && m.visitor_text) || row.text || ''
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
      if (role === 'user' && (m.embed_visitor_id || '') !== visitorId) {
        return false
      }
      // Agent rows: strict allowlist. Show only rows tagged for this visitor
      // (embed-ai path) or replies whose reply_to is one of the visitor's own
      // messages. Operator conversations and build/status traffic in the same
      // room never pass.
      if (role !== 'user' && visitorId) {
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
        } else if (!row.replyTo || !visitorMsgIds.has(String(row.replyTo))) {
          return false
        }
      }
      return true
    }).slice(-(historyMode ? 200 : 20))

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
      messages: filtered.map((row) => {
        const role = row.role || (row.agentSlug ? 'assistant' : 'user')
        return {
          id: row._id,
          role,
          // User rows store "— Web Portal"-suffixed text; show the clean
          // visitor text preserved in metadata instead.
          text:
            role === 'user'
              ? (row.metadata && row.metadata.visitor_text) || row.text
              : stripReasoningLeak(row.text),
          timestamp: toIso(row.createdAt),
        }
      }),
    })
  } catch (err) {
    return res.status(500).json({ error: String(err && err.message) })
  }
}
