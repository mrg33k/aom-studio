// SkillsShelf — the left-rail takeover. Top: fuzzy search. Below: skills
// grouped by tier (Start Here → Power), rendered as purple chips.
//
// Click a chip → onPickSkill(skill) — the parent (CornerV4) opens the
// mission picker modal which assigns the skill to a mission's input bar.
//
// corner:skills-picker R1, 2026-05-25.

import { useMemo, useState, useRef, useEffect } from 'react'
import skillsData from '../../data/skills.json'
import { C } from '../lib/cv3Colors.js'

const PURPLE = '#A78BFA'

// Tier order: easiest / most useful for a new user at top, most intricate
// at the bottom. Each tier names which `categoryLabel` strings belong in it,
// in the listed order — categories not enumerated fall into a final
// "More" bucket so nothing is lost when skills.json grows.
const TIERS = [
  {
    label: 'Start here',
    blurb: 'Daily ops and account basics',
    categories: [
      'Account',
      'Session Management',
      'Operations / Planning / Reporting',
    ],
  },
  {
    label: 'Make stuff',
    blurb: 'Visual, social, voice, outbound',
    categories: [
      'Brand / Design',
      'Social / Marketing',
      'Outreach / Sales',
      'Audio',
    ],
  },
  {
    label: 'Go deeper',
    blurb: 'Research, strategy, dev, collab',
    categories: [
      'Research / Intelligence',
      'Collaboration / Communication',
      'Business / Strategy',
      'Web / Code',
    ],
  },
  {
    label: 'Power',
    blurb: 'Production media + system level',
    categories: [
      'Video / Content Production',
      'DaVinci Resolve / Timeline',
      'Corner Platform',
      'System / Infrastructure',
    ],
  },
]

function score(skill, query) {
  if (!query) return 1
  const q = query.toLowerCase().trim()
  if (!q) return 1
  const haystacks = [
    (skill.name || '').toLowerCase(),
    (skill.alias || '').toLowerCase(),
    (skill.description || '').toLowerCase(),
    (skill.categoryLabel || '').toLowerCase(),
  ]
  let best = 0
  for (let i = 0; i < haystacks.length; i++) {
    const h = haystacks[i]
    if (!h) continue
    if (h === q) best = Math.max(best, 100 - i * 5)
    else if (h.startsWith(q)) best = Math.max(best, 80 - i * 5)
    else if (h.includes(q)) best = Math.max(best, 60 - i * 5)
    else if (fuzzyMatch(h, q)) best = Math.max(best, 30 - i * 5)
  }
  return best
}

function fuzzyMatch(haystack, needle) {
  let h = 0
  for (let n = 0; n < needle.length; n++) {
    const c = needle[n]
    while (h < haystack.length && haystack[h] !== c) h++
    if (h >= haystack.length) return false
    h++
  }
  return true
}

export default function SkillsShelf({ onPickSkill, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const skills = skillsData?.skills || []

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const grouped = useMemo(() => {
    const known = new Set()
    const byCategory = new Map()
    for (const skill of skills) {
      const cat = skill.categoryLabel || 'Other'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat).push(skill)
    }

    const groups = []
    for (const tier of TIERS) {
      const sections = []
      for (const cat of tier.categories) {
        known.add(cat)
        const items = byCategory.get(cat)
        if (items && items.length) sections.push({ category: cat, items })
      }
      if (sections.length) groups.push({ ...tier, sections })
    }

    // Catch-all for unknown categories
    const leftover = []
    for (const [cat, items] of byCategory.entries()) {
      if (!known.has(cat)) leftover.push({ category: cat, items })
    }
    if (leftover.length) {
      groups.push({
        label: 'More',
        blurb: 'Uncategorized',
        sections: leftover,
      })
    }

    return groups
  }, [skills])

  const filtered = useMemo(() => {
    if (!query.trim()) return grouped
    const out = []
    for (const tier of grouped) {
      const sections = []
      for (const sec of tier.sections) {
        const scored = sec.items
          .map((s) => ({ skill: s, s: score(s, query) }))
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s)
          .map((x) => x.skill)
        if (scored.length) sections.push({ category: sec.category, items: scored })
      }
      if (sections.length) out.push({ ...tier, sections })
    }
    return out
  }, [grouped, query])

  const totalCount = useMemo(
    () => filtered.reduce((acc, t) => acc + t.sections.reduce((a, s) => a + s.items.length, 0), 0),
    [filtered],
  )

  return (
    <div
      data-testid="cv4-skills-shelf"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: C.s1,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 22,
              fontWeight: 400,
              color: C.text,
              letterSpacing: '-0.01em',
              flex: 1,
            }}
          >
            Skills
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close skills"
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.muted,
              fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills…"
            aria-label="Search skills"
            data-testid="cv4-skills-search"
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.dim || 'rgba(255,255,255,0.04)',
              color: C.text,
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.target.style.borderColor = PURPLE)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: C.muted,
              pointerEvents: 'none',
              fontSize: 13,
            }}
          >
            ⌕
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: C.muted,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.02em',
          }}
        >
          {totalCount} {totalCount === 1 ? 'skill' : 'skills'}
          {query.trim() ? ' matched' : ' available'} · top is easiest, bottom is most intricate
        </div>
      </div>

      {/* Tiered body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px 32px',
          minHeight: 0,
        }}
      >
        {filtered.length === 0 && (
          <div
            style={{
              padding: '32px 12px',
              fontSize: 13,
              color: C.muted,
              textAlign: 'center',
              fontStyle: 'italic',
            }}
          >
            No skills match "{query}". Try a shorter word.
          </div>
        )}

        {filtered.map((tier, ti) => (
          <div key={tier.label} style={{ marginTop: ti === 0 ? 8 : 22 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 10,
                padding: '0 4px 4px',
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: PURPLE,
                }}
              >
                {tier.label}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: C.muted,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {tier.blurb}
              </div>
            </div>
            <div
              style={{
                height: 1,
                background: 'rgba(167,139,250,0.12)',
                margin: '0 4px 10px',
              }}
            />

            {tier.sections.map((sec) => (
              <div key={sec.category} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: C.muted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    padding: '0 4px 6px',
                  }}
                >
                  {sec.category}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    padding: '0 4px',
                  }}
                >
                  {sec.items.map((skill) => (
                    <SkillChip
                      key={skill.name}
                      skill={skill}
                      onClick={() => onPickSkill(skill)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SkillChip({ skill, onClick }) {
  const label = skill.alias || skill.name || ''
  const stripped = label.replace(/^\//, '')
  return (
    <button
      type="button"
      onClick={onClick}
      title={skill.description || stripped}
      data-testid={`cv4-skill-chip-${stripped}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid rgba(167,139,250,0.28)',
        background: 'rgba(167,139,250,0.08)',
        color: '#E9DDFE',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(167,139,250,0.20)'
        e.currentTarget.style.borderColor = 'rgba(167,139,250,0.55)'
        e.currentTarget.style.color = '#FFFFFF'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(167,139,250,0.08)'
        e.currentTarget.style.borderColor = 'rgba(167,139,250,0.28)'
        e.currentTarget.style.color = '#E9DDFE'
      }}
    >
      <span style={{ opacity: 0.55 }}>/</span>
      <span>{stripped}</span>
    </button>
  )
}
