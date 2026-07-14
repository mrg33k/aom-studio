const CLOSING_ACTIONS = new Set(['approve', 'request-changes', 'dismiss'])

function clean(value) {
  return String(value == null ? '' : value).trim()
}

function decisionValue(value) {
  if (!value || typeof value !== 'object') return null
  const action = clean(value.action)
  if (!CLOSING_ACTIONS.has(action)) return null
  return { action, id: clean(value.id) || null }
}

export function reviewVerdictForItem(item, decisions = {}) {
  const byId = decisions.decidedIds || decisions.byId || new Map()
  const byContent = decisions.decidedContent || decisions.byContent || new Map()
  const path = clean(item?.path || item?.id)
  if (path && byId.has(path)) return decisionValue(byId.get(path))
  const sourcePath = clean(item?.source_path || item?.sourcePath)
  const sha256 = clean(item?.sha256)
  if (sourcePath && sha256) return decisionValue(byContent.get(`${sourcePath} ${sha256}`))
  return null
}

function normalizeReviewView(view) {
  const raw = Array.isArray(view) ? view[0] : view
  return clean(raw) === 'all' ? 'all' : 'waiting'
}

function newestHandoffTimestamp(items) {
  const handoff = (items || []).find((item) => item?.source_kind === 'handoff' || item?.sourceKind === 'handoff')
  return handoff ? (handoff.last_modified || handoff.updatedAt || null) : null
}

// Backend-owned Review truth snapshot: every visible row, count, and status stamp is
// derived from this single filtered collection. Callers must not independently
// reconstruct waiting/decided truth from a different list.
export function buildReviewTruthSnapshot({
  items = [],
  decisions = {},
  view = 'waiting',
  limit = 40,
  offset = 0,
} = {}) {
  const all = Array.isArray(items) ? items : []
  const withVerdicts = all.map((item) => {
    const verdict = reviewVerdictForItem(item, decisions)
    return {
      item,
      verdict,
      waiting: (item?.source_kind === 'handoff' || item?.sourceKind === 'handoff') && !verdict,
      decided: !!verdict,
    }
  })
  const counts = {
    waiting: withVerdicts.reduce((n, row) => n + (row.waiting ? 1 : 0), 0),
    decided: withVerdicts.reduce((n, row) => n + (row.decided ? 1 : 0), 0),
  }
  const visible = normalizeReviewView(view) === 'all'
    ? withVerdicts.map((row) => ({
      ...row.item,
      verdict: row.verdict ? row.verdict.action : null,
      decision_id: row.verdict ? row.verdict.id : null,
    }))
    : withVerdicts.filter((row) => row.waiting).map((row) => row.item)

  const safeOffset = Math.max(0, Number.isFinite(Number(offset)) ? Number(offset) : 0)
  const safeLimit = Math.max(0, Number.isFinite(Number(limit)) ? Number(limit) : visible.length)
  const pageItems = safeLimit === 0 ? [] : visible.slice(safeOffset, safeOffset + safeLimit)

  return {
    items: pageItems,
    total: visible.length,
    offset: safeOffset,
    hasMore: safeOffset + pageItems.length < visible.length,
    source: 'chat',
    newest_ts: newestHandoffTimestamp(all),
    counts,
  }
}
