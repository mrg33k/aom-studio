import { useState } from 'react'
import { RESETTABLE_AGENTS } from './threadConstants.js'
import { authFetch } from '../../../lib/authFetch.js'

// Hard-reset an agent's tmux session via the Control tab.
// Routes through /api/dashboard/reset-agent -> supabase -> relay-keepalive.
//
// r7:open-agent-surface (2026-07-27) — /api/dashboard/reset-agent now verifies
// the caller may act in the agent's world before it queues a tmux kill-session.
// This call therefore has to carry the session (authFetch) and say WHICH world
// it means (worldId); a bare fetch() would 401 in production. Passing the
// world through instead of assuming one is what keeps the button working for
// every world's operator rather than only the dashboard's primary one.
export default function useThreadResetAgent(selectedAgent, worldId) {
  const [resetState, setResetState] = useState({ phase: 'idle', message: '' })

  async function handleResetAgent() {
    const slug = selectedAgent?.slug
    if (!RESETTABLE_AGENTS.has(slug)) return
    if (resetState.phase === 'confirming') {
      try {
        setResetState({ phase: 'resetting', message: 'Killing tmux session...' })
        const world = worldId || selectedAgent?.client_id || ''
        const qs = `agent=${encodeURIComponent(slug)}${world ? `&world=${encodeURIComponent(world)}` : ''}`
        const resp = await authFetch(`/api/dashboard/reset-agent?${qs}`, { method: 'POST' })
        const data = await resp.json().catch(() => ({}))
        if (!resp.ok || !data.ok) {
          setResetState({ phase: 'error', message: data.error || `HTTP ${resp.status}` })
          return
        }
        setResetState({ phase: 'success', message: 'Reset queued. Session will recreate in ~3s.' })
      } catch (err) {
        setResetState({ phase: 'error', message: err.message || 'Network error' })
      }
      return
    }
    setResetState({ phase: 'confirming', message: '' })
  }

  return { resetState, handleResetAgent }
}
