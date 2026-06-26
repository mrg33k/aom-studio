import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LazyGumlet from '../components/home/LazyGumlet';
import BrandMark from '../components/home/BrandMark';
import { bySlug, PROJECTS } from '../data/projects.js';

const playerEmbed = (id) => `https://play.gumlet.io/embed/${id}?autoplay=true`;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Schibsted+Grotesk:wght@400;500;600;700&display=swap');
.pp{--ink:#0B0B0B;--ink-800:#161614;--ink-700:#2A2A28;--ink-500:#6E6E66;--ink-300:#A8A49C;--paper:#F6F6F4;--paper-alt:#EEEDE8;--line:#DCD9D2;--stone:#B6B2AB;--gold:#C4A46A;--gold-deep:#A8884C;--display:'Bricolage Grotesque',system-ui,Helvetica,Arial,sans-serif;--text:'Schibsted Grotesk',system-ui,Helvetica,Arial,sans-serif;}
.pp{font-family:var(--text);background:var(--paper);color:var(--ink);font-size:16px;-webkit-font-smoothing:antialiased;}
.pp .wrap{max-width:1180px;margin:0 auto;padding:0 28px;}
.pp .disp{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:.92;}
.pp .gold{color:var(--gold);}
.pp .dot{display:inline-block;width:.5em;height:.5em;background:var(--gold);margin-left:.12em;}
.pp a{color:inherit;text-decoration:none;}
.pp .btn{font-family:var(--text);font-weight:600;font-size:15px;letter-spacing:.01em;padding:15px 26px;display:inline-flex;align-items:center;gap:10px;border:1px solid var(--ink);background:var(--ink);color:var(--paper);text-transform:uppercase;cursor:pointer;}
.pp .btn.gold{background:var(--gold);border-color:var(--gold);color:var(--ink);}
.pp .btn.ghost-light{background:transparent;color:var(--paper);border-color:#454440;}

/* nav */
.pp .nav{border-bottom:1px solid var(--line);background:var(--paper);position:sticky;top:0;z-index:40;}
.pp .nav .row{display:flex;align-items:center;justify-content:space-between;height:70px;}
.pp .nav .brand{display:flex;align-items:center;gap:11px;}
.pp .nav .brand .mk{width:34px;height:34px;color:var(--ink);}
.pp .nav .brand .wm{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:16px;}
.pp .nav .back{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-500);}

/* hero */
.pp .hero{background:var(--ink);color:var(--paper);position:relative;overflow:hidden;}
.pp .heromedia{position:absolute;inset:0;z-index:0;}
.pp .heromedia .vid,.pp .heromedia iframe{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}
.pp .heroscrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(11,11,11,.35) 0%,rgba(11,11,11,.28) 38%,rgba(11,11,11,.9) 100%);}
.pp .heroinner{position:relative;z-index:2;padding:120px 0 64px;min-height:560px;display:flex;flex-direction:column;justify-content:flex-end;}
.pp .chips{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:24px;}
.pp .chips span{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--paper);border:1px solid #454440;padding:6px 12px;}
.pp .hero h1{font-size:84px;max-width:14ch;}
.pp .hero .lede{font-size:22px;line-height:1.45;color:#E8E6E0;max-width:40ch;margin-top:26px;}

/* body sections */
.pp .body{padding:90px 0;}
.pp .sec{display:grid;grid-template-columns:300px 1fr;gap:40px;padding:40px 0;border-top:1px solid var(--line);}
.pp .sec:first-child{border-top:none;padding-top:0;}
.pp .sec h2{font-size:30px;}
.pp .sec p{font-size:19px;line-height:1.62;color:#2A2A28;max-width:62ch;}

/* pull quote */
.pp .pull{padding:64px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);margin:30px 0;}
.pp .pull p{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;line-height:1.02;font-size:46px;max-width:20ch;}

/* film */
.pp .film{padding:20px 0 0;}
.pp .filmwrap{position:relative;aspect-ratio:16/9;background:var(--ink);border:1px solid var(--ink);overflow:hidden;}
.pp .filmwrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}

/* outcomes */
.pp .out{background:var(--ink);color:var(--paper);padding:80px 0;}
.pp .out .eyebrow{color:var(--gold);font-size:11px;letter-spacing:.3em;text-transform:uppercase;display:block;margin-bottom:18px;}
.pp .out h2{font-size:54px;margin-bottom:40px;}
.pp .out .grid{display:grid;grid-template-columns:repeat(2,1fr);}
.pp .out .o{display:flex;gap:16px;align-items:baseline;padding:22px 26px;border-top:1px solid var(--ink-700);border-left:1px solid var(--ink-700);}
.pp .out .o:nth-child(odd){border-left:none;padding-left:0;}
.pp .out .o:nth-child(-n+2){border-top:none;}
.pp .out .o .n{font-family:var(--display);font-weight:800;color:var(--gold-deep);font-size:15px;}
.pp .out .o .t{font-size:18px;}

/* related */
.pp .rel{padding:84px 0;border-top:1px solid var(--line);}
.pp .rel .eyebrow{color:var(--gold-deep);font-size:11px;letter-spacing:.3em;text-transform:uppercase;display:block;margin-bottom:20px;}
.pp .rel h2{font-size:40px;margin-bottom:30px;}
.pp .rel .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;}
.pp .rel .card{border:1px solid var(--line);background:var(--paper);overflow:hidden;display:block;}
.pp .rel .card .media{position:relative;aspect-ratio:16/9;background:var(--ink);overflow:hidden;}
.pp .rel .card .media .vid{position:absolute;inset:0;}
.pp .rel .card .meta{padding:18px 20px;}
.pp .rel .card .meta .c{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold-deep);}
.pp .rel .card .meta h3{font-family:var(--display);font-weight:800;text-transform:uppercase;letter-spacing:-.02em;font-size:22px;margin:8px 0 4px;}
.pp .rel .card .meta .open{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-500);margin-top:10px;display:block;}

/* close */
.pp .close{background:var(--paper-alt);padding:96px 0;text-align:center;}
.pp .close h2{font-size:60px;}
.pp .close .row{display:flex;gap:16px;justify-content:center;align-items:center;flex-wrap:wrap;margin-top:30px;}
.pp .close .note{color:var(--ink-500);font-size:15px;}

/* footer */
.pp .foot{background:var(--ink);color:var(--stone);padding:48px 0;}
.pp .foot .row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:18px;}
.pp .foot .brand{display:flex;align-items:center;gap:11px;color:var(--paper);}
.pp .foot .brand .mk{width:30px;height:30px;}
.pp .foot .brand .wm{font-family:var(--display);font-weight:800;text-transform:uppercase;font-size:15px;}
.pp .foot .fine{font-size:12px;color:#6E6E66;}

@media(max-width:880px){
  .pp .hero h1{font-size:52px;}
  .pp .sec{grid-template-columns:1fr;gap:14px;}
  .pp .pull p{font-size:32px;}
  .pp .out .grid,.pp .rel .grid{grid-template-columns:1fr;}
  .pp .out .o:nth-child(2){border-top:1px solid var(--ink-700);}
  .pp .close h2{font-size:40px;}
}
`;

export default function ProjectPage() {
  const { slug } = useParams();
  const p = bySlug(slug);

  useEffect(() => {
    if (!p) return;
    document.title = p.seoTitle || `${p.title} | Ahead of Market`;
    const setMeta = (name, content, property = false) => {
      if (!content) return;
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', p.seoDesc || p.lede);
    setMeta('og:title', p.seoTitle || p.title, true);
    setMeta('og:description', p.seoDesc || p.lede, true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', `https://aheadofmarket.com/work/${p.slug}`, true);
  }, [p]);

  if (!p || p.draft) {
    return (
      <div className="pp"><style>{CSS}</style>
        <div className="wrap" style={{ padding: '120px 28px', textAlign: 'center' }}>
          <h1 className="disp" style={{ fontSize: 48 }}>Coming soon<span className="dot" /></h1>
          <p style={{ marginTop: 16, color: '#6E6E66' }}>This project page is being written. <Link className="gold" to="/r5#work">See the rest of our work.</Link></p>
        </div>
      </div>
    );
  }

  const related = (p.related || []).map(bySlug).filter(Boolean);

  return (
    <div className="pp">
      <style>{CSS}</style>

      <nav className="nav"><div className="wrap row">
        <Link className="brand" to="/r5"><BrandMark kind="mono" className="mk mark" /><span className="wm">Ahead of Market</span></Link>
        <Link className="back" to="/r5#work">← All work</Link>
      </div></nav>

      <header className="hero">
        {p.heroVideoId && (<div className="heromedia"><LazyGumlet id={p.heroVideoId} eager className="vid" /></div>)}
        <div className="heroscrim" />
        <div className="wrap heroinner">
          <div className="chips">
            <span>{p.category}</span>
            {p.location && <span>{p.location}</span>}
            {p.year && <span>{p.year}</span>}
          </div>
          <h1 className="disp">{p.title}<span className="dot" /></h1>
          {p.lede && <p className="lede">{p.lede}</p>}
        </div>
      </header>

      <section className="body"><div className="wrap">
        {(p.sections || []).map((s, i) => (
          <div className="sec" key={i}>
            <h2 className="disp">{s.h}</h2>
            <p>{s.body}</p>
          </div>
        ))}

        {p.pull && (<div className="pull"><p className="disp">{p.pull}</p></div>)}

        {(p.films || []).length > 0 && (
          <div className="film">
            <div className="filmwrap">
              <iframe src={`https://play.gumlet.io/embed/${p.films[0]}?preload=true`} title={p.title} allow="autoplay; fullscreen; encrypted-media" allowFullScreen />
            </div>
          </div>
        )}
      </div></section>

      {(p.outcomes || []).length > 0 && (
        <section className="out"><div className="wrap">
          <span className="eyebrow">Where it ran</span>
          <h2 className="disp">What it became<span className="dot" /></h2>
          <div className="grid">
            {p.outcomes.map((o, i) => (
              <div className="o" key={i}><span className="n">{String(i + 1).padStart(2, '0')}</span><span className="t">{o}</span></div>
            ))}
          </div>
        </div></section>
      )}

      {related.length > 0 && (
        <section className="rel"><div className="wrap">
          <span className="eyebrow">More like this</span>
          <h2 className="disp">Related work<span className="dot" /></h2>
          <div className="grid">
            {related.map((r) => (
              <Link className="card" to={`/work/${r.slug}`} key={r.slug}>
                <div className="media">{r.heroVideoId && <LazyGumlet id={r.heroVideoId} className="vid" />}</div>
                <div className="meta">
                  <span className="c">{r.category}</span>
                  <h3>{r.title}</h3>
                  <span className="open">View project →</span>
                </div>
              </Link>
            ))}
          </div>
        </div></section>
      )}

      <section className="close"><div className="wrap">
        <h2 className="disp">Have a project like this<span className="dot" /></h2>
        <div className="row">
          <a className="btn gold" href="mailto:hello@aom-inhouse.com">Start a project ↗</a>
          <span className="note">Send a few files or book a call. We reply within 24 hours.</span>
        </div>
      </div></section>

      <footer className="foot"><div className="wrap row">
        <Link className="brand" to="/r5"><BrandMark kind="mono" className="mk mark" /><span className="wm">Ahead of Market</span></Link>
        <div className="fine">© 2026 Ahead of Market. A video and web studio in {p.location || 'Arizona'}.</div>
      </div></footer>
    </div>
  );
}

export { PROJECTS };
