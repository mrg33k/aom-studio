// GET /api/corner/availability
// Query Patrik's Google Calendar for the next 6 business days.
// Return available 30-minute slots (3 per day, roughly 9am, 1pm, 3pm Arizona time).
// If calendar isn't connected, return {connected: false} and let frontend fall back to mock slots.
//
// Query params:
// - days (optional): number of business days to check ahead (default 6)
// - slotDurationMin (optional): minutes per slot (default 30)
// - slotsPerDay (optional): number of slots to offer per day (default 3)

import { getCalendarToken, calendarFetch } from '../_lib/calendarClient.js'
import { extractJwt } from '../_lib/verifyTenant.js'

const ARIZONA_TZ = 'America/Phoenix'

// Utility: get Patrik's user ID from the request JWT
// In this setup, Patrik is the workspace owner; we hardcode his workspace ID.
// A real multi-tenant system would look up the workspace and its owner.
async function getPatrikUserId() {
  // For this MVP, we query Supabase for the workspace owner of the AOM workspace.
  // Patrik is hardcoded as the founder; his user_id is stable.
  // In production, this would be injected from context or a workspace config.
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Query the AOM workspace (assumed to exist; in real multi-tenant this is per-request)
  // For MVP: hardcode Patrik's user_id once confirmed, or look it up by workspace membership.
  // Fallback: check for a PATRIK_USER_ID env var for testing.
  if (process.env.PATRIK_USER_ID) {
    return process.env.PATRIK_USER_ID
  }

  // Query workspaces and find the one owned by Patrik (or the founding workspace)
  // For now, assume the workspace 'aom' or the first workspace, and get its owner.
  const wsR = await fetch(
    `${SUPABASE_URL}/rest/v1/workspaces?order=created_at.asc&limit=1&select=owner_user_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!wsR.ok) return null
  const ws = await wsR.json()
  return (Array.isArray(ws) && ws.length) ? ws[0].owner_user_id : null
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

// Utility: convert ISO time to Arizona local time
function toArizonaTime(isoString) {
  const d = new Date(isoString)
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ARIZONA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const patrikUserId = await getPatrikUserId()
    if (!patrikUserId) {
      return res.status(500).json({ error: 'Could not identify workspace owner' })
    }

    const calToken = await getCalendarToken(patrikUserId)
    if (!calToken) {
      // Calendar not connected — graceful fallback
      return res.status(200).json({ connected: false })
    }

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
      // Treat as "calendar not properly set up" — fallback to mock
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
