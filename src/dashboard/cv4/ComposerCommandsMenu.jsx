// CV4 composer Commands menu — a vivid purple "stars" button that lives
// OUTSIDE the message pill on the left. Click → vertical popover rises
// above the button with every action that used to live in the old
// ThreadHeader actions drawer plus the new image-gen picker.
//
// Surfaces:
//   Image generation → Gemini / Ideogram / OpenAI (sets selectedImageTool)
//   About <agent>     → opens agent profile drawer (super agents)
//   Phone             → toggles voice recording
//   Clear context     → super-agent only, two-step confirm
//   Files             → opens the files panel
//   Recipes           → opens the recipes panel
//   Settings          → opens settings
//
// The menu reads all state from ChatPanel's provider tree, so it works
// inside both ThreadInputBar (agent chat) and ProjectInputBar (project
// chat). Agent-only rows are hidden when there's no selectedAgent.
//
// R5.1 Phase H.

import { useState, useRef, useEffect } from 'react'
import { OVERLAY } from './lib/uiKit.jsx'
import { C } from '../lib/cv3Colors.js'
import { IMAGE_TOOLS } from '../components/cv3/shared/ImageGenPicker.jsx'
import { authFetch } from '../lib/authFetch.js'
import { resetContextMeter } from '../components/cv3/session/ContextFullnessMeter.jsx'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatRecordingCtx,
  useChatSettingsCtx,
} from '../components/cv3/chat/ChatPanelContext.jsx'

const PURPLE = '#A78BFA'
const PURPLE_BG = 'rgba(167,139,250,0.18)'
const PURPLE_RING = 'rgba(167,139,250,0.45)'

export default function ComposerCommandsMenu({
  open,
  setOpen,
  setSelectedImageTool,
}) {
  const wrapRef = useRef(null)
  const [view, setView] = useState('root')

  const { selectedAgent, selectedProject, agents, worldId, resetExchangeCount } = useChatCore()
  const { setMessages } = useChatMessagesCtx()
  const { isRecording, handleMicToggle } = useChatRecordingCtx()
  const {
    filesOpen, setFilesOpen,
    settingsOpen, setSettingsOpen,
    setSettingsTab,
    profileOpen, setProfileOpen,
    recipesOpen, setRecipesOpen,
    canonFilesOpen, setCanonFilesOpen,
    embedModalMission, setEmbedModalMission,
  } = useChatSettingsCtx()

  const selectedAgentRecord = agents?.find(a => String(a?.id) === String(selectedAgent?.id || selectedAgent?.agent_id))
    || agents?.find(a => a?.slug === selectedAgent?.slug)
  const isSuperAgent = Boolean(selectedAgentRecord?.is_super || selectedAgent?.is_super)
  // Tenant EAs (is_ea=true) also get the reset button, not just AOM super-agents.
  // Karen, Tim, Taryn — every tester world's EA — needs a way to clear a stuck
  // bridge session themselves. Without this gate, the row only showed for AOM
  // super-agents and external testers had no reset path.
  const isAgentEa = Boolean(selectedAgentRecord?.is_ea || selectedAgent?.is_ea)
  const canResetAgent = isSuperAgent || isAgentEa
  const hasAgent = Boolean(selectedAgent?.slug)

  const [clearStage, setClearStage] = useState('idle')
  const [defaultRoomConfirm, setDefaultRoomConfirm] = useState(false)

  const currentRoomName = selectedAgent?.name || selectedProject?.name || null
  const currentRoomKind = selectedAgent?.slug ? 'agent' : (selectedProject?.slug ? 'project' : null)
  const currentRoomSlug = selectedAgent?.slug || selectedProject?.slug || null
  const canMakeDefault = Boolean(currentRoomKind && currentRoomSlug)

  function confirmMakeDefaultRoom() {
    if (!canMakeDefault) return
    try {
      window.__cv4SetDefaultView && window.__cv4SetDefaultView({ kind: currentRoomKind, slug: currentRoomSlug })
    } catch (_) {}
    setDefaultRoomConfirm(false)
    setOpen(false)
  }
  async function handleClearContext() {
    if (!selectedAgent?.slug) return
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
    setMessages?.([])
    setClearStage('done')
    setTimeout(() => setClearStage('idle'), 2500)
  }

  useEffect(() => {
    if (!open) {
      setView('root')
      setClearStage('idle')
      return
    }
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, setOpen])

  return (
    <div
      ref={wrapRef}
      data-testid="cv4-commands-menu"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <button
        type="button"
        title="Commands"
        data-testid="cv4-commands-menu-button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: 42, height: 42, borderRadius: '50%',
          background: open
            ? PURPLE_BG
            : 'linear-gradient(135deg, rgba(167,139,250,0.20) 0%, rgba(139,92,246,0.28) 100%)',
          border: open ? `1.5px solid ${PURPLE_RING}` : '1.5px solid rgba(167,139,250,0.30)',
          color: PURPLE,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.15s',
          boxShadow: open
            ? `0 0 0 4px rgba(167,139,250,0.10), 0 4px 14px rgba(124,58,237,0.30)`
            : '0 2px 8px rgba(124,58,237,0.20)',
        }}
      >
        <SparklesIcon />
      </button>

      {open && (
        <div
          data-testid="cv4-commands-menu-popover"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: 0,
            minWidth: 260,
            background: C.s1,
            border: '1px solid ' + C.border2,
            borderRadius: OVERLAY.panelRadius,
            boxShadow: OVERLAY.panelShadow,
            padding: 6,
            zIndex: 50,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          {view === 'root' && (
            <>
              <MenuHeader>Commands</MenuHeader>
              {/* 1. Image generation */}
              <MenuRow
                icon={<ImageIcon />}
                label="Image generation"
                detail="Gemini · Ideogram · OpenAI"
                hasSubmenu
                onClick={() => setView('image-gen')}
                testid="cv4-commands-image-gen"
              />
              {/* 2. Record conversation */}
              <MenuRow
                icon={<PhoneIcon recording={isRecording} />}
                label={isRecording ? 'Stop recording' : 'Record conversation'}
                onClick={() => { handleMicToggle?.(); setOpen(false) }}
                active={isRecording}
                tint={isRecording ? '#EF4444' : null}
                testid="cv4-commands-phone"
              />
              {/* 3. Recipes (agent-scoped) */}
              {hasAgent && (
                <MenuRow
                  icon={<FlaskIcon />}
                  label="Recipes"
                  detail={`What ${selectedAgent.name} can run`}
                  onClick={() => { setRecipesOpen(o => !o); setOpen(false) }}
                  active={recipesOpen}
                  tint={recipesOpen ? '#F9A8D4' : null}
                  testid={`cv4-commands-recipes-${selectedAgent.slug}`}
                />
              )}
              {/* 4. Files in this chat */}
              <MenuRow
                icon={<FilesIcon />}
                label="Files in this chat"
                onClick={() => { setFilesOpen(o => !o); setOpen(false) }}
                active={filesOpen}
                testid="cv4-commands-files"
              />
              {/* 4a. Collaborators (project rooms only) — M11: surfaced
                   out of Settings as a top-level command. Opens the existing
                   Settings modal pre-pointed at the Collaborators tab so
                   the underlying invite UI keeps working. */}
              {selectedProject?.id && (
                <MenuRow
                  icon={<UsersIcon />}
                  label="Collaborators"
                  detail="Invite, view members"
                  onClick={() => {
                    setSettingsTab?.('Collaborators')
                    setSettingsOpen(true)
                    setOpen(false)
                  }}
                  testid={`cv4-commands-collaborators-${selectedProject?.slug || 'project'}`}
                />
              )}
              {/* 4b. Integrations — opens the IntegrationsModal owned by
                   ThreadInputBar / ProjectInputBar via a global event. */}
              <MenuRow
                icon={<PlugIcon />}
                label="Integrations"
                detail="Connect tools and accounts"
                onClick={() => {
                  try { window.dispatchEvent(new Event('cv4:open-integrations')) } catch (_) {}
                  setOpen(false)
                }}
                testid="cv4-commands-integrations"
              />
 {/* 5. About <room name>, agent name in agent chat,
                   project name in project chat. Agents open the
                   AgentProfileOverlay; projects open the canon-files panel
                   (VISION/BUILD/CONTEXT/etc.) which is the canonical
                   "more info about this project" surface. */}
              {(hasAgent || selectedProject?.name) && (
                <MenuRow
                  icon={<InfoIcon />}
                  label={`About ${selectedAgent?.name || selectedProject?.name}`}
                  onClick={() => {
                    if (hasAgent) {
                      setProfileOpen(o => !o)
                    } else {
                      setCanonFilesOpen(o => !o)
                    }
                    setOpen(false)
                  }}
                  active={hasAgent ? profileOpen : canonFilesOpen}
                  testid={`cv4-commands-info-${selectedAgent?.slug || selectedProject?.slug || 'room'}`}
                />
              )}
              {/* Embed this room — opens the embed modal for sharing. */}
              {selectedProject?.id && (
                <MenuRow
                  icon={<EmbedIcon />}
                  label="Embed room"
                  detail="Share this chat"
                  onClick={() => {
                    setEmbedModalMission?.(selectedProject?.slug)
                    setOpen(false)
                  }}
                  testid={`cv4-commands-embed-${selectedProject?.slug || 'project'}`}
                />
              )}
              {/* Super-agent only: clear context. Kept available but rendered
                  as a quieter destructive option above settings. */}
              {hasAgent && canResetAgent && (
                clearStage === 'confirm' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
                    <span style={{ fontSize: 11, color: '#F87171', flex: 1 }}>Clear agent context?</span>
                    <button
                      onClick={handleClearContext}
                      style={{
                        height: 24, padding: '0 8px', borderRadius: 6,
                        background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.4)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#F87171',
                      }}
                    >Yes</button>
                    <button
                      onClick={() => setClearStage('idle')}
                      style={{
                        height: 24, padding: '0 8px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', fontSize: 11, color: C.muted,
                      }}
                    >No</button>
                  </div>
                ) : (
                  <MenuRow
                    icon={<TrashIcon stage={clearStage} />}
                    label={clearStage === 'done' ? 'Context cleared' : 'Clear agent context'}
                    detail={clearStage === 'working' ? 'Working…' : null}
                    onClick={handleClearContext}
                    tint={clearStage === 'done' ? '#6EE7B7' : null}
                    testid={`cv4-commands-clear-${selectedAgent?.slug || 'na'}`}
                  />
                )
              )}
 {/* Make default room, pin the current room as the user's
                  first-paint default. Shows only when there IS a current room. */}
              {canMakeDefault && (
                defaultRoomConfirm ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
                    <span style={{ fontSize: 11, color: '#F9A8D4', flex: 1 }}>
                      Make {currentRoomName} your default?
                    </span>
                    <button
                      onClick={confirmMakeDefaultRoom}
                      style={{
                        height: 24, padding: '0 8px', borderRadius: 6,
                        background: 'rgba(167,139,250,0.18)', border: '1px solid rgba(167,139,250,0.4)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#A78BFA',
                      }}
                    >Yes</button>
                    <button
                      onClick={() => setDefaultRoomConfirm(false)}
                      style={{
                        height: 24, padding: '0 8px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer', fontSize: 11, color: C.muted,
                      }}
                    >No</button>
                  </div>
                ) : (
                  <MenuRow
                    icon={<HomePinIcon />}
                    label="Make default room"
                    detail={'Replace home with ' + currentRoomName}
                    onClick={() => setDefaultRoomConfirm(true)}
                    testid={'cv4-commands-make-default-' + (currentRoomSlug || 'na')}
                  />
                )
              )}
              {/* Footer rule before Settings — visually demotes it to a
                  utility row that fits the brutalist drawer aesthetic. */}
              <div style={{
                height: 1, background: 'rgba(255,255,255,0.06)',
                margin: '6px 8px',
              }} />
              {/* 6. Settings — styled as a quieter footer row in monospace
                  caps to match the rest of the CV4 chrome. */}
              <button
                type="button"
                data-testid="cv4-commands-settings"
                onClick={() => { setSettingsOpen(o => !o); setOpen(false) }}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px',
                  background: settingsOpen ? 'rgba(255,255,255,0.04)' : 'none',
                  border: 'none', borderRadius: 8,
                  color: C.muted,
                  cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = C.text }}
                onMouseLeave={(e) => { e.currentTarget.style.background = settingsOpen ? 'rgba(255,255,255,0.04)' : 'none'; e.currentTarget.style.color = C.muted }}
              >
                <span style={{
                  width: 22, height: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'inherit', flexShrink: 0,
                }}>
                  <SettingsIcon />
                </span>
                <span style={{ flex: 1 }}>Settings</span>
              </button>
            </>
          )}
          {view === 'image-gen' && (
            <>
              <MenuHeader onBack={() => setView('root')}>Image generation</MenuHeader>
              {IMAGE_TOOLS.map(tool => (
                <MenuRow
                  key={tool.id}
                  icon={<ImageIcon />}
                  label={tool.name}
                  detail={tool.detail}
                  onClick={() => {
                    setSelectedImageTool(tool.id)
                    setOpen(false)
                  }}
                  testid={`cv4-commands-image-gen-${tool.id}`}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuHeader({ children, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 10px 8px',
    }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 18, height: 18, borderRadius: '50%',
            background: 'none', border: 'none', color: C.muted,
            cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      )}
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: C.dim,
      }}>{children}</span>
    </div>
  )
}

function MenuRow({ icon, label, detail, hasSubmenu, onClick, testid, active, tint }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: active ? 'rgba(255,255,255,0.04)' : 'none',
        border: 'none', borderRadius: 8,
        color: tint || C.text,
        cursor: 'pointer', textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = active ? 'rgba(255,255,255,0.04)' : 'none' }}
    >
      <span style={{
        width: 28, height: 28, borderRadius: 8,
        background: 'rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: tint || C.muted, flexShrink: 0,
      }}>
        {icon}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {detail && (
          <span style={{ fontSize: 11, color: C.muted, fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail}</span>
        )}
      </span>
      {hasSubmenu && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      )}
    </button>
  )
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" fill="currentColor" fillOpacity="0.25"/>
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z" fill="currentColor" fillOpacity="0.25"/>
      <path d="M5 15l.6 1.6L7.2 17l-1.6.6L5 19l-.6-1.4L2.8 17l1.6-.6z" fill="currentColor" fillOpacity="0.25"/>
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="M21 15l-5-5-9 9" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

function PhoneIcon({ recording }) {
  if (recording) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )
}

function FilesIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function PlugIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2v6"/><path d="M15 2v6"/>
      <path d="M6 8h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5z"/>
      <path d="M12 16v6"/>
    </svg>
  )
}

function FlaskIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M10 3v5.5l-4.5 9a2 2 0 0 0 1.8 2.9h9.4a2 2 0 0 0 1.8-2.9L14 8.5V3"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function HomePinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
      <circle cx="18" cy="9" r="2" fill="currentColor"/>
    </svg>
  )
}

function EmbedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

function TrashIcon({ stage }) {
  if (stage === 'working') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
    )
  }
  if (stage === 'done') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    )
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
    </svg>
  )
}