// CV4 MailRoom — full-screen email viewer that covers the chat until you
// click Back (or the X). Scope of R15 (2026-05-25):
//   1. Email body always visible (no collapsible toggle), HTML rendered
//      in a sandboxed iframe with srcdoc so arbitrary Gmail CSS can't
//      break the page; text fallback if no HTML part.
//   2. Inline images (cid:<id>) swapped to /api/dashboard/mail/attachment
//      bytes before the iframe srcdoc is set, so they render inline.
//   3. Real attachments listed as cards below the body — clickable to
//      open inline (image preview, PDF in tab) or download.
//   4. Chat history + ThreadHeader hidden inside this scope via CSS
//      (data-cv3-message-list + data-role="thread-header"); the
//      ThreadInputBar composer stays visible, with MailChip auto-rendered
//      above it because CornerV4 now sets activeTool='mail' on click.
//   5. Sending a message from here routes through useChatSend, which
//      prepends the email body + Gmail-ID + Thread-ID as Mail Room
//      context before posting to the EA — the existing R5 wiring.

import { useEffect, useMemo, useState } from 'react'
import { C } from '../lib/cv3Colors.js'
import { authFetch } from '../lib/authFetch.js'
import { getUserWorld } from '../lib/clientConfig.js'
import ChatPanel from '../components/cv3/ChatPanel.jsx'

export default function MailRoom({ email, onBack }) {
  const [activeConnection, setActiveConnection] = useState(null)
  const [body, setBody] = useState(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyErr, setBodyErr] = useState('')

  // ── Active connection (for attachment URL connection_id param) ──────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await authFetch('/api/dashboard/mail/connections')
        if (!r.ok) return
        const j = await r.json()
        const list = Array.isArray(j?.connections) ? j.connections : []
        if (cancelled) return
        const ws = getUserWorld() || 'personal'
        const key = `cv4.mail.activeConnection.${ws}`
        const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
        setActiveConnection(list.find(c => c.id === lastId) || list[0] || null)
      } catch { /* ignore */ }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Always fetch the full body on email change ──────────────────────────
  useEffect(() => {
    if (!email?.id) return
    let cancelled = false
    setBodyLoading(true)
    setBodyErr('')
    setBody(null)
    authFetch(`/api/dashboard/mail/get?id=${encodeURIComponent(email.id)}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j?.error || `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((j) => { if (!cancelled) setBody(j) })
      .catch((e) => { if (!cancelled) setBodyErr(e.message || 'fetch-failed') })
      .finally(() => { if (!cancelled) setBodyLoading(false) })
    return () => { cancelled = true }
  }, [email?.id])

  // ── Build the iframe srcdoc once body + connection are known ────────────
  // Swap cid:<id> image refs in the HTML for attachment URLs so inline
  // images render. Wrap the body in a minimal style for legibility.
  const iframeSrcdoc = useMemo(() => {
    if (!body) return ''
    const html = body.bodyHtml || ''
    const text = body.bodyText || ''
    const inline = Array.isArray(body.inline) ? body.inline : []
    const connQs = activeConnection?.id ? `&connection_id=${encodeURIComponent(activeConnection.id)}` : ''
    let resolved = html
    if (html) {
      for (const att of inline) {
        if (!att.contentId || !att.attachmentId) continue
        const url = `/api/dashboard/mail/attachment?id=${encodeURIComponent(body.id)}&attachmentId=${encodeURIComponent(att.attachmentId)}&mimeType=${encodeURIComponent(att.mimeType || 'application/octet-stream')}${connQs}`
        // Match common cid: shapes — quoted, single-quoted, bare.
        const cidEsc = att.contentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        resolved = resolved.replace(new RegExp(`cid:${cidEsc}`, 'gi'), url)
      }
    }
    const reset = `
      <style>
        :root { color-scheme: dark; }
        html, body { margin: 0; padding: 16px; background: transparent;
          color: #e7e5d4; font-family: 'Hanken Grotesk', -apple-system, system-ui, sans-serif;
          font-size: 14px; line-height: 1.55; }
        a { color: #eab308; }
        img { max-width: 100%; height: auto; border-radius: 4px; }
        blockquote { border-left: 2px solid rgba(234,179,8,0.35); margin: 12px 0; padding: 4px 12px; color: #b8b39e; }
        pre, code { background: rgba(255,255,255,0.04); border-radius: 4px; padding: 2px 6px; }
        table { border-collapse: collapse; max-width: 100%; }
        td, th { padding: 4px 8px; border: 1px solid rgba(255,255,255,0.08); }
      </style>`
    if (resolved) return `<!doctype html><html><head>${reset}</head><body>${resolved}</body></html>`
    // Plain-text fallback — preserve whitespace.
    const escaped = (text || email?.snippet || '(empty message)')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<!doctype html><html><head>${reset}</head><body><pre style="white-space: pre-wrap; font-family: inherit; font-size: inherit; margin: 0;">${escaped}</pre></body></html>`
  }, [body, activeConnection?.id, email?.snippet])

  // Auto-size the iframe to its content so the email scrolls within the
  // outer pane instead of producing a nested scroll.
  const [iframeHeight, setIframeHeight] = useState(400)
  const onIframeLoad = (e) => {
    try {
      const doc = e.target.contentDocument
      if (!doc) return
      const h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
      setIframeHeight(Math.min(h + 24, 4000))
    } catch { /* cross-origin would block, but srcdoc is same-origin */ }
  }

  if (!email) return null

  const fromName = email.from?.name || email.from?.email || '(unknown)'
  const fromEmail = email.from?.email || ''
  const toLine = Array.isArray(body?.to) && body.to.length
    ? body.to.map(t => t.name || t.email).filter(Boolean).join(', ')
    : (activeConnection?.account_email || '')
  const when = email.date
    ? new Date(email.date).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : ''
  const attachments = Array.isArray(body?.attachments) ? body.attachments : []

  return (
    <div data-cv4-mail-room data-cv4-mail-fullview style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 0,
    }}>
      {/* Hide the embedded ChatPanel's message list + thread header within
          this scope so the email viewer + composer feel like one surface. */}
      <style>{`
        [data-cv4-mail-fullview] [data-cv3-message-list] { display: none !important; }
        [data-cv4-mail-fullview] [data-role="thread-header"] { display: none !important; }
      `}</style>

      {/* Scrollable email viewer — takes all the space above the composer. */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <Header
          fromName={fromName}
          fromEmail={fromEmail}
          to={toLine}
          subject={email.subject || '(no subject)'}
          when={when}
          onBack={onBack}
        />

        {bodyLoading && (
          <div style={{ padding: '18px 22px', color: C.muted, fontSize: 13 }}>Loading message…</div>
        )}
        {bodyErr && (
          <div style={{ padding: '14px 22px', color: '#f87171', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            Couldn’t load: {bodyErr}
          </div>
        )}

        {!bodyLoading && !bodyErr && iframeSrcdoc && (
          <iframe
            title="Email body"
            srcDoc={iframeSrcdoc}
            sandbox="allow-same-origin allow-popups"
            onLoad={onIframeLoad}
            style={{
              width: '100%', border: 'none', display: 'block',
              height: iframeHeight, background: 'transparent',
            }}
          />
        )}

        {attachments.length > 0 && (
          <AttachmentStrip
            messageId={body?.id}
            connectionId={activeConnection?.id || null}
            attachments={attachments}
          />
        )}
      </div>

      {/* The composer (ThreadInputBar) keeps working via the embedded
          ChatPanel — MailChip auto-renders above it because activeTool
          is now 'mail' and selectedMail is this email. Sends route to
          the EA chat with the Mail Room context prepended. */}
      <ChatPanel key={`mail-room-${email.id}`} />
    </div>
  )
}

function Header({ fromName, fromEmail, to, subject, when, onBack }) {
  return (
    <div style={{
      padding: '14px 22px 14px',
      borderBottom: '1px solid ' + C.border,
      background: 'rgba(234,179,8,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <button
          type="button" onClick={onBack}
          aria-label="Back to chat" title="Back to chat"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: C.text2, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{
          fontSize: 10, fontWeight: 700, color: '#eab308',
          letterSpacing: '0.10em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}>Mail Room</span>
        <span style={{ flex: 1 }} />
        {when && (
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'JetBrains Mono', monospace" }}>{when}</span>
        )}
        <button
          type="button" onClick={onBack}
          aria-label="Close email" title="Close email"
          style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'none', border: 'none', color: C.muted, cursor: 'pointer',
            fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0,
          }}
        >×</button>
      </div>
      <div style={{
        fontSize: 19, fontWeight: 600, color: C.text, lineHeight: 1.3,
        fontFamily: "'Instrument Serif', 'Inter', serif", marginBottom: 8,
      }}>{subject}</div>
      <div style={{
        fontSize: 12, color: C.text2, display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        <span><span style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginRight: 4 }}>FROM</span> <span style={{ fontWeight: 600 }}>{fromName}</span>{fromEmail && fromEmail !== fromName && (
          <span style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace", marginLeft: 4 }}>{`<${fromEmail}>`}</span>
        )}</span>
        {to && (
          <span><span style={{ color: C.muted, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, marginRight: 4 }}>TO</span> {to}</span>
        )}
      </div>
    </div>
  )
}

function AttachmentStrip({ messageId, connectionId, attachments }) {
  return (
    <div style={{
      padding: '12px 22px 18px',
      borderTop: '1px solid ' + C.border,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, color: C.dim,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        fontFamily: "'JetBrains Mono', monospace", marginBottom: 8,
      }}>Attachments · {attachments.length}</div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10,
      }}>
        {attachments.map(att => (
          <AttachmentCard
            key={att.attachmentId}
            messageId={messageId}
            connectionId={connectionId}
            attachment={att}
          />
        ))}
      </div>
    </div>
  )
}

function AttachmentCard({ messageId, connectionId, attachment }) {
  const { attachmentId, filename, mimeType, size } = attachment
  const isImage = mimeType?.startsWith('image/')
  const connQs = connectionId ? `&connection_id=${encodeURIComponent(connectionId)}` : ''
  const baseUrl = `/api/dashboard/mail/attachment?id=${encodeURIComponent(messageId)}&attachmentId=${encodeURIComponent(attachmentId)}&mimeType=${encodeURIComponent(mimeType || 'application/octet-stream')}&filename=${encodeURIComponent(filename || 'attachment')}${connQs}`
  const inlineUrl = baseUrl + '&disposition=inline'
  const downloadUrl = baseUrl + '&disposition=attachment'

  return (
    <a
      href={inlineUrl}
      target="_blank"
      rel="noreferrer noopener"
      title={`${filename} · ${formatSize(size)}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        width: 168, padding: 8, borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        textDecoration: 'none', color: C.text2,
        overflow: 'hidden',
      }}
    >
      <div style={{
        width: '100%', height: 96,
        background: 'rgba(0,0,0,0.25)', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {isImage ? (
          <img
            src={inlineUrl} alt={filename}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <FileGlyph mimeType={mimeType} />
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{filename || '(unnamed)'}</div>
      <div style={{
        fontSize: 9, color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{formatSize(size)}</span>
        <a
          href={downloadUrl}
          onClick={(e) => e.stopPropagation()}
          download={filename || 'attachment'}
          style={{ color: '#eab308', textDecoration: 'none' }}
        >↓ Save</a>
      </div>
    </a>
  )
}

function FileGlyph({ mimeType }) {
  const label = mimeType?.includes('pdf') ? 'PDF'
    : mimeType?.includes('word') || mimeType?.includes('document') ? 'DOC'
    : mimeType?.includes('sheet') || mimeType?.includes('excel') ? 'XLS'
    : mimeType?.includes('presentation') || mimeType?.includes('powerpoint') ? 'PPT'
    : mimeType?.includes('zip') || mimeType?.includes('compressed') ? 'ZIP'
    : 'FILE'
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: '#eab308',
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.08em',
    }}>{label}</span>
  )
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
