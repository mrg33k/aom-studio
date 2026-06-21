import React, { useState } from 'react';

/**
 * CV6 kit DESKTOP Home — exact pull of the canonical desktop design.
 * Design: deliverables/design-system-2026-06-21/ui_kits/desktop/index.html (+ HomeScreen.jsx, README.md).
 *
 * A windowed three-column app surface (fluid, fills the viewport on the live desktop /dashboard):
 *   APP BAR  — Corner logo (left), the 8 tool tiles (center, active = accent), search/theme/notifications/avatar (right).
 *   CATCH UP — 392px: the email-in-full-force triage deck (summary, action items, attachment, suggested actions) + peeking cards.
 *   ALL ROOMS— flex: New button, room search (command-K), keyboard hints, Agents then Projects, show-more.
 *   CONVERSATION — 412px: the selected agent's goal dashboard (goal, progress, summary, comms, data, checklist, composer)
 *                  or a project's missions view. A Files button opens an on-demand 4th column (handled by the integrator).
 *
 * This is the VIEW layer: full design with SAMPLE data (defaults match the design picture) so /cv6kit?screen=desktop-home
 * renders the exact pull for review. The live wrapper (DesktopHomeWired) feeds real data + a real conversation column.
 *
 * Props (all optional; sample defaults preserve the design preview):
 *   theme, user, greeting, catchTotal, agents, projects, projectTotal, agentTotal,
 *   activeTool, onNav, onSelectRoom, onNewRoom, onNewMission, onThemeChange, onOpenFiles, onSearch
 */

const css = `
.cv6dh { position:relative; width:100%; height:100dvh; overflow:hidden; background:var(--ground); display:flex; flex-direction:column; font-family:var(--font-sans); color:var(--fg); -webkit-font-smoothing:antialiased; }
.cv6dh .av { width:40px; height:40px; border-radius:50%; background:var(--avatar); display:flex; align-items:center; justify-content:center; color:#fff; font-size:15px; font-weight:600; flex:none; }
.cv6dh .topbar { flex:none; display:flex; align-items:center; gap:22px; padding:16px 28px; border-bottom:1px solid var(--divider); }
.cv6dh .eyebrow { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.cv6dh .toolnav { flex:1; display:flex; justify-content:center; gap:8px; }
.cv6dh .ctile { width:66px; flex:none; display:flex; flex-direction:column; align-items:center; gap:5px; padding:8px 0 7px; border-radius:var(--radius-control,12px); background:var(--surface); border:1px solid var(--hair); color:var(--muted); cursor:pointer; transition:background .14s,color .14s; }
.cv6dh .ctile:hover { color:var(--fg); }
.cv6dh .ctile.on { background:var(--accent); border-color:transparent; color:#fff; }
.cv6dh .clab { font-size:10.5px; font-weight:600; }
.cv6dh .ib { width:40px; height:40px; border-radius:11px; background:var(--surface-2); border:1px solid var(--hair); color:var(--muted); display:flex; align-items:center; justify-content:center; position:relative; cursor:pointer; }
.cv6dh .ib:hover { color:var(--fg); }
.cv6dh .barbtns { display:flex; align-items:center; gap:14px; }
.cv6dh .toolname { font-size:13px; font-weight:600; color:var(--muted); }
.cv6dh .cols { display:flex; flex:1; min-height:0; }
.cv6dh .col { padding:18px 16px; }
.cv6dh .catch { width:392px; flex:none; border-right:1px solid var(--divider); overflow:hidden; display:flex; flex-direction:column; }
.cv6dh .rooms { flex:1; min-width:0; display:flex; flex-direction:column; }
.cv6dh .convo { width:412px; flex:none; border-left:1px solid var(--divider); display:flex; flex-direction:column; padding:0; min-height:0; }
.cv6dh .card { background:var(--surface); border:1px solid var(--hair); border-radius:16px; box-shadow:var(--shadow-card,0 1px 2px rgba(0,0,0,.2)); }
.cv6dh .glyph { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:none; }
.cv6dh .tag-pill { font-size:10px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; padding:3px 8px; border-radius:6px; flex:none; }
.cv6dh .echk { display:flex; align-items:flex-start; gap:9px; font-size:13px; color:var(--fg); line-height:1.45; }
.cv6dh .echk .box { width:16px; height:16px; border-radius:5px; border:2px solid var(--accent); flex:none; margin-top:1px; }
.cv6dh .eact { display:flex; align-items:center; justify-content:center; gap:7px; height:40px; border-radius:10px; font-size:13px; font-weight:600; font-family:var(--font-sans); cursor:pointer; border:none; }
.cv6dh .attach { display:flex; align-items:center; gap:11px; padding:9px 11px; border:1px solid var(--hair); border-radius:11px; background:var(--surface-2); }
.cv6dh .athumb { width:40px; height:40px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:none; }
.cv6dh .subhdr { font-size:10.5px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:var(--faint); margin:0 0 8px; }
.cv6dh .room { display:flex; align-items:center; gap:11px; padding:9px 12px; border-radius:10px; cursor:pointer; }
.cv6dh .room:hover { background:var(--surface-2); }
.cv6dh .room.sel { background:var(--accent-weak); }
.cv6dh .dot { width:8px; height:8px; border-radius:50%; flex:none; }
.cv6dh .rn { flex:1; font-size:14px; color:var(--fg); }
.cv6dh .cvhdr { display:flex; align-items:center; gap:9px; padding:20px 20px 16px; border-bottom:1px solid var(--divider); flex:none; }
.cv6dh .filesbtn { display:flex; align-items:center; gap:6px; height:34px; padding:0 12px; border-radius:9px; border:1px solid var(--hair); color:var(--muted); font-size:12.5px; font-weight:600; background:transparent; cursor:pointer; }
.cv6dh .composer { border-top:1px solid var(--divider); padding:12px 16px; display:flex; align-items:center; gap:9px; flex:none; }
.cv6dh .cmd { width:40px; height:40px; border-radius:11px; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; flex:none; }
.cv6dh .field { flex:1; height:40px; border-radius:11px; border:1px solid var(--hair); background:var(--surface-2); display:flex; align-items:center; gap:8px; padding:0 12px; color:var(--faint); font-size:14px; }
.cv6dh .mono { font-family:var(--font-mono); }
.cv6dh .kbd { font-family:var(--font-mono); font-size:10px; color:var(--faint); border:1px solid var(--hair); border-radius:5px; padding:1px 5px; }
.cv6dh .scrollcap { position:relative; overflow-y:auto; }
.cv6dh .scrollcap::after { content:''; position:absolute; left:0; right:0; bottom:0; height:36px; background:linear-gradient(transparent, var(--ground)); pointer-events:none; }
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
  { name: 'Elon', dot: 'var(--success)', glow: true, note: 'on step 3', noteAccent: true },
  { name: 'Rex', dot: 'var(--status-working,#fbbf24)', note: 'drafting' },
  { name: 'Gary', dot: 'var(--warn)', note: 'needs you' },
  { name: 'Mira', dot: 'var(--success)', glow: true },
  { name: 'Sol', dot: 'var(--faint)', note: 'ready' },
];
const SAMPLE_PROJECTS = [
  { name: 'Space Rising', color: 'var(--violet-400)', count: 28 },
  { name: 'Corner', color: 'var(--accent)', count: 84 },
  { name: 'Included Health', color: 'var(--pink-400)', badge: 3 },
  { name: 'Loop Test Project', color: 'var(--teal-400)', count: 5 },
  { name: 'AOM-EA', color: 'var(--lime-400)', count: 12 },
  { name: 'Batch02 Culture', color: 'var(--amber-400)', count: 9 },
];

const AGENT_DATA = {
  Elon: {
    av: 'EL', avbg: 'rgba(52,211,153,.2)', avc: 'var(--success)', proj: 'Space Rising', mission: '/007', goal: 'Lock the print framing', step: 3, total: 4,
    summary: ['Repo resolver blocks the Apr 29 print', 'Reversible fix chosen; framing pinned first', 'Build re-running, ETA tonight'],
    comms: [
      { type: 'success', t: 'Pulled the repo and scanned the task-runner. All clear.' },
      { type: 'question', t: 'Migrate to a projects/ entry now, or after the print?', options: ['After the print', 'Do it now'] },
      { type: 'snag', t: "The repo isn't wired into the runner yet.", options: ['Quick reversible fix', 'Do it the clean way'] },
    ],
    data: { title: 'Build log', cols: ['Day', 'Built', 'Verified', 'Open'], rows: [['Mon', 12, 10, 2], ['Tue', 18, 16, 2], ['Wed', 21, 19, 1], ['Thu', 15, 15, 0], ['Fri', 9, 9, 0]] },
    checklist: [['Pull repo and scan task-runner', 'done'], ['Patch resolve_repo_path()', 'working'], ['Route docs-only to AOM-EA', 'working'], ['Re-run the print build', 'pending']],
  },
};
function defAgent(n) {
  return { av: n.slice(0, 2).toUpperCase(), avbg: 'var(--accent-weak)', avc: 'var(--accent)', proj: 'Corner', mission: '/012', goal: 'Ship CV6 desktop parity', step: 2, total: 4,
    summary: ['Safe-area insets wired', 'Side menu and Catch Up ported', 'Theme pass remaining'],
    comms: [{ type: 'question', t: 'Want me to start the theme pass now?', options: ['Yes, go', 'Wait'] }],
    data: { title: 'Sprint log', cols: ['Week', 'Done', 'Left'], rows: [['W1', 6, 18], ['W2', 11, 13], ['W3', 17, 7], ['W4', 21, 3]] },
    checklist: [['Audit screens', 'done'], ['Port nav', 'working'], ['Theme pass', 'pending'], ['QA', 'pending']] };
}
const PROJECT_DATA = {
  'Space Rising': { c: 'var(--violet-400)', members: 4, shared: true, missions: [
    ['/007', 'Lock the print framing', 'Elon', 'live'], ['/006', 'Resolver patch and tests', 'Rex', 'live'], ['/005', 'Changelog for v6', 'Gary', 'ready'], ['/004', 'Print spec summary', 'Elon', 'done'],
  ] },
};
function defProject() { return { c: 'var(--accent)', members: 0, shared: false, missions: [['/003', 'Define scope', 'Gary', 'ready'], ['/002', 'Kickoff brief', 'Rex', 'done']] }; }

const spark = (c = 'currentColor') => sw('<path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z"/>', c, 13, c);

function DataCard({ data }) {
  const [mode, setMode] = useState('table');
  const gc = `1.1fr${' 1fr'.repeat(data.cols.length - 1)}`;
  const totals = data.cols.map((c, i) => (i ? data.rows.reduce((a, r) => a + (r[i] || 0), 0) : 'Total'));
  const ci = 1, vals = data.rows.map((r) => r[ci]), max = Math.max(...vals) || 1;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, padding: '14px 15px 12px', marginBottom: 14, boxShadow: 'var(--shadow-card,0 1px 2px rgba(0,0,0,.2))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 11 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>{data.title}</span>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 8, padding: 3 }}>
          {['table', 'chart'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ height: 24, padding: '0 11px', borderRadius: 6, border: 'none', background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--muted)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', textTransform: 'capitalize' }}>{m}</button>
          ))}
        </div>
        <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 10px', borderRadius: 8, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--accent)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{spark('var(--accent)')}Remake</button>
      </div>
      {mode === 'table' ? (
        <div style={{ border: '1px solid var(--hair)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gc, gap: 8, padding: '8px 12px', background: 'var(--surface-2)', borderBottom: '1px solid var(--hair)' }}>
            {data.cols.map((c, i) => <div key={c} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', textAlign: i ? 'right' : 'left' }}>{c}</div>)}
          </div>
          {data.rows.map((r, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: gc, gap: 8, padding: '9px 12px', background: ri % 2 ? 'rgba(255,255,255,.02)' : 'transparent', borderBottom: '1px solid var(--divider)' }}>
              {r.map((cell, cidx) => <div key={cidx} style={{ fontSize: 12.5, textAlign: cidx ? 'right' : 'left', fontFamily: cidx ? 'var(--font-mono)' : 'inherit', fontWeight: cidx ? 400 : 500, color: 'var(--fg)' }}>{cell}</div>)}
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: gc, gap: 8, padding: '9px 12px', background: 'var(--surface-2)' }}>
            {totals.map((cell, cidx) => <div key={cidx} style={{ fontSize: 12.5, fontWeight: 700, textAlign: cidx ? 'right' : 'left', fontFamily: cidx ? 'var(--font-mono)' : 'inherit', color: cidx ? 'var(--accent)' : 'var(--muted)' }}>{cell}</div>)}
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, borderBottom: '1px solid var(--divider)' }}>
            {data.rows.map((r, i) => {
              const h = Math.round(r[ci] / max * 92);
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 7, height: 118 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{r[ci]}</span>
                  <div style={{ width: '60%', maxWidth: 26, height: h, borderRadius: '6px 6px 2px 2px', background: 'linear-gradient(180deg,var(--accent),#6366F1)' }} />
                  <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>{r[0]}</span>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--faint)', textAlign: 'center', marginTop: 7 }}>{data.cols[ci]} per {data.cols[0].toLowerCase()}</div>
        </div>
      )}
    </div>
  );
}

function CommCard({ c, name }) {
  const cfg = {
    success: { bd: 'var(--success-weak,rgba(52,211,153,.16))', bg: 'rgba(52,211,153,.07)', hc: 'var(--success)', title: 'Done' },
    snag: { bd: 'var(--warn-weak,rgba(251,191,36,.16))', bg: 'rgba(251,191,36,.07)', hc: 'var(--warn)', title: 'Hit a snag' },
    question: { bd: 'var(--accent-weak)', bg: 'var(--accent-weak)', hc: 'var(--accent)', title: 'Quick question' },
  }[c.type];
  const icon = c.type === 'success'
    ? sw('<circle cx="12" cy="12" r="10"/>', 'none', 18, 'var(--success)')
    : c.type === 'snag'
      ? sw('<path d="M12 9v4M12 17v.01"/><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/>', 'var(--warn)', 17)
      : sw('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6"/><path d="M12 17h.01"/>', 'var(--accent)', 17);
  return (
    <div style={{ border: `1px solid ${cfg.bd}`, background: cfg.bg, borderRadius: 14, padding: '13px 15px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{icon}<span style={{ fontSize: 13, fontWeight: 600, color: cfg.hc }}>{cfg.title}</span></div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>{c.t}</div>
      {c.options && (
        <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
          {c.options.map((o, i) => (
            <button key={o} style={{ height: 36, padding: '0 14px', borderRadius: 9, border: c.type === 'snag' && i === 0 ? 'none' : `1px solid ${c.type === 'question' ? 'var(--accent-weak)' : 'var(--hair)'}`, background: (c.type === 'snag' && i === 0) ? 'var(--accent)' : (c.type === 'question' ? 'var(--accent-weak)' : 'transparent'), color: (c.type === 'snag' && i === 0) ? '#fff' : (c.type === 'question' ? 'var(--accent)' : 'var(--fg)'), fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{o}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Composer({ placeholder }) {
  return (
    <div className="composer">
      <div className="cmd">{sw('<circle cx="12" cy="12" r="8"/><path d="M9.5 9.5c.8-1.2 4.2-1.2 5 0"/>', 'currentColor', 19)}</div>
      <div className="field">{sw('<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>', 'var(--muted)', 17)}<span style={{ flex: 1 }}>{placeholder}</span></div>
      <div className="cmd" style={{ background: 'var(--surface-2)', color: 'var(--muted)' }}>{sw('<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', 'currentColor', 18)}</div>
    </div>
  );
}

function AgentConvo({ name, onOpenFiles }) {
  const a = AGENT_DATA[name] || defAgent(name);
  const pct = Math.round(a.step / a.total * 100);
  return (
    <>
      <div className="cvhdr">
        <span style={{ width: 30, height: 30, borderRadius: '50%', background: a.avbg, color: a.avc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>{a.av}</span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{name}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{a.proj} · {a.mission} · working</div></div>
        <button className="filesbtn" onClick={onOpenFiles}>{sw('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>', 'currentColor', 16)}Files</button>
      </div>
      <div className="scrollcap" style={{ flex: 1, padding: '18px 18px 0', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
          <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{sw('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>', 'var(--accent)', 15)}</span>
          <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}><span style={{ color: 'var(--muted)' }}>Goal:</span> {a.goal}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,var(--accent),#6366F1)' }} /></div>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{a.step}/{a.total}</span>
        </div>
        <div style={{ background: 'linear-gradient(180deg,var(--accent-weak),transparent)', border: '1px solid var(--accent-weak)', borderRadius: 14, padding: '13px 15px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>{spark('var(--accent)')}<span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--accent)' }}>Summary</span></div>
          {a.summary.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 6 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flex: 'none', marginTop: 7 }} /><span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--fg)' }}>{s}</span></div>
          ))}
        </div>
        {a.comms.map((c, i) => <CommCard key={i} c={c} name={name} />)}
        <DataCard data={a.data} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 14, padding: '13px 15px', marginBottom: 18, boxShadow: 'var(--shadow-card,0 1px 2px rgba(0,0,0,.2))' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 11 }}>Checklist · {a.step} of {a.total}</div>
          {a.checklist.map((c, i) => {
            const ic = c[1] === 'done'
              ? sw('<circle cx="12" cy="12" r="10"/>', 'none', 17, 'var(--success)')
              : c[1] === 'working'
                ? <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} /></span>
                : <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid var(--divider)', flex: 'none', display: 'inline-block' }} />;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>{ic}<span style={{ flex: 1, fontSize: 13, color: c[1] === 'done' ? 'var(--muted)' : 'var(--fg)', textDecoration: c[1] === 'done' ? 'line-through' : 'none', fontWeight: c[1] === 'done' ? 400 : 500 }}>{c[0]}</span></div>
            );
          })}
        </div>
      </div>
      <Composer placeholder={`Nudge ${name}, or jump in`} />
    </>
  );
}

const SDOT = { live: 'var(--success)', ready: 'var(--accent)', done: 'var(--muted)', working: 'var(--success)' };
function ProjectConvo({ name, onOpenFiles }) {
  const p = PROJECT_DATA[name] || defProject();
  const folder = (c) => sw('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', c, 17);
  return (
    <>
      <div className="cvhdr">
        <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{folder(p.c)}</span>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)' }}>{name}</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Project · {p.missions.length} missions</div></div>
        <button className="filesbtn" onClick={onOpenFiles}>{sw('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>', 'currentColor', 16)}Files</button>
      </div>
      <div className="scrollcap" style={{ flex: 1, padding: '18px 18px 0', minHeight: 0 }}>
        <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, border: '1px solid var(--accent-weak)', background: 'linear-gradient(180deg,var(--accent-weak),transparent)', cursor: 'pointer', marginBottom: 18, textAlign: 'left' }}>
          <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--chip)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{folder(p.c)}</span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-.01em', color: 'var(--fg)' }}>{name}</div><div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>General project chat · talk to the whole project</div></div>
          {sw('<path d="M9 18l6-6-6-6"/>', 'var(--accent)', 17)}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}><span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Missions inside</span><span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{p.missions.length}</span></div>
        {p.missions.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 10, cursor: 'pointer' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: SDOT[m[3]] || 'var(--accent)', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>{m[1]}</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{m[0]} · {m[2]}</div></div>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: 'var(--muted)' }}>{m[3].toUpperCase()}</span>
          </div>
        ))}
        <button style={{ width: '100%', height: 40, marginTop: 8, borderRadius: 10, border: '1px dashed var(--hair)', background: 'transparent', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{sw('<path d="M12 5v14M5 12h14"/>', 'currentColor', 15, 'none', 2.4)}New mission</button>
      </div>
      <Composer placeholder={`Message ${name}`} />
    </>
  );
}

export function DesktopHomeView({
  theme = 'dark',
  user = { initial: 'P' },
  agents = SAMPLE_AGENTS,
  projects = SAMPLE_PROJECTS,
  agentTotal = 11,
  projectTotal = 84,
  roomTotal = 95,
  catchTotal = 5,
  activeTool = 'home',
  onNav,
  onSelectRoom,
  onNewRoom,
  onOpenFiles,
}) {
  const agentNames = agents.map((a) => a.name);
  const [selected, setSelected] = useState(agentNames[0] || 'Elon');
  const isAgent = agentNames.indexOf(selected) >= 0;
  const pick = (name) => { setSelected(name); if (onSelectRoom) onSelectRoom(name); };

  return (
    <div className="cv6dh" data-cv6kit data-theme={theme}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* APP BAR */}
      <div className="topbar">
        <div style={{ flex: 'none' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110.72 24" fill="var(--fg)" style={{ display: 'block', height: 22, width: 'auto' }}>
            <g transform="scale(0.034942,0.034942)"><g transform="translate(-296.997118,1009) scale(0.1,-0.1)"><path d="M2972 6658 l3 -3433 475 0 475 0 5 2955 5 2955 2818 3 2817 2 0 475 0 475 -3300 0 -3300 0 2 -3432z" /></g></g>
            <g transform="translate(31.06,19.92) scale(0.024,-0.024)"><g><path d="M375.6 -13.7Q299.2 -13.7 238.6 7.7Q178.1 29.1 135.8 71.8Q93.5 114.5 71.2 177.3Q49 240.1 49 322.8Q49 407.3 71.7 472.2Q94.5 537.1 136.8 582.4Q179.1 627.7 237 650.7Q294.9 673.7 366.1 673.7Q421.4 673.7 468.2 659.5Q514.9 645.2 549.2 618Q583.5 590.7 602.9 552Q622.3 513.2 623 464.4L489.5 428.5Q489.9 471.4 471.4 499.3Q452.9 527.3 423.6 541.7Q394.3 556.1 361.1 556.1Q332.5 556.1 303.5 544.3Q274.5 532.5 251.1 506.1Q227.7 479.6 213.5 437Q199.4 394.4 199.4 331.7Q199.4 250.8 222.7 200.7Q246.1 150.6 287.2 127.1Q328.4 103.6 379.4 103.6Q433.6 103.6 464.3 126Q494.9 148.5 508.4 184.2Q521.9 219.9 523.1 259.7L649 238.9Q648.2 185.6 633.2 139.5Q618.2 93.4 586.1 58.9Q553.9 24.5 501.9 5.4Q449.8 -13.7 375.6 -13.7Z" /></g></g>
          </svg>
        </div>
        <div className="toolnav">
          {TOOLS.map((t) => (
            <div key={t.key} className={`ctile${activeTool === t.key ? ' on' : ''}`} onClick={() => onNav && onNav(t.key)}>{sw(t.p, 'currentColor', 20)}<span className="clab">{t.label}</span></div>
          ))}
        </div>
        <div className="barbtns">
          <span className="toolname">{(TOOLS.find((t) => t.key === activeTool) || TOOLS[0]).label}</span>
          <div className="ib">{sw('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'currentColor', 18)}</div>
          <div className="ib">{sw('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>', 'currentColor', 18)}</div>
          <div className="ib">{sw('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>', 'currentColor', 18)}<span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--ground)' }} /></div>
          <div className="av">{user.initial || 'P'}</div>
        </div>
      </div>

      {/* COLUMNS */}
      <div className="cols">
        {/* CATCH UP */}
        <div className="col catch">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flex: 'none' }}>
            <span className="eyebrow">Catch up</span>
            <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: 'var(--accent-weak)', color: 'var(--accent)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{catchTotal}</span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>1 of {catchTotal} · <span className="mono">swipe</span></span>
          </div>
          <div className="scrollcap" style={{ flex: 1 }}>
            <div className="card glassy" style={{ overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ padding: '14px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div className="glyph" style={{ background: 'rgba(244,114,182,.16)' }}>{sw('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 'var(--pink-400)', 17)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--fg)' }}>Dana Whitfield · Acme</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Re: Q2 partnership scope</div></div>
                  <span className="tag-pill" style={{ color: 'var(--pink-400)', background: 'rgba(244,114,182,.16)' }}>Email</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: 'var(--surface-2)', borderRadius: 10, padding: '11px 12px', marginBottom: 14 }}>
                  {sw('<path d="M12 3l1.6 4.9L18.5 9l-4.9 1.6L12 15l-1.6-4.4L5.5 9l4.9-1.1Z"/>', 'var(--accent)', 15, 'var(--accent)')}
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--fg)' }}><span style={{ fontWeight: 600 }}>Your summary:</span> Dana wants to expand the pilot to three teams and needs revised pricing before Friday. Warm tone; one open risk on the rollout timeline.</div>
                </div>
                <div className="eyebrow" style={{ marginBottom: 9 }}>Action items</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  <div className="echk"><span className="box" /><span>Send revised 3-team pricing by Friday</span></div>
                  <div className="echk"><span className="box" /><span>Confirm the rollout timeline with Dana</span></div>
                </div>
                <div className="attach" style={{ marginBottom: 15 }}>
                  <div className="athumb" style={{ background: 'linear-gradient(135deg,#26303f,#161b24)' }}>{sw('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>', 'var(--pink-400)', 19, 'none', 1.8)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>partnership-terms.pdf</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>240 KB</div></div>
                  <button className="eact" style={{ height: 30, padding: '0 12px', background: 'var(--accent-weak)', color: 'var(--accent)' }}>Review</button>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--divider)', padding: '12px 14px' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Suggested actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="eact" style={{ background: 'var(--accent)', color: '#fff' }}>{sw('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 'currentColor', 15)}Draft reply</button>
                  <button className="eact" style={{ background: 'var(--surface-2)', border: '1px solid var(--hair)', color: 'var(--fg)' }}>{sw('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', 'currentColor', 15)}Add to Tracker</button>
                  <button className="eact" style={{ background: 'var(--surface-2)', border: '1px solid var(--hair)', color: 'var(--fg)' }}>{sw('<path d="M5 12h14M13 6l6 6-6 6"/>', 'currentColor', 15)}Send to Elon</button>
                  <button className="eact" style={{ background: 'var(--surface-2)', border: '1px solid var(--hair)', color: 'var(--fg)' }}>{sw('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>', 'currentColor', 15)}Snooze</button>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding: '13px 16px', marginBottom: 12, opacity: .78 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="glyph" style={{ width: 30, height: 30, background: 'var(--chip)' }}>{sw('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', 'var(--violet-400)', 15)}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Space Rising · Elon</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Hit a snag on the resolver · needs you</div></div><span className="mono" style={{ fontSize: 10, color: 'var(--faint)' }}>now</span></div>
            </div>
            <div className="card" style={{ padding: '13px 16px', opacity: .5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div className="glyph" style={{ width: 30, height: 30, background: 'var(--chip)' }}>{sw('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', 'var(--accent)', 15)}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>Marcus Lee · Included Health</div><div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Reviewed the culture deck · two notes</div></div></div>
            </div>
          </div>
        </div>

        {/* ALL ROOMS */}
        <div className="col rooms">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flex: 'none' }}>
            <span className="eyebrow">All rooms</span><span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{roomTotal}</span>
            <button onClick={onNewRoom} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px', borderRadius: 14, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{sw('<path d="M12 5v14M5 12h14"/>', 'currentColor', 14, 'none', 2.4)}New</button>
          </div>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 38, marginBottom: 14, padding: '0 12px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)' }}>
            {sw('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'var(--muted)', 16)}<span style={{ flex: 1, fontSize: 13, color: 'var(--faint)' }}>Search rooms and agents</span><span className="kbd">K</span>
          </div>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 13, padding: '0 2px', fontSize: 11, color: 'var(--faint)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="kbd">up</span><span className="kbd">dn</span> move</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="kbd">right</span> open</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="kbd">K</span> jump</span>
          </div>
          <div className="scrollcap" style={{ flex: 1 }}>
            <div className="subhdr">Agents · {agentTotal}</div>
            <div style={{ marginBottom: 16 }}>
              {agents.map((ag) => (
                <div key={ag.name} className={`room${selected === ag.name ? ' sel' : ''}`} onClick={() => pick(ag.name)}>
                  <span className="dot" style={{ background: ag.dot, boxShadow: ag.glow ? 'var(--glow-online,0 0 8px rgba(52,211,153,.6))' : 'none' }} />
                  <span className="rn" style={{ fontWeight: selected === ag.name ? 600 : 500 }}>{ag.name}</span>
                  {ag.note && <span className={ag.noteAccent ? '' : 'mono'} style={{ fontSize: ag.noteAccent ? 11 : 10.5, color: ag.noteAccent ? 'var(--accent)' : 'var(--faint)', fontWeight: ag.noteAccent ? 600 : 400 }}>{ag.note}</span>}
                  {selected === ag.name && <span className="kbd" style={{ marginLeft: 8 }}>right</span>}
                </div>
              ))}
            </div>
            <div className="subhdr">Projects · {projectTotal}</div>
            {projects.map((p) => (
              <div key={p.name} className={`room${selected === p.name ? ' sel' : ''}`} onClick={() => pick(p.name)}>
                {sw('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', p.color, 18)}
                <span className="rn" style={{ fontWeight: 500 }}>{p.name}</span>
                {p.badge != null
                  ? <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.badge}</span>
                  : <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.count}</span>}
              </div>
            ))}
            <button style={{ width: '100%', height: 38, marginTop: 6, borderRadius: 10, border: '1px dashed var(--hair)', background: 'transparent', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Show {Math.max(0, projectTotal - projects.length)} more projects</button>
          </div>
        </div>

        {/* CONVERSATION */}
        <div className="col convo">
          {isAgent ? <AgentConvo name={selected} onOpenFiles={onOpenFiles} /> : <ProjectConvo name={selected} onOpenFiles={onOpenFiles} />}
        </div>
      </div>
    </div>
  );
}

export default DesktopHomeView;
