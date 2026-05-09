import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import CTAButton from './home/CTAButton';

/**
 * SiteNav -- single source of truth for all page navigation.
 *
 * RULE: Every page uses <SiteNav />. No page builds its own nav.
 * If the nav needs to change, change it HERE and it updates everywhere.
 *
 * Restyled R4: dark gloss bar, lowercase font-body links, orange "Start a project" pill.
 * Keeps existing NAV_LINKS, the AOM. logo, and the Talk to Us phone modal so no
 * other pages break — only the visual treatment moves to the /r4 family.
 *
 * Props:
 *   transparent  - if true, nav starts transparent and goes solid on scroll
 *   onStartProject - optional callback for the orange CTA pill (falls back to /book)
 */

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/#work' },
  { label: 'AI', href: '/ai' },
];

export default function SiteNav({ transparent = false, onStartProject }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const location = useLocation();
  const showAiBadge = location.pathname === '/ai';

  useEffect(() => {
    if (!transparent) return;
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparent]);

  const isSolid = !transparent || scrolled;

  const handleStartProject = () => {
    if (onStartProject) onStartProject();
    else window.location.href = '/book';
  };

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[200] transition-all duration-300 border-b ${
          isSolid
            ? 'bg-[#0C0C0C]/95 backdrop-blur-md border-white/[0.08]'
            : 'bg-gradient-to-b from-black/50 to-transparent border-transparent'
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-8">
          {/* Logo — unchanged per brand rule */}
          <a
            href="/"
            title="Ahead of Market - We Make Companies Impossible to Ignore"
            className="text-2xl font-headline font-extrabold tracking-[-0.03em] text-[#F0ECE6] inline-flex items-center min-h-[44px] flex-shrink-0"
          >
            AOM<span className="text-[#E85D26]">.</span>
          </a>

          {/* Desktop links — R4 styling, original NAV_LINKS preserved */}
          <div className="hidden md:flex items-center gap-7 flex-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[14.5px] font-body font-medium text-[#F0ECE6]/85 hover:text-[#F0ECE6] transition-colors py-2 whitespace-nowrap"
              >
                {link.label}
              </a>
            ))}
            {showAiBadge && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-mono font-semibold">
                AI
              </span>
            )}
          </div>

          {/* Desktop right — Talk to us text link + Start a project pill */}
          <div className="hidden md:flex items-center gap-5 flex-shrink-0">
            <button
              onClick={() => setPhoneOpen(true)}
              className="text-[14px] font-body font-medium text-[#8A847C] hover:text-[#F0ECE6] transition-colors whitespace-nowrap inline-flex items-center gap-2"
            >
              <Phone size={13} /> Talk to us
            </button>
            <CTAButton size="sm" variant="06" onClick={handleStartProject}>Start a project</CTAButton>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/10 text-[#F0ECE6] rounded-full"
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
              onClick={(e) => e.stopPropagation()}
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
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
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
            className="fixed inset-0 z-[300] bg-[#0C0C0C]/98 backdrop-blur-xl flex flex-col"
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
                  className="text-3xl font-display-serif text-[#F0ECE6] hover:text-[#E85D26] transition-colors min-h-[44px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
              <div className="w-12 h-[1px] bg-white/10 my-4" />
              <button
                onClick={() => { setMobileMenuOpen(false); setPhoneOpen(true); }}
                className="text-base font-body font-medium text-[#8A847C] hover:text-[#F0ECE6] transition-colors inline-flex items-center gap-2"
              >
                <Phone size={14} /> Talk to us
              </button>
              <CTAButton size="md" variant="06" onClick={() => { setMobileMenuOpen(false); handleStartProject(); }}>Start a project</CTAButton>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
