import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ChevronDown, Camera, Film, Globe, Instagram, Linkedin, MapPin, Calendar, Clock, DollarSign, TrendingUp, Video, Image, Mic, FileText, ArrowRight, Star, Flame, Zap } from 'lucide-react';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';

/* ── SEO ────────────────────────────────────────────────────────── */
function useSEO() {
  useEffect(() => {
    document.title = 'Ambition Mechanical Services | Performance Report | AOM';
    const setMeta = (name, content, property = false) => {
      const attr = property ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };
    setMeta('description', 'Ambition Mechanical Services x AOM: 11-month performance report. 37 shoots. 88+ videos. $78k+ in delivered value.');
    setMeta('og:title', 'Ambition Mechanical Services | Performance Report', true);
    setMeta('og:description', '37 shoots. 88+ videos. 57 posts. 1 custom website. 11 months of creative production for Ambition Mechanical.', true);
    setMeta('og:type', 'article', true);
    setMeta('og:url', 'https://aheadofmarket.com/brands/ambition/performance', true);
  }, []);
}

/* ── Noise overlay ─────────────────────────────────────────────── */
function NoiseOverlay({ opacity = 0.03, blend = 'overlay' }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[1]"
      style={{
        opacity,
        mixBlendMode: blend,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
      }}
    />
  );
}

/* ── Section label ─────────────────────────────────────────────── */
function SectionLabel({ label, centered = false }) {
  return (
    <div className={centered ? 'text-center' : ''}>
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">
        {label}
      </p>
      <div className={`w-12 h-[2px] bg-[#E85D26] mb-8 ${centered ? 'mx-auto' : ''}`} />
    </div>
  );
}

/* ── Scroll reveal wrapper ─────────────────────────────────────── */
function Reveal({ children, delay = 0, className = '', direction = 'y' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const initial = prefersReduced
    ? { opacity: 1 }
    : { opacity: 0, ...(direction === 'y' ? { y: 30 } : { x: -20 }) };
  const animate = isInView
    ? { opacity: 1, y: 0, x: 0 }
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
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
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced) { setValue(end); return; }
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, inView, prefersReduced]);

  return value;
}

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({ number, suffix = '', prefix = '', label, context, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const countValue = useCountUp(number, 1400, isInView);

  return (
    <Reveal delay={index * 0.1}>
      <div ref={ref} className="text-center p-6 md:p-8 relative border border-[#292524] bg-[#1A1A17] overflow-hidden group hover:border-[#E85D26]/30 transition-all duration-500">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#E85D26]" />
        <div className="font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold italic leading-none tabular-nums text-[#F5F0EB]">
          {prefix}{isInView ? countValue : 0}{suffix}
        </div>
        <p className="font-headline text-sm font-bold uppercase tracking-tight mt-4 text-[#E85D26]">
          {label}
        </p>
        {context && (
          <p className="text-sm font-body mt-2 text-[#78716C]">
            {context}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/* ════════════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════════════ */

const heroStats = [
  { number: 37, suffix: '', label: 'Professional Video Shoots', context: 'Across the Phoenix metro' },
  { number: 88, suffix: '+', label: 'Videos Produced', context: 'Edited, color-graded, delivered' },
  { number: 57, suffix: '', label: 'Instagram Posts Published', context: 'Growing the brand online' },
  { number: 1537, suffix: '', label: 'Instagram Followers', context: 'Organic audience growth', prefix: '' },
  { number: 22, suffix: '+', label: 'Job Sites Documented', context: 'Premium client locations' },
  { number: 1, suffix: '', label: 'Custom Website', context: 'Built and launched' },
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
  { name: 'DJI Air 3 / Air 3S', type: 'Drone', detail: '25+ aerial sessions', icon: '🔺' },
  { name: 'DJI Ronin 4D', type: 'Cinema Camera', detail: 'Feature-film grade footage', icon: '🎬' },
  { name: 'Panasonic S5IIX', type: 'Photo/Video', detail: 'Hybrid stills and motion', icon: '📷' },
  { name: 'DJI OSMO Action 3', type: 'Action Cam', detail: 'Dynamic POV coverage', icon: '🏃' },
  { name: 'BlackMagic Camera App', type: 'Mobile Cinema', detail: 'Professional mobile capture', icon: '📱' },
  { name: 'DJI Mic', type: 'Professional Audio', detail: 'Crystal-clear interviews', icon: '🎙️' },
];

const contentArsenal = [
  { number: 48, label: 'Branded Video Templates', desc: 'Custom motion graphics system' },
  { number: 17, label: 'Professional Video Edits', desc: 'Polished edit iterations' },
  { number: 18, label: 'Branded Post Designs', desc: 'On-brand social content' },
  { number: 14, label: 'Voiceover Recordings', desc: 'Professional narration' },
  { number: 30, label: 'Day Content Calendar', desc: 'With 28 planned pieces' },
  { number: 6, label: 'Content Pillars Defined', desc: 'Strategic framework' },
];

const contentPillars = [
  'The Work', 'Before / After', 'Education', 'Team', 'Local', 'Social Proof',
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

/* ════════════════════════════════════════════════════════════════
   HERO SECTION
   ════════════════════════════════════════════════════════════════ */
function HeroSection() {
  const scrollToNext = () => {
    const el = document.getElementById('section-stats');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0C0C0C]">
      <NoiseOverlay />
      <div
        className="absolute inset-0 pointer-events-none z-[2]"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 20%, rgba(232, 93, 38, 0.06), transparent)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <Reveal>
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">
            CLIENT PERFORMANCE REPORT
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="w-12 h-[2px] bg-[#E85D26] mx-auto mb-8" />
        </Reveal>

        <Reveal delay={0.15}>
          <p className="font-mono text-sm text-[#E85D26] tracking-wide mb-6">
            APRIL 2025 &mdash; MARCH 2026
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <h1 className="font-headline text-5xl md:text-6xl lg:text-7xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB] leading-[0.95]">
            AMBITION<br />MECHANICAL<br />SERVICES
          </h1>
        </Reveal>

        <Reveal delay={0.35}>
          <p className="text-[#A8A29E] text-lg md:text-xl text-center mt-8 max-w-2xl mx-auto leading-relaxed font-body">
            11 months of creative production partnership. 37 shoots. 88+ videos. 1 custom website. Here's everything we've built together.
          </p>
        </Reveal>

        <Reveal delay={0.45}>
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">Produced by</span>
            <span className="font-headline text-sm font-extrabold uppercase tracking-tight text-[#E85D26]">AOM</span>
            <span className="text-[10px] font-mono text-[#78716C]">|</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">Phoenix, AZ</span>
          </div>
        </Reveal>
      </div>

      <button
        onClick={scrollToNext}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity z-10 cursor-pointer"
      >
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C]">
          SEE THE RESULTS
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
        >
          <ChevronDown size={16} className="text-[#78716C]" />
        </motion.div>
      </button>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   BY THE NUMBERS
   ════════════════════════════════════════════════════════════════ */
function StatsSection() {
  return (
    <section id="section-stats" className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="BY THE NUMBERS" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            11 MONTHS OF OUTPUT.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-16">
          {heroStats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} index={i} />
          ))}
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
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-28 overflow-hidden">
      <NoiseOverlay />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <Reveal>
          <SectionLabel label="WHERE WE'VE SHOT" centered />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            NAMES THAT SPEAK FOR THEMSELVES.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mx-auto mt-6 font-body">
            Ambition Mechanical's client roster includes some of the most recognized brands in hospitality, retail, healthcare, and luxury. AOM has documented work at all of them.
          </p>
        </Reveal>

        <div className="flex flex-wrap justify-center gap-3 md:gap-4 mt-12">
          {highProfileClients.map((client, i) => (
            <Reveal key={client} delay={i * 0.06}>
              <div className="bg-[#1A1A17] border border-[#292524] px-5 py-3 md:px-6 md:py-3.5 font-headline text-sm md:text-base font-bold uppercase tracking-tight text-[#F5F0EB] hover:border-[#E85D26]/40 transition-colors duration-300">
                {client}
              </div>
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

const typeColors = {
  Commercial: '#E85D26',
  Restaurant: '#C9A84C',
  Team: '#7C9A72',
  Retail: '#E85D26',
  Healthcare: '#7C9A72',
  Brand: '#E85D26',
  Industrial: '#A8A29E',
  Luxury: '#C9A84C',
};

function ShootsSection() {
  const [expanded, setExpanded] = useState(false);
  const visibleShoots = expanded ? shoots : shoots.slice(0, 12);

  return (
    <section className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="PRODUCTION LOG" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            37 SHOOTS. 11 MONTHS. ZERO MISSED.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mt-6 font-body">
            Every shoot logged, organized, and delivered. From the first day at Fashion Square to the latest Memorial Tower session.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mt-12">
          {visibleShoots.map((shoot, i) => (
            <Reveal key={`${shoot.name}-${i}`} delay={Math.min(i * 0.05, 0.5)}>
              <div className="bg-[#1A1A17] border border-[#292524] p-5 relative overflow-hidden group hover:border-[#44403C] transition-colors duration-300">
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: typeColors[shoot.type] || '#E85D26' }} />
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C]">
                    {shoot.month}
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] px-2 py-0.5 border"
                    style={{ borderColor: typeColors[shoot.type] || '#E85D26', color: typeColors[shoot.type] || '#E85D26' }}
                  >
                    {shoot.type}
                  </span>
                </div>
                <h3 className="font-headline text-sm font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-1">
                  {shoot.name}
                </h3>
                <p className="text-[#A8A29E] text-xs leading-relaxed font-body">{shoot.details}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {!expanded && (
          <Reveal delay={0.3}>
            <div className="text-center mt-8">
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-2 font-headline text-sm font-extrabold uppercase tracking-tight px-8 py-3 border border-[#E85D26] text-[#E85D26] hover:bg-[#E85D26] hover:text-white transition-all duration-300 cursor-pointer"
              >
                VIEW ALL 37 SHOOTS
                <ChevronDown size={16} />
              </button>
            </div>
          </Reveal>
        )}

        {expanded && (
          <Reveal>
            <div className="text-center mt-8">
              <button
                onClick={() => setExpanded(false)}
                className="inline-flex items-center gap-2 font-mono text-xs text-[#78716C] hover:text-[#A8A29E] transition-colors cursor-pointer"
              >
                COLLAPSE
              </button>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   CONTENT ARSENAL
   ════════════════════════════════════════════════════════════════ */
function ContentSection() {
  return (
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-32 overflow-hidden">
      <NoiseOverlay />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="CONTENT ARSENAL" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            READY TO DEPLOY.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mt-6 font-body">
            Beyond shoots and edits, AOM has built a complete content system for Ambition Mechanical. Templates, strategies, calendars, and voice recordings, all designed to scale.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-12">
          {contentArsenal.map((item, i) => (
            <Reveal key={item.label} delay={i * 0.1}>
              <div className="bg-[#1A1A17] border border-[#292524] p-6 relative overflow-hidden hover:border-[#44403C] transition-colors duration-300">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E85D26]" />
                <div className="font-headline text-4xl md:text-5xl font-extrabold italic text-[#F5F0EB] leading-none">
                  {item.number}
                </div>
                <p className="font-headline text-sm font-bold uppercase tracking-tight text-[#E85D26] mt-3">
                  {item.label}
                </p>
                <p className="text-[#A8A29E] text-sm font-body mt-2">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Content Pillars */}
        <Reveal delay={0.3} className="mt-16">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-6">
            6 CONTENT PILLARS
          </p>
          <div className="flex flex-wrap gap-3">
            {contentPillars.map((pillar, i) => (
              <Reveal key={pillar} delay={0.3 + i * 0.06}>
                <div className="bg-[#0C0C0C] border border-[#292524] px-5 py-3 font-headline text-sm font-bold uppercase tracking-tight text-[#F5F0EB]">
                  {pillar}
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Brand Guidelines */}
        <Reveal delay={0.4} className="mt-10">
          <div className="bg-[#1A1A17] border border-[#292524] p-6 md:p-8 max-w-2xl">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-3">
              ALSO DELIVERED
            </p>
            <ul className="space-y-2">
              {['Brand guidelines documentation (3 versions)', 'LinkedIn authority post drafts', 'Content strategy blueprint', '30-day content calendar with 28 planned pieces'].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <ArrowRight size={14} className="text-[#E85D26] shrink-0 mt-1" />
                  <span className="text-[#A8A29E] text-sm font-body">{item}</span>
                </li>
              ))}
            </ul>
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
    <section className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="WEB DEVELOPMENT" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            A WEBSITE BUILT FROM SCRATCH.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="bg-[#1A1A17] border border-[#292524] p-8 md:p-10 mt-12 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#E85D26]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-4">
                  CUSTOM-BUILT FOR AMBITION
                </p>
                <h3 className="font-headline text-2xl md:text-3xl font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-4">
                  ambitionac.com
                </h3>
                <p className="text-[#A8A29E] text-base leading-relaxed font-body mb-6">
                  A modern, mobile-first website showcasing Ambition Mechanical's services, projects, and team. Built with enterprise-grade technology and launched in March 2026.
                </p>
                <div className="space-y-3">
                  {[
                    'React + Firebase + Tailwind CSS',
                    'CMS admin panel for content updates',
                    'Mobile responsive across all devices',
                    'SEO optimized for local search',
                    'Contact form with lead capture',
                    'Projects showcase with photo galleries',
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-[#E85D26] shrink-0" />
                      <span className="text-[#A8A29E] text-sm font-body">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center items-center">
                <div className="text-center">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-2">LAUNCHED</p>
                  <p className="font-headline text-2xl font-extrabold italic text-[#F5F0EB]">MARCH 6, 2026</p>
                  <div className="w-12 h-[2px] bg-[#E85D26] mx-auto my-4" />
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-2">MARKET VALUE</p>
                  <p className="font-headline text-3xl md:text-4xl font-extrabold italic text-[#E85D26]">$4,000 - $8,000</p>
                </div>
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
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-28 overflow-hidden">
      <NoiseOverlay />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="PRODUCTION GEAR" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            PROFESSIONAL-GRADE TOOLS.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {equipment.map((item, i) => (
            <Reveal key={item.name} delay={i * 0.1}>
              <div className="bg-[#1A1A17] border border-[#292524] p-5 hover:border-[#44403C] transition-colors duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-headline text-sm font-extrabold italic uppercase tracking-tight text-[#F5F0EB]">
                      {item.name}
                    </h3>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[#E85D26]">
                      {item.type}
                    </p>
                  </div>
                </div>
                <p className="text-[#A8A29E] text-sm font-body">{item.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   MARKET VALUE COMPARISON (LIGHT SECTION)
   ════════════════════════════════════════════════════════════════ */
function ValueSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const marketValue = useCountUp(78000, 2000, isInView);
  const amountPaid = useCountUp(22000, 1800, isInView);

  return (
    <section ref={ref} className="relative bg-[#F5F0EB] py-16 md:py-24 lg:py-32">
      <NoiseOverlay opacity={0.02} blend="soft-light" />
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="VALUE ANALYSIS" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#0C0C0C]">
            WHAT THIS IS WORTH.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-[#57534E] text-base md:text-lg leading-relaxed max-w-3xl mt-6 font-body">
            At standard Phoenix market rates, here's the value AOM has delivered in 11 months.
          </p>
        </Reveal>

        {/* Comparison Table -- Desktop */}
        <Reveal delay={0.2} className="mt-12">
          <div className="hidden md:block overflow-hidden border border-[#A8A29E]/20 rounded-sm">
            <table className="w-full bg-white">
              <thead>
                <tr>
                  <th className="bg-[#0C0C0C] text-[#F5F0EB] text-[10px] font-mono font-bold uppercase tracking-[0.3em] px-6 py-4 text-left">
                    Deliverable
                  </th>
                  <th className="bg-[#0C0C0C] text-[#F5F0EB] text-[10px] font-mono font-bold uppercase tracking-[0.3em] px-6 py-4 text-left">
                    Market Rate
                  </th>
                  <th className="bg-[#E85D26] text-white text-[10px] font-mono font-bold uppercase tracking-[0.3em] px-6 py-4 text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {valueComparison.map((row, i) => (
                  <tr key={row.item} className={i % 2 === 1 ? 'bg-[#F9F7F4]' : 'bg-white'}>
                    <td className="px-6 py-4 border-b border-[#A8A29E]/10">
                      <span className="font-body text-sm font-semibold text-[#0C0C0C]">{row.item}</span>
                    </td>
                    <td className="px-6 py-4 border-b border-[#A8A29E]/10">
                      <span className="font-mono text-sm text-[#57534E]">{row.rate}</span>
                    </td>
                    <td className="px-6 py-4 border-b border-[#A8A29E]/10 text-right">
                      <span className="font-headline text-base font-extrabold italic text-[#0C0C0C]">{row.value}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#0C0C0C]">
                  <td colSpan={2} className="px-6 py-5">
                    <span className="font-headline text-xl font-extrabold italic text-[#F5F0EB]">ESTIMATED MARKET VALUE</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="font-headline text-2xl font-extrabold italic text-[#E85D26]">$78,000+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {valueComparison.map((row) => (
              <div key={row.item} className="bg-white p-5 border border-[#A8A29E]/10">
                <p className="font-headline text-sm font-bold uppercase text-[#0C0C0C] mb-2">{row.item}</p>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-[#57534E]">{row.rate}</span>
                  <span className="font-headline text-base font-extrabold italic text-[#0C0C0C]">{row.value}</span>
                </div>
              </div>
            ))}
            <div className="bg-[#0C0C0C] p-5 text-center">
              <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#78716C] mb-1">ESTIMATED MARKET VALUE</p>
              <p className="font-headline text-2xl font-extrabold italic text-[#E85D26]">$78,000+</p>
            </div>
          </div>
        </Reveal>

        {/* The Big Comparison */}
        <Reveal delay={0.3} className="mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="text-center p-8 bg-white border border-[#A8A29E]/20">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-3">MARKET VALUE</p>
              <p className="font-headline text-4xl md:text-5xl font-extrabold italic text-[#0C0C0C]">
                ${isInView ? marketValue.toLocaleString() : '0'}+
              </p>
            </div>
            <div className="text-center">
              <p className="font-headline text-2xl font-extrabold italic text-[#78716C]">vs</p>
            </div>
            <div className="text-center p-8 bg-white border-2 border-[#E85D26]">
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C] mb-3">AMOUNT PAID</p>
              <p className="font-headline text-4xl md:text-5xl font-extrabold italic text-[#E85D26]">
                ${isInView ? amountPaid.toLocaleString() : '0'}
              </p>
              <p className="text-[10px] font-mono text-[#78716C] mt-2">11 months x $2,000/month</p>
            </div>
          </div>
        </Reveal>

        {/* ROI Callout */}
        <Reveal delay={0.4} className="mt-12 text-center">
          <div className="inline-block bg-[#0C0C0C] px-10 py-6">
            <p className="font-headline text-5xl md:text-6xl font-extrabold italic text-[#E85D26]">
              3.5x
            </p>
            <p className="font-headline text-base font-bold uppercase tracking-tight text-[#F5F0EB] mt-2">
              RETURN ON INVESTMENT
            </p>
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
    <section ref={ref} className="relative bg-[#0C0C0C] py-16 md:py-24 lg:py-32">
      <NoiseOverlay />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="TIME INVESTED" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            NEARLY 500 HOURS OF WORK.
          </h2>
        </Reveal>

        <div className="mt-12 space-y-3">
          {hoursBreakdown.map((item, i) => (
            <Reveal key={item.activity} delay={i * 0.08}>
              <div className="bg-[#1A1A17] border border-[#292524] p-5 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-headline text-sm font-extrabold italic uppercase tracking-tight text-[#F5F0EB]">
                    {item.activity}
                  </h3>
                  <p className="text-[#78716C] text-xs font-mono mt-1">{item.calc}</p>
                </div>
                <div className="font-headline text-2xl md:text-3xl font-extrabold italic text-[#E85D26] tabular-nums">
                  {item.hours}<span className="text-base text-[#78716C] ml-1">hrs</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Total */}
        <Reveal delay={0.5} className="mt-8">
          <div className="bg-[#1A1A17] border-2 border-[#E85D26] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="font-headline text-lg font-extrabold italic uppercase tracking-tight text-[#F5F0EB]">
                TOTAL ESTIMATED HOURS
              </p>
              <p className="text-[#78716C] text-sm font-body mt-1">
                Effective rate: ~$44.62/hour (market rate: $100-200/hr)
              </p>
            </div>
            <div className="font-headline text-5xl md:text-6xl font-extrabold italic text-[#E85D26] tabular-nums">
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
    <section className="relative bg-[#141412] py-16 md:py-24 lg:py-32 overflow-hidden">
      <NoiseOverlay />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/[0.03] to-transparent pointer-events-none" />
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <Reveal>
          <SectionLabel label="WHAT'S NEXT" />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            THE FOUNDATION IS BUILT. NOW WE SCALE.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="text-[#A8A29E] text-base md:text-lg leading-relaxed max-w-3xl mt-6 font-body">
            11 months of production work has created a massive content arsenal. The shoots are done, the templates are built, and the strategy is locked. The next phase is about putting all of it to work.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mt-12">
          {nextSteps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12}>
              <div className="bg-[#1A1A17] border border-[#292524] p-6 relative overflow-hidden hover:border-[#E85D26]/30 transition-colors duration-300">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#E85D26]" />
                <h3 className="font-headline text-base font-extrabold italic uppercase tracking-tight text-[#F5F0EB] mb-3 pl-2">
                  {step.title}
                </h3>
                <p className="text-[#A8A29E] text-sm leading-relaxed font-body pl-2">{step.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   FOOTER CTA
   ════════════════════════════════════════════════════════════════ */
function FooterCTA() {
  return (
    <section className="relative bg-[#0C0C0C] py-20 md:py-28">
      <NoiseOverlay />
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <Reveal>
          <SectionLabel label="PARTNERSHIP" centered />
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-headline text-2xl md:text-3xl lg:text-4xl font-extrabold italic uppercase tracking-tighter text-[#F5F0EB]">
            BUILT BY AOM. BUILT TO LAST.
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-[#A8A29E] text-lg mt-6 max-w-xl mx-auto font-body leading-relaxed">
            This is what 11 months of dedicated creative production looks like. One team. One vision. Hundreds of hours of work invested in making Ambition Mechanical look as good as the work they do.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
            <a
              href="https://www.instagram.com/ambition_air_conditioning/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-headline text-sm font-extrabold uppercase tracking-tight px-8 py-4 border border-[#F5F0EB] text-[#F5F0EB] hover:bg-[#F5F0EB] hover:text-[#0C0C0C] transition-all duration-300"
            >
              <Instagram size={18} />
              FOLLOW ON INSTAGRAM
            </a>
            <a
              href="https://www.linkedin.com/company/ambition-mechanical-services"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-headline text-sm font-extrabold uppercase tracking-tight px-8 py-4 border border-[#E85D26] text-[#E85D26] hover:bg-[#E85D26] hover:text-white transition-all duration-300"
            >
              <Linkedin size={18} />
              CONNECT ON LINKEDIN
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <div className="mt-12 pt-8 border-t border-[#292524]">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-[#78716C]">
              PRODUCED BY AOM &bull; AHEAD OF MARKET &bull; PHOENIX, AZ
            </p>
            <a
              href="https://aheadofmarket.com"
              className="inline-block mt-3 text-[#E85D26] text-sm font-body hover:underline transition-all duration-200"
            >
              aheadofmarket.com
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE EXPORT
   ════════════════════════════════════════════════════════════════ */
export default function AmbitionPerformance() {
  useSEO();

  return (
    <div className="bg-[#0C0C0C] min-h-screen">
      <SiteNav transparent />
      <HeroSection />
      <StatsSection />
      <ClientsSection />
      <ShootsSection />
      <ContentSection />
      <WebsiteSection />
      <EquipmentSection />
      <ValueSection />
      <HoursSection />
      <WhatsNextSection />
      <FooterCTA />
      <SiteFooter />
    </div>
  );
}
