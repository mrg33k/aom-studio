// POST /api/dashboard/stripe-webhook
// Stripe sends subscription events here; we mirror the tier into worlds.plan_tier.
//
// Wiring ONLY: this endpoint is not a checkout initiator. A real charge only
// happens after Patrik approves the first live charge (per brief hard rule).
//
// Signature verification follows the Stripe docs pattern (HMAC-SHA256 with the
// `stripe-signature` header). We implement it with node:crypto to avoid adding
// the `stripe` SDK as a dependency — this endpoint only reads payloads, it
// never calls the Stripe API back out.
//
// Entitlement pattern (R8 research):
//   Stripe is the ledger. This DB is the entitlement source. Product reads
//   worlds.plan_tier at request time — never re-queries Stripe.
//
// Subscription → world lookup:
//   1. If event.data.object.metadata.world_client_id is set, use it.
//   2. Else fall back to customer.metadata.world_client_id (via event.data.object.customer,
//      resolved from Stripe customer endpoint only if STRIPE_SECRET_KEY is present; we
//      skip the outbound call if missing, and return 202 so Stripe records delivery).
//   3. Else fall back to matching worlds.stripe_customer_id.

import crypto from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
const WEBHOOK_TOLERANCE_SECONDS = 300

function sbHeaders(extra) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

// Vercel node functions parse JSON by default; we need the raw body for HMAC.
// Disable body parsing: we read the stream ourselves.
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

// Map a Stripe subscription status → our plan_tier.
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
  if (metaClientId) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?or=(client_id.eq.${encodeURIComponent(metaClientId)},slug.eq.${encodeURIComponent(metaClientId)})&select=id,slug,client_id&limit=1`,
      { headers: sbHeaders() }
    )
    if (r.ok) {
      const rows = await r.json()
      if (rows[0]) return rows[0]
    }
  }

  const customerId = typeof eventObject?.customer === 'string'
    ? eventObject.customer
    : eventObject?.customer?.id
  if (customerId) {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/worlds?stripe_customer_id=eq.${encodeURIComponent(customerId)}&select=id,slug,client_id&limit=1`,
      { headers: sbHeaders() }
    )
    if (r.ok) {
      const rows = await r.json()
      if (rows[0]) return rows[0]
    }
  }

  return null
}

async function updateWorldTier(worldId, patch) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/worlds?id=eq.${worldId}`,
    {
      method: 'PATCH',
      headers: sbHeaders({ Prefer: 'return=minimal' }),
      body: JSON.stringify({ ...patch, plan_updated_at: new Date().toISOString() }),
    }
  )
  return r.ok
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'POST only' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
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

  // We only mirror subscription-shaped events. Checkout + invoice events are noise
  // for the entitlement mirror (Patrik has not approved live charges yet).
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
    // Ack so Stripe stops retrying; log ignored id in the response for observability.
    return res.status(200).json({ ok: true, ignored: 'no matching world', event_id: event.id })
  }

  const patch = {
    plan_tier: type === 'customer.subscription.deleted' ? 'free' : tierFromSubscription(object),
    stripe_subscription_id: object.id || null,
  }
  const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id
  if (customerId) patch.stripe_customer_id = customerId

  const ok = await updateWorldTier(world.id, patch)
  if (!ok) return res.status(502).json({ error: 'world update failed' })

  return res.status(200).json({
    ok: true,
    event_id: event.id,
    type,
    world: world.slug,
    plan_tier: patch.plan_tier,
  })
}
