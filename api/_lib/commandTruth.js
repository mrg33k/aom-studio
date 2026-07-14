const DEFAULT_WORKING_WINDOW_MS = 30 * 60 * 1000

const BOOKKEEPING_AUTHORS = new Set([
  'goal-notetaker',
  'master-loop',
  'master-loop-tick',
  'routine-daemon',
  'state-board-sync',
])

function clean(value) {
  return String(value == null ? '' : value).trim()
}

function timeMs(value) {
  if (!value) return 0
  const t = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(t) ? t : 0
}

export function isCommandBookkeepingStamp(event = {}) {
  const source = clean(event.source || event.updated_by || event.updatedBy || event.agent || event.author).toLowerCase()
  const eventType = clean(event.event_type || event.eventType || event.type).toLowerCase()
  const line = clean(event.state_line || event.stateLine || event.text || event.message)

  if (BOOKKEEPING_AUTHORS.has(source)) return true
  if (eventType && ['goal_sweep', 'goal_review', 'room_goal_review', 'state_board_seed'].includes(eventType)) return true
  if (/^goal set:/i.test(line)) return true
  return false
}

export function freshestCommandWorkEvent(events = []) {
  let freshest = null
  for (const event of events || []) {
    if (!event || isCommandBookkeepingStamp(event)) continue
    const t = timeMs(event.t || event.timestamp || event.updated_at || event.updatedAt || event.created_at || event.createdAt)
    if (!t) continue
    if (!freshest || t > freshest.t) freshest = { event, t }
  }
  return freshest
}

export function classifyCommandRoomStatus({
  liveSession = false,
  workEvents = [],
  openQuestion = false,
  questionAskedAt = null,
  now = Date.now(),
  workingWindowMs = DEFAULT_WORKING_WINDOW_MS,
} = {}) {
  const freshest = freshestCommandWorkEvent(workEvents)
  const lastActivity = freshest ? freshest.t : 0
  const questionT = timeMs(questionAskedAt)
  const spokenSinceQuestion = Boolean(openQuestion && questionT && lastActivity && lastActivity > questionT)
  const questionLive = Boolean(openQuestion && !liveSession && !spokenSinceQuestion)
  const freshActivity = Boolean(lastActivity && (now - lastActivity) <= workingWindowMs)

  let status = 'idle'
  let source = 'none'
  let reason = 'No live session or fresh real work event.'
  if (questionLive) {
    status = 'blocked'
    source = 'open_question'
    reason = 'Open question is still current and no live session supersedes it.'
  } else if (liveSession) {
    status = 'working'
    source = 'active_process'
    reason = 'Heartbeat-backed active process is live.'
  } else if (freshActivity) {
    status = 'working'
    source = clean(freshest?.event?.source || freshest?.event?.updated_by || freshest?.event?.event_type || freshest?.event?.role) || 'work_event'
    reason = 'Fresh non-bookkeeping work event is inside the working window.'
  }

  return {
    status,
    statusLabel: status.toUpperCase(),
    source,
    reason,
    lastActivity,
    freshActivity,
    questionLive,
  }
}
