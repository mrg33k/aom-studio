// CV4 HomeView — replaces the cv3 ConversationsView default-home state
// when CV4 is mounted. Greeting + recent strip + agent quick-pick.
//
// R-CV4-4 (2026-05-12): Patrik flagged that the cv3 fallback duplicated
// the sidebar. This is the CV4-native home: clean, editorial, gets out
// of the way. Sidebar carries navigation; this carries presence.

import { useMemo } from 'react'
import { useCornerAuth, useCornerData, useCornerNav } from '../CornerContext.jsx'
import { useChatConversationsCtx } from '../components/cv3/chat/ChatPanelContext.jsx'

function timeAgo(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function greeting(name) {
  const hour = new Date().getHours()
  const prefix = hour < 5 ? 'Up late,'
    : hour < 12 ? 'Good morning,'
    : hour < 17 ? 'Hey,'
    : hour < 22 ? 'Good evening,'
    : 'Up late,'
  return `${prefix} ${name}`
}

export default function HomeView() {
  const { currentUser } = useCornerAuth()
  const { agents = [], projectRooms = [], inboxItems = [] } = useCornerData()
  const { handleSelectAgent, handleSelectProject } = useCornerNav()
  // Project previews live in ChatPanel's conversations slice — same source
  // cv3 ConversationsView uses. Keyed by `project:${slug}`; value =
  // { text, timestamp, ... }.
  const { projectPreviews = {} } = useChatConversationsCtx() || {}

  const displayName = currentUser?.user_metadata?.full_name?.split(' ')[0]
    || currentUser?.email?.split('@')[0]
    || 'there'

  // Recent activity = agent inbox + project previews, merged + sorted by ts.
  // Cap at 6.
  const recent = useMemo(() => {
    const rows = []
    for (const item of inboxItems || []) {
      const agent = (agents || []).find((a) => a.slug === item.agent)
      if (!agent) continue
      rows.push({
        key: `agent:${agent.slug}:${item.timestamp || ''}`,
        kind: 'agent',
        ts: item.timestamp,
        label: agent.name,
        preview: item.preview || item.text || '',
        target: agent,
      })
    }
    for (const p of projectRooms || []) {
      const preview = projectPreviews[`project:${p.slug}`]
      if (!preview?.timestamp) continue
      rows.push({
        key: `project:${p.slug}:${preview.timestamp}`,
        kind: 'project',
        ts: preview.timestamp,
        label: p.name,
        preview: preview.text || '',
        target: p,
      })
    }
    return rows.sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).slice(0, 6)
  }, [agents, projectRooms, inboxItems, projectPreviews])

  // Top agents — first four from the agent list, for the quick-pick row.
  const quickAgents = (agents || []).slice(0, 4)

  const handlePick = (row) => {
    if (row.kind === 'agent') handleSelectAgent(row.target)
    else handleSelectProject(row.target)
  }

  return (
    <div className="cv4-home" data-testid="cv4-home">
      <div className="cv4-home__inner">
        <div className="cv4-home__hero">
          <div className="cv4-home__eyebrow">Today</div>
          <h1 className="cv4-home__greeting">
            {greeting(displayName).split(',')[0]},{' '}
            <span className="cv4-home__greeting-name">{displayName}</span>
          </h1>
          <p className="cv4-home__lede">
            Start a thread below, or pick up where you left off.
          </p>
        </div>

        {recent.length > 0 && (
          <section className="cv4-home__section">
            <div className="cv4-home__section-header">
              <span className="cv4-eyebrow">Recent</span>
            </div>
            <div className="cv4-home__recent-grid">
              {recent.map((row) => (
                <button
                  key={row.key}
                  className="cv4-home__card"
                  onClick={() => handlePick(row)}
                >
                  <div className="cv4-home__card-row">
                    <span className={`cv4-home__card-kind cv4-home__card-kind--${row.kind}`}>
                      {row.kind === 'agent' ? 'Agent' : 'Project'}
                    </span>
                    <span className="cv4-home__card-time">{timeAgo(row.ts)}</span>
                  </div>
                  <div className="cv4-home__card-label">{row.label}</div>
                  {row.preview && (
                    <div className="cv4-home__card-preview">{row.preview}</div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {quickAgents.length > 0 && (
          <section className="cv4-home__section">
            <div className="cv4-home__section-header">
              <span className="cv4-eyebrow">Talk to</span>
            </div>
            <div className="cv4-home__agent-grid">
              {quickAgents.map((a) => (
                <button
                  key={a.slug}
                  className="cv4-home__agent-tile"
                  onClick={() => handleSelectAgent(a)}
                >
                  <span className="cv4-home__agent-tile__name">{a.name}</span>
                  {a.role && (
                    <span className="cv4-home__agent-tile__role">{a.role}</span>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
