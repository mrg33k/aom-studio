// MissionRoom — R3b of corner:mission-rooms (2026-05-15).
//
// Standalone page mounted at /dashboard/mission/:missionSlug. Renders the
// chat thread for a single mission's persistent agent. Intentionally NOT
// integrated into CornerV4's chat machinery — that surface is too coupled
// to project/agent identity and grafting mission identity into it would
// risk live-prod regressions. R4 is when missions get first-class drawer
// treatment alongside projects; R3b just proves the surface exists.
//
// Data: filters /api/dashboard/supabase-messages by agent='mission-<slug>'.
// The R3a substrate (relay-respond.py prefix exception) ensures these rows
// land in Supabase when the mission-agent posts a reply.
//
// What's intentionally absent here (R3b is intentionally minimal):
// - No input bar (chat send still goes through the inbox, not the dashboard).
// - No live realtime subscription (polling on focus is enough until R4).
// - No mission scaffold render (CONTEXT/VISION rendering belongs to FilesPanel
//   which already exists; we link to it instead of duplicating).

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { authFetch } from './lib/authFetch.js'

const POLL_INTERVAL_MS = 8000

export default function MissionRoom() {
  const { missionSlug } = useParams()
  const fullAgent = missionSlug?.startsWith('mission-')
    ? missionSlug
    : `mission-${missionSlug || ''}`

  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [lastFetchAt, setLastFetchAt] = useState(null)

  const fetchMessages = useCallback(async () => {
    if (!missionSlug) return
    try {
      const res = await authFetch(
        `/api/dashboard/supabase-messages?agent=${encodeURIComponent(fullAgent)}&client=aom&limit=50`,
        { credentials: 'include' }
      )
      if (!res.ok) {
        setError(`API ${res.status}`)
        return
      }
      const json = await res.json()
      const rows = Array.isArray(json) ? json : (json.messages || json.data || [])
      // API returns newest-first via order=timestamp.desc; reverse for chronological display.
      const ordered = [...rows].reverse()
      setMessages(ordered)
      setError(null)
      setLastFetchAt(new Date())
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setLoading(false)
    }
  }, [missionSlug, fullAgent])

  useEffect(() => {
    fetchMessages()
    const id = setInterval(fetchMessages, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchMessages])

  return (
    <div data-cv4 style={{
      minHeight: '100vh',
      background: 'var(--bg, #0f1115)',
      color: 'var(--text, #e8e6df)',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
      padding: '32px 40px',
    }}>
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 20,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            opacity: 0.55,
            marginBottom: 4,
          }}>
            mission room · R3b preview
          </div>
          <h1 style={{
            fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 800,
            fontSize: 38,
            margin: 0,
            letterSpacing: '-0.03em',
          }}>{missionSlug || '(no slug)'}</h1>
          <div style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>
            agent: <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fullAgent}</code>
          </div>
        </div>
        <div style={{ fontSize: 12, opacity: 0.5, textAlign: 'right' }}>
          <Link to="/dashboard" style={{ color: 'var(--accent, #d4a04a)' }}>← back to dashboard</Link>
          <div style={{ marginTop: 6 }}>
            {lastFetchAt ? `synced ${lastFetchAt.toLocaleTimeString()}` : 'syncing…'}
          </div>
        </div>
      </header>

      {loading && messages.length === 0 && (
        <p style={{ opacity: 0.6 }}>Loading mission thread…</p>
      )}

      {error && (
        <p style={{ color: '#f5847a' }}>Error: {error}</p>
      )}

      {!loading && !error && messages.length === 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: 24,
          opacity: 0.7,
        }}>
          <p style={{ margin: 0, fontSize: 14 }}>
            No messages yet. The mission-agent will post here when it replies via{' '}
            <code>relay-respond.py</code> (R3a substrate).
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map(m => (
          <article key={m.id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 6,
            padding: '14px 18px',
          }}>
            <div style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              opacity: 0.55,
              display: 'flex',
              gap: 12,
              marginBottom: 8,
            }}>
              <span>{m.role || 'message'}</span>
              <span>·</span>
              <span>{m.agent || '·'}</span>
              {m.timestamp && (<>
                <span>·</span>
                <span>{new Date(m.timestamp).toLocaleString()}</span>
              </>)}
            </div>
            <div style={{
              fontSize: 15,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}>{m.text}</div>
          </article>
        ))}
      </div>
    </div>
  )
}
