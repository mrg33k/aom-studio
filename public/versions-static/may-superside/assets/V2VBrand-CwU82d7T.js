import{j as e,r as o}from"./vendor-react-bZQjhHqv.js";import"./vendor-4x6F6tyV.js";const m=`
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
  .v2v-symbolism li::before { content: "— "; color: var(--gold); }

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
`;function h(){const[a,c]=o.useState(""),[r,i]=o.useState("idle"),[n,s]=o.useState("");async function v(l){if(l.preventDefault(),!a.trim()||!a.includes("@")){s("Please enter a valid email address.");return}i("loading"),s("");try{const t=await fetch("/api/referrals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:a.trim(),source:"v2v-brand-page"})}),d=await t.json();t.ok?i("done"):(s(d.error||"Something went wrong. Try again."),i("idle"))}catch{s("Network error. Please try again."),i("idle")}}return r==="done"?e.jsxs("div",{children:[e.jsx("div",{className:"v2v-referral-thanks",children:"Thank you."}),e.jsx("div",{className:"v2v-referral-thanks-sub",children:"We'll be in touch with them."})]}):e.jsxs("form",{onSubmit:v,children:[e.jsxs("div",{className:"v2v-referral-form",children:[e.jsx("input",{className:"v2v-referral-input",type:"email",placeholder:"their@email.com",value:a,onChange:l=>c(l.target.value),disabled:r==="loading"}),e.jsx("button",{className:"v2v-referral-btn",type:"submit",disabled:r==="loading",children:r==="loading"?"Sending...":"Send"})]}),n&&e.jsx("div",{className:"v2v-referral-error",children:n})]})}function g(){return e.jsxs("div",{className:"v2v-root v2v-page",children:[e.jsx("style",{children:m}),e.jsxs("div",{className:"v2v-header",children:[e.jsx("div",{className:"v2v-header-label",children:"Brand Identity — Round 2"}),e.jsx("h1",{children:"Valor to Victory"}),e.jsx("p",{children:"Veteran homeownership. A new direction — patriotic warmth, not corporate institution."}),e.jsx("span",{className:"v2v-vs-badge",children:"Green + Gold Edition — Not Navy + Copper"})]}),e.jsxs("div",{className:"v2v-palette-section",children:[e.jsx("h3",{children:"Color System"}),e.jsx("div",{className:"v2v-swatches",children:[{hex:"#1B4332",name:"Forest Green",code:"#1B4332"},{hex:"#2D6A4F",name:"Deep Green",code:"#2D6A4F"},{hex:"#C9931A",name:"Honor Gold",code:"#C9931A"},{hex:"#F4B942",name:"Bright Amber",code:"#F4B942"},{hex:"#F5F0E8",name:"Warm Cream",code:"#F5F0E8"},{hex:"#FDFAF5",name:"Warm White",code:"#FDFAF5"}].map(a=>e.jsxs("div",{className:"v2v-swatch",children:[e.jsx("div",{className:"v2v-swatch-color",style:{background:a.hex}}),e.jsxs("div",{className:"v2v-swatch-label",children:[a.name,e.jsx("br",{}),a.code]})]},a.hex))}),e.jsxs("div",{className:"v2v-vs-note",children:[e.jsx("strong",{children:"Not navy + copper."})," That's S3C territory — a trade coalition. V2V is a veteran's journey home. Green = growth + land + hope. Gold = honor + valor."]})]}),e.jsxs("div",{className:"v2v-section",children:[e.jsxs("div",{className:"v2v-section-meta",children:[e.jsx("div",{className:"v2v-section-num",children:"1"}),e.jsxs("div",{children:[e.jsxs("div",{className:"v2v-section-title",children:["Eagle + Key Shield ",e.jsx("span",{className:"v2v-recommended-tag",children:"Recommended"})]}),e.jsx("div",{className:"v2v-section-sub",children:"Eagle over ornate key, inside a pointed shield — most versatile mark"})]})]}),e.jsxs("div",{className:"v2v-logo-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v2v-logo-display",children:e.jsx("img",{src:"/images/v2v/nobg/c01.png",alt:"Eagle Key Shield"})}),e.jsxs("div",{className:"v2v-mock-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-dark",children:e.jsx("img",{src:"/images/v2v/nobg/c01.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Green"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-cream",children:e.jsx("img",{src:"/images/v2v/nobg/c01.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Cream"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-gold",children:e.jsx("img",{src:"/images/v2v/nobg/c01.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Gold"})]})]})]}),e.jsxs("div",{className:"v2v-logo-info",children:[e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Palette"}),e.jsx("div",{className:"v2v-palette-mini",children:[{hex:"#1B4332",label:"Forest"},{hex:"#C9931A",label:"Gold"},{hex:"#F5F0E8",label:"Cream"}].map(a=>e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mini-swatch",style:{background:a.hex}}),e.jsx("div",{className:"v2v-mini-swatch-label",children:a.label})]},a.hex))})]}),e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Typography"}),e.jsxs("div",{className:"v2v-font-sample",children:[e.jsx("div",{className:"v2v-font-name",children:"Playfair Display 900 + Source Sans 3 Regular"}),e.jsx("div",{className:"v2v-font-headline",children:"Valor to Victory"}),e.jsx("div",{className:"v2v-font-body",children:"Helping veterans achieve the homeownership they've earned."}),e.jsx("div",{className:"v2v-font-alt",children:"VETERAN HOMEOWNERSHIP MISSION"})]})]}),e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Symbolism"}),e.jsxs("ul",{className:"v2v-symbolism",children:[e.jsx("li",{children:"Eagle atop the mark — freedom, vigilance, American pride"}),e.jsx("li",{children:"Ornate key — unlocking homeownership, earned access"}),e.jsx("li",{children:"Shield form — protection through service honored"}),e.jsx("li",{children:"Green foundation — prosperity, growth, land ownership"})]})]})]})]})]}),e.jsxs("div",{className:"v2v-section",children:[e.jsxs("div",{className:"v2v-section-meta",children:[e.jsx("div",{className:"v2v-section-num",children:"2"}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-section-title",children:"The Threshold"}),e.jsx("div",{className:"v2v-section-sub",children:"Open door + eagle + sunlight — the veteran's journey home made visual"})]})]}),e.jsxs("div",{className:"v2v-logo-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v2v-logo-display",children:e.jsx("img",{src:"/images/v2v/nobg/c05.png",alt:"Door Threshold"})}),e.jsxs("div",{className:"v2v-mock-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-dark",children:e.jsx("img",{src:"/images/v2v/nobg/c05.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Green"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-cream",children:e.jsx("img",{src:"/images/v2v/nobg/c05.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Cream"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-gold",children:e.jsx("img",{src:"/images/v2v/nobg/c05.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Gold"})]})]})]}),e.jsxs("div",{className:"v2v-logo-info",children:[e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Palette"}),e.jsx("div",{className:"v2v-palette-mini",children:[{hex:"#2D6A4F",label:"Deep"},{hex:"#F4B942",label:"Amber"},{hex:"#F5F0E8",label:"Light"}].map(a=>e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mini-swatch",style:{background:a.hex}}),e.jsx("div",{className:"v2v-mini-swatch-label",children:a.label})]},a.hex))})]}),e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Typography"}),e.jsxs("div",{className:"v2v-font-sample",children:[e.jsx("div",{className:"v2v-font-name",children:"Libre Baskerville 700 + Source Sans 3 300"}),e.jsx("div",{className:"v2v-font-headline",style:{fontFamily:"'Libre Baskerville', serif",fontSize:"24px"},children:"Valor to Victory"}),e.jsx("div",{className:"v2v-font-body",style:{fontWeight:300},children:"From service to a place called home."}),e.jsx("div",{className:"v2v-font-alt",children:"VA LOANS · EDUCATION · GUIDANCE"})]})]}),e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Symbolism"}),e.jsxs("ul",{className:"v2v-symbolism",children:[e.jsx("li",{children:"Open door — the moment of arrival, new chapter beginning"}),e.jsx("li",{children:"Sunlight rays through door — hope, warmth after service"}),e.jsx("li",{children:"Eagle flying through — freedom meets homecoming"}),e.jsx("li",{children:"Trees at base — roots, stability, finally home"})]})]})]})]})]}),e.jsxs("div",{className:"v2v-section",children:[e.jsxs("div",{className:"v2v-section-meta",children:[e.jsx("div",{className:"v2v-section-num",children:"3"}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-section-title",children:"V2V Eagle Shield"}),e.jsx("div",{className:"v2v-section-sub",children:"Shield with eagle portrait + V2V monogram — cleanest digital mark"})]})]}),e.jsxs("div",{className:"v2v-logo-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v2v-logo-display",children:e.jsx("img",{src:"/images/v2v/nobg/c07.png",alt:"V2V Shield Eagle"})}),e.jsxs("div",{className:"v2v-mock-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-dark",children:e.jsx("img",{src:"/images/v2v/nobg/c07.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Green"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-cream",children:e.jsx("img",{src:"/images/v2v/nobg/c07.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Cream"})]}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mock-gold",children:e.jsx("img",{src:"/images/v2v/nobg/c07.png",alt:""})}),e.jsx("div",{className:"v2v-mock-label",children:"On Gold"})]})]})]}),e.jsxs("div",{className:"v2v-logo-info",children:[e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Palette"}),e.jsx("div",{className:"v2v-palette-mini",children:[{hex:"#1B4332",label:"Forest"},{hex:"#C9931A",label:"Gold"},{hex:"#FDFAF5",label:"White"}].map(a=>e.jsxs("div",{children:[e.jsx("div",{className:"v2v-mini-swatch",style:{background:a.hex}}),e.jsx("div",{className:"v2v-mini-swatch-label",children:a.label})]},a.hex))})]}),e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Typography"}),e.jsxs("div",{className:"v2v-font-sample",children:[e.jsx("div",{className:"v2v-font-name",children:"Playfair Display 700 + Source Sans 3 600"}),e.jsx("div",{className:"v2v-font-headline",children:"Valor to Victory"}),e.jsx("div",{className:"v2v-font-body",style:{fontWeight:600,fontSize:"11px",letterSpacing:".12em",textTransform:"uppercase",marginTop:"4px"},children:"Veteran Homeownership"})]})]}),e.jsxs("div",{className:"v2v-info-block",children:[e.jsx("h4",{children:"Symbolism"}),e.jsxs("ul",{className:"v2v-symbolism",children:[e.jsx("li",{children:"Shield silhouette — protection, military honor, defense"}),e.jsx("li",{children:"Eagle portrait — strength, American pride, authority"}),e.jsx("li",{children:"V2V monogram — memorable shorthand, badge-ready"}),e.jsx("li",{children:"Key at base of shield — access, earned right to a home"})]})]})]})]})]}),e.jsxs("div",{className:"v2v-compare-section",children:[e.jsx("h3",{children:"Why This Is Not S3C"}),e.jsx("p",{className:"v2v-compare-sub",children:"Both are client brands. They need to feel completely different. Here's the separation."}),e.jsxs("div",{className:"v2v-compare-table",children:[e.jsx("div",{className:"v2v-col-header v2v-s3c-col",children:"S3C — Trade Coalition"}),e.jsx("div",{className:"v2v-col-header v2v-v2v-col",children:"V2V — Veteran Nonprofit"}),e.jsxs("div",{className:"v2v-compare-cell s3c",children:[e.jsx("strong",{children:"Palette"}),"Navy blue + copper. Institutional, transactional."]}),e.jsxs("div",{className:"v2v-compare-cell v2v-r",children:[e.jsx("strong",{children:"Palette"}),"Forest green + honor gold. Growth, prosperity, warmth."]}),e.jsxs("div",{className:"v2v-compare-cell s3c",children:[e.jsx("strong",{children:"Vibe"}),"Corporate authority. A seat at the table. Trade power."]}),e.jsxs("div",{className:"v2v-compare-cell v2v-r",children:[e.jsx("strong",{children:"Vibe"}),"Patriotic warmth. A veteran's journey home. Human."]}),e.jsxs("div",{className:"v2v-compare-cell s3c",children:[e.jsx("strong",{children:"Typography"}),"Condensed sans-serif. Sharp, precise, technical."]}),e.jsxs("div",{className:"v2v-compare-cell v2v-r",children:[e.jsx("strong",{children:"Typography"}),"Warm serif (Playfair/Baskerville). Dignified, personal."]}),e.jsxs("div",{className:"v2v-compare-cell s3c",children:[e.jsx("strong",{children:"Symbol"}),"Diamond geometry. Industrial. Semiconductor wafer."]}),e.jsxs("div",{className:"v2v-compare-cell v2v-r",children:[e.jsx("strong",{children:"Symbol"}),"Eagle + key + shield + door. Freedom, access, home."]}),e.jsxs("div",{className:"v2v-compare-cell s3c",children:[e.jsx("strong",{children:"Audience"}),"C-suite. Policy. Trade negotiators. Arizona legislators."]}),e.jsxs("div",{className:"v2v-compare-cell v2v-r",children:[e.jsx("strong",{children:"Audience"}),"Veterans and families. VA loan seekers. People."]})]})]}),e.jsxs("div",{className:"v2v-section",style:{paddingBottom:"48px"},children:[e.jsxs("div",{className:"v2v-section-meta",children:[e.jsx("div",{className:"v2v-section-num",children:"+"}),e.jsxs("div",{children:[e.jsx("div",{className:"v2v-section-title",children:"All Round 2 Concepts"}),e.jsx("div",{className:"v2v-section-sub",children:"9 concepts generated — green + gold, distinctly not navy + copper"})]})]}),e.jsx("div",{className:"v2v-concepts-grid",children:[{file:"c01",label:"C01 — Eagle Key Shield"},{file:"c02",label:"C02 — Shield + House Keys"},{file:"c03",label:"C03 — Eagle Wing V"},{file:"c04",label:"C04 — Eagle Carries Key"},{file:"c05",label:"C05 — The Threshold"},{file:"c06",label:"C06 — Circular Badge"},{file:"c07",label:"C07 — V2V Eagle Shield"},{file:"c08",label:"C08 — Eagle + House Wings"},{file:"c09",label:"C09 — V Wings + Shield Star"}].map(a=>e.jsxs("div",{className:"v2v-concept-card",children:[e.jsx("img",{src:`/images/v2v/${a.file}.png`,alt:a.label}),e.jsx("div",{className:"v2v-concept-label",children:a.label})]},a.file))})]}),e.jsxs("div",{className:"v2v-cta-section",children:[e.jsx("div",{className:"v2v-referral-eyebrow",children:"Powered by AOM Studio"}),e.jsx("div",{className:"v2v-referral-title",children:"Your brand deserves this."}),e.jsx("p",{className:"v2v-referral-sub",children:"AOM builds brand identities that look like they cost 10x more. Know a veteran-owned organization or nonprofit that needs a brand like this?"}),e.jsx(h,{}),e.jsxs("div",{className:"v2v-cta-footer",children:["aheadofmarket.com — ",e.jsx("a",{href:"mailto:patrik@aheadofmarket.com",children:"patrik@aheadofmarket.com"})]})]})]})}export{g as default};
