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

/* IG Story — 9:16. Vertical type poster, headline anchored low. */
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
      justifyContent: 'space-between',
      padding: '8% 7%',
      overflow: 'hidden',
      position: 'relative',
      containerType: 'inline-size',
      fontFamily: '"Hanken Grotesk", sans-serif',
    }}>
      {/* brand dot bled top-right */}
      <div style={{ position: 'absolute', right: '-14%', top: '-7%', width: '46%', aspectRatio: '1', borderRadius: '50%', background: C.orange, opacity: 0.12 }} />

      {/* top: category + mark */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '3.4cqw', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.orange }}>{category}</span>
        <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '5cqw', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em' }}>AOM<Dot /></span>
      </div>

      {/* headline anchored low */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span style={{ display: 'block', width: '14%', height: 3, background: C.orange, marginBottom: '6%' }} />
        <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: '9.5cqw', fontWeight: 800, color: C.cream, textTransform: 'uppercase', lineHeight: 1.0, letterSpacing: '-0.03em', margin: 0 }}>{headline}</h3>
        <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: '5cqw', color: C.textMuted, margin: '6% 0 0' }}>aheadofmarket.com</p>
      </div>
    </div>
  )
}
