import React, { useEffect, useState } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import ServiceFooter from './ServiceFooter';
import { R31_PAGE_CSS, R31Video, useR31InViewPlayback } from './ServiceBrandFilm';

// About page: Our Standards
// Mission: aheadofmarket.com:home (R31, nav completion)

const CSS = `
.abs {
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
.abs *, .abs *::before, .abs *::after { box-sizing:border-box; margin:0; padding:0; }
.abs a { color:inherit; text-decoration:none; }
.abs button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.abs img { display:block; max-width:100%; }
.abs a:focus-visible, .abs button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.abs .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.abs .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.abs .chrome-top a { pointer-events:auto; transition:color .15s; }
.abs .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.abs .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.abs .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.abs .chrome-top .cta:hover { background:var(--gold-deep); }

.abs .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.abs .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.abs .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.abs .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.abs .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.abs .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.abs .hero .cta-btn:hover { background:var(--gold-deep); }

.abs .content-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.abs .content-block {
  max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:2.4rem;
}
.abs .content-block h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.abs .content-block p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.abs .content-block p:last-child { margin-bottom:0; }
.abs .content-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.abs .content-item:first-child { border-top:none; padding-top:0; }

.abs .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.abs .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.abs .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.abs .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.abs .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .abs .closing-contact-info { flex-direction:row; gap:2rem; }
}
.abs .closing-contact-info a { color:var(--gold); transition:color .15s; }
.abs .closing-contact-info a:hover { color:var(--paper); }
.abs .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

.abs .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .abs { scroll-behavior:auto; }
}
`;

export default function AboutStandards() {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Our Standards: Output Quality, Nothing Else';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'AOM work is broadcast-clean, investor-grade, and never templated. We reject placeholder images, stock music, and shortcuts. Quality filters to the right clients.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'AOM work is broadcast-clean, investor-grade, and never templated. We reject placeholder images, stock music, and shortcuts. Quality filters to the right clients.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);
  useR31InViewPlayback();

  const openBriefFromMailLink = (event) => {
    if (event.target.closest?.('a[href^="mail"]')) {
      event.preventDefault();
      setBriefModalOpen(true);
    }
  };

  return (
    <>
    <div className="abs r31-page" onClick={openBriefFromMailLink}>
      <style>{CSS}{R31_PAGE_CSS}</style>

      {/* Top Chrome */}
      <div className="chrome-top">
        <a href="/" className="logo" aria-label="Ahead of Market home">
          <BrandMark kind="mono" />
        </a>
        <button type="button" className="cta" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
      </div>

      {/* Hero */}
      <section className="section hero">
        <div className="hero-media" aria-hidden="true"><R31Video src="/videos/reel-12.mp4" posterSrc="/videos/hero-poster.jpg" preload="auto" /></div>
        <div className="hero-scrim" />
        <div className="hero-copy">
          <span className="kicker">Ahead of Market / Standards</span>
          <h1>Output Quality.<br />Nothing Else Matters<i className="sq" /></h1>
          <p className="tagline">We don't have a pitch about our process. We have standards. And they filter to the clients who actually care.</p>
          <button type="button" className="cta-btn" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
        </div>
      </section>

      <section className="motion-strip" aria-label="Selected finished work">
        <div className="motion-frame"><R31Video src="/videos/isa-validation.mp4" posterSrc="/videos/isa-validation.jpg" /></div>
        <div className="motion-frame"><R31Video src="/videos/ih-culture.mp4" posterSrc="/videos/ih-culture.jpg" /></div>
        <div className="motion-frame"><R31Video src="/videos/spacerising-render.mp4" posterSrc="/videos/spacerising-render.jpg" /></div>
      </section>

      {/* What This Looks Like in Practice */}
      <section className="section">
        <h2 className="content-header">What This Looks Like in Practice</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              Every frame of video we ship is color-graded from real production footage. When Ambition Mechanical needed a brand film, every second was shot on a real job site, color-corrected, and edited to broadcast standards. When ISA Energy needed to pitch their technology to investors, the video carried the quality of investor-grade material: clean audio, professional color work, no shortcuts.
            </p>
          </div>
          <div className="content-item">
            <p>
              Space Rising's platform is designed as a product interface, not a website template. The directories, the events system, the member dashboard. These are built as real platforms, not bolted-on components. That's the difference between what ships and what looks shipped.
            </p>
          </div>
          <div className="content-item">
            <p>
              Included Health's summit videos are edited at the quality bar of their brand work. Color correction, sound mix, motion design where it serves the story, not design for design's sake, but every detail in service of the content.
            </p>
          </div>
          <div className="content-item">
            <p>
              Every design has a reason. Every line of code solves the problem. Every frame of media is our work, not a licensed shortcut.
            </p>
          </div>
        </div>
      </section>

      {/* Why We're Not the Cheapest */}
      <section className="section">
        <h2 className="content-header">Why We're Not the Cheapest</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              This bar costs more because it takes more. Real production demands real crew. Color grading takes time. Building a platform takes more skill than using a template. Writing copy that actually reflects your company takes research.
            </p>
          </div>
          <div className="content-item">
            <p>
              We're upfront about that. If you need the cheapest option, we're not it. If you need the best output, we are.
            </p>
          </div>
          <div className="content-item">
            <p>
              The clients who stay with us know the difference. Ambition works with us across multiple projects. Space Rising becomes a partner. Included Health books us again. That's because the output justifies the investment every time.
            </p>
          </div>
        </div>
      </section>

      {/* Who We're For, Who We're Not */}
      <section className="section">
        <h2 className="content-header">Who We're For, Who We're Not</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              We're for companies building something real. Founders who want investors to take them seriously. Agencies who need a quality partner. Nonprofits whose mission deserves better than templated work.
            </p>
          </div>
          <div className="content-item">
            <p>
              We're not for budget shopping or feature checklists. We're not for "make it pop" without strategy. We're not for clients who won't commit to the standard.
            </p>
          </div>
          <div className="content-item">
            <p>
              That filter is intentional. It means we only work with people who get it.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <div className="hero-media" aria-hidden="true"><R31Video src="/videos/collage-02.mp4" posterSrc="/videos/ambition-vertical.jpg" /></div>
        <div className="hero-scrim" />
        <h2>Let's Build Something Worth the Investment<i className="sq" /></h2>
        <p style={{ marginTop: '1.6rem', maxWidth: '52ch', fontSize: 'clamp(.95rem,1.2vw,1.05rem)', color: 'var(--mut)', lineHeight: 1.7, marginBottom: '2rem' }}>
          If your standard matches ours, let's talk about your project.
        </p>
        <button type="button" className="btn-contact" onClick={() => setBriefModalOpen(true)}>Start a conversation</button>
        <div className="closing-contact-info">
          <button type="button" onClick={() => setBriefModalOpen(true)}>hello@aheadofmarket.com</button>
          <a href="tel:+16023732164">602 373 2164</a>
          <span className="closing-note">We reply within 24 hours</span>
        </div>
      </section>

      {/* Footer */}
      <ServiceFooter current="/about/standards" />
    </div>
    <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />
    </>
  );
}
