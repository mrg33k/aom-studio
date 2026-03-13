import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplatePresentationContent({
  headline = 'THE PROBLEM',
  body = 'Most businesses are running blind. No system, no visibility, no leverage. They hire people to do what software should handle.',
  sectionLabel = 'CONTEXT',
  pageNumber = '02',
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
      fontFamily: '"Space Grotesk", sans-serif',
      position: 'relative',
    }}>
      {/* Section label top-left */}
      <div style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: C.orange,
      }}>{sectionLabel}</div>

      {/* Content area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        maxWidth: '85%',
      }}>
        <div style={{
          fontFamily: '"Syne", sans-serif',
          fontSize: 22,
          fontWeight: 800,
          color: C.cream,
          lineHeight: 1.15,
          marginBottom: 12,
        }}>{headline}</div>
        <div style={{
          fontSize: 11,
          fontWeight: 400,
          color: C.textMuted,
          lineHeight: 1.65,
        }}>{body}</div>
      </div>

      {/* Page number bottom-right */}
      <div style={{
        textAlign: 'right',
      }}>
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 9,
          fontWeight: 400,
          color: '#5A5550',
        }}>{pageNumber}</span>
      </div>
    </div>
  )
}
