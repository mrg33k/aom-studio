import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu, X, ChevronDown,
  Sparkles, Clapperboard, Layout, Compass,
  Briefcase, Users, BookOpen, Building2,
  ArrowRight,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import CTAButton from './home/CTAButton';

/**
 * SiteNav -- Superside-precise nav with mega-menu hovers.
 * Logo left | inline links (multiple have dropdowns) | Sign in + CTA right.
 * Mobile: full-screen drawer with accordions.
 */

// ============ DROPDOWN CONTENT ============

const SERVICES_MENU = {
  columns: [
    {
      category: 'Brand', icon: Sparkles, accent: '#E85D26',
      items: [
        { label: 'Brand identity', meta: '14 days' },
        { label: 'Voice & messaging' },
        { label: 'Brand guidelines' },
        { label: 'Naming' },
      ],
    },
    {
      category: 'Motion', icon: Clapperboard, accent: '#C9A84C',
      items: [
        { label: 'Brand film', meta: '14 days' },
        { label: 'Documentary cut', meta: '21 days' },
        { label: 'Motion design' },
        { label: 'Editorial cut' },
      ],
    },
    {
      category: 'Web', icon: Layout, accent: '#7C9A72',
      items: [
        { label: 'Homepage rebuild', meta: '7 days' },
        { label: 'Custom build' },
        { label: 'Campaign sites' },
        { label: 'Product surfaces' },
      ],
    },
    {
      category: 'Story', icon: Compass, accent: '#E85D26',
      items: [
        { label: 'Strategy' },
        { label: 'Story direction' },
        { label: 'Content engine', meta: 'Monthly' },
        { label: 'Ongoing retainer', meta: 'Monthly' },
      ],
    },
  ],
  featured: {
    label: 'Recent · Project',
    title: 'Ambition\nMechanical',
    desc: 'A short brand video for an HVAC company. We filmed it during an emergency hospital install.',
    cta: 'See the project',
    href: '/#work',
    video: '698a58aefc23d3d76fa7cdd6',
    style: { glow: 'radial-gradient(120% 80% at 30% 20%, rgba(232,93,38,0.40), transparent 60%)' },
  },
};

const WORK_MENU = {
  columns: [
    {
      category: 'By medium', icon: Briefcase, accent: '#E85D26',
      items: [
        { label: 'Brand systems' },
        { label: 'Brand films' },
        { label: 'Documentaries' },
        { label: 'Web builds' },
        { label: 'Campaigns' },
      ],
    },
    {
      category: 'By industry', icon: Building2, accent: '#7C9A72',
      items: [
        { label: 'Hospitality' },
        { label: 'Construction' },
        { label: 'Tech & SaaS' },
        { label: 'Non-profit' },
        { label: 'Founders' },
      ],
    },
  ],
  featured: {
    label: 'Recent · Documentary',
    title: 'Tree Guardian\nUSA',
    desc: 'A disaster recovery business filmed inside an actual disaster. Three minutes, real crews.',
    cta: 'See the film',
    href: '/#work',
    video: '698a5e91873071aec5c9fc36',
    style: { glow: 'radial-gradient(120% 80% at 70% 70%, rgba(124,154,114,0.40), transparent 60%)' },
  },
};

const WHYUS_MENU = {
  columns: [
    {
      category: 'About', icon: Users, accent: '#E85D26',
      items: [
        { label: 'Our story', meta: 'A decade of work' },
        { label: 'The team' },
        { label: 'How we work', meta: 'Days, not months' },
        { label: 'Standards' },
        { label: 'Visit us' },
      ],
    },
  ],
  featured: {
    label: 'How we work',
    title: 'Days,\nnot months.',
    desc: 'A 35-second emergency-response sizzle, shot, cut, and shipped while the crew was still on the roof.',
    cta: 'See how',
    href: '/#team',
    video: '698a58aefc23d3d76fa7cdd6',
    style: { glow: 'radial-gradient(120% 80% at 50% 50%, rgba(232,93,38,0.30), transparent 60%)' },
  },
};

const RESOURCES_MENU = {
  columns: [
    {
      category: 'Read', icon: BookOpen, accent: '#E85D26',
      items: [
        { label: 'Field notes' },
        { label: 'Guides' },
        { label: 'Case studies' },
        { label: 'Industry insights' },
      ],
    },
    {
      category: 'Watch', icon: Clapperboard, accent: '#C9A84C',
      items: [
        { label: 'Video essays' },
        { label: 'Behind the work' },
        { label: 'Talks' },
      ],
    },
    {
      category: 'Tools', icon: Layout, accent: '#7C9A72',
      items: [
        { label: 'Brand brief template' },
        { label: 'Production calendar' },
        { label: 'Pricing primer' },
      ],
    },
  ],
  featured: {
    label: 'Latest · Field notes',
    title: 'Brief a brand in 30 minutes.',
    desc: 'The exact template we use with every new client. Two minutes, three core moves.',
    cta: 'Read it',
    href: '/#resources',
    video: '698a5aa5aec3d4e420c263c4',
    style: { glow: 'radial-gradient(120% 80% at 50% 30%, rgba(201,168,76,0.30), transparent 60%)' },
  },
};

const DROPDOWNS = {
  services: SERVICES_MENU,
  work: WORK_MENU,
  whyus: WHYUS_MENU,
  resources: RESOURCES_MENU,
};

const NAV_LINKS = [
  { label: 'What we make',   href: '/#services',  dropdown: 'services' },
  { label: 'Recent work',    href: '/#work',      dropdown: 'work' },
  { label: 'The team',       href: '/#team',      dropdown: 'whyus' },
  { label: 'Field notes',    href: '/#resources', dropdown: 'resources' },
  { label: 'Pricing',        href: '/#pricing' },
];

// ============ COMPONENT ============

export default function SiteNav({ transparent = false, onStartProject }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null);
  const closeTimerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!transparent) return;
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [transparent]);

  const isSolid = !transparent || scrolled;

  const handleEnter = (key) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpenDropdown(key);
  };
  const handleLeave = () => {
    closeTimerRef.current = setTimeout(() => setOpenDropdown(null), 180);
  };

  const navBg = `fixed top-0 left-0 right-0 z-[200] transition-all duration-300 border-b ${
    isSolid || openDropdown
      ? 'bg-[#0C0C0C]/95 backdrop-blur-md border-white/[0.08]'
      : 'bg-gradient-to-b from-black/50 to-transparent border-transparent'
  }`;

  const dropdown = openDropdown ? DROPDOWNS[openDropdown] : null;

  return (
    <>
      <nav className={navBg}>
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-4 flex items-center justify-between gap-8">
          <a
            href="/"
            title="AOM. A nimble creative team. Available anywhere."
            className="text-2xl font-syne font-extrabold tracking-[-0.03em] text-[#F0ECE6] inline-flex items-center min-h-[44px] flex-shrink-0"
          >
            AOM<span className="text-[#E85D26]">.</span>
          </a>

          <div className="hidden md:flex items-center gap-7 flex-1">
            {NAV_LINKS.map((link) => (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => link.dropdown && handleEnter(link.dropdown)}
                onMouseLeave={() => link.dropdown && handleLeave()}
              >
                <a
                  href={link.href}
                  className="text-[14.5px] font-body font-medium text-[#F0ECE6]/85 hover:text-[#F0ECE6] transition-colors py-2 whitespace-nowrap inline-flex items-center gap-1.5"
                >
                  {link.label}
                  {link.dropdown && (
                    <ChevronDown
                      size={13}
                      className={`transition-transform duration-200 ${openDropdown === link.dropdown ? 'rotate-180' : ''}`}
                    />
                  )}
                </a>
              </div>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-5 flex-shrink-0">
            <a
              href="#"
              title="Client portal coming soon"
              className="text-[14px] font-body font-medium text-[#8A847C] hover:text-[#F0ECE6] transition-colors whitespace-nowrap"
            >
              Client portal
            </a>
            <CTAButton size="sm" variant="06" onClick={() => onStartProject?.()}>Start a project</CTAButton>
          </div>

          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/10 text-[#F0ECE6]"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* MEGA-MENU */}
        <AnimatePresence>
          {dropdown && (
            <motion.div
              key={openDropdown}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              onMouseEnter={() => handleEnter(openDropdown)}
              onMouseLeave={handleLeave}
              className="absolute top-full left-0 right-0 bg-[#0C0C0C] border-b border-white/[0.08] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
            >
              <div className="max-w-[1440px] mx-auto px-6 md:px-12 py-12">
                <DropdownContent menu={dropdown} />
                <BottomBar />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-[#0C0C0C] flex flex-col"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.08]">
              <span className="text-2xl font-syne font-extrabold tracking-[-0.03em] text-[#F0ECE6]">
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

            <nav className="flex-1 overflow-y-auto px-6 py-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                if (!link.dropdown) {
                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-5 border-b border-white/[0.08] text-[#F0ECE6] font-headline text-3xl tracking-tight"
                    >
                      {link.label}
                    </a>
                  );
                }
                const isOpen = !!mobileOpen[link.dropdown];
                const menu = DROPDOWNS[link.dropdown];
                return (
                  <div key={link.href} className="border-b border-white/[0.08]">
                    <button
                      onClick={() => setMobileOpen({ ...mobileOpen, [link.dropdown]: !isOpen })}
                      className="w-full flex items-center justify-between py-5 text-[#F0ECE6] font-headline text-3xl tracking-tight"
                    >
                      <span>{link.label}</span>
                      <ChevronDown
                        size={22}
                        className={`text-[#8A847C] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#E85D26]' : ''}`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-4 space-y-5 pl-1">
                            {menu.columns.map((col) => (
                              <div key={col.category}>
                                <div className="flex items-center gap-2 mb-3">
                                  <col.icon size={13} style={{ color: col.accent }} />
                                  <h4 className="text-[13px] font-syne font-extrabold uppercase tracking-[0.04em] text-[#E85D26]">
                                    {col.category}
                                  </h4>
                                </div>
                                <ul className="space-y-2">
                                  {col.items.map((item) => (
                                    <li key={item.label}>
                                      <a
                                        href="#"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-baseline justify-between gap-3 text-[15px] font-body font-medium text-[#F0ECE6]/90 py-1.5"
                                      >
                                        <span>{item.label}</span>
                                        {item.meta && (
                                          <span className="text-[10px] font-mono text-[#8A847C] uppercase tracking-[0.22em]">
                                            {item.meta}
                                          </span>
                                        )}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              <a
                href="#"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-5 border-b border-white/[0.08] text-[#8A847C] font-body font-medium text-base"
              >
                Sign in
              </a>
            </nav>

            <div className="px-6 py-4 border-t border-white/[0.08]">
              <CTAButton size="md" variant="06" fullWidth onClick={() => { setMobileMenuOpen(false); onStartProject?.(); }}>Start a project</CTAButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============ DROPDOWN RENDERERS ============

function DropdownContent({ menu }) {
  // Layout: N columns + featured tile
  // N can be 1, 2, 3, or 4
  const colCount = menu.columns.length;
  // Use grid-template-columns explicitly (Tailwind cols + 1 featured wider)
  const gridStyle = {
    gridTemplateColumns: `repeat(${colCount}, 1fr) 1.4fr`,
    gap: colCount >= 3 ? '2.5rem' : '4rem',
  };
  return (
    <div className="grid" style={gridStyle}>
      {menu.columns.map((col) => (
        <div key={col.category}>
          <div className="flex items-center gap-2 mb-5">
            <col.icon size={14} style={{ color: col.accent }} />
            <h4 className="text-[14px] font-syne font-extrabold uppercase tracking-[0.04em] text-[#E85D26]">
              {col.category}
            </h4>
          </div>
          <ul className="space-y-3">
            {col.items.map((item) => (
              <li key={item.label}>
                <a
                  href="#"
                  className="group flex items-baseline justify-between gap-3 text-[14.5px] font-body font-medium text-[#F0ECE6]/90 hover:text-[#E85D26] transition-colors py-1"
                >
                  <span>{item.label}</span>
                  {item.meta && (
                    <span className="text-[10px] font-mono font-medium text-[#8A847C] uppercase tracking-[0.22em] group-hover:text-[#E85D26] transition-colors whitespace-nowrap">
                      {item.meta}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <FeaturedTile featured={menu.featured} />
    </div>
  );
}

function FeaturedTile({ featured }) {
  return (
    <a
      href={featured.href}
      className="group block relative overflow-hidden rounded border border-white/[0.08] hover:border-[#E85D26]/40 transition-colors min-h-[260px] bg-[#1a1a1a]"
    >
      {/* Background video (preferred) */}
      {featured.video && (
        <div className="absolute inset-0 overflow-hidden">
          <iframe
            src={`https://play.gumlet.io/embed/${featured.video}?autoplay=true&muted=true&loop=true&preload=true&controls=false&disable_player_controls=true`}
            className="absolute top-1/2 left-1/2 border-none transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            style={{
              width: '177.78%',
              height: '100%',
              minHeight: '177.78%',
              minWidth: '100%',
              transform: 'translate(-50%, -50%)',
              filter: 'grayscale(0.1) contrast(1.1)',
            }}
            allow="autoplay"
            tabIndex={-1}
          />
        </div>
      )}
      {/* Background image fallback */}
      {!featured.video && featured.image && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{ backgroundImage: `url(${featured.image})` }}
        />
      )}
      {/* Color glow tint */}
      {featured.style?.glow && (
        <div className="absolute inset-0 mix-blend-overlay opacity-90" style={{ background: featured.style.glow }} />
      )}
      {/* Bottom-up dark gradient for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
      {/* Diagonal texture */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent 0, transparent 12px, rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.04) 13px)',
        }}
      />
      {/* Content */}
      <div className="relative p-6 flex flex-col justify-between min-h-[260px]">
        <div className="text-[10px] font-mono font-medium uppercase tracking-[0.22em] text-[#E85D26]">
          {featured.label}
        </div>
        <div>
          <h5 className="font-syne font-extrabold text-[22px] leading-[1] text-[#F0ECE6] tracking-[-0.02em] whitespace-pre-line uppercase">
            {featured.title}
          </h5>
          <p className="text-[13px] font-body text-[#F0ECE6]/85 mt-2 max-w-[28ch]">
            {featured.desc}
          </p>
          <div className="flex items-center gap-2 mt-4 text-[12px] font-mono uppercase tracking-[0.18em] text-[#E85D26] group-hover:gap-3 transition-all">
            {featured.cta}
            <ArrowRight size={12} />
          </div>
        </div>
      </div>
    </a>
  );
}

function BottomBar() {
  return (
    <div className="mt-10 pt-6 border-t border-white/[0.08] flex items-center justify-between">
      <p className="text-[13px] font-body text-[#8A847C]">
        All scopes are productized. Real timelines. Real prices.
      </p>
      <a
        href="/#pricing"
        className="text-[13px] font-body font-semibold text-[#F0ECE6] hover:text-[#E85D26] transition-colors inline-flex items-center gap-2"
      >
        See full pricing
        <ArrowRight size={14} />
      </a>
    </div>
  );
}
