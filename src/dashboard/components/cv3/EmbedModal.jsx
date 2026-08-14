// EmbedModal — turn the current project/mission room into an embeddable
// chat widget for any external website. Opened by /embed slash command in
// ProjectInputBar. Pre-fills routing (agent / project / mission_slug) from
// room context; user fills placement (hosts, opening, theme).
//
// Two screens:
//   1. Form — collect label, hosts, opening prompt, accent, font.
//   2. Result — script tag (auto-copied), step-by-step instructions,
//                CLI command to ship.
//
// R1 (mission corner:embed-modal): preview via /api/embed/preview, ship via
// /api/embed/create. Create writes to Supabase `embed_configs` so the embed
// is live without a redeploy. The CLI fallback (make-embed.py --deploy)
// stays available for power-users / git-checked-in embeds.
import { useEffect, useMemo, useState, useCallback } from 'react'
import { C } from '../../lib/cv3Colors.js'
import { authFetch } from '../../lib/authFetch.js'

const FONT_OPTIONS = [
  { value: '', label: 'Default (Hanken Grotesk)' },
  { value: 'Instrument Serif', label: 'Instrument Serif' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
]

function defaultOpening({ project, mission }) {
  if (mission) {
    return `Hi, I am the ${mission} EA. What are we working on?`
  }
  if (project) {
    return `Hi, I am the ${project} EA. What can I help with?`
  }
  return 'Hi, how can I help?'
}

function copyText(text) {
  if (navigator?.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  // Fallback
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch {}
  document.body.removeChild(ta)
  return Promise.resolve()
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: C.fgMuted || '#9aa3ad',
      }}>{label}</span>
      {children}
      {hint && <span style={{
        fontSize: 11,
        color: C.fgMuted2 || '#6b7785',
        fontStyle: 'italic',
      }}>{hint}</span>}
    </label>
  )
}

const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 14,
  color: C.fg || '#e8edf3',
  fontFamily: 'inherit',
  outline: 'none',
  resize: 'vertical',
}

function Chip({ children }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '3px 9px',
      borderRadius: 8,
      background: 'rgba(229,69,31,0.12)',
      border: '1px solid rgba(229,69,31,0.3)',
      color: '#E5451F',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      letterSpacing: '0.02em',
    }}>{children}</span>
  )
}

export default function EmbedModal({ open, onClose, selectedProject, worldId }) {
  const [screen, setScreen] = useState('form') // 'form' | 'result'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [copiedTag, setCopiedTag] = useState(false)
  const [copiedCli, setCopiedCli] = useState(false)
  // R1 ship state — driven by POST /api/embed/create from the result screen.
  const [shipStatus, setShipStatus] = useState('idle') // 'idle' | 'shipping' | 'shipped' | 'error'
  const [shipError, setShipError] = useState(null)
  const [shipResult, setShipResult] = useState(null)

  // Routing context derived from the room — read-only chips in the modal.
  // selectedProject.missionSlug carries the BARE mission name (e.g.
  // 'marketplace-page'). The preview API + bridge-daemon expect canonical
  // form ('space-rising:marketplace-page'). Canonicalize here so a stripped
  // mission name from the room context doesn't fail server-side validation.
  const ctx = useMemo(() => {
    const project = selectedProject?.slug || null
    const rawMissionSlug = selectedProject?.missionSlug || null
    const missionSlug = (rawMissionSlug && project && !rawMissionSlug.includes(':'))
      ? `${project}:${rawMissionSlug}`
      : rawMissionSlug
    const missionName = selectedProject?.missionName || null
    const projectName = selectedProject?.name || project
    return {
 agent: 'elon', // For R0, every embed routes through elon. Future: per-project EA.
      project,
      projectName,
      missionSlug,
      missionName,
      clientId: worldId || 'aom',
    }
  }, [selectedProject, worldId])

  // Form state
  const [label, setLabel] = useState('')
  const [hosts, setHosts] = useState('')
  const [opening, setOpening] = useState('')
  const [accent, setAccent] = useState('#E5451F')
  const [fontDisplay, setFontDisplay] = useState('')
  const [embedIdOverride, setEmbedIdOverride] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Prefill when modal opens with a fresh room context
  useEffect(() => {
    if (!open) return
    const defaultLabel = ctx.missionName || ctx.projectName || 'Corner'
    setLabel(defaultLabel)
    setOpening(defaultOpening({ project: ctx.projectName, mission: ctx.missionName }))
    setAccent('#E5451F')
    setFontDisplay('')
    setEmbedIdOverride('')
    setHosts('https://www.aheadofmarket.com\nhttp://localhost:3000')
    setScreen('form')
    setResult(null)
    setError(null)
    setShipStatus('idle')
    setShipError(null)
    setShipResult(null)
  }, [open, ctx.missionName, ctx.projectName])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-copy script tag when result screen first appears
  useEffect(() => {
    if (screen === 'result' && result?.script_tag) {
      copyText(result.script_tag).then(() => {
        setCopiedTag(true)
        setTimeout(() => setCopiedTag(false), 2400)
      })
    }
  }, [screen, result])

  const buildPayload = useCallback((pinEmbedId) => {
    const host_allowlist = hosts
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean)
    return {
      agent: ctx.agent,
      project: ctx.project,
      mission_slug: ctx.missionSlug,
      client_id: ctx.clientId,
      label: label.trim(),
      host_allowlist,
      opening_prompt: opening.trim(),
      accent: accent.trim() || '#E5451F',
      font_display: fontDisplay.trim() || undefined,
      embed_id: pinEmbedId || (embedIdOverride.trim() || undefined),
    }
  }, [hosts, ctx, label, opening, accent, fontDisplay, embedIdOverride])

  const handleSubmit = useCallback(async () => {
    setError(null)
    setSubmitting(true)
    setShipStatus('idle')
    setShipError(null)
    setShipResult(null)
    const payload = buildPayload(null)
    try {
      const resp = await fetch('/api/embed/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const reason = data.details ? data.details.join(' • ') : (data.error || `HTTP ${resp.status}`)
        setError(reason)
        return
      }
      setResult(data)
      setScreen('result')
    } catch (err) {
      setError(String(err?.message || err))
    } finally {
      setSubmitting(false)
    }
  }, [buildPayload])

  // R1 — POST /api/embed/create with the same payload + the pinned embed_id
  // from the preview response, so the script tag the user already copied is
  // the one that goes live in Supabase.
  const handleShip = useCallback(async () => {
    if (!result?.embed_id) return
    setShipStatus('shipping')
    setShipError(null)
    const payload = buildPayload(result.embed_id)
    try {
      // authFetch, not fetch: /api/embed/create now runs verifyTenant on the
      // world this embed routes into, and stamps the creator from the JWT.
      // /api/embed/preview above is still unauthenticated (it writes nothing),
      // so it stays on plain fetch. Any member of the owning world can ship —
      // the gate is world membership, not admin.
      const resp = await authFetch('/api/embed/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        if (resp.status === 409) {
          setShipStatus('error')
          setShipError(`Embed ID "${data.embed_id || result.embed_id}" already exists. Open Advanced and set a different ID, or use the CLI command below to update the existing one.`)
          return
        }
        const reason = data.details || data.error || `HTTP ${resp.status}`
        setShipStatus('error')
        setShipError(String(reason))
        return
      }
      setShipResult(data)
      setShipStatus('shipped')
    } catch (err) {
      setShipStatus('error')
      setShipError(String(err?.message || err))
    }
  }, [result, buildPayload])

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(6,9,13,0.78)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0f141a',
        color: C.fg || '#e8edf3',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 70px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
        width: 'min(640px, 100%)',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: "'Hanken Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px',
          background: 'linear-gradient(180deg, rgba(229,69,31,0.18) 0%, rgba(15,20,26,0) 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#E5451F', boxShadow: '0 0 12px #E5451F',
            }} />
            <span style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 20,
              letterSpacing: '-0.01em',
            }}>
              {screen === 'form' ? 'Make this room embeddable' : 'Your embed is ready'}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            appearance: 'none', border: 0, background: 'transparent',
            color: C.fgMuted || '#9aa3ad', fontSize: 22, cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px' }}>
          {screen === 'form' && (
            <FormScreen
              ctx={ctx}
              label={label} setLabel={setLabel}
              hosts={hosts} setHosts={setHosts}
              opening={opening} setOpening={setOpening}
              accent={accent} setAccent={setAccent}
              fontDisplay={fontDisplay} setFontDisplay={setFontDisplay}
              embedIdOverride={embedIdOverride} setEmbedIdOverride={setEmbedIdOverride}
              advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen}
              error={error}
            />
          )}
          {screen === 'result' && result && (
            <ResultScreen
              result={result}
              ctx={ctx}
              copiedTag={copiedTag} setCopiedTag={setCopiedTag}
              copiedCli={copiedCli} setCopiedCli={setCopiedCli}
              shipStatus={shipStatus}
              shipError={shipError}
              shipResult={shipResult}
              onShip={handleShip}
            />
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0d1219',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          {screen === 'form' ? (
            <>
              <span style={{ fontSize: 11, color: C.fgMuted || '#6b7785', letterSpacing: '0.04em' }}>
                ESC to close
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting || !label.trim() || !hosts.trim()}
                style={{
                  appearance: 'none', border: 0,
                  background: '#E5451F',
                  color: '#fff',
                  padding: '10px 22px',
                  borderRadius: 10,
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting || !label.trim() || !hosts.trim() ? 0.5 : 1,
                }}
              >{submitting ? 'Generating…' : 'Generate Embed'}</button>
            </>
          ) : (
            <>
              <button onClick={() => setScreen('form')} style={{
                appearance: 'none', border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: C.fgMuted || '#9aa3ad',
                padding: '8px 16px',
                borderRadius: 10,
                fontFamily: "'Oswald', sans-serif",
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}>← Edit</button>
              <button onClick={onClose} style={{
                appearance: 'none', border: 0,
                background: '#E5451F',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: 10,
                fontFamily: "'Oswald', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}>Done</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function FormScreen({
  ctx, label, setLabel, hosts, setHosts, opening, setOpening,
  accent, setAccent, fontDisplay, setFontDisplay,
  embedIdOverride, setEmbedIdOverride,
  advancedOpen, setAdvancedOpen, error,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Routing context — read-only */}
      <div>
        <div style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.fgMuted || '#9aa3ad',
          marginBottom: 8,
        }}>Routing from this room</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <Chip>agent: {ctx.agent}</Chip>
          {ctx.project && <Chip>project: {ctx.project}</Chip>}
          {ctx.missionSlug && <Chip>mission: {ctx.missionSlug}</Chip>}
          {!ctx.project && !ctx.missionSlug && (
            <span style={{ fontSize: 12, color: '#ef4444', fontStyle: 'italic' }}>
              No project context — open this from inside a project or mission room.
            </span>
          )}
        </div>
      </div>

      <Field label="Widget label" hint="Shown in the widget's header.">
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Corner Support"
          style={inputStyle}
        />
      </Field>

      <Field
        label="Allowed host origins"
        hint="One per line. https:// or http://. No wildcards. Must include the page you'll paste the script tag on."
      >
        <textarea
          value={hosts}
          onChange={e => setHosts(e.target.value)}
          rows={3}
          placeholder="https://example.com&#10;http://localhost:3000"
          style={{ ...inputStyle, minHeight: 70 }}
        />
      </Field>

      <Field label="Opening prompt" hint="What the visitor sees in the chat on first open.">
        <textarea
          value={opening}
          onChange={e => setOpening(e.target.value)}
          rows={2}
          style={{ ...inputStyle, minHeight: 56 }}
        />
      </Field>

      <div style={{ display: 'flex', gap: 12 }}>
        <Field label="Accent color">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="color"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              style={{
                width: 42, height: 36, padding: 0, border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, background: 'transparent', cursor: 'pointer',
              }}
            />
            <input
              type="text"
              value={accent}
              onChange={e => setAccent(e.target.value)}
              style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
            />
          </div>
        </Field>
        <Field label="Display font (optional)">
          <select
            value={fontDisplay}
            onChange={e => setFontDisplay(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            {FONT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen(o => !o)}
          style={{
            appearance: 'none', border: 0, background: 'transparent',
            color: C.fgMuted || '#9aa3ad', cursor: 'pointer',
            fontFamily: "'Oswald', sans-serif",
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: 0,
          }}>
          {advancedOpen ? '▼' : '▶'} Advanced
        </button>
        {advancedOpen && (
          <div style={{ marginTop: 10 }}>
            <Field label="Custom embed_id" hint="Auto-suggested from project/mission. Override only if you want a specific name. Pattern: emb_<a-z0-9_-> 3–44 chars.">
              <input
                type="text"
                value={embedIdOverride}
                onChange={e => setEmbedIdOverride(e.target.value)}
                placeholder="(auto-suggested)"
                style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
              />
            </Field>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 13,
          color: '#fca5a5',
        }}>{error}</div>
      )}
    </div>
  )
}

function ResultScreen({
  result, ctx, copiedTag, setCopiedTag, copiedCli, setCopiedCli,
  shipStatus, shipError, shipResult, onShip,
}) {
  const isShipped = shipStatus === 'shipped'
  const isShipping = shipStatus === 'shipping'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Identity badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          color: '#E5451F',
          background: 'rgba(229,69,31,0.12)',
          padding: '3px 8px',
          borderRadius: 8,
        }}>{result.embed_id}</span>
        <span style={{ fontSize: 12, color: isShipped ? '#10b981' : (C.fgMuted || '#9aa3ad') }}>
          {isShipped ? 'live now' : 'ready to ship'}
        </span>
      </div>

      {/* Ship it — R1 primary action */}
      <div style={{
        padding: '14px 16px',
        background: isShipped ? 'rgba(16,185,129,0.08)' : 'rgba(229,69,31,0.06)',
        border: `1px solid ${isShipped ? 'rgba(16,185,129,0.28)' : 'rgba(229,69,31,0.22)'}`,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 17,
              color: isShipped ? '#10b981' : C.fg || '#e8edf3',
            }}>
              {isShipped ? 'Your embed is live.' : 'Ship it now'}
            </div>
            <div style={{ fontSize: 12, color: C.fgMuted || '#9aa3ad', marginTop: 2 }}>
              {isShipped
                ? 'Paste the script tag on your page. No redeploy needed.'
                : 'One click deploy. Goes live in Supabase immediately with no terminal step required.'}
            </div>
          </div>
          {!isShipped && (
            <button
              onClick={onShip}
              disabled={isShipping}
              style={{
                appearance: 'none', border: 0,
                background: isShipping ? 'rgba(229,69,31,0.5)' : '#E5451F',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: 10,
                fontFamily: "'Oswald', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: isShipping ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >{isShipping ? 'Shipping…' : 'Ship it'}</button>
          )}
        </div>
        {isShipped && shipResult?.live_url && (
          <a
            href={shipResult.live_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13, color: '#10b981',
              textDecoration: 'underline',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >{shipResult.live_url}</a>
        )}
        {shipError && (
          <div style={{
            fontSize: 12, color: '#fca5a5',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 8,
            padding: '8px 10px',
          }}>{shipError}</div>
        )}
      </div>

      {/* Script tag */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: C.fgMuted || '#9aa3ad',
          }}>1. The script tag {copiedTag && <span style={{ color: '#10b981', marginLeft: 8 }}>✓ Copied to clipboard</span>}</div>
          <button
            onClick={() => {
              copyText(result.script_tag).then(() => {
                setCopiedTag(true)
                setTimeout(() => setCopiedTag(false), 2400)
              })
            }}
            style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: '#fff',
              padding: '4px 12px', borderRadius: 8,
              fontFamily: "'Oswald', sans-serif",
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>Copy</button>
        </div>
        <pre style={{
          background: '#06090d',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 12,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#a7f3d0',
          overflow: 'auto',
          margin: 0,
          whiteSpace: 'pre',
        }}>{result.script_tag}</pre>
      </div>

      {/* How to use */}
      <div>
        <div style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 10,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.fgMuted || '#9aa3ad',
          marginBottom: 8,
        }}>2. How to put it on a page</div>
        <ol style={{
          margin: 0,
          paddingLeft: 20,
          fontSize: 13,
          lineHeight: 1.55,
          color: '#cbd5e1',
        }}>
          <li>Open the host page's HTML (or template).</li>
          <li>Paste the script tag just before <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>&lt;/body&gt;</code>.</li>
          <li>Save and deploy your site.</li>
          <li>Refresh and a floating chat bubble appears in the bottom right. (For an inline-centered chat, drop <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>&lt;div id="corner-embed"&gt;&lt;/div&gt;</code> where you want it.)</li>
        </ol>
      </div>

      {/* CLI command */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: C.fgMuted || '#9aa3ad',
          }}>3. CLI fallback (optional) {copiedCli && <span style={{ color: '#10b981', marginLeft: 8 }}>✓ Copied</span>}</div>
          <button
            onClick={() => {
              copyText(result.cli_command).then(() => {
                setCopiedCli(true)
                setTimeout(() => setCopiedCli(false), 2400)
              })
            }}
            style={{
              appearance: 'none', border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: '#fff',
              padding: '4px 12px', borderRadius: 8,
              fontFamily: "'Oswald', sans-serif",
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>Copy</button>
        </div>
        <p style={{ fontSize: 12, color: C.fgMuted || '#9aa3ad', margin: '0 0 8px 0' }}>
 Only needed if you want the config checked into git (for code review, parallel branches, or a redeploy-safe ship). Most cases, just click "Ship it" above.
        </p>
        <pre style={{
          background: '#06090d',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '12px 14px',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: '#fde68a',
          overflow: 'auto',
          margin: 0,
          whiteSpace: 'pre',
        }}>{result.cli_command}</pre>
      </div>

      {/* Preview link */}
      {!isShipped && (
        <div style={{
          padding: '12px 14px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.18)',
          borderRadius: 10,
          fontSize: 13,
        }}>
          <strong style={{ color: '#10b981', fontWeight: 600 }}>Preview:</strong>
          <a
            href={result.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ marginLeft: 8, color: '#10b981', textDecoration: 'underline' }}
          >{result.preview_url}</a>
          <div style={{ marginTop: 4, fontSize: 12, color: C.fgMuted || '#9aa3ad' }}>
            Hit "Ship it" above to make it live, or run the CLI fallback.
          </div>
        </div>
      )}
    </div>
  )
}