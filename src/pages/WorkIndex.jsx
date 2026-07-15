import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import JsonLd from '../components/JsonLd';

// Work hub page: featured cinematic work plus the complete case-study index
// Mission: aheadofmarket.com:home (R30, cinematic featured-client case studies)

const CSS = `
.wkx {
  --ink:#050505; --ink-2:#0b0b0a; --paper:#f4f0e8;
  --mut:rgba(244,240,232,.72); --line:rgba(244,240,232,.18); --gold:#c4a46a;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --fd:'Inter Tight','Inter',system-ui,Helvetica,Arial,sans-serif;
  --pad:clamp(1.25rem,4vw,4.5rem);
  position:fixed; inset:0; overflow-y:auto; overflow-x:hidden;
  scroll-behavior:smooth; color:var(--paper); background:var(--ink);
  font-family:var(--fx); font-size:16px; line-height:1.6;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
.wkx *, .wkx *::before, .wkx *::after { box-sizing:border-box; margin:0; padding:0; }
.wkx a { color:inherit; text-decoration:none; }
.wkx button { font:inherit; color:inherit; background:none; cursor:pointer; }
.wkx img, .wkx video { display:block; width:100%; }
.wkx a:focus-visible { outline:2px solid var(--gold); outline-offset:4px; }
.wkx .sq { display:inline-block; width:.13em; height:.13em; margin-left:.07em; background:var(--gold); }
.wkx .motion-still { display:none; }

.wkx .chrome-top {
  position:fixed; z-index:40; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:1.1rem var(--pad); pointer-events:none;
  background:linear-gradient(180deg,rgba(5,5,5,.72),transparent);
}
.wkx .chrome-top a, .wkx .chrome-top button { pointer-events:auto; }
.wkx .logo { display:flex; align-items:center; }
.wkx .logo svg { width:auto; height:clamp(24px,4vw,32px); }
.wkx .top-cta, .wkx .cta-btn {
  display:inline-flex; align-items:center; justify-content:center;
  min-height:44px; padding:.8rem 1.25rem; border:1px solid rgba(244,240,232,.55);
  font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase;
  transition:background .18s,color .18s;
}
.wkx .top-cta:hover, .wkx .cta-btn:hover { color:var(--ink); background:var(--paper); }

.wkx .hero {
  position:relative; min-height:100svh; display:flex; align-items:flex-end; overflow:hidden;
  padding:clamp(8rem,18vh,13rem) var(--pad) clamp(3rem,7vh,5rem);
}
.wkx .hero-media, .wkx .hero-scrim { position:absolute; inset:0; }
.wkx .hero-media video, .wkx .hero-media img { height:100%; object-fit:cover; }
.wkx .hero-scrim {
  background:linear-gradient(180deg,rgba(5,5,5,.18) 0%,rgba(5,5,5,.18) 40%,rgba(5,5,5,.94) 100%),
    linear-gradient(90deg,rgba(5,5,5,.38),transparent 72%);
}
.wkx .hero-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wkx .kicker {
  display:block; margin-bottom:1.35rem; color:var(--paper);
  font-size:.67rem; font-weight:800; letter-spacing:.23em; text-transform:uppercase;
}
.wkx .hero h1, .wkx .section-title, .wkx .card-name, .wkx .cta-title, .wkx .small-name {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; letter-spacing:-.055em;
}
.wkx .hero h1 { max-width:10ch; font-size:clamp(3.7rem,11vw,10.8rem); line-height:.78; }
.wkx .hero-bottom {
  display:grid; grid-template-columns:1fr minmax(18rem,36rem); gap:3rem;
  align-items:end; margin-top:clamp(2rem,5vh,4rem); padding-top:1.25rem; border-top:1px solid var(--line);
}
.wkx .hero-bottom span { font-size:.66rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
.wkx .hero-bottom p { font-size:clamp(1rem,1.5vw,1.3rem); line-height:1.45; }

.wkx .featured, .wkx .archive, .wkx .industries {
  padding:clamp(6rem,12vw,11rem) var(--pad); border-top:1px solid var(--line);
}
.wkx .section-inner { width:min(100%,1500px); margin:0 auto; }
.wkx .section-head { display:flex; justify-content:space-between; align-items:end; gap:2rem; margin-bottom:clamp(3rem,7vw,6rem); }
.wkx .section-head .kicker { margin:0; }
.wkx .section-title { max-width:10ch; font-size:clamp(2.8rem,7vw,7.2rem); line-height:.84; }
.wkx .section-note { max-width:35ch; color:var(--mut); font-size:clamp(.95rem,1.2vw,1.1rem); }

.wkx .featured { background:var(--ink-2); }
.wkx .featured-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:clamp(1rem,2.4vw,2.5rem); }
.wkx .featured-card {
  position:relative; min-height:clamp(32rem,66vw,48rem); display:flex; align-items:flex-end; overflow:hidden;
  border:1px solid var(--line); isolation:isolate;
}
.wkx .featured-card:nth-child(2), .wkx .featured-card:nth-child(4) { transform:translateY(clamp(3rem,7vw,7rem)); }
.wkx .card-media, .wkx .card-scrim { position:absolute; inset:0; z-index:-2; }
.wkx .card-media video, .wkx .card-media img { height:100%; object-fit:cover; transition:transform .7s cubic-bezier(.2,.75,.2,1); }
.wkx .featured-card[data-slug="ambition-mechanical"] .card-media video,
.wkx .featured-card[data-slug="ambition-mechanical"] .card-media img { object-position:center 36%; }
.wkx .card-scrim { z-index:-1; background:linear-gradient(180deg,rgba(5,5,5,.06),rgba(5,5,5,.9)); }
.wkx .card-copy { width:100%; padding:clamp(1.5rem,3.5vw,3.5rem); }
.wkx .card-meta { display:flex; justify-content:space-between; gap:1rem; margin-bottom:1rem; font-size:.62rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
.wkx .card-name { font-size:clamp(2.4rem,5.8vw,6rem); line-height:.82; }
.wkx .card-desc { max-width:34rem; margin-top:1.25rem; color:rgba(244,240,232,.8); font-size:clamp(.95rem,1.2vw,1.1rem); }
.wkx .featured-card:hover .card-media video, .wkx .featured-card:hover .card-media img { transform:scale(1.035); }
.wkx .featured-card:hover .card-arrow { transform:translate(3px,-3px); }
.wkx .card-arrow { display:inline-block; transition:transform .18s; }

.wkx .archive { padding-top:clamp(10rem,18vw,17rem); }
.wkx .small-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); border-top:1px solid var(--line); border-left:1px solid var(--line); }
.wkx .small-card { min-height:18rem; display:flex; flex-direction:column; justify-content:space-between; padding:clamp(1.3rem,2.5vw,2.5rem); border-right:1px solid var(--line); border-bottom:1px solid var(--line); transition:background .18s,color .18s; }
.wkx .small-card:hover { color:var(--ink); background:var(--paper); }
.wkx .small-no { font-size:.66rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
.wkx .small-name { font-size:clamp(1.7rem,3.3vw,3.5rem); line-height:.88; }
.wkx .small-desc { max-width:30ch; margin-top:1rem; color:var(--mut); font-size:.92rem; }
.wkx .small-card:hover .small-desc { color:rgba(5,5,5,.68); }

.wkx .industries { background:var(--paper); color:var(--ink); }
.wkx .industries .kicker { color:var(--ink); }
.wkx .industry-row { border-top:1px solid rgba(5,5,5,.25); }
.wkx .industry-link { display:grid; grid-template-columns:5rem 1fr 1fr 2rem; gap:2rem; align-items:center; padding:1.5rem 0; border-bottom:1px solid rgba(5,5,5,.25); }
.wkx .industry-link span:first-child { font-size:.68rem; font-weight:800; letter-spacing:.15em; }
.wkx .industry-link b { font-family:var(--fd); font-size:clamp(1.6rem,3.4vw,3.8rem); line-height:.9; text-transform:uppercase; }
.wkx .industry-link span:nth-child(3) { color:rgba(5,5,5,.64); }
.wkx .industry-link span:last-child { transition:transform .18s; }
.wkx .industry-link:hover span:last-child { transform:translate(3px,-3px); }

.wkx .story-cta {
  position:relative; min-height:78svh; display:flex; align-items:flex-end; overflow:hidden;
  padding:clamp(6rem,13vw,11rem) var(--pad) clamp(3rem,7vw,6rem); border-top:1px solid var(--line);
}
.wkx .story-cta .hero-media, .wkx .story-cta .hero-scrim { position:absolute; inset:0; }
.wkx .story-cta .hero-media video, .wkx .story-cta .hero-media img { height:100%; object-fit:cover; }
.wkx .story-cta .hero-scrim { background:linear-gradient(180deg,rgba(5,5,5,.3),rgba(5,5,5,.95)); }
.wkx .cta-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wkx .cta-title { max-width:12ch; font-size:clamp(3rem,8.5vw,9rem); line-height:.82; }
.wkx .cta-row { display:flex; justify-content:space-between; align-items:end; gap:2rem; margin-top:2.5rem; }
.wkx .cta-row p { max-width:46ch; color:var(--mut); font-size:clamp(1rem,1.35vw,1.2rem); }

.wkx .footer {
  padding:clamp(3rem,6vw,5rem) var(--pad); color:var(--paper); background:var(--ink);
  border-top:1px solid var(--line);
}
.wkx .footer-kick { margin-bottom:1.4rem; font-size:.66rem; font-weight:800; letter-spacing:.22em; text-transform:uppercase; }
.wkx .footer-row { display:flex; flex-wrap:wrap; gap:.4rem 2.4rem; }
.wkx .footer-a { display:flex; align-items:center; gap:.5rem; padding:.8rem 0; font-family:var(--fd); font-size:clamp(1.1rem,2.4vw,1.6rem); font-weight:800; text-transform:uppercase; }
.wkx .footer-a .mk { width:20px; height:20px; }
.wkx .footer-info { display:flex; flex-wrap:wrap; gap:1rem 1.5rem; align-items:baseline; margin-top:2.2rem; padding-top:1.5rem; border-top:1px solid var(--line); color:var(--mut); font-size:.8rem; }
.wkx .footer-info .cr { margin-left:auto; font-size:.64rem; letter-spacing:.14em; text-transform:uppercase; }

@media(max-width:800px) {
  .wkx .top-cta { padding:.7rem .85rem; font-size:.58rem; letter-spacing:.12em; }
  .wkx .hero { min-height:92svh; }
  .wkx .hero h1 { font-size:clamp(3.3rem,19vw,6rem); }
  .wkx .hero-bottom { grid-template-columns:1fr; gap:1.25rem; margin-top:2.25rem; }
  .wkx .section-head { align-items:flex-start; flex-direction:column; }
  .wkx .section-title { font-size:clamp(2.8rem,14vw,5rem); }
  .wkx .featured-grid { grid-template-columns:1fr; }
  .wkx .featured-card { min-height:68svh; }
  .wkx .featured-card:nth-child(2), .wkx .featured-card:nth-child(4) { transform:none; }
  .wkx .card-name { font-size:clamp(2.8rem,14vw,5rem); }
  .wkx .archive { padding-top:clamp(6rem,12vw,9rem); }
  .wkx .small-grid { grid-template-columns:1fr; }
  .wkx .small-card { min-height:14rem; }
  .wkx .industry-link { grid-template-columns:3rem 1fr 1.5rem; gap:1rem; }
  .wkx .industry-link span:nth-child(3) { grid-column:2; }
  .wkx .industry-link span:last-child { grid-column:3; grid-row:1; }
  .wkx .story-cta { min-height:72svh; }
  .wkx .cta-row { align-items:flex-start; flex-direction:column; }
  .wkx .footer-info .cr { width:100%; margin-left:0; }
}
@media(prefers-reduced-motion:reduce) {
  .wkx { scroll-behavior:auto; }
  .wkx video[data-autoplay] { display:none; }
  .wkx .motion-still { display:block; }
  .wkx .featured-card:hover .card-media img { transform:none; }
}
`;

const FEATURED = [
  {
    name: 'ISA Energy', slug: 'isa-energy', type: 'Energy / Film system',
    desc: 'Three investor-grade films that move a breakthrough technology from technical pitch to category narrative.',
    video: '/videos/isa-brand.mp4', poster: '/videos/isa-brand.jpg',
  },
  {
    name: 'Included Health', slug: 'included-health', type: 'Healthcare / Film series',
    desc: 'A three-day summit captured and shaped into culture, event, and thought leadership films.',
    video: '/videos/ih-life.mp4', poster: '/videos/ih-life.jpg',
  },
  {
    name: 'Space Rising', slug: 'space-rising', type: 'Space / Brand + platform',
    desc: 'Identity, website, launch film, and a live coordination platform for the space economy.',
    video: '/videos/spacerising-render.mp4', poster: '/videos/spacerising-render.jpg',
  },
  {
    name: 'Ambition Mechanical', slug: 'ambition-mechanical', type: 'Commercial services / Growth',
    desc: 'A trusted HVAC operator rebuilt as a modern brand, website, search presence, and film system.',
    video: '/videos/ambition-vertical.mp4', poster: '/videos/ambition-vertical.jpg',
  },
];

const REMAINING = [
  { name: 'Brandon Wiley', slug: 'brandon-wiley', desc: 'Long-form founder-story documentary' },
  { name: 'Virtu Hospitality', slug: 'virtu-hospitality', desc: 'Brand film for a hospitality group' },
  { name: 'PA\'LA', slug: 'pala', desc: 'Brand film and social content for a wood-fired restaurant' },
  { name: 'Kohrs', slug: 'kohrs', desc: 'Jobsite social content for a demolition and renovation crew' },
  { name: 'Intelliplay', slug: 'intelliplay', desc: 'Product demo film for an interactive tech platform' },
];

const INDUSTRIES = [
  { name: 'Construction', slug: 'construction', desc: 'Digital marketing and brand leadership for construction firms' },
  { name: 'Tech & SaaS', slug: 'tech-saas', desc: 'Go-to-market strategy and product positioning for tech companies' },
  { name: 'Nonprofit', slug: 'nonprofit', desc: 'Mission-driven storytelling and fundraising narratives' },
];

function useInViewPlayback() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const videos = Array.from(document.querySelectorAll('.wkx video[data-autoplay]'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (isIntersecting && !media.matches) {
          const playPromise = target.play();
          if (playPromise) playPromise.catch(() => {});
        } else {
          target.pause();
        }
      });
    }, { threshold:0.18 });
    const sync = () => {
      observer.disconnect();
      videos.forEach((video) => {
        video.pause();
        if (!media.matches) observer.observe(video);
      });
    };
    sync();
    media.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
      videos.forEach((video) => video.pause());
    };
  }, []);
}

export default function WorkIndex() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Our Work | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Explore Ahead of Market work: case studies in renewable energy, healthcare, construction, tech and more. See how we position growth brands.');
    }
  }, []);
  useInViewPlayback();

  return (
    <>
    <div className="wkx">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6" aria-label="Ahead of Market home"><BrandMark kind="mono" /></a>
        <button type="button" className="top-cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <video muted loop playsInline data-autoplay preload="auto" poster="/videos/hero-poster.jpg">
            <source src="/videos/collage-01.mp4" type="video/mp4" />
          </video>
          <img className="motion-still" src="/videos/hero-poster.jpg" alt="" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <span className="kicker">Ahead of Market / Selected work</span>
          <h1>Work that moves<span className="sq" /></h1>
          <div className="hero-bottom">
            <span>Strategy / Story / Design / Build</span>
            <p>Real companies, real footage, and creative systems built to move people and markets.</p>
          </div>
        </div>
      </header>

      <main>
        <section className="featured">
          <div className="section-inner">
            <div className="section-head">
              <div><span className="kicker">Featured clients / 01</span><h2 className="section-title">The work, full frame<span className="sq" /></h2></div>
              <p className="section-note">Four partnerships spanning film, identity, digital platforms, and sustained market growth.</p>
            </div>
            <div className="featured-grid">
              {FEATURED.map((project, index) => (
                <a key={project.slug} href={`/work/${project.slug}`} className="featured-card" data-slug={project.slug}>
                  <div className="card-media" aria-hidden="true">
                    <video muted loop playsInline data-autoplay preload="metadata" poster={project.poster}>
                      <source src={project.video} type="video/mp4" />
                    </video>
                    <img className="motion-still" src={project.poster} alt="" />
                  </div>
                  <div className="card-scrim" />
                  <div className="card-copy">
                    <div className="card-meta"><span>0{index + 1} / {project.type}</span><span className="card-arrow">↗</span></div>
                    <h3 className="card-name">{project.name}<span className="sq" /></h3>
                    <p className="card-desc">{project.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="archive">
          <div className="section-inner">
            <div className="section-head">
              <div><span className="kicker">More case studies / 02</span><h2 className="section-title">Keep looking<span className="sq" /></h2></div>
              <p className="section-note">Documentary, hospitality, food, construction, and product storytelling.</p>
            </div>
            <div className="small-grid">
              {REMAINING.map((project, index) => (
                <a key={project.slug} href={`/work/${project.slug}`} className="small-card">
                  <span className="small-no">0{index + 5} / Case study ↗</span>
                  <div><h3 className="small-name">{project.name}</h3><p className="small-desc">{project.desc}</p></div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="industries">
          <div className="section-inner">
            <div className="section-head">
              <div><span className="kicker">By industry / 03</span><h2 className="section-title">Go deeper<span className="sq" /></h2></div>
              <p className="section-note">Focused expertise for sectors where trust, clarity, and proof drive the decision.</p>
            </div>
            <div className="industry-row">
              {INDUSTRIES.map((project, index) => (
                <a key={project.slug} href={`/work/${project.slug}`} className="industry-link">
                  <span>0{index + 1}</span><b>{project.name}</b><span>{project.desc}</span><span>↗</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="story-cta">
          <div className="hero-media" aria-hidden="true">
            <video muted loop playsInline data-autoplay preload="metadata" poster="/videos/ih-culture.jpg">
              <source src="/videos/collage-02.mp4" type="video/mp4" />
            </video>
            <img className="motion-still" src="/videos/ih-culture.jpg" alt="" />
          </div>
          <div className="hero-scrim" />
          <div className="cta-copy">
            <span className="kicker">Your story, next</span>
            <h2 className="cta-title">Ready to tell your story<span className="sq" /></h2>
            <div className="cta-row">
              <p>Bring us the company, category, or moment that needs to become impossible to ignore.</p>
              <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-kick">More from AOM</div>
        <div className="footer-row">
          <a className="footer-a" href="/r6"><BrandMark kind="mono" className="mk" /> Home</a>
          <a className="footer-a" href="/services/brand-film">Brand film ↗</a>
          <a className="footer-a" href="/services/web-build">Website design &amp; build ↗</a>
          <a className="footer-a" href="/services/strategy">Strategy &amp; story ↗</a>
          <a className="footer-a" href="/services/documentary">Documentary ↗</a>
        </div>
        <div className="footer-info">
          <button type="button" onClick={() => setBriefModalOpen(true)}>hello@aheadofmarket.com</button>
          <a href="tel:+16023732164">602 373 2164</a>
          <span>We reply within 24 hours</span>
          <span className="cr">© 2026 Ahead of Market</span>
        </div>
      </footer>

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'The work',
          description: 'Explore Ahead of Market work: case studies in renewable energy, healthcare, construction, tech and more. See how we position growth brands.',
          url: 'https://aheadofmarket.com/work',
          author: {
            '@type': 'Organization',
            name: 'Ahead of Market',
            url: 'https://aheadofmarket.com',
            logo: 'https://aheadofmarket.com/assets/logo.svg',
          },
        }}
      />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Ahead of Market',
          url: 'https://aheadofmarket.com',
          logo: 'https://aheadofmarket.com/assets/logo.svg',
        }}
      />
    </div>
    <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </>
  );
}
