import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// About page: Our Story
// Mission: aheadofmarket.com:home (R20.9 — three /about pages, same design system as services)
// Design gate: r6 system, same ink/ivory/gold + Inter/Inter Tight, gold square period on H1,
// AOM monogram chrome top, minimal layout, real client proof points.

const CSS = `
.abo {
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
.abo *, .abo *::before, .abo *::after { box-sizing:border-box; margin:0; padding:0; }
.abo a { color:inherit; text-decoration:none; }
.abo button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.abo img { display:block; max-width:100%; }
.abo a:focus-visible, .abo button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.abo .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.abo .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.abo .chrome-top a { pointer-events:auto; transition:color .15s; }
.abo .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.abo .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.abo .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.abo .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.abo .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.abo .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.abo .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.abo .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.abo .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.abo .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.abo .hero .cta-btn:hover { background:var(--gold-deep); }

/* content section */
.abo .content-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.abo .content-block {
  max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:2.4rem;
}
.abo .content-block h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.abo .content-block p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.abo .content-block p:last-child { margin-bottom:0; }
.abo .content-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.abo .content-item:first-child { border-top:none; padding-top:0; }

/* closing */
.abo .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.abo .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.abo .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.abo .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.abo .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .abo .closing-contact-info { flex-direction:row; gap:2rem; }
}
.abo .closing-contact-info a { color:var(--gold); transition:color .15s; }
.abo .closing-contact-info a:hover { color:var(--paper); }
.abo .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

/* footer */
.abo .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .abo { scroll-behavior:auto; }
}
`;

export default function AboutOurStory() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'Since 2020. 100+ Projects. Real Companies.';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Ahead of Market has shipped 100+ projects since 2020, from brand films to web platforms. We work with founders, agencies, and mission-driven companies.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'Ahead of Market has shipped 100+ projects since 2020, from brand films to web platforms. We work with founders, agencies, and mission-driven companies.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="abo">
      <style>{CSS}</style>

      {/* Top Chrome */}
      <div className="chrome-top">
        <a href="/r6" className="logo" aria-label="Ahead of Market home">
          <BrandMark kind="mono" />
        </a>
        <a href="mailto:hello@aheadofmarket.com" className="cta">Start a conversation</a>
      </div>

      {/* Hero */}
      <section className="section hero">
        <h1>
          Since 2020. 100+ Projects<i className="sq" />
        </h1>
        <p className="tagline">
          We've been making work for companies since 2020. Not the talk about it. The actual work. Web platforms. Brand films. Documentaries. Social content. Things that ship.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* The Work Came First */}
      <section className="section">
        <h2 className="content-header">The Work Came First</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              We started because our clients needed something different. Not a pitch deck consultant. Not a generalist. A company that actually builds the thing, stays for the hard part, and doesn't leave until it works.
            </p>
          </div>
          <div className="content-item">
            <p>
              The first five years we learned what matters: speed. Honesty about scope. Clients who'd work with us a second time. Builders who could do video and code and strategy in the same conversation. By 2020, the structure was clear enough to stop freelancing and build a real business.
            </p>
          </div>
          <div className="content-item">
            <p>
              Since then we've worked with HVAC companies in Phoenix, space industry coordinators in Arizona, healthcare platforms, quantum energy startups, restaurateurs, demolition crews, nonprofits, documentary subjects, and founders. Some hired us once. Some came back. A few became partners.
            </p>
          </div>
        </div>
      </section>

      {/* The Roster */}
      <section className="section">
        <h2 className="content-header">The Roster</h2>
        <div className="content-block">
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>Ambition Mechanical</h3>
            <p>
              Ambition Mechanical has worked with us for three years. We built their brand, their website, their Google Ads, and a 88-video TikTok archive. They call when they have a problem.
            </p>
          </div>
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>Space Rising</h3>
            <p>
              Space Rising is building a neutral platform for the space industry. We positioned the company, designed the interactive directory, covered their launch event, and ship ongoing campaign work.
            </p>
          </div>
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>Included Health</h3>
            <p>
              Included Health runs an annual summit. We covered three days of on-site production and keep coming back for content. That's the relationship pattern we like: real work, recurring, earned through delivery.
            </p>
          </div>
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>ISA Energy</h3>
            <p>
              ISA Energy is a quantum technology company. We shaped their founder narrative into an investor-grade brand film and documented their story.
            </p>
          </div>
          <div className="content-item">
            <p>
              We've also worked with Brandon Wiley on a long-form documentary, with Pa'la on their restaurant launch, with KOHRS on a social media retainer, and with dozens of other companies across different industries.
            </p>
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="section">
        <h2 className="content-header">Who We Are</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              The people who answer the phone are Patrik (leading the strategy and creative), Gary (running the business and production), Cleo (editing and motion work), Bobby (web development), Steffen (design), and others. We're small enough to care about each project. Big enough to handle the complicated ones.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Let's Talk<i className="sq" /></h2>
        <p style={{ marginTop: '1.6rem', maxWidth: '52ch', fontSize: 'clamp(.95rem,1.2vw,1.05rem)', color: 'var(--mut)', lineHeight: 1.7, marginBottom: '2rem' }}>
          If you're building something that matters and you need a team that knows how to ship it, that's us.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="btn-contact">
          Send us a message
        </a>
        <div className="closing-contact-info">
          <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
          <a href="tel:+16023732164">602 373 2164</a>
          <span className="closing-note">We reply within 24 hours</span>
        </div>
      </section>

      {/* Footer */}
      <ServiceFooter current="/about/our-story" />
    </div>
  );
}
