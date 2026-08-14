import { C } from '../lib/cv3Colors.js'

export default function BucketSection({ slug, label, count, open, onToggle, loading, children }) {
  const empty = count === 0
  return (
    <div data-cv4-bucket={slug}>
      <button
        type="button"
        onClick={() => !empty && onToggle?.(slug)}
        disabled={empty}
        aria-expanded={open}
        style={{
          width: '100%',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          border: 'none', borderBottom: '1px solid #1a1a20',
          color: open ? '#10b981' : (empty ? C.dim : C.muted),
          fontWeight: open ? 700 : 600,
          background: open ? 'rgba(16,185,129,0.06)' : 'transparent',
          cursor: empty ? 'default' : 'pointer',
          opacity: empty ? 0.5 : 1,
        }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9 }}>{open ? '▾' : '▸'}</span>
          <span>{label}</span>
        </span>
        <span style={{ fontSize: 11, color: 'inherit', opacity: 0.7 }}>
 {loading ? '·' : count}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}