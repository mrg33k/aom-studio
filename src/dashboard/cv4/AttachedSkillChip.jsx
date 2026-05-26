// AttachedSkillChip — the purple chip that sits on top of the input bar
// after the user attaches a skill via the Skills shelf + mission picker.
// Self-subscribing: reads from skillsStore, re-renders when the store changes.
//
// Pass `projectSlug` and `missionSlug` to scope the chip to the active room.
//
// corner:skills-picker R1, 2026-05-25.

import { useEffect, useState } from 'react'
import { getAttachedSkill, clearAttachedSkill, subscribe } from './skillsStore.js'

const PURPLE = '#A78BFA'

export default function AttachedSkillChip({ projectSlug, missionSlug }) {
  const [skill, setSkill] = useState(() => getAttachedSkill(projectSlug, missionSlug))

  useEffect(() => {
    setSkill(getAttachedSkill(projectSlug, missionSlug))
    const unsub = subscribe(() => {
      setSkill(getAttachedSkill(projectSlug, missionSlug))
    })
    return unsub
  }, [projectSlug, missionSlug])

  if (!skill) return null

  const label = (skill.alias || skill.name || '').replace(/^\//, '')

  return (
    <div
      data-testid="cv4-attached-skill-chip"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 4px 4px 10px',
          borderRadius: 999,
          border: `1px solid rgba(167,139,250,0.55)`,
          background: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(139,92,246,0.24) 100%)',
          color: '#FFFFFF',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: '0.02em',
          maxWidth: '100%',
        }}
      >
        <span style={{ opacity: 0.6 }}>/</span>
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 240,
          }}
          title={skill.description || label}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={() => clearAttachedSkill(projectSlug, missionSlug)}
          aria-label="Remove attached skill"
          title="Remove"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            borderRadius: 999,
            border: 'none',
            background: 'rgba(255,255,255,0.10)',
            color: '#FFFFFF',
            fontSize: 12,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'rgba(167,139,250,0.85)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        will run on send
      </div>
    </div>
  )
}
