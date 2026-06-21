import React from 'react';

/**
 * CV6 kit Tracker Detail — bug detail screen (MOBILE B from tracker.html).
 * Shows status, priority, mission, opened time, attachments, and "Assign to agent" button.
 *
 * Props:
 *   bug = { id, title, status, priority, mission, opened, assignee, attachments, description }
 *   onBack(), onAssignAgent(bug)
 */

const PRIORITY = {
  high: { color: '#F87171', label: 'High' },
  med: { color: 'var(--warn)', label: 'Med' },
  low: { color: 'var(--accent)', label: 'Low' },
};

const Dot = ({ c }) => <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flex: 'none' }} />;

export function TrackerDetailView({ bug = {}, onBack, onAssignAgent }) {
  if (!bug.id) return null;

  const p = PRIORITY[bug.priority] || PRIORITY.high;
  const a = bug.assignee || {};
  const status = bug.status === 'in_progress' ? 'In progress' : 'Open';
  const statusColor = bug.status === 'in_progress' ? 'var(--warn)' : '#F87171';
  const statusBg = bug.status === 'in_progress' ? 'var(--warn-weak, rgba(251,191,36,.16))' : 'rgba(248,113,113,.16)';

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* Status bar */}
      <div style={{ flex: 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{bug.id}</span>
      </div>

      {/* Header with back button */}
      <div style={{ flex: 'none', padding: '0 16px 14px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ width: 36, height: 36, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)', lineHeight: 1.2 }}>{bug.id}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: 3 }}>{bug.trackerName || 'Tracker'} · {bug.projectName || 'Corner'}</div>
          </div>
        </div>
      </div>

      {/* Content scroll area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(20px + env(safe-area-inset-bottom, 0px))' }}>
        {/* Status and priority chips */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 11 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '11.5px', fontWeight: 600, color: statusColor, background: statusBg, padding: '4px 10px', borderRadius: 7 }}>
            <Dot c={statusColor} />{status}
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: p.color, background: p.color === 'var(--accent)' ? 'var(--accent-weak)' : p.color === '#F87171' ? 'rgba(248,113,113,.16)' : 'var(--warn-weak, rgba(251,191,36,.16))', padding: '4px 10px', borderRadius: 7 }}>
            {p.label} priority
          </span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '19px', lineHeight: 1.3, fontWeight: 700, color: 'var(--fg)', margin: '0 0 14px' }}>
          {bug.title}
        </h2>

        {/* Assign to agent card */}
        {!bug.agentWorking && (
          <div style={{ border: '1px solid var(--accent-weak)', background: 'linear-gradient(180deg,var(--accent-weak),transparent)', borderRadius: 15, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, background: 'rgba(52,211,153,.22)', color: 'var(--success)' }}>
                {a.initials || 'EL'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Assign to agent</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.4 }}>Works the checklist autonomously, asks when it needs you</div>
              </div>
            </div>
            <button onClick={() => onAssignAgent(bug)} style={{ width: '100%', height: 44, marginTop: 12, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '13.5px', fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5v9"/><path d="M6.8 6.8a8 8 0 1 0 10.4 0"/></svg>
              Assign {a.name || 'Agent'}
            </button>
          </div>
        )}

        {/* Metadata card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 13px', height: 44, borderBottom: '1px solid var(--divider)' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Mission</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{bug.mission || 'Not assigned'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 13px', height: 44 }}>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>Opened</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg)' }}>{bug.opened || 'Unknown'}</span>
          </div>
        </div>

        {/* Attachments */}
        {bug.attachments && bug.attachments.length > 0 && (
          <>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
              Attachments · {bug.attachments.length}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {bug.attachments.map((att, j) => (
                <div key={j} style={{ flex: 1, border: '1px solid var(--hair)', borderRadius: 10, overflow: 'hidden', background: 'var(--surface)' }}>
                  <div style={{ height: 54, background: 'linear-gradient(135deg,#2a2030,#15161a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {att.type === 'image' ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.6"/><path d="m21 15-5-5L5 21"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 8px' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</span>
                    <button style={{ height: 24, padding: '0 8px', borderRadius: 7, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>View</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
