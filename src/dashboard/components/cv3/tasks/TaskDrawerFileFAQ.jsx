// R31 -- Task-drawer FAQ surface.
//
// One of three collapsible bullet-list panels that sit above ProjectFilesSection
// in the task-view drawer: Vision, Research, Missions. Missions ships from
// R39-3/4 (ProjectMissionsSection). This component handles Vision + Research
// by reading the scaffold markdown for a given filename via
// /api/dashboard/file-content?project=<slug>&filename=<filename> and
// extracting leading bullets.
//
// r7:open-agent-surface — file-content is world-gated now; send the session.
import { authFetch } from '../../../lib/authFetch.js'
//
// Click a bullet -> opens the full file inline via the existing
// handleBriefClick overlay (same mechanism FilesSection uses). Project with
// no matching scaffold row -> returns null (no placeholder per R31 spec).
import { useEffect, useMemo, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

const MAX_BULLETS = 5

function extractBulletsFromHtml(html) {
  if (!html) return []
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(String(html), 'text/html')
    const lis = Array.from(doc.querySelectorAll('li'))
    const bullets = lis
      .map(li => (li.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
    if (bullets.length > 0) return bullets.slice(0, MAX_BULLETS)

    // Fallback: first N paragraphs when the doc has no lists.
    const ps = Array.from(doc.querySelectorAll('p'))
    return ps
      .map(p => (p.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, MAX_BULLETS)
  } catch (_) {
    return []
  }
}

export default function TaskDrawerFileFAQ({ filename, label, testid, iconColor }) {
  const { activeProject, handleBriefClick } = useTasksPanelCtx()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState('')
  const [error, setError] = useState(false)

  const projectSlug = typeof activeProject === 'string' ? activeProject : null

  // Fetch on first expand. No fetch-on-mount so collapsed drawers don't thrash
  // the events table.
  useEffect(() => {
    if (!isOpen || !projectSlug || projectSlug === 'all') return
    if (html || error) return
    let cancelled = false
    setLoading(true)
    authFetch(`/api/dashboard/file-content?project=${encodeURIComponent(projectSlug)}&filename=${encodeURIComponent(filename)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (cancelled) return
        setHtml(data.content || '')
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [isOpen, projectSlug, filename, html, error])

  const bullets = useMemo(() => extractBulletsFromHtml(html), [html])

  // R31 spec: projects with no matching scaffold -> return null (no placeholder).
  // We always render the header so the user can try expanding; when the fetch
  // returns 404 (error=true), we collapse the section out.
  if (error) return null
  if (!projectSlug || projectSlug === 'all') return null

  const dotColor = iconColor || '#A78BFA'

  return (
    <div
      data-testid={testid}
      aria-expanded={isOpen ? 'true' : 'false'}
      style={{ marginBottom: 12 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: 32, gap: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
          letterSpacing: '0.08em', fontFamily: "'Inter', sans-serif",
        }}>
          {label}
        </span>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: dotColor,
          boxShadow: `0 0 6px ${dotColor}88`, flexShrink: 0, opacity: bullets.length ? 1 : 0.3,
        }} />
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setIsOpen(v => !v)}
          data-testid={`${testid}-toggle`}
          style={{
            height: 22, padding: '0 8px',
            borderRadius: 6, border: `1px solid ${C.border2}`,
            background: 'transparent', color: C.text2,
            fontSize: 10, fontWeight: 600, fontFamily: "'Inter', sans-serif",
            cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
          }}
        >
          {isOpen ? 'Hide' : 'Show'}
        </button>
      </div>

      {isOpen && (
        <div style={{
          padding: '4px 2px 8px',
          fontFamily: "'Inter', sans-serif",
        }}>
          {loading && (
            <div style={{ fontSize: 12, color: C.muted }}>Loading…</div>
          )}
          {!loading && bullets.length === 0 && (
            <div style={{ fontSize: 12, color: C.muted }}>
              No highlights yet in {filename}.
            </div>
          )}
          {!loading && bullets.length > 0 && (
            <ul
              data-testid={`${testid}-bullets`}
              style={{
                listStyle: 'none', margin: 0, padding: 0,
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              {bullets.map((text, i) => (
                <li
                  key={i}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: dotColor, marginTop: 8, flexShrink: 0,
                    }}
                  />
                  <button
                    onClick={() => handleBriefClick?.({
                      project: projectSlug,
                      filename,
                      source: 'scaffold',
                      title: filename,
                    })}
                    style={{
                      flex: 1, textAlign: 'left',
                      background: 'transparent', border: 'none', padding: '4px 0',
                      color: C.text, fontSize: 12, lineHeight: 1.45,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {text}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => handleBriefClick?.({
                project: projectSlug,
                filename,
                source: 'scaffold',
                title: filename,
              })}
              style={{
                background: 'transparent', border: 'none', padding: 0,
                color: C.dim, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              Open full {filename} →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
