// WorldOverrideBanner.jsx (corner:tenant-isolation R1)
//
// A persistent, unmistakable banner shown whenever the super-admin is viewing a
// world other than their own (an active world override). It makes a cross-world
// "peek" impossible to mistake for the admin's own dashboard — the exact
// confusion that made Karen's world look like "items waiting for ME".
//
// Reactive: re-reads on the custom 'corner:world-override' event (fired by
// setWorldOverride/clearWorldOverride) and on cross-tab storage events.

import React, { useEffect, useState } from 'react'
import { activeWorldOverride, getUserWorld, clearWorldOverride } from '../lib/clientConfig'

export default function WorldOverrideBanner() {
  const [world, setWorld] = useState(() => activeWorldOverride())

  useEffect(() => {
    const read = () => setWorld(activeWorldOverride())
    read()
    window.addEventListener('corner:world-override', read)
    window.addEventListener('storage', read)
    return () => {
      window.removeEventListener('corner:world-override', read)
      window.removeEventListener('storage', read)
    }
  }, [])

  if (!world) return null

  const myWorld = (getUserWorld() || 'your world').toUpperCase()
  const viewing = world.toUpperCase()

  const handleReturn = () => {
    clearWorldOverride()
    // Full reload so every data surface (needs-you, agents, projects) re-scopes
    // to the admin's own world in one clean pass.
    try { window.location.reload() } catch { /* ignore */ }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '7px 14px',
        background: 'linear-gradient(90deg, #B45309, #D97706)',
        color: '#fff',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: '0.01em',
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        borderBottom: '1px solid rgba(0,0,0,0.25)',
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 9,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          background: 'rgba(0,0,0,0.28)',
          borderRadius: 4,
          padding: '2px 6px',
        }}
      >
        Viewing
      </span>
      <span>
 You are viewing <strong>{viewing}</strong>, this is not your world.
      </span>
      <button
        onClick={handleReturn}
        style={{
          marginLeft: 4,
          background: '#fff',
          color: '#92400E',
          border: 'none',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Return to {myWorld}
      </button>
    </div>
  )
}