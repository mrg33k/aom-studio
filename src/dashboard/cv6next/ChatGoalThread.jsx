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

const Ico = {
  check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>,
  warn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17v.01" /><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" /></svg>,
  spin: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" style={{ animation: 'spin 1.1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>,
  dash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /></svg>,
};

function StepRow({ step, goal }) {
  const needs = step.results.some((r) => r.type === 'choice' || r.type === 'question');
  const kind = needs ? 'needs' : step.state === 'done' ? 'done' : step.state === 'active' ? 'working' : 'pending';
  const iconBg = { done: 'var(--success-weak)', needs: 'var(--warn-weak,rgba(251,191,36,.16))', working: 'var(--accent-weak)', pending: 'var(--chip)' }[kind];
  const icon = { done: Ico.check, needs: Ico.warn, working: Ico.spin, pending: Ico.dash }[kind];
  const chip = { done: ['Done', 'var(--success)', 'var(--success-weak)'], needs: ['Needs you', 'var(--warn)', 'var(--warn-weak,rgba(251,191,36,.16))'], working: ['Working', 'var(--accent)', 'var(--accent-weak)'], pending: ['Up next', 'var(--faint)', 'var(--chip)'] }[kind];
  const cardStyle = kind === 'done'
    ? { background: 'transparent', padding: '7px 0 0' }
    : { background: 'var(--surface)', border: '1px solid var(--hair)', padding: '12px 13px' };
  return (
    <div className="step">
      <div className="step-ico" style={{ background: iconBg, width: 34, height: 34 }}>{icon}</div>
      <div className="step-card" style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="step-title" style={{ fontSize: 14, color: kind === 'pending' ? 'var(--muted)' : undefined }}>{step.title || 'Step'}</span>
          <span className="pill-chip" style={{ color: chip[1], background: chip[2] }}>{chip[0]}</span>
        </div>
        {step.detail ? <div className="step-sub" style={{ fontSize: 12.5 }}>{step.detail}</div> : null}
        {kind === 'working' && goal?.total ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 10 }}>
            <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'var(--surface-2)', overflow: 'hidden' }}>
              <div style={{ width: `${goal.pct || 0}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),#6366F1)' }} />
            </div>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{goal.step}/{goal.total}</span>
          </div>
        ) : null}
        {step.results.map((r, i) => <Result key={i} block={r} />)}
      </div>
    </div>
  );
}

function Result({ block }) {
  if (block.type === 'success') {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 11, padding: '9px 11px', border: '1px solid var(--success-weak)', background: 'var(--success-weak)', borderRadius: 11 }}>
        <span style={{ flex: 'none', marginTop: 1 }}>{Ico.check}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>{block.title || 'Done'}</div>
          {block.detail ? <div style={{ fontSize: 12.5, color: 'var(--fg)', lineHeight: 1.45 }}>{block.detail}</div> : null}
        </div>
      </div>
    );
  }
  if (block.type === 'data') return <DataBlock block={block} />;
  if (block.type === 'choice') return <ChoiceBlock block={block} />;
  if (block.type === 'question') return <QuestionBlock block={block} />;
  return null;
}

function DataBlock({ block }) {
  const d = useMemo(() => normalizeData(block), [block]);
  const [view, setView] = useState('table');
  const cols = d.columns.length || (d.rows[0]?.cells.length || 1);
  const grid = `1.1fr ${Array(Math.max(0, cols - 1)).fill('1fr').join(' ')}`.trim();
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 13, padding: '12px 13px', margin: '11px 0 2px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', flex: 1 }}>{d.title}</span>
        <div style={{ display: 'flex', gap: 3, background: 'var(--surface-2)', borderRadius: 8, padding: 3 }}>
          {['table', 'chart'].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ height: 24, padding: '0 11px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? 'var(--accent)' : 'transparent', color: view === v ? '#fff' : 'var(--muted)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-sans)', textTransform: 'capitalize' }}>{v}</button>
          ))}
        </div>
      </div>
      {view === 'table' ? (
        <div style={{ border: '1px solid var(--hair)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 6, padding: '8px 11px', background: 'var(--surface-2)', borderBottom: '1px solid var(--hair)', fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {d.columns.map((c, i) => <div key={i} style={{ textAlign: i === 0 ? 'left' : 'right' }}>{c}</div>)}
          </div>
          {d.rows.map((r, ri) => (
            <div key={ri} style={{ display: 'grid', gridTemplateColumns: grid, gap: 6, padding: '8px 11px', borderBottom: '1px solid var(--divider)', fontSize: 12, color: 'var(--fg)' }}>
              {r.cells.map((cell, ci) => <div key={ci} className={ci === 0 ? '' : 'mono'} style={{ textAlign: ci === 0 ? 'left' : 'right', fontWeight: ci === 0 ? 500 : 400 }}>{cell}</div>)}
            </div>
          ))}
          {d.totals ? (
            <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 6, padding: '8px 11px', background: 'var(--surface-2)', fontSize: 12, fontWeight: 700 }}>
              {d.totals.cells.map((cell, ci) => <div key={ci} className={ci === 0 ? '' : 'mono'} style={{ textAlign: ci === 0 ? 'left' : 'right', color: ci === 0 ? 'var(--muted)' : 'var(--accent)' }}>{cell}</div>)}
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120, padding: '6px 4px 0' }}>
          {d.rows.map((r, ri) => (
            <div key={ri} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', maxWidth: 38, height: `${Math.max(4, r.pct)}%`, borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,var(--accent),#6366F1)' }} />
              <span style={{ fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.cells[0]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChoiceBlock({ block }) {
  const choices = Array.isArray(block.choices) ? block.choices : [];
  const send = useThreadSend();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 11 }}>
      {block.prompt ? <div className="step-sub" style={{ fontSize: 12.5 }}>{block.prompt}</div> : null}
      {choices.map((c) => (
        <div key={c.id} className={`choice-card ${c.style === 'alt' ? 'choice-alt' : 'choice-rec'}`} style={{ padding: '11px 12px' }}
          onClick={() => send(`I'll go with: ${c.title || c.label || c.id}`)}>
          <div className="choice-h" style={{ color: c.style === 'alt' ? 'var(--fg)' : '#fff', fontSize: 13 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            <span>{c.title || c.label}</span>
            {c.label && c.title ? <span style={{ marginLeft: 'auto', fontSize: 11, opacity: .85 }}>{c.label}</span> : null}
          </div>
          {c.detail ? <div className="choice-s" style={{ color: c.style === 'alt' ? 'var(--muted)' : 'rgba(255,255,255,.85)' }}>{c.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

function QuestionBlock({ block }) {
  const opts = Array.isArray(block.options) ? block.options : [];
  const send = useThreadSend();
  return (
    <div style={{ border: '1px solid var(--accent-weak)', background: 'var(--accent-weak)', borderRadius: 13, padding: '12px 13px', marginTop: 11 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6" /><path d="M12 17h.01" /></svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>Quick question</span>
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--fg)' }}>{block.text}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
        {opts.map((o) => (
          <button key={o.id} onClick={() => send(o.label)} style={{ height: 34, padding: '0 13px', borderRadius: 9, border: '1px solid var(--accent-weak)', background: 'var(--surface)', color: 'var(--accent)', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}

// Lightweight context so choice/question taps reach the room's send() without prop drilling.
const SendCtx = React.createContext(() => {});
function useThreadSend() { return React.useContext(SendCtx); }

export default function ChatGoalThread({ room, goal, blocks, onBack, onOpenNav, onSend }) {
  const steps = useMemo(() => buildSteps(blocks), [blocks]);
  const [draft, setDraft] = useState('');
  const submit = () => { const t = draft.trim(); if (!t) return; onSend?.(t); setDraft(''); };
  const headTitle = goal?.title || 'Working thread';
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
          <div className="thread-head" style={{ marginBottom: 18 }}>
            <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /></svg>
            </span>
            <span className="thread-title" style={{ fontSize: 15 }}><span style={{ color: 'var(--muted)', fontWeight: 600 }}>Goal:</span> {headTitle}</span>
            {goal?.total ? <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{goal.doneCount}/{goal.total}</span> : null}
          </div>
          {steps.map((s) => <StepRow key={s.index} step={s} goal={goal} />)}
          <div style={{ height: 8 }} />
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
