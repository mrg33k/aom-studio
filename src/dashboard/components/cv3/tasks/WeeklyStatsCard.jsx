// WeeklyStatsCard -- "This Week" 7-day bar chart + metrics row
// R48 (Apr 22, 2026): retire the QA-score metrics that never carried real
// data. Metrics row now reads from status-derived pass-rate and days-active
// instead of qa_score columns that were mostly empty.
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const MIN_BAR_H  = 2
const MAX_BAR_H  = 19

export default function WeeklyStatsCard() {
  const {
    dailyCounts,
    maxDailyCount,
    dayOfWeek,
    weekTotal,
    passRate,
    daysActive,
    closedCount,
  } = useTasksPanelCtx()

  return (
    <div
      data-testid="weekly-stats-card"
      data-closed-count={String(closedCount ?? 0)}
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 36,
      }}
    >
      <h3 style={{
        fontSize: 14,
        fontWeight: 700,
        color: C.text2,
        margin: '0 0 14px',
        letterSpacing: '-0.01em',
      }}>This Week</h3>

      {/* 7-day bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 36 }}>
        {DAY_LABELS.map((label, i) => {
          const count    = dailyCounts[i]
          const isFuture = i > (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
          const barH     = count > 0 ? Math.round((count / maxDailyCount) * (MAX_BAR_H - MIN_BAR_H)) + MIN_BAR_H : MIN_BAR_H
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 4 }}>
              <div style={{
                width: '100%',
                height: barH,
                borderRadius: 4,
                background: isFuture || count === 0 ? 'rgba(255,255,255,0.04)' : C.accent,
                minHeight: 2,
                transition: 'height 0.3s ease',
              }} />
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                color: C.dim,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{label}</div>
            </div>
          )
        })}
      </div>

      {/* Metrics row -- 3 real metrics. QA slots retired; see R48 in
          projects/corner/refactor-plan.md. */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div data-testid="weekly-metric" data-metric="tasks">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{weekTotal}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>Tasks</div>
        </div>
        <div data-testid="weekly-metric" data-metric="pass-rate">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{passRate !== null ? passRate + '%' : '--'}</div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>Pass Rate</div>
        </div>
        <div data-testid="weekly-metric" data-metric="days-active">
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 800, textAlign: 'center', color: C.text }}>{daysActive}<span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>/7</span></div>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>Days Active</div>
        </div>
      </div>
    </div>
  )
}
