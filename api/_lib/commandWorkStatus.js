// Command work-state truth (corner:corner-ui-cv6 R-CMD-BUCKETS, 2026-07-18).
//
// Patrik's bug: "Command center doesnt know whats in progress vs whats proposed
// vs whats done." Root cause: the Command activity feed rendered ONLY
// heartbeat-live sessions (/api/dashboard/active-agents) and stamped every card
// LIVE, while the tasks table's real lifecycle (queued / running / done /
// failed / needs_input) was already fetched via supabase-status but discarded.
//
// This module is the ONE mapping from a raw task status to the visible bucket.
// Used by BOTH sides so they can never drift:
//   - api/dashboard/supabase-status.js stamps `bucket` on every task row
//   - useCommandTracker.js shapes the Command activity feed from those rows
//     (and re-classifies as a fallback when a row arrives unstamped)

// Raw statuses seen in the tasks table across the legacy + v2 lanes.
const BUCKET_BY_STATUS = {
  // proposed: queued/idea work nothing has claimed yet
  queued: 'proposed',
  todo: 'proposed',
  idea: 'proposed',
  proposed: 'proposed',
  pending: 'proposed',
  classifying: 'proposed',
  planning: 'proposed',
  // inprogress: claimed and actively being worked
  running: 'inprogress',
  active: 'inprogress',
  working: 'inprogress',
  building: 'inprogress',
  qa: 'inprogress',
  claimed: 'inprogress',
  // done: completed — the payload/summary lives in `result`
  done: 'done',
  completed: 'done',
  // blocked: the worker is waiting on the user
  needs_input: 'blocked',
  blocked: 'blocked',
  // failed: ended without a deliverable
  failed: 'failed',
  error: 'failed',
  // cancelled: intentionally killed — not one of Patrik's buckets, never rendered
}

// Chip labels, in the user's words (rule 4): a queued task is a proposal, a
// needs_input task needs YOU, done means the deliverable landed.
export const COMMAND_WORK_LABEL = {
  proposed: 'PROPOSED',
  inprogress: 'WORKING',
  done: 'DONE',
  blocked: 'NEEDS YOU',
  failed: 'FAILED',
}

// Rail order: what's moving now, then what needs you, then what's queued,
// then what broke, then what finished.
export const COMMAND_WORK_RANK = { inprogress: 0, blocked: 1, proposed: 2, failed: 3, done: 4 }

const DAY_MS = 24 * 60 * 60 * 1000
export const COMMAND_DONE_WINDOW_MS = DAY_MS // terminal work (done/failed) shows for a day
export const COMMAND_OPEN_WINDOW_MS = 7 * DAY_MS // open work (proposed/blocked/inprogress) for a week
export const COMMAND_WORK_CAP = 20

// Raw status -> bucket. Unknown/cancelled -> null (hidden): mislabeling real
// work is a lie; an unknown state renders nothing rather than the wrong chip.
export function classifyCommandWorkBucket(status) {
  const s = String(status == null ? '' : status).trim().toLowerCase()
  return BUCKET_BY_STATUS[s] || null
}

// One line out of a task-completion payload. The completion format stores
// result as JSON: {"type":...,"payload":...,"summary":"one line"}. The API
// truncates result to a preview length, so the JSON may arrive cut off —
// fall back to pulling the summary field out of the partial string.
export function commandResultSummary(result) {
  if (!result) return ''
  if (typeof result === 'object') return String(result.summary || '').trim()
  const s = String(result)
  try {
    const parsed = JSON.parse(s)
    if (parsed && typeof parsed === 'object') return String(parsed.summary || '').trim()
  } catch { /* truncated JSON — fall through to the field scan */ }
  const m = s.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)/)
  if (!m) return ''
  try { return JSON.parse('"' + m[1] + '"').trim() } catch { return m[1].trim() }
}

function timeMs(value) {
  if (!value) return 0
  const t = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

function taskTime(t) {
  return timeMs(t.completed_at) || timeMs(t.updated_at) || timeMs(t.created_at)
}

// Merge raw task rows (legacy + v2, already status-stamped or not) into the
// Command activity feed's work items: classified, deduped (by id and against
// live heartbeat sessions), recency-windowed, ranked, capped. Pure — the hook
// does the presentation (names, relative times, text cleaning) on top.
export function shapeCommandWorkItems({
  tasks = [],
  sessions = [],
  now = Date.now(),
  doneWindowMs = COMMAND_DONE_WINDOW_MS,
  openWindowMs = COMMAND_OPEN_WINDOW_MS,
  cap = COMMAND_WORK_CAP,
} = {}) {
  // Work a live session already represents (its card carries the LIVE truth).
  const liveTaskIds = new Set(
    (sessions || []).map((s) => String((s && s.task_id) || '')).filter(Boolean),
  )
  const seen = new Set()
  const items = []
  for (const t of tasks || []) {
    if (!t || typeof t !== 'object') continue
    const id = String(t.id == null ? '' : t.id)
    if (!id || seen.has(id) || liveTaskIds.has(id)) continue
    seen.add(id)
    const bucket = (t.bucket && COMMAND_WORK_LABEL[t.bucket]) ? t.bucket : classifyCommandWorkBucket(t.status)
    if (!bucket) continue
    const tMs = taskTime(t)
    const windowMs = (bucket === 'done' || bucket === 'failed') ? doneWindowMs : openWindowMs
    if (!tMs || (now - tMs) > windowMs) continue
    items.push({
      id,
      bucket,
      label: COMMAND_WORK_LABEL[bucket],
      t: tMs,
      title: String(t.title || t.text || '').trim(),
      agent: String(t.agent_identity || t.agent || '').trim(),
      project: String((t.metadata && t.metadata.project) || t.project || '').trim(),
      summary: bucket === 'done' ? commandResultSummary(t.result) : '',
      error: bucket === 'failed' ? String(t.error || '').trim() : '',
    })
  }
  items.sort((a, b) => (COMMAND_WORK_RANK[a.bucket] - COMMAND_WORK_RANK[b.bucket]) || (b.t - a.t))
  return items.slice(0, cap)
}

// The header line over the activity rail: Patrik's three buckets are ALWAYS
// named (a zero is information); the honest edge states only when present.
export function commandWorkSubLine(counts = {}) {
  const n = (k) => Number(counts[k] || 0)
  const bits = [
    `${n('proposed')} proposed`,
    `${n('inprogress')} in progress`,
    `${n('done')} done`,
  ]
  if (n('blocked')) bits.push(`${n('blocked')} need${n('blocked') === 1 ? 's' : ''} you`)
  if (n('failed')) bits.push(`${n('failed')} failed`)
  return bits.join(' · ')
}
