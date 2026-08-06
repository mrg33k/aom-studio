// SlashCommandAutocomplete — dropdown picker for /skill references in chat input.
// Behavior: when the cursor is inside a `/token` (start of input or after space),
// show a fuzzy-matched list of skills. Arrow keys navigate, Enter/Tab selects,
// Escape dismisses. Selection replaces the active `/token` with `/skill-name `.
import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import skillsData from '../../../data/skills.json'
import { withUiCommands } from './uiCommands.js'
import { C } from '../../lib/cv3Colors.js'

// Dashboard actions (/clear) sit alongside the generated skill list — see uiCommands.js
// for why they cannot live in skills.json.
const SKILLS = withUiCommands(skillsData.skills)

function findActiveSlash(value, caret) {
  // Walk back from caret to find a '/' that starts a slash token.
  // Valid start = beginning of string OR preceded by whitespace.
  if (caret == null) caret = value.length
  let i = caret - 1
  while (i >= 0) {
    const ch = value[i]
    if (ch === '/') {
      const prev = i === 0 ? '' : value[i - 1]
      if (i === 0 || /\s/.test(prev)) {
        const after = value.slice(i, caret)
        // Token runs from `/` up to caret; abort if it contains whitespace.
        if (/\s/.test(after.slice(1))) return null
        return { start: i, end: caret, query: after.slice(1) }
      }
      return null
    }
    if (/\s/.test(ch)) return null
    i--
  }
  return null
}

function scoreSkill(skill, q) {
  if (!q) return 1
  const ql = q.toLowerCase()
  const name = skill.name.toLowerCase()       // "/video-story-cut"
  const alias = (skill.alias || '').toLowerCase()
  const desc = skill.description.toLowerCase()
  const bare = name.slice(1)                  // "video-story-cut"
  if (bare === ql) return 1000
  if (bare.startsWith(ql)) return 500 - (bare.length - ql.length)
  if (alias && alias.slice(1).startsWith(ql)) return 400
  // subsequence match on bare name — each matched char in order scores
  let si = 0
  let hits = 0
  let lastIdx = -1
  for (let i = 0; i < bare.length && si < ql.length; i++) {
    if (bare[i] === ql[si]) {
      hits++
      if (lastIdx === i - 1) hits++ // consecutive bonus
      lastIdx = i
      si++
    }
  }
  if (si === ql.length) return 100 + hits
  if (desc.includes(ql)) return 10
  return 0
}

// surface = 'project' (project + mission chats) or '1on1' (agent direct chats).
// Skills can declare a `scopes` array to restrict where they appear.
export default function SlashCommandAutocomplete({ value, setValue, inputRef, caret, onModalCommand, surface = 'project', panelStyle }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const listRef = useRef(null)
  const rowRefs = useRef([])

  const active = useMemo(() => findActiveSlash(value, caret), [value, caret])

  const matches = useMemo(() => {
    if (!active) return []
    const q = active.query
    const scoped = SKILLS.filter(s => {
      // No scopes field → available everywhere (backward compat for the 150+
      // existing skills). With scopes → only show on listed surfaces.
      if (!Array.isArray(s.scopes) || s.scopes.length === 0) return true
      return s.scopes.includes(surface)
    })
    const scored = scoped.map(s => ({ s, score: scoreSkill(s, q) })).filter(x => x.score > 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 8).map(x => x.s)
  }, [active, surface])

  // Show/hide based on active token + matches
  useEffect(() => {
    if (active && matches.length > 0) {
      setOpen(true)
      setSelected(0)
    } else {
      setOpen(false)
    }
  }, [active, matches.length])

  const insertSkill = useCallback((skill) => {
    if (!active) return
    // Modal-kind skills don't insert text — they dispatch to a modal handler
    // and clear the slash token from the input.
    if (skill.kind === 'modal') {
      const before = value.slice(0, active.start)
      const after = value.slice(active.end)
      setValue(before + after)
      setOpen(false)
      const pos = before.length
      setTimeout(() => {
        const el = inputRef?.current
        if (el && typeof el.setSelectionRange === 'function') {
          el.focus()
          el.setSelectionRange(pos, pos)
        }
        if (typeof onModalCommand === 'function') onModalCommand(skill.name)
      }, 0)
      return
    }
    const before = value.slice(0, active.start)
    const after = value.slice(active.end)
    const trail = after.startsWith(' ') ? '' : ' '
    const next = before + skill.name + trail + after
    setValue(next)
    setOpen(false)
    // Move caret to just after the inserted skill + space
    const pos = before.length + skill.name.length + trail.length
    setTimeout(() => {
      const el = inputRef?.current
      if (el && typeof el.setSelectionRange === 'function') {
        el.focus()
        el.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [active, value, setValue, inputRef, onModalCommand])

  // Keyboard handling — bound to the input element
  useEffect(() => {
    const el = inputRef?.current
    if (!el) return
    const onKey = (e) => {
      if (!open) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelected(i => Math.min(matches.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelected(i => Math.max(0, i - 1))
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        const pick = matches[selected]
        if (pick) insertSkill(pick)
      } else if (e.key === ' ' && active) {
        // Space-trigger: exact match on a modal-kind skill dispatches without selection.
        const exact = SKILLS.find(s => s.name.slice(1).toLowerCase() === active.query.toLowerCase() && s.kind === 'modal')
        if (exact) {
          e.preventDefault()
          e.stopPropagation()
          insertSkill(exact)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    // capture phase so we intercept Enter before the input's own onKeyDown
    el.addEventListener('keydown', onKey, true)
    return () => el.removeEventListener('keydown', onKey, true)
  }, [open, matches, selected, insertSkill, inputRef])

  // Scroll selected row into view
  useEffect(() => {
    const row = rowRefs.current[selected]
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'nearest' })
    }
  }, [selected])

  if (!open || matches.length === 0) return null

  return (
    <div
      data-testid="slash-autocomplete"
      ref={listRef}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 'calc(100% + 8px)',
        maxWidth: 560,
        margin: '0 auto',
        background: C.s1,
        border: '1px solid ' + C.border2,
        borderRadius: 16,
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        maxHeight: 320,
        overflowY: 'auto',
        padding: 6,
        zIndex: 40,
        // Host-surface override (CV6 passes its glass panel tokens) — the CV4/CV3
        // look is untouched when the prop is absent.
        ...(panelStyle || {}),
      }}
    >
      {matches.map((skill, idx) => {
        const isSel = idx === selected
        return (
          <div
            key={skill.name}
            ref={el => (rowRefs.current[idx] = el)}
            onMouseDown={(e) => {
              e.preventDefault()
              insertSkill(skill)
            }}
            onMouseEnter={() => setSelected(idx)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              cursor: 'pointer',
              background: isSel ? 'rgba(16,185,129,0.12)' : 'transparent',
              transition: 'background 0.1s',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: isSel ? C.accent2 : C.text,
                fontFamily: "'JetBrains Mono', monospace",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {skill.name}
              </div>
              <div style={{
                fontSize: 11,
                color: C.text2,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {skill.description}
              </div>
            </div>
            <div style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.muted,
              flexShrink: 0,
            }}>
              {skill.category}
            </div>
          </div>
        )
      })}
    </div>
  )
}
