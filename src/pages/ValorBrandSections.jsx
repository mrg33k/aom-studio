import React, { useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Valor to Victory -- Brand Guidelines Sections 3-4                  */
/*  Photography/Video, Voice & Tone, Social Media, Application,        */
/*  Quick Reference Cards                                               */
/*  Fonts: Playfair Display 900 (display) + Source Sans 3 (body)       */
/*  Palette: Forest Green + Honor Gold + Warm Cream                    */
/* ------------------------------------------------------------------ */

export const CSS_VALOR_SECTIONS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@300;400;600&family=Libre+Baskerville:wght@400;700&display=swap');

  .vs-root {
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
  }

  /* ---- Shared section shell ---- */
  .vs-section {
    padding: 64px 48px;
    border-top: 1px solid var(--cream-dark);
  }
  .vs-section-light { background: var(--warm-white); }
  .vs-section-cream { background: var(--cream); }
  .vs-section-dark  { background: var(--green-deep); }

  .vs-max { max-width: 1100px; margin: 0 auto; }

  /* ---- Section header ---- */
  .vs-section-eyebrow {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .2em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 8px;
  }
  .vs-section-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(26px, 4vw, 40px);
    font-weight: 900;
    color: var(--text-dark);
    line-height: 1.1;
    margin-bottom: 10px;
  }
  .vs-section-title-light { color: var(--cream); }
  .vs-section-subtitle {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 15px;
    color: var(--text-light);
    max-width: 600px;
    line-height: 1.6;
    margin-bottom: 40px;
  }
  .vs-section-subtitle-light { color: rgba(245,240,232,.65); }

  /* ---- Cards ---- */
  .vs-card {
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    border-radius: 10px;
    padding: 24px;
  }
  .vs-card-dark {
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(201,147,26,.2);
    border-radius: 10px;
    padding: 24px;
  }
  .vs-card-cream {
    background: var(--cream);
    border: 1px solid var(--cream-dark);
    border-radius: 10px;
    padding: 24px;
  }
  .vs-card-gold {
    background: rgba(201,147,26,.1);
    border: 1px solid rgba(201,147,26,.3);
    border-radius: 10px;
    padding: 24px;
  }

  /* ---- Typography within sections ---- */
  .vs-label {
    font-family: 'Libre Baskerville', serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .15em;
    text-transform: uppercase;
    color: var(--text-light);
    margin-bottom: 8px;
  }
  .vs-label-gold {
    font-family: 'Libre Baskerville', serif;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .15em;
    text-transform: uppercase;
    color: var(--gold-bright);
    margin-bottom: 8px;
  }
  .vs-h3 {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 700;
    color: var(--text-dark);
    margin-bottom: 16px;
  }
  .vs-h3-light { color: var(--cream); }
  .vs-body {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-mid);
    line-height: 1.6;
  }
  .vs-body-light { color: rgba(245,240,232,.75); }
  .vs-mono {
    font-family: 'Libre Baskerville', serif;
    font-size: 12px;
    color: var(--text-light);
    letter-spacing: .04em;
  }

  /* ---- Divider strip ---- */
  .vs-divider {
    height: 3px;
    background: linear-gradient(90deg, var(--green-deep) 0%, var(--gold) 50%, var(--green-deep) 100%);
  }

  /* ---- Grids ---- */
  .vs-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
  .vs-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
  .vs-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }

  /* ---- Voice yes/no ---- */
  .vs-voice-row {
    padding: 20px 24px;
    border-radius: 10px;
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .vs-voice-attr {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 4px;
  }
  .vs-voice-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .vs-yes {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .vs-yes-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #22c55e; margin-top: 5px; flex-shrink: 0;
  }
  .vs-no-dot {
    width: 7px; height: 7px; border-radius: 50%; background: #ef4444; margin-top: 5px; flex-shrink: 0;
  }
  .vs-no-text {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-light);
    text-decoration: line-through;
    line-height: 1.5;
  }
  .vs-yes-text {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-mid);
    line-height: 1.5;
  }

  /* ---- Spectrum bar ---- */
  .vs-spectrum-row { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
  .vs-spectrum-label-l {
    font-size: 11px; color: var(--text-light); width: 72px; text-align: right;
    font-family: 'Source Sans 3', sans-serif;
  }
  .vs-spectrum-label-r {
    font-size: 11px; color: var(--text-light); width: 72px;
    font-family: 'Source Sans 3', sans-serif;
  }
  .vs-spectrum-track {
    flex: 1; height: 8px; border-radius: 4px; background: var(--cream-dark); position: relative;
  }
  .vs-spectrum-dot {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--gold); box-shadow: 0 0 8px rgba(201,147,26,.4);
  }

  /* ---- Platform card ---- */
  .vs-platform-tag {
    display: inline-block;
    background: var(--green-deep);
    color: var(--gold-bright);
    font-family: 'Source Sans 3', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .12em;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 3px;
    margin-bottom: 12px;
  }
  .vs-platform-tag-light {
    display: inline-block;
    background: rgba(201,147,26,.15);
    border: 1px solid rgba(201,147,26,.4);
    color: var(--gold-bright);
    font-family: 'Source Sans 3', sans-serif;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .12em;
    text-transform: uppercase;
    padding: 4px 12px;
    border-radius: 3px;
    margin-bottom: 12px;
  }

  /* ---- Caption mock ---- */
  .vs-caption-mock {
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    border-radius: 8px;
    padding: 20px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: var(--text-mid);
    line-height: 1.7;
    white-space: pre-line;
    border-left: 3px solid var(--gold);
  }
  .vs-caption-mock-dark {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(201,147,26,.2);
    border-radius: 8px;
    padding: 20px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px;
    color: rgba(245,240,232,.8);
    line-height: 1.7;
    white-space: pre-line;
    border-left: 3px solid var(--gold);
  }

  /* ---- Quick ref card ---- */
  .vs-ref-card {
    background: var(--warm-white);
    border: 1px solid var(--cream-dark);
    border-radius: 10px;
    overflow: hidden;
  }
  .vs-ref-card-header {
    background: var(--green-deep);
    padding: 14px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .vs-ref-card-agent {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--gold-bright);
  }
  .vs-ref-card-role {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 10px;
    color: rgba(245,240,232,.5);
    letter-spacing: .08em;
  }
  .vs-ref-card-body { padding: 20px; }
  .vs-ref-card-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 1px solid var(--cream-dark);
    font-family: 'Source Sans 3', sans-serif;
    font-size: 13px;
    color: var(--text-mid);
    line-height: 1.5;
  }
  .vs-ref-card-row:last-child { border-bottom: none; }
  .vs-ref-card-key {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--text-light);
    min-width: 72px;
    flex-shrink: 0;
    padding-top: 2px;
  }

  /* ---- Hard rule list ---- */
  .vs-rule-row {
    display: flex;
    gap: 14px;
    padding: 16px;
    border-radius: 10px;
    border: 1px solid var(--cream-dark);
    background: var(--warm-white);
    margin-bottom: 10px;
  }
  .vs-rule-num {
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(201,147,26,.15);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 11px; font-weight: 700;
    color: var(--gold);
    flex-shrink: 0;
  }
  .vs-rule-text {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 14px; font-weight: 500;
    color: var(--text-dark);
    line-height: 1.4;
  }
  .vs-rule-reason {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    color: var(--text-light);
    margin-top: 3px;
    line-height: 1.4;
  }

  /* ---- Hashtag pill ---- */
  .vs-hashtag {
    display: inline-block;
    background: rgba(27,67,50,.08);
    border: 1px solid rgba(27,67,50,.2);
    border-radius: 100px;
    padding: 5px 14px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--green-deep);
    margin: 3px;
  }
  .vs-hashtag-gold {
    display: inline-block;
    background: rgba(201,147,26,.12);
    border: 1px solid rgba(201,147,26,.3);
    border-radius: 100px;
    padding: 5px 14px;
    font-family: 'Source Sans 3', sans-serif;
    font-size: 12px;
    font-weight: 600;
    color: var(--gold);
    margin: 3px;
  }

  @media (max-width: 780px) {
    .vs-section { padding: 40px 24px; }
    .vs-voice-pair { grid-template-columns: 1fr; }
    .vs-grid-2, .vs-grid-3, .vs-grid-4 { grid-template-columns: 1fr; }
  }
`

/* ================================================================== */
/*  SECTION 5: PHOTOGRAPHY & VIDEO DIRECTION                          */
/* ================================================================== */

export function PhotographySection() {
  const shotTypes = [
    {
      label: 'The Homecoming Moment',
      color: '#C9931A',
      desc: 'Keys in hand, family at the door, wide smile. Real families, not stock. This is the emotional core -- show the arrival, not just the house.',
    },
    {
      label: 'Service Heritage',
      color: '#1B4332',
      desc: 'Uniforms, medals, service portraits alongside current life. Honor the past without making it the only story. Veteran first, homeowner second.',
    },
    {
      label: 'The Property',
      color: '#C9931A',
      desc: 'Exterior establishing shots in golden hour. Front doors, yards, neighborhoods. Warm light -- not clinical real estate photography. This is home.',
    },
    {
      label: 'The Paperwork Victory',
      color: '#1B4332',
      desc: 'Signing day. The moment the loan closes. Hands on documents, smiles across the table. The bureaucratic grind made human and worth celebrating.',
    },
  ]

  const gradeParams = [
    { param: 'Temperature', value: 'Warm, golden hour leaning', note: 'The palette is warm cream and gold. Photography should feel the same. Not orange-filtered, but naturally warm.' },
    { param: 'Contrast', value: 'Medium with rich shadows', note: 'Dignified, not harsh. Think a warm print, not a cold digital grade.' },
    { param: 'Saturation', value: 'Full, earthy tones preserved', note: 'Greens of lawns and trees should feel alive. Muted kills the emotional warmth this brand needs.' },
  ]

  const videoDos = [
    'Handheld, intimate -- not clinical tripod',
    'Slow push-ins on faces during emotional beats',
    'B-roll: keys, front doors, mailboxes, neighborhood walks',
    'Interview setups: warm practical light, home backgrounds',
    'Steady cam for property walkthroughs',
  ]

  const videoDonts = [
    'Drone aerials that feel like luxury real estate',
    'Fast cuts with electronic music',
    'Stock footage of military service -- use real clients only',
    'Cold blue/grey grades that feel institutional',
    'Heavy motion graphics over emotional moments',
  ]

  return (
    <div className="vs-section vs-section-light" id="vs-photo">
      <div className="vs-max">
        <div className="vs-section-eyebrow">Section 05</div>
        <h2 className="vs-section-title">Photography &amp; Video Direction</h2>
        <p className="vs-section-subtitle">
          Real veterans. Real families. Real homes. This is not aspirational lifestyle photography -- it is documentary warmth. Every shot should feel like someone let you into the room.
        </p>

        {/* Shot types */}
        <div className="vs-grid-2" style={{ marginBottom: 40 }}>
          {shotTypes.map((item, i) => (
            <div className="vs-card" key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                <span className="vs-label" style={{ marginBottom: 0, color: item.color === '#C9931A' ? '#C9931A' : '#2D6A4F' }}>{item.label}</span>
              </div>
              <p className="vs-body">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Color grade */}
        <div className="vs-card" style={{ marginBottom: 40 }}>
          <div className="vs-label" style={{ marginBottom: 16 }}>Color Grade Direction</div>
          <div className="vs-grid-3">
            {gradeParams.map((item, i) => (
              <div key={i}>
                <p style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#C9931A', marginBottom: 4 }}>{item.param}</p>
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 600, fontSize: 14, color: '#1B4332', marginBottom: 4 }}>{item.value}</p>
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#7A6040', lineHeight: 1.5 }}>{item.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Video dos / donts */}
        <div className="vs-grid-2">
          <div className="vs-card" style={{ borderLeft: '3px solid #22c55e' }}>
            <div className="vs-label" style={{ marginBottom: 14, color: '#15803d' }}>Video -- Do This</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {videoDos.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginTop: 6, flexShrink: 0 }} />
                  <span className="vs-body">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="vs-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="vs-label" style={{ marginBottom: 14, color: '#dc2626' }}>Video -- Avoid</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {videoDonts.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', marginTop: 6, flexShrink: 0 }} />
                  <span className="vs-body" style={{ textDecoration: 'line-through', color: '#7A6040' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/*  SECTION 6: VOICE & TONE                                            */
/* ================================================================== */

export function VoiceSection() {
  const voiceAttributes = [
    {
      attr: 'Earned, not performed',
      yes: 'You served. This benefit exists because of that service. Let\'s use it.',
      no: 'We\'re honored to serve those who served! Your sacrifice deserves the best!',
    },
    {
      attr: 'Clear over clever',
      yes: 'VA loans require no down payment and no PMI. Here\'s how to qualify.',
      no: 'Unlock the homeownership journey you\'ve earned with our streamlined pathway solutions.',
    },
    {
      attr: 'Human authority',
      yes: 'Most lenders don\'t specialize in VA loans. We do. That difference matters at closing.',
      no: 'As industry-leading experts in veteran financial services, we deliver unparalleled outcomes.',
    },
    {
      attr: 'Warm but not sentimental',
      yes: 'Coming home looked different than you expected. A house with your name on the deed can change that.',
      no: 'Your brave sacrifice touched our hearts. We want to give back to our nation\'s heroes!',
    },
    {
      attr: 'Direct guidance',
      yes: 'Step 1: Get your Certificate of Eligibility. It takes 10 minutes online. Here\'s the link.',
      no: 'There are many pathways to explore when beginning your homeownership consideration process.',
    },
  ]

  const toneShifts = [
    { context: 'Social captions', tone: 'Warm, personal, celebration-forward', example: 'Keys handed over Friday. Three deployment cycles, two states, one family. Welcome home, Marcus.' },
    { context: 'Educational content', tone: 'Confident and clear, zero jargon', example: 'The VA funding fee is not a fee to be afraid of. Here\'s exactly what it is and when you don\'t owe it.' },
    { context: 'Testimonials', tone: 'Let the veteran speak. Get out of the way.', example: '"I thought VA loans were complicated. They walked me through every step." -- that\'s the whole post.' },
    { context: 'Email outreach', tone: 'Respectful and specific, not generic', example: 'You have VA benefits available. Most veterans never use them because no one explains them clearly. We do.' },
    { context: 'Process explainers', tone: 'Step-by-step, confidence-building', example: '4 steps. No surprises. Here\'s what the VA loan process actually looks like.' },
  ]

  const hardRules = [
    { rule: 'Never call veterans "heroes" in copy', reason: 'Many veterans actively dislike this label. Respect them as individuals, not a monolith.' },
    { rule: 'No exclamation points in main copy', reason: 'Confidence does not need volume. Earnestness does not need punctuation emphasis.' },
    { rule: 'Avoid "journey" as a noun', reason: 'Overused to the point of meaninglessness in veteran-adjacent marketing.' },
    { rule: 'VA loan specifics only -- no invented benefits', reason: 'These are regulated financial products. State only what is accurate and verifiable.' },
    { rule: 'Gratitude for service is one sentence max', reason: 'Say it once, plainly, then get to what is actually useful to them.' },
    { rule: 'Short paragraphs, active verbs', reason: 'This audience scans on mobile. Three lines is already pushing it.' },
    { rule: 'CTAs are concrete actions', reason: '"Get Pre-Qualified" not "Begin Your Journey." One verb, one object.' },
  ]

  const spectrumItems = [
    { left: 'Casual', right: 'Formal', position: 40 },
    { left: 'Playful', right: 'Serious', position: 60 },
    { left: 'Corporate', right: 'Human', position: 80 },
    { left: 'Quiet', right: 'Loud', position: 30 },
    { left: 'Distant', right: 'Personal', position: 75 },
  ]

  return (
    <>
      <div className="vs-divider" />
      <div className="vs-section vs-section-cream" id="vs-voice">
        <div className="vs-max">
          <div className="vs-section-eyebrow">Section 06</div>
          <h2 className="vs-section-title">Voice &amp; Tone</h2>
          <p className="vs-section-subtitle">
            The voice of a trusted guide who has been through the VA loan process a hundred times and genuinely wants you to understand it. No hero worship. No corporate warmth. Honest and warm in equal measure.
          </p>

          {/* Voice attributes -- yes/no */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
            {voiceAttributes.map((v, i) => (
              <div className="vs-voice-row" key={i}>
                <div className="vs-voice-attr">{v.attr}</div>
                <div className="vs-voice-pair">
                  <div className="vs-yes">
                    <span className="vs-yes-dot" />
                    <span className="vs-yes-text">"{v.yes}"</span>
                  </div>
                  <div className="vs-yes">
                    <span className="vs-no-dot" />
                    <span className="vs-no-text">"{v.no}"</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tone shifts */}
          <h3 className="vs-h3" style={{ marginBottom: 16 }}>Tone Shifts by Context</h3>
          <div className="vs-grid-3" style={{ marginBottom: 48 }}>
            {toneShifts.map((shift, i) => (
              <div className="vs-card" key={i}>
                <span className="vs-label" style={{ display: 'block', marginBottom: 6, color: '#2D6A4F' }}>{shift.context}</span>
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, fontWeight: 500, color: '#3D2B1A', marginBottom: 8 }}>{shift.tone}</p>
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 13, color: '#7A6040', fontStyle: 'italic', lineHeight: 1.5 }}>"{shift.example}"</p>
              </div>
            ))}
          </div>

          {/* Hard rules */}
          <h3 className="vs-h3" style={{ marginBottom: 16 }}>Content Hard Rules</h3>
          <div style={{ marginBottom: 48 }}>
            {hardRules.map((item, i) => (
              <div className="vs-rule-row" key={i}>
                <div className="vs-rule-num">{i + 1}</div>
                <div>
                  <div className="vs-rule-text">{item.rule}</div>
                  <div className="vs-rule-reason">{item.reason}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Personality spectrum */}
          <div className="vs-card-gold" style={{ padding: 28 }}>
            <div className="vs-label" style={{ marginBottom: 20 }}>Brand Personality Spectrum</div>
            {spectrumItems.map((item, i) => (
              <div className="vs-spectrum-row" key={i}>
                <span className="vs-spectrum-label-l">{item.left}</span>
                <div className="vs-spectrum-track">
                  <div className="vs-spectrum-dot" style={{ left: `${item.position}%` }} />
                </div>
                <span className="vs-spectrum-label-r">{item.right}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ================================================================== */
/*  SECTION 7: SOCIAL MEDIA GUIDELINES                                 */
/* ================================================================== */

export function SocialSection() {
  const platforms = [
    {
      name: 'Facebook',
      audience: 'Veterans 35+, military families, retirees',
      cadence: '4-5x per week',
      formats: 'Video stories, client testimonials, educational carousels, event posts',
      bestTime: 'Tue-Thu 8-9AM, 1-2PM AZ time',
      tone: 'Warm, conversational, community-forward',
    },
    {
      name: 'Instagram',
      audience: 'Active-duty transitioning out, younger veterans, spouses',
      cadence: '3-4x per week + 5-7 Stories daily',
      formats: 'Homecoming photos, Reels (process explainers), carousels, behind-the-scenes',
      bestTime: 'Mon/Wed/Fri 7-8AM, 7-8PM',
      tone: 'Visual-first, emotionally warm, aspirational but grounded',
    },
    {
      name: 'LinkedIn',
      audience: 'Veteran business owners, real estate professionals, referral partners',
      cadence: '2-3x per week',
      formats: 'Thought leadership, data posts, partner spotlights, milestone announcements',
      bestTime: 'Tue-Thu 8-10AM',
      tone: 'Professional authority, industry-informed, still human',
    },
    {
      name: 'YouTube',
      audience: 'Veterans researching VA loans, first-time homebuyers',
      cadence: '1x per week',
      formats: 'Process walkthroughs (3-8 min), client stories (5-10 min), FAQ answers (1-3 min)',
      bestTime: 'Thursday-Friday publish',
      tone: 'Educational, trust-building, no fluff',
    },
  ]

  const contentPillars = [
    { pillar: 'Client Stories', pct: '35%', desc: 'Real veterans. Real closings. Real quotes. This is the brand\'s most powerful content type.', color: '#C9931A' },
    { pillar: 'Education', pct: '30%', desc: 'VA loan process, eligibility, funding fees, COE. Demystify the bureaucracy.', color: '#1B4332' },
    { pillar: 'Community', pct: '20%', desc: 'Veteran events, military appreciation, local housing market, partner spotlights.', color: '#2D6A4F' },
    { pillar: 'Behind the Scenes', pct: '15%', desc: 'The team, the process, the people making it happen. Builds trust before the first call.', color: '#7A6040' },
  ]

  const primaryHashtags = [
    '#VeteranHomeownership', '#VALoans', '#VeteranHomes', '#ValorToVictory', '#V2V',
    '#MilitaryRealEstate', '#VeteranBenefits', '#VAHomeLoan',
  ]

  const contextHashtags = [
    '#VeteranOwned', '#ActiveDuty', '#MilitaryFamily', '#HonorableDischarged',
    '#FirstTimeHomeBuyer', '#VeteranCommunity', '#SupportOurVeterans', '#HomeownershipJourney',
  ]

  return (
    <>
      <div className="vs-divider" />
      <div className="vs-section vs-section-dark" id="vs-social">
        <div className="vs-max">
          <div className="vs-section-eyebrow" style={{ color: 'rgba(244,185,66,.7)' }}>Section 07</div>
          <h2 className="vs-section-title vs-section-title-light">Social Media Guidelines</h2>
          <p className="vs-section-subtitle vs-section-subtitle-light">
            Platform rules, posting cadence, and hashtag strategy for Tony. Every post either builds trust, teaches something, or celebrates a veteran getting home.
          </p>

          {/* Content pillars */}
          <h3 className="vs-h3 vs-h3-light" style={{ marginBottom: 16 }}>Content Pillars</h3>
          <div className="vs-grid-4" style={{ marginBottom: 48 }}>
            {contentPillars.map((item, i) => (
              <div className="vs-card-dark" key={i} style={{ borderTop: `3px solid ${item.color}` }}>
                <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 26, fontWeight: 700, color: '#F4B942', lineHeight: 1 }}>{item.pct}</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#F5F0E8', margin: '8px 0 6px' }}>{item.pillar}</div>
                <p style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: 'rgba(245,240,232,.6)', lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Platform cards */}
          <h3 className="vs-h3 vs-h3-light" style={{ marginBottom: 16 }}>Platform Rules</h3>
          <div className="vs-grid-2" style={{ marginBottom: 48 }}>
            {platforms.map((p, i) => (
              <div className="vs-card-dark" key={i}>
                <span className="vs-platform-tag-light">{p.name}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { k: 'Audience', v: p.audience },
                    { k: 'Cadence', v: p.cadence },
                    { k: 'Formats', v: p.formats },
                    { k: 'Best Time', v: p.bestTime },
                    { k: 'Tone', v: p.tone },
                  ].map((row, j) => (
                    <div key={j} style={{ display: 'flex', gap: 10, fontSize: 13, fontFamily: "'Source Sans 3', sans-serif" }}>
                      <span style={{ minWidth: 68, color: 'rgba(245,240,232,.4)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', paddingTop: 2, flexShrink: 0 }}>{row.k}</span>
                      <span style={{ color: 'rgba(245,240,232,.8)', lineHeight: 1.5 }}>{row.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Hashtags */}
          <h3 className="vs-h3 vs-h3-light" style={{ marginBottom: 16 }}>Hashtag Strategy</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="vs-card-dark">
              <div className="vs-label-gold" style={{ marginBottom: 12 }}>Primary -- Use on Every Post</div>
              <div style={{ flexWrap: 'wrap' }}>
                {primaryHashtags.map((tag, i) => (
                  <span className="vs-hashtag-gold" key={i}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="vs-card-dark">
              <div className="vs-label-gold" style={{ marginBottom: 12 }}>Contextual -- Add 3-5 Per Post</div>
              <div style={{ flexWrap: 'wrap' }}>
                {contextHashtags.map((tag, i) => (
                  <span className="vs-hashtag-gold" key={i} style={{ opacity: 0.75 }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ================================================================== */
/*  SECTION 8: APPLICATION EXAMPLES                                    */
/* ================================================================== */

export function ApplicationSection() {
  const captions = [
    {
      platform: 'Instagram',
      type: 'Client Story',
      text: `Marcus spent 14 years in the Army. He thought buying a house would take another 5 years of saving.

It took 6 weeks.

No down payment. No PMI. Just the benefit he earned and a team that actually knows how to use it.

Welcome home, Marcus.`,
    },
    {
      platform: 'Facebook',
      type: 'Education',
      text: `Most veterans don't know about the VA funding fee exemption.

If you have a service-connected disability rating of 10% or higher, you pay $0 in funding fees at closing.

That can save $5,000-$15,000 depending on your loan size.

Comment "EXEMPT" and we'll send you the full breakdown.`,
    },
    {
      platform: 'LinkedIn',
      type: 'Thought Leadership',
      text: `The veteran homeownership gap is real. Post-9/11 veterans own homes at significantly lower rates than the general population -- despite having one of the best loan products in the country available to them.

The problem is not the benefit. The problem is that most lenders treat VA loans like a specialty nobody wants to learn.

We built V2V to close that gap. One veteran, one home, one closing at a time.`,
    },
  ]

  const templates = [
    {
      name: 'Closing Day Post',
      slots: ['Client first name only', 'Branch of service', 'City/neighborhood', 'One sentence from client quote', 'V2V handle + primary hashtags'],
      note: 'Never share last names or addresses. Get written consent before posting.',
    },
    {
      name: 'Process Explainer Reel',
      slots: ['Hook: one common misconception', 'Steps 1-3 (max 3 per reel)', 'CTA: DM or link in bio', 'Music: instrumental, mid-tempo, no heavy drops'],
      note: 'Keep under 60 seconds. Use text overlays -- majority watch without sound.',
    },
    {
      name: 'VA Loan Fact Card',
      slots: ['Stat or fact (verified, cited)', 'One-line plain-language translation', 'V2V logo mark bottom right', 'Forest green background or warm cream'],
      note: 'All stats must link to VA.gov or HUD source. No estimates or approximations.',
    },
  ]

  return (
    <>
      <div className="vs-divider" />
      <div className="vs-section vs-section-light" id="vs-application">
        <div className="vs-max">
          <div className="vs-section-eyebrow">Section 08</div>
          <h2 className="vs-section-title">Application Examples</h2>
          <p className="vs-section-subtitle">
            Sample captions, post templates, and structural guides for Cleo and Tony. These are working examples -- not scripts. Adapt to each veteran's real story.
          </p>

          {/* Caption examples */}
          <h3 className="vs-h3" style={{ marginBottom: 16 }}>Sample Captions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
            {captions.map((cap, i) => (
              <div key={i}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <span className="vs-platform-tag">{cap.platform}</span>
                  <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 11, color: '#7A6040', letterSpacing: '.08em' }}>{cap.type}</span>
                </div>
                <div className="vs-caption-mock">{cap.text}</div>
              </div>
            ))}
          </div>

          {/* Post templates */}
          <h3 className="vs-h3" style={{ marginBottom: 16 }}>Post Templates</h3>
          <div className="vs-grid-3">
            {templates.map((tmpl, i) => (
              <div className="vs-card" key={i} style={{ borderTop: '3px solid #C9931A' }}>
                <div className="vs-label" style={{ marginBottom: 12, color: '#C9931A' }}>{tmpl.name}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                  {tmpl.slots.map((slot, j) => (
                    <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
                      <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontWeight: 700, fontSize: 11, color: '#C9931A', marginTop: 1, flexShrink: 0 }}>{j + 1}.</span>
                      <span className="vs-body" style={{ fontSize: 13 }}>{slot}</span>
                    </li>
                  ))}
                </ul>
                <div style={{ padding: '10px 12px', background: 'rgba(201,147,26,.08)', borderRadius: 6, fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, color: '#7A6040', lineHeight: 1.5, borderLeft: '2px solid #C9931A' }}>
                  {tmpl.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/* ================================================================== */
/*  SECTION 9: QUICK REFERENCE CARDS                                   */
/* ================================================================== */

export function QuickRefSection() {
  const cards = [
    {
      agent: 'Cleo',
      role: 'Video & Content Production',
      rows: [
        { key: 'Grade', val: 'Warm. Golden hour feeling. Not orange-filtered -- naturally warm.' },
        { key: 'Music', val: 'Acoustic, folk-adjacent, instrumental. No EDM. No overproduced.' },
        { key: 'Overlays', val: 'Forest green panels, gold accent bars. Playfair Display for names.' },
        { key: 'Client ID', val: 'First name only. Branch of service. City only -- no address.' },
        { key: 'Cuts', val: 'Slow on emotional beats. Medium pace on explainers. No fast cuts.' },
        { key: 'B-roll', val: 'Keys. Front doors. Mailboxes. Neighborhoods. Hands on paperwork.' },
      ],
    },
    {
      agent: 'Tony',
      role: 'Social Media Management',
      rows: [
        { key: 'Pillars', val: '35% stories / 30% education / 20% community / 15% BTS.' },
        { key: 'Voice', val: 'Warm but direct. No hero language. No exclamation points in body copy.' },
        { key: 'Hashtags', val: 'Always: #ValorToVictory #VALoans #VeteranHomeownership. Add 3-5 contextual.' },
        { key: 'Consent', val: 'Written sign-off required before any client name or photo posts.' },
        { key: 'Engage', val: 'Respond to all comments within 4 hours on client story posts.' },
        { key: 'Stats', val: 'VA.gov or HUD source only. Screenshot the source before posting.' },
      ],
    },
    {
      agent: 'Bobby',
      role: 'Web & Build',
      rows: [
        { key: 'Colors', val: '#1B4332 deep / #2D6A4F mid / #C9931A gold / #F4B942 amber / #F5F0E8 cream' },
        { key: 'Display', val: 'Playfair Display 900 for headlines. Never below 700 weight.' },
        { key: 'Body', val: 'Source Sans 3. Light (300) for large text, Regular (400) body, Semi (600) labels.' },
        { key: 'Radius', val: '8px buttons/inputs. 10px cards. 16px large panels.' },
        { key: 'Dark bg', val: '#1B4332 with gold-bright (#F4B942) text. Never white on deep green.' },
        { key: 'NO', val: 'Navy blue. Copper tones. Condensed sans-serif headlines. Those are S3C.' },
      ],
    },
  ]

  return (
    <>
      <div className="vs-divider" />
      <div className="vs-section vs-section-cream" id="vs-quickref">
        <div className="vs-max">
          <div className="vs-section-eyebrow">Section 09</div>
          <h2 className="vs-section-title">Quick Reference Cards</h2>
          <p className="vs-section-subtitle">
            One card per agent. The essentials for working on V2V without reading the full guidelines. Pin these.
          </p>

          <div className="vs-grid-3">
            {cards.map((card, i) => (
              <div className="vs-ref-card" key={i}>
                <div className="vs-ref-card-header">
                  <div>
                    <div className="vs-ref-card-agent">{card.agent}</div>
                    <div className="vs-ref-card-role">{card.role}</div>
                  </div>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(244,185,66,.15)', border: '1px solid rgba(244,185,66,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 11, fontWeight: 700, color: '#F4B942' }}>{card.agent.slice(0, 1)}</span>
                  </div>
                </div>
                <div className="vs-ref-card-body">
                  {card.rows.map((row, j) => (
                    <div className="vs-ref-card-row" key={j}>
                      <span className="vs-ref-card-key">{row.key}</span>
                      <span>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Color quick ref */}
          <div className="vs-card-gold" style={{ marginTop: 32, padding: 28 }}>
            <div className="vs-label" style={{ marginBottom: 16 }}>Brand Colors -- All Agents</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {[
                { hex: '#1B4332', name: 'Forest Green', role: 'Primary' },
                { hex: '#2D6A4F', name: 'Deep Green', role: 'Secondary' },
                { hex: '#C9931A', name: 'Honor Gold', role: 'Accent' },
                { hex: '#F4B942', name: 'Bright Amber', role: 'On dark backgrounds' },
                { hex: '#F5F0E8', name: 'Warm Cream', role: 'Background' },
              ].map((swatch, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: swatch.hex, border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 12, fontWeight: 600, color: '#1A1208' }}>{swatch.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#7A6040' }}>{swatch.hex}</div>
                    <div style={{ fontFamily: "'Source Sans 3', sans-serif", fontSize: 10, color: '#7A6040', letterSpacing: '.04em' }}>{swatch.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ================================================================== */
/*  ASSEMBLED EXPORT: all sections together                            */
/* ================================================================== */

export default function ValorBrandSections() {
  return (
    <div style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <style>{CSS_VALOR_SECTIONS}</style>
      <div className="vs-root">
        <PhotographySection />
        <VoiceSection />
        <SocialSection />
        <ApplicationSection />
        <QuickRefSection />
      </div>
    </div>
  )
}
