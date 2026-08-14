import { useState } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatVoiceCtx,
  useChatRecordingCtx,
  useChatSettingsCtx,
} from '../chat/ChatPanelContext.jsx'
import useThreadQuickSwitcher from './useThreadQuickSwitcher.js'
import ContextFullnessMeter, { resetContextMeter } from '../session/ContextFullnessMeter.jsx'
import StorageQuotaMeter from '../session/StorageQuotaMeter.jsx'
import OnboardingResumeCTA from '../session/OnboardingResumeCTA.jsx'
import HeaderActionsDrawer from '../shared/HeaderActionsDrawer.jsx'

// Thread header: back button, agent avatar + name + quick switcher, mic/files/settings buttons.
export default function ThreadHeader() {
  const {
    selectedAgent, setSelectedAgent,
    agents, projects,
    onBack, onSelectAgent, onSelectProject,
    setInlineProject,
    worldId,
    resetExchangeCount,
  } = useChatCore()
  const { setMessages } = useChatMessagesCtx()

  const [clearStage, setClearStage] = useState('idle') // idle | confirm | working | done

  async function handleClearContext() {
    if (clearStage === 'idle') { setClearStage('confirm'); return }
    if (clearStage !== 'confirm') return
    setClearStage('working')
    try {
      await authFetch('/api/dashboard/clear-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent: selectedAgent.slug, client_id: worldId || 'aom' }),
      })
    } catch (_) {}
    resetExchangeCount?.()
    resetContextMeter(selectedAgent?.slug)
    setClearStage('done')
    setTimeout(() => setClearStage('idle'), 2500)
  }
  const {
    isVoiceActive, setIsVoiceActive,
    setVoiceMinimized, voiceMinimizedAgent,
  } = useChatVoiceCtx()
  const { isRecording, handleMicToggle } = useChatRecordingCtx()
  const {
    filesOpen, setFilesOpen, settingsOpen, setSettingsOpen,
    profileOpen, setProfileOpen,
    recipesOpen, setRecipesOpen,
    currentModel, globalModel,
  } = useChatSettingsCtx()
  // Model badge (corner:gemini-workers R4): which brain answers this room.
  // Effective = per-chat pick, else the all-chats switch, else default Claude.
  const effectiveModel = (currentModel && currentModel !== 'default')
    ? currentModel
    : (globalModel && globalModel !== 'default' ? globalModel : 'default')
  const modelBadgeLabel = {
    default: 'Claude', opus: 'Claude Opus', sonnet: 'Claude Sonnet',
    haiku: 'Claude Haiku', 'gemini-3.5-flash': 'Gemini 3.5 Flash',
    'gemini-3.1-pro': 'Gemini 3.1 Pro',
  }[effectiveModel] || effectiveModel
  const modelBadgeIsGemini = effectiveModel.startsWith('gemini')

  const { switcherOpen, setSwitcherOpen, switcherRef } = useThreadQuickSwitcher()

  const selectedAgentRecord = agents?.find((agent) => String(agent?.id) === String(selectedAgent?.id || selectedAgent?.agent_id))
    || agents?.find((agent) => agent?.slug === selectedAgent?.slug)
  const selectedAgentPrimarySkill = selectedAgentRecord?.primary_skill || selectedAgent?.primary_skill || 'AI Agent'
  // R27e: selectedAgent may be a stale snapshot captured from a click that
  // fired before agents finished loading (is_super would be false). Fall
  // back to the fresh record from the agents array so the clear-context
  // button renders correctly for super agents.
  const isSuperAgent = Boolean(selectedAgentRecord?.is_super || selectedAgent?.is_super)

  const sortedSwitcherProjects = [...(projects || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  )

  return (
    <div data-role="thread-header" style={{
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
      {/* Agent info + quick-switcher */}
      <div ref={switcherRef} style={{ flex: 1, minWidth: 0, position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
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
        <button
          onClick={() => setSwitcherOpen(o => !o)}
          style={{
            flex: 1, minWidth: 0, background: 'none', border: 'none',
            cursor: 'pointer', textAlign: 'left', padding: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontSize: 14, fontWeight: 'bold', color: 'white',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {selectedAgent.name}
            </span>
            <span
              data-testid="model-badge"
 title="The AI model answering this chat, change it in Settings → Model"
              style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
                padding: '2px 6px', borderRadius: 999, flexShrink: 0,
                textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                color: modelBadgeIsGemini ? '#60A5FA' : C.muted,
                background: modelBadgeIsGemini ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${modelBadgeIsGemini ? 'rgba(96,165,250,0.35)' : 'rgba(255,255,255,0.10)'}`,
              }}
            >
              {modelBadgeLabel}
            </span>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
              style={{ flexShrink: 0, transform: switcherOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <span style={{
            fontSize: 11, color: C.muted, fontStyle: 'italic', lineHeight: 1.3,
            display: 'block', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {selectedAgentPrimarySkill}
          </span>
        </button>

        {/* Quick-switcher dropdown */}
        {switcherOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            width: 260,
            maxHeight: 360,
            overflowY: 'auto',
            background: C.s1,
            border: `1px solid ${C.border2}`,
            borderRadius: 12,
            padding: 6,
            zIndex: 200,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}>
            {/* Agents section */}
            <div style={{
              fontSize: 10, fontWeight: 700, color: C.dim,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              padding: '6px 8px 4px',
            }}>
              Agents
            </div>
            {(agents || []).map(agent => (
              <button
                key={`sw-a-${agent.slug}`}
                onClick={() => {
                  setSwitcherOpen(false)
                  if (agent.slug !== selectedAgent?.slug) {
                    setSelectedAgent(agent)
                    setMessages([])
                    onSelectAgent?.(agent)
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 8px',
                  borderRadius: 8,
                  background: agent.slug === selectedAgent?.slug ? 'rgba(16,185,129,0.1)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (agent.slug !== selectedAgent?.slug) e.currentTarget.style.background = C.s2 }}
                onMouseLeave={e => { if (agent.slug !== selectedAgent?.slug) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: agent.color || C.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 10, color: '#000',
                }}>
                  {(agent.name || '?')[0].toUpperCase()}
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 600, color: C.text,
                  fontFamily: "'Inter', sans-serif",
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {agent.name}
                </span>
                {agent.slug === selectedAgent?.slug && (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}

            {/* Projects section */}
            {sortedSwitcherProjects.length > 0 && (
              <>
                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 8px' }} />
                <div style={{
                  fontSize: 10, fontWeight: 700, color: C.dim,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '6px 8px 4px',
                }}>
                  Projects
                </div>
                {sortedSwitcherProjects.map(project => {
                  const pColor = project.color || '#6B8AB0'
                  return (
                    <button
                      key={`sw-p-${project.id || project.slug}`}
                      onClick={() => {
                        setSwitcherOpen(false)
                        setSelectedAgent(null)
                        setMessages([])
                        setInlineProject(project)
                        onSelectProject?.(project)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '8px 8px',
                        borderRadius: 8,
                        background: 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.s2 }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                        background: `linear-gradient(135deg, ${pColor}44, ${pColor}22)`,
                        border: `1px solid ${pColor}33`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: pColor }} />
                      </div>
                      <span style={{
                        fontSize: 13, fontWeight: 600, color: C.text,
                        fontFamily: "'Inter', sans-serif",
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {project.name}
                      </span>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
      {/* R75-d2: resume voice onboarding when has_completed_onboarding=false + checkpoint saved */}
      <OnboardingResumeCTA />
      {/* R60 (session 20): drawer holds every action including phone.
          Context meter lives OUTSIDE the drawer via `outsideWhenClosed`:
          visible full-time when drawer is closed, hides when drawer opens
          so it doesn't fight the action tray for space. */}
      <HeaderActionsDrawer
        testid={`thread-header-drawer-${selectedAgent?.slug || 'unknown'}`}
        outsideWhenClosed={selectedAgent?.slug ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ContextFullnessMeter agentSlug={selectedAgent.slug} />
            <StorageQuotaMeter world={worldId || 'aom'} />
          </div>
        ) : null}
      >
        {/* Info (R40) */}
        {selectedAgent?.slug && (
          <button
            onClick={() => setProfileOpen(o => !o)}
            data-testid={`agent-info-${selectedAgent.slug}`}
            title={`About ${selectedAgent.name}`}
            aria-label={`About ${selectedAgent.name}`}
            aria-pressed={profileOpen ? 'true' : 'false'}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: profileOpen ? 'rgba(59,158,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${profileOpen ? 'rgba(59,158,255,0.45)' : 'rgba(255,255,255,0.08)'}`,
              color: profileOpen ? '#3B9EFF' : C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: 14, fontWeight: 700, lineHeight: 1,
              transition: 'all 0.15s',
            }}
          >
            i
          </button>
        )}
        {/* R60: telephone moves INTO drawer (previously primary outside).
            Context-meter-outside is the one always-on indicator. */}
        <button
          data-testid="chat-header-phone"
          onClick={handleMicToggle}
          title={isRecording ? 'Stop recording' : 'Record voice message'}
          aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
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
        {/* Clear context (super agents only) */}
        {isSuperAgent && (
          clearStage === 'confirm' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#F87171', whiteSpace: 'nowrap' }}>Clear context?</span>
              <button
                onClick={handleClearContext}
                style={{
                  height: 26, padding: '0 8px', borderRadius: 6, flexShrink: 0,
                  background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.4)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#F87171',
                }}
              >Yes</button>
              <button
                onClick={() => setClearStage('idle')}
                style={{
                  height: 26, padding: '0 8px', borderRadius: 6, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', fontSize: 11, color: C.muted,
                }}
              >No</button>
            </div>
          ) : (
            <button
              onClick={handleClearContext}
              title={clearStage === 'done' ? 'Context cleared' : 'Clear agent context'}
              data-testid={`clear-context-${selectedAgent?.slug}`}
              style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: clearStage === 'done' ? 'rgba(16,185,129,0.15)' : clearStage === 'working' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                border: clearStage === 'done' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                cursor: clearStage === 'working' ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: clearStage === 'done' ? '#6EE7B7' : C.muted,
                transition: 'all 0.15s',
              }}
            >
              {clearStage === 'working' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : clearStage === 'done' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                </svg>
              )}
            </button>
          )
        )}
        {/* Files */}
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
        {/* Flask / recipes (R41) */}
        {selectedAgent?.slug && (
          <button
            onClick={() => setRecipesOpen(o => !o)}
            data-testid={`agent-recipes-${selectedAgent.slug}`}
            title={`Recipes ${selectedAgent.name} can run`}
            aria-label={`Recipes for ${selectedAgent.name}`}
            aria-pressed={recipesOpen ? 'true' : 'false'}
            style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: recipesOpen ? 'rgba(249,168,212,0.15)' : 'rgba(255,255,255,0.05)',
              border: recipesOpen ? '1px solid rgba(249,168,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: recipesOpen ? '#F9A8D4' : C.muted,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3h6M10 3v5.5l-4.5 9a2 2 0 0 0 1.8 2.9h9.4a2 2 0 0 0 1.8-2.9L14 8.5V3" />
            </svg>
          </button>
        )}
        {/* Settings */}
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
      </HeaderActionsDrawer>
    </div>
  )
}