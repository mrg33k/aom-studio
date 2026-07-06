import{j as e,r as c}from"./vendor-react-bZQjhHqv.js";import"./vendor-4x6F6tyV.js";const x=`
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
`,r={seal:"/images/s3c/c03-circular-seal-nobg.png",monogram:"/images/s3c/c01-angular-monogram-nobg.png",badge:"/images/s3c/c02-hexagonal-badge-nobg.png"};function d({swatches:s}){return e.jsx("div",{className:"s3c-palette-grid",children:s.map(({bg:i,name:t,hex:a,border:n})=>e.jsxs("div",{className:"s3c-palette-item",children:[e.jsx("div",{className:"s3c-palette-chip",style:{background:i,borderColor:n||"rgba(255,255,255,0.06)"}}),e.jsx("div",{className:"s3c-palette-name",children:t}),e.jsx("div",{className:"s3c-palette-hex",children:a})]},a))})}function m({src:s,alt:i}){const t=[{w:32,label:"32px",sub:"favicon / app icon"},{w:64,label:"64px",sub:"email / mobile"},{w:120,label:"120px",sub:"letterhead / web"},{w:200,label:"200px",sub:"cover / print"}];return e.jsx("div",{className:"s3c-size-row",children:t.map(({w:a,label:n,sub:l})=>e.jsxs("div",{className:"s3c-size-item",children:[e.jsx("img",{src:s,width:a,height:a,alt:`${i} ${a}px`}),e.jsxs("div",{className:"s3c-size-label",children:[n,e.jsx("br",{}),e.jsx("span",{className:"s3c-size-sublabel",children:l})]})]},a))})}function p({src:s,alt:i}){return e.jsxs("div",{className:"s3c-bg-mockups",children:[e.jsxs("div",{className:"s3c-bg-mockup s3c-bg-dark",children:[e.jsx("img",{src:s,alt:`${i} on dark`}),e.jsxs("div",{children:[e.jsx("div",{className:"s3c-bg-mockup-label",children:"Dark"}),e.jsx("div",{className:"s3c-bg-mockup-hex",children:"#0a0e1a"})]})]}),e.jsxs("div",{className:"s3c-bg-mockup s3c-bg-white",children:[e.jsx("img",{src:s,alt:`${i} on white`}),e.jsxs("div",{children:[e.jsx("div",{className:"s3c-bg-mockup-label",children:"White"}),e.jsx("div",{className:"s3c-bg-mockup-hex",children:"#ffffff"})]})]}),e.jsxs("div",{className:"s3c-bg-mockup s3c-bg-warmgray",children:[e.jsx("img",{src:s,alt:`${i} on warm gray`}),e.jsxs("div",{children:[e.jsx("div",{className:"s3c-bg-mockup-label",children:"Warm Gray"}),e.jsx("div",{className:"s3c-bg-mockup-hex",children:"#e8e2d9"})]})]})]})}function b(){const[s,i]=c.useState(""),[t,a]=c.useState("idle"),[n,l]=c.useState("");async function f(o){if(o.preventDefault(),!s.trim()||!s.includes("@")){l("Please enter a valid email address.");return}a("loading"),l("");try{const g=await fetch("/api/referrals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:s.trim(),source:"s3c-brand-page"})}),h=await g.json();g.ok?a("done"):(l(h.error||"Something went wrong. Try again."),a("idle"))}catch{l("Network error. Please try again."),a("idle")}}return t==="done"?e.jsxs("div",{children:[e.jsx("div",{className:"s3c-referral-thanks",children:"Thank you."}),e.jsx("div",{className:"s3c-referral-thanks-sub",children:"We'll be in touch with them."})]}):e.jsxs("form",{onSubmit:f,children:[e.jsxs("div",{className:"s3c-referral-form",children:[e.jsx("input",{className:"s3c-referral-input",type:"email",placeholder:"their@email.com",value:s,onChange:o=>i(o.target.value),disabled:t==="loading"}),e.jsx("button",{className:"s3c-referral-btn",type:"submit",disabled:t==="loading",children:t==="loading"?"Sending...":"Send"})]}),n&&e.jsx("div",{className:"s3c-referral-error",children:n})]})}function v(){return e.jsxs("div",{className:"s3c-root s3c-page",children:[e.jsx("style",{children:x}),e.jsxs("div",{className:"s3c-page-inner",children:[e.jsxs("div",{className:"s3c-masthead",children:[e.jsx("div",{className:"s3c-masthead-label",children:"Brand Identity Exploration"}),e.jsxs("div",{className:"s3c-masthead-title",children:["Semiconductor Services & Supply Coalition",e.jsx("br",{}),e.jsx("span",{children:"S3C — Logo Round 3"})]}),e.jsxs("div",{className:"s3c-masthead-meta",children:[e.jsxs("div",{className:"s3c-meta-item",children:[e.jsx("div",{className:"s3c-meta-label",children:"Client"}),e.jsx("div",{className:"s3c-meta-value",children:"Ben / S3C"})]}),e.jsxs("div",{className:"s3c-meta-item",children:[e.jsx("div",{className:"s3c-meta-label",children:"Direction"}),e.jsx("div",{className:"s3c-meta-value",children:"Institutional Authority + Arizona Identity"})]}),e.jsxs("div",{className:"s3c-meta-item",children:[e.jsx("div",{className:"s3c-meta-label",children:"Round"}),e.jsx("div",{className:"s3c-meta-value",children:"3 of 3 Finalists"})]}),e.jsxs("div",{className:"s3c-meta-item",children:[e.jsx("div",{className:"s3c-meta-label",children:"Date"}),e.jsx("div",{className:"s3c-meta-value",children:"March 2026"})]})]})]}),e.jsxs("div",{className:"s3c-option-section",children:[e.jsxs("div",{className:"s3c-option-header",children:[e.jsx("div",{className:"s3c-option-number",children:"Option 01"}),e.jsx("div",{className:"s3c-option-name",children:"C03 — Circular Seal"}),e.jsx("div",{className:"s3c-favorite-badge",children:"Recommended"})]}),e.jsxs("div",{className:"s3c-hero-logo s3c-hero-a",children:[e.jsx("img",{src:r.seal,alt:"S3C Circular Seal"}),e.jsx("div",{className:"s3c-hero-logo-label",children:"C03 — Circular Seal"})]}),e.jsxs("div",{className:"s3c-palette-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Color Palette"}),e.jsx(d,{swatches:[{bg:"#0B1C3E",name:"Deep Navy",hex:"#0B1C3E"},{bg:"#B87333",name:"Copper",hex:"#B87333"},{bg:"#D4A853",name:"Warm Gold",hex:"#D4A853"},{bg:"#F5F0E8",name:"Cream",hex:"#F5F0E8",border:"rgba(0,0,0,0.08)"},{bg:"#8A8078",name:"Warm Gray",hex:"#8A8078"},{bg:"#1E2D42",name:"Charcoal Navy",hex:"#1E2D42"}]})]}),e.jsxs("div",{className:"s3c-font-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Font Pairing"}),e.jsxs("div",{className:"s3c-font-cards",children:[e.jsxs("div",{className:"s3c-font-card",children:[e.jsx("div",{className:"s3c-font-role",children:"Display / Headings"}),e.jsx("div",{className:"s3c-font-name-display",children:"Playfair Display"}),e.jsx("div",{className:"s3c-font-sample-heading",style:{fontFamily:"'Playfair Display', serif",fontSize:28,color:"#eeeae4",fontWeight:400},children:"Arizona's Industrial Coalition"}),e.jsxs("div",{className:"s3c-font-weights",children:[e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Playfair Display', serif",fontWeight:400},children:"Regular"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Playfair Display', serif",fontWeight:600},children:"Semibold"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Playfair Display', serif",fontStyle:"italic",fontWeight:400},children:"Italic"})]})]}),e.jsxs("div",{className:"s3c-font-card",children:[e.jsx("div",{className:"s3c-font-role",children:"Body / Supporting Text"}),e.jsx("div",{className:"s3c-font-name-display",children:"Source Serif 4"}),e.jsx("div",{className:"s3c-font-sample-heading",style:{fontFamily:"'Source Serif 4', serif",fontSize:18,color:"#eeeae4",fontWeight:400,lineHeight:1.4},children:"Connecting suppliers, builders, and buyers across the supply chain."}),e.jsxs("div",{className:"s3c-font-weights",children:[e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Source Serif 4', serif",fontWeight:300},children:"Light"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Source Serif 4', serif",fontWeight:400},children:"Regular"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Source Serif 4', serif",fontStyle:"italic",fontWeight:300},children:"Italic"})]})]})]}),e.jsxs("div",{className:"s3c-font-sample-paragraph",children:[e.jsx("div",{className:"s3c-sample-headline",style:{fontFamily:"'Playfair Display', serif",fontSize:22,fontWeight:600,color:"#eeeae4",letterSpacing:"-0.01em"},children:"Semiconductor Services & Supply Coalition"}),e.jsx("div",{className:"s3c-sample-body",style:{fontFamily:"'Source Serif 4', serif",fontSize:15,fontWeight:300,color:"rgba(238,234,228,0.65)"},children:"S3C is Arizona's premier coalition connecting semiconductor manufacturers, equipment suppliers, and industrial service providers. We facilitate the contracts, partnerships, and procurement relationships that keep the region's supply chain moving. Membership opens doors — to qualified buyers, pre-vetted suppliers, and the policy table."})]})]}),e.jsxs("div",{className:"s3c-size-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Size Range"}),e.jsx(m,{src:r.seal,alt:"S3C Circular Seal"})]}),e.jsxs("div",{className:"s3c-bg-section",children:[e.jsx("div",{className:"s3c-section-label",children:"On Background"}),e.jsx(p,{src:r.seal,alt:"S3C Circular Seal"})]})]}),e.jsx("hr",{className:"s3c-section-divider"}),e.jsxs("div",{className:"s3c-option-section",children:[e.jsxs("div",{className:"s3c-option-header",children:[e.jsx("div",{className:"s3c-option-number",children:"Option 02"}),e.jsx("div",{className:"s3c-option-name",children:"C01 — Angular Monogram"})]}),e.jsxs("div",{className:"s3c-hero-logo s3c-hero-b",children:[e.jsx("img",{src:r.monogram,alt:"S3C Angular Monogram"}),e.jsx("div",{className:"s3c-hero-logo-label",children:"C01 — Angular Monogram"})]}),e.jsxs("div",{className:"s3c-palette-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Color Palette"}),e.jsx(d,{swatches:[{bg:"#0D1B2E",name:"Midnight Navy",hex:"#0D1B2E"},{bg:"#A0522D",name:"Aged Copper",hex:"#A0522D"},{bg:"#3D5A80",name:"Slate Blue",hex:"#3D5A80"},{bg:"#EDE8DF",name:"Parchment",hex:"#EDE8DF",border:"rgba(0,0,0,0.08)"},{bg:"#7A8696",name:"Steel Gray",hex:"#7A8696"},{bg:"#2C3442",name:"Gunmetal",hex:"#2C3442"}]})]}),e.jsxs("div",{className:"s3c-font-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Font Pairing"}),e.jsxs("div",{className:"s3c-font-cards",children:[e.jsxs("div",{className:"s3c-font-card",children:[e.jsx("div",{className:"s3c-font-role",children:"Display / Headings"}),e.jsx("div",{className:"s3c-font-name-display",children:"Libre Baskerville"}),e.jsx("div",{className:"s3c-font-sample-heading",style:{fontFamily:"'Libre Baskerville', serif",fontSize:26,color:"#eeeae4",fontWeight:700,letterSpacing:"-0.01em"},children:"Built on Arizona Ground"}),e.jsxs("div",{className:"s3c-font-weights",children:[e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Libre Baskerville', serif",fontWeight:400},children:"Regular"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Libre Baskerville', serif",fontWeight:700},children:"Bold"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Libre Baskerville', serif",fontStyle:"italic",fontWeight:400},children:"Italic"})]})]}),e.jsxs("div",{className:"s3c-font-card",children:[e.jsx("div",{className:"s3c-font-role",children:"Body / Supporting Text"}),e.jsx("div",{className:"s3c-font-name-display",children:"Lato"}),e.jsx("div",{className:"s3c-font-sample-heading",style:{fontFamily:"'Lato', sans-serif",fontSize:17,color:"#eeeae4",fontWeight:300,lineHeight:1.5},children:"Access qualified suppliers and enterprise buyers across the semiconductor industry."}),e.jsxs("div",{className:"s3c-font-weights",children:[e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Lato', sans-serif",fontWeight:300},children:"Light"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Lato', sans-serif",fontWeight:400},children:"Regular"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Lato', sans-serif",fontWeight:700},children:"Bold"})]})]})]}),e.jsxs("div",{className:"s3c-font-sample-paragraph",children:[e.jsx("div",{className:"s3c-sample-headline",style:{fontFamily:"'Libre Baskerville', serif",fontSize:21,fontWeight:700,color:"#eeeae4",letterSpacing:"-0.01em",marginBottom:12},children:"Semiconductor Services & Supply Coalition"}),e.jsx("div",{className:"s3c-sample-body",style:{fontFamily:"'Lato', sans-serif",fontSize:15,fontWeight:300,color:"rgba(238,234,228,0.65)",lineHeight:1.7},children:"S3C is Arizona's premier coalition connecting semiconductor manufacturers, equipment suppliers, and industrial service providers. We facilitate the contracts, partnerships, and procurement relationships that keep the region's supply chain moving. Membership opens doors — to qualified buyers, pre-vetted suppliers, and the policy table."})]})]}),e.jsxs("div",{className:"s3c-size-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Size Range"}),e.jsx(m,{src:r.monogram,alt:"S3C Angular Monogram"})]}),e.jsxs("div",{className:"s3c-bg-section",children:[e.jsx("div",{className:"s3c-section-label",children:"On Background"}),e.jsx(p,{src:r.monogram,alt:"S3C Angular Monogram"})]})]}),e.jsx("hr",{className:"s3c-section-divider"}),e.jsxs("div",{className:"s3c-option-section",children:[e.jsxs("div",{className:"s3c-option-header",children:[e.jsx("div",{className:"s3c-option-number",children:"Option 03"}),e.jsx("div",{className:"s3c-option-name",children:"C02 — Hexagonal Badge"})]}),e.jsxs("div",{className:"s3c-hero-logo s3c-hero-c",children:[e.jsx("img",{src:r.badge,alt:"S3C Hexagonal Badge"}),e.jsx("div",{className:"s3c-hero-logo-label",children:"C02 — Hexagonal Badge"})]}),e.jsxs("div",{className:"s3c-palette-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Color Palette"}),e.jsx(d,{swatches:[{bg:"#0A1628",name:"Navy Blue",hex:"#0A1628"},{bg:"#CD7F32",name:"Bronze",hex:"#CD7F32"},{bg:"#C9963B",name:"Amber Gold",hex:"#C9963B"},{bg:"#F0EBE1",name:"Off-White",hex:"#F0EBE1",border:"rgba(0,0,0,0.08)"},{bg:"#6B7680",name:"Mid Gray",hex:"#6B7680"},{bg:"#1A2E3B",name:"Deep Teal",hex:"#1A2E3B"}]})]}),e.jsxs("div",{className:"s3c-font-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Font Pairing"}),e.jsxs("div",{className:"s3c-font-cards",children:[e.jsxs("div",{className:"s3c-font-card",children:[e.jsx("div",{className:"s3c-font-role",children:"Display / Headings"}),e.jsx("div",{className:"s3c-font-name-display",children:"Cormorant Garamond"}),e.jsx("div",{className:"s3c-font-sample-heading",style:{fontFamily:"'Cormorant Garamond', serif",fontSize:30,color:"#eeeae4",fontWeight:500,letterSpacing:"0.02em",lineHeight:1.2},children:"Supply Chain Authority"}),e.jsxs("div",{className:"s3c-font-weights",children:[e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Cormorant Garamond', serif",fontWeight:300},children:"Light"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Cormorant Garamond', serif",fontWeight:500},children:"Medium"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Cormorant Garamond', serif",fontStyle:"italic",fontWeight:300},children:"Light Italic"})]})]}),e.jsxs("div",{className:"s3c-font-card",children:[e.jsx("div",{className:"s3c-font-role",children:"Body / Supporting Text"}),e.jsx("div",{className:"s3c-font-name-display",children:"Inter"}),e.jsx("div",{className:"s3c-font-sample-heading",style:{fontFamily:"'Inter', sans-serif",fontSize:15,color:"#eeeae4",fontWeight:300,lineHeight:1.6,letterSpacing:"0.01em"},children:"Structured access to the semiconductor supply chain. Contracts, partnerships, sourcing — all in one coalition."}),e.jsxs("div",{className:"s3c-font-weights",children:[e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Inter', sans-serif",fontWeight:300},children:"Light"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Inter', sans-serif",fontWeight:400},children:"Regular"}),e.jsx("span",{className:"s3c-font-weight-sample",style:{fontFamily:"'Inter', sans-serif",fontWeight:500},children:"Medium"})]})]})]}),e.jsxs("div",{className:"s3c-font-sample-paragraph",children:[e.jsx("div",{className:"s3c-sample-headline",style:{fontFamily:"'Cormorant Garamond', serif",fontSize:24,fontWeight:600,color:"#eeeae4",letterSpacing:"0.01em",marginBottom:12},children:"Semiconductor Services & Supply Coalition"}),e.jsx("div",{className:"s3c-sample-body",style:{fontFamily:"'Inter', sans-serif",fontSize:14,fontWeight:300,color:"rgba(238,234,228,0.65)",lineHeight:1.75,letterSpacing:"0.01em"},children:"S3C is Arizona's premier coalition connecting semiconductor manufacturers, equipment suppliers, and industrial service providers. We facilitate the contracts, partnerships, and procurement relationships that keep the region's supply chain moving. Membership opens doors — to qualified buyers, pre-vetted suppliers, and the policy table."})]})]}),e.jsxs("div",{className:"s3c-size-section",children:[e.jsx("div",{className:"s3c-section-label",children:"Size Range"}),e.jsx(m,{src:r.badge,alt:"S3C Hexagonal Badge"})]}),e.jsxs("div",{className:"s3c-bg-section",children:[e.jsx("div",{className:"s3c-section-label",children:"On Background"}),e.jsx(p,{src:r.badge,alt:"S3C Hexagonal Badge"})]})]}),e.jsxs("div",{className:"s3c-referral",children:[e.jsx("div",{className:"s3c-referral-eyebrow",children:"Referral"}),e.jsx("div",{className:"s3c-referral-title",children:"Know someone that needs a killer brand creation experience?"}),e.jsx("div",{className:"s3c-referral-sub",children:"Send them our way"}),e.jsx(b,{}),e.jsxs("div",{style:{marginTop:40},children:[e.jsx("div",{className:"s3c-aom-logo-wrap",children:e.jsx("img",{src:"/brand/aom-mono-white.svg",alt:"AOM"})}),e.jsx("div",{className:"s3c-aom-url",children:"aheadofmarket.com"})]})]}),e.jsxs("div",{className:"s3c-footer",children:[e.jsx("div",{className:"s3c-footer-left",children:"S3C — Brand Identity Round 3"}),e.jsx("div",{className:"s3c-footer-right",children:"Prepared by AOM Studio — March 2026"})]})]})]})}export{v as default};
