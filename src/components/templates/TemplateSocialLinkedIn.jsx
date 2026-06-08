import React from 'react'

const C = {
  night: '#0C0C0C',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
  white: '#FFFFFF',
}

function Dot({ s = '0.5em', c = C.orange }) {
  return <span style={{ display: 'inline-block', width: s, height: s, borderRadius: '50%', background: c, marginLeft: '0.06em', verticalAlign: 'baseline' }} />
}

/* LinkedIn — 1.91:1. Orange brand panel left, statement right. */
export default function TemplateSocialLinkedIn({
  headline = 'SMALL TEAM. BIG OUTPUT.',
  body = 'We deliver what agencies take months to produce. No layers, no delays.',
  cta = 'GET STARTED',
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '1.91 / 1',
      background: C.night,
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
      containerType: 'inline-size',
      fontFamily: '"Hanken Grotesk", sans-serif',
    }}>
      {/* left: orange brand panel */}
      <div style={{ flex: '0 0 38%', background: C.orange, display: 'flex', alignItems: 'flex-end', padding: '4.5%', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '-18%', top: '-18%', width: '60%', aspectRatio: '1', borderRadius: '50%', background: 'rgba(0,0,0,0.06)' }} />
        <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '11cqw', fontWeight: 800, color: C.night, letterSpacing: '-0.04em', lineHeight: 1, position: 'relative' }}>AOM<Dot c={C.night} /></span>
      </div>

      {/* right: statement */}
      <div style={{ flex: 1, padding: '4.5% 5%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4%' }}>
        <h3 style={{ fontFamily: '"Syne", sans-serif', fontSize: '7.2cqw', fontWeight: 800, color: C.cream, textTransform: 'uppercase', lineHeight: 1.02, letterSpacing: '-0.02em', margin: 0 }}>{headline}</h3>
        <p style={{ fontFamily: '"Fraunces", serif', fontStyle: 'italic', fontSize: '4cqw', color: C.textMuted, lineHeight: 1.35, margin: 0 }}>{body}</p>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3%', alignSelf: 'flex-start', fontSize: '3.1cqw', fontWeight: 700, color: C.orange, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {cta}<span style={{ fontSize: '4cqw' }}>&rarr;</span>
        </span>
      </div>
    </div>
  )
}
