// R65-impl + R75-r65-e/f: StepThread + ThreadStepIndicator production primitives.
//
// Lifts the live-thread feel from the /design/r65-live-thread mockup
// (Steffen's R65-design v3 at commit 7206dd4) into real chat surfaces.
// Renders below an assistant message while steps accumulate, settles
// under the final reply when the parent message's text becomes non-empty.
// Also renders under a USER message while the agent is mid-work
// (R75-r65-e: parent_message_id=<user_msg_id>, settles when reply lands).
//
// Props:
//   steps     — array of step rows: { id, step_index, text, status, timestamp }
//               status: 'in_progress' | 'done' | 'error'
//   settled   — when true, dots freeze + dim; final message is the anchor
//   isError   — global error (e.g. parent failed); every step gets red X
//   agentColor — brand color for active dot
//
import React, { useEffect } from 'react'

let _stylesInjected = false
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const s = document.createElement('style')
  s.id = 'r65-step-thread-styles'
  s.textContent = `
    @keyframes r65StepBreathe {
      0%,100% { transform: scale(0.85); opacity: 0.6; box-shadow: 0 0 0 0 rgba(255,255,255,0); }
      50%     { transform: scale(1.15); opacity: 1;   box-shadow: 0 0 0 4px rgba(255,255,255,0.06); }
    }
    @keyframes r65StepFade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes r65PulseTravel {
      0%   { top: -45%; opacity: 0; }
      15%  { opacity: 1; }
      85%  { opacity: 1; }
      100% { top: 145%; opacity: 0; }
    }
  `
  document.head.appendChild(s)
}

function StepDot({ status, agentColor, settled }) {
  // R65-design: 6px done (with check), 8px active (breathing), 6px pending
  if (status === 'error') {
    return (
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: '#EF4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 7, fontWeight: 900, flexShrink: 0,
      }}>×</div>
    )
  }
  if (status === 'done' || settled) {
    return (
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: '#334155',
        opacity: settled ? 0.6 : 0.95,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="3" height="3" viewBox="0 0 4 4" style={{ display: 'block' }}>
          <path d="M0.5 2 L1.5 3 L3.5 1" stroke="#475569" strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    )
  }
  // in_progress
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: agentColor,
      flexShrink: 0,
      animation: 'r65StepBreathe 2s ease-in-out infinite',
      boxShadow: `0 0 6px ${agentColor}`,
    }} />
  )
}

// Connector ROW — sits BETWEEN step rows, taller (18px), pulsing line
// when adjacent step is active. R65-design "pulsing" connector style.
function ConnectorRow({ active, settled, agentColor }) {
  const baseColor = settled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.10)'
  return (
    <div style={{ display: 'flex', height: 18 }}>
      <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 1, height: 18,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: baseColor,
            transition: 'background 0.4s ease',
          }} />
          {active && !settled && (
            <div style={{
              position: 'absolute', left: 0, right: 0,
              height: '40%',
              background: `linear-gradient(to bottom, transparent, ${agentColor}, transparent)`,
              animation: 'r65PulseTravel 1.1s ease-in-out infinite',
              willChange: 'top',
            }} />
          )}
        </div>
      </div>
      <div style={{ flex: 1 }} />
    </div>
  )
}

export function ThreadStepIndicator({ step, agentColor, settled }) {
  useEffect(() => { ensureStyles() }, [])
  const dim = settled && step.status !== 'error' ? 0.45 : 1
  return (
    <div
      data-testid={`step-row-${step.step_index}`}
      data-status={step.status}
      style={{
        animation: 'r65StepFade 0.25s ease-out',
        display: 'flex', alignItems: 'center',
        minHeight: 22,
      }}
    >
      <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        <StepDot status={step.status} agentColor={agentColor} settled={settled} />
      </div>
      <span style={{
        fontSize: 12,
        color: step.status === 'error' ? '#EF4444' :
               step.status === 'in_progress' && !settled ? agentColor :
               '#94A3B8',
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: step.status === 'in_progress' && !settled ? 500 : 400,
        opacity: dim,
        lineHeight: 1.4,
        paddingLeft: 4,
        transition: 'color 0.3s ease, opacity 0.3s ease',
      }}>
        {step.text}
      </span>
    </div>
  )
}

export default function StepThread({ steps, settled, isError, agentColor = '#3B82F6' }) {
  useEffect(() => { ensureStyles() }, [])
  if (!steps || steps.length === 0) return null
  const sorted = [...steps].sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
  return (
    <div
      data-testid="step-thread"
      data-settled={settled ? 'true' : 'false'}
      data-error={isError ? 'true' : 'false'}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '4px 0',
        opacity: settled ? 0.55 : 1,
        transition: 'opacity 0.45s ease',
      }}
    >
      {sorted.map((step, idx) => {
        const prev = idx > 0 ? sorted[idx - 1] : null
        const connectorActive = !!prev && (step.status === 'in_progress' || prev.status === 'in_progress')
        return (
          <React.Fragment key={step.id || `step-${step.step_index}`}>
            {idx > 0 && (
              <ConnectorRow
                active={connectorActive}
                settled={settled}
                agentColor={agentColor}
              />
            )}
            <ThreadStepIndicator
              step={step}
              agentColor={agentColor}
              settled={settled || isError}
            />
          </React.Fragment>
        )
      })}
    </div>
  )
}
