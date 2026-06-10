// CV4 mail attachment chip — shown above the composer pill when the user
// clicks an email in the Mail Room right rail. Tells the EA "this is what
// I want to talk about" so the next reply gets the email body as context.
//
// corner:cv4-tools-mail R1 (2026-05-13).

import { C } from '../lib/cv3Colors.js'

export default function MailChip({ email, onClear }) {
  if (!email) return null
  const fromLabel = email.from?.name || email.from?.email || '(unknown)'
  return (
    <div
      data-testid="cv4-mail-chip"
      style={{
        maxWidth: 612,
        margin: '0 auto 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 8px 6px 12px',
        borderRadius: 10,
        background: 'rgba(234,179,8,0.10)',
        border: '1px solid rgba(234,179,8,0.30)',
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.yellow} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <rect x="3" y="5" width="18" height="14" rx="2"/>
        <polyline points="3 7 12 13 21 7"/>
      </svg>
      <span style={{
        flex: 1,
        display: 'flex', alignItems: 'baseline', gap: 6,
        minWidth: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: C.yellow,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>Reply</span>
        <span style={{
          fontSize: 12, fontWeight: 500, color: C.text2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{email.subject}</span>
        <span style={{
          fontSize: 11, color: C.muted,
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
        }}>· {fromLabel}</span>
      </span>
      <button
        type="button"
        onClick={onClear}
        title="Detach email"
        style={{
          width: 20, height: 20,
          background: 'none', border: 'none',
          borderRadius: '50%',
          color: C.muted,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
        }}
      >×</button>
    </div>
  )
}
