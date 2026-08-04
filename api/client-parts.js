// /api/client-parts — the Client Engine board's read/write path.
//
//   GET  /api/client-parts?client=wolfpack   -> { parts[], evidence{part_key:[...]}, counts }
//   POST /api/client-parts                   -> update a part, or append evidence
//
// The service key stays server-side; the board is a static page and must never
// hold it. This is the only reason the endpoint exists rather than the page
// talking to PostgREST directly.
//
// THE RECEIPT RULE is enforced in the database by `verified_needs_a_receipt`
// (see supabase/migrations/20260803000001_client_engine_parts.sql). We check it
// here too, so callers get a readable error instead of a raw Postgres 400 —
// but the database is the authority. If this file and the constraint ever
// disagree, the constraint wins and that is deliberate.
//
// ── AUTH (2026-08-03) — WHY THIS ENDPOINT IS GATED ─────────────────────────
// This file shipped with no auth of any kind, and the board it serves
// (/client-engine/) is a static page that is NOT in middleware.js's matcher —
// so it is world-readable with no sign-in. It had never been deployed, which is
// the only reason nothing leaked. Deploying it ungated would have published:
//
//   READ   every gap, every "cannot see", every access state and status note for
//          every AOM client — the client book, to anyone who guesses the URL.
//   WRITE  POST is the same door. `set_autonomy {enabled:true}` followed by
//          `approve_orders` is two anonymous requests, and those two fields are
//          the ENTIRE consent gate Patrik asked for by name ("I don't want the
//          projects to start doing things on auto until I click a toggle").
//          An unauthenticated POST does not weaken that gate, it deletes it.
//
// So every path here runs verifyProjectAccess(client, req) — the same vetted
// decision function the rest of /api/dashboard/* uses, NOT a bespoke check.
// It reads the JWT from the Authorization header OR the `sb-*-auth-token`
// cookie, which is why the static board keeps working unchanged: same origin,
// so the browser sends the session cookie on fetch. Signed in, it just works;
// signed out, it says so instead of rendering a client's private state.
//
// ACTOR IS DERIVED, NEVER ACCEPTED. `actor` used to come from the request body
// defaulting to 'Patrik', so any caller could write a trail line signed by him —
// into the one field the next agent reads specifically to avoid contradicting
// something Patrik fixed. A forged attribution there is durable misinformation
// aimed at the source of truth, so the name now comes from the verified JWT and
// the body's `actor` is ignored.
import { verifyProjectAccess, TenantAuthError } from './_lib/verifyTenant.js'

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const REST = () => `${SUPABASE_URL}/rest/v1`
const headers = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
})

const STATES = ['completed', 'needs', 'blocked', 'cannot']
const CONNECTIONS = [
  'connected', 'wrong_level', 'pending', 'expired', 'never_asked', 'not_applicable',
]
const CONFIDENCES = ['verified', 'inferred', 'reported']

async function sb(path, init = {}) {
  const res = await fetch(`${REST()}${path}`, { ...init, headers: headers(init.headers) })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(text.slice(0, 400))
    err.status = res.status
    throw err
  }
  return text ? JSON.parse(text) : []
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// TWO gates, both must be open before an agent may change anything.
//   1. autonomy_enabled — Patrik switched this client on, once.
//   2. orders_approved_for === today — he approved TODAY's list, after cuts.
// Consent is never open-ended: approving Monday's work does not authorise Tuesday's.
function mayActNow(settings) {
  if (!settings || !settings.autonomy_enabled) return false
  return settings.orders_approved_for === today()
}

function tally(parts) {
  const t = { total: parts.length, attention: 0, cannot: 0, completed: 0, unchecked: 0 }
  for (const p of parts) {
    if (p.state === 'needs' || p.state === 'blocked') t.attention++
    if (p.state === 'cannot') t.cannot++
    if (p.state === 'completed') t.completed++
    if (!p.checked_at) t.unchecked++
  }
  return t
}

// The client this evidence row belongs to. `dispute` is the one action that
// names no client, so without this it would be the unguarded hole in an
// otherwise gated file: an evidence_id is enough to mark any claim, in any
// client, disputed. Resolve evidence -> part -> project_slug and gate on that.
async function clientForEvidence(evidenceId) {
  const ev = await sb(
    `/part_evidence?select=part_id&id=eq.${encodeURIComponent(evidenceId)}&limit=1`
  )
  if (!ev.length) return null
  const part = await sb(
    `/client_parts?select=project_slug&id=eq.${encodeURIComponent(ev[0].part_id)}&limit=1`
  )
  return part.length ? part[0].project_slug : null
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase is not configured on this deployment' })
  }

  try {
    if (req.method === 'GET') {
      const client = String(req.query.client || '').trim()
      if (!client) return res.status(400).json({ error: 'client is required' })
      await verifyProjectAccess(client, req)

      const parts = await sb(
        `/client_parts?select=*&project_slug=eq.${encodeURIComponent(client)}` +
        `&order=group_name.asc,sort_order.asc`
      )

      const settingsRows = await sb(
        `/client_engine_settings?select=*&project_slug=eq.${encodeURIComponent(client)}`
      )
      const settings = settingsRows[0] || {
        project_slug: client, autonomy_enabled: false, nightly_check_enabled: true,
        orders_approved_for: null, orders_scope: [],
      }
      settings.may_act_now = mayActNow(settings)

      // one round trip for every part's evidence, newest first
      let evidence = {}
      if (parts.length) {
        const ids = parts.map((p) => p.id).join(',')
        const rows = await sb(
          `/part_evidence?select=*&part_id=in.(${ids})&order=at.desc`
        )
        const byId = Object.fromEntries(parts.map((p) => [p.id, p.part_key]))
        for (const r of rows) {
          const key = byId[r.part_id]
          if (!key) continue
          ;(evidence[key] ||= []).push(r)
        }
      }

      return res.status(200).json({ client, parts, evidence, settings, counts: tally(parts) })
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
      const { action } = body

      // ONE gate, before any action runs, so a new action cannot be added later
      // without one. `dispute` names no client, so it is resolved from the
      // evidence row first; everything else carries `client` directly.
      // Named scopeClient, not scope: `approve_orders` destructures its OWN
      // `scope` (the part_key list) out of the body and would shadow this one.
      const scopeClient =
        action === 'dispute'
          ? await clientForEvidence(String(body.evidence_id || '').trim())
          : String(body.client || '').trim()
      if (!scopeClient) {
        return res.status(400).json({
          error: action === 'dispute' ? 'evidence not found' : 'client is required',
        })
      }
      const who = await verifyProjectAccess(scopeClient, req)
      // The trail's signature. Derived from the verified session, never the body.
      const actor = who.userName || who.email || 'Unknown'

      // ---- update a part's state / access / owner -------------------------
      if (action === 'update_part') {
        const { part_key, patch = {} } = body
        if (!part_key) {
          return res.status(400).json({ error: 'part_key is required' })
        }
        if (patch.state && !STATES.includes(patch.state)) {
          return res.status(400).json({ error: `state must be one of ${STATES.join(', ')}` })
        }
        if (patch.connection && !CONNECTIONS.includes(patch.connection)) {
          return res.status(400).json({ error: `connection must be one of ${CONNECTIONS.join(', ')}` })
        }

        const allowed = [
          'state', 'connection', 'access_detail', 'access_verified_at',
          'status_line', 'suggestion', 'owner', 'deep_link',
          'artifact_url', 'artifact_kind', 'artifact_at', 'checked_at',
        ]
        const update = {}
        for (const k of allowed) if (k in patch) update[k] = patch[k]
        if (!Object.keys(update).length) {
          return res.status(400).json({ error: 'nothing to update' })
        }
        // a human changing access is itself a verification of it
        if ('connection' in update && !('access_verified_at' in update)) {
          update.access_verified_at = new Date().toISOString()
        }

        const rows = await sb(
          `/client_parts?project_slug=eq.${encodeURIComponent(scopeClient)}` +
          `&part_key=eq.${encodeURIComponent(part_key)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify(update),
          }
        )
        if (!rows.length) return res.status(404).json({ error: 'part not found' })

        // every human correction leaves a dated, attributed line in the trail,
        // so the next agent reads it before it re-checks and cannot contradict it
        const changed = Object.entries(update)
          .filter(([k]) => k !== 'access_verified_at')
          .map(([k, v]) => `${k} -> ${v}`)
          .join(', ')
        await sb('/part_evidence', {
          method: 'POST',
          body: JSON.stringify([{
            part_id: rows[0].id,
            actor,
            actor_kind: 'person',
            claim: `Corrected by ${actor}: ${changed}`,
            method: 'Entered directly on the board',
            artifact_url: null,
            artifact_quote: null,
            confidence: 'reported',
          }]),
        })

        return res.status(200).json({ ok: true, part: rows[0] })
      }

      // ---- append evidence ------------------------------------------------
      if (action === 'add_evidence') {
        // actor_kind still describes WHAT is claiming (a person typing on the
        // board vs an assistant reporting a check), but the NAME is the verified
        // session either way. Every caller today is an authenticated human;
        // when the real re-check lands it needs its own service credential
        // rather than the ability to sign a claim with an arbitrary name.
        const { part_key, claim, method, artifact_url, artifact_quote,
                confidence = 'reported', actor_kind = 'assistant' } = body
        if (!part_key || !claim) {
          return res.status(400).json({ error: 'part_key and claim are required' })
        }
        if (!CONFIDENCES.includes(confidence)) {
          return res.status(400).json({ error: `confidence must be one of ${CONFIDENCES.join(', ')}` })
        }
        // readable version of the database constraint
        if (confidence === 'verified' && !artifact_url && !artifact_quote) {
          return res.status(422).json({
            error: 'A verified claim needs a receipt: pass artifact_url or artifact_quote. ' +
                   'Use confidence "inferred" or "reported" if you have neither.',
          })
        }

        const found = await sb(
          `/client_parts?select=id&project_slug=eq.${encodeURIComponent(scopeClient)}` +
          `&part_key=eq.${encodeURIComponent(part_key)}`
        )
        if (!found.length) return res.status(404).json({ error: 'part not found' })

        const rows = await sb('/part_evidence', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([{
            part_id: found[0].id, actor, actor_kind, claim,
            method: method || null,
            artifact_url: artifact_url || null,
            artifact_quote: artifact_quote || null,
            confidence,
          }]),
        })
        return res.status(200).json({ ok: true, evidence: rows[0] })
      }

      // ---- dispute a claim -------------------------------------------------
      if (action === 'dispute') {
        const { evidence_id, note = null } = body
        if (!evidence_id) return res.status(400).json({ error: 'evidence_id is required' })
        const rows = await sb(`/part_evidence?id=eq.${encodeURIComponent(evidence_id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ disputed_at: new Date().toISOString(), disputed_note: note }),
        })
        if (!rows.length) return res.status(404).json({ error: 'evidence not found' })
        return res.status(200).json({ ok: true, evidence: rows[0] })
      }

      // ---- the autonomy toggle --------------------------------------------
      // Off by default and off for every client that has never been switched on.
      if (action === 'set_autonomy') {
        const { enabled } = body
        if (typeof enabled !== 'boolean') {
          return res.status(400).json({ error: 'enabled (boolean) is required' })
        }
        const patch = {
          project_slug: scopeClient,
          autonomy_enabled: enabled,
          autonomy_set_at: new Date().toISOString(),
          autonomy_set_by: actor,
        }
        // switching autonomy OFF also withdraws today's approval immediately
        if (!enabled) {
          patch.orders_approved_for = null
          patch.orders_approved_at = null
          patch.orders_scope = []
        }
        const rows = await sb('/client_engine_settings?on_conflict=project_slug', {
          method: 'POST',
          headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
          body: JSON.stringify([patch]),
        })
        const s = rows[0]
        s.may_act_now = mayActNow(s)
        return res.status(200).json({ ok: true, settings: s })
      }

      // ---- the daily handshake --------------------------------------------
      // "cool, I have my marching orders for the day. am I good to get started?"
      // Scope is the list AFTER Patrik cut what does not matter.
      if (action === 'approve_orders') {
        const { scope = [] } = body
                if (!Array.isArray(scope) || !scope.length) {
          return res.status(400).json({ error: 'scope must be a non-empty list of part_keys' })
        }

        const cur = await sb(
          `/client_engine_settings?select=*&project_slug=eq.${encodeURIComponent(scopeClient)}`
        )
        if (!cur.length || !cur[0].autonomy_enabled) {
          return res.status(409).json({
            error: 'Autonomy is off for this client. Switch it on before approving a day of work.',
          })
        }

        const rows = await sb(
          `/client_engine_settings?project_slug=eq.${encodeURIComponent(scopeClient)}`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({
              orders_approved_for: today(),
              orders_approved_at: new Date().toISOString(),
              orders_scope: scope,
              autonomy_set_by: cur[0].autonomy_set_by || actor,
            }),
          }
        )
        const s = rows[0]
        s.may_act_now = mayActNow(s)
        return res.status(200).json({ ok: true, settings: s })
      }

      // ---- ask for a real check --------------------------------------------
      // The board's button used to re-read the database and call it a re-check.
      // This queues the thing that actually leaves the building:
      // scripts/client-engine-check.py opens what it has an address for,
      // appends evidence carrying the URL it fetched, and stamps checked_at
      // only on the parts it genuinely reached.
      //
      // It DISPATCHES rather than checking inline on purpose. One
      // implementation of "what does a check mean" — the Python script the
      // nightly sweep also runs — instead of a second one in JS that drifts
      // from it. A serverless function that fetched sites itself would be that
      // second implementation.
      //
      // Reading is never gated by autonomy: looking at a public website
      // changes nothing in the world. The two consent gates exist for ACTING.
      if (action === 'request_check') {
        // Match on the CLIENT this check is for, which lives in metadata.
        // `project` is the REPO (AOM-EA) because task-runner.sh takes the repo
        // lock from it — so querying project=<client> could never match, and
        // every click would queue another check behind the last one forever.
        const existing = await sb(
          `/tasks?select=id,status&status=in.(queued,running)` +
          `&metadata->>check_client=eq.${encodeURIComponent(scopeClient)}&limit=1`
        )
        if (existing.length) {
          return res.status(200).json({
            ok: true, already: true, task_id: existing[0].id,
            message: 'A check for this client is already running.',
          })
        }
        const rows = await sb('/tasks', {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify([{
            title: `Client Engine check — ${scopeClient}`,
            text: `Run: python3 scripts/client-engine-check.py --client ${scopeClient}\n\n` +
                  `It opens every part that has a recorded address, writes down what it ` +
                  `saw with the link it opened, and stamps the check time only on the ` +
                  `parts it actually reached. Parts with no recorded address must stay ` +
                  `unchecked and say why — do not invent an address to make one pass.`,
            description: `Client Engine check for ${scopeClient}, asked for by ${actor}.`,
            status: 'queued',
            source: 'client-engine-board',
            client_id: 'aom',
            project: 'AOM-EA',
            priority: 0,   // integer column; queue-task.py's default is 0
            metadata: {
              repo: 'AOM-EA',
              created_via: 'client-engine-board',
              mission_slug: 'aom:client-engine',
              check_client: scopeClient,
            },
          }]),
        })
        return res.status(200).json({ ok: true, task_id: rows[0]?.id || null })
      }

      // ---- may an agent act right now? -------------------------------------
      // The agent asks this BEFORE doing anything that changes the world.
      // Checking/reading never needs it; acting always does.
      if (action === 'may_act') {
        const { part_key } = body
                const rows = await sb(
          `/client_engine_settings?select=*&project_slug=eq.${encodeURIComponent(scopeClient)}`
        )
        const s = rows[0]
        const allowed = mayActNow(s)
        const inScope = !part_key || (s?.orders_scope || []).includes(part_key)
        let reason = null
        if (!s || !s.autonomy_enabled) reason = 'Autonomy is off for this client.'
        else if (s.orders_approved_for !== today()) reason = 'No approved orders for today.'
        else if (!inScope) reason = `${part_key} is not in today's approved scope.`
        return res.status(200).json({ may_act: allowed && inScope, reason, settings: s || null })
      }

      return res.status(400).json({ error: 'unknown action' })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  } catch (e) {
    // Auth failures carry their own status and are flagged so the board can
    // render an honest "you are signed out" state instead of an empty client.
    if (e instanceof TenantAuthError) {
      return res.status(e.status || 403).json({ error: String(e.message), auth: false })
    }
    return res.status(e.status || 500).json({ error: String(e.message || e) })
  }
}
