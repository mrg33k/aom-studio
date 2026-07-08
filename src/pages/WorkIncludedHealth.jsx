import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import ServiceFooter from './ServiceFooter';

// Included Health case study: film series for Client Summit + SME content
// Mission: aheadofmarket.com:home (R24 — per-client case-study pages for organic SEO)

const CSS = `
.wk-ih {
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
.wk-ih *, .wk-ih *::before, .wk-ih *::after { box-sizing:border-box; margin:0; padding:0; }
.wk-ih a { color:inherit; text-decoration:none; }
.wk-ih button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wk-ih img, .wk-ih video { display:block; max-width:100%; }
.wk-ih a:focus-visible, .wk-ih button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

.wk-ih .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

.wk-ih .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wk-ih .chrome-top a { pointer-events:auto; transition:color .15s; }
.wk-ih .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wk-ih .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wk-ih .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wk-ih .chrome-top .cta:hover { background:var(--gold-deep); }

.wk-ih .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wk-ih .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

.wk-ih .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wk-ih .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wk-ih .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:48ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

.wk-ih .proof-grid {
  display:grid; grid-template-columns:1fr; gap:4rem; margin-top:3rem;
  max-width:1000px; margin-left:auto; margin-right:auto;
}
@media(min-width:860px){
  .wk-ih .proof-grid { grid-template-columns:1fr; gap:3rem; }
}
.wk-ih .proof-block {
  display:flex; gap:2.4rem; flex-direction:column;
}
@media(min-width:860px){
  .wk-ih .proof-block { gap:3rem; }
}
.wk-ih .proof-text { flex:1; }
.wk-ih .proof-label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:.8rem;
}
.wk-ih .proof-title {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.5rem,3.5vw,2rem); line-height:.95;
  color:var(--paper); margin-bottom:1.2rem;
}
.wk-ih .proof-text p {
  font-size:clamp(.95rem,1.2vw,1.05rem); line-height:1.7;
  color:var(--mut); margin-bottom:.8rem;
}
.wk-ih video {
  width:100%; max-width:600px; margin:1.6rem 0; border-radius:8px;
}

.wk-ih .video-grid {
  display:grid; grid-template-columns:1fr; gap:2rem; margin:2rem 0;
  max-width:600px;
}
@media(min-width:860px){
  .wk-ih .video-grid { grid-template-columns:repeat(2, 1fr); gap:1.6rem; }
}
.wk-ih .video-card {
  display:flex; flex-direction:column;
}
.wk-ih .video-card video {
  width:100%; height:auto; border-radius:6px; margin:0;
}
.wk-ih .video-card .label {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-top:.8rem; margin-bottom:.2rem;
}

.wk-ih .proof-link {
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
}
.wk-ih .proof-link:hover { color:var(--paper); }

.wk-ih .cta-btn {
  display:inline-block; margin-top:2rem;
  background:var(--gold); color:var(--ink); font-weight:600;
  padding:1rem 2.4rem; border-radius:10px; font-size:.95rem;
  transition:background .18s;
}
.wk-ih .cta-btn:hover { background:var(--gold-deep); }
`;

export default function WorkIncludedHealth() {
  useEffect(() => {
    document.title = 'Included Health Client Summit Videos | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Included Health film series for annual Client Summit covering keynotes, culture, and thought leadership content for healthcare.');
    }
  }, []);

  return (
    <div className="wk-ih">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <a className="cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <section className="section hero">
        <h1>Included Health<span className="sq"></span></h1>
        <p className="tagline">Film series for top-5 US insurer Client Summit and ongoing thought leadership content</p>
      </section>

      <section className="section">
        <div className="proof-grid">
          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">The Challenge</div>
              <h2 className="proof-title">Capturing Three Days, Multiple Stories</h2>
              <p>Included Health runs an annual Client Summit bringing together stakeholders across healthcare, insurance, and technology. They needed to capture three days of keynotes, sessions, and interviews, then deliver edited content for different audiences — executive recaps, team culture highlights, and thought leadership pieces.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-label">What We Made</div>
            <h2 className="proof-title">Multi-Purpose Film Series</h2>
            <p>We captured three days of on-site coverage — keynotes, breakout sessions, interviews, and b-roll — then delivered a curated film series showing company culture in action and thought leadership from event speakers. We produced two distinct videos: culture pieces featuring team members in white-background interviews, and event recap content capturing the energy and impact of the summit.</p>

            <div className="video-grid">
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/ih-culture.jpg">
                  <source src="/videos/ih-culture.mp4" type="video/mp4" />
                </video>
                <div className="label">Culture Video</div>
              </div>
              <div className="video-card">
                <video muted loop playsInline controls poster="/videos/ih-life.jpg">
                  <source src="/videos/ih-life.mp4" type="video/mp4" />
                </video>
                <div className="label">Event Recap</div>
              </div>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">What Happened</div>
              <h2 className="proof-title">Content Platform for Client Engagement</h2>
              <p>The film series became Included Health's centerpiece for post-summit engagement, shared across client communications and team channels. The culture videos showcased employee voices and commitment to healthcare innovation. Event recaps preserved the summit's momentum for stakeholders who couldn't attend in person.</p>
              <p>The relationship grew into ongoing work — subsequent contracts for thought leadership content, SME interview videos, and quarterly team communications, delivered through Frame.io for seamless client collaboration.</p>
            </div>
          </div>

          <div className="proof-block">
            <div className="proof-text">
              <div className="proof-label">Services</div>
              <h2 className="proof-title">What We Delivered</h2>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>3-day on-site coverage</strong> — Keynotes, sessions, interviews, b-roll
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Culture video production</strong> — Team member interviews & company storytelling
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Event recap editing</strong> — Summit highlights for stakeholder communication
                </li>
                <li style={{ marginBottom: '.8rem', paddingBottom: '.8rem', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                  <strong>Frame.io delivery system</strong> — Seamless client review & collaboration
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--fd)', fontWeight: 800, textTransform: 'uppercase', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', marginBottom: '1.6rem' }}>
          Ready to capture your story<span className="sq"></span>
        </h2>
        <p style={{ fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', marginBottom: '2rem', maxWidth: '48ch', marginLeft: 'auto', marginRight: 'auto', color: 'var(--mut)' }}>
          We produce thought leadership and culture content that turns events into lasting brand assets.
        </p>
        <a className="cta-btn" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </section>

      <ServiceFooter current="/work/included-health" />
    </div>
  );
}
