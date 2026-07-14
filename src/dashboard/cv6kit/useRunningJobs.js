import { useState, useEffect } from 'react';
import { authFetch } from '../lib/authFetch.js';

/**
 * useRunningJobs — fetches REAL currently-running jobs from active process heartbeats.
 * Returns { job, jobs, isLoading, error }: `jobs` is every running job (ActivityDock-shaped),
 * for the Command activity rail which shows them all; `job` is jobs[0] (or null) for the single
 * float dock. Polls every 3s so the dock always shows fresh status.
 *
 * Job shape: { kind, label, detail }
 *   kind: 'recording' | 'working' | 'secondary' | 'drafting'
 *   label: main text (e.g. "Recording · 08:42" or "Elon · filing 40 files")
 *   detail: sub-text (e.g. "Corner · Dashboard")
 *
 * Real source: /api/dashboard/active-agents, backed by active_processes heartbeat TTL.
 */

function titleCase(s) {
  return String(s || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function mapActiveProcessToJob(process) {
  if (!process) return null;
  const agentDisplay = titleCase(process.agent || 'Agent');
  const taskText = String(process.task_text || '').replace(/\s+/g, ' ').trim();
  const action = taskText ? taskText.slice(0, 48) : 'Active session';
  const age = Number.isFinite(Number(process.age_seconds)) ? Number(process.age_seconds) : null;
  return {
    kind: 'working',
    label: `${agentDisplay} · ${action}`,
    detail: age == null ? 'Live process heartbeat' : `Live process heartbeat · ${age}s ago`,
    _taskId: process.task_id || null,
    _taskStatus: 'active',
    _createdAt: process.spawned_at || process.heartbeat || null,
    _source: process.source || 'active_processes',
  };
}

export function useRunningJobs(worldId = 'aom') {
  const [job, setJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!worldId) {
      setJob(null);
      setJobs([]);
      return;
    }

    let alive = true;
    let pollTimeout = null;

    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set('client', worldId);

        const res = await authFetch(`/api/dashboard/active-agents?${params.toString()}`);
        if (!res || !res.ok) {
          if (alive) {
            setJob(null);
            setIsLoading(false);
          }
          return;
        }

        const data = await res.json();
        const active = Array.isArray(data?.active) ? data.active.slice(0, 8) : [];
        const mapped = active.map(mapActiveProcessToJob).filter(Boolean);

        if (alive) {
          setJobs(mapped);
          setJob(mapped.length > 0 ? mapped[0] : null);
          setIsLoading(false);
        }
      } catch (err) {
        if (alive) {
          setError(err.message);
          setJob(null);
          setJobs([]);
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

  return { job, jobs, isLoading, error };
}
