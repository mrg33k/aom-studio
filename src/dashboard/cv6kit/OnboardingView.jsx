import React, { useState } from 'react';

/**
 * OnboardingView — CV6 first-run setup flow (5 steps + done screen).
 * Exact pixel-faithful port of the design system's onboarding.html.
 * Props: { step, steps, onNext, onSkip, onBack }
 * Renders mobile frame with safe-area padding; desktop will wrap differently.
 */

function SVG(pathData, strokeWidth, color, size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${pathData}</svg>`;
}

const INTEGRATIONS = [
  { name: 'Email', desc: 'Read & draft replies', tint: 'rgba(244,114,182,.16)', col: 'var(--pink-400)', ico: SVG('<path d="M4 6h16v12H4Z"/><path d="m4 7 8 6 8-6"/>', '1.8', 'var(--pink-400)', '20') },
  { name: 'GitHub', desc: 'Repos & pull requests', tint: 'rgba(139,124,246,.16)', col: 'var(--violet-400)', ico: SVG('<path d="M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6 0C6.7 2.3 5.6 2.6 5.6 2.6a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>', '1.8', 'var(--violet-400)', '19') },
  { name: 'Calendar', desc: 'Schedule & meetings', tint: 'var(--accent-weak)', col: 'var(--accent)', ico: SVG('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>', '1.8', 'var(--accent)', '19') },
  { name: 'Slack', desc: 'Team messages', tint: 'rgba(52,211,153,.16)', col: 'var(--success)', ico: SVG('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/>', '1.8', 'var(--success)', '19') },
  { name: 'Drive', desc: 'Files & documents', tint: 'rgba(251,191,36,.16)', col: 'var(--warn)', ico: SVG('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>', '1.8', 'var(--warn)', '19') }
];

const AGENTS = [
  { id: 'Elon', av: 'EL', tint: 'rgba(52,211,153,.2)', col: 'var(--success)', role: 'Engineering · drives missions' },
  { id: 'Rex', av: 'RX', tint: 'rgba(163,230,53,.2)', col: '#A3E635', role: 'Writing · drafts & digests' }
];

const PERMS = [
  { k: 'Draft', d: 'Write replies & docs for you' },
  { k: 'Send', d: 'Send on your behalf without asking' },
  { k: 'Commit', d: 'Push code changes' },
  { k: 'File', d: 'Move & organize files' }
];

const THEMES = [
  { k: 'dark', label: 'Dark', bg: '#0E1116', c1: '#2A2F37', c2: '#3B82F6' },
  { k: 'light', label: 'Light', bg: '#F5F4F1', c1: '#E2E0DB', c2: '#0066FF' },
  { k: 'glass', label: 'Glass', bg: 'linear-gradient(140deg,#0c1a22,#1a1224)', c1: 'rgba(255,255,255,.18)', c2: '#5B9BFF' }
];

const STEP_CONTENT = [
  {
    eyebrow: 'WELCOME',
    title: 'Meet your agent workspace',
    sub: 'Corner runs a team of AI agents across your projects. They work, then bring you the decisions. Let\'s set up your environment — it takes a minute.',
    content: (state, setState) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { ico: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', t: 'Agents do the work', s: 'They draft, build, file and research — then ask when it\'s your call.' },
          { ico: '<path d="M3 7h18M3 12h18M3 17h12"/>', t: 'One inbox for what needs you', s: 'Catch Up gathers every "needs you" from every tool in one place.' },
          { ico: '<path d="M12 2 2 7l10 5 10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>', t: 'Everything in one workspace', s: 'Chat, files, review, support, tracker, command and live notes.' }
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', marginBottom: '16px' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'var(--accent-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }} dangerouslySetInnerHTML={{ __html: SVG(row.ico, '2', 'var(--accent)', '18') }} />
            <div>
              <div style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--fg)' }}>{row.t}</div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>{row.s}</div>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    eyebrow: 'STEP 2 · ENVIRONMENT',
    title: 'Connect your environment',
    sub: 'Your environment is everything the agents can read and act on. Connect the services you use — you can change these anytime.',
    content: (state, setState) => (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {INTEGRATIONS.map(int => {
          const isConnected = state.connected[int.name];
          return (
            <div key={int.name} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '14px 15px', border: '1px solid var(--hair)', borderRadius: '13px', background: 'var(--surface)' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', background: int.tint }} dangerouslySetInnerHTML={{ __html: int.ico }} />
              <div style={{ minWidth: '0' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--fg)' }}>{int.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{int.desc}</div>
              </div>
              <button
                onClick={() => setState({ ...state, connected: { ...state.connected, [int.name]: !isConnected } })}
                style={{
                  marginLeft: 'auto',
                  height: '32px',
                  padding: '0 13px',
                  borderRadius: '9px',
                  border: isConnected ? 'none' : '1px solid var(--hair)',
                  background: isConnected ? 'var(--success-weak)' : 'var(--surface-2)',
                  color: isConnected ? 'var(--success)' : 'var(--fg)',
                  fontSize: '12.5px',
                  fontWeight: '600',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  flex: 'none'
                }}
              >
                {isConnected ? 'Connected' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    )
  },
  {
    eyebrow: 'STEP 3 · TRUST',
    title: 'What can agents do on their own?',
    sub: 'Set the guardrails. Anything left off still gets done — the agent just asks you first.',
    content: (state, setState) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {AGENTS.map(agent => (
          <div key={agent.id} style={{ border: '1px solid var(--hair)', borderRadius: '14px', background: 'var(--surface)', padding: '15px 16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '6px' }}>
              <span style={{ width: '34px', height: '34px', borderRadius: '50%', background: agent.tint, color: agent.col, fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>{agent.av}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--fg)' }}>{agent.id}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>{agent.role}</div>
              </div>
            </div>
            {PERMS.map(perm => (
              <div key={perm.k} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                <div style={{ flex: '1' }}>
                  <div style={{ fontSize: '13.5px', color: 'var(--fg)' }}>{perm.k}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--faint)' }}>{perm.d}</div>
                </div>
                <Toggle
                  on={state.perms[agent.id]?.[perm.k] || false}
                  onChange={() => setState({
                    ...state,
                    perms: { ...state.perms, [agent.id]: { ...state.perms[agent.id], [perm.k]: !state.perms[agent.id]?.[perm.k] } }
                  })}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    )
  },
  {
    eyebrow: 'STEP 4 · APPEARANCE',
    title: 'Choose your look',
    sub: 'Dark, Light and Glass are all first-class. Tap one to preview it live.',
    content: (state, setState) => (
      <div style={{ display: 'flex', gap: '14px' }}>
        {THEMES.map(theme => {
          const selected = state.theme === theme.k;
          return (
            <div
              key={theme.k}
              onClick={() => setState({ ...state, theme: theme.k })}
              style={{
                flex: '1',
                border: selected ? '2px solid var(--accent)' : '2px solid var(--hair)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--surface)'
              }}
            >
              <div style={{ height: '96px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '7px', background: theme.bg }}>
                <div style={{ height: '9px', borderRadius: '3px', width: '60%', background: theme.c1 }} />
                <div style={{ height: '9px', borderRadius: '3px', width: '85%', background: theme.c1 }} />
                <div style={{ height: '9px', borderRadius: '3px', width: '40%', background: theme.c2 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 13px', borderTop: '1px solid var(--divider)', fontSize: '13px', fontWeight: '600', color: 'var(--fg)' }}>
                {theme.label}
                <span style={{ marginLeft: 'auto', width: '18px', height: '18px', borderRadius: '50%', border: selected ? 'none' : '2px solid var(--hair)', background: selected ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {selected && <span dangerouslySetInnerHTML={{ __html: SVG('<path d="m5 12 4 4L19 7"/>', '3', '#fff', '11') }} />}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )
  },
  {
    eyebrow: 'STEP 5 · FIRST GOAL',
    title: 'Assign your first goal',
    sub: 'Pick a project, describe the outcome, and assign it to an agent. You\'ll see it run in Command.',
    content: (state, setState) => (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', border: '1px solid var(--hair)', borderRadius: '12px', background: 'var(--surface)', marginBottom: '12px' }}>
          <span dangerouslySetInnerHTML={{ __html: SVG('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>', '2', 'var(--violet-400)', '18') }} />
          <span style={{ flex: '1', fontSize: '14px', fontWeight: '600', color: 'var(--fg)' }}>Space Rising</span>
          <span dangerouslySetInnerHTML={{ __html: SVG('<path d="m6 9 6 6 6-6"/>', '2', 'var(--faint)', '16') }} />
        </div>
        <div style={{ border: '1px solid var(--hair)', borderRadius: '12px', background: 'var(--surface)', padding: '14px', fontSize: '14px', lineHeight: '1.55', color: 'var(--fg)', minHeight: '64px' }}>
          Lock the Interactive / community framing before the Apr 29 print.
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '14px' }}>
          <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52,211,153,.2)', color: 'var(--success)', fontSize: '11px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>EL</span>
          <span style={{ flex: '1', fontSize: '13px', color: 'var(--muted)' }}>Elon will drive this goal</span>
          <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '46px', padding: '0 22px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '14.5px', fontWeight: '600', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}>
            <span dangerouslySetInnerHTML={{ __html: SVG('<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>', '0', '#fff', '0').replace('fill="none"', 'fill="#fff"') }} />
            Assign to agent
          </button>
        </div>
      </div>
    )
  }
];

const DONE_STEP = {
  eyebrow: 'ALL SET',
  title: 'You\'re ready to go',
  sub: '',
  content: (state, setState) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '6px' }}>
      <span style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }} dangerouslySetInnerHTML={{ __html: SVG('<path d="m5 13 4 4L19 7"/>', '2.6', 'var(--success)', '30') }} />
      <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-.02em', color: 'var(--fg)', marginBottom: '8px' }}>You\'re all set, Patrik</div>
      <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', maxWidth: '380px', marginBottom: '22px' }}>Your environment is live and Elon is on your first goal. Here\'s what\'s ready:</div>
      <div style={{ textAlign: 'left', marginBottom: '24px' }}>
        {[
          `${Object.values(state.connected).filter(Boolean).length} services connected`,
          '2 agents with permissions set',
          'Theme applied',
          'First goal assigned to Elon'
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }} dangerouslySetInnerHTML={{ __html: SVG('<path d="m5 12 4 4L19 7"/>', '3', 'var(--success)', '12') }} />
            <span style={{ fontSize: '13.5px', color: 'var(--fg)' }}>{item}</span>
          </div>
        ))}
      </div>
      <a href="#" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '50px', padding: '0 28px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '14.5px', fontWeight: '600', fontFamily: 'var(--font-sans)', textDecoration: 'none', cursor: 'pointer' }}>
        Take me to Corner
        <span dangerouslySetInnerHTML={{ __html: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', '2.2', '#fff', '17') }} />
      </a>
      <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--faint)', lineHeight: '1.5', maxWidth: '340px' }}>All of this lives in <span style={{ color: 'var(--fg)', fontWeight: '600' }}>Settings → Environment</span>. Come back and change anything, anytime.</div>
    </div>
  )
};

function Toggle({ on, onChange }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: '42px',
        height: '24px',
        borderRadius: '12px',
        background: on ? 'var(--accent)' : 'var(--surface-2)',
        border: on ? 'none' : '1px solid var(--hair)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .15s',
        flex: 'none',
        padding: '0'
      }}
    >
      <i style={{
        position: 'absolute',
        top: '2px',
        left: on ? '20px' : '2px',
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        background: on ? '#fff' : 'var(--faint)',
        transition: 'left .15s, background .15s'
      }} />
    </button>
  );
}

export function OnboardingView({ step = 0, steps = STEP_CONTENT.length, onNext, onSkip, onBack }) {
  const [state, setState] = useState({
    step: step,
    theme: 'dark',
    connected: { Email: true, GitHub: true, Calendar: false, Slack: false, Drive: false },
    perms: { Elon: { Draft: true, Send: false, Commit: true, File: true }, Rex: { Draft: true, Send: false, Commit: false, File: true } }
  });

  const currentStep = state.step === steps ? DONE_STEP : STEP_CONTENT[state.step];
  const isDone = state.step === steps;
  const isFirstStep = state.step === 0;
  const isLastSetupStep = state.step === steps - 1;

  const handleNext = () => {
    if (state.step < STEP_CONTENT.length) {
      setState({ ...state, step: state.step + 1 });
    }
    onNext?.();
  };

  const handleBack = () => {
    if (state.step > 0) {
      setState({ ...state, step: state.step - 1 });
    }
    onBack?.();
  };

  const handleSkip = () => {
    setState({ ...state, step: STEP_CONTENT.length });
    onSkip?.();
  };

  const progressPct = isDone ? 100 : Math.round((state.step + 1) / steps * 100);
  const stepLabel = isDone ? 'All set' : `Step ${state.step + 1} of ${steps}`;

  return (
    <div
      data-cv6kit
      data-theme={state.theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        minHeight: '100dvh',
        background: 'var(--ground)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-sans)',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      {/* Mobile header */}
      <div style={{
        flex: 'none',
        padding: `calc(env(safe-area-inset-top, 0px) + 18px) 22px 14px`,
        borderBottom: isDone ? 'none' : '1px solid var(--divider)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '14px' }}>
          <div style={{ width: '20px', height: '20px', background: 'var(--accent)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: '700' }}>C</div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)' }}>{stepLabel}</span>
          <button
            onClick={handleSkip}
            style={{
              marginLeft: 'auto',
              padding: '0',
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '13.5px',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              visibility: isDone ? 'hidden' : 'visible'
            }}
          >
            Skip
          </button>
        </div>
        {!isDone && (
          <div style={{ height: '5px', borderRadius: '3px', background: 'var(--surface-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '3px', background: 'var(--accent)', width: `${progressPct}%`, transition: 'width .3s cubic-bezier(.22,1,.36,1)' }} />
          </div>
        )}
      </div>

      {/* Body content */}
      <div style={{
        flex: '1',
        minHeight: '0',
        overflow: 'hidden',
        padding: '20px 22px 0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ overflowY: 'auto', flex: '1' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
            {currentStep.eyebrow}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-.025em', color: 'var(--fg)', lineHeight: '1.12', marginBottom: '10px' }}>
            {currentStep.title}
          </h1>
          {currentStep.sub && (
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', maxWidth: '520px', marginBottom: '24px' }}>
              {currentStep.sub}
            </p>
          )}
          <div style={{ marginTop: '24px' }}>
            {currentStep.content(state, setState)}
          </div>
        </div>
      </div>

      {/* Mobile nav footer */}
      <div style={{
        flex: 'none',
        padding: `16px 22px calc(16px + env(safe-area-inset-bottom, 0px))`,
        borderTop: isDone ? 'none' : '1px solid var(--divider)',
        display: isDone ? 'none' : 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <button
          onClick={handleBack}
          style={{
            height: '50px',
            padding: '0 18px',
            borderRadius: '12px',
            border: '1px solid var(--hair)',
            background: 'transparent',
            color: 'var(--fg)',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            visibility: isFirstStep ? 'hidden' : 'visible'
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: '1',
            height: '50px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: '14.5px',
            fontWeight: '600',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer'
          }}
        >
          {isLastSetupStep ? 'Finish setup' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
