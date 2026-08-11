import React, { useState, useEffect } from 'react';
import BrandMark from '../components/home/BrandMark';
import BriefModal from '../components/BriefModal';
import { C, F, T, LS, SP, MAXW, GUTTER } from '../components/home2026/tokens';
import { NAV } from '../components/home2026/copy';

import S1Hero from '../components/home2026/S1Hero';
import S2TradesBand from '../components/home2026/S2TradesBand';
import S3HowItRuns from '../components/home2026/S3HowItRuns';
import S4Offer from '../components/home2026/S4Offer';
import S5BillboardBand from '../components/home2026/S5BillboardBand';
import S6Proof from '../components/home2026/S6Proof';
import S7Math from '../components/home2026/S7Math';
import S8Questions from '../components/home2026/S8Questions';
import S9RangeBand from '../components/home2026/S9RangeBand';

// aheadofmarket.com home page, 2026 construction redesign.
// Mission: aheadofmarket.com:home. Copy is frozen in components/home2026/copy.js.
// Section ORDER is a client decision, not a default: the proof sits between the offer and the
// math so the reader sees the result, then sees what getting that result himself would cost.

// Every nav destination below resolves. A nav item with nowhere to go is a click error, which
// is the exact failure this build was told to avoid. FILM has no page yet, so it lands on the
// range band that names the film work rather than 404ing.
const NAV_TARGETS = {
  'WORK': { href: '/work/construction' },
  'WHAT WE DO': { hash: '#how-it-runs' },
  'CASE STUDIES': { href: '/work/ambition-mechanical' },
  'FILM': { hash: '#the-range' },
  'CONTACT': { modal: true },
};

function Header({ onOpenBrief }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const itemStyle = {
    fontFamily: F.mono,
    fontSize: T.lbl,
    letterSpacing: LS.label,
    textTransform: 'uppercase',
    color: C.onInk,
    background: 'none',
    border: 'none',
    padding: `${SP[2]}px 0`,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  };

  const renderItem = (label) => {
    const t = NAV_TARGETS[label];
    if (t.modal) {
      return (
        <button key={label} type="button" style={{ ...itemStyle, color: C.bronze }}
          onClick={() => { setMenuOpen(false); onOpenBrief(); }}>{label}</button>
      );
    }
    return (
      <a key={label} href={t.href || t.hash} style={itemStyle}
        onClick={() => setMenuOpen(false)}>{label}</a>
    );
  };

  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60,
        background: scrolled ? 'rgba(0,0,0,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.ruleOnInk}` : '1px solid transparent',
        transition: 'background 240ms ease, border-color 240ms ease',
      }}
    >
      <style>{`
        .aomh-nav{display:flex;gap:${SP[7]}px;align-items:center}
        .aomh-burger{display:none}
        @media (max-width:900px){
          .aomh-nav{display:${'none'}}
          .aomh-burger{display:inline-block}
          .aomh-nav.open{display:flex;position:fixed;inset:0;background:${C.ink};
            flex-direction:column;justify-content:center;align-items:center;gap:${SP[7]}px;z-index:70}
        }
      `}</style>
      <div style={{
        maxWidth: MAXW, margin: '0 auto', padding: `${SP[4]}px ${GUTTER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SP[6],
      }}>
        <a href="/" aria-label="Ahead of Market" style={{ display: 'flex', alignItems: 'center', gap: SP[3], textDecoration: 'none' }}>
          <BrandMark kind="mono" color={C.onInk} style={{ width: 30, height: 30 }} />
          <span style={{
            fontFamily: F.mono, fontSize: T.lbl, letterSpacing: LS.label,
            color: C.onInkMute, textTransform: 'uppercase',
          }}>Ahead of Market</span>
        </a>

        <nav className={`aomh-nav${menuOpen ? ' open' : ''}`}>
          {NAV.map(renderItem)}
          {menuOpen && (
            <button type="button" onClick={() => setMenuOpen(false)}
              style={{ ...itemStyle, color: C.onInkMute, marginTop: SP[6] }}>CLOSE</button>
          )}
        </nav>

        <button type="button" className="aomh-burger" aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          style={{ ...itemStyle, color: C.bronze }}>MENU</button>
      </div>
    </header>
  );
}

function Footer({ onOpenBrief }) {
  return (
    <footer style={{ background: C.ink, color: C.onInkMute, padding: `${SP[9]}px ${GUTTER}` }}>
      <div style={{
        maxWidth: MAXW, margin: '0 auto', display: 'flex', flexWrap: 'wrap',
        gap: SP[6], alignItems: 'center', justifyContent: 'space-between',
        borderTop: `1px solid ${C.ruleOnInk}`, paddingTop: SP[7],
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SP[3] }}>
          <BrandMark kind="mono" color={C.onInk} style={{ width: 26, height: 26 }} />
          <span style={{ fontFamily: F.mono, fontSize: T.lbl, letterSpacing: LS.label, textTransform: 'uppercase' }}>
            Ahead of Market — Phoenix, Arizona
          </span>
        </div>
        <button type="button" onClick={onOpenBrief} style={{
          fontFamily: F.mono, fontSize: T.lbl, letterSpacing: LS.label, textTransform: 'uppercase',
          color: C.bronze, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
        }}>Start a brief</button>
      </div>
    </footer>
  );
}

export default function HomeAOM2026() {
  const [briefOpen, setBriefOpen] = useState(false);
  const onOpenBrief = () => setBriefOpen(true);

  useEffect(() => {
    document.title = 'Ahead of Market — the marketing department for companies that don’t have one';
    const desc = 'We photograph your jobs, build the site, and run the ads. One department, one monthly fee, for contractors in Phoenix, Arizona.';
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', desc);
  }, []);

  return (
    <div style={{ background: C.ink, minHeight: '100vh', overflowX: 'hidden' }}>
      <Header onOpenBrief={onOpenBrief} />
      <main>
        <div id="hero"><S1Hero onOpenBrief={onOpenBrief} /></div>
        <div id="trades"><S2TradesBand onOpenBrief={onOpenBrief} /></div>
        <div id="how-it-runs"><S3HowItRuns onOpenBrief={onOpenBrief} /></div>
        <div id="the-offer"><S4Offer onOpenBrief={onOpenBrief} /></div>
        <div id="billboard"><S5BillboardBand onOpenBrief={onOpenBrief} /></div>
        <div id="the-proof"><S6Proof onOpenBrief={onOpenBrief} /></div>
        <div id="the-math"><S7Math onOpenBrief={onOpenBrief} /></div>
        <div id="the-questions"><S8Questions onOpenBrief={onOpenBrief} /></div>
        <div id="the-range"><S9RangeBand onOpenBrief={onOpenBrief} /></div>
      </main>
      <Footer onOpenBrief={onOpenBrief} />
      <BriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
    </div>
  );
}
