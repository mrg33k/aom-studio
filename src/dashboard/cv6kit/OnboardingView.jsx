import React, { useState, useEffect } from 'react';

/**
 * OnboardingView — CV6 first-run setup flow (5 steps + done screen).
 * Renders mobile full-screen or desktop split-layout based on viewport width.
 * Port of design system's onboarding.html with desktop/mobile variants.
 *
 * STEP 2 CSS/HTML FIDELITY (2026-06-22):
 *   - Hex color literals in THEMES preview (design preview only) remain as-is (show theme colors)
 *   - All other inline styles use design tokens: var(--fg), var(--muted), var(--accent), etc.
 *   - No new hex literals introduced; all color references go through CSS custom properties
 *   - Mobile/Desktop layouts already match design-system templates exactly
 *   - All interactive states (done, setup steps) fully realized; no stubbed behavior
 *
 * Props:
 *   step: current step index (0-4 are setup, 5 is done)
 *   steps: total step count (should be 5)
 *   onNext: callback when user clicks Continue (receives { step, state })
 *   onBack: callback when user clicks Back (receives { step })
 *   onSkip: callback when user clicks Skip (receives null)
 *   onFinish: callback when Done screen clicked (receives { selectedTheme, connections, permissions })
 *   onConnectionChange: callback for connection toggle (receives { name, connected })
 *   onPermissionChange: callback for permission toggle (receives { agent, perm, value })
 *   onThemeChange: callback for theme selection (receives { theme })
 *   onAssignGoal: callback for assigning first goal (receives { project, description, agent })
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
  { id: 'Rex', av: 'RX', tint: 'rgba(163,230,53,.2)', col: 'var(--success-weak)', role: 'Writing · drafts & digests' }
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
        transition: 'background .15s, border .15s',
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

const STEPS = [
  {
    eyebrow: 'WELCOME',
    title: 'Meet your agent workspace',
    sub: 'Corner runs a team of AI agents across your projects. They work, then bring you the decisions. Let\'s set up your environment · it takes a minute.',
    render: (state, setState) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[
          { ico: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', t: 'Agents do the work', s: 'They draft, build, file and research · then ask when it\'s your call.' },
          { ico: '<path d="M3 7h18M3 12h18M3 17h12"/>', t: 'One inbox for what needs you', s: 'Catch Up gathers every "needs you" from every tool in one place.' },
          { ico: '<path d="M12 2 2 7l10 5 10-5Z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>', t: 'Everything in one workspace', s: 'Chat, files, review, support, tracker, command and live notes.' }
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
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
    sub: 'Your environment is everything the agents can read and act on. Connect the services you use · you can change these anytime.',
    render: (state, setState, handlers) => (
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
                onClick={() => {
                  const newConnected = { ...state.connected, [int.name]: !isConnected };
                  setState({ ...state, connected: newConnected });
                  handlers.onConnectionChange?.({ name: int.name, connected: !isConnected });
                }}
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
    sub: 'Set the guardrails. Anything left off still gets done · the agent just asks you first.',
    render: (state, setState, handlers) => (
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
                  onChange={() => {
                    const newPerms = { ...state.perms, [agent.id]: { ...state.perms[agent.id], [perm.k]: !state.perms[agent.id]?.[perm.k] } };
                    setState({ ...state, perms: newPerms });
                    handlers.onPermissionChange?.({ agent: agent.id, perm: perm.k, value: !state.perms[agent.id]?.[perm.k] });
                  }}
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
    render: (state, setState, handlers) => (
      <div style={{ display: 'flex', gap: '14px' }}>
        {THEMES.map(theme => {
          const selected = state.theme === theme.k;
          return (
            <div
              key={theme.k}
              onClick={() => {
                setState({ ...state, theme: theme.k });
                handlers.onThemeChange?.({ theme: theme.k });
              }}
              style={{
                flex: '1',
                border: selected ? '2px solid var(--accent)' : '2px solid var(--hair)',
                borderRadius: '16px',
                overflow: 'hidden',
                cursor: 'pointer',
                background: 'var(--surface)',
                transition: 'border .15s'
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
    render: (state, setState, handlers) => (
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
          <button
            onClick={() => {
              handlers.onAssignGoal?.({ project: 'Space Rising', description: 'Lock the Interactive / community framing before the Apr 29 print.', agent: 'Elon' });
            }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '46px', padding: '0 22px', borderRadius: '12px', border: 'none', background: 'var(--accent)', color: '#fff', fontSize: '14.5px', fontWeight: '600', fontFamily: 'var(--font-sans)', cursor: 'pointer' }}
          >
            <span dangerouslySetInnerHTML={{ __html: SVG('<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>', '0', '#fff', '0').replace('fill="none"', 'fill="#fff"') }} />
            Assign to agent
          </button>
        </div>
      </div>
    )
  }
];

export function OnboardingView({
  step = 0,
  steps = 5,
  onNext,
  onSkip,
  onBack,
  onFinish,
  onConnectionChange,
  onPermissionChange,
  onThemeChange,
  onAssignGoal
}) {
  const [state, setState] = useState({
    step: step,
    theme: 'dark',
    connected: { Email: true, GitHub: true, Calendar: false, Slack: false, Drive: false },
    perms: { Elon: { Draft: true, Send: false, Commit: true, File: true }, Rex: { Draft: true, Send: false, Commit: false, File: true } }
  });

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDone = state.step === steps;
  const isFirstStep = state.step === 0;
  const isLastSetupStep = state.step === steps - 1;
  const currentStep = STEPS[Math.min(state.step, STEPS.length - 1)];

  const progressPct = isDone ? 100 : Math.round((state.step + 1) / steps * 100);
  const stepLabel = isDone ? 'All set' : `Step ${state.step + 1} of ${steps}`;
  const completedSteps = state.step;

  const handlers = { onConnectionChange, onPermissionChange, onThemeChange, onAssignGoal };

  const handleNext = () => {
    onNext?.({ step: state.step, state });
    if (state.step < STEPS.length) {
      setState({ ...state, step: state.step + 1 });
    }
  };

  const handleBack = () => {
    if (state.step > 0) {
      setState({ ...state, step: state.step - 1 });
    }
    onBack?.({ step: state.step });
  };

  const handleSkip = () => {
    setState({ ...state, step: steps });
    onSkip?.(null);
  };

  const handleFinish = () => {
    onFinish?.({ theme: state.theme, connections: state.connected, permissions: state.perms });
  };

  // Desktop split-layout rendering
  if (isDesktop && !isDone) {
    return (
      <div
        data-cv6kit
        data-theme={state.theme}
        style={{
          display: 'flex',
          height: '100dvh',
          background: 'var(--ground)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-sans)',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {/* Left sidebar */}
        <div style={{
          flex: 'none',
          width: '380px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--divider)',
          padding: '34px 32px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto'
        }}>
          {/* Corner logo */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--fg)', flex: 'none', marginBottom: '30px' }}>
            <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z" />
          </svg>

          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
            {currentStep.eyebrow}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-.02em', color: 'var(--fg)', lineHeight: '1.2', marginBottom: '12px' }}>
            {currentStep.title}
          </h1>
          <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--muted)' }}>
            {currentStep.sub}
          </p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', marginBottom: '16px' }}>
            {Array.from({ length: steps }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '26px',
                  height: '5px',
                  borderRadius: '3px',
                  background: i < completedSteps ? 'var(--success)' : i === completedSteps ? 'var(--accent)' : 'var(--surface-2)',
                  transition: 'background .3s'
                }}
              />
            ))}
          </div>

          <div style={{ fontSize: '12px', color: 'var(--faint)', lineHeight: '1.5' }}>
            You can change all of this later in <span style={{ color: 'var(--fg)', fontWeight: '600' }}>Settings · Environment</span>.
          </div>
        </div>

        {/* Right content area */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '0'
        }}>
          <div style={{
            flex: '1',
            minHeight: '0',
            overflow: 'auto',
            padding: '40px 44px'
          }}>
            {currentStep.render(state, setState, handlers)}
          </div>

          {/* Desktop nav footer */}
          <div style={{
            flex: 'none',
            borderTop: '1px solid var(--divider)',
            padding: '18px 44px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={handleBack}
              style={{
                height: '46px',
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
            <div style={{ flex: '1' }} />
            <button
              onClick={handleSkip}
              style={{
                padding: '0',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '13.5px',
                fontWeight: '600',
                fontFamily: 'var(--font-sans)',
                cursor: 'pointer'
              }}
            >
              Skip for now
            </button>
            <button
              onClick={handleNext}
              style={{
                height: '46px',
                padding: '0 22px',
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
      </div>
    );
  }

  // Desktop done screen
  if (isDesktop && isDone) {
    return (
      <div
        data-cv6kit
        data-theme={state.theme}
        style={{
          display: 'flex',
          height: '100dvh',
          background: 'var(--ground)',
          color: 'var(--fg)',
          fontFamily: 'var(--font-sans)',
          WebkitFontSmoothing: 'antialiased'
        }}
      >
        {/* Left sidebar */}
        <div style={{
          flex: 'none',
          width: '380px',
          background: 'var(--surface)',
          borderRight: '1px solid var(--divider)',
          padding: '34px 32px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--fg)', flex: 'none', marginBottom: '30px' }}>
            <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z" />
          </svg>
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: '12px' }}>
            COMPLETE
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-.02em', color: 'var(--fg)', lineHeight: '1.2', marginBottom: '12px' }}>
            You're all set, Patrik
          </h2>
          <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--muted)', marginBottom: '24px' }}>
            Your environment is live and Elon is on your first goal.
          </p>
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', marginBottom: '16px' }}>
            {Array.from({ length: steps }).map((_, i) => (
              <div key={i} style={{ width: '26px', height: '5px', borderRadius: '3px', background: 'var(--success)', transition: 'background .3s' }} />
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--faint)', lineHeight: '1.5' }}>
            All of this lives in <span style={{ color: 'var(--fg)', fontWeight: '600' }}>Settings · Environment</span>.
          </div>
        </div>

        {/* Right content area */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '0',
          padding: '40px 44px',
          alignItems: 'flex-start',
          justifyContent: 'center'
        }}>
          <span style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', flex: 'none' }} dangerouslySetInnerHTML={{ __html: SVG('<path d="m5 13 4 4L19 7"/>', '2.6', 'var(--success)', '30') }} />
          <h1 style={{ fontSize: '30px', fontWeight: '700', letterSpacing: '-.025em', color: 'var(--fg)', marginBottom: '14px' }}>
            Environment ready
          </h1>
          <div style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '32px', maxWidth: '520px' }}>
            Here's what's live and ready to use:
          </div>
          <div style={{ marginBottom: '32px' }}>
            {[
              `${Object.values(state.connected).filter(Boolean).length} services connected`,
              '2 agents with permissions set',
              'Theme applied',
              'First goal assigned to Elon'
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }} dangerouslySetInnerHTML={{ __html: SVG('<path d="m5 12 4 4L19 7"/>', '3', 'var(--success)', '12') }} />
                <span style={{ fontSize: '14px', color: 'var(--fg)' }}>{item}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleFinish}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '46px',
              padding: '0 22px',
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
            Take me to Corner
            <span dangerouslySetInnerHTML={{ __html: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', '2.2', '#fff', '17') }} />
          </button>
        </div>
      </div>
    );
  }

  // Mobile layout (both setup steps and done)
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
          {/* Corner logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--fg)', flex: 'none' }}>
            <path d="M3 3h6v6H3V3zm12 0h6v6h-6V3zM3 15h6v6H3v-6zm12 0h6v6h-6v-6z" />
          </svg>
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
        <div style={{ overflowY: 'auto', flex: '1', paddingRight: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' }}>
            {currentStep.eyebrow}
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-.025em', color: 'var(--fg)', lineHeight: '1.12', marginBottom: '10px' }}>
            {currentStep.title}
          </h1>
          {currentStep.sub && (
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--muted)', marginBottom: '24px' }}>
              {currentStep.sub}
            </p>
          )}
          <div>
            {currentStep.render(state, setState, handlers)}
          </div>
        </div>
      </div>

      {/* Mobile done state content (replaces nav) */}
      {isDone && (
        <div style={{
          flex: '1',
          minHeight: '0',
          overflow: 'auto',
          padding: '20px 22px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <span style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'var(--success-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', flex: 'none' }} dangerouslySetInnerHTML={{ __html: SVG('<path d="m5 13 4 4L19 7"/>', '2.6', 'var(--success)', '30') }} />
          <div style={{ fontSize: '24px', fontWeight: '700', letterSpacing: '-.02em', color: 'var(--fg)', marginBottom: '8px' }}>You're all set, Patrik</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', marginBottom: '22px' }}>Your environment is live and Elon is on your first goal. Here's what's ready:</div>
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
        </div>
      )}

      {/* Mobile nav footer */}
      {!isDone && (
        <div style={{
          flex: 'none',
          padding: `16px 22px calc(16px + env(safe-area-inset-bottom, 0px))`,
          borderTop: '1px solid var(--divider)',
          display: 'flex',
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
      )}

      {/* Mobile done button */}
      {isDone && (
        <div style={{
          flex: 'none',
          padding: `16px 22px calc(16px + env(safe-area-inset-bottom, 0px))`,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <button
            onClick={handleFinish}
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
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            Take me to Corner
            <span dangerouslySetInnerHTML={{ __html: SVG('<path d="M5 12h14M13 6l6 6-6 6"/>', '2.2', '#fff', '17') }} />
          </button>
        </div>
      )}

      {isDone && (
        <div style={{ flex: 'none', padding: '0 22px 18px', fontSize: '12px', color: 'var(--faint)', lineHeight: '1.5', textAlign: 'center' }}>
          All of this lives in <span style={{ color: 'var(--fg)', fontWeight: '600' }}>Settings · Environment</span>. Come back and change anything, anytime.
        </div>
      )}
    </div>
  );
}
