import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'
import { TYPE, LH, LS } from '../../../lib/typeScale.js'
import { useChatCore, useChatSettingsCtx } from '../chat/ChatPanelContext.jsx'
import AvatarUploader from '../shared/AvatarUploader.jsx'
import SharedRoomSettings from '../shared-rooms/SharedRoomSettings.jsx'
import { MODEL_OPTIONS } from '../chat/chatConstants.js'

// Full-screen settings overlay for the project-chat room. Tabs:
//   General (room name)
//   Voice (voice picker)
//   Members (shared-room ACL) -- only if a project is selected
//   Collaborators (only if a project is selected -- invite by email)
//   Google (calendar + gmail OAuth)
//   Keys (user + project env keys keychain)
// Mobile flips the layout horizontally and shows the tabs as a scrolling strip.
export default function ProjectSettingsModal() {
  const { selectedProject, isMobile, worldId, VOICE_OPTIONS } = useChatCore()
  const {
    settingsTab, setSettingsTab, setSettingsOpen,
    chatNameInput, setChatNameInput, saveRoomName,
    currentVoice, selectVoice,
    currentModel, selectModel,
    globalModel, selectGlobalModel,
    collaborators, setCollaborators,
    inviteEmail, setInviteEmail,
    inviteLoading, setInviteLoading,
    inviteMsg, setInviteMsg,
    envKeys, envKeysLoading,
    newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue,
    newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    saveEnvKey, deleteEnvKey,
  } = useChatSettingsCtx()
  return (
    <div
      data-testid="project-settings-overlay"
      data-mobile={isMobile ? 'true' : 'false'}
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
          {isMobile && (
            <button
              data-testid="project-settings-back"
              onClick={() => setSettingsOpen(false)}
              title="Back"
              aria-label="Back to chat"
              style={{
                width: 36, height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid ' + C.border,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.text, flexShrink: 0,
                fontSize: 20, lineHeight: 1,
                marginRight: 10,
              }}
            >
              &#x2190;
            </button>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", flex: 1 }}>Settings</span>
        </div>
        <div style={{
          padding: isMobile ? '8px 12px 12px' : '12px 8px',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: isMobile ? 6 : 2,
          ...(isMobile && { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }),
        }}>
          {['General', 'Model', 'Voice', ...(selectedProject ? ['Members', 'Collaborators'] : []), 'Google', 'Keys'].map(item => (
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
          {/* R64: project avatar uploader. Click-to-upload sits at the top
              of the General tab, mirroring the agent info avatar slot. */}
          {settingsTab === 'General' && selectedProject?.slug && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
            <AvatarUploader
              world={worldId}
              kind="project"
              slug={selectedProject.slug}
              size={56}
              fallback={(
                <div style={{
                  width: '100%', height: '100%', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${selectedProject.color || '#6B8AB0'}55, ${selectedProject.color || '#6B8AB0'}22)`,
                  border: `1px solid ${selectedProject.color || '#6B8AB0'}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 4,
                    background: selectedProject.color || '#6B8AB0',
                    boxShadow: `0 0 10px ${selectedProject.color || '#6B8AB0'}77`,
                  }} />
                </div>
              )}
            />
            <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif" }}>
              Click to change profile picture
            </div>
          </div>
          )}
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
          {/* Model selection (corner:gemini-workers R3) */}
          {settingsTab === 'Model' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Model
            </div>
            <div style={{ fontSize: 12, color: C.text2, fontFamily: "'Inter', sans-serif", marginBottom: 10, lineHeight: 1.5 }}>
              Which AI answers in this room. Takes effect on your next message — memory carries over.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {MODEL_OPTIONS.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => selectModel(id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                    background: currentModel === id ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${currentModel === id ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: currentModel === id ? '#60A5FA' : C.text, fontFamily: "'Inter', sans-serif" }}>{label}</div>
                    <div style={{ fontSize: 11, color: C.text2, marginTop: 1, fontFamily: "'Inter', sans-serif" }}>{desc}</div>
                  </div>
                  {currentModel === id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                All chats
              </div>
              <div style={{ fontSize: 12, color: C.text2, fontFamily: "'Inter', sans-serif", marginBottom: 8, lineHeight: 1.5 }}>
                {globalModel !== 'default'
                  ? `Every chat is currently running on ${(MODEL_OPTIONS.find(m => m.id === globalModel) || {}).label || globalModel} unless it has its own pick.`
                  : 'Flip every chat at once. A chat with its own pick keeps it.'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => selectGlobalModel(currentModel === 'default' ? 'sonnet' : currentModel)}
                  style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: '#60A5FA', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.35)' }}
                >
                  Use {(MODEL_OPTIONS.find(m => m.id === (currentModel === 'default' ? 'sonnet' : currentModel)) || {}).label || 'this model'} everywhere
                </button>
                {globalModel !== 'default' && (
                  <button
                    onClick={() => selectGlobalModel('default')}
                    style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif", color: C.text2, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    Back to Claude everywhere
                  </button>
                )}
              </div>
            </div>
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
          {/* Members -- shared-room ACL management (R75-d4) */}
          {selectedProject && settingsTab === 'Members' && (
            <SharedRoomSettings
              projectId={selectedProject.id}
              worldId={worldId}
              isOwner={true}
              onClose={() => setSettingsOpen(false)}
            />
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
                      // authFetch on BOTH verbs: project-invite now gates GET
                      // and POST on membership of the world that HOLDS the
                      // project (projects.client_id). Any member of the holder
                      // world can grant and list — it is not an admin gate.
                      authFetch('/api/dashboard/project-invite', {
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
                            authFetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
                              .then(r => r.json()).then(d => { if (d.collaborators) setCollaborators(d.collaborators) })
                          } else {
                            if (data?.error && /no corner account/i.test(data.error)) {
 setInviteMsg({ type: 'err', kind: 'not_in_corner', text: 'That email isn\'t in Corner yet. Self-signup-from-invite is on the roadmap (corner:shared-rooms M12 deep), for now, ask them to sign up first, then come back here to invite them.' })
                          } else {
 setInviteMsg({ type: 'err', text: data.error || 'Server returned no error message, check the Network tab for details.' })
                          }
                          }
                        })
                        .catch((e) => setInviteMsg({ type: 'err', text: `Invite failed: ${e?.message || 'network error'}` }))
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
                    // Same gate as the Enter-key path above — send the session.
                    authFetch('/api/dashboard/project-invite', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ project_id: selectedProject.id, email: inviteEmail.trim() }),
                    })
                      .then(r => r.json())
                      .then(data => {
                        if (data.ok) {
                          setInviteMsg({ type: 'ok', text: `Invited ${data.invited.display_name || data.invited.email}` })
                          setInviteEmail('')
                          authFetch(`/api/dashboard/project-invite?project_id=${selectedProject.id}`)
                            .then(r => r.json()).then(d => { if (d.collaborators) setCollaborators(d.collaborators) })
                        } else {
                          if (data?.error && /no corner account/i.test(data.error)) {
 setInviteMsg({ type: 'err', kind: 'not_in_corner', text: 'That email isn\'t in Corner yet. Self-signup-from-invite is on the roadmap (corner:shared-rooms M12 deep), for now, ask them to sign up first, then come back here to invite them.' })
                          } else {
 setInviteMsg({ type: 'err', text: data.error || 'Server returned no error message, check the Network tab for details.' })
                          }
                        }
                      })
                      .catch((e) => setInviteMsg({ type: 'err', text: `Invite failed: ${e?.message || 'network error'}` }))
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
  )
}