// Agents list section -- one button per agent, status dot, unread badge,
// and a live-dots indicator when the agent has an active task. Extracted
// verbatim from ConversationsView during R2e split. R14a (2026-04-22)
// adds an AgentFailureSurface strip below any row whose agent's latest
// task is failed.
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime, getStatusColor } from '../shared.jsx'
import AgentFailureSurface from './AgentFailureSurface.jsx'

export default function AgentsList({
  agents,
  unreadMap,
  unreadCounts,
  activeAgentSlugs,
  latestFailedByAgent = {},
  setSelectedAgent,
  onSelectAgent,
  heroSlug,
}) {
  // Dedup: the hero card (EA) renders above this list, so filter it out here.
  // Non-hero is_ea agents (e.g. rex alongside elon in Patrik's world) stay
  // visible in the list.
  const isHero = (a) => heroSlug ? a.slug === heroSlug : false
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: C.muted,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>Agents</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: C.muted,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '1px 6px',
          letterSpacing: '0.02em',
        }}>
          {(agents || []).filter(a => !isHero(a)).length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(agents || []).filter(agent => !isHero(agent)).map(agent => {
          const lastMsg = unreadMap[agent.slug]
          const unreadCount = unreadCounts[agent.slug] || 0
          const agentStatus = (agent.status || '').toLowerCase()
          const isActive = agentStatus !== 'idle'
          const statusInfo = getStatusColor(agentStatus)
          const statusLabel = agentStatus === 'building' ? 'Building'
            : agentStatus === 'working' ? 'Working'
            : agentStatus === 'qa' ? 'QA'
            : agentStatus === 'queued' ? 'Queued'
            : isActive ? 'Online' : 'Idle'

          const failedTask = latestFailedByAgent[agent.slug] || null
          return (
            <div key={agent.slug} data-agent-slug={agent.slug}>
            <button
              data-testid={`agent-card-${agent.slug}`}
              data-agent-status={agentStatus || 'idle'}
              onClick={() => { setSelectedAgent(agent); onSelectAgent?.(agent) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                width: '100%', padding: '12px 14px',
                borderRadius: 14,
                background: C.s1,
                border: `1px solid ${isActive ? 'rgba(16,185,129,0.15)' : C.border}`,
                cursor: 'pointer', textAlign: 'left',
                transition: 'all 200ms ease',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = C.s2
                e.currentTarget.style.borderColor = C.border2
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = C.s1
                e.currentTarget.style.borderColor = isActive ? 'rgba(16,185,129,0.15)' : C.border
                e.currentTarget.style.transform = ''
                e.currentTarget.style.boxShadow = ''
              }}
            >
              {isActive && (
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: C.accent }} />
              )}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: agent.color || C.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, color: '#000',
              }}>
                {(agent.name || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                    {agent.name}
                  </span>
                  <span style={{
                    fontSize: 10, color: C.dim,
                    fontFamily: "'JetBrains Mono', monospace",
                    flexShrink: 0,
                  }}>
                    {lastMsg?.timestamp ? formatChatTime(lastMsg.timestamp) : ''}
                  </span>
                </div>
                {(activeAgentSlugs.has(agent.slug) || isActive) ? (
                  <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 3, background: C.accentBg, border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '3px 8px' }}>
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <div key={i} style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: C.accent,
                        animation: `cv3LiveDot 1.2s ease-in-out ${delay}s infinite`,
                      }} />
                    ))}
                  </div>
                ) : (
                  <div style={{
                    fontSize: 12, color: C.muted, marginTop: 2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {lastMsg?.text || 'No messages yet'}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div
                  data-testid="status-badge"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontSize: 9, fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: isActive ? C.accent : agentStatus === 'building' ? C.yellow : C.dim,
                  }}
                >
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: statusInfo.dot,
                    boxShadow: statusInfo.glow,
                  }} />
                  {statusLabel}
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    minWidth: 18, height: 18, borderRadius: 9,
                    background: C.accent, color: '#000',
                    fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '0 4px',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
            {failedTask && <AgentFailureSurface failedTask={failedTask} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}
