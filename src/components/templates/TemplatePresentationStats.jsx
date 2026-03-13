import React from 'react'

const C = {
  night: '#0C0C0C',
  orange: '#E85D26',
  cream: '#FDF6EC',
  textMuted: '#8A847C',
}

export default function TemplatePresentationStats({
  stats = [
    { value: '150%', label: 'Pipeline Growth' },
    { value: '3 Days', label: 'Average Delivery' },
    { value: '24/7', label: 'System Uptime' },
  ],
}) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '16 / 9',
      background: C.night,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      <div style={{
        display: 'flex',
        gap: 32,
        justifyContent: 'center',
        width: '100%',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            borderLeft: `2px solid rgba(232,93,38,0.2)`,
            paddingLeft: 16,
          }}>
            <div style={{
              fontFamily: '"Syne", sans-serif',
              fontSize: 32,
              fontWeight: 900,
              color: C.orange,
              lineHeight: 1,
              marginBottom: 6,
            }}>{s.value}</div>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 9,
              fontWeight: 600,
              color: C.textMuted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
