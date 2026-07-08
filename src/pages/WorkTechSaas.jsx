import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Work filter page: Tech & SaaS Industry
// Mission: aheadofmarket.com:home (R20.8 — work filter pages, same design system as services)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client proof points.

const CSS = `
.wkt {
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
.wkt *, .wkt *::before, .wkt *::after { box-sizing:border-box; margin:0; padding:0; }
.wkt a { color:inherit; text-decoration:none; }
.wkt button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wkt img { display:block; max-width:100%; }
.wkt a:focus-visible, .wkt button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.wkt .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.wkt .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wkt .chrome-top a { pointer-events:auto; transition:color .15s; }
.wkt .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wkt .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wkt .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wkt .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.wkt .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wkt .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.wkt .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wkt .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wkt .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.wkt .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wkt .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.wkt .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.wkt .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.wkt .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.wkt .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.wkt .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wkt .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wkt .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wkt .proof-block { gap:3rem; }
}
.wkt .proof-text { flex:1; }
.wkt .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wkt .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wkt .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wkt .proof-image {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px; display:block;
}
.wkt .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wkt .proof-link:hover { color:var(--paper); }

/* how it works */
.wkt .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.wkt .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.wkt .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.wkt .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.wkt .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.wkt .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.wkt .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.wkt .faq-item:first-child { border-top:none; padding-top:0; }
.wkt .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.wkt .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.wkt .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.wkt .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.wkt .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.wkt .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.wkt .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .wkt .closing-contact-info { flex-direction:row; gap:2rem; }
}
.wkt .closing-contact-info a { color:var(--gold); transition:color .15s; }
.wkt .closing-contact-info a:hover { color:var(--paper); }
.wkt .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.wkt .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

/* case studies section */
.wkt .case-studies-list {
  display:flex; flex-direction:column; gap:1.6rem; max-width:800px; margin:0 auto;
}
.wkt .case-study-link {
  display:block; padding:1.6rem; border:1px solid rgba(196,164,106,.2); border-radius:8px;
  transition:border-color .15s, background .15s;
}
.wkt .case-study-link:hover { border-color:rgba(196,164,106,.4); background:rgba(196,164,106,.04); }
.wkt .case-study-title {
  display:block; font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,2vw,1.4rem); color:var(--paper); margin-bottom:.4rem;
}
.wkt .case-study-link:hover .case-study-title { color:var(--gold); }
.wkt .case-study-sub {
  display:block; font-size:.9rem; color:var(--mut); font-weight:500;
}

@media(prefers-reduced-motion:reduce){
  .wkt { scroll-behavior:auto; }
}
`;

const poster = (id, w = 1200) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

export default function WorkTechSaas() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Video Production for SaaS Startups';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'AOM produces brand films and founder story videos for tech companies. See how ISA Energy and Space Rising built investor credibility.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'AOM produces brand films and founder story videos for tech companies. See how ISA Energy and Space Rising built investor credibility.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="wkt">
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
          Position Yourself as Category-Defining<i className="sq" />
        </h1>
        <p className="tagline">
          Tech founders have one shot to explain what you've built. Words fail. Video lands. We've positioned quantum tech, space industry platforms, and hardware startups as category-defining. Video is how investors and customers decide to follow you.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* Who This Is For */}
      <section className="section">
        <h2 className="offer-header">Who This Is For</h2>
        <ul className="offer-list">
          <li>Tech founders raising capital or scaling your customer base</li>
          <li>You've got a core insight, a team, and a roadmap</li>
          <li>Investors and customers need to hear it from you, not your pitch deck</li>
          <li>You need video that positions you as category-defining, not one of many</li>
        </ul>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: ISA Energy */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Quantum Tech Investor Narrative</div>
              <h3 className="proof-title">ISA Energy</h3>
              <p>
                ISA Energy is a quantum technology company founded by Hunter and Skylar. Their ambient energy capture solves a problem most startups can't even articulate. The founders needed a 2:30 brand film that would sit across investor decks and position ISA as the category leader.
              </p>
              <img className="proof-image" src={poster('698a5fcdfc23d3d76fa893b8', 800)} alt="ISA Energy brand film" />
              <p>
                We spent a day in the lab with them. Shot the co-founders in their space, captured the device, filmed the visual story of a problem solved. We cut it with a wedding-editorial visual language: intimacy, stakes, devotion. The result is investor-grade video that builds credibility without the hype.
              </p>
              <p>
                It's the difference between "we built something cool" and "we changed an industry."
              </p>
            </div>
          </div>

          {/* Proof 2: Space Rising */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Platform as Infrastructure</div>
              <h3 className="proof-title">Space Rising</h3>
              <p>
                Taryn built a neutral platform to coordinate a siloed space industry: suppliers, launches, industry groups, all connected. Space OS (formerly Space Rising Directory) is a directory and coordination layer that becomes essential to everyone.
              </p>
              <p>
                The problem was complex: space industry is fragmented. The solution was simple: infrastructure that lets everyone talk. We positioned the platform that way in film and marketing.
              </p>
              <p>
                We built brand films, captured a launch event at the Phoenix Space Rising Congress (keynotes, sessions, interviews on-site), and created an interactive directory product. Space Rising went from "what even is this?" to owning the space industry coordinator position. Hundreds of space companies now use Space OS as their operational hub.
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
            <h3 className="step-title">Founder Story Video (14 days)</h3>
            <p className="step-text">Your story told in a way that lands with investors. We position your core insight as category-defining. Three to five minutes, one take, no voiceover read.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Product Launch Film (7 days)</h3>
            <p className="step-text">Launch your SaaS or hardware with video. We show what it does, who uses it, and why it matters.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Testimonial & Case Study Videos</h3>
            <p className="step-text">Your customers on camera, talking about the outcome. Not scripted. Real.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Event Coverage (48-hour turnaround)</h3>
            <p className="step-text">You're pitching at a conference or hosting a launch. We capture it, cut a hype reel in 48 hours, and ship it.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">Do I really need a founder story video?</h3>
            <p className="faq-a">Yes. Investors want to know who you are before they read your deck. Customers want to believe in you. A three-minute video where you explain the problem, your insight, and what's next is worth a thousand emails.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How do you make tech video interesting?</h3>
            <p className="faq-a">Show the work. We film your lab, your team, your product in action. We cut it with a pace that matches your idea's urgency. No stock footage. No voiceover explaining what we're looking at. The work speaks.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What's the timeline for a founder story video?</h3>
            <p className="faq-a">14 days from first call to locked cut. Day 1 is the brief. Days 2-3 are shooting. Days 4-14 are editing, feedback rounds, and revisions. You see rough cuts along the way.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How do you make sure the video represents my company accurately?</h3>
            <p className="faq-a">We spend time with you first. A 90-minute call walks through your founding story, your core insight, who your audience is, and what you want them to feel. We write that insight into the script. Then we shoot it.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      {/* Related Case Studies */}
      <section className="section">
        <h2 className="offer-header">Tech & SaaS case studies<i className="sq" /></h2>
        <div className="case-studies-list">
          <a href="/work/isa-energy" className="case-study-link">
            <span className="case-study-title">ISA Energy</span>
            <span className="case-study-sub">Investor-grade film series for quantum energy startup</span>
          </a>
          <a href="/work/space-rising" className="case-study-link">
            <span className="case-study-title">Space Rising</span>
            <span className="case-study-sub">SpaceOS directory platform for space economy</span>
          </a>
        </div>
      </section>

      <section className="section closing-cta">
        <h2>Map your story<i className="sq" /></h2>
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

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          name: 'Video Production for SaaS Startups',
          description: 'AOM produces brand films and founder story videos for tech companies. See how ISA Energy and Space Rising built investor credibility.',
          url: 'https://aheadofmarket.com/work/tech-saas',
          author: {
            '@type': 'Organization',
            name: 'Ahead of Market',
          },
        }}
      />
    </div>
  );
}
