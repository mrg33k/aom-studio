import { C } from '../../../lib/cv3Colors.js'
import { useChatSearchCtx } from '../chat/ChatPanelContext.jsx'

// Search results overlay that replaces the messages area while a query is
// active. Shows up to 300 chars of each hit, with role label and timestamp.
export default function ProjectSearchResults() {
  const { chatSearchResults } = useChatSearchCtx()
  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      {(chatSearchResults || []).map((msg, i) => (
        <div key={msg.id || i} style={{
          padding: '8px 10px', borderRadius: 8,
          background: msg.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
            {msg.role === 'user' ? 'You' : (msg.source || 'Agent')} {' '}
            {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
          </div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
            {(msg.text || '').substring(0, 300)}{(msg.text || '').length > 300 ? '...' : ''}
          </div>
        </div>
      ))}
    </div>
  )
}
