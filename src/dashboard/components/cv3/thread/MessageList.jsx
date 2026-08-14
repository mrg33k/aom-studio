import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { C } from '../../../lib/cv3Colors.js'
import { LinkifyText, AgentAvatar, formatChatTime } from '../shared.jsx'
import ChatMessageRenderer from '../../ChatMessageRenderer.jsx'
import { TypingIndicatorV2 } from '../../TypingIndicatorV2.jsx'
import StepThread from '../shared/StepThread.jsx'
import useSyntheticChain from '../shared/useSyntheticChain.js'
import { renderTaskCardForMessage } from '../TaskStatusCard.jsx'
import { NeedsVerificationBadge, MessageContextMenu, MobileActionSheet } from '../ContextMenu.jsx'
import MessageChecks from './MessageChecks.jsx'
import MessageStatusLabel from './MessageStatusLabel.jsx'
import SummaryMessage from './SummaryMessage.jsx'
import useThreadMsgMenu from './useThreadMsgMenu.js'
import useThreadMessageStatus from './useThreadMessageStatus.js'
import {
  useChatCore,
  useChatMessagesCtx,
  useChatSendCtx,
  useChatSearchCtx,
  useChatContextMenuCtx,
} from '../chat/ChatPanelContext.jsx'

// AttachmentPreview -- email-style modal that opens any chat attachment in
// place. Image/video/audio/pdf render directly; text files fetch and render;
// Office docs go through view.officeapps.live.com; everything else gets a
// clean download button. Triggered by clicking a file card or image in chat
// instead of the old window.open new-tab pattern (R79-f15, 2026-05-25).
function AttachmentPreview({ att, onClose }) {
  const [textBody, setTextBody] = useState(null)
  const url = att?.url || ''
  // inlineText: content carried on the att itself (e.g. a support email body)
  // — rendered directly, no URL or fetch involved (corner:support-desk M18).
  const inlineText = att?.inlineText || null
  const name = att?.name || (url ? decodeURIComponent(url.split('/').pop().split('?')[0]) : 'file')
  const mime = (att?.mime || '').toLowerCase()
  const ext = (name.split('.').pop() || '').toLowerCase()

  const isImage  = !inlineText && (mime.startsWith('image/') || ['png','jpg','jpeg','gif','webp','svg','bmp','heic'].includes(ext))
  const isVideo  = !inlineText && (mime.startsWith('video/') || ['mp4','mov','webm','mkv','avi','m4v'].includes(ext))
  const isAudio  = !inlineText && (mime.startsWith('audio/') || ['mp3','wav','m4a','flac','aac','ogg'].includes(ext))
  const isPdf    = !inlineText && (mime === 'application/pdf' || ext === 'pdf')
  const isOffice = !inlineText && ['pptx','ppt','docx','doc','xlsx','xls'].includes(ext)
  const isText   = !!inlineText || (
    mime.startsWith('text/') ||
    mime === 'application/json' || mime === 'application/xml' || mime === 'application/yaml' ||
    ['md','txt','csv','json','yaml','yml','py','js','jsx','ts','tsx','html','xml','log','css','sh'].includes(ext)
  )

  useEffect(() => {
    if (inlineText || !isText || !url) return
    setTextBody(null)
    fetch(url)
      .then(r => r.ok ? r.text() : 'Could not load file.')
      .then(setTextBody)
      .catch(() => setTextBody('Could not load file.'))
  }, [url, isText, inlineText])

  // Escape-to-close at the document level. The old onKeyDown on the backdrop
  // div only fired when that div held focus, which it almost never did — the
  // "attachments are hard to close out of" bug (corner:support-desk M18).
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!att) return null

  const officeSrc = isOffice
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : null

  return (
    <div
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose() }}
      tabIndex={-1}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(5,10,20,0.92)', backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          margin: '40px auto', width: 'min(1100px, 92vw)',
          maxHeight: 'calc(100vh - 80px)',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(15,23,42,0.85)',
          border: `1px solid ${C.border2}`,
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 20px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <span style={{
            flex: 1, minWidth: 0,
            fontSize: 14, color: C.text, fontFamily: "'Inter', sans-serif",
            fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{name}</span>
          {url && <a href={url} download={name} style={{
            fontSize: 12, color: C.text2, textDecoration: 'none',
            padding: '6px 12px', border: `1px solid ${C.border2}`, borderRadius: 6,
            fontFamily: "'Inter', sans-serif",
          }}>Download</a>}
          {url && <a href={url} target="_blank" rel="noopener noreferrer" style={{
            fontSize: 12, color: C.text2, textDecoration: 'none',
            padding: '6px 12px', border: `1px solid ${C.border2}`, borderRadius: 6,
            fontFamily: "'Inter', sans-serif",
          }}>Open in new tab</a>}
          <button onClick={onClose} aria-label="Close preview" title="Close (Esc)" style={{
            background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border2}`,
            borderRadius: 8, color: C.text, cursor: 'pointer',
            fontSize: 16, lineHeight: 1, padding: '8px 12px', flexShrink: 0,
          }}>{'\u2715'}</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isImage && (
            <img src={url} alt={name} style={{ maxWidth: '100%', maxHeight: '80vh', display: 'block' }} />
          )}
          {isVideo && (
            <video src={url} controls autoPlay style={{ width: '100%', maxHeight: '80vh', background: '#000' }} />
          )}
          {isAudio && (
            <div style={{ padding: 32, width: '100%', maxWidth: 480 }}>
              <audio src={url} controls autoPlay style={{ width: '100%' }} />
            </div>
          )}
          {isPdf && (
            <iframe src={url} title={name} style={{ width: '100%', height: '85vh', border: 'none', background: '#fff' }} />
          )}
          {isOffice && (
            <iframe src={officeSrc} title={name} style={{ width: '100%', height: '85vh', border: 'none', background: '#fff' }} />
          )}
          {isText && (
            <div style={{
              padding: '20px 28px', width: '100%',
              fontSize: 13, color: C.text2,
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6,
              alignSelf: 'stretch',
            }}>{inlineText != null ? inlineText : (textBody == null ? 'Loading...' : textBody)}</div>
          )}
          {!isImage && !isVideo && !isAudio && !isPdf && !isOffice && !isText && (
            <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>
              <div style={{ fontSize: 14, marginBottom: 12 }}>No inline preview for this file type.</div>
              <a href={url} download={name} style={{
                display: 'inline-block', padding: '8px 16px',
                background: C.accent, color: '#000',
                borderRadius: 6, fontSize: 13, fontWeight: 600,
                textDecoration: 'none', fontFamily: "'Inter', sans-serif",
              }}>Download {name}</a>
            </div>
          )}
        </div>
        {/* Sticky bottom close bar — always visible on mobile/long content so
            users aren't stranded without a dismiss affordance when scrolled
            past the header X button (corner:support-desk M18+). */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '12px 20px',
          borderTop: `1px solid ${C.border}`,
          flexShrink: 0,
          background: 'rgba(15,23,42,0.9)',
        }}>
          <button
            onClick={onClose}
            aria-label="Close preview"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${C.border2}`,
              borderRadius: 10,
              color: C.text,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '-0.01em',
              padding: '10px 40px',
              transition: 'background 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = C.border2 }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}


// parseSupportWish — recognizes the support-desk pipeline drop
// ('[SUPPORT WISH SUP-XXXX] from Name <email> (source):\n\nbody') so chat can
// render a compact email card instead of the raw email body in the bubble
// (corner:support-desk M18, 2026-06-11).
function parseSupportWish(text) {
  if (!text || !text.startsWith('[SUPPORT WISH ')) return null
  const m = /^\[SUPPORT WISH (SUP-[A-Z0-9]+)\] from ([^]*?) \(([\w-]+)\):\n+([^]*)$/.exec(text)
  if (!m) return null
  const code = m[1], source = m[3]
  // staged_draft routing tokens are dashboard plumbing — never user-visible
  const body = m[4].replace(/\n*\[staged_draft:[^\]]+\]\s*/g, '\n').trim()
  const from = m[2].replace(/\s+/g, ' ').trim()
  const fromName = (from.split('<')[0] || '').trim() || from
  const firstLine = body.split('\n').map(l => l.trim()).find(Boolean) || '(no subject)'
  const subject = firstLine.length > 110 ? firstLine.slice(0, 107) + '…' : firstLine
  return { code, from, fromName, source, body, subject }
}

// parseMailRoomContext — recognises mail-room chat messages that begin with
// '[Mail Room context — ...]' (both the reply-to-email format from useChatSend
// and the discuss-support-email format from SupportDashboard). Extracts the
// structured header so the chat can render a compact pill instead of dumping
// the full message body — the same principle as parseSupportWish for [SUPPORT
// WISH ...] messages (corner:support-desk, post-M18 follow-up).
function parseMailRoomContext(text) {
 if (!text || !text.startsWith('[Mail Room context, ')) return null
  // The first line is the bracket header, e.g.
  // '[Mail Room context — the user wants to reply to this email]'
  // '[Mail Room context — discuss this support email]'
  const contextType = text.includes('discuss') ? 'discuss' : 'reply'

  const fromM  = /^From: (.+)$/m.exec(text)
  const subjM  = /^Subject: (.+)$/m.exec(text)
  const prevM  = /^Preview: (.+)$/m.exec(text)

  const from     = fromM ? fromM[1].trim() : ''
  const fromName = (from.split('<')[0] || '').trim() || from
  const subject  = subjM ? subjM[1].trim() : '(no subject)'
  const preview  = prevM ? prevM[1].trim() : ''

  // Separate user's own text (appended after '---\n' in the reply format).
  const sepIdx  = text.indexOf('\n---\n')
  const userText = sepIdx !== -1 ? text.slice(sepIdx + 5).trim() : ''

  // Build a clean context body for the overlay — strip the routing
  // instruction lines so the user sees email content, not system prompts.
  const fullContext = text

  return { contextType, from, fromName, subject, preview, userText, fullContext }
}

// SupportEmailCard — attachment-style chip for a support email/wish in chat.
// The full email never renders inline; clicking opens it in the same
// AttachmentPreview overlay files use (corner:support-desk M18).
function SupportEmailCard({ wish, onOpen }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="support-email-card"
      title={`Open ${wish.code}`}
      onClick={onOpen}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={{
        alignSelf: 'flex-end',
        background: `linear-gradient(180deg, ${C.s2}, ${C.s1})`,
        border: `1px solid ${C.border2}`,
        borderRadius: 16,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
        maxWidth: 360, minWidth: 240,
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 18px rgba(0,0,0,0.4)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)'
        e.currentTarget.style.borderColor = C.border2
      }}
    >
      {/* Envelope glyph — same visual weight as the file-card doc icon */}
      <div style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
        <svg viewBox="0 0 44 34" width={40} height={31} aria-hidden="true">
          <rect x="1" y="1" width="42" height="32" rx="5" fill="rgba(255,255,255,0.06)" stroke={C.accent} strokeWidth="1.5" />
          <path d="M3 5 L22 19 L41 5" fill="none" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ minWidth: 0, flex: 1, fontFamily: "'Inter', sans-serif" }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: C.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{wish.fromName}</div>
        <div style={{
          fontSize: 12, color: C.text2, marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{wish.subject}</div>
        <div style={{ fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: '0.02em' }}>
          {wish.code} {'·'} {wish.source === 'email' ? 'email' : wish.source} {'·'} click to open
        </div>
      </div>
    </div>
  )
}


// MailContextCard — compact pill for a [Mail Room context — ...] message.
// Matches the visual language of SupportEmailCard: same chip shape, same
// hover lift, same envelope icon family — just with a different badge label
// (REPLY vs DISCUSS) and inbox-sourced sender/subject.
// Clicking opens the full context in the AttachmentPreview overlay.
function MailContextCard({ ctx, onOpen }) {
  const isDiscuss = ctx.contextType === 'discuss'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <div
        role="button"
        tabIndex={0}
        data-testid="mail-context-card"
 title={`Open email context, ${ctx.fromName}`}
        onClick={onOpen}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
        style={{
          alignSelf: 'flex-end',
          background: `linear-gradient(180deg, ${C.s2}, ${C.s1})`,
          border: `1px solid ${C.border2}`,
          borderRadius: 16,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 12,
          maxWidth: 360, minWidth: 240,
          cursor: 'pointer',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
          boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-1px)'
          e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 18px rgba(0,0,0,0.4)'
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)'
          e.currentTarget.style.borderColor = C.border2
        }}
      >
        {/* Inbox/arrow icon — visually distinct from the open-envelope icon on
            SupportEmailCard so users can tell the two apart at a glance. */}
        <div style={{ flexShrink: 0, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
          <svg viewBox="0 0 44 34" width={40} height={31} aria-hidden="true">
            <rect x="1" y="1" width="42" height="32" rx="5" fill="rgba(255,255,255,0.06)" stroke={C.border2} strokeWidth="1.5" />
            <path d="M3 5 L22 19 L41 5" fill="none" stroke={C.text2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Small arrow badge indicating "reply" or "discuss" */}
            {isDiscuss
              ? <circle cx="34" cy="27" r="7" fill={C.accent} />
              : <circle cx="34" cy="27" r="7" fill="rgba(52,211,153,0.85)" />
            }
            {isDiscuss
              ? <text x="34" y="31" textAnchor="middle" fontSize="8" fill="#000" fontWeight="700">?</text>
              : <path d="M30.5 27 L33.5 24 L36.5 27 M33.5 24 L33.5 30" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
            }
          </svg>
        </div>
        <div style={{ minWidth: 0, flex: 1, fontFamily: "'Inter', sans-serif" }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{ctx.fromName || '(unknown sender)'}</div>
          <div style={{
            fontSize: 12, color: C.text2, marginTop: 2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{ctx.subject}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: '0.02em' }}>
            {isDiscuss ? 'discuss' : 'reply'} {'·'} email {'·'} click to open
          </div>
        </div>
      </div>
      {/* If the user added their own text AFTER the mail context block
          (the reply format appends user input after '---'), render it as a
          normal user bubble below the pill so the conversation reads cleanly. */}
      {ctx.userText && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '18px 18px 4px 18px',
          fontSize: 14, lineHeight: 1.6,
          color: '#fff',
          background: '#2563EB',
          wordBreak: 'break-word',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '-0.01em',
          whiteSpace: 'pre-wrap',
        }}>
          {ctx.userText}
        </div>
      )}
    </div>
  )
}


function MissionMarkerCard({ msg, projectSlug, floatStyle }) {
  // mission-rooms: condensed in-project marker that says "work was being
  // done over in mission X" without re-printing the transcript. Click =
  // navigate into that mission's room (URL-restore in CornerV4.jsx picks
  // up ?mission= and switches the chat surface).
  const navigate = useNavigate()
  const cm = msg.metadata || {}
  const missionSlug = cm.mission_slug
  const missionName = cm.mission_name || missionSlug
  const count = cm.message_count || 1
  const lastTs = cm.last_activity_ts || msg.timestamp
  const handleOpen = () => {
    if (!projectSlug || !missionSlug) return
    const basePath = (typeof window !== 'undefined' && window.location.pathname.startsWith('/cv4')) ? '/cv4' : '/dashboard'
    navigate(`${basePath}/project/${projectSlug}?mission=${encodeURIComponent(missionSlug)}`)
  }
  return (
    <div
      data-testid="mission-marker"
      data-mission-slug={missionSlug}
      style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, ...floatStyle }}
    >
      <button
        type="button"
        onClick={handleOpen}
        style={{
          maxWidth: '85%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 12px',
          borderRadius: 999,
          background: 'rgba(148,163,184,0.06)',
          border: '1px solid rgba(148,163,184,0.18)',
          color: C.text2,
          fontSize: 11,
          letterSpacing: '0.01em',
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          color: C.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          mission
        </span>
        <span style={{ fontWeight: 600, color: C.text }}>{missionName}</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.muted }}>{count} {count === 1 ? 'message' : 'messages'}</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.muted }}>{formatChatTime(lastTs)}</span>
        <span style={{ marginLeft: 4, color: C.text2, opacity: 0.7 }}>open ›</span>
      </button>
    </div>
  )
}

function isKickoffMessage(m) {
  const meta = m?.metadata
  if (!meta) return false
  if (typeof meta === 'string') {
    try { return !!JSON.parse(meta)?.kickoff_sweep } catch { return false }
  }
  return !!meta.kickoff_sweep
}

function parseMeta(m) {
  const meta = m?.metadata
  if (!meta) return {}
  if (typeof meta === 'string') { try { return JSON.parse(meta) } catch { return {} } }
  return meta
}

// R78-p2: confirmation card for "create project from chat" flow. Extracted
// from MessageList .map() loop so its useState calls live at component top.
function CreateProjectCard({ msg, worldId, selectedAgent }) {
  const cm = msg.metadata || {}
  const { slug, name, reason } = cm
  const [editName, setEditName] = useState(name || slug)
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    setConfirming(true)
    try {
      const createRes = await fetch('/api/dashboard/create-project-from-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: editName,
          client_id: worldId,
          agent_slug: selectedAgent?.slug || 'ea',
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json()
        console.error('Create project failed:', err)
        setConfirming(false)
        return
      }
    } catch (err) {
      console.error('Create project error:', err)
      setConfirming(false)
    }
  }

  const handleSkip = () => {}

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 8 }}>
      <div style={{
        maxWidth: '480px', padding: '12px 14px', borderRadius: 10,
        background: 'rgba(99, 102, 241, 0.10)',
        border: '1px solid rgba(99, 102, 241, 0.30)',
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#A5B4FC',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          fontFamily: "'JetBrains Mono', monospace", marginBottom: 8,
        }}>
          Create Project
        </div>
        {reason && (
          <div style={{
            fontSize: 12, color: 'rgba(226, 232, 240, 0.72)',
            marginBottom: 8, lineHeight: 1.4,
          }}>
            {reason}
          </div>
        )}
        <div style={{
          fontSize: 11, color: 'rgba(148, 163, 184, 0.6)',
          marginBottom: 6, fontFamily: "'JetBrains Mono', monospace",
        }}>
          Slug: {slug}
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{
            display: 'block', fontSize: 10,
            color: 'rgba(148, 163, 184, 0.7)', fontWeight: 600,
            marginBottom: 3, textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Project Name
          </label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={confirming}
            style={{
              width: '100%', padding: '6px 8px', fontSize: 12,
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 4, background: 'rgba(0, 0, 0, 0.2)',
              color: 'rgba(226, 232, 240, 0.9)',
              fontFamily: "'JetBrains Mono', monospace", outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleConfirm}
            disabled={confirming || !editName.trim()}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
              color: '#fff',
              background: !editName.trim() || confirming
                ? 'rgba(99, 102, 241, 0.3)' : '#4F46E5',
              border: 'none', borderRadius: 4,
              cursor: !editName.trim() || confirming ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {confirming ? 'Creating...' : 'Confirm'}
          </button>
          <button
            onClick={handleSkip}
            disabled={confirming}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 11, fontWeight: 600,
              color: 'rgba(226, 232, 240, 0.6)',
              background: 'transparent',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: 4,
              cursor: confirming ? 'not-allowed' : 'pointer',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Skip
          </button>
        </div>
        <div style={{
          fontSize: 9, color: 'rgba(99, 102, 241, 0.45)',
          marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {formatChatTime(msg.timestamp)}
        </div>
      </div>
    </div>
  )
}

// Patterns that mark the first line of a summary/ack reply from an agent.
const SUMMARY_PREFIX_RE = /^(acked[.,\s]|ack\.|summary[:\s—]|replied with|done\.\s*$|got it\.|understood\.|noted\.|confirmed\.|logged\.|recorded\.)/i

function isSummaryMessage(msg, arr, idx) {
  if (msg.role !== 'assistant') return false
  if (parseMeta(msg).is_summary) return true
  // Heuristic: second consecutive assistant message within 8s whose first line
  // matches a well-known summary prefix.
  const prev = idx > 0 ? arr[idx - 1] : null
  if (!prev || prev.role !== 'assistant') return false
  const firstLine = (msg.text || '').split('\n')[0].trim()
  if (!SUMMARY_PREFIX_RE.test(firstLine)) return false
  const deltaMs = msg.timestamp && prev.timestamp
    ? new Date(msg.timestamp) - new Date(prev.timestamp)
    : Infinity
  return deltaMs <= 8_000
}

// Unified scrollable messages area for both room types.
// roomType="agent" → super-agent 1:1 thread.
// roomType="project" → project shared room.
// All behavior from both prior components is preserved: chain cards and voice
// transcripts (agent only), kickoff partitioning and DocUpdatesStripe (project
// only), MessageChecks/MessageStatusLabel (agent only), attachments (agent only).
// K2 fix: awaitingResponse is now included in inFlight for both room types.
// Wrapped in React.memo (see bottom of file). The composer's `input` state
// lives one component up in ChatPanel, so every keystroke re-renders the whole
// ChatPanel tree. Without memo this heavy list re-rendered per keystroke and,
// crucially, queued behind those renders so a SENT message painted ~3s late.
// memo + the keystroke-stable send context (2026-05-22) keep this list out of
// the typing path; it now only re-renders when messages/steps actually change.
function MessageList({ roomType = 'agent' }) {
  // R79-f15: in-chat attachment preview modal (replaces window.open).
  const [previewAtt, setPreviewAtt] = useState(null)
  const isProject = roomType === 'project'

  const {
    selectedAgent, selectedProject, currentUser, displayName, allTasks, agents, worldId, isMobile,
  } = useChatCore()
  const {
    messages, loadingMsgs, messagesEndRef, userProfiles,
    stepsByMessageId = {},
  } = useChatMessagesCtx()
  const {
    sending, setSending, isAgentTyping, setIsAgentTyping, sendAgentTextRef,
    sendAgentText, sendProjectText,
  } = useChatSendCtx()
  const { chatSearchOpen, chatSearchResults } = useChatSearchCtx()
  const {
    needsVerificationIds,
    handleMessageFollowUp, handleMessageNeedsVerification,
    handleMessageResearch, handleMessageSendTo,
  } = useChatContextMenuCtx()

  const { msgMenu, setMsgMenu, openMsgMenu, startLongPress, cancelLongPress } = useThreadMsgMenu()
  const { respondedSet, awaitingResponse } = useThreadMessageStatus(messages)

  // Hover state for desktop action buttons (desktop only; on mobile long-press fires the sheet)
  const [hoverMsgId, setHoverMsgId] = useState(null)

  // Scroll to a message and briefly flash-highlight it
  const scrollToAndHighlight = useCallback((messageId) => {
    const el = document.querySelector(`[data-message-id="${CSS.escape(String(messageId))}"]`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.transition = 'background 0.1s ease'
    el.style.background = 'rgba(16,185,129,0.18)'
    el.style.borderRadius = '12px'
    setTimeout(() => {
      el.style.background = ''
      setTimeout(() => { el.style.transition = '' }, 400)
    }, 900)
  }, [])

  // CV4 drawer search dispatches 'cv4:scroll-to-message' on hit click.
  // We retry briefly because the target thread may still be hydrating when
  // the event fires (the user just navigated to it).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (e) => {
      const id = e?.detail?.messageId
      if (id == null) return
      let attempts = 0
      const tick = () => {
        const el = document.querySelector(`[data-message-id="${CSS.escape(String(id))}"]`)
        if (el) { scrollToAndHighlight(id); return }
        attempts += 1
        if (attempts < 12) window.setTimeout(tick, 250)
      }
      tick()
    }
    window.addEventListener('cv4:scroll-to-message', handler)
    return () => window.removeEventListener('cv4:scroll-to-message', handler)
  }, [scrollToAndHighlight])

  // R73: invoked by TypingIndicatorV2 after the stall-CTA fires.
  const handleTypingStall = () => {
    setSending?.(false)
    setIsAgentTyping?.(false)
  }

  // K2: awaitingResponse included for both room types. Previously project rooms
  // only had `sending || isAgentTyping`, causing the synthetic chain to collapse
  // prematurely when the POST returned but the assistant reply hadn't arrived yet.
  const inFlightRaw = sending || awaitingResponse || isAgentTyping

  // corner:chat-reliability CR-2 -- terminal-event settling for task rooms.
  // When the chat surface is a task room and the dispatched task has flipped
  // to failed (no reply will ever land), settle the chain with a "Worker
  // failed" final step instead of breathing "Still working" forever.
  // Reads task status from allTasks (already loaded by useTasks).
  const taskRoomId = selectedAgent?.isTaskRoom
    ? (selectedAgent.taskId || (selectedAgent.slug?.startsWith('task:') ? selectedAgent.slug.slice(5) : null))
    : null
  const taskRow = taskRoomId && Array.isArray(allTasks)
    ? allTasks.find(t => t.id === taskRoomId)
    : null
  const taskTerminalFailed = taskRow && (taskRow.status === 'failed')
  // If the originating task was a followup, also watch for the followup row
  // flipping failed. Followups are filtered from the visible list (R6.2)
  // but useTasks returns them in allTasks before that derivation.
  const followupFailed = taskRoomId && Array.isArray(allTasks)
    ? allTasks.some(t => t.status === 'failed' && t.metadata && t.metadata.followup_of === taskRoomId)
    : false
  const inFlight = inFlightRaw && !(taskTerminalFailed || followupFailed)

  // R73-fix: wall-clock stall detection. Moves silence-detection out of
  // TypingIndicatorV2 (which resets its timer on every remount) into MessageList
  // where it survives any subordinate re-render. Fires when the last real user
  // message has been unanswered for 45s and the thread is still in-flight.
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [floatMode, setFloatMode] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAtBottomRef = useRef(true)
  const lastUserMsgRef = useRef(null)

  useEffect(() => {
    if (!inFlight) return
    const tick = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(tick)
  }, [inFlight])

  const latestRealUserMsg = useMemo(() => {
    if (!inFlight) return null
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.role === 'user' && !String(m.id).startsWith('temp-')) return m
    }
    return null
  }, [messages, inFlight])

  const msSinceUser = latestRealUserMsg?.timestamp
    ? nowMs - new Date(latestRealUserMsg.timestamp).getTime()
    : 0

  // If live steps are firing under the latest user msg, the agent is visibly
  // working — suppress the stall signal. Per .claude/rules/live-thread-step-emission.md,
  // step events stream while the agent reads, queues, spawns workers, etc.
  // Seeing dots travel down the chain is the opposite of silence.
  // 2026-05-12: window was 30s and tripped chainStalled mid-routine — Elon
  // routines run 60-90s, and a step at t=5s followed by a tool call would
  // cross the 30s gap and show "clear & retry" while the chain was still
  // demonstrably alive. Bumped to 120s so a chain that has started gets
  // enough headroom for the slowest legit routine before we flag stall.
  const latestUserStepsForStall = latestRealUserMsg
    ? (stepsByMessageId[latestRealUserMsg.id] || [])
    : []
  const lastStepAt = latestUserStepsForStall.length > 0
    ? Math.max(...latestUserStepsForStall.map(s => new Date(s.timestamp || 0).getTime()))
    : 0
  const msSinceLastStep = lastStepAt > 0 ? nowMs - lastStepAt : Infinity
  const stepActiveRecently = msSinceLastStep < 120_000

  // awaitingResponse=true means no assistant message (real or bridge-stream) has
  // arrived yet — strictly the relay path where the agent hasn't replied at all.
  const chainStalled = inFlight && awaitingResponse && msSinceUser >= 45_000 && !stepActiveRecently

  // c76e17f9: skip "Read your message" on turn 2+ (context already established).
  const isFirstTurn = !messages.some(m =>
    m.role === 'assistant' &&
    !String(m.id).startsWith('temp-') &&
    !String(m.id).startsWith('bridge-stream-') &&
    !String(m.id).startsWith('voice-')
  )
  const syntheticSteps = useSyntheticChain(inFlight, isFirstTurn)

  const roomColor = isProject
    ? (selectedProject?.color || '#6B8AB0')
    : (selectedAgent?.color || '#3B82F6')
  const roomName = isProject
    ? (selectedProject?.name || 'Project')
    : (selectedAgent?.name || 'Agent')
  const roomSlug = isProject
    ? (selectedProject?.slug || 'project')
    : selectedAgent?.slug

  // Project rooms hide the list while search results are active.
  const hidden = isProject && chatSearchOpen && chatSearchResults && chatSearchResults.length > 0

  // R50b: project rooms partition messages around the most-recent kickoff so
  // pre-ratification chatter collapses under a "show earlier messages" affordance.
  const { preKickoff, postKickoff, hasCutoff } = useMemo(() => {
    if (!isProject || !Array.isArray(messages) || messages.length === 0) {
      return { preKickoff: [], postKickoff: messages, hasCutoff: false }
    }
    let cutoffIdx = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (isKickoffMessage(messages[i])) { cutoffIdx = i; break }
    }
    if (cutoffIdx <= 0) {
      return { preKickoff: [], postKickoff: messages, hasCutoff: cutoffIdx === 0 }
    }
    return {
      preKickoff: messages.slice(0, cutoffIdx),
      postKickoff: messages.slice(cutoffIdx),
      hasCutoff: true,
    }
  }, [messages, isProject])

  const [earlierExpanded, setEarlierExpanded] = useState(false)

  const renderedMessages = isProject && hasCutoff
    ? (earlierExpanded ? [...preKickoff, ...postKickoff] : postKickoff)
    : messages

  // Float animation: stable filtered array + last-user-msg index for opacity targeting.
  const visibleMessages = useMemo(
    () => renderedMessages.filter(m =>
      !(m.source === 'bridge-stream' && m._streaming && !m.text) &&
      m.source !== 'clear_context' &&
      // R79-f15 (2026-05-25): hide chat-health-check infrastructure pings.
      // The probe is a user-shape row that says
      //   '[chat-health-check probe at ...] respond with the single word: pong'
      // and the bridge replies with literally 'pong'. Both rows are deleted
      // ~60-120s later by the daemon, but for the window they exist they
      // flash on the dashboard. Source flag covers the probe; the reply has
      // text==='pong' alone, which is a strong signature too.
      m.source !== 'chat-health-check-probe' &&
      !((m.text || '').trim().startsWith('[chat-health-check probe')) &&
      !(m.role === 'assistant' && /^\s*pong\s*$/i.test(m.text || ''))
    ),
    [renderedMessages]
  )
  const lastUserMsgIdx = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i].role === 'user') return i
    }
    return -1
  }, [visibleMessages])

  // Activate float mode the moment a send lands, but ONLY if the user is
  // engaged with the current turn (within 240px of bottom). If they're
  // scrolled up reading history, leave them alone. Deactivate 500ms after
  // the reply arrives.
  const scrollListRef = useRef(null)
  useEffect(() => {
    if (inFlight) {
      if (isAtBottomRef.current) setFloatMode(true)
      return
    }
    const t = setTimeout(() => setFloatMode(false), 500)
    return () => clearTimeout(t)
  }, [inFlight])

  // Scroll last user message into view when float mode activates. Use
  // block:'nearest' so the browser only scrolls when the element isn't
  // already visible — no yank when the user's msg is already on screen.
  useEffect(() => {
    if (!floatMode || !lastUserMsgRef.current) return
    lastUserMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [floatMode])

  // Track scroll position + scroll-up intent. Exits float mode on any upward
  // scroll (lowered from -24 to -6 so trackpad nudges also count) and keeps
  // `isAtBottom` fresh for the float-activation gate above.
  useEffect(() => {
    const el = scrollListRef.current
    if (!el) return
    let lastScrollTop = el.scrollTop
    const measure = () => {
      const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const atBottom = fromBottom < 240
      isAtBottomRef.current = atBottom
      setIsAtBottom(atBottom)
    }
    const onScroll = () => {
      const dy = el.scrollTop - lastScrollTop
      lastScrollTop = el.scrollTop
      if (dy < -6 && floatMode) setFloatMode(false)
      measure()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => el.removeEventListener('scroll', onScroll)
  }, [floatMode])

  // corner:bridge R5b — auto-scroll to bottom on room enter + on new
  // message arrival, never while the user is scrolled up reading.
  //
  // (1) Room load finished: when loadingMsgs transitions true → false,
  //     pin to bottom. Two rAFs catch images / step-thread chains that
  //     lay out a frame later.
  // (2) Room switch via cached path (loadingMsgs never flipped): also
  //     pin on selectedAgent/selectedProject slug change.
  // (3) New message arrival: pin only if user was already at bottom.
  //     If they're scrolled up, leave their position alone.
  const prevLoadingRef = useRef(loadingMsgs)
  useEffect(() => {
    const el = scrollListRef.current
    if (!el) return
    const justFinishedLoading = prevLoadingRef.current && !loadingMsgs
    prevLoadingRef.current = loadingMsgs
    if (!justFinishedLoading) return
    const pin = () => {
      el.scrollTop = el.scrollHeight
      isAtBottomRef.current = true
      setIsAtBottom(true)
    }
    requestAnimationFrame(() => {
      pin()
      requestAnimationFrame(pin)
    })
  }, [loadingMsgs])

  const roomKey = `${selectedAgent?.slug || ''}::${selectedProject?.slug || ''}`
  const prevRoomKeyRef = useRef(roomKey)
  useEffect(() => {
    if (prevRoomKeyRef.current === roomKey) return
    prevRoomKeyRef.current = roomKey
    const el = scrollListRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
      isAtBottomRef.current = true
      setIsAtBottom(true)
    })
  }, [roomKey])

  const prevMsgCountRef = useRef(visibleMessages.length)
  useEffect(() => {
    const el = scrollListRef.current
    const grew = visibleMessages.length > prevMsgCountRef.current
    prevMsgCountRef.current = visibleMessages.length
    if (!grew || !el) return
    if (!isAtBottomRef.current) return
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [visibleMessages.length])

  // Dev affordance for R75-r65-e gate script.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__r75r65etest__ = { setFloatMode }
    return () => { delete window.__r75r65etest__ }
  }, [])

  // Dev affordance for R75-b9 gate script.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    window.__r75b9test__ = { isSummaryMessage }
    return () => { delete window.__r75b9test__ }
  }, [])

  return (
    <>
    <div
      ref={scrollListRef}
      data-cv3-message-list
      data-testid={isProject ? 'project-message-list' : undefined}
      data-float-mode={floatMode ? 'true' : undefined}
      style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: hidden ? 'none' : 'flex',
        flexDirection: 'column', gap: 6,
      }}
    >
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
          {isProject ? (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg, ${roomColor}44, ${roomColor}22)`,
              border: `1px solid ${roomColor}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: 5,
                background: roomColor,
                boxShadow: `0 0 10px ${roomColor}77`,
              }} />
            </div>
          ) : (
            <AgentAvatar name={selectedAgent.name} slug={selectedAgent.slug} color={selectedAgent.color} size={44} />
          )}
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 4 }}>
            {roomName}
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>Start a conversation</span>
        </div>
      )}

      {/* Project: earlier-messages toggle */}
      {isProject && hasCutoff && preKickoff.length > 0 && (
        <button
          type="button"
          data-testid="show-earlier-messages"
          data-expanded={earlierExpanded ? 'true' : 'false'}
          onClick={() => setEarlierExpanded(v => !v)}
          style={{
            alignSelf: 'center',
            margin: '4px auto 8px',
            padding: '6px 14px',
            fontSize: 12,
            color: C.muted,
            background: 'transparent',
            border: `1px solid ${C.muted}33`,
            borderRadius: 14,
            cursor: 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {earlierExpanded
            ? `Hide earlier messages (${preKickoff.length})`
            : `Show earlier messages (${preKickoff.length})`}
        </button>
      )}

      {visibleMessages.map((msg, idx, arr) => {
          const isLastUserMsg = floatMode && idx === lastUserMsgIdx
          const fadedByFloat = floatMode && idx < lastUserMsgIdx
          // corner:mission-rooms — softened from 0.12 → 0.42 so users can still
          // see their context history during in-flight. 0.12 read as "history
          // gone" + paired with scroll-pin made scroll-back feel broken.
          const floatStyle = fadedByFloat
            ? { opacity: 0.42, transition: 'opacity 0.35s ease' }
            : { transition: 'opacity 0.35s ease' }

          // Task status cards (Steffen's CV3 design).
          const taskCard = renderTaskCardForMessage(msg, {
            ...(!isProject && { selectedAgent }),
            formatTime: formatChatTime,
          })
          if (taskCard) return <div key={msg.id} style={floatStyle}>{taskCard}</div>

          // Mission marker (project rooms only): a condensed pill that
          // collapses a run of mission-tagged messages into one row.
          if (isProject && msg.source === 'mission-marker') {
            return (
              <MissionMarkerCard
                key={msg.id}
                msg={msg}
                projectSlug={selectedProject?.slug || msg.metadata?.project_slug}
                floatStyle={floatStyle}
              />
            )
          }

          // Chain card (agent rooms only).
          if (!isProject && msg.source === 'chain-card') {
            const cm = msg.metadata || {}
            const chainTotal = cm.chain_total || (cm.chain_tasks || []).length || 0
            const chainStatus = cm.chain_status || 'queued'
            const liveTasks = (cm.chain_tasks || []).map(t => {
              const live = (typeof allTasks !== 'undefined' && Array.isArray(allTasks))
                ? allTasks.find(a => a.id === t.id) : null
              return live ? { ...t, status: live.status } : t
            })
            const headerColor = chainStatus === 'complete' ? '#34D399'
              : chainStatus === 'blocked' ? '#F87171'
              : '#A5B4FC'
            const headerBg = chainStatus === 'complete' ? 'rgba(52,211,153,0.10)'
              : chainStatus === 'blocked' ? 'rgba(248,113,113,0.10)'
              : 'rgba(99,102,241,0.10)'
            const headerBorder = chainStatus === 'complete' ? 'rgba(52,211,153,0.35)'
              : chainStatus === 'blocked' ? 'rgba(248,113,113,0.45)'
              : 'rgba(99,102,241,0.30)'
            const headerLabel = chainStatus === 'complete' ? `Chain complete · ${chainTotal} steps`
              : chainStatus === 'blocked' ? `Chain blocked at ${cm.blocked_at_seq || '?'}/${chainTotal}`
              : `Chain queued · ${chainTotal} steps`
            const dotFor = (st) => {
              const s = (st || '').toLowerCase()
              if (s === 'done' || s === 'completed') return { c: '#34D399', label: 'done', pulse: false }
              if (s === 'failed' || s === 'rejected' || s === 'cancelled') return { c: '#F87171', label: 'blocked', pulse: false }
              if (s === 'running' || s === 'active' || s === 'building' || s === 'qa' || s === 'planning' || s === 'classifying') return { c: '#FBBF24', label: 'running', pulse: true }
              if (s === 'queued') return { c: '#A5B4FC', label: 'queued', pulse: false }
              if (s === 'waiting') return { c: 'rgba(148,163,184,0.55)', label: 'waiting', pulse: false }
              return { c: 'rgba(148,163,184,0.55)', label: s || 'unknown', pulse: false }
            }
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6, ...floatStyle }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 12px', borderRadius: 12,
                  background: headerBg, border: `1px solid ${headerBorder}`,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: headerColor,
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {headerLabel}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {liveTasks.map((t) => {
                      const d = dotFor(t.status)
                      return (
                        <div key={t.id || t.seq} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '4px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.18)',
                        }}>
                          <span style={{
                            width: 7, height: 7, borderRadius: '50%',
                            background: d.c,
                            boxShadow: d.pulse ? `0 0 0 4px ${d.c}22` : 'none',
                            animation: d.pulse ? 'cv3pulse 1.4s ease-in-out infinite' : 'none',
                            flexShrink: 0,
                          }} />
                          <span style={{
                            fontSize: 9, fontWeight: 700,
                            color: 'rgba(148,163,184,0.7)',
                            fontFamily: "'JetBrains Mono', monospace",
                            minWidth: 28,
                          }}>
                            {t.seq}/{chainTotal}
                          </span>
                          <span style={{
                            fontSize: 12, color: 'rgba(226,232,240,0.92)',
                            flex: 1, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {t.title}
                          </span>
                          <span style={{
                            fontSize: 8, fontWeight: 700, color: d.c,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                            fontFamily: "'JetBrains Mono', monospace",
                          }}>
                            {d.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{
                    fontSize: 9, color: 'rgba(148,163,184,0.45)',
                    marginTop: 6, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // R78-p2: Create project confirmation card (extracted to component)
          if (!isProject && msg.source === 'create-project-card') {
            return (
              <CreateProjectCard
                key={msg.id}
                msg={msg}
                worldId={worldId}
                selectedAgent={selectedAgent}
              />
            )
          }

          // Voice entity creation card (project and agent rooms).
          if (msg.source === 'voice_creation') {
            const meta = msg.metadata || {}
            const isProject_ = meta.entity_type === 'project'
            const entityLabel = isProject_ ? 'Project' : 'Mission'
            const entityName = meta.entity_name || msg.text
            const parentLine = !isProject_ && meta.parent_slug ? `under ${meta.parent_slug}` : ''
            const descLine = meta.description ? meta.description : ''
            return (
              <div key={msg.id} style={{
                display: 'flex', justifyContent: 'flex-start',
                marginBottom: 8, ...floatStyle,
              }}>
                <div style={{
                  maxWidth: '82%', padding: '10px 14px', borderRadius: 10,
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.3)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{isProject_ ? '📁' : '🎯'}</span>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: '#34D399',
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {entityLabel} created · voice
                    </span>
                  </div>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: '#E2E8F0',
                    marginBottom: descLine || parentLine ? 3 : 0,
                  }}>
                    {entityName}
                  </div>
                  {(parentLine || descLine) && (
                    <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.7)', lineHeight: 1.4 }}>
                      {parentLine && <span>{parentLine}</span>}
                      {parentLine && descLine && <span> · </span>}
                      {descLine && <span>{descLine}</span>}
                    </div>
                  )}
                  <div style={{
                    fontSize: 9, color: 'rgba(52,211,153,0.45)',
                    marginTop: 5, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // Voice transcript (agent and project rooms).
          if (msg.source === 'voice') {
            const isVoiceUser = msg.role === 'user'
            // Whoever actually spoke, per the row. This label used to read
            // "Patrik (voice)" for every human turn, which is how a call taken
            // by Courtney was filed and later read back as a call with Patrik.
            // Voice rows written before authorship was persisted carry no
            // user_name — those stay UNATTRIBUTED. Never the founder's name,
            // and never the viewer's own name either: the person reading the
            // thread is not evidence of who was on the call.
            const voiceSpeaker = isVoiceUser
              ? `${msg.user_name || 'Someone'} (voice)`
              : 'Gemini (voice)'
            const voiceBadge = isProject
              ? 'voice session'
              : `not sent to ${selectedAgent?.name || 'agent'}`
            return (
              <div key={msg.id} style={{
                display: 'flex',
                justifyContent: isVoiceUser ? 'flex-end' : 'flex-start',
                marginBottom: 6,
                ...floatStyle,
              }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: 12,
                  background: 'rgba(129,140,248,0.10)',
                  border: '1px dashed rgba(129,140,248,0.35)',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, color: '#A5B4FC',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {voiceSpeaker}
                    </span>
                    <span style={{
                      fontSize: 7, fontWeight: 700, color: 'rgba(129,140,248,0.6)',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '1px 5px', borderRadius: 4,
                      background: 'rgba(129,140,248,0.15)',
                    }}>
                      {voiceBadge}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.45,
                    color: 'rgba(226,232,240,0.78)',
                    fontStyle: 'italic', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  }}>
                    {msg.text}
                  </div>
                  <div style={{
                    fontSize: 9, color: 'rgba(129,140,248,0.45)',
                    marginTop: 4, fontFamily: "'JetBrains Mono', monospace",
                  }}>
                    {formatChatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            )
          }

          // R75-b9: summary/ack replies render compact + dimmed instead of as a
          // normal bubble so the user can distinguish the answer from the agent note.
          if (isSummaryMessage(msg, arr, idx)) {
            return <SummaryMessage key={msg.id} msg={msg} floatStyle={floatStyle} />
          }

          const isUser = msg.role === 'user'
          // c76e17f9: detect turn boundary.
          const prevMsg = idx > 0 ? arr[idx - 1] : null
          const isNewTurn = isUser && prevMsg?.role === 'assistant'
          const senderName = msg.user_name || (isUser ? displayName : null)
          const senderInitial = senderName ? senderName[0].toUpperCase() : 'U'
          const isOtherUser = isUser && msg.user_name && msg.user_name !== displayName
          const senderColor = isUser ? (isOtherUser ? '#7C3AED' : '#2563EB') : roomColor
          // Fall back to the current user's avatar for user-role messages
          // that don't carry a user_id (optimistic sends, legacy rows from
          // before user_id tracking, and project messages where the row
          // never gets re-fetched after persist). Without this, the same
          // sender's bubbles flicker between avatar and initial-letter
          // depending on how each row landed.
          const treatAsCurrentUser = isUser && !isOtherUser
          const senderProfile = msg.user_id
            ? (msg.user_id === currentUser?.id
                ? { avatar_url: currentUser?.user_metadata?.avatar_url }
                : userProfiles[msg.user_id])
            : (treatAsCurrentUser ? { avatar_url: currentUser?.user_metadata?.avatar_url } : null)
          const senderAvatar = senderProfile?.avatar_url || null
          const msgFlagged = needsVerificationIds?.has?.(msg.id)

          // Steps are keyed to the USER message that triggered the work.
          // Only user messages carry userBubbleSteps — assistant messages do NOT look up
          // the parent user message's steps (R13 revert: that caused every assistant message
          // in a turn to duplicate the same step chain, producing 3x repeats in the thread).
          // The under-user floating render (lines ~1803-1835) handles step display for all cases.
          const userBubbleSteps = isUser && stepsByMessageId[msg.id] && stepsByMessageId[msg.id].length > 0
            ? stepsByMessageId[msg.id]
            : null
          // R75-b5: settle when the assistant reply arrives (not just on next user msg).
          // This dims the chain and flips data-status to 'done' the moment the reply lands.
          const hasAssistantReply = userBubbleSteps
            ? arr.slice(idx + 1).some(m => m.role === 'assistant' && !String(m.id).startsWith('temp-'))
            : false

          // Parse reply_to from this message's metadata for quote header rendering
          const msgMeta = parseMeta(msg)
          const replyToData = msgMeta.reply_to && msgMeta.reply_to.message_id ? msgMeta.reply_to : null
          // Find original message for quote header (look up in full messages array)
          const replyOriginal = replyToData ? messages.find(m => String(m.id) === String(replyToData.message_id)) : null

          return (
            <React.Fragment key={msg.id}>
              {/* c76e17f9: inter-turn spine connector. */}
              {isNewTurn && (
                <div aria-hidden="true" style={{ paddingLeft: 28, display: 'flex', height: 18 }}>
                  <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                    <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
              )}
              <div style={{ position: 'relative', ...floatStyle }}
                onMouseEnter={() => !isMobile && setHoverMsgId(msg.id)}
                onMouseLeave={() => setHoverMsgId(null)}
              >
              {/* Desktop hover action buttons */}
              {!isMobile && hoverMsgId === msg.id && (
                <div style={{
                  position: 'absolute',
                  top: -28,
                  right: isUser ? 0 : undefined,
                  left: isUser ? undefined : 38,
                  display: 'flex',
                  gap: 4,
                  zIndex: 200,
                }}>
                  {[
                    {
                      key: 'reply', title: 'Reply',
                      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>,
                      onClick: () => handleMessageFollowUp(msg),
                    },
                    {
                      key: 'copy', title: 'Copy',
                      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
                      onClick: () => { if (msg.text) navigator.clipboard?.writeText(msg.text).catch(() => {}) },
                    },
                  ].map(btn => (
                    <button
                      key={btn.key}
                      title={btn.title}
                      onClick={btn.onClick}
                      data-test-id={`msg-hover-${btn.key}-${msg.id}`}
                      style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(30,41,59,0.92)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: 'rgba(226,232,240,0.8)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        transition: 'background 0.12s, color 0.12s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; e.currentTarget.style.color = '#34D399' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.92)'; e.currentTarget.style.color = 'rgba(226,232,240,0.8)' }}
                    >
                      {btn.icon}
                    </button>
                  ))}
                </div>
              )}
              <div
                data-test-id="chat-message"
                data-message-id={msg.id}
                data-last-user-msg={isLastUserMsg ? 'true' : undefined}
                ref={isLastUserMsg ? lastUserMsgRef : undefined}
                onContextMenu={(e) => openMsgMenu(e, msg)}
                onTouchStart={(e) => startLongPress(e, msg)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onTouchCancel={cancelLongPress}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end',
                  gap: 10,
                  marginBottom: userBubbleSteps ? 0 : (isUser ? 4 : 12),
                }}
              >
                {/* Assistant avatar: circle for agents, square gem for projects. */}
                {!isUser && (
                  isProject ? (
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `linear-gradient(135deg, ${roomColor}33, ${roomColor}18)`,
                      border: `1px solid ${roomColor}44`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      alignSelf: 'flex-start', marginTop: 2,
                    }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: roomColor }} />
                    </div>
                  ) : (
                    <div style={{ alignSelf: 'flex-start', marginTop: 2 }}>
                      <AgentAvatar name={selectedAgent.name} slug={selectedAgent.slug} color={selectedAgent.color} size={28} />
                    </div>
                  )
                )}
                <div style={{ maxWidth: isUser ? '75%' : '85%', minWidth: 0 }}>
                  {/* Quote header: rendered when this message is a reply to another message */}
                  {replyToData && (
                    <div
                      role="button"
                      tabIndex={0}
                      data-test-id={`quote-header-${msg.id}`}
                      onClick={() => scrollToAndHighlight(replyToData.message_id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scrollToAndHighlight(replyToData.message_id) } }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        marginBottom: 4,
                        padding: '5px 10px',
                        borderLeft: '3px solid rgba(16,185,129,0.55)',
                        borderRadius: '0 6px 6px 0',
                        background: 'rgba(16,185,129,0.07)',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: 'rgba(52,211,153,0.85)',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.03em',
                          marginBottom: 2,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {replyToData.sender || replyOriginal?.agent || 'message'}
                        </div>
                        <div style={{
                          fontSize: 12, color: 'rgba(226,232,240,0.5)',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
 {replyToData.snippet || (replyOriginal?.text ? replyOriginal.text.slice(0, 100) : null) || (replyToData.attachment_kind ? `[${replyToData.attachment_kind}]` : '·')}
                        </div>
                      </div>
                      {replyToData.attachment_kind === 'video' && replyToData.attachment_url && (
                        <video
                          src={replyToData.attachment_url}
                          preload="metadata"
                          muted
                          style={{ width: 52, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0, background: '#000' }}
                        />
                      )}
                      {replyToData.attachment_kind === 'image' && replyToData.attachment_url && (
                        <img
                          src={replyToData.attachment_url}
                          alt=""
                          style={{ width: 52, height: 36, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                        />
                      )}
                    </div>
                  )}
                  {/* Project rooms: other-user name above bubble. */}
                  {isProject && isUser && isOtherUser && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: '#A78BFA',
                      textAlign: 'right', marginBottom: 3,
                      fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
                    }}>
                      {msg.user_name}
                    </div>
                  )}
 {/* R9: wrap bubble + steps as atomic unit (flex column) so parent flex alignment doesn't separate them. R12: dark-native card, cool-tinted surface elevation + subtle border so message + steps group without a "white box on dark" look. */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '100%',
                    ...((!isUser && userBubbleSteps?.length > 0) ? {
                      background: 'rgba(96,125,150,0.12)',
                      border: '1px solid rgba(148,163,184,0.15)',
                      borderRadius: 10,
                      padding: '8px 0',
                      paddingLeft: 12,
                      paddingRight: 12,
                    } : {}),
                  }}>
                    {/* Text bubble */}
                    {msg.text && !((msg.attachment_url || msg.metadata?.attachment?.url || msg.metadata?.attachments?.length > 0) && (msg.text.startsWith('Attached file: ') || /^Attached \d+ files?: /.test(msg.text))) && (() => {
                      const hasChain = !isUser && userBubbleSteps && userBubbleSteps.length > 0
                      // Subtle outline on the bubble whose context-menu is open.
                      const isMenuTarget = msgMenu?.message?.id === msg.id
                      const menuOutline = isMenuTarget ? '1.5px solid rgba(52,211,153,0.55)' : null
                      // Support emails arrive as full bodies in msg.text — render a
                      // compact email card instead; the body opens in the preview
                      // overlay on click (corner:support-desk M18).
                      const supportWish = isUser ? parseSupportWish(msg.text) : null
                      if (supportWish) {
                        return (
                          <SupportEmailCard
                            wish={supportWish}
                            onOpen={() => setPreviewAtt({
 name: `${supportWish.code}, ${supportWish.fromName}`,
                              inlineText: `From: ${supportWish.from}\nSource: ${supportWish.source} · ${supportWish.code}\n\n${supportWish.body}`,
                            })}
                          />
                        )
                      }
                      // Mail Room context messages ([Mail Room context — ...]) also
                      // carry full email bodies as user messages — collapse to a pill
                      // identical to SupportEmailCard. Handles both the reply-to-email
                      // format (useChatSend) and the discuss-email format (SupportDashboard).
                      const mailCtx = isUser ? parseMailRoomContext(msg.text) : null
                      if (mailCtx) {
                        return (
                          <MailContextCard
                            ctx={mailCtx}
                            onOpen={() => setPreviewAtt({
                              name: mailCtx.contextType === 'discuss'
 ? `Email, ${mailCtx.fromName}`
                                : `Reply to ${mailCtx.fromName}`,
                              inlineText: mailCtx.fullContext,
                            })}
                          />
                        )
                      }
                      if (isUser) {
                        return (
                          <div data-bubble="user" data-menu-target={isMenuTarget || undefined} style={{
                            padding: '10px 16px',
                            borderRadius: '18px 18px 4px 18px',
                            fontSize: 14, lineHeight: 1.6,
                            color: '#fff',
                            background: senderColor,
                            border: 'none',
                            outline: menuOutline,
                            outlineOffset: isMenuTarget ? 1 : 0,
                            wordBreak: 'break-word',
                            fontFamily: "'Inter', sans-serif",
                            letterSpacing: '-0.01em',
                            whiteSpace: 'pre-wrap',
                            transition: 'outline-color 120ms ease',
                          }}>
                            <LinkifyText text={msg.text} />
                          </div>
                        )
                      }
                      return (
                        <div
                          data-bubble="assistant"
                          data-menu-target={isMenuTarget || undefined}
                          data-testid={hasChain ? 'assistant-final-message' : undefined}
                          style={{
                            padding: hasChain ? '12px 14px' : (isMenuTarget ? '4px 8px' : '2px 0'),
                            borderRadius: hasChain ? 8 : (isMenuTarget ? 6 : 0),
                            border: hasChain ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            outline: menuOutline,
                            outlineOffset: isMenuTarget ? 1 : 0,
                            marginTop: hasChain ? 8 : 0,
                            fontSize: 14, lineHeight: 1.6,
                            color: '#E2E8F0',
                            background: 'transparent',
                            wordBreak: 'break-word',
                            fontFamily: "'Inter', sans-serif",
                            letterSpacing: '-0.01em',
                            transition: 'outline-color 120ms ease',
                          }}
                        >
                          <ChatMessageRenderer content={msg.text} style={{ fontSize: 14, lineHeight: 1.6, color: '#E2E8F0' }} />
                        </div>
                      )
                    })()}
                    {/* R65-impl: live-thread step chain below assistant reply. R12: tightened attachment — steps feel like they hang from the message, not a separate component. */}
                    {!isUser && userBubbleSteps && userBubbleSteps.length > 0 && (
                      <div style={{
                        marginTop: msg.text ? 6 : 3,
                        paddingTop: msg.text ? 6 : 0,
                        borderTop: msg.text ? '1px solid rgba(255,255,255,0.10)' : 'none',
                      }}>
                        <StepThread
                          steps={userBubbleSteps}
                          settled={Boolean(msg.text)}
                          isError={msg.metadata?.status === 'error'}
                          agentColor={roomColor}
                        />
                      </div>
                    )}
                  </div>
                  {/* corner:suggested-responses — tap-to-send chips under the
                       assistant bubble. Quiet pills, hover to lift, click to
                       send the chip text as the user's next message. Absence
                       of metadata.chips => agent opted out for this reply.
                       R1.1 (2026-05-25): only render chips on the LATEST
                       assistant message in the thread — older chips are
                       stale ("what to say next" only applies to the most
                       recent reply, not 20 turns back). */}
                  {(() => {
                    if (isUser) return false
                    const chips = msg.metadata?.chips
                    if (!Array.isArray(chips) || chips.length === 0) return false
                    // Suppress chips when any LATER assistant message exists
                    // in the visible thread (settled, real id — not a temp).
                    const hasLaterAssistant = arr
                      .slice(idx + 1)
                      .some((m) => m.role === 'assistant' && !String(m.id || '').startsWith('temp-'))
                    return !hasLaterAssistant
                  })() && (
                    <div
                      data-chips
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      {msg.metadata.chips.slice(0, 4).map((chip, ci) => {
                        const text = typeof chip === 'string' ? chip.trim() : ''
                        if (!text) return null
                        return (
                          <button
                            key={ci}
                            type="button"
                            data-testid="suggested-response-chip"
                            onClick={() => {
                              try {
                                const fn = isProject ? sendProjectText : sendAgentText
                                fn?.(text)
                              } catch (_) {}
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 14,
                              border: `1px solid ${C.border2}`,
                              background: C.chipBg,
                              color: C.text2,
                              fontSize: 12,
                              lineHeight: 1.4,
                              fontFamily: "'Inter', sans-serif",
                              letterSpacing: '-0.005em',
                              cursor: 'pointer',
                              transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = C.bg2
                              e.currentTarget.style.borderColor = C.border2
                              e.currentTarget.style.color = C.text
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = C.chipBg
                              e.currentTarget.style.borderColor = C.border2
                              e.currentTarget.style.color = C.text2
                            }}
                          >
                            {text}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {/* Agent rooms: other-user name below bubble. */}
                  {!isProject && isUser && msg.user_name && msg.user_name !== displayName && (
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: '#A78BFA',
                      textAlign: 'right', marginBottom: 3, marginTop: -2,
                      fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
                    }}>
                      {msg.user_name}
                    </div>
                  )}
                  {/* File / image attachments. Renders in both agent and
                      project rooms so an uploaded file shows the same chip
                      regardless of which surface posted it. */}
                  {(() => {
                    // Three input shapes (in priority): explicit attachments[],
                    // top-level columns (post-migration), metadata.attachment
                    // (pre-migration fallback that works against the live schema today).
                    const metaAtt = msg.metadata?.attachment
                    const attUrl = msg.attachment_url || metaAtt?.url
                    const attMime = msg.file_mime_type || metaAtt?.mime
                    const attSize = msg.file_size ?? metaAtt?.size
                    const attName = metaAtt?.name
                      || (msg.text && msg.text.startsWith('Attached file: ')
                            ? msg.text.replace('Attached file: ', '').split('\n')[0]
                            : msg.file_name || null)
                    // R79-f10: also read metadata.attachments (agent outbound multi-attach
                    // stored in JSONB, not a top-level column). Priority: msg.attachments
                    // (local React state, e.g. image-gen) > metadata.attachments (DB,
                    // multi-attach from relay-respond.py --attach x2) > single-url path.
                    const metaAtts = (msg.metadata?.attachments && Array.isArray(msg.metadata.attachments) && msg.metadata.attachments.length)
                      ? msg.metadata.attachments : null
                    const atts = (msg.attachments && msg.attachments.length)
                      ? msg.attachments
                      : metaAtts
                        ? metaAtts
                        : attUrl
                          ? [{ url: attUrl, mime: attMime, size: attSize, name: attName }]
                          : []
                    if (!atts.length) return null
                    const hasText = msg.text && !((attUrl || metaAtts?.length > 0) && (msg.text.startsWith('Attached file: ') || /^Attached \d+ files?: /.test(msg.text)))
                    const isMulti = atts.length > 1
                    const items = atts.map((att, attIdx) => {
                      const isImage = att.mime && att.mime.startsWith('image/')
                      const isVideo = att.mime && att.mime.startsWith('video/')
                      const isAudio = att.mime && att.mime.startsWith('audio/')
                      const openAttachment = () => {
                        if (!att.url) return
                        setPreviewAtt(att)
                      }
                      if (isVideo) {
                        return (
                          <div
                            key={attIdx}
                            style={{
                              alignSelf: isUser ? 'flex-end' : 'flex-start',
                              borderRadius: 16,
                              overflow: 'hidden',
                              maxWidth: '70%',
                              background: '#000',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                            }}
                          >
                            <video
                              controls
                              preload="metadata"
                              src={att.url}
                              style={{ display: 'block', width: '100%', maxHeight: 480, borderRadius: 16 }}
                            />
                            {att.name && (
                              <div style={{ fontSize: 11, color: C.muted, padding: '6px 10px', background: C.s1 }}>
                                {att.name}
                              </div>
                            )}
                          </div>
                        )
                      }
                      if (isAudio) {
                        return (
                          <div
                            key={attIdx}
                            style={{
                              alignSelf: isUser ? 'flex-end' : 'flex-start',
                              borderRadius: 16,
                              padding: 12,
                              background: `linear-gradient(180deg, ${C.s2}, ${C.s1})`,
                              border: `1px solid ${C.border2}`,
                              maxWidth: 360,
                            }}
                          >
                            <audio controls preload="metadata" src={att.url} style={{ width: '100%' }} />
                            {att.name && (
                              <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{att.name}</div>
                            )}
                          </div>
                        )
                      }
                      if (isImage) {
                        return (
                          <div key={attIdx} style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
                            <div
                              role="button"
                              tabIndex={0}
                              title={att.name || 'Open image'}
                              onClick={openAttachment}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAttachment() } }}
                              style={{
                                borderRadius: 16, overflow: 'hidden',
                                maxWidth: '70%', cursor: 'pointer',
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.02)'
                                e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)'
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)'
                                e.currentTarget.style.boxShadow = 'none'
                              }}
                            >
                              <img src={att.url} alt={att.name || ''} style={{ width: '100%', display: 'block', borderRadius: 16 }} />
                            </div>
                            {!isUser && (
                              <button
                                onClick={openAttachment}
                                title="Review this image"
                                style={{
                                  alignSelf: 'flex-start',
                                  padding: '6px 12px',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  background: C.accent,
                                  color: C.bg,
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  transition: 'opacity 0.15s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                              >
                                Review
                              </button>
                            )}
                          </div>
                        )
                      }
                      // ─── Non-image: polished, clickable file card ───
                      const ext = (att.name ? att.name.split('.').pop() : '').toLowerCase()
                      const EXT_COLORS = {
                        pdf: C.red,
                        doc: C.blue, docx: C.blue, rtf: C.blue,
                        xls: C.green, xlsx: C.green, csv: C.green, numbers: C.green,
                        ppt: C.orange, pptx: C.orange, keynote: C.orange,
                        zip: C.orange, rar: C.orange, tar: C.orange, gz: C.orange,
                        mp3: C.purple, wav: C.purple, m4a: C.purple, aac: C.purple, flac: C.purple,
                        mp4: C.pink, mov: C.pink, webm: C.pink, mkv: C.pink, avi: C.pink,
                        txt: C.muted, md: C.muted, log: C.muted,
                        json: C.teal, yml: C.teal, yaml: C.teal, xml: C.teal, html: C.teal,
                        js: C.yellow, jsx: C.yellow, ts: C.yellow, tsx: C.yellow, py: C.yellow,
                      }
                      const tagColor = EXT_COLORS[ext] || C.accent
                      const fileSizeLabel = att.size == null ? null
                        : att.size < 1024
                          ? `${att.size} B`
                          : att.size < 1024 * 1024
                            ? `${Math.round(att.size / 1024)} KB`
                            : `${(att.size / (1024 * 1024)).toFixed(1)} MB`
                      return (
                        <div
                          key={attIdx}
                          role="button"
                          tabIndex={0}
                          title={att.name ? `Open ${att.name}` : 'Open attachment'}
                          onClick={openAttachment}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAttachment() } }}
                          style={{
                            alignSelf: isMulti ? 'stretch' : (isUser ? 'flex-end' : 'flex-start'),
                            background: `linear-gradient(180deg, ${C.s2}, ${C.s1})`,
                            border: `1px solid ${C.border2}`,
                            borderRadius: isMulti ? 12 : 16,
                            padding: isMulti ? '8px 12px' : '12px 14px',
                            display: 'flex', alignItems: 'center', gap: isMulti ? 10 : 12,
                            maxWidth: isMulti ? '100%' : 320,
                            minWidth: isMulti ? 0 : 220,
                            width: isMulti ? '100%' : undefined,
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                            boxShadow: '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)',
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 18px rgba(0,0,0,0.4)'
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                            const hint = e.currentTarget.querySelector('[data-open-hint]')
                            if (hint) hint.style.opacity = '1'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.02) inset, 0 2px 8px rgba(0,0,0,0.25)'
                            e.currentTarget.style.borderColor = C.border2
                            const hint = e.currentTarget.querySelector('[data-open-hint]')
                            if (hint) hint.style.opacity = '0'
                          }}
                        >
                          {/* Document icon block with extension ribbon */}
                          <div style={{
                            position: 'relative',
                            width: isMulti ? 32 : 44, height: isMulti ? 38 : 52, flexShrink: 0,
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                          }}>
                            <svg viewBox="0 0 44 52" width={isMulti ? 32 : 44} height={isMulti ? 38 : 52} aria-hidden="true">
                              <defs>
                                <linearGradient id={`docGrad-${msg.id}-${attIdx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="rgba(255,255,255,0.10)" />
                                  <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
                                </linearGradient>
                              </defs>
                              <path
                                d="M6 2 H28 L40 14 V46 a4 4 0 0 1 -4 4 H6 a4 4 0 0 1 -4 -4 V6 a4 4 0 0 1 4 -4 z"
                                fill={`url(#docGrad-${msg.id}-${attIdx})`}
                                stroke="rgba(255,255,255,0.18)"
                                strokeWidth="1"
                              />
                              <path
                                d="M28 2 V14 H40"
                                fill="none"
                                stroke="rgba(255,255,255,0.22)"
                                strokeWidth="1"
                              />
                              {/* Extension ribbon */}
                              <rect x="2" y="30" width="36" height="14" rx="3" fill={tagColor} />
                              <text
                                x="20" y="40"
                                textAnchor="middle"
                                fontFamily="'JetBrains Mono', ui-monospace, monospace"
                                fontSize="8"
                                fontWeight="800"
                                fill="#0B1018"
                                letterSpacing="0.04em"
                              >
                                {ext ? ext.toUpperCase().slice(0, 5) : 'FILE'}
                              </text>
                            </svg>
                          </div>
                          {/* Filename + size */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13, fontWeight: 600, color: C.text,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              lineHeight: 1.25,
                            }}>
                              {att.name || 'Attached file'}
                            </div>
                            <div style={{
                              marginTop: 2,
                              display: 'flex', alignItems: 'center', gap: 6,
                              fontSize: 10, color: C.muted,
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                              letterSpacing: '0.02em',
                            }}>
                              {fileSizeLabel && <span>{fileSizeLabel}</span>}
                              {fileSizeLabel && <span style={{ opacity: 0.5 }}>·</span>}
                              <span style={{ color: tagColor, fontWeight: 700 }}>
                                {ext ? ext.toUpperCase() : 'FILE'}
                              </span>
                            </div>
                          </div>
                          {/* Open affordance, fades in on hover */}
                          <div
                            data-open-hint
                            style={{
                              flexShrink: 0,
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                              color: C.text2, opacity: 0, transition: 'opacity 0.15s ease',
                              display: 'flex', alignItems: 'center', gap: 4,
                              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                            }}
                          >
                            OPEN
                            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                              <path d="M2 8 L8 2 M4 2 H8 V6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      )
                    })
                    if (isMulti) {
                      // R79-f23 Leg 2 (2026-05-30): stack multi-attachments
                      // vertically with a batch header pill. Old layout was a
                      // horizontal row that squeezed each card below its
                      // min-width, end-truncating filenames at the same place
                      // and producing 4 visually-identical "Arizona S..." cards.
                      // Vertical stack + full-width cards keeps the
                      // distinguishing tail of each filename visible.
                      const totalSize = atts.reduce(
                        (sum, a) => sum + (typeof a.size === 'number' ? a.size : 0),
                        0,
                      )
                      const totalLabel = totalSize > 0
                        ? totalSize < 1024 * 1024
                          ? `${Math.round(totalSize / 1024)} KB`
                          : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`
                        : null
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          padding: '6px 16px',
                          marginTop: hasText ? 6 : 0,
                          maxWidth: 380,
                          alignSelf: isUser ? 'flex-end' : 'flex-start',
                          width: '100%',
                          boxSizing: 'border-box',
                        }}>
                          {/* Batch header pill */}
                          <div style={{
                            alignSelf: isUser ? 'flex-end' : 'flex-start',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${C.border}`,
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: C.text2,
                            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                            marginBottom: 2,
                          }}>
                            <span>{atts.length} files</span>
                            {totalLabel && (
                              <>
                                <span style={{ opacity: 0.4 }}>·</span>
                                <span style={{ opacity: 0.7 }}>{totalLabel}</span>
                              </>
                            )}
                          </div>
                          {items}
                        </div>
                      )
                    }
                    return <div style={{ marginTop: hasText ? 6 : 0 }}>{items}</div>
                  })()}
                  {/* Timestamp + check marks + verification badge. */}
                  <div style={{
                    fontSize: 11,
                    color: isProject ? 'rgba(120,140,165,0.4)' : 'rgba(120,140,165,0.5)',
                    marginTop: 4,
                    textAlign: isUser ? 'right' : 'left',
                    paddingRight: isUser ? 2 : 0,
                    paddingLeft: isUser ? 0 : 2,
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    gap: isProject ? 6 : 2,
                  }}>
                    {isProject
                      ? <span>{formatChatTime(msg.timestamp)}</span>
                      : formatChatTime(msg.timestamp)
                    }
                    {!isProject && isUser && <MessageChecks msgId={msg.id} isResponded={respondedSet.has(msg.id)} />}
                    {msgFlagged && (
                      <span style={isProject ? {} : { marginLeft: 6 }}>
                        <NeedsVerificationBadge testId={`msg-verify-badge-${msg.id}`} label="Needs QA" />
                      </span>
                    )}
                  </div>
                  {/* Agent rooms: message status label. */}
                  {!isProject && isUser && msg.status && !String(msg.id).startsWith('temp-') && (
                    <MessageStatusLabel status={msg.status} replied={respondedSet.has(msg.id)} />
                  )}
                </div>
                {/* User avatar */}
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
                      : <span style={{
                          fontSize: isProject ? 11 : 10,
                          fontWeight: 700, color: '#fff',
                          fontFamily: isProject ? "'Inter', sans-serif" : undefined,
                        }}>{senderInitial}</span>
                    }
                  </div>
                )}
              </div>
              </div>{/* end hover wrapper */}
              {/* corner:mission-rooms — under-user step chain.
                  Last user bubble while in-flight: MERGE synthetic phases
                  with any real backend steps so the chain keeps animating
                  through 4 phases even after the backend emits its single
                  baseline step 0. Real steps win by step_index when present
                  (text + status from backend); synthetic phases fill the
                  gaps so the chain feels alive instead of freezing on
                  "Read your message" the moment the backend row lands.
                  Historical user bubbles render their real steps as-is. */}
              {(() => {
                const isLast = isUser && idx === arr.length - 1
                const liveMerge = isLast && inFlight && !hasAssistantReply
                // R15: R14 already prevents assistant bubbles from getting userBubbleSteps (null).
                // R12e's hasAssistantReply gate was redundant after R14 and was hiding steps
                // from settled conversations entirely. Just gate on whether steps exist.
                if (!liveMerge && !userBubbleSteps) return null
                let displaySteps
                let settledFlag
                if (liveMerge) {
                  const real = userBubbleSteps || []
                  const syn = syntheticSteps || []
                  const maxLen = Math.max(real.length, syn.length)
                  displaySteps = []
                  for (let i = 0; i < maxLen; i++) {
                    if (real[i]) displaySteps.push(real[i])
                    else if (syn[i]) displaySteps.push(syn[i])
                  }
                  settledFlag = false
                } else {
                  displaySteps = userBubbleSteps
                  settledFlag = hasAssistantReply
                }
                if (!displaySteps || displaySteps.length === 0) return null
                return (
                  <div style={{ paddingLeft: 38, paddingTop: 6, paddingBottom: 12 }}>
                    <StepThread
                      steps={displaySteps}
                      settled={settledFlag}
                      isError={false}
                      isStalled={liveMerge ? chainStalled : false}
                      agentColor={roomColor}
                    />
                  </div>
                )
              })()}
            </React.Fragment>
          )
        })}

      {/* R11 FIXED — removed this synthetic chain render that was clustering
          steps at the bottom. Steps now render ONLY inline with their parent
          message (lines 1797-1829 for user, 1326-1339 for assistant).
          The separate end-of-list render was breaking the message → steps →
          message → steps interspersing pattern. */}
      {/* corner:chat-reliability CR-2 -- task-room failure final step. */}
      {(taskTerminalFailed || followupFailed) && inFlightRaw && (
        <div style={{ paddingLeft: 38, paddingBottom: 4 }}>
          <StepThread
            steps={[{
              id: 'task-room-failed',
              step_index: 0,
              text: taskTerminalFailed && taskRow?.error
                ? `Worker failed: ${String(taskRow.error).slice(0, 200)}`
                : 'Worker failed. Send another message to retry.',
              status: 'error',
            }]}
            settled={true}
            isError={true}
            agentColor={roomColor}
          />
          <TypingIndicatorV2
            streaming={true}
            stalled={chainStalled}
            stepActiveRecently={stepActiveRecently}
            agentColor={roomColor}
            agentSlug={roomSlug}
            agentName={roomName}
            {...(!isProject && { onPoke: (text) => sendAgentTextRef?.current?.(text) })}
            onStall={handleTypingStall}
            worldId={worldId || 'aom'}
            compact={true}
          />
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Right-click / long-press context menu for messages (desktop) */}
    {!isMobile && (
      <MessageContextMenu
        open={!!msgMenu}
        x={msgMenu?.x || 0}
        y={msgMenu?.y || 0}
        message={msgMenu?.message || null}
        agents={agents || []}
        onClose={() => setMsgMenu(null)}
        onReply={(m) => handleMessageFollowUp?.(m)}
        onFollowUp={(m) => handleMessageFollowUp?.(m)}
        onNeedsVerification={(m) => handleMessageNeedsVerification?.(m)}
        onResearch={(m) => handleMessageResearch?.(m)}
        onSendTo={(target) => handleMessageSendTo?.(msgMenu?.message, target)}
      />
    )}
    {/* Mobile long-press action sheet (bottom sheet) */}
    {isMobile && (
      <MobileActionSheet
        open={!!msgMenu}
        message={msgMenu?.message || null}
        onClose={() => setMsgMenu(null)}
        onReply={(m) => handleMessageFollowUp?.(m)}
        onCopy={(m) => { if (m?.text) navigator.clipboard?.writeText(m.text).catch(() => {}) }}
        onNeedsVerification={(m) => handleMessageNeedsVerification?.(m)}
        onResearch={(m) => handleMessageResearch?.(m)}
      />
    )}
    {previewAtt && <AttachmentPreview att={previewAtt} onClose={() => setPreviewAtt(null)} />}
    </>
  )
}

// memo: MessageList takes only the stable `roomType` prop, so it re-renders
// only when a context it consumes (messages / steps / send-state / search)
// actually changes — NOT on every keystroke as ChatPanel re-renders above it.
// This is half of the 2026-05-22 send-latency fix (the other half is splitting
// `input` out of the send context in ChatPanelContext.jsx).
export default React.memo(MessageList)