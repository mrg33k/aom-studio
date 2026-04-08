export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return ''
  const now = new Date()
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''

  const seconds = Math.floor((now - date) / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`

  // Calendar-day boundaries (midnight local time)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)

  // Message sent today (same calendar day) — use hours
  if (date >= todayStart) return `${hours}h ago`

  // Message sent on the previous calendar day
  if (date >= yesterdayStart) return 'yesterday'

  // Older than 2 calendar days — show full date
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}/${year}`
}
