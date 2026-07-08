import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// PA'LA case study: wood-fired cooking restaurant brand
// Mission: aheadofmarket.com:home (R26, sub-pages enrichment workstream)

const CSS = `
.wk-pala {
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
.wk-pala *, .wk-pala *::before, .wk-pala *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-pala a { color:inherit; text-decoration:none; }
.wk-pala button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-pala img, .wk-pala video { display:block; max-width:100%; }
.wk-pala a:focus-visible, .wk-pala button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-pala .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-pala .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-pala .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-pala .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-pala .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-pala .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-pala .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-pala .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-pala .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-pala .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-pala .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-pala .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-pala .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-pala .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-pala .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-pala .proof-block { gap:3rem; }
}
.wk-pala .proof-text { flex:1; }
.wk-pala .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-pala .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-pala .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wk-pala video {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px;
}

.wk-pala .video-grid {
  display:grid; grid-template-columns:1fr; gap:2rem; margin:2rem 0;
  max-width:600px;
}
@media(min-width:860px){
  .wk-pala .video-grid { grid-template-columns:1fr; gap:1.6rem; }
}
.wk-pala .video-card {
  display:flex; flex-direction:column;
}
.wk-pala .video-card video {
  width:100%; height:auto; border-radius:6px; margin:0;
}
.wk-pala .video-card .label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-top:.8rem; margin-bottom:.2rem;
}

.wk-pala .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-pala .proof-link:hover { color:var(--paper); }

.wk-pala .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-pala .cta-btn:hover { background:var(--gold-deep); }

.wk-pala .gumlet-embed {
  width:100%; max-width:800px; margin:2rem 0; border-radius:8px; overflow:hidden;
}
`;

const embed = id => `https://play.gumlet.io/embed/${id}?autoplay=true&preload=false&loop=false&background=false&disable_player_controls=false`;

export default function WorkPala() {
  useEffect(() => {
    document.title = 'PA\'LA Restaurant Brand Film | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'PA\'LA wood-fired cooking restaurant brand film. Social-ready content for hospitality, food and beverage marketing.');
    }
  }, []);

  return (
    <div className="wk-pala">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <a className="cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <section className="section hero">
        <h1>PA'LA<span className="sq"></span></h1>
        <p className="tagline">Wood-fired cooking restaurant brand and social content strategy</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Positioning Craft in Hospitality</h2>
              <p>PA'LA operates two Phoenix locations bringing wood-fired cooking to the forefront of dining experience. The challenge was to position the restaurant's craft and ingredient story through content that works across Instagram, TikTok, and the web. Content that tells the story of intention, quality, and the experience of dining at PA'LA.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">Brand Film and Social Strategy</h2>
            <p>We developed a cohesive brand film and social content suite that positions PA'LA as a destination for craft dining. The work captures the restaurant's interior, kitchen detail, and the dining experience, built to resonate on social platforms while maintaining premium quality for web and marketing materials.</p>

            <div className="video-grid">
              <div className="video-card">
                <iframe
                  className="gumlet-embed"
                  src={embed('698a5391fc23d3d76fa7306c')}
                  title="PA'LA Brand Film"
                  allow="autoplay"
                  loading="lazy"
                />
                <div className="label">Brand Film</div>
              </div>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">Social-Ready Brand Asset</h2>
              <p>The brand film became the centerpiece of PA'LA's social strategy, deployed across Instagram, TikTok, and Facebook. The work positioned the restaurant as thoughtful and intentional, capturing the warmth of the space and the care in the kitchen, resonating with diners seeking craft dining experiences.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Brand film production</strong>: restaurant space and kitchen detail
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Social content strategy</strong>: platform-native editing for Instagram, TikTok, Facebook
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Color grading and finishing</strong>: premium look for hospitality brand
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Ready to elevate your brand<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We create brand stories and social content that position hospitality businesses for real impact.
        </p>
        <a className="cta-btn" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </section>

      <ServiceFooter current="/work/pala" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'PA\'LA',
          description: 'PA\'LA wood-fired cooking restaurant brand film. Social-ready content for hospitality, food and beverage marketing.',
          url: 'https://aheadofmarket.com/work/pala',
          author: {
            '@type': 'Organization',
            name: 'Ahead of Market',
          },
        }}
      />
    </div>
  );
}
