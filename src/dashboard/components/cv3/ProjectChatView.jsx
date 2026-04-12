// ProjectChatView -- project conversation thread
// Extracted from ChatPanel.jsx. Receives all state via ctx prop.
import { useState, useEffect } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { TYPE, LH, LS } from '../../lib/typeScale.js'
import { supabase } from '../../lib/supabase.js'
import { LinkifyText, formatChatTime } from './shared.jsx'
import VoiceChat from '../VoiceChat.jsx'
import ChatMessageRenderer from '../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../TypingIndicatorV2.jsx'

export default function ProjectChatView(ctx) {
  // All variables come from ctx (spread from ChatPanel state)
  const {
    projectId, navigate, selectedProject, inlineProject, onBack,
    isVoiceActive, setVoiceMinimized, voiceMinimizedAgent,
    messages, setMessages, setInlineProject, setSelectedAgent,
    isRecording, handleMicToggle, micError, isTranscribing,
    chatSearchOpen, setChatSearchOpen, chatSearchQuery, setChatSearchQuery,
    chatSearchResults, setChatSearchResults, chatSearchLoading, chatSearchRef,
    settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    sending, input, setInput, inputRef, fileInputRef,
    messagesEndRef, messagesRef, loadingMsgs, uploading,
    isMobile, chatInputFocused, setChatInputFocused,
    handleProjectSend, handleProjectKeyDown, handleFileSelection,
    voiceChatRef, voiceStatus, setVoiceStatus,
    voiceVolume, setVoiceVolume, voiceTranscriptText, setVoiceTranscriptText,
    voiceMuted, setVoiceMuted, setIsVoiceActive,
    chatNameInput, setChatNameInput, inviteEmail, setInviteEmail,
    inviteLoading, setInviteLoading, inviteMsg, setInviteMsg,
    collaborators, setCollaborators,
    envKeys, envKeysLoading, newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue, newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    saveEnvKey, deleteEnvKey,
    worldId, currentUser, agents, VOICE_OPTIONS,
    agentVoices, setAgentVoices, currentChatKey,
    currentVoice, selectVoice, saveRoomName,
    userProfiles, isShared, sendProjectTextRef,
    parentUserIdentity, userIdentity,
    voiceMinimized, handleReturnToCall,
    handleChatSearch, voiceMsgs, displayName,
    filesOpen, setFilesOpen,
  } = ctx
  const projColor = selectedProject?.color || '#6B8AB0'
  
  // Project files state
  const [projectFiles, setProjectFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  
  // Fetch project files when files panel opens
  useEffect(() => {
    if (filesOpen && selectedProject?.slug) {
      setFilesLoading(true)
      fetch(`/api/dashboard/files?client=${selectedProject.slug}`)
        .then(res => res.json())
        .then(data => {
          setProjectFiles(data.files || [])
          setFilesLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch project files:', err)
          setProjectFiles([])
          setFilesLoading(false)
        })
    } else {
      setProjectFiles([])
    }
  }, [filesOpen, selectedProject?.slug])

  return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Project chat header */}
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
                // Minimize call instead of killing it
                setVoiceMinimized(true)
                voiceMinimizedAgent.current = { type: 'project', data: selectedProject }
                onBack?.()
                if (projectId) navigate('/dashboard')
              } else {
                setMessages([]); setInlineProject(null); onBack?.(); if (projectId) navigate('/dashboard')
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
          {/* Project color dot */}
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
            border: `1px solid ${projColor}55`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: 3,
              background: projColor,
              boxShadow: `0 0 6px ${projColor}66`,
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 14, fontWeight: 700, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              display: 'block',
            }}>
              {selectedProject?.name || 'Project'}
            </span>
          </div>
          {/* Telephone button in project header */}
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
          {/* Search button */}
          <button
            onClick={() => { setChatSearchOpen(o => !o); setChatSearchQuery(''); setChatSearchResults(null) }}
            title="Search chat history"
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: chatSearchOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: chatSearchOpen ? C.text : C.muted,
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
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
        {filesOpen && (
          <div style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,14,28,0.95)',
            padding: '10px 14px',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Project Files
            </div>
            {filesLoading ? (
              <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>Loading files...</div>
            ) : projectFiles.length === 0 ? (
              <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No files found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {projectFiles.map((file, i) => (
                  <div
                    key={file.id || i}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ fontSize: 12, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {file.filename || file.name || 'Unnamed file'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat search bar */}
        {chatSearchOpen && (
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(8,14,28,0.95)',
          }}>
            <input
              ref={chatSearchRef}
              type="text"
              placeholder="Search all messages..."
              value={chatSearchQuery}
              onChange={e => setChatSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setChatSearchOpen(false); setChatSearchQuery(''); setChatSearchResults(null) } }}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: C.text, fontSize: 13,
                outline: 'none',
              }}
            />
            {chatSearchLoading && <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>Searching...</span>}
            {chatSearchResults && !chatSearchLoading && (
              <span style={{ fontSize: 11, color: C.muted, marginTop: 4, display: 'block' }}>
                {chatSearchResults.length} result{chatSearchResults.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Search results overlay */}
        {chatSearchOpen && chatSearchResults && chatSearchResults.length > 0 && (
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            {chatSearchResults.map((msg, i) => (
              <div key={msg.id || i} style={{
                padding: '8px 10px', borderRadius: 8,
                background: msg.role === 'user' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 3 }}>
                  {msg.role === 'user' ? 'You' : (msg.source || 'Agent')} {' '}
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                </div>
                <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                  {(msg.text || '').substring(0, 300)}{(msg.text || '').length > 300 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages scroll area (hidden when search results showing) */}
        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '12px 14px',
          display: (chatSearchOpen && chatSearchResults && chatSearchResults.length > 0) ? 'none' : 'flex',
          flexDirection: 'column', gap: 6,
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
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `linear-gradient(135deg, ${projColor}44, ${projColor}22)`,
                border: `1px solid ${projColor}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 5,
                  background: projColor,
                  boxShadow: `0 0 10px ${projColor}77`,
                }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
                {selectedProject?.name || 'Project'}
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
            </div>
          )}
          {messages.map(msg => {
            const isUser = msg.role === 'user'
            const senderName = msg.user_name || (isUser ? displayName : null)
            const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
            const isOtherUser = isUser && msg.user_name && msg.user_name !== displayName
            const senderColor = isUser ? (isOtherUser ? '#7C3AED' : '#2563EB') : projColor
            const senderProfile = msg.user_id ? (msg.user_id === currentUser?.id ? { avatar_url: currentUser?.user_metadata?.avatar_url } : userProfiles[msg.user_id]) : null
            const senderAvatar = senderProfile?.avatar_url || null
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
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `linear-gradient(135deg, ${projColor}33, ${projColor}18)`,
                    border: `1px solid ${projColor}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'flex-start', marginTop: 2,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: projColor }} />
                  </div>
                )}
                <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
                  {isUser && isOtherUser && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#A78BFA', textAlign: 'right', marginBottom: 3, fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}>
                      {msg.user_name}
                    </div>
                  )}
                  <div style={{
                    padding: isUser ? '10px 16px' : '2px 0',
                    borderRadius: isUser ? '18px 18px 4px 18px' : 0,
                    fontSize: 14, lineHeight: 1.6,
                    color: isUser ? '#fff' : '#E2E8F0',
                    background: isUser ? senderColor : 'transparent',
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
                  <div style={{
                    fontSize: 11, color: 'rgba(120,140,165,0.4)',
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
                  <div title={senderName || 'User'} style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: senderAvatar ? 'transparent' : senderColor,
                    border: senderAvatar ? '1px solid rgba(255,255,255,0.1)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {senderAvatar
                      ? <img src={senderAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: "'Inter', sans-serif" }}>{senderInitial}</span>
                    }
                  </div>
                )}
              </div>
            )
          })}
          {sending && (
            <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
              <TypingIndicatorV2 streaming={true} agentColor={projColor} compact={false} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Hidden VoiceChat for project -- mounts when voice is active */}
        {isVoiceActive && (
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
        )}

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
            `}</style>
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
            <div style={{
              fontSize: 13, color: C.text2, textAlign: 'center',
              minHeight: 18, padding: '0 20px',
            }}>
              {voiceTranscriptText ? `"${voiceTranscriptText}"` : ''}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'center', gap: 14, marginTop: 10,
            }}>
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

        {/* Project chat input -- CV3 pill design, hidden when voice active */}
        {/* Recording status bar */}
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
        {!isVoiceActive && <div style={{
          flexShrink: 0,
          padding: '8px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          background: C.bg,
          borderTop: '1px solid ' + C.border,
        }}>
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
              onKeyDown={handleProjectKeyDown}
              onFocus={() => setChatInputFocused(true)}
              onBlur={() => setChatInputFocused(false)}
              placeholder={`Message ${selectedProject?.name || 'project'}...`}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
            {!input.trim() && (
              <button
                title={isVoiceActive ? 'End voice' : 'Start voice'}
                onClick={() => setIsVoiceActive(true)}
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: C.accent,
                  border: 'none',
                  color: '#000', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.15s, background 0.2s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="#000"
                  strokeWidth="2.5" strokeLinecap="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0014 0"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>
            )}
            {input.trim() && (
              <button
                title="Send"
                onClick={handleProjectSend}
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
              background: isMobile ? C.s1 : 'rgba(0,0,0,0.85)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            {/* Left pane -- horizontal scroll on mobile, vertical sidebar on desktop */}
            <div style={{
              ...(isMobile
                ? { flexShrink: 0, background: C.bg2, borderBottom: '1px solid ' + C.border2 }
                : { width: 220, flexShrink: 0, background: C.bg2, borderRight: '1px solid ' + C.border2, display: 'flex', flexDirection: 'column' }
              ),
            }}>
              <div style={{
                padding: isMobile ? '12px 16px 0' : '28px 20px 20px',
                ...(!isMobile && { borderBottom: '1px solid ' + C.border }),
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif" }}>Settings</span>
                {isMobile && (
                  <button
                    onClick={() => setSettingsOpen(false)}
                    style={{
                      width: 44, height: 44,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid ' + C.border,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.text2, flexShrink: 0,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
              <div style={{
                padding: isMobile ? '8px 12px 12px' : '12px 8px',
                display: 'flex',
                flexDirection: isMobile ? 'row' : 'column',
                gap: isMobile ? 6 : 2,
                ...(isMobile && { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }),
              }}>
                {['General', 'Voice', ...(selectedProject ? ['Collaborators'] : []), 'Google', 'Keys'].map(item => (
                  <button
                    key={item}
                    onClick={() => setSettingsTab(item)}
                    style={{
                      padding: isMobile ? '8px 16px' : '7px 12px',
                      fontSize: 13,
                      color: settingsTab === item ? C.text : C.text2,
                      fontFamily: "'Inter', sans-serif", borderRadius: 6,
                      background: settingsTab === item ? 'rgba(255,255,255,0.08)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                      whiteSpace: isMobile ? 'nowrap' : 'normal',
                      width: isMobile ? 'auto' : '100%',
                      flexShrink: 0,
                    }}
                  >{item}</button>
                ))}
              </div>
            </div>
            {/* Right pane */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.s1, overflow: 'hidden', minHeight: 0 }}>
              {!isMobile && (
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
                    width: 44, height: 44,
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid ' + C.border,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: C.text2,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              )}
              <div style={{
                padding: isMobile ? '16px 16px' : '24px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? 16 : 20,
                overflowY: 'auto',
                flex: 1,
                WebkitOverflowScrolling: 'touch',
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto', borderRadius: 8 }}>
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
                {/* Collaborators -- only show for projects */}
                {selectedProject && settingsTab === 'Collaborators' && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                      Collaborators
                    </div>
                    {/* Current collaborators */}
                    {collaborators.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {collaborators.map(c => (
                          <div key={c.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 10px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: 8,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                              background: c.avatar_url ? 'transparent' : `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
                              border: c.avatar_url ? '1px solid rgba(255,255,255,0.1)' : 'none',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              overflow: 'hidden',
                            }}>
                              {c.avatar_url
                                ? <img src={c.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{(c.display_name || c.email || c.client_id)[0].toUpperCase()}</span>
                              }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'Inter', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.display_name || c.client_id}
                              </div>
                              {c.email && <div style={{ fontSize: 11, color: C.muted, fontFamily: "'Inter', sans-serif" }}>{c.email}</div>}
                            </div>
                            <span style={{ fontSize: 10, color: C.muted, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {c.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {collaborators.length === 0 && (
                      <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif", marginBottom: 10 }}>
                        No collaborators yet
                      </div>
                    )}
                    {/* Invite input */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={e => { setInviteEmail(e.target.value); setInviteMsg(null) }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && inviteEmail.trim() && !inviteLoading) {
                            setInviteLoading(true)
                            setInviteMsg(null)
                            fetch('/api/dashboard/project-invite', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ project_id: selectedProject.id, email: inviteEmail.trim() }),
                            })
                              .then(r => r.json())
                              .then(data => {
                                if (data.ok) {
                                  setInviteMsg({ type: 'ok', text: `Invited ${data.invited.display_name || data.invited.email}` })
                                  setInviteEmail('')
                                  // Refresh collaborators
                                  fetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
                                    .then(r => r.json()).then(d => { if (d.collaborators) setCollaborators(d.collaborators) })
                                } else {
                                  setInviteMsg({ type: 'err', text: data.error })
                                }
                              })
                              .catch(() => setInviteMsg({ type: 'err', text: 'Failed to invite' }))
                              .finally(() => setInviteLoading(false))
                          }
                        }}
                        placeholder="Invite by email..."
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          fontSize: 13,
                          fontFamily: "'Inter', sans-serif",
                          color: C.text,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        disabled={inviteLoading || !inviteEmail.trim()}
                        onClick={() => {
                          if (!inviteEmail.trim() || inviteLoading) return
                          setInviteLoading(true)
                          setInviteMsg(null)
                          fetch('/api/dashboard/project-invite', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ project_id: selectedProject.id, email: inviteEmail.trim() }),
                          })
                            .then(r => r.json())
                            .then(data => {
                              if (data.ok) {
                                setInviteMsg({ type: 'ok', text: `Invited ${data.invited.display_name || data.invited.email}` })
                                setInviteEmail('')
                                fetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
                                  .then(r => r.json()).then(d => { if (d.collaborators) setCollaborators(d.collaborators) })
                              } else {
                                setInviteMsg({ type: 'err', text: data.error })
                              }
                            })
                            .catch(() => setInviteMsg({ type: 'err', text: 'Failed to invite' }))
                            .finally(() => setInviteLoading(false))
                        }}
                        style={{
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          fontFamily: "'Inter', sans-serif",
                          color: '#fff',
                          background: inviteLoading || !inviteEmail.trim() ? C.muted : C.accent,
                          border: 'none',
                          borderRadius: 8,
                          cursor: inviteLoading || !inviteEmail.trim() ? 'default' : 'pointer',
                          transition: 'background 0.15s',
                          flexShrink: 0,
                        }}
                      >
                        {inviteLoading ? '...' : 'Invite'}
                      </button>
                    </div>
                    {inviteMsg && (
                      <div style={{
                        marginTop: 6, fontSize: 12, fontFamily: "'Inter', sans-serif",
                        color: inviteMsg.type === 'ok' ? C.accent : '#F87171',
                      }}>
                        {inviteMsg.text}
                      </div>
                    )}
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
                      {/* User keys */}
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
                                  <button
                                    onClick={() => deleteEnvKey('user', k.key)}
                                    style={{
                                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm,
                                      fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0,
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Project keys */}
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
                                  <button
                                    onClick={() => deleteEnvKey('project', k.key)}
                                    style={{
                                      background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                      borderRadius: 6, cursor: 'pointer', color: '#F87171', fontSize: TYPE.sm,
                                      fontWeight: 600, fontFamily: "'Inter', sans-serif", padding: '5px 10px', flexShrink: 0,
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {envKeys.user.length === 0 && envKeys.project.length === 0 && (
                        <div style={{ fontSize: TYPE.base, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, marginBottom: 16 }}>
                          No keys configured yet
                        </div>
                      )}
                      {/* Add key form */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                        {selectedProject && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['user', 'project'].map(s => (
                              <button
                                key={s}
                                onClick={() => setNewKeyScope(s)}
                                style={{
                                  flex: 1,
                                  padding: '7px 0',
                                  fontSize: TYPE.sm, fontWeight: newKeyScope === s ? 700 : 500,
                                  fontFamily: "'Inter', sans-serif",
                                  color: newKeyScope === s ? '#fff' : C.muted,
                                  background: newKeyScope === s ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.03)',
                                  border: `1px solid ${newKeyScope === s ? 'rgba(96,165,250,0.5)' : 'rgba(255,255,255,0.08)'}`,
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          value={newKeyName}
                          onChange={e => { setNewKeyName(e.target.value); setKeySaveMsg(null) }}
                          placeholder="Key name (e.g. GMAIL_API_KEY)"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '8px 12px', fontSize: TYPE.sm,
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                            color: C.text, lineHeight: LH.body,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, outline: 'none',
                          }}
                        />
                        <input
                          type="password"
                          value={newKeyValue}
                          onChange={e => { setNewKeyValue(e.target.value); setKeySaveMsg(null) }}
                          placeholder="Value"
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '8px 12px', fontSize: TYPE.sm,
                            fontFamily: "'SF Mono', 'Fira Code', monospace",
                            color: C.text, lineHeight: LH.body,
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, outline: 'none',
                          }}
                        />
                        <button
                          disabled={!newKeyName.trim() || !newKeyValue.trim()}
                          onClick={saveEnvKey}
                          style={{
                            padding: '8px 0', fontSize: TYPE.sm, fontWeight: 600,
                            fontFamily: "'Inter', sans-serif",
                            color: '#fff', lineHeight: LH.tight,
                            background: (!newKeyName.trim() || !newKeyValue.trim()) ? C.muted : C.accent,
                            border: 'none', borderRadius: 8,
                            cursor: (!newKeyName.trim() || !newKeyValue.trim()) ? 'default' : 'pointer',
                          }}
                        >
                          Save Key
                        </button>
                        {keySaveMsg && (
                          <div style={{ fontSize: TYPE.xs, fontFamily: "'Inter', sans-serif", lineHeight: LH.body, color: keySaveMsg.type === 'ok' ? C.accent : '#F87171' }}>
                            {keySaveMsg.text}
                          </div>
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
