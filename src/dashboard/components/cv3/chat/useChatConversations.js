// useChatConversations -- previews feed + derived conversation lists.
// Combines agent/project message previews (initial fetch + realtime INSERT
// subscription) with search/pin/hide filters to produce the sorted lists
// the sidebar renders. Extracted from ChatPanel.jsx (R2b split).
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase.js'

// aom:master-loop (2026-06-14): the master loop wakes Elon each cycle by posting a
// role='user' cycle-brief into his chat (metadata.master_loop=true). That's plumbing,
// not Patrik — keep it out of the sidebar preview so the chat reads as his assistant.
function isHiddenLoopCue(m) {
  return !!(m && m.role === 'user' && m.metadata && m.metadata.master_loop)
}

export default function useChatConversations({
  agents,
  projects,
  inboxItems,
  worldId,
  searchQuery,
  allTasks,
  isFav,
  isHidden,
}) {
  // ── Unread counts per agent ──────────────────────────────────────────────
  const unreadCounts = useMemo(() => {
    const counts = {}
    for (const item of (inboxItems || [])) {
      if (item.agent && item.isUnread) counts[item.agent] = (counts[item.agent] || 0) + 1
    }
    return counts
  }, [inboxItems])

  // ── Agent + project preview state (R61: realtime handler below updates
  // both from the same channel; declaring setProjectPreviews up here keeps
  // the closure TDZ-free for the combined handler below).
  const [agentPreviews, setAgentPreviews] = useState({})
  const [projectPreviews, setProjectPreviews] = useState({})

  // R75-a1: initial agent-preview fetch MERGES with timestamp-gate instead
  // of replacing state wholesale. Before R75-a1 a remount of this hook
  // (e.g. ChatPanel re-mount after tab nav) called setAgentPreviews(previews)
  // as a full replace, which could clobber fresher previews that only the
  // realtime handler knew about — the "home feed reverted to old messages
  // after navigating to tasks and back" bug.
  //
  // Extra: R61 says project-scoped rows (agent='<slug>' + project='<x>')
  // must NOT bump an agent preview. The initial fetch now enforces that
  // too; before R75-a1 it pulled the newest row per agent regardless of
  // project, which could seed the preview with a project-scoped message.
  useEffect(() => {
    if (!supabase || !worldId || !agents?.length) return
    const slugs = agents.filter(a => a.slug).map(a => a.slug)
    if (slugs.length === 0) return

    let cancelled = false
    Promise.all(slugs.map(slug =>
      supabase
        .from('messages')
        .select('agent, text, timestamp, id, role, project, metadata')
        .eq('client_id', worldId)
        .eq('agent', slug)
        .or('project.is.null,project.eq.')
        .order('timestamp', { ascending: false })
        .limit(6)
        // Skip the master loop's hidden cycle-brief cues so the sidebar preview
        // shows Elon's real last message, not the plumbing. (aom:master-loop 2026-06-14)
        .then(({ data }) => (data || []).find(m => !isHiddenLoopCue(m)) || null)
    )).then(results => {
      if (cancelled) return
      setAgentPreviews(prev => {
        const next = { ...prev }
        for (const msg of results) {
          if (!msg?.agent) continue
          const preview = {
            agent: msg.agent,
            text: (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : ''),
            timestamp: msg.timestamp,
            id: msg.id,
            isUnread: msg.role !== 'user',
          }
          const existing = next[msg.agent]
          if (existing && existing.timestamp > preview.timestamp) continue
          next[msg.agent] = preview
        }
        return next
      })
    })
    return () => { cancelled = true }
  }, [agents, worldId])

  // R74: self-healing previews subscription — same pattern as useChatMessages.
  useEffect(() => {
    if (!supabase || !worldId) return
    let active = true
    let channel = null
    let retryTimer = null
    let retryAttempt = 0

    const applyMsg = (msg) => {
      if (!msg?.agent) return
      if (isHiddenLoopCue(msg)) return  // don't let a loop cue become the sidebar preview
      const preview = {
        agent: msg.agent,
        text: (msg.text || '').slice(0, 80) + ((msg.text || '').length > 80 ? '...' : ''),
        timestamp: msg.timestamp,
        id: msg.id,
        isUnread: msg.role !== 'user',
      }
      if (!msg.project) {
        setAgentPreviews(prev => {
          const existing = prev[msg.agent]
          if (existing && existing.timestamp > msg.timestamp) return prev
          return { ...prev, [msg.agent]: preview }
        })
      }
      if (msg.project) {
        setProjectPreviews(prev => {
          const key = `project:${msg.project}`
          const existing = prev[key]
          if (existing && existing.timestamp > msg.timestamp) return prev
          return {
            ...prev,
            [key]: {
              text: (msg.text || '').slice(0, 80),
              timestamp: msg.timestamp,
            },
          }
        })
      } else if (typeof msg.agent === 'string' && msg.agent.startsWith('project:')) {
        setProjectPreviews(prev => {
          const existing = prev[msg.agent]
          if (existing && existing.timestamp > msg.timestamp) return prev
          return {
            ...prev,
            [msg.agent]: {
              text: (msg.text || '').slice(0, 80),
              timestamp: msg.timestamp,
            },
          }
        })
      }
    }

    const refetchPreviews = async () => {
      if (!active) return
      try {
        // Pull the most recent message per agent + project in this tenant.
        const { data } = await supabase
          .from('messages')
          .select('agent,text,timestamp,id,role,project')
          .eq('client_id', worldId)
          .order('timestamp', { ascending: false })
          .limit(400)
        if (!active || !Array.isArray(data)) return
        // Apply newest-first; applyMsg's timestamp-gate handles idempotency.
        for (const msg of data) applyMsg(msg)
      } catch (_) { /* best-effort */ }
    }

    const subscribe = () => {
      if (!active) return
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      channel = supabase
        .channel(`cv3-previews-${worldId}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `client_id=eq.${worldId}` },
          (payload) => applyMsg(payload.new),
        )
        .subscribe((status) => {
          if (!active) return
          if (status === 'SUBSCRIBED') {
            retryAttempt = 0
            refetchPreviews()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn(`[R74] previews channel status=${status}, reconnecting…`)
            const delay = Math.min(30_000, 1_000 * Math.pow(2, retryAttempt))
            retryAttempt += 1
            retryTimer = setTimeout(subscribe, delay)
          }
        })
    }
    subscribe()

    const onFocus = () => { if (active) refetchPreviews() }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onFocus)
    }

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      try { if (channel) supabase.removeChannel(channel) } catch (_) {}
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onFocus)
      }
    }
  }, [worldId])

  // ── Project previews: initial fetch ─────────────────────────────────────
  // R75-a1: merge-with-timestamp-gate instead of full replace, same reason
  // as agent previews. Also broaden the query: R6 project-tagged rows
  // (project=<slug>) are more common than the legacy agent='project:<slug>'
  // shape, so pull whichever is latest per project and apply the preview
  // under the canonical key (`project:<slug>`). That aligns initial state
  // with the realtime handler's applyMsg output.
  useEffect(() => {
    if (!supabase || !worldId || !projects?.length) return
    const projList = projects.filter(p => p.slug)
    if (!projList.length) return
    let cancelled = false
    Promise.all(projList.map(async p => {
      // M10: query both the world-keyed client_id and the canonical
      // shared:<slug> channel so the preview surfaces the latest message
      // regardless of which routing convention the sender used.
      const cid = p.isShared ? `shared:${p.slug}` : worldId
      const sharedCid = `shared:${p.slug}`
      const clientIds = cid === sharedCid ? [sharedCid] : [cid, sharedCid]
      const { data } = await supabase
        .from('messages')
        .select('agent, text, timestamp, project')
        .in('client_id', clientIds)
        .or(`project.eq.${p.slug},agent.eq.project:${p.slug}`)
        .order('timestamp', { ascending: false })
        .limit(1)
      return { slug: p.slug, msg: data?.[0] || null }
    })).then(results => {
      if (cancelled) return
      setProjectPreviews(prev => {
        const next = { ...prev }
        for (const { slug, msg } of results) {
          if (!msg) continue
          const key = `project:${slug}`
          const preview = {
            text: (msg.text || '').slice(0, 80),
            timestamp: msg.timestamp,
          }
          const existing = next[key]
          if (existing && existing.timestamp > preview.timestamp) continue
          next[key] = preview
        }
        return next
      })
    })
    return () => { cancelled = true }
  }, [projects, worldId])

  // ── unreadMap: merges agentPreviews + inboxItems, newest wins ────────────
  const unreadMap = useMemo(() => {
    const m = {}
    for (const [slug, preview] of Object.entries(agentPreviews)) {
      m[slug] = preview
    }
    for (const item of (inboxItems || [])) {
      if (!item.agent) continue
      const existing = m[item.agent]
      if (!existing || (item.timestamp && item.timestamp > existing.timestamp)) {
        m[item.agent] = item
      }
    }
    return m
  }, [inboxItems, agentPreviews])

  // ── Sorted agent list (iMessage-style: most recent first) ────────────────
  const chattableAgents = useMemo(() => {
    return (agents || [])
      .filter(a => a.slug && a.name && !isHidden(a.slug))
      .sort((a, b) => {
        const aMsg = unreadMap[a.slug]
        const bMsg = unreadMap[b.slug]
        const aTime = aMsg?.timestamp || ''
        const bTime = bMsg?.timestamp || ''
        if (aTime && bTime) return bTime > aTime ? 1 : bTime < aTime ? -1 : 0
        if (aTime && !bTime) return -1
        if (!aTime && bTime) return 1
        const aAct = a.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        const bAct = b.status?.toUpperCase() !== 'IDLE' ? 0 : 1
        return aAct - bAct
      })
  }, [agents, unreadMap, isHidden])

  // ── Pinned items (favorites) -- max 5, sorted by most recent ─────────────
  const pinnedItems = useMemo(() => {
    const items = []
    for (const agent of (agents || [])) {
      if (!agent.slug || !agent.name || !isFav('agent', agent.slug)) continue
      const lastMsg = unreadMap[agent.slug]
      items.push({ type: 'agent', data: agent, timestamp: lastMsg?.timestamp || '' })
    }
    for (const project of (projects || [])) {
      if (!project.slug || !isFav('project', project.slug)) continue
      const lastMsg = unreadMap[`project:${project.slug}`]
      items.push({ type: 'project', data: project, timestamp: lastMsg?.timestamp || '' })
    }
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
      if (a.timestamp && !b.timestamp) return -1
      if (!a.timestamp && b.timestamp) return 1
      return 0
    })
    return items.slice(0, 5)
  }, [agents, projects, isFav, unreadMap])

  const topAgentSlugs = useMemo(() => new Set(
    pinnedItems.filter(i => i.type === 'agent').map(i => i.data.slug)
  ), [pinnedItems])

  const topProjectSlugs = useMemo(() => new Set(
    pinnedItems.filter(i => i.type === 'project').map(i => i.data.slug)
  ), [pinnedItems])

  // ── Agent-project association map (from tasks history) ───────────────────
  const agentProjectIds = useMemo(() => {
    const map = {}
    for (const task of (allTasks || [])) {
      const slug = task.agent_identity || task.agentIdentity
      if (!slug) continue
      if (!map[slug]) map[slug] = new Set()
      if (task.project_id) map[slug].add(String(task.project_id))
    }
    return map
  }, [allTasks])

  // ── Search-filtered lists (exclude pinned items from base) ───────────────
  const filteredVisibleAgents = useMemo(() => {
    const base = chattableAgents.filter(a => !topAgentSlugs.has(a.slug))
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    const matchingProjectIds = new Set(
      (projects || []).filter(p => (p.name || '').toLowerCase().includes(q)).map(p => String(p.id))
    )
    return base.filter(a => {
      if ((a.name || '').toLowerCase().includes(q)) return true
      if ((a.role || '').toLowerCase().includes(q)) return true
      const preview = unreadMap[a.slug]
      if (preview?.text?.toLowerCase().includes(q)) return true
      if (matchingProjectIds.size > 0) {
        const agentProjs = agentProjectIds[a.slug]
        if (agentProjs) {
          for (const pid of matchingProjectIds) { if (agentProjs.has(pid)) return true }
        }
      }
      return false
    })
  }, [chattableAgents, topAgentSlugs, searchQuery, unreadMap, projects, agentProjectIds])

  const filteredVisibleProjects = useMemo(() => {
    const base = (projects || []).filter(p => !topProjectSlugs.has(p.slug))
    if (!searchQuery) return base
    const q = searchQuery.toLowerCase()
    return base.filter(p => {
      if ((p.name || '').toLowerCase().includes(q)) return true
      if ((p.slug || '').toLowerCase().includes(q)) return true
      const preview = projectPreviews[`project:${p.slug}`]
      if (preview?.text?.toLowerCase().includes(q)) return true
      return false
    })
  }, [projects, topProjectSlugs, searchQuery, projectPreviews])

  const filteredPinnedItems = useMemo(() => {
    if (!searchQuery) return pinnedItems
    const q = searchQuery.toLowerCase()
    return pinnedItems.filter(item => {
      if (item.type === 'agent') {
        const a = item.data
        if ((a.name || '').toLowerCase().includes(q)) return true
        if ((a.role || '').toLowerCase().includes(q)) return true
        const preview = unreadMap[a.slug]
        if (preview?.text?.toLowerCase().includes(q)) return true
        return false
      }
      if (item.type === 'project') {
        const p = item.data
        if ((p.name || '').toLowerCase().includes(q)) return true
        if ((p.slug || '').toLowerCase().includes(q)) return true
        const preview = projectPreviews[`project:${p.slug}`]
        if (preview?.text?.toLowerCase().includes(q)) return true
        return false
      }
      return false
    })
  }, [pinnedItems, searchQuery, unreadMap, projectPreviews])

  // ── Unified Conversations list: agents + projects sorted by recency ──────
  const conversationItems = useMemo(() => {
    const items = []
    for (const agent of filteredVisibleAgents) {
      const lastMsg = unreadMap[agent.slug]
      items.push({ type: 'agent', data: agent, timestamp: lastMsg?.timestamp || '' })
    }
    for (const project of filteredVisibleProjects) {
      const preview = projectPreviews[`project:${project.slug}`]
      items.push({ type: 'project', data: project, timestamp: preview?.timestamp || '' })
    }
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp < b.timestamp ? 1 : a.timestamp > b.timestamp ? -1 : 0
      if (a.timestamp && !b.timestamp) return -1
      if (!a.timestamp && b.timestamp) return 1
      const aName = (a.data.name || '').toLowerCase()
      const bName = (b.data.name || '').toLowerCase()
      return aName < bName ? -1 : aName > bName ? 1 : 0
    })
    return items
  }, [filteredVisibleAgents, filteredVisibleProjects, unreadMap, projectPreviews])

  return {
    agentPreviews, setAgentPreviews,
    projectPreviews,
    unreadMap, unreadCounts,
    chattableAgents,
    pinnedItems, topAgentSlugs, topProjectSlugs,
    agentProjectIds,
    filteredVisibleAgents, filteredVisibleProjects, filteredPinnedItems,
    conversationItems,
  }
}
