import { C } from '../../../lib/cv3Colors.js'
import { useChatMessagesCtx } from '../chat/ChatPanelContext.jsx'

// Shared-files drawer opened from the thread header. Lists every message that
// carries an attachment_url as a thumbnail (images) or chip (files).
// R79-f13: also shows multi-file messages (metadata.attachments array).
export default function FilesPanel() {
  const { messages } = useChatMessagesCtx()
  // Expand each message into individual file entries for display.
  // Single-file messages: {msg, url, mime, name}
  // Multi-file messages (metadata.attachments): one entry per attached file.
  const fileEntries = []
  for (const m of messages) {
    const metaAtts = m.metadata?.attachments
    if (Array.isArray(metaAtts) && metaAtts.length > 0) {
      for (const att of metaAtts) {
        if (att?.url) fileEntries.push({ key: `${m.id}-${att.url}`, url: att.url, mime: att.mime, name: att.name })
      }
    } else if (m.attachment_url) {
      const metaAtt = m.metadata?.attachment
      const rawName = m.text && m.text.startsWith('Attached file: ')
        ? m.text.replace('Attached file: ', '').split('\n')[0]
        : metaAtt?.name || m.file_name || 'File'
      fileEntries.push({ key: m.id, url: m.attachment_url, mime: m.file_mime_type || metaAtt?.mime, name: rawName })
    }
  }
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
      {fileEntries.length === 0 ? (
        <div style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No files shared in this chat yet.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {fileEntries.map(({ key, url, mime, name }) => {
            const isImage = mime && mime.startsWith('image/')
            const rawName = name || 'File'
            return (
              <a
                key={key}
                href={url}
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
                    <img src={url} alt={rawName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
}
