import React from 'react';

/**
 * CV6 kit Command — the goal ledger (mobile). Kit-faithful to
 * ui_kits/tools/command.html (mobile "live goal" frame): a featured live-goal
 * card (room + goal + master-loop checklist) over a list of the other rooms with
 * their status.
 *
 * UNLIKE chat/tracker, Command is a RESKIN of an existing feature — cv4/
 * CommandTracker.jsx already serves this goal ledger (rooms + current goal +
 * status + set-by + time, via /api/dashboard/room-goals). So props are shaped to
 * that real data and this view is wire-ready:
 *   summary  = { roomCount, liveCount }
 *   featured = { room, color, goal, status, checklist: [{ label, state, note }] }
 *   rooms[]  = { id, name, color, sub, status }
 *             status: 'live' | 'blocked' | 'idle'   checklist state: 'done'|'queued'|'working'|'pending'
 *   onSelectRoom(room)
 */

const STATUS = {
  live: { label: 'LIVE', color: 'var(--success)', background: 'var(--success-weak)', pulse: true },
  blocked: { label: 'BLOCKED', color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))' },
  idle: { label: 'IDLE', color: 'var(--muted)', background: 'var(--chip)' },
};

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.idle;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, color: s.color, background: s.background }}>
      {s.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, animation: 'cmdPulse 1.8s infinite' }} />}
      {s.label}
    </span>
  );
}

function ChecklistRow({ item }) {
  const st = item.state || 'pending';
  let mark;
  if (st === 'done') {
    mark = <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--success)" stroke="none" style={{ flex: 'none' }}><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" stroke="#0A0A0B" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  } else if (st === 'working') {
    mark = <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: 'cmdPulse 1.6s infinite' }} /></span>;
  } else if (st === 'queued') {
    mark = <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--warn)', flex: 'none' }} />;
  } else {
    mark = <span style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--divider)', flex: 'none' }} />;
  }
  const muted = st === 'done' || st === 'pending';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {mark}
      <span style={{ flex: 1, fontSize: 13.5, color: muted ? 'var(--muted)' : 'var(--fg)', fontWeight: muted ? 400 : 500, textDecoration: st === 'done' ? 'line-through' : 'none' }}>{item.label}</span>
      {st === 'queued' && <span style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))' }}>Queued</span>}
      {item.note && st !== 'queued' && <span style={{ fontSize: 11, color: st === 'done' ? 'var(--success)' : 'var(--faint)' }}>{item.note}</span>}
    </div>
  );
}

function ActivityDock({ activity }) {
  const st = activity.state || 'working';
  let icoStyle = {};
  let icoContent = null;

  if (st === 'recording') {
    icoStyle = { background: 'rgba(248,113,113,.16)' };
    icoContent = <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F87171', animation: 'cmdPulse 1.4s infinite', flex: 'none' }} />;
  } else if (st === 'working') {
    icoStyle = { background: 'var(--accent-weak)' };
    icoContent = (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.05s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.2-8.6" />
      </svg>
    );
  } else if (st === 'success') {
    icoStyle = { background: 'rgba(52,211,153,.18)' };
    icoContent = (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 56, padding: '0 10px 0 13px', borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--hair)', boxShadow: 'var(--shadow-card)', flex: 'none', minWidth: 248 }}>
      <span style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', ...icoStyle }}>
        {icoContent}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.title}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activity.sub}</div>
      </div>
      {activity.badge && (
        <span style={{ fontSize: 10, fontWeight: 700, color: activity.badgeColor || 'var(--fg)', background: activity.badgeBg || 'var(--chip)', padding: '3px 7px', borderRadius: 7, flex: 'none', whiteSpace: 'nowrap' }}>
          {activity.badge}
        </span>
      )}
    </div>
  );
}

export function CommandView({ summary = {}, featured, rooms = [], activities = [], onSelectRoom, onBack }) {
  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      <style>{'@keyframes cmdPulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      {/* heading — safe-area top */}
      <div style={{ flex: 'none', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onBack && (
            <button onClick={onBack} aria-label="Back" style={{ width: 34, height: 34, marginLeft: -8, flex: 'none', borderRadius: 10, border: 'none', background: 'transparent', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--fg)' }}>Command</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{[summary.roomCount != null ? `${summary.roomCount} rooms` : null, summary.liveCount != null ? `${summary.liveCount} live` : null].filter(Boolean).join(' · ')}</div>
      </div>

      {/* body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '0 0 calc(24px + env(safe-area-inset-bottom, 0px))' }}>
        {/* activity rail */}
        {Array.isArray(activities) && activities.length > 0 && (
          <div style={{ padding: '14px 0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Background activity</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>{activities.length} running</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', padding: '0 16px', marginBottom: 4 }}>
              {activities.map((a, i) => <ActivityDock key={i} activity={a} />)}
            </div>
          </div>
        )}

        <div style={{ padding: '8px 16px 0' }}>
          {featured && (
            <div className="glassy" onClick={() => onSelectRoom && onSelectRoom(featured)} style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, padding: 16, marginBottom: 12, cursor: onSelectRoom ? 'pointer' : 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: featured.color || 'var(--violet-400)', flex: 'none' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featured.room}</span>
                <StatusChip status={featured.status} />
              </div>
              <div style={{ fontSize: 15.5, lineHeight: 1.4, fontWeight: 600, color: 'var(--fg)', marginBottom: Array.isArray(featured.checklist) && featured.checklist.length ? 14 : 0 }}>{featured.goal}</div>
              {Array.isArray(featured.checklist) && featured.checklist.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {featured.checklist.map((it, i) => <ChecklistRow key={i} item={it} />)}
                </div>
              )}
            </div>
          )}

          {rooms.map((r, i) => (
            <div key={r.id || i} className="glassy" onClick={() => onSelectRoom && onSelectRoom(r)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, marginBottom: 10, cursor: onSelectRoom ? 'pointer' : 'default' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color || 'var(--faint)', flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                {r.sub && <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</div>}
              </div>
              <StatusChip status={r.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
