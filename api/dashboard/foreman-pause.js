// POST /api/dashboard/foreman-pause — write /tmp/foreman-pause signal (pause)
// DELETE /api/dashboard/foreman-pause — delete signal + re-queue foreman (resume)
//
// Body: { taskId: string, missionSlug: string }
// Foreman checks Path("/tmp/foreman-pause") after each round and exits cleanly if present.

import { promises as fs } from 'fs'

const SIGNAL_PATH = '/tmp/foreman-pause'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function sbPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase POST ${path} → ${res.status}: ${text.slice(0, 300)}`)
  try { return JSON.parse(text) } catch { return null }
}

async function sbPatch(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase PATCH ${path} → ${res.status}: ${text.slice(0, 300)}`)
  }
}

async function sbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}: ${text.slice(0, 300)}`)
  try { return JSON.parse(text) } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (!['POST', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'POST or DELETE only' })
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const body = req.body || {}
  const { taskId, missionSlug } = body

  if (!taskId || !/^[0-9a-f-]{36}$/i.test(taskId)) {
    return res.status(400).json({ error: 'valid taskId required' })
  }

  try {
    if (req.method === 'POST') {
      // Pause: write signal file + mark task metadata
      await fs.writeFile(SIGNAL_PATH, `paused by dashboard ${new Date().toISOString()}\n`)

      // Update task metadata to record pause intent
      await sbPatch(`tasks?id=eq.${encodeURIComponent(taskId)}`, {
        metadata: { foreman_pausing: true, mission: missionSlug || null },
      }).catch(() => { /* non-fatal — metadata patch is advisory */ })

      return res.status(200).json({ ok: true, action: 'paused', signal: SIGNAL_PATH })
    }

    if (req.method === 'DELETE') {
      // Resume: delete signal file + re-queue the foreman task
      await fs.unlink(SIGNAL_PATH).catch(() => { /* ok if already gone */ })

      // Fetch original task to clone its config
      const rows = await sbGet(
        `tasks?id=eq.${encodeURIComponent(taskId)}&select=title,text,description,project,project_path,client_id,source,metadata&limit=1`,
      )
      const original = Array.isArray(rows) ? rows[0] : null

      const prevMeta = (original?.metadata && typeof original.metadata === 'object') ? original.metadata : {}
      const mission = missionSlug || prevMeta.mission || null

      if (!mission) {
        return res.status(400).json({ error: 'missionSlug required to restart foreman' })
      }

      const { randomUUID } = await import('crypto')
      const now = new Date().toISOString()

      const newTask = {
        id: randomUUID(),
        title: original?.title || `Foreman: drive ${mission}`,
        text: `python3 scripts/foreman-orchestrate.py --mission ${mission} --loop`,
        description: `python3 scripts/foreman-orchestrate.py --mission ${mission} --loop`,
        status: 'queued',
        source: 'dashboard-foreman-resume',
        client_id: original?.client_id || 'aom',
        project: original?.project || 'corner',
        project_path: original?.project_path || '',
        priority: 0,
        created_at: now,
        metadata: {
          repo: 'corner',
          created_via: 'foreman-resume',
          model: prevMeta.model || 'opus',
          is_foreman: true,
          mission,
          resumed_from: taskId,
        },
      }

      const inserted = await sbPost('tasks', newTask)
      const task = Array.isArray(inserted) ? inserted[0] : inserted

      return res.status(200).json({ ok: true, action: 'resumed', newTaskId: task?.id || null })
    }
  } catch (err) {
    console.error('[foreman-pause] error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
