#!/usr/bin/env node
// scripts/accept/AL-2_spawn_foreman.js — acceptance gate for AL-2 spawn_foreman
//
// What's tested:
//   1. POST /api/dashboard/haiku-chat with "drive the launch-readiness mission"
//      returns a spawn_foreman tool_call event in the SSE stream.
//   2. spawn_foreman tool_call has mission_slug="corner:launch-readiness".
//   3. A task row exists in Supabase with metadata.is_foreman=true.
//   4. That task row's body contains "foreman-orchestrate.py --mission corner:launch-readiness".
//
// Usage:
//   node scripts/accept/AL-2_spawn_foreman.js [--base=https://aheadofmarket.com]
//
// Exit codes: 0 = all PASS, 1 = at least one FAIL.

const BASE = (process.argv.find(a => a.startsWith('--base='))?.split('=')[1])
  || process.env.AL2_BASE
  || 'https://aheadofmarket.com'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const checks = []
function record(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  const line = detail ? `${tag} — ${name} (${detail})` : `${tag} — ${name}`
  console.log(line)
}

async function collectSSE(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
  }

  const events = []
  const text = await res.text()
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6).trim()
    if (!data || data === '[DONE]') continue
    try { events.push(JSON.parse(data)) } catch {}
  }
  return events
}

async function sbGet(path) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase env vars not set')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase GET ${path} -> ${res.status}: ${text.slice(0, 200)}`)
  return JSON.parse(text)
}

async function run() {
  const endpoint = `${BASE}/api/dashboard/haiku-chat`
  console.log(`\nAL-2 spawn_foreman acceptance gate`)
  console.log(`Endpoint: ${endpoint}`)
  console.log(`Message:  "drive the launch-readiness mission"\n`)

  let events = []
  let spawnToolCall = null
  let taskId = null

  // ── Check 1 & 2: SSE stream contains spawn_foreman tool_call ──────────────
  try {
    events = await collectSSE(endpoint, {
      slug: 'bobby',
      message: 'drive the launch-readiness mission',
      client_id: 'aom',
    })

    const toolCalls = events.filter(e => e.type === 'tool_call')
    spawnToolCall = toolCalls.find(e => e.name === 'spawn_foreman')

    record(
      'response includes spawn_foreman tool_call',
      !!spawnToolCall,
      spawnToolCall ? '' : `tool_calls found: ${toolCalls.map(e => e.name).join(', ') || 'none'}`,
    )
  } catch (e) {
    record('response includes spawn_foreman tool_call', false, e.message || String(e))
    record('spawn_foreman.mission_slug = "corner:launch-readiness"', false, 'upstream check failed')
  }

  if (spawnToolCall) {
    const missionSlug = spawnToolCall.args?.mission_slug
    record(
      'spawn_foreman.mission_slug = "corner:launch-readiness"',
      missionSlug === 'corner:launch-readiness',
      missionSlug ? `got "${missionSlug}"` : 'mission_slug missing',
    )

    // Get task_id from tool_result
    const toolResult = events.find(e => e.type === 'tool_result' && e.name === 'spawn_foreman')
    taskId = toolResult?.result?.task_id || null
  } else if (!spawnToolCall) {
    record('spawn_foreman.mission_slug = "corner:launch-readiness"', false, 'no spawn_foreman call found')
  }

  // ── Check 3 & 4: Supabase task row ────────────────────────────────────────
  if (taskId) {
    try {
      const rows = await sbGet(`tasks?id=eq.${encodeURIComponent(taskId)}&select=id,title,text,description,metadata&limit=1`)
      const task = Array.isArray(rows) ? rows[0] : null

      const isForeman = task?.metadata?.is_foreman === true
      record(
        'task row has metadata.is_foreman=true',
        isForeman,
        isForeman ? '' : `metadata.is_foreman=${JSON.stringify(task?.metadata?.is_foreman)}`,
      )

      const body = task?.text || task?.description || ''
      const bodyOk = body.includes('foreman-orchestrate.py --mission corner:launch-readiness')
      record(
        'task body contains foreman-orchestrate.py --mission corner:launch-readiness',
        bodyOk,
        bodyOk ? '' : `body: "${body.slice(0, 200)}"`,
      )
    } catch (e) {
      record('task row has metadata.is_foreman=true', false, e.message || String(e))
      record('task body contains foreman-orchestrate.py --mission corner:launch-readiness', false, 'upstream check failed')
    }
  } else {
    // No task_id from SSE — try querying Supabase for the most recent foreman task
    let fallbackTask = null
    try {
      const rows = await sbGet(`tasks?metadata->>is_foreman=eq.true&order=created_at.desc&limit=1&select=id,title,text,description,metadata`)
      fallbackTask = Array.isArray(rows) ? rows[0] : null
    } catch {}

    if (fallbackTask) {
      const isForeman = fallbackTask?.metadata?.is_foreman === true
      record(
        'task row has metadata.is_foreman=true',
        isForeman,
        isForeman ? '(via fallback query)' : `metadata.is_foreman=${JSON.stringify(fallbackTask?.metadata?.is_foreman)}`,
      )

      const body = fallbackTask?.text || fallbackTask?.description || ''
      const bodyOk = body.includes('foreman-orchestrate.py --mission corner:launch-readiness')
      record(
        'task body contains foreman-orchestrate.py --mission corner:launch-readiness',
        bodyOk,
        bodyOk ? '(via fallback query)' : `body: "${body.slice(0, 200)}"`,
      )
    } else {
      record('task row has metadata.is_foreman=true', false, 'no task_id from SSE and no fallback row found')
      record('task body contains foreman-orchestrate.py --mission corner:launch-readiness', false, 'no task_id from SSE and no fallback row found')
    }
  }

  const passed = checks.filter(c => c.pass).length
  const total = checks.length
  console.log(`\nAL-2 spawn_foreman: ${passed}/${total} PASS`)
  process.exit(passed === total ? 0 : 1)
}

run().catch(err => {
  console.error('AL-2 harness error:', err)
  process.exit(2)
})
