import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

function Dot({ s = '0.5em', c = C.orange }) {
  return <span style={{ display: 'inline-block', width: s, height: s, borderRadius: '50%', background: c, marginLeft: '0.06em', verticalAlign: 'baseline' }} />
}

/* Quick Tip — 1:1. Numbered tip card, watermark index. */
export default function TemplateSocialQuickTip({
  headline = 'STOP POSTING WITHOUT A PLAN',
  body = 'Random content is worse than no content. Every post should move a prospect one step closer to booking.',
  category = 'GROWTH TIP',
  tipNumber = '01',
}) {
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
      {/* watermark number */}
      <div style={{ position: 'absolute', right: '-2%', top: '4%', fontFamily: '"Syne", sans-serif', fontSize: '52cqw', fontWeight: 800, color: 'rgba(232,93,38,0.12)', lineHeight: 0.8, userSelect: 'none', pointerEvents: 'none' }}>{tipNumber}</div>

      {/* category */}
      <span style={{ fontSize: '3.2cqw', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: C.orange, position: 'relative', zIndex: 1 }}>{category}</span>

      {/* headline + body */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: '10.5cqw', fontWeight: 800, color: C.cream, textTransform: 'uppercase', lineHeight: 1.04, letterSpacing: '-0.02em', margin: 0, maxWidth: '82%' }}>{headline}</h3>
        <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: '4.6cqw', color: C.textMuted, lineHeight: 1.4, margin: '5% 0 0', maxWidth: '80%' }}>{body}</p>
      </div>

      {/* footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '4.6cqw', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em' }}>AOM<Dot /></span>
        <span style={{ fontSize: '2.7cqw', fontWeight: 600, color: C.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>aheadofmarket.com</span>
      </div>
    </div>
  )
}
