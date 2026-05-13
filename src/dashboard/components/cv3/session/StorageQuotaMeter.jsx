// StorageQuotaMeter -- R79-f7 (2026-05-12).
//
// Small bar matching the shape of ContextFullnessMeter. Polls rag-server's
// /storage-info every 30s and on user-driven uploads (listens for the
// 'corner:upload-finished' window event). Hides itself for the aom world
// because that one is unlimited per Patrik's product decision.

import { useEffect, useState, useCallback } from 'react'

const RAG_BASE = 'https://rag.aheadofmarket.com'
const EVENT_UPLOAD_DONE = 'corner:upload-finished'
const POLL_INTERVAL_MS = 30_000

function colorFor(pct) {
  if (pct >= 95) return '#EF4444'
  if (pct >= 80) return '#EAB308'
  return '#10B981'
}

function formatGb(bytes) {
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 ** 2)
  return `${mb.toFixed(0)} MB`
}

export default function StorageQuotaMeter({ world = 'aom' }) {
  const [info, setInfo] = useState(null)
  const [hovered, setHovered] = useState(false)

  const refresh = useCallback(async () => {
    if (!world) return
    try {
      const r = await fetch(`${RAG_BASE}/storage-info?world=${encodeURIComponent(world)}`, {
        method: 'GET',
        // No credentials -- /storage-info is read-only and per-world.
      })
      if (!r.ok) return
      const data = await r.json()
      setInfo(data)
    } catch (_) {
      // Tunnel down -- hide gracefully.
      setInfo(null)
    }
  }, [world])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, POLL_INTERVAL_MS)
    const onUpload = () => refresh()
    window.addEventListener(EVENT_UPLOAD_DONE, onUpload)
    return () => {
      clearInterval(iv)
      window.removeEventListener(EVENT_UPLOAD_DONE, onUpload)
    }
  }, [refresh])

  // AOM has limit_mb=null (unlimited) per rag-server.py:883. Hide the meter.
  if (!info || info.limit_mb == null) return null

  const used = info.used_bytes || 0
  const cap = (info.limit_mb || 0) * 1024 * 1024
  if (cap <= 0) return null
  const pct = Math.min(100, Math.round((used / cap) * 100))
  const fill = colorFor(pct)
  const widthRest = 80
  const widthHover = 170
  const label = `${formatGb(used)} of ${formatGb(cap)} used (${info.file_count} files)`

  return (
    <div
      data-testid="storage-quota-meter"
      data-pct={pct}
      data-world={world}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 24,
        width: hovered ? widthHover : widthRest,
        padding: '0 8px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'width 180ms ease, background 180ms ease',
        cursor: 'help',
        fontFamily: "'Inter', system-ui, sans-serif",
        userSelect: 'none',
      }}
    >
      {/* Tiny floppy-disk-ish glyph so the meter is distinguishable from the
          context meter at a glance. */}
      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={fill}
           strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
      <div style={{
        flex: 1,
        height: 4,
        background: 'rgba(255,255,255,0.08)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: fill,
          transition: 'width 260ms ease',
        }} />
      </div>
      {hovered && (
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: fill,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>{pct}%</span>
      )}
    </div>
  )
}
