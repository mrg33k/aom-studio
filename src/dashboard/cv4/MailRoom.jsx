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
  // R16 — merge real attachments + inline parts into one strip. Gmail
  // flags forwarded images as Content-Disposition: inline; the original
  // HTML still references them via cid: (which we swap into iframe img
  // src), but Patrik also wants to see them as visible cards so they
  // never feel hidden. Deduplicate by attachmentId.
  const allAttachments = useMemo(() => {
    const seen = new Set()
    const out = []
    for (const a of (body?.attachments || [])) {
      if (a.attachmentId && !seen.has(a.attachmentId)) { seen.add(a.attachmentId); out.push(a) }
    }
    for (const a of (body?.inline || [])) {
      if (a.attachmentId && !seen.has(a.attachmentId)) { seen.add(a.attachmentId); out.push(a) }
    }
    return out
  }, [body?.attachments, body?.inline])

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

 {/* R16, Attachments above the body so they're never hidden below
            a tall HTML email. Patrik missed the xlsx on the first pass
            because the body iframe pushed the strip off-screen. */}
        {allAttachments.length > 0 && (
          <AttachmentStrip
            messageId={body?.id}
            connectionId={activeConnection?.id || null}
            attachments={allAttachments}
          />
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
        fontSize: 19, fontWeight: 700, color: C.text, lineHeight: 1.3,
        fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '-0.02em', marginBottom: 8,
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
  // R17 (2026-05-25) — preview modal state lifted to the strip so all
  // cards share one modal and only one preview opens at a time.
  const [preview, setPreview] = useState(null)
  return (
    <div style={{
      padding: '12px 22px 18px',
      borderTop: '1px solid ' + C.border,
      borderBottom: '1px solid ' + C.border,
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
            onOpen={() => setPreview(att)}
          />
        ))}
      </div>
      {preview && (
        <AttachmentPreviewModal
          messageId={messageId}
          connectionId={connectionId}
          attachment={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}

function AttachmentCard({ messageId, connectionId, attachment, onOpen }) {
  const { filename, mimeType, size } = attachment
  const isImage = mimeType?.startsWith('image/')
  const inlineUrl = buildAttachmentUrl({ messageId, connectionId, attachment, disposition: 'inline' })
  const label = mimeLabel(filename, mimeType)
  // R17d — Supabase keeps the session in localStorage, so <img src> requests
  // never carry the Authorization bearer; the endpoint 401s and the preview
  // looks broken. authFetch the bytes ourselves and use a blob URL instead.
  const imgBlob = useAttachmentBlob(isImage ? inlineUrl : null, mimeType)

  return (
    <div
      role="button"
      tabIndex={0}
      title={`${filename || '(unnamed)'} · ${formatSize(size)} · click to preview`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        width: 168, padding: 8, borderRadius: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: C.text2, cursor: 'pointer',
        overflow: 'hidden',
        transition: 'background 0.12s, border-color 0.12s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
        e.currentTarget.style.borderColor = 'rgba(234,179,8,0.35)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
      }}
    >
      <div style={{
        width: '100%', height: 96,
        background: 'rgba(0,0,0,0.25)', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {isImage && imgBlob.url ? (
          <img
            src={imgBlob.url} alt={filename || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <FileGlyph label={label} />
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.text2,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{filename || '(unnamed)'}</div>
      <div style={{
        fontSize: 9, color: C.dim,
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{label} · {formatSize(size)}</span>
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); downloadAttachment({ messageId, connectionId, attachment }) }}
          style={{ color: '#eab308', cursor: 'pointer' }}
        >↓ Save</span>
      </div>
    </div>
  )
}

// R17d — Fetch the attachment bytes via authFetch (Bearer header included)
// and expose a same-origin blob URL the browser can load directly. Revokes
// the URL on unmount so we don't leak object URLs. Pass null `url` to skip
// (e.g. only fetch image previews; everything else loads on modal open).
function useAttachmentBlob(url, mimeType) {
  const [state, setState] = useState({ url: null, loading: false, error: null })
  useEffect(() => {
    if (!url) { setState({ url: null, loading: false, error: null }); return }
    let cancelled = false
    let createdUrl = null
    setState({ url: null, loading: true, error: null })
    ;(async () => {
      try {
        const r = await authFetch(url)
        if (!r.ok) {
          if (!cancelled) setState({ url: null, loading: false, error: `HTTP ${r.status}` })
          return
        }
        const blob = await r.blob()
        const typed = mimeType ? new Blob([blob], { type: mimeType }) : blob
        createdUrl = URL.createObjectURL(typed)
        if (!cancelled) setState({ url: createdUrl, loading: false, error: null })
      } catch (e) {
        if (!cancelled) setState({ url: null, loading: false, error: e.message || 'failed' })
      }
    })()
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [url, mimeType])
  return state
}

// R17d — Download flow that works despite localStorage-only auth. Fetch
// via authFetch (bearer in header), create a temporary anchor pointing at
// a blob URL with `download` set, click it, revoke the URL. The Bearer
// header satisfies the endpoint; the download attribute makes the browser
// save the bytes with the right filename.
async function downloadAttachment({ messageId, connectionId, attachment }) {
  const inlineUrl = buildAttachmentUrl({ messageId, connectionId, attachment, disposition: 'attachment' })
  try {
    const r = await authFetch(inlineUrl)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const blob = await r.blob()
    const typed = attachment.mimeType ? new Blob([blob], { type: attachment.mimeType }) : blob
    const url = URL.createObjectURL(typed)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.filename || 'attachment'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (e) {
    console.error('[MailRoom] download failed', e)
  }
}

function FileGlyph({ label }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, color: '#eab308',
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.08em',
    }}>{label}</span>
  )
}

// R17 — modal preview. Inline-rendered for previewable types (image / PDF
// / plain text / HTML); for everything else show a centered file card
// with the Download button. Esc closes; click backdrop closes; Download
// uses the &disposition=attachment URL so the browser saves rather than
// opens, regardless of the inline render state.
function AttachmentPreviewModal({ messageId, connectionId, attachment, onClose }) {
  const { filename, mimeType, size } = attachment
  const inlineUrl = buildAttachmentUrl({ messageId, connectionId, attachment, disposition: 'inline' })
  const label = mimeLabel(filename, mimeType)
  const previewKind = (() => {
    if (mimeType?.startsWith('image/')) return 'image'
    if (mimeType === 'application/pdf') return 'pdf'
    if (mimeType?.startsWith('text/') || mimeType === 'application/json') return 'text'
    if (mimeType?.startsWith('audio/')) return 'audio'
    if (mimeType?.startsWith('video/')) return 'video'
    return 'binary'
  })()
  // R17d — blob URL so the iframe / img / audio / video can carry no auth
  // header and still load the bytes. Only fetch when the type is
  // previewable; binary fallback doesn't need bytes.
  const blob = useAttachmentBlob(previewKind === 'binary' ? null : inlineUrl, mimeType)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 400,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'cv4MailModalFade 0.18s ease-out',
      }}
    >
      <style>{`
        @keyframes cv4MailModalFade { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 980, height: '92vh',
          display: 'flex', flexDirection: 'column',
          background: C.bg, border: '1px solid ' + C.border,
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid ' + C.border,
          background: 'rgba(234,179,8,0.05)',
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#eab308',
            letterSpacing: '0.10em', textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '3px 7px', borderRadius: 4,
            background: 'rgba(234,179,8,0.15)',
            border: '1px solid rgba(234,179,8,0.32)',
            flexShrink: 0,
          }}>{label}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: C.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}>{filename || '(unnamed)'}</div>
            <div style={{
              fontSize: 10, color: C.dim,
              fontFamily: "'JetBrains Mono', monospace",
            }}>{formatSize(size)} · {mimeType || 'application/octet-stream'}</div>
          </div>
          <button
            type="button"
            onClick={() => downloadAttachment({ messageId, connectionId, attachment })}
            title="Download (saves to your machine)"
            style={{
              padding: '6px 12px', borderRadius: 6,
              background: 'rgba(234,179,8,0.18)',
              border: '1px solid rgba(234,179,8,0.42)',
              color: '#eab308', cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}
          >↓ Download</button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            title="Close (Esc)"
            style={{
              padding: '6px 12px', borderRadius: 6,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: C.text2, cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}
          >Close</button>
        </div>

        <div style={{
          flex: 1, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)',
          minHeight: 0,
        }}>
          {previewKind !== 'binary' && blob.loading && (
            <div style={{ color: C.muted, fontSize: 13 }}>Loading preview…</div>
          )}
          {previewKind !== 'binary' && blob.error && (
            <div style={{ color: '#f87171', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
              Couldn’t load: {blob.error}
            </div>
          )}
          {previewKind === 'image' && blob.url && (
            <img
              src={blob.url} alt={filename || ''}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          )}
          {previewKind === 'pdf' && blob.url && (
            <iframe
              title={filename || 'PDF preview'}
              src={blob.url}
              style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            />
          )}
          {previewKind === 'text' && blob.url && (
            <iframe
              title={filename || 'Text preview'}
              src={blob.url}
              style={{ width: '100%', height: '100%', border: 'none', background: '#0d0e10' }}
            />
          )}
          {previewKind === 'audio' && blob.url && (
            <audio controls src={blob.url} style={{ width: '80%' }} />
          )}
          {previewKind === 'video' && blob.url && (
            <video controls src={blob.url} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          )}
          {previewKind === 'binary' && (
            <BinaryFallback
              label={label} filename={filename} size={size} mimeType={mimeType}
              onDownload={() => downloadAttachment({ messageId, connectionId, attachment })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function BinaryFallback({ label, filename, size, mimeType, onDownload }) {
  return (
    <div style={{
      padding: '40px 32px', textAlign: 'center', color: C.text2,
      maxWidth: 440,
    }}>
      <div style={{
        margin: '0 auto 18px',
        width: 96, height: 96, borderRadius: 12,
        background: 'rgba(234,179,8,0.10)',
        border: '1px solid rgba(234,179,8,0.30)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#eab308', fontWeight: 700, fontSize: 20,
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.08em',
      }}>{label}</div>
      <div style={{
        fontSize: 16, fontWeight: 700, color: C.text,
        fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '-0.02em', marginBottom: 6,
      }}>{filename || '(unnamed)'}</div>
      <div style={{
        fontSize: 11, color: C.dim,
        fontFamily: "'JetBrains Mono', monospace", marginBottom: 22,
      }}>{formatSize(size)} · {mimeType}</div>
      <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 22 }}>
        This file type can’t be previewed in the browser. Download it to open in the right app.
      </p>
      <button
        type="button"
        onClick={onDownload}
        style={{
          display: 'inline-block', padding: '10px 18px', borderRadius: 8,
          background: 'rgba(234,179,8,0.20)',
          border: '1px solid rgba(234,179,8,0.45)',
          color: '#eab308', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >↓ Download {filename ? filename.split('.').pop().toUpperCase() : 'File'}</button>
    </div>
  )
}

function buildAttachmentUrl({ messageId, connectionId, attachment, disposition }) {
  const { attachmentId, filename, mimeType } = attachment
  const connQs = connectionId ? `&connection_id=${encodeURIComponent(connectionId)}` : ''
  return `/api/dashboard/mail/attachment?id=${encodeURIComponent(messageId)}&attachmentId=${encodeURIComponent(attachmentId)}&mimeType=${encodeURIComponent(mimeType || 'application/octet-stream')}&filename=${encodeURIComponent(filename || 'attachment')}${connQs}&disposition=${disposition}`
}

// R17 — pick a tight label per file. Filename extension wins (it's what the
// user actually sees in Finder); fall back to mimeType heuristics; final
// fallback is "FILE". Always upper-case, max 5 chars to fit the badge.
function mimeLabel(filename, mimeType) {
  const fromName = (filename || '').toLowerCase().split('.').pop()
  if (fromName && fromName !== filename?.toLowerCase() && fromName.length <= 5) {
    return fromName.toUpperCase()
  }
  const mt = (mimeType || '').toLowerCase()
  if (!mt) return 'FILE'
  if (mt === 'application/pdf') return 'PDF'
  if (mt === 'application/zip' || mt.includes('compressed')) return 'ZIP'
  if (mt.startsWith('image/')) return mt.split('/')[1].toUpperCase().slice(0, 5)
  if (mt.startsWith('audio/')) return mt.split('/')[1].toUpperCase().slice(0, 5)
  if (mt.startsWith('video/')) return mt.split('/')[1].toUpperCase().slice(0, 5)
  if (mt.includes('spreadsheetml') || mt.includes('excel')) return 'XLSX'
  if (mt.includes('wordprocessingml') || mt.includes('msword')) return 'DOCX'
  if (mt.includes('presentationml') || mt.includes('powerpoint')) return 'PPTX'
  if (mt.startsWith('text/csv')) return 'CSV'
  if (mt.startsWith('text/')) return 'TXT'
  if (mt === 'application/json') return 'JSON'
  return 'FILE'
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}