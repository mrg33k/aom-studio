import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplateSocialIGStory({
  headline = 'BUILT DIFFERENT',
  category = 'BEHIND THE SCENES',
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '9 / 16',
      background: C.night,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      {/* Full-bleed image zone (top 65%) */}
      <div style={{
        flex: '0 0 65%',
        background: 'linear-gradient(160deg, #1a1208 0%, #0C0C0C 40%, rgba(232,93,38,0.06) 100%)',
        position: 'relative',
      }}>
        {/* Gradient overlay into text zone */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 40%, #0C0C0C 75%)',
        }} />
      </div>

      {/* Text zone */}
      <div style={{
        flex: 1,
        padding: '0 20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        position: 'relative',
        zIndex: 1,
        marginTop: -60,
      }}>
        {/* Category label */}
        <div style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: C.orange,
          marginBottom: 10,
        }}>{category}</div>

        {/* Headline */}
        <div style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 26,
          fontWeight: 800,
          color: C.cream,
          textTransform: 'uppercase',
          lineHeight: 1.1,
        }}>{headline}</div>
      </div>

      {/* Logo bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
      }}>
        <span style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 14,
          fontWeight: 800,
          color: C.textLight,
        }}>AOM<span style={{ color: C.orange }}>.</span></span>
      </div>
    </div>
  )
}
