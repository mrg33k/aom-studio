import { useState } from 'react'
import { RESETTABLE_AGENTS } from './threadConstants.js'

// Hard-reset an agent's tmux session via the Control tab.
// Routes through /api/dashboard/reset-agent -> supabase -> relay-keepalive.
export default function useThreadResetAgent(selectedAgent) {
  const [resetState, setResetState] = useState({ phase: 'idle', message: '' })

  async function handleResetAgent() {
    const slug = selectedAgent?.slug
    if (!RESETTABLE_AGENTS.has(slug)) return
    if (resetState.phase === 'confirming') {
      try {
        setResetState({ phase: 'resetting', message: 'Killing tmux session...' })
        const resp = await fetch(`/api/dashboard/reset-agent?agent=${encodeURIComponent(slug)}`, { method: 'POST' })
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
