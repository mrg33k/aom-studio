import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

function Dot({ s = '0.5em', c = C.orange }) {
  return <span style={{ display: 'inline-block', width: s, height: s, borderRadius: 0, background: c, marginLeft: '0.06em', verticalAlign: 'baseline' }} />
}

/* Testimonial — 1:1. Fraunces quote led, editorial. */
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
      justifyContent: 'space-between',
      padding: '8%',
      overflow: 'hidden',
      position: 'relative',
      containerType: 'inline-size',
      fontFamily: '"Hanken Grotesk", sans-serif',
    }}>
      {/* oversized quote mark */}
      <div style={{ fontFamily: '"Fraunces", serif', fontSize: '34cqw', fontWeight: 500, color: C.orange, lineHeight: 0.7, height: '14%' }}>&ldquo;</div>

      {/* quote */}
      <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: '8.4cqw', fontWeight: 400, color: C.cream, lineHeight: 1.28, letterSpacing: '-0.01em', margin: 0 }}>
        {quote}
      </p>

      {/* attribution */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4%' }}>
        <span style={{ width: '7%', height: 2, background: C.orange, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: '4cqw', fontWeight: 700, color: C.textLight, letterSpacing: '0.04em' }}>{name}</div>
          <div style={{ fontSize: '3.2cqw', fontWeight: 500, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '0.4cqw' }}>{title}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: '"Syne", sans-serif', fontSize: '4.4cqw', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em' }}>AOM<Dot /></span>
      </div>
    </div>
  )
}
