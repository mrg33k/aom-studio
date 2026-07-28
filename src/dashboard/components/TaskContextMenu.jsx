// Shared Task Context Menu -- universal right-click menu for ALL task items
// Used by: ChecklistMode.jsx, GameDashboard.jsx (sidebar task lists + expanded sections)
// Spec: projects/steffen/right-click-menu-spec.md
// Owner: Bobby2 (HUD team)
//
// Menu options: Mark Done, Assign Agent (submenu), Add to Right Now, Move to Project (submenu),
// Set Priority (submenu), Add Context (inline input), Delete (two-click confirm)
//
// Day/night palette swap. Submenus slide LEFT (sidebar is right-aligned).
// Keyboard nav: ArrowDown/Up = move focus, ArrowLeft = open submenu, ArrowRight = close submenu,
// Enter = activate, Escape = close.

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare, Square,
  UserCircle2, ChevronRight,
  Zap,
  FolderKanban,
  Flag,
  ArrowUpCircle, ArrowRightCircle, ArrowDownCircle,
  MessageSquare,
  Trash2,
  Check,
  StickyNote,
  Eye,
} from 'lucide-react'
import { AGENTS } from '../gridSpec.js'
import { supabase } from '../lib/supabase.js'
import { authFetch } from '../lib/authFetch.js'

// ---- Constants ----
const ASSIGNABLE_AGENTS_FALLBACK = AGENTS.filter(a =>
  !['paige', 'pixel'].includes(a.slug)
)

const PRIORITY_ICON_MAP = {
  high: ArrowUpCircle,
  med: ArrowRightCircle,
  low: ArrowDownCircle,
}

const PRIORITY_OPTIONS_FALLBACK = [
  { key: 'high', label: 'High priority', icon: ArrowUpCircle, color: '#EF4444' },
  { key: 'med', label: 'Medium priority', icon: ArrowRightCircle, color: '#F59E0B' },
  { key: 'low', label: 'Low priority', icon: ArrowDownCircle, color: '#6B7280' },
]

// ---- Menu item definitions: controls which actions appear, in what order, and with what label ----
// Fetched from Supabase context_menu_items table. Falls back to this static list if table not ready.
// To disable an action or reorder without a deploy, update the table in Supabase.
const MENU_ITEMS_FALLBACK = [
  { id: 'toggle_done',      action_key: 'toggle_done',      label: 'Mark Done',        position: 1, is_submenu: false, is_danger: false, divider_before: false },
  { id: 'assign_agent',     action_key: 'assign_agent',     label: 'Assign Agent',     position: 2, is_submenu: true,  is_danger: false, divider_before: true  },
  { id: 'add_to_right_now', action_key: 'add_to_right_now', label: 'Add to Right Now', position: 3, is_submenu: false, is_danger: false, divider_before: false },
  { id: 'move_to_project',  action_key: 'move_to_project',  label: 'Move to Project',  position: 4, is_submenu: true,  is_danger: false, divider_before: false },
  { id: 'set_priority',     action_key: 'set_priority',     label: 'Set Priority',     position: 5, is_submenu: true,  is_danger: false, divider_before: true  },
  { id: 'add_context',      action_key: 'add_context',      label: 'Add Context',      position: 6, is_submenu: false, is_danger: false, divider_before: false },
  { id: 'delete',           action_key: 'delete',           label: 'Delete',           position: 7, is_submenu: false, is_danger: true,  divider_before: true  },
]

// ---- Day/Night palettes ----
function getPalette(isNightMode) {
  if (isNightMode !== false) {
    // Night mode (default)
    return {
      panelBg: 'rgba(12, 16, 28, 0.97)',
      panelBorder: 'rgba(100, 180, 255, 0.18)',
      panelShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(100,180,255,0.06)',
      itemText: '#D0D8E8',
      headerText: '#4A6080',
      divider: 'rgba(100,180,255,0.08)',
      hoverBg: 'rgba(100,180,255,0.08)',
      dangerColor: '#EF4444',
      accentColor: '#5BB8FF',
      inputBg: 'rgba(255,255,255,0.04)',
      inputBorder: 'rgba(100,180,255,0.15)',
      inputText: '#F0ECE6',
    }
  }
  // Day mode -- blue glass (brighter blue, matches BoardView day palette)
  return {
    panelBg: 'rgba(15, 25, 50, 0.95)',
    panelBorder: 'rgba(100, 170, 255, 0.22)',
    panelShadow: '0 12px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(100,180,255,0.08)',
    itemText: '#D0D8E8',
    headerText: '#4A6080',
    divider: 'rgba(100,180,255,0.10)',
    hoverBg: 'rgba(100,180,255,0.10)',
    dangerColor: '#EF4444',
    accentColor: '#5BB8FF',
    inputBg: 'rgba(255,255,255,0.04)',
    inputBorder: 'rgba(100,180,255,0.15)',
    inputText: '#F0ECE6',
  }
}

// ---- Submenu wrapper ----
function Submenu({ children, parentRef, isNightMode }) {
  const pal = getPalette(isNightMode)
  const subRef = useRef(null)
  const [flipRight, setFlipRight] = useState(false)

  useEffect(() => {
    if (!subRef.current || !parentRef?.current) return
    const sub = subRef.current.getBoundingClientRect()
    // If submenu would overflow left edge, flip to right
    if (sub.left < 8) setFlipRight(true)
  }, [parentRef])

  return (
    <motion.div
      ref={subRef}
      initial={{ opacity: 0, x: flipRight ? -8 : 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: flipRight ? -8 : 8 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        ...(flipRight
          ? { left: '100%', marginLeft: 4 }
          : { right: '100%', marginRight: 4 }),
        top: 0,
        minWidth: 180,
        maxHeight: 300,
        overflowY: 'auto',
        background: pal.panelBg,
        backdropFilter: 'blur(20px)',
        border: `1.5px solid ${pal.panelBorder}`,
        borderRadius: 10,
        boxShadow: pal.panelShadow,
        padding: '6px 4px',
        zIndex: 301,
      }}
    >
      {children}
    </motion.div>
  )
}

// ---- Main TaskContextMenu ----
export default function TaskContextMenu({
  position,
  task,
  onClose,
  onAction,
  isNightMode,
  projects, // Array of { name, section, color, tasks } for Move to Project submenu
  showViewDetail, // When true, renders a "View Detail" button at the bottom (used by BoardView)
}) {
  const menuRef = useRef(null)
  const pal = getPalette(isNightMode)

  // Assignable agents from Supabase (falls back to filtered AGENTS if table not ready)
  const [assignableAgents, setAssignableAgents] = useState(ASSIGNABLE_AGENTS_FALLBACK)
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('agents')
      .select('slug,name,color')
      .eq('is_assignable', true)
      .order('name')
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setAssignableAgents(data)
      })
  }, [])

  // Priority options from Supabase (falls back to static list if table not ready)
  const [priorityOptions, setPriorityOptions] = useState(PRIORITY_OPTIONS_FALLBACK)
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('task_priorities')
      .select('key,label,color')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setPriorityOptions(data.map(p => ({
            ...p,
            icon: PRIORITY_ICON_MAP[p.key] || ArrowRightCircle,
          })))
        }
      })
  }, [])

  // Menu item definitions from Supabase context_menu_items table
  // Controls which actions appear, in what order, and with what label -- without a deploy
  const [menuItems, setMenuItems] = useState(MENU_ITEMS_FALLBACK)
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('context_menu_items')
      .select('id,action_key,label,position,is_submenu,is_danger,divider_before')
      .eq('enabled', true)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) setMenuItems(data)
      })
  }, [])

  // Project list from Supabase projects table (for Move to Project submenu)
  // Canonical source: Supabase projects table; task counts merged from parent prop
  const [projectsFromSupabase, setProjectsFromSupabase] = useState(null)
  useEffect(() => {
    if (!supabase) return
    const clientId = typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom'
    supabase
      .from('projects')
      .select('slug,name,color')
      .eq('is_active', true)
      .eq('client_id', clientId)
      .order('recency_weight', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setProjectsFromSupabase(data.map(row => ({ section: row.slug, name: row.name, color: row.color, tasks: [] })))
        }
      })
  }, [])

  // Merge Supabase canonical project list with task counts from parent prop
  const projectOptions = useMemo(() => {
    const base = projectsFromSupabase || (projects || [])
    const propMap = {}
    ;(projects || []).forEach(p => { propMap[p.section] = p })
    return base.map(p => ({
      ...p,
      tasks: propMap[p.section]?.tasks || p.tasks || [],
    }))
  }, [projectsFromSupabase, projects])

  // Submenus
  const [showAgents, setShowAgents] = useState(false)
  const [showProjects, setShowProjects] = useState(false)
  const [showPriority, setShowPriority] = useState(false)

  // Context input
  const [showContextInput, setShowContextInput] = useState(false)
  const [contextText, setContextText] = useState('')
  const contextInputRef = useRef(null)

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const deleteTimerRef = useRef(null)

  // Keyboard navigation
  const [focusIndex, setFocusIndex] = useState(-1)

  // Submenu hover grace timers
  const agentHoverTimer = useRef(null)
  const projectHoverTimer = useRef(null)
  const priorityHoverTimer = useRef(null)

  // Refs for submenu parent items (for positioning)
  const agentItemRef = useRef(null)
  const projectItemRef = useRef(null)
  const priorityItemRef = useRef(null)

  // Is task already in Right Now? (Supabase owns this -- read from task prop)
  const isInRightNow = task?.status === 'active' || task?.rightNow === true || false

  // Current priority (read from task prop -- Supabase owns this)
  const currentPriority = task?.priority || null

  // Current context note (read from task prop -- Supabase owns this)
  const existingNote = task?.note || task?.context || ''

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        if (showAgents || showProjects || showPriority) {
          setShowAgents(false)
          setShowProjects(false)
          setShowPriority(false)
        } else if (showContextInput) {
          setShowContextInput(false)
          setContextText('')
        } else {
          onClose()
        }
      }
    }
    const handleScroll = () => onClose()

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('touchstart', handleClick, { passive: true })
      document.addEventListener('keydown', handleKey)
    }, 30)
    // Close on scroll (parent scroll)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, showAgents, showProjects, showPriority, showContextInput])

  // Cleanup delete timer
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current)
    }
  }, [])

  // Focus context input when shown
  useEffect(() => {
    if (showContextInput && contextInputRef.current) {
      contextInputRef.current.focus()
    }
  }, [showContextInput])

  // Keep menu in viewport -- flip ABOVE click point when near bottom
  const [adjustedPos, setAdjustedPos] = useState(position)
  const [flippedUp, setFlippedUp] = useState(false)
  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    let x = position.x
    let y = position.y
    let flipped = false
    // Horizontal clamp
    if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8
    if (x < 8) x = 8
    // Vertical: flip above if menu would overflow the bottom
    if (y + rect.height > window.innerHeight - 8) {
      y = position.y - rect.height
      flipped = true
    }
    if (y < 8) y = 8
    setFlippedUp(flipped)
    setAdjustedPos({ x, y })
  }, [position])

  // Close all submenus
  const closeSubmenus = useCallback(() => {
    setShowAgents(false)
    setShowProjects(false)
    setShowPriority(false)
  }, [])

  // ---- Shared styles ----
  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '8px 14px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 500,
    color: pal.itemText, textAlign: 'left',
    borderRadius: 6, transition: 'background 80ms ease',
  }

  const dividerStyle = {
    height: 1, background: pal.divider, margin: '4px 10px',
  }

  // ---- Action handlers ----
  const handleToggleDone = () => {
    if (task?.done) {
      // Task is currently done -- mark it undone (back to active)
      onAction('toggle', task)
    } else {
      // Task is not done -- mark it completed (status='completed', goes to Completed feed)
      onAction('markDone', task)
    }
    onClose()
  }

  const handleAssignAgent = (agentSlug) => {
    onAction('reassign', task, agentSlug)
    onClose()
  }

  const handleAddToRightNow = () => {
    if (isInRightNow) return
    onAction('addToRightNow', task)
    onClose()
  }

  const handleMoveToProject = (projectSection) => {
    onAction('moveToProject', task, projectSection)
    onClose()
  }

  const handleSetPriority = (priorityKey) => {
    onAction('priority', task, priorityKey)
    onClose()
  }

  const handleAddContext = () => {
    if (!contextText.trim()) return
    onAction('addContext', task, contextText.trim())
    onClose()
  }

  const handleDelete = () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      deleteTimerRef.current = setTimeout(() => {
        setDeleteConfirm(false)
      }, 2000)
      return
    }
    // Second click: execute delete
    onAction('delete', task)
    onClose()
  }

  // Submenu hover handlers with grace period
  const handleAgentEnter = () => {
    clearTimeout(agentHoverTimer.current)
    agentHoverTimer.current = setTimeout(() => {
      closeSubmenus()
      setShowAgents(true)
    }, 150)
  }
  const handleAgentLeave = () => {
    clearTimeout(agentHoverTimer.current)
    agentHoverTimer.current = setTimeout(() => {
      setShowAgents(false)
    }, 200)
  }

  const handleProjectEnter = () => {
    clearTimeout(projectHoverTimer.current)
    projectHoverTimer.current = setTimeout(() => {
      closeSubmenus()
      setShowProjects(true)
    }, 150)
  }
  const handleProjectLeave = () => {
    clearTimeout(projectHoverTimer.current)
    projectHoverTimer.current = setTimeout(() => {
      setShowProjects(false)
    }, 200)
  }

  const handlePriorityEnter = () => {
    clearTimeout(priorityHoverTimer.current)
    priorityHoverTimer.current = setTimeout(() => {
      closeSubmenus()
      setShowPriority(true)
    }, 150)
  }
  const handlePriorityLeave = () => {
    clearTimeout(priorityHoverTimer.current)
    priorityHoverTimer.current = setTimeout(() => {
      setShowPriority(false)
    }, 200)
  }

  // Task label for header (truncated)
  const taskLabel = (task?.text || task?.description || 'Task').slice(0, 30)

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.92, y: flippedUp ? 4 : -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: flippedUp ? 4 : -4 }}
      transition={{ duration: 0.12, ease: [0.2, 0.9, 0.3, 1] }}
      style={{
        position: 'fixed',
        left: adjustedPos.x,
        top: adjustedPos.y,
        zIndex: 300,
        minWidth: 210,
        maxWidth: 260,
        background: pal.panelBg,
        backdropFilter: 'blur(20px)',
        border: `1.5px solid ${pal.panelBorder}`,
        borderRadius: 10,
        boxShadow: pal.panelShadow,
        padding: '6px 4px',
        overflow: 'hidden',
      }}
    >
      {/* ---- HEADER (task label) ---- */}
      <div style={{
        padding: '6px 14px 8px',
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 700,
        color: pal.headerText,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        borderBottom: `1px solid ${pal.divider}`,
        marginBottom: 2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: 200,
      }}>
        {taskLabel}
      </div>

      {/* ---- DYNAMIC MENU ITEMS (data-driven from Supabase context_menu_items) ---- */}
      {menuItems.map((item) => {
        const { action_key, label, divider_before } = item
        const divider = divider_before ? <div style={dividerStyle} /> : null

        switch (action_key) {
          case 'toggle_done':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <button
                  style={{ ...menuItemStyle, color: task?.done ? '#8BA4C4' : pal.accentColor }}
                  onClick={handleToggleDone}
                  onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg; closeSubmenus() }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  {task?.done
                    ? <><Square size={15} style={{ flexShrink: 0, opacity: 0.7 }} /> <span>Mark undone</span></>
                    : <><CheckSquare size={15} style={{ flexShrink: 0, opacity: 0.7 }} /> <span>{label}</span></>
                  }
                </button>
              </React.Fragment>
            )

          case 'assign_agent':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={handleAgentEnter}
                  onMouseLeave={handleAgentLeave}
                  ref={agentItemRef}
                >
                  <button
                    style={menuItemStyle}
                    onClick={() => { closeSubmenus(); setShowAgents(s => !s) }}
                    onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <UserCircle2 size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    <ChevronRight size={13} color={pal.headerText} />
                  </button>
                  <AnimatePresence>
                    {showAgents && (
                      <Submenu parentRef={agentItemRef} isNightMode={isNightMode}>
                        {assignableAgents.map(a => (
                          <button
                            key={a.slug}
                            style={{
                              ...menuItemStyle,
                              color: task?.agent === a.slug ? a.color : pal.itemText,
                              fontWeight: task?.agent === a.slug ? 700 : 500,
                            }}
                            onClick={() => handleAssignAgent(a.slug)}
                            onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%',
                              background: `${a.color}25`,
                              border: `1.5px solid ${a.color}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 10, fontWeight: 700, color: a.color,
                              flexShrink: 0,
                            }}>
                              {a.name.charAt(0)}
                            </div>
                            <span style={{ fontSize: 14 }}>{a.name}</span>
                            {task?.agent === a.slug && <Check size={13} color={a.color} style={{ marginLeft: 'auto' }} />}
                          </button>
                        ))}
                      </Submenu>
                    )}
                  </AnimatePresence>
                </div>
              </React.Fragment>
            )

          case 'add_to_right_now':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <button
                  style={{ ...menuItemStyle, opacity: isInRightNow ? 0.4 : 1, cursor: isInRightNow ? 'default' : 'pointer' }}
                  onClick={handleAddToRightNow}
                  onMouseEnter={e => { if (!isInRightNow) e.currentTarget.style.background = pal.hoverBg; closeSubmenus() }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  disabled={isInRightNow}
                >
                  {isInRightNow
                    ? <><Check size={15} style={{ flexShrink: 0, opacity: 0.7, color: '#6B7280' }} /> <span style={{ color: '#6B7280' }}>Already in Right Now</span></>
                    : <><Zap size={15} style={{ flexShrink: 0, opacity: 0.7 }} /> <span>{label}</span></>
                  }
                </button>
              </React.Fragment>
            )

          case 'move_to_project':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={handleProjectEnter}
                  onMouseLeave={handleProjectLeave}
                  ref={projectItemRef}
                >
                  <button
                    style={menuItemStyle}
                    onClick={() => { closeSubmenus(); setShowProjects(s => !s) }}
                    onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <FolderKanban size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    <ChevronRight size={13} color={pal.headerText} />
                  </button>
                  <AnimatePresence>
                    {showProjects && (
                      <Submenu parentRef={projectItemRef} isNightMode={isNightMode}>
                        {projectOptions.map(p => {
                          const isCurrent = task?.projectSection === p.section
                          const remaining = p.tasks ? p.tasks.filter(t => !t.done).length : 0
                          return (
                            <button
                              key={p.section}
                              style={{
                                ...menuItemStyle,
                                color: isCurrent ? pal.accentColor : pal.itemText,
                                fontWeight: isCurrent ? 700 : 500,
                                cursor: isCurrent ? 'default' : 'pointer',
                                opacity: isCurrent ? 0.6 : 1,
                              }}
                              onClick={() => !isCurrent && handleMoveToProject(p.section)}
                              onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = pal.hoverBg }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                              disabled={isCurrent}
                            >
                              <div style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: p.color || '#6B7280', flexShrink: 0,
                              }} />
                              <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: pal.headerText }}>
                                {remaining}
                              </span>
                              {isCurrent && <Check size={13} color={pal.accentColor} style={{ marginLeft: 4 }} />}
                            </button>
                          )
                        })}
                        {projectOptions.length === 0 && (
                          <div style={{ padding: '8px 14px', color: pal.headerText, fontSize: 13, fontStyle: 'italic' }}>
                            No projects available
                          </div>
                        )}
                      </Submenu>
                    )}
                  </AnimatePresence>
                </div>
              </React.Fragment>
            )

          case 'set_priority':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <div
                  style={{ position: 'relative' }}
                  onMouseEnter={handlePriorityEnter}
                  onMouseLeave={handlePriorityLeave}
                  ref={priorityItemRef}
                >
                  <button
                    style={menuItemStyle}
                    onClick={() => { closeSubmenus(); setShowPriority(s => !s) }}
                    onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <Flag size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    <ChevronRight size={13} color={pal.headerText} />
                  </button>
                  <AnimatePresence>
                    {showPriority && (
                      <Submenu parentRef={priorityItemRef} isNightMode={isNightMode}>
                        {priorityOptions.map(opt => (
                          <button
                            key={opt.key}
                            style={{
                              ...menuItemStyle,
                              color: currentPriority === opt.key ? opt.color : pal.itemText,
                              fontWeight: currentPriority === opt.key ? 700 : 500,
                            }}
                            onClick={() => handleSetPriority(opt.key)}
                            onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                          >
                            <opt.icon size={15} color={opt.color} style={{ flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{opt.label}</span>
                            {currentPriority === opt.key && <Check size={13} color={opt.color} style={{ marginLeft: 'auto' }} />}
                          </button>
                        ))}
                      </Submenu>
                    )}
                  </AnimatePresence>
                </div>
              </React.Fragment>
            )

          case 'add_context':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <div>
                  {!showContextInput ? (
                    <button
                      style={menuItemStyle}
                      onClick={() => { closeSubmenus(); setShowContextInput(true); setContextText(existingNote) }}
                      onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg; closeSubmenus() }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      <MessageSquare size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
                      <span>{existingNote ? 'Edit Note' : label}</span>
                      {existingNote && <StickyNote size={12} color={pal.headerText} style={{ marginLeft: 'auto' }} />}
                    </button>
                  ) : (
                    <motion.div
                      initial={{ height: 37, opacity: 0.8 }}
                      animate={{ height: 70, opacity: 1 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      style={{ padding: '4px 10px', overflow: 'hidden' }}
                    >
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.08, duration: 0.08 }}
                      >
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginBottom: 6, color: pal.headerText,
                          fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                        }}>
                          <MessageSquare size={12} /> NOTE
                        </div>
                        <input
                          ref={contextInputRef}
                          type="text"
                          value={contextText}
                          onChange={e => setContextText(e.target.value)}
                          placeholder="Add a note..."
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddContext()
                            if (e.key === 'Escape') { setShowContextInput(false); setContextText('') }
                            e.stopPropagation()
                          }}
                          style={{
                            width: '100%', minHeight: 32,
                            background: pal.inputBg,
                            border: `1px solid ${pal.inputBorder}`,
                            borderRadius: 6, padding: '6px 10px',
                            color: pal.inputText,
                            fontSize: 13,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            outline: 'none',
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              </React.Fragment>
            )

          case 'delete':
            return (
              <React.Fragment key={action_key}>
                {divider}
                <button
                  style={{ ...menuItemStyle, color: pal.dangerColor }}
                  onClick={handleDelete}
                  onMouseEnter={e => { e.currentTarget.style.background = `${pal.dangerColor}14`; closeSubmenus() }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <Trash2 size={15} color={pal.dangerColor} style={{ flexShrink: 0 }} />
                  <motion.span
                    key={deleteConfirm ? 'confirm' : 'delete'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {deleteConfirm ? 'Confirm delete?' : label}
                  </motion.span>
                </button>
              </React.Fragment>
            )

          default:
            return null
        }
      })}

      {/* View Detail -- rendered only when showViewDetail=true (BoardView Trello cards) */}
      {showViewDetail && (
        <>
          <div style={{ height: 1, background: pal.divider, margin: '4px 0' }} />
          <button
            style={{ ...menuItemStyle }}
            onClick={() => { onAction('viewDetail', task); onClose() }}
            onMouseEnter={e => { e.currentTarget.style.background = pal.hoverBg }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          >
            <Eye size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
            <span>View Detail</span>
          </button>
        </>
      )}
    </motion.div>
  )
}

// ---- Priority bar indicator for task cards ----
export function TaskPriorityBar({ taskText, priority: priorityProp }) {
  // Priority comes from task prop (Supabase-sourced), not localStorage
  const priority = priorityProp || null

  if (!priority) return null

  const colors = {
    high: { bg: '#EF4444', glow: '0 0 6px rgba(239,68,68,0.3)' },
    med: { bg: '#F59E0B', glow: '0 0 6px rgba(245,158,11,0.2)' },
    low: { bg: '#6B7280', glow: 'none' },
  }

  const c = colors[priority] || colors.low

  return (
    <div style={{
      position: 'absolute',
      left: 0, top: 0, bottom: 0,
      width: 3, borderRadius: '3px 0 0 3px',
      background: c.bg,
      boxShadow: c.glow,
    }} />
  )
}

// ---- Context note indicator for task cards ----
export function TaskNoteIndicator({ taskText, note: noteProp, style }) {
  // Note comes from task prop (Supabase-sourced), not localStorage
  const note = noteProp || ''

  const [showTooltip, setShowTooltip] = useState(false)

  if (!note) return null

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <StickyNote size={12} color="#4A6080" />
      {showTooltip && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0,
          marginBottom: 6,
          maxWidth: 200, padding: '8px 10px',
          background: 'rgba(12, 16, 28, 0.97)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(100,180,255,0.15)',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          color: '#F0ECE6', fontSize: 12,
          fontFamily: "'Inter', system-ui, sans-serif",
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          zIndex: 310,
          pointerEvents: 'none',
        }}>
          {note}
        </div>
      )}
    </div>
  )
}

// ---- IS_LOCAL detection (shared) ----
const IS_LOCAL = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// ---- Fire-and-forget Supabase task action via /api/dashboard/task-action ----
function supabaseTaskAction(action, task, payload) {
  try {
    authFetch('/api/dashboard/task-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        taskText: task.text,
        taskId: task.taskId || task.id || null,
        agent: task.agent || null,
        payload: payload || null,
        clientId: typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom',
        project: task.project || task.projectSection || null,
      }),
    }).catch(err => console.warn(`[Corner] Supabase task-action (${action}) failed:`, err))
  } catch {}
}

// ---- Direct Supabase PATCH for task status changes ----
// Uses the imported supabase client directly when available (more reliable than API hop).
// Falls back gracefully if supabase is null (no env vars).
// Exported so ChecklistMode.jsx can call it directly from the checkbox handler.
export function supabasePatchTaskStatus(task, status) {
  if (!supabase) return
  const taskId = task.taskId || task.id
  const isUuid = taskId && typeof taskId === 'string' && /^[0-9a-f-]{36}$/i.test(taskId)
  const clientId = typeof window !== 'undefined' && window.__cornerClientId ? window.__cornerClientId : 'aom'
  const patchBody = { status }
  if (status === 'completed') patchBody.completed_at = new Date().toISOString()
  if (status === 'active' || status === 'todo') patchBody.completed_at = null

  const q = isUuid
    ? supabase.from('tasks').update(patchBody).eq('id', taskId)
    : supabase.from('tasks').update(patchBody).eq('text', task.text).eq('client_id', clientId)
  q.then(({ error }) => {
    if (error) console.warn(`[Corner] supabasePatchTaskStatus(${status}) failed:`, error.message)
    else console.log(`[Corner] Task "${task.text}" → status:${status}`)
  })
}

// ---- Context menu action handler (shared logic, call from parent) ----
// All state changes go to Supabase via fire-and-forget. No localStorage.
// R14e-4: currentUserSlug (5th arg, optional, null default) resolves the
// viewing user's slug inside the current tenant. Used by the `addToRightNow`
// path to mark viewer-authored tasks as blocked for agent pickup. Callers
// without viewer context pass null.
export function handleTaskContextAction(action, task, payload, setCheckedTasks, currentUserSlug = null) {
  if (action === 'toggle') {
    if (setCheckedTasks) {
      const key = task.text
      setCheckedTasks(prev => {
        const next = { ...prev }
        if (next[key] !== undefined) {
          delete next[key]
        } else {
          next[key] = !task.done
        }
        return next
      })
    }
    supabaseTaskAction('toggle', task, !task.done)
  } else if (action === 'markDone') {
    // Mark task as fully completed (status='completed'). Direct Supabase PATCH + API fallback.
    supabasePatchTaskStatus(task, 'completed')
    supabaseTaskAction('markDone', task)
    try {
      // r7:open-agent-surface — v2-task-update is world-gated now; send the
      // session (and the Content-Type this call was missing).
      authFetch('/api/dashboard/v2-task-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, status: 'done' }),
      }).catch(() => {})
    } catch {}
    // Log task_completed to events table (RNB source of truth)
    if (supabase) {
      supabase.from('events').insert({
        agent: task.agent || 'system',
        event_type: 'task_completed',
        payload: { task_id: task.id || task.taskId || `manual-${Date.now()}`, description: task.text || 'Task completed' },
      }).then(({ error }) => { if (error) console.warn('[markDone] events insert failed:', error.message) })
    }
    console.log(`[Corner] Task "${task.text}" marked done → completed`)
  } else if (action === 'priority') {
    supabaseTaskAction('priority', task, payload)
  } else if (action === 'reassign') {
    console.log(`[Corner] Task "${task.text}" reassigned to ${payload}`)
    supabaseTaskAction('reassign', task, payload)
  } else if (action === 'delete') {
    supabaseTaskAction('delete', task)
  } else if (action === 'addToRightNow') {
    // Direct Supabase PATCH to status='active'. API fallback handles text-only tasks.
    supabasePatchTaskStatus(task, 'active')
    // Local: also route to agent via task-assign endpoint (auto-assigns and notifies)
    if (IS_LOCAL) {
      try {
        fetch('/api/local/task-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: task.text,
            agent: task.agent || undefined,
            project: task.projectSection || undefined,
            blocked: Boolean(currentUserSlug) && task.agent === currentUserSlug,
          }),
        }).catch(() => {})
      } catch {}
    }
    // API fallback: handles tasks not yet in Supabase (text-only, creates them)
    supabaseTaskAction('addToRightNow', task)
    try {
      // r7:open-agent-surface — world-gated; send the session.
      authFetch('/api/dashboard/v2-task-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, status: 'building' }),
      }).catch(() => {})
    } catch {}
    // Log task_started to events table (RNB source of truth)
    if (supabase) {
      supabase.from('events').insert({
        agent: task.agent || 'system',
        event_type: 'task_started',
        payload: { task_id: task.id || task.taskId || `manual-${Date.now()}`, description: task.text || 'Task promoted to Right Now' },
      }).then(({ error }) => { if (error) console.warn('[addToRightNow] events insert failed:', error.message) })
    }
    console.log(`[Corner] Task "${task.text}" → Right Now (status:active)`)
  } else if (action === 'moveToProject') {
    console.log(`[Corner] Task "${task.text}" moved to project: ${payload}`)
    supabaseTaskAction('moveToProject', task, payload)
  } else if (action === 'addContext') {
    console.log(`[Corner] Context note added to "${task.text}": ${payload}`)
    supabaseTaskAction('addContext', task, payload)
  } else if (action === 'editText') {
    console.log(`[Corner] Task text edited: "${task.text}" → "${payload}"`)
    supabaseTaskAction('editText', task, payload)
  }
}
