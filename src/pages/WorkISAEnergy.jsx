import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// ISA Energy case study: 3-film investor-grade video series
// Mission: aheadofmarket.com:home (R30, cinematic featured-client case studies)

const CSS = `
.wk-isa {
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
.wk-isa *, .wk-isa *::before, .wk-isa *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-isa a { color:inherit; text-decoration:none; }
.wk-isa img, .wk-isa video { display:block; width:100%; }
.wk-isa a:focus-visible, .wk-isa video:focus-visible { outline:2px solid var(--gold); outline-offset:4px; }
.wk-isa .sq { display:inline-block; width:.13em; height:.13em; margin-left:.07em; background:var(--gold); }
.wk-isa .motion-still { display:none; }

.wk-isa .chrome-top {
  position:fixed; z-index:40; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:1.1rem var(--pad); pointer-events:none;
  background:linear-gradient(180deg,rgba(5,5,5,.72),transparent);
}
.wk-isa .chrome-top a { pointer-events:auto; }
.wk-isa .logo { display:flex; align-items:center; }
.wk-isa .logo svg { width:auto; height:clamp(24px,4vw,32px); }
.wk-isa .top-cta, .wk-isa .cta-btn {
  display:inline-flex; align-items:center; justify-content:center;
  min-height:44px; padding:.8rem 1.25rem; border:1px solid rgba(244,240,232,.55);
  font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase;
  transition:background .18s,color .18s;
}
.wk-isa .top-cta:hover, .wk-isa .cta-btn:hover { color:var(--ink); background:var(--paper); }

.wk-isa .hero {
  position:relative; min-height:100svh; display:flex; align-items:flex-end;
  overflow:hidden; padding:clamp(8rem,18vh,13rem) var(--pad) clamp(3rem,7vh,5rem);
}
.wk-isa .hero-media, .wk-isa .hero-scrim { position:absolute; inset:0; }
.wk-isa .hero-media video, .wk-isa .hero-media img { height:100%; object-fit:cover; }
.wk-isa .hero-scrim {
  background:linear-gradient(180deg,rgba(5,5,5,.2) 0%,rgba(5,5,5,.08) 32%,rgba(5,5,5,.88) 100%),
    linear-gradient(90deg,rgba(5,5,5,.35),transparent 70%);
}
.wk-isa .hero-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-isa .kicker {
  display:block; margin-bottom:1.35rem; color:var(--paper);
  font-size:.67rem; font-weight:800; letter-spacing:.23em; text-transform:uppercase;
}
.wk-isa .hero h1, .wk-isa .display, .wk-isa .chapter-title, .wk-isa .cta-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; letter-spacing:-.055em;
}
.wk-isa .hero h1 { max-width:12ch; font-size:clamp(3.7rem,11.5vw,11rem); line-height:.77; }
.wk-isa .hero-bottom {
  display:grid; grid-template-columns:1fr minmax(18rem,36rem); gap:3rem;
  align-items:end; margin-top:clamp(2rem,5vh,4rem); padding-top:1.25rem; border-top:1px solid var(--line);
}
.wk-isa .hero-bottom span { font-size:.66rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
.wk-isa .hero-bottom p { color:var(--paper); font-size:clamp(1rem,1.5vw,1.3rem); line-height:1.45; }

.wk-isa .proof, .wk-isa .work, .wk-isa .results, .wk-isa .deliverables {
  padding:clamp(6rem,14vw,13rem) var(--pad); border-top:1px solid var(--line);
}
.wk-isa .proof-inner, .wk-isa .work-inner, .wk-isa .results-inner, .wk-isa .deliverables-inner {
  width:min(100%,1500px); margin:0 auto;
}
.wk-isa .proof-row {
  display:grid; grid-template-columns:minmax(10rem,.7fr) minmax(20rem,1.25fr) minmax(18rem,1fr);
  gap:clamp(2rem,5vw,6rem); align-items:start;
}
.wk-isa .proof-row .kicker { margin:0; }
.wk-isa .display { font-size:clamp(2.6rem,6vw,6.5rem); line-height:.88; }
.wk-isa .body-copy { color:var(--mut); font-size:clamp(1rem,1.35vw,1.22rem); line-height:1.7; }
.wk-isa .body-copy p + p { margin-top:1.2rem; }

.wk-isa .work { background:var(--ink-2); }
.wk-isa .work-intro { max-width:62rem; margin-bottom:clamp(4rem,9vw,9rem); }
.wk-isa .work-intro .display { margin-bottom:1.7rem; }
.wk-isa .work-intro .body-copy { max-width:58ch; }
.wk-isa .chapter + .chapter { margin-top:clamp(6rem,13vw,13rem); }
.wk-isa .chapter-head {
  display:grid; grid-template-columns:7rem 1fr minmax(17rem,30rem); gap:2rem;
  align-items:end; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid var(--line);
}
.wk-isa .chapter-no { font-family:var(--fd); font-size:1.1rem; font-weight:800; }
.wk-isa .chapter-title { font-size:clamp(2rem,4.2vw,4.8rem); line-height:.88; }
.wk-isa .chapter-desc { color:var(--mut); font-size:clamp(.95rem,1.2vw,1.1rem); line-height:1.55; }
.wk-isa .film-frame { width:100%; background:#000; }
.wk-isa .film-frame.offset { width:78%; margin-left:auto; }
.wk-isa .film-frame video, .wk-isa .film-frame img { aspect-ratio:16/9; object-fit:cover; }

.wk-isa .stats {
  display:grid; grid-template-columns:repeat(4,1fr); margin-top:clamp(4rem,8vw,8rem); border-top:1px solid var(--line);
}
.wk-isa .stat { min-height:13rem; padding:1.5rem 1.5rem 1.5rem 0; border-right:1px solid var(--line); }
.wk-isa .stat + .stat { padding-left:1.5rem; }
.wk-isa .stat:last-child { border-right:0; }
.wk-isa .stat-value { display:block; font-family:var(--fd); font-size:clamp(2.6rem,5vw,5.4rem); font-weight:800; line-height:.9; letter-spacing:-.05em; }
.wk-isa .stat-label { display:block; max-width:15ch; margin-top:1rem; color:var(--mut); font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
.wk-isa .service-list { list-style:none; margin-top:clamp(3rem,6vw,6rem); border-top:1px solid var(--line); }
.wk-isa .service-list li { display:grid; grid-template-columns:5rem 1fr 1.2fr; gap:2rem; padding:1.4rem 0; border-bottom:1px solid var(--line); }
.wk-isa .service-list b { font-family:var(--fd); font-size:clamp(1.2rem,2vw,1.8rem); text-transform:uppercase; }
.wk-isa .service-list span:last-child { color:var(--mut); }

.wk-isa .story-cta {
  position:relative; min-height:78svh; display:flex; align-items:flex-end; overflow:hidden;
  padding:clamp(6rem,13vw,11rem) var(--pad) clamp(3rem,7vw,6rem); border-top:1px solid var(--line);
}
.wk-isa .story-cta .hero-media, .wk-isa .story-cta .hero-scrim { position:absolute; inset:0; }
.wk-isa .story-cta .hero-media video, .wk-isa .story-cta .hero-media img { height:100%; object-fit:cover; }
.wk-isa .story-cta .hero-scrim { background:linear-gradient(180deg,rgba(5,5,5,.38),rgba(5,5,5,.94)); }
.wk-isa .cta-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-isa .cta-title { max-width:11ch; font-size:clamp(3rem,8.5vw,9rem); line-height:.82; }
.wk-isa .cta-row { display:flex; justify-content:space-between; align-items:end; gap:2rem; margin-top:2.5rem; }
.wk-isa .cta-row p { max-width:48ch; color:var(--mut); font-size:clamp(1rem,1.35vw,1.2rem); }

@media(max-width:800px) {
  .wk-isa .top-cta { padding:.7rem .85rem; font-size:.58rem; letter-spacing:.12em; }
  .wk-isa .hero { min-height:92svh; }
  .wk-isa .hero h1 { font-size:clamp(3.3rem,20vw,6.2rem); }
  .wk-isa .hero-bottom, .wk-isa .proof-row, .wk-isa .chapter-head { grid-template-columns:1fr; gap:1.25rem; }
  .wk-isa .hero-bottom { margin-top:2.25rem; }
  .wk-isa .display { font-size:clamp(2.5rem,13vw,4.5rem); }
  .wk-isa .chapter-head { margin-bottom:1rem; }
  .wk-isa .film-frame.offset { width:100%; }
  .wk-isa .stats { grid-template-columns:repeat(2,1fr); }
  .wk-isa .stat { min-height:10rem; border-bottom:1px solid var(--line); }
  .wk-isa .stat:nth-child(2) { border-right:0; }
  .wk-isa .service-list li { grid-template-columns:3rem 1fr; gap:1rem; }
  .wk-isa .service-list li span:last-child { grid-column:2; }
  .wk-isa .story-cta { min-height:72svh; }
  .wk-isa .cta-row { align-items:flex-start; flex-direction:column; }
}
@media(prefers-reduced-motion:reduce) {
  .wk-isa { scroll-behavior:auto; }
  .wk-isa video[data-autoplay] { display:none; }
  .wk-isa .motion-still { display:block; }
}
`;

function useInViewPlayback() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const videos = Array.from(document.querySelectorAll('.wk-isa video[data-autoplay]'));
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

export default function WorkISAEnergy() {
  useEffect(() => {
    document.title = 'ISA Energy Investor Video | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'ISA Energy 3-film investor-grade video series positioning quantum energy capture technology. Brand, demo, and validation films.');
    }
  }, []);
  useInViewPlayback();

  return (
    <div className="wk-isa">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6" aria-label="Ahead of Market home"><BrandMark kind="mono" /></a>
        <a className="top-cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <video muted loop playsInline data-autoplay preload="auto" poster="/videos/isa-brand.jpg">
            <source src="/videos/isa-brand.mp4" type="video/mp4" />
          </video>
          <img className="motion-still" src="/videos/isa-brand.jpg" alt="" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <span className="kicker">Ahead of Market / Featured work / Energy</span>
          <h1>ISA Energy<span className="sq" /></h1>
          <div className="hero-bottom">
            <span>Brand film / Demo / Validation</span>
            <p>Investor-grade film positioning quantum energy as a category-defining technology.</p>
          </div>
        </div>
      </header>

      <main>
        <section className="proof">
          <div className="proof-inner proof-row">
            <span className="kicker">The challenge / 01</span>
            <h2 className="display">Quantum energy, investor ready<span className="sq" /></h2>
            <div className="body-copy">
              <p>ISA Industries developed a breakthrough ambient energy capture device. The founders needed to position their innovation as category-defining and build credibility with investors and partners. The story had to move beyond technical specs into founder devotion and market vision.</p>
            </div>
          </div>
        </section>

        <section className="work">
          <div className="work-inner">
            <div className="work-intro">
              <span className="kicker">What we made / 02</span>
              <h2 className="display">A three-film story system<span className="sq" /></h2>
              <p className="body-copy">We produced an investor-grade 2:30 brand film alongside demo and validation videos drawn from founder interviews and lab footage. The narrative moves through co-founder journey and ambient energy capture as a devotional technology story, positioning ISA for investor conversations and market positioning.</p>
            </div>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">01</span>
                <h3 className="chapter-title">Brand film</h3>
                <p className="chapter-desc">The founder journey and market vision, shaped into the centerpiece for investor conversations.</p>
              </div>
              <div className="film-frame">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/isa-brand.jpg">
                  <source src="/videos/isa-brand.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/isa-brand.jpg" alt="ISA Energy brand film still" />
              </div>
            </article>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">02</span>
                <h3 className="chapter-title">Demo video</h3>
                <p className="chapter-desc">A grounded view of the device, the lab, and ambient energy capture in action.</p>
              </div>
              <div className="film-frame offset">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/isa-demo.jpg">
                  <source src="/videos/isa-demo.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/isa-demo.jpg" alt="ISA Energy technology demo still" />
              </div>
            </article>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">03</span>
                <h3 className="chapter-title">Validation film</h3>
                <p className="chapter-desc">Technical credibility and evidence, edited for partners ready to look closer.</p>
              </div>
              <div className="film-frame">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/isa-validation.jpg">
                  <source src="/videos/isa-validation.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/isa-validation.jpg" alt="ISA Energy validation film still" />
              </div>
            </article>
          </div>
        </section>

        <section className="results">
          <div className="results-inner">
            <div className="proof-row">
              <span className="kicker">What happened / 03</span>
              <h2 className="display">Investor conversations opened<span className="sq" /></h2>
              <div className="body-copy">
                <p>The film series became the centerpiece of ISA's investor conversations. The narrative positioning, treating quantum energy capture as a devotional innovation story, resonated with early-stage funders. ISA moved from technical pitch to category narrative, differentiating in market conversations.</p>
                <p>Production included two co-founder interviews (82 minutes of raw material), extensive lab b-roll, and a wedding-editorial visual language that positioned the founders' journey as central to the innovation story.</p>
              </div>
            </div>
            <div className="stats" aria-label="Project facts">
              <div className="stat"><span className="stat-value">03</span><span className="stat-label">Finished films</span></div>
              <div className="stat"><span className="stat-value">02</span><span className="stat-label">Co-founder interviews</span></div>
              <div className="stat"><span className="stat-value">82</span><span className="stat-label">Minutes of source interviews</span></div>
              <div className="stat"><span className="stat-value">2:30</span><span className="stat-label">Brand film runtime</span></div>
            </div>
          </div>
        </section>

        <section className="deliverables">
          <div className="deliverables-inner">
            <span className="kicker">Services / 04</span>
            <h2 className="display">What we delivered<span className="sq" /></h2>
            <ul className="service-list">
              <li><span>01</span><b>Brand film production</b><span>2:30 investor-grade narrative positioning</span></li>
              <li><span>02</span><b>Interview capture &amp; editing</b><span>Co-founder on-camera storytelling</span></li>
              <li><span>03</span><b>Lab &amp; technical b-roll</b><span>Device room and quantum energy capture footage</span></li>
              <li><span>04</span><b>Motion graphics &amp; color grade</b><span>Premium finish for investor meetings</span></li>
            </ul>
          </div>
        </section>

        <section className="story-cta">
          <div className="hero-media" aria-hidden="true">
            <video muted loop playsInline data-autoplay preload="metadata" poster="/videos/isa-validation.jpg">
              <source src="/videos/isa-validation.mp4" type="video/mp4" />
            </video>
            <img className="motion-still" src="/videos/isa-validation.jpg" alt="" />
          </div>
          <div className="hero-scrim" />
          <div className="cta-copy">
            <span className="kicker">Your story, next</span>
            <h2 className="cta-title">Ready to tell your story<span className="sq" /></h2>
            <div className="cta-row">
              <p>We build investor-grade films and brand narratives that position technology companies for market impact.</p>
              <a className="cta-btn" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
            </div>
          </div>
        </section>
      </main>

      <ServiceFooter current="/work/isa-energy" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'ISA Energy',
          description: 'ISA Energy 3-film investor-grade video series positioning quantum energy capture technology. Brand, demo, and validation films.',
          url: 'https://aheadofmarket.com/work/isa-energy',
          author: { '@type': 'Organization', name: 'Ahead of Market' },
          video: [
            {
              '@type': 'VideoObject',
              name: 'ISA Energy Brand Film',
              contentUrl: 'https://aheadofmarket.com/videos/isa-brand.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/isa-brand.jpg',
              description: 'ISA Energy 3-film investor-grade video series positioning quantum energy capture technology. Brand, demo, and validation films.',
            },
            {
              '@type': 'VideoObject',
              name: 'ISA Energy Demo Video',
              contentUrl: 'https://aheadofmarket.com/videos/isa-demo.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/isa-demo.jpg',
              description: 'ISA Energy 3-film investor-grade video series positioning quantum energy capture technology. Brand, demo, and validation films.',
            },
            {
              '@type': 'VideoObject',
              name: 'ISA Energy Validation Film',
              contentUrl: 'https://aheadofmarket.com/videos/isa-validation.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/isa-validation.jpg',
              description: 'ISA Energy 3-film investor-grade video series positioning quantum energy capture technology. Brand, demo, and validation films.',
            },
          ],
        }}
      />
    </div>
  );
}
