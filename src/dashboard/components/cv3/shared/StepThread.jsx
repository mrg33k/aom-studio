// R65-impl: StepThread + ThreadStepIndicator production primitives.
//
// Lifts the live-thread feel from the /design/r65-live-thread mockup
// (Steffen's R65-design v3 at commit 7206dd4) into real chat surfaces.
// Renders below an assistant message while steps accumulate, settles
// under the final reply when the parent message's text becomes non-empty.
//
// Props:
//   steps     — array of step rows: { id, step_index, text, status, timestamp }
//               status: 'in_progress' | 'done' | 'error'
//   settled   — when true, dots freeze + dim; final message is the anchor
//   isError   — global error (e.g. parent failed); every step gets red X
//   agentColor — brand color for active dot
//
import React, { useEffect, useState } from 'react'

let _stylesInjected = false
function ensureStyles() {
  if (_stylesInjected || typeof document === 'undefined') return
  _stylesInjected = true
  const s = document.createElement('style')
  s.id = 'r65-step-thread-styles'
  s.textContent = `
    @keyframes r65StepDot { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
    @keyframes r65StepFade { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
  `
  document.head.appendChild(s)
}

function StepDot({ status, agentColor, settled }) {
  const size = 8
  if (status === 'error') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: '#EF4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 7, fontWeight: 900, flexShrink: 0,
      }}>×</div>
    )
  }
  if (status === 'done' || settled) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: agentColor,
        opacity: settled ? 0.5 : 0.9,
        flexShrink: 0,
        boxShadow: settled ? 'none' : `0 0 4px ${agentColor}`,
      }} />
    )
  }
  // in_progress
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: agentColor,
      flexShrink: 0,
      animation: 'r65StepDot 1.4s ease-in-out infinite',
      boxShadow: `0 0 6px ${agentColor}`,
    }} />
  )
}

function Connector({ agentColor, settled }) {
  return (
    <div style={{
      width: 2, height: 10, marginLeft: 3,
      background: settled ? 'rgba(255,255,255,0.10)' : `${agentColor}55`,
      borderRadius: 1,
    }} />
  )
}

export function ThreadStepIndicator({ step, isLast, agentColor, settled }) {
  useEffect(() => { ensureStyles() }, [])
  const dim = settled && step.status !== 'error' ? 0.5 : 1
  return (
    <div
      data-testid={`step-row-${step.step_index}`}
      data-status={step.status}
      style={{ animation: 'r65StepFade 0.25s ease-out' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <StepDot status={step.status} agentColor={agentColor} settled={settled} />
        <span style={{
          fontSize: 12,
          color: step.status === 'error' ? '#EF4444' : '#CBD5E1',
          fontFamily: "'Space Grotesk', sans-serif",
          opacity: dim,
          lineHeight: 1.5,
        }}>
          {step.text}
        </span>
      </div>
      {!isLast && (
        <div style={{ paddingLeft: 0 }}>
          <Connector agentColor={agentColor} settled={settled} />
        </div>
      )}
    </div>
  )
}

export default function StepThread({ steps, settled, isError, agentColor = '#3B82F6' }) {
  if (!steps || steps.length === 0) return null
  const sorted = [...steps].sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
  return (
    <div
      data-testid="step-thread"
      data-settled={settled ? 'true' : 'false'}
      data-error={isError ? 'true' : 'false'}
      style={{
        display: 'flex', flexDirection: 'column',
        gap: 0, padding: '4px 0',
        opacity: settled ? 0.85 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      {sorted.map((step, idx) => (
        <ThreadStepIndicator
          key={step.id || `step-${step.step_index}`}
          step={step}
          isLast={idx === sorted.length - 1}
          agentColor={agentColor}
          settled={settled}
        />
      ))}
    </div>
  )
}
