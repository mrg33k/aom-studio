import React, { useState, useEffect } from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

  .sr-page { box-sizing: border-box; }
  .sr-page *, .sr-page *::before, .sr-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sr-root {
    --black: #080808;
    --surface: #121212;
    --surface2: #1A1A1A;
    --orange: #E5451F;
    --white: #FFFFFF;
    --gray: #999;
    --gray-l: #CCCCCC;
    background: var(--black);
    color: var(--white);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
  }

  .sr-wrap { max-width: 900px; margin: 0 auto; padding: 0 32px; }
  .sr-section { padding: 64px 0; border-bottom: 1px solid #1E1E1E; }
  .sr-section:last-child { border-bottom: none; }
  .sr-label {
    font-size: 11px; font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 12px;
  }
  .sr-h2 {
    font-family: 'Oswald', sans-serif; font-size: 36px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em; margin-bottom: 36px;
  }
  .sr-p { color: var(--gray-l); margin-bottom: 16px; }
  .sr-small { color: var(--gray); font-size: 12px; }

  /* HERO */
  .sr-hero {
    position: relative; min-height: 520px; display: flex;
    align-items: flex-end; overflow: hidden;
    border-bottom: 1px solid #1E1E1E;
  }
  .sr-hero img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: center 20%;
  }
  .sr-hero-ov {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(8,8,8,.92) 0%, rgba(8,8,8,.45) 55%, rgba(8,8,8,.15) 100%);
  }
  .sr-hero-inner { position: relative; z-index: 2; padding: 56px; }
  .sr-hero-eye {
    font-size: 11px; font-weight: 600; letter-spacing: .22em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 14px;
  }
  .sr-hero-title {
    font-family: 'Oswald', sans-serif; font-size: 72px; font-weight: 700;
    text-transform: uppercase; line-height: .95; letter-spacing: .02em;
  }
  .sr-hero-tag { font-size: 17px; color: var(--gray-l); margin-top: 18px; max-width: 440px; line-height: 1.5; }

  /* PALETTE */
  .sr-pal { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
  .sr-sw-block { height: 76px; border-radius: 6px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,.06); }
  .sr-sw-name { display: block; font-size: 11px; font-weight: 600; margin-bottom: 2px; }
  .sr-sw-hex { font-size: 11px; color: var(--gray); }

  /* TYPE */
  .sr-trow { border-bottom: 1px solid #1E1E1E; padding-bottom: 24px; margin-bottom: 24px; }
  .sr-trow:last-child { border-bottom: none; margin-bottom: 0; }
  .sr-tmeta { font-size: 11px; color: var(--gray); margin-bottom: 8px; letter-spacing: .04em; }

  /* BG RULES */
  .sr-bgcard { border-radius: 8px; overflow: hidden; border: 1px solid #1E1E1E; max-width: 440px; }
  .sr-bgprev { position: relative; height: 150px; }
  .sr-bgprev img { width: 100%; height: 100%; object-fit: cover; }
  .sr-bgov { position: absolute; inset: 0; background: rgba(8,8,8,.72); }
  .sr-bglabel {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-family: 'Oswald', sans-serif; font-size: 18px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
  }
  .sr-bgcap { padding: 14px 16px; background: var(--surface); }
  .sr-bgcap strong { font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px; }
  .sr-bgcap span { font-size: 12px; color: var(--gray); }

  /* COMPONENTS */
  .sr-crow { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  .sr-clabel { font-size: 12px; color: var(--gray); min-width: 100px; }
  .sr-btn {
    font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase;
    border-radius: 4px; cursor: pointer; padding: 12px 26px;
  }
  .sr-btn-p { background: var(--orange); color: #fff; border: none; }
  .sr-btn-s { background: transparent; color: #fff; border: 2px solid #fff; padding: 10px 26px; }
  .sr-btn-g { background: transparent; color: var(--orange); border: 2px solid var(--orange); padding: 10px 26px; }
  .sr-tag {
    display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: .08em;
    background: rgba(229,69,31,.15); color: var(--orange);
    border: 1px solid rgba(229,69,31,.3); border-radius: 3px; padding: 3px 8px;
  }
  .sr-cards { display: flex; gap: 14px; margin-top: 16px; flex-wrap: wrap; }
  .sr-cspec {
    background: var(--surface); border: 1px solid #222; border-radius: 8px;
    padding: 20px 22px; flex: 1; min-width: 200px;
  }
  .sr-cspec-eye {
    font-size: 10px; font-weight: 600; letter-spacing: .15em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 6px;
  }
  .sr-cspec h4 {
    font-family: 'Oswald', sans-serif; font-size: 18px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em; margin-bottom: 6px;
  }
  .sr-cspec p { font-size: 13px; margin: 0; color: var(--gray); }

  /* IMAGE GRID */
  .sr-imgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .sr-icard { border-radius: 8px; overflow: hidden; border: 1px solid #1E1E1E; }
  .sr-icard img { width: 100%; height: 190px; object-fit: cover; display: block; }
  .sr-ibody { padding: 12px 16px; background: var(--surface); }
  .sr-ibody strong { display: block; font-size: 13px; font-weight: 600; margin-bottom: 3px; }
  .sr-ibody p { font-size: 12px; color: var(--gray); margin: 0; }

  /* CTA */
  .sr-cta { background: var(--surface2); padding: 64px 0; }
  .sr-cta-inner {
    max-width: 900px; margin: 0 auto; padding: 0 32px;
    display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center;
  }
  .sr-cta-by {
    font-size: 10px; font-weight: 700; letter-spacing: .22em;
    text-transform: uppercase; color: var(--gray);
  }
  .sr-cta-brand {
    font-family: 'Oswald', sans-serif; font-size: 26px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase;
  }
  .sr-cta-sub { color: var(--gray); font-size: 15px; max-width: 400px; line-height: 1.5; margin: 0; }
  .sr-cta-form { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 440px; }
  .sr-cta-input {
    flex: 1; min-width: 200px; background: #1a1a1a; border: 1px solid #333;
    border-radius: 4px; padding: 12px 16px; color: #fff; font-family: 'Inter', sans-serif;
    font-size: 14px; outline: none;
  }
  .sr-cta-input::placeholder { color: var(--gray); }
  .sr-cta-input:focus { border-color: rgba(229,69,31,.5); }
  .sr-cta-submit {
    font-family: 'Oswald', sans-serif; font-size: 14px; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase; background: var(--orange);
    color: #fff; border: none; border-radius: 4px; padding: 12px 24px; cursor: pointer;
    white-space: nowrap;
  }
  .sr-cta-submit:hover:not(:disabled) { opacity: 0.88; }
  .sr-cta-submit:disabled { opacity: 0.55; cursor: default; }
  .sr-cta-error { font-size: 13px; color: #ff6b6b; }
  .sr-cta-thanks { font-family: 'Oswald', sans-serif; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .sr-cta-thanks-sub { font-size: 14px; color: var(--gray); }
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
        body: JSON.stringify({ email: email.trim(), source: 'space-rising-brand-page' }),
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
      <div style={{ textAlign: 'center' }}>
        <div className="sr-cta-thanks">You're in.</div>
        <div className="sr-cta-thanks-sub">We'll be in touch.</div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div className="sr-cta-form">
        <input
          className="sr-cta-input"
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          disabled={status === 'loading'}
        />
        <button
          className="sr-cta-submit"
          type="submit"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending...' : 'Get in Touch'}
        </button>
      </div>
      {errMsg && <div className="sr-cta-error">{errMsg}</div>}
    </form>
  )
}

export default function SpaceRisingBrand() {
  useEffect(() => {
    document.title = 'Space Rising Brand Guidelines'
  }, [])

  return (
    <div className="sr-root sr-page">
      <style>{CSS}</style>

      {/* HERO */}
      <div className="sr-hero">
        <img src="/images/space-rising/hero-astronaut-arizona.jpg" alt="Space Rising Hero" />
        <div className="sr-hero-ov" />
        <div className="sr-hero-inner">
          <div className="sr-hero-eye">Brand Guidelines 2026</div>
          <h1 className="sr-hero-title">Space<br />Rising</h1>
          <p className="sr-hero-tag">Arizona's space economy is launching. This is its visual identity.</p>
        </div>
      </div>

      {/* LOGO */}
      <div className="sr-section">
        <div className="sr-wrap">
          <div className="sr-label">01 — Logo</div>
          <div className="sr-h2">Brand Marks</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid #222', borderRadius: 8, padding: '28px 32px', flex: 1, minWidth: 220, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Space <span style={{ color: 'var(--orange)' }}>&#9679;</span> Rising
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: '.16em', color: 'var(--gray-l)', marginTop: 4, textTransform: 'uppercase' }}>
                Arizona Space Congress
              </div>
              <p style={{ fontSize: 12, color: 'var(--gray)', margin: '12px 0 0' }}>
                Primary lockup. Condensed caps + orbit mark. Dark backgrounds only.
              </p>
            </div>
            <div style={{ background: '#1a0a06', border: '1px solid #2a1205', borderRadius: 8, padding: '28px 32px', flex: 1, minWidth: 220, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--orange)' }}>
                Space Rising
              </div>
              <p style={{ fontSize: 12, color: 'var(--gray)', margin: '12px 0 0' }}>
                Orange variant. Near-black surfaces only. Min 4.5:1 contrast ratio.
              </p>
            </div>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: 'var(--gray-l)' }}>
            Never stretch, rotate, or recolor the orbit mark. Always maintain minimum clear space equal to the cap-height of "S" on all sides.
          </p>
        </div>
      </div>

      {/* PALETTE */}
      <div className="sr-section">
        <div className="sr-wrap">
          <div className="sr-label">02 — Color</div>
          <div className="sr-h2">Palette</div>
          <div className="sr-pal">
            <div>
              <div className="sr-sw-block" style={{ background: '#E5451F' }} />
              <span className="sr-sw-name">Launch Orange</span>
              <span className="sr-sw-hex">#E5451F</span>
            </div>
            <div>
              <div className="sr-sw-block" style={{ background: '#080808', border: '1px solid #2a2a2a' }} />
              <span className="sr-sw-name">Void Black</span>
              <span className="sr-sw-hex">#080808</span>
            </div>
            <div>
              <div className="sr-sw-block" style={{ background: '#141414' }} />
              <span className="sr-sw-name">Deep Space</span>
              <span className="sr-sw-hex">#141414</span>
            </div>
            <div>
              <div className="sr-sw-block" style={{ background: '#0D0D1F' }} />
              <span className="sr-sw-name">Cosmos Navy</span>
              <span className="sr-sw-hex">#0D0D1F</span>
            </div>
            <div>
              <div className="sr-sw-block" style={{ background: '#FFFFFF' }} />
              <span className="sr-sw-name">Star White</span>
              <span className="sr-sw-hex">#FFFFFF</span>
            </div>
            <div>
              <div className="sr-sw-block" style={{ background: '#999999' }} />
              <span className="sr-sw-name">Moonrock</span>
              <span className="sr-sw-hex">#999999</span>
            </div>
          </div>
          <p style={{ marginTop: 22, fontSize: 13, color: 'var(--gray-l)' }}>
            Launch Orange is the only warm color. One dominant orange element per layout. Never on warm backgrounds. All other surfaces stay in the dark spectrum.
          </p>
        </div>
      </div>

      {/* TYPOGRAPHY */}
      <div className="sr-section">
        <div className="sr-wrap">
          <div className="sr-label">03 — Typography</div>
          <div className="sr-h2">Type System</div>
          <div className="sr-trow">
            <div className="sr-tmeta">Oswald 700 / 72px — Display headlines, event names</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 64, fontWeight: 700, textTransform: 'uppercase', lineHeight: .95, letterSpacing: '.02em' }}>
              Arizona<br />Space Congress
            </div>
          </div>
          <div className="sr-trow">
            <div className="sr-tmeta">Oswald 700 / 36px — Section headers, program names</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 36, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Launch Window Open
            </div>
          </div>
          <div className="sr-trow">
            <div className="sr-tmeta">Inter 400 / 15px — Body copy, bios, descriptions</div>
            <div style={{ color: 'var(--gray-l)', maxWidth: 520 }}>
              Space Rising is Arizona's platform for aerospace innovation — connecting founders, engineers, and policymakers to accelerate the state's role in the new space economy.
            </div>
          </div>
          <div className="sr-trow">
            <div className="sr-tmeta">Inter 600 uppercase / 11px — Labels, eyebrows, captions</div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--orange)' }}>
              Keynote Speaker — March 2026
            </div>
          </div>
        </div>
      </div>

      {/* BACKGROUND RULES */}
      <div className="sr-section">
        <div className="sr-wrap">
          <div className="sr-label">04 — Background Rules</div>
          <div className="sr-h2">Imagery + Overlays</div>
          <p className="sr-p">All imagery must be treated with a dark overlay before text placement. Minimum contrast: 4.5:1 for body copy, 3:1 for large display text.</p>
          <div className="sr-bgcard">
            <div className="sr-bgprev">
              <img src="/images/space-rising/hero-desert-cosmos.jpg" alt="Overlay example" />
              <div className="sr-bgov" />
              <div className="sr-bglabel">Correct — 72% overlay</div>
            </div>
            <div className="sr-bgcap">
              <strong style={{ color: '#4ade80' }}>Correct</strong>
              <span>rgba(0,0,0,0.72) overlay. Text fully readable. Orange CTAs visible at all sizes.</span>
            </div>
          </div>
          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--gray-l)' }}>
            Overlay minimum: 0.65 opacity. Gradient overlays (dark-to-transparent) acceptable for edge placements. Never place text directly on warm or mid-tone imagery.
          </p>
        </div>
      </div>

      {/* COMPONENTS */}
      <div className="sr-section">
        <div className="sr-wrap">
          <div className="sr-label">05 — Components</div>
          <div className="sr-h2">UI Specs</div>
          <div className="sr-crow">
            <span className="sr-clabel">Primary CTA</span>
            <button className="sr-btn sr-btn-p">Register Now</button>
            <small className="sr-small">Oswald 600 / #E5451F / 4px radius</small>
          </div>
          <div className="sr-crow">
            <span className="sr-clabel">Secondary</span>
            <button className="sr-btn sr-btn-s">Learn More</button>
            <small className="sr-small">2px white border / transparent bg</small>
          </div>
          <div className="sr-crow">
            <span className="sr-clabel">Ghost</span>
            <button className="sr-btn sr-btn-g">View Program</button>
            <small className="sr-small">2px orange border / orange text</small>
          </div>
          <div className="sr-crow">
            <span className="sr-clabel">Event Tags</span>
            <span className="sr-tag">Keynote</span>
            <span className="sr-tag" style={{ marginLeft: 6 }}>Workshop</span>
            <span className="sr-tag" style={{ marginLeft: 6 }}>Panel</span>
          </div>
          <div className="sr-cards">
            <div className="sr-cspec">
              <div className="sr-cspec-eye">March 14</div>
              <h4>Launch Window</h4>
              <p>Annual gathering of Arizona's aerospace leaders. Phoenix Convention Center.</p>
              <button className="sr-btn sr-btn-p" style={{ marginTop: 14, fontSize: 13, padding: '10px 18px' }}>Register</button>
            </div>
            <div className="sr-cspec">
              <div className="sr-cspec-eye">Speaker</div>
              <h4>Dr. Sarah Chen</h4>
              <p>Director of Aerospace Innovation, Arizona Commerce Authority.</p>
              <span className="sr-tag" style={{ marginTop: 12, display: 'inline-block' }}>Keynote</span>
            </div>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--gray-l)' }}>
            <strong>Transitions:</strong> 1px rule at #1E1E1E between sections. Fade full-bleed image sections to void black at edges. Never hard-cut between image sections.
          </p>
        </div>
      </div>

      {/* IMAGE DIRECTION */}
      <div className="sr-section">
        <div className="sr-wrap">
          <div className="sr-label">06 — Image Direction</div>
          <div className="sr-h2">Visual Language</div>
          <p className="sr-p">All imagery lives at the intersection of Arizona's physical landscape and the cosmos. The target: grounded in desert reality, reaching toward space.</p>
          <div className="sr-imgrid">
            <div className="sr-icard">
              <img src="/images/space-rising/hero-astronaut-arizona.jpg" alt="Astronaut Arizona" />
              <div className="sr-ibody">
                <strong>Astronaut in Arizona</strong>
                <p>Human scale against landscape. The astronaut as Arizonan — desert as launchpad.</p>
              </div>
            </div>
            <div className="sr-icard">
              <img src="/images/space-rising/hero-desert-cosmos.jpg" alt="Desert Cosmos" />
              <div className="sr-ibody">
                <strong>Desert Cosmos</strong>
                <p>Arizona terrain merging with deep space. Saguaro at the edge of orbit.</p>
              </div>
            </div>
            <div className="sr-icard">
              <img src="/images/space-rising/hero-launch-arizona.jpg" alt="Launch Arizona" />
              <div className="sr-ibody">
                <strong>Launch Moment</strong>
                <p>Kinetic, upward energy. A rocket launched from Arizona soil.</p>
              </div>
            </div>
            <div className="sr-icard">
              <img src="/images/space-rising/hero-phoenix-cosmos.jpg" alt="Phoenix Cosmos" />
              <div className="sr-ibody">
                <strong>Phoenix + Cosmos</strong>
                <p>City lights and constellation. Phoenix as a node in the space economy.</p>
              </div>
            </div>
          </div>
          <p style={{ marginTop: 18, fontSize: 13, color: 'var(--gray-l)' }}>
            <strong>Direction:</strong> High contrast. Rich depth. Cosmic scale against geographic anchor. Night/twilight preferred. No clean studio shots — always atmosphere, texture, drama.
          </p>
        </div>
      </div>

      {/* REFERRAL CTA */}
      <div className="sr-cta">
        <div className="sr-cta-inner">
          <div className="sr-cta-by">Brand identity by</div>
          <div className="sr-cta-brand">Ahead of Market</div>
          <p className="sr-cta-sub">Strategy, design, and content for brands that move first.</p>
          <ReferralForm />
        </div>
      </div>
    </div>
  )
}
