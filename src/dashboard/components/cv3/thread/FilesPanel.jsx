import { C } from '../../../lib/cv3Colors.js'

// Shared-files drawer opened from the thread header. Lists every message that
// carries an attachment_url as a thumbnail (images) or chip (files).
export default function FilesPanel({ messages }) {
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
}
