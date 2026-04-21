// Elon focus card -- the prominent first card on the home view that links
// straight into Elon's chat. Status info + unread badge + last message.
// Extracted verbatim from ConversationsView during R2e split.
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime } from '../shared.jsx'

export default function ElonHeroCard({
  elonAgent,
  elonLastMsg,
  elonUnread,
  elonStatusInfo,
  elonIsActive,
  activeAgentSlugs,
  setSelectedAgent,
  onSelectAgent,
}) {
  if (!elonAgent) return null
  return (
    <button
      data-testid={`agent-card-${elonAgent.slug}`}
      data-agent-status={(elonAgent.status || 'idle').toLowerCase()}
      onClick={() => { setSelectedAgent(elonAgent); onSelectAgent?.(elonAgent) }}
      style={{
        width: '100%',
        padding: '20px 18px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))',
        border: `1.5px solid rgba(96,165,250,${elonIsActive ? '0.3' : '0.15'})`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 200ms ease',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(96,165,250,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `rgba(96,165,250,${elonIsActive ? '0.3' : '0.15'})`
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {elonIsActive && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#60A5FA' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: elonAgent.color || '#60A5FA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 22, color: '#000',
          boxShadow: `0 0 20px ${(elonAgent.color || '#60A5FA')}44`,
        }}>
          E
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Inter', sans-serif" }}>
              {elonAgent.name || 'Elon'}
            </span>
            <div
              data-testid="status-badge"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: elonIsActive ? '#60A5FA' : C.dim,
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: elonStatusInfo.dot,
                boxShadow: elonStatusInfo.glow,
              }} />
              {elonIsActive ? 'Online' : 'Idle'}
            </div>
            {elonUnread > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#60A5FA', color: '#000',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                padding: '0 5px',
              }}>
                {elonUnread > 9 ? '9+' : elonUnread}
              </span>
            )}
          </div>
          {(activeAgentSlugs.has(elonAgent?.slug) || elonIsActive) ? (
            <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, background: C.accentBg, border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '4px 10px' }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <div key={i} style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: C.accent,
                  animation: `cv3LiveDot 1.2s ease-in-out ${delay}s infinite`,
                }} />
              ))}
            </div>
          ) : (
            <>
              <div style={{
                fontSize: 13, color: C.text2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {elonLastMsg?.text || 'Start a conversation with Elon'}
              </div>
              {elonLastMsg?.timestamp && (
                <div style={{
                  fontSize: 10, color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: 4,
                }}>
                  {formatChatTime(elonLastMsg.timestamp)}
                </div>
              )}
            </>
          )}
        </div>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
          stroke="rgba(96,165,250,0.5)" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </button>
  )
}
