import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  { id: 'hook', label: 'THE HOOK' },
  { id: 'work', label: 'THE WORK' },
  { id: 'services', label: 'SERVICES' },
  { id: 'construction', label: 'CONSTRUCTION' },
  { id: 'ai', label: 'AI OPERATIONS' },
  { id: 'proof', label: 'PROOF' },
  { id: 'contact', label: 'CONTACT' },
];

const TRUST_STATS = [
  { value: '24-72HR', label: 'Fast Turnarounds' },
  { value: 'CINEMA', label: 'Production Quality' },
  { value: 'ON TIME', label: 'Delivery Timeline' },
  { value: 'ALWAYS', label: 'Brand Consistency' },
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
  { label: 'ONBOARDING', title: 'AI Flow Tool', desc: 'Start your AI operations audit.', href: '/audit/test', sage: false },
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

// ── Slide Transition Variants ────────────────────────────────────────────────
// Direction: 1 = forward (exit up, enter from below), -1 = backward (exit down, enter from above)
const slideVariants = {
  enter: (direction) => ({
    y: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    y: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

const slideTransition = {
  enter: { duration: 0.35, ease: [0, 0, 0.2, 1] },
  exit: { duration: 0.25, ease: [0.4, 0, 1, 1] },
};

// Reduced motion variants
const reducedSlideVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

// ── Stagger Container ────────────────────────────────────────────────────────
const staggerContainer = {
  center: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
};

const staggerChild = {
  enter: { y: 20, opacity: 0 },
  center: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0, 0, 0.2, 1] } },
};

const staggerChildFade = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Film Grain Overlay ───────────────────────────────────────────────────────
const FilmGrain = () => (
  <div className="absolute inset-0 pointer-events-none z-10" style={{ opacity: 0.03, mixBlendMode: 'overlay', willChange: 'auto' }}>
    <svg className="w-full h-full">
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </div>
);

// ── Progress Bar (Top) ───────────────────────────────────────────────────────
// Replaces side dots per Steffen's feel refinement spec
const ProgressBar = ({ activeIndex, onNavigate, visible }) => {
  if (!visible) return null;

  const progress = (activeIndex / (SLIDES.length - 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(12,12,12,0.90)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Label row */}
      <div
        className="flex items-center justify-between"
        style={{ height: 36, padding: '0 24px' }}
      >
        {/* Left: logo + slide name */}
        <div className="flex items-center gap-4">
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 900,
            fontSize: 16,
            color: '#FFFFFF',
          }}>
            AOM<span style={{ color: COLORS.orange }}>.</span>
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: COLORS.textMuted,
              }}
            >
              {SLIDES[activeIndex]?.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Right: slide counter */}
        <span style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 400,
          fontSize: 11,
          color: '#5A5550',
        }}>
          {activeIndex + 1} / {SLIDES.length}
        </span>
      </div>

      {/* Progress fill */}
      <div style={{ height: 3, background: '#1A1A1A', position: 'relative' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: COLORS.orange,
            boxShadow: '0 0 8px rgba(232,93,38,0.3)',
          }}
        />
        {/* Clickable zones for navigation */}
        <div className="absolute inset-0 flex">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              onClick={() => onNavigate(i)}
              className="flex-1 cursor-pointer"
              style={{ background: 'transparent', border: 'none' }}
              aria-label={`Navigate to ${slide.label}`}
              title={slide.label}
            />
          ))}
        </div>
      </div>
    </motion.div>
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
              fontSize: 16,
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

      <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
        borderBottom: '2px solid rgba(255,255,255,0.15)',
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
      fontSize: 16,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);

// ── Nav Bar (Hero only, progress bar replaces on slides 2-8) ─────────────────
const NavBar = ({ activeIndex, onNavigate, onContactOpen }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHero = activeIndex === 0;

  const navLinks = [
    { label: 'Work', slideIndex: 2 },
    { label: 'Services', slideIndex: 3 },
    { label: 'AI Advisory', href: '/system' },
    { label: 'Contact', slideIndex: 7 },
  ];

  // Only show full nav on hero slide. Progress bar handles slides 2-8.
  if (!isHero && !mobileOpen) return null;

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-[45] flex items-center justify-between transition-all duration-300"
        style={{
          height: 64,
          padding: '0 24px',
          background: 'rgba(12,12,12,0.4)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <a
          href="/v2#hero"
          onClick={(e) => { e.preventDefault(); onNavigate(0); }}
          style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 24, color: '#FFFFFF', textDecoration: 'none' }}
        >
          AOM<span style={{ color: COLORS.orange }}>.</span>
        </a>

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
                fontSize: 16,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: COLORS.textMuted,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.target.style.color = COLORS.textLight; }}
              onMouseLeave={(e) => { e.target.style.color = COLORS.textMuted; }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <button onClick={() => setMobileOpen(true)} className="md:hidden" style={{ color: COLORS.textMuted, background: 'none', border: 'none' }}>
          <Menu size={24} />
        </button>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6"
            style={{ background: COLORS.night }}
          >
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4" style={{ color: COLORS.textMuted, background: 'none', border: 'none' }}>
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
      <motion.div variants={staggerChild} className="flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-6" style={{ color: COLORS.orange }}>&#10003;</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 28, color: COLORS.cream, textTransform: 'uppercase' }}>
            Brief Received.
          </h3>
          <p className="mt-4" style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, color: COLORS.textMuted }}>
            A creative lead will reply within 24 hours.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerChild} style={{ maxWidth: 480 }} className="space-y-6">
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
    </motion.div>
  );
};

// ── Gumlet Video with Fade-In ────────────────────────────────────────────────
const GumletVideo = ({ videoId, className = '', style = {}, eager = false, title = 'Video' }) => {
  const [loaded, setLoaded] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative ${className}`} style={style}>
      {/* Solid background while loading */}
      <div className="absolute inset-0" style={{ background: COLORS.night }} />
      <iframe
        ref={iframeRef}
        src={`https://play.gumlet.io/embed/${videoId}?autoplay=true&muted=true&loop=true&background=true`}
        className="absolute inset-0 w-full h-full border-none transition-opacity duration-[600ms] ease-out"
        style={{ pointerEvents: 'none', opacity: loaded ? 1 : 0 }}
        loading={eager ? 'eager' : 'lazy'}
        title={title}
        allow="autoplay; encrypted-media"
      />
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ── SLIDE CONTENT COMPONENTS ────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

const contentMax = 'max-w-[1200px] mx-auto w-full';
const slidePadding = 'px-6 md:px-12 lg:px-24';

// ── Slide 1: Hero ────────────────────────────────────────────────────────────
const HeroSlide = ({ heroVideoId, onNavigateNext }) => (
  <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ background: COLORS.night }}>
    {/* Video background (persistent, mounted outside AnimatePresence) */}
    <div className="absolute inset-0 z-0">
      <GumletVideo videoId={heroVideoId} className="w-full h-full" eager title="Hero Background" />
      <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.50)' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 30%, #0C0C0C 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 85%, #0C0C0C 100%)' }} />
    </div>

    <FilmGrain />

    <motion.div
      className="relative z-20 text-center flex flex-col items-center w-full px-6"
      variants={staggerContainer}
      initial="enter"
      animate="center"
    >
      <motion.p
        variants={staggerChild}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: COLORS.textMuted,
          marginBottom: 16,
        }}
      >
        CREATIVE PRODUCTION + AI SYSTEMS
      </motion.p>

      <motion.h1
        variants={staggerChild}
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(36px, 7vw, 80px)',
          lineHeight: 0.92,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          color: COLORS.cream,
          maxWidth: 900,
          width: '100%',
          padding: '0 12px',
        }}
      >
        WE MAKE COMPANIES IMPOSSIBLE TO IGNORE.
      </motion.h1>

      <motion.p
        variants={staggerChild}
        style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 400,
          fontSize: 'clamp(16px, 2vw, 20px)',
          lineHeight: 1.5,
          color: COLORS.textMuted,
          maxWidth: 600,
          marginTop: 24,
        }}
      >
        Story-driven production systems for teams that need trust, speed, and outcomes.
      </motion.p>

      {/* Status bar */}
      <motion.div
        variants={staggerChildFade}
        className="hidden md:flex items-center gap-4 mt-16"
        style={{ opacity: 0.7 }}
      >
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
      </motion.div>

      {/* Down arrow (hero only per Steffen spec) */}
      <motion.button
        variants={staggerChildFade}
        onClick={onNavigateNext}
        className="mt-12 transition-colors duration-200 cursor-pointer"
        style={{ color: COLORS.textMuted, background: 'none', border: 'none' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.orange; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted; }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={24} />
        </motion.div>
      </motion.button>
    </motion.div>
  </div>
);

// ── Slide 2: The Hook ────────────────────────────────────────────────────────
const HookSlide = () => (
  <div className="relative w-full h-full flex items-center justify-center" style={{ background: COLORS.nightCard }}>
    <motion.div
      className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-[55%_45%] gap-16`}
      variants={staggerContainer}
      initial="enter"
      animate="center"
    >
      <div>
        <motion.p variants={staggerChild} style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: COLORS.textMuted,
          marginBottom: 16,
        }}>
          WHY AOM
        </motion.p>

        <motion.h2 variants={staggerChild} style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(34px, 5vw, 52px)',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          color: COLORS.cream,
        }}>
          SMALL TEAM. CINEMA-GRADE. NO BS.
        </motion.h2>

        <motion.p variants={staggerChild} style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.6,
          color: COLORS.textMuted,
          marginTop: 24,
          maxWidth: '45ch',
        }}>
          No layers of account managers. No scope creep. You talk to the people doing the work.
        </motion.p>
      </div>

      {/* Stats 2x2 */}
      <motion.div
        className="grid grid-cols-2 gap-8"
        variants={{ center: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
        initial="enter"
        animate="center"
      >
        {TRUST_STATS.map((stat) => (
          <motion.div key={stat.label} variants={staggerChild} style={{ borderLeft: '2px solid rgba(232,93,38,0.2)', paddingLeft: 20 }}>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(20px, 2.2vw, 32px)',
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
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  </div>
);

// ── Slide 3: The Work ────────────────────────────────────────────────────────
const WorkSlide = () => (
  <div className="relative w-full h-full flex flex-col items-center justify-center" style={{ background: COLORS.night }}>
    <div className="absolute top-20 left-6 md:left-12 z-10">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0 }}
        style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: COLORS.textMuted,
        }}
      >
        THE WORK
      </motion.p>
    </div>

    <motion.div
      className="w-full flex-1 flex items-center justify-center px-6 md:px-12 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
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
        <GumletVideo videoId={HERO_VIDEOS[1]} className="w-full h-full" title="Portfolio Reel" />
        <div className="absolute inset-0" style={{ background: 'rgba(12,12,12,0.35)' }} />

        <motion.div
          className="absolute bottom-12 left-12 z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
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
        </motion.div>
      </div>
    </motion.div>

    {/* Thumbnail selectors */}
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10"
      variants={{ center: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } } }}
      initial="enter"
      animate="center"
    >
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          variants={staggerChild}
          className="transition-all duration-200 cursor-pointer"
          style={{
            width: 80,
            height: 56,
            border: `2px solid ${i === 0 ? COLORS.orange : 'rgba(255,255,255,0.1)'}`,
            background: i === 0 ? 'rgba(232,93,38,0.1)' : 'rgba(255,255,255,0.03)',
          }}
        />
      ))}
    </motion.div>
  </div>
);

// ── Slide 4: Services ────────────────────────────────────────────────────────
const ServicesSlide = () => (
  <div className="relative w-full h-full flex items-center justify-center" style={{ background: COLORS.deepWarm }}>
    <motion.div
      className={`${contentMax} ${slidePadding} text-center`}
      variants={staggerContainer}
      initial="enter"
      animate="center"
    >
      <motion.p variants={staggerChild} style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginBottom: 16,
      }}>
        WHAT WE DO
      </motion.p>

      <motion.h2 variants={staggerChild} style={{
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
      </motion.h2>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        style={{ maxWidth: 1140 }}
        variants={{ center: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } } }}
        initial="enter"
        animate="center"
      >
        {SERVICES.map((svc) => (
          <motion.div
            key={svc.title}
            variants={staggerChild}
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
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: COLORS.orange,
            }}>
              {svc.cta} <ArrowRight size={16} />
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  </div>
);

// ── Slide 5: Construction ────────────────────────────────────────────────────
const ConstructionSlide = ({ onOpenDrawer }) => (
  <div className="relative w-full h-full flex items-center justify-center" style={{ background: COLORS.night }}>
    <div className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-2 gap-12`}>
      <motion.div
        variants={{ center: { transition: { staggerChildren: 0.1, delayChildren: 0 } } }}
        initial="enter"
        animate="center"
      >
        <motion.p variants={staggerChild} style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: COLORS.orange,
          marginBottom: 16,
        }}>
          CONSTRUCTION
        </motion.p>

        <motion.h2 variants={staggerChild} style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(34px, 5vw, 52px)',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          color: COLORS.cream,
        }}>
          YOUR CREWS BUILD IT. WE MAKE SURE PEOPLE SEE IT.
        </motion.h2>

        <motion.p variants={staggerChild} style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.6,
          color: COLORS.textMuted,
          marginTop: 24,
          maxWidth: '40ch',
        }}>
          Construction companies are underserved by serious social media. The budgets are there, the need is real.
        </motion.p>

        <motion.div
          className="mt-8 space-y-4"
          variants={{ center: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
          initial="enter"
          animate="center"
        >
          {[
            'Recruit top crews through the content they already scroll',
            'Win bids with a presence that proves your capability',
            'Stand out from the sea of competitors with no online presence',
          ].map((point, i) => (
            <motion.div key={i} variants={staggerChild} className="flex items-start gap-3">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.orange, marginTop: 8, flexShrink: 0 }} />
              <span style={{
                fontFamily: '"Space Grotesk", sans-serif',
                fontWeight: 400,
                fontSize: 16,
                color: COLORS.textMuted,
              }}>
                {point}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div variants={staggerChild}>
          <button
            onClick={onOpenDrawer}
            className="mt-10 transition-all duration-200"
            style={{
              background: COLORS.orange,
              color: COLORS.cream,
              fontFamily: 'Syne, sans-serif',
              fontWeight: 800,
              fontSize: 16,
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
        </motion.div>
      </motion.div>

      {/* Right: Construction video (4:5 portrait) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="relative overflow-hidden w-full min-h-[400px]"
        style={{
          border: `2px solid ${COLORS.border}`,
          aspectRatio: '4/5',
          maxHeight: '70vh',
        }}
      >
        <GumletVideo videoId={HERO_VIDEOS[2]} className="w-full h-full" title="Construction Content" />
      </motion.div>
    </div>
  </div>
);

// ── Slide 6: AI Advisory ─────────────────────────────────────────────────────
const AISlide = () => (
  <div className="relative w-full h-full flex items-center justify-center" style={{ background: COLORS.nightCard }}>
    <div className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-[40%_60%] gap-16`}>
      <motion.div
        variants={{ center: { transition: { staggerChildren: 0.1, delayChildren: 0 } } }}
        initial="enter"
        animate="center"
      >
        <motion.p variants={staggerChild} style={{
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: COLORS.sage,
          marginBottom: 16,
        }}>
          AI OPERATIONS
        </motion.p>

        <motion.h2 variants={staggerChild} style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(34px, 5vw, 52px)',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          textTransform: 'uppercase',
          color: COLORS.cream,
        }}>
          THE NEXT GEEK SQUAD FOR AI.
        </motion.h2>

        <motion.p variants={staggerChild} style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.6,
          color: COLORS.textMuted,
          marginTop: 24,
          maxWidth: '35ch',
        }}>
          We built this system for ourselves first. Now we're opening it up to businesses that need AI operations without the overhead.
        </motion.p>

        <motion.p variants={staggerChild} style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 28,
          color: COLORS.sage,
          marginTop: 32,
        }}>
          Starting at $2,500
        </motion.p>

        <motion.div variants={staggerChild}>
          <a
            href="/system"
            className="inline-flex items-center gap-2 mt-6 transition-opacity duration-200 hover:opacity-80"
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontWeight: 600,
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: COLORS.sage,
              textDecoration: 'none',
            }}
          >
            EXPLORE THE SYSTEM <ArrowRight size={16} />
          </a>
        </motion.div>
      </motion.div>

      {/* Step cards */}
      <motion.div
        className="space-y-5"
        variants={{ center: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } }}
        initial="enter"
        animate="center"
      >
        {AI_STEPS.map((step) => (
          <motion.div
            key={step.num}
            variants={staggerChild}
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
                fontSize: 16,
                lineHeight: 1.5,
                color: COLORS.textMuted,
                marginTop: 8,
              }}>
                {step.body}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </div>
);

// ── Slide 7: Social Proof ────────────────────────────────────────────────────
const ProofSlide = () => (
  <div className="relative w-full h-full flex items-center justify-center" style={{ background: COLORS.deepWarm }}>
    <motion.div
      className={`${contentMax} ${slidePadding} text-center`}
      variants={staggerContainer}
      initial="enter"
      animate="center"
    >
      <motion.p variants={staggerChild} style={{
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginBottom: 16,
      }}>
        WHAT THEY SAY
      </motion.p>

      <motion.h2 variants={staggerChild} style={{
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
      </motion.h2>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
        variants={{ center: { transition: { staggerChildren: 0.15, delayChildren: 0.25 } } }}
        initial="enter"
        animate="center"
      >
        {TESTIMONIALS.map((t) => (
          <motion.div
            key={t.name}
            variants={staggerChild}
            className="h-full transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '40px 32px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,93,38,0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
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

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '20px 0' }} />

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
              fontSize: 16,
              color: COLORS.textMuted,
              marginTop: 4,
            }}>
              {t.company} / {t.industry}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  </div>
);

// ── Slide 8: Contact ─────────────────────────────────────────────────────────
const ContactSlide = () => (
  <div className="relative w-full h-full flex items-center justify-center" style={{ background: COLORS.night }}>
    <FilmGrain />

    <motion.div
      className={`${contentMax} ${slidePadding} grid grid-cols-1 lg:grid-cols-[45%_55%] gap-16 relative z-20`}
      variants={{ center: { transition: { staggerChildren: 0.1, delayChildren: 0 } } }}
      initial="enter"
      animate="center"
    >
      <div>
        <motion.h2 variants={staggerChild} style={{
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
        </motion.h2>

        <motion.p variants={staggerChild} style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 400,
          fontSize: 18,
          lineHeight: 1.6,
          color: COLORS.textMuted,
          marginTop: 24,
          maxWidth: '35ch',
        }}>
          Tell us what you need. We'll tell you exactly how we'd do it.
        </motion.p>

        <motion.div variants={staggerChild} style={{ width: 80, height: 1, background: 'rgba(255,255,255,0.08)', margin: '32px 0' }} />

        <motion.div variants={staggerChild} className="space-y-3">
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
        </motion.div>
      </div>

      <ContactFormInline />
    </motion.div>
  </div>
);

// ── Keep Exploring Section ───────────────────────────────────────────────────
const KeepExploring = () => (
  <div style={{ background: COLORS.charcoal }}>
    <div style={{
      height: 6,
      width: '100%',
      background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(232,93,38,0.08) 5px, rgba(232,93,38,0.08) 6px)',
    }} />

    <div style={{ padding: '80px 0 48px' }}>
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
                fontSize: 16,
                color: COLORS.textMuted,
                marginTop: 8,
              }}>
                {card.desc}
              </p>
            </a>
          ))}
        </div>

        <div className="text-center mt-16 pt-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
            fontSize: 16,
            color: COLORS.textMuted,
          }}>
            &copy; {new Date().getFullYear()} Ahead of Market. Phoenix, AZ.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// ── MAIN V2 PAGE ─────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function V2() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const reduced = usePrefersReducedMotion();

  // Random hero video (stable across re-renders)
  const heroVideoId = useMemo(() => HERO_VIDEOS[Math.floor(Math.random() * HERO_VIDEOS.length)], []);

  // ── Navigate to slide ────────────────────────────────────────────────────
  const navigateToSlide = useCallback((index) => {
    if (isTransitioning || drawerOpen) return;
    if (index === activeIndex) return;
    if (index < 0 || index >= SLIDES.length) return;

    // If on last slide and trying to go forward, show Keep Exploring
    if (index >= SLIDES.length) {
      setShowExplore(true);
      return;
    }

    // Coming back from Keep Exploring
    if (showExplore) {
      setShowExplore(false);
    }

    setDirection(index > activeIndex ? 1 : -1);
    setIsTransitioning(true);
    setActiveIndex(index);

    // Update URL hash
    const hash = `#${SLIDES[index].id}`;
    if (window.location.hash !== hash) {
      history.replaceState(null, '', `/v2${hash}`);
    }

    // Release transition lock after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, reduced ? 200 : 600);
  }, [activeIndex, isTransitioning, drawerOpen, showExplore, reduced]);

  // ── Wheel / trackpad debounced navigation ────────────────────────────────
  useEffect(() => {
    const handleWheel = (e) => {
      if (drawerOpen || isTransitioning) return;

      // If showing Keep Exploring, allow normal scroll
      if (showExplore) return;

      e.preventDefault();

      // Threshold: require intentional scroll
      if (Math.abs(e.deltaY) < 30) return;

      if (e.deltaY > 0) {
        // Scrolling down
        if (activeIndex === SLIDES.length - 1) {
          setShowExplore(true);
        } else {
          navigateToSlide(activeIndex + 1);
        }
      } else {
        // Scrolling up
        navigateToSlide(activeIndex - 1);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [activeIndex, isTransitioning, drawerOpen, showExplore, navigateToSlide]);

  // ── Touch / swipe navigation ─────────────────────────────────────────────
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (drawerOpen || isTransitioning || showExplore) return;

      const deltaY = touchStartY - e.changedTouches[0].clientY;

      // Require >50px swipe per Steffen spec
      if (Math.abs(deltaY) < 50) return;

      if (deltaY > 0) {
        // Swipe up (forward)
        if (activeIndex === SLIDES.length - 1) {
          setShowExplore(true);
        } else {
          navigateToSlide(activeIndex + 1);
        }
      } else {
        // Swipe down (backward)
        navigateToSlide(activeIndex - 1);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeIndex, isTransitioning, drawerOpen, showExplore, navigateToSlide]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (drawerOpen) return;

      if (showExplore && (e.key === 'ArrowUp' || e.key === 'PageUp')) {
        e.preventDefault();
        setShowExplore(false);
        return;
      }

      let target = null;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        if (activeIndex === SLIDES.length - 1) {
          setShowExplore(true);
          return;
        }
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
  }, [activeIndex, drawerOpen, showExplore, navigateToSlide]);

  // ── Hash-based initial slide ─────────────────────────────────────────────
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const idx = SLIDES.findIndex((s) => s.id === hash);
      if (idx >= 0) {
        setActiveIndex(idx);
        setDirection(1);
      }
    }
  }, []);

  const showProgressBar = activeIndex > 0 && !showExplore;
  const showContactButton = activeIndex < 7 && !showExplore;

  // ── Render current slide content ─────────────────────────────────────────
  const renderSlide = () => {
    switch (activeIndex) {
      case 0: return <HeroSlide heroVideoId={heroVideoId} onNavigateNext={() => navigateToSlide(1)} />;
      case 1: return <HookSlide />;
      case 2: return <WorkSlide />;
      case 3: return <ServicesSlide />;
      case 4: return <ConstructionSlide onOpenDrawer={() => setDrawerOpen(true)} />;
      case 5: return <AISlide />;
      case 6: return <ProofSlide />;
      case 7: return <ContactSlide />;
      default: return <HeroSlide heroVideoId={heroVideoId} onNavigateNext={() => navigateToSlide(1)} />;
    }
  };

  // ── Keep Exploring view ──────────────────────────────────────────────────
  if (showExplore) {
    return (
      <div
        className="text-white antialiased selection:bg-orange-600 min-h-screen"
        style={{ fontFamily: '"Space Grotesk", sans-serif', background: COLORS.charcoal }}
      >
        {/* Back to presentation button */}
        <div className="fixed top-0 left-0 right-0 z-50" style={{
          background: 'rgba(12,12,12,0.90)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div className="flex items-center justify-between" style={{ height: 44, padding: '0 24px' }}>
            <button
              onClick={() => setShowExplore(false)}
              className="flex items-center gap-2 transition-colors duration-150 cursor-pointer"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontWeight: 500,
                fontSize: 11,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: COLORS.textMuted,
                background: 'none',
                border: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.orange; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted; }}
            >
              &larr; BACK TO SITE
            </button>
            <span style={{
              fontFamily: 'Syne, sans-serif',
              fontWeight: 900,
              fontSize: 16,
              color: '#FFFFFF',
            }}>
              AOM<span style={{ color: COLORS.orange }}>.</span>
            </span>
          </div>
        </div>

        <div style={{ paddingTop: 44 }}>
          <KeepExploring />
        </div>
      </div>
    );
  }

  // ── Main presentation view ───────────────────────────────────────────────
  return (
    <div
      className="text-white antialiased selection:bg-orange-600"
      style={{ fontFamily: '"Space Grotesk", sans-serif', background: COLORS.night }}
    >
      <NavBar activeIndex={activeIndex} onNavigate={navigateToSlide} onContactOpen={() => setDrawerOpen(true)} />
      <ProgressBar activeIndex={activeIndex} onNavigate={navigateToSlide} visible={showProgressBar} />
      <FloatingContact visible={showContactButton} onOpen={() => setDrawerOpen(true)} />
      <ContactDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Full-viewport slide container */}
      <div className="h-screen h-[100dvh] overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeIndex}
            custom={direction}
            variants={reduced ? reducedSlideVariants : slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={reduced
              ? { duration: 0.2, ease: 'easeOut' }
              : { ...slideTransition, duration: direction > 0 ? slideTransition.enter.duration : slideTransition.exit.duration }
            }
            className="absolute inset-0"
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
