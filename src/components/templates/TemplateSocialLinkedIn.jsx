import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
  white: '#FFFFFF',
}

export default function TemplateSocialLinkedIn({
  headline = 'SMALL TEAM. BIG OUTPUT.',
  body = 'We deliver what agencies take months to produce. No layers, no delays, no excuses.',
  cta = 'GET STARTED',
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '1.91 / 1',
      background: C.night,
      display: 'flex',
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      {/* Left: image zone (50%) */}
      <div style={{
        flex: '0 0 50%',
        background: 'linear-gradient(135deg, #1a1208 0%, #0C0C0C 50%, rgba(232,93,38,0.06) 100%)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: 'linear-gradient(to right, transparent, #0C0C0C)',
        }} />
      </div>

      {/* Right: content zone (50%) */}
      <div style={{
        flex: '0 0 50%',
        background: C.night,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* AOM logo top-right */}
        <div style={{ textAlign: 'right' }}>
          <span style={{
            fontFamily: '"Syne", sans-serif',
            fontSize: 14,
            fontWeight: 800,
            color: C.textLight,
          }}>AOM<span style={{ color: C.orange }}>.</span></span>
        </div>

        {/* Content */}
        <div>
          <div style={{
            fontFamily: '"Syne", sans-serif',
            fontSize: 18,
            fontWeight: 800,
            color: C.cream,
            textTransform: 'uppercase',
            lineHeight: 1.15,
            marginBottom: 10,
          }}>{headline}</div>
          <div style={{
            fontSize: 10,
            color: C.textMuted,
            lineHeight: 1.5,
          }}>{body}</div>
        </div>

        {/* CTA strip */}
        <div style={{
          background: C.orange,
          padding: '6px 12px',
          textAlign: 'center',
          marginTop: 12,
        }}>
          <span style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 9,
            fontWeight: 600,
            color: C.white,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>{cta}</span>
        </div>
      </div>
    </div>
  )
}
