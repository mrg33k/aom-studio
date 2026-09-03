// DashboardSettingsInvites -- R22a. Owner-facing invite manager. Lives at
// /dashboard/settings/invites. Creates invites with Convex invites:create and
// lists them with invites:list (corner:retire-supabase R3), scoped to the
// viewer's world.
//
// R22b (EA-as-onboarder persona seeded at invite-accept) is a server-side
// change in the accept-invite handler; R22c (welcome state machine skip +
// resume) lives in DashboardWelcome.jsx. This page is R22a's slice.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { convexQuery, convexMutation } from '../dashboard/lib/convex.js'
import { getClientId } from '../dashboard/lib/clientConfig.js'

const C = {
  bg: '#0A0F1C',
  text: '#E5E7EB',
  muted: '#94A3B8',
  dim: '#64748B',
  accent: '#10B981',
  accentBg: 'rgba(16,185,129,0.10)',
  border: 'rgba(255,255,255,0.06)',
  s1: '#0F162A',
  error: '#F87171',
}

function RelativeTime({ ts }) {
  if (!ts) return null
  const d = new Date(ts)
  const diff = (Date.now() - d.getTime()) / 1000
  const abs = Math.abs(diff)
  const future = diff < 0
  let label
  if (abs < 60) label = 'just now'
  else if (abs < 3600) label = `${Math.round(abs / 60)}m`
  else if (abs < 86400) label = `${Math.round(abs / 3600)}h`
  else label = `${Math.round(abs / 86400)}d`
  return (
    <span style={{ fontSize: 11, color: C.dim, fontFamily: "'JetBrains Mono', monospace" }}>
      {future ? `in ${label}` : `${label} ago`}
    </span>
  )
}

export default function DashboardSettingsInvites() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [invites, setInvites] = useState([])
  const [inviteUrl, setInviteUrl] = useState('')
  const [inviteToken, setInviteToken] = useState('')

  const clientId = getClientId() || 'aom'

  const refresh = useCallback(async () => {
    try {
      // invites:list drops the token hash and adds `expired`; rows carry
      // _id, email, role, expiresAt, consumedAt, createdAt (ms since epoch).
      const rows = await convexQuery('invites:list', { worldId: clientId, includeConsumed: true })
      const shaped = (Array.isArray(rows) ? rows : []).slice(0, 50).map((r) => ({
        id: String(r._id),
        email: r.email,
        world_slug: clientId,
        role: r.role,
        expires_at: r.expiresAt ? new Date(r.expiresAt).toISOString() : null,
        accepted_at: r.consumedAt ? new Date(r.consumedAt).toISOString() : null,
        created_at: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      }))
      setInvites(shaped)
    } catch (err) {
      setError(err?.message || 'Failed to load invites')
    }
  }, [clientId])

  useEffect(() => { refresh() }, [refresh])

  const handleCreate = useCallback(async (e) => {
    e?.preventDefault?.()
    if (!email.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    setInviteUrl('')
    setInviteToken('')
    try {
      // invites:create runs with the signed-in person's token; the server
      // records createdBy from it and hands back the one-time link. The
      // plaintext token is shown once here and never stored in the browser
      // beyond this panel.
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : undefined
      const data = await convexMutation('invites:create', {
        worldId: clientId,
        email: email.trim(),
        role: 'member',
        ...(baseUrl ? { baseUrl } : {}),
      })
      setInviteUrl(data?.url || '')
      setInviteToken(data?.token || '')
      setEmail('')
      refresh()
    } catch (err) {
      setError(err?.message || 'Invite create failed')
    } finally {
      setSubmitting(false)
    }
  }, [email, submitting, clientId, refresh])

  return (
    <div
      data-testid="dashboard-settings-invites"
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', sans-serif",
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none', color: C.muted, cursor: 'pointer',
              fontSize: 13, fontFamily: "'Inter', sans-serif",
            }}
          >← Dashboard</button>
        </div>
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          margin: '0 0 6px',
        }}>
          Invites
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 28px' }}>
          Send an email-scoped, single-use invite. Each invite is good for 14
          days and lets the recipient join this world.
        </p>

        <form
          onSubmit={handleCreate}
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 14,
            background: C.s1,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 6,
          }}
        >
          <input
            data-testid="invite-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              padding: '10px 14px',
              fontSize: 14,
              fontFamily: "'Inter', sans-serif",
            }}
            required
          />
          <button
            data-testid="invite-create-btn"
            type="submit"
            disabled={!email.trim() || submitting}
            style={{
              background: C.accent,
              color: '#000',
              border: 'none',
              padding: '10px 16px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: !email.trim() || submitting ? 'default' : 'pointer',
              opacity: !email.trim() || submitting ? 0.55 : 1,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {submitting ? 'Creating…' : 'Create invite'}
          </button>
        </form>

        {error && (
          <div
            data-testid="invite-create-error"
            style={{
              color: C.error,
              fontSize: 13,
              marginBottom: 14,
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        {inviteUrl && (
          <div
            data-testid="invite-url-panel"
            style={{
              marginBottom: 24,
              padding: '14px 16px',
              background: C.accentBg,
              border: '1px solid rgba(16,185,129,0.25)',
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Invite created — copy once
            </div>
            <div
              data-testid="invite-url"
              data-invite-token={inviteToken}
              style={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                color: C.text,
                wordBreak: 'break-all',
              }}
            >
              {inviteUrl}
            </div>
          </div>
        )}

        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: C.muted,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Outstanding invites
        </div>
        <div data-testid="invite-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {invites.length === 0 && (
            <div style={{ color: C.dim, fontSize: 13 }}>No invites yet.</div>
          )}
          {invites.map((row) => (
            <div
              key={row.id}
              data-testid="invite-row"
              data-invite-email={row.email}
              data-invite-accepted={row.accepted_at ? 'true' : 'false'}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px',
                background: C.s1,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
              }}
            >
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{row.email}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: row.accepted_at ? C.accent : C.muted,
                padding: '2px 8px', borderRadius: 6,
                background: row.accepted_at ? C.accentBg : 'rgba(255,255,255,0.04)',
                fontFamily: "'JetBrains Mono', monospace',",
              }}>
                {row.accepted_at ? 'accepted' : 'pending'}
              </span>
              <RelativeTime ts={row.accepted_at || row.created_at} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
