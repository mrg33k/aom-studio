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
.cv6dh .av { width:40px; height:40px; border-radius:50%; background:var(--avatar); display:flex; align-items:center; justify-content:center; color:var(--bone); font-size:15px; font-weight:600; flex:none; }
.cv6dh .topbar { flex:none; display:flex; align-items:center; gap:22px; padding:16px 28px; border-bottom:1px solid var(--divider); }
.cv6dh .eyebrow { font-size:11px; font-weight:600; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); }
.cv6dh .toolnav { flex:1; display:flex; justify-content:center; gap:8px; }
.cv6dh .ctile { width:66px; flex:none; display:flex; flex-direction:column; align-items:center; gap:5px; padding:8px 0 7px; border-radius:var(--radius-control,12px); background:var(--surface); border:1px solid var(--hair); color:var(--muted); cursor:pointer; transition:background .14s,color .14s; }
.cv6dh .ctile:hover { color:var(--fg); }
.cv6dh .ctile.on { background:var(--accent); border-color:transparent; color:var(--bone); }
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
/* Empty wired catch-up drops its column entirely (Patrik: same as /dashboard); the
   conversation pane flexes to use the space. Rooms caps so its rows don't stretch
   sparse across half the viewport (same fix class as the iPad-portrait cap). */
.cv6dh.nocatch .convo { width:auto; flex:1; min-width:0; }
.cv6dh.nocatch .rooms { max-width:640px; }
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
.cv6dh .cmd { width:40px; height:40px; border-radius:11px; background:var(--accent); color:var(--bone); display:flex; align-items:center; justify-content:center; flex:none; }
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
                  <div style={{ width: '60%', maxWidth: 26, height: h, borderRadius: '6px 6px 2px 2px', background: 'var(--accent)' }} />
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
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-2)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: 'var(--accent)' }} /></div>
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
 roomsLoading = false, // first data fetch still in flight, show honest loading, not "0"
  activeTool = 'home',
  onNav,
  onSelectRoom,
  onNewRoom,
  onOpenFiles,
  catchContent = null,   // live slot: real Catch Up cards (sample rich cards when null)
  renderConvo = null,    // live slot: (selectedName, isAgent) => real conversation (sample dashboard when null)
}) {
  const agentNames = agents.map((a) => a.name);
  const [selected, setSelected] = useState(agentNames[0] || 'Elon');
  const isAgent = agentNames.indexOf(selected) >= 0;
  const pick = (name) => { setSelected(name); if (onSelectRoom) onSelectRoom(name); };
  // Wired (catchContent provided) + empty = no Catch Up column at all (Patrik 2026-07-06;
  // /dashboard already drops its column). The design-sample mode (catchContent null) keeps it.
  const hideCatch = catchContent != null && catchTotal === 0;

  return (
    <div className={`cv6dh${hideCatch ? ' nocatch' : ''}`} data-cv6kit data-theme={theme}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* APP BAR */}
      <div className="topbar">
        <div style={{ flex: 'none' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110.72 24.00" fill="var(--fg)" style={{ display: 'block', height: 22, width: 'auto' }}>
            <g transform="scale(0.034942,0.034942)">
              <g transform="translate(-296.997118,1009.000000) scale(0.100000,-0.100000)"><path d="M2972 6658 l3 -3433 475 0 475 0 5 2955 5 2955 2818 3 2817 2 0 475 0 475 -3300 0 -3300 0 2 -3432z"></path><path d="M5120 8516 c0 -2 33 -17 73 -32 856 -325 1618 -949 2196 -1798 l101 -149 213 -43 c344 -69 672 -159 996 -274 79 -28 146 -49 148 -46 11 10 -162 274 -302 461 -580 774 -1380 1348 -2322 1664 -272 92 -652 174 -918 201 -60 5 -127 13 -147 15 -21 3 -38 3 -38 1z"></path><path d="M4950 8182 c0 -4 21 -28 46 -52 66 -65 208 -236 308 -374 198 -272 371 -576 526 -926 l47 -105 237 -17 c258 -18 470 -38 725 -69 90 -11 166 -17 168 -15 17 17 -289 379 -484 572 -346 344 -690 593 -1108 801 -158 79 -465 201 -465 185z"></path><path d="M4432 7458 l3 -722 525 3 c289 1 527 4 529 7 5 5 -147 304 -220 431 -185 321 -408 614 -635 834 -99 95 -185 169 -198 169 -3 0 -5 -325 -4 -722z"></path><path d="M4508 6373 l-78 -4 0 -693 0 -693 790 1 c628 1 790 4 790 14 0 7 -16 92 -36 189 -70 348 -169 711 -281 1038 l-48 140 -75 6 c-77 7 -924 8 -1062 2z"></path><path d="M6020 6347 c0 -2 16 -50 35 -108 99 -289 199 -674 270 -1032 26 -127 47 -232 48 -233 1 -1 124 -9 272 -18 308 -19 740 -57 988 -86 225 -27 211 -28 203 16 -12 60 -135 432 -188 564 -144 363 -341 756 -383 765 -195 44 -1245 155 -1245 132z"></path><path d="M7730 6117 c0 -2 33 -73 74 -158 159 -332 311 -754 406 -1126 6 -24 12 -43 14 -43 20 0 435 -78 559 -105 174 -38 502 -121 607 -154 35 -11 65 -19 67 -17 5 5 -28 163 -68 321 -64 251 -200 646 -280 809 -20 41 -32 52 -69 66 -25 10 -126 49 -225 88 -298 115 -573 201 -909 282 -162 40 -176 43 -176 37z"></path><path d="M4725 4620 c-148 -4 -276 -8 -283 -9 -10 -1 -12 -143 -10 -693 l3 -693 815 -3 c448 -2 834 0 858 3 l42 6 0 172 c0 232 -16 563 -41 842 -18 208 -36 365 -42 371 -7 7 -1115 11 -1342 4z"></path><path d="M6425 4584 c5 -22 30 -292 46 -504 6 -80 14 -305 18 -500 l6 -355 750 -3 c413 -1 765 0 784 3 l34 6 -7 162 c-8 203 -23 395 -42 562 -17 155 -73 497 -83 507 -22 24 -926 112 -1368 134 -136 6 -142 6 -138 -12z"></path><path d="M8304 4383 c47 -236 84 -600 94 -943 l7 -215 580 0 580 0 -1 250 c-1 266 -27 611 -47 632 -26 25 -461 149 -728 207 -141 31 -471 96 -486 96 -2 0 -2 -12 1 -27z"></path></g>
            </g>
            <g transform="translate(31.06,19.920) scale(0.02400,-0.02400)">
              <g transform="translate(0.00,0)"><path d="M375.6148734912276 -13.670593746006489Q299.17066349834204 -13.670593746006489 238.62717498093843 7.702420189976692Q178.08368646353483 29.075434125959873 135.77228194847703 71.77184307947755Q93.46087743341923 114.46825203299522 71.23275538906455 177.2757788784802Q49.00463334470987 240.08330572396517 49.00463334470987 322.78564453125Q49.00463334470987 407.33319963514805 71.73672315850854 472.20820036157966Q94.4688129723072 537.0832010880113 136.77029951661825 582.3768698051572Q179.0717860609293 627.6705385223031 236.98832048475742 650.6705661341548Q294.90485490858555 673.6705937460065 366.1030893474817 673.6705937460065Q421.4243101105094 673.6705937460065 468.17815290391445 659.4543488509953Q514.9319956973195 645.2381039559841 549.1958218552172 617.9802032932639Q583.4596480131149 590.7223026305437 602.888210721314 551.982254024595Q622.316773429513 513.2422054186463 623.0231381356716 464.3731854110956L489.53693353384733 428.50458393245935Q489.88220505416393 471.39777095615864 471.3999030701816 499.3424111008644Q452.9176010861993 527.2870512455702 423.61968848854303 541.6998315230012Q394.3217758908868 556.1126118004322 361.12304735928774 556.1126118004322Q332.4639325812459 556.1126118004322 303.48544723168015 544.3148532435298Q274.5069618821144 532.5170946866274 251.09405662864447 506.0724240243435Q227.68115137517452 479.6277533620596 213.52032155916095 436.99646674096584Q199.35949174314737 394.3651801198721 199.35949174314737 331.7219277024269Q199.35949174314737 250.80877685546875 222.73266407847404 200.70138404518366Q246.10583641380072 150.59399123489857 287.2370954230428 127.07604617252946Q328.36835443228483 103.55810111016035 379.42835053801537 103.55810111016035Q433.62708197534084 103.55810111016035 464.26624455302954 126.04620216041803Q494.90540713071823 148.53430321067572 508.39765760302544 184.21106368675828Q521.8899080753326 219.88782416284084 523.1082313135266 259.66211760789156L649.0310155451298 238.85675339400768Q648.1579667329788 185.62273927778006 633.2016049325466 139.51568216085434Q618.2452431321144 93.40862504392862 586.0686977319419 58.9523271843791Q553.8921523317695 24.49602932482958 501.8605366051197 5.412717789411545Q449.82892087846994 -13.670593746006489 375.6148734912276 -13.670593746006489Z"></path></g>
              <g transform="translate(670.00,0)"><path d="M304.44445994496346 -13.670593746006489Q225.22241307795048 -13.670593746006489 165.0181877501309 17.64095899835229Q104.8139624223113 48.95251174271107 70.6771499402821 110.69057936966419Q36.54033745825291 172.42864699661732 36.54033745825291 263.9483027383685Q36.54033745825291 356.3529629185796 71.11171807348728 417.3568696528673Q105.68309868872166 478.36077638715506 166.2166692353785 508.6802050881088Q226.75023978203535 538.9996337890625 303.9920034259558 538.9996337890625Q382.59887743741274 538.9996337890625 443.19793943315744 507.9281921386719Q503.79700142890215 476.85675048828125 538.2493344247341 415.5234375Q572.7016674205661 354.19012451171875 572.7016674205661 262.16247510164976Q572.7016674205661 168.6150507852435 537.5648563914001 107.12502979114652Q502.4280453622341 45.63500879704952 441.4877362921834 15.982207525521517Q380.5474272221327 -13.670593746006489 304.44445994496346 -13.670593746006489ZM309.0753789022565 92.86779639869928Q347.9805331751704 92.86779639869928 374.5066579170525 111.04656691849232Q401.0327826589346 129.22533743828535 414.6798168346286 165.55300394818187Q428.32685101032257 201.88067045807838 428.32685101032257 254.00396486371756Q428.32685101032257 308.992308601737 413.76316034048796 347.4747006855905Q399.19946967065334 385.957092769444 371.09396919235587 406.69931127130985Q342.9884687140584 427.4415297731757 300.4801640585065 427.4415297731757Q262.57104201614857 427.4415297731757 235.55483524501324 409.49890257790685Q208.5386284738779 391.556275382638 194.80825079232454 355.4667360819876Q181.07787311077118 319.37719678133726 181.07787311077118 265.94036719948053Q181.07787311077118 181.0629844069481 214.82631792500615 136.9653904028237Q248.57476273924112 92.86779639869928 309.0753789022565 92.86779639869928Z"></path></g>
              <g transform="translate(1269.00,0)"><path d="M66.48876517266035 0V253.72314842045307L66.48082963377237 525.325072273612H185.48723348230124L185.56230430305004 346.22208465635777H205.28447614610195Q212.9115494042635 412.83275204896927 232.2111421637237 454.8664780892432Q251.51073492318392 496.9002041295171 286.6614375039935 517.1920139379799Q321.8121400848031 537.4838237464428 374.2167537584901 537.4838237464428Q383.0858289897442 537.4838237464428 393.61563957855105 536.6425476074219Q404.1454501673579 535.801271468401 418.0820297971368 532.7972484752536L412.3717641681433 380.4662606343627Q396.5900903120637 387.25190225988626 378.87591940164566 389.9066539928317Q361.1617484912276 392.56140572577715 347.2371913343668 392.56140572577715Q308.1934848353267 392.56140572577715 279.8879069983959 374.97778610885143Q251.58232916146517 357.3941664919257 234.5266641303897 323.804558891803Q217.4709990993142 290.21495129168034 210.80010598897934 241.6473655179143V0Z"></path></g>
              <g transform="translate(1693.00,0)"><path d="M66.48876517266035 0V318.36537486314774L66.48082963377237 525.325072273612H183.96745857596397L183.22905234992504 367.7458331435919H202.7885049507022Q215.9473174586892 425.3013790100813 239.7846301868558 463.3945838101208Q263.6219429150224 501.48778861016035 300.3957190141082 520.2437111996114Q337.169495113194 538.9996337890625 386.8519311323762 538.9996337890625Q477.9072967991233 538.9996337890625 525.3020433671772 475.0493093840778Q572.6967899352312 411.0989849790931 572.6967899352312 273.91298228502274V0H428.20289393514395V258.38948956131935Q428.20289393514395 342.06041172891855 403.843607340008 380.4613904207945Q379.4843207448721 418.8623691126704 331.80944533646107 418.8623691126704Q291.6146758571267 418.8623691126704 264.8108116053045 394.1319885253906Q238.00694735348225 369.4016079381108 224.3321446031332 328.54817708581686Q210.65734185278416 287.6947462335229 210.0064648836851 238.3216276690364V0Z"></path></g>
              <g transform="translate(2314.00,0)"><path d="M310.38074021041393 -13.670593746006489Q245.38886466622353 -13.670593746006489 194.7521146722138 4.154812768101692Q144.11536467820406 21.980219282209873 108.88531978428364 56.212364319711924Q73.65527489036322 90.44450935721397 55.09780617430806 139.99407159909606Q36.54033745825291 189.54363384097815 36.54033745825291 252.99591306596994Q36.54033745825291 315.36493307352066 54.37758915126324 367.8430522121489Q72.21484084427357 420.32117135077715 106.12744092196226 458.6921723373234Q140.04004099965096 497.0631733238697 189.16885690763593 518.0314035564661Q238.2976728156209 538.9996337890625 300.06732419878244 538.9996337890625Q360.17804100364447 538.9996337890625 407.01315477117896 519.2695932537317Q453.84826853871346 499.53955271840096 485.2013884037733 460.67264157161117Q516.5545082688332 421.8057304248214 531.4235907644033 365.3732973113656Q546.2926732599735 308.94086419790983 541.6737186461687 235.5202108696103L130.2769736647606 232.44483196735382V311.01556880772114L459.01626344025135 314.0671439990401L408.4137059748173 274.05916195362806Q414.87793792039156 327.23817080259323 401.0781925730407 361.21070159226656Q387.2784472256899 395.1832323819399 360.63534884899855 411.30047922208905Q333.9922504723072 427.4177260622382 301.53155905008316 427.4177260622382Q263.6463046595454 427.4177260622382 234.82659984752536 407.1636057049036Q206.0068950355053 386.909485347569 190.12777249887586 348.6909484863281Q174.24864996224642 310.47241162508726 174.24864996224642 255.59899950772524Q174.24864996224642 171.10662696510553 211.42147754505277 131.18166872113943Q248.59430512785912 91.25671047717333 309.9284086674452 91.25671047717333Q338.08729092776775 91.25671047717333 357.4009539857507 98.75869872048497Q376.7146170437336 106.26068696379662 389.429064065218 118.21708218753338Q402.14351108670235 130.17347741127014 409.6515963077545 145.24501206725836Q417.1596815288067 160.31654672324657 421.5248529314995 175.45167177915573L546.70154825598 147.9360390305519Q538.4593602716923 111.13842434436083 520.5525578074157 81.42025224119425Q502.6457553431392 51.70208013802767 473.70333886519074 30.426385547965765Q444.7609223872423 9.150690957903862 404.4753999263048 -2.2599513940513134Q364.1898774653673 -13.670593746006489 310.38074021041393 -13.670593746006489Z"></path></g>
              <g transform="translate(2885.00,0)"><path d="M66.48876517266035 0V253.72314842045307L66.48082963377237 525.325072273612H185.48723348230124L185.56230430305004 346.22208465635777H205.28447614610195Q212.9115494042635 412.83275204896927 232.2111421637237 454.8664780892432Q251.51073492318392 496.9002041295171 286.6614375039935 517.1920139379799Q321.8121400848031 537.4838237464428 374.2167537584901 537.4838237464428Q383.0858289897442 537.4838237464428 393.61563957855105 536.6425476074219Q404.1454501673579 535.801271468401 418.0820297971368 532.7972484752536L412.3717641681433 380.4662606343627Q396.5900903120637 387.25190225988626 378.87591940164566 389.9066539928317Q361.1617484912276 392.56140572577715 347.2371913343668 392.56140572577715Q308.1934848353267 392.56140572577715 279.8879069983959 374.97778610885143Q251.58232916146517 357.3941664919257 234.5266641303897 323.804558891803Q217.4709990993142 290.21495129168034 210.80010598897934 241.6473655179143V0Z"></path></g>
            </g>
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
        {/* CATCH UP — dropped entirely when wired and empty */}
        {!hideCatch && (
        <div className="col catch">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14, flex: 'none' }}>
            <span className="eyebrow">Catch up</span>
            {/* zero is not a call to action — mute the badge when nothing needs you (Steffen R1) */}
            <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: catchTotal > 0 ? 'var(--accent-weak)' : 'var(--chip)', color: catchTotal > 0 ? 'var(--accent)' : 'var(--faint)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{catchTotal}</span>
            {/* "1 of N · swipe" is sample-deck furniture; the wired column is a scroll list */}
            {catchContent == null && (
              <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--muted)' }}>1 of {catchTotal} · <span className="mono">swipe</span></span>
            )}
          </div>
          <div className="scrollcap" style={{ flex: 1 }}>
            {catchContent != null ? catchContent : (<>
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
                  <div className="athumb" style={{ background: 'var(--surface)' }}>{sw('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>', 'var(--pink-400)', 19, 'none', 1.8)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>partnership-terms.pdf</div><div className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>240 KB</div></div>
                  <button className="eact" style={{ height: 30, padding: '0 12px', background: 'var(--accent-weak)', color: 'var(--accent)' }}>Review</button>
                </div>
              </div>
              <div style={{ borderTop: '1px solid var(--divider)', padding: '12px 14px' }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}>Suggested actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="eact" style={{ background: 'var(--accent)', color: 'var(--bone)' }}>{sw('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 'currentColor', 15)}Draft reply</button>
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
            </>)}
          </div>
        </div>
        )}

        {/* ALL ROOMS */}
        <div className="col rooms">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flex: 'none' }}>
            <span className="eyebrow">All rooms</span><span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{roomsLoading ? '···' : roomTotal}</span>
            <button onClick={onNewRoom} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, height: 28, padding: '0 11px', borderRadius: 14, border: 'none', background: 'var(--accent)', color: 'var(--bone)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{sw('<path d="M12 5v14M5 12h14"/>', 'currentColor', 14, 'none', 2.4)}New</button>
          </div>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, height: 38, marginBottom: 14, padding: '0 12px', borderRadius: 11, background: 'var(--surface-2)', border: '1px solid var(--hair)' }}>
            {sw('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 'var(--muted)', 16)}<span style={{ flex: 1, fontSize: 13, color: 'var(--faint)' }}>cmd+K to search</span>
          </div>
          <div className="scrollcap" style={{ flex: 1 }}>
            <div className="subhdr">Agents · {agentTotal}</div>
            <div style={{ marginBottom: 16 }}>
              {agents.map((ag) => (
                <div key={ag.name} className={`room${selected === ag.name ? ' sel' : ''}`} onClick={() => pick(ag.name)}>
                  <span className="dot" style={{ background: ag.dot, boxShadow: ag.glow ? 'var(--glow-online,0 0 8px rgba(52,211,153,.6))' : 'none' }} />
                  <span className="rn" style={{ fontWeight: selected === ag.name ? 600 : 500 }}>{ag.name}</span>
                  {ag.note && <span className={ag.noteAccent ? '' : 'mono'} style={{ fontSize: ag.noteAccent ? 11 : 10.5, color: ag.noteAccent ? 'var(--accent)' : 'var(--faint)', fontWeight: ag.noteAccent ? 600 : 400 }}>{ag.note}</span>}
                  {selected === ag.name && <span className="kbd" style={{ marginLeft: 8 }} title="Press → to open">→</span>}
                </div>
              ))}
            </div>
            <div className="subhdr">Projects · {roomsLoading && projects.length === 0 ? '···' : projectTotal}</div>
            {roomsLoading && projects.length === 0 && (
              <div aria-label="Loading rooms">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="room" style={{ pointerEvents: 'none' }}>
                    <span style={{ flex: 'none', width: 18, height: 14, borderRadius: 4, background: 'var(--chip)', opacity: 0.55 }} />
                    <span style={{ height: 10, borderRadius: 5, background: 'var(--chip)', opacity: 0.55, width: `${62 - i * 9}%` }} />
                  </div>
                ))}
                <div style={{ padding: '10px 2px', fontSize: 11.5, color: 'var(--faint)' }}>Loading your rooms…</div>
              </div>
            )}
            {projects.map((p) => (
              <div key={p.name} className={`room${selected === p.name ? ' sel' : ''}`} onClick={() => pick(p.name)}>
                {sw('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', p.color, 18)}
                <span className="rn" style={{ fontWeight: 500 }}>{p.name}</span>
                {p.badge != null
                  ? <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: 'var(--accent)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.badge}</span>
                  : <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.count}</span>}
              </div>
            ))}
            {projectTotal > projects.length && (
              <button style={{ width: '100%', height: 38, marginTop: 6, borderRadius: 10, border: '1px dashed var(--hair)', background: 'transparent', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>Show {projectTotal - projects.length} more projects</button>
            )}
          </div>
        </div>

        {/* CONVERSATION */}
        <div className="col convo">
          {renderConvo ? renderConvo(selected, isAgent) : (isAgent ? <AgentConvo name={selected} onOpenFiles={onOpenFiles} /> : <ProjectConvo name={selected} onOpenFiles={onOpenFiles} />)}
        </div>
      </div>
    </div>
  );
}

export const SAMPLE_HOME = {
  greeting: 'Good evening, Patrik.',
  catchTotal: 5,
  agentTotal: 11,
  projectTotal: 84,
  roomTotal: 95,
  agents: SAMPLE_AGENTS,
  projects: SAMPLE_PROJECTS,
};

export default DesktopHomeView;