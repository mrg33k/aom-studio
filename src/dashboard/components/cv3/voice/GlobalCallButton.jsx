// GlobalCallButton -- mic icon in the nav bar, visible from any dashboard route.
// Calls startCall() with the current-context agent (selectedAgent or rex fallback).
// Returns null when a call is already active (FloatingCallBar takes over).
import { useLiveCall } from '../../../providers/LiveCallProvider.jsx'
import { useCornerAuth, useCornerData, useCornerNav } from '../../../CornerContext.jsx'
import { agentColors, C } from '../../../lib/cv3Colors.js'

export default function GlobalCallButton() {
  const { isActive, startCall } = useLiveCall()
  const { worldId } = useCornerAuth()
  const { agents } = useCornerData()
  const { selectedAgent } = useCornerNav()

  if (isActive) return null

  const handleClick = () => {
    const agent = selectedAgent || agents?.find(a => a.slug === 'rex') || agents?.[0]
    const slug = agent?.slug || 'rex'
    const color = agent?.color || agentColors[slug] || C.accent
    startCall({ agentSlug: slug, clientId: worldId, agentColor: color })
  }

  return (
    <button
      data-testid="global-call-button"
      onClick={handleClick}
      title="Start voice call"
      style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'rgba(16,185,129,0.12)',
        border: '1px solid rgba(16,185,129,0.2)',
        color: C.accent,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'background 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(16,185,129,0.2)'
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(16,185,129,0.12)'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
  )
}
