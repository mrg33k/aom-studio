// ThreadView -- agent conversation thread. Shell that wires hooks + sub-pieces
// from ./thread/ into the same ctx contract the rest of ChatPanel speaks.
//
// R2c split: the pre-split ThreadView.jsx was 1743 LOC. Ctx contract and
// behavior preserved exactly -- only where each piece lives has changed.
// R3 will replace ctx with scoped hooks.
import { TaskStatusCardStyles } from './TaskStatusCard.jsx'
import { MessageContextMenu } from './ContextMenu.jsx'

import useThreadMessageStatus from './thread/useThreadMessageStatus.js'
import useThreadResetAgent from './thread/useThreadResetAgent.js'
import useThreadMsgMenu from './thread/useThreadMsgMenu.js'
import useThreadQuickSwitcher from './thread/useThreadQuickSwitcher.js'
import ThreadHeader from './thread/ThreadHeader.jsx'
import FilesPanel from './thread/FilesPanel.jsx'
import VoiceChatHost from './thread/VoiceChatHost.jsx'
import MessageList from './thread/MessageList.jsx'
import VoiceModeBar from './thread/VoiceModeBar.jsx'
import RecordingStatusBar from './thread/RecordingStatusBar.jsx'
import ThreadInputBar from './thread/ThreadInputBar.jsx'
import ThreadSettingsModal from './thread/ThreadSettingsModal.jsx'

export default function ThreadView(ctx) {
  const {
    selectedAgent, setSelectedAgent, onBack,
    messages, setMessages, input, setInput, inputRef, fileInputRef,
    messagesEndRef, loadingMsgs, sending, uploading,
    chatInputFocused, setChatInputFocused,
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    voiceStatus, setVoiceStatus, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted, setVoiceMinimized, voiceMinimizedAgent,
    isRecording, handleMicToggle, micError, isTranscribing,
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    filesOpen, setFilesOpen,
    handleSend, handleKeyDown, handleFileSelection,
    chatNameInput, setChatNameInput,
    envKeys, envKeysLoading, newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue, newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    saveEnvKey, deleteEnvKey,
    worldId, currentUser, agents, VOICE_OPTIONS,
    currentVoice, selectVoice, saveRoomName,
    userProfiles, displayName, sendAgentTextRef,
    userIdentity,
    selectedProject, setInlineProject,
    onSelectAgent, onSelectProject,
    projects,
    allTasks,
    isAgentTyping,
    replyTo, setReplyTo,
    needsVerificationIds,
    lastActionToast,
    handleMessageFollowUp,
    handleMessageNeedsVerification,
    handleMessageResearch,
    handleMessageSendTo,
  } = ctx

  const msgMenuHook = useThreadMsgMenu()
  const switcher = useThreadQuickSwitcher()
  const { respondedSet, awaitingResponse } = useThreadMessageStatus(messages)
  const { resetState, handleResetAgent } = useThreadResetAgent(selectedAgent)

  const selectedAgentRecord = agents?.find((agent) => String(agent?.id) === String(selectedAgent?.id || selectedAgent?.agent_id))
  const selectedAgentPrimarySkill = selectedAgentRecord?.primary_skill || selectedAgent?.primary_skill || 'AI Agent'

  const sortedSwitcherProjects = [...(projects || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      <TaskStatusCardStyles />

      <ThreadHeader
        selectedAgent={selectedAgent}
        selectedAgentPrimarySkill={selectedAgentPrimarySkill}
        setSelectedAgent={setSelectedAgent}
        setMessages={setMessages}
        setInlineProject={setInlineProject}
        onBack={onBack}
        onSelectAgent={onSelectAgent}
        onSelectProject={onSelectProject}
        isVoiceActive={isVoiceActive}
        setIsVoiceActive={setIsVoiceActive}
        setVoiceMinimized={setVoiceMinimized}
        voiceMinimizedAgent={voiceMinimizedAgent}
        isRecording={isRecording}
        handleMicToggle={handleMicToggle}
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

      {filesOpen && <FilesPanel messages={messages} />}

      {isVoiceActive && (
        <VoiceChatHost
          voiceChatRef={voiceChatRef}
          selectedAgent={selectedAgent}
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
        />
      )}

      <MessageList
        messages={messages}
        loadingMsgs={loadingMsgs}
        selectedAgent={selectedAgent}
        currentUser={currentUser}
        displayName={displayName}
        userProfiles={userProfiles}
        allTasks={allTasks}
        respondedSet={respondedSet}
        awaitingResponse={awaitingResponse}
        sending={sending}
        isAgentTyping={isAgentTyping}
        needsVerificationIds={needsVerificationIds}
        messagesEndRef={messagesEndRef}
        sendAgentTextRef={sendAgentTextRef}
        openMsgMenu={msgMenuHook.openMsgMenu}
        startLongPress={msgMenuHook.startLongPress}
        cancelLongPress={msgMenuHook.cancelLongPress}
      />

      {isVoiceActive && (
        <VoiceModeBar
          voiceChatRef={voiceChatRef}
          voiceStatus={voiceStatus}
          voiceTranscriptText={voiceTranscriptText}
          voiceMuted={voiceMuted}
          setVoiceMuted={setVoiceMuted}
          setIsVoiceActive={setIsVoiceActive}
          setVoiceTranscriptText={setVoiceTranscriptText}
        />
      )}

      {(isRecording || isTranscribing) && (
        <RecordingStatusBar
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          recordingElapsed={ctx.recordingElapsed}
          handleMicToggle={handleMicToggle}
          micError={micError}
        />
      )}

      {!isVoiceActive && (
        <ThreadInputBar
          input={input}
          setInput={setInput}
          inputRef={inputRef}
          fileInputRef={fileInputRef}
          chatInputFocused={chatInputFocused}
          setChatInputFocused={setChatInputFocused}
          handleKeyDown={handleKeyDown}
          handleSend={handleSend}
          handleFileSelection={handleFileSelection}
          sending={sending}
          uploading={uploading}
          selectedAgent={selectedAgent}
          replyTo={replyTo}
          setReplyTo={setReplyTo}
          isVoiceActive={isVoiceActive}
          setIsVoiceActive={setIsVoiceActive}
          voiceChatRef={voiceChatRef}
          setVoiceMuted={setVoiceMuted}
          setVoiceTranscriptText={setVoiceTranscriptText}
        />
      )}

      {settingsOpen && (
        <ThreadSettingsModal
          selectedAgent={selectedAgent}
          selectedProject={selectedProject}
          worldId={worldId}
          VOICE_OPTIONS={VOICE_OPTIONS}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          setSettingsOpen={setSettingsOpen}
          chatNameInput={chatNameInput}
          setChatNameInput={setChatNameInput}
          saveRoomName={saveRoomName}
          currentVoice={currentVoice}
          selectVoice={selectVoice}
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
          resetState={resetState}
          handleResetAgent={handleResetAgent}
        />
      )}

      {/* Right-click context menu for messages */}
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
