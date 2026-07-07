import React, { useEffect, useRef, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// Service page: Documentary & Long-Form Video
// Mission: aheadofmarket.com:home (R20.6 — fourth service page, same design system)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client proof points.

const CSS = `
.svd {
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
.svd *, .svd *::before, .svd *::after { box-sizing:border-box; margin:0; padding:0; }
.svd a { color:inherit; text-decoration:none; }
.svd button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.svd img { display:block; max-width:100%; }
.svd a:focus-visible, .svd button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.svd .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.svd .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.svd .chrome-top a { pointer-events:auto; transition:color .15s; }
.svd .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.svd .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.svd .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.svd .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.svd .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.svd .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.svd .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.svd .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.svd .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.svd .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.svd .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.svd .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.svd .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.svd .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.svd .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.svd .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .svd .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.svd .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .svd .proof-block { gap:3rem; }
}
.svd .proof-text { flex:1; }
.svd .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.svd .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.svd .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.svd .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.svd .proof-link:hover { color:var(--paper); }

/* how it works */
.svd .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.svd .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.svd .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.svd .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.svd .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.svd .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.svd .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.svd .faq-item:first-child { border-top:none; padding-top:0; }
.svd .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.svd .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.svd .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.svd .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.svd .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.svd .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.svd .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .svd .closing-contact-info { flex-direction:row; gap:2rem; }
}
.svd .closing-contact-info a { color:var(--gold); transition:color .15s; }
.svd .closing-contact-info a:hover { color:var(--paper); }
.svd .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.svd .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .svd { scroll-behavior:auto; }
}
`;

export default function ServiceDocumentary() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Documentary Filmmaking & Long-Form Video';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Multi-part documentaries for founders and change-makers. Shot and edited by production professionals. Months of work done right.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'Multi-part documentaries for founders and change-makers. Shot and edited by production professionals. Months of work done right.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="svd">
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
          Documentary<br />& Long-Form<br />Video<i className="sq" />
        </h1>
        <p className="tagline">
          Build credibility. Tell the truth. Own the narrative. It takes months. It's worth it.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* The Offer */}
      <section className="section">
        <h2 className="offer-header">A documentary from AOM is</h2>
        <ul className="offer-list">
          <li>Multi-part long-form (3 parts, 5 parts, whatever the story needs)</li>
          <li>Shot and edited like a real film (interviews, location footage, sound design, music, color)</li>
          <li>Focused on one person, one event, or one idea (not a montage of your company)</li>
          <li>Timeline measured in months, not weeks (typical: 3-6 months from first shoot to final cut)</li>
        </ul>
        <p style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--mut)', fontSize: 'clamp(.95rem,1.2vw,1.05rem)' }}>
          This is for founders with a story. For companies launching a new category. For change-makers who need credibility that a 60-second film can't carry.
        </p>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: Brandon Wiley */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Founder Story at Scale</div>
              <h3 className="proof-title">Brandon Wiley Amusement Park</h3>
              <p>
                Brandon Wiley is launching an amusement park in Arizona. It's his obsession, five years of financing, design, and legal work building to opening day. That story is not a commercial. It's a documentary.
              </p>
              <p>
                We're shooting multi-part long-form for Brandon. Different sections: the founding story, the design vision, the financial reality, the team building it. Edited in a way that feels like a feature film, not corporate video. The scope evolved as the story got real, we stayed flexible and let the narrative lead.
              </p>
              <p>
                This is months of work. It's worth months of work because the stake is real.
              </p>
            </div>
          </div>

          {/* Proof 2: Included Health */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Event Coverage at Scale</div>
              <h3 className="proof-title">Included Health Client Summit</h3>
              <p>
                Included Health hosts an annual Client Summit, three days of keynotes, sessions, thought leaders, networking. It's not one video. It's an editorial project.
              </p>
              <p>
                We produced on-site for the full three days, captured keynotes, sessions, interviews, and b-roll. Built a Frame.io project with organized clips. Delivered both a highlight reel for marketing and standalone session videos for members to watch.
              </p>
              <p>
                The relationship is warm and recurring. They call us back each year because the first project was thorough and professional.
              </p>
            </div>
          </div>

          {/* Proof 3: Why We're Different */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Differentiator</div>
              <h3 className="proof-title">Documentary is Different</h3>
              <p>
                Most production companies and agencies can shoot commercials. They can edit YouTube videos. But long-form documentary is different. It requires editorial judgment, interview technique, footage discipline, sound design and color, and willingness to spend weeks in post-production.
              </p>
              <p>
                We do this. Most agencies don't. It's why founders call us. A documentary builds credibility you cannot buy. It tells the story only you can tell. And when it lands, it stays.
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
            <h3 className="step-title">Concept & Scoping</h3>
            <p className="step-text">2-3 weeks. We interview you about the story. We watch you work or attend an event. We understand the arc. We lock how many parts, rough length, and production timeline.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3 className="step-title">Production</h3>
            <p className="step-text">Varies. If it's a founder story, we might film over 2-3 months (interviews + location work + behind-the-scenes). If it's event coverage, we're on-site for the full event. Real crew, real sound, real gear.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3 className="step-title">Rough Cut & Post</h3>
            <p className="step-text">2-3 weeks rough cut, then 3-4 weeks for locked edit, color grading, sound design, music, motion graphics if needed. We move methodically, no rushing.</p>
          </div>
          <div className="step">
            <div className="step-num">4</div>
            <h3 className="step-title">Deliver</h3>
            <p className="step-text">Final files, multiple formats, captions, and any derivative cuts (social clips, highlight reel, etc.). Ready to deploy across platforms.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">What's the difference between a brand film and a documentary?</h3>
            <p className="faq-a">A brand film is 60-90 seconds, one story, built to convert. A documentary is multi-part, multiple interviews, designed to build credibility and tell the real story. Brand film sells. Documentary educates.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How much does this cost?</h3>
            <p className="faq-a">It depends on production scope, number of parts, and post-production complexity. We give real numbers in a proposal before anything is booked.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can we do this faster?</h3>
            <p className="faq-a">Not really. The whole point is that it takes time. If you have a tight timeline, a brand film might be smarter.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What if we're not ready yet?</h3>
            <p className="faq-a">That's okay. We can start with a brand film, then expand into long-form documentary later. They're not mutually exclusive.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Who should do this?</h3>
            <p className="faq-a">Founders with a story, non-profits with a mission, companies launching a new category, change-makers who need credibility beyond the product. If you're not comfortable being on camera and telling the real story, this isn't the right tool.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How many interviews do you do?</h3>
            <p className="faq-a">It depends on the story. A founder documentary might have 3-5 interviews. An event documentary might have 10+. We decide based on the narrative we're building.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can you film internationally?</h3>
            <p className="faq-a">Yes. Travel is built into the cost. We've filmed locally and remotely depending on where the story lives.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What happens after we launch?</h3>
            <p className="faq-a">You own the footage and the final files. If you want to update or cut clips later, we can do that. But long-form documentary is built to last, you're not updating it every quarter.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Ready to tell the full story<i className="sq" /></h2>
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
      <ServiceFooter current="/services/documentary" />
    </div>
  );
}
