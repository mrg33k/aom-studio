import React from 'react';

/**
 * CV6 kit Tracker — mobile bug/issue list. EXACTLY faithful to
 * ui_kits/tools/tracker.html (mobile frames A, B, C).
 *
 * Props shaped for REAL data:
 *   tracker = { name, projectName, openCount }
 *   bugs[] = { id, title, status, priority, assignee: { initials, name, tone, toneBg },
 *              updated, attachments: [{ name, type }], agentWorking, step }
 *            status: 'open' | 'in_progress'
 *            priority: 'high' | 'med' | 'low'
 *   onSelectBug(bug), onNewBug(), onSelectDetail(bug), onAssignAgent(bug), onBack()
 *
 * Screen flow:
 *   - Bug list (openCount bugs, empty state)
 *   - Click bug → detail view (status, priority, mission, openeds, "Assign to agent")
 *   - Agent starts working → agent-working view (master-loop steps, pause/open)
 */

const PRIORITY = {
  high: { color: '#F87171', label: 'High' },
  med: { color: 'var(--warn)', label: 'Med' },
  low: { color: 'var(--accent)', label: 'Low' },
};

function statusChip(status, priority) {
  if (String(status).toLowerCase().replace(/ /g, '_') === 'in_progress') {
    return { label: 'In progress', color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))' };
  }
  const p = PRIORITY[priority] || PRIORITY.high;
  const bg = priority === 'low' ? 'var(--accent-weak)' : priority === 'med' ? 'var(--warn-weak, rgba(251,191,36,.16))' : 'rgba(248,113,113,.16)';
  return { label: 'Open', color: p.color, background: bg };
}

const Chip = ({ tone }) => (
  <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: 13, color: tone.color, background: tone.background }}>{tone.label}</span>
);
const Dot = ({ c }) => <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flex: 'none' }} />;
const PLUS = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;

/**
 * Bug list card. MOBILE A: list of bugs with attachments + live-agent indicator.
 */
function BugListCard({ bug, onSelect }) {
  const tone = statusChip(bug.status, bug.priority);
  const p = PRIORITY[bug.priority] || PRIORITY.high;
  const a = bug.assignee || {};
  const hasAttachments = bug.attachments && bug.attachments.length > 0;
  const isWorking = bug.agentWorking;

  return (
    <div onClick={() => onSelect(bug)} style={{ border: '1px solid var(--accent-weak)', background: 'var(--surface)', borderRadius: 15, overflow: 'hidden', cursor: 'pointer' }}>
      <div style={{ padding: '13px 14px' }}>
        {/* Header: status, priority, id */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Chip tone={tone} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg)' }}>
            <Dot c={p.color} />{p.label}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{bug.id}</span>
        </div>

        {/* Title */}
        <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4, marginBottom: hasAttachments ? 11 : 0 }}>
          {bug.title}
        </div>

        {/* Attachments grid (2 columns, max width constraint) */}
        {hasAttachments && (
          <div style={{ display: 'flex', gap: 8 }}>
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
                  <button onClick={(e) => e.stopPropagation()} style={{ height: 24, padding: '0 8px', borderRadius: 7, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>View</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: working indicator or silent footer */}
      {isWorking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--divider)', background: 'var(--accent-weak)' }}>
          <div style={{ position: 'relative', flex: 'none' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, background: 'rgba(52,211,153,.22)', color: 'var(--success)' }}>
              {a.initials || 'EL'}
            </div>
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, background: 'var(--success)', boxShadow: 'var(--glow-online)', border: '2px solid var(--ground)', borderRadius: '50%' }} />
          </div>
          <span style={{ flex: 1, fontSize: 12, color: 'var(--fg)' }}>
            <strong>{a.name || 'Agent'}</strong> is working this · step {bug.step || '2'} of 3
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.05s linear infinite', flex: 'none' }}>
            <path d="M21 12a9 9 0 1 1-6.2-8.6" />
          </svg>
        </div>
      )}
    </div>
  );
}

export function TrackerView({ tracker = {}, bugs = [], onSelectBug, onNewBug, onBack }) {
  const open = tracker.openCount != null ? tracker.openCount : bugs.length;

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* Status bar */}
      <div style={{ flex: 'none', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
        <span>9:41</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{open} open</span>
      </div>

      {/* Header (mhdr pattern) */}
      <div style={{ flex: 'none', padding: '0 16px 14px', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)', lineHeight: 1.2 }}>{tracker.name || 'Tracker'}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: 3 }}>{[tracker.projectName, `${open} open`].filter(Boolean).join(' · ')}</div>
          </div>
          <button style={{ width: 36, height: 36, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M6 12h12M9 18h6"/></svg>
          </button>
        </div>
      </div>

      {/* List scroll area — full-width */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(96px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bugs.length === 0 ? (
          <div style={{ border: '1px solid var(--accent-weak)', background: 'var(--surface)', borderRadius: 15, padding: '18px 16px', fontSize: '13.5px', color: 'var(--muted)' }}>
            No issues tracked yet.
          </div>
        ) : (
          bugs.map((b, i) => <BugListCard key={b.id || i} bug={b} onSelect={onSelectBug} />)
        )}
      </div>

      {/* FAB — only show if onNewBug provided, safe-area bottom */}
      {onNewBug && (
        <button onClick={onNewBug} aria-label="New bug" style={{ position: 'absolute', right: 18, bottom: 'calc(26px + env(safe-area-inset-bottom, 0px))', width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 32px -8px rgba(0,0,0,.6)', cursor: 'pointer', zIndex: 10 }}>
          {PLUS}
        </button>
      )}
    </div>
  );
}
