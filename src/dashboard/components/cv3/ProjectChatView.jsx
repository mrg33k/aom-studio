// ProjectChatView -- project conversation thread. Shell that composes the
// ./project-chat/ leaves. Each leaf reads its own slice of ChatPanelContext
// directly, so the shell only needs to read the flags that gate which
// leaves mount (voice/recording/files/search/settings/toast).
import { TaskStatusCardStyles } from './TaskStatusCard.jsx'

import {
  useChatCore,
  useChatRecordingCtx,
  useChatVoiceCtx,
  useChatSettingsCtx,
  useChatSearchCtx,
  useChatContextMenuCtx,
  useChatSendCtx,
} from './chat/ChatPanelContext.jsx'

import ProjectChatHeader from './project-chat/ProjectChatHeader.jsx'
import RecipesBookOverlay from './session/RecipesBookOverlay.jsx'
import ProjectFilesPanel from './project-chat/ProjectFilesPanel.jsx'
import ProjectSearchBar from './project-chat/ProjectSearchBar.jsx'
import ProjectSearchResults from './project-chat/ProjectSearchResults.jsx'
import ProjectMessageList from './project-chat/ProjectMessageList.jsx'
import ProjectVoiceChatHost from './project-chat/ProjectVoiceChatHost.jsx'
import ProjectVoiceModeBar from './project-chat/ProjectVoiceModeBar.jsx'
import ProjectRecordingStatusBar from './project-chat/ProjectRecordingStatusBar.jsx'
import ProjectInputBar from './project-chat/ProjectInputBar.jsx'
import ProjectSettingsModal from './project-chat/ProjectSettingsModal.jsx'

export default function ProjectChatView() {
  const { showHandoffNudge, dismissHandoffNudge, selectedProject } = useChatCore()
  const { isRecording, isTranscribing } = useChatRecordingCtx()
  const { isVoiceActive } = useChatVoiceCtx()
  const {
    filesOpen, settingsOpen,
    recipesOpen, setRecipesOpen,
  } = useChatSettingsCtx()
  const { chatSearchOpen, chatSearchResults } = useChatSearchCtx()
  const { lastActionToast } = useChatContextMenuCtx()
  const { sendProjectText } = useChatSendCtx()

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      position: 'relative',
      fontFamily: "'Inter', sans-serif",
    }}>
      <TaskStatusCardStyles />

      <ProjectChatHeader />

      {/* R41: recipes book in GRAND view -- project chat surface doesn't
          scope to a single agent. Every recipe, organized by category, with
          in-place search. */}
      {recipesOpen && (
        <RecipesBookOverlay
          mode="project"
          onClose={() => setRecipesOpen(false)}
          onFire={({ recipe, input }) => {
            const text = `${recipe.name}${input ? ' ' + input : ''}`.trim()
            try { sendProjectText?.(text) } catch (_) {}
          }}
        />
      )}

      {filesOpen && <ProjectFilesPanel />}

      {chatSearchOpen && <ProjectSearchBar />}

      {chatSearchOpen && chatSearchResults && chatSearchResults.length > 0 && (
        <ProjectSearchResults />
      )}

      <ProjectMessageList />

      {isVoiceActive && <ProjectVoiceChatHost />}

      {isVoiceActive && <ProjectVoiceModeBar />}

      {(isRecording || isTranscribing) && <ProjectRecordingStatusBar />}

      {showHandoffNudge && (
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

      {!isVoiceActive && <ProjectInputBar />}

      {settingsOpen && <ProjectSettingsModal />}

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
