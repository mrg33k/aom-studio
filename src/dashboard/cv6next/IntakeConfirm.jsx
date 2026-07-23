// IntakeConfirm — the editable, non-blocking confirm for the front door.
// corner:front-door Stage 3.
//
// Patrik's rule: "in-line confirm or edit so if you don't want to confirm, you
// can edit and just choose the room and/or create it right there and then it
// goes forward." So this is an inline card (not a blocking modal): accept the
// proposal as-is, edit the name, choose a different project, or (matched-room
// case) open the existing room. Nothing is created until a button is pressed.

import { useEffect, useState } from 'react';

const NEW_PROJECT = '__new_project__';

export default function IntakeConfirm({ proposal, projects = [], error = '', busy = false, pendingText = '', onCommit, onCancel }) {
  const isExisting = proposal?.kind === 'existing' && proposal?.matchedRoom;
  const [name, setName] = useState(proposal?.name || '');
  // Default the destination: matched/named existing project, else the first project.
  const [projectSlug, setProjectSlug] = useState(() => {
    if (proposal?.is_new_project) return NEW_PROJECT;
    if (proposal?.project_slug) return proposal.project_slug;
    return (projects[0]?.slug || projects[0]?.id || NEW_PROJECT);
  });
  useEffect(() => { setName(proposal?.name || ''); }, [proposal?.name]);

  if (!proposal) return null;

  // Matched an existing room but below the auto-open bar — confirm the open.
  if (isExisting) {
    const r = proposal.matchedRoom;
    const sub = r.isMission ? `mission in ${r.projectSlug}` : r.isProject ? 'project' : 'specialist';
    return (
      <div className="cv6-intake-confirm" style={cardStyle}>
        <div style={eyebrow}>Looks like this belongs to</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 17, fontWeight: 650, color: 'var(--fg)' }}>{r.name}</div>
          <span style={pill}>{sub}</span>
        </div>
        {proposal.reasoning ? <div style={reasonLine}>{proposal.reasoning}</div> : null}
        <div style={quoteLine}>“{pendingText}”</div>
        {error ? <div style={errLine}>{error}</div> : null}
        <div style={rowBtns}>
          <button type="button" disabled={busy} onClick={() => onCommit?.({ type: 'existing', room: r })} style={primaryBtn}>
            {busy ? 'Opening…' : `Open ${r.name}`}
          </button>
          <button type="button" disabled={busy} onClick={() => onCommit?.({ type: 'to-new' })} style={ghostBtn}>Start something new instead</button>
          <button type="button" disabled={busy} onClick={onCancel} style={ghostBtn}>Cancel</button>
        </div>
      </div>
    );
  }

  const creatingProject = projectSlug === NEW_PROJECT;
  const canStart = name.trim().length > 0 && !busy;
  const start = () => {
    if (!canStart) return;
    if (creatingProject) onCommit?.({ type: 'create-project', name: name.trim() });
    else onCommit?.({ type: 'create-mission', projectSlug, name: name.trim() });
  };

  return (
    <div className="cv6-intake-confirm" style={cardStyle}>
      <div style={eyebrow}>Corner will start a new {creatingProject ? 'project' : 'mission'}. Edit anything that’s off.</div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') start(); }}
        placeholder="Name this work…"
        autoFocus
        style={nameInput}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>in</span>
        <select value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)} style={selectStyle}>
          {projects.map((p) => (
            <option key={p.slug || p.id} value={p.slug || p.id}>{p.name || p.slug || p.id}</option>
          ))}
          <option value={NEW_PROJECT}>＋ New project “{name.trim() || '…'}”</option>
        </select>
      </div>
      {Array.isArray(proposal.task_breakdown) && proposal.task_breakdown.length ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)', marginBottom: 6 }}>Corner sees these steps</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.6 }}>
            {proposal.task_breakdown.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      ) : null}
      <div style={quoteLine}>“{pendingText}”</div>
      {error ? <div style={errLine}>{error === 'offline' ? 'Corner couldn’t sort this automatically. Set the destination and it’ll go.' : error}</div> : null}
      <div style={rowBtns}>
        <button type="button" disabled={!canStart} onClick={start} style={{ ...primaryBtn, opacity: canStart ? 1 : 0.5 }}>
          {busy ? 'Starting…' : 'Start'}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} style={ghostBtn}>Cancel</button>
      </div>
    </div>
  );
}

const cardStyle = { width: '100%', maxWidth: 680, margin: '14px auto 0', padding: 18, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--hair)', boxShadow: '0 22px 52px -26px rgba(0,0,0,.8)', fontFamily: 'var(--font-sans)' };
const eyebrow = { fontSize: 12, color: 'var(--muted)', marginBottom: 10 };
const pill = { fontSize: 11, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-weak)', borderRadius: 11, padding: '2px 9px' };
const nameInput = { width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 12, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 16, fontWeight: 600, padding: '0 14px', outline: 'none', fontFamily: 'var(--font-sans)' };
const selectStyle = { height: 34, borderRadius: 10, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 13, padding: '0 8px', outline: 'none', fontFamily: 'var(--font-sans)', maxWidth: '100%' };
const reasonLine = { fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 };
const quoteLine = { fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic', marginTop: 12, borderLeft: '2px solid var(--hair)', paddingLeft: 10 };
const errLine = { fontSize: 12, color: 'var(--warn, #d9a441)', marginTop: 10 };
const rowBtns = { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' };
const primaryBtn = { height: 40, padding: '0 20px', borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', font: '700 13px var(--font-sans)', cursor: 'pointer' };
const ghostBtn = { height: 40, padding: '0 14px', borderRadius: 12, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--muted)', font: '600 13px var(--font-sans)', cursor: 'pointer' };
