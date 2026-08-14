// ProjectBriefingCard -- daemon-driven project summary card
// R2a (Apr 16, 2026): extracted from TasksPanel.jsx
// R3a (Apr 17, 2026): reads from TasksPanelContext instead of props
//
// Data: project-summary-daemon → events table → /api/dashboard/project-summary.
// Polled every 4s by useTasksPanel. Flashes when summaryJustUpdated.
import { marked } from 'marked'
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function ProjectBriefingCard() {
  const {
    activeProject,
    summaryEvent,
    summaryJustUpdated,
    summaryNowTick,
    taskProjects,
    slugToName,
  } = useTasksPanelCtx()

  const payload = summaryEvent?.payload || null
  const rowTs   = summaryEvent?.timestamp || null
  const rowMs   = rowTs ? Date.parse(rowTs) : null
  const ageSecs = rowMs ? Math.max(0, Math.round((Date.now() - rowMs) / 1000)) : null
  void summaryNowTick
  const ageLabel = ageSecs == null
 ? '·'
    : ageSecs < 5   ? 'just now'
    : ageSecs < 60  ? `${ageSecs}s ago`
    : ageSecs < 3600 ? `${Math.round(ageSecs / 60)}m ago`
    : `${Math.round(ageSecs / 3600)}h ago`
  const openN   = payload?.open_task_count ?? null
  const doneArr = Array.isArray(payload?.recent_completions) ? payload.recent_completions : []
  const summaryText = (payload?.summary_md || '').trim()
  const reasonsArr  = Array.isArray(payload?.reasons) ? payload.reasons : []
  const headerMd = (payload?.context_header_md || '').trim()
  const taglineMatch = headerMd.match(/\*\*What it is:\*\*\s*([^\n]+)/i)
  const tagline = taglineMatch ? taglineMatch[1].trim() : ''
  const activityEntries = Array.isArray(payload?.recent_activity) ? payload.recent_activity : []
  const projectRec  = taskProjects?.find(p => String(p.slug || '').toLowerCase() === activeProject)
  const projColor   = projectRec?.color || '#6B8AB0'
  const projName    = projectRec?.name || slugToName[activeProject] || activeProject

  // Parse summary_md through marked so **bold**, bullets, etc. render as HTML
  const parseSummaryHtml = (md) => {
    if (!md) return ''
    try {
      let html = marked.parse(md, { breaks: true, gfm: true })
      html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      return html
    } catch { return md }
  }

  return (
    <div
      style={{
        marginBottom: 20,
        borderRadius: 16,
        background: C.s1,
        border: `1px solid ${summaryJustUpdated ? 'rgba(16,185,129,0.4)' : C.border2}`,
        animation: summaryJustUpdated ? 'cv3-summary-pulse 1.8s ease-out' : 'none',
        transition: 'border-color 0.3s ease',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── Top accent bar ── */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${projColor}, ${projColor}66)`,
        opacity: summaryJustUpdated ? 1 : 0.6,
        transition: 'opacity 0.3s ease',
      }} />

      <div style={{ padding: '20px 22px 18px' }}>
        {/* ── Header: name + live badge ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tagline ? 6 : 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: projColor,
              boxShadow: summaryJustUpdated ? `0 0 8px ${projColor}88` : 'none',
              transition: 'box-shadow 0.3s ease',
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 18, fontWeight: 800, color: C.text,
              letterSpacing: '-0.02em',
            }}>
              {projName}
            </span>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: summaryJustUpdated ? C.accent : C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            transition: 'color 0.25s ease',
          }}>
            {summaryEvent ? (summaryJustUpdated ? 'just updated' : ageLabel) : 'awaiting data'}
          </span>
        </div>

        {/* ── Tagline ── */}
        {tagline && (
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: C.text2,
            marginBottom: 16,
            lineHeight: 1.5,
          }}>
            {tagline}
          </div>
        )}

        {/* ── Status strip ── */}
        {summaryEvent && (
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            marginBottom: summaryText ? 16 : 0,
          }}>
            {openN != null && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: C.text,
                padding: '5px 12px', borderRadius: 8,
                background: `${projColor}18`,
                border: `1px solid ${projColor}30`,
                letterSpacing: '-0.01em',
              }}>
                {openN} active
              </span>
            )}
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.accent,
              padding: '5px 12px', borderRadius: 8,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.18)',
              letterSpacing: '-0.01em',
            }}>
              {doneArr.length} shipped today
            </span>
            {reasonsArr.length > 0 && reasonsArr.map((r, ri) => (
              <span key={ri} style={{
                fontSize: 11, fontWeight: 600, color: C.text2,
                padding: '5px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.border2}`,
              }}>
                {r}
              </span>
            ))}
          </div>
        )}

        {/* ── Summary body — parsed markdown ── */}
        {summaryText ? (
          <div
            className="briefing-summary-body"
            style={{
              fontSize: 13, lineHeight: 1.65,
              color: C.text2,
            }}
            dangerouslySetInnerHTML={{ __html: parseSummaryHtml(summaryText) }}
          />
        ) : (
          <div style={{
            fontSize: 13, color: C.dim,
            padding: '12px 0',
            lineHeight: 1.5,
          }}>
            Waiting for first project event. Summary appears after the next task or message.
          </div>
        )}

        {/* ── Recent activity ── */}
        {activityEntries.length > 0 && (
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: `1px solid ${C.border2}`,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: 10,
            }}>
              Latest
            </div>
            {activityEntries.slice(0, 3).map((entry, i) => {
              const raw = entry.replace(/^-\s*/, '')
              const modelMatch = raw.match(/`([^`]+)`/)
              const taskMatch = raw.match(/_\(task\s+([a-f0-9]+)\)_/)
              const modelStr = modelMatch ? modelMatch[1] : ''
              const taskId = taskMatch ? taskMatch[1] : ''
              let text = raw
                .replace(/\*\*[^*]+\*\*\s*/, '')
                .replace(/`[^`]+`\s*/, '')
                .replace(/\s*_\(task\s+[a-f0-9]+\)_\s*$/, '')
                .trim()
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 6,
                  fontSize: 12,
                  color: C.text2,
                }}>
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: i === 0 ? projColor : C.dim,
                    flexShrink: 0,
                  }} />
                  {modelStr && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: C.muted,
                      padding: '2px 6px', borderRadius: 4,
                      background: 'rgba(255,255,255,0.05)',
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}>
                      {modelStr}
                    </span>
                  )}
                  <span style={{ flex: 1, lineHeight: 1.4 }}>{text}</span>
                  {taskId && (
                    <span style={{
                      fontSize: 9, color: C.dim,
                      fontFamily: "'JetBrains Mono', monospace",
                      flexShrink: 0,
                    }}>
                      {taskId}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}