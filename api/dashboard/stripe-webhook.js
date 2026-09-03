// POST /api/dashboard/stripe-webhook
// Stripe sends subscription events here; we mirror the tier into the world's
// planTier (Convex worlds:setPlanTier, corner:retire-supabase R2, 2026-09-03).
//
// Wiring only: this endpoint is not a checkout initiator. A real charge only
// happens after Patrik approves the first live charge.
//
// Signature verification follows the Stripe docs pattern (HMAC-SHA256 with
// the `stripe-signature` header) with node:crypto, so the `stripe` SDK is not
// a dependency. This endpoint only reads payloads.
//
// Entitlement pattern: Stripe is the ledger, the world row is the entitlement
// source. Product reads worlds.planTier at request time.
//
// Subscription to world lookup: event.data.object.metadata.world_client_id
// (or client_id / world) names the world slug. The Convex world row has no
// Stripe customer column, so an event with no world in its metadata is
// acknowledged and ignored.
//
// Before relying on this route, check the Stripe dashboard for whether this
// webhook URL is registered at all.

import crypto from 'node:crypto'
import { convexQuery, convexMutation } from '../_lib/reportsStore.js'

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const WEBHOOK_TOLERANCE_SECONDS = 300
// Optional write key for worlds:setPlanTier (gated by TASKS_KEY on the
// deployment). Unset on dev today; JSON drops an undefined field.
const CONVEX_KEY = process.env.CONVEX_TASKS_KEY || process.env.TASKS_KEY || undefined

// Vercel node functions parse JSON by default; we need the raw body for HMAC.
export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

function parseStripeSignature(header) {
  if (!header) return null
  const parts = header.split(',').map(p => p.trim())
  const out = { t: null, v1: [] }
  for (const p of parts) {
    const [k, v] = p.split('=')
    if (k === 't') out.t = v
    else if (k === 'v1') out.v1.push(v)
  }
  if (!out.t || out.v1.length === 0) return null
  return out
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parsed = parseStripeSignature(signatureHeader)
  if (!parsed) return false

  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(parsed.t))
  if (!Number.isFinite(ageSec) || ageSec > WEBHOOK_TOLERANCE_SECONDS) return false

  const signedPayload = `${parsed.t}.${rawBody.toString('utf8')}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  return parsed.v1.some(v => {
    const vBuf = Buffer.from(v, 'hex')
    return vBuf.length === expectedBuf.length && crypto.timingSafeEqual(vBuf, expectedBuf)
  })
}

// Map a Stripe subscription status to our plan tier.
// `pro` is current. On cancel/past_due we fall back to `free`.
function tierFromSubscription(sub) {
  const status = sub?.status
  if (!status) return 'free'
  if (['active', 'trialing'].includes(status)) return 'pro'
  return 'free'
}

async function findWorldForEvent(eventObject) {
  const metaClientId = eventObject?.metadata?.world_client_id
    || eventObject?.metadata?.client_id
    || eventObject?.metadata?.world
  if (!metaClientId) return null
  const world = await convexQuery('worlds:getBySlug', { slug: String(metaClientId).trim().toLowerCase() }).catch(() => null)
  return world ? { id: String(world._id), slug: world.slug } : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    // Intentionally 503 (not 200) so webhook misconfiguration is visible in Stripe.
    return res.status(503).json({ error: 'webhook secret not configured' })
  }

  let rawBody
  try { rawBody = await readRawBody(req) }
  catch (err) { return res.status(400).json({ error: 'body read failed' }) }

  const sig = req.headers['stripe-signature']
  if (!verifyStripeSignature(rawBody, sig, STRIPE_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'bad signature' })
  }

  let event
  try { event = JSON.parse(rawBody.toString('utf8')) }
  catch { return res.status(400).json({ error: 'invalid JSON' }) }

  const type = event.type
  const object = event.data?.object
  if (!type || !object) return res.status(400).json({ error: 'malformed event' })

  // Only subscription-shaped events are mirrored. Checkout and invoice events
  // are noise for the entitlement mirror.
  const subscriptionEvents = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'customer.subscription.paused',
    'customer.subscription.resumed',
  ])

  if (!subscriptionEvents.has(type)) {
    return res.status(200).json({ ok: true, ignored: type })
  }

  const world = await findWorldForEvent(object)
  if (!world) {
    // Ack so Stripe stops retrying; the ignored id is in the response for observability.
    return res.status(200).json({ ok: true, ignored: 'no matching world', event_id: event.id })
  }

  const planTier = type === 'customer.subscription.deleted' ? 'free' : tierFromSubscription(object)
  try {
    await convexMutation('worlds:setPlanTier', { key: CONVEX_KEY, worldId: world.id, planTier })
  } catch (err) {
    return res.status(502).json({ error: `world update failed: ${String(err?.message || err)}` })
  }

  return res.status(200).json({
    ok: true,
    event_id: event.id,
    type,
    world: world.slug,
    plan_tier: planTier,
  })
}
