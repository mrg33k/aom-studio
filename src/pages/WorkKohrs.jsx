import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Kohrs case study: demolition and construction social content retainer
// Mission: aheadofmarket.com:home (R26, sub-pages enrichment workstream)

const CSS = `
.wk-kohrs {
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
.wk-kohrs *, .wk-kohrs *::before, .wk-kohrs *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-kohrs a { color:inherit; text-decoration:none; }
.wk-kohrs button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-kohrs img, .wk-kohrs video { display:block; max-width:100%; }
.wk-kohrs a:focus-visible, .wk-kohrs button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-kohrs .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-kohrs .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-kohrs .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-kohrs .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-kohrs .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-kohrs .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-kohrs .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-kohrs .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-kohrs .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-kohrs .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-kohrs .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-kohrs .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-kohrs .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-kohrs .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-kohrs .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-kohrs .proof-block { gap:3rem; }
}
.wk-kohrs .proof-text { flex:1; }
.wk-kohrs .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-kohrs .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-kohrs .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wk-kohrs video {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px;
}

.wk-kohrs .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-kohrs .proof-link:hover { color:var(--paper); }

.wk-kohrs .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-kohrs .cta-btn:hover { background:var(--gold-deep); }

.wk-kohrs .note-box {
  background:rgba(196,164,106,.08); border:1px solid rgba(196,164,106,.2);
  border-radius:8px; padding:1.6rem; margin:2rem 0;
  font-size:clamp(.95rem,1.1vw,1.05rem); line-height:1.7; color:var(--mut);
}
`;

export default function WorkKohrs() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Kohrs Construction Social Content | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Kohrs demolition and home renovation social media content retainer. Short-form video for Instagram, TikTok, and LinkedIn.');
    }
  }, []);

  return (
    <>
    <div className="wk-kohrs">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <button type="button" className="cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <section className="section hero">
        <h1>Kohrs<span className="sq"></span></h1>
        <p className="tagline">Construction and renovation social content retainer for jobsite storytelling</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Building Social Presence in Construction</h2>
              <p>Kohrs is a demolition and home renovation company with real expertise and craftsmanship. The challenge was developing an authentic social presence that showcases actual jobsites and the quality of work. Content that builds credibility with potential clients and demonstrates the scale and professionalism of the operation.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">Ongoing Social Content Pipeline</h2>
            <p>We built a systematic content production workflow that captures real jobsites and transforms them into short-form social videos. The approach includes demo day documentation, before-and-after reveals, process work, and educational content. All optimized for Instagram, TikTok, and LinkedIn to reach both homeowners and commercial prospects.</p>

            <div className="note-box">
              12 finished videos delivered from March 2026 shoot. April footage collected and queued for next edit pass. Workflow established for ongoing monthly production.
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">Credibility Through Real Work</h2>
              <p>The jobsite-focused content strategy positioned Kohrs as serious and professional. By showing actual demolition, renovation, and finished work, the social presence builds trust with potential clients seeking established, quality-driven contractors. The content pipeline supports monthly ongoing production for continuous brand presence.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Jobsite documentation</strong>: on-location filming of demolition and renovation work
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Short-form video editing</strong>: platform-optimized content for Instagram, TikTok, LinkedIn
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Content strategy and briefs</strong>: documented approach for before-and-afters, process, education
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Monthly production retainer</strong>: ongoing asset capture and editing workflow
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Ready to showcase your work<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We build social content strategies that position construction and renovation expertise for real client impact.
        </p>
        <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </section>

      <ServiceFooter current="/work/kohrs" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Kohrs',
          description: 'Kohrs demolition and home renovation social media content retainer. Short-form video for Instagram, TikTok, and LinkedIn.',
          url: 'https://aheadofmarket.com/work/kohrs',
          author: {
            '@type': 'Organization',
            name: 'Ahead of Market',
          },
        }}
      />
    </div>
    <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </>
  );
}
