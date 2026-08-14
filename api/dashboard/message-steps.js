// GET /api/dashboard/message-steps?client_id=aom&agent=elon[&project=corner][&limit=20]
//
// Returns recent message_step events for a surface. Proxies to Supabase with
// the service-role key because events RLS blocks anon/user reads, which is
// why R65-impl's client-side subscription never rendered steps in practice.
//
// Response shape:
//   { steps: [{ id, agent, parent_message_id, step_index, text, status, timestamp, project }] }

import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js'

// Steps are auto-derived from the agent's raw tool calls, so they leak file paths and shell
// commands ("Running: ls -la /Users/...", "Reading v3-mobile-top.png") — a terminal log, not a
// conversation. This rewrites each step into a short, plain-language line a user understands and
// strips every path/command, so the live thread reads like work, not a console (rule 4 + the
// 2026-06-23 "short human points, NOT raw tool names and NOT code" reframe). ONE chokepoint: every
// surface reads steps through this endpoint, so this covers all agents and all history at once.
function humanizeStep(raw) {
  let t = String(raw || '').trim()
  if (!t) return t

  // Raw shell command ("Running: <cmd>") — never show the command or its paths; speak the intent.
  let m = t.match(/^Running:\s*(.+)$/i)
  if (m) {
    const verb = (m[1].trim().split(/\s+/)[0] || '').replace(/.*\//, '').toLowerCase()
    const byVerb = {
      ls: 'Looking through the files', find: 'Looking through the files', tree: 'Looking through the files',
      grep: 'Searching the project', rg: 'Searching the project', ag: 'Searching the project',
      cat: 'Reading the details', head: 'Reading the details', tail: 'Reading the details',
      less: 'Reading the details', sed: 'Reading the details', awk: 'Reading the details',
      git: 'Checking the latest changes', diff: 'Comparing the changes',
      npm: 'Running a quick build', npx: 'Running a quick build',
      yarn: 'Running a quick build', pnpm: 'Running a quick build', make: 'Running a quick build',
      node: 'Running a quick check', python3: 'Running a quick check', python: 'Running a quick check',
      pytest: 'Running the tests', jest: 'Running the tests', vitest: 'Running the tests', test: 'Running the tests',
      curl: 'Checking a live page', wget: 'Checking a live page', ping: 'Checking a connection',
      mkdir: 'Setting things up', cp: 'Organizing files', mv: 'Organizing files', rm: 'Tidying up',
      chmod: 'Setting things up', touch: 'Setting things up', ln: 'Setting things up',
      vercel: "Checking it's live", docker: "Checking it's live",
      launchctl: 'Checking a background service', ps: 'Checking what is running', kill: 'Restarting a service',
      open: 'Opening a preview', echo: 'Noting something down',
    }
    return byVerb[verb] || 'Working through the project'
  }

  // File op named by file ("Reading X.png", "Editing Y.jsx") — say the kind, never the filename.
  m = t.match(/^(Reading|Editing|Writing|Opening)\s+(.+)$/i)
  if (m) {
    const verb = m[1].toLowerCase()
    const name = m[2].toLowerCase()
    const isImg = /\.(png|jpe?g|gif|webp|svg|heic|bmp)$/.test(name)
    const isData = /\.(json|ya?ml|toml|env|csv)$/.test(name)
    const isCode = /\.(jsx?|tsx?|py|sh|css|html?|rb|go|rs|php)$/.test(name)
    if (verb === 'reading') {
      if (isImg) return 'Reviewing a screen'
      if (isData) return 'Checking the data'
      if (isCode) return 'Reading through the setup'
      return 'Reading the notes'
    }
    if (isImg) return 'Updating a screen'
    if (isCode) return 'Making the change'
    if (isData) return 'Updating the settings'
    return 'Writing it up'
  }

  if (/^Searching for\b/i.test(t)) return 'Searching the project'
  if (/^(Spawning|Bringing in)\b/i.test(t)) return 'Bringing in extra help'
  if (/^Using \//i.test(t)) return 'Using a built-in tool'

  // Anything else (agent-authored Bash descriptions are usually clean plain English): keep the
  // wording but scrub any leaked path or bare filename as a final safety net.
  t = t
    .replace(/(?:\/[\w.\-]+){2,}\/?/g, 'the files')
    .replace(/\b[\w\-]+\.(?:jsx?|tsx?|py|sh|json|ya?ml|md|css|html?|png|jpe?g|gif|webp|svg)\b/gi, 'the file')
    .replace(/\s{2,}/g, ' ')
    .trim()
  // Root safety net (Steffen design-gate 2026-07-21): a machine-flavored label
  // ("Count entries in current directory") must NEVER reach the user — the whole
  // strip exists to translate the machine into plain comprehension (rule 4). If the
  // text still carries dev-world vocabulary after scrubbing, speak the intent
  // generically instead of leaking the terminal's voice. Clean plain-English
  // descriptions have none of these tokens and pass through untouched.
  if (/\b(director(?:y|ies)|subdir|cwd|std(?:out|err|in)|node_modules|localhost|entries|filesystem|grep|chmod|mkdir|rmdir|dir|repo|regex|npm|npx)\b/i.test(t)) {
    return 'Working through the project'
  }
  return t
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function headers() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const _msgClient = req.query.client_id ? String(req.query.client_id).trim() : ''
  if (!_msgClient) return res.status(401).json({ error: 'Missing client' })
  let tenant
  try {
    ({ tenant } = await verifyTenant(_msgClient, req))
  } catch (err) {
    if (err instanceof TenantAuthError) return res.status(err.status).json({ error: err.message })
    throw err
  }
  const clientId = tenant
  const agent = (req.query.agent || '').toString().toLowerCase()
  const project = (req.query.project || '').toString().toLowerCase()
  const limit = Math.min(parseInt(req.query.limit, 10) || 40, 100)

  const qsParts = [
    'select=id,agent,payload,timestamp',
    'event_type=eq.message_step',
    `order=timestamp.desc`,
    `limit=${limit}`,
  ]
  // Filter by client_id server-side to avoid fetching all events
  qsParts.push(`payload->>client_id.eq.${encodeURIComponent(clientId)}`)
  if (agent) qsParts.push(`agent=eq.${encodeURIComponent(agent)}`)

  const url = `${SUPABASE_URL}/rest/v1/events?${qsParts.join('&')}`
  let rows = []
  try {
    const r = await fetch(url, { headers: headers() })
    if (r.ok) rows = await r.json()
  } catch (_) {}

  const steps = []
  for (const row of rows) {
    const p = row.payload || {}
    if ((p.client_id || clientId) !== clientId) continue
    if (project && (p.project || '') !== project) continue
    const pid = p.parent_message_id
    if (!pid) continue
    // Keep the settle sentinel verbatim (the frontend filters it by step_index/"settled");
    // humanize everything the user actually sees.
    const isSentinel = p.step_index === 9999 || p.text === 'settled'
    steps.push({
      id: row.id,
      agent: row.agent,
      parent_message_id: pid,
      step_index: p.step_index ?? 0,
      text: isSentinel ? (p.text || '') : humanizeStep(p.text || ''),
      status: p.status || 'in_progress',
      timestamp: row.timestamp,
      project: p.project || '',
      // R-SMOOTHNESS Round B: turn-phase tag stamped by the bridge
      // (thinking | working | streaming | done | waiting). Additive.
      phase: p.phase || '',
    })
  }
  return res.status(200).json({ steps })
}
