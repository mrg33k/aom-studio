import React from 'react';

/**
 * CV6 kit Tracker — the per-project bug/ticket list (mobile). Kit-faithful to
 * ui_kits/tools/tracker.html (mobile "bug list" frame): title + open count, a
 * card per bug (status + priority + id, title, assignee + updated), and a "+"
 * FAB to file a new bug.
 *
 * Props shaped for REAL data (today there is NO bugs/tickets table — see BUILD.md
 * R-KIT-6; verified in isolation, live wiring waits on that data source):
 *   tracker = { name, projectName, openCount }
 *   bugs[]  = { id, title, status, priority, assignee: { initials, name, tone }, updated }
 *             status: 'open' | 'in_progress'   priority: 'high' | 'med' | 'low'
 *   onSelectBug(bug), onNewBug()
 */

const PRIORITY = {
  high: { color: '#F87171', label: 'High' },
  med: { color: 'var(--warn)', label: 'Med' },
  low: { color: 'var(--accent)', label: 'Low' },
};

function statusChip(status, priority) {
  if (String(status).toLowerCase().replace(' ', '_') === 'in_progress') {
    return { label: 'In progress', color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))' };
  }
  const p = PRIORITY[priority] || PRIORITY.high;
  const bg = priority === 'low' ? 'var(--accent-weak)' : priority === 'med' ? 'var(--warn-weak, rgba(251,191,36,.16))' : 'rgba(248,113,113,.16)';
  return { label: 'Open', color: p.color, background: bg };
}

const Chip = ({ tone }) => (
  <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 13, color: tone.color, background: tone.background }}>{tone.label}</span>
);
const Dot = ({ c }) => <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flex: 'none' }} />;
const PLUS = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;

export function TrackerView({ tracker = {}, bugs = [], onSelectBug, onNewBug, onBack }) {
  const open = tracker.openCount != null ? tracker.openCount : bugs.length;
  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* heading — safe-area top */}
      <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          {onBack && (
            <button onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, marginLeft: -8, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--success)' }} />
          <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>{tracker.name || 'Tracker'}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{[tracker.projectName, `${open} open`].filter(Boolean).join(' · ')}</div>
      </div>

      {/* list */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 16px calc(96px + env(safe-area-inset-bottom, 0px))' }}>
        {bugs.length === 0 ? (
          <div className="glassy" style={{ padding: '18px 16px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, fontSize: 13.5, color: 'var(--muted)' }}>No open bugs. File one with the plus button.</div>
        ) : (
          <div className="glassy" style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, overflow: 'hidden' }}>
            {bugs.map((b, i) => {
              const tone = statusChip(b.status, b.priority);
              const p = PRIORITY[b.priority] || PRIORITY.high;
              const a = b.assignee || {};
              return (
                <div key={b.id || i} onClick={() => onSelectBug && onSelectBug(b)} style={{ padding: '14px 15px', borderBottom: i < bugs.length - 1 ? '1px solid var(--divider)' : 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Chip tone={tone} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg)' }}><Dot c={p.color} />{p.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{b.id}</span>
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4 }}>{b.title}</div>
                  {(a.name || b.updated) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                      {a.initials && <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, color: a.tone || 'var(--success)', background: a.toneBg || 'rgba(52,211,153,.2)' }}>{a.initials}</span>}
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{[a.name, b.updated].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB — safe-area bottom */}
      <button onClick={onNewBug} aria-label="New bug" style={{ position: 'absolute', right: 18, bottom: 'calc(26px + env(safe-area-inset-bottom, 0px))', width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -8px rgba(0,0,0,.6)', cursor: 'pointer' }}>{PLUS}</button>
    </div>
  );
}
