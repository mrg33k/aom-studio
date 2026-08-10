import React, { useState, useRef } from 'react'
import {
  CreditCard, Key, Users, Palette, User, Eye, EyeOff,
  CheckCircle2, XCircle, Loader2, Upload, Trash2, Plus,
  LogOut, AlertTriangle, ChevronDown, Settings as SettingsIcon,
  ArrowLeft, Shield, Zap, Building2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'
import { authFetch } from '../dashboard/lib/authFetch.js'

// ---- THEME ----------------------------------------------------------------
const T = {
  bg: '#0A0F1E',
  surface: '#0D1225',
  card: '#111827',
  border: 'rgba(255,255,255,0.08)',
  borderBlue: 'rgba(59,130,246,0.3)',
  text: '#F1F5F9',
  muted: '#6B8AB0',
  accent: '#3B82F6',
  accentGlow: 'rgba(59,130,246,0.2)',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
}

// ---- HELPERS ---------------------------------------------------------------
function Card({ children, title, subtitle, icon: Icon }) {
  return (
    <div style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: '24px 28px',
      marginBottom: 20,
    }}>
      {(title || Icon) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 4 : 20 }}>
          {Icon && (
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `rgba(59,130,246,0.15)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={16} color={T.accent} />
            </div>
          )}
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>
            {title}
          </h2>
        </div>
      )}
      {subtitle && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted, margin: '0 0 20px 0' }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  )
}

function Label({ children }) {
  return (
    <label style={{
      display: 'block',
      fontFamily: "'Inter', sans-serif",
      fontSize: 12,
      fontWeight: 600,
      color: T.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 6,
    }}>
      {children}
    </label>
  )
}

function Input({ value, onChange, type = 'text', placeholder, style: extraStyle }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        padding: '10px 14px',
        color: T.text,
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        outline: 'none',
        boxSizing: 'border-box',
        ...extraStyle,
      }}
      onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}` }}
      onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none' }}
    />
  )
}

function Btn({ children, onClick, variant = 'primary', style: extraStyle, disabled }) {
  const base = {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    ...extraStyle,
  }
  const variants = {
    primary: { background: T.accent, color: '#fff' },
    ghost: { background: 'transparent', color: T.muted, border: `1px solid ${T.border}` },
    danger: { background: 'rgba(239,68,68,0.15)', color: T.error, border: `1px solid rgba(239,68,68,0.3)` },
    success: { background: 'rgba(34,197,94,0.15)', color: T.success, border: `1px solid rgba(34,197,94,0.3)` },
  }
  return (
    <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  )
}

function StatusDot({ status }) {
  if (status === 'ok') return <CheckCircle2 size={14} color={T.success} />
  if (status === 'error') return <XCircle size={14} color={T.error} />
  if (status === 'testing') return <Loader2 size={14} color={T.accent} style={{ animation: 'spin 1s linear infinite' }} />
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.border }} />
}

function SectionNav({ active, onClick }) {
  const sections = [
    { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
    { id: 'api', label: 'API Keys', icon: Key },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'account', label: 'Account', icon: User },
  ]
  return (
    <nav style={{
      background: T.card,
      border: `1px solid ${T.border}`,
      borderRadius: 12,
      padding: '8px',
      marginBottom: 24,
      display: 'flex',
      gap: 4,
      overflowX: 'auto',
    }}>
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onClick(id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            background: active === id ? `rgba(59,130,246,0.15)` : 'transparent',
            color: active === id ? T.accent : T.muted,
          }}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </nav>
  )
}

// ---- SECTION: PLAN & BILLING -----------------------------------------------
const PLANS = [
  { id: 'friends', name: 'Friends & Family', price: '$0', tokens: 50_000, color: '#6B8AB0' },
  { id: 'starter', name: 'Starter', price: '$1,500/mo', tokens: 500_000, color: '#3B82F6' },
  { id: 'pro', name: 'Pro', price: '$2,500/mo', tokens: 2_000_000, color: '#8B5CF6' },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', tokens: 10_000_000, color: '#F59E0B' },
]

function BillingSection() {
  const [currentPlan] = useState('starter')
  const tokensUsed = 312_450
  const plan = PLANS.find(p => p.id === currentPlan)
  const pct = Math.min(100, (tokensUsed / plan.tokens) * 100)

  return (
    <Card title="Plan & Billing" icon={CreditCard} subtitle="Your current plan and usage this billing cycle.">
      {/* Current Plan Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: T.surface,
        borderRadius: 10,
        border: `1px solid ${T.borderBlue}`,
        marginBottom: 20,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Zap size={14} color={plan.color} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: T.text }}>
              {plan.name}
            </span>
            <span style={{
              background: `rgba(59,130,246,0.2)`, color: T.accent,
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Current
            </span>
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted }}>
            Next billing date: April 1, 2026
          </div>
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: T.text }}>
          {plan.price}
        </div>
      </div>

      {/* Usage Meter */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Label>Token Usage This Month</Label>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.muted }}>
            {tokensUsed.toLocaleString()} / {plan.tokens.toLocaleString()}
          </span>
        </div>
        <div style={{ height: 8, background: T.surface, borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct > 80 ? T.error : pct > 60 ? T.warning : T.accent,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.muted, marginTop: 6 }}>
          {(100 - pct).toFixed(1)}% remaining
        </div>
      </div>

      {/* Plan Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10,
      }}>
        {PLANS.map(p => (
          <div key={p.id} style={{
            padding: '14px 16px',
            background: p.id === currentPlan ? `rgba(59,130,246,0.08)` : T.surface,
            border: `1px solid ${p.id === currentPlan ? T.borderBlue : T.border}`,
            borderRadius: 8,
            cursor: p.id === currentPlan ? 'default' : 'pointer',
          }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 2 }}>
              {p.name}
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.text, marginBottom: 8 }}>
              {p.price}
            </div>
            {p.id !== currentPlan && (
              <Btn variant="ghost" style={{ padding: '5px 10px', fontSize: 11 }}>
                {PLANS.indexOf(p) > PLANS.indexOf(plan) ? 'Upgrade' : 'Downgrade'}
              </Btn>
            )}
            {p.id === currentPlan && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.muted }}>Active</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// ---- SECTION: API KEYS -----------------------------------------------
const API_FIELDS = [
  { id: 'claude', label: 'Claude API Key', placeholder: 'sk-ant-...' },
  { id: 'gemini', label: 'Gemini API Key', placeholder: 'AIza...' },
  { id: 'elevenlabs', label: 'ElevenLabs API Key', placeholder: 'el_...' },
  { id: 'supabase_url', label: 'Supabase URL', placeholder: 'https://xxx.supabase.co' },
  { id: 'supabase_key', label: 'Supabase Anon Key', placeholder: 'eyJ...' },
]

function ApiKeysSection() {
  const stored = () => {
    try { return JSON.parse(localStorage.getItem('corner_api_keys') || '{}') } catch { return {} }
  }
  const [keys, setKeys] = useState(stored)
  const [show, setShow] = useState({})
  const [status, setStatus] = useState({})
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('corner_api_keys', JSON.stringify(keys))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async (id) => {
    setStatus(s => ({ ...s, [id]: 'testing' }))
    await new Promise(r => setTimeout(r, 1200))
    // Placeholder: real test logic goes here
    setStatus(s => ({ ...s, [id]: keys[id] ? 'ok' : 'error' }))
  }

  const handleClearAll = () => {
    setKeys({})
    setStatus({})
    localStorage.removeItem('corner_api_keys')
  }

  return (
    <Card title="API Keys & Connections" icon={Key} subtitle="Keys are stored locally. Never sent to any third party.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {API_FIELDS.map(({ id, label, placeholder }) => (
          <div key={id}>
            <Label>{label}</Label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <Input
                  type={show[id] ? 'text' : 'password'}
                  value={keys[id] || ''}
                  onChange={e => setKeys(k => ({ ...k, [id]: e.target.value }))}
                  placeholder={placeholder}
                />
                <button
                  onClick={() => setShow(s => ({ ...s, [id]: !s[id] }))}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: T.muted,
                    padding: 0, display: 'flex',
                  }}
                >
                  {show[id] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Btn
                variant={status[id] === 'ok' ? 'success' : status[id] === 'error' ? 'danger' : 'ghost'}
                onClick={() => handleTest(id)}
                disabled={status[id] === 'testing'}
              >
                <StatusDot status={status[id]} />
                {status[id] === 'testing' ? 'Testing...' : status[id] === 'ok' ? 'Verified' : status[id] === 'error' ? 'Failed' : 'Test'}
              </Btn>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
        <Btn variant="danger" onClick={handleClearAll}>
          <Trash2 size={13} /> Clear All
        </Btn>
        <Btn variant={saved ? 'success' : 'primary'} onClick={handleSave}>
          {saved ? <><CheckCircle2 size={13} /> Saved</> : 'Save Keys'}
        </Btn>
      </div>
    </Card>
  )
}

// ---- SECTION: USERS -----------------------------------------------
const MOCK_USERS = [
  { id: 1, name: 'Patrik Matheson', email: 'patrik@aom-inhouse.com', role: 'Owner', lastActive: '2 min ago', avatar: 'PM' },
  { id: 2, name: 'Ash', email: 'ashtrovfx@gmail.com', role: 'Admin', lastActive: '1h ago', avatar: 'AS' },
  { id: 3, name: 'Mark', email: 'mark@aom-inhouse.com', role: 'Member', lastActive: '3d ago', avatar: 'MK' },
]

const ROLES = ['Owner', 'Admin', 'Member', 'Viewer']

function UsersSection() {
  const [users, setUsers] = useState(MOCK_USERS)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Member')

  const handleRoleChange = (userId, role) => {
    setUsers(u => u.map(user => user.id === userId ? { ...user, role } : user))
  }

  const handleRemove = (userId) => {
    setUsers(u => u.filter(user => user.id !== userId))
  }

  return (
    <Card title="Users" icon={Users} subtitle="Manage who has access to this Corner world.">
      {/* User List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {users.map(user => (
          <div key={user.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '12px 16px',
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
          }}>
            {/* Avatar */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: `rgba(59,130,246,0.2)`,
              border: `1px solid ${T.borderBlue}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700, color: T.accent,
              flexShrink: 0,
            }}>
              {user.avatar}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: T.text }}>
                {user.name}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.muted }}>
                {user.email} &middot; Last active {user.lastActive}
              </div>
            </div>

            {/* Role Selector */}
            <div style={{ position: 'relative' }}>
              <select
                value={user.role}
                onChange={e => handleRoleChange(user.id, e.target.value)}
                disabled={user.role === 'Owner'}
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  padding: '6px 28px 6px 10px',
                  color: user.role === 'Owner' ? T.muted : T.text,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: user.role === 'Owner' ? 'default' : 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  outline: 'none',
                }}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <ChevronDown size={12} color={T.muted} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
              }} />
            </div>

            {/* Remove */}
            {user.role !== 'Owner' && (
              <button
                onClick={() => handleRemove(user.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 4, display: 'flex' }}
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <div style={{
          padding: '16px',
          background: T.surface,
          border: `1px solid ${T.borderBlue}`,
          borderRadius: 10,
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Label>Email Address</Label>
              <Input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </div>
            <div>
              <Label>Role</Label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: T.text,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 14,
                  outline: 'none',
                }}
              >
                {ROLES.filter(r => r !== 'Owner').map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <Btn onClick={() => { setShowInvite(false); setInviteEmail('') }}>Send Invite</Btn>
          </div>
        </div>
      )}

      <Btn variant="ghost" onClick={() => setShowInvite(s => !s)}>
        <Plus size={14} /> Invite User
      </Btn>
    </Card>
  )
}

// ---- SECTION: BRANDING -----------------------------------------------
function BrandingSection() {
  const stored = () => {
    try { return JSON.parse(localStorage.getItem('corner_branding') || '{}') } catch { return {} }
  }
  const [brand, setBrand] = useState({
    companyName: 'AOM',
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    ...stored(),
  })
  const [logoPreview, setLogoPreview] = useState(localStorage.getItem('corner_logo') || null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef()

  const handleLogo = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setLogoPreview(ev.target.result)
      localStorage.setItem('corner_logo', ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    localStorage.setItem('corner_branding', JSON.stringify(brand))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card title="Branding" icon={Palette} subtitle="Customize the look and feel of your Corner world.">
      {/* Company Name */}
      <div style={{ marginBottom: 20 }}>
        <Label>Company Name</Label>
        <Input
          value={brand.companyName}
          onChange={e => setBrand(b => ({ ...b, companyName: e.target.value }))}
          placeholder="Your Company"
        />
      </div>

      {/* Logo Upload */}
      <div style={{ marginBottom: 20 }}>
        <Label>Logo</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 80, height: 80,
            background: T.surface,
            border: `2px dashed ${T.border}`,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0,
          }}>
            {logoPreview
              ? <img src={logoPreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <Building2 size={28} color={T.muted} />
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
            <Btn variant="ghost" onClick={() => fileRef.current?.click()}>
              <Upload size={13} /> Upload Logo
            </Btn>
            {logoPreview && (
              <Btn variant="danger" onClick={() => { setLogoPreview(null); localStorage.removeItem('corner_logo') }}>
                <Trash2 size={13} /> Remove
              </Btn>
            )}
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.muted }}>
              PNG, SVG, or JPG. Max 2MB.
            </span>
          </div>
        </div>
      </div>

      {/* Color Pickers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <Label>Primary Color</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={brand.primaryColor}
              onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
              style={{
                width: 40, height: 40, padding: 2, borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.surface,
                cursor: 'pointer',
              }}
            />
            <Input
              value={brand.primaryColor}
              onChange={e => setBrand(b => ({ ...b, primaryColor: e.target.value }))}
              style={{ maxWidth: 120 }}
            />
          </div>
        </div>
        <div>
          <Label>Secondary Color</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={brand.secondaryColor}
              onChange={e => setBrand(b => ({ ...b, secondaryColor: e.target.value }))}
              style={{
                width: 40, height: 40, padding: 2, borderRadius: 8,
                border: `1px solid ${T.border}`, background: T.surface,
                cursor: 'pointer',
              }}
            />
            <Input
              value={brand.secondaryColor}
              onChange={e => setBrand(b => ({ ...b, secondaryColor: e.target.value }))}
              style={{ maxWidth: 120 }}
            />
          </div>
        </div>
      </div>

      <Btn variant={saved ? 'success' : 'primary'} onClick={handleSave}>
        {saved ? <><CheckCircle2 size={13} /> Saved</> : 'Save Branding'}
      </Btn>
    </Card>
  )
}

// ---- SECTION: ACCOUNT -----------------------------------------------
function AccountSection() {
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({})
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  // Account deletion is a two-step server handshake (see api/account/delete.js):
  // 'begin' returns a short-lived, user-bound confirmation token plus a plain-language
  // summary of what goes and what stays; nothing is deleted until that token comes back
  // alongside the literally typed word DELETE. status: idle | preparing | ready |
  // deleting | done | error.
  const [del, setDel] = useState({ status: 'idle', error: '', confirmation: null, summary: null })

  const handleChangePw = () => {
    if (!pwForm.next || pwForm.next !== pwForm.confirm) return
    setPwSaved(true)
    setPwForm({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 2500)
  }

  const handleSignOut = () => {
    localStorage.removeItem('corner_session')
    window.location.href = '/dashboard'
  }

  // Step 1. Ask the server what deleting this account actually does, and get the
  // confirmation token back. Runs the moment the danger panel opens, so the user is
  // reading the real consequences — not a hardcoded sentence — while they type.
  const beginDelete = async () => {
    setShowDelete(true)
    setDeleteConfirm('')
    setDel({ status: 'preparing', error: '', confirmation: null, summary: null })
    try {
      const res = await authFetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 'begin' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDel({
          status: 'error',
          error: data.error || (res.status === 401
            ? 'Sign in again before deleting your account.'
            : 'We could not start the deletion. Please try again.'),
          confirmation: null,
          summary: null,
        })
        return
      }
      setDel({ status: 'ready', error: '', confirmation: data.confirmation || null, summary: data.summary || null })
    } catch {
      setDel({ status: 'error', error: 'We could not reach the server. Check your connection and try again.', confirmation: null, summary: null })
    }
  }

  // Step 2. The irreversible one.
  const confirmDelete = async () => {
    if (deleteConfirm !== 'DELETE' || !del.confirmation) return
    setDel((s) => ({ ...s, status: 'deleting', error: '' }))
    try {
      const res = await authFetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: del.confirmation, confirmText: 'DELETE' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        setDel((s) => ({ ...s, status: 'ready', error: data.error || 'The deletion did not complete. Nothing was removed.' }))
        return
      }
      setDel((s) => ({ ...s, status: 'done', error: '' }))
      // The session is dead server-side; clear it locally too so the app does not sit
      // holding a token for an account that no longer exists.
      try { if (supabase) await supabase.auth.signOut() } catch { /* already gone */ }
      localStorage.removeItem('corner_session')
      window.location.href = '/'
    } catch {
      setDel((s) => ({ ...s, status: 'ready', error: 'We could not reach the server. Nothing was removed.' }))
    }
  }

  return (
    <>
      {/* Change Password */}
      <Card title="Account" icon={User} subtitle="Manage your login credentials.">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {[
            { key: 'current', label: 'Current Password' },
            { key: 'next', label: 'New Password' },
            { key: 'confirm', label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <Label>{label}</Label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showPw[key] ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder="••••••••"
                />
                <button
                  onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: T.muted,
                    padding: 0, display: 'flex',
                  }}
                >
                  {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Btn
            variant={pwSaved ? 'success' : 'primary'}
            onClick={handleChangePw}
            disabled={!pwForm.current || !pwForm.next || pwForm.next !== pwForm.confirm}
          >
            {pwSaved ? <><CheckCircle2 size={13} /> Password Updated</> : 'Update Password'}
          </Btn>
          {pwForm.next && pwForm.confirm && pwForm.next !== pwForm.confirm && (
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: T.error }}>
              Passwords don't match
            </span>
          )}
        </div>
      </Card>

      {/* Sign Out */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>
              Sign Out
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted }}>
              You'll be redirected to the dashboard login.
            </div>
          </div>
          <Btn variant="ghost" onClick={handleSignOut}>
            <LogOut size={14} /> Sign Out
          </Btn>
        </div>
      </Card>

      {/* Delete Account */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'rgba(239,68,68,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <AlertTriangle size={16} color={T.error} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, color: T.error, marginBottom: 4 }}>
              Delete Account
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted, marginBottom: 14 }}>
              This closes your account for good. It cannot be undone.
            </div>
            {!showDelete ? (
              <Btn variant="danger" onClick={beginDelete}>
                <Trash2 size={13} /> Delete Account
              </Btn>
            ) : (
              <div>
                {del.status === 'preparing' && (
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: T.muted, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Checking what this will remove…
                  </div>
                )}

                {/* The consequences come from the server, so the words on screen and the
                    rows the endpoint actually touches can never drift apart. */}
                {del.summary && (
                  <div style={{
                    background: 'rgba(239,68,68,0.06)',
                    border: `1px solid rgba(239,68,68,0.25)`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 14,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                    color: T.text,
                    lineHeight: 1.7,
                  }}>
                    {del.summary.email && (
                      <div style={{ color: T.muted, marginBottom: 6 }}>
                        Account: <span style={{ color: T.text }}>{del.summary.email}</span>
                      </div>
                    )}
                    <div style={{ fontWeight: 700, color: T.error, marginBottom: 2 }}>Deleted for good</div>
                    <ul style={{ margin: '0 0 10px', paddingLeft: 18, color: T.muted }}>
                      {(del.summary.deletes || []).map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Kept, with your name removed</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: T.muted }}>
                      {(del.summary.keeps || []).map((line, i) => <li key={i}>{line}</li>)}
                    </ul>
                  </div>
                )}

                {del.error && (
                  <div style={{
                    fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: T.error,
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                  }}>
                    <XCircle size={13} /> {del.error}
                  </div>
                )}

                <Label>Type DELETE to confirm</Label>
                <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                  <Input
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                    placeholder="DELETE"
                  />
                  <Btn
                    variant="danger"
                    disabled={deleteConfirm !== 'DELETE' || !del.confirmation || del.status === 'deleting' || del.status === 'done'}
                    onClick={confirmDelete}
                  >
                    {del.status === 'deleting'
                      ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Deleting…</>
                      : 'Confirm Delete'}
                  </Btn>
                  <Btn
                    variant="ghost"
                    disabled={del.status === 'deleting'}
                    onClick={() => {
                      setShowDelete(false)
                      setDeleteConfirm('')
                      setDel({ status: 'idle', error: '', confirmation: null, summary: null })
                    }}
                  >
                    Cancel
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  )
}

// ---- MAIN COMPONENT -------------------------------------------------------
export default function Settings() {
  const [activeSection, setActiveSection] = useState('billing')

  const renderSection = () => {
    switch (activeSection) {
      case 'billing': return <BillingSection />
      case 'api': return <ApiKeysSection />
      case 'users': return <UsersSection />
      case 'branding': return <BrandingSection />
      case 'account': return <AccountSection />
      default: return null
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Spin keyframe injected once */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #111827; color: #F1F5F9; }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${T.border}`,
        background: T.card,
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <Link
            to="/dashboard"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: T.muted, textDecoration: 'none',
              fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = T.text}
            onMouseLeave={e => e.currentTarget.style.color = T.muted}
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>

          <div style={{ width: 1, height: 20, background: T.border }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SettingsIcon size={16} color={T.accent} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: T.text }}>
              Settings
            </span>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={12} color={T.muted} />
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: T.muted }}>
              Admin View
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <SectionNav active={activeSection} onClick={setActiveSection} />
        {renderSection()}
      </div>
    </div>
  )
}
