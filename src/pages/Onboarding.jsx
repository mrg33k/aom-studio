import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../dashboard/lib/supabase.js'
import { authFetch } from '../dashboard/lib/authFetch.js'

const STEPS = ['Welcome', 'Brain', 'Bring your world', 'Your work', 'Review', 'Ready']
const BRAINS = [
  { id: 'corner-free', name: 'Corner Free', note: 'Start immediately. Best for notes, search, and trying Corner.', badge: 'Recommended' },
  { id: 'claude', name: 'Claude', note: 'Connect your Claude account after setup through Corner’s connector.' },
  { id: 'chatgpt', name: 'ChatGPT / Codex', note: 'Use the Corner connector or pair Codex on your computer.' },
  { id: 'gemini', name: 'Gemini', note: 'Connect Corner where Gemini custom apps are available.' },
]

const slugify = (value) => String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48) || 'my-corner'
const splitProjects = (value) => String(value || '').split(/[\n,]/).map(v => v.trim()).filter(Boolean).slice(0, 12)

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

export default function Onboarding() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const query = useMemo(() => new URLSearchParams(window.location.search), [])
  const [step, setStep] = useState(() => Math.min(5, Math.max(0, Number(query.get('step') || sessionStorage.getItem('corner-onboarding-step') || 0))))
  const [brain, setBrain] = useState(() => localStorage.getItem('corner-onboarding-brain') || 'corner-free')
  const [workspace, setWorkspace] = useState('')
  const [work, setWork] = useState('')
  const [goal, setGoal] = useState('')
  const [files, setFiles] = useState([])
  const [connections, setConnections] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => {
      setUser(data?.user || null)
      const meta = data?.user?.user_metadata || {}
      setWorkspace(meta.workspace_name || meta.full_name || '')
    })
    refreshConnections()
    if (query.get('integrations') === 'error') setError('That email connection did not finish. You can retry or skip it for now.')
    if (query.get('integrations') === 'connected') setStep(2)
    window.history.replaceState(null, '', '/onboarding')
  }, [])

  useEffect(() => {
    sessionStorage.setItem('corner-onboarding-step', String(step))
    localStorage.setItem('corner-onboarding-brain', brain)
  }, [step, brain])

  async function refreshConnections() {
    try {
      const r = await authFetch('/api/integrations/list')
      const data = await r.json()
      const next = {}
      for (const item of data.integrations || []) if (item.status === 'connected') next[item.slug] = true
      setConnections(next)
    } catch {}
  }

  async function connectMail(slug) {
    setBusy(true); setError('')
    try {
      const returnTo = '/onboarding?step=2'
      const r = await authFetch(`/api/integrations/oauth/start?slug=${slug}&access=search&return_to=${encodeURIComponent(returnTo)}`)
      const data = await r.json()
      if (!r.ok || !data.authUrl) throw new Error(data.error || 'Connection unavailable')
      window.location.assign(data.authUrl)
    } catch (e) {
      setError(e.message || 'Connection unavailable')
      setBusy(false)
    }
  }

  function chooseFiles(event) {
    const chosen = Array.from(event.target.files || [])
    const allowed = chosen.filter(f => f.size <= 20 * 1024 * 1024).slice(0, 20)
    setFiles(prev => [...prev, ...allowed].slice(0, 20))
    if (allowed.length !== chosen.length) setError('Corner accepts up to 20 files here, 20 MB each. Larger folders can be added later in Files.')
    event.target.value = ''
  }

  async function finish() {
    if (!workspace.trim()) { setStep(3); setError('Give your Corner a name first.'); return }
    setBusy(true); setError('')
    const projects = splitProjects(work)
    const world = `${slugify(workspace)}-${String(user?.id || '').slice(0, 6)}`
    const firstProject = projects[0] || goal.trim() || 'Inbox'
    const plan = {
      user_profile: { name: user?.user_metadata?.full_name || user?.email || 'Corner member', business: workspace.trim(), focus: goal.trim(), brain },
      projects: (projects.length ? projects : [firstProject]).map(name => ({ name, slug: slugify(name), description: `Imported during setup for ${workspace.trim()}.` })),
      agents: [{ name: 'Corner', slug: 'corner', role: 'Workspace guide and project organizer', project: slugify(firstProject) }],
    }
    try {
      const create = await authFetch('/api/onboarding/create-agents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: world, plan }),
      })
      const created = await create.json()
      if (!create.ok) throw new Error(created.error || 'Could not create your Corner')
      await supabase?.auth.updateUser({ data: {
        world, workspace_name: workspace.trim(), preferred_brain: brain,
        onboarding_sources: Object.keys(connections).filter(k => connections[k]),
        onboarded: true, has_completed_onboarding: true,
      } })
      for (const file of files) {
        try {
          await authFetch('/api/dashboard/file-upload', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ world, filename: file.name, mime_type: file.type || 'application/octet-stream', data_base64: await fileToBase64(file) }),
          })
        } catch {}
      }
      localStorage.setItem('corner-onboarded', 'true')
      sessionStorage.removeItem('corner-onboarding-step')
      setStep(5)
    } catch (e) {
      setError(e.message || 'Setup paused. Your answers are still here—try again.')
    } finally { setBusy(false) }
  }

  const projects = splitProjects(work)
  const next = () => setStep(s => Math.min(5, s + 1))
  const back = () => setStep(s => Math.max(0, s - 1))

  return <main style={s.page}>
    <style>{`*{box-sizing:border-box}button,input,textarea{font:inherit}@media(max-width:720px){.ob-card{min-height:100dvh!important;border-radius:0!important}.ob-grid{grid-template-columns:1fr!important}.ob-body{padding:28px 20px!important}.ob-sources{grid-template-columns:1fr!important}}`}</style>
    <section className="ob-card" style={s.card}>
      <aside style={s.rail}>
        <div style={s.logo}>Corner<span style={{ color: '#F3A64A' }}>.</span></div>
        <div style={s.kicker}>WELCOME TO YOUR CORNER</div>
        <h1 style={s.railTitle}>Bring the work you already have.</h1>
        <p style={s.railCopy}>Corner turns notes, files, email, and unfinished ideas into projects you can actually move forward.</p>
        <div style={s.progress}>{STEPS.map((label, i) => <span key={label} aria-label={label} style={{ ...s.dot, width: i === step ? 26 : 7, background: i <= step ? '#F3A64A' : 'rgba(255,255,255,.14)' }} />)}</div>
        <p style={s.privacy}>Your optional connections stay under your control. Disconnect or delete imported data anytime in Settings.</p>
      </aside>
      <div className="ob-body" style={s.body}>
        <div style={s.stepLabel}>{step < 5 ? `STEP ${step + 1} OF 5` : 'YOUR CORNER IS READY'}</div>
        {error && <div role="alert" style={s.error}>{error}</div>}

        {step === 0 && <>
          <h2 style={s.title}>You don’t need to start from empty.</h2>
          <p style={s.sub}>We’ll help you choose a brain, bring in the material you already use, and shape a first set of projects. You approve the structure before Corner creates it.</p>
          <div className="ob-grid" style={s.grid}>
            <Promise icon="⌁" title="Capture anything" copy="Notes, files, loose ideas, and conversations land in one searchable place." />
            <Promise icon="◇" title="Find the projects" copy="Corner groups related work and keeps uncertain material safely in your Inbox." />
            <Promise icon="↗" title="Move it forward" copy="Agents work inside projects and bring decisions back to you." />
          </div>
        </>}

        {step === 1 && <>
          <h2 style={s.title}>Choose your starting brain.</h2>
          <p style={s.sub}>Corner Free lets everyone begin. Connecting a paid AI account is optional and can happen later in Settings.</p>
          <div style={{ display: 'grid', gap: 10 }}>{BRAINS.map(item => <button key={item.id} onClick={() => setBrain(item.id)} style={{ ...s.choice, borderColor: brain === item.id ? '#F3A64A' : 'rgba(255,255,255,.1)', background: brain === item.id ? 'rgba(243,166,74,.09)' : 'rgba(255,255,255,.025)' }}>
            <span style={{ flex: 1, textAlign: 'left' }}><strong style={s.choiceTitle}>{item.name}</strong><small style={s.choiceCopy}>{item.note}</small></span>
            {item.badge && <em style={s.badge}>{item.badge}</em>}<span style={s.radio}>{brain === item.id ? '●' : '○'}</span>
          </button>)}</div>
        </>}

        {step === 2 && <>
          <h2 style={s.title}>Bring your world into Corner.</h2>
          <p style={s.sub}>Upload useful files and optionally make email searchable. Email starts read-only: Corner cannot send, delete, archive, or move messages during setup.</p>
          <div className="ob-sources" style={{ ...s.grid, gridTemplateColumns: 'repeat(3,1fr)' }}>
            <Source title="Files & folders" copy={files.length ? `${files.length} file${files.length === 1 ? '' : 's'} ready to import` : 'Documents, notes, PDFs, images'} action={files.length ? 'Add more' : 'Choose files'} onClick={() => fileRef.current?.click()} active={files.length > 0} />
            <Source title="Gmail" copy="Search messages and attachments" action={connections.gmail ? 'Connected' : 'Connect read-only'} onClick={() => !connections.gmail && connectMail('gmail')} active={connections.gmail} disabled={busy} />
            <Source title="Outlook" copy="Search Microsoft mail" action={connections.outlook ? 'Connected' : 'Connect read-only'} onClick={() => !connections.outlook && connectMail('outlook')} active={connections.outlook} disabled={busy} />
          </div>
          <input ref={fileRef} type="file" multiple hidden onChange={chooseFiles} />
          {files.length > 0 && <div style={s.fileList}>{files.map((f, i) => <span key={`${f.name}-${i}`} style={s.fileChip}>{f.name}<button onClick={() => setFiles(v => v.filter((_, x) => x !== i))} aria-label={`Remove ${f.name}`} style={s.x}>×</button></span>)}</div>}
          <p style={s.note}>Signing in with Google or Microsoft and connecting a mailbox are separate choices. Corner never assumes mailbox permission from account signup.</p>
        </>}

        {step === 3 && <>
          <h2 style={s.title}>Tell Corner what you’re carrying.</h2>
          <p style={s.sub}>A rough list is perfect. Corner will suggest structure; it won’t expect you to design a filing system.</p>
          <label style={s.label}>WHAT SHOULD WE CALL YOUR CORNER?</label>
          <input value={workspace} onChange={e => setWorkspace(e.target.value)} placeholder="My work, Acme Studio, Alex’s Corner…" style={s.input} />
          <label style={s.label}>WHAT ARE YOU WORKING ON?</label>
          <textarea value={work} onChange={e => setWork(e.target.value)} placeholder={'Launch the new site\nOrganize customer research\nPlan the kitchen renovation'} style={{ ...s.input, minHeight: 116, resize: 'vertical' }} />
          <label style={s.label}>WHAT WOULD FEEL LIKE A WIN THIS WEEK?</label>
          <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="Know exactly what to do next" style={s.input} />
        </>}

        {step === 4 && <>
          <h2 style={s.title}>Here’s your starting Corner.</h2>
          <p style={s.sub}>This is a starting point, not a permanent taxonomy. Rename, merge, or archive anything later.</p>
          <div style={s.review}>
            <ReviewRow label="Corner" value={workspace || 'Name your Corner'} />
            <ReviewRow label="Brain" value={BRAINS.find(b => b.id === brain)?.name} />
            <ReviewRow label="Sources" value={[files.length && `${files.length} files`, connections.gmail && 'Gmail', connections.outlook && 'Outlook'].filter(Boolean).join(' · ') || 'Start fresh'} />
            <div style={{ paddingTop: 18 }}><div style={s.label}>SUGGESTED PROJECTS</div><div style={s.projectList}>{(projects.length ? projects : ['Inbox']).map(name => <span key={name} style={s.project}>◇ {name}</span>)}</div></div>
            <p style={{ ...s.note, marginBottom: 0 }}>Corner will also create an Inbox and one workspace guide. Imported email stays searchable; it is not copied into projects without your direction.</p>
          </div>
        </>}

        {step === 5 && <div style={{ textAlign: 'center', padding: '34px 0' }}>
          <div style={s.done}>✓</div><h2 style={s.title}>Welcome to {workspace || 'Corner'}.</h2>
          <p style={{ ...s.sub, marginInline: 'auto' }}>Your starting workspace is ready. Open your first project, add a note, or ask Corner to organize what you imported.</p>
          <button onClick={() => navigate('/dashboard', { replace: true })} style={s.primary}>Open my Corner →</button>
        </div>}

        {step < 5 && <footer style={s.footer}>
          <button onClick={back} disabled={step === 0 || busy} style={s.secondary}>Back</button>
          <span style={{ flex: 1 }} />
          {step === 2 && <button onClick={next} disabled={busy} style={s.skip}>Skip for now</button>}
          <button onClick={step === 4 ? finish : next} disabled={busy || (step === 3 && !workspace.trim())} style={s.primary}>{busy ? 'Working…' : step === 4 ? 'Create my Corner' : 'Continue'}</button>
        </footer>}
      </div>
    </section>
  </main>
}

function Promise({ icon, title, copy }) { return <div style={s.promise}><span style={s.icon}>{icon}</span><strong style={s.choiceTitle}>{title}</strong><small style={s.choiceCopy}>{copy}</small></div> }
function Source({ title, copy, action, onClick, active, disabled }) { return <button onClick={onClick} disabled={disabled} style={{ ...s.source, borderColor: active ? 'rgba(52,211,153,.55)' : 'rgba(255,255,255,.1)' }}><span style={{ ...s.sourceCheck, color: active ? '#34D399' : '#94A3B8' }}>{active ? '✓' : '+'}</span><strong style={s.choiceTitle}>{title}</strong><small style={s.choiceCopy}>{copy}</small><span style={{ ...s.sourceAction, color: active ? '#34D399' : '#F3A64A' }}>{action}</span></button> }
function ReviewRow({ label, value }) { return <div style={s.reviewRow}><span>{label}</span><strong>{value}</strong></div> }

const s = {
  page: { minHeight: '100vh', background: '#05080D', color: '#F5F0E8', display: 'grid', placeItems: 'center', padding: 20, fontFamily: "'Hanken Grotesk','Inter',system-ui,sans-serif" },
  card: { width: 'min(1120px,100%)', minHeight: 720, display: 'grid', gridTemplateColumns: '310px 1fr', border: '1px solid rgba(255,255,255,.09)', borderRadius: 24, overflow: 'hidden', background: '#0A0E16', boxShadow: '0 36px 100px rgba(0,0,0,.45)' },
  rail: { padding: '36px 30px', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 20% 5%,rgba(243,166,74,.11),transparent 38%),#070A10', borderRight: '1px solid rgba(255,255,255,.07)' },
  logo: { fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 27, marginBottom: 54 }, kicker: { fontSize: 10, letterSpacing: '.18em', color: '#F3A64A', fontWeight: 800 }, railTitle: { fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 36, lineHeight: 1.05, fontWeight: 400, margin: '16px 0' }, railCopy: { color: '#939CAA', fontSize: 14, lineHeight: 1.6 }, progress: { display: 'flex', gap: 7, marginTop: 'auto', alignItems: 'center' }, dot: { display: 'block', height: 7, borderRadius: 5, transition: 'all .2s' }, privacy: { color: '#596373', fontSize: 11.5, lineHeight: 1.55, marginTop: 18 },
  body: { minWidth: 0, padding: '44px 52px 28px', display: 'flex', flexDirection: 'column' }, stepLabel: { color: '#F3A64A', fontSize: 10, letterSpacing: '.16em', fontWeight: 800, marginBottom: 13 }, title: { fontFamily: "'Instrument Serif',Georgia,serif", fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1.06, fontWeight: 400, margin: '0 0 12px' }, sub: { color: '#98A2B1', fontSize: 15, lineHeight: 1.55, maxWidth: 650, margin: '0 0 28px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }, promise: { padding: 18, border: '1px solid rgba(255,255,255,.09)', borderRadius: 15, background: 'rgba(255,255,255,.025)', display: 'flex', flexDirection: 'column', gap: 9 }, icon: { fontSize: 25, color: '#F3A64A' }, choice: { width: '100%', minHeight: 72, padding: '13px 15px', border: '1px solid', borderRadius: 14, color: '#F5F0E8', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }, choiceTitle: { display: 'block', fontSize: 14, color: '#F5F0E8', fontStyle: 'normal' }, choiceCopy: { display: 'block', color: '#8E98A7', fontSize: 12.5, lineHeight: 1.4, marginTop: 3 }, badge: { color: '#F3A64A', border: '1px solid rgba(243,166,74,.3)', borderRadius: 20, padding: '4px 7px', fontSize: 9, fontStyle: 'normal' }, radio: { color: '#F3A64A', fontSize: 18 },
  source: { textAlign: 'left', minHeight: 164, padding: 17, border: '1px solid', borderRadius: 15, background: 'rgba(255,255,255,.025)', color: '#F5F0E8', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }, sourceCheck: { width: 29, height: 29, borderRadius: 9, background: 'rgba(255,255,255,.06)', display: 'grid', placeItems: 'center', marginBottom: 13, fontSize: 17 }, sourceAction: { fontSize: 11.5, fontWeight: 800, marginTop: 'auto' }, note: { color: '#687384', fontSize: 11.5, lineHeight: 1.55, marginTop: 18 }, fileList: { display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 14, maxHeight: 84, overflow: 'auto' }, fileChip: { display: 'flex', gap: 7, alignItems: 'center', padding: '6px 9px', borderRadius: 8, background: 'rgba(255,255,255,.06)', color: '#BAC2CE', fontSize: 11 }, x: { background: 'none', border: 0, color: '#8E98A7', cursor: 'pointer', padding: 0 },
  label: { display: 'block', fontSize: 9.5, letterSpacing: '.14em', fontWeight: 800, color: '#7E8998', margin: '0 0 7px' }, input: { width: '100%', border: '1px solid rgba(255,255,255,.11)', borderRadius: 11, background: 'rgba(255,255,255,.035)', color: '#F5F0E8', padding: '13px 14px', outline: 'none', marginBottom: 19 }, review: { border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, background: 'rgba(255,255,255,.025)', padding: '7px 19px 18px' }, reviewRow: { display: 'flex', justifyContent: 'space-between', gap: 20, padding: '13px 0', borderBottom: '1px solid rgba(255,255,255,.07)', color: '#7F8A99', fontSize: 13 }, projectList: { display: 'flex', flexWrap: 'wrap', gap: 8 }, project: { padding: '8px 10px', borderRadius: 9, background: 'rgba(243,166,74,.08)', color: '#E7C28E', fontSize: 12 },
  footer: { marginTop: 'auto', paddingTop: 28, display: 'flex', gap: 10, alignItems: 'center' }, primary: { border: 0, borderRadius: 10, background: '#F3A64A', color: '#171008', padding: '11px 17px', fontWeight: 800, cursor: 'pointer' }, secondary: { border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, background: 'transparent', color: '#9AA4B2', padding: '10px 15px', cursor: 'pointer' }, skip: { border: 0, background: 'transparent', color: '#7D8795', cursor: 'pointer' }, error: { border: '1px solid rgba(248,113,113,.25)', background: 'rgba(248,113,113,.08)', color: '#FCA5A5', borderRadius: 10, padding: '9px 11px', fontSize: 12, marginBottom: 16 }, done: { width: 68, height: 68, borderRadius: 22, display: 'grid', placeItems: 'center', color: '#34D399', background: 'rgba(52,211,153,.1)', margin: '0 auto 22px', fontSize: 30 },
}
