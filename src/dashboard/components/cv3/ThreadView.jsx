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
} from './chat/ChatPanelContext.jsx'

import ThreadHeader from './thread/ThreadHeader.jsx'
import FilesPanel from './thread/FilesPanel.jsx'
import VoiceChatHost from './thread/VoiceChatHost.jsx'
import MessageList from './thread/MessageList.jsx'
import VoiceModeBar from './thread/VoiceModeBar.jsx'
import RecordingStatusBar from './thread/RecordingStatusBar.jsx'
import ThreadInputBar from './thread/ThreadInputBar.jsx'
import ThreadSettingsModal from './thread/ThreadSettingsModal.jsx'

export default function ThreadView() {
  const { selectedAgent, showHandoffNudge, dismissHandoffNudge } = useChatCore()
  const { isVoiceActive } = useChatVoiceCtx()
  const { isRecording, isTranscribing } = useChatRecordingCtx()
  const { filesOpen, settingsOpen } = useChatSettingsCtx()
  const { lastActionToast } = useChatContextMenuCtx()
  const isSuperAgentChat = selectedAgent?.is_super

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      <TaskStatusCardStyles />

      <ThreadHeader />

      {filesOpen && <FilesPanel />}

      {isVoiceActive && <VoiceChatHost />}

      <MessageList />

      {isVoiceActive && <VoiceModeBar />}

      {(isRecording || isTranscribing) && <RecordingStatusBar />}

      {isSuperAgentChat && showHandoffNudge && (
        <div
          data-testid="handoff-nudge"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'rgba(99,102,241,0.1)',
            borderTop: '1px solid rgba(99,102,241,0.2)',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: '#A5B4FC', fontFamily: "'Inter', sans-serif" }}>
            Might be a good idea to write a handoff and clear context.
          </span>
          <button
            onClick={dismissHandoffNudge}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(165,180,252,0.6)', fontSize: 16, lineHeight: 1,
              padding: '0 4px', flexShrink: 0,
            }}
          >×</button>
        </div>
      )}

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
