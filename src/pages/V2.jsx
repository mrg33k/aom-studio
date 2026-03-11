import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  ChevronDown, MessageCircle, X, ArrowRight, ArrowUpRight,
  ShieldCheck, Clock3, Users, BadgeCheck, Building2, Film, Monitor,
  Phone, Mail, MapPin, HardHat, Code2, Menu,
} from 'lucide-react';

// ── Brand Constants (Steffen's Design Spec) ──────────────────────────────────
const COLORS = {
  night: '#0C0C0C',
  nightCard: '#151515',
  deepWarm: '#1A1A17',
  charcoal: '#141412',
  cream: '#FDF6EC',
  textLight: '#F0ECE6',
  textMuted: '#8A847C',
  orange: '#E85D26',
  orangeHover: '#D14E1C',
  sage: '#7C9A72',
  border: '#292524',
};

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xbdalqvg';
const MAIN_PHONE = '6023732164';

// ── Data ─────────────────────────────────────────────────────────────────────
const SLIDES = [
  { id: 'hero', label: 'HERO' },
  { id: 'hook', label: 'HOOK' },
  { id: 'work', label: 'WORK' },
  { id: 'services', label: 'SERVICES' },
  { id: 'construction', label: 'CONSTRUCTION' },
  { id: 'ai', label: 'AI' },
  { id: 'proof', label: 'PROOF' },
  { id: 'contact', label: 'CONTACT' },
];

const TRUST_STATS = [
  { value: '24-72HR', label: 'Fast Turnarounds' },
  { value: 'CINEMA', label: 'Production Quality' },
  { value: 'PREDICTABLE', label: 'Delivery Timeline' },
  { value: 'REPEATABLE', label: 'Brand Consistency' },
];

const SERVICES = [
  {
    icon: HardHat,
    title: 'Construction Companies',
    body: 'Social content from the work you actually do.',
    cta: 'See Construction Work',
  },
  {
    icon: Film,
    title: 'Brands + Corporate',
    body: 'Video and content that tells your story and closes deals.',
    cta: 'View Our Reel',
  },
  {
    icon: Code2,
    title: 'Digital + Systems',
    body: 'Websites, workflows, and the systems that make it all run.',
    cta: 'Explore the System',
  },
];

const AI_STEPS = [
  { num: '1', title: 'AUDIT', body: 'We map your workflows, find the gaps, build the blueprint.' },
  { num: '2', title: 'SETUP', body: 'Custom AI agents, dashboards, and automations. Built for your business.' },
  { num: '3', title: 'PLATFORM', body: 'Ongoing access. Updates pushed automatically. You just run your business.' },
];

const TESTIMONIALS = [
  {
    quote: 'The video was a huge recruiting tool in recruiting our first 3 cohorts and showing people what we\'re about.',
    metric: '3 Cohorts + 40 Founders',
    metricLabel: 'Attracted',
    name: 'Brandon Clarke',
    company: 'Startup AZ Foundation',
    industry: 'Tech-Investments',
  },
  {
    quote: 'Before AOM, we were posting randomly. Now we have a repeatable system that fills our pipeline.',
    metric: '150%',
    metricLabel: 'Pipeline Growth',
    name: 'Sumit Seth',
    company: 'Naamly',
    industry: 'SaaS',
  },
  {
    quote: 'They didn\'t just shoot beautiful footage. They showed people the place I created had legacy.',
    metric: '3',
    metricLabel: 'Venue Launches',
    name: 'Gio Osso',
    company: 'Virtu Hospitality Group',
    industry: 'Hospitality',
  },
];

const EXPLORE_CARDS = [
  { label: 'AI OPERATIONS', title: 'The System', desc: 'How AOM builds AI workflows for SMBs.', href: '/system', sage: true },
  { label: 'STRATEGY', title: 'Briefs Hub', desc: 'Deep-dive strategy briefs for every vertical.', href: '/briefs', sage: false },
  { label: 'DASHBOARD', title: 'Client Portal', desc: 'Your private operations dashboard.', href: '/dashboard', sage: true },
  { label: 'ONBOARDING', title: 'AI Audit Tool', desc: 'Start your AI operations audit.', href: '/audit/test', sage: false },
];

const SERVICE_OPTIONS = ['Video', 'Website', 'Social Media', 'AI Advisory', 'Other'];
const BUDGET_OPTIONS = ['$2k - $5k', '$5k - $10k', '$10k - $25k', '$25k+'];
const TIMING_OPTIONS = ['ASAP (1-2 weeks)', 'This month', 'Next 30-60 days', 'Quarterly/ongoing'];

// Hero video pool (Gumlet IDs from existing portfolio)
const HERO_VIDEOS = [
  '698a6296fc23d3d76fa8d992',
  '698a5b86fc23d3d76fa82ece',
  '698a5ef5fc23d3d76fa87ef4',
  '698a6106aec3d4e420c2fd85',
  '698a5d24aec3d4e420c2a0a0',
];

// ── Utility: Reduced Motion ──────────────────────────────────────────────────
const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
};

// ── Slide Entrance Wrapper ───────────────────────────────────────────────────
const SlideReveal = ({ children, delay = 0, y = 15, duration = 0.4, className = '' }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.1, margin: '200px' });
  const reduced = usePrefersReducedMotion();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : y }}
      transition={{ duration: reduced ? 0.2 : duration, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ── Film Grain Overlay ───────────────────────────────────────────────────────
const FilmGrain = () => (
  <div className="absolute inset-0 pointer-events-none z-10" style={{ opacity: 0.03, mixBlendMode: 'overlay' }}>
    <svg className="w-full h-full">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </div>
);

// ── Progress Dots ────────────────────────────────────────────────────────────
const ProgressDots = ({ activeIndex, onNavigate, visible }) => {
  const [hoveredDot, setHoveredDot] = useState(null);

  if (!visible) return null;

  return (
    <>
      {/* Desktop: vertical right rail */}
      <div
        className="fixed right-7 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-0"
        style={{ transition: 'opacity 300ms ease', opacity: visible ? 1 : 0 }}
      >
        {/* Connecting line */}
        <div className="absolute left-1/2 -translate-x-1/2 w-px" style={{ top: 5, bottom: 5, backgroundColor: COLORS.border }}>
          <div
            className="w-full transition-all duration-300 ease-out"
            style={{
              backgroundColor: COLORS.orange,
              height: `${(activeIndex / (SLIDES.length - 1)) * 100}%`,
            }}
          />
        </div>

        {SLIDES.map((slide, i) => (
          <div key={slide.id} className="relative flex items-center" style={{ padding: '7px 0' }}>
            {/* Tooltip */}
            <AnimatePresence>
              {hoveredDot === i && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-full mr-2 whitespace-nowrap px-3 py-1.5 text-xs tracking-widest uppercase"
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 500,
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    color: COLORS.textLight,
                    background: 'rgba(12,12,12,0.9)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 2,
                  }}
                >
                  {slide.label}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => onNavigate(i)}
              onMouseEnter={() => setHoveredDot(i)}
              onMouseLeave={() => setHoveredDot(null)}
              className="relative z-10 rounded-full cursor-pointer transition-all duration-200"
              style={{
                width: i === activeIndex ? 10 : 6,
                height: i === activeIndex ? 10 : 6,
                backgroundColor: i === activeIndex ? COLORS.orange : COLORS.border,
                opacity: i === activeIndex ? 1 : 0.6,
                boxShadow: i === activeIndex ? `0 0 8px rgba(232,93,38,0.4)` : 'none',
              }}
              aria-label={`Navigate to ${slide.label}`}
            />
          </div>
        ))}
      </div>

      {/* Mobile: horizontal bottom pill */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex md:hidden items-center gap-3 px-5 py-2.5 pointer-events-auto"
        style={{
          background: 'rgba(12,12,12,0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: 9999,
          transition: 'opacity 300ms ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => onNavigate(i)}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === activeIndex ? 10 : 6,
              height: i === activeIndex ? 10 : 6,
              backgroundColor: i === activeIndex ? COLORS.orange : COLORS.border,
              opacity: i === activeIndex ? 1 : 0.6,
              boxShadow: i === activeIndex ? `0 0 8px rgba(232,93,38,0.4)` : 'none',
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              // The visual dot is the background; the tap target is the full 44px button
              backgroundClip: 'content-box',
              padding: i === activeIndex ? 17 : 19,
            }}
            aria-label={`Navigate to ${slide.label}`}
          />
        ))}
      </div>
    </>
  );
};

// ── Floating Contact Button ──────────────────────────────────────────────────
const FloatingContact = ({ visible, onOpen }) => {
  const [showLabel, setShowLabel] = useState(true);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const entryTimer = setTimeout(() => setEntered(true), 2000);
    const labelTimer = setTimeout(() => setShowLabel(false), 5000);
    return () => { clearTimeout(entryTimer); clearTimeout(labelTimer); };
  }, []);

  if (!visible || !entered) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      onClick={onOpen}
      className="fixed z-50 flex items-center cursor-pointer transition-transform duration-200 hover:scale-[1.08]"
      style={{
        right: 24,
        bottom: 24,
        backgroundColor: COLORS.orange,
        boxShadow: '0 4px 16px rgba(232,93,38,0.3)',
        borderRadius: 9999,
        padding: showLabel ? '12px 20px 12px 16px' : '17px',
        border: 'none',
      }}
    >
      <MessageCircle size={22} color="#FFFFFF" strokeWidth={2} />
      <AnimatePresence>
        {showLabel && (
          <motion.span
            initial={{ opacity: 1, width: 'auto', marginLeft: 10 }}
            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 14,
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            Let's Talk
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// ── Contact Drawer ───────────────────────────────────────────────────────────
const ContactDrawer = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ name: '', email: '', service: '', budget: '', timing: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setFormData({ name: '', email: '', service: '', budget: '', timing: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'aheadofmarket.com/v2 drawer',
          _subject: `New Lead (v2): ${formData.name}`,
        }),
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[55]"
            style={{ background: 'rgba(0,0,0,0.60)' }}
            onClick={onClose}
          />

          {/* Desktop drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-0 right-0 bottom-0 z-[60] hidden md:flex flex-col overflow-y-auto"
            style={{ width: 420, background: COLORS.night }}
          >
            {/* Pattern strip top */}
            <div style={{
              height: 4,
              width: '100%',
              background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)',
            }} />

            <div className="flex-1 p-12 relative">
              <button onClick={onClose} className="absolute top-6 right-6 transition-colors" style={{ color: COLORS.textMuted }}>
                <X size={24} />
              </button>
              <DrawerContent
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSubmitting}
                submitted={submitted}
                onSubmit={handleSubmit}
                isValid={isValid}
              />
            </div>
          </motion.div>

          {/* Mobile full-screen modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-0 z-[60] md:hidden overflow-y-auto"
            style={{ background: COLORS.night }}
          >
            <div className="p-6 pt-16 relative">
              <button onClick={onClose} className="absolute top-4 right-4 transition-colors" style={{ color: COLORS.textMuted }}>
                <X size={24} />
              </button>
              <DrawerContent
                formData={formData}
                setFormData={setFormData}
                isSubmitting={isSubmitting}
                submitted={submitted}
                onSubmit={handleSubmit}
                isValid={isValid}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const DrawerContent = ({ formData, setFormData, isSubmitting, submitted, onSubmit, isValid }) => {
  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-6" style={{ color: COLORS.orange }}>&#10003;</div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, color: COLORS.cream, textTransform: 'uppercase' }}>
          Brief Received.
        </h3>
        <p className="mt-4" style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, color: COLORS.textMuted }}>
          A creative lead will reply within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, color: COLORS.cream, textTransform: 'uppercase', letterSpacing: '-0.03em' }}>
          Start a Brief.
        </h3>
        <p className="mt-2" style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, color: COLORS.textMuted }}>
          Tell us what you need. We'll tell you exactly how we'd do it.
        </p>
      </div>

      {/* Name */}
      <FormField label="Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="Your name" />

      {/* Email */}
      <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="you@company.com" type="email" />

      {/* Service pills */}
      <div>
        <FieldLabel>What do you need?</FieldLabel>
        <div className="flex flex-wrap gap-2.5 mt-2">
          {SERVICE_OPTIONS.map((opt) => (
            <PillButton key={opt} selected={formData.service === opt} onClick={() => setFormData({ ...formData, service: opt })}>
              {opt}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Budget pills */}
      <div>
        <FieldLabel>Budget range</FieldLabel>
        <div className="flex flex-wrap gap-2.5 mt-2">
          {BUDGET_OPTIONS.map((opt) => (
            <PillButton key={opt} selected={formData.budget === opt} onClick={() => setFormData({ ...formData, budget: opt })}>
              {opt}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Timing pills */}
      <div>
        <FieldLabel>Timeline</FieldLabel>
        <div className="flex flex-wrap gap-2.5 mt-2">
          {TIMING_OPTIONS.map((opt) => (
            <PillButton key={opt} selected={formData.timing === opt} onClick={() => setFormData({ ...formData, timing: opt })}>
              {opt}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!isValid || isSubmitting}
        className="w-full transition-all duration-200"
        style={{
          background: isValid ? COLORS.orange : '#1a1a1a',
          color: isValid ? COLORS.cream : '#555',
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 16,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '16px 48px',
          border: 'none',
          cursor: isValid ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? 'Sending...' : 'START BRIEF'}
      </button>

      {/* Fallback contact */}
      <div className="pt-6" style={{ borderTop: `1px solid rgba(255,255,255,0.08)` }}>
        <div className="flex items-center gap-3 mb-3">
          <Phone size={16} style={{ color: COLORS.orange }} />
          <a href={`tel:${MAIN_PHONE}`} style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 18, color: COLORS.textLight, textDecoration: 'none' }}>
            (602) 373-2164
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Mail size={16} style={{ color: COLORS.orange }} />
          <a href="mailto:hello@aom-inhouse.com" style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 18, color: COLORS.textLight, textDecoration: 'none' }}>
            hello@aom-inhouse.com
          </a>
        </div>
      </div>
    </div>
  );
};

const FieldLabel = ({ children }) => (
  <label style={{
    fontFamily: '"Space Grotesk", sans-serif',
    fontWeight: 600,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: COLORS.textMuted,
    display: 'block',
    marginBottom: 8,
  }}>
    {children}
  </label>
);

const FormField = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid rgba(255,255,255,0.15)`,
        height: 48,
        fontFamily: '"Space Grotesk", sans-serif',
        fontWeight: 400,
        fontSize: 18,
        color: COLORS.cream,
        outline: 'none',
      }}
      onFocus={(e) => { e.target.style.borderBottomColor = COLORS.orange; }}
      onBlur={(e) => { e.target.style.borderBottomColor = 'rgba(255,255,255,0.15)'; }}
    />
  </div>
);

const PillButton = ({ children, selected, onClick }) => (
  <button
    onClick={onClick}
    className="transition-all duration-200"
    style={{
      padding: '10px 20px',
      border: `1px solid ${selected ? COLORS.orange : 'rgba(255,255,255,0.15)'}`,
      background: selected ? COLORS.orange : 'transparent',
      color: selected ? COLORS.cream : COLORS.textMuted,
      fontFamily: '"Space Grotesk", sans-serif',
      fontWeight: 500,
      fontSize: 14,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

// ── Nav Bar ──────────────────────────────────────────────────────────────────
const NavBar = ({ activeIndex, onNavigate, onContactOpen }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHero = activeIndex === 0;

  const navLinks = [
    { label: 'Work', slideIndex: 2 },
    { label: 'Services', slideIndex: 3 },
    { label: 'AI Advisory', href: '/system' },
    { label: 'Contact', slideIndex: 7 },
  ];

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-[45] flex items-center justify-between transition-all duration-300"
        style={{
          height: 64,
          padding: '0 48px',
          background: isHero ? 'rgba(12,12,12,0.4)' : COLORS.night,
          backdropFilter: isHero ? 'blur(12px)' : 'none',
          borderBottom: isHero ? 'none' : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <a
          href="/v2#hero"
          onClick={(e) => { e.preventDefault(); onNavigate(0); }}
          style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 24, color: '#FFFFFF', textDecoration: 'none' }}
        >
          AOM<span style={{ color: COLORS.orange }}>.</span>
        </a>

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href || `#${SLIDES[link.slideIndex]?.id}`}
              onClick={(e) => {
                if (link.slideIndex !== undefined) {
                  e.preventDefault();
                  onNavigate(link.slideIndex);
                }
              }}
              className="transition-colors duration-150"
              style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 500,
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: link.slideIndex === activeIndex ? COLORS.orange : COLORS.textMuted,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { if (link.slideIndex !== activeIndex) e.target.style.color = COLORS.textLight; }}
              onMouseLeave={(e) => { if (link.slideIndex !== activeIndex) e.target.style.color = COLORS.textMuted; }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button onClick={() => setMobileOpen(true)} className="md:hidden" style={{ color: COLORS.textMuted }}>
          <Menu size={24} />
        </button>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
            style={{ background: COLORS.night }}
          >
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4" style={{ color: COLORS.textMuted }}>
              <X size={24} />
            </button>
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href || '#'}
                onClick={(e) => {
                  if (link.slideIndex !== undefined) {
                    e.preventDefault();
                    onNavigate(link.slideIndex);
                  }
                  setMobileOpen(false);
                }}
                style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 700,
                  fontSize: 28,
                  color: COLORS.textLight,
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN V2 PAGE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function V2() {
  const containerRef = useRef(null);
  const slideRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Random hero video
  const heroVideoId = useMemo(() => HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)], []);

  // ── IntersectionObserver for active slide ──────────────────────────────────
  useEffect(() => {
    const observers = [];
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
            const hash = `#${SLIDES[i].id}`;
            if (window.location.hash !== hash) {
              history.replaceState(null, '', `/v2${hash}`);
            }
          }
        },
        { root: containerRef.current, threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // ── Hash-based initial scroll ──────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const idx = SLIDES.findIndex((s) => s.id === hash);
      if (idx >= 0 && slideRefs.current[idx]) {
        slideRefs.current[idx].scrollIntoView({ behavior: 'instant' });
      }
    }
  }, []);

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (drawerOpen) return;
      let target = null;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        target = Math.min(activeIndex + 1, SLIDES.length - 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        target = Math.max(activeIndex - 1, 0);
      } else if (e.key === 'Home') {
        target = 0;
      } else if (e.key === 'End') {
        target = SLIDES.length - 1;
      }
      if (target !== null && target !== activeIndex) {
        e.preventDefault();
        navigateToSlide(target);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, drawerOpen]);

  const navigateToSlide = useCallback((index) => {
    slideRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const setSlideRef = useCallback((index) => (el) => {
    slideRefs.current[index] = el;
  }, []);

  const showDots = activeIndex > 0;
  const showContactButton = activeIndex < 7;

  // ── Shared slide base styles ───────────────────────────────────────────────
  const slideBase = 'min-h-screen min-h-[100dvh] flex items-center justify-center relative';
  const contentMax = 'max-w-[1200px] mx-auto w-full';
  const slidePadding = 'px-6 md:px-12 lg:px-24';

  return (
    <div
      className="text-white antialiased selection:bg-orange-600"
      style={{ fontFamily: '"Space Grotesk", sans-serif', background: COLORS.night }}
    >
      <NavBar activeIndex={activeIndex} onNavigate={navigateToSlide} onContactOpen={() => setDrawerOpen(true)} />
      <ProgressDots activeIndex={activeIndex} onNavigate={navigateToSlide} visible={showDots} />
      <FloatingContact visible={showContactButton} onOpen={() => setDrawerOpen(true)} />
      <ContactDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* ── Scroll Snap Container ──────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="h-screen overflow-y-scroll"
        style={{
          scrollSnapType: drawerOpen ? 'none' : 'y mandatory',
          scrollBehavior: 'smooth',
        }}
      >
        {/* ═══════ SLIDE 1: HERO ═══════ */}
        <section
          ref={setSlideRef(0)}
          className={`${slideBase} overflow-hidden`}
          style={{ background: COLORS.night, scrollSnapAlign: 'start' }}
          aria-label="Hero"
        >
          {/* Video background */}
          <div className="absolute inset-0 z-0">
            <iframe
              src={`https://play.gumlet.io/embed/${heroVideoId}?autoplay=true&muted=true&loop=true&background=true`}
              className="absolute inset-0 w-full h-full border-none"
              style={{ pointerEvents: 'none' }}
              loading="eager"
              title="Hero Background"
              allow="autoplay; encrypted-media"
            />
            {/* Overlay */}
            <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.50)' }} />
            {/* Vignette */}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)' }} />
            {/* Bottom gradient */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 85%, #0C0C0C 100%)' }} />
          </div>

          <FilmGrain />

          <div className="relative z-20 text-center flex flex-col items-center px-6 overflow-hidden w-full">
            <SlideReveal delay={0}>
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: COLORS.textMuted,
                marginBottom: 16,
              }}>
                CREATIVE PRODUCTION + AI SYSTEMS
              </p>
            </SlideReveal>

            <SlideReveal delay={0.15} y={20}>
              <h1 style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 900,
                fontSize: 'clamp(36px, 7vw, 80px)',
                lineHeight: 0.92,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: COLORS.cream,
                maxWidth: 900,
                width: '100%',
              }}>
                WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.
              </h1>
            </SlideReveal>

            <SlideReveal delay={0.3} y={20} duration={0.4}>
              <p style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 400,
                fontSize: 'clamp(16px, 2vw, 20px)',
                lineHeight: 1.5,
                color: COLORS.textMuted,
                maxWidth: 600,
                marginTop: 24,
              }}>
                Story-driven production systems for teams that need trust, speed, and outcomes.
              </p>
            </SlideReveal>

            {/* Status bar */}
            <SlideReveal delay={0.6} y={0} duration={0.4}>
              <div className="hidden md:flex items-center gap-4 mt-auto absolute bottom-8 left-1/2 -translate-x-1/2" style={{ opacity: 0.7 }}>
                {['PHOENIX, AZ', 'VIDEO', 'WEB', 'SOCIAL', 'SYSTEMS', 'EST. 2020'].map((item, i) => (
                  <React.Fragment key={item}>
                    {i > 0 && <span style={{ color: COLORS.border, fontSize: 11 }}>/</span>}
                    <span style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 500,
                      fontSize: 11,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: COLORS.textMuted,
                    }}>
                      {item}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </SlideReveal>

            {/* Down arrow */}
            <SlideReveal delay={0.8} y={0}>
              <button
                onClick={() => navigateToSlide(1)}
                className="absolute bottom-20 left-1/2 -translate-x-1/2 transition-colors duration-200 cursor-pointer"
                style={{ color: COLORS.textMuted }}
                onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.orange; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted; }}
              >
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ChevronDown size={24} />
                </motion.div>
              </button>
            </SlideReveal>
          </div>
        </section>

        {/* ═══════ SLIDE 2: THE HOOK ═══════ */}
        <section
          ref={setSlideRef(1)}
          className={`${slideBase}`}
          style={{ background: COLORS.nightCard, scrollSnapAlign: 'start' }}
          aria-label="Why AOM"
        >
          {/* Top gradient blend */}
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.night}, transparent)` }} />

          <div className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-[55%_45%] gap-16`}>
            {/* Left */}
            <div>
              <SlideReveal delay={0}>
                <p style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: COLORS.textMuted,
                  marginBottom: 16,
                }}>
                  WHY AOM
                </p>
              </SlideReveal>

              <SlideReveal delay={0.1}>
                <h2 style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(34px, 5vw, 52px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  color: COLORS.cream,
                }}>
                  SMALL TEAM. CINEMA-GRADE. NO BS.
                </h2>
              </SlideReveal>

              <SlideReveal delay={0.2}>
                <p style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 400,
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: COLORS.textMuted,
                  marginTop: 24,
                  maxWidth: '45ch',
                }}>
                  No layers of account managers. No scope creep. You talk to the people doing the work.
                </p>
              </SlideReveal>
            </div>

            {/* Right: Stats 2x2 */}
            <div className="grid grid-cols-2 gap-8 overflow-hidden">
              {TRUST_STATS.map((stat, i) => (
                <SlideReveal key={stat.label} delay={0.3 + i * 0.1} y={20}>
                  <div style={{ borderLeft: `2px solid rgba(232,93,38,0.2)`, paddingLeft: 20, overflow: 'hidden' }}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 900,
                      fontSize: 'clamp(24px, 2.5vw, 36px)',
                      lineHeight: 0.95,
                      letterSpacing: '-0.02em',
                      color: COLORS.orange,
                    }}>
                      {stat.value}
                    </div>
                    <div style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: COLORS.textMuted,
                      marginTop: 8,
                    }}>
                      {stat.label}
                    </div>
                  </div>
                </SlideReveal>
              ))}
            </div>
          </div>

          {/* Down arrow */}
          <SlideNavArrow onClick={() => navigateToSlide(2)} />
        </section>

        {/* ═══════ SLIDE 3: THE WORK ═══════ */}
        <section
          ref={setSlideRef(2)}
          className={`${slideBase} flex-col`}
          style={{ background: COLORS.night, scrollSnapAlign: 'start' }}
          aria-label="The Work"
        >
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.nightCard}, transparent)` }} />

          {/* Section label */}
          <div className="absolute top-20 left-12 md:left-12 z-10">
            <SlideReveal>
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: COLORS.textMuted,
              }}>
                THE WORK
              </p>
            </SlideReveal>
          </div>

          {/* Full-bleed reel placeholder */}
          <div className="w-full flex-1 flex items-center justify-center px-6 md:px-12 relative">
            <SlideReveal delay={0.1} y={0} duration={0.5}>
              <div
                className="relative w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                  height: 'clamp(400px, 70vh, 85vh)',
                  aspectRatio: '16/9',
                  background: 'rgba(12,12,12,0.5)',
                  border: `2px solid ${COLORS.border}`,
                }}
              >
                {/* Featured reel video */}
                <iframe
                  src={`https://play.gumlet.io/embed/${HERO_VIDEOS[1]}?autoplay=true&muted=true&loop=true&background=true`}
                  className="absolute inset-0 w-full h-full border-none"
                  style={{ pointerEvents: 'none' }}
                  loading="lazy"
                  title="Portfolio Reel"
                  allow="autoplay; encrypted-media"
                />
                <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.35)' }} />

                {/* Client name overlay */}
                <SlideReveal delay={0.4} y={10} className="absolute bottom-12 left-12 z-10">
                  <p style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    fontSize: 18,
                    color: '#FFFFFF',
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  }}>
                    Featured Work
                  </p>
                  <p style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12,
                    color: COLORS.textMuted,
                    marginTop: 4,
                  }}>
                    CAMPAIGNS + SOCIAL
                  </p>
                </SlideReveal>
              </div>
            </SlideReveal>
          </div>

          {/* Thumbnail selectors (placeholder row) */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
            {[0, 1, 2, 3].map((i) => (
              <SlideReveal key={i} delay={0.5 + i * 0.08} y={10}>
                <div
                  className="transition-all duration-200 cursor-pointer"
                  style={{
                    width: 80,
                    height: 56,
                    border: `2px solid ${i === 0 ? COLORS.orange : 'rgba(255,255,255,0.1)'}`,
                    background: i === 0 ? 'rgba(232,93,38,0.1)' : 'rgba(255,255,255,0.03)',
                  }}
                />
              </SlideReveal>
            ))}
          </div>

          <SlideNavArrow onClick={() => navigateToSlide(3)} />
        </section>

        {/* ═══════ SLIDE 4: SERVICES ═══════ */}
        <section
          ref={setSlideRef(3)}
          className={`${slideBase} flex-col`}
          style={{ background: COLORS.deepWarm, scrollSnapAlign: 'start' }}
          aria-label="Our Services"
        >
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.night}, transparent)` }} />

          <div className={`${contentMax} ${slidePadding} text-center`}>
            <SlideReveal>
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: COLORS.textMuted,
                marginBottom: 16,
              }}>
                WHAT WE DO
              </p>
            </SlideReveal>

            <SlideReveal delay={0.1}>
              <h2 style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(34px, 5vw, 52px)',
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: COLORS.cream,
                marginBottom: 48,
              }}>
                PICK YOUR LANE.
              </h2>
            </SlideReveal>

            {/* Service cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ maxWidth: 1140 }}>
              {SERVICES.map((svc, i) => (
                <SlideReveal key={svc.title} delay={0.25 + i * 0.12} y={25}>
                  <div
                    className="group text-left h-full transition-all duration-200 cursor-pointer"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '40px 32px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <svc.icon size={32} strokeWidth={2} style={{ color: COLORS.orange }} />
                    <div style={{ height: 24 }} />
                    <h3 style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600,
                      fontSize: 20,
                      color: COLORS.textLight,
                    }}>
                      {svc.title}
                    </h3>
                    <div style={{ height: 12 }} />
                    <p style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 400,
                      fontSize: 16,
                      lineHeight: 1.5,
                      color: COLORS.textMuted,
                    }}>
                      {svc.body}
                    </p>
                    <div style={{ height: 24 }} />
                    <span className="inline-flex items-center gap-2 transition-all duration-200 group-hover:translate-x-1" style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600,
                      fontSize: 14,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: COLORS.orange,
                    }}>
                      {svc.cta} <ArrowRight size={16} />
                    </span>
                  </div>
                </SlideReveal>
              ))}
            </div>
          </div>

          <SlideNavArrow onClick={() => navigateToSlide(4)} />
        </section>

        {/* ═══════ SLIDE 5: CONSTRUCTION ═══════ */}
        <section
          ref={setSlideRef(4)}
          className={`${slideBase}`}
          style={{ background: COLORS.night, scrollSnapAlign: 'start' }}
          aria-label="Construction"
        >
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.deepWarm}, transparent)` }} />

          <div className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-2 gap-12`}>
            {/* Left: content */}
            <div>
              <SlideReveal>
                <p style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: COLORS.orange,
                  marginBottom: 16,
                }}>
                  CONSTRUCTION
                </p>
              </SlideReveal>

              <SlideReveal delay={0.1}>
                <h2 style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(34px, 5vw, 52px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  color: COLORS.cream,
                }}>
                  YOUR CREWS BUILD IT. WE MAKE SURE PEOPLE SEE IT.
                </h2>
              </SlideReveal>

              <SlideReveal delay={0.2}>
                <p style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 400,
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: COLORS.textMuted,
                  marginTop: 24,
                  maxWidth: '40ch',
                }}>
                  Construction companies are underserved by serious social media. The budgets are there, the need is real.
                </p>
              </SlideReveal>

              {/* Proof points */}
              <div className="mt-8 space-y-4">
                {[
                  'Recruit top crews through the content they already scroll',
                  'Win bids with a presence that proves your capability',
                  'Stand out from the sea of competitors with no online presence',
                ].map((point, i) => (
                  <SlideReveal key={i} delay={0.3 + i * 0.1}>
                    <div className="flex items-start gap-3">
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.orange, marginTop: 8, flexShrink: 0 }} />
                      <span style={{
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontWeight: 400,
                        fontSize: 16,
                        color: COLORS.textMuted,
                      }}>
                        {point}
                      </span>
                    </div>
                  </SlideReveal>
                ))}
              </div>

              <SlideReveal delay={0.6}>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="mt-10 transition-all duration-200"
                  style={{
                    background: COLORS.orange,
                    color: COLORS.cream,
                    fontFamily: 'Syne, sans-serif',
                    fontWeight: 800,
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '14px 32px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.target.style.background = COLORS.orangeHover; }}
                  onMouseLeave={(e) => { e.target.style.background = COLORS.orange; }}
                >
                  START A PROJECT
                </button>
              </SlideReveal>
            </div>

            {/* Right: media placeholder */}
            <SlideReveal delay={0.3} y={0}>
              <div
                className="relative overflow-hidden w-full h-full min-h-[400px] transition-all duration-200"
                style={{
                  border: `2px solid ${COLORS.border}`,
                  aspectRatio: '4/5',
                  maxHeight: '70vh',
                  background: 'rgba(12,12,12,0.5)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.border; }}
              >
                <iframe
                  src={`https://play.gumlet.io/embed/${HERO_VIDEOS[2]}?autoplay=true&muted=true&loop=true&background=true`}
                  className="absolute inset-0 w-full h-full border-none"
                  style={{ pointerEvents: 'none', objectFit: 'cover' }}
                  loading="lazy"
                  title="Construction Content"
                  allow="autoplay; encrypted-media"
                />
              </div>
            </SlideReveal>
          </div>

          <SlideNavArrow onClick={() => navigateToSlide(5)} />
        </section>

        {/* ═══════ SLIDE 6: AI ADVISORY ═══════ */}
        <section
          ref={setSlideRef(5)}
          className={`${slideBase}`}
          style={{ background: COLORS.nightCard, scrollSnapAlign: 'start' }}
          aria-label="AI Advisory"
        >
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.night}, transparent)` }} />

          <div className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-[40%_60%] gap-16`}>
            {/* Left */}
            <div>
              <SlideReveal>
                <p style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: COLORS.sage,
                  marginBottom: 16,
                }}>
                  AI OPERATIONS
                </p>
              </SlideReveal>

              <SlideReveal delay={0.1}>
                <h2 style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 800,
                  fontSize: 'clamp(34px, 5vw, 52px)',
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  color: COLORS.cream,
                }}>
                  THE NEXT GEEK SQUAD FOR AI.
                </h2>
              </SlideReveal>

              <SlideReveal delay={0.2}>
                <p style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 400,
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: COLORS.textMuted,
                  marginTop: 24,
                  maxWidth: '35ch',
                }}>
                  We built this system for ourselves first. Now we're opening it up to businesses that need AI operations without the overhead.
                </p>
              </SlideReveal>

              <SlideReveal delay={0.3}>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 800,
                  fontSize: 28,
                  color: COLORS.sage,
                  marginTop: 32,
                }}>
                  Starting at $2,500
                </p>
              </SlideReveal>

              <SlideReveal delay={0.4}>
                <a
                  href="/system"
                  className="inline-flex items-center gap-2 mt-6 transition-opacity duration-200 hover:opacity-80"
                  style={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    fontSize: 14,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: COLORS.sage,
                    textDecoration: 'none',
                  }}
                >
                  EXPLORE THE SYSTEM <ArrowRight size={16} />
                </a>
              </SlideReveal>
            </div>

            {/* Right: Step cards */}
            <div className="space-y-5">
              {AI_STEPS.map((step, i) => (
                <SlideReveal key={step.num} delay={0.3 + i * 0.12} y={20}>
                  <div
                    className="flex items-start gap-6 transition-all duration-200"
                    style={{
                      background: 'rgba(124,154,114,0.05)',
                      border: '1px solid rgba(124,154,114,0.12)',
                      padding: '28px 32px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(124,154,114,0.25)';
                      e.currentTarget.style.background = 'rgba(124,154,114,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(124,154,114,0.12)';
                      e.currentTarget.style.background = 'rgba(124,154,114,0.05)';
                    }}
                  >
                    <span style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: 'clamp(32px, 4vw, 40px)',
                      color: COLORS.sage,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}>
                      {step.num}
                    </span>
                    <div>
                      <h3 style={{
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontWeight: 600,
                        fontSize: 20,
                        color: COLORS.textLight,
                      }}>
                        {step.title}
                      </h3>
                      <p style={{
                        fontFamily: '"Space Grotesk", sans-serif',
                        fontWeight: 400,
                        fontSize: 15,
                        lineHeight: 1.5,
                        color: COLORS.textMuted,
                        marginTop: 8,
                      }}>
                        {step.body}
                      </p>
                    </div>
                  </div>
                </SlideReveal>
              ))}
            </div>
          </div>

          <SlideNavArrow onClick={() => navigateToSlide(6)} />
        </section>

        {/* ═══════ SLIDE 7: SOCIAL PROOF ═══════ */}
        <section
          ref={setSlideRef(6)}
          className={`${slideBase} flex-col`}
          style={{ background: COLORS.deepWarm, scrollSnapAlign: 'start' }}
          aria-label="Social Proof"
        >
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.nightCard}, transparent)` }} />

          <div className={`${contentMax} ${slidePadding} text-center`}>
            <SlideReveal>
              <p style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: COLORS.textMuted,
                marginBottom: 16,
              }}>
                WHAT THEY SAY
              </p>
            </SlideReveal>

            <SlideReveal delay={0.1}>
              <h2 style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(34px, 5vw, 52px)',
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                textTransform: 'uppercase',
                color: COLORS.cream,
                marginBottom: 48,
              }}>
                DON'T TAKE OUR WORD FOR IT.
              </h2>
            </SlideReveal>

            {/* Testimonial cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              {TESTIMONIALS.map((t, i) => (
                <SlideReveal key={t.name} delay={0.25 + i * 0.15} y={25}>
                  <div
                    className="h-full transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '40px 32px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    {/* Open quote */}
                    <span style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: 48,
                      color: COLORS.orange,
                      opacity: 0.4,
                      lineHeight: 1,
                      display: 'block',
                      marginBottom: 16,
                    }}>
                      &ldquo;
                    </span>

                    {/* Quote */}
                    <p style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 400,
                      fontSize: 18,
                      lineHeight: 1.6,
                      color: COLORS.textLight,
                      fontStyle: 'italic',
                    }}>
                      {t.quote}
                    </p>

                    <div style={{ height: 24 }} />

                    {/* Metric */}
                    <div style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: 32,
                      color: COLORS.orange,
                    }}>
                      {t.metric}
                    </div>
                    <p style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 500,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      color: COLORS.textMuted,
                      marginTop: 4,
                    }}>
                      {t.metricLabel}
                    </p>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

                    {/* Attribution */}
                    <p style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600,
                      fontSize: 16,
                      color: COLORS.textLight,
                    }}>
                      {t.name}
                    </p>
                    <p style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 400,
                      fontSize: 14,
                      color: COLORS.textMuted,
                      marginTop: 4,
                    }}>
                      {t.company} / {t.industry}
                    </p>
                  </div>
                </SlideReveal>
              ))}
            </div>
          </div>

          <SlideNavArrow onClick={() => navigateToSlide(7)} />
        </section>

        {/* ═══════ SLIDE 8: CONTACT / CTA ═══════ */}
        <section
          ref={setSlideRef(7)}
          className={`${slideBase}`}
          style={{ background: COLORS.night, scrollSnapAlign: 'start' }}
          aria-label="Contact"
        >
          <div className="absolute top-0 left-0 right-0 h-2.5" style={{ background: `linear-gradient(to bottom, ${COLORS.deepWarm}, transparent)` }} />
          <FilmGrain />

          <div className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-[45%_55%] gap-16 relative z-20`}>
            {/* Left */}
            <div>
              <SlideReveal>
                <h2 style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 900,
                  fontSize: 'clamp(40px, 6vw, 64px)',
                  lineHeight: 0.95,
                  letterSpacing: '-0.03em',
                  textTransform: 'uppercase',
                  color: COLORS.cream,
                  maxWidth: 500,
                }}>
                  LET'S BUILD SOMETHING.
                </h2>
              </SlideReveal>

              <SlideReveal delay={0.1}>
                <p style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 400,
                  fontSize: 18,
                  lineHeight: 1.6,
                  color: COLORS.textMuted,
                  marginTop: 24,
                  maxWidth: '35ch',
                }}>
                  Tell us what you need. We'll tell you exactly how we'd do it.
                </p>
              </SlideReveal>

              <SlideReveal delay={0.2}>
                <div style={{ width: 80, height: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />
              </SlideReveal>

              <SlideReveal delay={0.3}>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone size={16} style={{ color: COLORS.orange }} />
                    <a href={`tel:${MAIN_PHONE}`} style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 18, color: COLORS.textLight, textDecoration: 'none' }}>
                      (602) 373-2164
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail size={16} style={{ color: COLORS.orange }} />
                    <a href="mailto:hello@aom-inhouse.com" style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 600, fontSize: 18, color: COLORS.textLight, textDecoration: 'none' }}>
                      hello@aom-inhouse.com
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin size={16} style={{ color: COLORS.textMuted }} />
                    <span style={{ fontFamily: '"Space Grotesk", sans-serif', fontWeight: 400, fontSize: 16, color: COLORS.textMuted }}>
                      Phoenix, AZ
                    </span>
                  </div>
                </div>
              </SlideReveal>
            </div>

            {/* Right: Inline contact form */}
            <ContactFormInline />
          </div>
        </section>

        {/* ═══════ KEEP EXPLORING SECTION ═══════ */}
        <div style={{ scrollSnapAlign: 'none' }}>
          {/* Pattern strip divider */}
          <div style={{
            height: 6,
            width: '100%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)',
          }} />

          <div style={{ background: COLORS.charcoal, padding: '80px 0 48px' }}>
            <div className={`${contentMax} px-6 md:px-12`}>
              <h3 className="text-center mb-12" style={{
                fontFamily: 'Syne, sans-serif',
                fontWeight: 700,
                fontSize: 32,
                color: COLORS.textMuted,
              }}>
                KEEP EXPLORING
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ maxWidth: 960, margin: '0 auto' }}>
                {EXPLORE_CARDS.map((card) => (
                  <a
                    key={card.title}
                    href={card.href}
                    className="relative block transition-all duration-200 group"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      padding: 32,
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(232,93,38,0.2)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <ArrowUpRight
                      size={16}
                      className="absolute top-8 right-8 transition-colors duration-200 group-hover:text-orange-500"
                      style={{ color: COLORS.textMuted }}
                    />
                    <p style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: card.sage ? COLORS.sage : COLORS.orange,
                    }}>
                      {card.label}
                    </p>
                    <h4 style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 600,
                      fontSize: 20,
                      color: COLORS.textLight,
                      marginTop: 8,
                    }}>
                      {card.title}
                    </h4>
                    <p style={{
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 400,
                      fontSize: 15,
                      color: COLORS.textMuted,
                      marginTop: 8,
                    }}>
                      {card.desc}
                    </p>
                  </a>
                ))}
              </div>

              {/* Footer */}
              <div className="text-center mt-16 pt-16" style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}>
                <p style={{
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 900,
                  fontSize: 20,
                  color: COLORS.textMuted,
                }}>
                  AOM<span style={{ color: COLORS.orange }}>.</span>
                </p>
                <p className="mt-4" style={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontSize: 13,
                  color: COLORS.textMuted,
                }}>
                  &copy; {new Date().getFullYear()} Ahead of Market. Phoenix, AZ.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide Navigation Arrow ───────────────────────────────────────────────────
const SlideNavArrow = ({ onClick }) => (
  <button
    onClick={onClick}
    className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 transition-all duration-200 cursor-pointer"
    style={{ color: COLORS.textMuted, opacity: 0.5 }}
    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = COLORS.orange; }}
    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = COLORS.textMuted; }}
  >
    <motion.div
      animate={{ y: [0, 6, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ChevronDown size={20} />
    </motion.div>
  </button>
);

// ── Inline Contact Form (Slide 8) ───────────────────────────────────────────
const ContactFormInline = () => {
  const [formData, setFormData] = useState({ name: '', email: '', service: '', budget: '', timing: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'aheadofmarket.com/v2 contact slide',
          _subject: `New Lead (v2 Contact): ${formData.name}`,
        }),
      });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  if (submitted) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-6" style={{ color: COLORS.orange }}>&#10003;</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, color: COLORS.cream, textTransform: 'uppercase' }}>
            Brief Received.
          </h3>
          <p className="mt-4" style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, color: COLORS.textMuted }}>
            A creative lead will reply within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }} className="space-y-6">
      <FormField label="Name" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} placeholder="Your name" />

      <FormField label="Email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} placeholder="you@company.com" type="email" />

      <div>
        <FieldLabel>What do you need?</FieldLabel>
        <div className="flex flex-wrap gap-2.5 mt-2">
          {SERVICE_OPTIONS.map((opt) => (
            <PillButton key={opt} selected={formData.service === opt} onClick={() => setFormData({ ...formData, service: opt })}>
              {opt}
            </PillButton>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Budget range</FieldLabel>
        <div className="flex flex-wrap gap-2.5 mt-2">
          {BUDGET_OPTIONS.map((opt) => (
            <PillButton key={opt} selected={formData.budget === opt} onClick={() => setFormData({ ...formData, budget: opt })}>
              {opt}
            </PillButton>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Timeline</FieldLabel>
        <div className="flex flex-wrap gap-2.5 mt-2">
          {TIMING_OPTIONS.map((opt) => (
            <PillButton key={opt} selected={formData.timing === opt} onClick={() => setFormData({ ...formData, timing: opt })}>
              {opt}
            </PillButton>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full md:w-auto transition-all duration-200"
          style={{
            background: isValid ? COLORS.orange : '#1a1a1a',
            color: isValid ? COLORS.cream : '#555',
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '16px 48px',
            border: 'none',
            cursor: isValid ? 'pointer' : 'not-allowed',
            boxShadow: isValid ? '0 0 20px rgba(232,93,38,0.15)' : 'none',
          }}
          onMouseEnter={(e) => { if (isValid) e.target.style.background = COLORS.orangeHover; }}
          onMouseLeave={(e) => { if (isValid) e.target.style.background = COLORS.orange; }}
        >
          {isSubmitting ? 'Sending...' : 'START BRIEF'}
        </button>
      </div>
    </div>
  );
};
