// SuccessRateChip -- R18b. Live success-rate readout (red/amber/green)
// for the last 50 closed tasks in the viewer's tenant. Polls every 30s.
// Data: GET /api/dashboard/task-success-rate?world=<client_id>.
//
// State thresholds (R18):
//   >= 98%  green
//   >= 95%  amber
//   <  95%  red
//   unknown (no closed tasks yet) -> muted "--" chip
import { useEffect, useState } from 'react'
import { getClientId } from '../../../lib/clientConfig.js'

const COLORS = {
  green:  { bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)', text: '#34D399' },
  amber:  { bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.35)', text: '#FBBF24' },
  red:    { bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.35)',  text: '#F87171' },
  unknown:{ bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: '#94A3B8' },
}

export default function SuccessRateChip({ worldId: worldIdProp }) {
  const [data, setData] = useState(null)
  const [hadError, setHadError] = useState(false)
  const worldId = worldIdProp || getClientId() || 'aom'

  useEffect(() => {
    if (!worldId) return
    let cancelled = false
    const tick = async () => {
      try {
        const resp = await fetch(`/api/dashboard/task-success-rate?world=${encodeURIComponent(worldId)}`)
        if (cancelled) return
        if (!resp.ok) { setHadError(true); return }
        const j = await resp.json().catch(() => null)
        if (cancelled) return
        setHadError(false)
        setData(j)
      } catch {
        if (!cancelled) setHadError(true)
      }
    }
    tick()
    const iv = window.setInterval(tick, 30_000)
    return () => { cancelled = true; window.clearInterval(iv) }
  }, [worldId])

  const state = (data?.state || (hadError ? 'unknown' : 'unknown'))
  const pct = data?.rate_pct
  const color = COLORS[state] || COLORS.unknown
  const label = pct != null ? `${pct}%` : '--'

  return (
    <div
      data-testid="success-rate-chip"
      data-state={state}
      data-rate-pct={pct != null ? String(pct) : ''}
      data-window={data?.window != null ? String(data.window) : ''}
      data-closed-count={data?.closed_count != null ? String(data.closed_count) : ''}
      title={
        pct != null
          ? `Task success rate: ${pct}% over last ${data.closed_count} closed tasks in the last ${data.days ?? 7} days (${data.done_count} done / ${data.failed_count} failed)`
          : `Task success rate: no closed tasks in the last ${data?.days ?? 7} days`
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: color.bg,
        border: `1px solid ${color.border}`,
        color: color.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color.text,
          boxShadow: state === 'green' ? `0 0 6px ${color.text}80` : 'none',
        }}
      />
      <span>Success {label}</span>
    </div>
  )
}
