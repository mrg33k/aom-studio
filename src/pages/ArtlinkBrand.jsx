import React from 'react'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Jost:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,700&display=swap');

  .al-page { box-sizing: border-box; }
  .al-page *, .al-page *::before, .al-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .al-root {
    --al-red: #CD2127;
    --al-black: #0A0A0A;
    --al-white: #FFFFFF;
    --al-watermark: rgba(10, 10, 10, 0.30);
    --al-rule: rgba(10, 10, 10, 0.08);
    --al-rule-on-dark: rgba(255, 255, 255, 0.12);
    --al-font: "Jost", "Futura", "Avenir Next", "Helvetica Neue", system-ui, sans-serif;
    font-family: var(--al-font);
    font-weight: 300;
    color: var(--al-black);
    background: var(--al-white);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    min-height: 100vh;
  }

  .al-root img { max-width: 100%; height: auto; display: block; }

  /* Layout */
  .al-wrap { max-width: 1280px; margin: 0 auto; padding: 0 48px; }

  /* Sections */
  .al-section { padding: 120px 0; border-bottom: 1px solid var(--al-rule); }
  .al-section.al-dark { background: var(--al-black); color: var(--al-white); border-bottom: 1px solid var(--al-rule-on-dark); }
  .al-section.al-dark .al-eyebrow { color: rgba(255,255,255,0.45); }
  .al-section.al-dark .al-meta { color: rgba(255,255,255,0.45); }

  /* Typography */
  .al-eyebrow {
    font-family: var(--al-font);
    font-weight: 500;
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(10,10,10,0.45);
    margin-bottom: 24px;
  }
  .al-root h1 { font-family: var(--al-font); font-weight: 700; font-size: clamp(48px, 8vw, 96px); line-height: 0.95; letter-spacing: -0.01em; }
  .al-root h2 { font-family: var(--al-font); font-weight: 700; font-size: clamp(36px, 5vw, 56px); line-height: 1.05; letter-spacing: -0.01em; }
  .al-root h3 { font-family: var(--al-font); font-weight: 700; font-size: 20px; line-height: 1.2; letter-spacing: 0; }
  .al-root p { font-weight: 300; font-size: 18px; line-height: 1.6; max-width: 64ch; }
  .al-root p + p { margin-top: 16px; }
  .al-lead { font-size: 22px; line-height: 1.5; font-weight: 300; }

  /* Sticky nav */
  .al-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(255,255,255,0.92);
    backdrop-filter: saturate(180%) blur(10px);
    -webkit-backdrop-filter: saturate(180%) blur(10px);
    border-bottom: 1px solid var(--al-rule);
  }
  .al-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 48px;
    max-width: 1280px;
    margin: 0 auto;
  }
  .al-nav-brand {
    font-weight: 700;
    letter-spacing: 0.06em;
    font-size: 18px;
    text-decoration: none;
    color: var(--al-black);
  }
  .al-nav-brand .al-light { font-weight: 300; }
  .al-nav-links { display: flex; gap: 32px; list-style: none; }
  .al-nav-links a {
    color: var(--al-black);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    transition: color 0.2s ease;
  }
  .al-nav-links a:hover { color: var(--al-red); }

  /* Hero */
  .al-hero { padding: 140px 0 120px; }
  .al-hero .al-lockup-frame {
    margin: 64px 0 48px;
    padding: 80px 64px;
    border: 1px solid var(--al-rule);
    display: flex;
    justify-content: center;
    align-items: center;
    background: var(--al-white);
  }
  .al-hero .al-lockup-frame img { max-width: 520px; width: 100%; }

  /* Color system */
  .al-color-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    margin-top: 64px;
  }
  .al-swatch { border: 1px solid var(--al-rule); overflow: hidden; }
  .al-swatch-chip {
    height: 280px;
    display: flex;
    align-items: flex-end;
    padding: 24px 28px;
  }
  .al-swatch-chip.al-red { background: var(--al-red); }
  .al-swatch-chip.al-black-chip { background: var(--al-black); }
  .al-swatch-chip .al-chip-label {
    color: rgba(255,255,255,0.90);
    font-weight: 500;
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .al-swatch-specs {
    padding: 28px;
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 12px 24px;
    font-size: 14px;
    border-top: 1px solid var(--al-rule);
  }
  .al-swatch-specs dt {
    font-weight: 500;
    color: rgba(10,10,10,0.45);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 11px;
    padding-top: 2px;
  }
  .al-swatch-specs dd { font-weight: 400; font-feature-settings: "tnum"; }

  /* Typography specimen */
  .al-type-block {
    margin-top: 64px;
    padding: 56px 0;
    border-top: 1px solid var(--al-rule);
    border-bottom: 1px solid var(--al-rule);
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: 48px;
    align-items: baseline;
  }
  .al-type-block:last-of-type { border-bottom: none; }
  .al-meta {
    font-size: 12px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(10,10,10,0.45);
    font-weight: 500;
    line-height: 1.6;
  }
  .al-specimen-bold {
    font-weight: 700;
    font-size: clamp(56px, 8vw, 104px);
    letter-spacing: -0.01em;
    line-height: 0.9;
    font-family: var(--al-font);
  }
  .al-specimen-light {
    font-weight: 300;
    font-size: clamp(56px, 8vw, 104px);
    letter-spacing: 0;
    line-height: 0.9;
    font-family: var(--al-font);
  }
  .al-alphabet {
    margin-top: 20px;
    font-size: 14px;
    color: rgba(10,10,10,0.45);
    letter-spacing: 0.04em;
    font-family: var(--al-font);
    line-height: 1.8;
  }
  .al-type-note {
    margin-top: 16px;
    font-size: 15px;
    font-weight: 300;
    color: rgba(10,10,10,0.65);
    max-width: 56ch;
    line-height: 1.6;
  }

  /* Logo variants */
  .al-variant-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 32px;
    margin-top: 64px;
  }
  .al-variant { border: 1px solid var(--al-rule); overflow: hidden; }
  .al-variant-frame {
    aspect-ratio: 4 / 3;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 56px;
  }
  .al-variant-frame img { max-width: 75%; max-height: 100%; width: auto; }
  .al-frame-light { background: var(--al-white); }
  .al-frame-dark { background: var(--al-black); }
  .al-frame-square { background: var(--al-black); aspect-ratio: 1 / 1; }
  .al-frame-square img { max-width: 60%; }
  .al-variant-caption {
    padding: 20px 24px;
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 500;
    color: rgba(10,10,10,0.55);
    border-top: 1px solid var(--al-rule);
    background: var(--al-white);
  }

  /* Rules (on dark) */
  .al-rules-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 56px;
  }
  .al-rule-card {
    padding: 36px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
  }
  .al-rule-card.al-dont { border-color: var(--al-red); background: rgba(205,33,39,0.06); }
  .al-rule-heading {
    font-size: 12px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 500;
    margin-bottom: 24px;
  }
  .al-rule-card .al-do-heading { color: rgba(255,255,255,0.45); }
  .al-rule-card .al-dont-heading { color: var(--al-red); }
  .al-rule-list { list-style: none; }
  .al-rule-item {
    padding: 14px 0;
    font-size: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
    font-weight: 300;
    color: rgba(255,255,255,0.88);
    line-height: 1.5;
  }
  .al-rule-item:first-child { border-top: none; }

  /* Footer */
  .al-footer {
    padding: 80px 0 56px;
    background: var(--al-black);
  }
  .al-footer-inner {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 48px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    flex-wrap: wrap;
    gap: 32px;
  }
  .al-footer-mark {
    color: var(--al-white);
    font-weight: 700;
    font-size: 18px;
    letter-spacing: 0.06em;
  }
  .al-footer-mark .al-light { font-weight: 300; }
  .al-footer-mark .al-dot { color: var(--al-red); }
  .al-footer-meta {
    font-size: 13px;
    line-height: 1.7;
    letter-spacing: 0.04em;
    color: rgba(255,255,255,0.55);
    margin-top: 8px;
  }
  .al-footer-meta a { color: rgba(255,255,255,0.75); text-decoration: none; transition: color 0.2s; }
  .al-footer-meta a:hover { color: var(--al-red); }
  .al-footer-right { text-align: right; color: rgba(255,255,255,0.55); font-size: 13px; line-height: 1.7; letter-spacing: 0.04em; }
  .al-footer-right a { color: rgba(255,255,255,0.75); text-decoration: none; transition: color 0.2s; }
  .al-footer-right a:hover { color: var(--al-red); }

  /* Responsive */
  @media (max-width: 720px) {
    .al-nav-inner { padding: 16px 24px; }
    .al-nav-links { display: none; }
    .al-wrap { padding: 0 24px; }
    .al-hero { padding: 80px 0 64px; }
    .al-hero .al-lockup-frame { padding: 48px 32px; }
    .al-section { padding: 80px 0; }
    .al-color-grid { grid-template-columns: 1fr; }
    .al-type-block { grid-template-columns: 1fr; gap: 16px; }
    .al-variant-grid { grid-template-columns: 1fr; }
    .al-rules-grid { grid-template-columns: 1fr; }
    .al-footer-inner { padding: 0 24px; }
    .al-footer-right { text-align: left; }
  }
`

export default function ArtlinkBrand() {
  return (
    <div className="al-page">
      <style>{CSS}</style>

      <div className="al-root">

        {/* ── STICKY NAV ── */}
        <nav className="al-nav">
          <div className="al-nav-inner">
            <span className="al-nav-brand">ART<span className="al-light">LINK</span></span>
            <ul className="al-nav-links">
              <li><a href="#mark">Mark</a></li>
              <li><a href="#color">Color</a></li>
              <li><a href="#type">Type</a></li>
              <li><a href="#usage">Usage</a></li>
              <li><a href="#rules">Rules</a></li>
            </ul>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="al-section al-hero" id="mark">
          <div className="al-wrap">
            <div className="al-eyebrow">Brand Standards · v.2023</div>
            <h1>One mark.<br />Two colors.<br />Quiet authority.</h1>

            <div className="al-lockup-frame">
              <img
                src="/artlink/Artlink_Logo.png"
 alt="Artlink primary lockup, black wordmark with red circular accent on white"
              />
            </div>

            <p className="al-lead">
              Artlink is built on restraint. A geometric wordmark, a single red accent, and the disciplined use of negative space. This page is both the standard and the proof: every rule below is applied here first.
            </p>
          </div>
        </section>

        {/* ── COLOR ── */}
        <section className="al-section" id="color">
          <div className="al-wrap">
            <div className="al-eyebrow">Color System</div>
            <h2>Two colors. No exceptions.</h2>
            <p style={{ marginTop: 24 }}>
              Red is the singular accent, used sparingly, never decoratively. Black is the foundation. White is the canvas. Anything outside this palette is off-brand.
            </p>

            <div className="al-color-grid">
              <div className="al-swatch">
                <div className="al-swatch-chip al-red">
                  <span className="al-chip-label">Artlink Red</span>
                </div>
                <dl className="al-swatch-specs">
                  <dt>HEX</dt><dd>#CD2127</dd>
                  <dt>RGB</dt><dd>205 · 33 · 39</dd>
                  <dt>CMYK</dt><dd>15 · 100 · 100 · 0</dd>
                </dl>
              </div>

              <div className="al-swatch">
                <div className="al-swatch-chip al-black-chip">
                  <span className="al-chip-label">Artlink Black</span>
                </div>
                <dl className="al-swatch-specs">
                  <dt>HEX</dt><dd>#000000</dd>
                  <dt>CMYK</dt><dd>K · 100</dd>
                  <dt>Use</dt><dd>Primary type and lockup on light surfaces</dd>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ── TYPOGRAPHY ── */}
        <section className="al-section" id="type">
          <div className="al-wrap">
            <div className="al-eyebrow">Typography</div>
            <h2>NeutraFace.</h2>
            <p style={{ marginTop: 24 }}>
              A geometric sans-serif rooted in Richard Neutra's mid-century architectural lettering. Considered. Upright. Never trendy. The brand uses two weights, Bold and Light, and lets the contrast do the work.
            </p>

            <div className="al-type-block">
              <div className="al-meta">NeutraFace<br />Bold</div>
              <div>
                <div className="al-specimen-bold">ART</div>
                <div className="al-alphabet">ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789</div>
                <div className="al-alphabet" style={{ fontWeight: 700 }}>abcdefghijklmnopqrstuvwxyz</div>
              </div>
            </div>

            <div className="al-type-block">
              <div className="al-meta">NeutraFace<br />Light</div>
              <div>
                <div className="al-specimen-light">LINK</div>
                <div className="al-alphabet">ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789</div>
                <div className="al-alphabet" style={{ fontWeight: 300 }}>abcdefghijklmnopqrstuvwxyz</div>
                <p className="al-type-note">
                  NeutraFace was designed by Christian Schwartz, drawing from the architectural signage of Richard Neutra. It carries a mid-century-modern sensibility: clean geometry, deliberate proportions, never fashionable. The mark pairs Bold and Light as direct contrast, the same move Neutra made between structure and material.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── LOGO USAGE ── */}
        <section className="al-section" id="usage">
          <div className="al-wrap">
            <div className="al-eyebrow">Lockup Variants</div>
            <h2>Five authorized lockups.</h2>
            <p style={{ marginTop: 24 }}>
              Each variant has a defined surface. The default lockup carries the red accent on light backgrounds. The reverse mirrors it on dark. Single-color variants exist for one-ink applications. The square reverse is reserved for tight crops where the horizontal lockup cannot breathe.
            </p>

            <div className="al-variant-grid">
              {/* Default */}
              <div className="al-variant">
                <div className="al-variant-frame al-frame-light">
                  <img src="/artlink/Artlink_Logo.png" alt="Default lockup, black and red on white" />
                </div>
                <div className="al-variant-caption">Default · Black + Red on White</div>
              </div>

              {/* Reverse */}
              <div className="al-variant">
                <div className="al-variant-frame al-frame-dark">
                  <img src="/artlink/Artlink_Logo_Rev.png" alt="Reverse lockup, white and red on black" />
                </div>
                <div className="al-variant-caption">Reverse · White + Red on Black</div>
              </div>

              {/* One-color black */}
              <div className="al-variant">
                <div className="al-variant-frame al-frame-light">
                  <img
                    src="/artlink/Artlink_Logo.png"
                    alt="One-color black lockup"
                    style={{ filter: 'grayscale(100%) contrast(120%)' }}
                  />
                </div>
                <div className="al-variant-caption">One-color · 100% Black</div>
              </div>

              {/* One-color white */}
              <div className="al-variant">
                <div className="al-variant-frame al-frame-dark">
                  <img
                    src="/artlink/Artlink_Logo_Rev.png"
                    alt="One-color white lockup"
                    style={{ filter: 'grayscale(100%) brightness(2)' }}
                  />
                </div>
                <div className="al-variant-caption">One-color · 100% White</div>
              </div>

              {/* Watermark */}
              <div className="al-variant">
                <div className="al-variant-frame al-frame-light">
                  <img
                    src="/artlink/Artlink_Logo.png"
                    alt="Watermark application, 30% black"
                    style={{ filter: 'grayscale(100%)', opacity: 0.30 }}
                  />
                </div>
                <div className="al-variant-caption">Watermark · 30% Black Only</div>
              </div>

              {/* Square reverse */}
              <div className="al-variant">
                <div className="al-variant-frame al-frame-square">
                  <img src="/artlink/Artlink_Logo_Rev_square.png" alt="Square reverse lockup" />
                </div>
                <div className="al-variant-caption">Square · Reverse</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── RULES ── */}
        <section className="al-section al-dark" id="rules">
          <div className="al-wrap">
            <div className="al-eyebrow">Rules</div>
            <h2 style={{ color: '#FFFFFF' }}>Do this. Not that.</h2>

            <div className="al-rules-grid">
              <div className="al-rule-card">
                <div className="al-rule-heading al-do-heading">Do</div>
                <ul className="al-rule-list">
                  <li className="al-rule-item">Use the authorized lockups exactly as delivered.</li>
                  <li className="al-rule-item">Pair Bold and Light from the NeutraFace family.</li>
                  <li className="al-rule-item">Treat red as a single accent, one moment per surface.</li>
                  <li className="al-rule-item">Give the mark generous clear space on all sides.</li>
                  <li className="al-rule-item">Use 30% black only for watermark applications.</li>
                </ul>
              </div>

              <div className="al-rule-card al-dont">
                <div className="al-rule-heading al-dont-heading">Don't</div>
                <ul className="al-rule-list">
                  <li className="al-rule-item">Recolor the lockup outside Red, Black, or White.</li>
                  <li className="al-rule-item">Stretch, rotate, or distort the wordmark.</li>
                  <li className="al-rule-item">Substitute fonts when NeutraFace is available.</li>
                  <li className="al-rule-item">Add gradients, shadows, glows, or texture.</li>
                  <li className="al-rule-item">Place the mark on busy photography without a clear ground.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="al-footer">
          <div className="al-footer-inner">
            <div>
              <div className="al-footer-mark">
                ART<span className="al-light">LINK</span> <span className="al-dot">·</span>
              </div>
              <div className="al-footer-meta">
                Brand Standards · Source PDF on file with AOM.
              </div>
            </div>
            <div className="al-footer-right">
              Built by <a href="https://aheadofmarket.com">AOM</a> · 2026<br />
              Referred via Arsenal GPA
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}