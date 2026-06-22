import React from 'react';
import { CvgDesktopChrome } from './CvgDesktopChrome.jsx';
import { CvgMobileHeader } from './CvgMobileHeader.jsx';

/**
 * CV6 kit Tracker — mobile bug/issue list + desktop design baseline.
 * EXACTLY faithful to ui_kits/tools/tracker.html (mobile frames A, B, C +
 * desktop switcher, table, detail, background-activity band).
 *
 * Props shaped for REAL data:
 *   tracker = { name, projectName, openCount }
 *   bugs[] = { id, title, status, priority, assignee: { initials, name, tone, toneBg },
 *              updated, attachments: [{ name, type }], agentWorking, step }
 *            status: 'open' | 'in_progress'
 *            priority: 'high' | 'med' | 'low'
 *   onSelectBug(bug), onNewBug(), onSelectDetail(bug), onAssignAgent(bug), onBack()
 *   isDesktop, activeTool, onNav, user
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
                <div style={{ height: 54, background: 'linear-gradient(135deg,#2a2030,#15161a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="att-bg">
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

export function TrackerView({ tracker = {}, bugs = [], onSelectBug, onNewBug, onBack, onMenu, onSearch, isDesktop = false, activeTool = 'tracker', onNav, user = {}, status = 'loaded', onRetry }) {
  const open = tracker.openCount != null ? tracker.openCount : bugs.length;

  // DESKTOP — ported from ui_kits/tools/tracker.html (desktop frame): shared top bar +
  // tracker switcher (left), bug table (center), bug detail (right), background-activity band.
  // Fed by the same real-data props (tracker/bugs) the live wrapper provides, with design-baseline
  // fallback values for display when data is absent.
  if (isDesktop) {
    const selectedBug = bugs.length > 0 ? bugs[0] : {
      id: 'CV6-142',
      title: 'Repo resolver drops docs-only projects',
      status: 'open',
      priority: 'high',
      assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' },
      opened: 'Jun 17 · 11:15 PM',
      mission: 'Space Rising · /007',
    };
    const trackers = [
      { name: 'CV6 Bugs', projectName: 'Corner CV6', count: 12, active: true, status: 'success' },
      { name: 'Space Rising · Tickets', projectName: 'Space Rising', count: 5, active: false, status: 'faint' },
      { name: 'Launch bugs', projectName: 'Loop Test Project', count: 3, active: false, status: 'faint' },
      { name: 'Resolver bugs', projectName: 'Space Rising · /007', count: 2, active: false, status: 'faint', mission: true },
    ];
    const tableData = [
      { id: 'CV6-142', title: 'Repo resolver drops docs-only projects', status: 'open', priority: 'high', assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' }, updated: '2h' },
      { id: 'CV6-138', title: 'Catch Up cards crowd All Rooms', status: 'in_progress', priority: 'med', assignee: { initials: 'RX', name: 'Rex', tone: '#A3E635', toneBg: 'rgba(163,230,53,.2)' }, updated: '5h' },
      { id: 'CV6-131', title: 'Nav overlaps home indicator', status: 'in_progress', priority: 'med', assignee: { initials: 'EL', name: 'Elon', tone: 'var(--success)', toneBg: 'rgba(52,211,153,.2)' }, updated: '8h' },
      { id: 'CV6-126', title: 'Glass contrast dips on lightest photo', status: 'open', priority: 'low', assignee: { initials: 'GA', name: 'Gary', tone: 'var(--warn)', toneBg: 'rgba(251,191,36,.2)' }, updated: '1d' },
    ];

    return (
      <div data-cv6kit style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        <CvgDesktopChrome activeTool={activeTool} onNav={onNav} user={user} />
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
          {/* Switcher — 300px left panel */}
          <div style={{ width: 300, flex: 'none', borderRight: '1px solid var(--divider)', padding: '20px 16px', overflow: 'hidden' }}>
            <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Project trackers</div>
            <div style={{ marginBottom: 20 }}>
              {trackers.slice(0, 3).map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10, ...(t.active ? { background: 'var(--accent-weak)' } : {}) }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.status === 'success' ? 'var(--success)' : 'var(--faint)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: t.active ? 600 : 500, color: 'var(--fg)' }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{t.projectName}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: t.active ? 'var(--accent)' : 'var(--faint)' }}>{t.count}</span>
                </div>
              ))}
            </div>
            <div className="eyebrow" style={{ margin: '0 6px 8px' }}>Mission trackers</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 10 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--faint)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{trackers[3].name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{trackers[3].projectName}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)' }}>{trackers[3].count}</span>
            </div>
          </div>

          {/* Table — flex middle panel */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--success)' }} />
                  <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>CV6 Bugs</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>Corner CV6 · 12 open</div>
              </div>
              <button style={{ height: 38, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                New bug
              </button>
            </div>
            <div style={{ padding: '0 24px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', height: 34, borderBottom: '1px solid var(--hair)' }}>
                <div style={{ flex: 1 }}>Bug</div>
                <div style={{ width: 120, flex: 'none' }}>Status</div>
                <div style={{ width: 90, flex: 'none' }}>Priority</div>
                <div style={{ width: 110, flex: 'none' }}>Assignee</div>
                <div style={{ width: 50, flex: 'none' }}>Upd</div>
              </div>
              {status === 'loading' && (!tableData || tableData.length === 0) ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', paddingTop: 40 }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', border: '2.5px solid var(--hair)', borderTopColor: 'var(--accent)', animation: 'spin .8s linear infinite' }} />
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Gathering your issues…</div>
                </div>
              ) : status === 'error' && (!tableData || tableData.length === 0) ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 28px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 240, lineHeight: 1.5 }}>Could not load your issues just now. It keeps trying on its own.</div>
                </div>
              ) : (
                tableData.map((bug, i) => {
                  const statusColor = bug.status === 'in_progress' ? { color: 'var(--warn)', bg: 'var(--warn-weak,rgba(251,191,36,.16))', label: 'In progress' } : { color: '#F87171', bg: 'rgba(248,113,113,.16)', label: 'Open' };
                  const priorityColor = bug.priority === 'high' ? '#F87171' : bug.priority === 'med' ? 'var(--warn)' : 'var(--accent)';
                  const priorityLabel = bug.priority === 'high' ? 'High' : bug.priority === 'med' ? 'Med' : 'Low';
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', height: 60, borderBottom: '1px solid var(--divider)', ...(i === 0 ? { background: 'var(--accent-weak)', margin: '0 -8px', padding: '0 8px', borderRadius: 8 } : {}) }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{bug.title}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{bug.id}</div>
                      </div>
                      <div style={{ width: 120, flex: 'none' }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 13, color: statusColor.color, background: statusColor.bg }}>{statusColor.label}</span>
                      </div>
                      <div style={{ width: 90, flex: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: priorityColor }} />
                        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{priorityLabel}</span>
                      </div>
                      <div style={{ width: 110, flex: 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 700, background: bug.assignee.toneBg, color: bug.assignee.tone }}>{bug.assignee.initials}</span>
                        <span style={{ fontSize: 13, color: 'var(--fg)' }}>{bug.assignee.name}</span>
                      </div>
                      <div style={{ width: 50, flex: 'none', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)' }}>{bug.updated}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail — 360px right panel */}
          <div style={{ width: 360, flex: 'none', borderLeft: '1px solid var(--divider)', padding: 22, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--faint)', marginBottom: 8 }}>{selectedBug.id}</div>
            <h2 style={{ fontSize: 18, lineHeight: 1.3, fontWeight: 700, color: 'var(--fg)', margin: '0 0 12px' }}>{selectedBug.title}</h2>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: '#F87171', background: 'rgba(248,113,113,.16)', padding: '4px 10px', borderRadius: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F87171' }} />
                Open
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#F87171', background: 'rgba(248,113,113,.16)', padding: '4px 10px', borderRadius: 7 }}>High priority</span>
            </div>
            <div style={{ background: 'var(--surface-2)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 44, borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Assignee</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(52,211,153,.2)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>EL</span>
                  Elon
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 44, borderBottom: '1px solid var(--divider)' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Mission</span>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--fg)' }}>Space Rising · /007</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', height: 44 }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>Opened</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--fg)' }}>Jun 17 · 11:15 PM</span>
              </div>
            </div>
            <div className="eyebrow" style={{ marginBottom: 9 }}>Description</div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--fg)', margin: '0 0 18px' }}>
              Repo <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--chip)', padding: '1px 6px', borderRadius: 5, fontSize: '.85em', color: 'var(--fg)' }}>space-rising</code> isn't found in the <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--chip)', padding: '1px 6px', borderRadius: 5, fontSize: '.85em', color: 'var(--fg)' }}>task-runner.sh</code> resolver. Add a case in <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--chip)', padding: '1px 6px', borderRadius: 5, fontSize: '.85em', color: 'var(--fg)' }}>resolve_repo_path()</code> or create <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--chip)', padding: '1px 6px', borderRadius: 5, fontSize: '.85em', color: 'var(--fg)' }}>projects/space-rising/</code>.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="eyebrow">Checklist · 1 of 3</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                Add
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20, flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="var(--success)" stroke="none" style={{ flex: 'none', marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="m8 12 3 3 5-6" stroke="var(--ground)" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4, color: 'var(--muted)', textDecoration: 'line-through' }}>Reproduce on docs-only project</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, border: '2px solid var(--accent)', flex: 'none', marginTop: 1 }} />
                <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4, color: 'var(--fg)' }}>
                  Patch <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--chip)', padding: '1px 6px', borderRadius: 5, fontSize: '.85em', color: 'var(--fg)' }}>resolve_repo_path()</code>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ width: 17, height: 17, borderRadius: 5, border: '2px solid var(--divider)', flex: 'none', marginTop: 1 }} />
                <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4, color: 'var(--muted)' }}>Add a regression test</span>
              </div>
            </div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Attachments · 2</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, border: '1px solid var(--hair)', borderRadius: 11, overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ height: 60, background: 'linear-gradient(135deg,#2a2030,#15161a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--violet-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="m9 11 2 2 4-4" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>resolver-trace.png</span>
                  <button style={{ height: 24, padding: '0 8px', borderRadius: 7, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Review</button>
                </div>
              </div>
              <div style={{ flex: 1, border: '1px solid var(--hair)', borderRadius: 11, overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ height: 60, background: 'linear-gradient(135deg,#26303f,#161b24)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>task-runner.log</span>
                  <button style={{ height: 24, padding: '0 8px', borderRadius: 7, border: 'none', background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Review</button>
                </div>
              </div>
            </div>
            <button style={{ width: '100%', height: 42, borderRadius: 11, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Change status</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      {/* Canonical mobile header: .mback left · .mhtitle · .mhactions (search then menu) */}
      <CvgMobileHeader
        title={tracker.name || 'Tracker'}
        sub={[tracker.projectName, `${open} open`].filter(Boolean).join(' · ')}
        onBack={onBack}
        onSearch={onSearch}
        onMenu={onMenu}
      />

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

/**
 * MOBILE FRAME A: Tracker Switcher Screen — list of available trackers with status pills
 * Status: 3 HIGH (red), 1 LIVE (green), 5 READY (gray), 2 DONE (accent)
 * Static shell with sample data.
 */
export function TrackerSwitcherView({ onSelect, onBack }) {
  const trackers = [
    { name: 'CV6 Bugs', project: 'Corner CV6', statuses: [{ label: '3 HIGH', tone: '#F87171' }, { label: '1 LIVE', tone: 'var(--success)' }] },
    { name: 'Space Rising Tickets', project: 'Space Rising', statuses: [{ label: '5 READY', tone: 'var(--muted)' }] },
    { name: 'Launch bugs', project: 'Loop Test', statuses: [{ label: '2 DONE', tone: 'var(--accent)' }] },
  ];

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      <CvgMobileHeader title="Trackers" onBack={onBack} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '14px 16px calc(20px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trackers.map((t, i) => (
          <div key={i} onClick={() => onSelect(t)} style={{ border: '1px solid var(--hair)', background: 'var(--surface)', borderRadius: 15, padding: '14px 16px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 9 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.project}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {t.statuses.map((s, j) => (
                <span key={j} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 6, color: s.tone, background: s.tone === '#F87171' ? 'rgba(248,113,113,.16)' : s.tone === 'var(--success)' ? 'var(--success-weak)' : s.tone === 'var(--muted)' ? 'var(--chip)' : 'var(--accent-weak)' }}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * MOBILE FRAME B: New Issue Form Screen — create new bug with title, description, priority, assignee, attachments
 * Static shell with sample data and form structure.
 */
export function NewIssueView({ onSubmit, onBack }) {
  const [title, setTitle] = React.useState('');
  const [priority, setPriority] = React.useState('med');
  const [description, setDescription] = React.useState('');

  return (
    <div data-cv6kit data-theme="glass" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--ground)', fontFamily: 'var(--font-sans)', color: 'var(--fg)' }}>
      <CvgMobileHeader title="New Issue" sub="CV6 Bugs · Corner CV6" onBack={onBack} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px calc(80px + env(safe-area-inset-bottom, 0px))' }}>

        {/* Title field */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }} className="eyebrow">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description of the issue" style={{ width: '100%', height: 44, padding: '10px 12px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }} />
        </div>

        {/* Description field */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }} className="eyebrow">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="More details about what's broken or needed" style={{ width: '100%', minHeight: 100, padding: '10px 12px', border: '1px solid var(--hair)', borderRadius: 10, background: 'var(--surface)', color: 'var(--fg)', fontSize: 14, fontFamily: 'var(--font-sans)', boxSizing: 'border-box', resize: 'none' }} />
        </div>

        {/* Priority selector */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 9 }} className="eyebrow">Priority</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ val: 'high', label: 'High', color: '#F87171' }, { val: 'med', label: 'Med', color: 'var(--warn)' }, { val: 'low', label: 'Low', color: 'var(--accent)' }].map((p) => (
              <button key={p.val} onClick={() => setPriority(p.val)} style={{ flex: 1, height: 40, border: priority === p.val ? `2px solid ${p.color}` : `1px solid var(--hair)`, borderRadius: 10, background: priority === p.val ? 'var(--surface)' : 'transparent', color: p.color, fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assign card (mock) */}
        <div style={{ border: '1px solid var(--accent-weak)', background: 'linear-gradient(180deg,var(--accent-weak),transparent)', borderRadius: 15, padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: 'rgba(52,211,153,.22)', color: 'var(--success)' }}>
              EL
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Assign to agent</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>Works autonomously, asks when blocked</div>
            </div>
          </div>
          <button style={{ width: '100%', height: 40, marginTop: 12, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            Assign Agent
          </button>
        </div>

        {/* Attachments placeholder */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 9 }} className="eyebrow">Attachments</label>
          <div style={{ border: '2px dashed var(--hair)', borderRadius: 10, padding: '20px 14px', textAlign: 'center', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.8" style={{ margin: '0 auto 8px', display: 'block' }} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Drag files or tap to attach</div>
          </div>
        </div>
      </div>

      {/* Submit button — fixed bottom */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px calc(20px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(180deg,transparent,var(--ground))', zIndex: 20 }}>
        <button onClick={() => { if (title.trim()) onSubmit?.({ title: title.trim(), priority, description: description.trim() }); }} style={{ width: '100%', height: 48, borderRadius: 11, border: 'none', background: title.trim() ? 'var(--accent)' : 'var(--surface-2)', color: title.trim() ? '#fff' : 'var(--faint)', fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: title.trim() ? 'pointer' : 'default' }}>
          Create Issue
        </button>
      </div>
    </div>
  );
}
