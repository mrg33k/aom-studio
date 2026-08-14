import React, { useState, useEffect } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lato:wght@300;400;700&family=Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,300;1,500&family=Inter:wght@300;400;500;600&display=swap');

  .s3c-page { box-sizing: border-box; }
  .s3c-page *, .s3c-page *::before, .s3c-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .s3c-root {
    --bg: #0a0e1a;
    --bg-card: #0f1525;
    --bg-card-2: #131929;
    --border: rgba(255,255,255,0.07);
    --border-light: rgba(255,255,255,0.12);
    --text-primary: #eeeae4;
    --text-secondary: rgba(238,234,228,0.55);
    --text-dim: rgba(238,234,228,0.30);
    --warm-gray: #c8bfb0;
    background: var(--bg);
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    min-height: 100vh;
  }

  .s3c-page-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 80px 40px 120px;
  }

  /* MASTHEAD */
  .s3c-masthead {
    margin-bottom: 96px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 56px;
  }
  .s3c-masthead-label {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 20px;
  }
  .s3c-masthead-title {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 400;
    line-height: 1.15;
    color: var(--text-primary);
    margin-bottom: 20px;
    letter-spacing: -0.01em;
  }
  .s3c-masthead-title span {
    font-style: italic;
    color: rgba(238,234,228,0.65);
  }
  .s3c-masthead-meta {
    display: flex;
    gap: 40px;
    margin-top: 28px;
    flex-wrap: wrap;
  }
  .s3c-meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .s3c-meta-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .s3c-meta-value {
    font-size: 13px;
    color: var(--text-secondary);
  }

  /* OPTION SECTIONS */
  .s3c-option-section {
    margin-bottom: 120px;
    position: relative;
  }
  .s3c-option-section:last-of-type { margin-bottom: 0; }

  .s3c-option-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 56px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .s3c-option-number {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    flex-shrink: 0;
    padding-top: 2px;
  }
  .s3c-option-name {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 400;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }
  .s3c-favorite-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 3px;
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-left: auto;
    flex-shrink: 0;
    background: rgba(184,115,51,0.12);
    color: #c8903f;
    border: 1px solid rgba(184,115,51,0.25);
  }

  /* HERO LOGO */
  .s3c-hero-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 320px;
    border-radius: 6px;
    margin-bottom: 64px;
    position: relative;
    overflow: hidden;
  }
  .s3c-hero-logo img {
    display: block;
    width: 220px;
    height: 220px;
    object-fit: contain;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 8px 32px rgba(0,0,0,0.5));
  }
  .s3c-hero-logo-label {
    position: absolute;
    bottom: 20px;
    left: 0; right: 0;
    text-align: center;
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
  }
  .s3c-hero-a { background: linear-gradient(135deg, #0d1b2e 0%, #0e1e35 50%, #0b1728 100%); }
  .s3c-hero-b { background: linear-gradient(135deg, #0d1b2e 0%, #111f30 50%, #0c1a2a 100%); }
  .s3c-hero-c { background: linear-gradient(135deg, #0b1525 0%, #0d1b2e 50%, #09121e 100%); }

  /* SECTION LABELS */
  .s3c-section-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 24px;
  }

  /* COLOR PALETTE */
  .s3c-palette-section { margin-bottom: 64px; }
  .s3c-palette-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
  }
  .s3c-palette-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .s3c-palette-chip {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .s3c-palette-name {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
    line-height: 1.3;
  }
  .s3c-palette-hex {
    font-family: 'Inter', monospace;
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: -6px;
  }

  /* FONT PAIRING */
  .s3c-font-section { margin-bottom: 64px; }
  .s3c-font-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 28px;
  }
  .s3c-font-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 24px 24px 20px;
  }
  .s3c-font-role {
    font-family: 'Lato', sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 10px;
  }
  .s3c-font-name-display {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 16px;
  }
  .s3c-font-sample-heading {
    line-height: 1.15;
    margin-bottom: 6px;
  }
  .s3c-font-weights {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .s3c-font-weight-sample {
    font-size: 11px;
    color: var(--text-dim);
  }
  .s3c-font-sample-paragraph {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 28px 32px;
  }
  .s3c-sample-headline {
    margin-bottom: 12px;
    line-height: 1.2;
  }
  .s3c-sample-body {
    line-height: 1.7;
  }

  /* SIZE COMPARISON */
  .s3c-size-section { margin-bottom: 64px; }
  .s3c-size-row {
    display: flex;
    align-items: flex-end;
    gap: 48px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 40px;
    flex-wrap: wrap;
  }
  .s3c-size-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .s3c-size-item img {
    object-fit: contain;
    display: block;
  }
  .s3c-size-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--text-dim);
    text-transform: uppercase;
    text-align: center;
  }
  .s3c-size-sublabel {
    font-size: 9px;
    opacity: .5;
    font-weight: 400;
  }

  /* BACKGROUND MOCKUPS */
  .s3c-bg-section { margin-bottom: 0; }
  .s3c-bg-mockups {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  .s3c-bg-mockup {
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px 28px;
    gap: 24px;
    min-height: 220px;
    position: relative;
  }
  .s3c-bg-mockup img {
    width: 100px;
    height: 100px;
    object-fit: contain;
    display: block;
  }
  .s3c-bg-mockup-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-align: center;
  }
  .s3c-bg-mockup-hex {
    font-family: 'Inter', monospace;
    font-size: 10px;
    opacity: 0.5;
    text-align: center;
  }
  .s3c-bg-dark { background: #0a0e1a; border: 1px solid rgba(255,255,255,0.08); }
  .s3c-bg-dark .s3c-bg-mockup-label { color: rgba(255,255,255,0.4); }
  .s3c-bg-white { background: #ffffff; }
  .s3c-bg-white .s3c-bg-mockup-label { color: rgba(0,0,0,0.35); }
  .s3c-bg-white .s3c-bg-mockup-hex { color: rgba(0,0,0,0.4); }
  .s3c-bg-warmgray { background: #e8e2d9; }
  .s3c-bg-warmgray .s3c-bg-mockup-label { color: rgba(0,0,0,0.35); }
  .s3c-bg-warmgray .s3c-bg-mockup-hex { color: rgba(0,0,0,0.4); }

  /* DIVIDER */
  .s3c-section-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 96px 0;
  }

  /* REFERRAL CTA */
  .s3c-referral {
    margin-top: 120px;
    padding: 64px 40px;
    border-radius: 16px;
    background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-card-2) 100%);
    border: 1px solid var(--border-light);
    text-align: center;
  }
  .s3c-referral-eyebrow {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #c8903f;
    margin-bottom: 24px;
  }
  .s3c-referral-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
    max-width: 480px;
    margin: 0 auto 16px;
  }
  .s3c-referral-sub {
    font-family: 'Lato', sans-serif;
    font-size: 15px;
    color: var(--text-secondary);
    max-width: 400px;
    margin: 0 auto 40px;
    line-height: 1.6;
  }
  .s3c-referral-form {
    display: flex;
    gap: 10px;
    max-width: 400px;
    margin: 0 auto 12px;
  }
  .s3c-referral-input {
    flex: 1;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--border-light);
    border-radius: 6px;
    padding: 12px 16px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
  }
  .s3c-referral-input::placeholder { color: var(--text-dim); }
  .s3c-referral-input:focus { border-color: rgba(255,255,255,0.25); }
  .s3c-referral-btn {
    background: #c8903f;
    border: none;
    border-radius: 6px;
    padding: 12px 20px;
    font-family: 'Lato', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: #fff;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s, opacity 0.15s;
  }
  .s3c-referral-btn:hover:not(:disabled) { background: #b07832; }
  .s3c-referral-btn:disabled { opacity: 0.55; cursor: default; }
  .s3c-referral-error {
    font-family: 'Inter', sans-serif;
    font-size: 12px;
    color: #e05555;
    margin-top: 8px;
  }
  .s3c-referral-thanks {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 400;
    font-style: italic;
    color: var(--text-primary);
    margin-bottom: 12px;
  }
  .s3c-referral-thanks-sub {
    font-family: 'Lato', sans-serif;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .s3c-aom-logo-wrap {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .s3c-aom-logo-wrap img {
    height: 20px;
    opacity: 0.75;
  }
  .s3c-aom-url {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.08em;
  }

  /* FOOTER */
  .s3c-footer {
    margin-top: 96px;
    padding-top: 32px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }
  .s3c-footer-left {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .s3c-footer-right {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }
`

const LOGO = {
  seal:     '/images/s3c/c03-circular-seal-nobg.png',
  monogram: '/images/s3c/c01-angular-monogram-nobg.png',
  badge:    '/images/s3c/c02-hexagonal-badge-nobg.png',
}

function PaletteGrid({ swatches }) {
  return (
    <div className="s3c-palette-grid">
      {swatches.map(({ bg, name, hex, border }) => (
        <div className="s3c-palette-item" key={hex}>
          <div className="s3c-palette-chip" style={{ background: bg, borderColor: border || 'rgba(255,255,255,0.06)' }} />
          <div className="s3c-palette-name">{name}</div>
          <div className="s3c-palette-hex">{hex}</div>
        </div>
      ))}
    </div>
  )
}

function SizeRow({ src, alt }) {
  const sizes = [
    { w: 32, label: '32px', sub: 'favicon / app icon' },
    { w: 64, label: '64px', sub: 'email / mobile' },
    { w: 120, label: '120px', sub: 'letterhead / web' },
    { w: 200, label: '200px', sub: 'cover / print' },
  ]
  return (
    <div className="s3c-size-row">
      {sizes.map(({ w, label, sub }) => (
        <div className="s3c-size-item" key={w}>
          <img src={src} width={w} height={w} alt={`${alt} ${w}px`} />
          <div className="s3c-size-label">{label}<br /><span className="s3c-size-sublabel">{sub}</span></div>
        </div>
      ))}
    </div>
  )
}

function BgMockups({ src, alt }) {
  return (
    <div className="s3c-bg-mockups">
      <div className="s3c-bg-mockup s3c-bg-dark">
        <img src={src} alt={`${alt} on dark`} />
        <div>
          <div className="s3c-bg-mockup-label">Dark</div>
          <div className="s3c-bg-mockup-hex">#0a0e1a</div>
        </div>
      </div>
      <div className="s3c-bg-mockup s3c-bg-white">
        <img src={src} alt={`${alt} on white`} />
        <div>
          <div className="s3c-bg-mockup-label">White</div>
          <div className="s3c-bg-mockup-hex">#ffffff</div>
        </div>
      </div>
      <div className="s3c-bg-mockup s3c-bg-warmgray">
        <img src={src} alt={`${alt} on warm gray`} />
        <div>
          <div className="s3c-bg-mockup-label">Warm Gray</div>
          <div className="s3c-bg-mockup-hex">#e8e2d9</div>
        </div>
      </div>
    </div>
  )
}

function ReferralForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [errMsg, setErrMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !email.includes('@')) {
      setErrMsg('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 's3c-brand-page' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrMsg(data.error || 'Something went wrong. Try again.')
        setStatus('idle')
      } else {
        setStatus('done')
      }
    } catch {
      setErrMsg('Network error. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'done') {
    return (
      <div>
        <div className="s3c-referral-thanks">Thank you.</div>
        <div className="s3c-referral-thanks-sub">We'll be in touch with them.</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="s3c-referral-form">
        <input
          className="s3c-referral-input"
          type="email"
          placeholder="their@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'loading'}
        />
        <button
          className="s3c-referral-btn"
          type="submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending...' : 'Send'}
        </button>
      </div>
      {errMsg && <div className="s3c-referral-error">{errMsg}</div>}
    </form>
  )
}

export default function S3CBrand() {
  return (
    <div className="s3c-root s3c-page">
      <style>{CSS}</style>
      <div className="s3c-page-inner">

        {/* MASTHEAD */}
        <div className="s3c-masthead">
          <div className="s3c-masthead-label">Brand Identity Exploration</div>
          <div className="s3c-masthead-title">
            Semiconductor Services &amp; Supply Coalition<br />
 <span>S3C, Logo Round 3</span>
          </div>
          <div className="s3c-masthead-meta">
            <div className="s3c-meta-item">
              <div className="s3c-meta-label">Client</div>
              <div className="s3c-meta-value">Ben / S3C</div>
            </div>
            <div className="s3c-meta-item">
              <div className="s3c-meta-label">Direction</div>
              <div className="s3c-meta-value">Institutional Authority + Arizona Identity</div>
            </div>
            <div className="s3c-meta-item">
              <div className="s3c-meta-label">Round</div>
              <div className="s3c-meta-value">3 of 3 Finalists</div>
            </div>
            <div className="s3c-meta-item">
              <div className="s3c-meta-label">Date</div>
              <div className="s3c-meta-value">March 2026</div>
            </div>
          </div>
        </div>

        {/* OPTION 01: CIRCULAR SEAL */}
        <div className="s3c-option-section">
          <div className="s3c-option-header">
            <div className="s3c-option-number">Option 01</div>
 <div className="s3c-option-name">C03, Circular Seal</div>
            <div className="s3c-favorite-badge">Recommended</div>
          </div>

          <div className="s3c-hero-logo s3c-hero-a">
            <img src={LOGO.seal} alt="S3C Circular Seal" />
 <div className="s3c-hero-logo-label">C03, Circular Seal</div>
          </div>

          <div className="s3c-palette-section">
            <div className="s3c-section-label">Color Palette</div>
            <PaletteGrid swatches={[
              { bg: '#0B1C3E', name: 'Deep Navy',      hex: '#0B1C3E' },
              { bg: '#B87333', name: 'Copper',         hex: '#B87333' },
              { bg: '#D4A853', name: 'Warm Gold',      hex: '#D4A853' },
              { bg: '#F5F0E8', name: 'Cream',          hex: '#F5F0E8', border: 'rgba(0,0,0,0.08)' },
              { bg: '#8A8078', name: 'Warm Gray',      hex: '#8A8078' },
              { bg: '#1E2D42', name: 'Charcoal Navy',  hex: '#1E2D42' },
            ]} />
          </div>

          <div className="s3c-font-section">
            <div className="s3c-section-label">Font Pairing</div>
            <div className="s3c-font-cards">
              <div className="s3c-font-card">
                <div className="s3c-font-role">Display / Headings</div>
                <div className="s3c-font-name-display">Playfair Display</div>
                <div className="s3c-font-sample-heading" style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, color: '#eeeae4', fontWeight: 400 }}>
                  Arizona's Industrial Coalition
                </div>
                <div className="s3c-font-weights">
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>Regular</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>Semibold</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 400 }}>Italic</span>
                </div>
              </div>
              <div className="s3c-font-card">
                <div className="s3c-font-role">Body / Supporting Text</div>
                <div className="s3c-font-name-display">Source Serif 4</div>
                <div className="s3c-font-sample-heading" style={{ fontFamily: "'Source Serif 4', serif", fontSize: 18, color: '#eeeae4', fontWeight: 400, lineHeight: 1.4 }}>
                  Connecting suppliers, builders, and buyers across the supply chain.
                </div>
                <div className="s3c-font-weights">
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 300 }}>Light</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 400 }}>Regular</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Source Serif 4', serif", fontStyle: 'italic', fontWeight: 300 }}>Italic</span>
                </div>
              </div>
            </div>
            <div className="s3c-font-sample-paragraph">
              <div className="s3c-sample-headline" style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#eeeae4', letterSpacing: '-0.01em' }}>
                Semiconductor Services &amp; Supply Coalition
              </div>
              <div className="s3c-sample-body" style={{ fontFamily: "'Source Serif 4', serif", fontSize: 15, fontWeight: 300, color: 'rgba(238,234,228,0.65)' }}>
 S3C is Arizona's premier coalition connecting semiconductor manufacturers, equipment suppliers, and industrial service providers. We facilitate the contracts, partnerships, and procurement relationships that keep the region's supply chain moving. Membership opens doors, to qualified buyers, pre-vetted suppliers, and the policy table.
              </div>
            </div>
          </div>

          <div className="s3c-size-section">
            <div className="s3c-section-label">Size Range</div>
            <SizeRow src={LOGO.seal} alt="S3C Circular Seal" />
          </div>

          <div className="s3c-bg-section">
            <div className="s3c-section-label">On Background</div>
            <BgMockups src={LOGO.seal} alt="S3C Circular Seal" />
          </div>
        </div>

        <hr className="s3c-section-divider" />

        {/* OPTION 02: ANGULAR MONOGRAM */}
        <div className="s3c-option-section">
          <div className="s3c-option-header">
            <div className="s3c-option-number">Option 02</div>
 <div className="s3c-option-name">C01, Angular Monogram</div>
          </div>

          <div className="s3c-hero-logo s3c-hero-b">
            <img src={LOGO.monogram} alt="S3C Angular Monogram" />
 <div className="s3c-hero-logo-label">C01, Angular Monogram</div>
          </div>

          <div className="s3c-palette-section">
            <div className="s3c-section-label">Color Palette</div>
            <PaletteGrid swatches={[
              { bg: '#0D1B2E', name: 'Midnight Navy', hex: '#0D1B2E' },
              { bg: '#A0522D', name: 'Aged Copper',   hex: '#A0522D' },
              { bg: '#3D5A80', name: 'Slate Blue',    hex: '#3D5A80' },
              { bg: '#EDE8DF', name: 'Parchment',     hex: '#EDE8DF', border: 'rgba(0,0,0,0.08)' },
              { bg: '#7A8696', name: 'Steel Gray',    hex: '#7A8696' },
              { bg: '#2C3442', name: 'Gunmetal',      hex: '#2C3442' },
            ]} />
          </div>

          <div className="s3c-font-section">
            <div className="s3c-section-label">Font Pairing</div>
            <div className="s3c-font-cards">
              <div className="s3c-font-card">
                <div className="s3c-font-role">Display / Headings</div>
                <div className="s3c-font-name-display">Libre Baskerville</div>
                <div className="s3c-font-sample-heading" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, color: '#eeeae4', fontWeight: 700, letterSpacing: '-0.01em' }}>
                  Built on Arizona Ground
                </div>
                <div className="s3c-font-weights">
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 400 }}>Regular</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>Bold</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic', fontWeight: 400 }}>Italic</span>
                </div>
              </div>
              <div className="s3c-font-card">
                <div className="s3c-font-role">Body / Supporting Text</div>
                <div className="s3c-font-name-display">Lato</div>
                <div className="s3c-font-sample-heading" style={{ fontFamily: "'Lato', sans-serif", fontSize: 17, color: '#eeeae4', fontWeight: 300, lineHeight: 1.5 }}>
                  Access qualified suppliers and enterprise buyers across the semiconductor industry.
                </div>
                <div className="s3c-font-weights">
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>Light</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>Regular</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Bold</span>
                </div>
              </div>
            </div>
            <div className="s3c-font-sample-paragraph">
              <div className="s3c-sample-headline" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 21, fontWeight: 700, color: '#eeeae4', letterSpacing: '-0.01em', marginBottom: 12 }}>
                Semiconductor Services &amp; Supply Coalition
              </div>
              <div className="s3c-sample-body" style={{ fontFamily: "'Lato', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(238,234,228,0.65)', lineHeight: 1.7 }}>
 S3C is Arizona's premier coalition connecting semiconductor manufacturers, equipment suppliers, and industrial service providers. We facilitate the contracts, partnerships, and procurement relationships that keep the region's supply chain moving. Membership opens doors, to qualified buyers, pre-vetted suppliers, and the policy table.
              </div>
            </div>
          </div>

          <div className="s3c-size-section">
            <div className="s3c-section-label">Size Range</div>
            <SizeRow src={LOGO.monogram} alt="S3C Angular Monogram" />
          </div>

          <div className="s3c-bg-section">
            <div className="s3c-section-label">On Background</div>
            <BgMockups src={LOGO.monogram} alt="S3C Angular Monogram" />
          </div>
        </div>

        <hr className="s3c-section-divider" />

        {/* OPTION 03: HEXAGONAL BADGE */}
        <div className="s3c-option-section">
          <div className="s3c-option-header">
            <div className="s3c-option-number">Option 03</div>
 <div className="s3c-option-name">C02, Hexagonal Badge</div>
          </div>

          <div className="s3c-hero-logo s3c-hero-c">
            <img src={LOGO.badge} alt="S3C Hexagonal Badge" />
 <div className="s3c-hero-logo-label">C02, Hexagonal Badge</div>
          </div>

          <div className="s3c-palette-section">
            <div className="s3c-section-label">Color Palette</div>
            <PaletteGrid swatches={[
              { bg: '#0A1628', name: 'Navy Blue',   hex: '#0A1628' },
              { bg: '#CD7F32', name: 'Bronze',      hex: '#CD7F32' },
              { bg: '#C9963B', name: 'Amber Gold',  hex: '#C9963B' },
              { bg: '#F0EBE1', name: 'Off-White',   hex: '#F0EBE1', border: 'rgba(0,0,0,0.08)' },
              { bg: '#6B7680', name: 'Mid Gray',    hex: '#6B7680' },
              { bg: '#1A2E3B', name: 'Deep Teal',   hex: '#1A2E3B' },
            ]} />
          </div>

          <div className="s3c-font-section">
            <div className="s3c-section-label">Font Pairing</div>
            <div className="s3c-font-cards">
              <div className="s3c-font-card">
                <div className="s3c-font-role">Display / Headings</div>
                <div className="s3c-font-name-display">Cormorant Garamond</div>
                <div className="s3c-font-sample-heading" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, color: '#eeeae4', fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1.2 }}>
                  Supply Chain Authority
                </div>
                <div className="s3c-font-weights">
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Light</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>Medium</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300 }}>Light Italic</span>
                </div>
              </div>
              <div className="s3c-font-card">
                <div className="s3c-font-role">Body / Supporting Text</div>
                <div className="s3c-font-name-display">Inter</div>
                <div className="s3c-font-sample-heading" style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: '#eeeae4', fontWeight: 300, lineHeight: 1.6, letterSpacing: '0.01em' }}>
                  Structured access to the semiconductor supply chain. Contracts, partnerships, sourcing — all in one coalition.
                </div>
                <div className="s3c-font-weights">
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>Light</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Regular</span>
                  <span className="s3c-font-weight-sample" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>Medium</span>
                </div>
              </div>
            </div>
            <div className="s3c-font-sample-paragraph">
              <div className="s3c-sample-headline" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, color: '#eeeae4', letterSpacing: '0.01em', marginBottom: 12 }}>
                Semiconductor Services &amp; Supply Coalition
              </div>
              <div className="s3c-sample-body" style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 300, color: 'rgba(238,234,228,0.65)', lineHeight: 1.75, letterSpacing: '0.01em' }}>
 S3C is Arizona's premier coalition connecting semiconductor manufacturers, equipment suppliers, and industrial service providers. We facilitate the contracts, partnerships, and procurement relationships that keep the region's supply chain moving. Membership opens doors, to qualified buyers, pre-vetted suppliers, and the policy table.
              </div>
            </div>
          </div>

          <div className="s3c-size-section">
            <div className="s3c-section-label">Size Range</div>
            <SizeRow src={LOGO.badge} alt="S3C Hexagonal Badge" />
          </div>

          <div className="s3c-bg-section">
            <div className="s3c-section-label">On Background</div>
            <BgMockups src={LOGO.badge} alt="S3C Hexagonal Badge" />
          </div>
        </div>

        {/* REFERRAL CTA */}
        <div className="s3c-referral">
          <div className="s3c-referral-eyebrow">Referral</div>
          <div className="s3c-referral-title">
            Know someone that needs a killer brand creation experience?
          </div>
          <div className="s3c-referral-sub">Send them our way</div>
          <ReferralForm />
          <div style={{ marginTop: 40 }}>
            <div className="s3c-aom-logo-wrap">
              <img src="/brand/aom-mono-white.svg" alt="AOM" />
            </div>
            <div className="s3c-aom-url">aheadofmarket.com</div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="s3c-footer">
 <div className="s3c-footer-left">S3C, Brand Identity Round 3</div>
 <div className="s3c-footer-right">Prepared by AOM Studio, March 2026</div>
        </div>

      </div>
    </div>
  )
}