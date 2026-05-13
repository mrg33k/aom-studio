// useHomeData — shared 1:1 data hook for CV4 home variants.
//
// Surfaces the same data CornerV3's ConversationsView shows on /dashboard:
//   - greeting time-of-day + display name
//   - EA agent + last message preview + state
//   - other agents (non-EA) with state + preview + timestamp
//   - pinned items (agents + projects), sorted by timestamp
//   - active projects (sorted by lastMessage timestamp)
//   - archived projects (filtered out by default)
//
// Lives under cv4/home/ so the variant components stay thin renderers.

import { useMemo } from 'react'
import { useCornerAuth, useCornerData } from '../../CornerContext.jsx'
import { useChatConversationsCtx } from '../../components/cv3/chat/ChatPanelContext.jsx'

// Time formatting helpers (parallels formatChatTime in cv3 but simpler/local)
export function timeShort(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 3600000 * 60)
  if (h < 24) return `${h}h`
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now - d) / 86400000)
  if (days < 7) return `${days}d`
  // Older — short date
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function timeISOToFull(iso) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 19).replace('T', ' ')
}

export function greetingFor(name) {
  const hour = new Date().getHours()
  const prefix = hour < 5 ? 'Up late,'
    : hour < 12 ? 'Good morning,'
    : hour < 17 ? 'Hey,'
    : hour < 22 ? 'Evening,'
    : 'Up late,'
  return `${prefix} ${name}`
}

export function todayLong() {
  const d = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
}

export default function useHomeData() {
  const { currentUser, worldId } = useCornerAuth()
  const { agents = [], projectRooms = [], inboxItems = [] } = useCornerData()
  const conv = useChatConversationsCtx() || {}
  const {
    projectPreviews = {},
    unreadMap = {},
    pinnedItems = [],
    filteredVisibleAgents = [],
    filteredVisibleProjects = [],
  } = conv

  const displayName = currentUser?.user_metadata?.full_name?.split(' ')[0]
    || currentUser?.email?.split('@')[0]
    || 'there'

  // EA = first agent OR specifically slug 'elon' if present. The cv3 EaHeroCard
  // picks the user's primary EA (which in AOM world is Elon). Match that.
  const eaAgent = useMemo(() => {
    const elon = (agents || []).find((a) => a.slug === 'elon')
    if (elon) return elon
    return (agents || [])[0] || null
  }, [agents])

  const eaLastMsg = eaAgent ? unreadMap[eaAgent.slug] : null

  // Non-EA agents (Rex, Gary, etc.)
  const otherAgents = useMemo(() => {
    if (!eaAgent) return agents || []
    return (agents || []).filter((a) => a.slug !== eaAgent.slug)
  }, [agents, eaAgent])

  // Decorate agents with last message + time + state
  const decorateAgent = (agent) => {
    const lastMsg = unreadMap[agent.slug]
    return {
      ...agent,
      lastText: lastMsg?.text || '',
      lastTimestamp: lastMsg?.timestamp || '',
      lastTimeShort: timeShort(lastMsg?.timestamp),
      state: agent.status || 'idle',
    }
  }

  // Pinned items (agents + projects) — already sorted by useChatConversations
  const pinned = useMemo(() => {
    return (pinnedItems || []).map((item) => {
      if (item.type === 'agent') {
        return {
          key: `agent:${item.data.slug}`,
          kind: 'agent',
          slug: item.data.slug,
          name: item.data.name,
          color: item.data.color,
          state: item.data.status || 'idle',
          ts: item.timestamp,
          tsShort: timeShort(item.timestamp),
          preview: unreadMap[item.data.slug]?.text || '',
          data: item.data,
        }
      }
      const preview = projectPreviews[`project:${item.data.slug}`]
      return {
        key: `project:${item.data.slug}`,
        kind: 'project',
        slug: item.data.slug,
        name: item.data.name,
        color: item.data.color,
        state: item.data.status || 'active',
        ts: preview?.timestamp || item.timestamp,
        tsShort: timeShort(preview?.timestamp || item.timestamp),
        preview: preview?.text || '',
        data: item.data,
      }
    })
  }, [pinnedItems, projectPreviews, unreadMap])

  // Active (non-pinned, non-archived) projects, sorted by latest preview timestamp
  const pinnedProjectSlugs = useMemo(() => new Set(
    (pinnedItems || []).filter((i) => i.type === 'project').map((i) => i.data.slug)
  ), [pinnedItems])

  const allProjectsSorted = useMemo(() => {
    const rows = (projectRooms || []).map((p) => {
      const preview = projectPreviews[`project:${p.slug}`]
      return {
        key: `project:${p.slug}`,
        kind: 'project',
        slug: p.slug,
        name: p.name,
        color: p.color,
        status: p.status || 'active',
        archived: !!p.archived,
        ts: preview?.timestamp || '',
        tsShort: timeShort(preview?.timestamp),
        preview: preview?.text || '',
        data: p,
      }
    })
    rows.sort((a, b) => {
      if (a.ts && b.ts) return b.ts.localeCompare(a.ts)
      if (a.ts && !b.ts) return -1
      if (!a.ts && b.ts) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
    return rows
  }, [projectRooms, projectPreviews])

  const activeProjects = useMemo(() => {
    return allProjectsSorted.filter((p) => !p.archived && !pinnedProjectSlugs.has(p.slug))
  }, [allProjectsSorted, pinnedProjectSlugs])

  const archivedProjects = useMemo(() => {
    return allProjectsSorted.filter((p) => p.archived)
  }, [allProjectsSorted])

  // The agent inbox sorted by most recent (used for "wire" / activity)
  const wire = useMemo(() => {
    const rows = []
    for (const item of inboxItems || []) {
      const agent = (agents || []).find((a) => a.slug === item.agent)
      if (!agent) continue
      rows.push({
        key: `agent:${agent.slug}:${item.timestamp || ''}`,
        kind: 'agent',
        ts: item.timestamp,
        tsShort: timeShort(item.timestamp),
        label: agent.name,
        slug: agent.slug,
        preview: item.preview || item.text || '',
        target: agent,
      })
    }
    for (const p of allProjectsSorted) {
      if (!p.ts) continue
      rows.push({
        key: p.key,
        kind: 'project',
        ts: p.ts,
        tsShort: p.tsShort,
        label: p.name,
        slug: p.slug,
        preview: p.preview,
        target: p.data,
      })
    }
    return rows.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
  }, [inboxItems, agents, allProjectsSorted])

  return {
    worldId,
    displayName,
    greeting: greetingFor(displayName),
    today: todayLong(),

    eaAgent: eaAgent ? decorateAgent(eaAgent) : null,
    eaLastMsg,

    agents: (agents || []).map(decorateAgent),
    otherAgents: otherAgents.map(decorateAgent),

    pinned,
    activeProjects,
    archivedProjects,

    wire,
    leadStory: wire[0] || null,
  }
}
