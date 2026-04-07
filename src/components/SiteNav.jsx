import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';
import BriefModal from './BriefModal';

/**
 * SiteNav -- single source of truth for all page navigation.
 *
 * RULE: Every page uses <SiteNav />. No page builds its own nav.
 * If the nav needs to change, change it HERE and it updates everywhere.
 *
 * Props:
 *   transparent - if true, nav starts transparent and goes solid on scroll
 */

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/#work' },
  { label: 'AI', href: '/ai' },
];

export default function SiteNav({ transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const openBrief = () => setBriefOpen(true);

  useEffect(() => {
    if (!transparent) return;
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparent]);

  const isSolid = !transparent || scrolled;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 border-b ${
          isSolid
            ? 'bg-[#0A0A08]/95 backdrop-blur-md border-white/5'
            : 'bg-gradient-to-b from-black/40 to-transparent border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a
            href="/"
            className="text-2xl font-headline font-extrabold tracking-[-0.03em] text-[#F0ECE6] inline-flex items-center min-h-[44px] min-w-[44px]"
          >
            AOM<span className="text-[#E85D26]">.</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-body font-bold uppercase tracking-[0.15em] text-[#8A847C] hover:text-[#F0ECE6] transition-colors px-3 py-2"
              >
                {link.label}
              </a>
            ))}
            <button
              onClick={() => setPhoneOpen(true)}
              className="flex items-center gap-2 px-6 py-3 min-h-[44px] bg-white/5 text-[#8A847C] font-body font-bold text-base uppercase tracking-[0.15em] hover:text-[#F0ECE6] border border-white/10 hover:border-white/20 transition-all"
            >
              <Phone size={14} />
              Talk to Us
            </button>
            <button
              onClick={openBrief}
              className="px-8 py-3 min-h-[44px] bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-[0.15em] hover:bg-[#D14E1C] shadow-lg shadow-[#E85D26]/20 transition-all flex items-center"
            >
              Start a Brief
            </button>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={openBrief}
              className="px-5 py-3 min-h-[44px] bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-[0.15em] hover:bg-[#D14E1C] shadow-lg shadow-[#E85D26]/20 transition-all"
            >
              Brief
            </button>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/10 text-[#F0ECE6]"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Phone directory modal */}
      <AnimatePresence>
        {phoneOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setPhoneOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0A0A08] border border-white/10 rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-headline font-extrabold uppercase tracking-[0.1em] text-[#F0ECE6]">
                  Talk to Us
                </h3>
                <button
                  onClick={() => setPhoneOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <a
                  href="tel:6023732164"
                  className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/[0.03] hover:border-[#E85D26]/40 hover:bg-white/[0.06] transition-all group"
                >
                  <Phone size={18} className="text-[#E85D26]" />
                  <div>
                    <p className="text-sm font-body font-bold text-[#F0ECE6] group-hover:text-[#E85D26] transition-colors">(602) 373-2164</p>
                    <p className="text-xs text-[#8A847C] mt-0.5">Call or text</p>
                  </div>
                </a>
                <a
                  href="mailto:hello@aheadofmarket.com"
                  className="flex items-center gap-3 p-4 rounded-lg border border-white/10 bg-white/[0.03] hover:border-[#E85D26]/40 hover:bg-white/[0.06] transition-all group"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E85D26]">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  <div>
                    <p className="text-sm font-body font-bold text-[#F0ECE6] group-hover:text-[#E85D26] transition-colors">hello@aheadofmarket.com</p>
                    <p className="text-xs text-[#8A847C] mt-0.5">Email us</p>
                  </div>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#0A0A08]/98 backdrop-blur-xl flex flex-col"
          >
            <div className="flex justify-between items-center px-6 py-4">
              <span className="text-2xl font-headline font-extrabold tracking-[-0.03em] text-[#F0ECE6]">
                AOM<span className="text-[#E85D26]">.</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-11 h-11 flex items-center justify-center text-[#F0ECE6]"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex-1 flex flex-col items-center justify-center gap-8" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-3xl font-headline font-extrabold uppercase tracking-tight text-[#F0ECE6] hover:text-[#E85D26] transition-colors min-h-[44px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
              <div className="w-12 h-[1px] bg-white/10 my-4" />
              <button
                onClick={() => { setMobileMenuOpen(false); setPhoneOpen(true); }}
                className="text-lg font-headline font-bold uppercase tracking-widest text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
              >
                Talk to Us
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); openBrief(); }}
                className="px-12 py-4 bg-[#E85D26] text-white font-headline font-extrabold uppercase tracking-widest text-base hover:bg-[#D14E1C] transition-all shadow-lg shadow-[#E85D26]/20"
              >
                Start a Brief
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brief modal -- works on every page */}
      <BriefModal isOpen={briefOpen} onClose={() => setBriefOpen(false)} />
    </>
  );
}
