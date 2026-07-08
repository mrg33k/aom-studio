import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// Work filter page: Nonprofit Industry
// Mission: aheadofmarket.com:home (R20.8 — work filter pages, same design system as services)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client proof points.

const CSS = `
.wkn {
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
.wkn *, .wkn *::before, .wkn *::after { box-sizing:border-box; margin:0; padding:0; }
.wkn a { color:inherit; text-decoration:none; }
.wkn button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wkn img { display:block; max-width:100%; }
.wkn a:focus-visible, .wkn button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.wkn .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.wkn .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wkn .chrome-top a { pointer-events:auto; transition:color .15s; }
.wkn .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wkn .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wkn .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wkn .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.wkn .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wkn .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.wkn .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wkn .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wkn .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.wkn .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wkn .hero .cta-btn:hover { background:var(--gold-deep); }

/* offer section */
.wkn .offer-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.wkn .offer-list {
  list-style:none; max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:1.6rem;
}
.wkn .offer-list li {
  font-size:clamp(.95rem,1.3vw,1.12rem); line-height:1.7;
  color:var(--mut); border-top:1px solid rgba(255,255,255,.12); padding-top:1rem;
}
.wkn .offer-list li:first-child { border-top:none; padding-top:0; }

/* proof blocks */
.wkn .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wkn .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wkn .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wkn .proof-block { gap:3rem; }
}
.wkn .proof-text { flex:1; }
.wkn .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wkn .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wkn .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wkn .proof-image {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px; display:block;
}
.wkn .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wkn .proof-link:hover { color:var(--paper); }

/* how it works */
.wkn .steps-container {
  max-width:1000px; margin:0 auto;
  display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:2.4rem;
}
.wkn .step {
  padding:2rem; background:rgba(11,11,10,.4); border-radius:8px;
  border:1px solid rgba(196,164,106,.1);
}
.wkn .step-num {
  font-family:var(--fd); font-weight:800;
  font-size:2.4rem; color:var(--gold); margin-bottom:.4rem;
}
.wkn .step-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:1.1rem; margin-bottom:1rem;
}
.wkn .step-text {
  font-size:.95rem; line-height:1.6; color:var(--mut);
}

/* FAQ */
.wkn .faq-list {
  list-style:none; max-width:800px; margin:0 auto;
}
.wkn .faq-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.wkn .faq-item:first-child { border-top:none; padding-top:0; }
.wkn .faq-q {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,1.4vw,1.25rem); color:var(--paper);
  margin-bottom:1rem;
}
.wkn .faq-a {
  font-size:.95rem; line-height:1.7; color:var(--mut);
}

/* closing */
.wkn .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.wkn .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.wkn .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.wkn .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.wkn .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .wkn .closing-contact-info { flex-direction:row; gap:2rem; }
}
.wkn .closing-contact-info a { color:var(--gold); transition:color .15s; }
.wkn .closing-contact-info a:hover { color:var(--paper); }
.wkn .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.wkn .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

/* case studies section */
.wkn .case-studies-list {
  display:flex; flex-direction:column; gap:1.6rem; max-width:800px; margin:0 auto;
}
.wkn .case-study-link {
  display:block; padding:1.6rem; border:1px solid rgba(196,164,106,.2); border-radius:8px;
  transition:border-color .15s, background .15s;
}
.wkn .case-study-link:hover { border-color:rgba(196,164,106,.4); background:rgba(196,164,106,.04); }
.wkn .case-study-title {
  display:block; font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.1rem,2vw,1.4rem); color:var(--paper); margin-bottom:.4rem;
}
.wkn .case-study-link:hover .case-study-title { color:var(--gold); }
.wkn .case-study-sub {
  display:block; font-size:.9rem; color:var(--mut); font-weight:500;
}

@media(prefers-reduced-motion:reduce){
  .wkn { scroll-behavior:auto; }
}
`;

const poster = (id, w = 1200) => `https://video.gumlet.io/697678222b8b17fbb707acef/${id}/thumbnail-1-0.png?format=auto&w=${w}`;

export default function WorkNonprofit() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Video for Nonprofits and Foundations';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'AOM produces videos for nonprofits and mission-driven organizations. See how Conrad Foundation and Space Rising tell their impact stories.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'AOM produces videos for nonprofits and mission-driven organizations. See how Conrad Foundation and Space Rising tell their impact stories.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="wkn">
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
          Your Mission Needs Video<i className="sq" />
        </h1>
        <p className="tagline">
          Mission-driven organizations have one problem: nobody outside your circle knows what you do or why it matters. Video changes that. We've positioned nonprofits and foundations in a way that opens wallets and builds momentum.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* Who This Is For */}
      <section className="section">
        <h2 className="offer-header">Who This Is For</h2>
        <ul className="offer-list">
          <li>Nonprofits, foundations, and mission-driven organizations in the Southwest</li>
          <li>You're doing work that matters; your board, donors, and community need to understand it</li>
          <li>You want to raise capital, recruit talent, and build momentum without sounding like every other nonprofit</li>
        </ul>
      </section>

      {/* Proof Blocks */}
      <section className="section">
        <div className="proof-grid">
          {/* Proof 1: Conrad Foundation */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Educational Platform for Innovation</div>
              <h3 className="proof-title">Conrad Foundation</h3>
              <p>
                The Conrad Foundation honors astronaut Pete Conrad's legacy by building the next generation of innovators and entrepreneurs. Nancy Conrad is the Founding Chairman. The Foundation runs the Conrad Spirit of Innovation Challenge, a STEM entrepreneurship competition for students 13-18 across the country.
              </p>
              <p>
                The Foundation saw an opportunity: a new initiative called Mission Water—master classes on water security, efficiency, and purity. No format. No platform. No way to teach it at scale. We positioned it as an interactive platform, not a classroom. Three-chapter storyline. Games. Video. Interactive content.
              </p>
              <p>
                We pitched a partnership model where AOM designs and delivers the platform, handles the marketing and activation, and helps Nancy take Mission Water from an idea to something thousands of students can use. Your mission is everything. The video, the platform, the experience we build around it all serve the mission.
              </p>
            </div>
          </div>

          {/* Proof 2: Included Health */}
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Annual Summit and Recurring Engagement</div>
              <h3 className="proof-title">Included Health</h3>
              <p>
                Included Health is a healthcare company focused on bringing quality care and counseling to communities that are underserved. Every year, they host a Client Summit: three days of keynotes, sessions, workshops, interviews.
              </p>
              <p>
                We captured all of it. Keynotes. Sessions. b-roll. Interviews with their team. We delivered a full package: hype reel (energetic, two minutes), edited sessions (one per speaker), and behind-the-scenes footage.
              </p>
              <p>
                The summit became an asset. Included Health shared the hype reel at conferences. Members watched sessions they missed. Donors saw the community being built. Included Health came back for a second contract on SME interview videos, color-corrected and packaged for their marketing. That's what nonprofit partnership looks like: you deliver one project well, and they trust you for the next.
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
            <h3 className="step-title">Brand Film or Origin Story (14 days)</h3>
            <p className="step-text">Your mission told in a way that opens wallets. We film your team, your beneficiaries, your work in the real world. No narration. No voiceover.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Educational Platform or Experience (3-6 months)</h3>
            <p className="step-text">If you're teaching, we build a platform. Video, games, interactive content. Whatever it takes to get your message in front of students, donors, and community.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Event Coverage (48-hour hype reel)</h3>
            <p className="step-text">You're hosting a summit, gala, or conference. We capture the energy and deliver a hype reel in 48 hours. Full edited sessions available the following week.</p>
          </div>
          <div className="step">
            <h3 className="step-title">Donor Video (7 days)</h3>
            <p className="step-text">A three to five-minute video that shows your impact. Not a fundraising pitch. Not emotional manipulation. Just facts: who you serve, what changed, why it matters.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <h2 className="offer-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>Questions</h2>
        <ul className="faq-list">
          <li className="faq-item">
            <h3 className="faq-q">How much does nonprofit video production cost?</h3>
            <p className="faq-a">It depends on the scope. We build pricing around impact, not hype. A brand film costs what a brand film costs (crew, location, music, post). An educational platform costs more but reaches more people. We walk you through the math so you can decide what's worth it for your mission.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">Can you work with a nonprofit budget?</h3>
            <p className="faq-a">Yes, but let's be clear about what that means. If your budget is very tight, we build a smaller scope: one edited session from your event, or a branded testimonial video from a board member. We'd rather do one thing well than five things poorly.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">What makes nonprofit video different from commercial video?</h3>
            <p className="faq-a">Nonprofit video is about impact, not product. We're not selling a service. We're opening a window into a mission. No hype. No urgency. Just facts and heart. That integrity is what moves donors.</p>
          </li>
          <li className="faq-item">
            <h3 className="faq-q">How long does event coverage take to edit?</h3>
            <p className="faq-a">Hype reel (energetic cut, two minutes): 48 hours. Full edited sessions (one speaker per session, 15-40 minutes): one week. Behind-the-scenes reel: one week. We get you what matters most in time for you to share it.</p>
          </li>
        </ul>
      </section>

      {/* Closing CTA */}
      {/* Related Case Studies */}
      <section className="section">
        <h2 className="offer-header">Nonprofit case studies<i className="sq" /></h2>
        <div className="case-studies-list">
          <a href="/work/included-health" className="case-study-link">
            <span className="case-study-title">Included Health</span>
            <span className="case-study-sub">Client summit coverage and SME video content</span>
          </a>
        </div>
      </section>

      <section className="section closing-cta">
        <h2>Move your mission forward<i className="sq" /></h2>
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
