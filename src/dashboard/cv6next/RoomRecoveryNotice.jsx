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
    }[health.cause] || 'Corner could not safely recover this turn automatically. Your message is preserved.'
  }
  return null
}

export default function RoomRecoveryNotice({ health }) {
  const copy = recoveryCopy(health)
  if (!copy) return null
  const attention = health.state === 'needs_attention'
  return (
    <div className={`cv6-room-recovery${attention ? ' is-attention' : ' is-recovering'}`} role="status" aria-live="polite">
      <span className="cv6-room-recovery-mark" aria-hidden="true">{attention ? '!' : '↻'}</span>
      <span><strong>{attention ? 'Needs a look' : 'Self-repairing'}</strong>{copy}</span>
    </div>
  )
}
