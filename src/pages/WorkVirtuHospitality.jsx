import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import LazyGumlet from '../components/home/LazyGumlet';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Virtu Hospitality case study: brand film
// Mission: aheadofmarket.com:home (R25, per-client case-study pages for organic SEO)

const CSS = `
.wk-vh {
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
.wk-vh *, .wk-vh *::before, .wk-vh *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-vh a { color:inherit; text-decoration:none; }
.wk-vh button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-vh img { display:block; max-width:100%; }
.wk-vh a:focus-visible, .wk-vh button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-vh .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-vh .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-vh .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-vh .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-vh .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-vh .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-vh .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-vh .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-vh .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-vh .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-vh .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-vh .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-vh .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-vh .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-vh .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-vh .proof-block { gap:3rem; }
}
.wk-vh .proof-text { flex:1; }
.wk-vh .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-vh .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-vh .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}

.wk-vh .film-embed {
  width:100%; max-width:700px; margin:1.6rem 0; border-radius:8px; aspect-ratio:16/9; overflow:hidden;
}

.wk-vh .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-vh .proof-link:hover { color:var(--paper); }

.wk-vh .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-vh .cta-btn:hover { background:var(--gold-deep); }
`;

export default function WorkVirtuHospitality() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Virtu Hospitality Brand Film | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Virtu Hospitality brand film capturing the essence of hospitality leadership. A story about understanding who they are and what they stand for.');
    }
  }, []);

  return (
    <>
    <div className="wk-vh">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/">
          <BrandMark kind="mono" />
        </a>
        <button type="button" className="cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <section className="section hero">
        <h1>Virtu Hospitality<span className="sq"></span></h1>
        <p className="tagline">Brand film about understanding who they are and what they stand for</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Capturing Hospitality Leadership</h2>
              <p>Virtu Hospitality Group needed a brand film that went beyond listing their services. The goal was to capture what makes them distinct as leaders in the hospitality space: their values, their people, and the care they bring to every guest experience. The film needed to resonate with both partners and guests, showing the intention and quality that define Virtu's approach.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">A Story About Care and Intention</h2>
            <p>We produced a brand film that positions Virtu not as a service provider, but as leaders who understand hospitality as a craft. The film weaves together interviews with Virtu's team, footage of their properties and guest experiences, and a narrative about the values that guide every decision. The result is a piece that feels earned, not performed, showing the genuine care and attention that distinguishes them in market.</p>

            <div className="film-embed">
              <LazyGumlet id="698a5ef5fc23d3d76fa87ef4" />
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">A Film That Resonates</h2>
              <p>The Virtu brand film became a cornerstone of their marketing strategy, used across partnership conversations, investor presentations, and guest communications. The narrative framing, focused on care and intention rather than amenities, positioned them distinctly within the hospitality landscape. Partners and guests alike found the film's authenticity compelling, seeing not just what Virtu offers, but who they are.</p>
              <p>The film has been deployed across their website, social media, and direct outreach, becoming synonymous with Virtu's brand positioning as thoughtful hospitality leaders.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Brand film production</strong>: Story-driven narrative positioning their values and culture
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Interview capture</strong>: Leadership and team testimonials
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Property & experience b-roll</strong>: Footage of their hospitality in action
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Color grading & sound design</strong>: Premium finish for high-touch brand positioning
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Tell your brand's real story<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We make brand films that show who you are, not just what you do, creating resonance with partners, guests, and markets.
        </p>
        <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </section>

      <ServiceFooter current="/work/virtu-hospitality" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Virtu Hospitality',
          description: 'Virtu Hospitality brand film capturing the essence of hospitality leadership. A story about understanding who they are and what they stand for.',
          url: 'https://aheadofmarket.com/work/virtu-hospitality',
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
