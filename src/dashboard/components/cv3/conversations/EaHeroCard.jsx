// EA focus card — the prominent first card on the home view that links
// straight into the current world's EA chat. Status info + unread badge +
// last message. Extracted from ConversationsView during R2e split; made
// role-driven (is_ea) in R14e-2. R14a (2026-04-22): renders an
// AgentFailureSurface strip below the hero when the EA's latest task is
// failed -- same component as AgentsList uses.
// R19e (2026-04-23): EA hero is an opinion, not a fixture. R58 (session
// 20) generalized the pin/unpin pattern — the EA card now uses the same
// PinMenu every other agent card carries. The old R19e ea-hero-unpin "×"
// button + ea-hero-restore CTA are retired; the menu replaces both.
import { C } from '../../../lib/cv3Colors.js'
import { formatChatTime } from '../shared.jsx'
import AgentFailureSurface from './AgentFailureSurface.jsx'
import PinMenu from './PinMenu.jsx'

export default function EaHeroCard({
  eaAgent,
  eaLastMsg,
  eaUnread,
  eaStatusInfo,
  eaIsActive,
  activeAgentSlugs,
  latestFailedTask = null,
  setSelectedAgent,
  onSelectAgent,
  onUnpin,
  onInfoClick,
}) {
  if (!eaAgent) return null
  const avatarLetter = (eaAgent.name || '?')[0].toUpperCase()
  return (
    <div data-agent-slug={eaAgent.slug} data-testid="ea-hero-card" style={{ marginBottom: 28, position: 'relative' }}>
    {onInfoClick && (
      <button
        type="button"
        data-testid={`agent-info-drawer-${eaAgent.slug}`}
        onClick={(e) => { e.stopPropagation(); onInfoClick(eaAgent) }}
        aria-label={`About ${eaAgent.name}`}
        title={`About ${eaAgent.name}`}
        style={{
          position: 'absolute', top: 14, right: onUnpin ? 46 : 14, zIndex: 2,
          width: 26, height: 26, borderRadius: 8,
          background: 'rgba(10,12,20,0.6)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(96,165,250,0.5)',
          cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Georgia', 'Times New Roman', serif",
          fontSize: 13, fontWeight: 700, lineHeight: 1,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(59,158,255,0.15)'
          e.currentTarget.style.borderColor = 'rgba(59,158,255,0.4)'
          e.currentTarget.style.color = '#3B9EFF'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(10,12,20,0.6)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'rgba(96,165,250,0.5)'
        }}
      >
        i
      </button>
    )}
    {onUnpin && (
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}>
        <PinMenu
          kind="agent"
          slug={eaAgent.slug}
          isPinned={true}
          onUnpin={() => onUnpin()}
        />
      </div>
    )}
    <button
      data-testid={`agent-card-${eaAgent.slug}`}
      data-agent-slug={eaAgent.slug}
      data-agent-role="ea"
      data-agent-status={(eaAgent.status || 'idle').toLowerCase()}
      onClick={() => { setSelectedAgent(eaAgent); onSelectAgent?.(eaAgent) }}
      style={{
        width: '100%',
        padding: '20px 18px',
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))',
        border: `1.5px solid rgba(96,165,250,${eaIsActive ? '0.3' : '0.15'})`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(96,165,250,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `rgba(96,165,250,${eaIsActive ? '0.3' : '0.15'})`
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = ''
      }}
    >
      {eaIsActive && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#60A5FA' }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: eaAgent.color || '#60A5FA',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 22, color: '#000',
          boxShadow: `0 0 20px ${(eaAgent.color || '#60A5FA')}44`,
        }}>
          {avatarLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "'Inter', sans-serif" }}>
              {eaAgent.name || eaAgent.slug}
            </span>
            <div
              data-testid="status-badge"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: eaIsActive ? '#60A5FA' : C.dim,
              }}
            >
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: eaStatusInfo.dot,
                boxShadow: eaStatusInfo.glow,
              }} />
              {eaIsActive ? 'Online' : 'Idle'}
            </div>
            {eaUnread > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9,
                background: '#60A5FA', color: '#000',
                fontSize: 9, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                padding: '0 5px',
              }}>
                {eaUnread > 9 ? '9+' : eaUnread}
              </span>
            )}
          </div>
          {(activeAgentSlugs.has(eaAgent?.slug) || eaIsActive) ? (
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
                {eaLastMsg?.text || `Start a conversation with ${eaAgent.name || eaAgent.slug}`}
              </div>
              {eaLastMsg?.timestamp && (
                <div style={{
                  fontSize: 10, color: C.dim,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: 4,
                }}>
                  {formatChatTime(eaLastMsg.timestamp)}
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
    {latestFailedTask && <AgentFailureSurface failedTask={latestFailedTask} />}
    </div>
  )
}
