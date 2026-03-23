// TaskLabelPill.jsx -- Colored category label pill for tasks
// Click to open picker, click a label to assign, click active label to remove.
// Storage: localStorage-first via taskLabels.js, Supabase when UUID is available.

import { useState, useRef, useEffect, useCallback } from 'react'
import { Tag } from 'lucide-react'
import { TASK_LABELS, getLabelConfig, getTaskLabel, setTaskLabel } from '../lib/taskLabels.js'

export default function TaskLabelPill({ taskId, taskText, isNightMode = true, compact = false }) {
  const [labelId, setLabelId] = useState(() => getTaskLabel(taskId, taskText))
  const [pickerOpen, setPickerOpen] = useState(false)
  const containerRef = useRef(null)
  const labelCfg = getLabelConfig(labelId)

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('touchstart', handle)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('touchstart', handle)
    }
  }, [pickerOpen])

  const handlePillClick = useCallback((e) => {
    e.stopPropagation()
    e.preventDefault()
    setPickerOpen(v => !v)
  }, [])

  const handleSelect = useCallback((e, id) => {
    e.stopPropagation()
    e.preventDefault()
    const next = id === labelId ? null : id // click active = remove
    setTaskLabel(taskId, taskText, next)
    setLabelId(next)
    setPickerOpen(false)
  }, [taskId, taskText, labelId])

  const pickerBg = isNightMode ? 'rgba(10,20,50,0.97)' : 'rgba(240,248,255,0.98)'
  const pickerBorder = isNightMode ? 'rgba(60,120,255,0.25)' : 'rgba(100,160,255,0.35)'
  const pickerShadow = '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(60,120,255,0.15)'

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
    >
      {/* The pill itself -- shows current label or an empty tag icon */}
      <button
        onClick={handlePillClick}
        title={labelCfg ? `Label: ${labelCfg.name} (click to change)` : 'Add label'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: compact ? 3 : 4,
          padding: compact ? '1px 5px' : '2px 7px',
          borderRadius: 4,
          background: labelCfg ? labelCfg.bg : 'transparent',
          border: `1px solid ${labelCfg ? labelCfg.border : (isNightMode ? 'rgba(100,150,255,0.18)' : 'rgba(100,160,255,0.28)')}`,
          color: labelCfg ? labelCfg.color : (isNightMode ? 'rgba(100,150,255,0.5)' : 'rgba(80,130,220,0.5)'),
          cursor: 'pointer',
          fontSize: compact ? 9 : 10,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
          WebkitAppearance: 'none', appearance: 'none',
          lineHeight: 1,
        }}
      >
        {labelCfg ? (
          labelCfg.name
        ) : (
          <Tag size={compact ? 9 : 10} style={{ opacity: 0.5 }} />
        )}
      </button>

      {/* Label picker popover */}
      {pickerOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            zIndex: 9999,
            background: pickerBg,
            border: `1px solid ${pickerBorder}`,
            borderRadius: 10,
            padding: '8px',
            boxShadow: pickerShadow,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 110,
          }}
        >
          <div style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 9, fontWeight: 700,
            color: isNightMode ? 'rgba(100,150,255,0.5)' : 'rgba(80,130,220,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            paddingBottom: 4,
            borderBottom: `1px solid ${isNightMode ? 'rgba(60,120,255,0.12)' : 'rgba(100,160,255,0.18)'}`,
            marginBottom: 2,
          }}>
            Label
          </div>
          {TASK_LABELS.map(lbl => (
            <button
              key={lbl.id}
              onClick={(e) => handleSelect(e, lbl.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 8px',
                borderRadius: 6,
                background: lbl.id === labelId ? lbl.bg : 'transparent',
                border: `1px solid ${lbl.id === labelId ? lbl.border : 'transparent'}`,
                cursor: 'pointer',
                transition: 'background 100ms ease',
                width: '100%',
                WebkitAppearance: 'none', appearance: 'none',
              }}
              onMouseEnter={e => { if (lbl.id !== labelId) e.currentTarget.style.background = lbl.bg.replace('0.15', '0.08') }}
              onMouseLeave={e => { if (lbl.id !== labelId) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: lbl.color, flexShrink: 0,
                boxShadow: `0 0 4px ${lbl.color}80`,
              }} />
              <span style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: 12, fontWeight: lbl.id === labelId ? 700 : 500,
                color: lbl.id === labelId ? lbl.color : (isNightMode ? '#CBD5E1' : '#334155'),
              }}>
                {lbl.name}
              </span>
              {lbl.id === labelId && (
                <span style={{
                  marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                  color: lbl.color, opacity: 0.7,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  REMOVE
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
