import { useState, useEffect } from 'react';
import { authFetch } from '../lib/authFetch.js';

/**
 * useRunningJobs — fetches REAL currently-running jobs from the tasks table.
 * Returns { job, isLoading, error } where job is a single ActivityDock-shaped object
 * or null when no jobs are running. Polls every 2-5s so the dock always shows fresh status.
 *
 * Job shape: { kind, label, detail }
 *   kind: 'recording' | 'working' | 'secondary' | 'drafting'
 *   label: main text (e.g. "Recording · 08:42" or "Elon · filing 40 files")
 *   detail: sub-text (e.g. "Corner · Dashboard")
 *
 * Real source: Supabase tasks table, status='running' rows for the current worldId.
 */

function mapTaskToJob(task) {
  if (!task) return null;

  // Task metadata may contain hints about what kind of work it is.
  // Default to 'working' (spinner); 'drafting' if there's a reply being composed;
  // 'secondary' for agent background work; 'recording' if phone call is live.
  let kind = 'working';
  const meta = task.metadata || {};
  if (meta.kind === 'recording' || meta.type === 'recording') kind = 'recording';
  else if (meta.kind === 'drafting' || meta.type === 'drafting' || task.agent_identity === 'elon' && task.text?.includes('draft')) kind = 'drafting';
  else if (meta.kind === 'secondary' || meta.type === 'secondary' || task.agent_identity !== 'rex') kind = 'secondary';

  // Label: agent name + short action, or agent name + time for recording.
  // Format examples: "Recording · 08:42", "Elon · filing 40 files", "Gary · pre-screening"
  const agentName = task.agent_identity || 'Agent';
  const titleCase = s => String(s || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
  const agentDisplay = titleCase(agentName);

  let label = agentDisplay;
  if (kind === 'recording') {
    // For recording, append elapsed time. Format: "Recording · 00:42"
    const elapsed = task.metadata?.elapsed_seconds || 0;
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    label = `Recording · ${timeStr}`;
  } else {
    // For working/drafting, append action from metadata or task text.
    // e.g. "Elon · filing 40 files", "Gary · pre-screening"
    const action = meta.action || meta.task_type || (task.text ? task.text.slice(0, 30) : null);
    if (action) label = `${agentDisplay} · ${action}`;
  }

  // Detail: project/mission context or status line.
  // e.g. "Corner · Dashboard", "into Projects · 28 done"
  let detail = 'Working';
  if (meta.project || task.project) {
    const proj = meta.project || task.project;
    const projDisplay = titleCase(proj);
    detail = `${projDisplay} · ${meta.context || 'Working'}`;
  } else if (meta.detail) {
    detail = meta.detail;
  }

  return {
    kind,
    label,
    detail,
    // Pass through raw task data so the caller (ActivityDockLive) can use more detail if needed.
    _taskId: task.id,
    _taskStatus: task.status,
    _createdAt: task.created_at,
  };
}

export function useRunningJobs(worldId = 'aom') {
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!worldId) {
      setJob(null);
      return;
    }

    let alive = true;
    let pollTimeout = null;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Query the tasks table for status='running', filtered by client_id=worldId.
        // Limit 1 since we only show a single dock (topmost running job).
        const params = new URLSearchParams();
        params.set('status', 'running');
        params.set('client_id', worldId);
        params.set('limit', '1');

        const res = await authFetch(`/api/dashboard/v2-task-list?${params.toString()}`);
        if (!res || !res.ok) {
          if (alive) {
            setJob(null);
            setIsLoading(false);
          }
          return;
        }

        const data = await res.json();
        const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
        const runningTask = tasks.length > 0 ? tasks[0] : null;

        if (alive) {
          setJob(runningTask ? mapTaskToJob(runningTask) : null);
          setIsLoading(false);
        }
      } catch (err) {
        if (alive) {
          setError(err.message);
          setJob(null);
          setIsLoading(false);
        }
      }
    };

    // Load immediately, then poll every 3s for updates.
    load();
    pollTimeout = setInterval(load, 3000);

    return () => {
      alive = false;
      if (pollTimeout) clearInterval(pollTimeout);
    };
  }, [worldId]);

  return { job, isLoading, error };
}
