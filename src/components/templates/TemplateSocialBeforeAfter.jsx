import React from 'react'

const C = {
  night: '#0C0C0C',
  panel: '#16140F',
  cream: '#FDF6EC',
  orange: '#E85D26',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
}

function Dot({ s = '0.5em', c = C.orange }) {
  return <span style={{ display: 'inline-block', width: s, height: s, borderRadius: 0, background: c, marginLeft: '0.06em', verticalAlign: 'baseline' }} />
}

/* Before / After — 1:1. Split frame, orange seam, project strip. */
export default function TemplateSocialBeforeAfter({
  name = 'AMBITION MECHANICAL',
}) {
  const Panel = ({ label, bg, after }) => (
    <div style={{ flex: 1, background: bg, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '13cqw', fontWeight: 800, color: after ? C.orange : 'rgba(240,236,230,0.10)', letterSpacing: '-0.03em', userSelect: 'none' }}>
        {after ? 'A' : 'B'}
      </span>
      <span style={{ position: 'absolute', bottom: '6%', left: after ? 'auto' : '7%', right: after ? '7%' : 'auto', fontSize: '3.4cqw', fontWeight: 700, color: C.cream, letterSpacing: '0.18em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
  return (
    <div style={{
      width: '100%',
      aspectRatio: '1 / 1',
      background: C.night,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      containerType: 'inline-size',
      fontFamily: '"Hanken Grotesk", sans-serif',
    }}>
      <div style={{ flex: 1, display: 'flex' }}>
        <Panel label="Before" bg={C.panel} />
        <div style={{ width: '1.2%', minWidth: 2, background: C.orange }} />
        <Panel label="After" bg={C.night} after />
      </div>
      <div style={{ padding: '4.5% 6%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontSize: '3.2cqw', fontWeight: 600, color: C.textMuted, letterSpacing: '0.16em', textTransform: 'uppercase' }}>{name}</span>
        <span style={{ fontFamily: '"Syne", sans-serif', fontSize: '4.6cqw', fontWeight: 800, color: C.textLight, letterSpacing: '-0.03em' }}>AOM<Dot /></span>
      </div>
    </div>
  )
}
