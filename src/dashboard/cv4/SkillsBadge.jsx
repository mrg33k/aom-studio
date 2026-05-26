// SkillsBadge — purple Skills button injected into the right-rail header.
// Clicking opens the Skills shelf, which takes over the left rail.
//
// corner:skills-picker R1, 2026-05-25.

const PURPLE = '#A78BFA'
const PURPLE_RING = 'rgba(167,139,250,0.42)'

export default function SkillsBadge({ open, onToggle }) {
  return (
    <button
      type="button"
      title={open ? 'Close Skills' : 'Open Skills'}
      aria-label="Skills"
      aria-expanded={open}
      data-testid="cv4-skills-badge"
      onClick={onToggle}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px 5px 8px',
        height: 26,
        borderRadius: 999,
        background: open
          ? 'linear-gradient(135deg, rgba(167,139,250,0.32) 0%, rgba(139,92,246,0.40) 100%)'
          : 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(139,92,246,0.26) 100%)',
        border: `1px solid ${open ? PURPLE_RING : 'rgba(167,139,250,0.32)'}`,
        color: PURPLE,
        fontFamily: "'JetBrains Mono', 'Menlo', monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
        boxShadow: open
          ? '0 0 0 3px rgba(167,139,250,0.10), 0 2px 8px rgba(124,58,237,0.32)'
          : '0 1px 4px rgba(124,58,237,0.20)',
      }}
    >
      <SparkleIcon />
      <span>Skills</span>
    </button>
  )
}

function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
      />
      <path
        d="M19 16L19.6 18.4L22 19L19.6 19.6L19 22L18.4 19.6L16 19L18.4 18.4L19 16Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  )
}
