// GET /api/corner/availability
// Query Patrik's Google Calendar for the next 6 business days.
// Return available 30-minute slots (3 per day, roughly 9am, 1pm, 3pm Arizona time).
// If calendar isn't connected, return {connected: false} and let frontend fall back to mock slots.
//
// Query params:
// - days (optional): number of business days to check ahead (default 6)
// - slotDurationMin (optional): minutes per slot (default 30)
// - slotsPerDay (optional): number of slots to offer per day (default 3)
//
// corner:retire-supabase (2026-09-03): the calendar token lives on Convex
// (integrations table, read through calendarClient -> integrations:getOAuthTokens).
// Convex keys the token by its owner, so this route asks for the owner by
// account instead of looking the owner up in a Supabase table.

import { getCalendarToken, calendarFetch } from '../_lib/calendarClient.js'

const ARIZONA_TZ = 'America/Phoenix'

// Who owns the booking calendar. The public booking page only ever shows
// Patrik's calendar, so this is a short list of his accounts, first one that
// has Google Calendar connected wins. PATRIK_USER_ID (a Convex user id or an
// email) overrides everything when set.
export function calendarOwnerCandidates() {
  const out = []
  if (process.env.PATRIK_USER_ID) out.push(process.env.PATRIK_USER_ID)
  if (process.env.CALENDAR_OWNER_EMAIL) out.push(process.env.CALENDAR_OWNER_EMAIL)
  out.push('hello@aom-inhouse.com', 'patrikmatheson@gmail.com')
  return [...new Set(out.map((v) => String(v).trim()).filter(Boolean))]
}

// Returns { userId, token } for the first owner with a connected calendar,
// or null when nobody has connected one yet (the page then shows mock slots).
export async function resolveCalendarOwner() {
  for (const candidate of calendarOwnerCandidates()) {
    try {
      const token = await getCalendarToken(candidate)
      if (token) return { userId: candidate, token }
    } catch (err) {
      console.warn('calendar token lookup failed for', candidate, err?.message || err)
    }
  }
  return null
}

// Utility: generate date range (business days only, Arizona time)
function getBusinessDays(count = 6) {
  const days = []
  const now = new Date()
  // Force Arizona timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ARIZONA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  let current = new Date(now)
  while (days.length < count) {
    const localStr = formatter.format(current)
    const [month, day, year] = localStr.split('/')
    const localDate = new Date(year, parseInt(month) - 1, parseInt(day))
    const dayOfWeek = localDate.getDay()
    // Skip weekends (0=Sun, 6=Sat)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(localDate)
    }
    current.setDate(current.getDate() + 1)
  }
  return days
}

// Utility: generate offered time slots for a day (Arizona time)
// Returns times in format: {date, dateLabel, times: [{time: "09:00", display: "9:00 AM"}]}
function generateDaySlots(dateObj) {
  const times = [
    { hour: 9, minute: 0 },   // 9:00 AM
    { hour: 13, minute: 0 },  // 1:00 PM
    { hour: 15, minute: 0 },  // 3:00 PM
  ]
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ARIZONA_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const dateLabel = formatter.format(dateObj)
  const daySlots = times.map(({ hour, minute }) => {
    const d = new Date(dateObj)
    d.setHours(hour, minute, 0, 0)
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    const displayHour = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const display = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`
    return { time: timeStr, display, isoTime: d.toISOString() }
  })
  return { date: dateObj, dateLabel, times: daySlots }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const owner = await resolveCalendarOwner()
    if (!owner) {
      // No calendar connected yet. Clean signal for the frontend to use mock slots.
      return res.status(200).json({ connected: false })
    }
    const calToken = owner.token

    // Query freeBusy for the next 6 business days
    const daysToCheck = parseInt(req.query.days || '6', 10)
    const businessDays = getBusinessDays(daysToCheck)

    // Build timeMin/timeMax in UTC for freeBusy query
    const timeMin = new Date(businessDays[0])
    timeMin.setHours(0, 0, 0, 0)
    const timeMax = new Date(businessDays[businessDays.length - 1])
    timeMax.setHours(23, 59, 59, 999)

    // Call Calendar API freeBusy
    const freeBusyReq = {
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    }

    const fbRes = await calendarFetch(calToken.accessToken, '/freebusy', {
      method: 'POST',
      body: JSON.stringify(freeBusyReq),
    })

    if (!fbRes.ok) {
      const errText = await fbRes.text().catch(() => '')
      console.error('freeBusy query failed:', fbRes.status, errText)
      // Treat as "calendar not properly set up" and fall back to mock
      return res.status(200).json({ connected: false })
    }

    const freeBusy = await fbRes.json()
    const busyBlocks = (freeBusy.calendars?.primary?.busy || []).map(b => ({
      start: new Date(b.start),
      end: new Date(b.end),
    }))

    // Generate offered slots and filter out busy times
    const allSlots = businessDays.map(day => generateDaySlots(day))

    const availableSlots = allSlots.map(daySlots => {
      const filtered = daySlots.times.filter(slot => {
        const slotStart = new Date(slot.isoTime)
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000)
        // Check if this slot overlaps with any busy block
        const isOverlap = busyBlocks.some(busy =>
          slotStart < busy.end && slotEnd > busy.start
        )
        return !isOverlap
      })
      return { ...daySlots, times: filtered }
    })

    // Only return days with available slots; omit empty days
    const nonEmpty = availableSlots.filter(s => s.times.length > 0)

    return res.status(200).json({
      connected: true,
      slots: nonEmpty,
      generatedAt: new Date().toISOString(),
      timezone: ARIZONA_TZ,
    })
  } catch (err) {
    console.error('availability endpoint error:', err)
    // Graceful degradation: on any error, assume calendar isn't connected
    // and let frontend use mock slots
    return res.status(200).json({ connected: false })
  }
}
