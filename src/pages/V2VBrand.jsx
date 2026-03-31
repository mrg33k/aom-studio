import React, { useState } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,300;0,500;0,600;1,300;1,500&family=Lato:wght@300;400;700;900&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;1,8..60,300&family=Inter:wght@300;400;500;600&display=swap');

  .v2v-page { box-sizing: border-box; }
  .v2v-page *, .v2v-page *::before, .v2v-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .v2v-root {
    --bg: #080c16;
    --bg-card: #0d1220;
    --bg-card-2: #111828;
    --border: rgba(255,255,255,0.07);
    --border-light: rgba(255,255,255,0.12);
    --text-primary: #eeeae4;
    --text-secondary: rgba(238,234,228,0.58);
    --text-dim: rgba(238,234,228,0.32);
    --gold: #C9A84C;
    --gold-dim: rgba(201,168,76,0.18);
    --navy: #0D1B2E;
    background: var(--bg);
    color: var(--text-primary);
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    min-height: 100vh;
  }

  .v2v-inner {
    max-width: 900px;
    margin: 0 auto;
    padding: 80px 40px 120px;
  }

  /* MASTHEAD */
  .v2v-masthead {
    margin-bottom: 80px;
    border-bottom: 1px solid var(--border);
    padding-bottom: 56px;
  }
  .v2v-masthead-eyebrow {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 20px;
    opacity: 0.9;
  }
  .v2v-masthead-title {
    font-family: 'Libre Baskerville', serif;
    font-size: 44px;
    font-weight: 700;
    line-height: 1.1;
    color: var(--text-primary);
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .v2v-masthead-subtitle {
    font-family: 'Libre Baskerville', serif;
    font-size: 22px;
    font-weight: 400;
    font-style: italic;
    color: rgba(238,234,228,0.45);
    margin-bottom: 36px;
    letter-spacing: 0;
  }
  .v2v-mission-block {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--gold);
    border-radius: 0 6px 6px 0;
    padding: 28px 32px;
    margin-bottom: 36px;
  }
  .v2v-mission-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 14px;
    opacity: 0.85;
  }
  .v2v-mission-text {
    font-family: 'Libre Baskerville', serif;
    font-size: 16px;
    font-weight: 400;
    line-height: 1.75;
    color: rgba(238,234,228,0.82);
  }
  .v2v-masthead-meta {
    display: flex;
    gap: 40px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .v2v-meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .v2v-meta-label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .v2v-meta-value {
    font-size: 13px;
    color: var(--text-secondary);
  }

  /* OPTION SECTIONS */
  .v2v-option-section {
    margin-bottom: 120px;
    position: relative;
  }
  .v2v-option-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 52px;
    padding-bottom: 22px;
    border-bottom: 1px solid var(--border);
  }
  .v2v-option-number {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    flex-shrink: 0;
    padding-top: 2px;
  }
  .v2v-option-name {
    font-family: 'Libre Baskerville', serif;
    font-size: 26px;
    font-weight: 400;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }
  .v2v-recommended-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 3px;
    background: rgba(201,168,76,0.12);
    color: #C9A84C;
    border: 1px solid rgba(201,168,76,0.28);
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-left: auto;
    flex-shrink: 0;
  }

  /* HERO LOGO */
  .v2v-hero-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 340px;
    border-radius: 6px;
    margin-bottom: 60px;
    position: relative;
    overflow: hidden;
  }
  .v2v-hero-logo img {
    display: block;
    width: 220px;
    height: 220px;
    object-fit: contain;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 12px 40px rgba(0,0,0,0.6));
  }
  .v2v-hero-logo-label {
    position: absolute;
    bottom: 20px;
    left: 0; right: 0;
    text-align: center;
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.22);
  }
  .v2v-hero-a {
    background: linear-gradient(160deg, #060d1a 0%, #0a1526 45%, #071020 100%);
  }
  .v2v-hero-a::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 40%, rgba(201,168,76,0.07) 0%, transparent 65%);
  }
  .v2v-hero-b {
    background: linear-gradient(160deg, #080e1c 0%, #0b1627 45%, #060e1a 100%);
  }
  .v2v-hero-b::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 40%, rgba(13,27,46,0.9) 0%, transparent 70%);
  }
  .v2v-hero-c {
    background: linear-gradient(160deg, #070d1b 0%, #0e1626 45%, #091220 100%);
  }
  .v2v-hero-c::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 40%, rgba(27,67,50,0.22) 0%, transparent 65%);
  }

  /* SECTION LABELS */
  .v2v-section-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.20em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 24px;
  }

  /* COLOR PALETTE */
  .v2v-palette-section { margin-bottom: 60px; }
  .v2v-palette-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
  }
  .v2v-palette-item {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .v2v-palette-chip {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .v2v-palette-name {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-dim);
    line-height: 1.3;
  }
  .v2v-palette-hex {
    font-family: 'Inter', monospace;
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: -6px;
  }

  /* FONT PAIRING */
  .v2v-font-section { margin-bottom: 60px; }
  .v2v-font-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
  .v2v-font-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 24px 24px 20px;
  }
  .v2v-font-role {
    font-family: 'Lato', sans-serif;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 10px;
  }
  .v2v-font-name-display {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 16px;
  }
  .v2v-font-sample-heading { line-height: 1.15; margin-bottom: 6px; }
  .v2v-font-weights {
    display: flex;
    gap: 16px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .v2v-font-weight-sample {
    font-size: 11px;
    color: var(--text-dim);
  }
  .v2v-font-sample-paragraph {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 28px 32px;
  }
  .v2v-sample-headline { margin-bottom: 12px; line-height: 1.2; }
  .v2v-sample-body { line-height: 1.75; }

  /* SIZE COMPARISON */
  .v2v-size-section { margin-bottom: 60px; }
  .v2v-size-row {
    display: flex;
    align-items: flex-end;
    gap: 48px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 40px;
    flex-wrap: wrap;
  }
  .v2v-size-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .v2v-size-item img { object-fit: contain; display: block; }
  .v2v-size-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: var(--text-dim);
    text-transform: uppercase;
    text-align: center;
    line-height: 1.5;
  }

  /* BACKGROUND MOCKUPS */
  .v2v-bg-section { margin-bottom: 0; }
  .v2v-bg-mockups {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }
  .v2v-bg-mockup {
    border-radius: 6px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px 28px;
    gap: 20px;
    min-height: 220px;
    position: relative;
  }
  .v2v-bg-mockup img {
    width: 100px;
    height: 100px;
    object-fit: contain;
    display: block;
  }
  .v2v-bg-mockup-label {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    text-align: center;
  }
  .v2v-bg-mockup-hex {
    font-family: 'Inter', monospace;
    font-size: 10px;
    opacity: 0.45;
    text-align: center;
    margin-top: -12px;
  }
  .v2v-bg-dark { background: #080c16; border: 1px solid rgba(255,255,255,0.08); }
  .v2v-bg-dark .v2v-bg-mockup-label { color: rgba(255,255,255,0.38); }
  .v2v-bg-navy { background: #0D1B2E; border: 1px solid rgba(255,255,255,0.05); }
  .v2v-bg-navy .v2v-bg-mockup-label { color: rgba(255,255,255,0.4); }
  .v2v-bg-navy .v2v-bg-mockup-hex { color: rgba(255,255,255,0.4); }
  .v2v-bg-cream { background: #F5F0E8; }
  .v2v-bg-cream .v2v-bg-mockup-label { color: rgba(0,0,0,0.35); }
  .v2v-bg-cream .v2v-bg-mockup-hex { color: rgba(0,0,0,0.4); }

  /* DIVIDER */
  .v2v-section-divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 96px 0;
  }

  /* REFERRAL CTA */
  .v2v-referral {
    margin-top: 96px;
    padding-top: 64px;
    border-top: 1px solid var(--border);
    text-align: center;
  }
  .v2v-referral-eyebrow {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: 20px;
  }
  .v2v-referral-title {
    font-family: 'Libre Baskerville', serif;
    font-size: 26px;
    font-weight: 400;
    color: var(--text-primary);
    line-height: 1.45;
    margin-bottom: 14px;
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
  }
  .v2v-referral-sub {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 40px;
    line-height: 1.6;
  }
  .v2v-referral-form {
    display: flex;
    gap: 10px;
    max-width: 420px;
    margin: 0 auto 12px;
  }
  .v2v-referral-input {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border-light);
    border-radius: 4px;
    padding: 11px 16px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    color: var(--text-primary);
    outline: none;
    transition: border-color 0.15s;
  }
  .v2v-referral-input::placeholder { color: var(--text-dim); }
  .v2v-referral-input:focus { border-color: rgba(255,255,255,0.25); }
  .v2v-referral-btn {
    padding: 11px 24px;
    background: var(--gold);
    color: #080c16;
    border: none;
    border-radius: 4px;
    font-family: 'Lato', sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .v2v-referral-btn:hover:not(:disabled) { background: #b89a3a; }
  .v2v-referral-btn:disabled { opacity: 0.55; cursor: default; }
  .v2v-referral-error {
    font-size: 12px;
    color: #e87d6a;
    margin-top: 8px;
    text-align: center;
  }
  .v2v-referral-thanks {
    font-family: 'Libre Baskerville', serif;
    font-size: 22px;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
  .v2v-referral-thanks-sub {
    font-size: 14px;
    color: var(--text-secondary);
  }
  .v2v-aom-wordmark {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: 40px;
  }
  .v2v-aom-letters {
    font-family: 'Lato', sans-serif;
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 0.12em;
    color: var(--text-primary);
    line-height: 1;
  }
  .v2v-aom-divider {
    width: 32px;
    height: 2px;
    background: var(--gold);
    margin: 0 auto;
    opacity: 0.6;
    border-radius: 1px;
  }
  .v2v-aom-tagline {
    font-family: 'Lato', sans-serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text-dim);
  }

  /* FOOTER */
  .v2v-footer-note {
    margin-top: 48px;
    padding-top: 32px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .v2v-footer-brand {
    font-family: 'Lato', sans-serif;
    font-size: 11px;
    color: var(--text-dim);
    letter-spacing: 0.06em;
  }
  .v2v-footer-date {
    font-family: 'Inter', sans-serif;
    font-size: 11px;
    color: var(--text-dim);
  }
`

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
        body: JSON.stringify({ email: email.trim(), source: 'v2v-brand-page' }),
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
        <div className="v2v-referral-thanks">Thank you.</div>
        <div className="v2v-referral-thanks-sub">We'll be in touch with them.</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="v2v-referral-form">
        <input
          className="v2v-referral-input"
          type="email"
          placeholder="their@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'loading'}
        />
        <button
          className="v2v-referral-btn"
          type="submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending...' : 'Send'}
        </button>
      </div>
      {errMsg && <div className="v2v-referral-error">{errMsg}</div>}
    </form>
  )
}

export default function V2VBrand() {
  return (
    <div className="v2v-root v2v-page">
      <style>{CSS}</style>
      <div className="v2v-inner">

        {/* MASTHEAD */}
        <div className="v2v-masthead">
          <div className="v2v-masthead-eyebrow">Brand Identity</div>
          <div className="v2v-masthead-title">Valor to Victory</div>
          <div className="v2v-masthead-subtitle">Logo Concepts — Round 1</div>

          <div className="v2v-mission-block">
            <div className="v2v-mission-label">Mission</div>
            <div className="v2v-mission-text">
              Empowering veterans to achieve financial independence through homeownership and strategic investment. We leverage VA loans and first-time buyer programs to unlock lasting wealth — with education, one-on-one guidance, and partnerships with real estate and financial experts. Because those who served deserve stability.
            </div>
          </div>

          <div className="v2v-masthead-meta">
            <div className="v2v-meta-item">
              <div className="v2v-meta-label">Client</div>
              <div className="v2v-meta-value">Valor to Victory</div>
            </div>
            <div className="v2v-meta-item">
              <div className="v2v-meta-label">Category</div>
              <div className="v2v-meta-value">Veteran Nonprofit</div>
            </div>
            <div className="v2v-meta-item">
              <div className="v2v-meta-label">Focus</div>
              <div className="v2v-meta-value">Homeownership + Financial Empowerment</div>
            </div>
            <div className="v2v-meta-item">
              <div className="v2v-meta-label">Date</div>
              <div className="v2v-meta-value">March 2026</div>
            </div>
          </div>
        </div>

        {/* OPTION 01: EAGLE + KEY CREST */}
        <div className="v2v-option-section">
          <div className="v2v-option-header">
            <div className="v2v-option-number">Option 01</div>
            <div className="v2v-option-name">Eagle &amp; Key Crest</div>
            <div className="v2v-recommended-badge">Recommended</div>
          </div>

          <div className="v2v-hero-logo v2v-hero-a">
            <img src="/images/v2v/nobg/c08-nobg.png" alt="Eagle and Key Crest" />
            <div className="v2v-hero-logo-label">Eagle &amp; Key Crest — Heritage Mark</div>
          </div>

          <div className="v2v-palette-section">
            <div className="v2v-section-label">Color Palette</div>
            <div className="v2v-palette-grid">
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#0D1B2E' }} />
                <div className="v2v-palette-name">Midnight Navy</div>
                <div className="v2v-palette-hex">#0D1B2E</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#C9A84C' }} />
                <div className="v2v-palette-name">Honor Gold</div>
                <div className="v2v-palette-hex">#C9A84C</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#8B6914' }} />
                <div className="v2v-palette-name">Deep Bronze</div>
                <div className="v2v-palette-hex">#8B6914</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#F5F0E8', borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="v2v-palette-name">Warm White</div>
                <div className="v2v-palette-hex">#F5F0E8</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#1E2D42' }} />
                <div className="v2v-palette-name">Charcoal Navy</div>
                <div className="v2v-palette-hex">#1E2D42</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#D4C9A8', borderColor: 'rgba(0,0,0,0.06)' }} />
                <div className="v2v-palette-name">Parchment</div>
                <div className="v2v-palette-hex">#D4C9A8</div>
              </div>
            </div>
          </div>

          <div className="v2v-font-section">
            <div className="v2v-section-label">Font Pairing</div>
            <div className="v2v-font-cards">
              <div className="v2v-font-card">
                <div className="v2v-font-role">Display / Headings</div>
                <div className="v2v-font-name-display">Libre Baskerville</div>
                <div className="v2v-font-sample-heading" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '26px', color: '#eeeae4', fontWeight: 700, lineHeight: 1.1 }}>
                  Valor to Victory
                </div>
                <div className="v2v-font-weights">
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 400 }}>Regular</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Libre Baskerville', serif", fontWeight: 700 }}>Bold</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Libre Baskerville', serif", fontStyle: 'italic', fontWeight: 400 }}>Italic</span>
                </div>
              </div>
              <div className="v2v-font-card">
                <div className="v2v-font-role">Body / Supporting Text</div>
                <div className="v2v-font-name-display">Lato</div>
                <div className="v2v-font-sample-heading" style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', color: '#eeeae4', fontWeight: 400, lineHeight: 1.6 }}>
                  Education, guidance, and the path to your first home.
                </div>
                <div className="v2v-font-weights">
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300 }}>Light</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400 }}>Regular</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700 }}>Bold</span>
                </div>
              </div>
            </div>
            <div className="v2v-font-sample-paragraph">
              <div className="v2v-sample-headline" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '20px', fontWeight: 700, color: '#eeeae4', letterSpacing: '-0.01em' }}>
                From Service to Stability
              </div>
              <div className="v2v-sample-body" style={{ fontFamily: "'Lato', sans-serif", fontSize: '15px', fontWeight: 300, color: 'rgba(238,234,228,0.68)', lineHeight: 1.75 }}>
                Valor to Victory guides veterans through every step of homeownership — from understanding VA loan eligibility to closing on a home that builds generational wealth. Our experts are by your side from the first call to the final signature.
              </div>
            </div>
          </div>

          <div className="v2v-size-section">
            <div className="v2v-section-label">Size Range</div>
            <div className="v2v-size-row">
              {[
                { w: 32, label: '32px', sub: 'favicon / app' },
                { w: 64, label: '64px', sub: 'email / mobile' },
                { w: 120, label: '120px', sub: 'letterhead / web' },
                { w: 200, label: '200px', sub: 'cover / print' },
              ].map(s => (
                <div key={s.w} className="v2v-size-item">
                  <img src="/images/v2v/nobg/c08-nobg.png" width={s.w} height={s.w} alt={s.label} />
                  <div className="v2v-size-label">{s.label}<br /><span style={{ fontSize: '9px', opacity: 0.5, fontWeight: 400 }}>{s.sub}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="v2v-bg-section">
            <div className="v2v-section-label">On Background</div>
            <div className="v2v-bg-mockups">
              <div className="v2v-bg-mockup v2v-bg-dark">
                <img src="/images/v2v/nobg/c08-nobg.png" alt="Logo on dark" />
                <div>
                  <div className="v2v-bg-mockup-label">Midnight</div>
                  <div className="v2v-bg-mockup-hex">#080c16</div>
                </div>
              </div>
              <div className="v2v-bg-mockup v2v-bg-navy">
                <img src="/images/v2v/nobg/c08-nobg.png" alt="Logo on navy" />
                <div>
                  <div className="v2v-bg-mockup-label">Navy</div>
                  <div className="v2v-bg-mockup-hex">#0D1B2E</div>
                </div>
              </div>
              <div className="v2v-bg-mockup v2v-bg-cream">
                <img src="/images/v2v/nobg/c08-nobg.png" alt="Logo on cream" />
                <div>
                  <div className="v2v-bg-mockup-label">Warm White</div>
                  <div className="v2v-bg-mockup-hex">#F5F0E8</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="v2v-section-divider" />

        {/* OPTION 02: MILITARY SHIELD MARK */}
        <div className="v2v-option-section">
          <div className="v2v-option-header">
            <div className="v2v-option-number">Option 02</div>
            <div className="v2v-option-name">Military Shield Mark</div>
          </div>

          <div className="v2v-hero-logo v2v-hero-b">
            <img src="/images/v2v/nobg/c01-nobg.png" alt="Shield Crest Mark" />
            <div className="v2v-hero-logo-label">Shield Crest — Icon Mark</div>
          </div>

          <div className="v2v-palette-section">
            <div className="v2v-section-label">Color Palette</div>
            <div className="v2v-palette-grid">
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#0B1A2D' }} />
                <div className="v2v-palette-name">Dress Blues</div>
                <div className="v2v-palette-hex">#0B1A2D</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#B89A3A' }} />
                <div className="v2v-palette-name">Command Gold</div>
                <div className="v2v-palette-hex">#B89A3A</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#1B4332' }} />
                <div className="v2v-palette-name">Growth Green</div>
                <div className="v2v-palette-hex">#1B4332</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#EDEAE3', borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="v2v-palette-name">Ivory</div>
                <div className="v2v-palette-hex">#EDEAE3</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#2D3E52' }} />
                <div className="v2v-palette-name">Steel Blue</div>
                <div className="v2v-palette-hex">#2D3E52</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#7A9E8E' }} />
                <div className="v2v-palette-name">Sage</div>
                <div className="v2v-palette-hex">#7A9E8E</div>
              </div>
            </div>
          </div>

          <div className="v2v-font-section">
            <div className="v2v-section-label">Font Pairing</div>
            <div className="v2v-font-cards">
              <div className="v2v-font-card">
                <div className="v2v-font-role">Display / Headings</div>
                <div className="v2v-font-name-display">Playfair Display</div>
                <div className="v2v-font-sample-heading" style={{ fontFamily: "'Playfair Display', serif", fontSize: '26px', color: '#eeeae4', fontWeight: 400, lineHeight: 1.2 }}>
                  Honor Meets Opportunity
                </div>
                <div className="v2v-font-weights">
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 400 }}>Regular</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600 }}>Semibold</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontWeight: 400 }}>Italic</span>
                </div>
              </div>
              <div className="v2v-font-card">
                <div className="v2v-font-role">Body / Supporting Text</div>
                <div className="v2v-font-name-display">Source Serif 4</div>
                <div className="v2v-font-sample-heading" style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px', color: '#eeeae4', fontWeight: 300, lineHeight: 1.65 }}>
                  Real estate and investment guidance built for veterans.
                </div>
                <div className="v2v-font-weights">
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 300 }}>Light</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Source Serif 4', serif", fontWeight: 400 }}>Regular</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Source Serif 4', serif", fontStyle: 'italic', fontWeight: 300 }}>Italic</span>
                </div>
              </div>
            </div>
            <div className="v2v-font-sample-paragraph">
              <div className="v2v-sample-headline" style={{ fontFamily: "'Playfair Display', serif", fontSize: '20px', fontWeight: 600, color: '#eeeae4', letterSpacing: '-0.01em' }}>
                Your Service Earned This
              </div>
              <div className="v2v-sample-body" style={{ fontFamily: "'Source Serif 4', serif", fontSize: '15px', fontWeight: 300, color: 'rgba(238,234,228,0.68)', lineHeight: 1.75 }}>
                VA loans are one of the most powerful financial tools available — and most veterans never use them. We change that. Valor to Victory walks you through every VA benefit, first-time buyer program, and investment strategy available so you can build the financial life you earned.
              </div>
            </div>
          </div>

          <div className="v2v-size-section">
            <div className="v2v-section-label">Size Range</div>
            <div className="v2v-size-row">
              {[
                { w: 32, label: '32px', sub: 'favicon / app' },
                { w: 64, label: '64px', sub: 'email / mobile' },
                { w: 120, label: '120px', sub: 'letterhead / web' },
                { w: 200, label: '200px', sub: 'cover / print' },
              ].map(s => (
                <div key={s.w} className="v2v-size-item">
                  <img src="/images/v2v/nobg/c01-nobg.png" width={s.w} height={s.w} alt={s.label} />
                  <div className="v2v-size-label">{s.label}<br /><span style={{ fontSize: '9px', opacity: 0.5, fontWeight: 400 }}>{s.sub}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="v2v-bg-section">
            <div className="v2v-section-label">On Background</div>
            <div className="v2v-bg-mockups">
              <div className="v2v-bg-mockup v2v-bg-dark">
                <img src="/images/v2v/nobg/c01-nobg.png" alt="Logo on dark" />
                <div>
                  <div className="v2v-bg-mockup-label">Midnight</div>
                  <div className="v2v-bg-mockup-hex">#080c16</div>
                </div>
              </div>
              <div className="v2v-bg-mockup v2v-bg-navy">
                <img src="/images/v2v/nobg/c01-nobg.png" alt="Logo on navy" />
                <div>
                  <div className="v2v-bg-mockup-label">Navy</div>
                  <div className="v2v-bg-mockup-hex">#0B1A2D</div>
                </div>
              </div>
              <div className="v2v-bg-mockup v2v-bg-cream">
                <img src="/images/v2v/nobg/c01-nobg.png" alt="Logo on cream" />
                <div>
                  <div className="v2v-bg-mockup-label">Warm White</div>
                  <div className="v2v-bg-mockup-hex">#F5F0E8</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <hr className="v2v-section-divider" />

        {/* OPTION 03: V + STAR MONOGRAM */}
        <div className="v2v-option-section">
          <div className="v2v-option-header">
            <div className="v2v-option-number">Option 03</div>
            <div className="v2v-option-name">V — Star Monogram</div>
          </div>

          <div className="v2v-hero-logo v2v-hero-c">
            <img src="/images/v2v/nobg/c09-nobg.png" alt="V Star Monogram" />
            <div className="v2v-hero-logo-label">V — Star Monogram — Digital First</div>
          </div>

          <div className="v2v-palette-section">
            <div className="v2v-section-label">Color Palette</div>
            <div className="v2v-palette-grid">
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#0E1C32' }} />
                <div className="v2v-palette-name">Deep Navy</div>
                <div className="v2v-palette-hex">#0E1C32</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#D4A830' }} />
                <div className="v2v-palette-name">Victory Gold</div>
                <div className="v2v-palette-hex">#D4A830</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#1C4535' }} />
                <div className="v2v-palette-name">Prosperity Green</div>
                <div className="v2v-palette-hex">#1C4535</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#F7F2EA', borderColor: 'rgba(0,0,0,0.08)' }} />
                <div className="v2v-palette-name">Cream</div>
                <div className="v2v-palette-hex">#F7F2EA</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#3A5068' }} />
                <div className="v2v-palette-name">Slate</div>
                <div className="v2v-palette-hex">#3A5068</div>
              </div>
              <div className="v2v-palette-item">
                <div className="v2v-palette-chip" style={{ background: '#A07830' }} />
                <div className="v2v-palette-name">Aged Bronze</div>
                <div className="v2v-palette-hex">#A07830</div>
              </div>
            </div>
          </div>

          <div className="v2v-font-section">
            <div className="v2v-section-label">Font Pairing</div>
            <div className="v2v-font-cards">
              <div className="v2v-font-card">
                <div className="v2v-font-role">Display / Headings</div>
                <div className="v2v-font-name-display">Cormorant Garamond</div>
                <div className="v2v-font-sample-heading" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', color: '#eeeae4', fontWeight: 500, lineHeight: 1.1, letterSpacing: '0.01em' }}>
                  Built to Last
                </div>
                <div className="v2v-font-weights">
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Light</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>Medium</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300 }}>Italic</span>
                </div>
              </div>
              <div className="v2v-font-card">
                <div className="v2v-font-role">Body / Supporting Text</div>
                <div className="v2v-font-name-display">Inter</div>
                <div className="v2v-font-sample-heading" style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#eeeae4', fontWeight: 400, lineHeight: 1.65 }}>
                  VA loans. First-time buyer programs. Wealth that lasts.
                </div>
                <div className="v2v-font-weights">
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>Light</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>Regular</span>
                  <span className="v2v-font-weight-sample" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Semibold</span>
                </div>
              </div>
            </div>
            <div className="v2v-font-sample-paragraph">
              <div className="v2v-sample-headline" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#eeeae4', letterSpacing: '0.01em' }}>
                Unlock What You Earned
              </div>
              <div className="v2v-sample-body" style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 400, color: 'rgba(238,234,228,0.68)', lineHeight: 1.75 }}>
                Valor to Victory connects veterans with expert real estate and financial advisors who understand military benefits inside and out. Whether you're buying your first home or building a portfolio, we put the right people in your corner — for free.
              </div>
            </div>
          </div>

          <div className="v2v-size-section">
            <div className="v2v-section-label">Size Range</div>
            <div className="v2v-size-row">
              {[
                { w: 32, label: '32px', sub: 'favicon / app' },
                { w: 64, label: '64px', sub: 'email / mobile' },
                { w: 120, label: '120px', sub: 'letterhead / web' },
                { w: 200, label: '200px', sub: 'cover / print' },
              ].map(s => (
                <div key={s.w} className="v2v-size-item">
                  <img src="/images/v2v/nobg/c09-nobg.png" width={s.w} height={s.w} alt={s.label} />
                  <div className="v2v-size-label">{s.label}<br /><span style={{ fontSize: '9px', opacity: 0.5, fontWeight: 400 }}>{s.sub}</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="v2v-bg-section">
            <div className="v2v-section-label">On Background</div>
            <div className="v2v-bg-mockups">
              <div className="v2v-bg-mockup v2v-bg-dark">
                <img src="/images/v2v/nobg/c09-nobg.png" alt="Logo on dark" />
                <div>
                  <div className="v2v-bg-mockup-label">Midnight</div>
                  <div className="v2v-bg-mockup-hex">#080c16</div>
                </div>
              </div>
              <div className="v2v-bg-mockup v2v-bg-navy">
                <img src="/images/v2v/nobg/c09-nobg.png" alt="Logo on navy" />
                <div>
                  <div className="v2v-bg-mockup-label">Navy</div>
                  <div className="v2v-bg-mockup-hex">#0E1C32</div>
                </div>
              </div>
              <div className="v2v-bg-mockup v2v-bg-cream">
                <img src="/images/v2v/nobg/c09-nobg.png" alt="Logo on cream" />
                <div>
                  <div className="v2v-bg-mockup-label">Cream</div>
                  <div className="v2v-bg-mockup-hex">#F7F2EA</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* REFERRAL CTA */}
        <div className="v2v-referral">
          <div className="v2v-referral-eyebrow">Know someone who needs this?</div>
          <div className="v2v-referral-title">
            Know someone that needs a killer brand creation experience?<br />Send them our way.
          </div>
          <div className="v2v-referral-sub">
            We build identities for organizations that deserve to be seen.
          </div>
          <ReferralForm />
          <div className="v2v-aom-wordmark">
            <div className="v2v-aom-letters">AOM</div>
            <div className="v2v-aom-divider" />
            <div className="v2v-aom-tagline">Art of Movement Studio</div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="v2v-footer-note">
          <div className="v2v-footer-brand">Valor to Victory — Brand Identity Round 1</div>
          <div className="v2v-footer-date">March 2026</div>
        </div>

      </div>
    </div>
  )
}
