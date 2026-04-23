// TaskDrawerProjectSummary -- 1-3 sentence project summary paragraph that sits
// above the files section in the task-view drawer. R14e-8 (Apr 21, 2026).
// R15c (Apr 22, 2026): adds freshness-dot (green/amber/red) + data-testid
// surface so the Playwright gate can assert card liveness. Thresholds come
// from the R15 spec: green < 2m, amber < 10m, red >= 10m.
//
// Replaces the heavier ProjectBriefingCard on this surface. Source is the
// same summaryEvent poll that useTasksPanel already runs (CONTEXT.md payload
// from /api/dashboard/project-summary). If no summary yet, render nothing --
// no placeholder string, no skeleton.
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

const FRESHNESS_COLORS = {
  green: '#10B981',
  amber: '#F59E0B',
  red:   '#EF4444',
  stale: '#64748B',
}

function freshnessState(rowTs) {
  if (!rowTs) return 'stale'
  const ms = Date.parse(rowTs)
  if (!Number.isFinite(ms)) return 'stale'
  const ageSecs = Math.max(0, (Date.now() - ms) / 1000)
  if (ageSecs < 120) return 'green'
  if (ageSecs < 600) return 'amber'
  return 'red'
}

function stripInlineMd(s) {
  return String(s || '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}

function firstParagraph(md) {
  const text = String(md || '').trim()
  if (!text) return ''
  const block = text.split(/\n\s*\n/)[0] || ''
  return block
    .split('\n')
    .map(l => l.replace(/^[#>\-*\s]+/, '').trim())
    .filter(Boolean)
    .join(' ')
}

function truncateSentences(s, maxSentences = 3) {
  if (!s) return ''
  const parts = s.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [s]
  return parts.slice(0, maxSentences).join('').trim()
}

export default function TaskDrawerProjectSummary() {
  const { summaryEvent, summaryNowTick } = useTasksPanelCtx()
  void summaryNowTick // re-render on tick so the dot state tracks age
  const raw = summaryEvent?.payload?.summary_md || ''
  const paragraph = truncateSentences(stripInlineMd(firstParagraph(raw)))
  if (!paragraph) return null
  const state = freshnessState(summaryEvent?.timestamp)
  const dotColor = FRESHNESS_COLORS[state] || FRESHNESS_COLORS.stale
  return (
    <div
      data-testid="task-drawer-project-summary"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        margin: '0 0 18px',
      }}
    >
      <span
        data-testid="freshness-dot"
        data-state={state}
        aria-label={`summary freshness: ${state}`}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: dotColor,
          marginTop: 7,
          flexShrink: 0,
          boxShadow: state === 'green' ? `0 0 6px ${dotColor}66` : 'none',
          transition: 'background-color 0.3s ease',
        }}
      />
      <p
        data-testid="project-summary-md"
        style={{
          fontSize: 13,
          lineHeight: 1.6,
          color: C.text2,
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          flex: 1,
        }}
      >
        {paragraph}
      </p>
    </div>
  )
}
