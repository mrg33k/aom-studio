// TaskDetailAccordion.jsx -- inline task detail expansion
// Renders below a task row when tapped in Checklist or Trello view.
// Shows: status chip, agent, project, context note, action buttons (Launch, Assign Agent).
// Used by: ChecklistMode.jsx (TaskCard), BoardView.jsx (BoardCard)

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, UserPlus, ChevronDown, Pencil, Check, X } from 'lucide-react'
import { AGENTS } from '../gridSpec.js'
import { handleTaskContextAction } from './TaskContextMenu.jsx'

const AGENT_SLUGS = ['elon','bobby','steffen','cleo','alex','jacob','elmo','tony','steve','colton','paige','mom']

export default function TaskDetailAccordion({ task, project, isNightMode = true }) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(task?.text || '')
  const [localText, setLocalText] = useState(null) // optimistic update after save
  const editRef = useRef(null)
  const isDaytime = isNightMode === false

  // Focus textarea when edit mode opens
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus()
      editRef.current.setSelectionRange(editRef.current.value.length, editRef.current.value.length)
    }
  }, [isEditing])

  const handleEditSave = (e) => {
    e.stopPropagation()
    const newText = editText.trim()
    if (!newText || newText === task?.text) { setIsEditing(false); return }
    // Optimistic update -- show new text immediately
    setLocalText(newText)
    setIsEditing(false)
    // Fire to API (fire-and-forget)
    handleTaskContextAction('editText', task, newText, null)
  }

  const handleEditCancel = (e) => {
    e.stopPropagation()
    setEditText(task?.text || '')
    setIsEditing(false)
  }

  const agentInfo = task?.agent ? AGENTS.find(a => a.slug === task.agent) : null
  const taskStatus = task?.done ? 'Done' : task?.isLive ? 'Live' : 'To Do'
  const statusColor = task?.done ? '#22C55E' : task?.isLive ? '#FF6B3D' : '#3B9EFF'

  const panelBg = isDaytime ? 'rgba(12,28,65,0.97)' : 'rgba(8,14,35,0.97)'
  const border = isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(100,150,255,0.12)'
  const chipText = isDaytime ? '#7BBFFF' : '#5B8FCC'

  const handleLaunch = (e) => {
    e.stopPropagation()
    handleTaskContextAction('addToRightNow', task, null, null)
  }

  const handleAssign = (e, slug) => {
    e.stopPropagation()
    handleTaskContextAction('reassign', task, slug, null)
    setIsAssigning(false)
  }

  const displayText = localText ?? task?.text ?? ''

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: panelBg,
        border: `1px solid ${border}`,
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        padding: '10px 16px 14px',
        marginTop: -2,
        touchAction: 'auto',
      }}
    >
      {/* Meta row: status + agent + project */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: statusColor, background: `${statusColor}18`,
          border: `1px solid ${statusColor}35`, borderRadius: 4, padding: '3px 8px',
        }}>
          {taskStatus}
        </span>

        {agentInfo && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: agentInfo.color, background: `${agentInfo.color}12`,
            border: `1px solid ${agentInfo.color}28`, borderRadius: 4,
            padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: agentInfo.color, flexShrink: 0 }} />
            {agentInfo.name}
          </span>
        )}

        {project?.name && (
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, fontSize: 10,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: project.color || '#6B7280',
            background: `${project.color || '#6B7280'}10`,
            border: `1px solid ${project.color || '#6B7280'}20`,
            borderRadius: 4, padding: '3px 8px', opacity: 0.8,
          }}>
            {project.name}
          </span>
        )}
      </div>

      {/* Inline edit mode */}
      {isEditing && (
        <div style={{ marginBottom: 10 }}>
          <textarea
            ref={editRef}
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEditSave(e) }
              if (e.key === 'Escape') handleEditCancel(e)
            }}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: isDaytime ? 'rgba(15,25,50,0.8)' : 'rgba(5,10,25,0.8)',
              border: `1px solid rgba(59,130,246,0.45)`,
              borderRadius: 7, padding: '8px 10px',
              fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 400,
              color: '#E8F0FF', lineHeight: 1.5,
              resize: 'none', minHeight: 64,
              outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <button
              onClick={handleEditSave}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px',
                background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.40)',
                borderRadius: 6, cursor: 'pointer',
                fontFamily: "'Inter Tight', system-ui, sans-serif",
                fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#22C55E',
              }}
            >
              <Check size={11} /> Save
            </button>
            <button
              onClick={handleEditCancel}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '5px 10px',
                background: 'rgba(107,114,128,0.10)', border: '1px solid rgba(107,114,128,0.25)',
                borderRadius: 6, cursor: 'pointer',
                fontFamily: "'Inter Tight', system-ui, sans-serif",
                fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
                color: '#6B7280',
              }}
            >
              <X size={11} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Context note */}
      {(task?.note || task?.context) && !isEditing && (
        <div style={{
          fontFamily: "'Inter', system-ui, sans-serif", fontSize: 13, fontWeight: 400,
          color: isDaytime ? '#94B8D8' : '#7A92B0',
          lineHeight: 1.5, marginBottom: 12,
          padding: '8px 10px',
          background: isDaytime ? 'rgba(59,130,246,0.04)' : 'rgba(100,150,255,0.03)',
          border: `1px solid ${border}`, borderRadius: 6,
        }}>
          {task.note || task.context}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {/* Launch to Right Now -- only for non-done, non-live tasks */}
        {!task?.done && !task?.isLive && (
          <button
            onClick={handleLaunch}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 11px',
              background: 'rgba(255,107,61,0.12)', border: '1px solid rgba(255,107,61,0.30)',
              borderRadius: 7, cursor: 'pointer',
              fontFamily: "'Inter Tight', system-ui, sans-serif",
              fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: '#FF6B3D', transition: 'background 120ms ease', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,61,0.22)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,107,61,0.12)' }}
          >
            <Zap size={11} />
            Launch
          </button>
        )}

        {/* Edit */}
        {!isEditing && (
          <button
            onClick={e => { e.stopPropagation(); setEditText(displayText); setIsAssigning(false); setIsEditing(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 11px',
              background: isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(100,150,255,0.06)',
              border: `1px solid ${border}`,
              borderRadius: 7, cursor: 'pointer',
              fontFamily: "'Inter Tight', system-ui, sans-serif",
              fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: chipText, transition: 'background 120ms ease', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.16)' }}
            onMouseLeave={e => { e.currentTarget.style.background = isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(100,150,255,0.06)' }}
          >
            <Pencil size={11} />
            Edit
          </button>
        )}

        {/* Assign Agent */}
        <button
          onClick={e => { e.stopPropagation(); setIsAssigning(a => !a) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 11px',
            background: isAssigning
              ? (isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,150,255,0.14)')
              : (isDaytime ? 'rgba(59,130,246,0.08)' : 'rgba(100,150,255,0.06)'),
            border: `1px solid ${isAssigning ? 'rgba(100,150,255,0.4)' : border}`,
            borderRadius: 7, cursor: 'pointer',
            fontFamily: "'Inter Tight', system-ui, sans-serif",
            fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: chipText, transition: 'background 120ms ease', whiteSpace: 'nowrap',
          }}
        >
          <UserPlus size={11} />
          Assign
          <ChevronDown
            size={9}
            style={{ transform: isAssigning ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
          />
        </button>
      </div>

      {/* Agent picker */}
      <AnimatePresence>
        {isAssigning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 5,
              marginTop: 8, padding: 8,
              background: isDaytime ? 'rgba(15,25,50,0.6)' : 'rgba(5,10,25,0.6)',
              border: `1px solid ${border}`, borderRadius: 8,
            }}>
              {AGENT_SLUGS.map(slug => {
                const a = AGENTS.find(ag => ag.slug === slug)
                if (!a) return null
                const isActive = task?.agent === slug
                return (
                  <button
                    key={slug}
                    onClick={e => handleAssign(e, slug)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 9px',
                      background: isActive ? `${a.color}22` : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${isActive ? a.color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 20, cursor: 'pointer',
                      fontFamily: "'Inter Tight', system-ui, sans-serif",
                      fontSize: 11, fontWeight: 700,
                      color: isActive ? a.color : '#8BA4C4',
                      transition: 'all 120ms ease',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = `${a.color}15`
                        e.currentTarget.style.borderColor = `${a.color}44`
                        e.currentTarget.style.color = a.color
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.color = '#8BA4C4'
                      }
                    }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    {a.name}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
