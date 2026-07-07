import React, { useEffect, useRef, useState } from 'react';
import BrandMark from '../components/home/BrandMark';

// Service page: Brand Films
// Mission: aheadofmarket.com:home (R2 — first service page child of /r6 design system)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client media via Gumlet posters.

const poster = (id, w = 1200) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

const CSS = `
.svc {
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
.svc *, .svc *::before, .svc *::after { box-sizing:border-box; margin:0; padding:0; }
.svc a { color:inherit; text-decoration:none; }
.svc button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.svc img { display:block; max-width:100%; }
.svc a:focus-visible, .svc button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.svc .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.svc .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.svc .chrome-top a { pointer-events:auto; transition:color .15s; }
.svc .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.svc .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.svc .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.svc .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.svc .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.svc .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.svc .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.svc .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.svc .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.svc .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.svc .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.svc .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.svc .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.svc .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.svc .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.svc .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .svc .proof-grid { grid-template-columns:1.2fr 1fr; gap:3rem; }
}
.svc .proof-block {
  display:flex; gap:2.4rem; flex-direction:column-reverse;
  align-items:center;
}
@media(min-width:860px){
  .svc .proof-block { gap:3rem; }
  .svc .proof-block:nth-child(even) { flex-direction:row-reverse; }
}
.svc .proof-img {
  flex:1; width:100%; aspect-ratio:16/9; background:var(--ink-2);
  overflow:hidden; border-radius:8px;
}
.svc .proof-img img { width:100%; height:100%; object-fit:cover; }
.svc .proof-text { flex:1; }
.svc .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.svc .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.svc .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.svc .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.svc .proof-link:hover { color:var(--paper); }

/* how it works */
.svc .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.svc .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.svc .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.svc .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.svc .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.svc .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.svc .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.svc .faq-item:first-child { border-top:none; padding-top:0; }
.svc .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.svc .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.svc .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.svc .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.svc .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.svc .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.svc .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .svc .closing-contact-info { flex-direction:row; gap:2rem; }
}
.svc .closing-contact-info a { color:var(--gold); transition:color .15s; }
.svc .closing-contact-info a:hover { color:var(--paper); }
.svc .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.svc .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .svc { scroll-behavior:auto; }
}
`;

export default function ServiceBrandFilm() {
  useEffect(() => {
    // Set document title and meta description for SEO
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Brand Films for Growing Companies';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'We make 60-90 second brand films that sell. Produced in 14 days from brief to final cut.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'We make 60-90 second brand films that sell. Produced in 14 days from brief to final cut.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="svc">
      <style>{CSS}</style>

      {/* Top Chrome */}
      <div className="chrome-top">
        <a href="/" className="logo" aria-label="Ahead of Market home">
          <BrandMark kind="mono" />
        </a>
        <a href="mailto:hello@aheadofmarket.com" className="cta">Start a conversation</a>
      </div>

      {/* Hero */}
      <section className="section hero">
        <h1>
          Brand Films<br />for Growing<br />Companies<i className="sq" />
        </h1>
        <p className="tagline">
          A brand film is not a commercial. It's the story of why you exist. Build authority. Attract your right customers. Land it in 14 days.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Schedule a call
        </a>
      </section>

      {/* The Offer */}
      <section className="section">
        <h2 className="offer-header">A brand film from AOM is</h2>
        <ul className="offer-list">
          <li>One tight story told in 60-90 seconds (what you do, who you serve, why it matters)</li>
          <li>Professionally produced (real locations, real crew, real color grading, no stock footage)</li>
          <li>Delivered final-cut and ready to deploy across web, social, and email</li>
          <li>Locked in at 14 days from the time you send us the brief</li>
        </ul>
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--mut)', fontSize: 'clamp(.95rem,1.2vw,1.05rem)' }}>
          This is not a sizzle reel or a montage. We write a narrative.
        </p>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: Ambition Mechanical */}
          <div className="proof-block">
            <div className="proof-img">
              <img src={poster('698a6296fc23d3d76fa8d992')} alt="Ambition Mechanical Services — HVAC crew on location" loading="lazy" />
            </div>
            <div className="proof-text">
              <div className="proof-label">HVAC Turnaround</div>
              <h3 className="proof-title">Ambition Mechanical</h3>
              <p>
                Ambition Mechanical Services needed to stand out in a crowded Phoenix market. They ship HVAC units fast, but nobody knew that.
              </p>
              <p>
                We filmed their crew during an emergency hospital install, the stakes were real, the work was clean. The resulting 2-minute film became their most effective sales tool. That film now anchors their website, drives qualified leads, and got them permission to price premium.
              </p>
              <a href="https://ambitionac.com" target="_blank" rel="noopener noreferrer" className="proof-link">
                Live at ambitionac.com
              </a>
            </div>
          </div>

          {/* Proof 2: ISA Energy */}
          <div className="proof-block">
            <div className="proof-img">
              <img src={poster('698a5ef5fc23d3d76fa87ef4')} alt="ISA Energy — Investor-grade brand narrative" loading="lazy" />
            </div>
            <div className="proof-text">
              <div className="proof-label">Investor Pitch Film</div>
              <h3 className="proof-title">ISA Energy</h3>
              <p>
                ISA Energy is a quantum-tech company with a founder story worth telling. Two co-founders built ambient energy capture from concept to lab prototype. The investor pitch video needed to move money, not just move viewers.
              </p>
              <p>
                We shot 82 minutes of co-founder interview in their Sedona lab, treated the story like a wedding film (high trust, emotional coherence, real stakes), and delivered a 2:30 brand narrative that positioned ISA as the category leader in their space. Investment-grade visual language.
              </p>
            </div>
          </div>

          {/* Proof 3: Space Rising */}
          <div className="proof-block">
            <div className="proof-img">
              <img src={poster('698a5391fc23d3d76fa7306c')} alt="Space Rising — Platform launch film" loading="lazy" />
            </div>
            <div className="proof-text">
              <div className="proof-label">Platform Launch</div>
              <h3 className="proof-title">Space Rising</h3>
              <p>
                Space Rising needed to launch a directory of 100+ space companies, a complex, technical idea. We made a 3-minute explainer that positioned them not as "a database" but as "the neutral coordination layer for the space industry."
              </p>
              <p>
                Multiple films, different frames, same story. Launched at the Phoenix Space Rising Congress to 200+ space-industry leaders. Film worked because the idea was clear from frame one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>How it works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-num">1</div>
            <h3 className="step-title">The Brief</h3>
            <p className="step-text">1 hour call or written. Tell us what you do, who you serve, and one specific thing that's hard for people to understand about your business. One story premise lands.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3 className="step-title">Shoot</h3>
            <p className="step-text">1-3 days on location. We bring crew, lights, sound gear, and a camera. We get footage of your people, your product, your space. You show up and be yourself.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3 className="step-title">Edit &amp; Color</h3>
            <p className="step-text">10 days. Rough cut, R1 notes, locked cut, color grade, mix, final delivery. We move fast. You see work early.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3 className="step-title">Deliver</h3>
            <p className="step-text">Day 14. Final file, web-optimized versions, social cuts if you want them. Ready to post.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">How much does a brand film cost?</h3>
            <p className="faq-a">It depends on location, crew size, and post-production scope. We give real numbers in a proposal before anything is booked.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What if we only have 7 days?</h3>
            <p className="faq-a">We've done it. Ambition Mechanical's film shipped in under two weeks once. Quality doesn't drop, but either scope tightens (no motion graphics, no color grade) or you pay for an added crew to move faster. Be honest about your deadline; we'll tell you what's real.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can you film in our location or do we need a studio?</h3>
            <p className="faq-a">Locations are better. We want your actual business in the frame, that authenticity is what sells. If your location is not great visually, we'll tell you. If it is, we'll use it.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What happens after the 14 days?</h3>
            <p className="faq-a">You own the footage and the final file. If you want minor tweaks after delivery, we do one round of notes for free. Anything beyond that is a new project.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Who should do this?</h3>
            <p className="faq-a">B2B companies, founders raising money, services that are hard to explain, anything where you're fighting against a false first impression. If your customers have to meet you in person to understand you, a brand film fixes that.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Ready to tell your story<i className="sq" /></h2>
        <a href="mailto:hello@aheadofmarket.com" className="btn-contact">
          Start a conversation
        </a>
        <div className="closing-contact-info">
          <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
          <a href="tel:+16023732164">602 373 2164</a>
          <span className="closing-note">We reply within 24 hours</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        © 2026 Ahead of Market. All rights reserved.
      </footer>
    </div>
  );
}
