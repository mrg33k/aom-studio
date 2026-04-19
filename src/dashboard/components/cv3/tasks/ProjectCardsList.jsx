// ProjectCardsList — renders a ProjectCard per known project with single-
// active accordion behavior. R6b (Apr 19, 2026).
//
// Shows on the Tasks view whenever no project filter is active, giving a
// "living summary" row per project. Clicking a header expands inline; only
// one card can be expanded at a time to keep focus per R6 research.
import { useMemo, useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import ProjectCard from './ProjectCard.jsx'
import { useTasksPanelCtx } from './TasksPanelContext.jsx'

export default function ProjectCardsList() {
  const { projectDefs, taskProjects, active } = useTasksPanelCtx()
  const [expandedSlug, setExpandedSlug] = useState(null)

  const byLowerSlug = useMemo(() => {
    const m = new Map()
    for (const p of taskProjects || []) {
      const s = String(p?.slug || '').toLowerCase()
      if (s) m.set(s, p)
    }
    return m
  }, [taskProjects])

  // Pre-compute the first active/queued task per slug so each card has a
  // useful "Next" fallback when the daemon hasn't stamped last_human_intent.
  const nextBySlug = useMemo(() => {
    const out = {}
    for (const t of active || []) {
      const slug = String(t?.project || '').toLowerCase()
      if (!slug || out[slug]) continue
      const title = (t?.title || t?.text || '').trim()
      if (title) out[slug] = title
    }
    return out
  }, [active])

  if (!projectDefs || projectDefs.length === 0) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: C.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: 10,
        }}
      >
        Projects
      </div>
      {projectDefs.map(p => {
        const slugLower = String(p.slug || '').toLowerCase()
        const color = byLowerSlug.get(slugLower)?.color || '#6B8AB0'
        return (
          <ProjectCard
            key={p.slug}
            slug={p.slug}
            name={p.name}
            color={color}
            expanded={expandedSlug === p.slug}
            onToggle={() =>
              setExpandedSlug(prev => (prev === p.slug ? null : p.slug))
            }
            nextActionFallback={nextBySlug[slugLower] || ''}
          />
        )
      })}
    </div>
  )
}
