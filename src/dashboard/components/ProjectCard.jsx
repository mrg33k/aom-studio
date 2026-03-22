// ProjectCard -- extracted from GameHUD.jsx (god file split 3/6)
// Owner: Bobby2 (HUD team)
// Renders a single project pill in the bottom HUD strip.
// Vegas energy: chunky, grabbable, Trello thickness, casino card drop shadows.

import React, { useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Zap, AlertCircle, History, Flame, CheckCircle2 } from 'lucide-react'
import { PALETTE, HUD } from './HUDConstants.jsx'

// ---- PROJECT CARD (VEGAS ENERGY: Trello thickness, physical objects) ---------
// If you think it's big enough, DOUBLE IT. Slot machine buttons. Casino cards.
// Drop shadows, bold rounded corners, chunky, grabbable, satisfying.
export function ProjectCard({ project, isExpanded, onClick, onContextMenu, isNightMode, wiggle, isMobile, isTablet }) {
  const isCompact = isMobile || isTablet
  const isDaytime = isNightMode === false
  const realTasks = project.tasks.filter(t => !t.isAddPrompt)
  const totalTasks = realTasks.length
  const doneTasks = realTasks.filter(t => t.done).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
  const remaining = totalTasks - doneTasks
  const isSchedule = project.section === 'schedule' || project.section === 'today'
  const isRightNow = project.section === 'rightnow'
  const isTodoList = project.section === 'your-todos'
  const isFinishThese = project.section === 'finish-these' || project.section === 'checking-in'
  const isCompletedFeed = project.section === 'completed-feed'
  const hasLiveTasks = isRightNow && project.tasks.some(t => t.isLive)
  const isClient = project.isClient
  const allDone = remaining === 0 && totalTasks > 0

  // Client status tag colors
  const STATUS_TAG_COLORS = {
    RED: { bg: 'rgba(239,68,68,0.25)', border: 'rgba(239,68,68,0.5)', text: '#FF6B6B', glow: 'rgba(239,68,68,0.3)' },
    GREEN: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.4)', text: '#4ADE80', glow: 'rgba(34,197,94,0.2)' },
    ORANGE: { bg: 'rgba(249,115,22,0.2)', border: 'rgba(249,115,22,0.4)', text: '#FB923C', glow: 'rgba(249,115,22,0.2)' },
    YELLOW: { bg: 'rgba(234,179,8,0.2)', border: 'rgba(234,179,8,0.4)', text: '#FACC15', glow: 'rgba(234,179,8,0.2)' },
    HOLD: { bg: 'rgba(107,114,128,0.2)', border: 'rgba(107,114,128,0.3)', text: '#9CA3AF', glow: 'none' },
  }
  const tagStyle = isClient && project.statusTag ? STATUS_TAG_COLORS[project.statusTag] : null

  // Long-press for mobile context menu
  const longPressRef = useRef(null)
  const handlePillTouchStart = useCallback((e) => {
    const touch = e.touches[0]
    longPressRef.current = setTimeout(() => {
      onContextMenu?.({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => {}, stopPropagation: () => {} }, project)
    }, 500)
  }, [onContextMenu, project])
  const handlePillTouchEnd = useCallback(() => {
    clearTimeout(longPressRef.current)
  }, [])
  const handlePillTouchMove = useCallback(() => {
    clearTimeout(longPressRef.current)
  }, [])

  return (
    <motion.button
      className={wiggle ? 'pill-wiggle-glow' : undefined}
      onClick={onClick}
      onContextMenu={(e) => onContextMenu?.(e, project)}
      onTouchStart={handlePillTouchStart}
      onTouchEnd={handlePillTouchEnd}
      onTouchMove={handlePillTouchMove}
      animate={wiggle ? {
        scale: [1, 1.05, 0.98, 1.03, 1],
        y: [0, -2, 0, -1, 0],
        transition: { duration: 0.6, ease: 'easeInOut' },
      } : { scale: 1, y: 0 }}
      whileHover={{ scale: 1.05, y: -3, transition: { type: 'spring', stiffness: 500, damping: 12 } }}
      whileTap={{ scale: 0.92, y: 2, transition: { type: 'spring', stiffness: 600, damping: 18 } }}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        height: 30, padding: '0 10px', minWidth: isRightNow ? 72 : 56,
        background: isDaytime
          ? (isExpanded
              ? `linear-gradient(135deg, ${project.color}18, ${project.color}08)`
              : isClient
                ? `linear-gradient(135deg, ${project.color}0C, ${project.color}06)`
                : isSchedule
                  ? 'linear-gradient(135deg, rgba(255,107,61,0.08), rgba(255,107,61,0.03))'
                  : 'linear-gradient(135deg, rgba(59,130,246,0.06), rgba(59,130,246,0.02))')
          : (isExpanded
              ? `linear-gradient(135deg, ${project.color}22, ${project.color}0C)`
              : isClient
                ? `linear-gradient(135deg, ${project.color}14, ${project.color}06)`
                : isSchedule
                  ? 'linear-gradient(135deg, rgba(255, 107, 61, 0.14), rgba(255, 107, 61, 0.06))'
                  : 'linear-gradient(135deg, rgba(100,180,255,0.07), rgba(100,180,255,0.02))'),
        border: isDaytime
          ? `2px solid ${isExpanded ? `${project.color}40` : isClient ? `${project.color}25` : isSchedule ? 'rgba(255,107,61,0.2)' : 'rgba(59,130,246,0.15)'}`
          : `2px solid ${isExpanded ? `${project.color}55` : isClient ? `${project.color}30` : isSchedule ? 'rgba(255, 107, 61, 0.28)' : 'rgba(100,180,255,0.14)'}`,
        borderRadius: 16,
        cursor: 'pointer',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 200ms ease',
        // iOS: remove white tap-highlight and native long-press callout so framer-motion
        // animations are the only visual feedback on mobile (no grey flash under the pill)
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        // VEGAS + CROSSY ROAD: Physical drop shadow. Chunky grabbable pills.
        boxShadow: isDaytime
          ? (isExpanded
              ? `0 4px 16px ${project.color}20, 0 1px 4px rgba(0,0,0,0.08)`
              : isClient && project.statusTag === 'RED'
                ? '0 2px 12px rgba(239,68,68,0.2), 0 1px 3px rgba(0,0,0,0.2)'
                : '0 2px 8px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.15)')
          : (isExpanded
              ? `0 6px 24px ${project.color}30, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)`
              : isClient && project.statusTag === 'RED'
                ? `0 4px 20px rgba(239,68,68,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)`
                : isSchedule
                  ? '0 4px 20px rgba(255,107,61,0.2), 0 2px 6px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
                  : '0 4px 16px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)'),
      }}
    >
      {/* Bottom progress fill - THICKER. Hidden for completed feed (100% is always true, redundant). */}
      {!isCompletedFeed && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0,
          width: `${progress}%`, height: 3,
          background: `linear-gradient(90deg, ${project.color}70, ${project.color})`,
          transition: 'width 500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          borderRadius: '0 0 16px 16px',
          boxShadow: `0 0 8px ${project.color}44`,
        }} />
      )}

      {/* Side accent for Right Now, Schedule, Your TODOs, or RED clients - THICKER */}
      {(isRightNow || isSchedule || isTodoList || (isClient && project.statusTag === 'RED')) && (
        <div style={{
          position: 'absolute', left: 0, top: 6, bottom: 6,
          width: 3, borderRadius: 2,
          background: isTodoList ? '#EF4444' : isRightNow ? project.color : isSchedule ? project.color : '#EF4444',
          boxShadow: `0 0 12px ${isTodoList ? 'rgba(239,68,68,0.5)' : (isRightNow || isSchedule) ? project.color : 'rgba(239,68,68,0.6)'}88`,
          animation: (isRightNow && hasLiveTasks) ? 'statusPulse 1.5s ease-in-out infinite' : (isTodoList || (isClient && project.statusTag === 'RED')) ? 'statusPulse 2s ease-in-out infinite' : 'none',
        }} />
      )}

      {/* Project indicator - BIGGER on desktop, compact on mobile/tablet. */}
      {isRightNow ? (
        <Zap size={12} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 8px ${project.color}AA)`, animation: hasLiveTasks ? 'statusPulse 2s ease-in-out infinite' : 'none' }} />
      ) : isCompletedFeed ? (
        <CheckCircle2 size={12} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${project.color}88)` }} />
      ) : isTodoList ? (
        <AlertCircle size={12} color="#EF4444" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.6))' }} />
      ) : isFinishThese ? (
        <History size={12} color="#94A3B8" style={{ flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(148,163,184,0.4))' }} />
      ) : isSchedule ? (
        <Flame size={12} color={project.color} style={{ flexShrink: 0, filter: `drop-shadow(0 0 6px ${project.color}88)` }} />
      ) : isClient ? (
        <div style={{
          width: 14, height: 14, borderRadius: '50%',
          background: project.color,
          boxShadow: `0 0 10px ${project.color}55`,
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 900, color: '#FFF',
          fontFamily: "'Inter Tight', sans-serif",
        }}>$</div>
      ) : (
        <div style={{
          width: 12, height: 12, borderRadius: 4,
          background: allDone ? `${project.color}60` : project.color,
          boxShadow: allDone ? 'none' : `0 0 12px ${project.color}55`,
          flexShrink: 0,
        }} />
      )}

      {/* Name - VEGAS SIZE on desktop, compact on mobile. */}
      <span style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 12, fontWeight: 800,
        color: isExpanded
          ? '#FFFFFF'
          : isDaytime ? '#F1F5F9' : (isSchedule ? '#EDF2FA' : HUD.textPrimary),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 90,
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        textShadow: isDaytime ? '0 1px 2px rgba(0,0,0,0.3)' : (isSchedule ? '0 1px 4px rgba(255,107,61,0.3)' : '0 1px 2px rgba(0,0,0,0.3)'),
      }}>
        {project.name}
      </span>

      {/* LIVE badge for Right Now pill */}
      {isRightNow && hasLiveTasks && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 800,
          color: '#FF6B3D',
          background: 'rgba(255,107,61,0.12)',
          padding: '2px 6px', borderRadius: 5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: '1.5px solid rgba(255,107,61,0.3)',
          whiteSpace: 'nowrap',
          animation: 'statusPulse 2s ease-in-out infinite',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#FF6B3D',
            boxShadow: '0 0 6px rgba(255,107,61,0.6)',
            animation: 'statusPulse 1.5s ease-in-out infinite',
          }} />
          LIVE
        </span>
      )}

      {/* NEEDS YOU badge for Your TODOs pill */}
      {isTodoList && remaining > 0 && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 800,
          color: '#EF4444',
          background: 'rgba(239,68,68,0.10)',
          padding: '3px 8px', borderRadius: 6,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: '1.5px solid rgba(239,68,68,0.25)',
          whiteSpace: 'nowrap',
          animation: 'statusPulse 2.5s ease-in-out infinite',
        }}>
          <AlertCircle size={10} />
          NEEDS YOU
        </span>
      )}

      {/* STALE badge for Finish These pill */}
      {isFinishThese && remaining > 0 && (
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 700,
          color: '#6B8AB0',
          background: 'rgba(148,163,184,0.08)',
          padding: '3px 8px', borderRadius: 6,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: '1.5px solid rgba(148,163,184,0.2)',
          whiteSpace: 'nowrap',
        }}>
          <History size={10} />
          STALE
        </span>
      )}

      {/* Revenue badge for clients */}
      {isClient && project.revenue && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 700,
          color: project.color,
          background: `${project.color}15`,
          padding: '2px 6px', borderRadius: 6,
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
          border: `1.5px solid ${project.color}30`,
        }}>
          {project.revenue}
        </span>
      )}

      {/* Category tag for pills -- shows WHAT it is (client/project/outreach), not the color.
          Color already communicates status visually. Text label tells you the category. */}
      {tagStyle && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12, fontWeight: 800,
          color: tagStyle.text,
          background: tagStyle.bg,
          padding: '3px 8px', borderRadius: 5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          border: `1.5px solid ${tagStyle.border}`,
          whiteSpace: 'nowrap',
          boxShadow: tagStyle.glow !== 'none' ? `0 0 10px ${tagStyle.glow}` : 'none',
          animation: project.statusTag === 'RED' ? 'statusPulse 2.5s ease-in-out infinite' : 'none',
        }}>
          {project.section === 'outreach' ? 'OUTREACH'
            : project.icon === 'client' || project.isClient ? 'CLIENT'
            : 'PROJECT'}
        </span>
      )}

      {/* Task count badge - VEGAS. Oversized. Casino chip energy. LABELED. */}
      {remaining > 0 && !isClient && (
        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace",
          fontSize: 11, fontWeight: 800,
          color: '#FFF',
          background: `linear-gradient(135deg, ${project.color}, ${project.color}DD)`,
          padding: '2px 7px', borderRadius: 8,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          boxShadow: `0 3px 12px ${project.color}55, inset 0 1px 0 rgba(255,255,255,0.15)`,
          minWidth: 20, textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          {remaining}
        </span>
      )}

      {allDone && !isCompletedFeed && (
        <CheckCircle2 size={13} color={project.color} strokeWidth={2.5} style={{ flexShrink: 0, filter: `drop-shadow(0 0 4px ${project.color}44)` }} />
      )}

      {/* Count badge for completed feed pill */}
      {isCompletedFeed && totalTasks > 0 && (
        <span style={{
          fontFamily: "'Inter Tight', JetBrains Mono, monospace",
          fontSize: 11, fontWeight: 800,
          color: project.color,
          background: `${project.color}1A`,
          padding: '2px 7px', borderRadius: 8,
          letterSpacing: '-0.01em',
          lineHeight: 1,
          border: `1.5px solid ${project.color}35`,
          minWidth: 20, textAlign: 'center',
          whiteSpace: 'nowrap',
        }}>
          {totalTasks}
        </span>
      )}
    </motion.button>
  )
}

export default ProjectCard
