import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';

// Shared "More from AOM" footer for the /services/* family. One source of truth
// so the four pages stay consistent. Mission: aheadofmarket.com:home (R20.7).
// `current` is the current page's href, filtered out of the sibling list.
// NOTE: Home links to /r6 (the preview homepage). Retarget to / when Patrik
// promotes the reel to the live homepage.

const ALL = [
  { t: 'Brand film', href: '/services/brand-film' },
  { t: 'Website design & build', href: '/services/web-build' },
  { t: 'Strategy & story', href: '/services/strategy' },
  { t: 'Documentary', href: '/services/documentary' },
];

const CSS = `
.svf { background:#060606; color:#F6F6F4; border-top:1px solid rgba(196,164,106,.16); padding:clamp(2.5rem,6vw,4.5rem) clamp(1.25rem,4vw,3.5rem) clamp(3rem,7vw,5rem); font-family:'Inter',system-ui,Helvetica,Arial,sans-serif; }
.svf-kick { font-size:.66rem; font-weight:600; letter-spacing:.24em; text-transform:uppercase; color:#C4A46A; margin-bottom:1.4rem; }
.svf-row { display:flex; flex-wrap:wrap; gap:0; }
.svf-a { display:flex; align-items:center; gap:.5rem; padding:.85rem 0; margin-right:2.4rem; font-family:'Inter Tight','Inter',system-ui,sans-serif; font-weight:800; text-transform:uppercase; font-size:clamp(1.1rem,2.4vw,1.6rem); letter-spacing:-.01em; color:#F6F6F4; text-decoration:none; transition:color .15s; }
.svf-a:hover { color:#C4A46A; }
.svf-a .arw { font-size:.7em; opacity:.7; }
.svf-a.home { color:#C4A46A; }
.svf-a.home .mk { width:20px; height:20px; display:inline-block; color:#C4A46A; }
.svf-foot { display:flex; flex-wrap:wrap; gap:1.4rem; align-items:baseline; margin-top:2.2rem; padding-top:1.6rem; border-top:1px solid rgba(255,255,255,.1); font-size:.8rem; color:rgba(246,246,244,.66); }
.svf-foot a, .svf-foot button { padding:0; border:0; color:rgba(246,246,244,.66); background:none; font:inherit; text-decoration:none; cursor:pointer; transition:color .15s; }
.svf-foot a:hover, .svf-foot button:hover { color:#C4A46A; }
.svf-foot .cr { margin-left:auto; font-size:.64rem; letter-spacing:.14em; text-transform:uppercase; color:rgba(246,246,244,.44); }
@media(max-width:560px){ .svf-foot .cr { margin-left:0; width:100%; } }
`;

export default function ServiceFooter({ current }) {
  const [briefModalOpen, setBriefModalOpen] = useState(false);
  const others = ALL.filter(s => s.href !== current);
  return (
    <>
    <footer className="svf">
      <style>{CSS}</style>
      <div className="svf-kick">More from AOM</div>
      <div className="svf-row">
        <a className="svf-a home" href="/">
          <BrandMark kind="mono" className="mk" /> Home
        </a>
        {others.map(s => (
          <a key={s.href} className="svf-a" href={s.href}>
            {s.t} <span className="arw">↗</span>
          </a>
        ))}
      </div>
      <div className="svf-foot">
        <button type="button" onClick={() => setBriefModalOpen(true)}>hello@aheadofmarket.com</button>
        <a href="tel:+16023732164">602 373 2164</a>
        <span>We reply within 24 hours</span>
        <span className="cr">© 2026 Ahead of Market</span>
      </div>
    </footer>
    {typeof document !== 'undefined' && createPortal(
      <BriefModal isOpen={briefModalOpen} onClose={() => setBriefModalOpen(false)} />,
      document.body
    )}
    </>
  );
}
