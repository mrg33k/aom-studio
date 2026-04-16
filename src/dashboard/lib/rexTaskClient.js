// rexTaskClient.js -- Direct task insert (post-Haiku R5 rewire)
//
// BEFORE: sent the text to /api/dashboard/haiku-chat which interpreted it,
//   picked a repo, and called write_task. Unreliable because Haiku couldn't
//   understand task references in context.
// AFTER: inserts a row directly into the Supabase `tasks` table with a
//   minimal payload. Project + repo are resolved from an optional slug the
//   caller passes (TasksPanel already knows the selected project pill).
//
// Elon-side tasks are created by scripts/queue-task.py in AOM-EA; this
// function is the browser-side equivalent so the dashboard's task creator
// doesn't need a router.

import { supabase } from './supabase.js'

function cleanTitle(raw) {
  const s = (raw || '').trim().replace(/\s+/g, ' ')
  if (!s) return 'Untitled task'
  return s.length > 140 ? s.slice(0, 137) + '…' : s
}

/**
 * Create a task directly. Used by TasksPanel's task creation UI.
 *
 * @param {string} text         - Natural language task description (used as title + text body).
 * @param {string} [userId]     - Forwarded as created_by.
 * @param {string} [userName]   - Ignored for now; kept in the signature for call-site compat.
 * @param {object} [options]
 * @param {string} [options.projectSlug] - Project slug to attach (e.g. 'corner', 'ambition').
 *                                          When set, project_path is filled from the projects table.
 * @param {string} [options.clientId]    - Supabase client_id, defaults to 'aom'.
 * @returns {Promise<{ reply: string, task: object|null, toolCalls: Array }>}
 *   reply     -- short confirmation string ("Task queued: <title>")
 *   task      -- the created task row summary
 *   toolCalls -- always [] (kept for compat with TasksPanel's old return shape)
 * @throws {Error} if the insert fails.
 */
export async function createTaskWithRex(text, userId, userName, options = {}) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('text is required')
  }

  const title = cleanTitle(text)
  const clientId = options.clientId || 'aom'
  const projectSlug = (options.projectSlug || '').trim().toLowerCase() || null

  // Resolve project -> repo_path if a slug was provided. Missing project is
  // fine; runner will fall back to AOM-EA or whatever metadata.repo says.
  let repoPath = null
  if (projectSlug) {
    const { data: proj } = await supabase
      .from('projects')
      .select('slug,repo_path')
      .eq('slug', projectSlug)
      .maybeSingle()
    repoPath = proj?.repo_path || null
  }

  const row = {
    title,
    text,
    description: text,
    status: 'queued',
    source: 'corner-dashboard-task',
    client_id: clientId,
    created_by: userId || null,
    project: projectSlug,
    project_path: repoPath || '',
    metadata: {
      repo: projectSlug || null,
      created_via: 'dashboard-direct-insert',
      model: 'sonnet',
    },
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(row)
    .select('id,title,status,project')
    .maybeSingle()

  if (error) {
    throw new Error(error.message || 'Failed to create task')
  }

  const task = data ? {
    id: data.id,
    status: data.status,
    repo: projectSlug || undefined,
    title: data.title,
  } : null

  return {
    reply: task ? `Task queued: ${task.title}` : 'Task queued.',
    task,
    toolCalls: [],
  }
}
