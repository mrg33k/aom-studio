// ThreadView -- agent conversation thread. Shell that composes the sub-pieces
// from ./thread/. Each leaf now reads its own slice of chat context directly,
// so the shell only reads the few fields needed to gate mounting (voice on/off,
// settings open, files open, recording state, context-menu toast).
//
// R3c (Apr 17, 2026): dissolved the prop-drilling layer. Leaves own their
// context consumption; MessageList also owns the right-click context menu.
import { TaskStatusCardStyles } from './TaskStatusCard.jsx'

import {
  useChatCore,
  useChatVoiceCtx,
  useChatRecordingCtx,
  useChatSettingsCtx,
  useChatContextMenuCtx,
  useChatSendCtx,
} from './chat/ChatPanelContext.jsx'

import ThreadHeader from './thread/ThreadHeader.jsx'
import AgentProfileOverlay from './thread/AgentProfileOverlay.jsx'
import RecipesBookOverlay from './session/RecipesBookOverlay.jsx'
import FilesPanel from './thread/FilesPanel.jsx'
import VoiceChatHost from './thread/VoiceChatHost.jsx'
import MessageList from './thread/MessageList.jsx'
import VoiceModeBar from './thread/VoiceModeBar.jsx'
import RecordingStatusBar from './thread/RecordingStatusBar.jsx'
import ThreadInputBar from './thread/ThreadInputBar.jsx'
import ThreadSettingsModal from './thread/ThreadSettingsModal.jsx'
import HandoffNudge from './shared/HandoffNudge.jsx'

export default function ThreadView() {
  const { selectedAgent } = useChatCore()
  const { isVoiceActive } = useChatVoiceCtx()
  const { isRecording, isTranscribing, micError: recMicError, lastTranscript } = useChatRecordingCtx()
  const {
    filesOpen, settingsOpen,
    profileOpen, setProfileOpen,
    recipesOpen, setRecipesOpen,
  } = useChatSettingsCtx()
  const { lastActionToast } = useChatContextMenuCtx()
  const { sendAgentText } = useChatSendCtx()
  const isSuperAgentChat = selectedAgent?.is_super

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
    }}>
      <TaskStatusCardStyles />

      <ThreadHeader />

      {/* R40: agent profile overlay. Mounts at the ThreadView level so the
          info-icon in ThreadHeader can toggle it; the overlay covers the
          whole thread area via position:absolute + parent relative. */}
      {profileOpen && selectedAgent && (
        <AgentProfileOverlay
          agent={selectedAgent}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {/* R41: recipes book -- filtered to this agent's domain in thread view. */}
      {recipesOpen && selectedAgent && (
        <RecipesBookOverlay
          mode="agent"
          agentSlug={selectedAgent.slug}
          onClose={() => setRecipesOpen(false)}
          onFire={({ recipe, input }) => {
            const text = `${recipe.name}${input ? ' ' + input : ''}`.trim()
            try { sendAgentText?.(text) } catch (_) {}
          }}
        />
      )}

      {filesOpen && <FilesPanel />}

      {isVoiceActive && <VoiceChatHost />}

      <MessageList roomType="agent" />

      {isVoiceActive && <VoiceModeBar />}

      {(isRecording || isTranscribing || recMicError || lastTranscript) && <RecordingStatusBar />}

      {isSuperAgentChat && <HandoffNudge />}

      {!isVoiceActive && <ThreadInputBar />}

      {settingsOpen && <ThreadSettingsModal />}

      {/* Tiny bottom toast for context-menu confirmations */}
      {lastActionToast && (
        <div
          data-test-id="ctx-toast"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 20,
            transform: 'translateX(-50%)',
            zIndex: 9998,
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.32)',
            color: '#A7F3D0',
            padding: '8px 14px',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          }}
        >
          {lastActionToast.text}
        </div>
      )}
    </div>
  )
}
