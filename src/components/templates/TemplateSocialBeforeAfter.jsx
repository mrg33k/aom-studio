import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplateSocialBeforeAfter({
  name = 'AMBITION MECHANICAL',
}) {
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
      {/* Two images side by side */}
      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
      }}>
        {/* Before */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(180deg, #1a1a17 0%, #111 100%)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            color: C.cream,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
          }}>BEFORE</div>
        </div>

        {/* Divider */}
        <div style={{
          width: 2,
          background: C.orange,
          flexShrink: 0,
        }} />

        {/* After */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(180deg, #1c1810 0%, #151510 100%)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            fontWeight: 700,
            color: C.cream,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.6)',
            padding: '4px 8px',
          }}>AFTER</div>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{
        background: C.night,
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `1px solid rgba(255,255,255,0.06)`,
      }}>
        <span style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 10,
          fontWeight: 600,
          color: C.textMuted,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>{name}</span>
        <span style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 12,
          fontWeight: 800,
          color: C.textLight,
        }}>AOM<span style={{ color: C.orange }}>.</span></span>
      </div>
    </div>
  )
}
