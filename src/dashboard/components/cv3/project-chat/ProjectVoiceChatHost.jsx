import VoiceChat from '../../VoiceChat.jsx'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'
import { authFetch } from '../../../lib/authFetch.js'

// Hidden VoiceChat host for the project-chat room. When voice is active, this
// component renders the real WebRTC session, streams transcripts into the
// messages array, and persists each voice turn to Supabase. On session end,
// VoiceChat already calls voice-handoff.js (which writes a consolidated
// transcript row with source='voice-handoff') -- no additional prompt needed.
export default function ProjectVoiceChatHost() {
  const { selectedProject, worldId, userIdentity } = useChatCore()
  const { setMessages } = useChatMessagesCtx()
  const {
    voiceChatRef,
    setVoiceTranscriptText, setVoiceStatus,
    setIsVoiceActive, setVoiceMuted, setVoiceVolume,
  } = useChatVoiceCtx()
  const { currentVoice, selectVoice } = useChatSettingsCtx()
  const projColor = selectedProject?.color || '#6B8AB0'

  return (
    <div style={{ display: 'none' }}>
      <VoiceChat
        ref={voiceChatRef}
        agentSlug={`project:${selectedProject?.slug || 'rex'}`}
        agentColor={projColor}
        clientId={worldId}
        autoStart={true}
        initialVoice={currentVoice}
        onVoiceChange={selectVoice}
        onTranscript={(text, role) => {
          setVoiceTranscriptText(text)
          const msgRole = role === 'model' ? 'agent' : 'user'
          const agentKey = `project:${selectedProject?.slug}`
          const projCid = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
          const tempId = `voice-${role}-${Date.now()}`
          setMessages(prev => [...prev, {
            id: tempId,
            role: msgRole,
            agent: agentKey,
            text,
            timestamp: new Date().toISOString(),
            source: 'voice',
          }])
          // Persist voice transcript to DB
          authFetch('/api/dashboard/supabase-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent: agentKey,
              text,
              role: msgRole,
              source: 'voice',
              client_id: projCid,
              ...(msgRole === 'user' ? userIdentity : {}),
            }),
          }).then(r => r.json()).then(data => {
            if (data?.message?.id) {
              setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message } : m))
            }
          }).catch(() => {})
        }}
        onStatusChange={(s) => {
          setVoiceStatus(s)
          if (s === 'idle') {
            setIsVoiceActive(false)
            setVoiceMuted(false)
            setVoiceTranscriptText('')
            // VoiceChat.jsx already calls voice-handoff.js at stopSession() which
            // writes a consolidated voice-handoff message row -- no ceremony needed here.
          }
        }}
        onVolumeChange={setVoiceVolume}
      />
    </div>
  )
}
