import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronDown, Camera, Film, Globe, Instagram, Linkedin, MapPin, Calendar, Clock, DollarSign, TrendingUp, Video, Image, Mic, FileText, ArrowRight, Star, Flame, Zap, Play, Hash, Users, BarChart3, Layers, Eye, Monitor } from 'lucide-react';

/* ================================================================== */
/*  GOOGLE FONTS -- Barlow Condensed + Inter                           */
/* ================================================================== */
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap';
fontLink.rel = 'stylesheet';
if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
  document.head.appendChild(fontLink);
}

/* ================================================================== */
/*  AMBITION BRAND DESIGN TOKENS                                       */
/* ================================================================== */
const C = {
  navy950: '#070b1e',
  navy900: '#0a0e2a',
  navy800: '#111638',
  navy700: '#1a1f45',
  navy600: '#1a237e',
  navy500: '#283593',
  navy400: '#3949ab',
  navy300: '#5c6bc0',
  red700: '#991b1b',
  red600: '#b91c1c',
  red500: '#dc2626',
  red400: '#ef4444',
  red300: '#f87171',
  flame500: '#ea580c',
  flame400: '#f97316',
  white: '#ffffff',
  offWhite: '#f8fafc',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  navyBorder: 'rgba(57,73,171,0.25)',
  navyBorderLight: 'rgba(57,73,171,0.12)',
};

const F = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Inter', system-ui, sans-serif",
};

/* ── SEO ────────────────────────────────────────────────────────── */
function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Mechanical Services | Performance Report';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Ambition Mechanical Services x AOM: 11-month performance report. 37 shoots. 3,138 video files. 3 TB of footage. $78k+ in delivered value.');
    setMeta('og:title', 'Ambition Mechanical Services | Performance Report', true);
    setMeta('og:description', '37 shoots. 3,138 video files. 713 photos. 3 TB of footage. 1 custom website. 11 months of creative production.', true);
    setMeta('og:type', 'article', true);
  }, []);
}

/* ── Noise overlay ─────────────────────────────────────────────── */
function NoiseOverlay({ opacity = 0.03 }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{
        opacity,
        mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
      }}
    />
  );
}

/* ── Scroll reveal wrapper ─────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  return (
    <motion.div
      ref={ref}
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: prefersReduced ? 0 : 0.7, delay: prefersReduced ? 0 : delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Count-up hook ─────────────────────────────────────────────── */
function useCountUp(end, duration = 1400, inView = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, inView]);
  return value;
}

/* ── Section Label ─────────────────────────────────────────────── */
function SectionLabel({ label, centered = false }) {
  return (
    <div className={centered ? 'text-center' : ''} style={{ marginBottom: 24 }}>
      <p style={{
        fontFamily: F.display,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: C.red500,
        marginBottom: 12,
      }}>{label}</p>
      <div style={{
        width: 48,
        height: 2,
        background: C.red500,
        margin: centered ? '0 auto' : 0,
      }} />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════════════ */

const heroStats = [
  { number: 37, suffix: '', label: 'Professional Video Shoots', context: 'May 2025 through March 2026' },
  { number: 3138, suffix: '', label: 'Video Files Captured', context: '3 TB of raw + finished footage' },
  { number: 713, suffix: '', label: 'Professional Photos', context: 'Stills, aerials, DNG raws' },
  { number: 23, suffix: '', label: 'Finished Video Exports', context: 'Edited, color-graded, delivered' },
  { number: 22, suffix: '+', label: 'Job Sites Documented', context: 'Premium client locations' },
  { number: 1, suffix: '', label: 'Custom Website', context: 'Built and launched March 2026' },
];

const shoots = [
  { month: 'May 2025', name: 'Fashion Square, Scottsdale', details: 'Retail HVAC, drone + handheld', type: 'Commercial' },
  { month: 'May 2025', name: 'Sossaman Warehouse', details: 'Commercial, drone + handheld', type: 'Commercial' },
  { month: 'Jun 2025', name: 'Novus Place (The Melt)', details: 'Commercial restaurant, drone + cinema camera', type: 'Restaurant' },
  { month: 'Jun 2025', name: 'Laborers', details: 'Crew/people shoot, Ronin 4D cinema clips', type: 'Team' },
  { month: 'Jun 2025', name: 'Novus Place (Return)', details: 'Follow-up coverage', type: 'Restaurant' },
  { month: 'Jun 2025', name: 'Fashion Square (Return)', details: '278 files, Din Tai Fung flagship', type: 'Commercial' },
  { month: 'Jul 2025', name: 'Apple Store Chandler', details: 'Premium retail installation', type: 'Retail' },
  { month: 'Jul 2025', name: 'Apple Store Chandler', details: 'ProRes raw footage session', type: 'Retail' },
  { month: 'Aug 2025', name: 'Memorial Tower', details: 'Senior living, drone + cinema + 63 photos', type: 'Healthcare' },
  { month: 'Aug 2025', name: 'Ambition Office', details: 'Brand/team shoot, 45 clips + 182 photos', type: 'Brand' },
  { month: 'Sep 2025', name: 'Memorial Tower (Return)', details: '73 cinema + 21 drone + 169 photos', type: 'Healthcare' },
  { month: 'Sep 2025', name: 'Arrowhead', details: 'Industrial, massive drone coverage', type: 'Industrial' },
  { month: 'Sep 2025', name: 'Din Tai Fung (Day 1)', details: 'Restaurant, lav audio interviews', type: 'Restaurant' },
  { month: 'Sep 2025', name: 'Primrose', details: 'Healthcare, organized and edit-ready', type: 'Healthcare' },
  { month: 'Sep 2025', name: 'Din Tai Fung (Day 2)', details: '299 files, every camera type', type: 'Restaurant' },
  { month: 'Oct 2025', name: 'Abrazo Healthcare', details: 'Emergency response, drone + cinema', type: 'Healthcare' },
  { month: 'Oct 2025', name: 'Ritz Carlton / LifeSkills', details: 'Luxury hospitality installation', type: 'Luxury' },
  { month: 'Oct 2025', name: 'Esplanade', details: 'Luxury property, 80+ photos', type: 'Luxury' },
  { month: 'Oct 2025', name: 'Fashion Square (3rd Visit)', details: 'Aerial DNG raw files', type: 'Commercial' },
  { month: 'Oct 2025', name: 'Laborers (2nd Shoot)', details: 'Crew follow-up', type: 'Team' },
  { month: 'Nov 2025', name: 'Breakthrough', details: 'Commercial drone coverage', type: 'Commercial' },
  { month: 'Nov 2025', name: 'CEVA', details: 'Industrial/logistics', type: 'Industrial' },
  { month: 'Dec 2025', name: 'Refined Gardens', details: 'Full multi-camera + audio', type: 'Luxury' },
  { month: 'Dec 2025', name: 'INEOS Grenadier', details: 'Premium brand, full coverage', type: 'Brand' },
  { month: 'Dec 2025', name: 'Refined Gardens (Return)', details: '446 photos', type: 'Luxury' },
  { month: 'Dec 2025', name: 'Teleferic + Tiffany\'s + Loro Piano', details: '3 venues, 1 shoot', type: 'Luxury' },
  { month: 'Dec 2025', name: 'LifeSkills', details: 'Multi-camera production', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower (Return)', details: '123 cinema clips, massive session', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Audio interviews', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Heavy cinema production', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Long takes', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'BlackMagic footage', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Memorial Tower', details: 'Quick check-in', type: 'Healthcare' },
  { month: 'Jan 2026', name: 'Gilmore', details: 'Organized b-roll + interviews', type: 'Commercial' },
  { month: 'Feb 2026', name: 'Memorial Tower Insulation', details: '87 cinema clips, 157 photos', type: 'Healthcare' },
  { month: 'Feb 2026', name: 'Roka Akor', details: 'Premium restaurant shoot', type: 'Restaurant' },
  { month: 'Mar 2026', name: 'Crown / Memorial Tower', details: 'Most recent production', type: 'Healthcare' },
];

const highProfileClients = [
  'Apple Store', 'Ritz Carlton', 'Tiffany\'s', 'INEOS Grenadier', 'Roka Akor',
  'Din Tai Fung', 'Abrazo Healthcare', 'Banner Health', 'Louis Vuitton', 'Loro Piano', 'Memorial Tower',
];

const equipment = [
  { name: 'DJI Air 3 / Air 3S', type: 'Drone', detail: '25+ aerial sessions' },
  { name: 'DJI Ronin 4D', type: 'Cinema Camera', detail: 'Feature-film grade footage' },
  { name: 'Panasonic S5IIX', type: 'Photo/Video', detail: 'Hybrid stills and motion' },
  { name: 'DJI OSMO Action 3', type: 'Action Cam', detail: 'Dynamic POV coverage' },
  { name: 'BlackMagic Camera App', type: 'Mobile Cinema', detail: 'Professional mobile capture' },
  { name: 'DJI Mic', type: 'Professional Audio', detail: 'Crystal-clear interviews' },
];

const contentArsenal = [
  { number: 48, label: 'Branded Video Templates', desc: 'Custom motion graphics system' },
  { number: 17, label: 'Professional Video Edits', desc: 'Polished edit iterations' },
  { number: 18, label: 'Branded Post Designs', desc: 'On-brand social content' },
  { number: 14, label: 'Voiceover Recordings', desc: 'Professional narration' },
  { number: 30, label: 'Day Content Calendar', desc: 'With 28 planned pieces' },
  { number: 6, label: 'Content Pillars Defined', desc: 'Strategic framework' },
];

const valueComparison = [
  { item: '37 Professional Shoots', rate: '$800 avg per shoot', value: '$29,600' },
  { item: '88+ Video Edits', rate: '$300 avg per edit', value: '$26,400' },
  { item: 'Custom Website', rate: 'Design + Dev + CMS', value: '$6,000' },
  { item: 'Brand & Content Strategy', rate: 'Guidelines + Pillars + Calendar', value: '$5,000' },
  { item: 'Social Media Management', rate: '11 months of posting', value: '$11,000' },
];

const hoursBreakdown = [
  { activity: 'On-Site Production', calc: '37 shoots x 4hrs avg', hours: 148 },
  { activity: 'Travel to Sites', calc: '37 shoots x 2hrs avg', hours: 74 },
  { activity: 'Post-Production', calc: 'Editing, color, export', hours: 111 },
  { activity: 'Website Design & Dev', calc: 'React + Firebase + Tailwind', hours: 80 },
  { activity: 'Content Strategy', calc: 'Planning + guidelines', hours: 40 },
  { activity: 'Social Media Management', calc: 'Posting + scheduling', hours: 40 },
];

const brandedVideos = [
  { title: 'Rooftop Unit Signs', category: 'Education' },
  { title: 'Pressure Test', category: 'The Work' },
  { title: '25 vs 40 Ton', category: 'Education' },
  { title: 'Startup Checklist', category: 'Education' },
  { title: 'Crane Day Prep', category: 'The Work' },
  { title: 'Inspection Signoff', category: 'The Work' },
  { title: '12-Story Pipe Run', category: 'The Work' },
  { title: 'PHX HVAC Numbers', category: 'Local' },
  { title: 'HVAC Lead Times', category: 'Education' },
  { title: 'Data Centers', category: 'The Work' },
  { title: 'Refrigerant Rules', category: 'Education' },
  { title: 'GC Expo', category: 'Social Proof' },
  { title: 'ABA Mixer', category: 'Social Proof' },
  { title: 'ACCA Conference', category: 'Social Proof' },
  { title: 'Crew / 500 Projects', category: 'Team' },
  { title: 'Day on Roof', category: 'The Work' },
  { title: 'The Shop', category: 'Team' },
  { title: 'Year in Review', category: 'Brand' },
];

const memorialTowerEdits = [
  { title: 'Memorial Tower v1', category: 'Project Showcase' },
  { title: 'Memorial Tower v2', category: 'Project Showcase' },
  { title: 'Memorial Tower v3', category: 'Project Showcase' },
  { title: 'Memorial Tower v4', category: 'Project Showcase' },
  { title: 'AE-13 The Drop', category: 'Social Edit' },
];

const contentPillars = [
  { name: 'The Work', desc: 'Jobs completed, equipment installed, rooftop units, pipe runs', icon: Flame },
  { name: 'Before / After', desc: 'Project transformations that show the impact of the work', icon: Layers },
  { name: 'Education / Tips', desc: 'Seasonal HVAC knowledge, maintenance tips, industry insights', icon: FileText },
  { name: 'Team / Trust', desc: 'Crew introductions, behind-the-scenes, company culture', icon: Users },
  { name: 'Local / Phoenix', desc: 'Desert context, Phoenix market, community presence', icon: MapPin },
  { name: 'Social Proof', desc: 'Reviews, testimonials, industry events, client wins', icon: Star },
];

const typeColors = {
  Commercial: C.red500,
  Restaurant: C.flame400,
  Team: C.navy300,
  Retail: C.red400,
  Healthcare: C.navy300,
  Brand: C.red500,
  Industrial: C.gray400,
  Luxury: C.flame400,
};

const videoCategoryColors = {
  'Education': C.navy300,
  'The Work': C.red500,
  'Local': C.flame400,
  'Social Proof': C.gray400,
  'Team': C.navy400,
  'Brand': C.red400,
  'Project Showcase': C.navy300,
  'Social Edit': C.flame500,
};

/* ════════════════════════════════════════════════════════════════
   NAV (Ambition Standalone)
   ════════════════════════════════════════════════════════════════ */
function AmbitionNav() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(7,11,30,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.navyBorder}`,
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontFamily: F.display,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: C.white,
          }}>AMBITION</span>
          <span style={{
            fontFamily: F.display,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: C.gray500,
          }}>MECHANICAL SERVICES</span>
        </div>
        <span style={{
          fontFamily: F.display,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: C.red500,
          border: `1px solid ${C.red500}`,
          borderRadius: 100,
          padding: '6px 16px',
        }}>PERFORMANCE REPORT</span>
      </div>
    </nav>
  );
}

/* ════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const scrollToNext = () => {
    const el = document.getElementById('section-stats');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: C.navy950,
    }}>
      <NoiseOverlay />
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(ellipse 60% 40% at 50% 20%, rgba(220,38,38,0.08), transparent)`,
      }} />

      <div style={{ position: 'relative', zIndex: 10, maxWidth: 900, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <Reveal>
          <p style={{
            fontFamily: F.display,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: C.gray500,
            marginBottom: 16,
          }}>CLIENT PERFORMANCE REPORT</p>
        </Reveal>

        <Reveal delay={0.1}>
          <div style={{ width: 48, height: 2, background: C.red500, margin: '0 auto 28px' }} />
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.display,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: C.red500,
            marginBottom: 24,
          }}>APRIL 2025 &mdash; MARCH 2026</p>
        </Reveal>

        <Reveal delay={0.2}>
          <h1 style={{
            fontFamily: F.display,
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 0.95,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            AMBITION<br />MECHANICAL<br />SERVICES
          </h1>
        </Reveal>

        <Reveal delay={0.35}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            marginTop: 32,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.7,
          }}>
            11 months of creative production partnership. 37 shoots. 3,138 video files. 3 TB of footage. 713 photos. 1 custom website. Here's everything we've built together.
          </p>
        </Reveal>

        <Reveal delay={0.45}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
            <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gray500 }}>Produced by</span>
            <span style={{ fontFamily: F.display, fontSize: 14, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.red500 }}>AOM</span>
            <span style={{ color: C.gray500, fontSize: 11 }}>|</span>
            <span style={{ fontFamily: F.display, fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.gray500 }}>Phoenix, AZ</span>
          </div>
        </Reveal>
      </div>

      <button
        onClick={scrollToNext}
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.5,
          zIndex: 10,
        }}
      >
        <span style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: C.gray500 }}>
          SEE THE RESULTS
        </span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}>
          <ChevronDown size={16} color={C.gray500} />
        </motion.div>
      </button>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   BY THE NUMBERS
   ════════════════════════════════════════════════════════════════ */
function StatCard({ number, suffix = '', prefix = '', label, context, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const countValue = useCountUp(number, 1400, isInView);

  return (
    <Reveal delay={index * 0.1}>
      <div ref={ref} style={{
        textAlign: 'center',
        padding: 32,
        background: C.navy800,
        border: `1px solid ${C.navyBorder}`,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.4s',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.red500 }} />
        <div style={{
          fontFamily: F.display,
          fontSize: 'clamp(48px, 5vw, 72px)',
          fontWeight: 900,
          lineHeight: 1,
          color: C.white,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {prefix}{isInView ? countValue : 0}{suffix}
        </div>
        <p style={{
          fontFamily: F.display,
          fontSize: 14,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: C.red500,
          marginTop: 16,
        }}>{label}</p>
        {context && (
          <p style={{
            fontFamily: F.body,
            fontSize: 15,
            color: C.gray400,
            marginTop: 8,
            lineHeight: 1.5,
          }}>{context}</p>
        )}
      </div>
    </Reveal>
  );
}

function StatsSection() {
  return (
    <section id="section-stats" style={{ position: 'relative', background: C.navy950, padding: '80px 0 96px' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="BY THE NUMBERS" />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            letterSpacing: '-0.01em',
            marginBottom: 48,
          }}>11 MONTHS OF OUTPUT.</h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {heroStats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   SOCIAL MEDIA PERFORMANCE
   ════════════════════════════════════════════════════════════════ */
function SocialSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const postCount = useCountUp(57, 1400, isInView);
  const followerCount = useCountUp(1537, 1400, isInView);
  const followingCount = useCountUp(1229, 1400, isInView);

  const cardStyle = {
    background: C.navy800,
    border: `1px solid ${C.navyBorder}`,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <section ref={ref} style={{ position: 'relative', background: C.navy900, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="SOCIAL MEDIA PERFORMANCE" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>BUILDING THE BRAND ONLINE.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            Organic growth across three platforms. Every post hand-crafted. No bots, no paid followers, no shortcuts. Real content. Real engagement.
          </p>
        </Reveal>

        {/* Three Platform Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>

          {/* Instagram -- The big one */}
          <Reveal delay={0.2}>
            <div style={{ ...cardStyle }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.red500 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Instagram size={22} color={C.red500} />
                <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: C.white }}>Instagram</span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, marginBottom: 24 }}>@ambition_air_conditioning</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: C.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {isInView ? postCount : 0}
                  </div>
                  <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginTop: 6 }}>POSTS</p>
                </div>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: C.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {isInView ? followerCount.toLocaleString() : 0}
                  </div>
                  <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginTop: 6 }}>FOLLOWERS</p>
                </div>
                <div>
                  <div style={{ fontFamily: F.display, fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 900, color: C.white, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {isInView ? followingCount.toLocaleString() : 0}
                  </div>
                  <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginTop: 6 }}>FOLLOWING</p>
                </div>
              </div>

              <div style={{ borderTop: `1px solid ${C.navyBorder}`, paddingTop: 16 }}>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.red500, marginBottom: 10 }}>CONTENT MIX</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Project Showcases', 'Before/After', 'Equipment', 'Team', 'Drone Aerials', 'Job Sites'].map(tag => (
                    <span key={tag} style={{
                      fontFamily: F.body,
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.gray300,
                      background: C.navy700,
                      padding: '4px 12px',
                      borderRadius: 4,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>

              <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray500, marginTop: 16 }}>100% organic growth. Zero paid promotion.</p>
            </div>
          </Reveal>

          {/* TikTok */}
          <Reveal delay={0.3}>
            <div style={{ ...cardStyle }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.flame400 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Video size={22} color={C.flame400} />
                <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: C.white }}>TikTok</span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, marginBottom: 24 }}>@ambitionmech</p>

              <p style={{ fontFamily: F.body, fontSize: 18, color: C.gray300, lineHeight: 1.7, marginBottom: 24 }}>
                Active account with HVAC-focused content. Short-form video optimized for discoverability in the trades space.
              </p>

              <div style={{ borderTop: `1px solid ${C.navyBorder}`, paddingTop: 16 }}>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.flame400, marginBottom: 10 }}>CONTENT TYPES</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['HVAC Repairs', 'Project Showcases', 'Behind-the-Scenes', 'Equipment Installs'].map(tag => (
                    <span key={tag} style={{
                      fontFamily: F.body,
                      fontSize: 12,
                      fontWeight: 500,
                      color: C.gray300,
                      background: C.navy700,
                      padding: '4px 12px',
                      borderRadius: 4,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, padding: '12px 16px', background: C.navy700, border: `1px solid ${C.navyBorder}`, borderRadius: 4 }}>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray300, lineHeight: 1.5 }}>
                  Cross-posting pipeline built and ready. All Instagram content automatically formatted for TikTok distribution.
                </p>
              </div>
            </div>
          </Reveal>

          {/* LinkedIn */}
          <Reveal delay={0.4}>
            <div style={{ ...cardStyle }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.navy300 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Linkedin size={22} color={C.navy300} />
                <span style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', color: C.white }}>LinkedIn</span>
              </div>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, marginBottom: 24 }}>Ambition Mechanical Services</p>

              <p style={{ fontFamily: F.body, fontSize: 18, color: C.gray300, lineHeight: 1.7, marginBottom: 24 }}>
                Company page established and active. Authority post strategy positions Mo as the go-to commercial HVAC expert in Phoenix.
              </p>

              <div style={{ borderTop: `1px solid ${C.navyBorder}`, paddingTop: 16 }}>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.navy300, marginBottom: 10 }}>STRATEGY</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'Frequency', value: '2 posts/week' },
                    { label: 'Focus', value: 'HVAC business insights' },
                    { label: 'Positioning', value: 'Phoenix market authority' },
                    { label: 'Content', value: 'Industry expertise + project wins' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray500 }}>{item.label}</span>
                      <span style={{ fontFamily: F.body, fontSize: 14, fontWeight: 600, color: C.gray300 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 20, padding: '12px 16px', background: C.navy700, border: `1px solid ${C.navyBorder}`, borderRadius: 4 }}>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray300, lineHeight: 1.5 }}>
                  Content calendar built. Authority post drafts written and ready for publishing cycle.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   BRANDED VIDEO LIBRARY
   ════════════════════════════════════════════════════════════════ */
function VideoLibrarySection() {
  return (
    <section style={{ position: 'relative', background: C.navy950, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="BRANDED VIDEO LIBRARY" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>23 FINISHED PRODUCTIONS.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            18 branded videos covering every aspect of Ambition Mechanical's work, plus 5 Memorial Tower social edits. Each one edited, color-graded, and ready for deployment.
          </p>
        </Reveal>

        {/* 18 Branded Videos */}
        <Reveal delay={0.2}>
          <p style={{
            fontFamily: F.display,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: C.red500,
            marginBottom: 16,
          }}>18 BRANDED VIDEOS</p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 40 }}>
          {brandedVideos.map((v, i) => (
            <Reveal key={v.title} delay={Math.min(i * 0.04, 0.5)}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'border-color 0.3s',
              }}>
                <Play size={16} color={videoCategoryColors[v.category] || C.red500} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: F.display,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}>{v.title}</p>
                  <p style={{
                    fontFamily: F.body,
                    fontSize: 11,
                    color: videoCategoryColors[v.category] || C.gray500,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}>{v.category}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Memorial Tower Edits */}
        <Reveal delay={0.3}>
          <p style={{
            fontFamily: F.display,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: C.flame400,
            marginBottom: 16,
          }}>5 MEMORIAL TOWER SOCIAL EDITS</p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {memorialTowerEdits.map((v, i) => (
            <Reveal key={v.title} delay={Math.min(0.3 + i * 0.05, 0.6)}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <Play size={16} color={C.flame400} />
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: F.display,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}>{v.title}</p>
                  <p style={{
                    fontFamily: F.body,
                    fontSize: 11,
                    color: C.flame400,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    marginTop: 2,
                  }}>{v.category}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONTENT STRATEGY (6 Pillars)
   ════════════════════════════════════════════════════════════════ */
function ContentStrategySection() {
  return (
    <section style={{ position: 'relative', background: C.navy900, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="CONTENT STRATEGY" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>6 PILLARS. INFINITE CONTENT.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            Every piece of content maps to one of six strategic pillars. This framework ensures Ambition Mechanical's social presence is balanced, intentional, and always on-brand.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {contentPillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.name} delay={i * 0.08}>
                <div style={{
                  background: C.navy800,
                  border: `1px solid ${C.navyBorder}`,
                  padding: 28,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.3s',
                }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.red500 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: `${C.red500}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={20} color={C.red500} />
                    </div>
                    <h3 style={{
                      fontFamily: F.display,
                      fontSize: 20,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: C.white,
                      letterSpacing: '0.02em',
                    }}>{pillar.name}</h3>
                  </div>
                  <p style={{
                    fontFamily: F.body,
                    fontSize: 16,
                    color: C.gray300,
                    lineHeight: 1.7,
                  }}>{pillar.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   HIGH-PROFILE CLIENTS
   ════════════════════════════════════════════════════════════════ */
function ClientsSection() {
  return (
    <section style={{ position: 'relative', background: C.navy950, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <Reveal>
          <SectionLabel label="WHERE WE'VE SHOT" centered />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>NAMES THAT SPEAK FOR THEMSELVES.</h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            margin: '0 auto 40px',
          }}>
            Ambition Mechanical's client roster includes some of the most recognized brands in hospitality, retail, healthcare, and luxury. AOM has documented work at all of them.
          </p>
        </Reveal>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          {highProfileClients.map((client, i) => (
            <Reveal key={client} delay={i * 0.06}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: '12px 24px',
                fontFamily: F.display,
                fontSize: 16,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                color: C.white,
                transition: 'border-color 0.3s',
              }}>{client}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   37 SHOOTS TIMELINE
   ════════════════════════════════════════════════════════════════ */
function ShootsSection() {
  const [expanded, setExpanded] = useState(false);
  const visibleShoots = expanded ? shoots : shoots.slice(0, 12);

  return (
    <section style={{ position: 'relative', background: C.navy900, padding: '96px 0' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="PRODUCTION LOG" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>37 SHOOTS. 11 MONTHS. ZERO MISSED.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            Every shoot logged, organized, and delivered. From the first day at Fashion Square to the latest Memorial Tower session.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
          {visibleShoots.map((shoot, i) => (
            <Reveal key={`${shoot.name}-${i}`} delay={Math.min(i * 0.04, 0.5)}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: 20,
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.3s',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: typeColors[shoot.type] || C.red500 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{
                    fontFamily: F.display,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: C.gray500,
                  }}>{shoot.month}</span>
                  <span style={{
                    fontFamily: F.display,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: typeColors[shoot.type] || C.red500,
                    border: `1px solid ${typeColors[shoot.type] || C.red500}`,
                    padding: '2px 8px',
                  }}>{shoot.type}</span>
                </div>
                <h3 style={{
                  fontFamily: F.display,
                  fontSize: 16,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: C.white,
                  marginBottom: 4,
                  letterSpacing: '0.01em',
                }}>{shoot.name}</h3>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, lineHeight: 1.5 }}>{shoot.details}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {!expanded && (
          <Reveal delay={0.3}>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                onClick={() => setExpanded(true)}
                style={{
                  fontFamily: F.display,
                  fontSize: 14,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: C.red500,
                  background: 'none',
                  border: `2px solid ${C.red500}`,
                  padding: '14px 36px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.3s',
                }}
              >
                VIEW ALL 37 SHOOTS
                <ChevronDown size={18} />
              </button>
            </div>
          </Reveal>
        )}

        {expanded && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button
              onClick={() => setExpanded(false)}
              style={{
                fontFamily: F.display,
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: C.gray500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >COLLAPSE</button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONTENT ARSENAL
   ════════════════════════════════════════════════════════════════ */
function ContentArsenalSection() {
  return (
    <section style={{ position: 'relative', background: C.navy950, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="CONTENT ARSENAL" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>READY TO DEPLOY.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            Beyond shoots and edits, AOM has built a complete content system for Ambition Mechanical. Templates, strategies, calendars, and voice recordings, all designed to scale.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {contentArsenal.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.08}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: 28,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: C.red500 }} />
                <div style={{
                  fontFamily: F.display,
                  fontSize: 48,
                  fontWeight: 900,
                  color: C.white,
                  lineHeight: 1,
                }}>
                  {item.number}
                </div>
                <p style={{
                  fontFamily: F.display,
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: C.red500,
                  marginTop: 12,
                }}>{item.label}</p>
                <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray400, marginTop: 8 }}>{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Also Delivered */}
        <Reveal delay={0.4} className="mt-10">
          <div style={{
            background: C.navy800,
            border: `1px solid ${C.navyBorder}`,
            padding: 32,
            maxWidth: 600,
            marginTop: 40,
          }}>
            <p style={{
              fontFamily: F.display,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: C.gray500,
              marginBottom: 16,
            }}>ALSO DELIVERED</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Brand guidelines documentation (3 versions)', 'LinkedIn authority post drafts', 'Content strategy blueprint', '30-day content calendar with 28 planned pieces'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <ArrowRight size={16} color={C.red500} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontFamily: F.body, fontSize: 15, color: C.gray300, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   THE WEBSITE
   ════════════════════════════════════════════════════════════════ */
function WebsiteSection() {
  return (
    <section style={{ position: 'relative', background: C.navy900, padding: '96px 0' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="WEB DEVELOPMENT" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 48,
          }}>A WEBSITE BUILT FROM SCRATCH.</h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div style={{
            background: C.navy800,
            border: `1px solid ${C.navyBorder}`,
            padding: 40,
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.red500 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 40 }}>
              <div>
                <p style={{
                  fontFamily: F.display,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  color: C.gray500,
                  marginBottom: 16,
                }}>CUSTOM-BUILT FOR AMBITION</p>
                <h3 style={{
                  fontFamily: F.display,
                  fontSize: 32,
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  color: C.white,
                  marginBottom: 16,
                }}>ambitionac.com</h3>
                <p style={{
                  fontFamily: F.body,
                  fontSize: 18,
                  color: C.gray300,
                  lineHeight: 1.7,
                  marginBottom: 24,
                }}>
                  A modern, mobile-first website showcasing Ambition Mechanical's services, projects, and team. Built with enterprise-grade technology and launched in March 2026.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'React + Firebase + Tailwind CSS',
                    'CMS admin panel for content updates',
                    'Mobile responsive across all devices',
                    'SEO optimized for local search',
                    'Contact form with lead capture',
                    'Projects showcase with photo galleries',
                  ].map((feature, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, background: C.red500, flexShrink: 0 }} />
                      <span style={{ fontFamily: F.body, fontSize: 15, color: C.gray300 }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginBottom: 8 }}>LAUNCHED</p>
                <p style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: C.white }}>MARCH 6, 2026</p>
                <div style={{ width: 48, height: 2, background: C.red500, margin: '16px auto' }} />
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginBottom: 8 }}>MARKET VALUE</p>
                <p style={{ fontFamily: F.display, fontSize: 40, fontWeight: 900, color: C.red500 }}>$4,000 - $8,000</p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   EQUIPMENT
   ════════════════════════════════════════════════════════════════ */
function EquipmentSection() {
  return (
    <section style={{ position: 'relative', background: C.navy950, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="PRODUCTION GEAR" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 48,
          }}>PROFESSIONAL-GRADE TOOLS.</h2>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {equipment.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.08}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: 24,
                transition: 'border-color 0.3s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Camera size={20} color={C.red500} />
                  <div>
                    <h3 style={{
                      fontFamily: F.display,
                      fontSize: 16,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      color: C.white,
                    }}>{item.name}</h3>
                    <p style={{
                      fontFamily: F.display,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      color: C.red500,
                    }}>{item.type}</p>
                  </div>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray400 }}>{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   MARKET VALUE ANALYSIS
   ════════════════════════════════════════════════════════════════ */
function ValueSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const marketValue = useCountUp(78000, 2000, isInView);
  const amountPaid = useCountUp(22000, 1800, isInView);

  return (
    <section ref={ref} style={{ position: 'relative', background: C.navy800, padding: '96px 0' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="VALUE ANALYSIS" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>WHAT THIS IS WORTH.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            At standard Phoenix market rates, here's the value AOM has delivered in 11 months.
          </p>
        </Reveal>

        {/* Table */}
        <Reveal delay={0.2}>
          <div style={{ overflow: 'hidden', border: `1px solid ${C.navyBorder}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    background: C.navy950,
                    fontFamily: F.display,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: C.gray400,
                    padding: '16px 24px',
                    textAlign: 'left',
                  }}>Deliverable</th>
                  <th style={{
                    background: C.navy950,
                    fontFamily: F.display,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: C.gray400,
                    padding: '16px 24px',
                    textAlign: 'left',
                  }}>Market Rate</th>
                  <th style={{
                    background: C.red500,
                    fontFamily: F.display,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: C.white,
                    padding: '16px 24px',
                    textAlign: 'right',
                  }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {valueComparison.map((row, i) => (
                  <tr key={row.item} style={{ background: i % 2 === 0 ? C.navy900 : C.navy950 }}>
                    <td style={{ padding: '14px 24px', borderBottom: `1px solid ${C.navyBorderLight}` }}>
                      <span style={{ fontFamily: F.body, fontSize: 15, fontWeight: 600, color: C.white }}>{row.item}</span>
                    </td>
                    <td style={{ padding: '14px 24px', borderBottom: `1px solid ${C.navyBorderLight}` }}>
                      <span style={{ fontFamily: F.body, fontSize: 14, color: C.gray400 }}>{row.rate}</span>
                    </td>
                    <td style={{ padding: '14px 24px', borderBottom: `1px solid ${C.navyBorderLight}`, textAlign: 'right' }}>
                      <span style={{ fontFamily: F.display, fontSize: 18, fontWeight: 900, color: C.white }}>{row.value}</span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: C.navy950 }}>
                  <td colSpan={2} style={{ padding: '20px 24px' }}>
                    <span style={{ fontFamily: F.display, fontSize: 22, fontWeight: 900, color: C.white }}>ESTIMATED MARKET VALUE</span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <span style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: C.red500 }}>$78,000+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* Big Comparison */}
        <Reveal delay={0.3}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
            alignItems: 'center',
            marginTop: 60,
          }}>
            <div style={{
              textAlign: 'center',
              padding: 32,
              background: C.navy900,
              border: `1px solid ${C.navyBorder}`,
            }}>
              <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginBottom: 12 }}>MARKET VALUE</p>
              <p style={{
                fontFamily: F.display,
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 900,
                color: C.white,
              }}>
                ${isInView ? marketValue.toLocaleString() : '0'}+
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: F.display, fontSize: 28, fontWeight: 900, color: C.gray500 }}>vs</p>
            </div>
            <div style={{
              textAlign: 'center',
              padding: 32,
              background: C.navy900,
              border: `2px solid ${C.red500}`,
            }}>
              <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginBottom: 12 }}>AMOUNT PAID</p>
              <p style={{
                fontFamily: F.display,
                fontSize: 'clamp(36px, 5vw, 56px)',
                fontWeight: 900,
                color: C.red500,
              }}>
                ${isInView ? amountPaid.toLocaleString() : '0'}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray500, marginTop: 8 }}>11 months x $2,000/month</p>
            </div>
          </div>
        </Reveal>

        {/* ROI */}
        <Reveal delay={0.4}>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <div style={{
              display: 'inline-block',
              background: C.navy950,
              border: `2px solid ${C.red500}`,
              padding: '24px 48px',
            }}>
              <p style={{ fontFamily: F.display, fontSize: 'clamp(48px, 6vw, 72px)', fontWeight: 900, color: C.red500 }}>3.5x</p>
              <p style={{ fontFamily: F.display, fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.white, marginTop: 8 }}>RETURN ON INVESTMENT</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   HOURS INVESTED
   ════════════════════════════════════════════════════════════════ */
function HoursSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const totalHours = useCountUp(493, 1800, isInView);

  return (
    <section ref={ref} style={{ position: 'relative', background: C.navy950, padding: '96px 0' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="TIME INVESTED" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 48,
          }}>NEARLY 500 HOURS OF WORK.</h2>
        </Reveal>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hoursBreakdown.map((item, i) => (
            <Reveal key={item.activity} delay={i * 0.08}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}>
                <div>
                  <h3 style={{
                    fontFamily: F.display,
                    fontSize: 16,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: C.white,
                  }}>{item.activity}</h3>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray500, marginTop: 4 }}>{item.calc}</p>
                </div>
                <div style={{
                  fontFamily: F.display,
                  fontSize: 32,
                  fontWeight: 900,
                  color: C.red500,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {item.hours}<span style={{ fontSize: 16, color: C.gray500, marginLeft: 4 }}>hrs</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Total */}
        <Reveal delay={0.5}>
          <div style={{
            background: C.navy800,
            border: `2px solid ${C.red500}`,
            padding: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginTop: 24,
          }}>
            <div>
              <p style={{ fontFamily: F.display, fontSize: 20, fontWeight: 900, textTransform: 'uppercase', color: C.white }}>TOTAL ESTIMATED HOURS</p>
              <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray400, marginTop: 4 }}>Effective rate: ~$44.62/hour (market rate: $100-200/hr)</p>
            </div>
            <div style={{
              fontFamily: F.display,
              fontSize: 'clamp(48px, 6vw, 64px)',
              fontWeight: 900,
              color: C.red500,
              fontVariantNumeric: 'tabular-nums',
            }}>
              ~{isInView ? totalHours : 0}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   WHAT'S NEXT
   ════════════════════════════════════════════════════════════════ */
function WhatsNextSection() {
  const nextSteps = [
    { title: 'FULL SOCIAL MEDIA DEPLOYMENT', desc: 'The content pipeline is built and tested. 48 templates and a 30-day calendar are ready for immediate execution across Instagram and LinkedIn.' },
    { title: 'CONTINUED MONTHLY PRODUCTION', desc: 'Regular on-site video production documenting new projects, building a growing library of premium visual content.' },
    { title: 'KITCHEN & RESTAURANT AD CAMPAIGNS', desc: 'Targeted campaign capability for driving service calls, leveraging the extensive restaurant project footage already captured.' },
    { title: 'LINKEDIN AUTHORITY BUILDING', desc: 'Positioning Ambition Mechanical as the premium HVAC contractor in the Phoenix metro through consistent, professional content.' },
  ];

  return (
    <section style={{ position: 'relative', background: C.navy900, padding: '96px 0', overflow: 'hidden' }}>
      <NoiseOverlay />
      <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '0 24px' }}>
        <Reveal>
          <SectionLabel label="WHAT'S NEXT" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(36px, 5vw, 64px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            lineHeight: 1,
            marginBottom: 16,
          }}>THE FOUNDATION IS BUILT. NOW WE SCALE.</h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p style={{
            fontFamily: F.body,
            fontSize: 20,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 700,
            marginBottom: 48,
          }}>
            11 months of production work has created a massive content arsenal. The shoots are done, the templates are built, and the strategy is locked. The next phase is about putting all of it to work.
          </p>
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 }}>
          {nextSteps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1}>
              <div style={{
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                padding: 28,
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: C.red500 }} />
                <h3 style={{
                  fontFamily: F.display,
                  fontSize: 18,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: C.white,
                  marginBottom: 10,
                  paddingLeft: 8,
                }}>{step.title}</h3>
                <p style={{
                  fontFamily: F.body,
                  fontSize: 16,
                  color: C.gray300,
                  lineHeight: 1.7,
                  paddingLeft: 8,
                }}>{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   FOOTER (Ambition Standalone)
   ════════════════════════════════════════════════════════════════ */
function AmbitionFooter() {
  return (
    <footer style={{
      background: C.navy950,
      borderTop: `1px solid ${C.navyBorder}`,
      padding: '64px 0',
    }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <Reveal>
          <div style={{ width: 48, height: 2, background: C.red500, margin: '0 auto 24px' }} />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 style={{
            fontFamily: F.display,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 900,
            textTransform: 'uppercase',
            color: C.white,
            marginBottom: 16,
          }}>BUILT BY AOM. BUILT TO LAST.</h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{
            fontFamily: F.body,
            fontSize: 18,
            color: C.gray300,
            lineHeight: 1.7,
            maxWidth: 540,
            margin: '0 auto 32px',
          }}>
            This is what 11 months of dedicated creative production looks like. One team. One vision. Hundreds of hours of work invested in making Ambition Mechanical look as good as the work they do.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 40 }}>
            <a
              href="https://www.instagram.com/ambition_air_conditioning/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: F.display,
                fontSize: 14,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: C.white,
                border: `2px solid ${C.white}`,
                padding: '14px 28px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.3s',
              }}
            >
              <Instagram size={18} />
              FOLLOW ON INSTAGRAM
            </a>
            <a
              href="https://www.linkedin.com/company/ambition-mechanical-services"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: F.display,
                fontSize: 14,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: C.red500,
                border: `2px solid ${C.red500}`,
                padding: '14px 28px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.3s',
              }}
            >
              <Linkedin size={18} />
              CONNECT ON LINKEDIN
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <div style={{ borderTop: `1px solid ${C.navyBorder}`, paddingTop: 24 }}>
            <p style={{
              fontFamily: F.display,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: C.gray500,
            }}>
              PRODUCED BY AOM &bull; AHEAD OF MARKET &bull; PHOENIX, AZ
            </p>
            <a
              href="https://aheadofmarket.com"
              style={{
                display: 'inline-block',
                marginTop: 8,
                fontFamily: F.body,
                fontSize: 14,
                color: C.red500,
                textDecoration: 'none',
              }}
            >
              aheadofmarket.com
            </a>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE EXPORT
   ════════════════════════════════════════════════════════════════ */
export default function AmbitionPerformance() {
  useSEO();

  return (
    <div style={{ background: C.navy950, minHeight: '100vh' }}>
      <AmbitionNav />
      <HeroSection />
      <StatsSection />
      <SocialSection />
      <VideoLibrarySection />
      <ContentStrategySection />
      <ClientsSection />
      <ShootsSection />
      <ContentArsenalSection />
      <WebsiteSection />
      <EquipmentSection />
      <ValueSection />
      <HoursSection />
      <WhatsNextSection />
      <AmbitionFooter />
    </div>
  );
}
