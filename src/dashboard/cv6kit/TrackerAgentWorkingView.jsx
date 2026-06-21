import React from 'react';

/**
 * CV6 kit Tracker Agent Working — live agent work view (MOBILE C from tracker.html).
 * Shows: agent header with status, progress bar, master-loop steps (verified before done),
 * diff peek, and Pause/Open in Command buttons.
 *
 * Props:
 *   bug = { id, title, agentWorking, assignee, steps: [{ done, working, queued, title, sub, diff }] }
 *   onBack(), onPause(), onOpenInCommand()
 */

export function TrackerAgentWorkingView({ bug = {}, onBack, onPause, onOpenInCommand }) {
  if (!bug.id || !bug.agentWorking) return null;

  const a = bug.assignee || {};
  const steps = bug.steps || [];
  const workingStep = steps.find((s) => s.working);
  const completedCount = steps.filter((s) => s.done).length;
  const progressPct = Math.round((completedCount / steps.length) * 100) || 0;

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* Live agent header */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 11, padding: '12px 16px', borderBottom: '1px solid var(--divider)', background: 'var(--accent-weak)' }}>
        <div style={{ position: 'relative', flex: 'none' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, background: 'rgba(52,211,153,.22)', color: 'var(--success)' }}>
            {a.initials || 'EL'}
          </div>
          <span style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, background: 'var(--success)', boxShadow: 'var(--glow-online)', border: '2px solid var(--ground)', borderRadius: '50%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>
            {a.name || 'Agent'} is on it
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--accent)', fontWeight: 500 }}>
            Working {bug.id} · step {completedCount + 1} of {steps.length}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.05s linear infinite', flex: 'none' }}>
          <path d="M21 12a9 9 0 1 1-6.2-8.6" />
        </svg>
      </div>

      {/* Content scroll area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px 0' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)' }} />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)' }}>{progressPct}%</span>
        </div>

        {/* Master loop label */}
        <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 11 }}>
          Master loop · verifies each step
        </div>

        {/* Steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 18 }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Step indicator */}
              {step.done ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--success)" stroke="none" style={{ flex: 'none', marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m8 12 3 3 5-6" stroke="#0A0A0B" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : step.working ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.05s linear infinite', flex: 'none', marginTop: 1 }}>
                  <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                </svg>
              ) : (
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--divider)', flex: 'none', marginTop: 1 }} />
              )}

              {/* Step content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13.5px', color: step.done ? 'var(--muted)' : 'var(--fg)', textDecoration: step.done ? 'line-through' : 'none', fontWeight: step.working ? 600 : 400 }}>
                  {step.title}
                </div>
                {step.working && (
                  <>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, lineHeight: 1.45 }}>
                      {step.sub}
                    </div>
                    {step.diff && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--faint)', background: 'var(--surface-2)', borderRadius: 7, padding: '7px 9px', marginTop: 7 }}>
                        {step.diff}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom action bar — safe-area bottom */}
      <div style={{ flex: 'none', position: 'absolute', left: 0, right: 0, bottom: 0, height: '78px', borderTop: '1px solid var(--divider)', background: 'var(--ground)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', paddingTop: 16 }}>
        <button onClick={onPause} style={{ flex: 1, height: 48, borderRadius: 13, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: '13.5px', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
          Pause
        </button>
        <button onClick={onOpenInCommand} style={{ flex: 1, height: 48, borderRadius: 13, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13.5px', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4H4v16h3M17 4h3v16h-3"/></svg>
          Open in Command
        </button>
      </div>
    </div>
  );
}
