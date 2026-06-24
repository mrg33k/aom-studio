// cv6next — the live Goal Thread (agent-talk), mobile.
//
// The agent emits structured blocks on a message's metadata.blocks (step | success |
// data | choice | question, each keyed to a stepIndex). This renderer groups them by
// stepIndex and draws each result UNDER its step, matching the wired Chat kit
// (wired/tools/chat.html). The thread is built from REAL agent output: a step shows
// done/active/pending from its own state, never a timer, and each result attaches to
// the step that produced it. Choice/question taps and the composer post a real user
// message back into the room (no dead controls).
//
// Source of truth for the look: ccds6 wired/tools/chat.html (mobile screen) + cv6.css.
// We author the renderer (rather than mount the template) because each step TYPE has
// different markup, which a single data-each loop can't express.

import React, { useMemo, useState } from 'react';

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// blocks[] -> ordered steps, each owning its result blocks (grouped by stepIndex).
export function buildSteps(blocks) {
  if (!Array.isArray(blocks)) return [];
  const byIndex = new Map();
  const ensure = (i) => {
    const key = Number.isFinite(+i) ? +i : 0;
    if (!byIndex.has(key)) byIndex.set(key, { index: key, title: '', detail: '', state: 'pending', results: [] });
    return byIndex.get(key);
  };
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    const step = ensure(b.stepIndex);
    if (b.type === 'step') {
      step.title = b.title || step.title;
      step.detail = b.detail || step.detail;
      step.state = b.state || step.state;
    } else {
      step.results.push(b);
      // A step with no explicit step block still gets a heading from its first result.
      if (!step.title && b.title) step.title = b.title;
    }
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

// data block -> generic cells + per-row chart pct (first numeric column, relative to max).
function normalizeData(b) {
  const columns = Array.isArray(b.columns) ? b.columns : [];
  const rawRows = Array.isArray(b.rows) ? b.rows : [];
  const rows = rawRows.map((r) => (Array.isArray(r) ? { cells: r } : { cells: r?.cells || [] }));
  const metricOf = (cells) => num(cells[1]);
  const max = rows.reduce((m, r) => Math.max(m, metricOf(r.cells)), 0);
  rows.forEach((r) => { r.pct = max > 0 ? Math.round((metricOf(r.cells) / max) * 100) : 0; });
  const totals = b.totals ? (Array.isArray(b.totals) ? { cells: b.totals } : { cells: b.totals.cells || [] }) : null;
  return { title: b.title || 'Data', columns, rows, totals };
}

// The three step-state icons (pending ring / working spinner / done check). The kit's
// CSS (.gstep.is-* .gsico .i-*) reveals exactly one per step state, so we always render
// all three and let the class on the parent .gstep pick. Spinner spin comes from CSS too.
const StepIcons = (
  <span className="gsico">
    <span className="i-pend"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /></svg></span>
    <span className="i-work"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg></span>
    <span className="i-done"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
  </span>
);

// One step on the rail (real kit .gstep). State drives the icon + chip via CSS classes.
// Result blocks attach under the step in .gsattach (always shown when present, because a
// real result only exists because the agent emitted it — no demo show-on-done gate).
function StepRow({ step }) {
  const state = step.state === 'done' ? 'done' : (step.state === 'active' || step.state === 'working') ? 'active' : 'pending';
  return (
    <div className={`gstep is-${state}`} data-step={step.index}>
      <div className="gsrail">
        {StepIcons}
        <span className="gsline" />
      </div>
      <div className="gsbody">
        <div>
          <span className="gstitle">{step.title || 'Step'}</span>
          <span className="gschip c-work">Working</span>
          <span className="gschip c-done">Done</span>
        </div>
        {step.detail ? <div className="gssub">{step.detail}</div> : null}
        {step.results.length ? (
          <div className="gsattach step-in" style={{ display: 'block' }}>
            {step.results.map((r, i) => <Result key={i} block={r} />)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Result({ block }) {
  if (block.type === 'success') {
    return (
      <div className="cblk is-success" style={{ marginTop: 4 }}>
        <div className="cblk-h">
          <span className="ci"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg></span>
          <span className="ct">{block.title || 'Done'}</span>
        </div>
        {block.detail ? <div className="cblk-b" style={{ fontSize: 12.5 }}>{block.detail}</div> : null}
      </div>
    );
  }
  if (block.type === 'data') return <DataBlock block={block} />;
  if (block.type === 'choice') return <ChoiceBlock block={block} />;
  if (block.type === 'question') return <QuestionBlock block={block} />;
  return null;
}

// Spreadsheet block on the real kit .cdata / .tbl (table) + .bars (chart), with the kit
// Table/Chart toggle. Column grid is computed once and applied to every row inline (the
// kit sets grid-template-columns per .tr the same way).
function DataBlock({ block }) {
  const d = useMemo(() => normalizeData(block), [block]);
  const [view, setView] = useState('table');
  const cols = d.columns.length || (d.rows[0]?.cells.length || 1);
  const grid = `1.1fr ${Array(Math.max(0, cols - 1)).fill('1fr').join(' ')}`.trim();
  return (
    <div className="cdata" style={{ marginTop: 4 }}>
      <div className="cdata-h">
        <span className="dt">{d.title}</span>
        <div className="toggle">
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
          <button className={view === 'chart' ? 'on' : ''} onClick={() => setView('chart')}>Chart</button>
        </div>
      </div>
      {view === 'table' ? (
        <div className="tbl">
          {d.columns.length ? (
            <div className="tr th" style={{ gridTemplateColumns: grid }}>
              {d.columns.map((c, i) => <div key={i} className={i === 0 ? '' : 'num'}>{c}</div>)}
            </div>
          ) : null}
          {d.rows.map((r, ri) => (
            <div key={ri} className="tr" style={{ gridTemplateColumns: grid }}>
              {r.cells.map((cell, ci) => <div key={ci} className={ci === 0 ? '' : 'num'}>{cell}</div>)}
            </div>
          ))}
          {d.totals ? (
            <div className="tr tf" style={{ gridTemplateColumns: grid }}>
              {d.totals.cells.map((cell, ci) => <div key={ci} className={ci === 0 ? '' : 'num pos'}>{cell}</div>)}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="bars">
          {d.rows.map((r, ri) => (
            <div key={ri} className="bar">
              <i style={{ height: `${Math.max(4, r.pct)}%` }} />
              <span>{r.cells[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Tappable choices (real kit .chips / .chip-btn). The recommended option is is-primary.
// A tap posts a real user message back into the room (no dead controls).
function ChoiceBlock({ block }) {
  const choices = Array.isArray(block.choices) ? block.choices : [];
  const send = useThreadSend();
  return (
    <div style={{ marginTop: 4 }}>
      {block.prompt ? <div className="gssub" style={{ marginBottom: 6 }}>{block.prompt}</div> : null}
      <div className="chips">
        {choices.map((c) => (
          <button key={c.id} className={`chip-btn ${c.style === 'alt' ? '' : 'is-primary'}`}
            onClick={() => send(c.title || c.label || c.id)}>
            {c.title || c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// A question the agent needs answered (real kit .cblk is-question). Options become
// tappable reply chips; tapping posts the answer as a real user message.
function QuestionBlock({ block }) {
  const opts = Array.isArray(block.options) ? block.options : [];
  const send = useThreadSend();
  return (
    <div className="cblk is-question" style={{ marginTop: 4 }}>
      <div className="cblk-h">
        <span className="ci"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6" /><path d="M12 17h.01" /></svg></span>
        <span className="ct">Quick question</span>
      </div>
      <div className="cblk-b">{block.text}</div>
      {opts.length ? (
        <div className="chips">
          {opts.map((o) => <button key={o.id} className="chip-btn" onClick={() => send(o.label)}>{o.label}</button>)}
        </div>
      ) : null}
    </div>
  );
}

// Lightweight context so choice/question taps reach the room's send() without prop drilling.
const SendCtx = React.createContext(() => {});
function useThreadSend() { return React.useContext(SendCtx); }

// The thread itself (goal header + steps with their results), shared by the mobile screen
// and the desktop 3-column layout. Wrap in a SendCtx provider so taps post real messages.
export function GoalThreadBody({ goal, blocks }) {
  const steps = useMemo(() => buildSteps(blocks), [blocks]);
  const headTitle = goal?.title || 'Working thread';
  // Count from the steps the thread actually renders, so the header + progress bar always
  // match what's on screen (rather than a goal.total that may not line up with the blocks).
  const total = steps.length;
  const done = steps.filter((s) => s.state === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="gthread">
      <div className="gthead">
        <span className="gtico">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>
        </span>
        <span className="gttitle"><span className="gk">Goal:</span> {headTitle}</span>
        <span className="gtcount">{done} of {total}</span>
      </div>
      <div className="gtprog" style={{ margin: '0 0 14px' }}><i style={{ width: `${pct}%` }} /></div>
      {steps.map((s) => <StepRow key={s.index} step={s} />)}
      <div style={{ height: 8 }} />
    </div>
  );
}

export { SendCtx };

export default function ChatGoalThread({ room, goal, blocks, onBack, onOpenNav, onSend }) {
  const [draft, setDraft] = useState('');
  const submit = () => { const t = draft.trim(); if (!t) return; onSend?.(t); setDraft(''); };
  return (
    <SendCtx.Provider value={onSend || (() => {})}>
      <div data-cv6 data-theme="dark" className="cv6-screen" style={{ position: 'relative', width: '100%', height: '100%', background: '#05080b', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="mhdr">
          <div className="mback" onClick={onBack}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></div>
          <div style={{ position: 'relative', flex: 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--avatar)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{room.initials || '·'}</div>
            <span className={`sdot is-${room.status || 'ready'}`} style={{ position: 'absolute', bottom: -1, right: -1, width: 11, height: 11, border: '2px solid var(--ground)' }} />
          </div>
          <div className="mhtitle">
            <div className="mttl">{room.name}</div>
            <div className="msub">{room.statusText || 'thread'}{goal?.total ? <> · step {goal.step} of {goal.total}</> : null}</div>
          </div>
          <div className="mhactions">
            <div className="ib" style={{ width: 36, height: 36, borderRadius: 10 }} onClick={onOpenNav}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg></div>
          </div>
        </div>
        <div className="scrbody" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 0' }}>
          <GoalThreadBody goal={goal} blocks={blocks} />
        </div>
        <div className="mcomposer">
          <button onClick={submit} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: 'var(--ring-accent)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><path d="M9.5 9.5c.8-1.2 4.2-1.2 5 0" /></svg>
          </button>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder={`Nudge ${room.name}, or jump in…`}
            style={{ flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', padding: '0 14px', fontSize: 14, color: 'var(--fg)', fontFamily: 'var(--font-sans)', outline: 'none' }} />
          <button onClick={submit} style={{ width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" /></svg>
          </button>
        </div>
      </div>
    </SendCtx.Provider>
  );
}
