import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Ambition Mechanical case study: brand, web, performance, and content platform
// Mission: aheadofmarket.com:home (R30, cinematic featured-client case studies)

const CSS = `
.wk-amb {
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
.wk-amb *, .wk-amb *::before, .wk-amb *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-amb a { color:inherit; text-decoration:none; }
.wk-amb button { font:inherit; color:inherit; background:none; cursor:pointer; }
.wk-amb img, .wk-amb video { display:block; width:100%; }
.wk-amb a:focus-visible, .wk-amb video:focus-visible { outline:2px solid var(--gold); outline-offset:4px; }
.wk-amb .sq { display:inline-block; width:.13em; height:.13em; margin-left:.07em; background:var(--gold); }
.wk-amb .motion-still { display:none; }

.wk-amb .chrome-top {
  position:fixed; z-index:40; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:1.1rem var(--pad); pointer-events:none;
  background:linear-gradient(180deg,rgba(5,5,5,.72),transparent);
}
.wk-amb .chrome-top a, .wk-amb .chrome-top button { pointer-events:auto; }
.wk-amb .logo { display:flex; align-items:center; }
.wk-amb .logo svg { width:auto; height:clamp(24px,4vw,32px); }
.wk-amb .top-cta, .wk-amb .cta-btn, .wk-amb .site-link {
  display:inline-flex; align-items:center; justify-content:center;
  min-height:44px; padding:.8rem 1.25rem; border:1px solid rgba(244,240,232,.55);
  font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase;
  transition:background .18s,color .18s;
}
.wk-amb .top-cta:hover, .wk-amb .cta-btn:hover, .wk-amb .site-link:hover { color:var(--ink); background:var(--paper); }

.wk-amb .hero {
  position:relative; min-height:100svh; display:flex; align-items:flex-end;
  overflow:hidden; padding:clamp(8rem,18vh,13rem) var(--pad) clamp(3rem,7vh,5rem);
}
.wk-amb .hero-media, .wk-amb .hero-scrim { position:absolute; inset:0; }
.wk-amb .hero-media video, .wk-amb .hero-media img { height:100%; object-fit:cover; object-position:center 38%; }
.wk-amb .hero-scrim {
  background:linear-gradient(180deg,rgba(5,5,5,.18) 0%,rgba(5,5,5,.08) 36%,rgba(5,5,5,.92) 100%),
    linear-gradient(90deg,rgba(5,5,5,.42),transparent 75%);
}
.wk-amb .hero-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-amb .kicker {
  display:block; margin-bottom:1.35rem; color:var(--paper);
  font-size:.67rem; font-weight:800; letter-spacing:.23em; text-transform:uppercase;
}
.wk-amb .hero h1, .wk-amb .display, .wk-amb .chapter-title, .wk-amb .cta-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; letter-spacing:-.055em;
}
.wk-amb .hero h1 { max-width:13ch; font-size:clamp(3.4rem,9vw,8.8rem); line-height:.77; }
.wk-amb .hero h1 span:first-child { display:block; }
.wk-amb .hero-bottom {
  display:grid; grid-template-columns:1fr minmax(18rem,36rem); gap:3rem;
  align-items:end; margin-top:clamp(2rem,5vh,4rem); padding-top:1.25rem; border-top:1px solid var(--line);
}
.wk-amb .hero-bottom span { font-size:.66rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
.wk-amb .hero-bottom p { color:var(--paper); font-size:clamp(1rem,1.5vw,1.3rem); line-height:1.45; }

.wk-amb .proof, .wk-amb .work, .wk-amb .site, .wk-amb .results, .wk-amb .deliverables {
  padding:clamp(6rem,14vw,13rem) var(--pad); border-top:1px solid var(--line);
}
.wk-amb .proof-inner, .wk-amb .work-inner, .wk-amb .site-inner, .wk-amb .results-inner, .wk-amb .deliverables-inner {
  width:min(100%,1500px); margin:0 auto;
}
.wk-amb .proof-row {
  display:grid; grid-template-columns:minmax(10rem,.7fr) minmax(20rem,1.25fr) minmax(18rem,1fr);
  gap:clamp(2rem,5vw,6rem); align-items:start;
}
.wk-amb .proof-row .kicker { margin:0; }
.wk-amb .display { font-size:clamp(2.6rem,6vw,6.5rem); line-height:.88; }
.wk-amb .body-copy { color:var(--mut); font-size:clamp(1rem,1.35vw,1.22rem); line-height:1.7; }
.wk-amb .body-copy p + p { margin-top:1.2rem; }

.wk-amb .work { background:var(--ink-2); }
.wk-amb .work-intro { max-width:70rem; margin-bottom:clamp(4rem,9vw,9rem); }
.wk-amb .work-intro .display { margin-bottom:1.7rem; }
.wk-amb .work-intro .body-copy { max-width:62ch; }
.wk-amb .chapter-head {
  display:grid; grid-template-columns:7rem 1fr minmax(17rem,30rem); gap:2rem;
  align-items:end; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid var(--line);
}
.wk-amb .chapter-no { font-family:var(--fd); font-size:1.1rem; font-weight:800; }
.wk-amb .chapter-title { font-size:clamp(2rem,4.2vw,4.8rem); line-height:.88; }
.wk-amb .chapter-desc { color:var(--mut); font-size:clamp(.95rem,1.2vw,1.1rem); line-height:1.55; }
.wk-amb .vertical-stage { display:grid; grid-template-columns:1fr minmax(20rem,38rem); gap:clamp(2rem,7vw,8rem); align-items:center; }
.wk-amb .vertical-note { max-width:26rem; color:var(--mut); font-size:clamp(1rem,1.4vw,1.25rem); }
.wk-amb .vertical-note b { display:block; margin-bottom:1rem; color:var(--paper); font-family:var(--fd); font-size:clamp(2rem,4vw,4.4rem); line-height:.9; text-transform:uppercase; }
.wk-amb .film-frame { width:100%; max-width:38rem; margin-left:auto; background:#000; }
.wk-amb .film-frame video, .wk-amb .film-frame img { aspect-ratio:9/16; object-fit:cover; }

.wk-amb .site { background:var(--paper); color:var(--ink); }
.wk-amb .site .body-copy { color:rgba(5,5,5,.68); }
.wk-amb .site-intro { display:grid; grid-template-columns:1.2fr .8fr; gap:clamp(2rem,8vw,8rem); align-items:end; margin-bottom:clamp(3rem,7vw,7rem); }
.wk-amb .site-intro .kicker { color:var(--ink); }
.wk-amb .site-intro .display { max-width:11ch; }
.wk-amb .site-actions { display:flex; flex-direction:column; align-items:flex-start; gap:1.5rem; }
.wk-amb .site-link { border-color:rgba(5,5,5,.45); }
.wk-amb .site-link:hover { color:var(--paper); background:var(--ink); }
.wk-amb .browser {
  --frame-h:clamp(36rem,64vw,48rem); overflow:hidden; height:var(--frame-h);
  background:#d7d5cf; border:1px solid rgba(5,5,5,.3); box-shadow:0 2rem 6rem rgba(0,0,0,.2);
}
.wk-amb .browser-bar { height:2.9rem; display:flex; align-items:center; justify-content:space-between; padding:0 1rem; border-bottom:1px solid rgba(5,5,5,.2); background:#ebe8e1; }
.wk-amb .browser-bar span { font-size:.62rem; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
.wk-amb .browser-view { height:calc(100% - 2.9rem); overflow:hidden; }
.wk-amb .browser-view img { width:100%; height:auto; will-change:transform; animation:amb-site-pan 22s ease-in-out infinite alternate; }
@keyframes amb-site-pan { from { transform:translateY(0); } to { transform:translateY(calc(-100% + var(--frame-h) - 2.9rem)); } }

.wk-amb .stats {
  display:grid; grid-template-columns:repeat(4,1fr); margin-top:clamp(4rem,8vw,8rem); border-top:1px solid var(--line);
}
.wk-amb .stat { min-height:13rem; padding:1.5rem 1.5rem 1.5rem 0; border-right:1px solid var(--line); }
.wk-amb .stat + .stat { padding-left:1.5rem; }
.wk-amb .stat:last-child { border-right:0; }
.wk-amb .stat-value { display:block; font-family:var(--fd); font-size:clamp(2.6rem,5vw,5.4rem); font-weight:800; line-height:.9; letter-spacing:-.05em; }
.wk-amb .stat-label { display:block; max-width:16ch; margin-top:1rem; color:var(--mut); font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
.wk-amb .service-list { list-style:none; margin-top:clamp(3rem,6vw,6rem); border-top:1px solid var(--line); }
.wk-amb .service-list li { display:grid; grid-template-columns:5rem 1fr 1.2fr; gap:2rem; padding:1.4rem 0; border-bottom:1px solid var(--line); }
.wk-amb .service-list b { font-family:var(--fd); font-size:clamp(1.2rem,2vw,1.8rem); text-transform:uppercase; }
.wk-amb .service-list span:last-child { color:var(--mut); }

.wk-amb .story-cta {
  position:relative; min-height:78svh; display:flex; align-items:flex-end; overflow:hidden;
  padding:clamp(6rem,13vw,11rem) var(--pad) clamp(3rem,7vw,6rem); border-top:1px solid var(--line);
}
.wk-amb .story-cta .hero-media, .wk-amb .story-cta .hero-scrim { position:absolute; inset:0; }
.wk-amb .story-cta .hero-media video, .wk-amb .story-cta .hero-media img { height:100%; object-fit:cover; object-position:center 56%; }
.wk-amb .story-cta .hero-scrim { background:linear-gradient(180deg,rgba(5,5,5,.3),rgba(5,5,5,.95)); }
.wk-amb .cta-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-amb .cta-title { max-width:12ch; font-size:clamp(3rem,8.5vw,9rem); line-height:.82; }
.wk-amb .cta-row { display:flex; justify-content:space-between; align-items:end; gap:2rem; margin-top:2.5rem; }
.wk-amb .cta-row p { max-width:48ch; color:var(--mut); font-size:clamp(1rem,1.35vw,1.2rem); }

@media(max-width:800px) {
  .wk-amb .top-cta { padding:.7rem .85rem; font-size:.58rem; letter-spacing:.12em; }
  .wk-amb .hero { min-height:92svh; }
  .wk-amb .hero h1 { font-size:clamp(3.05rem,16.5vw,5.5rem); }
  .wk-amb .hero-bottom, .wk-amb .proof-row, .wk-amb .chapter-head, .wk-amb .vertical-stage, .wk-amb .site-intro { grid-template-columns:1fr; gap:1.25rem; }
  .wk-amb .hero-bottom { margin-top:2.25rem; }
  .wk-amb .display { font-size:clamp(2.5rem,13vw,4.5rem); }
  .wk-amb .chapter-head { margin-bottom:2rem; }
  .wk-amb .vertical-note { order:2; }
  .wk-amb .film-frame { width:100%; max-width:none; }
  .wk-amb .browser { --frame-h:32rem; }
  .wk-amb .stats { grid-template-columns:repeat(2,1fr); }
  .wk-amb .stat { min-height:10rem; border-bottom:1px solid var(--line); }
  .wk-amb .stat:nth-child(2) { border-right:0; }
  .wk-amb .service-list li { grid-template-columns:3rem 1fr; gap:1rem; }
  .wk-amb .service-list li span:last-child { grid-column:2; }
  .wk-amb .story-cta { min-height:72svh; }
  .wk-amb .cta-row { align-items:flex-start; flex-direction:column; }
}
@media(prefers-reduced-motion:reduce) {
  .wk-amb { scroll-behavior:auto; }
  .wk-amb video[data-autoplay] { display:none; }
  .wk-amb .motion-still { display:block; }
  .wk-amb .browser-view img { animation:none; transform:none; }
}
`;

function useInViewPlayback() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const videos = Array.from(document.querySelectorAll('.wk-amb video[data-autoplay]'));
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

export default function WorkAmbitionMechanical() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Ambition Mechanical HVAC Marketing | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Ambition Mechanical brand refresh and organic marketing strategy for commercial HVAC services in Phoenix. Website design, Google Ads, and video.');
    }
  }, []);
  useInViewPlayback();

  const openBriefFromMailLink = (event) => {
    if (event.target.closest?.('a[href^="mail"]')) {
      event.preventDefault();
      setBriefModalOpen(true);
    }
  };

  return (
    <>
    <div className="wk-amb" onClick={openBriefFromMailLink}>
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/" aria-label="Ahead of Market home"><BrandMark kind="mono" /></a>
        <button type="button" className="top-cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <video muted loop playsInline data-autoplay preload="auto" poster="/videos/ambition-vertical.jpg">
            <source src="/videos/ambition-vertical.mp4" type="video/mp4" />
          </video>
          <img className="motion-still" src="/videos/ambition-vertical.jpg" alt="" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <span className="kicker">Ahead of Market / Featured work / Commercial services</span>
          <h1><span>Ambition</span> Mechanical<span className="sq" /></h1>
          <div className="hero-bottom">
            <span>Brand / Web / Search / Film</span>
            <p>A complete digital platform for a 30-year commercial HVAC operator ready to grow.</p>
          </div>
        </div>
      </header>

      <main>
        <section className="proof">
          <div className="proof-inner proof-row">
            <span className="kicker">The challenge / 01</span>
            <h2 className="display">A proven operator goes digital<span className="sq" /></h2>
            <div className="body-copy">
              <p>Ambition Mechanical is a 30+ year commercial HVAC contractor serving Phoenix. They have deep customer relationships and consistent 24/7 emergency dispatch, but their online presence was outdated and fragmented. They needed a brand refresh and a digital strategy to rank organically for commercial HVAC services and capture leads from facility managers and restaurant operators.</p>
            </div>
          </div>
        </section>

        <section className="work">
          <div className="work-inner">
            <div className="work-intro">
              <span className="kicker">What we made / 02</span>
              <h2 className="display">A complete digital platform<span className="sq" /></h2>
              <p className="body-copy">We rebuilt Ambition's digital identity from the ground up: brand identity and website (AOM quality bar), Google Ads campaigns targeting commercial operators, and video content showing their work. The website showcases real projects, client testimonials, and emergency dispatch capabilities. Video content demonstrates expertise and builds credibility in search and social channels.</p>
            </div>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">01</span>
                <h3 className="chapter-title">Brand in motion</h3>
                <p className="chapter-desc">Vertical-first footage of the crews, equipment, and real commercial work behind the promise.</p>
              </div>
              <div className="vertical-stage">
                <p className="vertical-note"><b>Real work. Real proof.</b>Built for social channels without losing the scale and credibility of Ambition's operation.</p>
                <div className="film-frame">
                  <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/ambition-vertical.jpg">
                    <source src="/videos/ambition-vertical.mp4" type="video/mp4" />
                  </video>
                  <img className="motion-still" src="/videos/ambition-vertical.jpg" alt="Ambition Mechanical brand film still" />
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="site">
          <div className="site-inner">
            <div className="site-intro">
              <div>
                <span className="kicker">The live site / 03</span>
                <h2 className="display">A 24/7 digital salesforce<span className="sq" /></h2>
              </div>
              <div className="site-actions">
                <p className="body-copy">The site makes thirty years of trust visible, proves the work, and gives commercial operators a direct path to emergency service or a quote.</p>
                <a className="site-link" href="https://ambitionac.com" target="_blank" rel="noopener">Visit ambitionac.com ↗</a>
              </div>
            </div>
            <div className="browser" aria-label="Scrolling capture of the Ambition Mechanical website">
              <div className="browser-bar"><span>Live site</span><span>ambitionac.com</span></div>
              <div className="browser-view"><img src="/hero-sites/ambition-tall.jpg" alt="Full page capture of the Ambition Mechanical website" /></div>
            </div>
          </div>
        </section>

        <section className="results">
          <div className="results-inner">
            <div className="proof-row">
              <span className="kicker">What happened / 04</span>
              <h2 className="display">Organic lead generation, active<span className="sq" /></h2>
              <div className="body-copy">
                <p>Ambition now ranks for commercial HVAC keywords across Phoenix and captures leads directly from Google search and paid search campaigns. The website serves as their 24/7 salesforce, allowing facility managers and restaurant operators to book emergency service, request quotes, and see proof of work, all without picking up the phone.</p>
                <p>The brand refresh positioned them as a modern, professional operator (not a generic contractor), while maintaining the trust built over 30 years in the market. Testimonials from major commercial clients (Banner Health, Abrazo Health, Din Tai Fung, and others) establish credibility with new prospects.</p>
              </div>
            </div>
            <div className="stats" aria-label="Project facts">
              <div className="stat"><span className="stat-value">30+</span><span className="stat-label">Years of market trust</span></div>
              <div className="stat"><span className="stat-value">24/7</span><span className="stat-label">Emergency dispatch</span></div>
              <div className="stat"><span className="stat-value">01</span><span className="stat-label">Unified digital platform</span></div>
              <div className="stat"><span className="stat-value">04</span><span className="stat-label">Connected growth services</span></div>
            </div>
          </div>
        </section>

        <section className="deliverables">
          <div className="deliverables-inner">
            <span className="kicker">Services / 05</span>
            <h2 className="display">What we delivered<span className="sq" /></h2>
            <ul className="service-list">
              <li><span>01</span><b>Brand identity &amp; positioning</b><span>Modern refresh maintaining 30-year trust</span></li>
              <li><span>02</span><b>Website redesign &amp; development</b><span>Lead capture, project portfolio, emergency booking</span></li>
              <li><span>03</span><b>Google Ads campaigns</b><span>Search &amp; performance marketing for commercial leads</span></li>
              <li><span>04</span><b>Video content &amp; production</b><span>Brand storytelling and project showcases</span></li>
            </ul>
          </div>
        </section>

        <section className="story-cta">
          <div className="hero-media" aria-hidden="true">
            <video muted loop playsInline data-autoplay preload="metadata" poster="/videos/ambition-vertical.jpg">
              <source src="/videos/ambition-vertical.mp4" type="video/mp4" />
            </video>
            <img className="motion-still" src="/videos/ambition-vertical.jpg" alt="" />
          </div>
          <div className="hero-scrim" />
          <div className="cta-copy">
            <span className="kicker">Your story, next</span>
            <h2 className="cta-title">Ready to tell your story<span className="sq" /></h2>
            <div className="cta-row">
              <p>We build digital platforms that capture leads, build trust, and modernize contractor and service businesses.</p>
              <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
            </div>
          </div>
        </section>
      </main>

      <ServiceFooter current="/work/ambition-mechanical" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Ambition Mechanical',
          description: 'Ambition Mechanical brand refresh and organic marketing strategy for commercial HVAC services in Phoenix. Website design, Google Ads, and video.',
          url: 'https://aheadofmarket.com/work/ambition-mechanical',
          author: { '@type': 'Organization', name: 'Ahead of Market' },
          video: [
            {
              '@type': 'VideoObject',
              name: 'Ambition Mechanical Brand Video',
              contentUrl: 'https://aheadofmarket.com/videos/ambition-vertical.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/ambition-vertical.jpg',
              description: 'Ambition Mechanical brand refresh and organic marketing strategy for commercial HVAC services in Phoenix. Website design, Google Ads, and video.',
            },
          ],
        }}
      />
    </div>
    <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </>
  );
}
