// UserAvatar -- profile avatar with name edit popover
// Extracted from CornerV3.jsx
import { useState, useRef, useEffect } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { supabase } from '../../lib/supabase.js'
import { authFetch } from '../../lib/authFetch.js'

// Generate a unique geometric avatar from a seed string (name/slug).
// Returns base64 JPEG. Deterministic: same seed = same avatar.
function generateAvatar(seed) {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  // Hash seed to numbers
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  const hue1 = Math.abs(hash % 360)
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, 64, 64)
  grad.addColorStop(0, `hsl(${hue1}, 70%, 45%)`)
  grad.addColorStop(1, `hsl(${hue2}, 65%, 35%)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  // Geometric shapes based on hash
  const shapes = Math.abs((hash >> 4) % 4) + 3
  for (let i = 0; i < shapes; i++) {
    const x = Math.abs((hash >> (i * 3)) % 64)
    const y = Math.abs((hash >> (i * 3 + 1)) % 64)
    const r = 8 + Math.abs((hash >> (i * 3 + 2)) % 16)
    const alpha = 0.15 + (i % 3) * 0.1
    ctx.fillStyle = `rgba(255,255,255,${alpha})`
    ctx.beginPath()
    if (i % 3 === 0) {
      ctx.arc(x, y, r, 0, Math.PI * 2)
    } else if (i % 3 === 1) {
      ctx.rect(x - r/2, y - r/2, r, r)
    } else {
      ctx.moveTo(x, y - r)
      ctx.lineTo(x + r, y + r)
      ctx.lineTo(x - r, y + r)
      ctx.closePath()
    }
    ctx.fill()
  }
  // Initial letter
  const initial = seed[0]?.toUpperCase() || '?'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = 'bold 28px Inter, system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initial, 32, 34)
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
}

// Compress image to tiny JPEG for avatar (64x64, low quality = ~2-4KB)
function compressAvatar(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const ctx = canvas.getContext('2d')
        // Center crop to square
        const size = Math.min(img.width, img.height)
        const sx = (img.width - size) / 2
        const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 64, 64)
        // Export as low-quality JPEG (~2-4KB)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        const base64 = dataUrl.split(',')[1]
        resolve(base64)
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// `extraMenuItems`: optional React node rendered at the top of the avatar
// dropdown. CV4 uses this to mount the WorldSelector inside the avatar menu.
// CV3 callers omit it; their menu is unchanged.
export default function UserAvatar({ user, onUserUpdate, extraMenuItems }) {
  const initial = user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const avatarUrl = user?.user_metadata?.avatar_url
  // CV4 renders the popover as a center-screen hero modal. On CV4 we hide
  // the horizontal avatar+name strip and surface a large avatar at the top
  // of the panel. CV3 keeps its original compact dropdown layout.
  // R7.21 cutover: /dashboard now renders CV4 too, so "cv4 mode" is anywhere
  // EXCEPT the /cv3 escape-hatch path.
  const isCv4 = typeof window !== 'undefined' && !window.location.pathname.startsWith('/cv3')

  const [open, setOpen] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const popoverRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (open) {
      setNameInput(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSave = async () => {
    const trimmed = nameInput.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { full_name: trimmed } })
      if (!error && data?.user && onUserUpdate) onUserUpdate(data.user)
      setOpen(false)
    } catch (_) { /* silent */ }
    setSaving(false)
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    setUploading(true)
    try {
      const base64 = await compressAvatar(file)
      const res = await authFetch('/api/dashboard/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, image_base64: base64, mime_type: 'image/jpeg' }),
      })
      const data = await res.json()
      if (data.avatar_url) {
        // Update local user state with new avatar
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (refreshed?.user && onUserUpdate) onUserUpdate(refreshed.user)
      }
    } catch (err) {
      console.error('[Avatar] upload error:', err)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        {avatarUrl
          ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{initial}</span>
        }
      </div>

      {/* CV4: backdrop turns visible and full-screen via [data-shell="cv4"]
          CSS so the popover reads as a center-screen home-base modal. In CV3
          it's a no-op (pointer-events:none + opacity:0). */}
      {open && (
        <div
          data-cv4-profile-backdrop
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            pointerEvents: 'none', opacity: 0,
            background: 'rgba(0,0,0,0)', transition: 'opacity 0.15s',
          }}
        />
      )}
      {open && (
        <div data-cv4-profile-popover style={{
          position: 'absolute',
          top: 36,
          right: 0,
          width: 260,
          background: C.s1,
          border: `1px solid ${C.border2}`,
          borderRadius: 12,
          padding: 16,
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {/* CV4 hero block: large centered avatar + display name + small
              Edit / Change / Generate row. Replaces the cv3 horizontal strip. */}
          {isCv4 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  width: 104, height: 104, borderRadius: 4, flexShrink: 0,
                  background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
                  border: '1px solid rgba(255,255,255,0.10)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}
              >
                {uploading ? (
                  <div style={{ width: 28, height: 28, border: '2.5px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                ) : avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 44, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{initial}</span>
                )}
              </div>
              {/* Name displayed as text by default; "Edit" toggles the input. */}
              {!editingName ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{
                    fontSize: 18, fontWeight: 700, color: C.text,
                    fontFamily: "'Inter', sans-serif", textAlign: 'center',
                  }}>
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You'}
                  </div>
                  <button
                    onClick={() => setEditingName(true)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: 0,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                      textTransform: 'uppercase', color: C.muted,
                    }}
                  >
                    Edit name
                  </button>
                </div>
              ) : (
                <div style={{ width: '100%' }}>
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { handleSave(); setEditingName(false) }
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    style={{
                      width: '100%', padding: '8px 10px',
                      fontSize: 14, fontFamily: "'Inter', sans-serif",
                      color: C.text, background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.10)', borderRadius: 2,
                      outline: 'none', boxSizing: 'border-box', textAlign: 'center',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => { handleSave(); setEditingName(false) }}
                      disabled={saving || !nameInput.trim()}
                      style={{
                        flex: 1, padding: '7px 0',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: C.text, background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2,
                        cursor: saving || !nameInput.trim() ? 'default' : 'pointer',
                      }}
                    >{saving ? 'Saving…' : 'Save'}</button>
                    <button
                      onClick={() => setEditingName(false)}
                      style={{
                        flex: 1, padding: '7px 0',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: C.muted, background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.10)', borderRadius: 2,
                        cursor: 'pointer',
                      }}
                    >Cancel</button>
                  </div>
                </div>
              )}
              {/* Change / Generate avatar row */}
              {!editingName && (
                <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                      textTransform: 'uppercase', color: C.accent,
                    }}
                  >{uploading ? 'Uploading…' : avatarUrl ? 'Change photo' : 'Upload photo'}</button>
                  <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10, lineHeight: '14px' }}>|</span>
                  <button
                    onClick={async () => {
                      if (!user?.id) return
                      setUploading(true)
                      const name = user?.user_metadata?.full_name || user?.email || 'User'
                      const base64 = generateAvatar(name + Date.now())
                      try {
                        const res = await authFetch('/api/dashboard/avatar', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: user.id, image_base64: base64, mime_type: 'image/jpeg' }),
                        })
                        const data = await res.json()
                        if (data.avatar_url) {
                          const { data: refreshed } = await supabase.auth.refreshSession()
                          if (refreshed?.user && onUserUpdate) onUserUpdate(refreshed.user)
                        }
                      } catch {}
                      setUploading(false)
                    }}
                    disabled={uploading}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                      textTransform: 'uppercase', color: C.muted,
                    }}
                  >Generate</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            </div>
          )}
          {extraMenuItems}
          {/* CV3 — original horizontal avatar strip. CV4 swaps to the hero
              block above; the cv3 strip + name-edit input below are hidden
              via the isCv4 short-circuit so CV3 visuals are untouched. */}
          {!isCv4 && (<>
          {/* Avatar upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
              }}
            >
              {uploading ? (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{initial}</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{
                    fontSize: 11, fontWeight: 600, color: C.accent, background: 'none',
                    border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {uploading ? 'Uploading...' : avatarUrl ? 'Change' : 'Upload'}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 11 }}>|</span>
                <button
                  onClick={async () => {
                    if (!user?.id) return
                    setUploading(true)
                    const name = user?.user_metadata?.full_name || user?.email || 'User'
                    const base64 = generateAvatar(name + Date.now())
                    try {
                        const res = await authFetch('/api/dashboard/avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, image_base64: base64, mime_type: 'image/jpeg' }),
                      })
                      const data = await res.json()
                      if (data.avatar_url) {
                        const { data: refreshed } = await supabase.auth.refreshSession()
                        if (refreshed?.user && onUserUpdate) onUserUpdate(refreshed.user)
                      }
                    } catch {}
                    setUploading(false)
                  }}
                  disabled={uploading}
                  style={{
                    fontSize: 11, fontWeight: 600, color: C.text2, background: 'none',
                    border: 'none', padding: 0, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Generate
                </button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          {/* Display name */}
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Display name
          </div>
          <input
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            style={{
              width: '100%',
              padding: '8px 10px',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
              color: C.text,
              background: C.s2,
              border: `1px solid ${C.border2}`,
              borderRadius: 8,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !nameInput.trim()}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '7px 0',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              color: '#fff',
              background: saving || !nameInput.trim() ? C.muted : C.accent,
              border: 'none',
              borderRadius: 8,
              cursor: saving || !nameInput.trim() ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          </>)}
          <div style={{ borderTop: `1px solid ${C.border2}`, marginTop: 12, paddingTop: 10 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontFamily: "'Inter', sans-serif" }}>
              {user?.email}
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = '/login'
              }}
              style={{
                width: '100%',
                padding: '7px 0',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: '#EF4444',
                background: 'transparent',
                border: `1px solid rgba(239,68,68,0.3)`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
