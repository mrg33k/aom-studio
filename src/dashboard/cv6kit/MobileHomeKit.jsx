import React, { useState } from 'react';

/**
 * CV6 kit MOBILE Home — exact pull of the canonical mobile design.
 * Design: deliverables/design-system-2026-06-21/ui_kits/mobile/index.html (home frame: 390x844px).
 *
 * A full-screen mobile home surface with right-edge rail navigation + FAB toggle:
 *   GREETING — "Good evening, Patrik."
 *   CATCH UP — badge + rich email card + action buttons
 *   ALL ROOMS — agent list + project list
 *   SIDE RAIL — 8 tools (right edge, always accessible; tapping avatar closes it; FAB opens when closed)
 *   FAB — menu button (hamburger) bottom-right when rail is closed
 *
 * This is the VIEW layer: full design with SAMPLE data (defaults match the design picture).
 *
 * Props (all optional; sample defaults preserve the design preview):
 *   theme, user, greeting, catchTotal, agents, projects, activeTool, onNav, onSelectRoom, onNewRoom
 */

const css = `
.cv6mh { position:fixed; inset:0; width:100%; height:100dvh; overflow:hidden; background:var(--ground); display:flex; flex-direction:column; font-family:var(--font-sans); color:var(--fg); -webkit-font-smoothing:antialiased; }
.cv6mh .content { position:absolute; left:0; top:0; right:0; bottom:0; display:flex; flex-direction:column; overflow:hidden; transition:right .28s cubic-bezier(.4,0,.2,1); }
.cv6mh .scroller { flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:calc(env(safe-area-inset-top, 0px) + 6px) 0 calc(env(safe-area-inset-bottom, 0px) + 28px); }
.cv6mh .greeting { font-size:29px; line-height:1.1; font-weight:700; letter-spacing:-.025em; color:var(--fg); padding:0 22px 20px; margin-top:14px; }
.cv6mh .greeting-faint { color:var(--faint); }
.cv6mh .eyebrow { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.cv6mh .badge-weak { display:inline-flex; align-items:center; justify-content:center; height:20px; padding:0 8px; border-radius:6px; background:var(--accent-weak); color:var(--accent); font-size:11px; font-weight:700; text-transform:uppercase; }
.cv6mh .section-header { padding:0 22px; display:flex; align-items:center; gap:9px; margin-bottom:14px; }
.cv6mh .card { margin:0 22px 20px; background:var(--surface); border:1px solid var(--hair); border-radius:16px; box-shadow:var(--shadow-card,0 1px 2px rgba(0,0,0,.2)); }
.cv6mh .card-header { display:flex; align-items:center; gap:10px; padding:14px 16px 0; margin-bottom:12px; }
.cv6mh .glyph { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:none; }
.cv6mh .card-title { font-size:13.5px; font-weight:600; color:var(--fg); }
.cv6mh .card-subtitle { font-size:11.5px; color:var(--muted); }
.cv6mh .tag-pill { font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 8px; border-radius:6px; flex:none; }
.cv6mh .card-content { padding:0 16px; }
.cv6mh .summary-box { display:flex; gap:8px; align-items:flex-start; background:var(--surface-2); border-radius:10px; padding:11px 12px; margin-bottom:14px; }
.cv6mh .echk { display:flex; align-items:flex-start; gap:9px; font-size:13px; color:var(--fg); line-height:1.45; margin-bottom:8px; }
.cv6mh .echk-box { width:16px; height:16px; border-radius:5px; border:2px solid var(--accent); flex:none; margin-top:1px; }
.cv6mh .action-items { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
.cv6mh .attach { display:flex; align-items:center; gap:11px; padding:9px 11px; border:1px solid var(--hair); border-radius:11px; background:var(--surface-2); margin-bottom:15px; }
.cv6mh .athumb { width:40px; height:40px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:none; }
.cv6mh .card-footer { border-top:1px solid var(--divider); padding:12px 14px; }
.cv6mh .button-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.cv6mh .btn { height:40px; border-radius:10px; font-size:13px; font-weight:600; font-family:var(--font-sans); cursor:pointer; border:none; display:flex; align-items:center; justify-content:center; gap:7px; }
.cv6mh .btn-primary { background:var(--accent); color:#fff; }
.cv6mh .btn-secondary { background:var(--surface-2); border:1px solid var(--hair); color:var(--fg); }
.cv6mh .btn-full { grid-column:1 / -1; }
.cv6mh .room-list { margin:0 22px; background:var(--surface); border:1px solid var(--hair); border-radius:16px; overflow:hidden; }
.cv6mh .room { display:flex; align-items:center; gap:11px; padding:11px 12px; border-bottom:1px solid var(--divider); cursor:pointer; }
.cv6mh .room:last-child { border-bottom:none; }
.cv6mh .room:hover { background:var(--surface-2); }
.cv6mh .dot { width:8px; height:8px; border-radius:50%; flex:none; }
.cv6mh .room-name { flex:1; font-size:14px; font-weight:500; color:var(--fg); }
.cv6mh .room-tag { font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
.cv6mh .rail { position:absolute; right:0; top:0; bottom:0; width:72px; background:var(--surface-2); border-left:1px solid var(--divider); display:flex; flex-direction:column; align-items:center; padding:calc(15px + env(safe-area-inset-top, 0px)) 0 calc(16px + env(safe-area-inset-bottom, 0px)); gap:16px; overflow-y:auto; }
.cv6mh .rail-item { width:56px; height:56px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; border-radius:12px; cursor:pointer; transition:background .14s; }
.cv6mh .rail-item:hover { background:var(--surface); }
.cv6mh .rail-item.on { background:var(--accent); }
.cv6mh .rail-item.on svg { color:#fff; }
.cv6mh .rail-label { font-size:8px; font-weight:600; text-align:center; color:inherit; }
.cv6mh .rail-divider { width:32px; height:1px; background:var(--divider); }
.cv6mh .rail-avatar { width:40px; height:40px; border-radius:50%; background:var(--avatar); color:#fff; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:600; margin-top:auto; cursor:pointer; }
.cv6mh .fab { position:fixed; right:18px; bottom:calc(18px + env(safe-area-inset-bottom, 0px)); width:54px; height:54px; border-radius:27px; padding:0; border:1px solid rgba(255,255,255,.18); background:rgba(18,20,26,.92); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 28px rgba(0,0,0,.5); cursor:pointer; z-index:999; }
.cv6mh .fab:hover { background:rgba(18,20,26,.98); }
`;

const sw = (paths, stroke = 'currentColor', w = 20, fill = 'none', swid = 2) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={swid} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: paths }} />
);

const TOOLS = [
  { key: 'home', label: 'Home', p: '<path d="M3 11l9-7 9 7"/><path d="M5 9.8V20h14V9.8"/>' },
  { key: 'chat', label: 'Chat', p: '<path d="M20 11.5a7.5 7.5 0 0 1-10.5 6.8L5 19.5l1.2-4A7.5 7.5 0 1 1 20 11.5Z"/>' },
  { key: 'organize', label: 'Organize', p: '<path d="M12 4 3 8l9 4 9-4-9-4Z"/><path d="m3 12 9 4 9-4"/>' },
  { key: 'review', label: 'Review', p: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.6"/>' },
  { key: 'support', label: 'Support', p: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>' },
  { key: 'tracker', label: 'Tracker', p: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2"/>' },
  { key: 'command', label: 'Command', p: '<path d="M7 4H4v16h3M17 4h3v16h-3"/>' },
  { key: 'scribe', label: 'Scribe', p: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>' },
];

// Sample data mirrors the design picture so the preview is an exact pull.
const SAMPLE_AGENTS = [
  { name: 'Elon', dot: 'var(--success)', glow: true, status: 'online' },
  { name: 'Rex', dot: 'var(--status-working,#fbbf24)', status: 'working' },
  { name: 'Gary', dot: 'var(--warn)', status: 'needs you' },
];
const SAMPLE_PROJECTS = [
  { name: 'Space Rising', color: 'var(--violet-400)', count: 28 },
  { name: 'Corner', color: 'var(--accent)', count: 84 },
];

const MENU_GLYPH = <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;

export function MobileHomeKit({
  theme = 'dark',
  user = { initial: 'P' },
  greeting = 'Good evening, Patrik.',
  catchTotal = 5,
  agents = SAMPLE_AGENTS,
  projects = SAMPLE_PROJECTS,
  activeTool = 'home',
  onNav,
  onSelectRoom,
  onNewRoom,
}) {
  const [railOpen, setRailOpen] = useState(true);
  const [selected, setSelected] = useState(agents[0]?.name || 'Elon');

  const pick = (name) => {
    setSelected(name);
    if (onSelectRoom) onSelectRoom(name);
  };

  return (
    <div className="cv6mh" data-cv6kit data-theme={theme}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* CONTENT (slides right when rail opens) */}
      <div className="content" style={{ right: railOpen ? 72 : 0 }}>
        <div className="scroller">
          {/* Greeting */}
          <div className="greeting">
            Good evening,<br />
            <span className="greeting-faint">Patrik.</span>
          </div>

          {/* Catch Up Section */}
          <div className="section-header" style={{ marginBottom: 14 }}>
            <span className="eyebrow">Catch up</span>
            <span className="badge-weak">{catchTotal}</span>
          </div>

          {/* Rich Email Card */}
          <div className="card" style={{ overflow: 'hidden', marginBottom: 14 }}>
            <div className="card-header">
              <div className="glyph" style={{ background: 'rgba(244,114,182,.16)' }}>
                {sw('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 'var(--pink-400)', 17)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="card-title">Space Rising · Elon</div>
                <div className="card-subtitle">Hit a snag on the resolver · needs you</div>
              </div>
            </div>
            <div className="card-content">
              <div className="summary-box">
                {sw('<path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15l-1.6-4.4L5.5 9l4.9-1.1Z"/>', 'var(--accent)', 15, 'var(--accent)')}
                <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg)' }}>
                  <span style={{ fontWeight: 600 }}>Quick summary:</span> Repo resolver blocks the print. Reversible fix chosen. Re-running tonight.
                </div>
              </div>

              <div className="eyebrow" style={{ marginBottom: 9 }}>Action items</div>
              <div className="action-items">
                <div className="echk">
                  <span className="echk-box" />
                  <span>Pull repo and scan task-runner</span>
                </div>
                <div className="echk">
                  <span className="echk-box" />
                  <span>Patch resolve_repo_path()</span>
                </div>
              </div>

              <div className="attach">
                <div className="athumb" style={{ background: 'linear-gradient(135deg,#26303f,#161b24)' }}>
                  {sw('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>', 'var(--pink-400)', 19, 'none', 1.8)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-title">resolver-notes.pdf</div>
                  <div style={{ fontSize: 10.5, color: 'var(--faint)', fontFamily: 'var(--font-mono)' }}>124 KB</div>
                </div>
              </div>
            </div>

            <div className="card-footer">
              <div className="eyebrow" style={{ marginBottom: 10 }}>Suggested actions</div>
              <div className="button-row">
                <button className="btn btn-primary" style={{ background: 'var(--accent)' }}>
                  {sw('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 'currentColor', 15)}
                  Draft
                </button>
                <button className="btn btn-secondary">
                  {sw('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', 'currentColor', 15)}
                  Track
                </button>
              </div>
              <button className="btn btn-primary btn-full" style={{ marginTop: 8, background: 'var(--accent)' }}>
                Open in chat
              </button>
            </div>
          </div>

          {/* All Rooms Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 22px', marginBottom: 12 }}>
            <span className="eyebrow">All rooms</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)' }}>See all</span>
          </div>

          {/* Rooms List */}
          <div className="room-list" style={{ marginBottom: 40 }}>
            {agents.map((ag, i) => (
              <div key={ag.name} className="room" onClick={() => pick(ag.name)} style={{ borderBottom: i < agents.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                <span className="dot" style={{ background: ag.dot, boxShadow: ag.glow ? 'var(--glow-online,0 0 8px rgba(52,211,153,.6))' : 'none' }} />
                <span className="room-name">{ag.name}</span>
                <span className="room-tag">{ag.status.toUpperCase()}</span>
              </div>
            ))}
            {projects.map((p, i) => (
              <div key={p.name} className="room" onClick={() => pick(p.name)} style={{ borderBottom: i < projects.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                {sw('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', p.color, 18)}
                <span className="room-name">{p.name}</span>
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SIDE RAIL (right edge) */}
      {railOpen && (
        <div className="rail">
          {TOOLS.map((t) => (
            <div
              key={t.key}
              className={`rail-item${activeTool === t.key ? ' on' : ''}`}
              onClick={() => onNav && onNav(t.key)}
              style={{ color: activeTool === t.key ? '#fff' : 'var(--muted)' }}
            >
              {sw(t.p, 'currentColor', 18)}
              <span className="rail-label">{t.label}</span>
            </div>
          ))}
          <div className="rail-divider" style={{ marginTop: 'auto' }} />
          <div className="rail-avatar" onClick={() => setRailOpen(false)}>
            {user.initial || 'P'}
          </div>
        </div>
      )}

      {/* FAB (menu button when rail is closed) */}
      {!railOpen && (
        <button className="fab" onClick={() => setRailOpen(true)} aria-label="Open menu">
          {MENU_GLYPH}
        </button>
      )}
    </div>
  );
}

export default MobileHomeKit;
