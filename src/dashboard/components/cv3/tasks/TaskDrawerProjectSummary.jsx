// TaskDrawerProjectSummary -- 1-3 sentence project summary paragraph that sits
// above the files section in the task-view drawer. R14e-8 (Apr 21, 2026).
//
// Replaces the heavier ProjectBriefingCard on this surface. Source is the
// same summaryEvent poll that useTasksPanel already runs (CONTEXT.md payload
// from /api/dashboard/project-summary). If no summary yet, render nothing --
// no placeholder string, no skeleton.
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

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
  const { summaryEvent } = useTasksPanelCtx()
  const raw = summaryEvent?.payload?.summary_md || ''
  const paragraph = truncateSentences(stripInlineMd(firstParagraph(raw)))
  if (!paragraph) return null
  return (
    <p
      data-testid="task-drawer-project-summary"
      style={{
        fontSize: 13,
        lineHeight: 1.6,
        color: C.text2,
        margin: '0 0 18px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {paragraph}
    </p>
  )
}
