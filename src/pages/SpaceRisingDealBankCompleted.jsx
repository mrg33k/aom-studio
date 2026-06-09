import React, { useEffect } from 'react'

// Space Rising — Deal Bank — Completed Rounds (RETIRED)
// Route: /space-rising/deal-bank/completed
//
// R6 (2026-06-09): The canonical surface moved to spacerising.org.
// This page now redirects so old shared links still work.
//
// DO NOT add new features here. All Deal Bank work happens in:
//   sourcing-directory/src/pages/SourcingDealBank.jsx
//   live at: https://spacerising.org/space-rising/deal-bank

const REDIRECT_URL = 'https://spacerising.org/space-rising/deal-bank'

export default function SpaceRisingDealBankCompleted() {
  useEffect(() => {
    window.location.replace(REDIRECT_URL)
  }, [])

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#07090C',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#8B939C',
    }}>
      <div style={{
        fontSize: 13,
        letterSpacing: '0.04em',
      }}>
        Redirecting to <span style={{ color: '#E5451F' }}>spacerising.org</span>…
      </div>
      <a
        href={REDIRECT_URL}
        style={{
          fontSize: 11,
          color: '#5A6068',
          textDecoration: 'none',
        }}
      >
        Click here if you're not redirected
      </a>
    </div>
  )
}
