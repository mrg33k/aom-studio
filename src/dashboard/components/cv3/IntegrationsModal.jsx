// IntegrationsModal — per-account integrations browser.
// Opened by the /integrations slash command. Shows Available + Connected
// integrations from the static registry merged with the user's account_integrations rows.
// R1: Connect button stubs out as status='connected' (no real OAuth yet).
import { useEffect, useMemo, useState, useCallback } from 'react'
import integrationsData from '../../../data/integrations.json'
import { C } from '../../lib/cv3Colors.js'
import { supabase } from '../../lib/supabase.js'

const REGISTRY = integrationsData.integrations
const STORAGE_KEY = 'corner.integrations.connected.v1'

function loadLocalConnected() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveLocalConnected(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)) } catch {}
}

async function authedFetch(url, init = {}) {
  const headers = { ...(init.headers || {}) }
  try {
    if (supabase) {
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (token) headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return fetch(url, { ...init, credentials: 'include', headers })
}

function categoryAccent(category) {
  const map = {
    Communication: '#10b981',
    Productivity: '#3b82f6',
    Developer: '#8b5cf6',
    Storage: '#f59e0b',
    Payments: '#22c55e',
    CRM: '#ec4899',
    Marketing: '#ef4444',
    Social: '#06b6d4',
    AI: '#a855f7',
    Analytics: '#14b8a6',
    Automation: '#f97316',
  }
  return map[category] || C.accent2 || '#10b981'
}

function IconBlock({ slug, name, category }) {
  const accent = categoryAccent(category)
  const letter = (name || slug || '?').trim().slice(0, 1).toUpperCase()
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8,
      background: `linear-gradient(135deg, ${accent}33, ${accent}11)`,
      border: `1px solid ${accent}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: accent, fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700, fontSize: 16, flexShrink: 0,
    }}>{letter}</div>
  )
}

export default function IntegrationsModal({ open, onClose }) {
  const [tab, setTab] = useState('available')
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [connectedMap, setConnectedMap] = useState({}) // slug -> {status, connected_at, system?, system_note?}
  const [loading, setLoading] = useState(false)
  const [serverAware, setServerAware] = useState(false)
  // Server-returned integrations (filtered by tenant). When non-null, use this
  // instead of the static REGISTRY so tenant-side hidden integrations don't
  // surface. Patrik 2026-05-25: AOM-internal system integrations should not
  // appear in any other tenant's world; server already strips them, modal
  // just needs to respect that strip.
  const [serverIntegrations, setServerIntegrations] = useState(null)

  // Load on open: try server, fall back to localStorage. Always merge localStorage
  // wins so an offline-set connection still shows up.
  useEffect(() => {
    if (!open) return
    const local = loadLocalConnected()
    setConnectedMap(local)
    setLoading(true)
    authedFetch('/api/integrations/list')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Array.isArray(data.integrations)) {
          const fromServer = {}
          data.integrations.forEach(i => {
            if (i.status === 'connected') {
              fromServer[i.slug] = {
                status: 'connected',
                connected_at: i.connected_at || null,
                system: !!i.system,
                system_note: i.system_note || null,
              }
            }
          })
          // Server is authoritative when reachable, but local additions persist.
          const merged = { ...local, ...fromServer }
          setConnectedMap(merged)
          setServerAware(true)
          // Preserve the server's per-tenant integration list (with
          // AOM-internal entries already stripped for non-AOM tenants).
          setServerIntegrations(data.integrations)
          // Default to Connected tab if any
          if (Object.keys(merged).length > 0) setTab('connected')
        } else if (Object.keys(local).length > 0) {
          setTab('connected')
        }
      })
      .catch(() => {
        if (Object.keys(local).length > 0) setTab('connected')
      })
      .finally(() => setLoading(false))
  }, [open])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Source of truth for the catalog: prefer the server-filtered list when we
  // have it (so AOM-internal system integrations stay hidden for tenants);
  // fall back to the bundled REGISTRY for anonymous / offline sessions.
  const sourceList = serverIntegrations || REGISTRY

  const categories = useMemo(() => {
    const seen = new Set()
    sourceList.forEach(i => seen.add(i.category))
    return ['All', ...Array.from(seen)]
  }, [sourceList])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sourceList.filter(i => {
      const isConnected = !!connectedMap[i.slug]
      if (tab === 'connected' && !isConnected) return false
      if (tab === 'available' && isConnected) return false
      if (activeCategory !== 'All' && i.category !== activeCategory) return false
      if (q && !i.name.toLowerCase().includes(q) && !i.category.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false
      return true
    })
  }, [tab, query, activeCategory, connectedMap, sourceList])

  const connect = useCallback((slug, integration) => {
    // OAuth providers: fetch the start endpoint with Authorization header so the
    // JWT reaches the backend (top-level nav wouldn't carry it), then redirect to
    // the returned Google/Slack/etc. consent URL client-side.
    if (integration?.auth_type === 'oauth') {
      authedFetch(`/api/integrations/oauth/start?slug=${encodeURIComponent(slug)}`)
        .then(r => r.json())
        .then(data => {
          if (data?.authUrl) window.location.href = data.authUrl
        })
        .catch(() => {
          window.location.href = `/api/integrations/oauth/start?slug=${encodeURIComponent(slug)}`
        })
      return
    }
    // API-key integrations still use the stub flip until per-provider key entry
    // forms land (each gets a small drawer for "paste your key").
    const next = { ...connectedMap, [slug]: { status: 'connected', connected_at: new Date().toISOString() } }
    setConnectedMap(next)
    saveLocalConnected(next)
    authedFetch('/api/integrations/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {})
  }, [connectedMap])

  const disconnect = useCallback((slug) => {
    const next = { ...connectedMap }
    delete next[slug]
    setConnectedMap(next)
    saveLocalConnected(next)
    authedFetch('/api/integrations/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    }).catch(() => {})
  }, [connectedMap])

  if (!open) return null

  const connectedCount = Object.keys(connectedMap).length
  const availableCount = Math.max(sourceList.length - connectedCount, 0)

  return (
    <div
      data-testid="integrations-modal"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        backdropFilter: 'blur(4px)',
      }}>
      <div style={{
        width: '100%', maxWidth: 880, maxHeight: '85vh',
        background: C.s1, border: '1px solid ' + C.border2,
        borderRadius: 18, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 22px', borderBottom: '1px solid ' + C.border2,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Integrations</div>
            <div style={{ fontSize: 12, color: C.text2, marginTop: 2 }}>
              Connect your account to {REGISTRY.length} services. Per-account.
              {!serverAware && !loading ? ' (Sync to your account once the server endpoint is live.)' : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close integrations"
            style={{
              background: 'transparent', border: '1px solid ' + C.border2,
              color: C.text, borderRadius: 10, padding: '6px 12px',
              cursor: 'pointer', fontSize: 13,
            }}>Close</button>
        </div>

        {/* Tabs + search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 22px', borderBottom: '1px solid ' + C.border2,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 4, background: C.bg, borderRadius: 12, padding: 4, border: '1px solid ' + C.border2 }}>
            {[['available', `Available · ${availableCount}`], ['connected', `Connected · ${connectedCount}`]].map(([id, label]) => (
              <button key={id}
                type="button"
                onClick={() => setTab(id)}
                style={{
                  padding: '6px 14px', borderRadius: 9,
                  background: tab === id ? 'rgba(16,185,129,0.18)' : 'transparent',
                  color: tab === id ? (C.accent2 || '#34d399') : C.text2,
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                }}>{label}</button>
            ))}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search integrations…"
            style={{
              flex: 1, minWidth: 180,
              background: C.bg, border: '1px solid ' + C.border2,
              borderRadius: 10, padding: '8px 12px',
              color: C.text, fontSize: 13, outline: 'none',
            }}
          />
        </div>

        {/* Category chips */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          padding: '10px 22px', borderBottom: '1px solid ' + C.border2,
        }}>
          {categories.map(cat => {
            const isActive = activeCategory === cat
            return (
              <button key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '4px 10px', borderRadius: 14,
                  background: isActive ? 'rgba(16,185,129,0.18)' : 'transparent',
                  border: '1px solid ' + (isActive ? 'rgba(16,185,129,0.4)' : C.border2),
                  color: isActive ? (C.accent2 || '#34d399') : C.text2,
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}>{cat}</button>
            )
          })}
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px 16px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: C.text2, fontSize: 13 }}>
              {tab === 'connected'
                ? "No integrations connected yet. Browse Available to get started."
                : 'No integrations match your search.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {filtered.map(i => {
                const conn = connectedMap[i.slug]
                const isConnected = !!conn
                const isSystem = i.system || conn?.system
                const isComingSoon = !isConnected && i.oauth_status === 'coming_soon'
                return (
                  <div key={i.slug} data-testid={`integration-${i.slug}`} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: 10, borderRadius: 12,
                    background: C.bg, border: '1px solid ' + (isSystem ? 'rgba(59,130,246,0.3)' : C.border2),
                  }}>
                    <IconBlock slug={i.slug} name={i.name} category={i.category} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted }}>{i.category}</span>
                        {isSystem && (
 <span title={i.system_note || conn?.system_note || 'System integration, wired at the AOM platform level.'} style={{
                            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                            color: '#93c5fd', background: 'rgba(59,130,246,0.18)',
                            border: '1px solid rgba(59,130,246,0.35)',
                            padding: '2px 6px', borderRadius: 6,
                          }}>System</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.text2, marginTop: 2, lineHeight: 1.35 }}>{i.description}</div>
                      <div style={{ marginTop: 8 }}>
                        {isConnected && isSystem ? (
                          <button
                            type="button"
                            disabled
                            title={i.system_note || conn?.system_note || ''}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 8,
                              background: 'rgba(59,130,246,0.12)', color: '#93c5fd',
                              border: '1px solid rgba(59,130,246,0.3)', cursor: 'default',
                              fontWeight: 600,
                            }}>Connected · platform</button>
                        ) : isConnected ? (
                          <button
                            type="button"
                            onClick={() => disconnect(i.slug)}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 8,
                              background: 'rgba(239,68,68,0.12)', color: '#fca5a5',
                              border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                              fontWeight: 600,
                            }}>Disconnect</button>
                        ) : isComingSoon ? (
                          <button
                            type="button"
                            disabled
 title="Real OAuth not wired yet, coming in a follow-up round."
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 8,
                              background: 'rgba(148,163,184,0.10)', color: '#94a3b8',
                              border: '1px solid rgba(148,163,184,0.25)', cursor: 'not-allowed',
                              fontWeight: 600,
                            }}>Coming soon</button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => connect(i.slug, i)}
                            title={i.auth_type === 'oauth' ? `Sign in with ${i.name}` : `Connect ${i.name}`}
                            style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 8,
                              background: 'rgba(16,185,129,0.18)', color: (C.accent2 || '#34d399'),
                              border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer',
                              fontWeight: 600,
                            }}>{i.auth_type === 'oauth' ? 'Sign in' : 'Connect'}</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}