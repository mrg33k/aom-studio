// cv6next — real data for Command (activity dock) + Tracker (bug list).
// Command's activity dock = real running jobs (useRunningJobs). Its goal ledger needs the
// structured goal source we don't have yet, so goals bind honestly empty (no fake).
// Tracker = the real CV6 bug tracker (/api/dashboard/cv6-bugs). No fake data.

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { authFetch } from '../../lib/authFetch';
import { getClientId, setClientIdFromUser } from '../../lib/clientConfig';
import { useRunningJobs } from '../../cv6kit/useRunningJobs.js';

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '·';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}
const TINTS = ['violet', 'pink', 'teal', 'lime', 'amber', 'accent'];
function tintFor(seed) { let h = 0; for (const c of String(seed || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TINTS[h % TINTS.length]; }

// Resolve the viewer's world the same way Home does (auth -> world cache -> getClientId).
export function useWorldId() {
  const [worldId, setWorldId] = useState(null);
  useEffect(() => {
    if (!supabase) return undefined;
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive || !data?.user) return;
      setClientIdFromUser(data.user); setWorldId(getClientId());
    }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return worldId;
}

// ── Command: real activity dock from running jobs; ledger/goal honest ──
const JOB_KIND = { recording: 'rec', working: 'agent', drafting: 'agent', secondary: 'build', review: 'review' };
export function useCommand(worldId) {
  const { jobs } = useRunningJobs(worldId || 'aom');
  const dockJobs = (jobs || []).map((j, i) => {
    const kind = JOB_KIND[String(j.kind || '').toLowerCase()] || 'agent';
    return { id: j.id || `job-${i}`, kind, title: j.label || 'Working', shortTitle: j.label || 'Working', sub: j.detail || '', badge: kind.toUpperCase() };
  });
  const data = {
    ledger: { roomCount: '', liveCount: dockJobs.length, blockedCount: 0, rooms: [], others: [] },
    activity: { count: dockJobs.length, jobs: dockJobs },
    // goal/checklist have no honest source yet (structured goal output) -> empty, not faked.
    goal: { id: '', roomName: dockJobs[0]?.title || 'No active goal', tint: 'violet', status: 'ready', statusLabel: '', title: dockJobs.length ? 'Agents are working' : 'Nothing running right now', driverLine: dockJobs[0]?.sub || '', stepCount: '', queueNote: '', checklist: [] },
    watchers: { activeCount: 0, list: [] },
  };
  const state = 'ready';
  return { state, data };
}

// ── Tracker: the real CV6 bug tracker ──
const BUG_STATUS = { open: 'open', 'in progress': 'progress', 'in-progress': 'progress', progress: 'progress', done: 'done', closed: 'done', resolved: 'done' };
function bugStatus(s) { return BUG_STATUS[String(s || '').toLowerCase()] || 'open'; }
function severityToPriority(sev) {
  const v = String(sev || '').toLowerCase();
  if (v === 'high' || v === 'critical' || v === '1' || v === '2') return 'high';
  if (v === 'low' || v === '4' || v === '5') return 'low';
  return 'med';
}
export function useTrackerBugs(worldId) {
  const [bugs, setBugs] = useState([]);
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    if (!worldId) return undefined;
    let alive = true;
    setStatus('loading');
    authFetch('/api/dashboard/cv6-bugs').then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!alive) return;
      const raw = Array.isArray(d?.bugs) ? d.bugs : [];
      setBugs(raw.map((b) => {
        const st = bugStatus(b.status);
        const pr = severityToPriority(b.severity);
        const owner = b.owner || '';
        return {
          id: b.id || '', title: b.title || b.page || 'Untitled',
          status: st, statusLabel: b.status || 'Open',
          priority: pr, priorityLabel: pr[0].toUpperCase() + pr.slice(1),
          assignee: owner, assigneeInitials: owner ? initials(owner) : '·',
          assigneeTint: tintFor(owner || b.id), updated: b.updated || '',
          mission: b.page || '', opened: '', description: b.expected || '',
          doneCount: '', stepCount: '', checklist: [],
        };
      }));
      setStatus(raw.length ? 'ready' : 'empty');
    }).catch(() => { if (alive) setStatus('error'); });
  }, [worldId]);

  const open = bugs.filter((b) => b.status !== 'done');
  const data = {
    projectTrackers: [], missionTrackers: [],
    activeTracker: { id: 'cv6', name: 'CV6 Bugs', scope: 'corner', openCount: open.length },
    bugs,
    featuredBug: bugs[0] ? { ...bugs[0], agentStep: '', agentTotal: '', attachments: [] } : { id: '', title: '', attachments: [] },
    attachments: { count: 0, list: [] },
    agent: { name: '', initials: '·', tint: 'violet', step: '', total: '', pct: 0, pctLabel: '', checklist: [] },
    loading: { label: 'Loading the tracker…' },
    empty: { title: 'No bugs in the tracker', body: 'Nothing logged yet. New issues land here.', actionLabel: '' },
    error: { title: "Couldn't load the tracker", body: 'Your connection dropped. Nothing was lost.', code: 'tracker · retry' },
  };
  return { state: status, data };
}
