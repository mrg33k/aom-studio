import VoiceChat from '../../VoiceChat.jsx'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'

// Hidden VoiceChat host -- mounts when voice is active so the audio pipeline
// can run while the thread UI stays in place. Voice transcripts are persisted
// via /api/dashboard/supabase-messages. The post-call voice-summary Haiku
// message (source='voice-summary') is what actually reaches Elon.
export default function VoiceChatHost() {
  const { selectedAgent, worldId, userIdentity } = useChatCore()
  const { setMessages } = useChatMessagesCtx()
  const {
    voiceChatRef,
    setVoiceTranscriptText, setVoiceStatus,
    setIsVoiceActive, setVoiceMuted, setVoiceVolume,
  } = useChatVoiceCtx()
  const { currentVoice, selectVoice } = useChatSettingsCtx()

  return (
    <div style={{ display: 'none' }}>
      <VoiceChat
        ref={voiceChatRef}
        agentSlug={selectedAgent.slug}
        agentColor={selectedAgent.color}
        clientId={worldId}
        autoStart={true}
        initialVoice={currentVoice}
        onVoiceChange={selectVoice}
        onTranscript={(text, role) => {
          setVoiceTranscriptText(text)
          const msgRole = role === 'model' ? 'agent' : 'user'
          const tempId = `voice-${role}-${Date.now()}`
          setMessages(prev => [...prev, {
            id: tempId,
            role: msgRole,
            agent: selectedAgent.slug,
            text,
            timestamp: new Date().toISOString(),
            source: 'voice',
          }])
          // Persist voice transcript to DB
          fetch('/api/dashboard/supabase-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent: selectedAgent.slug,
              text,
              role: msgRole,
              source: 'voice',
              client_id: worldId,
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
            // Voice session ended. Post-rewire (Apr 14): VoiceChat.stopSession
            // POSTs the full transcript to /api/dashboard/voice-summary which
            // uses Claude Haiku to produce ONE composed summary message tagged
            // source='voice-summary'. The supabase-listener now forwards
            // voice-summary rows to the terminal relay inbox. No need to send
            // a separate sendAgentText prompt here -- that would duplicate the
            // summary and confuse the agent.
          }
        }}
        onVolumeChange={setVoiceVolume}
      />
    </div>
  )
}
