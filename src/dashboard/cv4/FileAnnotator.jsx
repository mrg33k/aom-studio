// FileAnnotator — Frame.io-style review commenting for the Review tool (Patrik R-MATCH):
//   • Video: timeline with comment markers; "Comment here" pauses on the current frame and
//     pins a timestamped comment; saving resumes. Click a comment/marker to seek to it.
//   • Image / document / still video frame: click the surface to drop a POINT comment at x,y;
//     numbered pins render where you clicked; the rail lists them all.
// Persists through /api/dashboard/review-comments (timeline t | point x,y), same tunnel
// pattern as the review checklist. Shared by the Review tool + Files preview.
import { useState, useEffect, useRef, useCallback } from 'react'
import { authFetch } from '../lib/authFetch.js'
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx'

const fmt = (sec) => { sec = Math.max(0, Math.round(sec || 0)); const m = Math.floor(sec / 60); const s = sec % 60; return m + ':' + String(s).padStart(2, '0') }

export default function FileAnnotator({ node, worldId, kind, url, text }) {
  const [comments, setComments] = useState([])
  const [draft, setDraft] = useState(null)        // { type:'timeline'|'point', t?, x?, y?, text }
  const [activeId, setActiveId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [pinMode, setPinMode] = useState(false)   // video: arm click-to-pin on the paused frame
  const videoRef = useRef(null)
  const surfRef = useRef(null)
  const [vid, setVid] = useState({ t: 0, dur: 0, paused: true })
  const deliverable = node && node.path
  const world = worldId || 'aom'

  const reload = useCallback(() => {
    if (!deliverable) return
    authFetch(`/api/dashboard/review-comments?world=${encodeURIComponent(world)}&deliverable=${encodeURIComponent(deliverable)}`)
      .then(r => (r.ok ? r.json() : { list: [] }))
      .then(d => setComments(Array.isArray(d.list) ? d.list : []))
      .catch(() => {})
  }, [deliverable, world])
  useEffect(() => { setDraft(null); setActiveId(null); setPinMode(false); reload() }, [reload])

  const points = comments.filter(c => c.type === 'point')
  const timeline = comments.filter(c => c.type === 'timeline').sort((a, b) => (a.t || 0) - (b.t || 0))

  const save = async () => {
    const t = ((draft && draft.text) || '').trim()
    if (!draft || !t || busy) return
    setBusy(true)
    const body = { action: 'add', world, deliverable, type: draft.type, text: t }
    if (draft.type === 'timeline') body.t = draft.t
    else { body.x = draft.x; body.y = draft.y; if (draft.t != null) body.t = draft.t }
    try { await authFetch('/api/dashboard/review-comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) } catch (_) {}
    setBusy(false); const wasTimeline = draft.type === 'timeline'; setDraft(null); setPinMode(false); reload()
    if (wasTimeline && videoRef.current) { try { videoRef.current.play() } catch (_) {} }
  }
  const del = async (id) => {
    try { await authFetch('/api/dashboard/review-comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', world, deliverable, id }) }) } catch (_) {}
    reload()
  }

  // click the surface -> a point comment at fractional x,y (+ video time if on a frame)
  const placePoint = (e) => {
    if (e.target && e.target.closest && e.target.closest('[data-pin]')) return
    const el = surfRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    const d = { type: 'point', x, y, text: '' }
    if (kind === 'video' && videoRef.current) d.t = videoRef.current.currentTime
    // pin position is captured — disarm pin mode NOW so the native playbar returns
    // immediately (mobile: pin mode left armed stranded the video with no controls)
    setDraft(d); setActiveId(null); setPinMode(false)
  }

  // video helpers
  const onTime = () => { const v = videoRef.current; if (v) setVid({ t: v.currentTime, dur: v.duration || 0, paused: v.paused }) }
  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play(); else v.pause() }
  const commentHere = () => { const v = videoRef.current; if (v) { v.pause(); setDraft({ type: 'timeline', t: v.currentTime, text: '' }); setPinMode(false) } }
  const seek = (t) => { const v = videoRef.current; if (v) { v.currentTime = t; v.pause() } }
  const scrubRef = useRef(false)
  const scrubTo = (clientX, el) => {
    const v = videoRef.current; if (!v || !vid.dur) return
    const r = el.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    v.currentTime = f * vid.dur
  }

  const AMBER = 'var(--cv6-accent-warn, #f59e0b)'
  const pinSty = (n, on) => ({ position: 'absolute', transform: 'translate(-50%,-50%)', width: '24px', height: '24px', borderRadius: '50%', background: on ? 'var(--cv6-accent-primary)' : AMBER, color: '#fff', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, cursor: 'pointer', zIndex: 6 })

  const draftEditor = (label) => (
    <div style={{ background: 'var(--cv6-surface)', border: `1px solid ${AMBER}`, borderRadius: '12px', padding: '12px 13px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '9px' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, color: AMBER, background: 'color-mix(in srgb, var(--cv6-accent-warn, #f59e0b) 16%, transparent)', padding: '3px 7px', borderRadius: '6px' }}>{label}</span>
        <span style={{ fontSize: '11.5px', color: 'var(--cv6-text-secondary)' }}>{draft.type === 'timeline' ? 'paused on this frame' : 'pinned to this spot'}</span>
      </div>
      <input autoFocus value={draft.text} onChange={(e) => setDraft(d => ({ ...d, text: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setDraft(null); setPinMode(false) } }}
        placeholder="What should change here?"
        style={{ width: '100%', boxSizing: 'border-box', height: '38px', borderRadius: '9px', border: '1px solid var(--cv6-divider)', background: 'var(--cv6-surface-hover)', color: 'var(--cv6-text-primary)', fontSize: '14px', padding: '0 12px', marginBottom: '9px', outline: 'none', fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={save} disabled={busy} style={{ flex: 1, height: '36px', borderRadius: '9px', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{draft.type === 'timeline' ? 'Save & resume' : 'Save'}</button>
        <button onClick={() => { setDraft(null); setPinMode(false) }} style={{ height: '36px', padding: '0 14px', borderRadius: '9px', border: '1px solid var(--cv6-divider)', background: 'transparent', color: 'var(--cv6-text-secondary)', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  )

  // --- the rendered surface (media + click overlay + pins) ---
  let surface = null
  if (kind === 'image') {
    surface = (
      <div ref={surfRef} onClick={placePoint} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%', cursor: 'crosshair', lineHeight: 0 }}>
        <img src={url} alt={node.name} style={{ maxWidth: '100%', borderRadius: '10px', display: 'block' }} />
        {points.map((c, i) => (
          <button key={c.id} data-pin onClick={(e) => { e.stopPropagation(); setActiveId(c.id) }} title={c.text}
            style={{ ...pinSty(i + 1, activeId === c.id), left: (c.x * 100) + '%', top: (c.y * 100) + '%' }}>{i + 1}</button>
        ))}
        {draft && draft.type === 'point' && (<span style={{ position: 'absolute', left: (draft.x * 100) + '%', top: (draft.y * 100) + '%', transform: 'translate(-50%,-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--cv6-accent-primary)', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.45)', zIndex: 7 }} />)}
      </div>
    )
  } else if (kind === 'video') {
    const pct = vid.dur ? (vid.t / vid.dur) * 100 : 0
    surface = (
      <div>
        <div ref={surfRef} onClick={pinMode && vid.paused ? placePoint : undefined}
          style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#0c1118', cursor: pinMode && vid.paused ? 'crosshair' : 'default', lineHeight: 0 }}>
 {/* controls stay unless we're actually pinning on a paused frame, hiding them
              while playing left mobile with no pause/scrub at all */}
          <video ref={videoRef} src={url} onTimeUpdate={onTime} onLoadedMetadata={onTime} onPlay={onTime} onPause={onTime}
            controls={!(pinMode && vid.paused)} playsInline style={{ width: '100%', display: 'block', borderRadius: '12px', maxHeight: '52vh', background: '#0c1118' }} />
          {points.map((c, i) => (
            <button key={c.id} data-pin onClick={(e) => { e.stopPropagation(); setActiveId(c.id); if (c.t != null) seek(c.t) }} title={c.text}
              style={{ ...pinSty(i + 1, activeId === c.id), left: (c.x * 100) + '%', top: (c.y * 100) + '%' }}>{i + 1}</button>
          ))}
          {draft && draft.type === 'point' && (<span style={{ position: 'absolute', left: (draft.x * 100) + '%', top: (draft.y * 100) + '%', transform: 'translate(-50%,-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--cv6-accent-primary)', border: '2px solid #fff', zIndex: 7 }} />)}
        </div>
        {/* timeline with comment markers — a real scrubber (tap/drag to seek), not just a
            progress display; on mobile this is the always-available playbar */}
        <div
          onPointerDown={(e) => { if (e.target.closest && e.target.closest('[data-pin]')) return; e.currentTarget.setPointerCapture(e.pointerId); scrubRef.current = true; scrubTo(e.clientX, e.currentTarget) }}
          onPointerMove={(e) => { if (scrubRef.current) scrubTo(e.clientX, e.currentTarget) }}
          onPointerUp={() => { scrubRef.current = false }}
          onPointerCancel={() => { scrubRef.current = false }}
          style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center', marginTop: '10px', cursor: 'pointer', touchAction: 'none' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: '6px', borderRadius: '3px', background: 'var(--cv6-surface-hover)' }} />
          <div style={{ position: 'absolute', left: 0, height: '6px', borderRadius: '3px', background: 'var(--cv6-accent-primary)', width: pct + '%' }} />
          {timeline.map((c) => (
 <button key={c.id} data-pin title={`${fmt(c.t)}, ${c.text}`} onClick={(e) => { e.stopPropagation(); setActiveId(c.id); seek(c.t) }}
              style={{ position: 'absolute', top: '50%', left: (vid.dur ? (c.t / vid.dur) * 100 : 0) + '%', transform: 'translate(-50%,-50%)', width: '14px', height: '14px', borderRadius: '50%', background: AMBER, border: '2px solid var(--cv6-ground)', cursor: 'pointer', zIndex: 3, padding: 0 }} />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
          <button onClick={togglePlay} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'var(--cv6-accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: 'none' }}>
            {vid.paused ? (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7Z" /></svg>) : (<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>)}
          </button>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '13px', color: 'var(--cv6-text-primary)' }}>{fmt(vid.t)} / {fmt(vid.dur)}</span>
          <button onClick={() => setPinMode(m => !m)} title="Pin a comment to a spot on the paused frame"
            style={{ marginLeft: 'auto', height: '38px', padding: '0 13px', borderRadius: '10px', border: '1px solid var(--cv6-divider)', background: pinMode ? 'var(--cv6-accent-weak)' : 'transparent', color: pinMode ? 'var(--cv6-accent-primary)' : 'var(--cv6-text-secondary)', fontSize: '12.5px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Pin on frame</button>
          <button onClick={commentHere} style={{ height: '38px', padding: '0 15px', borderRadius: '10px', border: 'none', background: AMBER, color: '#3a2c05', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>Comment here
          </button>
        </div>
        {pinMode && <div style={{ fontSize: '12px', color: AMBER, marginTop: '8px' }}>Pause the video, then click the frame to pin a comment to that spot.</div>}
      </div>
    )
  } else { // text / markdown document — click anywhere to pin a point comment
    surface = (
      <div ref={surfRef} onClick={placePoint} style={{ position: 'relative', cursor: 'crosshair' }}>
        <article className="cv6-article" style={{ color: 'var(--cv6-text-primary)', overflowWrap: 'break-word', maxWidth: '72ch' }}>
          <ChatMessageRenderer content={text || '(empty file)'} />
        </article>
        {points.map((c, i) => (
          <button key={c.id} data-pin onClick={(e) => { e.stopPropagation(); setActiveId(c.id) }} title={c.text}
            style={{ ...pinSty(i + 1, activeId === c.id), left: (c.x * 100) + '%', top: (c.y * 100) + '%' }}>{i + 1}</button>
        ))}
        {draft && draft.type === 'point' && (<span style={{ position: 'absolute', left: (draft.x * 100) + '%', top: (draft.y * 100) + '%', transform: 'translate(-50%,-50%)', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--cv6-accent-primary)', border: '2px solid #fff', zIndex: 7 }} />)}
      </div>
    )
  }

  const count = comments.length
  return (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>{surface}</div>
      {/* comments rail */}
      <div style={{ flex: '1 1 240px', minWidth: '220px', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cv6-text-primary)' }}>Comments</span>
          <span style={{ fontSize: '12px', color: 'var(--cv6-text-secondary)' }}>{count ? `${count} pinned` : 'none yet'}</span>
        </div>
        {kind !== 'video' && !draft && (
          <div style={{ fontSize: '12px', color: 'var(--cv6-text-tertiary)' }}>Click the {kind === 'image' ? 'image' : 'document'} to pin a comment.</div>
        )}
        {draft && draftEditor(draft.type === 'timeline' ? fmt(draft.t) : `#${points.length + 1}`)}
 {/* empty state is carried by the "none yet" header + the click hint above , 
            no separate "No comments yet." line (it read as redundant). */}
        {[...timeline, ...points].map((c) => {
          const isPoint = c.type === 'point'
          const idx = isPoint ? points.indexOf(c) + 1 : null
          return (
            <div key={c.id} onClick={() => { setActiveId(c.id); if (!isPoint) seek(c.t) }}
              style={{ display: 'flex', gap: '10px', background: activeId === c.id ? 'var(--cv6-accent-weak)' : 'var(--cv6-surface)', border: '1px solid var(--cv6-divider)', borderRadius: '11px', padding: '10px 11px', cursor: 'pointer' }}>
              <span style={{ flex: 'none', fontFamily: "'Space Mono', monospace", fontSize: '11px', fontWeight: 700, color: AMBER, background: 'color-mix(in srgb, var(--cv6-accent-warn, #f59e0b) 16%, transparent)', padding: '3px 7px', borderRadius: '6px', height: 'fit-content' }}>{isPoint ? `#${idx}` : fmt(c.t)}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: '13.5px', lineHeight: 1.45, color: 'var(--cv6-text-primary)', overflowWrap: 'anywhere' }}>{c.text}</span>
              <button onClick={(e) => { e.stopPropagation(); del(c.id) }} title="Delete" style={{ flex: 'none', width: '24px', height: '24px', border: 'none', background: 'transparent', color: 'var(--cv6-text-tertiary)', cursor: 'pointer', borderRadius: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}