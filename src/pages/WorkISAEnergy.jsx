import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// ISA Energy case study: 3-film investor-grade video series
// Mission: aheadofmarket.com:home (R24 — per-client case-study pages for organic SEO)

const CSS = `
.wk-isa {
  --ink:#060606; --ink-2:#0B0B0A; --paper:#F6F6F4;
  --mut:rgba(246,246,244,.8); --dim:rgba(246,246,244,.55);
  --line:rgba(255,255,255,.14); --gold:#C4A46A; --gold-deep:#A8884C;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --fd:'Inter Tight','Inter',system-ui,Helvetica,Arial,sans-serif;
  --pad:clamp(1.25rem,4vw,3.5rem);
  position:fixed; inset:0; overflow-y:auto; overflow-x:hidden;
  scroll-behavior:smooth;
  font-family:var(--fx); color:var(--paper); background:var(--ink);
  font-size:16px; line-height:1.6;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
.wk-isa *, .wk-isa *::before, .wk-isa *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-isa a { color:inherit; text-decoration:none; }
.wk-isa button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-isa img, .wk-isa video { display:block; max-width:100%; }
.wk-isa a:focus-visible, .wk-isa button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-isa .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-isa .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-isa .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-isa .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-isa .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-isa .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-isa .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-isa .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-isa .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-isa .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-isa .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-isa .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-isa .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-isa .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-isa .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-isa .proof-block { gap:3rem; }
}
.wk-isa .proof-text { flex:1; }
.wk-isa .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-isa .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-isa .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wk-isa video {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px;
}

.wk-isa .video-grid {
  display:grid; grid-template-columns:1fr; gap:2rem; margin:2rem 0;
  max-width:600px;
}
@media(min-width:860px){
  .wk-isa .video-grid { grid-template-columns:repeat(3, 1fr); gap:1.6rem; }
}
.wk-isa .video-card {
  display:flex; flex-direction:column;
}
.wk-isa .video-card video {
  width:100%; height:auto; border-radius:6px; margin:0;
}
.wk-isa .video-card .label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-top:.8rem; margin-bottom:.2rem;
}

.wk-isa .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-isa .proof-link:hover { color:var(--paper); }

.wk-isa .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-isa .cta-btn:hover { background:var(--gold-deep); }
`;

export default function WorkISAEnergy() {
  useEffect(() => {
    document.title = 'ISA Energy Investor Video | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'ISA Energy 3-film investor-grade video series positioning quantum energy capture technology. Brand, demo, and validation films.');
    }
  }, []);

  return (
    <div className="wk-isa">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <a className="cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <section className="section hero">
        <h1>ISA Energy<span className="sq"></span></h1>
        <p className="tagline">Investor-grade film series positioning quantum energy as category-defining</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Quantum Energy, Investor Ready</h2>
              <p>ISA Industries developed a breakthrough ambient energy capture device. The founders needed to position their innovation as category-defining and build credibility with investors and partners. The story had to move beyond technical specs into founder devotion and market vision.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">Three-Film Series</h2>
            <p>We produced an investor-grade 2:30 brand film alongside demo and validation videos drawn from founder interviews and lab footage. The narrative moves through co-founder journey and ambient energy capture as a devotional technology story — positioning ISA for investor conversations and market positioning.</p>

            <div className="video-grid">
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/isa-brand.jpg">
                  <source src="/videos/isa-brand.mp4" type="video/mp4" />
                </video>
                <div className="label">Brand Film</div>
              </div>
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/isa-demo.jpg">
                  <source src="/videos/isa-demo.mp4" type="video/mp4" />
                </video>
                <div className="label">Demo Video</div>
              </div>
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/isa-validation.jpg">
                  <source src="/videos/isa-validation.mp4" type="video/mp4" />
                </video>
                <div className="label">Validation Film</div>
              </div>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">Investor Conversations Opened</h2>
              <p>The film series became the centerpiece of ISA's investor conversations. The narrative positioning — treating quantum energy capture as a devotional innovation story — resonated with early-stage funders. ISA moved from technical pitch to category narrative, differentiating in market conversations.</p>
              <p>Production included two co-founder interviews (82 minutes of raw material), extensive lab b-roll, and a wedding-editorial visual language that positioned the founders' journey as central to the innovation story.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Brand film production</strong> — 2:30 investor-grade narrative positioning
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Interview capture & editing</strong> — Co-founder on-camera storytelling
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Lab & technical b-roll</strong> — Device room and quantum energy capture footage
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Motion graphics & color grade</strong> — Premium finish for investor meetings
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Ready to tell your story<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We build investor-grade films and brand narratives that position technology companies for market impact.
        </p>
        <a className="cta-btn" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </section>

      <ServiceFooter current="/work/isa-energy" />
    </div>
  );
}
