import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { NAV } from './home/contentR38';

/**
 * SiteNavR38 — the SiteNavR4 mega-menu pattern reskinned to the console system.
 * Light world: transparent over the paper hero, solidifies to blurred paper on
 * scroll. Carbon ink, mono labels, safety-orange pill CTA.
 */

export default function SiteNavR38({ onStartProject }) {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(null);        // desktop dropdown key
  const [mobileNav, setMobileNav] = useState(false);
  const [mobileOpen, setMobileOpen] = useState({});
  const closeTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const enter = (key) => { clearTimeout(closeTimer.current); setOpen(key); };
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(null), 140); };

  const isSolid = solid || open !== null || mobileNav;

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-[100] transition-colors duration-300 border-b ${
        isSolid ? 'bg-[#F5F3EE]/85 backdrop-blur-xl border-[#0A0A08]/10' : 'bg-transparent border-transparent'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between gap-8">
        <a href="/" className="font-mono text-[15px] font-medium uppercase tracking-[0.22em] text-[#0A0A08] no-underline whitespace-nowrap">
          {NAV.brand}
        </a>

        {/* desktop links */}
        <div className="hidden lg:flex items-center gap-9">
          {NAV.menus.map((m) => (
            <div key={m.label} className="relative" onMouseEnter={() => enter(m.label)} onMouseLeave={leave}>
              <button
                className={`font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#0A0A08] inline-flex items-center gap-1.5 py-6 border-b-2 transition-colors ${
                  open === m.label ? 'border-[#F04404]' : 'border-transparent'
                }`}
              >
                {m.label}
                <ChevronDown size={11} className={`transition-transform duration-200 ${open === m.label ? 'rotate-180' : ''}`} />
              </button>

              {open === m.label && (
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 min-w-[460px] bg-[#F5F3EE] border border-[#0A0A08]/10 shadow-[0_24px_48px_rgba(10,10,8,0.10)] grid grid-cols-2"
                  onMouseEnter={() => enter(m.label)}
                  onMouseLeave={leave}
                >
                  {m.cols.map((col, ci) => (
                    <div key={ci} className={`p-8 flex flex-col gap-4 ${ci > 0 ? 'border-l border-[#0A0A08]/10' : ''}`}>
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#C43800]">{col.kick}</p>
                      {col.links.map((l) => (
                        <a key={l.t} href={l.href} onClick={() => setOpen(null)} className="group block no-underline">
                          <p className="font-hanken text-[15px] font-semibold text-[#0A0A08] group-hover:text-[#C43800] transition-colors">{l.t}</p>
                          <p className="font-hanken text-[15px] text-[#0A0A08]/55 mt-0.5">{l.s}</p>
                        </a>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {NAV.flat.map((l) => (
            <a key={l.label} href={l.href} className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[#0A0A08] no-underline py-6 border-b-2 border-transparent hover:border-[#F04404] transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => onStartProject?.()}
            className="hidden sm:inline-block font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#0A0A08] rounded-full px-7 py-3.5 transition-transform duration-200 hover:scale-[1.04]"
          >
            {NAV.cta}
          </button>
          <button className="lg:hidden text-[#0A0A08] p-2" onClick={() => setMobileNav(!mobileNav)} aria-label="Menu">
            {mobileNav ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* mobile panel */}
      {mobileNav && (
        <div className="lg:hidden bg-[#F5F3EE] border-t border-[#0A0A08]/10 px-6 pb-8 max-h-[calc(100vh-72px)] overflow-y-auto">
          {NAV.menus.map((m) => {
            const openM = !!mobileOpen[m.label];
            return (
              <div key={m.label} className="border-b border-[#0A0A08]/10">
                <button
                  onClick={() => setMobileOpen({ ...mobileOpen, [m.label]: !openM })}
                  className="w-full flex items-center justify-between py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A0A08]"
                >
                  {m.label}
                  <ChevronDown size={13} className={`transition-transform ${openM ? 'rotate-180' : ''}`} />
                </button>
                {openM && (
                  <div className="pb-4 flex flex-col gap-3">
                    {m.cols.flatMap((c) => c.links).map((l) => (
                      <a key={l.t} href={l.href} onClick={() => setMobileNav(false)} className="no-underline">
                        <p className="font-hanken text-[15px] font-semibold text-[#0A0A08]">{l.t}</p>
                        <p className="font-hanken text-[15px] text-[#0A0A08]/55">{l.s}</p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {NAV.flat.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMobileNav(false)} className="block py-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[#0A0A08] no-underline border-b border-[#0A0A08]/10">
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { setMobileNav(false); onStartProject?.(); }}
            className="mt-6 w-full font-mono text-[11px] font-medium uppercase tracking-[0.22em] bg-[#F04404] text-[#0A0A08] rounded-full px-7 py-4"
          >
            {NAV.cta}
          </button>
        </div>
      )}
    </nav>
  );
}
