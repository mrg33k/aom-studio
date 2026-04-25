import { useEffect, useState } from 'react'

// iMessage-style status label under user message bubbles.
// 'composing': shows "Read" for 800ms then transitions to animated dots.
// 'read': shows "Read" persistently.
// Renders nothing when already responded (caller guards with respondedSet).
export default function MessageStatusLabel({ status }) {
  const [showDots, setShowDots] = useState(false)

  useEffect(() => {
    if (status === 'composing') {
      setShowDots(false)
      const t = setTimeout(() => setShowDots(true), 800)
      return () => clearTimeout(t)
    }
    setShowDots(false)
  }, [status])

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

  if (status === 'read' || !showDots) {
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
