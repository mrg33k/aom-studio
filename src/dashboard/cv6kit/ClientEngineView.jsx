import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  HelpCircle,
  CircleOff,
  LockKeyhole,
  Menu,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { authFetch } from '../lib/authFetch.js';
import {
  CLIENT_ENGINE_MISSION,
  isGreenContractViolation,
  loadClientEngine,
  validateClientEngine,
} from './clientEngineData.js';
import './kit.css';
import './client-engine.css';

const STATE_META = Object.freeze({
  unknown: { label: 'Unknown', icon: HelpCircle },
  not_started: { label: 'Not started', icon: CircleOff },
  not_ready: { label: 'Not ready', icon: AlertTriangle },
  in_progress: { label: 'In progress', icon: CircleDashed },
  green: { label: 'Green', icon: CheckCircle2 },
});

function byOrder(a, b) {
  return (a?.order ?? Number.MAX_SAFE_INTEGER) - (b?.order ?? Number.MAX_SAFE_INTEGER);
}

function initials(value) {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function MissingValue() {
  return <span className="ce-missing">Missing</span>;
}

function StateBadge({ cell, compact = false }) {
  const violation = isGreenContractViolation(cell);
  const meta = violation ? { label: 'Invalid green', icon: ShieldAlert } : (STATE_META[cell?.state] || STATE_META.unknown);
  const Icon = meta.icon;
  return (
    <span className={`ce-state is-${cell?.state || 'unknown'}${violation ? ' is-violation' : ''}${compact ? ' is-compact' : ''}`}>
      <Icon aria-hidden="true" size={compact ? 13 : 15} strokeWidth={2.2} />
      {meta.label}
    </span>
  );
}

function ConfidenceBadge({ evidence, violation = false }) {
  const verified = evidence?.confidence === 'verified';
  const Icon = verified ? ShieldCheck : ShieldAlert;
  return (
    <span className={`ce-confidence ${verified ? 'is-verified' : 'is-guessed'}${violation ? ' is-violation' : ''}`}>
      <Icon aria-hidden="true" size={13} strokeWidth={2.2} />
      {violation ? 'Contract violation' : (verified ? 'Verified' : 'Guessed')}
    </span>
  );
}

function StepSpine({ program, clients }) {
  const steps = [...(program.steps || [])].sort(byOrder);
  if (!steps.length) return null;
  return (
    <div className="ce-spine" aria-label={`${program.label} steps`}>
      <div className="ce-spine-label">Current step</div>
      <div className="ce-spine-track">
        {steps.map((step, index) => {
          const atStep = clients.filter((client) => client.step === step.id);
          return (
            <div className={`ce-step${atStep.length ? ' is-current' : ''}`} key={step.id}>
              <div className="ce-step-rail" aria-hidden="true">
                <span>{String(step.order).padStart(2, '0')}</span>
                {index < steps.length - 1 ? <i /> : null}
              </div>
              <div className="ce-step-label">{step.label}</div>
              {atStep.length ? (
                <div className="ce-step-clients">
                  {atStep.map((client) => (
                    <span key={client.id} title={client.name}>{initials(client.name)}</span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GateBanner({ gate, coverage }) {
  if (!gate) return null;
  const labels = new Map((coverage || []).map((row) => [row.id, row.label]));
  const blocking = (gate.blocking || []).map((id) => labels.get(id) || id);
  return (
    <section className={`ce-gate${gate.locked ? ' is-locked' : ' is-open'}`} aria-label={gate.locked ? 'Booking gate locked' : 'Booking gate open'}>
      <div className="ce-gate-heading">
        {gate.locked ? <LockKeyhole aria-hidden="true" size={16} strokeWidth={2.4} /> : <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2.4} />}
        <span>{gate.locked ? 'Gate locked' : 'Gate open'}</span>
      </div>
      <p>{gate.rule}</p>
      {blocking.length ? (
        <div className="ce-blockers">
          <span>Blocking</span>
          <ul>
            {blocking.map((label, index) => <li key={`${label}-${index}`}>{label}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ClientHeader({ client, program }) {
  const step = (program.steps || []).find((candidate) => candidate.id === client.step);
  return (
    <header className="ce-client-head">
      <div className="ce-client-title-row">
        <span className="ce-client-avatar" aria-hidden="true">{initials(client.name)}</span>
        <div>
          <h3>{client.name}</h3>
          <p>{client.trade}</p>
        </div>
      </div>
      <div className="ce-client-meta">
        <span><UserRound aria-hidden="true" size={13} /> Owner {client.owner || <MissingValue />}</span>
        {step ? <span>Step {step.order} · {step.label}</span> : null}
      </div>
      <GateBanner gate={client.gate} coverage={program.coverage} />
    </header>
  );
}

function CoverageCell({ client, coverage, cell, onOpen }) {
  const violation = isGreenContractViolation(cell);
  const ownerMissing = !cell.owner;
  return (
    <button
      type="button"
      className={`ce-cell is-${cell.state}${cell.evidence?.confidence === 'guessed' ? ' is-guessed' : ' is-verified'}${violation ? ' is-violation' : ''}`}
      onClick={() => onOpen({ client, coverage, cell })}
      aria-label={`${client.name}, ${coverage.label}: ${violation ? 'contract violation' : STATE_META[cell.state]?.label || cell.state}, ${cell.evidence?.confidence}`}
    >
      <div className="ce-cell-top">
        <StateBadge cell={cell} compact />
        <ChevronRight aria-hidden="true" className="ce-cell-open" size={16} />
      </div>
      <ConfidenceBadge evidence={cell.evidence} violation={violation} />
      <div className={`ce-owner${ownerMissing ? ' is-missing' : ''}`}>
        <UserRound aria-hidden="true" size={13} />
        {ownerMissing ? 'Owner missing' : cell.owner}
      </div>
      <div className="ce-action-preview">{cell.action.label}</div>
    </button>
  );
}

function DetailRow({ label, children, missing = false }) {
  return (
    <div className={`ce-detail-row${missing ? ' is-missing' : ''}`}>
      <dt>{label}</dt>
      <dd>{missing ? <MissingValue /> : children}</dd>
    </div>
  );
}

function CellDetail({ selection, dispatch, onDispatch, onClose }) {
  const closeRef = useRef(null);
  const { client, coverage, cell } = selection;
  const violation = isGreenContractViolation(cell);
  const evidence = cell.evidence || {};
  const canDispatch = cell.action?.dispatchable && Boolean(cell.action?.brief);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="ce-dialog-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="ce-detail" role="dialog" aria-modal="true" aria-labelledby="ce-detail-title">
        <header className="ce-detail-head">
          <div>
            <span>{client.name}</span>
            <h2 id="ce-detail-title">{coverage.label}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close cell detail"><X aria-hidden="true" size={18} /></button>
        </header>

        <div className="ce-detail-body">
          <div className="ce-detail-status">
            <StateBadge cell={cell} />
            <ConfidenceBadge evidence={evidence} violation={violation} />
          </div>

          {violation ? (
            <div className="ce-contract-error" role="alert">
              <ShieldAlert aria-hidden="true" size={18} />
              <div><strong>Invalid evidence contract</strong><span>A green state requires verified confidence and a checked timestamp.</span></div>
            </div>
          ) : null}

          <section className="ce-detail-section">
            <h3>What green means</h3>
            <p className="ce-bar">{coverage.bar}</p>
          </section>

          <section className="ce-detail-section">
            <h3>Current note</h3>
            {cell.note == null ? <MissingValue /> : <p>{cell.note}</p>}
          </section>

          <section className="ce-detail-section">
            <h3>Evidence</h3>
            <dl className="ce-evidence">
              <DetailRow label="Confidence">{evidence.confidence}</DetailRow>
              <DetailRow label="Checked at" missing={evidence.checked_at == null}>{evidence.checked_at}</DetailRow>
              <DetailRow label="Checked by" missing={evidence.checked_by == null}>{evidence.checked_by}</DetailRow>
              <DetailRow label="Source" missing={evidence.source == null}>{evidence.source}</DetailRow>
            </dl>
          </section>

          <section className="ce-detail-section">
            <h3>Action</h3>
            <p className="ce-action-label">{cell.action.label}</p>
            <div className={`ce-owner-task${canDispatch ? ' is-queue' : ' is-human'}`}>
              {canDispatch ? <Send aria-hidden="true" size={16} /> : <UserRound aria-hidden="true" size={16} />}
              <div>
                <strong>{canDispatch ? 'Queue item' : 'Owner task'}</strong>
                <span>{cell.owner || <MissingValue />}</span>
              </div>
            </div>

            {canDispatch ? (
              <>
                <div className="ce-brief"><span>Task text</span><p>{cell.action.brief}</p></div>
                <button
                  type="button"
                  className="ce-dispatch"
                  disabled={dispatch.status === 'sending' || dispatch.status === 'sent'}
                  onClick={() => onDispatch(selection)}
                >
                  <Send aria-hidden="true" size={16} />
                  {dispatch.status === 'sending' ? 'Sending to queue…' : dispatch.status === 'sent' ? 'Task queued' : 'Dispatch task'}
                </button>
                {dispatch.status === 'sent' ? <p className="ce-dispatch-result is-success" role="status">{dispatch.message}</p> : null}
                {dispatch.status === 'error' ? <p className="ce-dispatch-result is-error" role="alert">{dispatch.message}</p> : null}
              </>
            ) : (
              <p className="ce-human-note">This action needs a person. It is not sent to the agent queue.</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function ProgramBlock({ program, clients, onOpenCell }) {
  const coverage = [...(program.coverage || [])].sort(byOrder);
  const gridStyle = {
    '--ce-client-count': clients.length,
    minWidth: `${210 + (clients.length * 270)}px`,
  };
  return (
    <section className="ce-program" aria-labelledby={`ce-program-${program.id}`}>
      <header className="ce-program-head">
        <div>
          <div className="ce-program-kicker">Program</div>
          <div className="ce-program-title-row">
            <h2 id={`ce-program-${program.id}`}>{program.label}</h2>
            {program.draft ? <span className="ce-draft"><AlertTriangle aria-hidden="true" size={13} /> Provisional</span> : null}
          </div>
          <p>{clients.length} {clients.length === 1 ? 'client' : 'clients'} · {coverage.length} coverage checks</p>
        </div>
      </header>

      <StepSpine program={program} clients={clients} />

      <div className="ce-program-scroll" tabIndex="0" aria-label={`${program.label} coverage grid`}>
        <div className="ce-grid" style={gridStyle}>
          <div className="ce-grid-row ce-grid-head" style={gridStyle}>
            <div className="ce-row-label ce-corner-label"><span>Coverage</span><small>Prospect path</small></div>
            {clients.map((client) => <ClientHeader key={client.id} client={client} program={program} />)}
          </div>

          {coverage.map((row) => (
            <div className="ce-grid-row" style={gridStyle} key={row.id}>
              <div className="ce-row-label">
                <span className="ce-row-order">{String(row.order).padStart(2, '0')}</span>
                <strong>{row.label}</strong>
              </div>
              {clients.map((client) => {
                const cell = (client.cells || []).find((candidate) => candidate.coverage_id === row.id);
                return cell ? (
                  <CoverageCell key={`${client.id}-${row.id}`} client={client} coverage={row} cell={cell} onOpen={onOpenCell} />
                ) : (
                  <div className="ce-cell ce-cell-missing" key={`${client.id}-${row.id}`}><MissingValue /></div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClientEngineView({
  worldId = 'aom',
  theme = 'dark',
  onBack,
  onOpenNav,
  engine: engineProp = null,
}) {
  const [engine, setEngine] = useState(engineProp);
  const [status, setStatus] = useState(engineProp ? 'ready' : 'loading');
  const [loadError, setLoadError] = useState('');
  const [selection, setSelection] = useState(null);
  const [dispatch, setDispatch] = useState({ status: 'idle', message: '' });

  useEffect(() => {
    if (engineProp) {
      setEngine(engineProp);
      setStatus('ready');
      return undefined;
    }
    let alive = true;
    loadClientEngine()
      .then((next) => {
        if (!alive) return;
        const problems = validateClientEngine(next);
        if (problems.length) throw new Error(problems.join('; '));
        setEngine(next);
        setStatus('ready');
      })
      .catch((error) => {
        if (!alive) return;
        setLoadError(error?.message || 'Client Engine data could not be loaded.');
        setStatus('error');
      });
    return () => { alive = false; };
  }, [engineProp]);

  const programGroups = useMemo(() => {
    if (!engine) return [];
    return (engine.programs || []).map((program) => ({
      program,
      clients: (engine.clients || []).filter((client) => client.program === program.id),
    }));
  }, [engine]);

  const openCell = (next) => {
    setDispatch({ status: 'idle', message: '' });
    setSelection(next);
  };

  const dispatchTask = async ({ client, cell }) => {
    if (!cell.action?.dispatchable || !cell.action?.brief) return;
    setDispatch({ status: 'sending', message: '' });
    try {
      const response = await authFetch('/api/dashboard/create-project-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cell.action.brief,
          projectSlug: client.id,
          clientId: worldId,
          mission_slug: CLIENT_ENGINE_MISSION,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Task dispatch failed (${response.status}).`);
      setDispatch({ status: 'sent', message: payload.task?.title || 'Task queued.' });
    } catch (error) {
      setDispatch({ status: 'error', message: error?.message || 'Task dispatch failed.' });
    }
  };

  return (
    <div data-cv6kit data-theme={theme} className="ce-shell">
      <header className="ce-mobile-head">
        <button type="button" className="ce-icon-button" onClick={onBack} aria-label="Back"><ArrowLeft aria-hidden="true" size={18} /></button>
        <div><strong>Client Engine</strong><span>Delivery coverage</span></div>
        <button type="button" className="ce-icon-button" onClick={onOpenNav} aria-label="Open menu"><Menu aria-hidden="true" size={19} /></button>
      </header>

      <main className="ce-main">
        <header className="ce-page-head">
          <div>
            <span className="ce-eyebrow">AOM operations</span>
            <h1>Client Engine</h1>
            <p>What each client pays for, what is actually ready, and the work that closes every gap.</p>
          </div>
          {engine?.generated_at ? <time dateTime={engine.generated_at}>Generated {engine.generated_at}</time> : null}
        </header>

        <section className="ce-legend" aria-label="State and evidence legend">
          <div className="ce-legend-group">
            <span>State</span>
            {Object.entries(STATE_META).map(([state, meta]) => {
              const Icon = meta.icon;
              return <span className={`ce-legend-state is-${state}`} key={state}><Icon aria-hidden="true" size={12} /> {meta.label}</span>;
            })}
          </div>
          <div className="ce-legend-group">
            <span>Evidence</span>
            <ConfidenceBadge evidence={{ confidence: 'verified' }} />
            <ConfidenceBadge evidence={{ confidence: 'guessed' }} />
          </div>
        </section>

        {status === 'loading' ? <div className="ce-system-state"><CircleDashed aria-hidden="true" size={22} /><span>Loading client coverage…</span></div> : null}
        {status === 'error' ? <div className="ce-system-state is-error"><AlertTriangle aria-hidden="true" size={22} /><span>{loadError}</span></div> : null}
        {status === 'ready' && programGroups.length === 0 ? <div className="ce-system-state"><HelpCircle aria-hidden="true" size={22} /><span>No programs in the data.</span></div> : null}

        {status === 'ready' ? programGroups.map(({ program, clients }) => (
          <ProgramBlock key={program.id} program={program} clients={clients} onOpenCell={openCell} />
        )) : null}
      </main>

      {selection ? (
        <CellDetail
          selection={selection}
          dispatch={dispatch}
          onDispatch={dispatchTask}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
}

export default ClientEngineView;
