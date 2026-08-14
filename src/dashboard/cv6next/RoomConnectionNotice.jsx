import React from 'react'

// ── The room's connection, said out loud (corner:bridge frontend-visibility D6) ──
//
// Before this there was no health affordance anywhere on the chat surface: no pill, no
// "reconnecting", no offline banner. A room whose realtime socket had died, or whose
// thread fetch was 401ing, looked exactly like a healthy quiet room — so "chat stopped
// working" was something you could only ever infer from silence.
//
// Deliberately silent while healthy. It renders ONLY when something is actually wrong,
// in the same slim-strip language as RoomRecoveryNotice, and it never implies the
// conversation is lost — what's on screen is the last good load.
function connectionCopy(connection) {
  if (!connection) return null
  // Per-reply-1 copy — user-world words only, never bridge/tmux
  if (connection.queued) {
 return { tone: 'working', label: 'Queued', body: 'Queued, sends when reconnected. Your messages are safe.' }
  }
  if (connection.snag) {
 return { tone: 'attention', label: 'Snag', body: 'This room hit a snag, restarting it now. Your messages are safe.' }
  }
  if (connection.online === false) {
    return { tone: 'attention', label: 'Offline', body: 'You are offline. Messages you send now will not go out until the connection is back.' }
  }
  if (connection.feed === 'stale') {
 return { tone: 'attention', label: 'Not syncing', body: "Corner can't reach this conversation right now. You're seeing the last messages it loaded, nothing was lost." }
  }
  if (connection.realtime === 'reconnecting') {
    return { tone: 'working', label: 'Reconnecting…', body: 'The live connection dropped. New messages may take a few seconds until it is back.' }
  }
  return null
}

export default function RoomConnectionNotice({ connection, onRetry }) {
  const copy = connectionCopy(connection)
  if (!copy) return null
  const attention = copy.tone === 'attention'
  return (
    <div className={`cv6-room-recovery${attention ? ' is-attention' : ' is-recovering'}`} role="status" aria-live="polite">
      <span className="cv6-room-recovery-mark" aria-hidden="true">{attention ? '!' : '↻'}</span>
      <div className="cv6-room-recovery-body">
        <span><strong>{copy.label}</strong>{copy.body}</span>
        {onRetry && connection?.online !== false ? (
          <div className="cv6-room-recovery-actions">
            <button type="button" className="cv6-room-recovery-act" onClick={onRetry}>Try again</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// The whole-thread failure: the very first load never landed, so there is no
// conversation on screen to protect. This is the honest version of the empty room —
// "couldn't load" instead of "start the conversation" (the error copy has existed in
// the CV6 templates since the rebuild and no live surface ever rendered it).
export function RoomThreadError({ onRetry }) {
  return (
    <div className="cv6-thread-error" role="alert">
      <div className="cv6-thread-error-title">Couldn&apos;t load this conversation</div>
      <div className="cv6-thread-error-body">Your connection dropped. Nothing was lost.</div>
      {onRetry ? <button type="button" className="cv6-room-recovery-act" onClick={onRetry}>Try again</button> : null}
    </div>
  )
}