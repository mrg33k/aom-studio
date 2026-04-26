import { useEffect, useState, useCallback } from 'react'
import { C } from '../../../lib/cv3Colors.js'
import { authFetch } from '../../../lib/authFetch.js'

// Tenant-agnostic onboarding CTA for R33.
//
// Reads /api/dashboard/onboarding-state?tenant=<slug>. If the checklist has any
// pending items AND the user hasn't explicitly said no, renders a small
// persistent tooltip in the chat header ("Finish onboarding here").
//
// Tooltip-over-banner is deliberate: always available, never demanding. Click
// resumes the next unfilled item by posting the item key back as a chat
// message via the parent's onResume callback. The tooltip vanishes when the
// last item closes (empty or all-done checklist).
//
// No tenant is hardcoded. Ben is the proving case, not the shape.
export default function OnboardingTooltip({ tenant, onResume }) {
  const [state, setState] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  const refresh = useCallback(async () => {
    if (!tenant) return
    try {
      const r = await authFetch(`/api/dashboard/onboarding-state?tenant=${encodeURIComponent(tenant)}`)
      if (!r.ok) return
      const data = await r.json()
      setState(data.state || null)
    } catch (_) { /* silent -- tooltip just won't render */ }
  }, [tenant])

  useEffect(() => { refresh() }, [refresh])

  useEffect(() => {
    // Poll slowly for updates (under the 60s cost-discipline floor is fine at 60s).
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [refresh])

  if (!state || dismissed) return null

  const pending = (state.checklist || []).filter(i => i && i.status !== 'done')
  const explicitNo = !!(state.nudge_state && state.nudge_state.explicit_no)
  // Only render when the user is on the "projects" path with a half-complete
  // checklist. If they're actively onboarding (path === 'onboarding') the
  // checklist IS the conversation, no tooltip needed.
  if (!pending.length) return null
  if (explicitNo) return null
  if (state.path === 'onboarding') return null

  const nextItem = pending[0]
  const label = nextItem?.label || 'Finish onboarding'

  return (
    <button
      data-testid="onboarding-tooltip"
      title={`Next: ${label}`}
      onClick={() => {
        // Parent owns the resume action: typically posts `resume_onboarding`
        // into the chat so the EA picks up the next checklist item.
        onResume?.(nextItem)
      }}
      style={{
        height: 26,
        padding: '0 10px',
        borderRadius: 14,
        flexShrink: 0,
        background: 'rgba(110, 231, 183, 0.12)',
        border: '1px solid rgba(110, 231, 183, 0.35)',
        color: '#6EE7B7',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
        maxWidth: 220,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#6EE7B7',
          boxShadow: '0 0 6px #6EE7B7',
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Finish onboarding
      </span>
    </button>
  )
}

// Exported setter other components can call after "no thanks" flows.
export function dismissOnboardingTooltip(/* tenant */) {
  // Placeholder for future per-tenant dismiss persistence. For now the
  // server-side nudge_state.explicit_no covers the persistent "stop" flow.
}
