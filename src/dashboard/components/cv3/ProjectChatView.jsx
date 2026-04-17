// ProjectChatView -- project conversation thread. Shell that wires hooks +
// sub-pieces from ./project-chat/ into the same ctx contract the rest of
// ChatPanel speaks.
//
// R2d split: the pre-split ProjectChatView.jsx was 1643 LOC. Ctx contract and
// behavior preserved exactly -- only where each piece lives has changed.
// R3 will replace ctx with scoped hooks.
import { TaskStatusCardStyles } from './TaskStatusCard.jsx'
import { MessageContextMenu } from './ContextMenu.jsx'

import useProjectChatMsgMenu from './project-chat/useProjectChatMsgMenu.js'
import useProjectChatSwitcher from './project-chat/useProjectChatSwitcher.js'
import useProjectChatFiles from './project-chat/useProjectChatFiles.js'
import useProjectChatPrefill from './project-chat/useProjectChatPrefill.js'
import ProjectChatHeader from './project-chat/ProjectChatHeader.jsx'
import ProjectFilesPanel from './project-chat/ProjectFilesPanel.jsx'
import ProjectSearchBar from './project-chat/ProjectSearchBar.jsx'
import ProjectSearchResults from './project-chat/ProjectSearchResults.jsx'
import ProjectMessageList from './project-chat/ProjectMessageList.jsx'
import ProjectVoiceChatHost from './project-chat/ProjectVoiceChatHost.jsx'
import ProjectVoiceModeBar from './project-chat/ProjectVoiceModeBar.jsx'
import ProjectRecordingStatusBar from './project-chat/ProjectRecordingStatusBar.jsx'
import ProjectInputBar from './project-chat/ProjectInputBar.jsx'
import ProjectSettingsModal from './project-chat/ProjectSettingsModal.jsx'

export default function ProjectChatView(ctx) {
  const {
    projectId, navigate, selectedProject, onBack,
    isVoiceActive, setVoiceMinimized, voiceMinimizedAgent,
    messages, setMessages, setInlineProject, setSelectedAgent,
    isRecording, handleMicToggle, micError, isTranscribing,
    chatSearchOpen, setChatSearchOpen, chatSearchQuery, setChatSearchQuery,
    chatSearchResults, setChatSearchResults, chatSearchLoading, chatSearchRef,
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    sending, input, setInput, inputRef, fileInputRef,
    messagesEndRef, messagesRef, loadingMsgs, uploading,
    isMobile, chatInputFocused, setChatInputFocused,
    handleFileSelection, sendProjectText,
    voiceChatRef, voiceStatus, setVoiceStatus,
    setVoiceVolume, voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted, setIsVoiceActive,
    chatNameInput, setChatNameInput, inviteEmail, setInviteEmail,
    inviteLoading, setInviteLoading, inviteMsg, setInviteMsg,
    collaborators, setCollaborators,
    envKeys, envKeysLoading, newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue, newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    saveEnvKey, deleteEnvKey,
    worldId, currentUser, agents, projects, onSelectAgent, onSelectProject, VOICE_OPTIONS,
    currentVoice, selectVoice, saveRoomName,
    userProfiles, userIdentity,
    displayName,
    filesOpen, setFilesOpen,
    prefillMessage, setPrefillMessage,
    replyTo, setReplyTo,
    needsVerificationIds,
    lastActionToast,
    handleMessageFollowUp,
    handleMessageNeedsVerification,
    handleMessageResearch,
    handleMessageSendTo,
  } = ctx
  const projColor = selectedProject?.color || '#6B8AB0'

  const msgMenuHook = useProjectChatMsgMenu()
  const switcher = useProjectChatSwitcher()
  const { projectFiles, filesLoading } = useProjectChatFiles({
    filesOpen,
    selectedProject,
    uploading,
  })
  useProjectChatPrefill({
    prefillMessage,
    selectedProject,
    setInput,
    setPrefillMessage,
    inputRef,
  })

  const sortedSwitcherProjects = [...(projects || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      <TaskStatusCardStyles />

      <ProjectChatHeader
        projColor={projColor}
        projectId={projectId}
        navigate={navigate}
        selectedProject={selectedProject}
        isVoiceActive={isVoiceActive}
        setVoiceMinimized={setVoiceMinimized}
        voiceMinimizedAgent={voiceMinimizedAgent}
        onBack={onBack}
        setMessages={setMessages}
        setInlineProject={setInlineProject}
        setSelectedAgent={setSelectedAgent}
        onSelectAgent={onSelectAgent}
        onSelectProject={onSelectProject}
        isRecording={isRecording}
        handleMicToggle={handleMicToggle}
        chatSearchOpen={chatSearchOpen}
        setChatSearchOpen={setChatSearchOpen}
        setChatSearchQuery={setChatSearchQuery}
        setChatSearchResults={setChatSearchResults}
        filesOpen={filesOpen}
        setFilesOpen={setFilesOpen}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        agents={agents}
        sortedSwitcherProjects={sortedSwitcherProjects}
        switcherOpen={switcher.switcherOpen}
        setSwitcherOpen={switcher.setSwitcherOpen}
        switcherRef={switcher.switcherRef}
      />

      {filesOpen && (
        <ProjectFilesPanel
          projectFiles={projectFiles}
          filesLoading={filesLoading}
        />
      )}

      {chatSearchOpen && (
        <ProjectSearchBar
          chatSearchRef={chatSearchRef}
          chatSearchQuery={chatSearchQuery}
          setChatSearchQuery={setChatSearchQuery}
          setChatSearchOpen={setChatSearchOpen}
          setChatSearchResults={setChatSearchResults}
          chatSearchLoading={chatSearchLoading}
          chatSearchResults={chatSearchResults}
        />
      )}

      {chatSearchOpen && chatSearchResults && chatSearchResults.length > 0 && (
        <ProjectSearchResults chatSearchResults={chatSearchResults} />
      )}

      <ProjectMessageList
        messages={messages}
        loadingMsgs={loadingMsgs}
        selectedProject={selectedProject}
        projColor={projColor}
        displayName={displayName}
        currentUser={currentUser}
        userProfiles={userProfiles}
        needsVerificationIds={needsVerificationIds}
        sending={sending}
        messagesEndRef={messagesEndRef}
        hidden={chatSearchOpen && chatSearchResults && chatSearchResults.length > 0}
        openMsgMenu={msgMenuHook.openMsgMenu}
        startLongPress={msgMenuHook.startLongPress}
        cancelLongPress={msgMenuHook.cancelLongPress}
      />

      {isVoiceActive && (
        <ProjectVoiceChatHost
          voiceChatRef={voiceChatRef}
          selectedProject={selectedProject}
          worldId={worldId}
          currentVoice={currentVoice}
          selectVoice={selectVoice}
          setVoiceTranscriptText={setVoiceTranscriptText}
          setMessages={setMessages}
          userIdentity={userIdentity}
          setVoiceStatus={setVoiceStatus}
          setIsVoiceActive={setIsVoiceActive}
          setVoiceMuted={setVoiceMuted}
          setVoiceVolume={setVoiceVolume}
          messagesRef={messagesRef}
          sendProjectText={sendProjectText}
          projColor={projColor}
        />
      )}

      {isVoiceActive && (
        <ProjectVoiceModeBar
          voiceStatus={voiceStatus}
          voiceTranscriptText={voiceTranscriptText}
          voiceChatRef={voiceChatRef}
          voiceMuted={voiceMuted}
          setVoiceMuted={setVoiceMuted}
          setIsVoiceActive={setIsVoiceActive}
          setVoiceTranscriptText={setVoiceTranscriptText}
        />
      )}

      {(isRecording || isTranscribing) && (
        <ProjectRecordingStatusBar
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          recordingElapsed={ctx.recordingElapsed}
          handleMicToggle={handleMicToggle}
          micError={micError}
        />
      )}

      {!isVoiceActive && (
        <ProjectInputBar
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          fileInputRef={fileInputRef}
          chatInputFocused={chatInputFocused}
          setChatInputFocused={setChatInputFocused}
          sending={sending}
          uploading={uploading}
          selectedProject={selectedProject}
          sendProjectText={sendProjectText}
          handleFileSelection={handleFileSelection}
          setIsVoiceActive={setIsVoiceActive}
          isVoiceActive={isVoiceActive}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
        />
      )}

      {settingsOpen && (
        <ProjectSettingsModal
          isMobile={isMobile}
          selectedProject={selectedProject}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          setSettingsOpen={setSettingsOpen}
          chatNameInput={chatNameInput}
          setChatNameInput={setChatNameInput}
          saveRoomName={saveRoomName}
          VOICE_OPTIONS={VOICE_OPTIONS}
          currentVoice={currentVoice}
          selectVoice={selectVoice}
          collaborators={collaborators}
          setCollaborators={setCollaborators}
          inviteEmail={inviteEmail}
          setInviteEmail={setInviteEmail}
          inviteLoading={inviteLoading}
          setInviteLoading={setInviteLoading}
          inviteMsg={inviteMsg}
          setInviteMsg={setInviteMsg}
          worldId={worldId}
          envKeys={envKeys}
          envKeysLoading={envKeysLoading}
          newKeyName={newKeyName}
          setNewKeyName={setNewKeyName}
          newKeyValue={newKeyValue}
          setNewKeyValue={setNewKeyValue}
          newKeyScope={newKeyScope}
          setNewKeyScope={setNewKeyScope}
          keySaveMsg={keySaveMsg}
          setKeySaveMsg={setKeySaveMsg}
          saveEnvKey={saveEnvKey}
          deleteEnvKey={deleteEnvKey}
        />
      )}

      {/* Right-click context menu for project messages */}
      <MessageContextMenu
        open={!!msgMenuHook.msgMenu}
        x={msgMenuHook.msgMenu?.x || 0}
        y={msgMenuHook.msgMenu?.y || 0}
        message={msgMenuHook.msgMenu?.message || null}
        agents={agents || []}
        onClose={() => msgMenuHook.setMsgMenu(null)}
        onFollowUp={(m) => handleMessageFollowUp?.(m)}
        onNeedsVerification={(m) => handleMessageNeedsVerification?.(m)}
        onResearch={(m) => handleMessageResearch?.(m)}
        onSendTo={(target) => handleMessageSendTo?.(msgMenuHook.msgMenu?.message, target)}
      />

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
