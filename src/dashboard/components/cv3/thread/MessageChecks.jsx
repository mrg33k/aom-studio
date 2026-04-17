// Message status checkmarks -- single check = saved to DB, double check = agent responded.
export default function MessageChecks({ msgId, isResponded }) {
  const isSaved = msgId && !String(msgId).startsWith('temp-')
  if (!isSaved) return null
  const checkColor = isResponded ? 'rgba(96,165,250,0.7)' : 'rgba(120,140,165,0.45)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 4, verticalAlign: 'middle' }}>
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" style={{ display: 'block' }}>
        <path d="M1 5.5L4.5 9L12 1" stroke={checkColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {isResponded && (
        <svg width="10" height="10" viewBox="0 0 13 10" fill="none" style={{ display: 'block', marginLeft: -5 }}>
          <path d="M1 5.5L4.5 9L12 1" stroke={checkColor} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}
