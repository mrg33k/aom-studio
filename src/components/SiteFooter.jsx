import React from 'react';

/**
 * Shared site footer component.
 *
 * Usage:
 *   <SiteFooter />                       // default compact footer
 *   <SiteFooter variant="compact" />     // same as default
 *   <SiteFooter variant="fixed" />       // fixed to bottom of viewport (for canvas/app pages)
 *
 * Props:
 *   variant - "compact" (default) or "fixed"
 */

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'The System', href: '/system' },
  { label: 'Skills', href: '/skills' },
  { label: 'Briefs', href: '/briefs' },
  { label: 'Book', href: '/book' },
];

export default function SiteFooter({ variant = 'compact' }) {
  const isFixed = variant === 'fixed';

  const footerClasses = isFixed
    ? 'fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A08]/90 backdrop-blur-md border-t border-white/[0.06]'
    : 'bg-[#0A0A08] border-t border-white/[0.06]';

  return (
    <footer className={`${footerClasses} py-6 px-6`}>
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <a
            href="/"
            className="font-headline text-base font-extrabold uppercase tracking-[-0.03em] text-[#F0ECE6] hover:text-[#E85D26] transition-colors"
          >
            AOM<span className="text-[#E85D26]">.</span>
          </a>
          <span className="hidden sm:inline text-white/10">|</span>
          <span className="font-body text-base text-[#8A847C]">
            Ahead of Market / Phoenix, AZ
          </span>
        </div>

        <div className="flex items-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-base text-[#8A847C] hover:text-[#F0ECE6] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      {!isFixed && (
        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-white/[0.04] text-center">
          <p className="font-mono text-xs text-[#8A847C]/60 uppercase tracking-[0.15em]">
            &copy; {new Date().getFullYear()} Ahead of Market (AOM)
          </p>
        </div>
      )}
    </footer>
  );
}
