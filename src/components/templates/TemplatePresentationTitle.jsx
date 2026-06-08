import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplatePresentationTitle({
  headline = 'AI ADVISORY PROGRAM',
  subtitle = 'How we build intelligent systems for businesses that move fast.',
  date = '2026',
  presenter = 'Patrik Matheson',
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '16 / 9',
      background: C.night,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: 28,
      overflow: 'hidden',
      fontFamily: '"Hanken Grotesk", sans-serif',
      position: 'relative',
    }}>
      {/* AOM logo top-left */}
      <div>
        <span style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 16,
          fontWeight: 800,
          color: C.textLight,
        }}>AOM<span style={{ color: C.orange }}>.</span></span>
      </div>

      {/* Title centered */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        maxWidth: '90%',
        margin: '0 auto',
      }}>
        <div style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 28,
          fontWeight: 800,
          color: C.cream,
          textAlign: 'center',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          marginBottom: 10,
        }}>{headline}</div>
        <div style={{
          fontSize: 11,
          fontWeight: 400,
          color: C.textMuted,
          textAlign: 'center',
          lineHeight: 1.5,
          maxWidth: '80%',
        }}>{subtitle}</div>
      </div>

      {/* Date/presenter bottom-left + pattern strip */}
      <div>
        <div style={{
          fontFamily: '"Hanken Grotesk", sans-serif',
          fontSize: 9,
          fontWeight: 500,
          color: C.textMuted,
          marginBottom: 8,
        }}>{presenter} / {date}</div>
        <div style={{
          height: 3,
          width: '100%',
          background: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(232,93,38,0.25) 4px, rgba(232,93,38,0.25) 5px)`,
        }} />
      </div>
    </div>
  )
}
