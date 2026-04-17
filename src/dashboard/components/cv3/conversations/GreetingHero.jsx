// "Last login" subtitle + dynamic greeting headline. Extracted verbatim
// from ConversationsView during R2e split.
import { C } from '../../../lib/cv3Colors.js'

export default function GreetingHero({ lastLoginText, GREETINGS, greetingIdx, displayName }) {
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
