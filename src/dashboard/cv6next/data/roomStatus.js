// R-A3 — One turn-state truth, read by every surface (TOP-20 #22).
// The room always answers, at any instant: accepted (was the message written),
// running (is anything alive), who (which agent holds it, by title), what
// (current step in plain user language), last sign of life (timestamp), ended
// (settled / failed / went silent, and which). Every surface renders from this
// one object — indicator, room list, recent rows, mobile. No surface computes
// its own opinion of whether the room is busy.
//
// One status vocabulary for the OPEN room (R-SMOOTHNESS Round E).
// Pure derivation from the thread engine's snapshot — no fetching, no state.
// Every surface (header pill, drawer, step card) reads THIS, so the room can
// never say two different things about the same turn.
//
// Values: thinking | working | streaming | stopping | needs_you | stuck | idle
// Honesty rules:
//   - streaming needs a live draft (Round D), dormant until the bridge flag is on
//   - needs_you = recoverable needs_attention (the turn wants a human decision)
//   - stuck = hard needs_attention causes, or a live turn on a stale feed
//   - the settled 'waiting' phase is deliberately NOT mapped to needs_you:
//     chips end most replies, so it would light on nearly every turn

const HARD_CAUSES = ['runner_failed', 'unclaimed', 'message_missing', 'reply_room_mismatch']

export function deriveRoomStatus({ awaiting, liveSteps, draft, turnHealth, connection } = {}) {
  const th = turnHealth || null
  if (th?.state === 'stopping') return 'stopping'
  if (th?.state === 'needs_attention') {
    return HARD_CAUSES.includes(th?.cause || '') ? 'stuck' : 'needs_you'
  }
  if (awaiting && connection?.feed === 'stale') return 'stuck'
  if (awaiting && draft?.streaming) return 'streaming'
  if (awaiting && (liveSteps || []).length) return 'working'
  if (awaiting) return 'thinking'
  return 'idle'
}

export const ROOM_STATUS_LABEL = {
  thinking: 'Thinking',
  working: 'Working',
  streaming: 'Writing',
  stopping: 'Stopping…',
  needs_you: 'Needs you',
  stuck: 'Stuck',
  idle: '',
}

// Tone buckets map onto the existing astat/kit chip classes.
export const ROOM_STATUS_TONE = {
  thinking: 'live',
  working: 'live',
  streaming: 'live',
  stopping: 'live',
  needs_you: 'blocked',
  stuck: 'blocked',
  idle: '',
}

// ── R-A3: turnState — the single truth object (TOP-20 #22) ────────────────
// Every surface (indicator, room list, recent rows, mobile) reads this one
// object instead of recomputing its own opinion of whether the room is busy.
// That is why indicators disagreed — each one guessed. Now they don't.
//
// `what` is governed by §3 — a person saying what they are doing, never
// internal state, never a path, never a component name.
export function deriveTurnState({ awaiting, liveSteps, draft, turnHealth, connection, lastSentId, lastSentTs, lastSentText, turnStartTs } = {}) {
  const status = deriveRoomStatus({ awaiting, liveSteps, draft, turnHealth, connection })
  const running = status !== 'idle'
  const accepted = Boolean(lastSentId)
  // `who` — which agent holds it, by title. Resolved via titleForAgent at call site
  // when the room's host is known; this field carries the raw slug, the surface maps it.
  const whoSlug = turnHealth?.agent || null
  // `what` — current step in plain user language. First live step wins, else the
  // currentAsk fallback (RoomWorkList does this). Never expose internal state.
  const liveLabel = (liveSteps || []).find((s) => s && s.text && s.step_index !== 9999)?.text || ''
  const what = liveLabel || (running ? (lastSentText ? `Working on: ${String(lastSentText).slice(0, 60)}` : 'Working') : '')
  const lastSignOfLife = (() => {
    const stepTimes = (liveSteps || []).map((s) => s.timestamp ? new Date(s.timestamp).getTime() : 0).filter(Boolean)
    const lastStep = stepTimes.length ? Math.max(...stepTimes) : 0
    const draftTime = draft?.streaming ? Date.now() : 0
    return Math.max(lastSentTs || 0, lastStep, draftTime, turnStartTs || 0) || null
  })()
  const ended = (() => {
    if (!turnHealth) return null
    if (turnHealth.state === 'settled') return { kind: 'settled', at: turnHealth.at || null }
    if (turnHealth.state === 'needs_attention') {
      if (turnHealth.cause === 'agent_silent') return { kind: 'went_silent', cause: turnHealth.cause }
      if (HARD_CAUSES.includes(turnHealth.cause || '')) return { kind: 'failed', cause: turnHealth.cause }
      return { kind: 'needs_attention', cause: turnHealth.cause }
    }
    return null
  })()
  return {
    accepted,
    running,
    status,
    whoSlug,
    what,
    lastSignOfLife,
    lastSentId: lastSentId || null,
    lastSentTs: lastSentTs || null,
    ended,
    // Raw fields for surfaces that need them, but the six above are the contract
    _raw: { awaiting, liveSteps, draft, turnHealth, connection },
  }
}
