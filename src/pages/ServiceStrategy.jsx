import React, { useEffect, useRef, useState } from 'react';
import BrandMark from '../components/home/BrandMark';

// Service page: Brand Strategy & Story Direction
// Mission: aheadofmarket.com:home (R20.6 — third service page, same design system)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client proof points.

const CSS = `
.svs {
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
.svs *, .svs *::before, .svs *::after { box-sizing:border-box; margin:0; padding:0; }
.svs a { color:inherit; text-decoration:none; }
.svs button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.svs img { display:block; max-width:100%; }
.svs a:focus-visible, .svs button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.svs .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.svs .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.svs .chrome-top a { pointer-events:auto; transition:color .15s; }
.svs .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.svs .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.svs .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.svs .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.svs .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.svs .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.svs .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.svs .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.svs .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.svs .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.svs .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.svs .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.svs .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.svs .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.svs .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.svs .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .svs .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.svs .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .svs .proof-block { gap:3rem; }
}
.svs .proof-text { flex:1; }
.svs .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.svs .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.svs .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.svs .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.svs .proof-link:hover { color:var(--paper); }

/* how it works */
.svs .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.svs .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.svs .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.svs .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.svs .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.svs .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.svs .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.svs .faq-item:first-child { border-top:none; padding-top:0; }
.svs .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.svs .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.svs .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.svs .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.svs .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.svs .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.svs .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .svs .closing-contact-info { flex-direction:row; gap:2rem; }
}
.svs .closing-contact-info a { color:var(--gold); transition:color .15s; }
.svs .closing-contact-info a:hover { color:var(--paper); }
.svs .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.svs .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .svs { scroll-behavior:auto; }
}
`;

export default function ServiceStrategy() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Brand Strategy & Story Direction';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Strategy without the consulting theater. We find your unfair advantage and position you to own it.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'Strategy without the consulting theater. We find your unfair advantage and position you to own it.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="svs">
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
          Brand Strategy<br />& Story<br />Direction<i className="sq" />
        </h1>
        <p className="tagline">
          Build a clear story. Own a unique position. Stop explaining what you do.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* The Offer */}
      <section className="section">
        <h2 className="offer-header">Strategy from AOM is</h2>
        <ul className="offer-list">
          <li>One interview with you and your team (2-4 hours, typically on a single call)</li>
          <li>A positioning narrative locked in writing (who you serve, what problem you solve, why you win)</li>
          <li>Proof points and messaging framework you can hand to anyone selling</li>
          <li>Ready to deploy across website copy, email, sales decks, video briefs, everywhere</li>
        </ul>
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--mut)', fontSize: 'clamp(.95rem,1.2vw,1.05rem)' }}>
          This is not a 50-slide consulting deck. It's a working document.
        </p>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: Space Rising */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Neutral Coordination in a Siloed Industry</div>
              <h3 className="proof-title">Space Rising</h3>
              <p>
                Space Rising entered a fragmented, immature space industry where 100+ companies all do similar things but have no way to find each other or collaborate. The problem: how do you position a connector in a market where everyone is competitive and nobody knows they need coordination?
              </p>
              <p>
                We interviewed Taryn (founder) for 4 hours on what makes Space Rising different. Locked positioning: "The neutral coordination layer for the space industry." Not a directory. Not a database. A connector. That one line, repeated in pitches, on the website, in investor calls, changed how the market heard them.
              </p>
              <p>
                They moved from "another space industry tool" to "the platform everyone uses because we're not competitive with anyone." Membership model, event strategy, fundraising pitches, all hang on that one clear positioning.
              </p>
            </div>
          </div>

          {/* Proof 2: ISA Energy */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Investor-Grade Narrative Positioning</div>
              <h3 className="proof-title">ISA Energy</h3>
              <p>
                ISA Energy is a quantum-tech company with sophisticated IP, real lab work, and a credible founder team. But quantum is a credibility threshold. If you're confused, you assume they're not real.
              </p>
              <p>
                We shaped their brand narrative: two founders built ambient energy capture from concept to working prototype. That devotion narrative, the willingness to do years of work on a hard problem, is what investors actually want to see. Not magical technology claims. Founder commitment.
              </p>
              <p>
                We positioned them as "the category leader in ambient energy capture." Every pitch deck, every brand video, every investor meeting now leads with founder story and working prototype. Narrative locked. Budget unlocked.
              </p>
            </div>
          </div>

          {/* Proof 3: Ambition Mechanical */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Multi-Channel Messaging from One Strategy</div>
              <h3 className="proof-title">Ambition Mechanical</h3>
              <p>
                Ambition Mechanical's paid search strategy needed two distinct target audiences (restaurant chains vs. facility managers) with two different pain points and two different conversion paths.
              </p>
              <p>
                We built the positioning for each: restaurants have emergency breakdowns and need same-day response; facility managers have budgeted capital projects and need a reliable vendor they can contract year-round.
              </p>
              <p>
                That positioning fed their Google Ads campaign structure, their landing page copy, their sales talking points, and their email nurture sequence. One strategic decision cascaded into every channel.
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
            <h3 className="step-title">The Interview</h3>
            <p className="step-text">1 call, 2-4 hours. We show up with a research brief. We ask: who is your real customer, what are they trying to do, what do they get wrong about you?</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3 className="step-title">Research & Synthesis</h3>
            <p className="step-text">3-5 days. We read your website, pitch deck, LinkedIn, sales emails. We look at competitors. We synthesize one clear positioning statement and messaging framework.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3 className="step-title">Written Brief</h3>
            <p className="step-text">Day 6-7. One document: your positioning, proof points, messaging for different audiences. Not 50 slides. Maybe 3-5 pages.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3 className="step-title">Handoff</h3>
            <p className="step-text">Optional. We can help you deploy this into your website copy, brand video brief, pitch deck. That's a separate project.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">What if we don't know who our real customer is?</h3>
            <p className="faq-a">That's the most common starting place. We ask harder questions. The answer usually lands in the interview.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How is this different from consulting?</h3>
            <p className="faq-a">Consultants give you a roadmap and recommendations. We give you a positioning, a story you can use immediately in sales calls, marketing, and every conversation about your business. We bias toward clarity over complexity.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Do you help us execute the strategy?</h3>
            <p className="faq-a">Yes, but separately. Strategy brief is the first project. Then we can help you rewrite website copy, build a sales deck, brief a brand video, or refine your pitch deck using that positioning. You own the brief.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What if we already have positioning?</h3>
            <p className="faq-a">Tell us what it is. We'll pressure-test it. If it's solid, we'll tell you. If it's vague or conflicting, we'll sharpen it. Most positioning documents have 3-4 ideas mixed together, we find the one that's actually true and defensible.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How long does this take?</h3>
            <p className="faq-a">Typically 2-3 weeks from first interview to final brief. If you're in a hurry, we can compress to 1 week. If you want deeper research, we can extend to 4 weeks.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can you do this for our sales team?</h3>
            <p className="faq-a">Yes. Sales positioning is different from marketing positioning, it needs proof points and objection-handling. We can brief it separately.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Let's clarify what you actually do<i className="sq" /></h2>
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
