// ActivityDock — P7 float dock (background activity tracking)
// Mounts in the CornerCV6 shell and follows across all screens.
// Real data from /api/dashboard/active-agents; sample fallback when idle.
// Held-C controls: Pause / Back / Finish buttons disabled until backend wires them.

import { useState, useEffect, useRef } from 'react';
import { useCommandContext } from './providers/DataContext.jsx';
import { titleForAgent } from './data/agentTitles.js';

// Per-job tint mapping (kind -> CSS class for ad-ico background + text color).
// R-CMD-BUCKETS (2026-07-18): job.kind is now the work bucket; the float dock
// only ever shows live in-progress work, but map every bucket for safety.
const KIND_TINTS = {
  inprogress: 'is-inprogress',
  proposed: 'is-proposed',
  done: 'is-done',
  blocked: 'is-blocked',
  failed: 'is-failed',
  agent: 'is-agent', // legacy demo kind
};

// Demo job (shown when no real agents running) — clearly labelled SAMPLE.
const DEMO_JOB = {
  id: 'demo-1',
  kind: 'agent',
  title: 'Elon · writing docs',
  shortTitle: 'Elon',
  sub: 'documentation update · 12 KB done',
  badge: 'SAMPLE',
  isDemonstration: true,
};

function ActivityDock({ worldId, onOpenJob }) {
  // qa-sweep 2026-07-17: consume the CommandProvider result instead of calling
  // useCommand directly — a direct call here was the 4th live data pipe on one
  // page load (its own useDataPipe + a full duplicate goal-ledger polling set).
  const { command } = useCommandContext();
  const commandData = command?.data;
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [hoveredJobId, setHoveredJobId] = useState(null);
  const dockRef = useRef(null);

  // Real jobs from active agents, or fallback to demo. The activity feed now
  // carries the full bucketed work list (proposed/done/failed included —
  // R-CMD-BUCKETS); the FLOAT dock pins only heartbeat-live work, never a
  // finished or queued card, so filter to job.live here.
  const liveJobs = (commandData?.activity?.jobs || []).filter((j) => j.live);
  const jobs = liveJobs.length > 0 ? liveJobs : [DEMO_JOB];

  // Pick the first job to show in the float dock (only one visible at a time).
  const currentJob = jobs[0] || DEMO_JOB;
  const tintClass = KIND_TINTS[currentJob.kind] || 'is-agent';
  const isDemonstration = currentJob.isDemonstration === true;

  // Close expand on outside click.
  useEffect(() => {
    if (!expandedJobId) return undefined;
    const handleClick = (e) => {
      if (dockRef.current && !dockRef.current.contains(e.target)) {
        setExpandedJobId(null);
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [expandedJobId]);

  const handleJobTap = () => {
    // Tap the dock body returns to that job's home screen (held-c: route not yet wired).
    onOpenJob?.(currentJob.id);
  };

  const handleChevron = (e) => {
    e.stopPropagation();
    setExpandedJobId(expandedJobId ? null : currentJob.id);
  };

  // When no real agent job is running, the only "job" is the labelled SAMPLE demo. Showing a
  // fake job bar pinned to the top of every screen (which also overlaps the top content row)
  // is worse than showing nothing, so hide the dock entirely while idle. It reappears the
  // moment a real job lands (jobs has entries -> isDemonstration is false). (QA #7, Patrik OK.)
  if (isDemonstration) return null;

  return (
    <div
      ref={dockRef}
      className="actdock is-float"
      style={{
        top: '74px', // under desktop nav (48px) + padding
        marginLeft: '12px',
        marginRight: '12px',
        width: 'calc(100% - 24px)',
        cursor: 'pointer',
      }}
      onClick={handleJobTap}
    >
      {/* Job icon with tint */}
      <span className={`ad-ico ${tintClass}`} style={{ flex: 'none' }}>
        {isDemonstration ? (
          // Demo icon: static pulse (not spinning)
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ opacity: 0.8 }}
          >
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
          </svg>
        ) : (
          // Real agent: spinning icon
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{ animation: 'spin 1.05s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </svg>
        )}
      </span>

      {/* Job title + subtitle */}
      <div className="ad-body" style={{ flex: 1, minWidth: 0 }}>
        <div className="ad-title">{currentJob.title}</div>
        <div className="ad-sub">{currentJob.sub}</div>
      </div>

      {/* Badge: LIVE (real agent) or SAMPLE (demo) */}
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          color: isDemonstration ? 'var(--muted)' : 'var(--accent)',
          background: isDemonstration ? 'var(--chip)' : 'var(--accent-weak)',
          padding: '3px 8px',
          borderRadius: '8px',
          flex: 'none',
        }}
      >
        {currentJob.badge || 'LIVE'}
      </span>

      {/* Chevron to expand controls (held-c) */}
      <button
        onClick={handleChevron}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--muted)',
          padding: '0 8px',
          cursor: 'pointer',
          flex: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Toggle job controls"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: expandedJobId ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expand sheet: quick controls (Pause / Back / Finish) — all held-c */}
      {expandedJobId === currentJob.id && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: '8px',
            background: 'var(--surface)',
            border: '1px solid var(--hair)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 12px 30px -10px rgba(0,0,0,.6)',
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Quick peek: agent + task */}
          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
            <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>
              {currentJob.shortTitle || currentJob.title}
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.4 }}>{currentJob.sub}</div>
          </div>

          {/* Held-C control buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--hair)',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
              title="Pause: live job controls turn on when the running-job feed is wired"
            >
              Pause
            </button>
            <button
              disabled
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--hair)',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
              title="Back: live job controls turn on when the running-job feed is wired"
            >
              Back
            </button>
            <button
              disabled
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--hair)',
                background: 'var(--surface-2)',
                color: 'var(--muted)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'not-allowed',
                opacity: 0.6,
              }}
              title="Finish: live job controls turn on when the running-job feed is wired"
            >
              Finish
            </button>
          </div>

          {/* Label explaining held-c status */}
          {isDemonstration && (
            <div
              style={{
                fontSize: '10px',
                color: 'var(--faint)',
                fontStyle: 'italic',
                paddingTop: '8px',
                borderTop: '1px solid var(--hair)',
              }}
            >
              Sample job (demo mode) — live job controls turn on when an agent is actually running
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActivityDock;
