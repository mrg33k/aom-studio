import React, { useEffect, useRef, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// Service page: Website Design & Build
// Mission: aheadofmarket.com:home (R4 — second service page, same design system as brand-film)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client media (ambition.jpg, space-rising.jpg).

const CSS = `
.svw {
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
.svw *, .svw *::before, .svw *::after { box-sizing:border-box; margin:0; padding:0; }
.svw a { color:inherit; text-decoration:none; }
.svw button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.svw img { display:block; max-width:100%; }
.svw a:focus-visible, .svw button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.svw .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.svw .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.svw .chrome-top a { pointer-events:auto; transition:color .15s; }
.svw .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.svw .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.svw .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.svw .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.svw .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.svw .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.svw .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.svw .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.svw .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.svw .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.svw .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.svw .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.svw .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.svw .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.svw .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.svw .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .svw .proof-grid { grid-template-columns:1.2fr 1fr; gap:3rem; }
}
.svw .proof-block {
  display:flex; gap:2.4rem; flex-direction:column-reverse;
  align-items:center;
}
@media(min-width:860px){
  .svw .proof-block { gap:3rem; }
  .svw .proof-block:nth-child(even) { flex-direction:row-reverse; }
}
.svw .proof-img {
  flex:1; width:100%; aspect-ratio:16/9; background:var(--ink-2);
  overflow:hidden; border-radius:8px;
}
.svw .proof-img img { width:100%; height:100%; object-fit:cover; }
.svw .proof-text { flex:1; }
.svw .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.svw .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.svw .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.svw .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.svw .proof-link:hover { color:var(--paper); }

/* how it works */
.svw .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.svw .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.svw .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.svw .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.svw .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.svw .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.svw .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.svw .faq-item:first-child { border-top:none; padding-top:0; }
.svw .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.svw .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.svw .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.svw .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.svw .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.svw .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.svw .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .svw .closing-contact-info { flex-direction:row; gap:2rem; }
}
.svw .closing-contact-info a { color:var(--gold); transition:color .15s; }
.svw .closing-contact-info a:hover { color:var(--paper); }
.svw .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.svw .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .svw { scroll-behavior:auto; }
}
`;

export default function ServiceWebBuild() {
  useEffect(() => {
    // Set document title and meta description for SEO
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Custom Website Design & Build';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Website design that converts. Built in 7 days or on your timeline. From homepage rebuilds to full SaaS platforms.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'Website design that converts. Built in 7 days or on your timeline. From homepage rebuilds to full SaaS platforms.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="svw">
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
          Website Design<br />& Build<i className="sq" />
        </h1>
        <p className="tagline">
          A good website tells the truth about your business. It converts. And you don't need a six-month project to get it. Build or rebuild in 7 days. Full-featured or platform-grade. Your call.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* The Offer */}
      <section className="section">
        <h2 className="offer-header">A website from AOM is</h2>
        <ul className="offer-list">
          <li>Fully designed and developed for your business (never a template)</li>
          <li>Built for conversion (clear calls-to-action, trust signals, zero clutter)</li>
          <li>Fast delivery (7 days for a homepage rebuild, timeline negotiable for larger scope)</li>
          <li>Live on production with real monitoring and support included</li>
        </ul>
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--mut)', fontSize: 'clamp(.95rem,1.2vw,1.05rem)' }}>
          We build homepages. We build campaign sites. We build member directories. We build SaaS platforms with databases, APIs, and user dashboards. Same rigor, different scale.
        </p>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: Ambition Website Rebuild */}
          <div className="proof-block">
            <div className="proof-img">
              <img src="/hero-sites/ambition.jpg" alt="Ambition Mechanical website rebuild" loading="lazy" />
            </div>
            <div className="proof-text">
              <div className="proof-label">HVAC Company Website Rebuild</div>
              <h3 className="proof-title">Ambition Mechanical</h3>
              <p>
                Ambition Mechanical's original site worked fine for existing customers. But new prospects didn't convert. The copy felt corporate, the trust signals were buried, and there was no path to a quote.
              </p>
              <p>
                We rebuilt it. New design, new copy, new information architecture. 15 named client logos above the fold. Four service landing pages built with FAQ, schema markup, and form conversion tracking.
              </p>
              <p>
                Site ships daily quotes, captures leads, and anchors their Google Ads funnel. Live at ambitionac.com.
              </p>
              <a href="https://ambitionac.com" target="_blank" rel="noopener noreferrer" className="proof-link">
                Live at ambitionac.com
              </a>
            </div>
          </div>

          {/* Proof 2: Space OS Platform */}
          <div className="proof-block">
            <div className="proof-img">
              <img src="/hero-sites/space-rising.jpg" alt="Space Rising OS platform" loading="lazy" />
            </div>
            <div className="proof-text">
              <div className="proof-label">Interactive Platform</div>
              <h3 className="proof-title">Space Rising OS</h3>
              <p>
                Space Rising needed a company directory, but not a boring list. They needed a member dashboard, an RFP marketplace, report hosting, and a deal-tracking surface for space-industry investors.
              </p>
              <p>
                We built Space OS, a full-featured platform with real-time company profiles, member login, search, filtering, and an admin dashboard. Membership tiers. Database-backed. APIs wired.
              </p>
              <p>
                The idea is complex. The platform is transparent. That's the work.
              </p>
            </div>
          </div>

          {/* Proof 3: Campaign Landing Pages */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Campaign Landing Pages</div>
              <h3 className="proof-title">Service-Specific Pages</h3>
              <p>
                Landing page builds are not one-size-fits-all. We designed and shipped four distinct commercial pages for Ambition in one release, each with its own copy angle, FAQ, and form targeting. Each one gets real traffic from Google Ads. Each one converts.
              </p>
              <p>
                No template. No copy-paste. Each page is built for its audience.
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
            <h3 className="step-title">Brief & Discovery</h3>
            <p className="step-text">We ask: who is your customer, what are they confused about, what single action do you want them to take? We read your current site. We look at your competitors. We lock a design direction.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3 className="step-title">Design</h3>
            <p className="step-text">Wireframes or high-fidelity comps depending on scope. We ship work early so you can see the direction and tell us if we're off. One round of notes before build starts.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3 className="step-title">Build</h3>
            <p className="step-text">Clean React or static HTML depending on feature scope. Responsive mobile-first. Form handling, SEO tags, analytics wired. We test on real devices.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3 className="step-title">Deploy & Monitor</h3>
            <p className="step-text">Live on production. We monitor for 48 hours post-launch. Email support included.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">Can you rebuild just our homepage?</h3>
            <p className="faq-a">Yes. Homepage rebuild is our fastest play. You get a proposal with real numbers before we start. You keep your existing pages if they work. We fix the hero, the copy, the CTA, and the trust signals.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What if we want a new design system?</h3>
            <p className="faq-a">That's heavier. Brand system design (typography, color, components) comes first, then the full site build on top of it. It's the full-foundation play, and we scope it with real numbers in a proposal.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Do you host the site?</h3>
            <p className="faq-a">No, but we'll deploy to your hosting provider (Vercel, Netlify, AWS, or wherever you want). We set up monitoring and handoff. You own the repo.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can you integrate it with our CRM or database?</h3>
            <p className="faq-a">Yes. Form handling, API integrations, database reads/writes. Tell us what backend you're using and we'll wire it. Extra timeline if it's complex.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What about mobile?</h3>
            <p className="faq-a">Everything we build is mobile-first and tested on real phones. Conversion rates on mobile matter, we don't ship half-baked mobile experiences.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can you help with copy?</h3>
            <p className="faq-a">Yes. Copywriting is included for homepage rebuilds. Larger projects have a separate copy brief. We can write it or refine what you have.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Let's talk about your next website<i className="sq" /></h2>
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
      <ServiceFooter current="/services/web-build" />
    </div>
  );
}
