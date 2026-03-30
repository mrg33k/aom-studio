// SkillAutocomplete -- Fuzzy dropdown for /skills (Power Ups)
// Trigger: type "/" as first character in chat input
// Renders above input, max 8 visible, scrollable, keyboard navigable
//
// Usage:
//   const { dropdown, onKeyDown, dismiss } = useSkillAutocomplete(inputValue, setInputValue)
//   // Place {dropdown} inside the input's position:relative wrapper
//   // Add onKeyDown to the input's onKeyDown handler

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import SKILLS from '../data/skills.js'

// Category color map
const CAT_COLORS = {
  Video: '#A78BFA',
  Audio: '#F472B6',
  Brand: '#FB923C',
  Code: '#34D399',
  Social: '#38BDF8',
  Outreach: '#FBBF24',
  Strategy: '#818CF8',
  Reporting: '#2DD4BF',
  Ops: '#F87171',
  System: '#94A3B8',
  Session: '#C084FC',
  Collab: '#22D3EE',
  Utility: '#A3A3A3',
  Resolve: '#E879F9',
}

/**
 * Fuzzy match: checks if query chars appear in order within the target.
 * Returns a score (lower = better). -1 means no match.
 */
function fuzzyMatch(query, target) {
  const q = query.toLowerCase()
  const t = target.toLowerCase()

  if (t.startsWith(q)) return 0
  const subIdx = t.indexOf(q)
  if (subIdx !== -1) return 1 + subIdx

  let qi = 0
  let score = 0
  let lastMatchIdx = -1
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (lastMatchIdx !== -1) score += (ti - lastMatchIdx - 1)
      lastMatchIdx = ti
      qi++
    }
  }
  return qi === q.length ? 100 + score : -1
}

function filterSkills(query) {
  if (!query) return SKILLS.slice(0, 8)

  const q = query.startsWith('/') ? query.slice(1) : query
  if (!q) return SKILLS.slice(0, 8)

  const scored = []
  for (const skill of SKILLS) {
    const triggerQ = skill.trigger.slice(1)
    const scores = [
      fuzzyMatch(q, triggerQ),
      fuzzyMatch(q, skill.name),
      fuzzyMatch(q, skill.description),
      fuzzyMatch(q, skill.category),
    ].filter(s => s >= 0)

    if (scores.length > 0) {
      scored.push({ skill, score: Math.min(...scores) })
    }
  }

  scored.sort((a, b) => a.score - b.score)
  return scored.map(s => s.skill).slice(0, 8)
}

export function useSkillAutocomplete(inputValue, setInputValue) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const itemRefs = useRef([])

  const isActive = inputValue.startsWith('/') && !dismissed
  const filtered = useMemo(() => isActive ? filterSkills(inputValue) : [], [inputValue, isActive])

  // Reset selection + dismiss state when input changes
  useEffect(() => {
    setSelectedIndex(0)
    if (inputValue.startsWith('/')) setDismissed(false)
  }, [inputValue])

  // Scroll selected into view
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const handleSelect = useCallback((trigger) => {
    setInputValue(trigger + ' ')
    setDismissed(true)
  }, [setInputValue])

  const dismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  const onKeyDown = useCallback((e) => {
    if (!isActive || filtered.length === 0) return false

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => i <= 0 ? filtered.length - 1 : i - 1)
      return true
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => i >= filtered.length - 1 ? 0 : i + 1)
      return true
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered[selectedIndex]) {
        e.preventDefault()
        handleSelect(filtered[selectedIndex].trigger)
        return true
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      dismiss()
      return true
    }
    return false
  }, [isActive, filtered, selectedIndex, handleSelect, dismiss])

  const showDropdown = isActive && filtered.length > 0

  const dropdown = showDropdown ? (
    <SkillDropdown
      filtered={filtered}
      selectedIndex={selectedIndex}
      setSelectedIndex={setSelectedIndex}
      onSelect={handleSelect}
      itemRefs={itemRefs}
    />
  ) : null

  return { dropdown, onKeyDown, dismiss, isActive: showDropdown }
}

function SkillDropdown({ filtered, selectedIndex, setSelectedIndex, onSelect, itemRefs }) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 4,
        background: '#0A0A08',
        border: '1px solid rgba(255,79,0,0.18)',
        borderRadius: 12,
        maxHeight: 8 * 52,
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 1000,
        boxShadow: '0 -8px 32px rgba(0,0,0,0.6), 0 -2px 8px rgba(255,79,0,0.06)',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,79,0,0.2) transparent',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '8px 14px 6px',
        fontSize: 10,
        fontFamily: "'Inter Tight', 'Inter', sans-serif",
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'rgba(255,79,0,0.5)',
        position: 'sticky',
        top: 0,
        background: '#0A0A08',
        zIndex: 1,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        Power Ups
      </div>

      {filtered.map((skill, i) => {
        const isSelected = i === selectedIndex
        const catColor = CAT_COLORS[skill.category] || '#78716C'

        return (
          <div
            key={skill.trigger}
            ref={el => itemRefs.current[i] = el}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(skill.trigger) }}
            onMouseEnter={() => setSelectedIndex(i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              cursor: 'pointer',
              background: isSelected ? 'rgba(255,79,0,0.08)' : 'transparent',
              borderLeft: isSelected ? '2px solid #FF4F00' : '2px solid transparent',
              transition: 'background 0.1s, border-color 0.1s',
            }}
          >
            {/* Category dot */}
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: catColor,
              flexShrink: 0,
              opacity: isSelected ? 1 : 0.5,
            }} />

            {/* Trigger + description */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  fontFamily: "'Inter Tight', 'Inter', monospace",
                  fontWeight: 700,
                  fontSize: 13,
                  color: isSelected ? '#FF4F00' : '#F0ECE6',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>
                  {skill.trigger}
                </span>
                <span style={{
                  fontSize: 10,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: catColor,
                  opacity: isSelected ? 0.9 : 0.4,
                  flexShrink: 0,
                }}>
                  {skill.category}
                </span>
              </div>
              <div style={{
                fontSize: 12,
                color: isSelected ? 'rgba(240,236,230,0.65)' : 'rgba(120,113,108,0.6)',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginTop: 1,
              }}>
                {skill.description}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default useSkillAutocomplete
