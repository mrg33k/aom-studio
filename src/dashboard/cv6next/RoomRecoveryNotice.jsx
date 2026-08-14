import React from 'react'

function recoveryCopy(health) {
  if (!health) return null
  if (health.state === 'settled') return null
  if (health.state === 'recovering' || health.repaired) {
    if (health.action === 'requeue_expired_job') return 'Corner found an expired worker lease and requeued this exact turn.'
    if (health.action === 'clear_stale_status') return 'Corner cleared a stale room status after confirming no worker was running.'
    return 'Corner noticed this turn stalled and woke its runner. Checking the same turn now.'
  }
  if (health.state === 'needs_attention') {
    return {
      reply_room_mismatch: 'A reply landed outside this room. Corner preserved it and stopped before moving data.',
      settled_without_reply: 'The worker stopped without leaving a reply. Your message is preserved.',
      runner_failed: 'The worker reported a failure. Corner preserved the turn instead of retrying unknown work.',
      write_failed: 'The message was not accepted. Corner kept your draft so you can retry safely.',
      message_missing: 'Corner could not verify the saved message and stopped safely.',
      unclaimed: 'Corner could not safely start this turn after one recovery attempt.',
      // corner:bridge frontend-visibility D1 — the dead-turn backstop used to switch the
      // working bar off and say nothing at all, which is the exact "it failed mid turn and
      // I don't know what's happening" report. Say it, and give it somewhere to go.
 agent_silent: 'The agent went quiet — 90 seconds with no update. Your message is saved. Tap retry or ask for a status.',
    }[health.cause] || 'Corner could not safely recover this turn automatically. Your message is preserved.'
  }
  return null
}

// The turn's own health, at the tail of the thread. `onRetry` / `onNudge` are only
// offered on a turn that died with nothing to show for it (the agent went quiet);
// every other cause is a state the server is already handling and a second send
// would only duplicate work.
export default function RoomRecoveryNotice({ health, onRetry, onNudge, onRestart }) {
  const copy = recoveryCopy(health)
  if (!copy) return null
  const attention = health.state === 'needs_attention'
  const canRetry = attention && health.cause === 'agent_silent' && (onRetry || onNudge)
  // R-SMOOTHNESS Round E: hard causes get a one-tap restart — the same
  // server-allowlisted steward repair the 45s auto path runs, on demand.
  const canRestart = attention && onRestart
    && ['runner_failed', 'unclaimed', 'settled_without_reply', 'message_missing'].includes(health.cause)
  return (
    <div className={`cv6-room-recovery${attention ? ' is-attention' : ' is-recovering'}`} role="status" aria-live="polite">
      <span className="cv6-room-recovery-mark" aria-hidden="true">{attention ? '!' : '↻'}</span>
      <div className="cv6-room-recovery-body">
        <span><strong>{attention ? 'Needs a look' : 'Self-repairing'}</strong>{copy}</span>
        {canRetry || canRestart ? (
          <div className="cv6-room-recovery-actions">
            {canRestart ? <button type="button" className="cv6-room-recovery-act" onClick={onRestart}>Restart this turn</button> : null}
            {onRetry && canRetry ? <button type="button" className="cv6-room-recovery-act" onClick={onRetry}>Send it again</button> : null}
            {onNudge && canRetry ? <button type="button" className="cv6-room-recovery-act is-quiet" onClick={onNudge}>Ask for a status</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}