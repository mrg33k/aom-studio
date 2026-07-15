import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Space Rising case study: SpaceOS directory platform for space industry coordination
// Mission: aheadofmarket.com:home (R30, cinematic featured-client case studies)

const CSS = `
.wk-sr {
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
.wk-sr *, .wk-sr *::before, .wk-sr *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-sr a { color:inherit; text-decoration:none; }
.wk-sr button { font:inherit; color:inherit; background:none; cursor:pointer; }
.wk-sr img, .wk-sr video { display:block; width:100%; }
.wk-sr a:focus-visible, .wk-sr video:focus-visible { outline:2px solid var(--gold); outline-offset:4px; }
.wk-sr .sq { display:inline-block; width:.13em; height:.13em; margin-left:.07em; background:var(--gold); }
.wk-sr .motion-still { display:none; }

.wk-sr .chrome-top {
  position:fixed; z-index:40; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:1.1rem var(--pad); pointer-events:none;
  background:linear-gradient(180deg,rgba(5,5,5,.72),transparent);
}
.wk-sr .chrome-top a, .wk-sr .chrome-top button { pointer-events:auto; }
.wk-sr .logo { display:flex; align-items:center; }
.wk-sr .logo svg { width:auto; height:clamp(24px,4vw,32px); }
.wk-sr .top-cta, .wk-sr .cta-btn, .wk-sr .site-link {
  display:inline-flex; align-items:center; justify-content:center;
  min-height:44px; padding:.8rem 1.25rem; border:1px solid rgba(244,240,232,.55);
  font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase;
  transition:background .18s,color .18s;
}
.wk-sr .top-cta:hover, .wk-sr .cta-btn:hover, .wk-sr .site-link:hover { color:var(--ink); background:var(--paper); }

.wk-sr .hero {
  position:relative; min-height:100svh; display:flex; align-items:flex-end;
  overflow:hidden; padding:clamp(8rem,18vh,13rem) var(--pad) clamp(3rem,7vh,5rem);
}
.wk-sr .hero-media, .wk-sr .hero-scrim { position:absolute; inset:0; }
.wk-sr .hero-media video, .wk-sr .hero-media img { height:100%; object-fit:cover; }
.wk-sr .hero-scrim {
  background:linear-gradient(180deg,rgba(5,5,5,.2) 0%,rgba(5,5,5,.05) 36%,rgba(5,5,5,.9) 100%),
    linear-gradient(90deg,rgba(5,5,5,.3),transparent 72%);
}
.wk-sr .hero-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-sr .kicker {
  display:block; margin-bottom:1.35rem; color:var(--paper);
  font-size:.67rem; font-weight:800; letter-spacing:.23em; text-transform:uppercase;
}
.wk-sr .hero h1, .wk-sr .display, .wk-sr .chapter-title, .wk-sr .cta-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; letter-spacing:-.055em;
}
.wk-sr .hero h1 { max-width:10ch; font-size:clamp(3.7rem,11vw,10.5rem); line-height:.76; }
.wk-sr .hero h1 span:first-child { display:block; }
.wk-sr .hero-bottom {
  display:grid; grid-template-columns:1fr minmax(18rem,36rem); gap:3rem;
  align-items:end; margin-top:clamp(2rem,5vh,4rem); padding-top:1.25rem; border-top:1px solid var(--line);
}
.wk-sr .hero-bottom span { font-size:.66rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
.wk-sr .hero-bottom p { color:var(--paper); font-size:clamp(1rem,1.5vw,1.3rem); line-height:1.45; }

.wk-sr .proof, .wk-sr .work, .wk-sr .site, .wk-sr .results, .wk-sr .deliverables {
  padding:clamp(6rem,14vw,13rem) var(--pad); border-top:1px solid var(--line);
}
.wk-sr .proof-inner, .wk-sr .work-inner, .wk-sr .site-inner, .wk-sr .results-inner, .wk-sr .deliverables-inner {
  width:min(100%,1500px); margin:0 auto;
}
.wk-sr .proof-row {
  display:grid; grid-template-columns:minmax(10rem,.7fr) minmax(20rem,1.25fr) minmax(18rem,1fr);
  gap:clamp(2rem,5vw,6rem); align-items:start;
}
.wk-sr .proof-row .kicker { margin:0; }
.wk-sr .display { font-size:clamp(2.6rem,6vw,6.5rem); line-height:.88; }
.wk-sr .body-copy { color:var(--mut); font-size:clamp(1rem,1.35vw,1.22rem); line-height:1.7; }
.wk-sr .body-copy p + p { margin-top:1.2rem; }

.wk-sr .work { background:var(--ink-2); }
.wk-sr .work-intro { max-width:68rem; margin-bottom:clamp(4rem,9vw,9rem); }
.wk-sr .work-intro .display { margin-bottom:1.7rem; }
.wk-sr .work-intro .body-copy { max-width:62ch; }
.wk-sr .chapter + .chapter { margin-top:clamp(6rem,13vw,13rem); }
.wk-sr .chapter-head {
  display:grid; grid-template-columns:7rem 1fr minmax(17rem,30rem); gap:2rem;
  align-items:end; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid var(--line);
}
.wk-sr .chapter-no { font-family:var(--fd); font-size:1.1rem; font-weight:800; }
.wk-sr .chapter-title { font-size:clamp(2rem,4.2vw,4.8rem); line-height:.88; }
.wk-sr .chapter-desc { color:var(--mut); font-size:clamp(.95rem,1.2vw,1.1rem); line-height:1.55; }
.wk-sr .film-frame { width:100%; background:#000; }
.wk-sr .film-frame.offset { width:78%; margin-left:auto; }
.wk-sr .film-frame video, .wk-sr .film-frame img { aspect-ratio:16/9; object-fit:cover; }

.wk-sr .site { background:var(--paper); color:var(--ink); }
.wk-sr .site .body-copy { color:rgba(5,5,5,.68); }
.wk-sr .site-intro { display:grid; grid-template-columns:1.2fr .8fr; gap:clamp(2rem,8vw,8rem); align-items:end; margin-bottom:clamp(3rem,7vw,7rem); }
.wk-sr .site-intro .kicker { color:var(--ink); }
.wk-sr .site-intro .display { max-width:11ch; }
.wk-sr .site-actions { display:flex; flex-direction:column; align-items:flex-start; gap:1.5rem; }
.wk-sr .site-link { border-color:rgba(5,5,5,.45); }
.wk-sr .site-link:hover { color:var(--paper); background:var(--ink); }
.wk-sr .browser {
  --frame-h:clamp(34rem,62vw,46rem); overflow:hidden; height:var(--frame-h);
  background:#d7d5cf; border:1px solid rgba(5,5,5,.3); box-shadow:0 2rem 6rem rgba(0,0,0,.2);
}
.wk-sr .browser-bar { height:2.9rem; display:flex; align-items:center; justify-content:space-between; padding:0 1rem; border-bottom:1px solid rgba(5,5,5,.2); background:#ebe8e1; }
.wk-sr .browser-bar span { font-size:.62rem; font-weight:800; letter-spacing:.16em; text-transform:uppercase; }
.wk-sr .browser-view { height:calc(100% - 2.9rem); overflow:hidden; }
.wk-sr .browser-view img { width:100%; height:auto; will-change:transform; animation:sr-site-pan 20s ease-in-out infinite alternate; }
@keyframes sr-site-pan { from { transform:translateY(0); } to { transform:translateY(calc(-100% + var(--frame-h) - 2.9rem)); } }

.wk-sr .stats {
  display:grid; grid-template-columns:repeat(4,1fr); margin-top:clamp(4rem,8vw,8rem); border-top:1px solid var(--line);
}
.wk-sr .stat { min-height:13rem; padding:1.5rem 1.5rem 1.5rem 0; border-right:1px solid var(--line); }
.wk-sr .stat + .stat { padding-left:1.5rem; }
.wk-sr .stat:last-child { border-right:0; }
.wk-sr .stat-value { display:block; font-family:var(--fd); font-size:clamp(2.6rem,5vw,5.4rem); font-weight:800; line-height:.9; letter-spacing:-.05em; }
.wk-sr .stat-label { display:block; max-width:16ch; margin-top:1rem; color:var(--mut); font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
.wk-sr .service-list { list-style:none; margin-top:clamp(3rem,6vw,6rem); border-top:1px solid var(--line); }
.wk-sr .service-list li { display:grid; grid-template-columns:5rem 1fr 1.2fr; gap:2rem; padding:1.4rem 0; border-bottom:1px solid var(--line); }
.wk-sr .service-list b { font-family:var(--fd); font-size:clamp(1.2rem,2vw,1.8rem); text-transform:uppercase; }
.wk-sr .service-list span:last-child { color:var(--mut); }

.wk-sr .story-cta {
  position:relative; min-height:78svh; display:flex; align-items:flex-end; overflow:hidden;
  padding:clamp(6rem,13vw,11rem) var(--pad) clamp(3rem,7vw,6rem); border-top:1px solid var(--line);
}
.wk-sr .story-cta .hero-media, .wk-sr .story-cta .hero-scrim { position:absolute; inset:0; }
.wk-sr .story-cta .hero-media video, .wk-sr .story-cta .hero-media img { height:100%; object-fit:cover; }
.wk-sr .story-cta .hero-scrim { background:linear-gradient(180deg,rgba(5,5,5,.26),rgba(5,5,5,.94)); }
.wk-sr .cta-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-sr .cta-title { max-width:12ch; font-size:clamp(3rem,8.5vw,9rem); line-height:.82; }
.wk-sr .cta-row { display:flex; justify-content:space-between; align-items:end; gap:2rem; margin-top:2.5rem; }
.wk-sr .cta-row p { max-width:48ch; color:var(--mut); font-size:clamp(1rem,1.35vw,1.2rem); }

@media(max-width:800px) {
  .wk-sr .top-cta { padding:.7rem .85rem; font-size:.58rem; letter-spacing:.12em; }
  .wk-sr .hero { min-height:92svh; }
  .wk-sr .hero h1 { font-size:clamp(3.3rem,19vw,6rem); }
  .wk-sr .hero-bottom, .wk-sr .proof-row, .wk-sr .chapter-head, .wk-sr .site-intro { grid-template-columns:1fr; gap:1.25rem; }
  .wk-sr .hero-bottom { margin-top:2.25rem; }
  .wk-sr .display { font-size:clamp(2.5rem,13vw,4.5rem); }
  .wk-sr .chapter-head { margin-bottom:1rem; }
  .wk-sr .film-frame.offset { width:100%; }
  .wk-sr .browser { --frame-h:32rem; }
  .wk-sr .stats { grid-template-columns:repeat(2,1fr); }
  .wk-sr .stat { min-height:10rem; border-bottom:1px solid var(--line); }
  .wk-sr .stat:nth-child(2) { border-right:0; }
  .wk-sr .service-list li { grid-template-columns:3rem 1fr; gap:1rem; }
  .wk-sr .service-list li span:last-child { grid-column:2; }
  .wk-sr .story-cta { min-height:72svh; }
  .wk-sr .cta-row { align-items:flex-start; flex-direction:column; }
}
@media(prefers-reduced-motion:reduce) {
  .wk-sr { scroll-behavior:auto; }
  .wk-sr video[data-autoplay] { display:none; }
  .wk-sr .motion-still { display:block; }
  .wk-sr .browser-view img { animation:none; transform:none; }
}
`;

function useInViewPlayback() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const videos = Array.from(document.querySelectorAll('.wk-sr video[data-autoplay]'));
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

export default function WorkSpaceRising() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Space Rising Directory Platform | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Space Rising SpaceOS directory platform for coordinating the space industry. Interactive discovery and partnership discovery built for space economy leaders.');
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
    <div className="wk-sr" onClick={openBriefFromMailLink}>
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6" aria-label="Ahead of Market home"><BrandMark kind="mono" /></a>
        <button type="button" className="top-cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <video muted loop playsInline data-autoplay preload="auto" poster="/videos/spacerising-render.jpg">
            <source src="/videos/spacerising-render.mp4" type="video/mp4" />
          </video>
          <img className="motion-still" src="/videos/spacerising-render.jpg" alt="" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <span className="kicker">Ahead of Market / Featured work / Space</span>
          <h1><span>Space</span> Rising<span className="sq" /></h1>
          <div className="hero-bottom">
            <span>Brand / Platform / Launch</span>
            <p>An industry coordination platform connecting the fragmented space economy.</p>
          </div>
        </div>
      </header>

      <main>
        <section className="proof">
          <div className="proof-inner proof-row">
            <span className="kicker">The challenge / 01</span>
            <h2 className="display">A coordination layer for space<span className="sq" /></h2>
            <div className="body-copy">
              <p>The space industry is siloed and immature, lacking a neutral coordination layer. Space Rising needed a platform to connect investors, companies, governments, and researchers across the fragmented ecosystem. The mission was to build SpaceOS, an interactive directory and coordination tool that becomes essential infrastructure for anyone operating in the space economy.</p>
            </div>
          </div>
        </section>

        <section className="work">
          <div className="work-inner">
            <div className="work-intro">
              <span className="kicker">What we made / 02</span>
              <h2 className="display">SpaceOS, from identity to launch<span className="sq" /></h2>
              <p className="body-copy">We delivered the Space Rising brand identity, marketing site, and the SpaceOS platform itself: a live directory featuring searchable company profiles, job listings, event calendar, research reports, and membership management. The platform went live at spacerising.org for the Phoenix Space Rising Congress (April 2026), where 1,000+ space industry leaders gathered for the pre-launch demo.</p>
            </div>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">01</span>
                <h3 className="chapter-title">Platform world</h3>
                <p className="chapter-desc">A cinematic render that gave the new coordination platform a world of its own.</p>
              </div>
              <div className="film-frame">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/spacerising-render.jpg">
                  <source src="/videos/spacerising-render.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/spacerising-render.jpg" alt="Space Rising platform render still" />
              </div>
            </article>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">02</span>
                <h3 className="chapter-title">Congress launch</h3>
                <p className="chapter-desc">Event promotion and coverage built around the moment SpaceOS met its first thousand users.</p>
              </div>
              <div className="film-frame offset">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/spacerising-event.jpg">
                  <source src="/videos/spacerising-event.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/spacerising-event.jpg" alt="Space Rising Congress event still" />
              </div>
            </article>
          </div>
        </section>

        <section className="site">
          <div className="site-inner">
            <div className="site-intro">
              <div>
                <span className="kicker">The live site / 03</span>
                <h2 className="display">Not a mockup. Live infrastructure<span className="sq" /></h2>
              </div>
              <div className="site-actions">
                <p className="body-copy">The marketing site introduces SpaceOS, gives the ecosystem a front door, and moves members into a working directory.</p>
                <a className="site-link" href="https://spacerising.org" target="_blank" rel="noopener">Visit spacerising.org ↗</a>
              </div>
            </div>
            <div className="browser" aria-label="Scrolling capture of the Space Rising website">
              <div className="browser-bar"><span>Live site</span><span>spacerising.org</span></div>
              <div className="browser-view"><img src="/hero-sites/space-rising-tall.jpg" alt="Full page capture of the Space Rising website" /></div>
            </div>
          </div>
        </section>

        <section className="results">
          <div className="results-inner">
            <div className="proof-row">
              <span className="kicker">What happened / 04</span>
              <h2 className="display">A live directory with 1,000+ users<span className="sq" /></h2>
              <div className="body-copy">
                <p>SpaceOS launched live at the Phoenix Space Rising Congress on April 29, 2026. The platform immediately became a working tool for the space industry. Companies registered profiles, posted job openings, and submitted research findings. Membership grew from zero to over 1,000 accounts in the first week. The platform is now a permanent coordination layer for the space economy, hosted at spacerising.org.</p>
                <p>Taryn and the Space Rising team positioned SpaceOS as essential infrastructure for anyone pursuing space projects, partnerships, or investment. The directory reduced discovery friction for an industry that had been coordinating via email threads and LinkedIn.</p>
              </div>
            </div>
            <div className="stats" aria-label="Project facts">
              <div className="stat"><span className="stat-value">1K+</span><span className="stat-label">Accounts in week one</span></div>
              <div className="stat"><span className="stat-value">01</span><span className="stat-label">Live industry directory</span></div>
              <div className="stat"><span className="stat-value">29</span><span className="stat-label">April 2026 launch</span></div>
              <div className="stat"><span className="stat-value">24/7</span><span className="stat-label">Working coordination layer</span></div>
            </div>
          </div>
        </section>

        <section className="deliverables">
          <div className="deliverables-inner">
            <span className="kicker">Services / 05</span>
            <h2 className="display">What we delivered<span className="sq" /></h2>
            <ul className="service-list">
              <li><span>01</span><b>Brand identity</b><span>Space Rising visual language and messaging</span></li>
              <li><span>02</span><b>Marketing site</b><span>Positioning and campaign landing pages</span></li>
              <li><span>03</span><b>Platform architecture</b><span>SpaceOS directory on Ben's sourcing infrastructure</span></li>
              <li><span>04</span><b>Event production</b><span>Congress coverage and pre-launch demo coordination</span></li>
            </ul>
          </div>
        </section>

        <section className="story-cta">
          <div className="hero-media" aria-hidden="true">
            <video muted loop playsInline data-autoplay preload="metadata" poster="/videos/spacerising-event.jpg">
              <source src="/videos/spacerising-event.mp4" type="video/mp4" />
            </video>
            <img className="motion-still" src="/videos/spacerising-event.jpg" alt="" />
          </div>
          <div className="hero-scrim" />
          <div className="cta-copy">
            <span className="kicker">Your story, next</span>
            <h2 className="cta-title">Ready to tell your story<span className="sq" /></h2>
            <div className="cta-row">
              <p>We build platforms and coordination layers for fragmented industries and emerging markets.</p>
              <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
            </div>
          </div>
        </section>
      </main>

      <ServiceFooter current="/work/space-rising" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Space Rising',
          description: 'Space Rising SpaceOS directory platform for coordinating the space industry. Interactive discovery and partnership discovery built for space economy leaders.',
          url: 'https://aheadofmarket.com/work/space-rising',
          author: { '@type': 'Organization', name: 'Ahead of Market' },
          video: [
            {
              '@type': 'VideoObject',
              name: 'Space Rising Render Video',
              contentUrl: 'https://aheadofmarket.com/videos/spacerising-render.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/spacerising-render.jpg',
              description: 'Space Rising SpaceOS directory platform for coordinating the space industry. Interactive discovery and partnership discovery built for space economy leaders.',
            },
            {
              '@type': 'VideoObject',
              name: 'Space Rising Event Video',
              contentUrl: 'https://aheadofmarket.com/videos/spacerising-event.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/spacerising-event.jpg',
              description: 'Space Rising SpaceOS directory platform for coordinating the space industry. Interactive discovery and partnership discovery built for space economy leaders.',
            },
          ],
        }}
      />
    </div>
    <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </>
  );
}
