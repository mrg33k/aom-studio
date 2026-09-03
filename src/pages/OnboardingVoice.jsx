// OB1: 3-question voice onboarding: state machine + EA narration + real scaffolding.
// LR-2 (2026-05-05): Q1 persists workspaceName, Q2 persists workAreas (recipe flask
// seeds), Q3 creates a project row + fires /api/dashboard/scaffold-project, DONE flips
// onboarded=true. All writes are best-effort: a failed write never traps the user;
// localStorage still flips on DONE and the next session can self-heal.
// corner:retire-supabase R3: identity and preferences come from Convex
// (users:viewer / users:setPrefs via lib/auth.js); the project row is projects:upsert.
import React, { useReducer, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, updateUserPreferences } from '../dashboard/lib/auth.js'
import { convexMutation, hasSession } from '../dashboard/lib/convex.js'
import { authFetch } from '../dashboard/lib/authFetch.js'
import StepThread from '../dashboard/components/cv3/shared/StepThread.jsx'

// --- Domain keyword → category ---
const DOMAIN_PATTERNS = [
  { keywords: ['video', 'film', 'footage', 'edit', 'editing', 'production'], domain: 'video', icon: '🎬', label: 'Video' },
  { keywords: ['brand', 'design', 'visual', 'logo', 'graphic', 'creative'], domain: 'brand', icon: '🎨', label: 'Design' },
  { keywords: ['code', 'dev', 'build', 'software', 'engineer', 'programming', 'developer'], domain: 'code', icon: '💻', label: 'Code' },
  { keywords: ['sales', 'outreach', 'leads', 'pipeline', 'crm', 'revenue', 'marketing'], domain: 'sales', icon: '📈', label: 'Sales' },
  { keywords: ['ops', 'admin', 'scheduling', 'calendar', 'operations', 'management'], domain: 'ops', icon: '⚙️', label: 'Ops' },
]

function matchDomains(text) {
  const lower = text.toLowerCase()
  const matched = DOMAIN_PATTERNS.filter(p => p.keywords.some(k => lower.includes(k)))
  return matched.length > 0 ? matched : [{ domain: 'general', icon: '⭐', label: 'General' }]
}

// --- LR-2 real scaffolds (best-effort; never throws past the caller) ---

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'first-project'
}

function persistWorkspaceName(workspaceName) {
  if (!hasSession() || !workspaceName) return
  updateUserPreferences({ workspaceName, workspace_name: workspaceName }).catch(() => {})
}

function persistWorkAreas(domains) {
  if (!hasSession() || !Array.isArray(domains) || !domains.length) return
  const tags = domains.map(d => d.domain).filter(Boolean)
  if (!tags.length) return
  updateUserPreferences({ workAreas: tags, work_areas: tags }).catch(() => {})
}

async function scaffoldFirstProject({ firstThing, workspaceName, worldSlug }) {
  if (!hasSession() || !worldSlug || !firstThing) return { ok: false }
  const name = firstThing.trim().slice(0, 80) || 'First project'
  const slug = slugify(name)
  const description = workspaceName
 ? `${workspaceName}'s first project, created during voice onboarding.`
 : 'First project, created during voice onboarding.'
  try {
    // projects:upsert is an upsert by slug inside the world, so a repeat is harmless.
    await convexMutation('projects:upsert', {
      slug,
      name,
      color: '#E85D26',
      isActive: true,
      worldSlug,
      clientId: worldSlug,
    })
  } catch (_) { /* best-effort */ }
  try {
    await authFetch('/api/dashboard/scaffold-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name, description, tenant: worldSlug }),
    })
  } catch (_) { /* best-effort */ }
  return { ok: true, slug, name }
}

function markOnboardingComplete() {
  if (!hasSession()) return
  updateUserPreferences({ onboarded: true, has_completed_onboarding: true }).catch(() => {})
}

// --- State machine ---
function reducer(state, action) {
  switch (action.type) {
    case 'START':          return { ...state, phase: 'Q1_LISTENING' }
    case 'SET_INTERIM':    return { ...state, interim: action.text }
    case 'CONFIRM_Q1':     return { ...state, phase: 'Q1_CONFIRMED', workspace: action.text, interim: '' }
    case 'TO_Q2':          return { ...state, phase: 'Q2_LISTENING' }
    case 'CONFIRM_Q2':     return { ...state, phase: 'Q2_CONFIRMED', domains: matchDomains(action.text), interim: '' }
    case 'TO_Q3':          return { ...state, phase: 'Q3_LISTENING' }
    case 'CONFIRM_Q3':     return { ...state, phase: 'Q3_CONFIRMED', firstThing: action.text, interim: '' }
    case 'START_SCAFFOLD': return { ...state, phase: 'SCAFFOLDING', scaffoldSteps: [
      { id: 's1', step_index: 0, text: 'Creating your workspace...', status: 'in_progress' },
    ]}
    case 'SCAFFOLD_ADD':    return { ...state, scaffoldSteps: [...state.scaffoldSteps, action.step] }
    case 'SCAFFOLD_UPDATE': return {
      ...state,
      scaffoldSteps: state.scaffoldSteps.map(s => s.id === action.id ? { ...s, status: action.status } : s),
    }
    case 'DONE': return { ...state, phase: 'DONE' }
    // R75-d2: direct-set for resume-from-checkpoint
    case 'RESUME': return {
      ...initialState,
      phase: action.resumePhase || 'Q1_LISTENING',
      workspace: action.workspace || '',
      domains: action.domains || [],
      firstThing: action.firstThing || '',
    }
    default:     return state
  }
}

const initialState = { phase: 'INTRO', workspace: '', domains: [], firstThing: '', interim: '', scaffoldSteps: [] }

// --- Speech helpers ---
function narrate(text) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 0.92
  window.speechSynthesis.speak(u)
}

function openMic(onInterim, onFinal, onError) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
 if (!SR) { onError('Voice not supported, type below instead.'); return null }
  const rec = new SR()
  rec.continuous = false
  rec.interimResults = true
  rec.lang = 'en-US'
  let finalText = ''
  rec.onresult = (e) => {
    let interim = ''
    for (const r of e.results) {
      if (r.isFinal) finalText += r[0].transcript
      else interim += r[0].transcript
    }
    if (interim) onInterim(interim)
  }
  rec.onend = () => {
    if (finalText.trim()) onFinal(finalText.trim())
 else onError('Nothing heard, tap mic to try again.')
  }
  rec.onerror = (e) => {
 onError(e.error === 'no-speech' ? 'Nothing heard, tap mic to try again.' : `Mic: ${e.error}`)
  }
  rec.start()
  return rec
}

// --- Component ---
export default function OnboardingVoice() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [micError, setMicError] = useState('')
  const [textMode, setTextMode] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [narrationLine, setNarrationLine] = useState('')
  const [scaffoldSettled, setScaffoldSettled] = useState(false)
  const recRef = useRef(null)
  const isQaMode = sessionStorage.getItem('corner-qa-active') === 'true'
  const voiceAvailable = !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  const { state: locationState } = useLocation()
  const isResumeMode = locationState?.resume === true

  // Skip onboarding if user already has a world (skip in resume mode)
  useEffect(() => {
    if (!hasSession() || isQaMode || isResumeMode) return
    getCurrentUser().then((user) => {
      const meta = user?.user_metadata || {}
      if (meta.world || meta.onboarded || localStorage.getItem('corner-onboarded') === 'true') {
        navigate('/dashboard', { replace: true })
      }
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // R75-d2: restore saved checkpoint when resuming mid-flow
  useEffect(() => {
    if (!isResumeMode) return
    const saved = localStorage.getItem('ob-resume-state')
    if (!saved) return
    try {
      const { resumePhase, workspace, domains } = JSON.parse(saved)
      dispatch({ type: 'RESUME', resumePhase, workspace, domains })
    } catch (_) {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function stopMic() {
    if (recRef.current) { try { recRef.current.abort() } catch {} recRef.current = null }
  }

  function listen(onFinal) {
    stopMic(); setMicError(''); setTextInput(''); dispatch({ type: 'SET_INTERIM', text: '' })
    recRef.current = openMic(
      (t) => dispatch({ type: 'SET_INTERIM', text: t }),
      onFinal,
      (e) => setMicError(e),
    )
  }

  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1) }
  function handleQ1(text) { dispatch({ type: 'CONFIRM_Q1', text: cap(text) }) }
  function handleQ2(text) { dispatch({ type: 'CONFIRM_Q2', text }) }
  function handleQ3(text) { dispatch({ type: 'CONFIRM_Q3', text: cap(text) }) }

  function submitText(handler) {
    const val = textInput.trim()
    if (!val) return
    setTextMode(false)
    handler(val)
  }

  // R75-d2: persist resume checkpoint so chat-header CTA can restore mid-flow
  useEffect(() => {
    const { phase, workspace, domains } = state
    if (phase === 'Q1_CONFIRMED') {
      localStorage.setItem('ob-resume-state', JSON.stringify({ resumePhase: 'Q2_LISTENING', workspace }))
    } else if (phase === 'Q2_CONFIRMED') {
      localStorage.setItem('ob-resume-state', JSON.stringify({ resumePhase: 'Q3_LISTENING', workspace, domains }))
    } else if (phase === 'DONE') {
      localStorage.removeItem('ob-resume-state')
    }
  }, [state.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Phase-driven state machine
  useEffect(() => {
    const { phase, workspace, domains, firstThing } = state

    if (phase === 'Q1_LISTENING') {
      setTextMode(false); listen(handleQ1)
      return () => stopMic()
    }
    if (phase === 'Q1_CONFIRMED') {
      const line = `Setting up ${workspace} as your home base.`
      setNarrationLine(line); narrate(line)
      // LR-2: persist workspace name to the person's preferences so dashboard + recipes flask read it.
      persistWorkspaceName(workspace)
      const t = setTimeout(() => dispatch({ type: 'TO_Q2' }), 2400)
      return () => clearTimeout(t)
    }
    if (phase === 'Q2_LISTENING') {
      setNarrationLine(''); setTextMode(false); listen(handleQ2)
      return () => stopMic()
    }
    if (phase === 'Q2_CONFIRMED') {
      const line = `Adding ${domains.map(d => d.label).join(' and ')} tools to your toolkit.`
      setNarrationLine(line); narrate(line)
      // LR-2: seed the recipe flask — domain tags drive which recipe categories the
      // dashboard surfaces in the agent + project chat overlays.
      persistWorkAreas(domains)
      const t = setTimeout(() => dispatch({ type: 'TO_Q3' }), 2400)
      return () => clearTimeout(t)
    }
    if (phase === 'Q3_LISTENING') {
      setNarrationLine(''); setTextMode(false); listen(handleQ3)
      return () => stopMic()
    }
    if (phase === 'Q3_CONFIRMED') {
      const line = `Scaffolding ${firstThing} as your first project. Your EA is reading the brief now.`
      setNarrationLine(line); narrate(line)
      const t = setTimeout(() => dispatch({ type: 'START_SCAFFOLD' }), 2800)
      return () => clearTimeout(t)
    }
    if (phase === 'SCAFFOLDING') {
      setNarrationLine('')
      // LR-2: fire the real project scaffold in parallel with the visible step thread.
      // Best-effort — a failure does not trap the user; localStorage still flips on DONE.
      let cancelled = false
      ;(async () => {
        try {
          const user = await getCurrentUser()
          const worldSlug = user?.user_metadata?.world || ''
          if (worldSlug) {
            await scaffoldFirstProject({ firstThing, workspaceName: workspace, worldSlug })
          }
        } catch (_) { /* best-effort */ }
        if (cancelled) return
      })()
      const t1 = setTimeout(() => {
        dispatch({ type: 'SCAFFOLD_UPDATE', id: 's1', status: 'done' })
        dispatch({ type: 'SCAFFOLD_ADD', step: { id: 's2', step_index: 1, text: 'Spinning up your EA...', status: 'in_progress' } })
      }, 2000)
      const t2 = setTimeout(() => {
        dispatch({ type: 'SCAFFOLD_UPDATE', id: 's2', status: 'done' })
        dispatch({ type: 'SCAFFOLD_ADD', step: { id: 's3', step_index: 2, text: `Scaffolding "${firstThing}"...`, status: 'in_progress' } })
        narrate('Your EA is online.')
      }, 4200)
      const t3 = setTimeout(() => {
        dispatch({ type: 'SCAFFOLD_UPDATE', id: 's3', status: 'done' })
        setScaffoldSettled(true)
        narrate("You're ready. Welcome to your command center.")
      }, 6400)
      const t4 = setTimeout(() => dispatch({ type: 'DONE' }), 8200)
      return () => {
        cancelled = true
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
      }
    }
    if (phase === 'DONE') {
      // LR-2: flip the persistent onboarding flag in preferences so AuthGuard's
      // DB-side check passes on the next login / new device. localStorage stays as
      // a fast-path signal for the same session.
      markOnboardingComplete()
      localStorage.setItem('corner-onboarded', 'true')
      if (isQaMode) sessionStorage.setItem('corner-qa-completed', 'true')
      navigate('/dashboard', { replace: true })
    }
  }, [state.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { stopMic(); window.speechSynthesis?.cancel() }, [])

  // Mic panel — called as renderMicPanel(handler), not as a component
  function renderMicPanel(handler) {
    return (
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        {state.interim && <div style={s.interim}>"{state.interim}"</div>}
        {micError && <div style={s.err}>{micError}</div>}
        <button onClick={() => listen(handler)} style={s.micBtn}>
          <span style={{ fontSize: 22 }}>🎤</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Tap to speak</span>
        </button>
        {voiceAvailable && (
          <button onClick={() => setTextMode(t => !t)} style={s.textToggle}>
            {textMode ? 'Use mic instead' : 'Type instead'}
          </button>
        )}
        {(textMode || !voiceAvailable) && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <input
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitText(handler)}
              placeholder="Type your answer..."
              style={s.input}
            />
            <button onClick={() => submitText(handler)} style={s.go}>Go</button>
          </div>
        )}
      </div>
    )
  }

  const { phase, workspace, domains, firstThing, scaffoldSteps } = state

  return (
    <div style={s.page}>
      <div style={s.glow} />
      <div style={s.hex} />
      <div style={s.mark}>Corner<span style={{ color: '#E85D26' }}>.</span></div>

      {isQaMode && (
        <div style={s.qaBar}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#60A5FA' }}>QA Testing Mode</span>
          <button onClick={() => { sessionStorage.removeItem('corner-qa-active'); sessionStorage.removeItem('corner-qa-completed'); window.location.href = '/dashboard' }} style={s.qaBtn}>
            Return to AOM
          </button>
        </div>
      )}

      <div style={s.content}>

        {phase === 'INTRO' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
            <h1 style={s.h1}>Let's set up your command center.</h1>
            <p style={s.sub}>3 questions. 90 seconds.</p>
            <button onClick={() => dispatch({ type: 'START' })} style={{ ...s.cta, marginTop: 28 }}>
              Get started
            </button>
          </div>
        )}

        {phase === 'Q1_LISTENING' && (
          <div>
            <div style={s.qlabel}>Question 1 of 3</div>
            <h2 style={s.h2}>What's your workspace called?</h2>
 <p style={s.sub}>Your name, your business, whatever feels right.</p>
            {renderMicPanel(handleQ1)}
          </div>
        )}

        {phase === 'Q1_CONFIRMED' && (
          <div style={{ textAlign: 'center' }}>
            <div style={s.badge}>{workspace}</div>
            <p style={{ ...s.nar, marginTop: 20 }}>{narrationLine}</p>
          </div>
        )}

        {phase === 'Q2_LISTENING' && (
          <div>
            <div style={s.qlabel}>Question 2 of 3</div>
            <h2 style={s.h2}>What kinds of work do you do?</h2>
 <p style={s.sub}>Video, brand, code, sales, ops, or anything else.</p>
            {renderMicPanel(handleQ2)}
          </div>
        )}

        {phase === 'Q2_CONFIRMED' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              {domains.map(d => (
                <div key={d.domain} style={s.pill}>
                  <span style={{ fontSize: 20 }}>{d.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9' }}>{d.label}</span>
                </div>
              ))}
            </div>
            <p style={s.nar}>{narrationLine}</p>
          </div>
        )}

        {phase === 'Q3_LISTENING' && (
          <div>
            <div style={s.qlabel}>Question 3 of 3</div>
            <h2 style={s.h2}>What's the first thing you want help with?</h2>
 <p style={s.sub}>A project, a task, a challenge, anything on your mind.</p>
            {renderMicPanel(handleQ3)}
          </div>
        )}

        {phase === 'Q3_CONFIRMED' && (
          <div style={{ textAlign: 'center' }}>
            <div style={s.badge}>{firstThing}</div>
            <p style={{ ...s.nar, marginTop: 20 }}>{narrationLine}</p>
          </div>
        )}

        {phase === 'SCAFFOLDING' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={s.h1}>Building your Corner...</h2>
            <p style={{ ...s.sub, marginBottom: 28 }}>{workspace && `${workspace}'s command center is coming online.`}</p>
            <div style={{ maxWidth: 280, margin: '0 auto', textAlign: 'left' }}>
              <StepThread steps={scaffoldSteps} settled={scaffoldSettled} agentColor="#E85D26" />
            </div>
          </div>
        )}

        {phase === 'DONE' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>◈</div>
            <h2 style={s.h1}>Your command center is ready.</h2>
          </div>
        )}

      </div>
      <style>{`* { box-sizing: border-box; }`}</style>
    </div>
  )
}

// --- Styles ---
const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #060A14 0%, #0A0F1E 50%, #080C16 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '80px 16px 40px', fontFamily: "'Inter', system-ui, sans-serif",
    position: 'relative', overflow: 'hidden',
  },
  glow: {
    position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
    width: 600, height: 400, pointerEvents: 'none',
    background: 'radial-gradient(ellipse at center, rgba(232,93,38,0.06) 0%, transparent 65%)',
  },
  hex: {
    position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='104'%3E%3Cpath d='M60 2 L118 32 L118 72 L60 102 L2 72 L2 32 Z' fill='none' stroke='rgba(59,130,246,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'repeat',
  },
  mark: { position: 'absolute', top: 28, left: 28, fontSize: 18, fontWeight: 900, color: '#F1F5F9', letterSpacing: '0.01em', zIndex: 10 },
  qaBar: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px',
    background: 'rgba(59,130,246,0.12)', borderBottom: '1px solid rgba(59,130,246,0.2)', backdropFilter: 'blur(12px)',
  },
  qaBtn: {
    padding: '6px 14px', borderRadius: 8, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)',
    color: '#93C5FD', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
  },
  content: { position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 },
  h1: { fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.1 },
  h2: { fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 900, color: '#F1F5F9', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.15 },
  sub: { fontSize: 14, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 },
  qlabel: { fontSize: 11, fontWeight: 600, color: '#E85D26', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 12 },
  nar: { fontSize: 16, color: '#94A3B8', lineHeight: 1.6, fontStyle: 'italic' },
  badge: {
    display: 'inline-block', padding: '12px 24px',
    background: 'rgba(232,93,38,0.1)', border: '2px solid rgba(232,93,38,0.4)', borderRadius: 12,
    fontSize: 20, fontWeight: 700, color: '#F1F5F9',
  },
  pill: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
  },
  interim: { fontSize: 15, color: '#F1F5F9', marginBottom: 16, fontStyle: 'italic', minHeight: 22 },
  err: { fontSize: 13, color: '#F87171', marginBottom: 10 },
  micBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px',
    background: 'rgba(232,93,38,0.12)', border: '2px solid rgba(232,93,38,0.4)', borderRadius: 10,
    cursor: 'pointer', color: '#E85D26', fontFamily: "'Inter', system-ui, sans-serif",
  },
  textToggle: {
    display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
    fontSize: 13, color: '#475569', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif", textDecoration: 'underline',
  },
  input: {
    flex: 1, padding: '10px 14px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
    fontSize: 14, color: '#F1F5F9', fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
  },
  cta: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '13px 32px',
    background: 'linear-gradient(135deg, #E85D26, #C44B1C)', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Inter', system-ui, sans-serif",
    cursor: 'pointer', letterSpacing: '0.02em', boxShadow: '0 4px 16px rgba(232,93,38,0.35)',
  },
  get go() { return { ...this.cta, padding: '10px 16px', fontSize: 13, boxShadow: 'none' } },
}