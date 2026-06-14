// POST /api/corner/book
// Create a calendar event on Patrik's primary calendar, add the visitor as an attendee,
// include a Google Meet link, and send a confirmation email.
//
// Request body:
// {
//   name: "John Doe",
//   email: "john@example.com",
//   company: "ACME Inc" (optional),
//   dateLabel: "Monday, Jun 16",
//   time: "09:00",
//   display: "9:00 AM",
//   timezone: "America/Phoenix"
// }
//
// Response:
// {
//   success: true,
//   eventId: "xyz...",
//   meetLink: "https://meet.google.com/...",
//   confirmationEmail: "john@example.com"
// }

import { getCalendarToken, calendarFetch } from '../_lib/calendarClient.js'
import { getGmailToken, gmailFetch } from '../_lib/gmailClient.js'
import { extractJwt } from '../_lib/verifyTenant.js'

const ARIZONA_TZ = 'America/Phoenix'
const PATRIK_EMAIL = 'patrik@aheadofmarket.com'

// Utility: get Patrik's user ID (same logic as availability.js)
async function getPatrikUserId() {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (process.env.PATRIK_USER_ID) {
    return process.env.PATRIK_USER_ID
  }

  const wsR = await fetch(
    `${SUPABASE_URL}/rest/v1/workspaces?order=created_at.asc&limit=1&select=owner_user_id`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
  )
  if (!wsR.ok) return null
  const ws = await wsR.json()
  return (Array.isArray(ws) && ws.length) ? ws[0].owner_user_id : null
}

// Utility: parse date + time into UTC ISO string
function parseBookingTime(dateLabel, timeStr, timezone) {
  // dateLabel: "Monday, Jun 16"
  // timeStr: "09:00"
  // We need to construct a Date in the given timezone and convert to UTC

  // Simple heuristic: assume current year, parse "Jun 16"
  const now = new Date()
  const year = now.getFullYear()

  // Extract month and day from dateLabel (e.g., "Jun 16")
  const parts = dateLabel.split(' ')
  const monthStr = parts.find(p => /[A-Za-z]{3}/.test(p)) // e.g. "Jun"
  const day = parseInt(parts[parts.length - 1], 10)

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthIdx = months.indexOf(monthStr)
  if (monthIdx === -1) throw new Error('Invalid month in dateLabel')

  const [hour, minute] = timeStr.split(':').map(Number)

  // Create a Date in UTC as if the hour:minute is in the given timezone
  // Offset calculation: get the offset of the timezone from the date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  // Create a probe date and check its offset
  const probe = new Date(year, monthIdx, day, hour, minute, 0)
  const localStr = formatter.format(probe)
  const [localMonth, localDay, localYear, localHour, localMin, localSec] = localStr.match(/\d+/g).map(Number)

  // Calculate offset
  const probeUTC = new Date(localYear, localMonth - 1, localDay, localHour, localMin, localSec)
  const offsetMs = probe.getTime() - probeUTC.getTime()
  const offsetHours = offsetMs / (1000 * 60 * 60)

  // Build the target time in UTC
  const utcDate = new Date(year, monthIdx, day, hour - offsetHours, minute, 0)
  return utcDate.toISOString()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, email, company, dateLabel, time, display, timezone } = req.body

  if (!name || !email || !dateLabel || !time) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const patrikUserId = await getPatrikUserId()
    if (!patrikUserId) {
      return res.status(500).json({ error: 'Could not identify workspace owner' })
    }

    // Get calendar token
    const calToken = await getCalendarToken(patrikUserId)
    if (!calToken) {
      return res.status(400).json({ error: 'Calendar not connected' })
    }

    // Parse the booking time
    const startISO = parseBookingTime(dateLabel, time, timezone || ARIZONA_TZ)
    const endDate = new Date(new Date(startISO).getTime() + 30 * 60 * 1000)
    const endISO = endDate.toISOString()

    // Create the calendar event
    const eventBody = {
      summary: 'Corner Intro Call',
      description: `Free 20–30 minute discovery call.\n\nVisitor: ${name}${company ? ` (${company})` : ''}\nEmail: ${email}`,
      start: { dateTime: startISO, timeZone: timezone || ARIZONA_TZ },
      end: { dateTime: endISO, timeZone: timezone || ARIZONA_TZ },
      attendees: [
        { email: PATRIK_EMAIL },
        { email },
      ],
      conferenceData: {
        createRequest: {
          requestId: `corner-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const eventRes = await calendarFetch(calToken.accessToken, '/calendars/primary/events', {
      method: 'POST',
      body: JSON.stringify(eventBody),
      headers: {
        'X-Goog-Assign-Calendar-Event': 'true',
      },
    })

    if (!eventRes.ok) {
      const errText = await eventRes.text().catch(() => '')
      console.error('event creation failed:', eventRes.status, errText)
      return res.status(500).json({ error: 'Failed to create calendar event' })
    }

    const event = await eventRes.json()
    const meetLink = event.conferenceData?.entryPoints?.find(ep => ep.entryPointType === 'video')?.uri || ''

    // Send confirmation email via Gmail
    const gmailToken = await getGmailToken(patrikUserId)
    if (gmailToken) {
      const emailSubject = 'Your Corner Intro Call Confirmed'
      const emailBody = `Hi ${name},

Your Corner intro call has been scheduled!

Date & Time: ${dateLabel} at ${display} MST
Duration: 20–30 minutes${meetLink ? `\nVideo Link: ${meetLink}` : ''}

We'll walk through how Corner helps your business. No sales pitch, no obligation.

See you then!

—
corner team`

      const emailReq = {
        raw: Buffer.from(
          `From: ${PATRIK_EMAIL}\r\nTo: ${email}\r\nSubject: ${emailSubject}\r\n\r\n${emailBody}`
        ).toString('base64'),
      }

      try {
        await gmailFetch(gmailToken.accessToken, '/send', {
          method: 'POST',
          body: JSON.stringify(emailReq),
        })
      } catch (emailErr) {
        console.warn('Email send failed (non-blocking):', emailErr)
        // Don't fail the booking if email fails
      }
    }

    return res.status(200).json({
      success: true,
      eventId: event.id,
      meetLink,
      confirmationEmail: email,
      scheduledFor: `${dateLabel} at ${display}`,
    })
  } catch (err) {
    console.error('booking endpoint error:', err)
    return res.status(500).json({ error: 'Booking failed: ' + err.message })
  }
}
