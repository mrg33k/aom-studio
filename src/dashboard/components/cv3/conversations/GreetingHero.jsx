// "Last login" subtitle + dynamic greeting headline. Extracted verbatim
// from ConversationsView during R2e split. R19a (2026-04-22) adds a
// small time-aware hello above the playful headline, tagged with
// [data-testid=greeting][data-variant=morning|afternoon|evening|late_night]
// so the Playwright gate can assert the variant pivots with the clock.
import { C } from '../../../lib/cv3Colors.js'

function timeVariant(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 23) return 'evening'
  return 'late_night'
}

function variantCopy(variant, name) {
  switch (variant) {
    case 'morning':    return `Good morning, ${name}`
    case 'afternoon':  return `Good afternoon, ${name}`
    case 'evening':    return `Good evening, ${name}`
    case 'late_night': return `Still up, ${name}?`
    default:           return `Hi, ${name}`
  }
}

export default function GreetingHero({ lastLoginText, GREETINGS, greetingIdx, displayName }) {
  const variant = timeVariant()
  const name = displayName || 'there'
  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: C.accent,
          boxShadow: `0 0 6px ${C.accent}`,
        }} />
        {lastLoginText ? `Last login: ${lastLoginText}` : 'Online now'}
      </div>
      <div
        data-testid="greeting"
        data-variant={variant}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.text2,
          marginBottom: 6,
          letterSpacing: '-0.01em',
        }}
      >
        {variantCopy(variant, name)}
      </div>
      <h1 style={{
        fontSize: 'clamp(26px, 5.5vw, 40px)',
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: '-0.04em',
        color: C.text,
        margin: 0,
        fontFamily: "'Inter', sans-serif",
      }}>
        {GREETINGS[greetingIdx](displayName)}
      </h1>
    </div>
  )
}
