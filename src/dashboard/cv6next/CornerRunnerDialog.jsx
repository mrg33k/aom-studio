import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { authFetch } from '../lib/authFetch.js'

export function useCornerRunnerStatus(worldId) {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(Boolean(worldId))
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!worldId) { setDevices([]); setLoading(false); return [] }
    try {
      const response = await authFetch(`/api/runner/pair?client=${encodeURIComponent(worldId)}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not load Corner Runner')
      const next = Array.isArray(payload.devices) ? payload.devices : []
      setDevices(next)
      setError('')
      return next
    } catch (cause) {
      setError(cause.message || 'Could not load Corner Runner')
      return []
    } finally {
      setLoading(false)
    }
  }, [worldId])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 20_000)
    return () => clearInterval(timer)
  }, [refresh])

  const device = devices[0] || null
  return {
    devices,
    device,
    paired: Boolean(device),
    online: Boolean(device?.online),
    loading,
    error,
    refresh,
  }
}

function relativeSeen(value) {
  if (!value) return 'Never connected'
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000))
  if (seconds < 60) return 'Seen just now'
  if (seconds < 3600) return `Seen ${Math.round(seconds / 60)}m ago`
  return `Seen ${Math.round(seconds / 3600)}h ago`
}

function StatusDot({ online, working }) {
  return <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: working ? 'var(--accent)' : online ? '#30b96b' : 'var(--faint)', boxShadow: online ? '0 0 0 3px color-mix(in srgb, var(--accent) 13%, transparent)' : 'none' }} />
}

export default function CornerRunnerDialog({ open, worldId, runner, onClose, onPaired }) {
  const [pairing, setPairing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const pairedIds = useMemo(() => new Set(runner.devices.map((device) => device.id)), [runner.devices])

  useEffect(() => {
    if (!open || !pairing) return undefined
    const timer = setInterval(async () => {
      const previous = new Set(pairedIds)
      const next = await runner.refresh()
      const newDevice = next.find((device) => !previous.has(device.id))
      if (newDevice) {
        setPairing(null)
        onPaired?.(newDevice)
      }
    }, 3_000)
    return () => clearInterval(timer)
  }, [open, pairing, pairedIds, runner.refresh, onPaired])

  useEffect(() => {
    if (!open) { setPairing(null); setError(''); setCopied(false) }
  }, [open])

  if (!open) return null

  const createPairing = async () => {
    setBusy(true)
    setError('')
    try {
      const response = await authFetch('/api/runner/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, name: 'My computer' }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not create pairing code')
      setPairing(payload)
    } catch (cause) {
      setError(cause.message || 'Could not create pairing code')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async (deviceId) => {
    setBusy(true)
    setError('')
    try {
      const response = await authFetch('/api/runner/pair', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: worldId, device_id: deviceId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Could not disconnect runner')
      await runner.refresh()
    } catch (cause) {
      setError(cause.message || 'Could not disconnect runner')
    } finally {
      setBusy(false)
    }
  }

  const command = pairing
    ? `node ~/Downloads/corner-runner.mjs pair ${pairing.code} --root "/path/to/your/project"`
    : ''

  return createPortal((
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,.66)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="corner-runner-title" data-testid="corner-runner-dialog"
        style={{ width: 'min(560px, 100%)', maxHeight: 'min(760px, 90dvh)', overflowY: 'auto', background: 'var(--composer-solid, #131317)', color: 'var(--fg)', border: '1px solid var(--hair)', borderRadius: 12, boxShadow: '0 28px 80px rgba(0,0,0,.55)', padding: 20, fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Local connection</div>
            <h2 id="corner-runner-title" style={{ margin: 0, fontSize: 22, letterSpacing: '-.025em' }}>Corner Runner</h2>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.5 }}>Use your own ChatGPT subscription and let Corner work inside one folder you choose. Your Codex login remains on your computer.</p>
          </div>
          <button type="button" aria-label="Close Corner Runner" onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 7, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--muted)', cursor: 'pointer', fontSize: 19 }}>×</button>
        </div>

        {runner.devices.length ? (
          <div style={{ marginTop: 18, display: 'grid', gap: 8 }}>
            {runner.devices.map((device) => (
              <div key={device.id} data-testid="corner-runner-device" style={{ display: 'flex', alignItems: 'center', gap: 11, minHeight: 58, padding: '9px 11px', border: '1px solid var(--hair)', borderRadius: 9, background: 'var(--surface-2)' }}>
                <StatusDot online={device.online} working={device.status === 'working'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{device.name}</div>
                  <div style={{ marginTop: 2, color: 'var(--muted)', fontSize: 11.5 }}>{device.status === 'working' ? 'Working locally' : device.online ? 'Online' : relativeSeen(device.last_seen_at)}{device.platform ? ` · ${device.platform}` : ''}</div>
                </div>
                <button type="button" disabled={busy} onClick={() => disconnect(device.id)} style={{ border: 0, background: 'transparent', color: 'var(--muted)', fontSize: 11.5, cursor: busy ? 'default' : 'pointer', padding: '8px 4px' }}>Disconnect</button>
              </div>
            ))}
          </div>
        ) : null}

        {!pairing ? (
          <button type="button" data-testid="corner-runner-create-pairing" disabled={busy} onClick={createPairing}
            style={{ width: '100%', minHeight: 42, marginTop: 18, borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 750, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Creating secure code…' : runner.paired ? 'Connect another computer' : 'Connect this computer'}
          </button>
        ) : (
          <div style={{ marginTop: 18, padding: 14, border: '1px solid var(--hair)', borderRadius: 9, background: 'var(--surface-2)' }}>
            <div className="eyebrow">Pairing code · expires in 10 minutes</div>
            <div data-testid="corner-runner-pairing-code" style={{ marginTop: 8, font: '750 20px var(--font-mono)', letterSpacing: '.08em' }}>{pairing.code}</div>
            <ol style={{ margin: '14px 0 0', paddingLeft: 20, color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.55 }}>
              <li><a href={pairing.downloadUrl} download="corner-runner.mjs" style={{ color: 'var(--accent)' }}>Download Corner Runner</a> to your computer.</li>
              <li>Open Terminal and run the command below, replacing the folder path with the one Corner may access.</li>
              <li>Leave the runner open while using Corner from this or another device.</li>
            </ol>
            <div style={{ position: 'relative', marginTop: 12 }}>
              <code style={{ display: 'block', overflowX: 'auto', padding: '11px 74px 11px 11px', borderRadius: 7, background: 'var(--surface)', border: '1px solid var(--hair)', color: 'var(--fg)', fontSize: 11.5, lineHeight: 1.45 }}>{command}</code>
              <button type="button" onClick={async () => { await navigator.clipboard?.writeText(command); setCopied(true) }}
                style={{ position: 'absolute', top: 6, right: 6, height: 28, padding: '0 9px', borderRadius: 6, border: '1px solid var(--hair)', background: 'var(--surface-2)', color: 'var(--fg)', cursor: 'pointer', fontSize: 11 }}>{copied ? 'Copied' : 'Copy'}</button>
            </div>
            <p aria-live="polite" style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 11.5 }}>Waiting for this computer to connect…</p>
          </div>
        )}

        {(error || runner.error) ? <div role="status" style={{ marginTop: 12, color: 'var(--error, #e5484d)', fontSize: 12 }}>{error || runner.error}</div> : null}
        <p style={{ margin: '16px 0 0', color: 'var(--faint)', fontSize: 11, lineHeight: 1.45 }}>Developer preview. The runner opens no inbound network port. Stop the Terminal process or disconnect the device here to remove Corner’s access.</p>
      </section>
    </div>
  ), document.body)
}
