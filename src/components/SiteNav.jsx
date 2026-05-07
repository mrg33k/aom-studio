import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Phone } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * SiteNav -- Superside-shaped, scroll-aware.
 * Cream over the hero, inverts to dark when the hero scrolls past.
 *
 * Props:
 *   openBrief - handler for the primary "Start a project" CTA
 */

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Work', href: '/#work' },
  { label: 'AI', href: '/ai' },
];

export default function SiteNav({ openBrief }) {
  const [inverted, setInverted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const location = useLocation();
  const showAiBadge = location.pathname === '/ai';
  const onHome = location.pathname === '/';

  useEffect(() => {
    if (!onHome) {
      setInverted(true);
      return;
    }
    const main = document.querySelector('main');
    const target = main || window;
    function update() {
      const hero = document.querySelector('[data-hero="true"]');
      if (!hero) { setInverted(true); return; }
      const heroBottom = hero.getBoundingClientRect().bottom;
      setInverted(heroBottom <= 60);
    }
    update();
    target.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      target.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [onHome, location.pathname]);

  const handleStartProject = () => {
    if (typeof openBrief === 'function') openBrief();
    else window.location.href = '/book';
  };

  return (
    <>
      <div
        className={`sticky top-0 z-[200] transition-colors duration-300 border-b ${
          inverted
            ? 'bg-aom-night border-aom-night-border'
            : 'bg-aom-cream border-aom-light-border'
        }`}
      >
        <nav className="max-w-[1400px] mx-auto px-5 md:px-12 py-[18px] flex items-center justify-between gap-8">
          {/* Logo */}
          <a
            href="/"
            aria-label="AOM home"
            className={`font-headline font-extrabold text-[22px] tracking-[-0.02em] inline-flex items-baseline gap-1 transition-colors ${
              inverted ? 'text-aom-cream' : 'text-aom-black'
            }`}
          >
            AOM
            <span className="inline-block w-[9px] h-[9px] rounded-full bg-aom-orange -translate-y-[1px]" />
          </a>

          {/* Primary links */}
          <div className="hidden md:flex flex-1 ml-4 gap-7 items-center">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative text-[13px] font-body font-medium tracking-[0.01em] py-1.5 transition-colors aom-nav-link ${
                  inverted ? 'text-aom-text-light' : 'text-aom-black'
                }`}
              >
                {link.label}
              </a>
            ))}
            {showAiBadge && (
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-md ml-1">
                AI
              </span>
            )}
          </div>

          {/* Secondary */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setPhoneOpen(true)}
              className={`text-[13px] font-body font-medium transition-colors ${
                inverted ? 'text-aom-text-muted hover:text-aom-orange' : 'text-aom-warm-gray hover:text-aom-orange'
              }`}
            >
              Talk to us
            </button>
            <button
              onClick={handleStartProject}
              className="aom-btn"
            >
              Start a project
            </button>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`w-11 h-11 flex items-center justify-center border ${
                inverted ? 'bg-white/5 border-white/10 text-aom-text-light' : 'bg-aom-cream-dark border-aom-light-border text-aom-black'
              }`}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </nav>
      </div>

      {/* Reusable nav-link underline + button styles */}
      <style>{`
        .aom-nav-link::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          height: 1px;
          width: 0;
          background: #E85D26;
          transition: width 0.3s cubic-bezier(.2,.8,.2,1);
        }
        .aom-nav-link:hover::after { width: 100%; }
        .aom-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: #E85D26;
          color: #0C0C0C;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.01em;
          border-radius: 999px;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        .aom-btn:hover { background: #D14E1C; transform: translateY(-1px); }
        .aom-btn--ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: transparent;
          color: #0A0A0A;
          font-family: 'Space Grotesk', system-ui, sans-serif;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.01em;
          border-radius: 999px;
          border: 1px solid #0A0A0A;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease, color 0.2s ease;
        }
        .aom-btn--ghost:hover { background: #0A0A0A; color: #FDF6EC; transform: translateY(-1px); }
      `}</style>

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
              className="bg-aom-night border border-aom-night-border rounded-xl p-8 max-w-sm w-full mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-headline font-extrabold uppercase tracking-[0.1em] text-aom-text-light">
                  Talk to us
                </h3>
                <button
                  onClick={() => setPhoneOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-aom-text-muted hover:text-aom-text-light transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <a
                  href="tel:6023732164"
                  className="flex items-center gap-3 p-4 rounded-lg border border-aom-night-border bg-white/[0.03] hover:border-aom-orange/40 hover:bg-white/[0.06] transition-all group"
                >
                  <Phone size={18} className="text-aom-orange" />
                  <div>
                    <p className="text-sm font-body font-bold text-aom-text-light group-hover:text-aom-orange transition-colors">(602) 373-2164</p>
                    <p className="text-xs text-aom-text-muted mt-0.5">Call or text</p>
                  </div>
                </a>
                <a
                  href="mailto:hello@aheadofmarket.com"
                  className="flex items-center gap-3 p-4 rounded-lg border border-aom-night-border bg-white/[0.03] hover:border-aom-orange/40 hover:bg-white/[0.06] transition-all group"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-aom-orange">
                    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                  <div>
                    <p className="text-sm font-body font-bold text-aom-text-light group-hover:text-aom-orange transition-colors">hello@aheadofmarket.com</p>
                    <p className="text-xs text-aom-text-muted mt-0.5">Email us</p>
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
            className="fixed inset-0 z-[300] bg-aom-night/[0.98] backdrop-blur-xl flex flex-col"
          >
            <div className="flex justify-between items-center px-5 py-4">
              <span className="text-2xl font-headline font-extrabold tracking-[-0.02em] text-aom-cream inline-flex items-baseline gap-1">
                AOM<span className="inline-block w-[9px] h-[9px] rounded-full bg-aom-orange -translate-y-[1px]" />
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-11 h-11 flex items-center justify-center text-aom-text-light"
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
                  className="text-3xl font-headline font-extrabold uppercase tracking-tight text-aom-text-light hover:text-aom-orange transition-colors min-h-[44px] flex items-center"
                >
                  {link.label}
                </a>
              ))}
              <div className="w-12 h-[1px] bg-white/10 my-4" />
              <button
                onClick={() => { setMobileMenuOpen(false); setPhoneOpen(true); }}
                className="text-lg font-body font-medium uppercase tracking-widest text-aom-text-muted hover:text-aom-text-light transition-colors"
              >
                Talk to us
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); handleStartProject(); }}
                className="aom-btn"
              >
                Start a project
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
