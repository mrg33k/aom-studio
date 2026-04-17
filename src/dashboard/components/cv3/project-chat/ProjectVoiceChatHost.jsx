import VoiceChat from '../../VoiceChat.jsx'

// Hidden VoiceChat host for the project-chat room. When voice is active, this
// component renders the real WebRTC session, streams transcripts into the
// messages array, and persists each voice turn to Supabase. On session end it
// triggers a "[Voice conversation just ended]" prompt into the composer so the
// operator can summarize + queue tasks.
export default function ProjectVoiceChatHost({
  voiceChatRef,
  selectedProject,
  worldId,
  currentVoice,
  selectVoice,
  setVoiceTranscriptText,
  setMessages,
  userIdentity,
  setVoiceStatus,
  setIsVoiceActive,
  setVoiceMuted,
  setVoiceVolume,
  messagesRef,
  sendProjectText,
  projColor,
}) {
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
          fetch('/api/dashboard/supabase-messages', {
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
            // Voice session ended -- ask operator to summarize and create follow-ups
            const voiceMsgs = messagesRef.current?.filter(m => m.source === 'voice') || []
            if (voiceMsgs.length >= 4) {
              setTimeout(() => {
                sendProjectText('[Voice conversation just ended] Review our voice conversation above. Post a brief summary of what we discussed and any decisions made. If there are action items or tasks that should be created, create them now. Do not ask for permission -- just summarize and queue any tasks that came up.')
              }, 1500)
            }
          }
        }}
        onVolumeChange={setVoiceVolume}
      />
    </div>
  )
}
