import React from 'react'
import { HUD } from './HUDConstants.jsx'

// Shared style for HUD context menu buttons
export const hudCtxBtn = (isNight, display = 'block') => ({
  display, width: '100%', textAlign: 'left',
  padding: '8px 14px', background: 'none', border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  color: isNight ? '#E2E8F0' : '#1E293B',
  fontFamily: "'Inter', sans-serif",
  transition: 'background 100ms',
})

// ---- COMPACT STATS (blue-themed, LARGER) ------------------------------------
export function CompactStats({ agentStatus, throughput, overallProgress, isNightMode }) {
  const working = throughput?.working || Object.values(agentStatus || {}).filter(a => a?.status === 'WORKING').length
  const blocked = throughput?.blocked || Object.values(agentStatus || {}).filter(a => a?.status === 'BLOCKED').length

  const labelColor = isNightMode === false ? '#8BA4C4' : HUD.textMuted

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px rgba(34,197,94,0.5)' }} />
        <span style={{ color: '#22C55E' }}>{working}</span>
        <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>active</span>
      </div>
      {blocked > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 8px rgba(239,68,68,0.5)' }} />
          <span style={{ color: '#EF4444' }}>{blocked}</span>
          <span style={{ color: labelColor, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>blocked</span>
        </div>
      )}
      {/* Mini progress ring - LARGER */}
      <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
        <svg width={40} height={40} viewBox="0 0 40 40">
          <circle cx={20} cy={20} r={15} fill="none" stroke={isNightMode === false ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.08)'} strokeWidth={3} />
          <circle
            cx={20} cy={20} r={15}
            fill="none" stroke={isNightMode === false ? '#60A5FA' : HUD.accent} strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${overallProgress * 0.942} 94.2`}
            transform="rotate(-90 20 20)"
            style={{ transition: 'stroke-dasharray 600ms ease', filter: `drop-shadow(0 0 4px ${isNightMode === false ? 'rgba(96,165,250,0.35)' : HUD.accentGlow})` }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: isNightMode === false ? '#60A5FA' : HUD.accent,
        }}>
          {overallProgress}%
        </div>
      </div>
    </div>
  )
}
