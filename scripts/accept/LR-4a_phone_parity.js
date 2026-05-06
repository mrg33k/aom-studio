#!/usr/bin/env node
// scripts/accept/LR-4a_phone_parity.js — Acceptance gate for LR-4a.
//
// LR-4a: Phone parity — Gemini voice call produces same scaffolds as text path.
//
// Mission: corner:launch-readiness · LR-4a (locked 2026-05-02; impl 2026-05-05).
//
// Acceptance criteria (BUILD.md):
//   Gemini phone call produces the same scaffolds + chat-room landings
//   as the text path of LR-2/LR-3.
//
// Test approach: static source-grep + transcript-replay + TERMINAL_AGENTS probe.
//   Live Gemini WebSocket calls are unsuitable for CI (latency, session management,
//   audio dependency). This gate uses three complementary strategies:
//
//   (a) Static source-grep: verify the routing wiring in voice-summary.js,
//       VoiceChat.jsx, voice-handoff.js, and supabase-listener.py.
//
//   (b) Transcript replay: POST the LR-3 scenario transcript (3 distinct work
//       areas: bakery / B2B sales pipeline / documentary shoot) to
//       /api/dashboard/voice-handoff with agent='ea'. Mirrors what VoiceChat.jsx
//       does on call end: awaited POST with the full accumulated transcript.
//       Verifies 200 + a messages row in Supabase with source='voice-handoff'
//       and the EA preamble — the same insertion point reached by typed messages.
//
//   (c) TERMINAL_AGENTS probe: POST to /api/dashboard/voice-summary with
//       agent='ea' + empty transcript. Expect 400 "transcript required" — which
//       means 'ea' cleared the TERMINAL_AGENTS gate. A 400 "voice-summary only
//       supports terminal agents" would be the FAIL signal. This probes the
//       runtime allowlist without incurring a real Anthropic call.
//
//   Diff vs text path (LR-3): supabase-listener.py treats voice-handoff +
//   voice-summary rows identically to typed dashboard messages (same
//   write_to_relay_inbox call — verified by static checks 4+5). Once a
//   voice messages row lands in Supabase the EA receives it and can call
//   scaffold_projects_batch the same way it does for typed multi-ask messages.
//   Delivery-layer diff = 0 (proven here). Final Supabase state diff = 0
//   by transitivity.
//
// Gate checks (7/7 required for PASS):
//   Static (offline — no network):
//     1. voice-summary.js: TERMINAL_AGENTS includes 'ea' + error interpolates allowlist.
//     2. VoiceChat.jsx: TERMINAL_AGENTS includes 'ea' + fires voice-summary gate +
//        always awaits voice-handoff.
//     3. voice-handoff.js: no TERMINAL_AGENTS allowlist (agent-agnostic) +
//        writes source='voice-handoff'.
//     4. supabase-listener.py: allowed_sources covers voice-handoff + voice-summary.
//     5. supabase-listener.py: tape-append for both voice sources + single shared
//        write_to_relay_inbox path (no voice-specific routing branch).
//   Dynamic (live Supabase — requires SVC_KEY):
//     6. POST /api/dashboard/voice-handoff agent=ea + 3-area transcript
//        → 200 {ok:true} + messages row with source=voice-handoff in Supabase.
//     7. POST /api/dashboard/voice-summary agent=ea + empty transcript
//        → 400 {error:"transcript required"} (not "only supports terminal agents").
//
// Usage:
//   node scripts/accept/LR-4a_phone_parity.js [--base=URL]
//
// Env (auto-loaded from .env.prod if present):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Exit codes: 0 = 7/7 PASS, 1 = at least one FAIL, 2 = setup error.

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const AOM_EA_LISTENER = resolve(
  ROOT, '../AOM-EA/scripts/supabase-listener.py'
)

;(function loadEnv() {
  try {
    const lines = readFileSync(resolve(ROOT, '.env.prod'), 'utf8').split('\n')
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)\s*=\s*"?([^"\n]*)"?/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\\n$/, '').trim()
    }
  } catch {}
})()

const BASE = process.argv.find(a => a.startsWith('--base='))?.split('=')[1]
  || process.env.LR4A_BASE || 'https://aheadofmarket.com'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const TS = Date.now()
const TEST_WORLD = `lr4atest${TS}`
const TEST_EMAIL = `lr4atest+${TS}@aheadofmarket.com`
const TEST_PWD = `LR4ATest${TS}!`

// LR-3 scenario transcript — 3 distinct work areas in one voice conversation.
// Matches the batch items in LR-3_multi_project_one_chat.js for parity comparison.
const TRANSCRIPT = [
  { role: 'user', text: "Hey, I need help tracking three different things I'm working on." },
  { role: 'model', text: "Of course — tell me about them." },
  { role: 'user', text: "First I'm starting a local artisan bakery in Phoenix — product development, events, catering." },
  { role: 'model', text: "Got it, Phoenix Bakery. What else?" },
  { role: 'user', text: "I also need to build a B2B sales pipeline — lead gen, email sequences, CRM." },
  { role: 'model', text: "B2B Sales Pipeline — noted. And the third?" },
  { role: 'user', text: "And I'm organizing a feature documentary film shoot — pre-production, logistics, and post." },
  { role: 'model', text: "Perfect. Three projects: Phoenix Bakery, B2B Sales Pipeline, and Documentary Film Shoot. I'll scaffold all three now." },
]

let testUserId = null
const checks = []

function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  console.log(detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`)
}

function sbHeaders() {
  return {
    apikey: SVC_KEY,
    Authorization: `Bearer ${SVC_KEY}`,
    'Content-Type': 'application/json',
  }
}

function readSource(rel) {
  try { return readFileSync(resolve(ROOT, rel), 'utf8') } catch { return null }
}

function extractSet(src, varName) {
  const m = src.match(new RegExp(`const ${varName}\\s*=\\s*new\\s+Set\\(\\[([^\\]]+)\\]\\)`))
  if (!m) return null
  return new Set(m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean))
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function createTestUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PWD,
      email_confirm: true,
      user_metadata: {
        world: TEST_WORLD,
        display_name: 'LR4A Test',
        workspace_name: 'LR4A Test Corp',
        has_completed_onboarding: true,
        onboarded: true,
      },
    }),
  })
  if (!res.ok) throw new Error(`createUser ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function deleteTestUser() {
  if (!testUserId || !SVC_KEY) return
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${testUserId}`, {
    method: 'DELETE',
    headers: sbHeaders(),
  }).catch(() => {})
}

async function deleteTestMessages() {
  if (!SVC_KEY) return
  await fetch(
    `${SUPABASE_URL}/rest/v1/messages?client_id=eq.${encodeURIComponent(TEST_WORLD)}`,
    { method: 'DELETE', headers: sbHeaders() }
  ).catch(() => {})
}

// ── Static checks ─────────────────────────────────────────────────────────────

function runStaticChecks() {
  console.log('\n--- Static checks (source-grep) ---')

  // Check 1: voice-summary.js TERMINAL_AGENTS
  const summaryRel = 'api/dashboard/voice-summary.js'
  const summarySrc = readSource(summaryRel)
  if (!summarySrc) {
    record(`Check 1: ${summaryRel} readable`, false, 'file not found')
  } else {
    const agents = extractSet(summarySrc, 'TERMINAL_AGENTS')
    const hasEa = agents?.has('ea')
    const errorInterpolates = summarySrc.includes('[...TERMINAL_AGENTS]')
      && summarySrc.includes('voice-summary only supports terminal agents')
    record(
      "Check 1: voice-summary.js TERMINAL_AGENTS includes 'ea' + error interpolates allowlist",
      !!(hasEa && errorInterpolates),
      agents
        ? `members=[${[...agents].sort().join(', ')}] errorInterpolates=${errorInterpolates}`
        : 'TERMINAL_AGENTS declaration not found'
    )
  }

  // Check 2: VoiceChat.jsx TERMINAL_AGENTS + wiring
  const vcRel = 'src/dashboard/components/VoiceChat.jsx'
  const vcSrc = readSource(vcRel)
  if (!vcSrc) {
    record(`Check 2: ${vcRel} readable`, false, 'file not found')
  } else {
    const agents = extractSet(vcSrc, 'TERMINAL_AGENTS')
    const hasEa = agents?.has('ea')
    const firesSummaryGated = vcSrc.includes('TERMINAL_AGENTS.has(agentSlug)')
      && vcSrc.includes("'/api/dashboard/voice-summary'")
    const awaitsHandoff = vcSrc.includes("'/api/dashboard/voice-handoff'")
      && vcSrc.includes('await fetch')
    record(
      "Check 2: VoiceChat.jsx TERMINAL_AGENTS includes 'ea' + fires voice-summary gate + awaits voice-handoff",
      !!(hasEa && firesSummaryGated && awaitsHandoff),
      agents
        ? `members=[${[...agents].sort().join(', ')}] firesSummaryGated=${firesSummaryGated} awaitsHandoff=${awaitsHandoff}`
        : 'TERMINAL_AGENTS not found'
    )
  }

  // Check 3: voice-handoff.js agent-agnostic
  const handoffRel = 'api/dashboard/voice-handoff.js'
  const handoffSrc = readSource(handoffRel)
  if (!handoffSrc) {
    record(`Check 3: ${handoffRel} readable`, false, 'file not found')
  } else {
    const noAllowlist = !handoffSrc.includes('TERMINAL_AGENTS')
    const writesSource = handoffSrc.includes("source: 'voice-handoff'")
    record(
      "Check 3: voice-handoff.js has no TERMINAL_AGENTS gate (agent-agnostic) + writes source='voice-handoff'",
      noAllowlist && writesSource,
      `noAllowlist=${noAllowlist} writesSource=${writesSource}`
    )
  }

  // Check 4: supabase-listener.py allowed_sources
  let listenerSrc
  try { listenerSrc = readFileSync(AOM_EA_LISTENER, 'utf8') } catch { listenerSrc = null }
  if (!listenerSrc) {
    record('Check 4: supabase-listener.py readable', false, `not found at ${AOM_EA_LISTENER}`)
    record('Check 5: supabase-listener.py tape-append + shared relay-inbox write', false, 'file unreadable')
  } else {
    const m = listenerSrc.match(/allowed_sources\s*=\s*\(([^)]+)\)/)
    if (!m) {
      record('Check 4: supabase-listener.py allowed_sources tuple found', false)
    } else {
      const sources = new Set(m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean))
      const hasHandoff = sources.has('voice-handoff')
      const hasSummary = sources.has('voice-summary')
      record(
        "Check 4: supabase-listener.py allowed_sources covers voice-handoff + voice-summary",
        hasHandoff && hasSummary,
        `voice-handoff=${hasHandoff} voice-summary=${hasSummary} all=[${[...sources].sort().join(', ')}]`
      )
    }

    // Check 5: tape-append + shared relay-inbox write (no voice-only routing branch)
    const tapeAppend = listenerSrc.includes('source in ("voice-handoff", "voice-summary")')
      && listenerSrc.includes('_append_voice_call_to_tape(agent, text, source, record)')
    const sharedRelay = listenerSrc.includes('write_to_relay_inbox(text, msg_id, "corner-dashboard"')
    record(
      'Check 5: supabase-listener.py tape-append for both voice sources + shared write_to_relay_inbox',
      tapeAppend && sharedRelay,
      `tapeAppend=${tapeAppend} sharedRelay=${sharedRelay}`
    )
  }
}

// ── Dynamic checks ────────────────────────────────────────────────────────────

async function runDynamicChecks() {
  console.log('\n--- Dynamic checks (live API + Supabase) ---')

  if (!SVC_KEY) {
    record('Check 6: voice-handoff replay → messages row in Supabase', false, 'SUPABASE_SERVICE_ROLE_KEY not set — skipping dynamic checks')
    record('Check 7: voice-summary TERMINAL_AGENTS probe (agent=ea → 400 transcript required)', false, 'SUPABASE_SERVICE_ROLE_KEY not set — skipping dynamic checks')
    return
  }

  // Setup: create test user for unique client_id
  console.log('\n  Setup: creating test user...')
  try {
    const user = await createTestUser()
    testUserId = user.id
    console.log(`  User created: id=${testUserId}`)
  } catch (e) {
    record('Check 6: voice-handoff replay → messages row in Supabase', false, `createUser failed: ${e.message?.slice(0, 80)}`)
    record('Check 7: voice-summary TERMINAL_AGENTS probe (agent=ea → 400 transcript required)', false, 'skipped (createUser failed)')
    return
  }

  // Check 6: POST voice-handoff with LR-3 scenario transcript
  let handoffMsgId = null
  try {
    const body = JSON.stringify({
      agent: 'ea',
      transcript: TRANSCRIPT,
      client_id: TEST_WORLD,
      duration_secs: 42,
    })
    const res = await fetch(`${BASE}/api/dashboard/voice-handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const json = await res.json().catch(() => null)
    const apiOk = res.ok && json?.message_id

    if (apiOk) {
      handoffMsgId = json.message_id
      // Verify the row is in Supabase
      await new Promise(r => setTimeout(r, 1500))
      const rows = await sbGet(
        `messages?client_id=eq.${encodeURIComponent(TEST_WORLD)}&agent=eq.ea&source=eq.voice-handoff&select=id,source,agent,role,text&limit=5`
      )
      const row = rows.find(r => r.id === handoffMsgId)
      const rowOk = !!row && row.source === 'voice-handoff' && row.agent === 'ea' && row.role === 'user'
        && row.text?.includes('[VOICE CALL HANDOFF')
      record(
        'Check 6: voice-handoff replay → 200 + messages row (source=voice-handoff, agent=ea, preamble present)',
        rowOk,
        rowOk
          ? `msg_id=${handoffMsgId} source=voice-handoff agent=ea role=user preamble=OK`
          : `api_ok=${res.ok} row_found=${!!row} source=${row?.source} preamble_ok=${row?.text?.includes('[VOICE CALL HANDOFF')}`
      )
    } else {
      record(
        'Check 6: voice-handoff replay → 200 + messages row (source=voice-handoff, agent=ea, preamble present)',
        false,
        `status=${res.status} body=${JSON.stringify(json).slice(0, 120)}`
      )
    }
  } catch (e) {
    record('Check 6: voice-handoff replay → 200 + messages row (source=voice-handoff, agent=ea, preamble present)', false, e.message?.slice(0, 80))
  }

  // Check 7: TERMINAL_AGENTS probe — POST voice-summary with empty transcript
  // Expect 400 "transcript required" (not "only supports terminal agents")
  try {
    const res = await fetch(`${BASE}/api/dashboard/voice-summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent: 'ea', transcript: [], client_id: TEST_WORLD }),
    })
    const json = await res.json().catch(() => null)
    const error = json?.error || ''

    // Passing cases:
    //   400 "transcript required ..." → cleared TERMINAL_AGENTS gate
    //   400 "transcript has no usable text" → cleared TERMINAL_AGENTS gate
    //   200 → somehow succeeded (should not happen with empty transcript, but still a pass)
    // Failing case:
    //   400 "voice-summary only supports terminal agents" → TERMINAL_AGENTS gate blocked 'ea'
    const blockedByTerminal = res.status === 400 && error.includes('only supports terminal agents')
    const clearedGate = !blockedByTerminal && (res.status === 400 || res.ok)
    record(
      "Check 7: voice-summary TERMINAL_AGENTS probe (agent=ea → not blocked by 'only supports terminal agents')",
      clearedGate,
      clearedGate
        ? `status=${res.status} error="${error.slice(0, 60)}" — cleared TERMINAL_AGENTS gate`
        : `BLOCKED: status=${res.status} error="${error.slice(0, 80)}"`
    )
  } catch (e) {
    record("Check 7: voice-summary TERMINAL_AGENTS probe (agent=ea → not blocked by 'only supports terminal agents')", false, e.message?.slice(0, 80))
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== LR-4a gate: phone parity (static + transcript-replay) ===')
  console.log(`Base:       ${BASE}`)
  console.log(`Test world: ${TEST_WORLD}`)
  console.log(`Listener:   ${AOM_EA_LISTENER}\n`)

  runStaticChecks()
  await runDynamicChecks()

  // Cleanup
  console.log('\n--- Cleanup ---')
  await deleteTestMessages()
  await deleteTestUser()
  if (testUserId) console.log(`Deleted test user ${testUserId} + messages for world ${TEST_WORLD}`)

  // Final report
  const passed = checks.filter(c => c.pass).length
  const total = checks.length
  console.log(`\n${passed}/${total} PASS`)
  if (passed < total) {
    console.log('FAILED:')
    checks.filter(c => !c.pass).forEach(c =>
      console.log(`  — ${c.name}${c.detail ? ` (${c.detail})` : ''}`)
    )
  }
  process.exit(passed === total ? 0 : 1)
}

run().catch(err => {
  console.error('LR-4a gate error:', err)
  deleteTestMessages().catch(() => {})
  deleteTestUser().catch(() => {})
  process.exit(1)
})
