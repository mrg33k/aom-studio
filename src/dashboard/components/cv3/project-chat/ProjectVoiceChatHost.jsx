import VoiceChat from '../../VoiceChat.jsx'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'
import { authFetch } from '../../../lib/authFetch.js'
import { useCornerData } from '../../../CornerContext.jsx'
import { getProjectEA } from '../../../data/project-ea.js'

// Hidden VoiceChat host for the project-chat room. When voice is active, this
// component renders the real WebRTC session, streams transcripts into the
// messages array, and persists each voice turn to Supabase. On session end,
// VoiceChat already calls voice-handoff.js (which writes a consolidated
// transcript row with source='voice-handoff') -- no additional prompt needed.
//
// 2026-05-23 fix: was passing agentSlug=`project:${slug}` which landed in
// Supabase's messages.agent column as a literal 'project:corner' — a
// malformed routing identifier the bridge couldn't decode. Now resolves
// the real EA via getProjectEA() and passes project + missionSlug
// separately so voice-handoff writes rows that land in the right project
// mission room with the right EA owning them.
export default function ProjectVoiceChatHost() {
  const { selectedProject, worldId, userIdentity } = useChatCore()
  const { agents } = useCornerData()
  const { setMessages } = useChatMessagesCtx()
  const {
    voiceChatRef,
    setVoiceTranscriptText, setVoiceStatus,
    setIsVoiceActive, setVoiceMuted, setVoiceVolume,
  } = useChatVoiceCtx()
  const { currentVoice, selectVoice } = useChatSettingsCtx()
  const projColor = selectedProject?.color || '#6B8AB0'
  const eaSlug = getProjectEA(selectedProject, agents) || 'elon'
  const projectSlug = selectedProject?.slug || null
  const missionSlug = selectedProject?.missionSlug || null

  return (
    <div style={{ display: 'none' }}>
      <VoiceChat
        ref={voiceChatRef}
        agentSlug={eaSlug}
        agentColor={projColor}
        clientId={worldId}
        projectSlug={projectSlug}
        missionSlug={missionSlug}
        autoStart={true}
        initialVoice={currentVoice}
        onVoiceChange={selectVoice}
        onTranscript={(text, role) => {
          setVoiceTranscriptText(text)
          const msgRole = role === 'model' ? 'agent' : 'user'
          const projCid = selectedProject?.isShared ? `shared:${selectedProject.slug}` : worldId
          const tempId = `voice-${role}-${Date.now()}`
          setMessages(prev => [...prev, {
            id: tempId,
            role: msgRole,
            agent: eaSlug,
            text,
            timestamp: new Date().toISOString(),
            source: 'voice',
          }])
          // Persist voice transcript to DB with proper agent + project + mission_slug
          authFetch('/api/dashboard/supabase-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent: eaSlug,
              project: projectSlug,
              text,
              role: msgRole,
              source: 'voice',
              client_id: projCid,
              ...(missionSlug ? { metadata: { mission_slug: missionSlug } } : {}),
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
