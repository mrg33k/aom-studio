import React, { useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import JsonLd from '../components/JsonLd';

// Work hub page: browse all case studies and industry pages
// Mission: aheadofmarket.com:home (R27 — /work navigation hub for SEO + user discovery)
// Pattern: WorkISAEnergy.jsx + ServiceFooter.jsx + BrandsHub card-grid style
// Design: dark ink #060606 / ivory #F6F6F4 / gold #C4A46A, Inter Tight 800 + Space Grotesk

const CSS = `
.wkx {
  --ink:#060606; --ink-2:#0B0B0A; --paper:#F6F6F4;
  --mut:rgba(246,246,244,.8); --dim:rgba(246,246,244,.55);
  --line:rgba(255,255,255,.14); --gold:#C4A46A; --gold-deep:#A8884C;
  --fx:'Inter',system-ui,Helvetica,Arial,sans-serif;
  --fd:'Inter Tight','Inter',system-ui,Helvetica,Arial,sans-serif;
  --fbrut:'Space Grotesk','Space Grotesk Variable',system-ui,sans-serif;
  --pad:clamp(1.25rem,4vw,3.5rem);
  position:fixed; inset:0; overflow-y:auto; overflow-x:hidden;
  scroll-behavior:smooth;
  font-family:var(--fx); color:var(--paper); background:var(--ink);
  font-size:16px; line-height:1.6;
  -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale;
}
.wkx *, .wkx *::before, .wkx *::after { box-sizing:border-box; margin:0; padding:0; }
.wkx a { color:inherit; text-decoration:none; }
.wkx button { font:inherit; cursor:pointer; border:none; background:none; color:inherit; }
.wkx img, .wkx video { display:block; max-width:100%; }
.wkx a:focus-visible, .wkx button:focus-visible { outline:2px solid var(--gold); outline-offset:3px; }

/* signature gold square period */
.wkx .sq { display:inline-block; width:.13em; height:.13em; background:var(--gold); margin-left:.07em; }

/* top chrome: monogram + CTA button */
.wkx .chrome-top {
  position:fixed; top:1.1rem; left:0; right:0; z-index:220;
  display:flex; justify-content:space-between; align-items:center;
  padding:0 var(--pad); pointer-events:none;
}
.wkx .chrome-top a { pointer-events:auto; transition:color .15s; }
.wkx .chrome-top .logo { pointer-events:auto; display:flex; align-items:center; }
.wkx .chrome-top .logo svg { display:block; height:clamp(24px,5vh,32px); width:auto; }
.wkx .chrome-top .cta {
  font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  background:var(--gold); color:var(--ink);
  padding:.9rem 2.1rem; border-radius:10px;
  transition:background .18s;
}
.wkx .chrome-top .cta:hover { background:var(--gold-deep); }

/* sections */
.wkx .section {
  position:relative; padding:clamp(6rem,14vh,12rem) var(--pad);
  border-top:1px solid rgba(196,164,106,.12);
}
.wkx .section:first-child { border-top:none; padding-top:clamp(8rem,20vh,14rem); }

/* hero */
.wkx .hero { display:flex; flex-direction:column; align-items:center; text-align:center; }
.wkx .hero h1 {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(2.8rem,8vw,5rem); line-height:.95; letter-spacing:-.01em;
  margin:0; text-shadow:0 2px 30px rgba(0,0,0,.4);
}
.wkx .hero .tagline {
  margin-top:1.8rem; font-size:clamp(1.1rem,1.6vw,1.3rem);
  color:var(--paper); opacity:.85; max-width:56ch;
  line-height:1.6; text-shadow:0 1px 16px rgba(0,0,0,.6);
}

/* section kickers */
.wkx .section-kick {
  font-size:.75rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase;
  color:var(--gold); margin-bottom:2.4rem; display:block;
}

/* card grid */
.wkx .card-grid {
  display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));
  gap:2rem; margin:3rem 0;
  max-width:1400px; margin-left:auto; margin-right:auto;
}
@media(max-width:600px) {
  .wkx .card-grid {
    grid-template-columns:1fr;
    gap:1.6rem;
  }
}

.wkx .work-card {
  position:relative; display:flex; flex-direction:column;
  background:rgba(255,255,255,.02); border:1px solid rgba(196,164,106,.16);
  border-radius:8px; overflow:hidden;
  transition:transform .2s, box-shadow .2s;
  text-decoration:none; color:inherit;
}
.wkx .work-card:hover {
  transform:translateY(-8px);
  box-shadow:0 20px 60px rgba(196,164,106,.15);
}

.wkx .work-card-image {
  width:100%; height:240px; object-fit:cover; background:rgba(0,0,0,.3);
  display:block;
}

.wkx .work-card-body {
  flex:1; display:flex; flex-direction:column; padding:2rem 1.8rem;
}

.wkx .work-card-name {
  font-family:var(--fd); font-weight:800; text-transform:uppercase;
  font-size:clamp(1.3rem,2.4vw,1.8rem); line-height:.95;
  color:var(--paper); margin-bottom:0.8rem;
}

.wkx .work-card-desc {
  font-family:var(--fbrut); font-size:clamp(.95rem,1.2vw,1.05rem);
  font-weight:500; color:var(--mut); line-height:1.6;
  flex-grow:1; margin-bottom:1.2rem;
}

.wkx .work-card-link {
  display:inline-flex; align-items:center; gap:.4rem;
  font-size:.78rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--gold); transition:color .15s;
  margin-top:auto;
}
.wkx .work-card:hover .work-card-link {
  color:var(--paper);
}
.wkx .work-card-link .arw { font-size:.8em; opacity:.7; }

/* footer */
.wkx .footer {
  background:#060606; color:#F6F6F4; border-top:1px solid rgba(196,164,106,.16);
  padding:clamp(2.5rem,6vw,4.5rem) clamp(1.25rem,4vw,3.5rem) clamp(3rem,7vw,5rem);
  font-family:var(--fx);
}
.wkx .footer-kick { font-size:.66rem; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:var(--gold); margin-bottom:1.4rem; }
.wkx .footer-row { display:flex; flex-wrap:wrap; gap:0; }
.wkx .footer-a { display:flex; align-items:center; gap:.5rem; padding:.85rem 0; margin-right:2.4rem; font-family:var(--fd); font-weight:800; text-transform:uppercase; font-size:clamp(1.1rem,2.4vw,1.6rem); letter-spacing:-.01em; color:#F6F6F4; text-decoration:none; transition:color .15s; }
.wkx .footer-a:hover { color:var(--gold); }
.wkx .footer-a .arw { font-size:.7em; opacity:.7; }
.wkx .footer-a.home { color:var(--gold); }
.wkx .footer-a.home .mk { width:20px; height:20px; display:inline-block; color:var(--gold); }
.wkx .footer-info { display:flex; flex-wrap:wrap; gap:1.4rem; align-items:baseline; margin-top:2.2rem; padding-top:1.6rem; border-top:1px solid rgba(255,255,255,.1); font-size:.8rem; color:rgba(246,244,244,.66); }
.wkx .footer-info a { color:rgba(246,244,244,.66); text-decoration:none; transition:color .15s; }
.wkx .footer-info a:hover { color:var(--gold); }
.wkx .footer-info .cr { margin-left:auto; font-size:.64rem; letter-spacing:.14em; text-transform:uppercase; color:rgba(246,244,244,.44); }
@media(max-width:560px){ .wkx .footer-info .cr { margin-left:0; width:100%; } }
`;

// Project data: 9 case studies + 3 industry pages
const PROJECTS = [
  // CASE STUDIES
  {
    name: 'ISA Energy',
    slug: 'isa-energy',
    desc: '3-film investor-grade video series for renewable energy company',
    poster: '/videos/isa-brand.jpg',
    section: 'Case Studies',
  },
  {
    name: 'Included Health',
    slug: 'included-health',
    desc: 'Film series for Client Summit and ongoing thought leadership content',
    poster: '/videos/ih-culture.jpg',
    section: 'Case Studies',
  },
  {
    name: 'Ambition Mechanical',
    slug: 'ambition-mechanical',
    desc: 'HVAC brand refresh and digital platform for Phoenix leader',
    poster: '/videos/ambition-vertical.jpg',
    section: 'Case Studies',
  },
  {
    name: 'Space Rising',
    slug: 'space-rising',
    desc: 'Platform and launch campaign for a space-industry network',
    poster: '/videos/spacerising-render.jpg',
    section: 'Case Studies',
  },
  {
    name: 'Brandon Wiley',
    slug: 'brandon-wiley',
    desc: 'Long-form founder-story documentary',
    poster: null,
    section: 'Case Studies',
  },
  {
    name: 'Virtu Hospitality',
    slug: 'virtu-hospitality',
    desc: 'Brand film for a hospitality group',
    poster: null,
    section: 'Case Studies',
  },
  {
    name: 'PA\'LA',
    slug: 'pala',
    desc: 'Brand film and social content for a wood-fired restaurant',
    poster: null,
    section: 'Case Studies',
  },
  {
    name: 'Kohrs',
    slug: 'kohrs',
    desc: 'Jobsite social content for a demolition and renovation crew',
    poster: null,
    section: 'Case Studies',
  },
  {
    name: 'Intelliplay',
    slug: 'intelliplay',
    desc: 'Product demo film for an interactive tech platform',
    poster: null,
    section: 'Case Studies',
  },
  // INDUSTRIES
  {
    name: 'Construction',
    slug: 'construction',
    desc: 'Digital marketing and brand leadership for construction firms',
    poster: null,
    section: 'By Industry',
  },
  {
    name: 'Tech & SaaS',
    slug: 'tech-saas',
    desc: 'Go-to-market strategy and product positioning for tech companies',
    poster: null,
    section: 'By Industry',
  },
  {
    name: 'Nonprofit',
    slug: 'nonprofit',
    desc: 'Mission-driven storytelling and fundraising narratives',
    poster: null,
    section: 'By Industry',
  },
];

export default function WorkIndex() {
  useEffect(() => {
    document.title = 'Our Work | Ahead of Market';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', 'Explore Ahead of Market work: case studies in renewable energy, healthcare, construction, tech and more. See how we position growth brands.');
    }
  }, []);

  // Group projects by section
  const caseStudies = PROJECTS.filter(p => p.section === 'Case Studies');
  const industries = PROJECTS.filter(p => p.section === 'By Industry');

  return (
    <div className="wkx">
      <style>{CSS}</style>

      <div className="chrome-top">
        <a className="logo" href="/r6">
          <BrandMark kind="mono" />
        </a>
        <a className="cta" href="mailto:hello@aheadofmarket.com">Start a conversation</a>
      </div>

      <section className="section hero">
        <h1>The work<span className="sq"></span></h1>
        <p className="tagline">A collection of recent projects across industries — how we position growth brands through strategy, storytelling, and design.</p>
      </section>

      {/* Case Studies Section */}
      <section className="section">
        <span className="section-kick">Case Studies</span>
        <div className="card-grid">
          {caseStudies.map((project) => (
            <a key={project.slug} href={`/work/${project.slug}`} className="work-card">
              {project.poster && (
                <img src={project.poster} alt={project.name} className="work-card-image" />
              )}
              <div className="work-card-body">
                <div className="work-card-name">{project.name}</div>
                <div className="work-card-desc">{project.desc}</div>
                <div className="work-card-link">
                  View case study <span className="arw">↗</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Industries Section */}
      <section className="section">
        <span className="section-kick">By Industry</span>
        <div className="card-grid">
          {industries.map((project) => (
            <a key={project.slug} href={`/work/${project.slug}`} className="work-card">
              {project.poster && (
                <img src={project.poster} alt={project.name} className="work-card-image" />
              )}
              <div className="work-card-body">
                <div className="work-card-name">{project.name}</div>
                <div className="work-card-desc">{project.desc}</div>
                <div className="work-card-link">
                  Explore industry <span className="arw">↗</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-kick">More from AOM</div>
        <div className="footer-row">
          <a className="footer-a home" href="/r6">
            <BrandMark kind="mono" className="mk" /> Home
          </a>
          <a className="footer-a" href="/services/brand-film">
            Brand film <span className="arw">↗</span>
          </a>
          <a className="footer-a" href="/services/web-build">
            Website design & build <span className="arw">↗</span>
          </a>
          <a className="footer-a" href="/services/strategy">
            Strategy & story <span className="arw">↗</span>
          </a>
          <a className="footer-a" href="/services/documentary">
            Documentary <span className="arw">↗</span>
          </a>
        </div>
        <div className="footer-info">
          <a href="mailto:hello@aheadofmarket.com">hello@aheadofmarket.com</a>
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
  );
}
