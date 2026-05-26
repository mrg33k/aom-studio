// SkillsBadge — purple rectangular CTA in the left-rail Drawer, above the
// Agents section. Click opens the Skills shelf, which takes over the rest
// of the rail.
//
// corner:skills-picker R1, 2026-05-25.

const PURPLE = '#A78BFA'
const PURPLE_DEEP = '#7C3AED'

export default function SkillsBadge({ open, onToggle }) {
  return (
    <button
      type="button"
      title={open ? 'Close Skills' : 'Browse skills'}
      aria-label={open ? 'Close skills' : 'Browse skills'}
      aria-expanded={open}
      data-testid="cv4-skills-badge"
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '11px 14px',
        marginBottom: 10,
        borderRadius: 10,
        background: open
          ? 'linear-gradient(135deg, rgba(167,139,250,0.45) 0%, rgba(124,58,237,0.55) 100%)'
          : 'linear-gradient(135deg, rgba(167,139,250,0.28) 0%, rgba(124,58,237,0.42) 100%)',
        border: `1px solid ${open ? 'rgba(167,139,250,0.85)' : 'rgba(167,139,250,0.55)'}`,
        color: '#FFFFFF',
        fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.005em',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: open
          ? '0 0 0 3px rgba(167,139,250,0.16), 0 6px 18px rgba(124,58,237,0.38)'
          : '0 3px 10px rgba(124,58,237,0.28)',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!open) {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167,139,250,0.38) 0%, rgba(124,58,237,0.52) 100%)'
          e.currentTarget.style.boxShadow = '0 5px 14px rgba(124,58,237,0.36)'
        }
      }}
      onMouseLeave={(e) => {
        if (!open) {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167,139,250,0.28) 0%, rgba(124,58,237,0.42) 100%)'
          e.currentTarget.style.boxShadow = '0 3px 10px rgba(124,58,237,0.28)'
        }
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 26,
          height: 26,
          borderRadius: 7,
          background: 'rgba(255,255,255,0.16)',
          flexShrink: 0,
        }}
      >
        <BoltIcon />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {open ? 'Close skills' : 'Skills'}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.82)',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.005em',
            marginTop: 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {open ? 'tap to go back' : '100+ Skills ready to go.'}
        </span>
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.85)',
          flexShrink: 0,
          transition: 'transform 0.18s',
          transform: open ? 'rotate(90deg)' : 'none',
        }}
      >
        ›
      </span>
    </button>
  )
}

function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M13 2L4.5 13.5h6L11 22l8.5-11.5h-6L13 2z"
        fill="#FFFFFF"
      />
    </svg>
  )
}
