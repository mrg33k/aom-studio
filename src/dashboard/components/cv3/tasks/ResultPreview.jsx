// ResultPreview -- typed payload renderer for completed tasks
// Extracted from TasksPanel.jsx (R2a)
//
// Post-rewire task completion payload format (Apr 14 tape):
//   {type: link|image|video|text|check_external, payload, summary}
// Workers write this via scripts/task-complete.sh. The bash helper stores it
// under metadata.result_payload AND stringifies it into the plain `result`
// column for backwards compatibility. This component prefers metadata and
// falls back to parsing `result`.

export function parseResultPayload(task) {
  const meta = task?.metadata
  if (meta && typeof meta === 'object' && meta.result_payload && meta.result_payload.type) {
    return meta.result_payload
  }
  const raw = task?.result
  if (typeof raw !== 'string' || !raw.trim()) return null
  const trimmed = raw.trim()
  if (trimmed[0] !== '{') return null
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && parsed.type) return parsed
  } catch {}
  return null
}

export function ResultPreview({ task, isDark }) {
  const payload = parseResultPayload(task)
  const rawResult = task?.result

  // Fall back to the raw string display if we can't parse a typed payload.
  if (!payload) {
    if (!rawResult) return null
    return (
      <div style={{
        fontSize: 12,
        color: isDark ? 'rgba(240,244,255,0.7)' : 'rgba(0,0,0,0.6)',
        lineHeight: 1.5,
        padding: '8px 10px',
        marginBottom: 8,
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        borderRadius: 8,
        fontFamily: "'Inter', sans-serif",
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {rawResult}
      </div>
    )
  }

  const { type, payload: value, summary } = payload
  const box = {
    padding: '10px 12px',
    marginBottom: 8,
    borderRadius: 10,
    background: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.14)',
    border: isDark ? '1px solid rgba(16,185,129,0.28)' : '1px solid rgba(16,185,129,0.32)',
    fontFamily: "'Inter', sans-serif",
  }
  const summaryStyle = {
    fontSize: 11,
    color: isDark ? 'rgba(240,244,255,0.55)' : 'rgba(0,0,0,0.55)',
    marginTop: 6,
    lineHeight: 1.4,
  }

  if (type === 'link') {
    return (
      <div style={box}>
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(16,185,129,0.22)',
            color: isDark ? 'rgba(187,247,208,0.95)' : 'rgba(6,78,59,0.95)',
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 700,
          }}
        >Open link ↗</a>
        <div style={summaryStyle}>{summary || value}</div>
      </div>
    )
  }

  if (type === 'image') {
    return (
      <div style={box}>
        <img
          src={value}
          alt={summary || 'result'}
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, display: 'block' }}
        />
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  if (type === 'video') {
    return (
      <div style={box}>
        <video
          src={value}
          controls
          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6, display: 'block' }}
          onClick={e => e.stopPropagation()}
        />
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  if (type === 'text') {
    return (
      <div style={box}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          margin: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          maxHeight: 160,
          overflow: 'auto',
          color: isDark ? 'rgba(240,244,255,0.85)' : 'rgba(0,0,0,0.8)',
        }}>{value}</pre>
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  if (type === 'check_external') {
    return (
      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 24, height: 24, borderRadius: 12,
            background: 'rgba(245,158,11,0.22)',
            color: 'rgba(253,230,138,0.95)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800,
            flexShrink: 0,
          }}>!</span>
          <span style={{ fontSize: 12, color: isDark ? 'rgba(240,244,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
            {value}
          </span>
        </div>
        {summary && <div style={summaryStyle}>{summary}</div>}
      </div>
    )
  }

  // Unknown payload type: show the raw string
  return (
    <div style={box}>
      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        {rawResult}
      </pre>
    </div>
  )
}

export default ResultPreview
