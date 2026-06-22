import React from 'react';
import { ActivityDock } from './ActivityDock.jsx';
import { CvgDesktopChrome } from './CvgDesktopChrome.jsx';

/**
 * CV6 kit Command — the goal ledger (mobile). Kit-faithful to
 * ui_kits/tools/command.html (mobile "live goal" frame): a featured live-goal
 * card (room + goal + master-loop checklist + watchers) over a list of the other
 * rooms with their status.
 *
 * UNLIKE chat/tracker, Command is a RESKIN of an existing feature — cv4/
 * CommandTracker.jsx already serves this goal ledger (rooms + current goal +
 * status + set-by + time, via /api/dashboard/room-goals). So props are shaped to
 * that real data and this view is wire-ready:
 *   summary  = { roomCount, liveCount }
 *   featured = {
 *     id, room, color, goal, status,
 *     checklist: [{ label, state, note }],
 *     watchers: [{ name, initials, role, status, onToggle }],
 *     onRetask, onAddWatcher
 *   }
 *   rooms[]  = { id, name, color, sub, status }
 *             status: 'live' | 'blocked' | 'ready'
 *             checklist state: 'done'|'queued'|'working'|'pending'
 *   activities[] = { state: 'recording'|'working'|'success', title, sub }
 *                  (mapped from running jobs; state translates to ActivityDock kind)
 *   onSelectRoom(room), onRetask, onWatcherToggle, onSelectActivity
 */

const STATUS = {
  live: { label: 'LIVE', color: 'var(--success)', background: 'var(--success-weak)', pulse: true },
  blocked: { label: 'BLOCKED', color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))' },
  ready: { label: 'READY', color: 'var(--muted)', background: 'var(--chip)' },
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

function ChecklistRow({ item, onQueueClick }) {
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
      {st === 'queued' && <button onClick={() => onQueueClick && onQueueClick(item)} style={{ fontSize: 10.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, color: 'var(--warn)', background: 'var(--warn-weak, rgba(251,191,36,.16))', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Queued</button>}
      {item.note && st !== 'queued' && <span style={{ fontSize: 11, color: st === 'done' ? 'var(--success)' : 'var(--faint)' }}>{item.note}</span>}
    </div>
  );
}


function WatcherRow({ watcher, onToggle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 11, opacity: watcher.active === false ? 0.72 : 1 }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: watcher.toneBg || 'var(--chip)', color: watcher.tone || 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flex: 'none' }}>
        {watcher.initials || (watcher.icon && watcher.icon)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{watcher.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{watcher.role}</div>
      </div>
      <button
        onClick={() => onToggle && onToggle(watcher)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 11,
          background: watcher.active ? 'var(--accent)' : 'var(--chip)',
          border: watcher.active ? 'none' : '1px solid var(--hair)',
          position: 'relative',
          flex: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: watcher.active ? 'flex-end' : 'flex-start',
          padding: '2px',
        }}
      >
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: watcher.active ? '#fff' : 'var(--faint)' }} />
      </button>
    </div>
  );
}

export function CommandView({ status = 'loaded', summary = {}, featured, rooms = [], activities = [], onSelectRoom, onBack, onRetask, onWatcherToggle, isDesktop = false, activeTool = 'command', onNav, user = {} }) {
  // Nothing to show yet: loading (spinner), error (it retries), or genuinely empty.
  // This is what stops the screen from rendering as a blank dark page.
  const emptyBody = !featured && (!rooms || rooms.length === 0) && (!activities || activities.length === 0);

  // DESKTOP — ported from ui_kits/tools/command.html (desktop frame): shared top bar +
  // goal ledger (with the background-activity rail) + goal-detail panel. Fed by the same
  // real-data props (summary/featured/rooms/activities) the live wrapper provides.
  if (isDesktop) {
    const ledger = [
      ...(featured ? [{ name: featured.room, color: featured.color, goal: featured.goal, setBy: featured.setBy, status: featured.status, featured: true }] : []),
      ...rooms.map((r) => ({ name: r.name, color: r.color, goal: r.sub, setBy: r.setBy, status: r.status })),
    ];
    const liveN = summary.liveCount;
    const blockedN = ledger.filter((r) => r.status === 'blocked').length;
    return (
      <div data-cv6kit style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <style>{'@keyframes cmdPulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        <CvgDesktopChrome activeTool={activeTool} onNav={onNav} user={user} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, minWidth: 0, borderRight: '1px solid var(--divider)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>Goal ledger</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{[summary.roomCount != null ? `${summary.roomCount} rooms` : null, liveN != null ? `${liveN} live` : null].filter(Boolean).join(' · ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {liveN != null && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--success)', background: 'var(--success-weak)', padding: '5px 11px', borderRadius: 14 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: 'cmdPulse 1.8s infinite' }} />{liveN} live</span>}
                {blockedN > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-weak,rgba(251,191,36,.16))', padding: '5px 11px', borderRadius: 14 }}>{blockedN} blocked</span>}
              </div>
            </div>
            {Array.isArray(activities) && activities.length > 0 && (
              <div style={{ padding: '0 24px 6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Background activity</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{activities.length} running</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <ActivityDock variant="rail" jobs={activities.map((a) => ({ kind: a.state === 'recording' ? 'recording' : a.state === 'success' ? 'drafting' : 'working', label: a.title || '', detail: a.sub || '' }))} onSelectJob={() => {}} />
                </div>
              </div>
            )}
            <div style={{ padding: '14px 24px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', height: 34, borderBottom: '1px solid var(--hair)', fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                <div style={{ width: 160, flex: 'none' }}>Room</div><div style={{ flex: 1 }}>Current goal</div><div style={{ width: 110, flex: 'none' }}>Set by</div><div style={{ width: 90, flex: 'none' }}>Status</div>
              </div>
              {ledger.map((r, i) => (
                <div key={i} onClick={() => onSelectRoom && onSelectRoom(r)} style={{ display: 'flex', alignItems: 'center', height: 64, borderBottom: '1px solid var(--divider)', cursor: onSelectRoom ? 'pointer' : 'default', ...(r.featured ? { background: 'var(--accent-weak)', margin: '0 -8px', padding: '0 8px', borderRadius: 8 } : {}) }}>
                  <div style={{ width: 160, flex: 'none', display: 'flex', alignItems: 'center', gap: 9 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color || 'var(--faint)' }} /><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{r.name}</span></div>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 14, fontSize: 13.5, color: r.goal ? 'var(--fg)' : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.goal || 'No goal set'}</div>
                  <div style={{ width: 110, flex: 'none', fontSize: 12.5, color: 'var(--muted)' }}>{r.setBy || ''}</div>
                  <div style={{ width: 90, flex: 'none' }}><StatusChip status={r.status} /></div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: 400, flex: 'none', borderLeft: '1px solid var(--divider)', padding: 22, overflowY: 'auto' }}>
            {featured ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: featured.color || 'var(--violet-400)' }} /><span style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>{featured.room}</span><StatusChip status={featured.status} /></div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Current goal</div>
                <div style={{ fontSize: 17, lineHeight: 1.4, fontWeight: 600, color: 'var(--fg)', marginBottom: 16 }}>{featured.goal}</div>
                {Array.isArray(featured.checklist) && featured.checklist.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 13 }}>Checklist · {featured.checklist.length} steps</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 18 }}>
                      {featured.checklist.map((it, i) => <ChecklistRow key={i} item={it} onQueueClick={featured.onQueueClick} />)}
                    </div>
                  </>
                )}
                {Array.isArray(featured.watchers) && featured.watchers.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}><span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Master-loop watchers</span><span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>{featured.watchers.filter((w) => w.active !== false).length} active</span></div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginBottom: 13 }}>The loop drives these conversations toward the goal and verifies each finished step. Toggle who it watches.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                      {featured.watchers.map((w, i) => <WatcherRow key={i} watcher={w} onToggle={() => onWatcherToggle && onWatcherToggle(w)} />)}
                    </div>
                  </>
                )}
                {onRetask && (
                  <div style={{ display: 'flex', gap: 9 }}>
                    <button style={{ flex: 'none', width: 46, height: 42, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></button>
                    <button onClick={onRetask} style={{ flex: 1, height: 42, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>Re-task</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--faint)', fontSize: 13, textAlign: 'center' }}>Pick a room on the left to see its goal.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
        {emptyBody ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 28px', textAlign: 'center' }}>
            {status === 'loading' ? (
              <>
                <span style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid var(--hair)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite' }} />
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Loading room goals…</div>
              </>
            ) : status === 'error' ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 240, lineHeight: 1.5 }}>Could not load the room goals just now. It keeps trying on its own.</div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--faint)' }}>No room goals yet.</div>
            )}
          </div>
        ) : (
        <>
        {/* activity rail */}
        {Array.isArray(activities) && activities.length > 0 && (
          <div style={{ padding: '14px 0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Background activity</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--faint)' }}>{activities.length} running</span>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch', padding: '0 16px', marginBottom: 4 }}>
              <ActivityDock
                variant="rail"
                jobs={activities.map((a) => ({
                  kind: a.state === 'recording' ? 'recording' : a.state === 'success' ? 'drafting' : 'working',
                  label: a.title || '',
                  detail: a.sub || '',
                }))}
                onSelectJob={() => {}}
              />
            </div>
          </div>
        )}

        <div style={{ padding: '8px 16px 0' }}>
          {featured && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 16, padding: 16, marginBottom: 12 }}>
              {/* Featured goal header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: featured.color || 'var(--violet-400)', flex: 'none' }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featured.room}</span>
                <StatusChip status={featured.status} />
              </div>

              {/* Goal text */}
              <div style={{ fontSize: 15.5, lineHeight: 1.4, fontWeight: 600, color: 'var(--fg)', marginBottom: 14 }}>{featured.goal}</div>

              {/* Checklist */}
              {Array.isArray(featured.checklist) && featured.checklist.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 18 }}>
                  {featured.checklist.map((it, i) => <ChecklistRow key={i} item={it} onQueueClick={featured.onQueueClick} />)}
                </div>
              )}

              {/* Watchers section */}
              {Array.isArray(featured.watchers) && featured.watchers.length > 0 && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Master-loop watchers</span>
                    <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>
                      {featured.watchers.filter((w) => w.active !== false).length} active
                    </span>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--muted)', marginBottom: 13 }}>
                    The loop drives these conversations toward the goal and verifies each finished step. Toggle who it watches.
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
                    {featured.watchers.map((w, i) => (
                      <WatcherRow key={i} watcher={w} onToggle={() => onWatcherToggle && onWatcherToggle(w)} />
                    ))}
                  </div>
                </>
              )}

              {/* Re-task button */}
              {onRetask && (
                <div style={{ display: 'flex', gap: 9 }}>
                  <button style={{ flex: 'none', width: 46, height: 42, borderRadius: 11, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                  <button onClick={onRetask} style={{ flex: 1, height: 42, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    Re-task
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Other rooms */}
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
        </>
        )}
      </div>
    </div>
  );
}
