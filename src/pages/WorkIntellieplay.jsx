import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Intelliplay case study: tech/gaming product story
// Mission: aheadofmarket.com:home (R26, sub-pages enrichment workstream)

const CSS = `
.wk-intellieplay {
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
.wk-intellieplay *, .wk-intellieplay *::before, .wk-intellieplay *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-intellieplay a { color:inherit; text-decoration:none; }
.wk-intellieplay button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-intellieplay img, .wk-intellieplay video { display:block; max-width:100%; }
.wk-intellieplay a:focus-visible, .wk-intellieplay button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-intellieplay .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-intellieplay .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-intellieplay .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-intellieplay .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-intellieplay .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-intellieplay .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-intellieplay .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-intellieplay .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-intellieplay .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-intellieplay .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-intellieplay .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-intellieplay .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-intellieplay .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-intellieplay .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-intellieplay .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-intellieplay .proof-block { gap:3rem; }
}
.wk-intellieplay .proof-text { flex:1; }
.wk-intellieplay .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-intellieplay .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-intellieplay .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wk-intellieplay video {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px;
}

.wk-intellieplay .video-grid {
  display:grid; grid-template-columns:1fr; gap:2rem; margin:2rem 0;
  max-width:600px;
}
@media(min-width:860px){
  .wk-intellieplay .video-grid { grid-template-columns:1fr; gap:1.6rem; }
}
.wk-intellieplay .video-card {
  display:flex; flex-direction:column;
}
.wk-intellieplay .video-card video {
  width:100%; height:auto; border-radius:6px; margin:0;
}
.wk-intellieplay .video-card .label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-top:.8rem; margin-bottom:.2rem;
}

.wk-intellieplay .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-intellieplay .proof-link:hover { color:var(--paper); }

.wk-intellieplay .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-intellieplay .cta-btn:hover { background:var(--gold-deep); }

.wk-intellieplay .gumlet-embed {
  width:100%; max-width:800px; margin:2rem 0; border-radius:8px; overflow:hidden;
}
`;

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;

export default function WorkIntellieplay() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Intelliplay Product Demo Film | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Intelliplay product demo film. Tech and gaming content that positions innovative platforms for market impact.');
    }
  }, []);

  return (
    <>
    <div className="wk-intellieplay">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <button type="button" className="cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <section className="section hero">
        <h1>Intelliplay<span className="sq"></span></h1>
        <p className="tagline">Product demo film for tech and gaming platform</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Telling a Complex Product Story</h2>
              <p>Intelliplay is a media platform designed for podcast and video content operations. The challenge was translating complex functionality into a compelling narrative, showing how the platform works while communicating the value proposition to both creators and operators who need to manage content at scale.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">Product Demo Film</h2>
            <p>We developed a compelling product demo that walks through Intelliplay's core functionality while maintaining narrative momentum. The film positions the platform as the central tool for podcast and video content teams, demonstrating how it simplifies production, distribution, and management workflows.</p>

            <div className="video-grid">
              <div className="video-card">
                <iframe
                  className="gumlet-embed"
                  src={embed('698a5386aec3d4e420c17a69')}
                  title="Intelliplay Demo Film"
                  allow="autoplay"
                  loading="lazy"
                />
                <div className="label">Product Demo</div>
              </div>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">Clear Product Positioning</h2>
              <p>The demo film became the centerpiece of Intelliplay's pitch deck and investor conversations. By focusing on real workflows and actual product experience, the narrative demonstrated genuine innovation in a crowded content operations space. The film positioned Intelliplay as the essential platform for teams serious about content scale and quality.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Product demo film</strong>: narrative-driven walthrough of core features
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Screen capture and UI documentation</strong>: clean product interface footage
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Narrative structure and pacing</strong>: positioning film for pitch and investor use
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Ready to tell your product story<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We create product films that position tech platforms for investment, adoption, and market impact.
        </p>
        <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </section>

      <ServiceFooter current="/work/intelliplay" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Intelliplay',
          description: 'Intelliplay product demo film. Tech and gaming content that positions innovative platforms for market impact.',
          url: 'https://aheadofmarket.com/work/intelliplay',
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
