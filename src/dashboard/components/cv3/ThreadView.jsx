// ThreadView -- agent conversation thread with message list and input
// Extracted from ChatPanel.jsx. Receives all state via ctx props.
import { C } from '../../lib/cv3Colors.js'
import { LinkifyText } from './shared.jsx'
import VoiceChat from '../VoiceChat.jsx'
import ChatMessageRenderer from '../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../TypingIndicatorV2.jsx'

export default function ThreadView(ctx) {
  const {
    selectedAgent, setSelectedAgent, onBack, navigate,
    messages, setMessages, input, setInput, inputRef, fileInputRef,
    messagesEndRef, messagesRef, loadingMsgs, sending, uploading,
    isMobile, chatInputFocused, setChatInputFocused,
    isVoiceActive, setIsVoiceActive, voiceChatRef,
    voiceStatus, setVoiceStatus, voiceVolume, setVoiceVolume,
    voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted, setVoiceMinimized, voiceMinimizedAgent,
    isRecording, handleMicToggle, micError, isTranscribing,
    chatSearchOpen, setChatSearchOpen, chatSearchQuery, setChatSearchQuery,
    chatSearchResults, setChatSearchResults, chatSearchLoading, chatSearchRef,
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    filesOpen, setFilesOpen,
    handleAgentSend, handleAgentKeyDown, handleFileSelection,
    chatNameInput, setChatNameInput,
    envKeys, envKeysLoading, newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue, newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    worldId, currentUser, agents, VOICE_OPTIONS,
    agentVoices, setAgentVoices, currentChatKey,
    userProfiles, displayName, sendAgentTextRef,
    parentUserIdentity, userIdentity,
    voiceMinimized, handleReturnToCall, voiceMsgs,
    searchPerformSearch, selectedProject, inlineProject,
    allTasks,
  } = ctx

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* Thread header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,14,28,0.95)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => {
            if (isVoiceActive) {
              setVoiceMinimized(true)
              voiceMinimizedAgent.current = { type: 'agent', data: selectedAgent }
              setSelectedAgent(null); setMessages([]); onBack?.()
            } else {
              setSelectedAgent(null); setMessages([]); setIsVoiceActive(false); onBack?.()
            }
          }}
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#A0A0A0', fontSize: 18, lineHeight: 1,
          }}
        >
          &#x2190;
        </button>
        {/* Circle avatar with agent initial */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          backgroundColor: selectedAgent.color || '#3B9EFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {(selectedAgent.name || '?')[0].toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 14, fontWeight: 'bold', color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'block',
          }}>{selectedAgent.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <span style={{
              backgroundColor: 'green', borderRadius: '50%',
              width: 8, height: 8, display: 'inline-block', flexShrink: 0, verticalAlign: 'middle',
            }} />
            <span style={{ fontSize: 11, color: C.muted, lineHeight: 1 }}>Online</span>
          </div>
        </div>
        {/* Telephone button in header -- long-form recording mode */}
        <button
          onClick={handleMicToggle}
          title={isRecording ? 'Stop recording' : 'Record voice message'}
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
            border: isRecording ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isRecording ? '#EF4444' : C.muted,
            transition: 'all 0.15s',
          }}
        >
          {isRecording ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
            </svg>
          )}
        </button>
        {/* Files button */}
        <button
          onClick={() => setFilesOpen(o => !o)}
          title="Files shared in this chat"
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: filesOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: filesOpen ? C.text : C.muted,
            transition: 'all 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
        {/* Settings button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setSettingsOpen(o => !o)}
            title="Settings"
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: settingsOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Files panel */}
      {filesOpen && (() => {
        const fileMessages = messages.filter(m => m.attachment_url)
        return (
          <div style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,14,28,0.95)',
            padding: '10px 14px',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Shared Files
            </div>
            {fileMessages.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No files shared in this chat yet.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {fileMessages.map((m, i) => {
                  const isImage = m.file_mime_type && m.file_mime_type.startsWith('image/')
                  const rawName = m.text && m.text.startsWith('Attached file: ')
                    ? m.text.replace('Attached file: ', '').split('\n')[0]
                    : m.file_name || 'File'
                  return (
                    <a
                      key={m.id || i}
                      href={m.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: 'none', flexShrink: 0 }}
                    >
                      {isImage ? (
                        <div style={{
                          width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.03)',
                        }}>
                          <img src={m.attachment_url} alt={rawName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px', borderRadius: 8,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          maxWidth: 180,
                        }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rawName}
                          </span>
                        </div>
                      )}
                    </a>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}

      {/* Hidden VoiceChat for audio logic -- mounts when voice is active */}
      {isVoiceActive && (
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
                // Voice session ended -- ask agent to summarize and create follow-ups
                const voiceMsgs = messagesRef.current?.filter(m => m.source === 'voice') || []
                if (voiceMsgs.length >= 4) {
                  setTimeout(() => {
                    sendAgentText('[Voice conversation just ended] Review our voice conversation above. Post a brief summary of what we discussed and any decisions made. If there are action items or tasks that should be created, create them now. Do not ask for permission -- just summarize and queue any tasks that came up.')
                  }, 1500)
                }
              }
            }}
            onVolumeChange={setVoiceVolume}
          />
        </div>
      )}

      {/* Messages scroll area -- always visible */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>

        {loadingMsgs && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
          </div>
        )}

        {!loadingMsgs && messages.length === 0 && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, paddingTop: 60,
          }}>
            <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={44} />
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
              {selectedAgent.name}
            </span>
            <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
          </div>
        )}

        {messages.map(msg => {
          const isUser = msg.role === 'user'
          const agSenderName = msg.user_name || (isUser ? displayName : null)
          const agSenderInitial = agSenderName ? agSenderName[0].toUpperCase() : 'U'
          const agIsOtherUser = isUser && msg.user_name && msg.user_name !== displayName
          const agSenderColor = isUser ? (agIsOtherUser ? '#7C3AED' : '#2563EB') : selectedAgent?.color || '#3B82F6'
          const agProfile = msg.user_id ? (msg.user_id === currentUser?.id ? { avatar_url: currentUser?.user_metadata?.avatar_url } : userProfiles[msg.user_id]) : null
          const agAvatar = agProfile?.avatar_url || null

          // Checkpoint: agent needs human input (amber card)
          if (msg.source === 'checkpoint') {
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.15)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '85%', minWidth: 200,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Needs Input
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: C.dim, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Inline task card for task-runner lifecycle notifications
          if (msg.source === 'task-runner') {
            const qaMatch = msg.text?.match(/QA:\s*(\d+(?:\.\d+)?)/i)
            const qaScore = qaMatch ? parseFloat(qaMatch[1]) : null
            const isFailed = /fail/i.test(msg.text || '')
            const isStarted = /^task started/i.test(msg.text || '')
            // Extract clean title: first non-empty line
            const taskLines = (msg.text || '').split('\n').filter(l => l.trim())
            const rawTitle = taskLines[0] || ''
            const taskTitle = rawTitle.replace(/^(task\s+(started|complete[d]?|failed|done)[:\s]*)/i, '').trim() || rawTitle
            const taskDesc = taskLines.slice(1).join(' ').trim()
            const headColor = isFailed ? C.red : isStarted ? C.blue : C.accent
            const headBg = isStarted ? 'rgba(96,165,250,0.08)' : C.accentBg
            const headIcon = isFailed ? '!' : isStarted ? '▶' : '✓'
            const headLabel = isFailed ? 'Task Failed' : isStarted ? 'Task Started' : 'Task Complete'
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: C.s1,
                  border: '1px solid ' + C.border,
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '88%',
                }}>
                  {/* mt-head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: headBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: headColor, fontWeight: 800,
                    }}>{headIcon}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: headColor,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>{headLabel}</span>
                  </div>
                  {/* mt-title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{taskTitle}</div>
                  {/* mt-desc */}
                  {taskDesc && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{taskDesc}</div>
                  )}
                  {/* mt-foot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {qaScore !== null ? (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: qaScore >= 8 ? 'rgba(34,197,94,0.12)' : qaScore >= 5 ? 'rgba(234,179,8,0.12)' : 'rgba(239,68,68,0.12)',
                        color: qaScore >= 8 ? C.green : qaScore >= 5 ? C.yellow : C.red,
                      }}>QA {qaScore}/10</span>
                    ) : (
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        fontFamily: "'JetBrains Mono', monospace",
                        background: isFailed ? 'rgba(239,68,68,0.12)' : isStarted ? 'rgba(96,165,250,0.12)' : 'rgba(34,197,94,0.12)',
                        color: isFailed ? C.red : isStarted ? C.blue : C.green,
                      }}>{isFailed ? 'Failed' : isStarted ? 'Building' : 'Done'}</span>
                    )}
                    <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>
                      {msg.agent || selectedAgent?.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(80,100,128,0.55)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Inline task card for task-created notifications (rex announcing a new task)
          if (
            msg.source === 'gemini-chat' &&
            msg.agent === 'rex' &&
            msg.text?.toLowerCase().includes('task created')
          ) {
            const textLines = (msg.text || '').split('\n').filter(l => l.trim())
            const firstLine = textLines[0] || ''
            const titleMatch = firstLine.match(/task created[:\s]+(.+)/i)
            const taskTitle = (titleMatch ? titleMatch[1].trim() : firstLine.replace(/task created/i, '').trim()) || 'New Task'
            const taskDesc = textLines.slice(1).join(' ').trim()
            const agentMatch = msg.text?.match(/(?:assigned to|for agent|agent[:\s]+)\s*([A-Za-z]+)/i)
            const taskAgent = agentMatch ? agentMatch[1] : (selectedAgent?.name || '')
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: C.s1,
                  border: '1px solid ' + C.border,
                  borderRadius: 14,
                  padding: '12px 16px',
                  maxWidth: '88%',
                }}>
                  {/* mt-head */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 6,
                      background: C.accentBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: C.accent, fontWeight: 800,
                    }}>+</div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      color: C.accent,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>Task Created</span>
                  </div>
                  {/* mt-title */}
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{taskTitle}</div>
                  {/* mt-desc */}
                  {taskDesc && (
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{taskDesc}</div>
                  )}
                  {/* mt-foot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      fontFamily: "'JetBrains Mono', monospace",
                      background: 'rgba(234,179,8,0.12)',
                      color: C.yellow,
                    }}>Queued</span>
                    {taskAgent && (
                      <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{taskAgent}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(80,100,128,0.55)', marginTop: 4, fontFamily: "'Inter', sans-serif" }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end',
                gap: 10,
                marginBottom: isUser ? 4 : 12,
              }}
            >
              {!isUser && (
                <div style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                  <AgentAvatar name={selectedAgent.name} color={selectedAgent.color} size={28} />
                </div>
              )}
              <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
                {/* Text bubble -- hidden when text is only the attachment label */}
                {msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: ')) && (
                  <div style={{
                    padding: isUser ? '10px 16px' : '2px 0',
                    borderRadius: isUser ? '18px 18px 4px 18px' : 0,
                    fontSize: 14, lineHeight: 1.6,
                    color: isUser ? '#fff' : '#E2E8F0',
                    background: isUser ? agSenderColor : 'transparent',
                    border: 'none',
                    wordBreak: 'break-word',
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: '-0.01em',
                    ...(isUser ? { whiteSpace: 'pre-wrap' } : {}),
                  }}>
                    {isUser
                      ? <LinkifyText text={msg.text} />
                      : <ChatMessageRenderer content={msg.text} style={{ fontSize: 14, lineHeight: 1.6, color: '#E2E8F0' }} />
                    }
                  </div>
                )}
                {isUser && msg.user_name && msg.user_name !== displayName && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 3, marginTop: -2, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}>
                    {msg.user_name}
                  </div>
                )}
                {/* Attachments -- rendered outside bubble using Steffen's styles */}
                {(() => {
                  const atts = (msg.attachments && msg.attachments.length)
                    ? msg.attachments
                    : msg.attachment_url
                      ? [{
                          url: msg.attachment_url,
                          mime: msg.file_mime_type,
                          size: msg.file_size,
                          name: msg.text && msg.text.startsWith('Attached file: ')
                            ? msg.text.replace('Attached file: ', '')
                            : msg.file_name || null,
                        }]
                      : []
                  if (!atts.length) return null
                  const hasText = msg.text && !(msg.attachment_url && msg.text.startsWith('Attached file: '))
                  const isMulti = atts.length > 1
                  const items = atts.map((att, idx) => {
                    const isImage = att.mime && att.mime.startsWith('image/')
                    if (isImage) {
                      return (
                        <div
                          key={idx}
                          style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            borderRadius: 16,
                            overflow: 'hidden',
                            maxWidth: '70%',
                            cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)' }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                        >
                          <img src={att.url} alt="" style={{ width: '100%', display: 'block', borderRadius: 16 }} />
                        </div>
                      )
                    }
                    return (
                      <div
                        key={idx}
                        style={{
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          background: C.s2,
                          border: '1px solid ' + C.border,
                          borderRadius: 14,
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          maxWidth: '75%',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: C.accentBg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                          color: C.accent,
                          fontSize: 11, fontWeight: 800,
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {att.name ? att.name.split('.').pop().toUpperCase().slice(0, 4) : 'FILE'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 600,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {att.name || 'Attached file'}
                          </div>
                          {att.size != null && (
                            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {att.size < 1024 * 1024
                                ? `${Math.round(att.size / 1024)} KB`
                                : `${(att.size / (1024 * 1024)).toFixed(1)} MB`}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                  if (isMulti) {
                    return (
                      <div style={{ display: 'flex', flexDirection: 'row', gap: 6, padding: '6px 16px', marginTop: hasText ? 6 : 0 }}>
                        {items}
                      </div>
                    )
                  }
                  return <div style={{ marginTop: hasText ? 6 : 0 }}>{items}</div>
                })()}
                <div style={{
                  fontSize: 11, color: 'rgba(120,140,165,0.5)',
                  marginTop: 4,
                  textAlign: isUser ? 'right' : 'left',
                  paddingRight: isUser ? 2 : 0,
                  paddingLeft: isUser ? 0 : 2,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {formatChatTime(msg.timestamp)}
                </div>
              </div>
              {isUser && (
                <div title={agSenderName || 'User'} style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: agAvatar ? 'transparent' : agSenderColor,
                  border: agAvatar ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {agAvatar
                    ? <img src={agAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{agSenderInitial}</span>
                  }
                </div>
              )}
            </div>
          )
        })}
        {sending && (
          <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
            <TypingIndicatorV2
              streaming={true}
              agentColor={selectedAgent?.color || '#3B82F6'}
              agentName={selectedAgent?.name}
              agentSlug={selectedAgent?.slug}
              compact={false}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice mode UI -- replaces input bar when voice is active */}
      {isVoiceActive && (
        <div style={{
          padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          background: C.bg2,
          borderTop: '1px solid ' + C.border,
          flexShrink: 0,
        }}>
          <style>{`
            @keyframes vw { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
            @keyframes recblink { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
          `}</style>
          {/* Waveform bars */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 3, height: 40, marginBottom: 8,
          }}>
            {[
              { h: 14, d: '0s' }, { h: 26, d: '.08s' }, { h: 38, d: '.16s' },
              { h: 30, d: '.24s' }, { h: 18, d: '.32s' }, { h: 34, d: '.12s' },
              { h: 22, d: '.20s' }, { h: 40, d: '.28s' }, { h: 16, d: '.36s' },
            ].map((bar, i) => (
              <div key={i} style={{
                width: 3, height: bar.h, borderRadius: 2,
                background: C.accent,
                animation: `vw 1s ease-in-out ${bar.d} infinite`,
              }} />
            ))}
          </div>
          {/* Status */}
          <div style={{
            textAlign: 'center', fontSize: 12, fontWeight: 600,
            color: C.accent, fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 4,
          }}>
            {voiceStatus === 'connecting' ? 'Connecting...'
              : voiceStatus === 'speaking' ? 'Speaking...'
              : voiceStatus === 'error' ? 'Error'
              : 'Listening...'}
          </div>
          {/* Transcript */}
          <div style={{
            fontSize: 13, color: C.text2, textAlign: 'center',
            minHeight: 18, padding: '0 20px',
          }}>
            {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
          </div>
          {/* Buttons */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
          }}>
            {/* Mute */}
            <button
              onClick={() => {
                voiceChatRef.current?.toggleMute()
                setVoiceMuted(v => !v)
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: '1px solid ' + C.border,
                background: voiceMuted ? 'rgba(239,68,68,0.15)' : C.s2,
                color: voiceMuted ? '#F87171' : C.muted,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
              }}
            >
              M
            </button>
            {/* End */}
            <button
              onClick={() => {
                voiceChatRef.current?.stop()
                setIsVoiceActive(false)
                setVoiceMuted(false)
                setVoiceTranscriptText('')
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: 'none',
                background: C.red, color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, transition: 'transform 0.15s',
              }}
            >
              &#x00D7;
            </button>
          </div>
        </div>
      )}

      {/* Recording status bar (agent chat) */}
      {(isRecording || isTranscribing) && (
        <div style={{
          flexShrink: 0, padding: '8px 16px',
          background: 'rgba(239,68,68,0.06)',
          borderTop: '1px solid rgba(239,68,68,0.15)',
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: isTranscribing ? '#F59E0B' : '#EF4444',
            animation: isTranscribing ? 'none' : 'recDot 1s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 13, color: '#F1F5F9', fontWeight: 500 }}>
            {isTranscribing ? 'Transcribing...' : `Recording ${Math.floor(recordingElapsed / 60)}:${String(recordingElapsed % 60).padStart(2, '0')}`}
          </span>
          {isRecording && (
            <button onClick={handleMicToggle} style={{
              marginLeft: 'auto', fontSize: 12, fontWeight: 600,
              color: '#EF4444', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
              padding: '4px 10px', cursor: 'pointer',
            }}>Stop</button>
          )}
          {micError && <span style={{ fontSize: 12, color: '#F87171', marginLeft: 'auto' }}>{micError}</span>}
        </div>
      )}
      {/* Input area -- CV3 pill design, hidden when voice is active */}
      {!isVoiceActive && <div style={{
        flexShrink: 0,
        padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: '1px solid ' + C.border,
      }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          style={{ display: 'none' }}
          onChange={handleFileSelection}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: C.s1,
          border: '1.5px solid ' + (chatInputFocused ? 'rgba(16,185,129,0.25)' : C.border2),
          borderRadius: 26,
          padding: '5px 5px 5px 16px',
          maxWidth: 560,
          margin: '0 auto',
          boxShadow: chatInputFocused ? '0 0 0 4px rgba(16,185,129,0.06), 0 4px 20px rgba(0,0,0,0.2)' : 'none',
          transition: 'border-color 0.25s, box-shadow 0.25s',
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setChatInputFocused(true)}
            onBlur={() => setChatInputFocused(false)}
            placeholder={`Message ${selectedAgent.name}...`}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: C.text,
              fontSize: 15,
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          />
          {/* Action buttons inside pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Attach */}
            <button
              title="Attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'none', border: 'none',
                color: uploading ? C.accent : C.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s',
              }}
            >
              {uploading ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                </svg>
              )}
            </button>
            {/* Commands */}
            <button title="Commands" onClick={() => {}} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'none', border: 'none',
              color: C.muted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s',
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 17l6-6-6-6"/><line x1="12" y1="19" x2="20" y2="19"/>
              </svg>
            </button>
          </div>
          {/* Mic button (hidden when text present) -- triggers Gemini Live voice chat */}
          {!input.trim() && (
            <button
              title={isVoiceActive ? 'End voice' : 'Start voice'}
              onClick={() => {
                if (isVoiceActive) {
                  voiceChatRef.current?.stop()
                  setIsVoiceActive(false)
                  setVoiceMuted(false)
                  setVoiceTranscriptText('')
                } else {
                  setIsVoiceActive(true)
                }
              }}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: isVoiceActive ? 'rgba(16,185,129,0.15)' : C.accent,
                border: isVoiceActive ? '2px solid rgba(16,185,129,0.4)' : 'none',
                color: isVoiceActive ? C.accent : '#000', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                transition: 'transform 0.15s, background 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            </button>
          )}
          {/* Send button (shown when text present) */}
          {input.trim() && (
            <button
              title="Send"
              onClick={handleSend}
              disabled={sending}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: C.accent, border: 'none',
                color: '#000', cursor: sending ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, opacity: sending ? 0.6 : 1,
                transition: 'transform 0.15s',
              }}
            >
              {sending ? (
                <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.15)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          )}
        </div>
      </div>}

      {/* Chat settings full-screen overlay */}
      {settingsOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
          }}
        >
          {/* Left pane */}
          <div style={{
            width: 220,
            flexShrink: 0,
            background: C.bg2,
            borderRight: '1px solid ' + C.border2,
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid ' + C.border }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>Settings</span>
            </div>
            <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['General', 'Voice', 'Google', 'Keys'].map(item => (
                <button
                  key={item}
                  onClick={() => setSettingsTab(item)}
                  style={{
                    padding: '7px 12px', fontSize: 13,
                    color: settingsTab === item ? C.text : C.text2,
                    fontFamily: "'Inter', sans-serif", borderRadius: 6,
                    background: settingsTab === item ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >{item}</button>
              ))}
            </div>
          </div>
          {/* Right pane */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.s1, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
              borderBottom: '1px solid ' + C.border,
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>
                {settingsTab}
              </span>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{
                  width: 28, height: 28,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid ' + C.border,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: C.text2,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            {/* Modal body */}
            <div style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              overflowY: 'auto',
              flex: 1,
            }}>
              {/* Room rename */}
              {settingsTab === 'General' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Room Name
                </div>
                <input
                  value={chatNameInput}
                  onChange={e => setChatNameInput(e.target.value)}
                  onBlur={e => saveRoomName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { saveRoomName(e.target.value); e.target.blur() } }}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '8px 12px',
                    color: C.text, fontSize: 13,
                    fontFamily: "'Inter', sans-serif", outline: 'none',
                  }}
                />
              </div>
              )}
              {/* Voice selection */}
              {settingsTab === 'Voice' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Voice
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {VOICE_OPTIONS.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      onClick={() => selectVoice(id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                        background: currentVoice === id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${currentVoice === id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: currentVoice === id ? '#60A5FA' : C.text, fontFamily: "'Inter', sans-serif" }}>{label}</div>
                        <div style={{ fontSize: 11, color: C.text2, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                      </div>
                      {currentVoice === id && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              )}
              {/* Google Integration */}
              {settingsTab === 'Google' && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Google Integration
                </div>
                <div style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  marginBottom: 10,
                }}>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                    Connect Google Calendar and Gmail so agents can schedule events and send emails on behalf of this world.
                  </div>
                </div>
                <a
                  href={`/api/google-oauth/authorize?world_id=${encodeURIComponent(worldId)}&scope=both`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '9px 0',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    color: '#fff',
                    background: 'rgba(66,133,244,0.85)',
                    border: '1px solid rgba(66,133,244,0.5)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                    transition: 'background 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  Connect Google Calendar + Gmail
                </a>
              </div>
              )}
              {/* Keys (env_vars keychain) */}
              {settingsTab === 'Keys' && (
              <div style={{ padding: '4px 0 8px' }}>
                {/* Main "KEYS" heading */}
                <div style={{
                  fontSize: TYPE.xl, fontWeight: 700, color: C.text,
                  fontFamily: "'Inter', sans-serif",
                  textTransform: 'uppercase', letterSpacing: LS.caps,
                  lineHeight: LH.tight,
                  marginBottom: 20,
                }}>
                  {selectedProject ? 'Keys' : 'My Keys'}
                </div>
                {envKeysLoading ? (
                  <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body }}>Loading...</div>
                ) : (
                  <>
                    {envKeys.user.length > 0 && (
                      <div style={{ marginBottom: selectedProject ? 20 : 0 }}>
                        {selectedProject && (
                          <div style={{
                            fontSize: TYPE.sm, fontWeight: 600, color: C.muted,
                            fontFamily: "'Inter', sans-serif",
                            textTransform: 'uppercase', letterSpacing: LS.wide,
                            lineHeight: LH.tight,
                            marginBottom: 8,
                          }}>Personal</div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {envKeys.user.map(k => (
                            <div key={k.key} style={{
                              display: 'flex', flexDirection: 'column', gap: 8,
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                            }}>
                              <label style={{
                                fontSize: TYPE.xs, fontWeight: 600, color: C.muted,
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                textTransform: 'uppercase', letterSpacing: LS.wide,
                                lineHeight: LH.tight,
                              }}>{k.key}</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="password"
                                  placeholder="Enter new value to update"
                                  style={{
                                    flex: 1, padding: '6px 10px', fontSize: TYPE.sm,
                                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                                    color: C.text, lineHeight: LH.body,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 6, outline: 'none',
                                  }}
                                />
                                <button onClick={() => deleteEnvKey('user', k.key)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm, fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0 }}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedProject && envKeys.project.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{
                          fontSize: TYPE.sm, fontWeight: 600, color: C.muted,
                          fontFamily: "'Inter', sans-serif",
                          textTransform: 'uppercase', letterSpacing: LS.wide,
                          lineHeight: LH.tight,
                          marginBottom: 8,
                        }}>Project</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {envKeys.project.map(k => (
                            <div key={k.key} style={{
                              display: 'flex', flexDirection: 'column', gap: 8,
                              padding: '10px 12px',
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8,
                            }}>
                              <label style={{
                                fontSize: TYPE.xs, fontWeight: 600, color: C.muted,
                                fontFamily: "'SF Mono', 'Fira Code', monospace",
                                textTransform: 'uppercase', letterSpacing: LS.wide,
                                lineHeight: LH.tight,
                              }}>{k.key}</label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input
                                  type="password"
                                  placeholder="Enter new value to update"
                                  style={{
                                    flex: 1, padding: '6px 10px', fontSize: TYPE.sm,
                                    fontFamily: "'SF Mono', 'Fira Code', monospace",
                                    color: C.text, lineHeight: LH.body,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 6, outline: 'none',
                                  }}
                                />
                                <button onClick={() => deleteEnvKey('project', k.key)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm, fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0 }}>Remove</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {envKeys.user.length === 0 && envKeys.project.length === 0 && (
                      <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, marginBottom: 16 }}>No keys configured yet</div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                      {selectedProject && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['user', 'project'].map(s => (
                            <button key={s} onClick={() => setNewKeyScope(s)} style={{
                              flex: 1, padding: '7px 0', fontSize: TYPE.sm, fontWeight: newKeyScope === s ? 700 : 500,
                              fontFamily: "'Inter', sans-serif",
                              color: newKeyScope === s ? '#fff' : C.muted,
                              background: newKeyScope === s ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${newKeyScope === s ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: 6, cursor: 'pointer', textTransform: 'capitalize',
                            }}>{s}</button>
                          ))}
                        </div>
                      )}
                      <input value={newKeyName} onChange={e => { setNewKeyName(e.target.value); setKeySaveMsg(null) }} placeholder="Key name (e.g. GMAIL_API_KEY)" style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: TYPE.sm,
                        fontFamily: "'SF Mono', 'Fira Code', monospace", color: C.text, lineHeight: LH.body,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, outline: 'none',
                      }} />
                      <input type="password" value={newKeyValue} onChange={e => { setNewKeyValue(e.target.value); setKeySaveMsg(null) }} placeholder="Value" style={{
                        width: '100%', boxSizing: 'border-box', padding: '8px 12px', fontSize: TYPE.sm,
                        fontFamily: "'SF Mono', 'Fira Code', monospace", color: C.text, lineHeight: LH.body,
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8, outline: 'none',
                      }} />
                      <button disabled={!newKeyName.trim() || !newKeyValue.trim()} onClick={saveEnvKey} style={{
                        padding: '8px 0', fontSize: TYPE.sm, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                        color: '#fff', lineHeight: LH.tight,
                        background: (!newKeyName.trim() || !newKeyValue.trim()) ? C.muted : C.accent,
                        border: 'none', borderRadius: 8, cursor: (!newKeyName.trim() || !newKeyValue.trim()) ? 'default' : 'pointer',
                      }}>Save Key</button>
                      {keySaveMsg && (
                        <div style={{ fontSize: TYPE.xs, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, color: keySaveMsg.type === 'ok' ? C.accent : '#F87171' }}>{keySaveMsg.text}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
