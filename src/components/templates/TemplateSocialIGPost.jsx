import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplateSocialIGPost({
  headline = 'CONTENT THAT CONVERTS',
  body = 'We turned posting into pipeline. Real strategy, real results.',
  category = 'CASE STUDY',
  stat = null,
  statLabel = null,
}) {
  const isStatVariant = stat && statLabel

  return (
    <div style={{
      width: '100%',
      aspectRatio: '1 / 1',
      background: C.night,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      {/* Image zone (top 60%) */}
      <div style={{
        flex: '0 0 60%',
        background: 'linear-gradient(135deg, #1a1208 0%, #0C0C0C 60%, rgba(232,93,38,0.08) 100%)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: C.orange,
        }}>{category}</div>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, #0C0C0C 100%)',
        }} />
      </div>

      {/* Text zone (bottom 40%) */}
      <div style={{
        flex: '0 0 40%',
        background: C.night,
        padding: '0 20px 16px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        borderLeft: `3px solid ${C.orange}`,
        marginLeft: 16,
      }}>
        {isStatVariant ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 42,
              fontWeight: 900,
              color: C.orange,
              lineHeight: 1,
            }}>{stat}</div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 11,
              fontWeight: 600,
              color: C.textMuted,
              marginTop: 6,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>{statLabel}</div>
          </div>
        ) : (
          <>
            <div style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 20,
              fontWeight: 800,
              color: C.cream,
              textTransform: 'uppercase',
              lineHeight: 1.15,
              marginBottom: 8,
            }}>{headline}</div>
            <div style={{
              fontSize: 11,
              color: C.textMuted,
              lineHeight: 1.5,
            }}>{body}</div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: '8px 16px',
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 8,
          fontWeight: 500,
          color: C.orange,
          letterSpacing: '0.2em',
        }}>AHEADOFMARKET.COM</span>
      </div>
    </div>
  )
}
