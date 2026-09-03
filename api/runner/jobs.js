// /api/runner/jobs: a paired Corner Runner (public/downloads/corner-runner.mjs)
// claims jobs and reports back.
//
//   GET                              claim the next queued job for this device
//   POST { action: 'heartbeat' }     the runner is alive (job_id while working)
//   POST { action: 'progress' }      a step on the running job (step_index, text, status)
//   PATCH { job_id, status, output|error }   completed / failed
//
// corner:retire-supabase (2026-09-03): corner_runner_devices / corner_runner_jobs
// and the claim RPC are gone. Jobs live in the Convex runnerJobs table
// (runner:claimJob / completeJob / listJobs). The job text carries a header the
// enqueue side writes (api/_lib/runnerJobs.js):
//   [corner-runner] room=<roomId> message=<messageId> client=<world> user=<userId>
//   <the person's message>
// so the original message and its room are read back with messages:getMessage
// and messages:list, the reply goes in with messages:send (agent row, source
// corner-runner) and every step is a message_step event via tasks:logEvent.
//
// Heartbeats: the Convex row has no status column; claimJob stamps lastSeenAt
// on every poll (the runner polls every few seconds), so a heartbeat is
// acknowledged without a write.

import { authenticateRunner, runnerConfigAvailable, hashRunnerSecret, extractRunnerToken } from '../_lib/runnerAuth.js'
import { convexQuery, convexMutation } from '../_lib/verifyTenant.js'

const HEADER_RE = /^\[corner-runner\]\s*(.*)$/m

function cleanError(value) {
  return String(value || 'The local Codex process stopped unexpectedly.').replace(/\s+/g, ' ').trim().slice(0, 500)
}

const iso = (ms) => (typeof ms === 'number' && Number.isFinite(ms) ? new Date(ms).toISOString() : null)

// Split the job text into its routing header and the prompt.
function parseJobText(raw) {
  const text = String(raw || '')
  const m = text.match(HEADER_RE)
  const fields = {}
  if (m) {
    for (const part of m[1].split(/\s+/)) {
      const eq = part.indexOf('=')
      if (eq > 0) fields[part.slice(0, eq)] = part.slice(eq + 1)
    }
  }
  const prompt = m ? text.replace(m[0], '').replace(/^\n/, '') : text
  return { roomId: fields.room || '', messageId: fields.message || '', clientId: fields.client || '', userId: fields.user || '', prompt }
}

// The agent a reply should be signed as: the room's specialist (from the
// legacy room id), a mention on the message, else the plain Corner voice.
function agentFor(job, message) {
  const mention = message && Array.isArray(message.mentions) && message.mentions[0] && message.mentions[0].slug
  if (mention) return String(mention).toLowerCase()
  const parts = String(job.roomId || '').split(':')
  if (parts.length >= 3 && parts[1] === 'agent') return parts.slice(2).join(':').toLowerCase()
  return 'corner'
}

async function jobForDevice(device, jobId) {
  if (!jobId) return null
  try {
    const rows = await convexQuery('runner:listJobs', { deviceId: device.id, limit: 100 })
    return (Array.isArray(rows) ? rows : []).find((j) => String(j._id) === String(jobId)) || null
  } catch {
    return null
  }
}

async function messageForJob(parsed) {
  if (!parsed.roomId || !parsed.messageId) return null
  try {
    return await convexQuery('messages:getMessage', { roomId: parsed.roomId, messageId: parsed.messageId })
  } catch {
    return null
  }
}

async function contextForMessage(parsed, message) {
  if (!parsed.roomId) return []
  let rows = []
  try {
    rows = await convexQuery('messages:list', { roomId: parsed.roomId, limit: 21 })
  } catch {
    return []
  }
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => !message || String(row._id) !== String(message._id))
    .filter((row) => ['user', 'assistant'].includes(row.role || (row.agentSlug ? 'assistant' : 'user')))
    .slice(-20)
    .map((row) => ({
      role: row.role || (row.agentSlug ? 'assistant' : 'user'),
      agent: row.agentSlug || null,
      text: String(row.text || '').slice(0, 12_000),
      timestamp: iso(row.createdAt),
    }))
}

async function writeRunnerStep({ device, jobId, parsed, message, agent, stepIndex, text, status }) {
  try {
    await convexMutation('tasks:logEvent', {
      event: {
        event_type: 'message_step',
        agent: agent || 'corner',
        payload: {
          parent_message_id: message ? String(message._id) : parsed.messageId,
          step_index: stepIndex,
          text,
          status,
          client_id: parsed.clientId || device.client_id || '',
          world_id: parsed.clientId || device.client_id || '',
          project: (message && message.metadata && message.metadata.project) || '',
          emitter: 'corner-runner',
          runner_job_id: String(jobId),
          runner_device_id: device.id,
        },
      },
    })
    return true
  } catch {
    return false
  }
}

async function writeRunnerReply({ device, jobId, parsed, message, agent, text, failed = false }) {
  // The job id is the client message id, so a retry after a half-finished
  // completion returns the same reply row instead of a duplicate.
  const mission = (message && message.metadata && message.metadata.mission_slug) || null
  try {
    const id = await convexMutation('messages:send', {
      roomId: parsed.roomId,
      clientId: parsed.clientId || device.client_id || undefined,
      text,
      role: 'assistant',
      agentSlug: agent,
      source: 'corner-runner',
      clientMessageId: `runner-job-${String(jobId)}`.slice(0, 160),
      replyTo: message ? String(message._id) : undefined,
      metadata: {
        runner_job_id: String(jobId),
        runner_device_id: device.id,
        runner_device_name: device.name,
        local_codex: true,
        ...(mission ? { mission_slug: mission } : {}),
        ...(failed ? { runner_failed: true } : {}),
      },
    })
    return { ok: true, id: id ? String(id) : null }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (!runnerConfigAvailable()) return res.status(500).json({ error: 'Runner service is not configured' })

  const device = await authenticateRunner(req)
  if (!device) return res.status(401).json({ error: 'Runner authentication failed' })
  const tokenHash = hashRunnerSecret(extractRunnerToken(req))

  if (req.method === 'POST' && req.body?.action === 'heartbeat') {
    const activeJobId = String(req.body?.job_id || '')
    return res.status(200).json({ ok: true, status: activeJobId ? 'working' : 'online' })
  }

  if (req.method === 'POST' && req.body?.action === 'progress') {
    const jobId = String(req.body?.job_id || '')
    const stepIndex = Number(req.body?.step_index)
    const text = String(req.body?.text || '').replace(/\s+/g, ' ').trim().slice(0, 180)
    const status = String(req.body?.status || 'in_progress')
    if (!jobId || !Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex > 9998 || !text) {
      return res.status(400).json({ error: 'Valid job_id, step_index, and text required' })
    }
    if (!['in_progress', 'done'].includes(status)) {
      return res.status(400).json({ error: 'Progress status must be in_progress or done' })
    }
    const job = await jobForDevice(device, jobId)
    if (!job) return res.status(404).json({ error: 'Runner job not found' })
    if (job.status !== 'running') {
      return res.status(409).json({ error: 'Runner job is no longer active' })
    }
    const parsed = parseJobText(job.message)
    const message = await messageForJob(parsed)
    const written = await writeRunnerStep({ device, jobId, parsed, message, agent: agentFor(parsed, message), stepIndex, text, status })
    if (!written) return res.status(502).json({ error: 'Could not record runner progress' })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'GET') {
    let claimed
    try {
      claimed = await convexMutation('runner:claimJob', { tokenHash })
    } catch (e) {
      return res.status(502).json({ error: `Could not claim runner job: ${e?.message || e}` })
    }
    if (!claimed || !claimed.jobId) return res.status(200).json({ job: null })

    const jobId = String(claimed.jobId)
    const parsed = parseJobText(claimed.message)
    if (!parsed.roomId) {
      await convexMutation('runner:completeJob', { jobId, failed: true, result: { error: 'Job carries no room' } }).catch(() => {})
      return res.status(200).json({ job: null })
    }
    const message = await messageForJob(parsed)
    const context = await contextForMessage(parsed, message)
    const agent = agentFor(parsed, message)
    await writeRunnerStep({
      device,
      jobId,
      parsed,
      message,
      agent,
      stepIndex: 0,
      text: `Codex picked this up on ${device.name}`,
      status: 'in_progress',
    })
    const md = (message && message.metadata) || {}
    return res.status(200).json({
      job: {
        id: jobId,
        messageId: message ? String(message._id) : parsed.messageId,
        roomId: parsed.roomId,
        agent,
        project: md.project || null,
        mission: md.mission_slug || null,
        interactionMode: md.interaction_mode === 'plan' ? 'plan' : 'work',
        prompt: message ? String(message.text || '') : parsed.prompt,
        context,
      },
    })
  }

  if (req.method === 'PATCH') {
    const jobId = String(req.body?.job_id || '')
    const status = String(req.body?.status || '')
    if (!jobId || !['completed', 'failed'].includes(status)) {
      return res.status(400).json({ error: 'job_id and completed/failed status required' })
    }
    const job = await jobForDevice(device, jobId)
    if (!job) return res.status(404).json({ error: 'Runner job not found' })
    if (['done', 'failed', 'completed', 'cancelled'].includes(job.status)) {
      return res.status(200).json({ ok: true, duplicate: true })
    }
    const parsed = parseJobText(job.message)
    if (!parsed.roomId) return res.status(404).json({ error: 'Original message not found' })
    const message = await messageForJob(parsed)
    const agent = agentFor(parsed, message)

    if (status === 'completed') {
      const output = String(req.body?.output || '').trim().slice(0, 120_000)
      if (!output) return res.status(400).json({ error: 'Completed jobs require output' })
      const reply = await writeRunnerReply({ device, jobId, parsed, message, agent, text: output })
      if (!reply.ok) return res.status(502).json({ error: reply.error || 'Could not write runner reply' })
      await convexMutation('runner:completeJob', {
        jobId,
        result: { preview: output.slice(0, 500), reply_message_id: reply.id },
      }).catch(() => {})
    } else {
      const reason = cleanError(req.body?.error)
      const notice = `Corner Runner could not finish that on ${device.name}. ${reason}`
      await writeRunnerReply({ device, jobId, parsed, message, agent, text: notice, failed: true })
      await convexMutation('runner:completeJob', { jobId, failed: true, result: { error: reason } }).catch(() => {})
    }
    await writeRunnerStep({ device, jobId, parsed, message, agent, stepIndex: 9999, text: 'settled', status: 'done' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'GET, POST, or PATCH only' })
}
