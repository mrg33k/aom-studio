import React, { useEffect, useRef, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// Work filter page: Construction Industry
// Mission: aheadofmarket.com:home (R20.8 — work filter pages, same design system as services)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client proof points.

const CSS = `
.wkc {
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
.wkc *, .wkc *::before, .wkc *::after { box-sizing:border-box; margin:0; padding:0; }
.wkc a { color:inherit; text-decoration:none; }
.wkc button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wkc img { display:block; max-width:100%; }
.wkc a:focus-visible, .wkc button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.wkc .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.wkc .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wkc .chrome-top a { pointer-events:auto; transition:color .15s; }
.wkc .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wkc .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wkc .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wkc .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.wkc .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wkc .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.wkc .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wkc .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wkc .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.wkc .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wkc .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.wkc .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.wkc .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.wkc .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.wkc .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.wkc .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wkc .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wkc .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wkc .proof-block { gap:3rem; }
}
.wkc .proof-text { flex:1; }
.wkc .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wkc .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wkc .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wkc .proof-image {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px; display:block;
}
.wkc .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wkc .proof-link:hover { color:var(--paper); }

/* how it works */
.wkc .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.wkc .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.wkc .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.wkc .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.wkc .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.wkc .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.wkc .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.wkc .faq-item:first-child { border-top:none; padding-top:0; }
.wkc .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.wkc .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.wkc .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.wkc .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.wkc .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.wkc .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.wkc .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .wkc .closing-contact-info { flex-direction:row; gap:2rem; }
}
.wkc .closing-contact-info a { color:var(--gold); transition:color .15s; }
.wkc .closing-contact-info a:hover { color:var(--paper); }
.wkc .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.wkc .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .wkc { scroll-behavior:auto; }
}
`;

const poster = (id, w = 1200) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

export default function WorkConstruction() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Construction Marketing Videos Phoenix';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'AOM builds brand films and marketing videos for construction companies in Phoenix. See how Ambition Mechanical and Kohrs grew with video content.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'AOM builds brand films and marketing videos for construction companies in Phoenix. See how Ambition Mechanical and Kohrs grew with video content.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="wkc">
      <style>{CSS}</style>

      {/* Top Chrome */}
      <div className="chrome-top">
        <a href="/r6" className="logo" aria-label="Ahead of Market home">
          <BrandMark kind="mono" />
        </a>
        <a href="mailto:hello@aheadofmarket.com" className="cta">Start a conversation</a>
      </div>

      {/* Hero */}
      <section className="section hero">
        <h1>
          Build the Trust That Wins Bids<i className="sq" />
        </h1>
        <p className="tagline">
          Construction companies don't have time for generic marketing. You have job sites to run, schedules to hit, and equipment breaking down. Video changes who calls you for bids. We know your work.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* Who This Is For */}
      <section className="section">
        <h2 className="offer-header">Who This Is For</h2>
        <ul className="offer-list">
          <li>HVAC contractors, demolition crews, home builders, and commercial builders in Phoenix and Arizona</li>
          <li>You need to show your work, build trust with facility managers and homeowners, and win bigger bids</li>
          <li>You want video that's broadcast-quality, not a side hustle</li>
        </ul>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: Ambition Mechanical */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">HVAC Emergency Response</div>
              <h3 className="proof-title">Ambition Mechanical</h3>
              <p>
                Ambition Mechanical runs emergency HVAC calls and commercial installs across Phoenix. When they needed a brand film, they were working—actually on a rooftop at a hospital during filming. Our crew captured that real emergency response on camera: the stakes, the competence, the speed.
              </p>
              <img className="proof-image" src={poster('698a6296fc23d3d76fa8d992', 800)} alt="Ambition Mechanical brand film" />
              <p>
                That film shows who Ambition is to facility managers deciding between three vendors. It went live on their site, drives qualified leads, and got them permission to price premium.
              </p>
              <p>
                They also launched a new website with a design system that scaled across landing pages and ad campaigns. Today they run two Google Ads search campaigns targeting restaurants and facility managers in the Phoenix metro. Facility managers see the film, see the ads, see the site, and they see one company with a real point of view.
              </p>
              <p>
                Live at ambitionac.com. Real crew, real install, real hospital in frame.
              </p>
            </div>
          </div>

          {/* Proof 2: Kohrs */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Demolition and Renovation Content Pipeline</div>
              <h3 className="proof-title">Kohrs</h3>
              <p>
                Kohrs runs demolition and home renovation across the metro. The work is visual: before, after, the process in between. But it was stuck in phone photos and text messages.
              </p>
              <p>
                We built a content pipeline that delivers one or two videos a week to Instagram, TikTok, and LinkedIn without stopping the crew. Twelve videos in March alone. Demo day reels, before-and-afters, educational clips about the process. All shot on real job sites. All AOM-quality production, not stock footage or voiceover reads.
              </p>
              <p>
                Leigh (the owner) posts a video every three days and knows it's going to land with homeowners and contractors who follow her work. That channel is her best sales tool.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We'd Build */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>What We'd Build For You</h2>
        <div className="steps-container">
          <div className="step">
            <h3 className="step-title">Brand Film (14 days)</h3>
            <p className="step-text">Your story told in a way that wins bids. We'll shoot on real job sites. No reenactments. No voiceover explaining what you're looking at. The work speaks.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Website Overhaul (7-day rebuild)</h3>
            <p className="step-text">Design system built for construction. FAQs, service pages, testimonials, case studies. Ready for your ads.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Ongoing Content (retainer)</h3>
            <p className="step-text">One or two videos a week. We'll brief it, shoot it, edit it, and post it to Instagram, TikTok, LinkedIn. Your channel becomes your best sales tool.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Google Ads Campaigns</h3>
            <p className="step-text">We'll write search ad copy, build landing pages, and capture b-roll of your work. Set it up and run it.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">How long does a brand film take?</h3>
            <p className="faq-a">14 days from shoot to delivery. We'll brief it on day 1, shoot on days 2-3, and deliver a locked cut by day 14. Revisions included.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Will you shut down my crew while you film?</h3>
            <p className="faq-a">No. We shoot around your schedule and capture your real work. The hospital emergency call in Ambition's film wasn't staged; it happened while we were there.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What's the difference between a brand film and Google Ads?</h3>
            <p className="faq-a">Brand film is your company's story (three to five minutes). Ads are search results (six seconds to one minute). Both land on screens, but film builds trust over time and ads drive immediate leads. You want both.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How much does this cost?</h3>
            <p className="faq-a">A brand film costs what a brand film costs (crew, equipment, location, music, post-production). A website rebuild takes seven days because design, content review, and testing take seven days. We'll give real numbers in a proposal before anything is booked.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Start the conversation<i className="sq" /></h2>
        <a href="mailto:hello@aheadofmarket.com" className="btn-contact">
          Send us a message
        </a>
        <div className="closing-contact-info">
          <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
          <a href="tel:+16023732164">602 373 2164</a>
          <span className="closing-note">We reply within 24 hours</span>
        </div>
      </section>

      {/* Footer */}
      <ServiceFooter current="" />
    </div>
  );
}
