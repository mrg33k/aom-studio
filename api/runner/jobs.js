import { authenticateRunner, runnerConfigAvailable, runnerServiceHeaders, runnerSupabaseUrl } from '../_lib/runnerAuth.js'
import { writeMessageRow } from '../_lib/write-message.js'

function cleanError(value) {
  return String(value || 'The local Codex process stopped unexpectedly.').replace(/\s+/g, ' ').trim().slice(0, 500)
}

async function updateDevice(deviceId, values) {
  await fetch(runnerSupabaseUrl(`/rest/v1/corner_runner_devices?id=eq.${encodeURIComponent(deviceId)}`), {
    method: 'PATCH',
    headers: runnerServiceHeaders('return=minimal'),
    body: JSON.stringify({ ...values, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  })
}

async function updateJob(deviceId, jobId, values) {
  const response = await fetch(
    runnerSupabaseUrl(
      `/rest/v1/corner_runner_jobs?id=eq.${encodeURIComponent(jobId)}`
      + `&device_id=eq.${encodeURIComponent(deviceId)}&select=*`,
    ),
    {
      method: 'PATCH',
      headers: runnerServiceHeaders('return=representation'),
      body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
    },
  )
  if (!response.ok) return null
  const rows = await response.json()
  return rows?.[0] || null
}

async function messageForJob(job) {
  const response = await fetch(
    runnerSupabaseUrl(
      `/rest/v1/messages?id=eq.${encodeURIComponent(job.message_id)}`
      + '&select=id,room_id,agent,project,text,metadata,client_id,timestamp&limit=1',
    ),
    { headers: runnerServiceHeaders() },
  )
  if (!response.ok) return null
  const rows = await response.json()
  return rows?.[0] || null
}

async function contextForMessage(message) {
  const response = await fetch(
    runnerSupabaseUrl(
      `/rest/v1/messages?room_id=eq.${encodeURIComponent(message.room_id)}`
      + `&client_id=eq.${encodeURIComponent(message.client_id)}`
      + '&role=in.(user,assistant)&select=id,role,text,agent,timestamp&order=timestamp.desc&limit=20',
    ),
    { headers: runnerServiceHeaders() },
  )
  if (!response.ok) return []
  const rows = await response.json()
  return (Array.isArray(rows) ? rows : []).filter((row) => row.id !== message.id).reverse().map((row) => ({
    role: row.role,
    agent: row.agent,
    text: String(row.text || '').slice(0, 12_000),
    timestamp: row.timestamp,
  }))
}

async function writeRunnerReply({ device, job, message, text, failed = false }) {
  // Use the job UUID as the assistant-message UUID. If a serverless function
  // writes the reply and dies before updating the job, the lease retry can
  // observe the existing deterministic row and finish without a duplicate.
  const existingResponse = await fetch(
    runnerSupabaseUrl(`/rest/v1/messages?id=eq.${encodeURIComponent(job.id)}&select=*&limit=1`),
    { headers: runnerServiceHeaders() },
  )
  const existingRows = existingResponse.ok ? await existingResponse.json() : []
  if (existingRows?.[0]) return { ok: true, row: existingRows[0], duplicate: true }
  const mission = message.metadata?.mission_slug || null
  const metadata = {
    runner_job_id: job.id,
    runner_device_id: device.id,
    runner_device_name: device.name,
    local_codex: true,
    ...(failed ? { runner_failed: true } : {}),
  }
  const result = await writeMessageRow({
    supabaseUrl: runnerSupabaseUrl('').replace(/\/$/, ''),
    headers: runnerServiceHeaders('return=representation'),
    text,
    role: 'assistant',
    source: 'corner-runner',
    agent: message.agent || 'corner',
    clientId: message.client_id,
    id: job.id,
    project: message.project || null,
    mission,
    authorizeProjectScope: async () => ({ ok: true, via: 'verified-runner-job' }),
    metadata,
    worldId: String(message.client_id || '').startsWith('shared:') ? null : message.client_id,
    replyTo: message.id,
  })
  if (result.ok) return result
  // Cover the narrow race where another retry inserted the deterministic row
  // after our first existence check.
  const racedResponse = await fetch(
    runnerSupabaseUrl(`/rest/v1/messages?id=eq.${encodeURIComponent(job.id)}&select=*&limit=1`),
    { headers: runnerServiceHeaders() },
  )
  const racedRows = racedResponse.ok ? await racedResponse.json() : []
  return racedRows?.[0] ? { ok: true, row: racedRows[0], duplicate: true } : result
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

  if (req.method === 'POST' && req.body?.action === 'heartbeat') {
    const activeJobId = String(req.body?.job_id || '')
    const status = activeJobId ? 'working' : 'online'
    await updateDevice(device.id, { status })
    if (activeJobId) {
      await updateJob(device.id, activeJobId, {
        status: 'running',
        lease_expires_at: new Date(Date.now() + 120_000).toISOString(),
      })
    }
    return res.status(200).json({ ok: true, status })
  }

  if (req.method === 'GET') {
    await updateDevice(device.id, { status: 'online' })
    const claim = await fetch(runnerSupabaseUrl('/rest/v1/rpc/claim_corner_runner_job'), {
      method: 'POST',
      headers: runnerServiceHeaders(),
      body: JSON.stringify({ p_device_id: device.id, p_lease_seconds: 120 }),
    })
    if (!claim.ok) return res.status(502).json({ error: 'Could not claim runner job' })
    const rows = await claim.json()
    const job = rows?.[0]
    if (!job) return res.status(200).json({ job: null })

    const message = await messageForJob(job)
    if (!message) {
      await updateJob(device.id, job.id, {
        status: 'failed',
        error: 'Original message no longer exists',
        finished_at: new Date().toISOString(),
      })
      return res.status(200).json({ job: null })
    }
    const context = await contextForMessage(message)
    await updateDevice(device.id, { status: 'working' })
    await updateJob(device.id, job.id, { status: 'running', lease_expires_at: new Date(Date.now() + 120_000).toISOString() })
    return res.status(200).json({
      job: {
        id: job.id,
        messageId: message.id,
        roomId: message.room_id,
        agent: message.agent,
        project: message.project,
        mission: message.metadata?.mission_slug || null,
        interactionMode: message.metadata?.interaction_mode === 'plan' ? 'plan' : 'work',
        prompt: message.text,
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
    const jobResponse = await fetch(
      runnerSupabaseUrl(
        `/rest/v1/corner_runner_jobs?id=eq.${encodeURIComponent(jobId)}`
        + `&device_id=eq.${encodeURIComponent(device.id)}&select=*&limit=1`,
      ),
      { headers: runnerServiceHeaders() },
    )
    const jobRows = jobResponse.ok ? await jobResponse.json() : []
    const job = jobRows?.[0]
    if (!job) return res.status(404).json({ error: 'Runner job not found' })
    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      return res.status(200).json({ ok: true, duplicate: true })
    }
    const message = await messageForJob(job)
    if (!message) return res.status(404).json({ error: 'Original message not found' })

    const finishedAt = new Date().toISOString()
    if (status === 'completed') {
      const output = String(req.body?.output || '').trim().slice(0, 120_000)
      if (!output) return res.status(400).json({ error: 'Completed jobs require output' })
      const reply = await writeRunnerReply({ device, job, message, text: output })
      if (!reply.ok) return res.status(502).json({ error: reply.error || 'Could not write runner reply' })
      await updateJob(device.id, job.id, {
        status: 'completed',
        finished_at: finishedAt,
        lease_expires_at: null,
        result_preview: output.slice(0, 500),
        error: null,
      })
    } else {
      const reason = cleanError(req.body?.error)
      const notice = `Corner Runner couldn’t finish that on ${device.name}. ${reason}`
      await writeRunnerReply({ device, job, message, text: notice, failed: true })
      await updateJob(device.id, job.id, {
        status: 'failed',
        finished_at: finishedAt,
        lease_expires_at: null,
        error: reason,
      })
    }
    await updateDevice(device.id, { status: 'online' })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).json({ error: 'GET, POST, or PATCH only' })
}
