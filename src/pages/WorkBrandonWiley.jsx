import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Brandon Wiley Documentary case study: long-form founder story
// Mission: aheadofmarket.com:home (R25, per-client case-study pages for organic SEO)

const CSS = `
.wk-bw {
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
.wk-bw *, .wk-bw *::before, .wk-bw *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-bw a { color:inherit; text-decoration:none; }
.wk-bw button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-bw img, .wk-bw video { display:block; max-width:100%; }
.wk-bw a:focus-visible, .wk-bw button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-bw .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-bw .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-bw .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-bw .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-bw .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-bw .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-bw .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-bw .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-bw .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-bw .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-bw .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-bw .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-bw .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-bw .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-bw .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-bw .proof-block { gap:3rem; }
}
.wk-bw .proof-text { flex:1; }
.wk-bw .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-bw .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-bw .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}

.wk-bw .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-bw .proof-link:hover { color:var(--paper); }

.wk-bw .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-bw .cta-btn:hover { background:var(--gold-deep); }
`;

export default function WorkBrandonWiley() {
  useEffect(() => {
    document.title = 'Brandon Wiley Documentary | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Brandon Wiley long-form documentary capturing the founder story behind an amusement park launch in Phoenix. In production.');
    }
  }, []);

  return (
    <div className="wk-bw">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <a className="cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <section className="section hero">
        <h1>Brandon Wiley<span className="sq"></span></h1>
        <p className="tagline">Long-form documentary about founding, scale, and the pursuit of a vision</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Documenting a Founder's Journey</h2>
              <p>Brandon Wiley is building a major amusement park venture in Phoenix. His story spans from the initial vision through capital raising, site acquisition, and the ongoing work of execution. The documentary needed to capture the depth of his thinking, the evolution of the project, and the personal conviction behind one of Arizona's most ambitious ventures. This is a long-form, multi-chapter project with no fixed deadline.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What We're Making</div>
              <h2 className="proof-title">Multi-Chapter Documentary Series</h2>
              <p>We're producing a substantial documentary that weaves together Brandon's personal narrative, the vision for the amusement park, the fundraising journey, and the on-the-ground execution. The project includes on-site interviews, b-roll of the property, archival material, and a three-part editorial series (LBX) exploring the venture's landscape and implications.</p>
              <p>Filming is ongoing with no set completion date. Each chapter is being shaped to land as a standalone piece while building toward a full long-form narrative that captures why this matters.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What's Unfolding</div>
              <h2 className="proof-title">A Story in Motion</h2>
              <p>The documentary is in active production. We've conducted extensive interviews capturing Brandon's founding philosophy, the amusement park concept, and the execution challenges. The material is being assembled into chapters that work both independently and as part of a larger narrative about ambition, capital, and Arizona.</p>
              <p>This is the kind of project that benefits from time, iteration, and the emergence of new story beats as the venture evolves. We're committed to telling the full story once the moment is right.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We're Delivering</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Long-form interview production</strong>: Multi-session founder storytelling capture
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Location & property b-roll</strong>: On-site documentation of the venture
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Editorial series (LBX)</strong>: Three-part contextual chapters
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Post-production & mastering</strong>: Color, sound, and final delivery
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Have an untold story<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We commit months to long-form documentaries that capture vision, execution, and the human stories behind major ventures.
        </p>
        <a className="cta-btn" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </section>

      <ServiceFooter current="/work/brandon-wiley" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Brandon Wiley',
          description: 'Brandon Wiley long-form documentary capturing the founder story behind an amusement park launch in Phoenix. In production.',
          url: 'https://aheadofmarket.com/work/brandon-wiley',
          author: {
            '@type': 'Organization',
            name: 'Ahead of Market',
          },
        }}
      />
    </div>
  );
}
