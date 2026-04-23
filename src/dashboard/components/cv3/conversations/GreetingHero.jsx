// R57: home hero hygiene — only the rotating greeting + a green live-dot
// sit at the top of home. No last-login stamp, no time-aware "Good morning"
// sub-line, no success-rate chip (that one lives in ConversationsView).
// Pillar 1 VISION: "rotating greetings with the green 'live' dot are the
// whole top of home; everything else above the agents list is noise."
//
// Historical: R19a parked [data-testid=greeting] + [data-variant] on a
// time-aware hello line; R52b collocated it with the last-login row. R57
// retires both sub-lines. The testid + variant attribute now sit on the
// H1 rotating-greeting element itself so R19's variant check still passes;
// the copy-check against "good morning / afternoon / …" is gone with the
// retired line.
import { C } from '../../../lib/cv3Colors.js'

function timeVariant(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 23) return 'evening'
  return 'late_night'
}

export default function GreetingHero({ GREETINGS, greetingIdx, displayName }) {
  const variant = timeVariant()
  return (
    <div style={{ paddingBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 9, height: 9, borderRadius: '50%',
        background: C.accent,
        boxShadow: `0 0 8px ${C.accent}`,
        flexShrink: 0,
      }} />
      <h1
        data-testid="greeting"
        data-variant={variant}
        style={{
          fontSize: 'clamp(26px, 5.5vw, 40px)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.04em',
          color: C.text,
          margin: 0,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {GREETINGS[greetingIdx](displayName)}
      </h1>
    </div>
  )
}
