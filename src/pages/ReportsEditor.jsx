// aheadofmarket.com/reports — the weekly client report editor.
//
// One live draft per client (Wolfpack, Ambition, Kohrs, Ella) stored on the
// corner-convex deployment (convex/reports.ts). Edits autosave; the right pane
// previews exactly what the public page (/wolfpack etc.) will render. Reports
// auto-send Fridays 12:00 Arizona via api/cron/send-reports.js; "Send now" and
// "Send me a test" hit api/report-send.js with the signed-in Supabase session.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authFetch } from '../dashboard/lib/authFetch.js'

const CONVEX_URL = 'https://neat-pony-216.convex.cloud'
const CLIENTS = ['wolfpack', 'ambition', 'kohrs', 'ella']
const STATUS_DEFAULT_LABEL = { done: 'Done', wip: 'This week', next: 'Next week' }

async function convexCall(kind, path, args) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  })
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`)
  const data = await res.json()
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${data?.errorMessage || data?.status || 'malformed response'}`)
  }
  return data.value
}

function parseRecipients(text) {
  return String(text || '')
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'))
}

function moveItem(list, index, delta) {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= next.length) return list
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

const EDITABLE_FIELDS = [
  'clientName', 'headerLine', 'headline', 'weekNumber', 'dateLabel', 'links',
  'milestones', 'tasks', 'asks', 'notes', 'footerNote', 'recipients',
  'emailSubject', 'emailIntro', 'autoSend',
]

export default function ReportsEditor() {
  const { client: clientParam } = useParams()
  const navigate = useNavigate()
  const client = CLIENTS.includes(clientParam) ? clientParam : 'wolfpack'

  const [drafts, setDrafts] = useState(null) // client -> draft
  const [recipientsText, setRecipientsText] = useState({}) // client -> raw input
  const [saveState, setSaveState] = useState('saved') // saved | saving | error
  const [previewNonce, setPreviewNonce] = useState(0)
  const [sendArm, setSendArm] = useState(false)
  const [sendMsg, setSendMsg] = useState('')
  const [loadError, setLoadError] = useState('')
  const saveTimer = useRef(null)
  const pendingSave = useRef({}) // client -> true when a save is queued

  const load = useCallback(async () => {
    try {
      const rows = await convexCall('query', 'reports:list', {})
      const map = {}
      const recTexts = {}
      for (const row of rows) {
        map[row.client] = row
        recTexts[row.client] = (row.recipients || []).join(', ')
      }
      setDrafts(map)
      setRecipientsText(recTexts)
      setLoadError('')
    } catch (e) {
      setLoadError(String(e?.message || e))
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { setSendArm(false); setSendMsg('') }, [client])

  const draft = drafts?.[client]

  const persist = useCallback(async (forClient, snapshot) => {
    setSaveState('saving')
    try {
      const patch = { client: forClient }
      for (const f of EDITABLE_FIELDS) {
        if (snapshot[f] !== undefined) patch[f] = snapshot[f]
      }
      // Convex validators reject _id/_creationTime and unknown keys; strip row bits.
      await convexCall('mutation', 'reports:save', patch)
      setSaveState('saved')
      setPreviewNonce((n) => n + 1)
    } catch (e) {
      console.error('[reports] save failed:', e)
      setSaveState('error')
    }
  }, [])

  const update = useCallback((patch) => {
    setDrafts((prev) => {
      if (!prev?.[client]) return prev
      const next = { ...prev, [client]: { ...prev[client], ...patch } }
      if (saveTimer.current) clearTimeout(saveTimer.current)
      pendingSave.current[client] = true
      const snapshot = next[client]
      saveTimer.current = setTimeout(() => {
        pendingSave.current[client] = false
        persist(client, snapshot)
      }, 900)
      return next
    })
  }, [client, persist])

  const setRecipients = (text) => {
    setRecipientsText((prev) => ({ ...prev, [client]: text }))
    update({ recipients: parseRecipients(text) })
  }

  const send = async (mode) => {
    setSendMsg(mode === 'test' ? 'Sending test…' : 'Sending to client…')
    setSendArm(false)
    try {
      const res = await authFetch('/api/report-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (mode === 'now') {
        setSendMsg(`Sent week ${data.week} to ${data.to.join(', ')}`)
        await load() // draft rolled to next week
      } else {
        setSendMsg(`Test sent to ${data.to.join(', ')}`)
      }
    } catch (e) {
      setSendMsg(`Failed: ${String(e?.message || e)}`)
    }
  }

  if (loadError) {
    return <div className="rep-shell"><style>{styles}</style>
      <div className="rep-error">Couldn&rsquo;t load reports: {loadError} <button onClick={load}>Retry</button></div>
    </div>
  }
  if (!draft) {
    return <div className="rep-shell"><style>{styles}</style><div className="rep-loading">Loading reports…</div></div>
  }

  const sendStatus = !draft.autoSend
    ? { cls: 'hold', text: 'On hold — will not auto-send' }
    : draft.recipients.length === 0
      ? { cls: 'warn', text: 'No recipients — add emails or this will not send Friday' }
      : { cls: 'ok', text: `Sends Friday 12:00 (Arizona) to ${draft.recipients.join(', ')}` }

  return (
    <div className="rep-shell">
      <style>{styles}</style>

      <header className="rep-top">
        <div>
          <h1>Weekly Reports</h1>
          <p>Edit all week &middot; every report auto-sends Friday 12:00 (Arizona)</p>
        </div>
        <div className="rep-savestate" data-state={saveState}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed — retrying on next edit' : 'All changes saved'}
        </div>
      </header>

      <nav className="rep-tabs">
        {CLIENTS.map((c) => {
          const d = drafts[c]
          const dot = !d ? '' : !d.autoSend ? 'hold' : d.recipients.length === 0 ? 'warn' : 'ok'
          return (
            <button key={c} className={c === client ? 'active' : ''} onClick={() => navigate(`/reports/${c}`)}>
              <span className={`dot ${dot}`} />
              {d ? d.clientName : c}
              {d ? <em>wk {d.weekNumber}</em> : null}
            </button>
          )
        })}
      </nav>

      <div className="rep-cols">
        <main className="rep-form">

          <section>
            <h2>Header</h2>
            <div className="grid2">
              <label>Client name<input value={draft.clientName} onChange={(e) => update({ clientName: e.target.value })} /></label>
              <label>Header line<input value={draft.headerLine} onChange={(e) => update({ headerLine: e.target.value })} /></label>
              <label>Week #<input type="number" min="1" value={draft.weekNumber} onChange={(e) => update({ weekNumber: Math.max(1, parseInt(e.target.value, 10) || 1) })} /></label>
              <label>Date label<input value={draft.dateLabel} onChange={(e) => update({ dateLabel: e.target.value })} /></label>
            </div>
            <h3>Links</h3>
            {draft.links.map((l, i) => (
              <div className="row" key={i}>
                <input className="w-narrow" placeholder="Label" value={l.label} onChange={(e) => update({ links: draft.links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                <input placeholder="https://…" value={l.url} onChange={(e) => update({ links: draft.links.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })} />
                <button className="icon" title="Remove" onClick={() => update({ links: draft.links.filter((_, j) => j !== i) })}>&times;</button>
              </div>
            ))}
            <button className="add" onClick={() => update({ links: [...draft.links, { label: '', url: '' }] })}>+ Link</button>
          </section>

          <section>
            <h2>Project Milestones</h2>
            {draft.milestones.map((m, i) => (
              <div className="row" key={i}>
                <input placeholder="Milestone" value={m.name} onChange={(e) => update({ milestones: draft.milestones.map((x, j) => j === i ? { ...x, name: e.target.value } : x) })} />
                <input className="w-pct" type="number" min="0" max="100" value={m.progress} onChange={(e) => update({ milestones: draft.milestones.map((x, j) => j === i ? { ...x, progress: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) } : x) })} />
                <select value={m.status} onChange={(e) => {
                  const status = e.target.value
                  update({ milestones: draft.milestones.map((x, j) => j === i ? { ...x, status, progress: status === 'done' ? 100 : x.progress, statusLabel: status === 'done' ? 'Done' : status === 'wip' ? 'In progress' : 'Up next' } : x) })
                }}>
                  <option value="done">Done</option><option value="wip">In progress</option><option value="next">Up next</option>
                </select>
                <input className="w-narrow" placeholder="Tag text" value={m.statusLabel} onChange={(e) => update({ milestones: draft.milestones.map((x, j) => j === i ? { ...x, statusLabel: e.target.value } : x) })} />
                <button className="icon" onClick={() => update({ milestones: moveItem(draft.milestones, i, -1) })}>&uarr;</button>
                <button className="icon" onClick={() => update({ milestones: moveItem(draft.milestones, i, 1) })}>&darr;</button>
                <button className="icon" title="Remove" onClick={() => update({ milestones: draft.milestones.filter((_, j) => j !== i) })}>&times;</button>
              </div>
            ))}
            <button className="add" onClick={() => update({ milestones: [...draft.milestones, { name: '', progress: 0, status: 'next', statusLabel: 'Up next' }] })}>+ Milestone</button>
          </section>

          <section>
            <h2>This Week&rsquo;s Tasks</h2>
            {draft.tasks.map((t, i) => (
              <div className="row" key={i}>
                <input placeholder="Task" value={t.text} onChange={(e) => update({ tasks: draft.tasks.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
                <select value={t.status} onChange={(e) => {
                  const status = e.target.value
                  update({ tasks: draft.tasks.map((x, j) => j === i ? { ...x, status, statusLabel: STATUS_DEFAULT_LABEL[status] || x.statusLabel } : x) })
                }}>
                  <option value="done">Done</option><option value="wip">This week</option><option value="next">Next week</option>
                </select>
                <input className="w-narrow" placeholder="Tag text" value={t.statusLabel} onChange={(e) => update({ tasks: draft.tasks.map((x, j) => j === i ? { ...x, statusLabel: e.target.value } : x) })} />
                <select className="w-pri" value={t.priority} onChange={(e) => update({ tasks: draft.tasks.map((x, j) => j === i ? { ...x, priority: e.target.value } : x) })}>
                  <option>High</option><option>Med</option><option>Low</option>
                </select>
                <button className="icon" onClick={() => update({ tasks: moveItem(draft.tasks, i, -1) })}>&uarr;</button>
                <button className="icon" onClick={() => update({ tasks: moveItem(draft.tasks, i, 1) })}>&darr;</button>
                <button className="icon" title="Remove" onClick={() => update({ tasks: draft.tasks.filter((_, j) => j !== i) })}>&times;</button>
              </div>
            ))}
            <button className="add" onClick={() => update({ tasks: [...draft.tasks, { text: '', status: 'wip', statusLabel: 'This week', priority: 'High' }] })}>+ Task</button>
          </section>

          <section>
            <h2>What We Need From You</h2>
            {draft.asks.map((a, i) => (
              <div className="row" key={i}>
                <input className="w-narrow" placeholder="Ask" value={a.label} onChange={(e) => update({ asks: draft.asks.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} />
                <input placeholder="Detail" value={a.detail} onChange={(e) => update({ asks: draft.asks.map((x, j) => j === i ? { ...x, detail: e.target.value } : x) })} />
                <button className="icon" title="Remove" onClick={() => update({ asks: draft.asks.filter((_, j) => j !== i) })}>&times;</button>
              </div>
            ))}
            <button className="add" onClick={() => update({ asks: [...draft.asks, { label: '', detail: '' }] })}>+ Ask</button>
          </section>

          <section>
            <h2>Notes</h2>
            <textarea rows={3} placeholder="Optional note block shown above the footer" value={draft.notes || ''} onChange={(e) => update({ notes: e.target.value })} />
            <label className="inline-label">Footer note<input value={draft.footerNote} onChange={(e) => update({ footerNote: e.target.value })} /></label>
          </section>

          <section className="rep-send">
            <h2>Sending</h2>
            <div className={`send-status ${sendStatus.cls}`}>{sendStatus.text}</div>
            <label>Recipients (comma-separated)
              <input placeholder="client@company.com" value={recipientsText[client] ?? ''} onChange={(e) => setRecipients(e.target.value)} />
            </label>
            <label>Email subject
              <input placeholder={`${draft.clientName} × Ahead of Market — Week ${draft.weekNumber} update`} value={draft.emailSubject || ''} onChange={(e) => update({ emailSubject: e.target.value })} />
            </label>
            <label>Email intro
              <textarea rows={2} placeholder="Here's your weekly update — what shipped, what's in motion, and what we need from you." value={draft.emailIntro || ''} onChange={(e) => update({ emailIntro: e.target.value })} />
            </label>
            <label className="check">
              <input type="checkbox" checked={draft.autoSend} onChange={(e) => update({ autoSend: e.target.checked })} />
              Auto-send Friday 12:00 (Arizona)
            </label>
            <div className="send-actions">
              <button className="ghost" onClick={() => send('test')}>Send me a test</button>
              {sendArm
                ? <button className="danger" onClick={() => send('now')}>Really send to {draft.recipients.length} recipient{draft.recipients.length === 1 ? '' : 's'}?</button>
                : <button className="solid" disabled={draft.recipients.length === 0} onClick={() => setSendArm(true)}>Send now</button>}
              {sendArm ? <button className="ghost" onClick={() => setSendArm(false)}>Cancel</button> : null}
            </div>
            {sendMsg ? <div className="send-msg">{sendMsg}</div> : null}
            {draft.lastSentAt ? <div className="send-last">Last sent {new Date(draft.lastSentAt).toLocaleString()}</div> : null}
          </section>
        </main>

        <aside className="rep-preview">
          <div className="rep-preview-bar">
            <span>Live preview</span>
            <a href={`/api/report-page?client=${client}&preview=1`} target="_blank" rel="noreferrer">Open &rarr;</a>
          </div>
          <iframe title="Report preview" src={`/api/report-page?client=${client}&preview=1&v=${previewNonce}`} />
        </aside>
      </div>
    </div>
  )
}

const styles = `
.rep-shell{min-height:100vh;background:#F5F2EA;color:#151209;font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:14px;padding:24px clamp(16px,4vw,48px) 64px}
.rep-loading,.rep-error{padding:80px 0;text-align:center;color:#6E685B}
.rep-error button{margin-left:8px}
.rep-top{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;padding-bottom:16px;border-bottom:1.5px solid #CFC8B8;margin-bottom:16px}
.rep-top h1{font-size:22px;font-weight:800;letter-spacing:-.01em}
.rep-top p{font-size:12px;color:#6E685B;margin-top:2px}
.rep-savestate{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#1B6B3A}
.rep-savestate[data-state="saving"]{color:#8A6A1F}
.rep-savestate[data-state="error"]{color:#B4231F}
.rep-tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.rep-tabs button{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #CFC8B8;padding:8px 14px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6E685B;cursor:pointer}
.rep-tabs button.active{border-color:#151209;color:#151209}
.rep-tabs button em{font-style:normal;font-weight:600;font-size:10px;color:#B58A38}
.rep-tabs .dot{width:8px;height:8px;border-radius:50%;background:#CFC8B8}
.rep-tabs .dot.ok{background:#1B6B3A}
.rep-tabs .dot.warn{background:#B58A38}
.rep-tabs .dot.hold{background:#B4231F}
.rep-cols{display:grid;grid-template-columns:minmax(420px,1fr) minmax(380px,720px);gap:24px;align-items:start}
@media(max-width:1000px){.rep-cols{grid-template-columns:1fr}}
.rep-form section{background:#fff;border:1.5px solid #CFC8B8;padding:16px 18px 18px;margin-bottom:16px}
.rep-form h2{font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:800;color:#6E685B;margin-bottom:12px}
.rep-form h3{font-size:9px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#6E685B;margin:14px 0 8px}
.rep-form input,.rep-form select,.rep-form textarea{width:100%;border:1px solid #CFC8B8;background:#FDFCF9;padding:7px 9px;font-size:13px;font-family:inherit;color:#151209}
.rep-form input:focus,.rep-form select:focus,.rep-form textarea:focus{outline:1.5px solid #B58A38;outline-offset:-1px}
.rep-form label{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:#6E685B;margin-bottom:10px}
.rep-form label input,.rep-form label textarea{margin-top:4px;text-transform:none;letter-spacing:0}
.rep-form .grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}
.rep-form .row{display:flex;gap:6px;margin-bottom:6px;align-items:center}
.rep-form .row select{width:auto;flex:0 0 auto}
.rep-form .w-narrow{flex:0 0 140px}
.rep-form .w-pct{flex:0 0 64px}
.rep-form .w-pri{flex:0 0 70px}
.rep-form .icon{flex:0 0 auto;border:1px solid #CFC8B8;background:#fff;color:#6E685B;width:28px;height:31px;cursor:pointer;font-size:13px}
.rep-form .icon:hover{color:#151209;border-color:#151209}
.rep-form .add{margin-top:4px;border:1.5px dashed #CFC8B8;background:none;padding:6px 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6E685B;cursor:pointer}
.rep-form .add:hover{color:#151209;border-color:#151209}
.rep-form .inline-label{margin-top:10px}
.rep-send .send-status{font-size:12px;font-weight:600;padding:8px 12px;margin-bottom:12px;border:1.5px solid}
.rep-send .send-status.ok{color:#1B6B3A;border-color:#1B6B3A;background:#F0F7F1}
.rep-send .send-status.warn{color:#8A6A1F;border-color:#B58A38;background:#FBF6EA}
.rep-send .send-status.hold{color:#B4231F;border-color:#B4231F;background:#FBEFEE}
.rep-send .check{display:flex;align-items:center;gap:8px;font-size:12px;text-transform:none;letter-spacing:0}
.rep-send .check input{width:auto;margin:0}
.send-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.send-actions button{padding:9px 16px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;border:1.5px solid}
.send-actions .ghost{background:#fff;color:#6E685B;border-color:#CFC8B8}
.send-actions .ghost:hover{color:#151209;border-color:#151209}
.send-actions .solid{background:#B58A38;color:#fff;border-color:#B58A38}
.send-actions .solid:disabled{opacity:.4;cursor:not-allowed}
.send-actions .danger{background:#B4231F;color:#fff;border-color:#B4231F}
.send-msg{margin-top:10px;font-size:12px;color:#45413A}
.send-last{margin-top:6px;font-size:11px;color:#6E685B}
.rep-preview{position:sticky;top:16px;background:#fff;border:1.5px solid #CFC8B8}
.rep-preview-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1.5px solid #CFC8B8;font-size:10px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#6E685B}
.rep-preview-bar a{color:#B58A38;text-decoration:none}
.rep-preview iframe{display:block;width:100%;height:calc(100vh - 120px);border:0;background:#fff}
`
