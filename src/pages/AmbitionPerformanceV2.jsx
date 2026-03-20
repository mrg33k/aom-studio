import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, Camera, Video, Globe, Phone, Mail,
  CheckCircle2, ArrowRight, Check, Calendar, Image,
  Users, Clock, DollarSign, TrendingUp, MapPin,
  Play, Flame, Layers, FileText, Star, Zap,
  BarChart3, Target, Shield, Megaphone
} from 'lucide-react'

/* ================================================================== */
/*  BRAND TOKENS — Ambition Mechanical brand system (v2)              */
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
  gray700: '#374151',
  neutral900: '#111111',
  neutral950: '#0a0a0a',
  navyBorder: 'rgba(57,73,171,0.25)',
  navyBorderLight: 'rgba(57,73,171,0.12)',
  whiteBorder: 'rgba(255,255,255,0.10)',
  whiteBorderHover: 'rgba(255,255,255,0.18)',
}

const F = {
  display: "'Barlow Condensed', sans-serif",
  body: "'Inter', system-ui, sans-serif",
}

/* ================================================================== */
/*  FONT INJECTION                                                     */
/* ================================================================== */

function useFonts() {
  useEffect(() => {
    if (!document.querySelector('link[href*="Barlow+Condensed"]')) {
      const link = document.createElement('link')
      link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700&display=swap'
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
  }, [])
}

/* ================================================================== */
/*  SEO                                                                */
/* ================================================================== */

function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Mechanical | Performance Report + Growth Plan'
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${name}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setMeta('description', 'Ambition Mechanical x AOM: 11-month performance report + service call growth plan. 37 shoots. 3,138 video files. 3 TB of footage. $78k+ in delivered value.')
    setMeta('og:title', 'Ambition Mechanical | Performance Report + Growth Plan', true)
    setMeta('og:description', '37 shoots. 3,138 video files. 713 photos. 3 TB of footage. 1 custom website.', true)
    setMeta('og:type', 'article', true)
  }, [])
}

/* ================================================================== */
/*  INTERSECTION OBSERVER                                              */
/* ================================================================== */

function useIntersect(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.12, ...options }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

/* ================================================================== */
/*  FADE-IN                                                            */
/* ================================================================== */

function FadeIn({ children, delay = 0, y = 24 }) {
  const [ref, visible] = useIntersect()
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 0.55s ease ${delay}s, transform 0.55s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ================================================================== */
/*  COUNT-UP                                                           */
/* ================================================================== */

function useCountUp(end, duration = 1400, inView = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!inView) return
    const startTime = performance.now()
    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, inView])
  return value
}

/* ================================================================== */
/*  SECTION WRAPPERS                                                   */
/* ================================================================== */

function DarkSection({ children, id, style: s = {} }) {
  return (
    <section id={id} style={{
      background: C.navy900,
      padding: 'clamp(56px, 9vw, 104px) clamp(24px, 5vw, 80px)',
      color: C.white,
      position: 'relative',
      overflow: 'hidden',
      ...s,
    }}>
      {children}
    </section>
  )
}

function LightSection({ children, id, style: s = {} }) {
  return (
    <section id={id} style={{
      background: C.white,
      padding: 'clamp(56px, 9vw, 104px) clamp(24px, 5vw, 80px)',
      color: C.gray700,
      position: 'relative',
      overflow: 'hidden',
      ...s,
    }}>
      {children}
    </section>
  )
}

function OffWhiteSection({ children, id, style: s = {} }) {
  return (
    <section id={id} style={{
      background: C.offWhite,
      padding: 'clamp(56px, 9vw, 104px) clamp(24px, 5vw, 80px)',
      color: C.gray700,
      position: 'relative',
      overflow: 'hidden',
      ...s,
    }}>
      {children}
    </section>
  )
}

function MaxWidth({ children, style: s = {} }) {
  return <div style={{ maxWidth: 1200, margin: '0 auto', ...s }}>{children}</div>
}

/* ================================================================== */
/*  SECTION LABEL                                                      */
/* ================================================================== */

function SectionLabel({ children, dark = true }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: F.display,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: C.red500,
      border: `1px solid ${C.red500}`,
      borderRadius: 100,
      padding: '4px 14px',
      marginBottom: 16,
    }}>{children}</span>
  )
}

/* ================================================================== */
/*  HEADING                                                            */
/* ================================================================== */

function Heading({ children, dark = true, style: s = {} }) {
  return (
    <h2 style={{
      fontFamily: F.display,
      fontSize: 'clamp(36px, 6vw, 64px)',
      fontWeight: 800,
      lineHeight: 1.0,
      letterSpacing: '0.02em',
      textTransform: 'uppercase',
      color: dark ? C.white : C.navy900,
      marginTop: 8,
      marginBottom: 0,
      ...s,
    }}>{children}</h2>
  )
}

function Subheading({ children, dark = true, style: s = {} }) {
  return (
    <p style={{
      fontFamily: F.body,
      fontSize: 17,
      lineHeight: 1.65,
      color: dark ? C.gray400 : C.gray500,
      marginTop: 16,
      maxWidth: 680,
      ...s,
    }}>{children}</p>
  )
}

/* ================================================================== */
/*  INDUSTRIAL BACKGROUND PATTERN                                      */
/* ================================================================== */

function BlueprintPattern({ opacity = 0.04 }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}
    >
      <defs>
        <pattern id="v2-blueprint" patternUnits="userSpaceOnUse" width="48" height="48">
          <rect x="0" y="0" width="48" height="48" fill="none" stroke={C.navy300} strokeWidth="0.5" />
          <rect x="0" y="0" width="24" height="24" fill="none" stroke={C.navy300} strokeWidth="0.25" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#v2-blueprint)" />
    </svg>
  )
}

function DiagPattern({ opacity = 0.05, color = C.red500 }) {
  return (
    <svg
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity }}
    >
      <defs>
        <pattern id="v2-diag" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <line x1="7" y1="0" x2="7" y2="14" stroke={color} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#v2-diag)" />
    </svg>
  )
}

/* ================================================================== */
/*  DATA                                                               */
/* ================================================================== */

const heroStats = [
  { number: 37, suffix: '', label: 'Professional Video Shoots', context: 'May 2025 through March 2026' },
  { number: 3138, suffix: '', label: 'Video Files Captured', context: '3 TB of raw + finished footage' },
  { number: 713, suffix: '', label: 'Professional Photos', context: 'Stills, aerials, DNG raws' },
  { number: 48, suffix: ''  , label: 'Finished Video Exports', context: 'Edited, color-graded, delivered' },
  { number: 25, suffix: '+', label: 'Job Sites Documented', context: 'Premium client locations across Phoenix metro' },
  { number: 1, suffix: '', label: 'Custom Website', context: 'Built and launched March 2026' },
]

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
  { month: 'Dec 2025', name: "Teleferic + Tiffany's + Loro Piano", details: '3 venues, 1 shoot', type: 'Luxury' },
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
]

const highProfileClients = [
  'Apple Store', 'Ritz Carlton', "Tiffany's", 'INEOS Grenadier', 'Roka Akor',
  'Din Tai Fung', 'Abrazo Healthcare', 'Banner Health', 'Louis Vuitton', 'Loro Piano', 'Memorial Tower',
]

const equipment = [
  { name: 'DJI Air 3 / Air 3S', type: 'Drone', detail: '25+ aerial sessions' },
  { name: 'DJI Ronin 4D', type: 'Cinema Camera', detail: 'Feature-film grade footage' },
  { name: 'Panasonic S5IIX', type: 'Photo/Video', detail: 'Hybrid stills and motion' },
  { name: 'DJI OSMO Action 3', type: 'Action Cam', detail: 'Dynamic POV coverage' },
  { name: 'BlackMagic Camera App', type: 'Mobile Cinema', detail: 'Professional mobile capture' },
  { name: 'DJI Mic', type: 'Professional Audio', detail: 'Crystal-clear interviews' },
]

const contentArsenal = [
  { number: 48, label: 'Finished Video Exports', desc: '18 branded social + 5 Memorial Tower edits' },
  { number: 57, label: 'Instagram Posts Published', desc: 'Reels, carousels, and static posts' },
  { number: 14, label: 'Professional Voiceovers', desc: 'Custom narration recordings' },
  { number: 30, label: 'Story-Driven Posts Planned', desc: 'Content mapped to real project narratives' },
  { number: 3, label: 'Brand Guidelines Versions', desc: 'Visual identity documentation' },
  { number: 6, label: 'Content Pillars Defined', desc: 'Strategic framework for all platforms' },
]

const valueComparison = [
  { item: '37 Professional Shoots', rate: '$800 avg per shoot', value: '$29,600' },
  { item: '48 Finished Video Exports', rate: '$500 avg per video', value: '$24,000' },
  { item: 'Custom Website', rate: 'Design + Dev + CMS', value: '$6,000' },
  { item: 'Brand & Content Strategy', rate: 'Guidelines + Pillars + Calendar', value: '$5,000' },
  { item: 'Social Media Management', rate: '11 months across 3 platforms', value: '$11,000' },
  { item: '3,138 Raw Files + 713 Photos', rate: 'Post-production archive', value: '$15,000' },
]

const hoursBreakdown = [
  { activity: 'On-Site Production', calc: '37 shoots x 4hrs avg', hours: 148 },
  { activity: 'Travel to Sites', calc: '37 shoots x 2hrs avg', hours: 74 },
  { activity: 'Post-Production', calc: 'Editing, color, export', hours: 111 },
  { activity: 'Website Design & Dev', calc: 'React + Firebase + Tailwind', hours: 80 },
  { activity: 'Content Strategy', calc: 'Planning + guidelines', hours: 40 },
  { activity: 'Social Media Management', calc: 'Posting + scheduling', hours: 40 },
]

const contentPillars = [
  { name: 'The Work', desc: 'Jobs completed, equipment installed, rooftop units, pipe runs', icon: Flame },
  { name: 'Before / After', desc: 'Project transformations that show the impact of the work', icon: Layers },
  { name: 'Education / Tips', desc: 'Seasonal HVAC knowledge, maintenance tips, industry insights', icon: FileText },
  { name: 'Team / Trust', desc: 'Crew introductions, behind-the-scenes, company culture', icon: Users },
  { name: 'Local / Phoenix', desc: 'Desert context, Phoenix market, community presence', icon: MapPin },
  { name: 'Social Proof', desc: 'Reviews, testimonials, industry events, client wins', icon: Star },
]

const sitesVisited = [
  { name: 'Apple Store Chandler', type: 'Retail', visits: 2 },
  { name: 'Ritz Carlton', type: 'Luxury Hospitality', visits: 1 },
  { name: "Tiffany's", type: 'Luxury Retail', visits: 1 },
  { name: 'Din Tai Fung, Scottsdale', type: 'Restaurant', visits: 3 },
  { name: 'Roka Akor', type: 'Restaurant', visits: 1 },
  { name: 'INEOS Grenadier', type: 'Industrial', visits: 1 },
  { name: 'Louis Vuitton, Fashion Square', type: 'Luxury Retail', visits: 3 },
  { name: 'Loro Piano', type: 'Luxury Retail', visits: 1 },
  { name: 'Teleferic Barcelona', type: 'Restaurant', visits: 1 },
  { name: 'Memorial Tower Senior Apts', type: 'Healthcare', visits: 9 },
  { name: 'Abrazo Healthcare', type: 'Healthcare', visits: 1 },
  { name: 'Banner Health', type: 'Healthcare', visits: 1 },
  { name: 'Primrose', type: 'Healthcare', visits: 1 },
  { name: 'Esplanade', type: 'Luxury Property', visits: 1 },
  { name: 'Novus Place / The Melt', type: 'Restaurant', visits: 2 },
  { name: 'Sossaman Warehouse', type: 'Commercial', visits: 1 },
  { name: 'Arrowhead', type: 'Industrial', visits: 1 },
  { name: 'Breakthrough', type: 'Commercial', visits: 1 },
  { name: 'CEVA', type: 'Industrial', visits: 1 },
  { name: 'Refined Gardens', type: 'Luxury Residential', visits: 2 },
  { name: 'LifeSkills', type: 'Commercial', visits: 2 },
  { name: 'Gilmore', type: 'Commercial', visits: 1 },
  { name: "O'Reilly Auto Parts", type: 'Retail', visits: 1 },
  { name: 'Crown', type: 'Mixed Use', visits: 1 },
  { name: 'Ambition Office', type: 'Brand / Team', visits: 1 },
]

const typeColors = {
  Commercial: C.red500,
  Restaurant: C.flame400,
  Team: C.navy300,
  Retail: C.red400,
  Healthcare: C.navy300,
  Brand: C.red500,
  Industrial: C.gray400,
  Luxury: C.flame400,
}

/* ================================================================== */
/*  NAV                                                                */
/* ================================================================== */

function NavBar() {
  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      background: C.navy950,
      borderBottom: `3px solid ${C.red500}`,
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 3vw, 48px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src="/ambition-logo.png"
            alt="Ambition Mechanical"
            style={{ height: 34, width: 'auto', objectFit: 'contain' }}
          />
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 17, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.white }}>
            Ambition Mechanical
          </span>
        </div>
        <span style={{
          fontFamily: F.display,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.red500,
          border: `1px solid ${C.red500}`,
          borderRadius: 100,
          padding: '4px 14px',
        }}>
          Performance Report
        </span>
      </div>
    </nav>
  )
}

/* ================================================================== */
/*  HERO                                                               */
/* ================================================================== */

function HeroSection() {
  return (
    <section style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${C.navy950} 0%, ${C.navy900} 50%, ${C.navy800} 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      paddingTop: 60,
    }}>
      <BlueprintPattern opacity={0.06} />

      {/* Red accent top stripe */}
      <div style={{
        position: 'absolute',
        top: 60, left: 0, right: 0,
        height: 3,
        background: `linear-gradient(90deg, ${C.red600} 0%, ${C.red500} 50%, transparent 100%)`,
      }} />

      {/* Diagonal red glow */}
      <div style={{
        position: 'absolute',
        top: '15%', right: '-10%',
        width: 600, height: 600,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${C.red500}18 0%, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 24px', maxWidth: 920, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          opacity: 0,
          animation: 'fadeSlideUp 0.5s ease forwards 0.1s',
        }}>
          <SectionLabel>Client Performance Report</SectionLabel>
        </div>

        <div style={{ opacity: 0, animation: 'fadeSlideUp 0.5s ease forwards 0.2s' }}>
          <p style={{ fontFamily: F.body, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray400, marginBottom: 20 }}>
            April 2025 - March 2026
          </p>
        </div>

        <div style={{ opacity: 0, animation: 'fadeSlideUp 0.55s ease forwards 0.25s' }}>
          <h1 style={{
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 'clamp(52px, 10vw, 108px)',
            lineHeight: 0.92,
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            color: C.white,
            marginBottom: 24,
          }}>
            Ambition<br />
            <span style={{ color: C.red500 }}>Mechanical</span><br />
            Services
          </h1>
        </div>

        <div style={{ opacity: 0, animation: 'fadeSlideUp 0.5s ease forwards 0.4s' }}>
          <p style={{ fontFamily: F.body, fontSize: 18, color: C.gray400, lineHeight: 1.65, maxWidth: 620, margin: '0 auto 28px' }}>
            11 months of creative production partnership. 37 shoots. 3,138 video files. 3 TB of footage. 713 photos. 1 custom website. Here is everything we have built together.
          </p>
        </div>

        <div style={{ opacity: 0, animation: 'fadeSlideUp 0.4s ease forwards 0.55s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span style={{ fontFamily: F.body, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500 }}>Produced by</span>
          <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.red500 }}>AOM</span>
          <span style={{ color: C.gray600, fontSize: 11 }}>|</span>
          <span style={{ fontFamily: F.body, fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500 }}>Phoenix, AZ</span>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 36, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', opacity: 0,
            animation: 'fadeSlideUp 0.4s ease forwards 0.8s',
          }}
          onClick={() => document.getElementById('section-stats')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span style={{ fontFamily: F.body, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gray500 }}>See the results</span>
          <div style={{ animation: 'bounce 2s ease-in-out infinite' }}>
            <ChevronDown size={22} color={C.gray500} />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(7px); }
        }
      `}</style>
    </section>
  )
}

/* ================================================================== */
/*  STATS SECTION                                                      */
/* ================================================================== */

function StatCard({ number, suffix = '', label, context, index }) {
  const [ref, visible] = useIntersect()
  const countValue = useCountUp(number, 1400, visible)
  return (
    <FadeIn delay={index * 0.08}>
      <div
        ref={ref}
        style={{
          background: C.navy800,
          border: `1px solid ${C.navyBorder}`,
          borderRadius: 0,
          padding: '32px 28px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 200ms ease',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = `${C.red500}55`}
        onMouseLeave={e => e.currentTarget.style.borderColor = C.navyBorder}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.red500 }} />
        <div style={{
          fontFamily: F.display,
          fontWeight: 900,
          fontSize: 'clamp(40px, 5vw, 64px)',
          lineHeight: 1,
          color: C.white,
          letterSpacing: '-0.01em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {visible ? countValue.toLocaleString() : '0'}{suffix}
        </div>
        <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.red500, marginTop: 14, marginBottom: 4 }}>
          {label}
        </p>
        {context && (
          <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, lineHeight: 1.5 }}>{context}</p>
        )}
      </div>
    </FadeIn>
  )
}

function StatsSection() {
  return (
    <DarkSection id="section-stats">
      <BlueprintPattern opacity={0.04} />
      <MaxWidth>
        <FadeIn>
          <SectionLabel>By the Numbers</SectionLabel>
          <Heading>11 Months of Output.</Heading>
          <Subheading>
            Every number here represents real production work delivered for Ambition Mechanical. Shoots, files, photos, edits, and a website built from scratch.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2, marginTop: 48 }}>
          {heroStats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} index={i} />
          ))}
        </div>
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  SOCIAL MEDIA SECTION                                               */
/* ================================================================== */

function SocialSection() {
  const [ref, visible] = useIntersect()
  const postCount = useCountUp(57, 1400, visible)
  const followerCount = useCountUp(1646, 1400, visible)
  const followingCount = useCountUp(1181, 1400, visible)

  const platforms = [
    {
      name: 'Instagram',
      handle: '@ambition_air_conditioning',
      color: C.red500,
      icon: Globe,
      stats: [
        { label: 'Posts', value: visible ? postCount : 0 },
        { label: 'Followers', value: visible ? followerCount.toLocaleString() : 0 },
        { label: 'Following', value: visible ? followingCount.toLocaleString() : 0 },
      ],
      tags: ['Project Showcases', 'Before/After', 'Equipment', 'Team', 'Drone Aerials'],
      strategy: [
        { label: 'Frequency', value: '4-5x per week' },
        { label: 'Post Focus', value: 'Project showcases, before/after, team on-site, equipment close-ups' },
        { label: 'Positioning', value: 'Craftsmanship you can see. Every post proves the work speaks for itself.' },
      ],
      note: '100% organic growth. Zero paid promotion.',
    },
    {
      name: 'TikTok',
      handle: '@ambitionmech',
      color: C.flame400,
      icon: Video,
      stats: [
        { label: 'Followers', value: '3,119' },
        { label: 'Likes', value: '21.6K' },
        { label: 'Following', value: '317' },
      ],
      tags: ['HVAC Repairs', 'Project Showcases', 'Behind-the-Scenes', 'Equipment Installs'],
      strategy: [
        { label: 'Frequency', value: '3-5x per week' },
        { label: 'Post Focus', value: 'Time-lapses, day-in-the-life, satisfying process shots, crew culture' },
        { label: 'Positioning', value: 'Construction content that makes people stop scrolling. Raw, real, impressive.' },
      ],
      note: null,
    },
    {
      name: 'LinkedIn',
      handle: 'Ambition Mechanical Services',
      color: C.navy300,
      icon: Users,
      stats: [
        { label: 'Followers', value: '147' },
      ],
      tags: ['Industry Expertise', 'Project Wins', 'HVAC Insights', 'Phoenix Market'],
      strategy: [
        { label: 'Frequency', value: '2 posts/week' },
        { label: 'Post Focus', value: 'HVAC business insights + project stories' },
        { label: 'Positioning', value: 'Phoenix commercial HVAC authority. Mo as the expert.' },
      ],
      note: 'Authority post drafts written and ready to deploy.',
    },
  ]

  return (
    <LightSection id="section-social">
      <MaxWidth>
        <FadeIn>
          <SectionLabel dark={false}>Social Media Performance</SectionLabel>
          <Heading dark={false}>Building the Brand Online.</Heading>
          <Subheading dark={false}>
            Every post is free advertising. You are paying for video production, but every view, like, and share is an eyeball on Ambition's brand at zero additional cost.
          </Subheading>
        </FadeIn>

        {/* Top impact numbers */}
        <FadeIn delay={0.15}>
          <div ref={ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2, marginTop: 40, marginBottom: 40 }}>
            {[
              { val: '~600K+', label: 'Est. Total Views', accent: true },
              { val: '21.6K', label: 'TikTok Likes' },
              { val: '4,912', label: 'Total Followers' },
              { val: '$0', label: 'Ad Spend' },
            ].map((item) => (
              <div key={item.label} style={{
                padding: '24px 20px',
                background: item.accent ? C.navy900 : C.offWhite,
                border: `1px solid ${item.accent ? C.navyBorder : C.gray200}`,
                textAlign: 'center',
              }}>
                <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)', color: item.accent ? C.red500 : C.navy900, lineHeight: 1, marginBottom: 8 }}>
                  {item.val}
                </p>
                <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: item.accent ? C.gray400 : C.gray500 }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Eyeball math callout */}
        <FadeIn delay={0.2}>
          <div style={{ padding: '20px 24px', marginBottom: 40, background: C.navy900, borderLeft: `4px solid ${C.red500}` }}>
            <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray300, lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: C.white }}>The eyeball math:</strong>{' '}
              TikTok's 21.6K likes at a ~4% engagement rate = roughly 540,000 video views. Add Instagram reach across 57 posts to 1,646 followers, plus LinkedIn impressions. All organic. All free. Every view is a potential service call that cost Ambition nothing beyond the retainer.
            </p>
          </div>
        </FadeIn>

        {/* Done Well / Can Improve */}
        <FadeIn delay={0.25}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2, marginBottom: 40 }}>
            <div style={{ padding: 32, background: C.navy900, border: `1px solid ${C.navyBorder}` }}>
              <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 24 }}>
                What We've Done Well
              </p>
              {[
                'Built a library of 3,138 real video files across 25+ premium locations',
                'Grew TikTok to 3,119 followers and 21.6K likes organically',
                'Instagram at 1,646 followers with 57 published posts',
                'Documented every major project with cinema-grade equipment',
                'Created a complete brand identity and content strategy',
                'Built and launched ambitionac.com from scratch',
                "Captured footage at Apple, Ritz Carlton, Tiffany's, Din Tai Fung, and other premium clients",
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <Check size={16} color="#22c55e" style={{ flexShrink: 0, marginTop: 3 }} />
                  <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray300, lineHeight: 1.55, margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
            <div style={{ padding: 32, background: C.offWhite, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.flame500, marginBottom: 24 }}>
                Where We Can Improve
              </p>
              {[
                'Posting consistency -- content exists but deployment has been inconsistent',
                'LinkedIn authority posts have not been published at the planned 2/week cadence',
                'Cross-posting pipeline between platforms not fully activated',
                'Google Business Profile not yet optimized with project photos and videos',
                'No paid advertising strategy deployed yet (wide open opportunity)',
                'Story-driven posting over volume -- every post should follow a real project narrative',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <ArrowRight size={16} color={C.flame500} style={{ flexShrink: 0, marginTop: 3 }} />
                  <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: 0 }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Platform cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {platforms.map((p, i) => {
            const Icon = p.icon
            return (
              <FadeIn key={p.name} delay={0.15 + i * 0.1}>
                <div style={{ padding: 32, background: C.navy900, border: `1px solid ${C.navyBorder}`, position: 'relative', height: '100%' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: p.color }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <Icon size={22} color={p.color} />
                    <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', color: C.white }}>{p.name}</span>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray500, marginBottom: 24 }}>{p.handle}</p>

                  <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                    {p.stats.map((st) => (
                      <div key={st.label}>
                        <div style={{ fontFamily: F.display, fontWeight: 800, fontSize: 28, color: C.white, lineHeight: 1 }}>{st.value}</div>
                        <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gray500, marginTop: 4 }}>{st.label}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: `1px solid ${C.navyBorder}`, paddingTop: 16, marginBottom: 16 }}>
                    <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: p.color, marginBottom: 8 }}>Content Mix</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {p.tags.map(tag => (
                        <span key={tag} style={{ fontFamily: F.body, fontSize: 11, color: C.gray300, background: C.navy800, border: `1px solid ${C.navyBorder}`, borderRadius: 3, padding: '3px 9px' }}>{tag}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${C.navyBorder}`, paddingTop: 16 }}>
                    <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: p.color, marginBottom: 12 }}>Strategy</p>
                    {p.strategy.map(item => (
                      <div key={item.label} style={{ marginBottom: 10 }}>
                        <span style={{ fontFamily: F.body, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gray500, display: 'block', marginBottom: 2 }}>{item.label}</span>
                        <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray200 }}>{item.value}</span>
                      </div>
                    ))}
                    {p.note && <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray500, marginTop: 12 }}>{p.note}</p>}
                  </div>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </MaxWidth>
    </LightSection>
  )
}

/* ================================================================== */
/*  CONTENT PILLARS                                                    */
/* ================================================================== */

function ContentStrategySection() {
  return (
    <DarkSection id="section-pillars">
      <DiagPattern opacity={0.04} color={C.navy400} />
      <MaxWidth>
        <FadeIn>
          <SectionLabel>Content Strategy</SectionLabel>
          <Heading>6 Pillars. Infinite Content.</Heading>
          <Subheading>
            Every piece of content maps to one of six strategic pillars. This framework ensures Ambition Mechanical's social presence is balanced, intentional, and always on-brand.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2, marginTop: 48 }}>
          {contentPillars.map((pillar, i) => {
            const Icon = pillar.icon
            return (
              <FadeIn key={pillar.name} delay={i * 0.07}>
                <div style={{ padding: 32, background: C.navy800, border: `1px solid ${C.navyBorder}`, position: 'relative', height: '100%', transition: 'border-color 200ms' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${C.red500}55`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.navyBorder}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: C.red500 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.red500}18` }}>
                      <Icon size={20} color={C.red500} />
                    </div>
                    <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', color: C.white, margin: 0 }}>{pillar.name}</h3>
                  </div>
                  <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, lineHeight: 1.6, margin: 0 }}>{pillar.desc}</p>
                </div>
              </FadeIn>
            )
          })}
        </div>
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  HIGH PROFILE CLIENTS                                               */
/* ================================================================== */

function ClientsSection() {
  return (
    <LightSection id="section-clients">
      <MaxWidth style={{ textAlign: 'center' }}>
        <FadeIn>
          <SectionLabel dark={false}>Where We Have Shot</SectionLabel>
          <Heading dark={false}>Names That Speak for Themselves.</Heading>
          <Subheading dark={false} style={{ maxWidth: 620, margin: '16px auto 0' }}>
            Ambition Mechanical's client roster includes some of the most recognized brands in hospitality, retail, healthcare, and luxury. AOM has documented work at all of them.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 48 }}>
          {highProfileClients.map((client, i) => (
            <FadeIn key={client} delay={i * 0.05}>
              <div style={{
                padding: '12px 22px',
                fontFamily: F.display,
                fontWeight: 700,
                fontSize: 15,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: C.navy900,
                background: C.white,
                border: `2px solid ${C.gray200}`,
                transition: 'border-color 200ms, background 200ms, color 200ms',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.red500; e.currentTarget.style.background = C.navy900; e.currentTarget.style.color = C.white }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.navy900 }}
              >
                {client}
              </div>
            </FadeIn>
          ))}
        </div>
      </MaxWidth>
    </LightSection>
  )
}

/* ================================================================== */
/*  SHOOTS TIMELINE                                                    */
/* ================================================================== */

function ShootsSection() {
  const [expanded, setExpanded] = useState(false)
  const visibleShoots = expanded ? shoots : shoots.slice(0, 12)

  return (
    <DarkSection id="section-shoots">
      <BlueprintPattern opacity={0.04} />
      <MaxWidth>
        <FadeIn>
          <SectionLabel>Production Log</SectionLabel>
          <Heading>37 Shoots. 11 Months. Zero Missed.</Heading>
          <Subheading>
            Every shoot logged, organized, and delivered. From the first day at Fashion Square to the latest Memorial Tower session.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, marginTop: 48 }}>
          {visibleShoots.map((shoot, i) => (
            <FadeIn key={`${shoot.name}-${i}`} delay={Math.min(i * 0.03, 0.4)}>
              <div style={{
                padding: 20,
                background: C.navy800,
                border: `1px solid ${C.navyBorder}`,
                position: 'relative',
                transition: 'border-color 200ms',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${typeColors[shoot.type] || C.red500}55`}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.navyBorder}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: typeColors[shoot.type] || C.red500 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500 }}>{shoot.month}</span>
                  <span style={{
                    fontFamily: F.display, fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: typeColors[shoot.type] || C.red500,
                    border: `1px solid ${typeColors[shoot.type] || C.red500}`,
                    padding: '2px 8px',
                  }}>{shoot.type}</span>
                </div>
                <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: C.white, marginBottom: 4 }}>{shoot.name}</h3>
                <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray400, lineHeight: 1.5, margin: 0 }}>{shoot.details}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        {!expanded && (
          <FadeIn delay={0.3}>
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button
                onClick={() => setExpanded(true)}
                style={{
                  fontFamily: F.display,
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: C.red500,
                  background: 'none',
                  border: `2px solid ${C.red500}`,
                  padding: '14px 32px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'background 200ms, color 200ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.red500; e.currentTarget.style.color = C.white }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = C.red500 }}
              >
                View All 37 Shoots <ChevronDown size={17} />
              </button>
            </div>
          </FadeIn>
        )}
        {expanded && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button onClick={() => setExpanded(false)} style={{ fontFamily: F.body, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gray500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Collapse
            </button>
          </div>
        )}
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  SITES VISITED                                                      */
/* ================================================================== */

function SitesSection() {
  return (
    <LightSection id="section-sites">
      <MaxWidth>
        <FadeIn>
          <SectionLabel dark={false}>Sites Visited</SectionLabel>
          <Heading dark={false}>25+ Locations. 37 Shoots.</Heading>
          <Subheading dark={false}>
            Every one of these locations has been professionally documented with cinema cameras, drone aerials, and professional audio. This is Ambition's portfolio brought to life.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2, marginTop: 48 }}>
          {sitesVisited.map((site, i) => (
            <FadeIn key={site.name} delay={Math.min(i * 0.025, 0.4)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', background: C.offWhite, border: `1px solid ${C.gray200}`, transition: 'border-color 200ms' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.red500}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.gray200}
              >
                <MapPin size={15} color={C.red500} style={{ flexShrink: 0, marginTop: 4 }} />
                <div>
                  <p style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: C.navy900, marginBottom: 4 }}>{site.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gray500 }}>{site.type}</span>
                    {site.visits > 1 && (
                      <span style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: C.red500, background: `${C.red500}12`, padding: '1px 7px' }}>
                        {site.visits} visits
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </MaxWidth>
    </LightSection>
  )
}

/* ================================================================== */
/*  CONTENT ARSENAL                                                    */
/* ================================================================== */

function ContentArsenalSection() {
  return (
    <DarkSection id="section-arsenal">
      <BlueprintPattern opacity={0.04} />
      <MaxWidth>
        <FadeIn>
          <SectionLabel>Content Arsenal</SectionLabel>
          <Heading>Ready to Deploy.</Heading>
          <Subheading>
            Beyond shoots and edits, AOM has built a complete content system for Ambition Mechanical. Templates, strategies, calendars, and voice recordings, all designed to scale.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, marginTop: 48 }}>
          {contentArsenal.map((item, i) => (
            <FadeIn key={item.label} delay={i * 0.07}>
              <div style={{ padding: '32px 28px', background: C.navy800, border: `1px solid ${C.navyBorder}`, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: C.red500 }} />
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 52, color: C.white, lineHeight: 1 }}>{item.number}</div>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.red500, marginTop: 14 }}>{item.label}</p>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, marginTop: 6, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.4}>
          <div style={{ marginTop: 12, padding: '28px 32px', background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
            <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gray500, marginBottom: 16 }}>Also Delivered</p>
            {[
              'Brand guidelines documentation (3 versions)',
              'LinkedIn authority post drafts',
              'Content strategy blueprint',
              '30 story-driven posts planned and mapped to real projects',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <ArrowRight size={14} color={C.red500} style={{ flexShrink: 0, marginTop: 3 }} />
                <span style={{ fontFamily: F.body, fontSize: 14, color: C.gray300, lineHeight: 1.55 }}>{item}</span>
              </div>
            ))}
          </div>
        </FadeIn>
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  WEBSITE SECTION                                                    */
/* ================================================================== */

function WebsiteSection() {
  return (
    <OffWhiteSection id="section-website">
      <MaxWidth>
        <FadeIn>
          <SectionLabel dark={false}>Web Development</SectionLabel>
          <Heading dark={false}>A Website Built From Scratch.</Heading>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div style={{ marginTop: 48, padding: '40px 40px', background: C.navy900, border: `1px solid ${C.navyBorder}`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: C.red500 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 48 }}>
              <div>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gray500, marginBottom: 12 }}>Custom-Built for Ambition</p>
                <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 32, textTransform: 'uppercase', color: C.white, marginBottom: 16 }}>ambitionac.com</h3>
                <p style={{ fontFamily: F.body, fontSize: 16, color: C.gray400, lineHeight: 1.65, marginBottom: 24 }}>
                  A modern, mobile-first website showcasing Ambition Mechanical's services, projects, and team. Built with enterprise-grade technology and launched in March 2026.
                </p>
                {[
                  'React + Firebase + Tailwind CSS',
                  'CMS admin panel for content updates',
                  'Mobile responsive across all devices',
                  'SEO optimized for local search',
                  'Contact form with lead capture',
                  'Projects showcase with photo galleries',
                ].map((feature, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 6, height: 6, background: C.red500, flexShrink: 0 }} />
                    <span style={{ fontFamily: F.body, fontSize: 14, color: C.gray300 }}>{feature}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 20 }}>
                <div>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gray500, marginBottom: 6 }}>Launched</p>
                  <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', color: C.white }}>March 6, 2026</p>
                </div>
                <div style={{ width: 48, height: 2, background: C.red500 }} />
                <div>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gray500, marginBottom: 6 }}>Market Value</p>
                  <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 44, color: C.white, lineHeight: 1 }}>$4,000</p>
                  <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 44, color: C.white, lineHeight: 1 }}>$8,000</p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </MaxWidth>
    </OffWhiteSection>
  )
}

/* ================================================================== */
/*  EQUIPMENT                                                          */
/* ================================================================== */

function EquipmentSection() {
  return (
    <DarkSection id="section-equipment">
      <MaxWidth>
        <FadeIn>
          <SectionLabel>Production Gear</SectionLabel>
          <Heading>Professional-Grade Tools.</Heading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2, marginTop: 48 }}>
          {equipment.map((item, i) => (
            <FadeIn key={item.name} delay={i * 0.07}>
              <div style={{ padding: '24px 24px', background: C.navy800, border: `1px solid ${C.navyBorder}`, transition: 'border-color 200ms' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${C.red500}55`}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.navyBorder}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <Camera size={18} color={C.red500} />
                  <div>
                    <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: C.white, margin: 0 }}>{item.name}</h3>
                    <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.red500 }}>{item.type}</p>
                  </div>
                </div>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, margin: 0 }}>{item.detail}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  VALUE ANALYSIS                                                     */
/* ================================================================== */

function ValueSection() {
  const [ref, visible] = useIntersect()
  const marketValue = useCountUp(78100, 2000, visible)
  const amountPaid = useCountUp(25000, 1800, visible)

  return (
    <LightSection id="section-value">
      <MaxWidth>
        <FadeIn>
          <SectionLabel dark={false}>Value Analysis</SectionLabel>
          <Heading dark={false}>What This is Worth.</Heading>
          <Subheading dark={false}>
            At standard Phoenix market rates, here is the value AOM has delivered in 11 months.
          </Subheading>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div ref={ref} style={{ marginTop: 48, overflow: 'hidden', border: `1px solid ${C.gray200}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'left', padding: '18px 24px', background: C.navy900, color: C.gray400 }}>Deliverable</th>
                  <th style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'left', padding: '18px 24px', background: C.navy900, color: C.gray400 }}>Market Rate</th>
                  <th style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'right', padding: '18px 24px', background: C.red500, color: C.white }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {valueComparison.map((row, i) => (
                  <tr key={row.item} style={{ background: i % 2 === 0 ? C.offWhite : C.white }}>
                    <td style={{ padding: '16px 24px', borderBottom: `1px solid ${C.gray200}` }}>
                      <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: C.navy900 }}>{row.item}</span>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: `1px solid ${C.gray200}` }}>
                      <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray500 }}>{row.rate}</span>
                    </td>
                    <td style={{ padding: '16px 24px', borderBottom: `1px solid ${C.gray200}`, textAlign: 'right' }}>
                      <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, color: C.navy900 }}>{row.value}</span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: C.navy900 }}>
                  <td colSpan={2} style={{ padding: '20px 24px' }}>
                    <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', color: C.white }}>Estimated Market Value</span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <span style={{ fontFamily: F.display, fontWeight: 900, fontSize: 24, color: C.white }}>$78,100+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2, alignItems: 'center', marginTop: 48 }}>
            <div style={{ textAlign: 'center', padding: '32px 24px', background: C.offWhite, border: `1px solid ${C.gray200}` }}>
              <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gray500, marginBottom: 10 }}>Market Value</p>
              <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(32px, 5vw, 52px)', color: C.navy900, lineHeight: 1 }}>
                ${visible ? marketValue.toLocaleString() : '0'}+
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '24px' }}>
              <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 24, color: C.gray300 }}>vs</p>
            </div>
            <div style={{ textAlign: 'center', padding: '32px 24px', background: C.navy900, border: `2px solid ${C.red500}` }}>
              <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.gray500, marginBottom: 10 }}>Amount Paid</p>
              <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(32px, 5vw, 52px)', color: C.white, lineHeight: 1 }}>
                ${visible ? amountPaid.toLocaleString() : '0'}
              </p>
              <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray400, marginTop: 8 }}>11 months x $2,000/month</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <div style={{ display: 'inline-block', padding: '24px 64px', background: C.navy900, border: `2px solid ${C.red500}` }}>
              <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(52px, 7vw, 72px)', color: C.red500, lineHeight: 1, margin: 0 }}>3x</p>
              <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.white, marginTop: 8 }}>Return on Investment</p>
            </div>
          </div>
        </FadeIn>
      </MaxWidth>
    </LightSection>
  )
}

/* ================================================================== */
/*  HOURS                                                              */
/* ================================================================== */

function HoursSection() {
  const [ref, visible] = useIntersect()
  const totalHours = useCountUp(493, 1800, visible)

  return (
    <DarkSection id="section-hours">
      <DiagPattern opacity={0.04} color={C.navy400} />
      <MaxWidth>
        <FadeIn>
          <SectionLabel>Time Invested</SectionLabel>
          <Heading>Nearly 500 Hours of Work.</Heading>
        </FadeIn>
        <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 48 }}>
          {hoursBreakdown.map((item, i) => (
            <FadeIn key={item.activity} delay={i * 0.07}>
              <div style={{ padding: '20px 24px', background: C.navy800, border: `1px solid ${C.navyBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, textTransform: 'uppercase', color: C.white, margin: '0 0 4px' }}>{item.activity}</h3>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray500, margin: 0 }}>{item.calc}</p>
                </div>
                <div>
                  <span style={{ fontFamily: F.display, fontWeight: 900, fontSize: 36, color: C.red500, lineHeight: 1 }}>{item.hours}</span>
                  <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray500, marginLeft: 6 }}>hrs</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.5}>
          <div style={{ marginTop: 2, padding: '28px 32px', background: C.navy800, border: `2px solid ${C.red500}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 18, textTransform: 'uppercase', color: C.white, margin: '0 0 4px' }}>Total Estimated Hours</p>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray500 }}>Effective rate: ~$50.71/hour (market rate: $100-200/hr)</p>
            </div>
            <div>
              <span style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(48px, 6vw, 64px)', color: C.red500, lineHeight: 1 }}>~{visible ? totalHours : 0}</span>
            </div>
          </div>
        </FadeIn>
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  MONTHLY PLANS                                                      */
/* ================================================================== */

function MonthlyPlansSection() {
  const plans = [
    {
      tag: 'Current Plan',
      name: 'Video Production',
      price: '$2,000',
      color: C.gray400,
      highlighted: false,
      features: [
        'Professional video production',
        'On-site shoots (as scheduled)',
        'Drone + cinema camera coverage',
        'Edited, color-graded deliverables',
        'Website maintenance (complimentary)',
        'On-call support',
      ],
      note: 'No posting included. Ambition handles social deployment.',
    },
    {
      tag: 'Recommended',
      name: 'Full Service',
      price: '$2,500',
      color: C.red500,
      highlighted: true,
      features: [
        'Everything in Video Production',
        'Ad creation and management',
        'Social presence upkeep (4-6 posts/mo)',
        'Weekly performance reviews',
        'Stat analysis and reporting',
        'Story-driven posting strategy',
      ],
      note: 'Ad spend is separate (recommended $500-1,500/mo).',
    },
    {
      tag: 'Premium',
      name: 'Full Service + AI',
      price: '$3,500',
      color: C.flame400,
      highlighted: false,
      features: [
        'Everything in Full Service',
        'Ads, video, and social posting',
        '12 posts per month',
        'Custom AI systems for operations',
        'Automated reporting dashboards',
        'Priority scheduling',
      ],
      note: 'Full-stack creative and technology partner.',
    },
  ]

  return (
    <LightSection id="section-plans">
      <MaxWidth>
        <FadeIn>
          <SectionLabel dark={false}>Going Forward</SectionLabel>
          <Heading dark={false}>Monthly Plans.</Heading>
          <Subheading dark={false}>
            All plans depend on scheduled shoots and Ambition keeping AOM informed about upcoming jobs. The more we know, the better the content.
          </Subheading>
        </FadeIn>
        <FadeIn delay={0.15}>
          <div style={{ padding: '16px 22px', marginTop: 32, marginBottom: 40, background: C.navy900, borderLeft: `4px solid ${C.red500}` }}>
            <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray300, lineHeight: 1.65, margin: 0 }}>
              <strong style={{ color: C.white }}>Website hosting note:</strong>{' '}
              The way we built ambitionac.com saves Ambition a minimum of $100/year on hosting costs compared to traditional setups. On-call website maintenance is included at no extra charge across all plans.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={0.2 + i * 0.1}>
              <div style={{
                padding: 32,
                background: plan.highlighted ? C.navy900 : C.offWhite,
                border: plan.highlighted ? `2px solid ${C.red500}` : `1px solid ${C.gray200}`,
                position: 'relative',
                height: '100%',
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: plan.color }} />
                <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: plan.color, marginBottom: 6 }}>{plan.tag}</p>
                <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', color: plan.highlighted ? C.white : C.navy900, marginBottom: 8 }}>{plan.name}</h3>
                <p style={{ fontFamily: F.display, fontWeight: 900, fontSize: 48, color: plan.highlighted ? C.white : C.navy900, lineHeight: 1, marginBottom: 24 }}>
                  {plan.price}<span style={{ fontFamily: F.body, fontWeight: 400, fontSize: 16, color: plan.highlighted ? C.gray400 : C.gray500 }}>/mo</span>
                </p>
                <div style={{ flex: 1 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <Check size={15} color="#22c55e" style={{ flexShrink: 0, marginTop: 3 }} />
                      <p style={{ fontFamily: F.body, fontSize: 14, color: plan.highlighted ? C.gray300 : C.gray600, lineHeight: 1.5, margin: 0 }}>{f}</p>
                    </div>
                  ))}
                </div>
                <p style={{ fontFamily: F.body, fontSize: 13, color: plan.highlighted ? C.gray500 : C.gray400, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${plan.highlighted ? C.navyBorder : C.gray200}` }}>
                  {plan.note}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </MaxWidth>
    </LightSection>
  )
}

/* ================================================================== */
/*  SERVICE CALL PLAN                                                  */
/* ================================================================== */

function ServiceCallPlanSection() {
  return (
    <DarkSection id="section-service-plan">
      <BlueprintPattern opacity={0.04} />
      <MaxWidth>
        <FadeIn>
          <SectionLabel>Getting the Phone to Ring</SectionLabel>
          <Heading>A Content-First Approach to Service Calls.</Heading>
          <Subheading>
            Ambition wants the phone ringing for service calls, especially from kitchens, restaurants, and commercial facilities before summer. Here is the plan.
          </Subheading>
        </FadeIn>

        {/* Competitive Edge */}
        <FadeIn delay={0.2}>
          <div style={{ marginTop: 48, padding: '40px', background: C.navy800, border: `1px solid ${C.navyBorder}`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: C.red500 }} />
            <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red500, marginBottom: 24 }}>The Competitive Edge</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 40 }}>
              <div>
                <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 22, textTransform: 'uppercase', color: C.white, marginBottom: 16 }}>
                  Your Competitors Are Already Running Ads. You Have Better Ammunition.
                </h3>
                <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray400, lineHeight: 1.6, marginBottom: 20 }}>
                  We scraped the Meta Ad Library on March 10, 2026. Here is what we found across the top 10 Arizona HVAC companies.
                </p>
                {[
                  '7 out of 10 major AZ HVAC companies are running Meta ads right now',
                  'Ambition is NOT running any. Wide open lane.',
                  'Most competitors use stock photos and generic copy',
                  'Ambition has 3,138 real video files from 37 actual job sites',
                  'Authentic footage converts 2-3x better than stock',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <CheckCircle2 size={16} color={C.red500} style={{ flexShrink: 0, marginTop: 3 }} />
                    <span style={{ fontFamily: F.body, fontSize: 14, color: C.gray300, lineHeight: 1.55 }}>{item}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: '24px', background: C.navy900, border: `1px solid ${C.navyBorder}` }}>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.navy300, marginBottom: 8 }}>Facebook Ads</p>
                  <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 40, color: C.white, lineHeight: 1, marginBottom: 4 }}>$0.69</div>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray400 }}>Average cost per click</p>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray300, marginTop: 6 }}>$18-45 cost per lead</p>
                </div>
                <div style={{ padding: '24px', background: C.navy900, border: `1px solid ${C.navyBorder}` }}>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.red400, marginBottom: 8 }}>Google Ads</p>
                  <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 40, color: C.white, lineHeight: 1, marginBottom: 4 }}>$29-33</div>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray400 }}>Average CPC (42x more expensive)</p>
                  <p style={{ fontFamily: F.body, fontSize: 13, color: C.gray300, marginTop: 6 }}>$100-250 cost per lead</p>
                </div>
                <div style={{ padding: '14px 18px', textAlign: 'center', background: `${C.red500}16`, border: `1px solid ${C.red500}44` }}>
                  <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 15, textTransform: 'uppercase', color: C.red400 }}>
                    Facebook is 42x cheaper per click than Google
                  </p>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Three Phases */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2, marginTop: 40, marginBottom: 40 }}>
          {[
            {
              phase: 'Phase 1', color: C.red500, icon: Megaphone, title: 'Content-First', timeline: 'Weeks 1-4 | $0 Additional Cost',
              items: [
                'Deploy the 18 branded videos to Instagram + TikTok when each story is worth telling',
                'Launch LinkedIn authority posting (2/week)',
                'Optimize Google Business Profile with project photos + videos',
                'SEO-driven content targeting "commercial HVAC repair Phoenix," "restaurant refrigeration Phoenix"',
                'Leverage the 3,138 clips and 713 photos already captured',
              ]
            },
            {
              phase: 'Phase 2', color: C.flame400, icon: Target, title: 'Targeted Ads', timeline: 'Weeks 4-8 | $500-1,500/mo Ad Spend',
              items: [
                'Facebook/Instagram ads using existing professional footage',
                'Video ads using real job site footage (not stock photos)',
                'Target: Restaurant owners, facility managers, property managers within 30 miles',
                'Most HVAC companies use stock photos. Ambition has 37 real shoots.',
                'Ad formats: video ads, carousel, lead forms',
              ]
            },
            {
              phase: 'Phase 3', color: C.navy300, icon: TrendingUp, title: 'Scale', timeline: 'Month 3+ | Based on Results',
              items: [
                'Retarget website visitors',
                'Lookalike audiences from service call leads',
                'Seasonal push for summer cooling season',
                'Landing pages for each service vertical (restaurants, kitchens, cold storage)',
                'Scale what is working, cut what is not',
              ]
            },
          ].map((phase, i) => {
            const Icon = phase.icon
            return (
              <FadeIn key={phase.phase} delay={0.3 + i * 0.1}>
                <div style={{ padding: 32, background: C.navy800, border: `1px solid ${C.navyBorder}`, position: 'relative', height: '100%' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: phase.color }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Icon size={20} color={phase.color} />
                    <span style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: phase.color }}>{phase.phase}</span>
                  </div>
                  <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', color: C.white, marginBottom: 4 }}>{phase.title}</h3>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.gray500, marginBottom: 20 }}>{phase.timeline}</p>
                  {phase.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: phase.color, flexShrink: 0, marginTop: 7 }} />
                      <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray400, lineHeight: 1.55 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            )
          })}
        </div>

        {/* Budget + ROI */}
        <FadeIn delay={0.5}>
          <div style={{ padding: '40px', background: C.navy800, border: `2px solid ${C.red500}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 40 }}>
              <div>
                <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red500, marginBottom: 12 }}>
                  Recommended Monthly Ad Budget
                </p>
                <div style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(36px, 5vw, 52px)', color: C.white, lineHeight: 1, marginBottom: 6 }}>$500 - $1,500</div>
                <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray400, marginBottom: 24 }}>per month in ad spend</p>
                {[
                  { label: 'At $0.69 CPC', value: '725-2,174 clicks/mo' },
                  { label: 'At $18-45 CPL', value: '11-83 leads/mo' },
                  { label: '5 converted calls at $500-2,000 avg', value: '$2,500-10,000/mo', highlight: true },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', marginBottom: 4,
                    background: row.highlight ? `${C.red500}14` : C.navy900,
                    border: `1px solid ${row.highlight ? C.red500 + '44' : C.navyBorder}`,
                  }}>
                    <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray400 }}>{row.label}</span>
                    <span style={{ fontFamily: F.display, fontWeight: 800, fontSize: 16, color: C.white }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ padding: 32, background: C.navy900, border: `1px solid ${C.navyBorder}`, textAlign: 'center' }}>
                  <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red500, marginBottom: 16 }}>The Bottom Line</p>
                  <p style={{ fontFamily: F.body, fontSize: 16, color: C.gray300, lineHeight: 1.65, marginBottom: 16 }}>
                    You already have the ammunition. The 37 shoots and 3,138 video files ARE the ad library.
                  </p>
                  <div style={{ padding: '16px', background: `${C.red500}14`, border: `1px solid ${C.red500}44` }}>
                    <p style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: C.white, lineHeight: 1.55 }}>
                      Most companies spend $5,000-15,000 just getting the footage you already have. That investment is done. Now it is time to put it to work.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Who is advertising */}
        <FadeIn delay={0.6}>
          <div style={{ marginTop: 40, padding: '32px', background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
            <p style={{ fontFamily: F.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.red500, marginBottom: 24 }}>
              Live Data: Arizona HVAC Companies Running Meta Ads (March 2026)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 4 }}>
              {[
                { name: 'George Brazil', ads: '4 active campaigns', status: 'running' },
                { name: 'Chas Roberts', ads: '2 active campaigns', status: 'running' },
                { name: 'American Home Water & Air', ads: '4 active campaigns', status: 'running' },
                { name: "Brewer's AC & Heating", ads: '5 active campaigns', status: 'running' },
                { name: 'Ideal Air Conditioning', ads: '6 active (18+ months)', status: 'running' },
                { name: 'Ambient Edge HVAC', ads: '4 active campaigns', status: 'running' },
                { name: "Francisco's Cooling", ads: '1 active campaign', status: 'running' },
                { name: 'Pueblo Mechanical', ads: 'Just launched', status: 'running' },
                { name: 'Parker & Sons ($210M+)', ads: 'No active ads', status: 'none' },
                { name: 'Ambition Mechanical', ads: 'Not running any', status: 'opportunity' },
              ].map((company, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
                  background: company.status === 'opportunity' ? `${C.red500}10` : C.navy900,
                  border: `1px solid ${company.status === 'opportunity' ? C.red500 + '44' : C.navyBorder}`,
                }}>
                  <span style={{ fontFamily: F.body, fontWeight: 600, fontSize: 14, color: company.status === 'opportunity' ? C.red400 : C.gray300 }}>{company.name}</span>
                  <span style={{
                    fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: company.status === 'opportunity' ? C.red400 : company.status === 'none' ? C.gray500 : C.navy300,
                  }}>
                    {company.ads}
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: F.body, fontSize: 12, color: C.gray600, marginTop: 14 }}>
              Source: Meta Ad Library, live data pulled March 10, 2026
            </p>
          </div>
        </FadeIn>

        {/* Keyword Research */}
        <FadeIn delay={0.65}>
          <div style={{ marginTop: 40, padding: '40px', background: C.navy800, border: `1px solid ${C.navyBorder}` }}>
            <p style={{ fontFamily: F.display, fontWeight: 800, fontSize: 20, textTransform: 'uppercase', color: C.white, marginBottom: 8 }}>Keyword Research: What People Are Searching For</p>
            <p style={{ fontFamily: F.body, fontSize: 15, color: C.gray400, lineHeight: 1.6, marginBottom: 28 }}>
              Urgency + service type + location = the calls that turn into revenue.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
              {[
                {
                  label: 'Commercial HVAC (Very High Priority)', color: '#22c55e',
                  keywords: ['commercial HVAC repair Phoenix', 'commercial AC repair Phoenix AZ', 'AC not working commercial building Phoenix', 'emergency HVAC repair Phoenix same day', '24 hour commercial AC repair Phoenix AZ'],
                },
                {
                  label: 'Restaurants / Kitchens (Highest Volume)', color: C.flame400,
                  keywords: ['commercial refrigeration repair Phoenix', 'walk-in cooler repair Phoenix AZ', 'restaurant equipment repair Phoenix', 'ice machine repair Phoenix', 'commercial kitchen equipment repair near me'],
                },
              ].map((group, i) => (
                <div key={i}>
                  <p style={{ fontFamily: F.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: group.color, marginBottom: 14 }}>{group.label}</p>
                  {group.keywords.map((kw, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 4, background: C.navy900, border: `1px solid ${C.navyBorder}` }}>
                      <Zap size={12} color={group.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: F.body, fontSize: 13, color: C.gray300 }}>{kw}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: '16px 20px', background: C.navy900, borderLeft: `4px solid ${C.red500}` }}>
              <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray300, lineHeight: 1.65, margin: 0 }}>
                <strong style={{ color: C.white }}>Restaurant equipment repair is the highest-volume category.</strong>{' '}
                Refrigeration generates the most service calls industry-wide. This is where the phone starts ringing.
              </p>
            </div>
          </div>
        </FadeIn>
      </MaxWidth>
    </DarkSection>
  )
}

/* ================================================================== */
/*  WHAT'S NEXT                                                        */
/* ================================================================== */

function WhatsNextSection() {
  const nextSteps = [
    {
      number: '01', color: C.red500, title: 'Story-Driven Posting',
      desc: "Every post follows a real project narrative. No posting for the sake of posting. When there's a story worth telling, we tell it right.",
    },
    {
      number: '02', color: C.navy300, title: 'Google Business Profile Optimization',
      desc: 'Upload project photos and videos to Google Business Profile. Free visibility to anyone searching for HVAC services in Phoenix.',
    },
    {
      number: '03', color: C.flame400, title: 'Targeted Ad Campaign (When Ready)',
      desc: "Use existing footage to run Facebook/Instagram ads targeting restaurants and facility managers. $0.69/click vs $29+ on Google. The content is already shot.",
    },
    {
      number: '04', color: '#22c55e', title: 'Monthly Performance Reporting',
      desc: "Transparent data on what's working. Views, engagement, leads. No vanity metrics.",
    },
  ]

  return (
    <OffWhiteSection id="section-next">
      <MaxWidth>
        <FadeIn>
          <SectionLabel dark={false}>What's Next</SectionLabel>
          <Heading dark={false}>Quality Over Volume.</Heading>
          <Subheading dark={false}>
            The foundation is built. The content exists. These are the four moves that turn production assets into inbound service calls.
          </Subheading>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2, marginTop: 48 }}>
          {nextSteps.map((step, i) => (
            <FadeIn key={step.number} delay={i * 0.1}>
              <div style={{
                padding: 32,
                background: C.white,
                border: `1px solid ${C.gray200}`,
                position: 'relative',
                height: '100%',
                transition: 'border-color 200ms',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = step.color}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.gray200}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: step.color }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                  <span style={{ fontFamily: F.display, fontWeight: 900, fontSize: 48, lineHeight: 1, color: `${step.color}22`, flexShrink: 0 }}>{step.number}</span>
                  <div>
                    <h3 style={{ fontFamily: F.display, fontWeight: 800, fontSize: 19, textTransform: 'uppercase', color: C.navy900, marginBottom: 10 }}>{step.title}</h3>
                    <p style={{ fontFamily: F.body, fontSize: 14, color: C.gray500, lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </MaxWidth>
    </OffWhiteSection>
  )
}

/* ================================================================== */
/*  FOOTER                                                             */
/* ================================================================== */

function FooterSection() {
  return (
    <footer style={{ background: C.navy950, borderTop: `4px solid ${C.red500}`, padding: '64px 24px', textAlign: 'center' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ width: 48, height: 3, background: C.red500, margin: '0 auto 28px' }} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <h2 style={{ fontFamily: F.display, fontWeight: 900, fontSize: 'clamp(28px, 5vw, 42px)', textTransform: 'uppercase', letterSpacing: '0.03em', color: C.white, lineHeight: 1.1 }}>
            Built by AOM. Built to Last.
          </h2>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p style={{ fontFamily: F.body, fontSize: 16, color: C.gray400, lineHeight: 1.7, marginTop: 16, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            This is what 11 months of dedicated creative production looks like. One team. One vision. Hundreds of hours of work invested in making Ambition Mechanical look as good as the work they do.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 32 }}>
            <a
              href="https://www.instagram.com/ambition_air_conditioning/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: F.display,
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: C.white,
                border: `2px solid ${C.white}`,
                padding: '12px 28px',
                textDecoration: 'none',
                transition: 'background 200ms, color 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.white; e.currentTarget.style.color = C.navy950 }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.white }}
            >
              Instagram
            </a>
            <a
              href="https://ambitionac.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: F.display,
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: C.white,
                background: C.red500,
                border: `2px solid ${C.red500}`,
                padding: '12px 28px',
                textDecoration: 'none',
              }}
            >
              ambitionac.com
            </a>
          </div>
        </FadeIn>
        <FadeIn delay={0.4}>
          <p style={{ fontFamily: F.body, fontSize: 11, color: C.gray600, marginTop: 48 }}>
            &copy; {new Date().getFullYear()} AOM (Ahead of Market). Prepared for Ambition Mechanical Services.
          </p>
        </FadeIn>
      </div>
    </footer>
  )
}

/* ================================================================== */
/*  MAIN EXPORT                                                        */
/* ================================================================== */

export default function AmbitionPerformanceV2() {
  useSEO()
  useFonts()

  return (
    <div style={{ fontFamily: F.body, background: C.navy950, overflowX: 'hidden' }}>
      <NavBar />
      <div style={{ paddingTop: 60 }}>
        <HeroSection />
        <StatsSection />
        <SocialSection />
        <ContentStrategySection />
        <ClientsSection />
        <ShootsSection />
        <SitesSection />
        <ContentArsenalSection />
        <WebsiteSection />
        <EquipmentSection />
        <ValueSection />
        <HoursSection />
        <MonthlyPlansSection />
        <ServiceCallPlanSection />
        <WhatsNextSection />
        <FooterSection />
      </div>
    </div>
  )
}
