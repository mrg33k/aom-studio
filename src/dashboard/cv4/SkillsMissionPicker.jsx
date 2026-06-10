// SkillsMissionPicker — modal that opens after the user clicks a skill chip
// in SkillsShelf. The user picks which mission/project to attach the skill to.
// On confirm, the skill becomes a chip at the top of that chat's input bar.
//
// corner:skills-picker R1, 2026-05-25.

import { useEffect, useMemo, useRef, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { setAttachedSkill } from './skillsStore.js'

const PURPLE = '#A78BFA'

export default function SkillsMissionPicker({ skill, worldId, missions: missionsProp, onClose, onAttached }) {
  const [query, setQuery] = useState('')
  const [fetched, setFetched] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  // Auto-fetch missions from the missions-tree endpoint when caller didn't pass them.
  useEffect(() => {
    if (missionsProp || !worldId) return
    let cancelled = false
    setLoading(true)
    authFetch(`/api/dashboard/missions-tree?client=${encodeURIComponent(worldId)}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (cancelled) return
        if (!j || !Array.isArray(j.projects)) { setFetched([]); return }
        const flat = []
        for (const proj of j.projects) {
          // Project root row (no mission)
          flat.push({
            projectSlug: proj.slug,
            projectName: proj.name || proj.slug,
            missionSlug: null,
            missionName: null,
            isActive: false,
          })
          for (const m of (proj.missions || [])) {
            flat.push({
              projectSlug: proj.slug,
              projectName: proj.name || proj.slug,
              missionSlug: m.slug,
              missionName: m.name || m.slug,
              isActive: m.status === 'active' || m.status === 'running',
            })
          }
        }
        setFetched(flat)
      })
      .catch(() => { if (!cancelled) setFetched([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [worldId, missionsProp])

  const missions = missionsProp || fetched || []

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = missions || []
    if (!q) return list
    return list.filter((m) => {
      const blob = [
        m.projectName || m.projectSlug,
        m.missionName || m.missionSlug,
        m.projectSlug,
        m.missionSlug,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [missions, query])

  if (!skill) return null

  function pick(mission) {
    setAttachedSkill(mission.projectSlug, mission.missionSlug, {
      name: skill.name,
      alias: skill.alias,
      description: skill.description,
      category: skill.category,
      categoryLabel: skill.categoryLabel,
    })
    onAttached?.(mission, skill)
  }

  const stripped = (skill.alias || skill.name || '').replace(/^\//, '')

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          zIndex: 199,
        }}
      />
      <div
        role="dialog"
        aria-label={`Pick mission for ${stripped}`}
        data-testid="cv4-skills-mission-picker"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(520px, calc(100vw - 32px))',
          maxHeight: 'min(640px, calc(100vh - 64px))',
          background: C.s1,
          border: `1px solid ${C.border2}`,
          borderRadius: 14,
          boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(167,139,250,0.10)',
          padding: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'Hanken Grotesk', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 18px 12px',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid rgba(167,139,250,0.55)',
                background: 'rgba(167,139,250,0.18)',
                color: '#FFFFFF',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
              }}
            >
              <span style={{ opacity: 0.55 }}>/</span>
              <span>{stripped}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                color: C.muted,
                fontSize: 16,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              letterSpacing: '-0.005em',
              lineHeight: 1.2,
            }}
          >
            Send to which mission?
          </div>
          {skill.description && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: C.muted,
                lineHeight: 1.5,
              }}
            >
              {skill.description}
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter missions…"
            aria-label="Filter missions"
            data-testid="cv4-mission-picker-filter"
            style={{
              marginTop: 12,
              width: '100%',
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.bg2 || 'rgba(255,255,255,0.04)',
              color: C.text,
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = PURPLE)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
        </div>

        {/* Mission list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 8,
            minHeight: 0,
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: '32px 16px',
                fontSize: 13,
                color: C.muted,
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              {loading
                ? 'Loading missions…'
                : missions?.length
                  ? `No missions match "${query}".`
                  : 'No missions available yet. Open a project chat first.'}
            </div>
          )}
          {filtered.map((m, i) => (
            <MissionRow
              key={`${m.projectSlug}::${m.missionSlug || '_'}::${i}`}
              mission={m}
              onClick={() => pick(m)}
            />
          ))}
        </div>

        {/* Footer hint */}
        <div
          style={{
            padding: '10px 18px',
            borderTop: `1px solid ${C.border}`,
            fontSize: 11,
            color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          Pick a mission → the skill attaches to its input bar. Add context, or just press Send to fire.
        </div>
      </div>
    </>
  )
}

function MissionRow({ mission, onClick }) {
  const projectName = mission.projectName || mission.projectSlug
  const missionName = mission.missionName || mission.missionSlug
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`cv4-mission-row-${mission.projectSlug}-${mission.missionSlug || 'root'}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        background: 'transparent',
        border: '1px solid transparent',
        color: C.text,
        textAlign: 'left',
        fontFamily: "'Hanken Grotesk', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(167,139,250,0.08)'
        e.currentTarget.style.borderColor = 'rgba(167,139,250,0.22)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.borderColor = 'transparent'
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: mission.isActive ? '#10B981' : C.muted,
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: C.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {missionName || <span style={{ fontStyle: 'italic', color: C.muted }}>project root</span>}
        </div>
        <div
          style={{
            fontSize: 11,
            color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.02em',
            marginTop: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {projectName}
          {mission.missionSlug ? ` · ${mission.missionSlug}` : ''}
        </div>
      </div>
      <span
        style={{
          fontSize: 11,
          color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        →
      </span>
    </button>
  )
}
