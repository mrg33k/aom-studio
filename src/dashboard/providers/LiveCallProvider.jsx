// LiveCallProvider -- global voice-call state for the Corner dashboard.
//
// Wraps the CornerV3 content so call state survives tab navigation.
// VoiceChat mounts inside a hidden div when session is non-null; unmounts on endCall().
//
// Exposed via useLiveCall():
//   isActive, session, status, startCall({ agentSlug, clientId, agentColor }), endCall()
import { createContext, useContext, useState, useRef, useCallback } from 'react'
import VoiceChat from '../components/VoiceChat.jsx'

const LiveCallCtx = createContext(null)

export function useLiveCall() {
  return useContext(LiveCallCtx)
}

export function LiveCallProvider({ children }) {
  const [session, setSession] = useState(null) // null = idle
  const [status, setStatus] = useState('idle')
  const voiceChatRef = useRef(null)

  const startCall = useCallback(({ agentSlug, clientId, agentColor = '#10B981' }) => {
    if (!agentSlug || !clientId) return
    setSession({ agentSlug, clientId, agentColor })
    setStatus('connecting')
  }, [])

  const endCall = useCallback(() => {
    voiceChatRef.current?.stop?.()
    setSession(null)
    setStatus('idle')
  }, [])

  const value = { isActive: !!session, session, status, startCall, endCall }

  return (
    <LiveCallCtx.Provider value={value}>
      {children}
      {session && (
        <div style={{ display: 'none' }}>
          <VoiceChat
            ref={voiceChatRef}
            agentSlug={session.agentSlug}
            agentColor={session.agentColor}
            clientId={session.clientId}
            autoStart={true}
            onStatusChange={(s) => {
              setStatus(s)
              if (s === 'idle') setSession(null)
            }}
          />
        </div>
      )}
    </LiveCallCtx.Provider>
  )
}
