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
