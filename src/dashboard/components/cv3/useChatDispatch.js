// useChatDispatch — agent-routed right-click backbone.
//
// Drops a templated user-role message into the *active chat addressed to the
// active EA* so the right-click menu's agent-routed items behave as if the
// user typed and sent the prompt themselves. The EA's normal message-handling
// flow picks the message up and works on it /007 style in the room.
//
// Returns a dispatch(text, opts?) function. opts can override the target
// agent / project / client_id for surfaces that know their target explicitly
// (e.g. clicking a mail thread inside the Mail Room when the active chat is
// elsewhere).
//
// Mission: corner/missions/right-click-menu/

import { useCallback } from 'react'
import { useCornerAuth, useCornerNav } from '../../CornerContext.jsx'
import { authFetch } from '../../lib/authFetch.js'

export default function useChatDispatch() {
  const { worldId, currentUser } = useCornerAuth()
  const { selectedAgent, conversationTarget } = useCornerNav()

  return useCallback(async (text, opts = {}) => {
    if (!text) return { ok: false, reason: 'no text' }

    // Resolve target agent.
    let agent = opts.agent
    let project = opts.project ?? null
    if (!agent) {
      if (conversationTarget?.type === 'project') {
        // Project chat — drop to the project's EA. By convention messages
        // posted with `project=<slug>` are picked up by that project's
        // active EA via the shared:<slug> client_id channel.
        agent = conversationTarget.eaSlug || conversationTarget.slug
        project = conversationTarget.slug
      } else if (selectedAgent?.slug) {
        agent = selectedAgent.slug
      } else {
        agent = 'elon' // home / no active chat fallback
      }
    }

    const clientId =
      opts.client_id ||
      (project ? `shared:${project}` : (worldId || 'aom'))

    try {
      const r = await authFetch('/api/dashboard/supabase-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent,
          text,
          role: 'user',
          source: 'right-click-menu',
          client_id: clientId,
          project,
          user_id: currentUser?.id || null,
          user_name:
            currentUser?.user_metadata?.full_name ||
            currentUser?.email ||
            null,
        }),
      })
      const ok = r?.ok !== false
      return { ok, agent, project, clientId }
    } catch (err) {
      console.error('[useChatDispatch] post failed', err)
      return { ok: false, reason: err?.message || 'fetch failed' }
    }
  }, [selectedAgent, conversationTarget, worldId, currentUser])
}
