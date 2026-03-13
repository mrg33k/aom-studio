import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplateSocialQuickTip({
  headline = 'STOP POSTING WITHOUT A PLAN',
  body = 'Random content is worse than no content. Every post should move a prospect one step closer to booking.',
  category = 'CONSTRUCTION TIP',
  tipNumber = '01',
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '1 / 1',
      background: C.night,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 28,
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", sans-serif',
      position: 'relative',
    }}>
      {/* Watermark number */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        fontFamily: '"Syne", sans-serif',
        fontSize: 64,
        fontWeight: 900,
        color: 'rgba(232,93,38,0.15)',
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
      }}>{tipNumber}</div>

      {/* Category label */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: C.orange,
        marginBottom: 14,
      }}>{category}</div>

      {/* Headline */}
      <div style={{
        fontFamily: '"Syne", sans-serif',
        fontSize: 20,
        fontWeight: 800,
        color: C.cream,
        textTransform: 'uppercase',
        lineHeight: 1.15,
        marginBottom: 12,
        maxWidth: '85%',
      }}>{headline}</div>

      {/* Body */}
      <div style={{
        fontSize: 11,
        color: C.textMuted,
        lineHeight: 1.6,
        maxWidth: '80%',
      }}>{body}</div>

      {/* Bottom: logo + URL */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 28,
        right: 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 12,
          fontWeight: 800,
          color: C.textLight,
        }}>AOM<span style={{ color: C.orange }}>.</span></span>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 7,
          fontWeight: 500,
          color: C.textMuted,
          letterSpacing: '0.15em',
        }}>AHEADOFMARKET.COM</span>
      </div>
    </div>
  )
}
