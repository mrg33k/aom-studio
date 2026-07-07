import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// About page: How We Work
// Mission: aheadofmarket.com:home (R20.9 — three /about pages)

const CSS = `
.abh {
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
.abh *, .abh *::before, .abh *::after { box-sizing:border-box; margin:0; padding:0; }
.abh a { color:inherit; text-decoration:none; }
.abh button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.abh img { display:block; max-width:100%; }
.abh a:focus-visible, .abh button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.abh .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.abh .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.abh .chrome-top a { pointer-events:auto; transition:color .15s; }
.abh .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.abh .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.abh .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.abh .chrome-top .cta:hover { background:var(--gold-deep); }

.abh .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.abh .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.abh .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.abh .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.abh .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}
.abh .hero .cta-btn {
  margin-top:2.4rem; display:inline-block;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.abh .hero .cta-btn:hover { background:var(--gold-deep); }

.abh .content-header {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.8rem,4vw,2.6rem); line-height:.95;
  color:var(--paper); margin-bottom:2rem;
}
.abh .content-block {
  max-width:800px; margin:0 auto;
  display:flex; flex-direction:column; gap:2.4rem;
}
.abh .content-block h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.abh .content-block p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.abh .content-block p:last-child { margin-bottom:0; }
.abh .content-item {
  padding:2rem 0; border-top:1px solid rgba(255,255,255,.12);
}
.abh .content-item:first-child { border-top:none; padding-top:0; }

.abh .closing-cta {
  display:flex; flex-direction:column; align-items:center; text-align:center;
}
.abh .closing-cta h2 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2rem,5vw,3.2rem); line-height:.95;
  margin-bottom:2rem;
}
.abh .closing-cta .btn-contact {
  display:inline-block; background:var(--gold); color:var(--ink);
  font-weight:600; padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  margin-bottom:1.8rem; transition:background .18s;
}
.abh .closing-cta .btn-contact:hover { background:var(--gold-deep); }
.abh .closing-contact-info {
  display:flex; flex-wrap:wrap; gap:2rem; justify-content:center; flex-direction:column;
  gap:1rem;
}
@media(min-width:640px){
  .abh .closing-contact-info { flex-direction:row; gap:2rem; }
}
.abh .closing-contact-info a { color:var(--gold); transition:color .15s; }
.abh .closing-contact-info a:hover { color:var(--paper); }
.abh .closing-note {
  margin-top:.8rem; font-size:.85rem; color:var(--dim);
}

.abh .footer {
  text-align:center; padding:3rem var(--pad) clamp(2rem,5vh,4rem);
  border-top:1px solid rgba(196,164,106,.12);
  font-size:.7rem; letter-spacing:.15em; text-transform:uppercase;
  color:var(--dim);
}

@media(prefers-reduced-motion:reduce){
  .abh { scroll-behavior:auto; }
}
`;

export default function AboutHowWeWork() {
  useEffect(() => {
    const originalTitle = document.title;
    const originalMeta = document.querySelector('meta[name="description"]');

    document.title = 'How We Work: Days, Not Months';

    if (!originalMeta) {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'AOM delivers in days, not months. We ship brand films in 14 days, websites in 7 days, and events in real time. That\'s the speed difference that matters.';
      document.head.appendChild(meta);
    } else {
      originalMeta.content = 'AOM delivers in days, not months. We ship brand films in 14 days, websites in 7 days, and events in real time. That\'s the speed difference that matters.';
    }

    return () => {
      document.title = originalTitle;
      if (originalMeta) originalMeta.content = originalMeta.content;
    };
  }, []);

  return (
    <div className="abh">
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
          Days, Not Months<i className="sq" />
        </h1>
        <p className="tagline">
          Most creative work takes forever. Ours doesn't. We ship brand films in 14 days. Websites in 7. Event coverage while the event is still happening.
        </p>
        <a href="mailto:hello@aheadofmarket.com" className="cta-btn">
          Start a conversation
        </a>
      </section>

      {/* The Method */}
      <section className="section">
        <h2 className="content-header">How This Actually Works</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              We start with a tight brief. Thirty minutes if you're prepared, maybe an hour if you need to find the actual problem. We ask what success looks like, what the constraint is, what the client already has that we should use.
            </p>
          </div>
          <div className="content-item">
            <p>
              Then we produce. Not a storyboard that sits in email. Not a deck for approval rounds. We shoot, edit, deliver proof. Fast feedback loops mean we catch misalignment early, when it's easy to fix.
            </p>
          </div>
          <div className="content-item">
            <p>
              By the time the client sees something, we've already solved the hard problem. The review is refinement, not rework.
            </p>
          </div>
          <div className="content-item">
            <p>
              We don't wait for perfect conditions. Ambition Mechanical needed a brand film while their crew was on a roof, in 90-degree heat, doing an emergency install. We filmed it. They loved it. That's our tempo.
            </p>
          </div>
        </div>
      </section>

      {/* Real Fast Turnarounds */}
      <section className="section">
        <h2 className="content-header">Real Fast Turnarounds</h2>
        <div className="content-block">
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>Ambition Mechanical</h3>
            <p>
              14-day brand film during active job site work. Crew on location, real emergency response, live stakes. Delivered, approved, filmed the intro the same week.
            </p>
          </div>
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>Space Rising</h3>
            <p>
              Rapid positioning work locked the company's market position ("Space Rising Interactive"). Then we designed and built the interactive directory platform and covered the Phoenix Space Rising Congress in real time.
            </p>
          </div>
          <div className="content-item">
            <h3 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.1rem,1.4vw,1.25rem)', color: 'var(--paper)', marginBottom: '.8rem' }}>Included Health</h3>
            <p>
              On-site production for their three-day summit. Keynotes, sessions, b-roll, interviews. Delivered Frame.io packages within days. Now we keep coming back because it works.
            </p>
          </div>
        </div>
      </section>

      {/* Why Speed Matters */}
      <section className="section">
        <h2 className="content-header">The Difference It Makes</h2>
        <div className="content-block">
          <div className="content-item">
            <p>
              Fast work respects your schedule and your budget. It means you're not paying for endless rounds or committee approvals. It means momentum.
            </p>
          </div>
          <div className="content-item">
            <p>
              Companies that move fast make different decisions. They test ideas instead of debating them. They deploy instead of planning next quarter.
            </p>
          </div>
          <div className="content-item">
            <p>
              We're built for that tempo. Small team, clear decision rights, no layers between the brief and the build.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="section closing-cta">
        <h2>Ready to Work Fast<i className="sq" /></h2>
        <p style={{ marginTop: '1.6rem', maxWidth: '52ch', fontSize: 'clamp(.95rem,1.2vw,1.05rem)', color: 'var(--mut)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Let's talk about your timeline. We'll tell you what's possible in the window you have.
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
      <ServiceFooter current="/about/how-we-work" />
    </div>
  );
}
