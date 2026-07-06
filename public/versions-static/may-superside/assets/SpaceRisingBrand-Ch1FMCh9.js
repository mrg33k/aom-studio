import{r as l,j as e}from"./vendor-react-bZQjhHqv.js";import"./vendor-4x6F6tyV.js";const m=`
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

  .sr-page { box-sizing: border-box; }
  .sr-page *, .sr-page *::before, .sr-page *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .sr-root {
    --black: #080808;
    --surface: #121212;
    --surface2: #1A1A1A;
    --surface3: #2A2A2A;
    --orange: #E5451F;
    --white: #FFFFFF;
    --gray: #999;
    --gray-l: #CCCCCC;
    --silver: #C0C0C0;
    --space-blue: #1B2A4A;
    --border: #1E1E1E;
    background: var(--black);
    color: var(--white);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    line-height: 1.6;
    min-height: 100vh;
  }

  .sr-wrap { max-width: 900px; margin: 0 auto; padding: 0 32px; }
  .sr-section { padding: 48px 0; border-bottom: 1px solid var(--border); }
  .sr-section:last-child { border-bottom: none; }
  .sr-label {
    font-size: 11px; font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 12px;
  }
  .sr-h2 {
    font-family: 'Oswald', sans-serif; font-size: 36px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em; margin-bottom: 24px;
  }
  .sr-p { color: var(--gray-l); margin-bottom: 16px; }
  .sr-small { color: var(--gray); font-size: 12px; }

  /* HERO */
  .sr-hero {
    position: relative; min-height: 100vh; display: flex;
    align-items: flex-end; overflow: hidden;
    border-bottom: 1px solid var(--border);
  }
  .sr-hero img {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; object-position: center 20%;
  }
  .sr-hero-ov {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(8,8,8,.95) 0%, rgba(8,8,8,.4) 50%, rgba(8,8,8,.08) 100%);
  }
  .sr-hero-inner { position: relative; z-index: 2; padding: 48px 56px 64px; }
  .sr-hero-eye {
    font-size: 11px; font-weight: 600; letter-spacing: .22em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 14px;
  }
  .sr-hero-title {
    font-family: 'Oswald', sans-serif; font-size: 84px; font-weight: 700;
    text-transform: uppercase; line-height: .92; letter-spacing: .02em;
  }
  .sr-hero-tag { font-size: 18px; color: var(--gray-l); margin-top: 20px; max-width: 480px; line-height: 1.5; }

  /* NAV */
  .sr-nav {
    position: absolute; top: 0; left: 0; right: 0; z-index: 10;
    padding: 24px 40px; display: flex; align-items: center;
  }
  .sr-nav img { height: 36px; width: auto; display: block; }

  /* ── PALETTE ── */
  .sr-pal { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
  .sr-swatch { display: flex; flex-direction: column; }
  .sr-sw-color {
    height: 100px;
    border-radius: 6px 6px 0 0;
  }
  .sr-sw-color.outlined { border: 1px solid rgba(255,255,255,.15); }
  .sr-sw-info {
    background: var(--surface3);
    border-radius: 0 0 6px 6px;
    padding: 12px 10px;
  }
  .sr-sw-name {
    font-family: 'Oswald', sans-serif;
    font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em;
    color: var(--white); margin-bottom: 4px;
    display: block;
  }
  .sr-sw-hex {
    font-size: 11px; font-weight: 500;
    color: var(--silver); margin-bottom: 2px;
    letter-spacing: .02em; display: block;
  }
  .sr-sw-rgb {
    font-size: 10px; font-weight: 400;
    color: rgba(192,192,192,.6); margin-bottom: 8px;
    display: block;
  }
  .sr-sw-usage {
    font-size: 10px; font-weight: 400;
    color: rgba(192,192,192,.75); line-height: 1.4;
  }

  /* ── TYPOGRAPHY ── */
  .sr-font-families {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 36px;
  }
  .sr-font-card {
    background: var(--surface3); border-radius: 8px;
    padding: 24px; border-left: 3px solid var(--orange);
  }
  .sr-font-card-label {
    font-size: 10px; font-weight: 500; letter-spacing: .15em;
    text-transform: uppercase; color: var(--silver); margin-bottom: 8px;
  }
  .sr-font-card-name {
    font-family: 'Oswald', sans-serif; font-size: 22px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .02em;
    color: var(--white); margin-bottom: 6px;
  }
  .sr-font-card-name.inter { font-family: 'Inter', sans-serif; letter-spacing: 0; }
  .sr-font-card-weights { font-size: 11px; color: rgba(192,192,192,.55); }
  .sr-font-card-sample {
    margin-top: 14px; padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,.08);
    font-size: 13px; color: rgba(255,255,255,.7); line-height: 1.5;
  }
  .sr-font-card-sample.oswald {
    font-family: 'Oswald', sans-serif; text-transform: uppercase; letter-spacing: .04em;
  }

  .sr-type-scale { display: flex; flex-direction: column; gap: 0; }
  .sr-trow {
    display: grid; grid-template-columns: 160px 1fr;
    align-items: baseline; padding: 20px 0;
    border-bottom: 1px solid rgba(255,255,255,.06); gap: 24px;
  }
  .sr-trow:last-child { border-bottom: none; }
  .sr-tmeta { display: flex; flex-direction: column; gap: 4px; }
  .sr-tsize-label {
    font-size: 11px; font-weight: 500; letter-spacing: .12em;
    text-transform: uppercase; color: var(--orange);
  }
  .sr-trole { font-size: 11px; font-weight: 400; color: rgba(192,192,192,.6); }
  .sr-tfont-note {
    font-size: 10px; font-weight: 400;
    color: rgba(192,192,192,.4); letter-spacing: .04em; margin-top: 2px;
  }

  /* ── BG RULES ── */
  .sr-bg-section {
    background: var(--space-blue);
    padding: 48px 0;
    border-bottom: 1px solid var(--border);
  }
  .sr-divider {
    height: 48px;
    background: linear-gradient(to bottom, var(--black), var(--space-blue));
  }
  .sr-divider.rev {
    background: linear-gradient(to bottom, var(--space-blue), var(--black));
  }
  .sr-img-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .sr-img-card { border-radius: 12px; overflow: hidden; position: relative; aspect-ratio: 16/9; }
  .sr-img-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .sr-img-overlay { position: absolute; inset: 0; }
  .sr-img-overlay.ok { background: linear-gradient(to bottom, rgba(0,0,0,.7), rgba(0,0,0,.9)); }
  .sr-img-overlay.bad { background: rgba(0,0,0,.2); }
  .sr-img-text { position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; }
  .sr-img-text h4 {
    font-family: 'Oswald', sans-serif; font-size: 18px;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .sr-img-text p { font-size: 12px; color: rgba(255,255,255,.7); margin-top: 4px; }
  .sr-bg-note {
    margin-top: 14px; background: rgba(0,0,0,.3);
    border: 1px solid rgba(255,255,255,.08); border-radius: 10px;
    padding: 14px 18px; font-size: 13px; color: rgba(255,255,255,.55);
  }

  /* ── COMPONENTS ── */
  .sr-crow { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
  .sr-clabel { font-size: 12px; color: var(--gray); min-width: 100px; }
  .sr-btn {
    font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase;
    border-radius: 8px; cursor: pointer; padding: 12px 28px;
    border: none; display: inline-block; transition: background .2s;
  }
  .sr-btn-p { background: var(--orange); color: #fff; }
  .sr-btn-p:hover { background: #cc3a16; }
  .sr-btn-s { background: transparent; color: #fff; border: 2px solid #fff; padding: 10px 28px; }
  .sr-btn-g { background: transparent; color: var(--orange); border: 1.5px solid var(--orange); padding: 10px 28px; }
  .sr-btn-g:hover { background: var(--orange); color: #fff; }
  .sr-tag {
    display: inline-block; font-size: 11px; font-weight: 600; letter-spacing: .08em;
    background: rgba(229,69,31,.15); color: var(--orange);
    border: 1px solid rgba(229,69,31,.3); border-radius: 3px; padding: 3px 8px;
  }
  .sr-card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
  .sr-card {
    background: var(--surface3); border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px; padding: 24px;
  }
  .sr-card-eye {
    font-family: 'Oswald', sans-serif; font-size: 12px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--orange); margin-bottom: 8px;
  }
  .sr-card-title { font-size: 16px; font-weight: 600; margin-bottom: 5px; }
  .sr-card-meta { font-size: 13px; color: rgba(255,255,255,.5); }

  /* Speaker Panel */
  .sr-speaker-panel {
    background: #1E1E1E; border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px; overflow: hidden; margin-top: 4px;
  }
  .sr-speaker-label {
    background: var(--orange); color: #fff;
    font-family: 'Oswald', sans-serif; font-size: 11px;
    font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    padding: 6px 14px; display: inline-block;
  }
  .sr-speaker-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; margin: 16px;
  }
  .sr-speaker-photo {
    aspect-ratio: 1; border-radius: 6px;
  }
  .sr-speaker-name { font-size: 11px; color: rgba(255,255,255,.6); text-align: center; margin-top: 5px; }

  /* ── IMAGE DIRECTION ── */
  .sr-dir-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .sr-dir-card {
    background: var(--surface2); border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px; overflow: hidden;
  }
  .sr-dir-card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .sr-dir-body { padding: 14px; }
  .sr-dir-fn { font-size: 11px; color: rgba(255,255,255,.3); font-family: monospace; margin-bottom: 6px; }
  .sr-dir-body p { font-size: 13px; color: rgba(255,255,255,.7); line-height: 1.55; }

  .sr-rules { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .sr-rule-box { background: var(--surface2); border-radius: 10px; padding: 16px; }
  .sr-rule-box ul { color: rgba(255,255,255,.7); padding-left: 16px; line-height: 2; font-size: 13px; }

  .sr-badge {
    display: inline-block; font-family: 'Oswald', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; padding: 3px 10px;
    border-radius: 20px; margin-bottom: 8px;
  }
  .sr-badge.do { background: rgba(34,197,94,.2); color: #4ade80; border: 1px solid rgba(34,197,94,.3); }
  .sr-badge.dont { background: rgba(229,69,31,.15); color: #f97316; border: 1px solid rgba(229,69,31,.3); }

  /* ── SOCIAL MEDIA ── */
  .sr-social-scroll { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
  .sr-social-scroll::-webkit-scrollbar { height: 4px; }
  .sr-social-scroll::-webkit-scrollbar-track { background: var(--surface2); border-radius: 2px; }
  .sr-social-scroll::-webkit-scrollbar-thumb { background: var(--orange); border-radius: 2px; opacity: 0.5; }
  .sr-vcard { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; flex: 0 0 180px; transition: transform .2s, border-color .2s; }
  .sr-vcard:hover { transform: translateY(-4px); border-color: rgba(229,69,31,.35); }
  .sr-vcard img { width: 100%; aspect-ratio: 9/16; object-fit: cover; display: block; }
  .sr-vcard-meta { padding: 12px 14px; }
  .sr-vcard-num { font-size: 10px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--orange); margin-bottom: 3px; }
  .sr-vcard-title { font-family: 'Oswald', sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: var(--white); }
  .sr-vcard-note { font-size: 11px; color: var(--gray); margin-top: 3px; line-height: 1.4; }

  .sr-banner-list { display: flex; flex-direction: column; gap: 24px; margin-top: 32px; }
  .sr-bcard { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; transition: transform .2s, border-color .2s; }
  .sr-bcard:hover { transform: translateY(-3px); border-color: rgba(229,69,31,.35); }
  .sr-bcard img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
  .sr-bcard-meta { padding: 16px 20px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .sr-bcard-num { font-size: 10px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--orange); margin-bottom: 4px; }
  .sr-bcard-title { font-family: 'Oswald', sans-serif; font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .sr-bcard-note { font-size: 12px; color: var(--gray); max-width: 400px; line-height: 1.5; text-align: right; }

  /* Social Usage Grid */
  .sr-usage-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 32px; }
  .sr-ucard { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 24px; }
  .sr-ucard-icon {
    width: 36px; height: 36px;
    background: rgba(229,69,31,.12); border: 1px solid rgba(229,69,31,.2);
    border-radius: 6px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
  }
  .sr-ucard h3 {
    font-family: 'Oswald', sans-serif; font-size: 16px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px;
  }
  .sr-ucard p { font-size: 13px; color: var(--gray-l); line-height: 1.6; }
  .sr-ucard ul { list-style: none; margin-top: 8px; }
  .sr-ucard ul li { font-size: 12px; color: var(--gray); padding: 3px 0; border-bottom: 1px solid var(--border); }
  .sr-ucard ul li:last-child { border-bottom: none; }
  .sr-ucard ul li::before { content: '— '; color: var(--orange); }

  /* Spec Sheet */
  .sr-spec-row { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; padding: 28px 0; border-bottom: 1px solid var(--border); }
  .sr-spec-row:last-child { border-bottom: none; }
  .sr-spec-label { font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: var(--gray); margin-bottom: 6px; }
  .sr-spec-val { font-size: 14px; color: var(--white); }

  /* CTA */
  .sr-cta { background: var(--surface2); padding: 48px 0; }
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
`;function g(){const[s,a]=l.useState(""),[r,i]=l.useState("idle"),[t,n]=l.useState("");async function c(o){if(o.preventDefault(),!s.trim()||!s.includes("@")){n("Please enter a valid email address.");return}i("loading"),n("");try{const d=await fetch("/api/referrals",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:s.trim(),source:"space-rising-brand-page"})}),p=await d.json();d.ok?i("done"):(n(p.error||"Something went wrong. Try again."),i("idle"))}catch{n("Network error. Please try again."),i("idle")}}return r==="done"?e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{className:"sr-cta-thanks",children:"You're in."}),e.jsx("div",{className:"sr-cta-thanks-sub",children:"We'll be in touch."})]}):e.jsxs("form",{onSubmit:c,style:{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:10},children:[e.jsxs("div",{className:"sr-cta-form",children:[e.jsx("input",{className:"sr-cta-input",type:"email",placeholder:"your@email.com",value:s,onChange:o=>a(o.target.value),disabled:r==="loading"}),e.jsx("button",{className:"sr-cta-submit",type:"submit",disabled:r==="loading",children:r==="loading"?"Sending...":"Get in Touch"})]}),t&&e.jsx("div",{className:"sr-cta-error",children:t})]})}function f(){return l.useEffect(()=>{document.title="Space Rising Brand Guidelines"},[]),e.jsxs("div",{className:"sr-root sr-page",children:[e.jsx("style",{children:m}),e.jsxs("div",{className:"sr-hero",children:[e.jsx("img",{src:"/images/space-rising/hero-astronaut-arizona.jpg",alt:"Space Rising Hero"}),e.jsx("div",{className:"sr-hero-ov"}),e.jsx("div",{className:"sr-nav",children:e.jsx("img",{src:"/images/space-rising/logo-white.png",alt:"Space Rising"})}),e.jsxs("div",{className:"sr-hero-inner",children:[e.jsx("div",{className:"sr-hero-eye",children:"Brand Guidelines 2026"}),e.jsxs("h1",{className:"sr-hero-title",children:["Space",e.jsx("br",{}),"Rising"]}),e.jsx("p",{className:"sr-hero-tag",children:"Arizona's space economy is launching. This is its visual identity."})]})]}),e.jsx("div",{className:"sr-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"01 — Logo"}),e.jsx("div",{className:"sr-h2",children:"Brand Marks"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20},children:[e.jsxs("div",{style:{background:"var(--surface)",border:"1px solid #222",borderRadius:8,padding:"24px 32px",height:200,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12},children:[e.jsx("img",{src:"/images/space-rising/logo-white.png",alt:"Space Rising white logo",style:{maxHeight:72,maxWidth:"80%",width:"auto",objectFit:"contain",display:"block"}}),e.jsx("p",{style:{fontSize:12,color:"var(--gray)",margin:0},children:"Primary lockup. White version. Dark backgrounds only."})]}),e.jsxs("div",{style:{background:"#F4F4F0",border:"1px solid #ddd",borderRadius:8,padding:"24px 32px",height:200,textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12},children:[e.jsx("img",{src:"/images/space-rising/logo-dark.png",alt:"Space Rising dark logo",style:{maxHeight:72,maxWidth:"80%",width:"auto",objectFit:"contain",display:"block"}}),e.jsx("p",{style:{fontSize:12,color:"#555",margin:0},children:"Dark version. Light backgrounds only. Min 4.5:1 contrast ratio."})]})]}),e.jsx("p",{style:{marginTop:20,fontSize:13,color:"var(--gray-l)"},children:'Never stretch, rotate, or recolor the orbit mark. Always maintain minimum clear space equal to the cap-height of "S" on all sides.'})]})}),e.jsx("div",{className:"sr-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"02 — Color"}),e.jsx("div",{className:"sr-h2",children:"Palette"}),e.jsx("div",{className:"sr-pal",children:[{color:"#080808",name:"Void Black",hex:"#080808",rgb:"RGB 8, 8, 8",usage:"Page background, primary surface",outlined:!0},{color:"#E5451F",name:"Launch Orange",hex:"#E5451F",rgb:"RGB 229, 69, 31",usage:"CTA buttons, highlights, key callouts — one per layout"},{color:"#141414",name:"Deep Space",hex:"#141414",rgb:"RGB 20, 20, 20",usage:"Section backgrounds, card surfaces"},{color:"#0D0D1F",name:"Cosmos Navy",hex:"#0D0D1F",rgb:"RGB 13, 13, 31",usage:"Depth gradients, section backgrounds"},{color:"#FFFFFF",name:"Star White",hex:"#FFFFFF",rgb:"RGB 255, 255, 255",usage:"Headlines on dark, icon fills",outlined:!0},{color:"#999999",name:"Moonrock",hex:"#999999",rgb:"RGB 153, 153, 153",usage:"Secondary text, metallic accents"}].map(({color:s,name:a,hex:r,rgb:i,usage:t,outlined:n})=>e.jsxs("div",{className:"sr-swatch",children:[e.jsx("div",{className:`sr-sw-color${n?" outlined":""}`,style:{background:s}}),e.jsxs("div",{className:"sr-sw-info",children:[e.jsx("span",{className:"sr-sw-name",children:a}),e.jsx("span",{className:"sr-sw-hex",children:r}),e.jsx("span",{className:"sr-sw-rgb",children:i}),e.jsx("span",{className:"sr-sw-usage",children:t})]})]},r))}),e.jsx("p",{style:{marginTop:22,fontSize:13,color:"var(--gray-l)"},children:"Launch Orange is the only warm color. One dominant orange element per layout. Never on warm backgrounds. All other surfaces stay in the dark spectrum."})]})}),e.jsx("div",{className:"sr-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"03 — Typography"}),e.jsx("div",{className:"sr-h2",children:"Type System"}),e.jsxs("div",{className:"sr-font-families",children:[e.jsxs("div",{className:"sr-font-card",children:[e.jsx("div",{className:"sr-font-card-label",children:"Display & Headlines"}),e.jsx("div",{className:"sr-font-card-name",children:"Oswald"}),e.jsx("div",{className:"sr-font-card-weights",children:"Bold 700 / ExtraBold 800 / Medium 500"}),e.jsx("div",{className:"sr-font-card-sample oswald",children:"Condensed. Uppercase. Tight tracking. Built for impact."})]}),e.jsxs("div",{className:"sr-font-card",children:[e.jsx("div",{className:"sr-font-card-label",children:"Body & UI"}),e.jsx("div",{className:"sr-font-card-name inter",children:"Inter"}),e.jsx("div",{className:"sr-font-card-weights",children:"Light 300 / Regular 400 / Medium 500"}),e.jsx("div",{className:"sr-font-card-sample",children:"Clean, readable, system-native feel. Works at any size."})]})]}),e.jsxs("div",{className:"sr-type-scale",children:[e.jsxs("div",{className:"sr-trow",children:[e.jsxs("div",{className:"sr-tmeta",children:[e.jsx("span",{className:"sr-tsize-label",children:"72px"}),e.jsx("span",{className:"sr-trole",children:"Hero Headline"}),e.jsx("span",{className:"sr-tfont-note",children:"Oswald 700, uppercase, .02em"})]}),e.jsx("div",{style:{fontFamily:"'Oswald', sans-serif",fontSize:64,fontWeight:700,textTransform:"uppercase",lineHeight:.95,letterSpacing:".02em"},children:"Space Rising"})]}),e.jsxs("div",{className:"sr-trow",children:[e.jsxs("div",{className:"sr-tmeta",children:[e.jsx("span",{className:"sr-tsize-label",children:"36px"}),e.jsx("span",{className:"sr-trole",children:"Section Headline"}),e.jsx("span",{className:"sr-tfont-note",children:"Oswald 700, uppercase, -.01em"})]}),e.jsx("div",{style:{fontFamily:"'Oswald', sans-serif",fontSize:36,fontWeight:700,textTransform:"uppercase",letterSpacing:"-.01em"},children:"Arizona Space Congress"})]}),e.jsxs("div",{className:"sr-trow",children:[e.jsxs("div",{className:"sr-tmeta",children:[e.jsx("span",{className:"sr-tsize-label",children:"24px"}),e.jsx("span",{className:"sr-trole",children:"Subheadline"}),e.jsx("span",{className:"sr-tfont-note",children:"Oswald 500, uppercase, 0em"})]}),e.jsx("div",{style:{fontFamily:"'Oswald', sans-serif",fontSize:24,fontWeight:500,textTransform:"uppercase",letterSpacing:"0em",lineHeight:1.2},children:"The Future of Commercial Space"})]}),e.jsxs("div",{className:"sr-trow",children:[e.jsxs("div",{className:"sr-tmeta",children:[e.jsx("span",{className:"sr-tsize-label",children:"18px"}),e.jsx("span",{className:"sr-trole",children:"Body Large"}),e.jsx("span",{className:"sr-tfont-note",children:"Inter 400, 0em"})]}),e.jsx("div",{style:{fontFamily:"'Inter', sans-serif",fontSize:18,fontWeight:400,color:"var(--silver)",lineHeight:1.6},children:"Connecting Arizona's aerospace ecosystem with global industry leaders and policy makers."})]}),e.jsxs("div",{className:"sr-trow",children:[e.jsxs("div",{className:"sr-tmeta",children:[e.jsx("span",{className:"sr-tsize-label",children:"14px"}),e.jsx("span",{className:"sr-trole",children:"Body / UI Text"}),e.jsx("span",{className:"sr-tfont-note",children:"Inter 300, 0em"})]}),e.jsx("div",{style:{fontFamily:"'Inter', sans-serif",fontSize:14,fontWeight:300,color:"var(--silver)",lineHeight:1.65},children:"Space Rising brings together founders, engineers, and investors to accelerate the commercial space economy from the heart of the desert Southwest."})]}),e.jsxs("div",{className:"sr-trow",children:[e.jsxs("div",{className:"sr-tmeta",children:[e.jsx("span",{className:"sr-tsize-label",children:"11px"}),e.jsx("span",{className:"sr-trole",children:"Label / Caption"}),e.jsx("span",{className:"sr-tfont-note",children:"Inter 500, uppercase, .15em"})]}),e.jsx("div",{style:{fontFamily:"'Inter', sans-serif",fontSize:11,fontWeight:500,textTransform:"uppercase",letterSpacing:".15em",color:"var(--orange)"},children:"Event Sponsor  ·  Phoenix, AZ  ·  2026"})]})]})]})}),e.jsx("div",{className:"sr-divider"}),e.jsx("div",{className:"sr-bg-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"04 — Background Rules"}),e.jsx("div",{className:"sr-h2",children:"Imagery + Overlays"}),e.jsx("p",{className:"sr-p",children:"All imagery must be treated with a dark overlay before text placement. Minimum contrast: 4.5:1 for body copy, 3:1 for large display text."}),e.jsxs("div",{className:"sr-img-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"sr-badge do",style:{marginBottom:8},children:"DO — 70–90% overlay"}),e.jsxs("div",{className:"sr-img-card",children:[e.jsx("img",{src:"/images/space-rising/hero-phoenix-cosmos.jpg",alt:"Correct overlay example"}),e.jsx("div",{className:"sr-img-overlay ok"}),e.jsxs("div",{className:"sr-img-text",children:[e.jsx("div",{style:{fontFamily:"'Oswald', sans-serif",fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:"var(--orange)",marginBottom:4},children:"Arizona Space Congress 2026"}),e.jsx("h4",{children:"Text reads cleanly"}),e.jsx("p",{children:"rgba(0,0,0,.7) → rgba(0,0,0,.9)"})]})]})]}),e.jsxs("div",{children:[e.jsx("div",{className:"sr-badge dont",style:{marginBottom:8},children:"AVOID — under 40% overlay"}),e.jsxs("div",{className:"sr-img-card",children:[e.jsx("img",{src:"/images/space-rising/hero-desert-cosmos.jpg",alt:"Incorrect overlay example"}),e.jsx("div",{className:"sr-img-overlay bad"}),e.jsxs("div",{className:"sr-img-text",children:[e.jsx("div",{style:{fontFamily:"'Oswald', sans-serif",fontSize:11,letterSpacing:".12em",textTransform:"uppercase",color:"var(--orange)",marginBottom:4},children:"Arizona Space Congress 2026"}),e.jsx("h4",{children:"Text fights the image"}),e.jsx("p",{children:"Image competes. Legibility lost."})]})]})]})]}),e.jsx("div",{className:"sr-bg-note",children:"Section transitions: smooth dark-to-dark (#080808 → #1B2A4A). Never hard black-to-gray cuts. Use gradient dividers between all full-bleed sections."})]})}),e.jsx("div",{className:"sr-divider rev"}),e.jsx("div",{className:"sr-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"05 — Components"}),e.jsx("div",{className:"sr-h2",children:"UI Specs"}),e.jsxs("div",{style:{marginBottom:32},children:[e.jsxs("div",{className:"sr-crow",children:[e.jsx("span",{className:"sr-clabel",children:"Primary CTA"}),e.jsx("button",{className:"sr-btn sr-btn-p",children:"Register Now"}),e.jsx("button",{className:"sr-btn sr-btn-p",style:{marginLeft:8},children:"Apply to Speak"}),e.jsx("small",{className:"sr-small",children:"Oswald 600 / #E5451F / 8px radius"})]}),e.jsxs("div",{className:"sr-crow",children:[e.jsx("span",{className:"sr-clabel",children:"Secondary"}),e.jsx("button",{className:"sr-btn sr-btn-s",children:"Learn More"}),e.jsx("small",{className:"sr-small",children:"2px white border / transparent bg"})]}),e.jsxs("div",{className:"sr-crow",children:[e.jsx("span",{className:"sr-clabel",children:"Ghost"}),e.jsx("button",{className:"sr-btn sr-btn-g",children:"View Program"}),e.jsx("small",{className:"sr-small",children:"1.5px orange border / hover fills orange"})]}),e.jsxs("div",{className:"sr-crow",children:[e.jsx("span",{className:"sr-clabel",children:"Event Tags"}),e.jsx("span",{className:"sr-tag",children:"Keynote"}),e.jsx("span",{className:"sr-tag",style:{marginLeft:6},children:"Workshop"}),e.jsx("span",{className:"sr-tag",style:{marginLeft:6},children:"Panel"})]})]}),e.jsx("div",{style:{marginBottom:8,fontSize:12,color:"var(--gray)",letterSpacing:".12em",textTransform:"uppercase",fontFamily:"'Oswald', sans-serif"},children:"Cards — #2A2A2A / rgba(255,255,255,.1) border / 12px radius"}),e.jsxs("div",{className:"sr-card-grid",children:[e.jsxs("div",{className:"sr-card",children:[e.jsx("div",{className:"sr-card-eye",children:"Track A"}),e.jsx("div",{className:"sr-card-title",children:"Commercial Space Policy"}),e.jsx("div",{className:"sr-card-meta",children:"10:00 AM · Main Stage"})]}),e.jsxs("div",{className:"sr-card",children:[e.jsx("div",{className:"sr-card-eye",children:"Track B"}),e.jsx("div",{className:"sr-card-title",children:"Arizona Space Economy"}),e.jsx("div",{className:"sr-card-meta",children:"11:30 AM · Hall B"})]}),e.jsxs("div",{className:"sr-card",children:[e.jsx("div",{className:"sr-card-eye",children:"Workshop"}),e.jsx("div",{className:"sr-card-title",children:"Launch Readiness"}),e.jsx("div",{className:"sr-card-meta",children:"2:00 PM · Room 204"})]})]}),e.jsx("div",{style:{marginBottom:8,marginTop:8,fontSize:12,color:"var(--gray)",letterSpacing:".12em",textTransform:"uppercase",fontFamily:"'Oswald', sans-serif"},children:"Speaker Panel"}),e.jsxs("div",{className:"sr-speaker-panel",children:[e.jsx("div",{style:{padding:"16px 16px 0"},children:e.jsx("span",{className:"sr-speaker-label",children:"Speaker Spotlight"})}),e.jsx("div",{className:"sr-speaker-grid",children:[{bg:"linear-gradient(135deg,#1B2A4A,#0d0d0d)",name:"Gen. Sarah Cole"},{bg:"linear-gradient(135deg,#2A1B0A,#0d0d0d)",name:"Dr. Marcus Webb"},{bg:"linear-gradient(135deg,#1B0A2A,#0d0d0d)",name:"Elena Vasquez"},{bg:"linear-gradient(135deg,#0A1B2A,#0d0d0d)",name:"James Okafor"}].map(({bg:s,name:a})=>e.jsxs("div",{children:[e.jsx("div",{className:"sr-speaker-photo",style:{background:s}}),e.jsx("div",{className:"sr-speaker-name",children:a})]},a))}),e.jsxs("div",{style:{padding:"0 16px 16px",display:"flex",gap:12,alignItems:"center"},children:[e.jsx("button",{className:"sr-btn sr-btn-p",style:{fontSize:13,padding:"9px 20px"},children:"View All Speakers"}),e.jsx("span",{style:{fontSize:13,color:"rgba(255,255,255,.4)"},children:"40+ confirmed speakers"})]})]}),e.jsxs("p",{style:{marginTop:24,fontSize:13,color:"var(--gray-l)"},children:[e.jsx("strong",{children:"Transitions:"})," 1px rule at #1E1E1E between sections. Fade full-bleed image sections to void black at edges. Never hard-cut between image sections."]})]})}),e.jsx("div",{className:"sr-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"06 — Image Direction"}),e.jsx("div",{className:"sr-h2",children:"Visual Language"}),e.jsx("p",{className:"sr-p",style:{fontSize:14},children:"Cinematic, dramatic lighting. Arizona geography meets cosmic space. Warm orange/amber highlights on dark. These 4 hero images are the visual reference."}),e.jsxs("div",{className:"sr-dir-grid",children:[e.jsxs("div",{className:"sr-dir-card",children:[e.jsx("img",{src:"/images/space-rising/hero-astronaut-arizona.jpg",alt:"Astronaut Arizona"}),e.jsxs("div",{className:"sr-dir-body",children:[e.jsx("div",{className:"sr-dir-fn",children:"hero-astronaut-arizona.jpg"}),e.jsx("span",{className:"sr-badge do",children:"DO"}),e.jsx("p",{children:'Human figure, Arizona scale. Orange suit against deep blue-black. Single horizon light source. Practical lighting logic — not generically "space".'})]})]}),e.jsxs("div",{className:"sr-dir-card",children:[e.jsx("img",{src:"/images/space-rising/hero-launch-arizona.jpg",alt:"Launch Arizona"}),e.jsxs("div",{className:"sr-dir-body",children:[e.jsx("div",{className:"sr-dir-fn",children:"hero-launch-arizona.jpg"}),e.jsx("span",{className:"sr-badge do",children:"DO"}),e.jsx("p",{children:"Launch + desert geometry. Plume warmth reads orange/amber. Ground and sky share one consistent light source. No lens flares."})]})]}),e.jsxs("div",{className:"sr-dir-card",children:[e.jsx("img",{src:"/images/space-rising/hero-desert-cosmos.jpg",alt:"Desert Cosmos"}),e.jsxs("div",{className:"sr-dir-body",children:[e.jsx("div",{className:"sr-dir-fn",children:"hero-desert-cosmos.jpg"}),e.jsx("span",{className:"sr-badge dont",children:"AVOID"}),e.jsx("p",{children:"Over-saturated nebulas disconnect from Arizona reality. Desaturate space elements 20–30% from defaults. Nebulas = background, not foreground."})]})]}),e.jsxs("div",{className:"sr-dir-card",children:[e.jsx("img",{src:"/images/space-rising/hero-phoenix-cosmos.jpg",alt:"Phoenix Cosmos"}),e.jsxs("div",{className:"sr-dir-body",children:[e.jsx("div",{className:"sr-dir-fn",children:"hero-phoenix-cosmos.jpg"}),e.jsx("span",{className:"sr-badge do",children:"DO"}),e.jsx("p",{children:"City grid at night, cosmic overlay. Orange city lights echo the brand naturally. Compositing grounded — the city IS the light source. Arizona identity locked."})]})]})]}),e.jsxs("div",{className:"sr-rules",children:[e.jsxs("div",{className:"sr-rule-box",style:{border:"1px solid rgba(34,197,94,.2)"},children:[e.jsx("div",{style:{color:"#4ade80",fontFamily:"'Oswald', sans-serif",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10},children:"DO"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Dramatic single light source (horizon, city glow, plume)"}),e.jsx("li",{children:"Orange/amber warmth where humans or tech exist"}),e.jsx("li",{children:"Deep blue-black in space regions"}),e.jsx("li",{children:"Arizona geography identifiable (desert, city, red rock)"}),e.jsx("li",{children:"Consistent lighting between paired images"})]})]}),e.jsxs("div",{className:"sr-rule-box",style:{border:"1px solid rgba(229,69,31,.2)"},children:[e.jsx("div",{style:{color:"#f97316",fontFamily:"'Oswald', sans-serif",fontSize:11,letterSpacing:".1em",textTransform:"uppercase",marginBottom:10},children:"AVOID"}),e.jsxs("ul",{children:[e.jsx("li",{children:"Cartoonish AI textures or unnatural gradients"}),e.jsx("li",{children:"Over-saturated purple/pink nebulas dominating frame"}),e.jsx("li",{children:"Multiple conflicting light sources in one image"}),e.jsx("li",{children:'Generic "space photo" with no Arizona anchor'}),e.jsx("li",{children:"Hard lighting inconsistency between adjacent images"})]})]})]})]})}),e.jsx("div",{className:"sr-section",children:e.jsxs("div",{className:"sr-wrap",children:[e.jsx("div",{className:"sr-label",children:"07 — Social Media Templates"}),e.jsx("div",{className:"sr-h2",children:"Campaign Assets"}),e.jsx("p",{className:"sr-p",children:"Campaign-ready graphics for Arizona Space Congress. Vertical posts for Instagram, TikTok, and Stories. Banners and lower thirds for livestream and stage."}),e.jsxs("div",{style:{display:"flex",gap:12,marginBottom:32},children:[e.jsx("span",{className:"sr-badge",style:{background:"transparent",border:"1px solid var(--orange)",color:"var(--orange)",borderRadius:2,padding:"5px 14px"},children:"5 Vertical Posts"}),e.jsx("span",{className:"sr-badge",style:{background:"transparent",border:"1px solid var(--orange)",color:"var(--orange)",borderRadius:2,padding:"5px 14px"},children:"3 Lower Thirds"}),e.jsx("span",{className:"sr-badge",style:{background:"transparent",border:"1px solid var(--orange)",color:"var(--orange)",borderRadius:2,padding:"5px 14px"},children:"Apr 29 · Phoenix"})]}),e.jsx("div",{className:"sr-label",style:{marginTop:0,marginBottom:8},children:"Vertical Posts — 9:16"}),e.jsx("p",{style:{fontSize:14,color:"var(--gray-l)",marginBottom:20},children:"Instagram, TikTok, and Stories-ready. 1080×1920. Dark bg, orange accent, bold Oswald type."}),e.jsx("div",{className:"sr-social-scroll",children:[{file:"v1-event-announcement",num:"01",title:"Event Announcement",note:"Arizona Space Congress · Apr 29 reveal"},{file:"v2-speaker-spotlight",num:"02",title:"Speaker Spotlight",note:"Repeatable template per speaker"},{file:"v3-countdown",num:"03",title:"Countdown Post",note:"X days until Congress — daily series"},{file:"v4-quote-card",num:"04",title:"Quote Card",note:"Inspirational space / Arizona quote"},{file:"v5-registration-cta",num:"05",title:"Registration CTA",note:"Register Now — direct response post"}].map(({file:s,num:a,title:r,note:i})=>e.jsxs("div",{className:"sr-vcard",children:[e.jsx("img",{src:`/images/space-rising/social/${s}.png`,alt:r,loading:"lazy"}),e.jsxs("div",{className:"sr-vcard-meta",children:[e.jsx("div",{className:"sr-vcard-num",children:a}),e.jsx("div",{className:"sr-vcard-title",children:r}),e.jsx("div",{className:"sr-vcard-note",children:i})]})]},s))}),e.jsxs("div",{className:"sr-banner-list",children:[e.jsxs("div",{children:[e.jsx("div",{className:"sr-label",style:{marginBottom:8},children:"Lower Thirds & Banners — 16:9"}),e.jsx("p",{style:{fontSize:14,color:"var(--gray-l)",marginBottom:20},children:"Live stream, recorded sessions, and stage displays. Dark overlay panels with orange accent bar."})]}),[{file:"b1-speaker-lower-third",num:"B1",title:"Speaker Name Lower Third",note:"Livestream and recorded video overlay. Name + title + org. Swap per speaker."},{file:"b2-event-title-card",num:"B2",title:"Event Title Card",note:"Intro card for livestream segments. Arizona Space Congress 2026 branding with date and location."},{file:"b3-panel-banner",num:"B3",title:"Panel Topic Banner",note:"Panel discussion title overlay. Swap topic text per session. Orange accent bar on left edge."}].map(({file:s,num:a,title:r,note:i})=>e.jsxs("div",{className:"sr-bcard",children:[e.jsx("img",{src:`/images/space-rising/social/${s}.png`,alt:r,loading:"lazy"}),e.jsxs("div",{className:"sr-bcard-meta",children:[e.jsxs("div",{children:[e.jsx("div",{className:"sr-bcard-num",children:a}),e.jsx("div",{className:"sr-bcard-title",children:r})]}),e.jsx("div",{className:"sr-bcard-note",children:i})]})]},s))]}),e.jsxs("div",{style:{marginTop:48},children:[e.jsx("div",{className:"sr-label",children:"Deployment"}),e.jsx("div",{className:"sr-h2",style:{marginBottom:8},children:"Where These Go"}),e.jsx("p",{style:{fontSize:14,color:"var(--gray-l)",marginBottom:0},children:"Each template maps to a specific channel and use case. No improvising required."})]}),e.jsxs("div",{className:"sr-usage-grid",children:[e.jsxs("div",{className:"sr-ucard",children:[e.jsx("div",{className:"sr-ucard-icon",children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"var(--orange)",children:e.jsx("path",{d:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"})})}),e.jsx("h3",{children:"Pre-Event Push"}),e.jsx("p",{children:"30-day countdown campaign. One post per day leading up to Apr 29."}),e.jsxs("ul",{children:[e.jsx("li",{children:"Countdown series (daily)"}),e.jsx("li",{children:"Speaker reveals (weekly)"}),e.jsx("li",{children:"Quote cards (filler days)"}),e.jsx("li",{children:"Registration CTA (last 7 days)"})]})]}),e.jsxs("div",{className:"sr-ucard",children:[e.jsx("div",{className:"sr-ucard-icon",children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"var(--orange)",children:e.jsx("path",{d:"M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"})})}),e.jsx("h3",{children:"Live Day Production"}),e.jsx("p",{children:"Broadcast-ready overlays for every session and speaker on stage."}),e.jsxs("ul",{children:[e.jsx("li",{children:"Speaker lower thirds (stream)"}),e.jsx("li",{children:"Panel topic banners"}),e.jsx("li",{children:"Event title card (intros)"}),e.jsx("li",{children:"Speaker spotlight clips (post)"})]})]}),e.jsxs("div",{className:"sr-ucard",children:[e.jsx("div",{className:"sr-ucard-icon",children:e.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"var(--orange)",children:e.jsx("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"})})}),e.jsx("h3",{children:"Post-Event Content"}),e.jsx("p",{children:"Repurpose day-of footage into ongoing social content and highlights."}),e.jsxs("ul",{children:[e.jsx("li",{children:"Speaker quote cards (clips)"}),e.jsx("li",{children:"Recap announcement post"}),e.jsx("li",{children:"Sponsor thank-you post"}),e.jsx("li",{children:"Save-the-date 2027 teaser"})]})]})]}),e.jsxs("div",{style:{marginTop:48},children:[e.jsx("div",{className:"sr-label",children:"Spec Sheet"}),e.jsx("div",{className:"sr-h2",style:{marginBottom:8},children:"Template Specs"}),e.jsx("p",{style:{fontSize:14,color:"var(--gray-l)",marginBottom:28},children:"Technical reference for production and handoff."})]}),[{label1:"Vertical Format",val1:"9:16 — 1080 × 1920px — Instagram / TikTok / Stories",label2:"Horizontal Format",val2:"16:9 — 1920 × 1080px — YouTube / Livestream / Stage"},{label1:"Primary Font",val1:"Oswald — 700 Bold — All headlines and display text",label2:"Body Font",val2:"Inter — 400/500 — Supporting text, captions, labels"},{label1:"Accent Color",val1:"#E5451F — Orange — CTAs, accent bars, labels, highlights",label2:"Background",val2:"#080808 to #121212 — Near-black — Never white"},{label1:"Text Primary",val1:"#FFFFFF — White — Headlines, CTA text",label2:"Text Secondary",val2:"#CCCCCC — Light gray — Supporting copy"},{label1:"Lower Third Safe Zone",val1:"Bottom 25% of frame — stays below 270px from bottom on 1080p",label2:"Delivery Format",val2:"PNG-24 with transparency (lower thirds) / JPG 90% (social posts)"}].map(({label1:s,val1:a,label2:r,val2:i})=>e.jsxs("div",{className:"sr-spec-row",children:[e.jsxs("div",{children:[e.jsx("div",{className:"sr-spec-label",children:s}),e.jsx("div",{className:"sr-spec-val",children:a})]}),e.jsxs("div",{children:[e.jsx("div",{className:"sr-spec-label",children:r}),e.jsx("div",{className:"sr-spec-val",children:i})]})]},s))]})}),e.jsx("div",{className:"sr-cta",children:e.jsxs("div",{className:"sr-cta-inner",children:[e.jsx("div",{className:"sr-cta-by",children:"Brand identity by"}),e.jsx("div",{className:"sr-cta-brand",children:"Ahead of Market"}),e.jsx("p",{className:"sr-cta-sub",children:"Strategy, design, and content for brands that move first."}),e.jsx(g,{})]})})]})}export{f as default};
