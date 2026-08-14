import React, { useState } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@300;400;600&family=Libre+Baskerville:wght@400;700&display=swap');

  .v2v-page { box-sizing: border-box; }
  .v2v-page *, .v2v-page *::before, .v2v-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .v2v-root {
    --green-deep: #1B4332;
    --green-mid: #2D6A4F;
    --green-light: #40916C;
    --gold: #C9931A;
    --gold-bright: #F4B942;
    --gold-pale: #F8E4A0;
    --cream: #F5F0E8;
    --cream-dark: #EDE4D0;
    --warm-white: #FDFAF5;
    --brown-dark: #2C1810;
    --text-dark: #1A1208;
    --text-mid: #3D2B1A;
    --text-light: #7A6040;
    background: var(--warm-white);
    color: var(--text-dark);
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    min-height: 100vh;
  }

  /* HEADER */
  .v2v-header {
    background: var(--green-deep);
    padding: 56px 48px 48px;
    text-align: center;
  }
  .v2v-header-label {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: var(--gold-bright);
    margin-bottom: 16px;
  }
  .v2v-header h1 {
    font-family: 'Playfair Display', serif;
    font-size: 42px;
    font-weight: 900;
    color: var(--cream);
    line-height: 1.1;
    margin-bottom: 10px;
  }
  .v2v-header p {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 15px;
    color: rgba(245,240,232,.65);
    max-width: 520px;
    margin: 0 auto 24px;
  }
  .v2v-vs-badge {
    display: inline-block;
    background: rgba(201,147,26,.15);
    border: 1px solid rgba(201,147,26,.4);
    border-radius: 4px;
    padding: 8px 20px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--gold-bright);
  }

  /* PALETTE STRIP */
  .v2v-palette-section {
    background: var(--cream-dark);
    padding: 36px 48px;
    display: flex;
    align-items: center;
    gap: 32px;
    flex-wrap: wrap;
  }
  .v2v-palette-section h3 {
    font-family: 'Libre Baskerville', serif;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .12em;
    color: var(--text-light);
    min-width: 100px;
  }
  .v2v-swatches {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  .v2v-swatch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .v2v-swatch-color {
    width: 56px;
    height: 56px;
    border-radius: 6px;
    border: 1px solid rgba(0,0,0,.08);
  }
  .v2v-swatch-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .06em;
    color: var(--text-light);
    text-align: center;
  }
  .v2v-vs-note {
    margin-left: auto;
    font-size: 12px;
    color: var(--text-light);
    background: rgba(27,67,50,.08);
    border-left: 3px solid var(--green-mid);
    padding: 10px 16px;
    border-radius: 0 4px 4px 0;
    max-width: 280px;
    line-height: 1.5;
  }
  .v2v-vs-note strong { color: var(--green-deep); }

  /* LOGO SECTIONS */
  .v2v-section {
    padding: 64px 48px;
    border-top: 1px solid var(--cream-dark);
  }
  .v2v-section:nth-child(even) { background: var(--cream); }
  .v2v-section-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 40px;
  }
  .v2v-section-num {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--green-deep);
    color: var(--gold-bright);
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .v2v-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-dark);
  }
  .v2v-recommended-tag {
    background: var(--gold);
    color: var(--brown-dark);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 3px;
    margin-left: 10px;
    font-family: 'Source Sans 3', sans-serif;
  }
  .v2v-section-sub {
    font-size: 13px;
    color: var(--text-light);
    margin-top: 2px;
  }

  .v2v-logo-row {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 48px;
    align-items: start;
  }
  .v2v-logo-display {
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    border-radius: 8px;
    padding: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 280px;
  }
  .v2v-logo-display img {
    max-width: 220px;
    max-height: 220px;
    object-fit: contain;
  }
  .v2v-logo-info {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  .v2v-info-block h4 {
    font-family: 'Libre Baskerville', serif;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--text-light);
    margin-bottom: 8px;
  }
  .v2v-palette-mini { display: flex; gap: 8px; }
  .v2v-mini-swatch {
    width: 36px;
    height: 36px;
    border-radius: 4px;
    border: 1px solid rgba(0,0,0,.1);
  }
  .v2v-mini-swatch-label {
    font-size: 9px;
    color: var(--text-light);
    text-align: center;
    margin-top: 3px;
  }
  .v2v-font-sample {
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    border-radius: 6px;
    padding: 16px 20px;
  }
  .v2v-font-name {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--text-light);
    margin-bottom: 6px;
  }
  .v2v-font-headline {
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    font-weight: 900;
    color: var(--text-dark);
    line-height: 1.1;
  }
  .v2v-font-body {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-mid);
    margin-top: 6px;
    line-height: 1.5;
  }
  .v2v-font-alt {
    font-family: 'Libre Baskerville', serif;
    font-size: 13px;
    color: var(--text-light);
    margin-top: 4px;
    letter-spacing: .04em;
  }
  .v2v-symbolism {
    font-size: 13px;
    color: var(--text-mid);
    line-height: 1.6;
    list-style: none;
    padding: 0;
  }
  .v2v-symbolism li { margin-bottom: 4px; }
 .v2v-symbolism li::before { content: "·"; color: var(--gold); }

  .v2v-mock-row {
    display: flex;
    gap: 12px;
    margin-top: 20px;
    flex-wrap: wrap;
  }
  .v2v-mock-dark {
    background: var(--green-deep);
    border-radius: 6px;
    padding: 20px 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .v2v-mock-dark img { max-width: 120px; max-height: 80px; object-fit: contain; }
  .v2v-mock-cream {
    background: var(--cream);
    border: 1px solid var(--cream-dark);
    border-radius: 6px;
    padding: 20px 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .v2v-mock-cream img { max-width: 120px; max-height: 80px; object-fit: contain; }
  .v2v-mock-gold {
    background: var(--gold);
    border-radius: 6px;
    padding: 20px 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .v2v-mock-gold img { max-width: 120px; max-height: 80px; object-fit: contain; }
  .v2v-mock-label {
    font-size: 10px;
    color: var(--text-light);
    margin-top: 6px;
    text-align: center;
    font-weight: 600;
    letter-spacing: .06em;
  }

  /* COMPARISON TABLE */
  .v2v-compare-section {
    padding: 48px;
    background: var(--green-deep);
  }
  .v2v-compare-section h3 {
    font-family: 'Playfair Display', serif;
    font-size: 24px;
    color: var(--cream);
    margin-bottom: 8px;
  }
  .v2v-compare-sub {
    font-size: 13px;
    color: rgba(245,240,232,.55);
    margin-bottom: 32px;
  }
  .v2v-compare-table {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    border-radius: 8px;
    overflow: hidden;
  }
  .v2v-col-header {
    padding: 14px 20px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    text-align: center;
  }
  .v2v-s3c-col { background: rgba(30,42,80,.8); color: rgba(200,160,80,.8); }
  .v2v-v2v-col { background: rgba(45,106,79,.8); color: var(--gold-bright); }
  .v2v-compare-cell {
    padding: 14px 20px;
    font-size: 13px;
    line-height: 1.5;
  }
  .v2v-compare-cell.s3c { background: rgba(10,14,36,.5); color: rgba(200,190,170,.6); }
  .v2v-compare-cell.v2v-r { background: rgba(27,67,50,.5); color: var(--cream); }
  .v2v-compare-cell strong {
    display: block;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    margin-bottom: 3px;
    opacity: .6;
  }

  /* ALL CONCEPTS GRID */
  .v2v-concepts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .v2v-concept-card {
    background: var(--cream);
    border: 1px solid var(--cream-dark);
    border-radius: 8px;
    padding: 24px;
    text-align: center;
  }
  .v2v-concept-card img {
    max-width: 160px;
    max-height: 140px;
    object-fit: contain;
  }
  .v2v-concept-label {
    font-size: 11px;
    color: var(--text-light);
    margin-top: 8px;
    font-weight: 600;
  }

  /* REFERRAL CTA */
  .v2v-cta-section {
    background: var(--cream-dark);
    padding: 56px 48px;
    text-align: center;
  }
  .v2v-referral-eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--text-light);
    margin-bottom: 12px;
    font-family: 'Source Sans 3', sans-serif;
  }
  .v2v-referral-title {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    font-weight: 900;
    color: var(--text-dark);
    margin-bottom: 10px;
  }
  .v2v-referral-sub {
    font-size: 14px;
    color: var(--text-mid);
    max-width: 460px;
    margin: 0 auto 28px;
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
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    border-radius: 4px;
    padding: 11px 16px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-dark);
    outline: none;
    transition: border-color 0.15s;
  }
  .v2v-referral-input::placeholder { color: var(--text-light); }
  .v2v-referral-input:focus { border-color: var(--green-mid); }
  .v2v-referral-btn {
    padding: 11px 24px;
    background: var(--green-deep);
    color: var(--gold-bright);
    border: none;
    border-radius: 4px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: .08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background 0.15s;
    white-space: nowrap;
  }
  .v2v-referral-btn:hover:not(:disabled) { background: var(--green-mid); }
  .v2v-referral-btn:disabled { opacity: 0.55; cursor: default; }
  .v2v-referral-error {
    font-size: 12px;
    color: #c0392b;
    margin-top: 8px;
    text-align: center;
  }
  .v2v-referral-thanks {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: var(--text-dark);
    margin-bottom: 8px;
  }
  .v2v-referral-thanks-sub {
    font-size: 14px;
    color: var(--text-mid);
  }
  .v2v-cta-footer {
    font-size: 11px;
    color: var(--text-light);
    margin-top: 16px;
  }
  .v2v-cta-footer a { color: var(--green-mid); text-decoration: none; }

  @media (max-width: 780px) {
    .v2v-logo-row { grid-template-columns: 1fr; }
    .v2v-compare-table { grid-template-columns: 1fr; }
    .v2v-s3c-col, .v2v-v2v-col { display: none; }
    .v2v-header, .v2v-section, .v2v-cta-section, .v2v-compare-section, .v2v-palette-section { padding: 40px 24px; }
    .v2v-concepts-grid { grid-template-columns: repeat(2, 1fr); }
  }
`

function ReferralForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
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

      {/* HEADER */}
      <div className="v2v-header">
 <div className="v2v-header-label">Brand Identity, Round 2</div>
        <h1>Valor to Victory</h1>
 <p>Veteran homeownership. A new direction, patriotic warmth, not corporate institution.</p>
 <span className="v2v-vs-badge">Green + Gold Edition, Not Navy + Copper</span>
      </div>

      {/* PALETTE STRIP */}
      <div className="v2v-palette-section">
        <h3>Color System</h3>
        <div className="v2v-swatches">
          {[
            { hex: '#1B4332', name: 'Forest Green', code: '#1B4332' },
            { hex: '#2D6A4F', name: 'Deep Green', code: '#2D6A4F' },
            { hex: '#C9931A', name: 'Honor Gold', code: '#C9931A' },
            { hex: '#F4B942', name: 'Bright Amber', code: '#F4B942' },
            { hex: '#F5F0E8', name: 'Warm Cream', code: '#F5F0E8' },
            { hex: '#FDFAF5', name: 'Warm White', code: '#FDFAF5' },
          ].map(s => (
            <div className="v2v-swatch" key={s.hex}>
              <div className="v2v-swatch-color" style={{ background: s.hex }} />
              <div className="v2v-swatch-label">{s.name}<br />{s.code}</div>
            </div>
          ))}
        </div>
        <div className="v2v-vs-note">
 <strong>Not navy + copper.</strong> That's S3C territory, a trade coalition. V2V is a veteran's journey home. Green = growth + land + hope. Gold = honor + valor.
        </div>
      </div>

      {/* OPTION 1: Eagle + Key Shield */}
      <div className="v2v-section">
        <div className="v2v-section-meta">
          <div className="v2v-section-num">1</div>
          <div>
            <div className="v2v-section-title">
              Eagle + Key Shield <span className="v2v-recommended-tag">Recommended</span>
            </div>
 <div className="v2v-section-sub">Eagle over ornate key, inside a pointed shield, most versatile mark</div>
          </div>
        </div>
        <div className="v2v-logo-row">
          <div>
            <div className="v2v-logo-display">
              <img src="/images/v2v/nobg/c01.png" alt="Eagle Key Shield" />
            </div>
            <div className="v2v-mock-row">
              <div>
                <div className="v2v-mock-dark"><img src="/images/v2v/nobg/c01.png" alt="" /></div>
                <div className="v2v-mock-label">On Green</div>
              </div>
              <div>
                <div className="v2v-mock-cream"><img src="/images/v2v/nobg/c01.png" alt="" /></div>
                <div className="v2v-mock-label">On Cream</div>
              </div>
              <div>
                <div className="v2v-mock-gold"><img src="/images/v2v/nobg/c01.png" alt="" /></div>
                <div className="v2v-mock-label">On Gold</div>
              </div>
            </div>
          </div>
          <div className="v2v-logo-info">
            <div className="v2v-info-block">
              <h4>Palette</h4>
              <div className="v2v-palette-mini">
                {[{ hex: '#1B4332', label: 'Forest' }, { hex: '#C9931A', label: 'Gold' }, { hex: '#F5F0E8', label: 'Cream' }].map(s => (
                  <div key={s.hex}>
                    <div className="v2v-mini-swatch" style={{ background: s.hex }} />
                    <div className="v2v-mini-swatch-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="v2v-info-block">
              <h4>Typography</h4>
              <div className="v2v-font-sample">
                <div className="v2v-font-name">Playfair Display 900 + Source Sans 3 Regular</div>
                <div className="v2v-font-headline">Valor to Victory</div>
                <div className="v2v-font-body">Helping veterans achieve the homeownership they've earned.</div>
                <div className="v2v-font-alt">VETERAN HOMEOWNERSHIP MISSION</div>
              </div>
            </div>
            <div className="v2v-info-block">
              <h4>Symbolism</h4>
              <ul className="v2v-symbolism">
 <li>Eagle atop the mark, freedom, vigilance, American pride</li>
 <li>Ornate key, unlocking homeownership, earned access</li>
 <li>Shield form, protection through service honored</li>
 <li>Green foundation, prosperity, growth, land ownership</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* OPTION 2: The Threshold */}
      <div className="v2v-section">
        <div className="v2v-section-meta">
          <div className="v2v-section-num">2</div>
          <div>
            <div className="v2v-section-title">The Threshold</div>
 <div className="v2v-section-sub">Open door + eagle + sunlight, the veteran's journey home made visual</div>
          </div>
        </div>
        <div className="v2v-logo-row">
          <div>
            <div className="v2v-logo-display">
              <img src="/images/v2v/nobg/c05.png" alt="Door Threshold" />
            </div>
            <div className="v2v-mock-row">
              <div>
                <div className="v2v-mock-dark"><img src="/images/v2v/nobg/c05.png" alt="" /></div>
                <div className="v2v-mock-label">On Green</div>
              </div>
              <div>
                <div className="v2v-mock-cream"><img src="/images/v2v/nobg/c05.png" alt="" /></div>
                <div className="v2v-mock-label">On Cream</div>
              </div>
              <div>
                <div className="v2v-mock-gold"><img src="/images/v2v/nobg/c05.png" alt="" /></div>
                <div className="v2v-mock-label">On Gold</div>
              </div>
            </div>
          </div>
          <div className="v2v-logo-info">
            <div className="v2v-info-block">
              <h4>Palette</h4>
              <div className="v2v-palette-mini">
                {[{ hex: '#2D6A4F', label: 'Deep' }, { hex: '#F4B942', label: 'Amber' }, { hex: '#F5F0E8', label: 'Light' }].map(s => (
                  <div key={s.hex}>
                    <div className="v2v-mini-swatch" style={{ background: s.hex }} />
                    <div className="v2v-mini-swatch-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="v2v-info-block">
              <h4>Typography</h4>
              <div className="v2v-font-sample">
                <div className="v2v-font-name">Libre Baskerville 700 + Source Sans 3 300</div>
                <div className="v2v-font-headline" style={{ fontFamily: "'Libre Baskerville', serif", fontSize: '24px' }}>Valor to Victory</div>
                <div className="v2v-font-body" style={{ fontWeight: 300 }}>From service to a place called home.</div>
                <div className="v2v-font-alt">VA LOANS · EDUCATION · GUIDANCE</div>
              </div>
            </div>
            <div className="v2v-info-block">
              <h4>Symbolism</h4>
              <ul className="v2v-symbolism">
 <li>Open door, the moment of arrival, new chapter beginning</li>
 <li>Sunlight rays through door, hope, warmth after service</li>
 <li>Eagle flying through, freedom meets homecoming</li>
 <li>Trees at base, roots, stability, finally home</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* OPTION 3: V2V Eagle Shield */}
      <div className="v2v-section">
        <div className="v2v-section-meta">
          <div className="v2v-section-num">3</div>
          <div>
            <div className="v2v-section-title">V2V Eagle Shield</div>
 <div className="v2v-section-sub">Shield with eagle portrait + V2V monogram, cleanest digital mark</div>
          </div>
        </div>
        <div className="v2v-logo-row">
          <div>
            <div className="v2v-logo-display">
              <img src="/images/v2v/nobg/c07.png" alt="V2V Shield Eagle" />
            </div>
            <div className="v2v-mock-row">
              <div>
                <div className="v2v-mock-dark"><img src="/images/v2v/nobg/c07.png" alt="" /></div>
                <div className="v2v-mock-label">On Green</div>
              </div>
              <div>
                <div className="v2v-mock-cream"><img src="/images/v2v/nobg/c07.png" alt="" /></div>
                <div className="v2v-mock-label">On Cream</div>
              </div>
              <div>
                <div className="v2v-mock-gold"><img src="/images/v2v/nobg/c07.png" alt="" /></div>
                <div className="v2v-mock-label">On Gold</div>
              </div>
            </div>
          </div>
          <div className="v2v-logo-info">
            <div className="v2v-info-block">
              <h4>Palette</h4>
              <div className="v2v-palette-mini">
                {[{ hex: '#1B4332', label: 'Forest' }, { hex: '#C9931A', label: 'Gold' }, { hex: '#FDFAF5', label: 'White' }].map(s => (
                  <div key={s.hex}>
                    <div className="v2v-mini-swatch" style={{ background: s.hex }} />
                    <div className="v2v-mini-swatch-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="v2v-info-block">
              <h4>Typography</h4>
              <div className="v2v-font-sample">
                <div className="v2v-font-name">Playfair Display 700 + Source Sans 3 600</div>
                <div className="v2v-font-headline">Valor to Victory</div>
                <div className="v2v-font-body" style={{ fontWeight: 600, fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', marginTop: '4px' }}>Veteran Homeownership</div>
              </div>
            </div>
            <div className="v2v-info-block">
              <h4>Symbolism</h4>
              <ul className="v2v-symbolism">
 <li>Shield silhouette, protection, military honor, defense</li>
 <li>Eagle portrait, strength, American pride, authority</li>
 <li>V2V monogram, memorable shorthand, badge-ready</li>
 <li>Key at base of shield, access, earned right to a home</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARISON: V2V vs S3C */}
      <div className="v2v-compare-section">
        <h3>Why This Is Not S3C</h3>
        <p className="v2v-compare-sub">Both are client brands. They need to feel completely different. Here's the separation.</p>
        <div className="v2v-compare-table">
 <div className="v2v-col-header v2v-s3c-col">S3C, Trade Coalition</div>
 <div className="v2v-col-header v2v-v2v-col">V2V, Veteran Nonprofit</div>

          <div className="v2v-compare-cell s3c"><strong>Palette</strong>Navy blue + copper. Institutional, transactional.</div>
          <div className="v2v-compare-cell v2v-r"><strong>Palette</strong>Forest green + honor gold. Growth, prosperity, warmth.</div>

          <div className="v2v-compare-cell s3c"><strong>Vibe</strong>Corporate authority. A seat at the table. Trade power.</div>
          <div className="v2v-compare-cell v2v-r"><strong>Vibe</strong>Patriotic warmth. A veteran's journey home. Human.</div>

          <div className="v2v-compare-cell s3c"><strong>Typography</strong>Condensed sans-serif. Sharp, precise, technical.</div>
          <div className="v2v-compare-cell v2v-r"><strong>Typography</strong>Warm serif (Playfair/Baskerville). Dignified, personal.</div>

          <div className="v2v-compare-cell s3c"><strong>Symbol</strong>Diamond geometry. Industrial. Semiconductor wafer.</div>
          <div className="v2v-compare-cell v2v-r"><strong>Symbol</strong>Eagle + key + shield + door. Freedom, access, home.</div>

          <div className="v2v-compare-cell s3c"><strong>Audience</strong>C-suite. Policy. Trade negotiators. Arizona legislators.</div>
          <div className="v2v-compare-cell v2v-r"><strong>Audience</strong>Veterans and families. VA loan seekers. People.</div>
        </div>
      </div>

      {/* ALL CONCEPTS GRID */}
      <div className="v2v-section" style={{ paddingBottom: '48px' }}>
        <div className="v2v-section-meta">
          <div className="v2v-section-num">+</div>
          <div>
            <div className="v2v-section-title">All Round 2 Concepts</div>
 <div className="v2v-section-sub">9 concepts generated, green + gold, distinctly not navy + copper</div>
          </div>
        </div>
        <div className="v2v-concepts-grid">
          {[
 { file: 'c01', label: 'C01, Eagle Key Shield' },
 { file: 'c02', label: 'C02, Shield + House Keys' },
 { file: 'c03', label: 'C03, Eagle Wing V' },
 { file: 'c04', label: 'C04, Eagle Carries Key' },
 { file: 'c05', label: 'C05, The Threshold' },
 { file: 'c06', label: 'C06, Circular Badge' },
 { file: 'c07', label: 'C07, V2V Eagle Shield' },
 { file: 'c08', label: 'C08, Eagle + House Wings' },
 { file: 'c09', label: 'C09, V Wings + Shield Star' },
          ].map(c => (
            <div className="v2v-concept-card" key={c.file}>
              <img src={`/images/v2v/${c.file}.png`} alt={c.label} />
              <div className="v2v-concept-label">{c.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* REFERRAL CTA */}
      <div className="v2v-cta-section">
        <div className="v2v-referral-eyebrow">Powered by AOM Studio</div>
        <div className="v2v-referral-title">Your brand deserves this.</div>
        <p className="v2v-referral-sub">
          AOM builds brand identities that look like they cost 10x more. Know a veteran-owned organization or nonprofit that needs a brand like this?
        </p>
        <ReferralForm />
        <div className="v2v-cta-footer">
          aheadofmarket.com &mdash; <a href="mailto:patrik@aheadofmarket.com">patrik@aheadofmarket.com</a>
        </div>
      </div>
    </div>
  )
}