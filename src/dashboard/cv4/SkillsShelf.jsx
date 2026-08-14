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
// at the bottom. Each tier carries its own accent color so the eye sees
// the groups at a glance. Categories not enumerated fall into a final
// "More" bucket (slate) so nothing is lost when skills.json grows.
//
// Color choice mirrors the tier's feel: mint (welcoming) → amber (creative)
// → sky (investigative) → magenta (intense).
const TIERS = [
  {
    label: 'Start here',
    blurb: 'Daily ops, account, sessions',
    accent: '#34D399',         // mint / emerald
    accentSoft: 'rgba(52, 211, 153, 0.16)',
    accentEdge: 'rgba(52, 211, 153, 0.50)',
    accentGlow: 'rgba(52, 211, 153, 0.28)',
    categories: [
      'Account',
      'Session Management',
      'Operations / Planning / Reporting',
    ],
  },
  {
    label: 'Make stuff',
    blurb: 'Visual, social, voice, outbound',
    accent: '#FBBF24',         // amber / gold
    accentSoft: 'rgba(251, 191, 36, 0.16)',
    accentEdge: 'rgba(251, 191, 36, 0.55)',
    accentGlow: 'rgba(251, 191, 36, 0.28)',
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
    accent: '#38BDF8',         // sky / cyan
    accentSoft: 'rgba(56, 189, 248, 0.16)',
    accentEdge: 'rgba(56, 189, 248, 0.50)',
    accentGlow: 'rgba(56, 189, 248, 0.28)',
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
    accent: '#F472B6',         // rose / magenta
    accentSoft: 'rgba(244, 114, 182, 0.16)',
    accentEdge: 'rgba(244, 114, 182, 0.55)',
    accentGlow: 'rgba(244, 114, 182, 0.28)',
    categories: [
      'Video / Content Production',
      'DaVinci Resolve / Timeline',
      'Corner Platform',
      'System / Infrastructure',
    ],
  },
]

const MORE_TIER = {
  label: 'More',
  blurb: 'Uncategorized',
  accent: '#94A3B8',         // slate
  accentSoft: 'rgba(148, 163, 184, 0.14)',
  accentEdge: 'rgba(148, 163, 184, 0.40)',
  accentGlow: 'rgba(148, 163, 184, 0.20)',
}

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
        ...MORE_TIER,
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
        width: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        background: C.bg,
        color: C.text,
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px 10px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: 18,
              fontWeight: 600,
              color: C.text,
              letterSpacing: '-0.005em',
              lineHeight: 1.1,
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

        <div style={{ position: 'relative', width: '100%' }}>
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
              boxSizing: 'border-box',
              padding: '8px 12px 8px 32px',
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
          overflowX: 'hidden',
          padding: '8px 12px 32px',
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
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

        {filtered.map((tier, ti) => {
          const tierCount = tier.sections.reduce((a, s) => a + s.items.length, 0)
          return (
            <div key={tier.label} style={{ marginTop: ti === 0 ? 4 : 22 }}>
              {/* Tier banner: solid colored block w/ label, blurb, count */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: tier.accentSoft,
                  border: `1px solid ${tier.accentEdge}`,
                  boxShadow: `0 1px 0 ${tier.accentGlow} inset`,
                  marginBottom: 10,
                  boxSizing: 'border-box',
                  width: '100%',
                  minWidth: 0,
                  overflow: 'hidden',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: tier.accent,
                    boxShadow: `0 0 0 3px ${tier.accentGlow}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
 {/* R19, tier label uses the Drawer's section-heading
                      cadence (JetBrains Mono uppercase, 10px, 0.12em
                      letter-spacing) so it reads like "Projects" / "Agents"
                      / "Account" in the left rail instead of a serif
                      display title. */}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      color: tier.accent,
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {tier.label}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: C.text2,
                      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tier.blurb}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: tier.accent,
                    background: C.bg,
                    border: `1px solid ${tier.accentEdge}`,
                    borderRadius: 999,
                    padding: '2px 8px',
                    flexShrink: 0,
                  }}
                >
                  {tierCount}
                </span>
              </div>

              {tier.sections.map((sec) => (
                <div
                  key={sec.category}
                  style={{
                    marginBottom: 10,
                    borderLeft: `2px solid ${tier.accentEdge}`,
                    paddingLeft: 10,
                    marginLeft: 4,
                    boxSizing: 'border-box',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '2px 0 6px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: tier.accent,
                        textTransform: 'uppercase',
                        letterSpacing: '0.10em',
                        fontWeight: 700,
                      }}
                    >
                      {sec.category}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: C.muted,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {sec.items.length}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      paddingBottom: 4,
                      minWidth: 0,
                    }}
                  >
                    {sec.items.map((skill) => (
                      <SkillChip
                        key={skill.name}
                        skill={skill}
                        tier={tier}
                        onClick={() => onPickSkill(skill)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillChip({ skill, tier, onClick }) {
  const label = skill.alias || skill.name || ''
  const stripped = label.replace(/^\//, '')
  // Fall back to purple if no tier is provided (defensive; not expected).
  const accent = tier?.accent || '#A78BFA'
  const accentSoft = tier?.accentSoft || 'rgba(167,139,250,0.10)'
  const accentEdge = tier?.accentEdge || 'rgba(167,139,250,0.40)'
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
        border: `1px solid ${accentEdge}`,
        background: accentSoft,
        color: C.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        boxSizing: 'border-box',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = accent
        e.currentTarget.style.borderColor = accent
        e.currentTarget.style.color = '#0F172A'
        e.currentTarget.style.boxShadow = `0 4px 12px ${tier?.accentGlow || 'rgba(0,0,0,0.25)'}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = accentSoft
        e.currentTarget.style.borderColor = accentEdge
        e.currentTarget.style.color = C.text
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <span style={{ opacity: 0.55 }}>/</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{stripped}</span>
    </button>
  )
}