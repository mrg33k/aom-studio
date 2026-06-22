import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrackerView, NewIssueView } from './TrackerView';
import { TrackerDetailView } from './TrackerDetailView';

/**
 * TrackerLive — wires the CV6-design Tracker to the REAL CV6 bug list
 * (GET /api/dashboard/cv6-bugs reads cv6-bug-tracker.json). Read flow:
 *   list (TrackerView) -> tap a bug -> detail (TrackerDetailView) -> back.
 * "Assign to agent" hands the bug to your assistant via onDiscuss (the same safe
 * path Support uses) — nothing is auto-dispatched. New-bug is held (no FAB) until
 * the add flow is wired. The Space Rising tracker (a second source) is a separate
 * cross-system bridge, not wired here yet.
 */

// cv6-bug-tracker bug: { id, page, title, expected, severity, status, owner }
function classify(s) {
  const v = String(s || '').toLowerCase().replace(/[\s-]/g, '_');
  if (/(fixed|done|closed|resolved|complete|verified|shipped|wont_fix|wontfix)/.test(v)) return 'closed';
  if (/(progress|wip|in_review|review|doing|started|building)/.test(v)) return 'in_progress';
  return 'open';
}
function priorityOf(sev) {
  const v = String(sev || '').toLowerCase();
  if (v.startsWith('h') || v === 'critical' || v === 'crit' || v === 'p0' || v === 'p1') return 'high';
  if (v.startsWith('l') || v === 'minor' || v === 'p3' || v === 'p4') return 'low';
  return 'med';
}
function initialsOf(name) {
  if (!name) return null;
  return String(name).trim().split(/\s+/).map((w) => w[0] || '').slice(0, 2).join('').toUpperCase() || null;
}
function assigneeOf(owner) {
  const initials = initialsOf(owner);
  if (!initials) return null;
  return { initials, name: owner, tone: 'var(--accent)', toneBg: 'var(--accent-weak)' };
}

export function TrackerLive({ worldId = 'aom', onBack, onDiscuss, isDesktop = false, activeTool = 'tracker', onNav, onMenu, user = {} }) {
  const [raw, setRaw] = useState(null); // null = loading
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/cv6-bugs');
      if (!r.ok) { setRaw((p) => p || []); return; }
      const d = await r.json();
      setRaw(d && Array.isArray(d.bugs) ? d.bugs : []);
    } catch {
      setRaw((p) => p || []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Create a new issue, then refresh the list and return to it. cv6-bugs POST add
  // takes { action:'add', page, title, expected, severity, world }. We map the
  // design form: title -> title, description -> expected, priority -> severity, and
  // use the title as the page label (the form has no separate page field).
  const createIssue = useCallback(async ({ title, priority, description }) => {
    if (!title || !title.trim()) return;
    try {
      await fetch('/api/dashboard/cv6-bugs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          page: title.trim(),
          title: title.trim(),
          expected: (description || '').trim(),
          severity: priority || 'med',
          world: worldId,
        }),
      });
    } catch { /* non-fatal: the refresh below reflects reality either way */ }
    setShowNew(false);
    await load();
  }, [load, worldId]);

  // Open work only (open + in_progress); closed/fixed bugs drop off the list.
  const bugs = useMemo(() => (raw || [])
    .map((b) => ({
      id: b.id || b.page || '',
      title: b.title || b.page || 'Untitled',
      status: classify(b.status),
      priority: priorityOf(b.severity),
      assignee: assigneeOf(b.owner),
      updated: '',
      _src: b,
    }))
    .filter((b) => b.status !== 'closed'), [raw]);

  const tracker = { name: 'CV6 Bugs', projectName: 'Corner CV6', openCount: bugs.length };

  const selected = selectedId ? bugs.find((b) => b.id === selectedId) : null;
  const detailBug = selected ? {
    id: selected.id,
    title: selected.title,
    status: selected.status,
    priority: selected.priority,
    assignee: selected.assignee,
    trackerName: 'CV6 Bugs',
    projectName: 'Corner CV6',
    mission: selected._src.page || 'Corner CV6',
    opened: selected._src.opened || '',
    description: selected._src.expected || selected._src.description || '',
    attachments: [],
  } : null;

  if (showNew) {
    return (
      <NewIssueView
        onSubmit={createIssue}
        onBack={() => setShowNew(false)}
      />
    );
  }

  if (detailBug) {
    return (
      <TrackerDetailView
        bug={detailBug}
        onBack={() => setSelectedId(null)}
        onAssignAgent={(b) => {
          if (!onDiscuss) return;
          onDiscuss(`Take this CV6 bug and work it: ${b.id} "${b.title}". What it should do: ${b.description || 'see the tracker'}. Make a plan, fix it, and check it with me before you mark it green.`);
        }}
      />
    );
  }

  return (
    <TrackerView
      tracker={tracker}
      bugs={raw === null ? [] : bugs}
      onSelectBug={(b) => b && b.id && setSelectedId(b.id)}
      onNewBug={() => setShowNew(true)}
      onBack={onBack}
      isDesktop={isDesktop}
      activeTool={activeTool}
      onNav={onNav}
      onMenu={onMenu}
      user={user}
    />
  );
}

export default TrackerLive;
