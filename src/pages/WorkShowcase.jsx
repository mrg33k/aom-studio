import React, { useEffect, useState, useCallback } from 'react';

/**
 * WorkShowcase (/showcase) — data-driven video portfolio.
 *
 * Renders the curated set from public/video-review/media-plan.json, using the
 * covers + order the user picked in the Arrange tool (arrange.json). Single
 * source of truth: edit the curation, the site updates. v4 brand language:
 * obsidian ground, gold accent, Inter Tight display, Space Grotesk UI.
 */

const COL = '697678222b8b17fbb707acef';
const embed = (id) => `https://play.gumlet.io/embed/${id}?preload=false`;
const coverIdxFromField = (c) => {
  const m = (c || '').match(/-(\d+)\.jpg/);
  return m ? +m[1] : 1;
};

export default function WorkShowcase() {
  const [plan, setPlan] = useState(null);
  const [arr, setArr] = useState({ order: {}, cover: {} });
  const [playing, setPlaying] = useState(null); // { id, portrait, title }

  useEffect(() => {
    Promise.all([
      fetch('/video-review/media-plan.json').then((r) => r.json()),
      fetch('/video-review/arrange.json').then((r) => r.json()).catch(() => ({})),
    ]).then(([p, a]) => {
      setPlan(p);
      setArr({ order: a.order || {}, cover: a.cover || {} });
    });
  }, []);

  const coverUrl = useCallback(
    (v) => {
      const idx = arr.cover[v.id] || coverIdxFromField(v.cover);
      return `/video-review/covers/${v.id}-${idx}.jpg`;
    },
    [arr]
  );

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setPlaying(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!plan) {
    return (
      <div className="ws-root ws-loading">
        <StyleTag />
        <div className="ws-loaddot" />
      </div>
    );
  }

  const sections = plan.sections.filter((s) => s.videos && s.videos.length);
  const total = sections.reduce((n, s) => n + s.videos.length, 0);
  const featured = (plan.featured || []).filter((v) => v.gumlet).slice(0, 6);

  const orderedVideos = (sec) => {
    const byId = {};
    sec.videos.forEach((v) => (byId[v.id] = v));
    const ids = arr.order[sec.section] || sec.videos.map((v) => v.id);
    const out = ids.map((id) => byId[id]).filter(Boolean);
    sec.videos.forEach((v) => !ids.includes(v.id) && out.push(v));
    return out;
  };

  const Card = ({ v }) => {
    const portrait = v.aspect === 'vertical';
    const gid = v.gumlet || (v.source === 'site' ? v.id : null);
    return (
      <button
        className={`ws-card ${portrait ? 'is-portrait' : ''}`}
        onClick={() => gid && setPlaying({ id: gid, portrait, title: v.title })}
        disabled={!gid}
      >
        <span className="ws-card-media">
          <img loading="lazy" src={coverUrl(v)} alt={v.title} />
          <span className="ws-card-play" aria-hidden>▶</span>
        </span>
        <span className="ws-card-meta">
          <span className="ws-card-title">{v.title}</span>
          {v.client && <span className="ws-card-client">{v.client}</span>}
        </span>
      </button>
    );
  };

  return (
    <div className="ws-root">
      <StyleTag />

      <header className="ws-head">
        <div className="ws-kicker"><span className="ws-sq" /> AOM · Selected Work</div>
        <h1 className="ws-h1">The films<br />we&rsquo;ve made.</h1>
        <p className="ws-sub">{total} finished pieces for real clients since 2020. Tap any film to play.</p>
      </header>

      {featured.length > 0 && (
        <section className="ws-featured">
          {featured.map((v) => {
            const gid = v.gumlet;
            return (
              <button key={v.id} className="ws-feat" onClick={() => setPlaying({ id: gid, portrait: v.aspect === 'vertical', title: v.title })}>
                <img loading="lazy" src={coverUrl(v)} alt={v.title} />
                <span className="ws-feat-grad" />
                <span className="ws-feat-meta">
                  <span className="ws-feat-title">{v.title}</span>
                  <span className="ws-feat-client">{v.client}</span>
                </span>
                <span className="ws-card-play" aria-hidden>▶</span>
              </button>
            );
          })}
        </section>
      )}

      {sections.map((sec) => {
        const vids = orderedVideos(sec);
        const mostlyPortrait = vids.filter((v) => v.aspect === 'vertical').length > vids.length / 2;
        return (
          <section className="ws-section" key={sec.section}>
            <h2 className="ws-h2"><span className="ws-sq" />{sec.section}<span className="ws-count">{vids.length}</span></h2>
            <div className={`ws-grid ${mostlyPortrait ? 'is-vert' : ''}`}>
              {vids.map((v) => <Card key={v.id} v={v} />)}
            </div>
          </section>
        );
      })}

      <footer className="ws-foot">
        <span className="ws-sq" /> Ahead of Market — camera &amp; web for people who do real work.
      </footer>

      {playing && (
        <div className="ws-modal" onClick={() => setPlaying(null)}>
          <button className="ws-modal-x" onClick={() => setPlaying(null)} aria-label="Close">×</button>
          <div className={`ws-modal-frame ${playing.portrait ? 'is-portrait' : ''}`} onClick={(e) => e.stopPropagation()}>
            <iframe title={playing.title} src={embed(playing.id)} allow="autoplay; fullscreen" allowFullScreen />
          </div>
        </div>
      )}
    </div>
  );
}

function StyleTag() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;800&family=Space+Grotesk:wght@400;500;700&display=swap');
.ws-root{--bg:#060606;--ink:#F6F6F4;--dim:#B7B6B0;--gold:#C4A46A;--gold2:#A8884C;--panel:#0C0C0C;--line:rgba(246,246,244,.10);
  background:var(--bg);color:var(--ink);min-height:100vh;font-family:'Space Grotesk',system-ui,Arial,sans-serif;-webkit-font-smoothing:antialiased;padding-bottom:8vh}
.ws-root *{box-sizing:border-box}
.ws-loading{display:grid;place-items:center}
.ws-loaddot{width:12px;height:12px;background:var(--gold);animation:wsp 1s infinite alternate}
@keyframes wsp{to{opacity:.25;transform:scale(.7)}}
.ws-sq{display:inline-block;width:.5em;height:.5em;background:var(--gold);margin-right:.55em;vertical-align:middle}
.ws-head{padding:clamp(4rem,11vh,9rem) var(--gx,clamp(1.25rem,5vw,4rem)) clamp(2rem,5vh,4rem)}
.ws-kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--dim);font-weight:600}
.ws-h1{font-family:'Inter Tight',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.03em;line-height:.9;
  font-size:clamp(2.6rem,8vw,6.5rem);margin:.35em 0 .3em}
.ws-sub{color:var(--dim);font-size:clamp(1rem,1.5vw,1.2rem);max-width:36ch}
.ws-featured{display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(300px,32vw,460px),1fr));gap:14px;
  padding:0 var(--gx,clamp(1.25rem,5vw,4rem)) clamp(2rem,6vh,4rem)}
.ws-feat{position:relative;aspect-ratio:16/9;border:1px solid var(--line);border-radius:0;overflow:hidden;cursor:pointer;background:#111;padding:0}
.ws-feat img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(.05) contrast(1.05);transition:transform .8s cubic-bezier(.16,1,.3,1)}
.ws-feat:hover img{transform:scale(1.05)}
.ws-feat-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(6,6,6,.85) 0%,rgba(6,6,6,.05) 55%)}
.ws-feat-meta{position:absolute;left:16px;bottom:14px;right:16px;text-align:left;display:flex;flex-direction:column;gap:2px}
.ws-feat-title{font-family:'Inter Tight',sans-serif;font-weight:800;font-size:clamp(1.05rem,1.6vw,1.45rem);letter-spacing:-.02em;color:var(--ink)}
.ws-feat-client{font-size:12px;color:var(--gold);text-transform:uppercase;letter-spacing:.08em;font-weight:600}
.ws-section{padding:0 var(--gx,clamp(1.25rem,5vw,4rem));margin:0 0 clamp(2.5rem,7vh,5rem)}
.ws-h2{font-family:'Inter Tight',sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:-.01em;font-size:clamp(1.1rem,2vw,1.6rem);
  color:var(--ink);border-bottom:1px solid var(--line);padding-bottom:12px;margin:0 0 20px;display:flex;align-items:center}
.ws-count{margin-left:auto;color:var(--dim);font-size:13px;font-weight:500;font-family:'Space Grotesk'}
.ws-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(clamp(260px,24vw,360px),1fr));gap:14px}
.ws-grid.is-vert{grid-template-columns:repeat(auto-fill,minmax(clamp(160px,15vw,220px),1fr))}
.ws-card{display:flex;flex-direction:column;gap:10px;background:none;border:0;padding:0;cursor:pointer;text-align:left;color:inherit}
.ws-card:disabled{cursor:default;opacity:.55}
.ws-card-media{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid var(--line);background:#111;display:block}
.ws-card.is-portrait .ws-card-media{aspect-ratio:9/16}
.ws-card-media img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(.05) contrast(1.05);transition:transform .8s cubic-bezier(.16,1,.3,1)}
.ws-card:hover .ws-card-media img{transform:scale(1.06)}
.ws-card-play,.ws-feat .ws-card-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:52px;height:52px;border-radius:999px;
  background:rgba(6,6,6,.55);border:1px solid rgba(246,246,244,.35);color:var(--ink);display:grid;place-items:center;font-size:15px;
  opacity:0;transition:opacity .3s,background .3s;backdrop-filter:blur(2px)}
.ws-card:hover .ws-card-play,.ws-feat:hover .ws-card-play{opacity:1}
.ws-card:hover .ws-card-play{background:var(--gold);color:#060606;border-color:var(--gold)}
.ws-card-meta{display:flex;flex-direction:column;gap:1px}
.ws-card-title{font-family:'Inter Tight',sans-serif;font-weight:600;font-size:15px;letter-spacing:-.01em;line-height:1.15}
.ws-card-client{font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.ws-foot{padding:clamp(2rem,6vh,4rem) var(--gx,clamp(1.25rem,5vw,4rem));border-top:1px solid var(--line);color:var(--dim);font-size:13px;margin-top:2rem}
.ws-modal{position:fixed;inset:0;z-index:100;background:rgba(3,3,3,.9);backdrop-filter:blur(6px);display:grid;place-items:center;padding:4vh 4vw}
.ws-modal-x{position:absolute;top:18px;right:22px;width:44px;height:44px;border-radius:999px;background:rgba(20,20,18,.8);border:1px solid var(--line);
  color:var(--ink);font-size:24px;line-height:1;cursor:pointer}
.ws-modal-x:hover{border-color:var(--gold);color:var(--gold)}
.ws-modal-frame{width:min(92vw,1200px);aspect-ratio:16/9;background:#000;border:1px solid var(--line)}
.ws-modal-frame.is-portrait{width:auto;height:min(86vh,900px);aspect-ratio:9/16}
.ws-modal-frame iframe{width:100%;height:100%;border:0}
@media(max-width:640px){.ws-featured{grid-template-columns:1fr}}
    `}</style>
  );
}
