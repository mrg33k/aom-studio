// CreateRoomModal.jsx
// Two-step wizard: pick a role -> name your agent -> room appears on grid.
// Step 1: Role picker (Router / Builder / Designer / Strategist / Content / Outreach / QA / Custom)
// Step 2: Name input (+ custom role field if "Custom" was selected)
// Writes to Supabase agent_status table.

import { useState, useEffect, useRef, useCallback } from 'react'

// ── role definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 'router',
    label: 'Router',
    desc: 'Orchestrates agents & routes tasks',
    color: '#6366F1',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        <path d="m4.93 4.93 2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
      </svg>
    ),
  },
  {
    id: 'builder',
    label: 'Builder',
    desc: 'Writes code & ships features',
    color: '#3B82F6',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
        <line x1="19" y1="12" x2="5" y2="12" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: 'designer',
    label: 'Designer',
    desc: 'Visual identity & brand',
    color: '#EC4899',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
      </svg>
    ),
  },
  {
    id: 'strategist',
    label: 'Strategist',
    desc: 'Planning, biz dev & GTM',
    color: '#F59E0B',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    id: 'content',
    label: 'Content',
    desc: 'Video, copy & social posts',
    color: '#10B981',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    ),
  },
  {
    id: 'outreach',
    label: 'Outreach',
    desc: 'Cold email, leads & sales',
    color: '#F97316',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
  {
    id: 'qa',
    label: 'QA',
    desc: 'Testing, review & quality gates',
    color: '#06B6D4',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Custom',
    desc: 'Define your own role',
    color: '#8B5CF6',
    icon: (
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
]

// ── main modal ────────────────────────────────────────────────────────────────
export default function CreateRoomModal({ isOpen, onClose, isNightMode, onRoomCreated }) {
  // 'role' | 'name'
  const [step, setStep] = useState('role')
  const [selectedRole, setSelectedRole] = useState(null)
  const [agentName, setAgentName] = useState('')
  const [customRoleText, setCustomRoleText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const overlayRef = useRef(null)
  const nameInputRef = useRef(null)

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('role')
      setSelectedRole(null)
      setAgentName('')
      setCustomRoleText('')
      setSaving(false)
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  // Auto-focus name input when transitioning to name step
  useEffect(() => {
    if (step === 'name' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 80)
    }
  }, [step])

  // Dismiss on overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose()
  }, [onClose])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (step === 'name') { setStep('role'); setError('') }
        else onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, step, onClose])

  if (!isOpen) return null

  // ── theme tokens ────────────────────────────────────────────────────────────
  const bg         = isNightMode ? 'rgba(8,4,28,0.97)'      : 'rgba(5,10,30,0.97)'
  const accentRgb  = isNightMode ? '120,80,255'             : '59,130,246'
  const accent     = isNightMode ? '#7850FF'                : '#3B82F6'
  const border     = isNightMode ? 'rgba(120,80,255,0.25)'  : 'rgba(59,130,246,0.22)'
  const textPrimary = 'rgba(240,240,255,0.95)'
  const textDim     = 'rgba(160,160,200,0.7)'
  const cardBg      = isNightMode ? 'rgba(30,18,70,0.7)'   : 'rgba(10,25,65,0.7)'
  const cardBorder  = isNightMode ? 'rgba(120,80,255,0.2)' : 'rgba(59,130,246,0.2)'

  // ── confirm handler ─────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (saving || !selectedRole) return
    setError('')

    const name = agentName.trim()
    if (!name) { setError('Name your agent first.'); return }

    const roleLabel = selectedRole.id === 'custom'
      ? (customRoleText.trim() || 'Custom Agent')
      : selectedRole.label

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'agent'

    setSaving(true)

    try {
      const IS_LOCAL = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

      if (IS_LOCAL) {
        // Simulate on localhost (no Supabase connection)
        await new Promise(r => setTimeout(r, 350))
      } else {
        const { supabase } = await import('../lib/supabase.js')
        if (supabase) {
          // 1. Write agent to agent_status
          const { error: sbErr } = await supabase
            .from('agent_status')
            .upsert({
              slug,
              name,
              role: roleLabel,
              color: selectedRole.color,
              status: 'idle',
              current_task: null,
              type: 'agent',
              client_id: 'aom',
            }, { onConflict: 'slug' })
          if (sbErr) throw new Error(sbErr.message)

          // 2. Write to rooms table so CanvasOffice Realtime shows the hex room
          const { data: maxData } = await supabase
            .from('rooms')
            .select('grid_order')
            .order('grid_order', { ascending: false })
            .limit(1)
          const nextOrder = (maxData?.[0]?.grid_order ?? 16) + 1
          const { error: roomErr } = await supabase
            .from('rooms')
            .upsert({
              id: slug,
              name,
              color: selectedRole.color,
              type: 'agent',
              hidden: false,
              grid_order: nextOrder,
            }, { onConflict: 'id' })
          if (roomErr) console.warn('[CreateRoomModal] rooms upsert:', roomErr.message)
        } else {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      setSuccess(true)
      setTimeout(() => {
        onRoomCreated?.({ slug, name, role: roleLabel, color: selectedRole.color, type: 'agent' })
      }, 900)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setSaving(false)
    }
  }

  // ── role picker step ────────────────────────────────────────────────────────
  const RoleStep = () => (
    <>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: `1px solid rgba(${accentRgb},0.12)`,
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: textPrimary, fontFamily: "'Inter Tight','Inter',sans-serif" }}>
            Add a Room
          </div>
          <div style={{ fontSize: 12, color: textDim, marginTop: 3 }}>
            Pick a role for your new agent
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `1px solid rgba(${accentRgb},0.25)`,
            background: 'transparent', cursor: 'pointer',
            color: textDim, fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 160ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.12)`; e.currentTarget.style.color = textPrimary }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}
        >×</button>
      </div>

      {/* Role grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
        }}>
          {ROLES.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              accentRgb={accentRgb}
              cardBg={cardBg}
              cardBorder={cardBorder}
              textPrimary={textPrimary}
              textDim={textDim}
              onSelect={() => { setSelectedRole(role); setStep('name'); setError('') }}
            />
          ))}
        </div>
      </div>
    </>
  )

  // ── name input step ─────────────────────────────────────────────────────────
  const NameStep = () => (
    <>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 24px 16px',
        borderBottom: `1px solid rgba(${accentRgb},0.12)`,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Back button */}
          <button
            onClick={() => { setStep('role'); setError('') }}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: `1px solid rgba(${accentRgb},0.25)`,
              background: 'transparent', cursor: 'pointer',
              color: textDim, fontSize: 16, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 160ms', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.12)`; e.currentTarget.style.color = textPrimary }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}
          >←</button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Role badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 20,
                background: `${selectedRole.color}22`,
                border: `1.5px solid ${selectedRole.color}55`,
                color: selectedRole.color,
                fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                fontFamily: "'Inter Tight','Inter',sans-serif",
              }}>
                <span style={{ color: selectedRole.color, display: 'flex', alignItems: 'center' }}>
                  {selectedRole.icon}
                </span>
                {selectedRole.label}
              </span>
            </div>
            <div style={{ fontSize: 12, color: textDim, marginTop: 4 }}>
              Name your agent
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `1px solid rgba(${accentRgb},0.25)`,
            background: 'transparent', cursor: 'pointer',
            color: textDim, fontSize: 18, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 160ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.12)`; e.currentTarget.style.color = textPrimary }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}
        >×</button>
      </div>

      {/* Name form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Agent name */}
          <div>
            <label style={{
              fontSize: 11, fontWeight: 600, color: textDim,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'block', marginBottom: 8,
            }}>
              Agent Name
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !saving) handleConfirm() }}
              placeholder="e.g. Riley, Nova, Dash..."
              maxLength={40}
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: cardBg,
                border: `1.5px solid ${error && !agentName.trim() ? '#EF4444' : cardBorder}`,
                borderRadius: 10, padding: '12px 14px',
                fontSize: 15, fontWeight: 500,
                color: textPrimary, outline: 'none',
                fontFamily: "'Inter','system-ui',sans-serif",
                transition: 'border-color 150ms',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = selectedRole.color }}
              onBlur={e => { e.currentTarget.style.borderColor = cardBorder }}
            />
          </div>

          {/* Custom role text -- only for "Custom" role */}
          {selectedRole.id === 'custom' && (
            <div>
              <label style={{
                fontSize: 11, fontWeight: 600, color: textDim,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                display: 'block', marginBottom: 8,
              }}>
                Role <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
              </label>
              <input
                type="text"
                value={customRoleText}
                onChange={e => setCustomRoleText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !saving) handleConfirm() }}
                placeholder="e.g. Social Media Manager, Copywriter..."
                maxLength={60}
                autoComplete="off"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: cardBg,
                  border: `1.5px solid ${cardBorder}`,
                  borderRadius: 10, padding: '12px 14px',
                  fontSize: 15, fontWeight: 500,
                  color: textPrimary, outline: 'none',
                  fontFamily: "'Inter','system-ui',sans-serif",
                  transition: 'border-color 150ms',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = selectedRole.color }}
                onBlur={e => { e.currentTarget.style.borderColor = cardBorder }}
              />
            </div>
          )}

          {/* Preview */}
          {agentName.trim() && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: cardBg,
              border: `1.5px solid ${selectedRole.color}44`,
              borderRadius: 12, padding: '12px 16px',
              animation: 'crm-fade-in 160ms ease',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                border: `2px solid ${selectedRole.color}`,
                background: `${selectedRole.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: selectedRole.color, flexShrink: 0,
                letterSpacing: '0.02em',
              }}>
                {(agentName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()) || agentName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary, fontFamily: "'Inter Tight','Inter',sans-serif" }}>
                  {agentName}
                </div>
                <div style={{ fontSize: 11, color: textDim, marginTop: 2 }}>
                  {selectedRole.id === 'custom'
                    ? (customRoleText.trim() || 'Custom Agent')
                    : selectedRole.label}
                </div>
              </div>
              {/* Room preview chip */}
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, letterSpacing: '0.05em',
                  color: selectedRole.color, opacity: 0.8,
                  fontFamily: "'Inter Tight','Inter',sans-serif",
                }}>
                  HEX ROOM
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '9px 14px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 8, fontSize: 12, color: '#FCA5A5',
            }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '16px 24px 20px',
        borderTop: `1px solid rgba(${accentRgb},0.12)`,
        flexShrink: 0,
      }}>
        <button
          onClick={handleConfirm}
          disabled={saving || success}
          style={{
            padding: '10px 28px', borderRadius: 10,
            border: 'none', cursor: saving || success ? 'default' : 'pointer',
            background: success
              ? 'rgba(16,185,129,0.9)'
              : saving
                ? `${selectedRole.color}66`
                : selectedRole.color,
            color: '#fff', fontSize: 13, fontWeight: 700,
            letterSpacing: '0.02em',
            fontFamily: "'Inter Tight','Inter',sans-serif",
            transition: 'all 200ms',
            boxShadow: success
              ? '0 4px 16px rgba(16,185,129,0.35)'
              : saving ? 'none' : `0 4px 16px ${selectedRole.color}55`,
            display: 'flex', alignItems: 'center', gap: 6,
            minWidth: 130, justifyContent: 'center',
          }}
          onMouseEnter={e => {
            if (!saving && !success) e.currentTarget.style.opacity = '0.88'
          }}
          onMouseLeave={e => {
            if (!saving && !success) e.currentTarget.style.opacity = '1'
          }}
        >
          {success ? '✓ Room Added!' : saving ? 'Creating...' : 'Create Room'}
        </button>
      </div>
    </>
  )

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'crm-fade-in 160ms ease',
      }}
    >
      <div style={{
        background: bg,
        border: `1.5px solid ${border}`,
        borderRadius: 18,
        boxShadow: `0 0 0 1px rgba(${accentRgb},0.1), 0 24px 64px rgba(0,0,0,0.7), 0 0 80px rgba(${accentRgb},0.08)`,
        width: '100%',
        maxWidth: step === 'role' ? 520 : 440,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'crm-slide-up 220ms cubic-bezier(0.34,1.56,0.64,1)',
        transition: 'max-width 220ms ease',
      }}>
        {step === 'role' ? <RoleStep /> : <NameStep />}
      </div>

      <style>{`
        @keyframes crm-fade-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes crm-slide-up {
          from { opacity: 0; transform: translateY(24px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
      `}</style>
    </div>
  )
}

// ── RoleCard sub-component ────────────────────────────────────────────────────
function RoleCard({ role, accentRgb, cardBg, cardBorder, textPrimary, textDim, onSelect }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `${role.color}18` : cardBg,
        border: `1.5px solid ${hovered ? role.color + '88' : cardBorder}`,
        borderRadius: 12,
        padding: '14px 12px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
        transition: 'all 160ms cubic-bezier(0.34,1.56,0.64,1)',
        transform: hovered ? 'scale(1.03)' : 'scale(1)',
        boxShadow: hovered ? `0 4px 20px ${role.color}33` : 'none',
      }}
    >
      {/* Icon */}
      <div style={{
        color: role.color,
        display: 'flex',
        alignItems: 'center',
        filter: hovered ? `drop-shadow(0 0 6px ${role.color}88)` : 'none',
        transition: 'filter 160ms',
      }}>
        {role.icon}
      </div>

      {/* Label + desc */}
      <div>
        <div style={{
          fontSize: 12, fontWeight: 700,
          color: hovered ? role.color : textPrimary,
          fontFamily: "'Inter Tight','Inter',sans-serif",
          lineHeight: 1.2,
          transition: 'color 160ms',
        }}>
          {role.label}
        </div>
        <div style={{
          fontSize: 12, color: textDim, marginTop: 3, lineHeight: 1.35,
        }}>
          {role.desc}
        </div>
      </div>
    </div>
  )
}
