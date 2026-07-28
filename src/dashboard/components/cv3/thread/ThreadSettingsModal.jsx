import { C } from '../../../lib/cv3Colors.js'
import { TYPE, LH, LS } from '../../../lib/typeScale.js'
import { RESETTABLE_AGENTS } from './threadConstants.js'
import { MODEL_OPTIONS } from '../chat/chatConstants.js'
import {
  useChatCore,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'
import useThreadResetAgent from './useThreadResetAgent.js'

// Full-screen chat-settings overlay: General (rename), Voice, Google,
// Keys (env_vars keychain), and Control (hard-reset the agent's tmux).
// Control tab only renders for agents in RESETTABLE_AGENTS.
// R47 (2026-04-22 session 18): mobile layout collapses the 220px left
// pane into a horizontal tab strip and adds a prominent back arrow in
// the header so there's always a visible escape path from a 390px
// iPhone webapp.
export default function ThreadSettingsModal() {
  const { selectedAgent, selectedProject, worldId, VOICE_OPTIONS, isMobile } = useChatCore()
  const {
    settingsTab, setSettingsTab, setSettingsOpen,
    chatNameInput, setChatNameInput, saveRoomName,
    currentVoice, selectVoice,
    currentModel, selectModel,
    globalModel, selectGlobalModel,
    envKeys, envKeysLoading,
    newKeyName, setNewKeyName,
    newKeyValue, setNewKeyValue,
    newKeyScope, setNewKeyScope,
    keySaveMsg, setKeySaveMsg,
    saveEnvKey, deleteEnvKey,
  } = useChatSettingsCtx()
  const { resetState, handleResetAgent } = useThreadResetAgent(selectedAgent, worldId)

  const isResettable = RESETTABLE_AGENTS.has(selectedAgent?.slug)
  const settingsTabs = isResettable
    ? ['General', 'Model', 'Voice', 'Google', 'Keys', 'Control']
    : ['General', 'Model', 'Voice', 'Google', 'Keys']

  return (
    <div
      data-testid="thread-settings-overlay"
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
      {/* Left pane (desktop) / top strip (mobile) */}
      <div style={{
        ...(isMobile
          ? { width: '100%', flexShrink: 0 }
          : { width: 220, flexShrink: 0, borderRight: '1px solid ' + C.border2 }),
        background: C.bg2,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: isMobile ? '12px 14px' : '28px 20px 20px',
          ...(!isMobile && { borderBottom: '1px solid ' + C.border }),
        }}>
          {isMobile && (
            <button
              data-testid="thread-settings-back"
              onClick={() => setSettingsOpen(false)}
              title="Back"
              aria-label="Back to chat"
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid ' + C.border,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.text, fontSize: 20, lineHeight: 1,
              }}
            >
              &#x2190;
            </button>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "'Inter', sans-serif", flex: 1 }}>Settings</span>
        </div>
        <div
          data-testid="thread-settings-tabs"
          style={{
            padding: isMobile ? '8px 12px 12px' : '12px 8px',
            display: 'flex',
            flexDirection: isMobile ? 'row' : 'column',
            gap: isMobile ? 6 : 2,
            ...(isMobile && { overflowX: 'auto', WebkitOverflowScrolling: 'touch' }),
          }}
        >
          {settingsTabs.map(item => (
            <button
              key={item}
              onClick={() => setSettingsTab(item)}
              data-testid={`thread-settings-tab-${item.toLowerCase()}`}
              style={{
                padding: isMobile ? '8px 16px' : '7px 12px', fontSize: 13,
                color: settingsTab === item ? C.text : C.text2,
                fontFamily: "'Inter', sans-serif", borderRadius: 6,
                background: settingsTab === item ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                whiteSpace: isMobile ? 'nowrap' : 'normal',
                width: isMobile ? 'auto' : '100%',
                flexShrink: 0,
              }}
            >{item}</button>
          ))}
        </div>
      </div>
      {/* Right pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.s1, overflow: 'hidden' }}>
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
              data-testid="thread-settings-close"
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
        )}
        {/* Modal body */}
        <div style={{
          padding: isMobile ? '16px 16px' : 24,
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 16 : 20,
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
          {/* Model selection (corner:gemini-workers R3) — which brain answers
              this chat. Saved per chat key; the bridge reads it per message. */}
          {settingsTab === 'Model' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Model
            </div>
            <div style={{ fontSize: 12, color: C.text2, fontFamily: "'Inter', sans-serif", marginBottom: 10, lineHeight: 1.5 }}>
              Which AI answers in this chat. Takes effect on your next message — memory carries over.
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
          {/* Control tab: hard-reset the agent's tmux session.
              Routes through Supabase -> supabase-listener -> signal file
              -> relay-keepalive (the single owner of session lifecycle). */}
          {settingsTab === 'Control' && isResettable && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.text2, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Reset Agent
            </div>
            <div style={{
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
              marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
                Hard-kills the tmux session for <strong style={{ color: C.text }}>{selectedAgent?.name || selectedAgent?.slug}</strong> and relaunches Claude fresh. Use this if the agent is stuck, hung, or unresponsive. Any attached terminal will be detached.
              </div>
            </div>
            <button
              onClick={handleResetAgent}
              disabled={resetState.phase === 'resetting'}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: '#fff',
                background: resetState.phase === 'confirming' ? '#DC2626'
                          : resetState.phase === 'resetting' ? C.muted
                          : resetState.phase === 'success' ? '#16A34A'
                          : '#B91C1C',
                border: 'none',
                borderRadius: 8,
                cursor: resetState.phase === 'resetting' ? 'default' : 'pointer',
              }}
            >
              {resetState.phase === 'idle' && 'Reset Agent'}
              {resetState.phase === 'confirming' && 'Click again to confirm'}
              {resetState.phase === 'resetting' && 'Resetting...'}
              {resetState.phase === 'success' && 'Reset queued'}
              {resetState.phase === 'error' && 'Failed - click to retry'}
            </button>
            {resetState.message && (
              <div style={{
                marginTop: 10,
                fontSize: 12,
                fontFamily: "'Inter', sans-serif",
                color: resetState.phase === 'error' ? '#F87171' : C.text2,
              }}>
                {resetState.message}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
