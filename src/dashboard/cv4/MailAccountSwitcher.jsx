// R7 mail-account switcher header. Lives above the rail's email list.
//
// Two visual modes:
//   - one connection  -> flat row showing email + Team/Personal tag (no dropdown)
//   - 2+ connections  -> same row, but clickable; click expands a menu with each
//                        connection. Picking one fires onChange(connection).
//
// Also renders the "Share with <workspace>" action when the active connection
// is personal-scoped AND a workspace context is provided. Clicking it POSTs to
// /api/integrations/migrate to flip ownership.
//
// No vitest tests — vitest+@testing-library isn't wired in this repo. Verified
// via Chrome MCP on the live deploy.

import { useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'

function ScopeTag({ scope }) {
  const isTeam = scope === 'team'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
      background: isTeam ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.12)',
      color: isTeam ? '#10b981' : '#818cf8',
      border: `1px solid ${isTeam ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.35)'}`,
      flexShrink: 0,
    }}>{isTeam ? 'Team' : 'Personal'}</span>
  )
}

export default function MailAccountSwitcher({
  connections,
  active,
  onChange,
  workspaceId,
  workspaceName,
  onShared,
}) {
  const [open, setOpen] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareErr, setShareErr] = useState('')

  if (!active) return null
  const multi = (connections?.length || 0) >= 2
  const canShare = !!workspaceId && active.scope === 'personal'

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    setShareErr('')
    try {
      const r = await authFetch('/api/integrations/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connection_id: active.id, workspace_id: workspaceId }),
      })
      if (r.ok) {
        onShared?.()
      } else {
        const body = await r.json().catch(() => ({}))
        setShareErr(body.error || `HTTP ${r.status}`)
      }
    } catch (e) {
      setShareErr(e.message || 'share-failed')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div data-cv4-mail-switcher style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={multi ? 'Switch account' : 'Mail account'}
        disabled={!multi}
        onClick={() => multi && setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 10px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)',
          cursor: multi ? 'pointer' : 'default', color: 'inherit', fontFamily: "'Inter', sans-serif",
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'linear-gradient(135deg,#10b981,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#fff', fontWeight: 700, flexShrink: 0,
          }}>{(active.account_email || '?')[0].toUpperCase()}</span>
          <span style={{
            fontSize: 12, fontWeight: 600, color: C.text,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{active.account_email || '(no email)'}</span>
          <ScopeTag scope={active.scope} />
        </span>
        {multi && <span style={{ color: C.muted, fontSize: 10 }}>{open ? '▴' : '▾'}</span>}
      </button>

      {canShare && (
        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            style={{
              fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.04em',
              background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.35)',
              cursor: sharing ? 'wait' : 'pointer',
            }}
          >{sharing ? 'Sharing…' : `Share with ${workspaceName || workspaceId}`}</button>
          {shareErr && <span style={{ fontSize: 10, color: '#ef4444' }}>{shareErr}</span>}
        </div>
      )}

      {open && (
        <ul role="menu" style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
          background: '#0e1015', border: '1px solid ' + C.border, borderRadius: 8,
          padding: 4, listStyle: 'none',
        }}>
          {connections.map(c => (
            <li key={c.id}>
              <button type="button"
                onClick={() => { onChange?.(c); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  padding: '6px 8px', background: c.id === active.id ? 'rgba(16,185,129,0.08)' : 'transparent',
                  border: 'none', borderRadius: 6, color: 'inherit', cursor: 'pointer',
                }}>
                <span style={{ fontSize: 12, color: C.text2 }}>{c.account_email || '(no email)'}</span>
                <ScopeTag scope={c.scope} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
