import React from 'react';
import BrandMark from '../../components/home/BrandMark';

// /versions — the AOM homepage archive. Mission: aheadofmarket.com:home (R16).
// Purpose: Patrik flips through every homepage era we've built and opens the one
// that feels closest. One action per card: open the version. Styled in the R15
// cinematic-glass language so the archive itself sits in the current lane.

const ERAS = [
  {
    label: 'Tonight',
    items: [
      { slug: null, href: '/r5', shot: '/versions/r15.jpg', live: true, title: 'Cinematic glass', note: 'Raw client footage full-bleed, liquid glass, gold square period. The R15 rethink.' },
    ],
  },
  {
    label: 'The gear saga',
    items: [
      { slug: 'density', title: 'Editorial at max density', note: 'R14. Film marquee band, media strips everywhere, true Ronin 4D renders.' },
      { slug: 'gear-turn', title: 'Gear turns in space', note: 'R12. The rig and laptop rotate front-to-back as you scroll. Cursor tilt.' },
      { slug: 'act-stage', title: 'The act stage', note: 'R11. One fixed stage. The camera rig lives through the whole chapter, choreographed by scroll.' },
      { slug: 'gear-float', title: 'Floating gear', note: 'R10. Gold-lit gear renders drifting under the identity claims. The oryzo direction starts here.' },
    ],
  },
  {
    label: 'The editorial era',
    items: [
      { slug: 'editorial', title: 'Ink and ivory chapters', note: 'R9. The magazine system. Kinetic uppercase type, chapter HUD, alternating paper and ink scenes.' },
      { slug: 'scroll-story', title: 'The scroll story', note: 'R7. Centered full-height scenes, glyph set, progress rail, identity reveal payoff.' },
    ],
  },
  {
    label: 'The rebrand explorations',
    items: [
      { slug: 'horizontal', title: 'Horizontal film site', note: 'The site scrolls sideways through pinned panels, like walking a filmstrip.' },
      { slug: 'scroll-site', title: 'The scroll site', note: 'Buttery smooth scroll with a pinned hero scene and reveal moments.' },
      { slug: 'flim', title: 'Giant type on graph paper', note: 'flim.ai-style hero. Massive headline, graph-paper grid, film wall below.' },
      { slug: 'bento', title: 'The bento grid', note: 'Homepage as a bento board. Four layouts behind an in-page switcher.' },
      { slug: 'paradigms', title: 'Four paradigms', note: 'Bento, editorial, split and film heroes behind one switcher. The fork in the road.' },
      { slug: 'showcase-lens', title: 'The cursor lens', note: 'Footage revealed through a lens that follows your cursor over the hero.' },
      { slug: 'superside', title: 'The marketing home', note: 'Superside-faithful structure with four hero directions and a running reel.' },
    ],
  },
  {
    label: 'Standing pages',
    items: [
      { slug: null, href: '/r4', shot: '/versions/r4.jpg', title: 'The r4 trio', note: 'Classic, Editorial and Cinema. Three complete homepages, switcher floats top-right on the page.' },
      { slug: null, href: '/home-v2', shot: '/versions/home-v2.jpg', title: 'V2 slides', note: 'Full-screen slide deck home. This was the live homepage for a stretch.' },
      { slug: null, href: 'https://www.aheadofmarket.com', shot: '/versions/live.jpg', live: true, title: 'The public site', note: 'What clients see today at aheadofmarket.com.' },
    ],
  },
];

const CSS = `
.vgal {
  --ink:#060606; --paper:#F6F6F4; --mut:rgba(246,246,244,.64); --dim:rgba(246,246,244,.42);
  --line:rgba(255,255,255,.14); --gold:#C4A46A;
  font-family:'Inter',system-ui,Helvetica,Arial,sans-serif;
  background:var(--ink); color:var(--paper); min-height:100vh;
  -webkit-font-smoothing:antialiased; line-height:1.6;
}
.vgal *, .vgal *::before, .vgal *::after { box-sizing:border-box; margin:0; padding:0; }
.vgal a { color:inherit; text-decoration:none; }
.vgal .wrap { max-width:1240px; margin-inline:auto; padding:clamp(2rem,5vw,4rem) clamp(1.5rem,4.5vw,4rem) 6rem; position:relative; z-index:1; }
.vgal .ghost {
  position:fixed; left:50%; top:52%; transform:translate(-50%,-50%);
  font-weight:500; letter-spacing:-.04em; white-space:nowrap;
  font-size:clamp(5rem,22vw,20rem); color:transparent;
  -webkit-text-stroke:1px rgba(246,246,244,.055); pointer-events:none; user-select:none;
}
.vgal .lg {
  background:rgba(0,0,0,.4); background-blend-mode:luminosity;
  backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px);
  box-shadow:inset 0 1px 1px rgba(255,255,255,.1); position:relative; overflow:hidden;
}
.vgal .lg::before {
  content:''; position:absolute; inset:0; border-radius:inherit; padding:1.4px;
  background:linear-gradient(180deg, rgba(255,255,255,.3) 0%, rgba(255,255,255,.1) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,.1) 80%, rgba(255,255,255,.3) 100%);
  -webkit-mask:linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite:xor; mask-composite:exclude; pointer-events:none;
}
.vgal .head { display:flex; align-items:center; gap:.7rem; margin-bottom:.75rem; }
.vgal .head .mark { width:26px; height:26px; color:var(--paper); }
.vgal .head span { font-size:.9rem; font-weight:500; }
.vgal h1 { font-size:clamp(2.2rem,5.5vw,4.2rem); font-weight:400; letter-spacing:-.04em; line-height:1.05; max-width:24ch; }
.vgal h1 .sq { display:inline-block; width:.12em; height:.12em; background:var(--gold); margin-left:.08em; }
.vgal .sub { color:var(--mut); max-width:56ch; margin-top:1rem; font-size:1rem; }
.vgal .era { margin-top:clamp(2.5rem,5vw,4rem); }
.vgal .era-h { display:flex; align-items:center; gap:1rem; margin-bottom:1.25rem; }
.vgal .era-h span { font-size:.68rem; font-weight:500; letter-spacing:.2em; text-transform:uppercase; color:var(--gold); white-space:nowrap; }
.vgal .era-h i { flex:1; height:1px; background:var(--line); }
.vgal .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
@media(max-width:1000px){ .vgal .grid { grid-template-columns:repeat(2,1fr); } }
@media(max-width:600px){ .vgal .grid { grid-template-columns:1fr; } }
.vgal .card { border-radius:16px; display:flex; flex-direction:column; transition:transform .3s cubic-bezier(.22,1,.36,1); }
.vgal .card:hover { transform:translateY(-3px); }
.vgal .card > * { position:relative; z-index:1; }
.vgal .thumb { aspect-ratio:16/10; overflow:hidden; border-radius:16px 16px 0 0; background:#0D0D0C; position:relative; }
.vgal .thumb img { width:100%; height:100%; object-fit:cover; object-position:top; display:block; transition:transform .5s cubic-bezier(.22,1,.36,1); }
.vgal .card:hover .thumb img { transform:scale(1.04); }
.vgal .thumb .ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--dim); font-size:.68rem; letter-spacing:.18em; text-transform:uppercase; font-weight:500; }
.vgal .badge { position:absolute; top:.8rem; left:.8rem; z-index:2; display:inline-flex; align-items:center; gap:.45rem; background:rgba(6,6,6,.72); border:1px solid rgba(196,164,106,.5); border-radius:8px; padding:.35rem .65rem; font-size:.6rem; font-weight:600; letter-spacing:.18em; text-transform:uppercase; color:var(--gold); }
.vgal .badge i { width:5px; height:5px; background:var(--gold); border-radius:50%; }
.vgal .body { padding:1.1rem 1.25rem 1.25rem; display:flex; flex-direction:column; gap:.4rem; flex:1; }
.vgal .t { font-size:1.02rem; font-weight:500; letter-spacing:-.01em; display:flex; align-items:baseline; justify-content:space-between; gap:.6rem; }
.vgal .t em { font-style:normal; color:var(--gold); font-size:.85em; transition:transform .2s; }
.vgal .n { font-size:.84rem; color:var(--mut); line-height:1.6; }
`;

function Card({ v }) {
  const href = v.href || `/versions/${v.slug}`;
  const shot = v.shot || `/versions/${v.slug}.jpg`;
  const ext = v.href && v.href.startsWith('http');
  return (
    <a className="card lg" href={href} {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}>
      <div className="thumb">
        <span className="ph">Ahead of Market</span>
        {v.live && <span className="badge"><i />Live</span>}
        <img src={shot} alt={v.title} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
      </div>
      <div className="body">
        <span className="t">{v.title} <em>↗</em></span>
        <span className="n">{v.note}</span>
      </div>
    </a>
  );
}

export default function VersionsGallery() {
  return (
    <div className="vgal">
      <style>{CSS}</style>
      <span className="ghost" aria-hidden="true">versions</span>
      <div className="wrap">
        <div className="head">
          <BrandMark kind="mono" className="mark" />
          <span>Ahead of Market</span>
        </div>
        <h1>Every homepage we've made<span className="sq" /></h1>
        <p className="sub">
          One card per era, newest first. Tap any card to open that version live and scroll it.
          The story copy is the same in most of them; the skin is what changed.
        </p>
        {ERAS.map(era => (
          <section className="era" key={era.label}>
            <div className="era-h"><span>{era.label}</span><i /></div>
            <div className="grid">
              {era.items.map(v => <Card v={v} key={v.title} />)}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
