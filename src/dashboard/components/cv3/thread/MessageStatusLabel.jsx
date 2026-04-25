import { useEffect, useRef, useState } from 'react'

// iMessage-style status label under user message bubbles.
// Cascades: Read (≥300ms) → Composing animated dots → hidden.
//
// `replied` decouples visibility from the parent's respondedSet guard so that
// even when the agent reply lands in the same React batch as the status=composing
// UPDATE, the label still plays the full ladder instead of being silently skipped.
export default function MessageStatusLabel({ status, replied }) {
  const [showDots, setShowDots] = useState(false)
  const [visible, setVisible] = useState(true)
  const phaseRef = useRef('read') // 'read' | 'composing' | 'gone'
  const timerRef = useRef(null)
  const composingTimerRef = useRef(null)

  // Read → Composing transition when status becomes 'composing'
  useEffect(() => {
    clearTimeout(composingTimerRef.current)
    if (status === 'composing') {
      setShowDots(false)
      phaseRef.current = 'read'
      composingTimerRef.current = setTimeout(() => {
        setShowDots(true)
        phaseRef.current = 'composing'
      }, 800)
    } else {
      setShowDots(false)
      phaseRef.current = 'read'
    }
  }, [status])

  // When reply arrives: enforce minimum dwell so the ladder is always visible
  useEffect(() => {
    if (!replied) {
      clearTimeout(timerRef.current)
      setVisible(true)
      return
    }
    // Reply has landed — cancel any pending composing transition and schedule hide
    clearTimeout(composingTimerRef.current)
    clearTimeout(timerRef.current)

    const phase = phaseRef.current
    if (phase === 'composing') {
      // Already showing Composing dots — hold 300ms then hide
      timerRef.current = setTimeout(() => {
        setVisible(false)
        phaseRef.current = 'gone'
      }, 300)
    } else if (status === 'composing') {
      // Still in Read phase of a composing sequence — flash Read 300ms,
      // then Composing 300ms, then hide so the user sees the full ladder
      timerRef.current = setTimeout(() => {
        setShowDots(true)
        phaseRef.current = 'composing'
        timerRef.current = setTimeout(() => {
          setVisible(false)
          phaseRef.current = 'gone'
        }, 300)
      }, 300)
    } else {
      // status='read' (persistent) — show 300ms then hide
      timerRef.current = setTimeout(() => {
        setVisible(false)
        phaseRef.current = 'gone'
      }, 300)
    }
  }, [replied]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    clearTimeout(timerRef.current)
    clearTimeout(composingTimerRef.current)
  }, [])

  if (!visible) return null
  if (status !== 'read' && status !== 'composing') return null

  const label = (
    <span style={{
      fontSize: 11,
      color: 'rgba(148,163,184,0.5)',
      fontFamily: "'Inter', sans-serif",
    }}>
      Read
    </span>
  )

  if (!showDots) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
        {label}
      </div>
    )
  }

  return (
    <>
      <style>{`@keyframes msgDot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-3px);opacity:.9}}`}</style>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2 }}>
        <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontFamily: "'Inter', sans-serif" }}>
          Composing
        </span>
        <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'rgba(148,163,184,0.5)',
              display: 'inline-block',
              animation: `msgDot 1.2s ease-in-out ${i * 0.15}s infinite`,
            }} />
          ))}
        </span>
      </div>
    </>
  )
}
