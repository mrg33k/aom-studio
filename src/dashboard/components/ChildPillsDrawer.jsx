// ChildPillsDrawer.jsx
// AOM parent pill expand: shows child project pills in a slide-up drawer.
// Blue glass theme (no white). Same drawer pattern as TaskPanel.
// Replaces the old fixed-position floating popover.

import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { ProjectCard } from './ProjectCard.jsx'

export function ChildPillsDrawer({
  project,
  clientKids,
  internalKids,
  onClose,
  onSelectChild,
  isNightMode,
  expandedProject,
  isMobile,
  isTablet,
  onContextMenu,
  pinnedPills,
}) {
  const isDaytime = isNightMode === false
  const allTasks = project.tasks.filter(t => !t.isAddPrompt)
  const totalRemaining = allTasks.filter(t => !t.done).length
  const totalDone = allTasks.filter(t => t.done).length

  // Blue glass palette -- no white
  const bg = isDaytime ? 'rgba(15,25,50,0.97)' : 'rgba(8,14,28,0.95)'
  const borderColor = isDaytime ? 'rgba(59,130,246,0.30)' : 'rgba(100,180,255,0.15)'
  const shadow = isDaytime
    ? '0 -12px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(100,180,255,0.12)'
    : '0 -12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(100,180,255,0.08)'
  const glow = isDaytime
    ? 'linear-gradient(180deg, rgba(59,130,246,0.12) 0%, transparent 100%)'
    : 'linear-gradient(180deg, rgba(100,180,255,0.05) 0%, transparent 100%)'
  const dividerColor = isDaytime ? 'rgba(59,130,246,0.18)' : 'rgba(100,180,255,0.12)'
  const labelColor = isDaytime ? 'rgba(100,180,255,0.9)' : 'rgba(59,130,246,0.7)'
  const sectionLabelColor = isDaytime ? 'rgba(100,180,255,0.55)' : 'rgba(100,180,255,0.38)'
  const statTextColor = isDaytime ? '#94B8D8' : '#4A6080'
  const dragHandleColor = isDaytime ? 'rgba(59,130,246,0.25)' : 'rgba(100,180,255,0.2)'

  const renderGroup = (kids, groupLabel) => {
    if (!kids.length) return null
    return (
      <div key={groupLabel}>
        <div style={{
          paddingBottom: 4, marginBottom: 6,
          borderBottom: `1px solid ${dividerColor}`,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, fontWeight: 700,
            color: sectionLabelColor,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
          }}>{groupLabel}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {kids.map(child => (
            <div key={child.section} style={{ position: 'relative', flexShrink: 0 }}>
              <ProjectCard
                project={child}
                isExpanded={expandedProject?.section === child.section}
                onClick={() => onSelectChild(child)}
                onContextMenu={onContextMenu}
                isNightMode={isNightMode}
                wiggle={false}
                isMobile={isMobile}
                isTablet={isTablet}
              />
              {pinnedPills?.has(child.section) && (
                <div style={{
                  position: 'absolute', top: -3, right: -3,
                  width: 9, height: 9, borderRadius: '50%',
                  background: '#3B9EFF',
                  border: '1.5px solid rgba(10,15,26,0.9)',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      style={{
        margin: '0 8px',
        background: bg,
        backdropFilter: 'blur(24px)',
        border: `2px solid ${borderColor}`,
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        maxHeight: 'min(380px, calc(100vh - 200px))',
        boxShadow: shadow,
      }}
    >
      {/* Drag handle (mobile swipe indicator) */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px', cursor: 'grab' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: dragHandleColor }} />
      </div>

      {/* Inner glow at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 50,
        background: glow, pointerEvents: 'none',
      }} />

      {/* Scrollable content */}
      <div style={{ padding: '0 12px 12px', overflowY: 'auto', maxHeight: 'calc(100% - 24px)' }}>

        {/* Header: label + counts + close */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          paddingBottom: 8,
          borderBottom: `1px solid ${dividerColor}`,
          marginBottom: 10,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            color: labelColor,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            flex: 1,
          }}>AOM Projects</span>
          {totalRemaining > 0 && (
            <span style={{
              fontFamily: "'Inter Tight', monospace",
              fontSize: 10, fontWeight: 700,
              color: '#3B9EFF',
              background: 'rgba(59,158,255,0.12)',
              padding: '1px 6px', borderRadius: 6,
              border: '1px solid rgba(59,158,255,0.20)',
              whiteSpace: 'nowrap',
            }}>{totalRemaining} left</span>
          )}
          {totalDone > 0 && (
            <span style={{
              fontFamily: "'Inter Tight', monospace",
              fontSize: 10, fontWeight: 600,
              color: statTextColor,
              whiteSpace: 'nowrap',
            }}>{totalDone} done</span>
          )}
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 6,
              background: isDaytime ? 'rgba(59,130,246,0.22)' : 'rgba(100,180,255,0.06)',
              border: `1px solid ${borderColor}`,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={12} color={isDaytime ? '#94B8D8' : '#6B8AB0'} />
          </button>
        </div>

        {/* Client projects */}
        {renderGroup(clientKids, 'Clients')}

        {/* Gap between groups */}
        {clientKids.length > 0 && internalKids.length > 0 && (
          <div style={{ height: 10 }} />
        )}

        {/* Internal projects */}
        {renderGroup(internalKids, 'Internal')}
      </div>
    </motion.div>
  )
}
