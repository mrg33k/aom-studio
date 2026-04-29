import React, { useEffect } from 'react'

const REPORTS = [
  {
    title: 'Arizona Space Technology Market Intelligence Report',
    blurb: 'Sector mapping, capability gaps, and competitive landscape for Arizona’s space technology base.',
    file: 'market-intelligence-report.pdf',
  },
  {
    title: 'Federal Opportunity Capture Strategy',
    blurb: 'How Arizona’s space and satellite-launch ecosystem captures federal contracts, grants, and program dollars.',
    file: 'federal-opportunity-capture-strategy.pdf',
  },
  {
    title: 'Federal Strategy Action Plan',
    blurb: 'Concrete next-step plays for stakeholders pursuing federal alignment in the space sector.',
    file: 'federal-strategy-action-plan.pdf',
  },
  {
    title: 'Legislative Triad — Space Policy Analysis',
    blurb: 'Policy analysis across the legislative triad shaping commercial space and Arizona’s posture within it.',
    file: 'legislative-triad-policy-analysis.pdf',
  },
]

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

  .srr-page { box-sizing: border-box; }
  .srr-page *, .srr-page *::before, .srr-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .srr-root {
    --black: #080808;
    --surface: #121212;
    --surface2: #1A1A1A;
    --surface3: #2A2A2A;
    --orange: #E5451F;
    --white: #FFFFFF;
    --gray: #999;
    --gray-l: #CCCCCC;
    --border: #1E1E1E;
    background: var(--black);
    color: var(--white);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
  }

  .srr-wrap { max-width: 1100px; margin: 0 auto; padding: 0 32px; }

  /* HERO */
  .srr-hero {
    position: relative; min-height: 60vh; display: flex;
    align-items: flex-end; overflow: hidden;
    border-bottom: 1px solid var(--border);
  }
  .srr-hero img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: center;
  }
  .srr-hero-ov {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(8,8,8,.92) 0%, rgba(8,8,8,.45) 55%, rgba(8,8,8,.15) 100%);
  }
  .srr-hero-inner {
    position: relative; z-index: 2;
    padding: 48px 56px 56px;
    width: 100%;
  }
  .srr-eye {
    font-size: 11px; font-weight: 600; letter-spacing: .22em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 14px;
  }
  .srr-hero-title {
    font-family: 'Oswald', sans-serif; font-weight: 700;
    font-size: clamp(48px, 7vw, 84px);
    text-transform: uppercase; line-height: .95; letter-spacing: .02em;
  }
  .srr-hero-tag {
    font-size: 18px; color: var(--gray-l);
    margin-top: 18px; max-width: 560px; line-height: 1.5;
  }

  /* INTRO */
  .srr-intro { padding: 56px 0 24px; border-bottom: 1px solid var(--border); }
  .srr-intro p { color: var(--gray-l); font-size: 16px; max-width: 760px; }

  /* GRID */
  .srr-grid-section { padding: 48px 0 96px; }
  .srr-section-label {
    font-size: 11px; font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 12px;
  }
  .srr-section-title {
    font-family: 'Oswald', sans-serif; font-size: 36px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em; margin-bottom: 36px;
  }

  .srr-grid {
    display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;
  }
  @media (max-width: 720px) {
    .srr-grid { grid-template-columns: 1fr; }
    .srr-hero-inner { padding: 32px 24px 40px; }
    .srr-wrap { padding: 0 24px; }
    .srr-section-title { font-size: 28px; }
  }

  .srr-card {
    background: var(--surface3); border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px; padding: 28px;
    display: flex; flex-direction: column; gap: 14px;
    transition: border-color .2s, transform .2s;
  }
  .srr-card:hover { border-color: rgba(229,69,31,.45); transform: translateY(-2px); }

  .srr-card-tag {
    font-family: 'Oswald', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--orange);
  }
  .srr-card-title {
    font-family: 'Oswald', sans-serif;
    font-size: 22px; font-weight: 700; line-height: 1.15;
    text-transform: uppercase; letter-spacing: .02em;
    color: var(--white);
  }
  .srr-card-blurb { color: var(--gray-l); font-size: 14px; line-height: 1.55; flex: 1; }

  .srr-card-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px; }

  .srr-btn {
    font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase;
    border-radius: 6px; padding: 10px 18px;
    text-decoration: none; display: inline-block;
    transition: background .2s, color .2s, border-color .2s;
    cursor: pointer;
  }
  .srr-btn-p { background: var(--orange); color: #fff; border: 1.5px solid var(--orange); }
  .srr-btn-p:hover { background: #cc3a16; border-color: #cc3a16; }
  .srr-btn-g { background: transparent; color: var(--orange); border: 1.5px solid var(--orange); }
  .srr-btn-g:hover { background: var(--orange); color: #fff; }

  .srr-foot {
    border-top: 1px solid var(--border);
    padding: 32px 0 56px;
    text-align: center;
    color: var(--gray);
    font-size: 12px;
    letter-spacing: .04em;
  }
`

export default function SpaceRisingReports() {
  useEffect(() => {
    document.title = 'Space Rising — Reports'
  }, [])

  return (
    <div className="srr-root srr-page">
      <style>{CSS}</style>

      <header className="srr-hero">
        <img src="/space-rising/reports/header.jpg" alt="Space Rising — Arizona Space Technology Reports" />
        <div className="srr-hero-ov" />
        <div className="srr-hero-inner">
          <div className="srr-eye">Reports · 2026</div>
          <h1 className="srr-hero-title">Arizona Space<br />Reports</h1>
          <p className="srr-hero-tag">
            Market intelligence, federal strategy, and policy analysis for Arizona’s rising space economy.
          </p>
        </div>
      </header>

      <section className="srr-intro">
        <div className="srr-wrap">
          <p>
            A working library of research and strategy documents prepared for stakeholders inside the Arizona space ecosystem. Each report is downloadable as a PDF.
          </p>
        </div>
      </section>

      <section className="srr-grid-section">
        <div className="srr-wrap">
          <div className="srr-section-label">01 — Library</div>
          <div className="srr-section-title">Available Reports</div>

          <div className="srr-grid">
            {REPORTS.map(({ title, blurb, file }, idx) => {
              const href = `/space-rising/reports/${file}`
              return (
                <article key={file} className="srr-card">
                  <div className="srr-card-tag">Report 0{idx + 1}</div>
                  <h2 className="srr-card-title">{title}</h2>
                  <p className="srr-card-blurb">{blurb}</p>
                  <div className="srr-card-actions">
                    <a className="srr-btn srr-btn-p" href={href} download>
                      Download PDF
                    </a>
                    <a className="srr-btn srr-btn-g" href={href} target="_blank" rel="noopener noreferrer">
                      View in Browser
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="srr-foot">
        Prepared by Arsenal Government &amp; Public Affairs Group · Distributed via Space Rising
      </footer>
    </div>
  )
}
