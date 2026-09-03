// rexTaskClient.js -- create a task from the dashboard.
//
// Queues a row on the Convex task queue (tasks:queue, corner:retire-supabase R1),
// the same contract scripts/queue-task.py uses. The task runner resolves the
// repo path from the project slug (its resolve_repo_path map), so the browser
// does not look projects up first.

import { convexMutation } from './convex.js';

function cleanTitle(raw) {
  const s = (raw || '').trim().replace(/\s+/g, ' ');
  if (!s) return 'Untitled task';
  return s.length > 140 ? s.slice(0, 137) + '…' : s;
}

/**
 * Create a task. Used by the task creation UI and the chat context menu.
 *
 * @param {string} text         - Natural language task description (used as title + text body).
 * @param {string} [userId]     - Forwarded as created_by.
 * @param {string} [userName]   - Kept in the signature for call-site compat.
 * @param {object} [options]
 * @param {string} [options.projectSlug] - Project slug to attach (e.g. 'corner', 'ambition').
 * @param {string} [options.clientId]    - World slug, defaults to 'aom'.
 * @returns {Promise<{ reply: string, task: object|null, toolCalls: Array }>}
 * @throws {Error} if the queue write fails.
 */
export async function createTaskWithRex(text, userId, userName, options = {}) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('text is required');
  }

  const title = cleanTitle(text);
  const clientId = options.clientId || 'aom';
  const projectSlug = (options.projectSlug || '').trim().toLowerCase() || null;

  const row = {
    title,
    text,
    description: text,
    status: 'queued',
    source: 'corner-dashboard-task',
    client_id: clientId,
    created_by: userId || null,
    project: projectSlug,
    project_path: '',
    metadata: {
      repo: projectSlug || null,
      created_via: 'dashboard-direct-insert',
      created_by_name: userName || null,
      model: 'sonnet',
    },
  };

  let created;
  try {
    created = await convexMutation('tasks:queue', { row });
  } catch (err) {
    throw new Error((err && err.message) || 'Failed to create task');
  }

  const id = created && typeof created === 'object' ? (created.id || created._id || null) : (created || null);
  const task = {
    id: id ? String(id) : null,
    status: (created && created.status) || 'queued',
    repo: projectSlug || undefined,
    title: (created && created.title) || title,
  };

  return {
    reply: `Task queued: ${task.title}`,
    task,
    toolCalls: [],
  };
}
