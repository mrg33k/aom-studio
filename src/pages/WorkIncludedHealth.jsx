import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import JsonLd from '../components/JsonLd';

// Included Health case study: film series for Client Summit and SME content
// Mission: aheadofmarket.com:home (R30, cinematic featured-client case studies)

const CSS = `
.wk-ih {
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
.wk-ih *, .wk-ih *::before, .wk-ih *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-ih a { color:inherit; text-decoration:none; }
.wk-ih button { font:inherit; color:inherit; background:none; cursor:pointer; }
.wk-ih img, .wk-ih video { display:block; width:100%; }
.wk-ih a:focus-visible, .wk-ih video:focus-visible { outline:2px solid var(--gold); outline-offset:4px; }
.wk-ih .sq { display:inline-block; width:.13em; height:.13em; margin-left:.07em; background:var(--gold); }
.wk-ih .motion-still { display:none; }

.wk-ih .chrome-top {
  position:fixed; z-index:40; top:0; left:0; right:0;
  display:flex; align-items:center; justify-content:space-between;
  padding:1.1rem var(--pad); pointer-events:none;
  background:linear-gradient(180deg,rgba(5,5,5,.72),transparent);
}
.wk-ih .chrome-top a, .wk-ih .chrome-top button { pointer-events:auto; }
.wk-ih .logo { display:flex; align-items:center; }
.wk-ih .logo svg { width:auto; height:clamp(24px,4vw,32px); }
.wk-ih .top-cta, .wk-ih .cta-btn {
  display:inline-flex; align-items:center; justify-content:center;
  min-height:44px; padding:.8rem 1.25rem; border:1px solid rgba(244,240,232,.55);
  font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase;
  transition:background .18s,color .18s;
}
.wk-ih .top-cta:hover, .wk-ih .cta-btn:hover { color:var(--ink); background:var(--paper); }

.wk-ih .hero {
  position:relative; min-height:100svh; display:flex; align-items:flex-end;
  overflow:hidden; padding:clamp(8rem,18vh,13rem) var(--pad) clamp(3rem,7vh,5rem);
}
.wk-ih .hero-media, .wk-ih .hero-scrim { position:absolute; inset:0; }
.wk-ih .hero-media video, .wk-ih .hero-media img { height:100%; object-fit:cover; }
.wk-ih .hero-scrim {
  background:linear-gradient(180deg,rgba(5,5,5,.2) 0%,rgba(5,5,5,.06) 35%,rgba(5,5,5,.9) 100%),
    linear-gradient(90deg,rgba(5,5,5,.32),transparent 72%);
}
.wk-ih .hero-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-ih .kicker {
  display:block; margin-bottom:1.35rem; color:var(--paper);
  font-size:.67rem; font-weight:800; letter-spacing:.23em; text-transform:uppercase;
}
.wk-ih .hero h1, .wk-ih .display, .wk-ih .chapter-title, .wk-ih .cta-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase; letter-spacing:-.055em;
}
.wk-ih .hero h1 { max-width:10ch; font-size:clamp(3.6rem,10.5vw,10rem); line-height:.75; }
.wk-ih .hero h1 span:first-child { display:block; }
.wk-ih .hero-bottom {
  display:grid; grid-template-columns:1fr minmax(18rem,36rem); gap:3rem;
  align-items:end; margin-top:clamp(2rem,5vh,4rem); padding-top:1.25rem; border-top:1px solid var(--line);
}
.wk-ih .hero-bottom span { font-size:.66rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; }
.wk-ih .hero-bottom p { color:var(--paper); font-size:clamp(1rem,1.5vw,1.3rem); line-height:1.45; }

.wk-ih .proof, .wk-ih .work, .wk-ih .results, .wk-ih .deliverables {
  padding:clamp(6rem,14vw,13rem) var(--pad); border-top:1px solid var(--line);
}
.wk-ih .proof-inner, .wk-ih .work-inner, .wk-ih .results-inner, .wk-ih .deliverables-inner {
  width:min(100%,1500px); margin:0 auto;
}
.wk-ih .proof-row {
  display:grid; grid-template-columns:minmax(10rem,.7fr) minmax(20rem,1.25fr) minmax(18rem,1fr);
  gap:clamp(2rem,5vw,6rem); align-items:start;
}
.wk-ih .proof-row .kicker { margin:0; }
.wk-ih .display { font-size:clamp(2.6rem,6vw,6.5rem); line-height:.88; }
.wk-ih .body-copy { color:var(--mut); font-size:clamp(1rem,1.35vw,1.22rem); line-height:1.7; }
.wk-ih .body-copy p + p { margin-top:1.2rem; }

.wk-ih .work { background:var(--ink-2); }
.wk-ih .work-intro { max-width:66rem; margin-bottom:clamp(4rem,9vw,9rem); }
.wk-ih .work-intro .display { margin-bottom:1.7rem; }
.wk-ih .work-intro .body-copy { max-width:62ch; }
.wk-ih .chapter + .chapter { margin-top:clamp(6rem,13vw,13rem); }
.wk-ih .chapter-head {
  display:grid; grid-template-columns:7rem 1fr minmax(17rem,30rem); gap:2rem;
  align-items:end; margin-bottom:1.5rem; padding-bottom:1.25rem; border-bottom:1px solid var(--line);
}
.wk-ih .chapter-no { font-family:var(--fd); font-size:1.1rem; font-weight:800; }
.wk-ih .chapter-title { font-size:clamp(2rem,4.2vw,4.8rem); line-height:.88; }
.wk-ih .chapter-desc { color:var(--mut); font-size:clamp(.95rem,1.2vw,1.1rem); line-height:1.55; }
.wk-ih .film-frame { width:100%; background:#000; }
.wk-ih .film-frame.offset { width:78%; margin-left:auto; }
.wk-ih .film-frame video, .wk-ih .film-frame img { aspect-ratio:16/9; object-fit:cover; }

.wk-ih .stats {
  display:grid; grid-template-columns:repeat(4,1fr); margin-top:clamp(4rem,8vw,8rem); border-top:1px solid var(--line);
}
.wk-ih .stat { min-height:13rem; padding:1.5rem 1.5rem 1.5rem 0; border-right:1px solid var(--line); }
.wk-ih .stat + .stat { padding-left:1.5rem; }
.wk-ih .stat:last-child { border-right:0; }
.wk-ih .stat-value { display:block; font-family:var(--fd); font-size:clamp(2.6rem,5vw,5.4rem); font-weight:800; line-height:.9; letter-spacing:-.05em; }
.wk-ih .stat-label { display:block; max-width:16ch; margin-top:1rem; color:var(--mut); font-size:.68rem; font-weight:800; letter-spacing:.18em; text-transform:uppercase; }
.wk-ih .service-list { list-style:none; margin-top:clamp(3rem,6vw,6rem); border-top:1px solid var(--line); }
.wk-ih .service-list li { display:grid; grid-template-columns:5rem 1fr 1.2fr; gap:2rem; padding:1.4rem 0; border-bottom:1px solid var(--line); }
.wk-ih .service-list b { font-family:var(--fd); font-size:clamp(1.2rem,2vw,1.8rem); text-transform:uppercase; }
.wk-ih .service-list span:last-child { color:var(--mut); }

.wk-ih .story-cta {
  position:relative; min-height:78svh; display:flex; align-items:flex-end; overflow:hidden;
  padding:clamp(6rem,13vw,11rem) var(--pad) clamp(3rem,7vw,6rem); border-top:1px solid var(--line);
}
.wk-ih .story-cta .hero-media, .wk-ih .story-cta .hero-scrim { position:absolute; inset:0; }
.wk-ih .story-cta .hero-media video, .wk-ih .story-cta .hero-media img { height:100%; object-fit:cover; }
.wk-ih .story-cta .hero-scrim { background:linear-gradient(180deg,rgba(5,5,5,.32),rgba(5,5,5,.94)); }
.wk-ih .cta-copy { position:relative; z-index:2; width:min(100%,1500px); margin:0 auto; }
.wk-ih .cta-title { max-width:12ch; font-size:clamp(3rem,8.5vw,9rem); line-height:.82; }
.wk-ih .cta-row { display:flex; justify-content:space-between; align-items:end; gap:2rem; margin-top:2.5rem; }
.wk-ih .cta-row p { max-width:48ch; color:var(--mut); font-size:clamp(1rem,1.35vw,1.2rem); }

@media(max-width:800px) {
  .wk-ih .top-cta { padding:.7rem .85rem; font-size:.58rem; letter-spacing:.12em; }
  .wk-ih .hero { min-height:92svh; }
  .wk-ih .hero h1 { font-size:clamp(3.3rem,19vw,6rem); }
  .wk-ih .hero-bottom, .wk-ih .proof-row, .wk-ih .chapter-head { grid-template-columns:1fr; gap:1.25rem; }
  .wk-ih .hero-bottom { margin-top:2.25rem; }
  .wk-ih .display { font-size:clamp(2.5rem,13vw,4.5rem); }
  .wk-ih .chapter-head { margin-bottom:1rem; }
  .wk-ih .film-frame.offset { width:100%; }
  .wk-ih .stats { grid-template-columns:repeat(2,1fr); }
  .wk-ih .stat { min-height:10rem; border-bottom:1px solid var(--line); }
  .wk-ih .stat:nth-child(2) { border-right:0; }
  .wk-ih .service-list li { grid-template-columns:3rem 1fr; gap:1rem; }
  .wk-ih .service-list li span:last-child { grid-column:2; }
  .wk-ih .story-cta { min-height:72svh; }
  .wk-ih .cta-row { align-items:flex-start; flex-direction:column; }
}
@media(prefers-reduced-motion:reduce) {
  .wk-ih { scroll-behavior:auto; }
  .wk-ih video[data-autoplay] { display:none; }
  .wk-ih .motion-still { display:block; }
}
`;

function useInViewPlayback() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const videos = Array.from(document.querySelectorAll('.wk-ih video[data-autoplay]'));
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

export default function WorkIncludedHealth() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    document.title = 'Included Health Client Summit Videos | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Included Health film series for annual Client Summit covering keynotes, culture, and thought leadership content for healthcare.');
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
    <div className="wk-ih" onClick={openBriefFromMailLink}>
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6" aria-label="Ahead of Market home"><BrandMark kind="mono" /></a>
        <button type="button" className="top-cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      <header className="hero">
        <div className="hero-media" aria-hidden="true">
          <video muted loop playsInline data-autoplay preload="auto" poster="/videos/ih-life.jpg">
            <source src="/videos/ih-life.mp4" type="video/mp4" />
          </video>
          <img className="motion-still" src="/videos/ih-life.jpg" alt="" />
        </div>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <span className="kicker">Ahead of Market / Featured work / Healthcare</span>
          <h1><span>Included</span> Health<span className="sq" /></h1>
          <div className="hero-bottom">
            <span>Culture / Events / Thought leadership</span>
            <p>A three-day summit translated into a film platform built for lasting client engagement.</p>
          </div>
        </div>
      </header>

      <main>
        <section className="proof">
          <div className="proof-inner proof-row">
            <span className="kicker">The challenge / 01</span>
            <h2 className="display">Three days. Multiple stories<span className="sq" /></h2>
            <div className="body-copy">
              <p>Included Health runs an annual Client Summit bringing together stakeholders across healthcare, insurance, and technology. They needed to capture three days of keynotes, sessions, and interviews, then deliver edited content for different audiences, executive recaps, team culture highlights, and thought leadership pieces.</p>
            </div>
          </div>
        </section>

        <section className="work">
          <div className="work-inner">
            <div className="work-intro">
              <span className="kicker">What we made / 02</span>
              <h2 className="display">One summit, a living content system<span className="sq" /></h2>
              <p className="body-copy">We captured three days of on-site coverage, keynotes, breakout sessions, interviews, and b-roll, then delivered a curated film series showing company culture in action and thought leadership from event speakers. We produced two distinct videos: culture pieces featuring team members in white-background interviews, and event recap content capturing the energy and impact of the summit.</p>
            </div>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">01</span>
                <h3 className="chapter-title">Event recap</h3>
                <p className="chapter-desc">A fast, human record of the summit's energy, ideas, and shared momentum.</p>
              </div>
              <div className="film-frame">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/ih-life.jpg">
                  <source src="/videos/ih-life.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/ih-life.jpg" alt="Included Health event recap still" />
              </div>
            </article>

            <article className="chapter">
              <div className="chapter-head">
                <span className="chapter-no">02</span>
                <h3 className="chapter-title">Culture film</h3>
                <p className="chapter-desc">Employee voices isolated against a white field, making the people and the mission impossible to miss.</p>
              </div>
              <div className="film-frame offset">
                <video muted loop playsInline controls data-autoplay preload="metadata" poster="/videos/ih-culture.jpg">
                  <source src="/videos/ih-culture.mp4" type="video/mp4" />
                </video>
                <img className="motion-still" src="/videos/ih-culture.jpg" alt="Included Health culture film still" />
              </div>
            </article>
          </div>
        </section>

        <section className="results">
          <div className="results-inner">
            <div className="proof-row">
              <span className="kicker">What happened / 03</span>
              <h2 className="display">A platform for client engagement<span className="sq" /></h2>
              <div className="body-copy">
                <p>The film series became Included Health's centerpiece for post-summit engagement, shared across client communications and team channels. The culture videos showcased employee voices and commitment to healthcare innovation. Event recaps preserved the summit's momentum for stakeholders who couldn't attend in person.</p>
                <p>The relationship grew into ongoing work, subsequent contracts for thought leadership content, SME interview videos, and quarterly team communications, delivered through Frame.io for seamless client collaboration.</p>
              </div>
            </div>
            <div className="stats" aria-label="Project facts">
              <div className="stat"><span className="stat-value">03</span><span className="stat-label">Days on site</span></div>
              <div className="stat"><span className="stat-value">02</span><span className="stat-label">Distinct film formats</span></div>
              <div className="stat"><span className="stat-value">360°</span><span className="stat-label">Summit coverage</span></div>
              <div className="stat"><span className="stat-value">QTR</span><span className="stat-label">Ongoing communications</span></div>
            </div>
          </div>
        </section>

        <section className="deliverables">
          <div className="deliverables-inner">
            <span className="kicker">Services / 04</span>
            <h2 className="display">What we delivered<span className="sq" /></h2>
            <ul className="service-list">
              <li><span>01</span><b>3-day on-site coverage</b><span>Keynotes, sessions, interviews, b-roll</span></li>
              <li><span>02</span><b>Culture video production</b><span>Team member interviews &amp; company storytelling</span></li>
              <li><span>03</span><b>Event recap editing</b><span>Summit highlights for stakeholder communication</span></li>
              <li><span>04</span><b>Frame.io delivery system</b><span>Seamless client review &amp; collaboration</span></li>
            </ul>
          </div>
        </section>

        <section className="story-cta">
          <div className="hero-media" aria-hidden="true">
            <video muted loop playsInline data-autoplay preload="metadata" poster="/videos/ih-culture.jpg">
              <source src="/videos/ih-culture.mp4" type="video/mp4" />
            </video>
            <img className="motion-still" src="/videos/ih-culture.jpg" alt="" />
          </div>
          <div className="hero-scrim" />
          <div className="cta-copy">
            <span className="kicker">Your story, next</span>
            <h2 className="cta-title">Ready to tell your story<span className="sq" /></h2>
            <div className="cta-row">
              <p>We produce thought leadership and culture content that turns events into lasting brand assets.</p>
              <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
            </div>
          </div>
        </section>
      </main>

      <ServiceFooter current="/work/included-health" />

      <JsonLd
        schema={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: 'Included Health',
          description: 'Included Health film series for annual Client Summit covering keynotes, culture, and thought leadership content for healthcare.',
          url: 'https://aheadofmarket.com/work/included-health',
          author: { '@type': 'Organization', name: 'Ahead of Market' },
          video: [
            {
              '@type': 'VideoObject',
              name: 'Included Health Culture Film',
              contentUrl: 'https://aheadofmarket.com/videos/ih-culture.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/ih-culture.jpg',
              description: 'Included Health film series for annual Client Summit covering keynotes, culture, and thought leadership content for healthcare.',
            },
            {
              '@type': 'VideoObject',
              name: 'Included Health Life Film',
              contentUrl: 'https://aheadofmarket.com/videos/ih-life.mp4',
              thumbnailUrl: 'https://aheadofmarket.com/videos/ih-life.jpg',
              description: 'Included Health film series for annual Client Summit covering keynotes, culture, and thought leadership content for healthcare.',
            },
          ],
        }}
      />
    </div>
    <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </>
  );
}
