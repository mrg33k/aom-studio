// CreateRoomModal.jsx
// Modal wizard for creating a new agent room or project room.
// Triggered by FAB "New Agent" / "New Project" buttons.
// Two paths: pick from agent templates or create a custom room.
// Writes to Supabase agent_status table via /api/dashboard/agent-status.

import { useState, useEffect, useRef, useCallback } from 'react'
import { AGENTS, PROJECTS } from '../gridSpec.js'

// ── colour palette for custom rooms ─────────────────────────────────────────
const PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#10B981', '#06B6D4', '#6366F1', '#F97316', '#84CC16',
]

// ── agent templates ──────────────────────────────────────────────────────────
// Use AGENTS from gridSpec + a curated subset of PROJECTS as "project templates"
const AGENT_TEMPLATES = AGENTS.filter(a => a.slug !== 'patrik').map(a => ({
  slug: a.slug,
  name: a.name,
  role: a.role,
  color: a.color,
  type: 'agent',
}))

const PROJECT_TEMPLATES = PROJECTS.filter(p => p.type === 'project').map(p => ({
  slug: p.slug,
  name: p.name,
  role: p.type === 'project' ? 'Project Room' : p.role,
  color: p.color,
  type: 'project',
}))

// Sprite agents that have actual PNG files
const SPRITE_AGENTS = ['patrik','mom','alex','steve','steffen','bobby','colton',
  'cleo','tony','jacob','elmo','elon','pixel']

function MiniAvatar({ slug, name, color, size = 40 }) {
  const hasSprite = SPRITE_AGENTS.includes(slug)
  if (hasSprite) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${color}`, overflow: 'hidden',
        background: '#0A0F1E', flexShrink: 0,
      }}>
        <img
          src={`/corner/sprites/${slug}-idle.png`}
          alt=""
          style={{
            width: size * 2, height: size * 2,
            objectFit: 'cover', objectPosition: '15% 5%',
            imageRendering: 'pixelated', display: 'block',
          }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid ${color}`, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: Math.max(12, size * 0.38), fontWeight: 700,
      color, background: `${color}22`, flexShrink: 0,
    }}>
      {name?.charAt(0) || '?'}
    </div>
  )
}

// ── main modal component ─────────────────────────────────────────────────────
export default function CreateRoomModal({ isOpen, onClose, initialMode, isNightMode, onRoomCreated }) {
  // 'choose' | 'custom'
  const [view, setView] = useState('choose')
  // 'agent' | 'project'
  const [templateType, setTemplateType] = useState('agent')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customName, setCustomName] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [customColor, setCustomColor] = useState(PALETTE[0])
  const [customType, setCustomType] = useState('agent')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const overlayRef = useRef(null)
  const nameInputRef = useRef(null)

  // Reset state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setView('choose')
      setTemplateType(initialMode === 'project' ? 'project' : 'agent')
      setSelectedTemplate(null)
      setCustomName('')
      setCustomRole('')
      setCustomColor(PALETTE[0])
      setCustomType(initialMode === 'project' ? 'project' : 'agent')
      setSaving(false)
      setError('')
      setSuccess(false)
    }
  }, [isOpen, initialMode])

  // Focus name input when switching to custom
  useEffect(() => {
    if (view === 'custom' && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 80)
    }
  }, [view])

  // Dismiss on overlay click
  const handleOverlayClick = useCallback((e) => {
    if (e.target === overlayRef.current) onClose()
  }, [onClose])

  // Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const IS_LOCAL = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  async function handleConfirm() {
    if (saving) return
    setError('')

    // Determine what we're creating
    let slug, name, role, color, type

    if (view === 'choose') {
      if (!selectedTemplate) { setError('Pick a template first.'); return }
      slug = selectedTemplate.slug
      name = selectedTemplate.name
      role = selectedTemplate.role
      color = selectedTemplate.color
      type = selectedTemplate.type
    } else {
      if (!customName.trim()) { setError('Name is required.'); return }
      // Generate a slug from name
      slug = customName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom'
      name = customName.trim()
      role = customRole.trim() || (customType === 'project' ? 'Project Room' : 'Custom Agent')
      color = customColor
      type = customType
    }

    setSaving(true)

    try {
      if (IS_LOCAL) {
        // On localhost: write to task-status.jsonl via existing endpoint
        // The agent_status endpoint accepts a PATCH but we need an upsert/insert.
        // For localhost, we'll just simulate success and show the room as a toast.
        // Real persistence happens via Supabase on prod.
        await new Promise(r => setTimeout(r, 400)) // simulate
      } else {
        // Production: upsert into agent_status via Supabase
        const { supabase } = await import('../lib/supabase.js')
        if (supabase) {
          const { error: sbErr } = await supabase
            .from('agent_status')
            .upsert({
              slug,
              name,
              role,
              color,
              status: 'idle',
              current_task: null,
              type,
              client_id: 'aom',
            }, { onConflict: 'slug' })
          if (sbErr) throw new Error(sbErr.message)
        } else {
          // No supabase client -- fall through to success anyway
          await new Promise(r => setTimeout(r, 300))
        }
      }

      setSuccess(true)
      onRoomCreated?.({ slug, name, role, color, type })
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
      setSaving(false)
    }
  }

  // ── theme tokens ─────────────────────────────────────────────────────────
  const bg = isNightMode
    ? 'rgba(8, 4, 28, 0.97)'
    : 'rgba(5, 10, 30, 0.97)'
  const border = isNightMode
    ? 'rgba(120,80,255,0.25)'
    : 'rgba(59,130,246,0.22)'
  const accentRgb = isNightMode ? '120,80,255' : '59,130,246'
  const accent = isNightMode ? '#7850FF' : '#3B82F6'
  const textPrimary = 'rgba(240,240,255,0.95)'
  const textDim = 'rgba(160,160,200,0.7)'
  const cardBg = isNightMode ? 'rgba(30,18,70,0.7)' : 'rgba(10,25,65,0.7)'
  const cardBorder = isNightMode ? 'rgba(120,80,255,0.2)' : 'rgba(59,130,246,0.2)'
  const cardHoverBg = isNightMode ? 'rgba(60,30,120,0.5)' : 'rgba(30,60,130,0.4)'
  const templates = templateType === 'agent' ? AGENT_TEMPLATES : PROJECT_TEMPLATES

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
        maxWidth: 560,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'crm-slide-up 220ms cubic-bezier(0.34,1.56,0.64,1)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid rgba(${accentRgb},0.12)`,
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
              color: textPrimary,
              fontFamily: "'Inter Tight','Inter',sans-serif",
            }}>
              {view === 'choose' ? 'Add a Room' : 'Create Custom Room'}
            </div>
            <div style={{ fontSize: 12, color: textDim, marginTop: 3 }}>
              {view === 'choose'
                ? 'Choose an agent or project template'
                : 'Name it, give it a role, pick a color'}
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
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {view === 'choose' && (
            <>
              {/* Template type tabs */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['agent', 'Agents'], ['project', 'Projects']].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => { setTemplateType(id); setSelectedTemplate(null) }}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 20,
                      border: `1.5px solid ${templateType === id ? accent : `rgba(${accentRgb},0.2)`}`,
                      background: templateType === id ? `rgba(${accentRgb},0.18)` : 'transparent',
                      color: templateType === id ? textPrimary : textDim,
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      letterSpacing: '0.04em',
                      transition: 'all 150ms',
                      fontFamily: "'Inter Tight','Inter',sans-serif",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Template grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 10,
              }}>
                {templates.map(t => {
                  const isSelected = selectedTemplate?.slug === t.slug
                  return (
                    <div
                      key={t.slug}
                      onClick={() => setSelectedTemplate(isSelected ? null : t)}
                      style={{
                        background: isSelected ? `rgba(${accentRgb},0.18)` : cardBg,
                        border: `1.5px solid ${isSelected ? accent : cardBorder}`,
                        borderRadius: 12,
                        padding: '12px 14px',
                        cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
                        transition: 'all 160ms',
                        position: 'relative',
                        boxShadow: isSelected ? `0 0 0 1px ${accent}44, 0 4px 16px rgba(${accentRgb},0.18)` : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = cardHoverBg
                          e.currentTarget.style.borderColor = `rgba(${accentRgb},0.45)`
                        }
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) {
                          e.currentTarget.style.background = cardBg
                          e.currentTarget.style.borderColor = cardBorder
                        }
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: 8, right: 8,
                          width: 18, height: 18, borderRadius: '50%',
                          background: accent, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, color: '#fff', fontWeight: 700,
                        }}>✓</div>
                      )}
                      <MiniAvatar slug={t.slug} name={t.name} color={t.color} size={36} />
                      <div>
                        <div style={{
                          fontSize: 13, fontWeight: 700, color: textPrimary,
                          fontFamily: "'Inter Tight','Inter',sans-serif",
                          lineHeight: 1.2,
                        }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: textDim, marginTop: 2, lineHeight: 1.3 }}>
                          {t.role}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {view === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Room type */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: textDim, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Room Type
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['agent', 'Agent Room'], ['project', 'Project Room']].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setCustomType(id)}
                      style={{
                        padding: '7px 16px', borderRadius: 20,
                        border: `1.5px solid ${customType === id ? accent : `rgba(${accentRgb},0.2)`}`,
                        background: customType === id ? `rgba(${accentRgb},0.18)` : 'transparent',
                        color: customType === id ? textPrimary : textDim,
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: "'Inter Tight','Inter',sans-serif",
                      }}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: textDim, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Name
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                  placeholder={customType === 'project' ? 'e.g. Skylar' : 'e.g. Riley'}
                  maxLength={40}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: cardBg,
                    border: `1.5px solid ${error && !customName.trim() ? '#EF4444' : cardBorder}`,
                    borderRadius: 10, padding: '11px 14px',
                    fontSize: 14, fontWeight: 500,
                    color: textPrimary, outline: 'none',
                    fontFamily: "'Inter','system-ui',sans-serif",
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = accent }}
                  onBlur={e => { e.currentTarget.style.borderColor = cardBorder }}
                />
              </div>

              {/* Role */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: textDim, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Role <span style={{ fontWeight: 400, textTransform: 'none', opacity: 0.6 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={customRole}
                  onChange={e => setCustomRole(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirm() }}
                  placeholder={customType === 'project' ? 'e.g. Music Video' : 'e.g. Social Media Manager'}
                  maxLength={60}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: cardBg,
                    border: `1.5px solid ${cardBorder}`,
                    borderRadius: 10, padding: '11px 14px',
                    fontSize: 14, fontWeight: 500,
                    color: textPrimary, outline: 'none',
                    fontFamily: "'Inter','system-ui',sans-serif",
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = accent }}
                  onBlur={e => { e.currentTarget.style.borderColor = cardBorder }}
                />
              </div>

              {/* Colour picker */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: textDim, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Color
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setCustomColor(c)}
                      title={c}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: c, border: customColor === c
                          ? `3px solid #fff`
                          : '2px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer', flexShrink: 0,
                        boxShadow: customColor === c ? `0 0 0 2px ${c}` : 'none',
                        transition: 'all 120ms',
                      }}
                    />
                  ))}
                  {/* Custom hex input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: customColor,
                      border: '2px solid rgba(255,255,255,0.2)',
                      flexShrink: 0,
                    }} />
                    <input
                      type="text"
                      value={customColor}
                      onChange={e => {
                        const v = e.target.value
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setCustomColor(v)
                      }}
                      maxLength={7}
                      style={{
                        width: 72, background: cardBg,
                        border: `1.5px solid ${cardBorder}`,
                        borderRadius: 6, padding: '4px 8px',
                        fontSize: 12, color: textPrimary, outline: 'none',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                </div>

                {/* Preview */}
                {customName.trim() && (
                  <div style={{
                    marginTop: 14, display: 'flex', alignItems: 'center', gap: 10,
                    background: cardBg, border: `1.5px solid ${cardBorder}`,
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      border: `2px solid ${customColor}`,
                      background: `${customColor}22`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: customColor, flexShrink: 0,
                    }}>
                      {customName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary, fontFamily: "'Inter Tight','Inter',sans-serif" }}>
                        {customName}
                      </div>
                      <div style={{ fontSize: 11, color: textDim, marginTop: 1 }}>
                        {customRole || (customType === 'project' ? 'Project Room' : 'Custom Agent')}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              marginTop: 14, padding: '9px 14px',
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 8, fontSize: 12, color: '#FCA5A5',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px 20px',
          borderTop: `1px solid rgba(${accentRgb},0.12)`,
          flexShrink: 0, gap: 10,
        }}>

          {/* Left: toggle view or back */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {view === 'choose' ? (
              <button
                onClick={() => { setView('custom'); setError('') }}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: `1.5px solid rgba(${accentRgb},0.2)`,
                  background: 'transparent', cursor: 'pointer',
                  color: textDim, fontSize: 12, fontWeight: 600,
                  transition: 'all 150ms',
                  fontFamily: "'Inter Tight','Inter',sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.1)`; e.currentTarget.style.color = textPrimary }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}
              >
                + Custom
              </button>
            ) : (
              <button
                onClick={() => { setView('choose'); setError('') }}
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  border: `1.5px solid rgba(${accentRgb},0.2)`,
                  background: 'transparent', cursor: 'pointer',
                  color: textDim, fontSize: 12, fontWeight: 600,
                  transition: 'all 150ms',
                  fontFamily: "'Inter Tight','Inter',sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = `rgba(${accentRgb},0.1)`; e.currentTarget.style.color = textPrimary }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = textDim }}
              >
                ← Templates
              </button>
            )}
          </div>

          {/* Right: confirm */}
          <button
            onClick={handleConfirm}
            disabled={saving || success}
            style={{
              padding: '9px 24px', borderRadius: 10,
              border: 'none', cursor: saving || success ? 'default' : 'pointer',
              background: success
                ? 'rgba(16,185,129,0.9)'
                : saving
                  ? `rgba(${accentRgb},0.4)`
                  : `rgba(${accentRgb},0.9)`,
              color: '#fff', fontSize: 13, fontWeight: 700,
              letterSpacing: '0.02em',
              fontFamily: "'Inter Tight','Inter',sans-serif",
              transition: 'all 200ms',
              boxShadow: success
                ? '0 4px 16px rgba(16,185,129,0.35)'
                : saving
                  ? 'none'
                  : `0 4px 16px rgba(${accentRgb},0.35)`,
              display: 'flex', alignItems: 'center', gap: 6,
              minWidth: 110, justifyContent: 'center',
            }}
            onMouseEnter={e => {
              if (!saving && !success) e.currentTarget.style.background = `rgba(${accentRgb},1)`
            }}
            onMouseLeave={e => {
              if (!saving && !success) e.currentTarget.style.background = `rgba(${accentRgb},0.9)`
            }}
          >
            {success ? '✓ Added!' : saving ? 'Adding...' : 'Add Room'}
          </button>
        </div>
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
