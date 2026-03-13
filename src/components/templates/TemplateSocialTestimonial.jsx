import React from 'react'

const C = {
  night: '#0C0C0C',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

export default function TemplateSocialTestimonial({
  quote = 'They delivered in 3 days what our last agency took 3 months to do. Not even close.',
  name = 'Client Name',
  title = 'CEO, Company',
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '1 / 1',
      background: C.night,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", sans-serif',
      position: 'relative',
    }}>
      {/* Large open-quote */}
      <div style={{
        fontFamily: '"Syne", sans-serif',
        fontSize: 48,
        fontWeight: 800,
        color: C.orange,
        opacity: 0.3,
        lineHeight: 1,
        marginBottom: 4,
      }}>&ldquo;</div>

      {/* Orange accent line */}
      <div style={{
        width: 36,
        height: 2,
        background: C.orange,
        marginBottom: 16,
      }} />

      {/* Quote */}
      <div style={{
        fontSize: 13,
        fontWeight: 400,
        color: C.textLight,
        fontStyle: 'italic',
        textAlign: 'center',
        lineHeight: 1.6,
        maxWidth: '30ch',
        marginBottom: 20,
      }}>{quote}</div>

      {/* Attribution */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: C.textLight,
        }}>{name}</div>
        <div style={{
          fontSize: 10,
          fontWeight: 400,
          color: C.textMuted,
          marginTop: 2,
        }}>{title}</div>
      </div>
    </div>
  )
}
