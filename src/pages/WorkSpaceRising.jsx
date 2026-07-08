import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// Space Rising case study: SpaceOS directory platform for space industry coordination
// Mission: aheadofmarket.com:home (R25, per-client case-study pages for organic SEO)

const CSS = `
.wk-sr {
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
.wk-sr *, .wk-sr *::before, .wk-sr *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-sr a { color:inherit; text-decoration:none; }
.wk-sr button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-sr img, .wk-sr video { display:block; max-width:100%; }
.wk-sr a:focus-visible, .wk-sr button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-sr .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-sr .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-sr .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-sr .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-sr .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-sr .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-sr .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-sr .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-sr .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-sr .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-sr .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-sr .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-sr .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-sr .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-sr .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-sr .proof-block { gap:3rem; }
}
.wk-sr .proof-text { flex:1; }
.wk-sr .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-sr .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-sr .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wk-sr video {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px;
}

.wk-sr .video-grid {
  display:grid; grid-template-columns:1fr; gap:2rem; margin:2rem 0;
  max-width:600px;
}
@media(min-width:860px){
  .wk-sr .video-grid { grid-template-columns:repeat(2, 1fr); gap:1.6rem; }
}
.wk-sr .video-card {
  display:flex; flex-direction:column;
}
.wk-sr .video-card video {
  width:100%; height:auto; border-radius:6px; margin:0;
}
.wk-sr .video-card .label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-top:.8rem; margin-bottom:.2rem;
}

.wk-sr .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-sr .proof-link:hover { color:var(--paper); }

.wk-sr .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-sr .cta-btn:hover { background:var(--gold-deep); }
`;

export default function WorkSpaceRising() {
  useEffect(() => {
    document.title = 'Space Rising Directory Platform | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Space Rising SpaceOS directory platform for coordinating the space industry. Interactive discovery and partnership discovery built for space economy leaders.');
    }
  }, []);

  return (
    <div className="wk-sr">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <a className="cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <section className="section hero">
        <h1>Space Rising<span className="sq"></span></h1>
        <p className="tagline">Industry coordination platform connecting the fragmented space economy</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Space Industry Coordination</h2>
              <p>The space industry is siloed and immature, lacking a neutral coordination layer. Space Rising needed a platform to connect investors, companies, governments, and researchers across the fragmented ecosystem. The mission was to build SpaceOS, an interactive directory and coordination tool that becomes essential infrastructure for anyone operating in the space economy.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">SpaceOS Platform and Marketing</h2>
            <p>We delivered the Space Rising brand identity, marketing site, and the SpaceOS platform itself: a live directory featuring searchable company profiles, job listings, event calendar, research reports, and membership management. The platform went live at spacerising.org for the Phoenix Space Rising Congress (April 2026), where 1,000+ space industry leaders gathered for the pre-launch demo.</p>

            <div className="video-grid">
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/spacerising-render.jpg">
                  <source src="/videos/spacerising-render.mp4" type="video/mp4" />
                </video>
                <div className="label">Platform Overview</div>
              </div>
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/spacerising-event.jpg">
                  <source src="/videos/spacerising-event.mp4" type="video/mp4" />
                </video>
                <div className="label">Event Coverage</div>
              </div>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">Live Directory, 1,000+ Users</h2>
              <p>SpaceOS launched live at the Phoenix Space Rising Congress on April 29, 2026. The platform immediately became a working tool for the space industry. Companies registered profiles, posted job openings, and submitted research findings. Membership grew from zero to over 1,000 accounts in the first week. The platform is now a permanent coordination layer for the space economy, hosted at spacerising.org.</p>
              <p>Taryn and the Space Rising team positioned SpaceOS as essential infrastructure for anyone pursuing space projects, partnerships, or investment. The directory reduced discovery friction for an industry that had been coordinating via email threads and LinkedIn.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Brand identity</strong>: Space Rising visual language and messaging
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Marketing site</strong>: Positioning and campaign landing pages
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Platform architecture</strong>: SpaceOS directory on Ben's sourcing infrastructure
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Event production</strong>: Congress coverage and pre-launch demo coordination
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Ready to build industry infrastructure<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We build platforms and coordination layers for fragmented industries and emerging markets.
        </p>
        <a className="cta-btn" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </section>

      <ServiceFooter current="/work/space-rising" />
    </div>
  );
}
