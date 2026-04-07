import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';

/**
 * Shared site navigation component.
 *
 * Usage:
 *   <SiteNav />                          // default minimal nav
 *   <SiteNav variant="minimal" />        // same as default
 *   <SiteNav transparent />              // starts transparent, goes solid on scroll
 *
 * Props:
 *   variant   - "minimal" (default). Logo + links + CTA.
 *   transparent - if true, nav starts transparent and becomes solid after 80px scroll
 */

const NAV_LINKS = [
  { label: 'Work', href: '/case-study' },
  { label: 'Book a Call', href: '/book' },
];

export default function SiteNav({ variant = 'minimal', transparent = false }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <a
              href="/"
              className="text-base font-body font-bold uppercase tracking-[0.15em] text-[#8A847C] hover:text-[#F0ECE6] transition-colors px-3 py-2"
            >
              Home
            </a>
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-body font-bold uppercase tracking-[0.15em] text-[#8A847C] hover:text-[#F0ECE6] transition-colors px-3 py-2"
              >
                {link.label}
              </a>
            ))}
            <a
              href="tel:6023732164"
              className="flex items-center gap-2 px-6 py-3 min-h-[44px] bg-white/5 text-[#8A847C] font-body font-bold text-base uppercase tracking-[0.15em] hover:text-[#F0ECE6] border border-white/10 hover:border-white/20 transition-all"
            >
              <Phone size={14} />
              Talk to Us
            </a>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <a
              href="/book"
              className="px-5 py-3 min-h-[44px] bg-[#E85D26] text-white font-headline font-extrabold text-base uppercase tracking-[0.15em] hover:bg-[#D14E1C] shadow-lg shadow-[#E85D26]/20 transition-all"
            >
              Call
            </a>
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
              <a
                href="/"
                className="text-3xl font-headline font-extrabold uppercase tracking-tight text-[#F0ECE6] hover:text-[#E85D26] transition-colors min-h-[44px] flex items-center"
              >
                Home
              </a>
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
              <a
                href="tel:6023732164"
                className="text-lg font-headline font-bold uppercase tracking-widest text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
              >
                (602) 373-2164
              </a>
              <a
                href="/book"
                className="px-12 py-4 bg-[#E85D26] text-white font-headline font-extrabold uppercase tracking-widest text-base hover:bg-[#D14E1C] transition-all shadow-lg shadow-[#E85D26]/20"
              >
                Book a Call
              </a>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
