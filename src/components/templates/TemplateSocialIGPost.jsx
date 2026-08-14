import React from 'react'

const C = {
  night: '#0C0C0C',
  nightSoft: '#141210',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

function Dot({ s = '0.5em', c = C.orange }) {
  return <span style={{ display: 'inline-block', width: s, height: s, borderRadius: 0, background: c, marginLeft: '0.06em', verticalAlign: 'baseline' }} />
}

/* IG Post — 1:1. Type-forward brand poster. No photo placeholder. */
export default function TemplateSocialIGPost({
  headline = 'CONTENT THAT CONVERTS',
  body = 'We turned posting into pipeline with real strategy and real results.',
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
      justifyContent: 'space-between',
      padding: '7%',
      overflow: 'hidden',
      position: 'relative',
      containerType: 'inline-size',
      fontFamily: '"Hanken Grotesk", sans-serif',
    }}>
      {/* oversized brand dot, bled off the corner */}
      <div style={{ position: 'absolute', right: '-9%', bottom: '-9%', width: '38%', aspectRatio: '1', borderRadius: '50%', background: C.orange, opacity: 0.1 }} />

      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '3.2cqw', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.orange }}>{category}</span>
        <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '4.6cqw', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em' }}>AOM<Dot /></span>
      </div>

      {/* body */}
      {isStatVariant ? (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: '"Syne", sans-serif', fontSize: '26cqw', fontWeight: 800, color: C.orange, lineHeight: 0.9, letterSpacing: '-0.04em' }}>{stat}</div>
          <div style={{ fontSize: '4cqw', fontWeight: 600, color: C.textLight, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '3%' }}>{statLabel}</div>
        </div>
      ) : (
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: '11.5cqw', fontWeight: 800, color: C.cream, textTransform: 'uppercase', lineHeight: 1.02, letterSpacing: '-0.02em', margin: 0 }}>{headline}</h3>
          <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: '5cqw', fontWeight: 400, color: C.textMuted, lineHeight: 1.3, margin: '5% 0 0', maxWidth: '88%' }}>{body}</p>
        </div>
      )}

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4%', position: 'relative', zIndex: 1 }}>
        <span style={{ width: '8%', height: 2, background: C.orange, flexShrink: 0 }} />
        <span style={{ fontSize: '2.7cqw', fontWeight: 600, color: C.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>aheadofmarket.com</span>
      </div>
    </div>
  )
}
