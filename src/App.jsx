import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  X, ChevronRight, Loader2,
  Activity, Target, Layers, Zap, Smartphone, Clapperboard, CheckCircle2,
  Volume2, ArrowRight, ArrowDownRight,
  ShieldCheck, Clock3, Users, Building2, BadgeCheck, Star, Sparkles, Coins, ScrollText,
  Lightbulb, Rocket, Repeat, Crown, Fingerprint, Mic2,
  Download, Calendar, TrendingUp, PlaneTakeoff, Globe, Navigation, MapPin, Truck,
  Phone, Mic, Monitor, Cpu, Headphones, Speaker, MousePointer2, Mail, Landmark,
  ChevronLeft, AlertCircle
} from 'lucide-react';

import HeroSection from './components/HeroSection';
import ServicesGrid from './components/ServicesGrid';
import ConstructionCallout from './components/ConstructionCallout';
import AITeaser from './components/AITeaser';

// --- FIREBASE & STORAGE CONFIG ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'aom-studio';
let app, auth, db;

if (firebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// --- UTILITIES ---
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- BRAND CONSTANTS ---
const ORANGE = "#FF4F00";
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xbdalqvg";
const MAIN_PHONE = "6023732164";
const BUDGET_OPTIONS = ["$2k - $5k", "$5k - $10k", "$10k - $25k", "$25k+"];
const GOAL_OPTIONS = ["Close more sales", "Recruiting", "Investor / fundraising", "Brand trust", "Event recap", "Launch", "Other"];
const PLACEMENT_OPTIONS = ["Website", "Ads", "LinkedIn", "Instagram/TikTok", "Sales outreach", "Internal", "Not sure"];
const TIMING_OPTIONS = ["ASAP (1–2 weeks)", "This month", "Next 30–60 days", "Quarterly/ongoing"];
const CHARS = "-_~*+[]!@#%&";

const INITIAL_FORM_STATE = {
  name: '', 
  email: '', 
  budget: '',
  goal: '',
  problem: '',
  placement: '',
  timing: ''
};

// --- DATA: TRUST & AUTHORITY ---
const TRUST_METRICS = [
  { icon: ShieldCheck, label: "Predictable Delivery", value: "Tight timelines", sub: "Structured pre-pro + capture + edit pipeline." },
  { icon: Clock3, label: "Fast Turnarounds", value: "24–72hr", sub: "For selects + social cuts when needed." },
  { icon: Users, label: "Lean Crew", value: "Cinema-grade", sub: "Efficient staffing, zero chaos, high output." },
  { icon: BadgeCheck, label: "Brand Consistency", value: "Repeatable", sub: "Systems for matching style across assets." },
];



const TESTIMONIALS = [
  {
    quote: "The video was a huge recruiting tool in recruiting our first 3 cohorts and showing people what we're about.",
    metric: "Attracted 3-Cohorts and 40+ Founders",
    name: "Brandon Clarke",
    company: "Startup AZ Foundation",
    industry: "Tech-Investments"
  },
  {
    quote: "Before AOM, we were posting randomly. Now we have a repeatable system that fills our pipeline. Our outreach finally has teeth.",
    metric: "150% pipeline growth",
    name: "Sumit Seth",
    company: "Naamly",
    industry: "SaaS"
  },
  {
    quote: "They didn't just shoot beautiful footage. They showed people the place I created had legacy",
    metric: "3 venue launches",
    name: "Gio Osso",
    company: "Virtu Hospitality Group",
    industry: "Hospitality"
  }
];

const FAQS = [
  { q: "What happens after I hit “Start Brief”?", a: "You submit your scope, budget, and timing. We reply with a fast scope call and a simple plan for deliverables." },
  { q: "Do you handle strategy or just production?", a: "Both. Strategy first. If the asset doesn’t move trust or attention, it’s just expensive footage." },
  { q: "How fast can you turn edits?", a: "Social selects can be 24–72 hours. Hero edits typically land on a planned cadence." }
];

// --- MASTER PORTFOLIO LIBRARY ---
const PORTFOLIO_DATA = {
  marketing: {
    campaigns: [
      { title: "Journey To Gary Vee", sub: "Cinematic Story", url: "https://gumlet.tv/watch/698a6296fc23d3d76fa8d992/", tags: ["Narrative"] },
      { title: "Noble Real Estate", sub: "Agency Brand", url: "https://gumlet.tv/watch/698a5b86fc23d3d76fa82ece/", tags: ["Real Estate"] },
      { title: "Rainbow Rider", sub: "Experience Asset", url: "https://gumlet.tv/watch/698a6106aec3d4e420c2fd85/", tags: ["Vibe", "Brand"] },
      { title: "Pretty Penny", sub: "Restaurant Identity", url: "https://gumlet.tv/watch/698a5d24aec3d4e420c2a0a0/", tags: ["Food", "Brand"] },
      { title: "Virtu Hospitality", sub: "Scottsdale Premium", url: "https://gumlet.tv/watch/698a5ef5fc23d3d76fa87ef4/", tags: ["Luxury", "Food"] },
      { title: "AZ Arts Foundation", sub: "Trust Piece", url: "https://gumlet.tv/watch/698a64e5873071aec5ca99ac/", tags: ["Non-Profit"] },
      { title: "Cynshine Pilates", sub: "Founder Story", url: "https://gumlet.tv/watch/698a63e5aec3d4e420c34783/", tags: ["Wellness"] },
      { title: "ASU:Peoria Forward", sub: "Trust Asset", url: "https://gumlet.tv/watch/698a6127873071aec5ca3b36/", tags: ["Entrepreneurship"] },
      { title: "Keep it Cut", sub: "Recruiting Film", url: "https://gumlet.tv/watch/698a6177873071aec5ca4374/", tags: ["HR", "Culture"] },
      { title: "United Food Bank", sub: "Year End Impact", url: "https://gumlet.tv/watch/698a5fcdfc23d3d76fa893b8/", tags: ["Non-Profit"] },
      { title: "UFB Volunteer", sub: "Community Doc", url: "https://gumlet.tv/watch/698a5fc4fc23d3d76fa892d9/", tags: ["Doc"] },
      { title: "Aiper Pool Party", sub: "Event Promo", url: "https://gumlet.tv/watch/698a58c0aec3d4e420c21b78/", tags: ["Consumer"] },

      // added from your note
      { title: "Ducor Event Recap", sub: "Event Recap", url: "https://gumlet.tv/watch/698a53a4aec3d4e420c17ee0/", tags: ["Event", "Brand"] },
      { title: "Cook & Craft Website Background", sub: "Website Background", url: "https://gumlet.tv/watch/698a53a9873071aec5c8b9d7/", tags: ["Web", "Food"] },
      { title: "Ulisgold Pilates", sub: "Wellness Brand", url: "https://gumlet.tv/watch/698a5ebcaec3d4e420c2c573/", tags: ["Wellness", "Brand"] },
      { title: "Jason Amador: GCU Basketball x NABI", sub: "Athlete Story", url: "https://gumlet.tv/watch/698a5a6caec3d4e420c25e1a/", tags: ["Doc", "Sports"] },
      { title: "Ernie Stevens Jr. Tribute", sub: "Tribute Film", url: "https://gumlet.tv/watch/698a5a6cfc23d3d76fa812a7/", tags: ["Doc", "Tribute"] },
      { title: "Aiper Homeshow Event Recap", sub: "Event Recap", url: "https://gumlet.tv/watch/698a58ae873071aec5c953ea/", tags: ["Event", "Consumer"] },
      { title: "Founders Retreat", sub: "Event Story", url: "https://gumlet.tv/watch/698a5b05873071aec5c9a7cd/", tags: ["Event", "Culture"] }

    ],
    social: [
      { title: "Lagos White Party", sub: "Event Promo", url: "https://gumlet.tv/watch/698a596eaec3d4e420c22a9a/", tags: ["9:16", "Promo"] },
      { title: "Lagos Recap", sub: "Event Highlight", url: "https://gumlet.tv/watch/698a5946873071aec5c96163/", tags: ["9:16", "Vibe"] },
      { title: "Nook 10 Year", sub: "ASMR Piece", url: "https://gumlet.tv/watch/698a5a8b873071aec5c99c6f/", tags: ["9:16", "Creative"] },
      { title: "PA’LA x HARUMI", sub: "Collab Feature", url: "https://gumlet.tv/watch/698a5391fc23d3d76fa7306c/", tags: ["9:16", "Food"] },
      { title: "Cook & Craft Pretzel", sub: "Food Feature", url: "https://gumlet.tv/watch/698a53bcfc23d3d76fa736e4/", tags: ["9:16", "Food"] },
      { title: "Killer Whale Club", sub: "Nightlife Promo", url: "https://gumlet.tv/watch/698a5c0afc23d3d76fa83ba6/", tags: ["9:16", "Vibe"] }
    ]
  },

  builders: {
    campaigns: [
      { title: "To Have and To Host", sub: "Residential Build", url: "https://gumlet.tv/watch/698a68b7fc23d3d76fa970ef/", tags: ["Build", "Luxury"] },
      { title: "Abrazo Healthcare", sub: "HVAC Emergency", url: "https://gumlet.tv/watch/698a58aefc23d3d76fa7cdd6/", tags: ["Industrial"] },
      { title: "Memorial Towers", sub: "Industrial Scale", url: "https://gumlet.tv/watch/698a584faec3d4e420c20fef/", tags: ["Industrial"] },
      { title: "Refined Gardens", sub: "Brand Authority", url: "https://gumlet.tv/watch/698a57fb873071aec5c94350/", tags: ["Landscaping"] },
      { title: "Tree Guardian", sub: "Documentary", url: "https://gumlet.tv/watch/698a5e91873071aec5c9fc36/", tags: ["Doc", "Build"] },
      { title: "AZ Cleantech", sub: "Sector Narrative", url: "https://gumlet.tv/watch/698a57da873071aec5c93fa0/", tags: ["Green", "B2B"] }
    ],
    social: [
      { title: "Tiffanys Walkthrough", sub: "Luxury Walkthrough", url: "https://gumlet.tv/watch/698a580bfc23d3d76fa7bd7c/", tags: ["9:16", "Retail"] },
      { title: "Primrose Ambition", sub: "Build Update", url: "https://gumlet.tv/watch/698a581daec3d4e420c20b94/", tags: ["9:16", "Build"] },

      // added from your note
      { title: "NGOTS Restoration", sub: "Service Promo", url: "https://gumlet.tv/watch/698a5a7d873071aec5c99b08/", tags: ["9:16", "Service"] }
    ]
  },

  founders: {
    campaigns: [
      { title: "What is Abstrakt?", sub: "SaaS Explainer", url: "https://gumlet.tv/watch/698a5faffc23d3d76fa8909f/", tags: ["SaaS", "B2B"] },
      { title: "Reelay Explainer", sub: "Software Deep Dive", url: "https://gumlet.tv/watch/698a5aa5aec3d4e420c263c4/", tags: ["Tech", "Software"] },
      { title: "Intelliplay Demo", sub: "Product Story", url: "https://gumlet.tv/watch/698a5386aec3d4e420c17a69/", tags: ["UX", "SaaS"] },
      { title: "N2 Local News", sub: "Media Re-imagined", url: "https://gumlet.tv/watch/698a5b26aec3d4e420c27039/", tags: ["Media", "Tech"] },
      { title: "NEB Docs / HUUB", sub: "SaaS Case Study", url: "https://gumlet.tv/watch/698a63acfc23d3d76fa8f585/", tags: ["GovTech"] },
      { title: "Gitex Dubai", sub: "Global Tech Expo", url: "https://gumlet.tv/watch/698a6227fc23d3d76fa8cd57/", tags: ["Tech", "Global"] },

      // added from your note
      { title: "IAAPA 2026 Full Recap", sub: "Tech Event Recap", url: "https://gumlet.tv/watch/698a5391aec3d4e420c17bd3/", tags: ["Event", "Tech"] }
    ],
    social: [
      { title: "IAAPA Day 2", sub: "Tech Event Recap", url: "https://gumlet.tv/watch/698a5391873071aec5c8b654/", tags: ["9:16", "Event"] }
    ]
  }
};


const ENGAGEMENT_IDEAS = [
  { id: "launch", icon: Rocket, title: "The Big Launch", statement: "We are bringing a new development or product to market and need a full asset suite.", price: "$10k - $25k" },
  { id: "engine", icon: Repeat, title: "Content Engine", statement: "We need a system that delivers consistent video volume every month.", price: "$3k/mo" },
  { id: "authority", icon: Crown, title: "Founder Authority", statement: "I need to establish personal credibility and trust with investors or talent quickly.", price: "$5k+" },
  { id: "proof", icon: Fingerprint, title: "Social Proof", statement: "We have great projects but no cinematic case studies. We need to prove our expertise.", price: "$5k+" },
  { id: "event", icon: Mic2, title: "Event Capture", statement: "We have a major activation or conference coming up. We need recap assets.", price: "$3k+" },
  { id: "custom", icon: Lightbulb, title: "The Wildcard", statement: "We have a specific vision that doesn't fit in a box. We need a creative partner.", price: "Tailored" }
];

// --- GUMLET UTILITIES ---
const getGumletBackgroundEmbed = (url) => {
  const match = url?.match(/(?:gumlet\.tv\/watch\/|play\.gumlet\.io\/embed\/)([a-zA-Z0-9_-]+)/);
  const id = match ? match[1] : null;
  return id ? `https://play.gumlet.io/embed/${id}?autoplay=true&muted=true&loop=true&background=true` : null;
};

const getGumletPlayerEmbed = (url) => {
  const match = url?.match(/(?:gumlet\.tv\/watch\/|play\.gumlet\.io\/embed\/)([a-zA-Z0-9_-]+)/);
  const id = match ? match[1] : null;
  return id ? `https://play.gumlet.io/embed/${id}?autoplay=true` : url;
};

// --- REUSABLE COMPONENTS ---

const TextureOverlay = () => (
  <>
    <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] contrast-125 mix-blend-overlay">
      <svg className="h-full w-full">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
    <div className="fixed inset-0 pointer-events-none z-[998] opacity-[0.02] bg-gradient-to-b from-transparent via-orange-500/5 to-transparent" />
    <style dangerouslySetInnerHTML={{ __html: `
      .clip-path-slant { clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%); }
      .text-outline { -webkit-text-stroke: 1px white; color: transparent; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .logo-shine { animation: logo-shine 2.5s ease-in-out infinite; }
      @keyframes logo-shine { 0% { opacity: 0.3; } 50% { opacity: 1; text-shadow: 0 0 20px rgba(255, 79, 0, 0.4); } 100% { opacity: 0.3; } }
      @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .animate-scroll { animation: scroll linear infinite; }
    `}} />
  </>
);

const ScrambleText = ({ text, className = "", hover = true }) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef(null);
  const startScramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText(() => text.split("").map((letter, index) => {
        if (index < iteration) return text[index];
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join(""));
      if (iteration >= text.length) clearInterval(intervalRef.current);
      iteration += 1 / 3;
    }, 30);
  };
  return <span className={`inline-block ${className}`} onMouseEnter={hover ? startScramble : undefined}>{displayText}</span>;
};

const TypewriterCycle = ({ words, className = "" }) => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [blink, setBlink] = useState(true);
  useEffect(() => {
    if (index >= words.length) { setIndex(0); return; }
    const currentWord = words[index];
    if (subIndex === currentWord.length + 1 && !reverse) {
      const timeout = setTimeout(() => setReverse(true), 1500);
      return () => clearTimeout(timeout);
    }
    if (subIndex === 0 && reverse) {
      setReverse(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }
    const timeout = setTimeout(() => { setSubIndex((prev) => prev + (reverse ? -1 : 1)); }, reverse ? 30 : 60);
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);
  useEffect(() => {
    const timeout = setTimeout(() => setBlink((prev) => !prev), 500);
    return () => clearTimeout(timeout);
  }, [blink]);
  return <span className={`${className}`}>{words[index].substring(0, subIndex)}<span className={`ml-1 text-orange-600 ${blink ? "opacity-100" : "opacity-0"}`}>_</span></span>;
};

const FadeIn = ({ children, className = "", delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.8, delay }} className={className}>
    {children}
  </motion.div>
);

const CountUp = ({ to = 0, duration = 1200, className = "" }) => {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const root = el.closest("main") || null;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          obs.disconnect(); 
        }
      },
      {
        root,
        threshold: 0.25,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, to, duration]);

  return <span ref={ref} className={className}>{val}</span>;
};

const VibeStat = memo(({ icon: Icon, kicker, valueNode, sub, accent = false }) => (
  <div className={`relative p-8 border rounded-sm overflow-hidden shadow-2xl flex flex-col justify-between ${accent ? "border-aom-orange/40 bg-orange-950/10" : "border-aom-border bg-aom-charcoal"}`}>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-8">
        <div className="w-10 h-10 border border-aom-border bg-black/40 flex items-center justify-center">{Icon && <Icon className="text-aom-orange" size={18} />}</div>
        <div className="text-[9px] font-mono uppercase tracking-[0.35em] text-aom-dim"><ScrambleText text={kicker} hover={false} /></div>
      </div>
      <div>
        <div className="text-5xl md:text-6xl font-headline font-black italic tracking-tighter leading-[0.85] text-aom-warm-white">{valueNode}</div>
        <p className="text-aom-stone text-xs mt-6 leading-relaxed max-w-xs">{sub}</p>
      </div>
    </div>
  </div>
));

const IdeaCard = memo(({ idea, isSelected, onSelect }) => (
  <button onClick={() => onSelect(idea)} className={`relative p-8 md:p-12 border rounded-sm shadow-2xl overflow-hidden flex flex-col h-full text-left transition-all duration-300 group ${isSelected ? "border-aom-orange bg-orange-950/20" : "border-aom-border bg-aom-charcoal hover:border-aom-border-hover"}`}>
    <div className="flex items-center justify-between mb-8">
      <div className={`w-12 h-12 border flex items-center justify-center transition-colors ${isSelected ? "border-aom-orange bg-aom-orange text-white" : "border-aom-border bg-black/40 text-aom-stone group-hover:text-aom-warm-white"}`}>
        <idea.icon size={20} />
      </div>
      {isSelected && <CheckCircle2 size={24} className="text-aom-orange" />}
    </div>
    <div className="flex-grow">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-aom-stone-muted mb-3">{idea.title}</p>
      <h3 className={`text-xl md:text-2xl font-medium leading-snug transition-colors ${isSelected ? "text-aom-warm-white" : "text-aom-stone group-hover:text-aom-warm-white"}`}>"{idea.statement}"</h3>
    </div>
    <div className="mt-8 pt-6 border-t border-aom-border flex justify-between items-end">
      <div><p className="text-[9px] font-mono uppercase tracking-widest text-aom-dim mb-1">Starting At</p><p className="text-lg font-headline font-black italic text-aom-orange tracking-tight">{idea.price}</p></div>
      <div className={`w-8 h-8 rounded-full border border-aom-border flex items-center justify-center transition-all ${isSelected ? "bg-aom-warm-white text-aom-night border-aom-warm-white rotate-0" : "bg-transparent text-aom-dim -rotate-45 group-hover:text-aom-warm-white group-hover:border-aom-border-hover"}`}><ArrowRight size={14} /></div>
    </div>
  </button>
));

const TestimonialCard = memo(({ t }) => (
  <div className="p-8 border border-aom-border bg-aom-charcoal rounded-sm shadow-xl hover:border-aom-orange/30 transition-colors">
    <div className="inline-flex items-center gap-2 bg-aom-orange/10 border border-aom-orange/20 px-3 py-1.5 rounded-sm mb-6">
      <TrendingUp size={10} className="text-aom-orange" /><span className="text-aom-orange font-black text-[9px] uppercase tracking-widest">{t.metric}</span>
    </div>
    <p className="text-aom-warm-white text-lg font-headline font-black italic tracking-tight leading-snug">"{t.quote}"</p>
    <div className="mt-8 pt-4 border-t border-aom-border">
      <p className="text-[10px] font-headline font-black uppercase tracking-[0.2em] text-aom-warm-white">{t.name}</p>
      <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-aom-stone-muted mt-1">{t.company}</p>
    </div>
  </div>
));

const FAQItem = memo(({ item, open, onToggle }) => (
  <div className="border border-aom-border bg-aom-charcoal">
    <button onClick={onToggle} className="w-full flex items-center justify-between gap-6 px-6 py-6 text-left hover:bg-aom-orange/5 transition-colors">
      <span className="text-aom-warm-white font-headline font-black italic uppercase tracking-tight text-lg">{item.q}</span>
      <ChevronRight className={`text-aom-orange transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-6 pb-8 text-aom-stone text-sm leading-relaxed">{item.a}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

const VideoModule = ({ url, title, sub, tags, isVertical = false, onPlay }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef(null);
  const embedUrl = getGumletBackgroundEmbed(url);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setShouldLoad(true); }, { rootMargin: '400px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <article ref={ref} onClick={() => onPlay({ url, title })} className={`group relative overflow-hidden border border-aom-border bg-aom-surface h-full cursor-pointer transition-all duration-300 hover:border-aom-orange/60 rounded-sm shrink-0 select-none ${isVertical ? 'aspect-[9/16] w-[280px] md:w-[380px]' : 'aspect-video w-[360px] md:w-[640px] shadow-lg'}`}>
      <div className="absolute inset-0 bg-aom-night">
        {shouldLoad && embedUrl && (
          <iframe src={embedUrl} loading="lazy" className="w-full h-full border-none opacity-60 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-105" title={title} allow="autoplay; encrypted-media" style={{ pointerEvents: 'none' }} />
        )}
      </div>
      <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20 bg-gradient-to-t from-black/95 via-black/10 to-transparent">
        <div className="flex justify-between items-start"><div className="flex flex-wrap gap-1.5">{tags.slice(0, 2).map(t => <span key={t} className="text-[9px] font-headline font-black px-2 py-1 bg-black/80 border border-aom-border text-aom-stone rounded-sm uppercase tracking-widest">{t}</span>)}</div></div>
        <div className="max-w-[95%]">
          <h3 className={`font-headline font-black tracking-tight text-aom-warm-white leading-[0.9] transition-colors group-hover:text-aom-orange uppercase italic ${isVertical ? 'text-base md:text-lg' : 'text-xl md:text-2xl'}`}>{title}</h3>
          <p className="text-[10px] font-mono text-aom-stone-muted mt-2 uppercase tracking-widest italic flex items-center gap-2"><span className="w-1 h-1 bg-aom-orange rounded-full" />{sub}</p>
        </div>
      </div>
    </article>
  );
};

// --- SCROLLABLE GALLERY COMPONENT ---
const InteractiveGallery = ({ items, isVertical = false, onPlay }) => {
  const containerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const updateScrollButtons = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 20);
    }
  };
  const scroll = (dir) => {
    if (containerRef.current) {
      const offset = dir === 'left' ? -350 : 350;
      containerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };
  useEffect(() => {
    const el = containerRef.current;
    if (el) { el.addEventListener('scroll', updateScrollButtons); updateScrollButtons(); return () => el.removeEventListener('scroll', updateScrollButtons); }
  }, [items]);
  return (
    <div className="relative group/gallery">
      <div className="flex items-center justify-between mb-4 md:hidden px-6">
        <div className="flex items-center gap-2 text-[10px] font-headline font-black uppercase tracking-widest text-aom-dim animate-pulse"><MousePointer2 size={12} className="text-aom-orange" /> Swipe to explore</div>
      </div>
      <div ref={containerRef} className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar px-6 md:px-12 py-4 scroll-smooth cursor-grab active:cursor-grabbing snap-none touch-pan-x">
        {items.map((v, i) => ( <VideoModule key={i} onPlay={onPlay} isVertical={isVertical} {...v} /> ))}
        <div className="w-4 shrink-0 md:hidden" />
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-30 opacity-0 group-hover/gallery:opacity-100 transition-opacity hidden md:block">
        <button onClick={() => scroll('left')} className={`w-12 h-12 bg-aom-warm-white flex items-center justify-center text-aom-night shadow-2xl transition-all ${!canScrollLeft ? 'opacity-30 pointer-events-none' : 'hover:scale-110'}`}><ChevronLeft size={24} /></button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-30 opacity-0 group-hover/gallery:opacity-100 transition-opacity hidden md:block">
        <button onClick={() => scroll('right')} className={`w-12 h-12 bg-aom-warm-white flex items-center justify-center text-aom-night shadow-2xl transition-all ${!canScrollRight ? 'opacity-30 pointer-events-none' : 'hover:scale-110'}`}><ChevronRight size={24} /></button>
      </div>
    </div>
  );
};

// --- ROUTING MODAL ---
const PhoneModal = ({ isOpen, onClose }) => {
  const [view, setView] = useState('list');
  useEffect(() => { if (!isOpen) setTimeout(() => setView('list'), 300); }, [isOpen]);
  if (!isOpen) return null;
  const handleRoute = (number) => { window.location.href = `tel:${number}`; };
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
        <div className="w-full max-w-lg p-10 border border-aom-border bg-aom-night relative shadow-2xl rounded-xl overflow-hidden">
          <button onClick={onClose} className="absolute top-6 right-6 text-aom-stone hover:text-aom-warm-white transition-colors z-20"><X size={20} /></button>
          <AnimatePresence mode="wait">
            {view === 'list' ? (
              <motion.div key="list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-aom-orange/5 border border-aom-orange/20 rounded-full flex items-center justify-center mx-auto mb-4"><Phone size={24} className="text-aom-orange" /></div>
                  <h2 className="text-3xl font-headline font-black text-aom-warm-white italic uppercase tracking-tighter">Connect<span className="text-aom-orange">.</span></h2>
                  <p className="text-aom-dim text-[10px] font-mono font-bold uppercase tracking-[0.3em] mt-3">Select Department</p>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Scheduling", icon: Calendar, sub: "Inquiries & Logistics", number: MAIN_PHONE },
                    { label: "Creative", icon: Target, sub: "Vision & Strategy", number: MAIN_PHONE },
                    { label: "Support", icon: ShieldCheck, sub: "Operations & Billing", number: MAIN_PHONE },
                    { label: "Accounting", icon: Landmark, sub: "Invoicing & Vendors", type: 'accounting' }
                  ].map(item => (
                    <button key={item.label} onClick={() => item.type === 'accounting' ? setView('accounting') : handleRoute(item.number)} className="w-full p-4 border border-aom-border bg-aom-charcoal hover:border-aom-orange/30 hover:bg-aom-orange/5 transition-all group flex items-center justify-between text-left text-aom-warm-white">
                      <div className="flex items-center gap-4">
                        <item.icon size={16} className="text-aom-dim group-hover:text-aom-orange transition-colors" />
                        <div><p className="text-aom-warm-white font-headline font-black uppercase tracking-widest text-xs italic">{item.label}</p><p className="text-[9px] font-mono text-aom-dim mt-0.5">{item.sub}</p></div>
                      </div>
                      <ChevronRight size={14} className="text-aom-dim group-hover:text-aom-warm-white transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="accounting" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <div className="text-center mb-8"><div className="w-16 h-16 bg-aom-orange/5 border border-aom-orange/20 rounded-full flex items-center justify-center mx-auto mb-4"><Mail size={24} className="text-aom-orange" /></div><h2 className="text-2xl font-headline font-black text-aom-warm-white italic uppercase tracking-tighter">Accounting</h2></div>
                <div className="p-6 border border-aom-orange/10 bg-aom-orange/5 text-center rounded-sm">
                  <p className="text-aom-stone text-xs leading-relaxed mb-6">Please send an email to <span className="text-aom-orange font-bold">hello@aom-inhouse.com</span> to accompany your call.</p>
                  <button onClick={() => handleRoute(MAIN_PHONE)} className="w-full bg-aom-orange py-3 text-white font-headline font-black italic uppercase tracking-widest text-xs hover:bg-aom-orange-hover transition-all flex items-center justify-center gap-2 shadow-xl"><Phone size={14} className="fill-white" /> Call Accounting</button>
                </div>
                <button onClick={() => setView('list')} className="w-full mt-6 text-aom-dim hover:text-aom-warm-white text-[9px] font-mono uppercase tracking-widest transition-colors">Back</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- MAIN APP ---
export default function App() {
  const [loadStatus, setLoadStatus] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoaderExiting, setIsLoaderExiting] = useState(false);
  const [activeTab, setActiveTab] = useState('marketing');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [openFAQ, setOpenFAQ] = useState(0);
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingBudget, setPendingBudget] = useState(null);
  const playerFrameRef = useRef(null);

  // Interaction State Logic
  const isModalOpen = isInquiryOpen || !!selectedVideo || isPhoneModalOpen;

  // SESSION-BASED RANDOMIZATION
  const shuffledData = useMemo(() => {
    const feed = shuffleArray([
      ...PORTFOLIO_DATA.builders.social,
      ...PORTFOLIO_DATA.founders.social,
      ...PORTFOLIO_DATA.marketing.social,
    ]);

    return {
      marketing: {
        campaigns: shuffleArray(PORTFOLIO_DATA.marketing.campaigns),
        social: shuffleArray(PORTFOLIO_DATA.marketing.social),
      },
      builders: {
        campaigns: shuffleArray(PORTFOLIO_DATA.builders.campaigns),
        social: shuffleArray(PORTFOLIO_DATA.builders.social),
      },
      founders: {
        campaigns: shuffleArray(PORTFOLIO_DATA.founders.campaigns),
        social: shuffleArray(PORTFOLIO_DATA.founders.social),
      },
      feed,
    };
  }, []);

  useEffect(() => {
    if (!selectedVideo) return;
    const t = setTimeout(() => {
      const el = playerFrameRef.current;
      if (!el) return;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    }, 50);
    return () => clearTimeout(t);
  }, [selectedVideo]);

  useEffect(() => {
    if (loadStatus < 100) { const timer = setTimeout(() => setLoadStatus(prev => prev + 2.5), 20); return () => clearTimeout(timer); } 
    else { const timer = setTimeout(() => { setIsLoaderExiting(true); const finalTimer = setTimeout(() => setIsInitialized(true), 600); return () => clearTimeout(finalTimer); }, 1500); return () => clearTimeout(timer); }
  }, [loadStatus]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const videoTotal = useMemo(() => Object.values(PORTFOLIO_DATA).reduce((acc, cat) => acc + cat.campaigns.length + cat.social.length, 0), []);

  const openBrief = (intent = null) => { if (intent) setSelectedIntent(intent); setIsInquiryOpen(true); };
  const closeBrief = () => { 
    setIsInquiryOpen(false); 
    setIsSuccess(false); 
    setIsError(false); 
    setStep(1); 
    setSelectedIntent(null); 
    setFormData(INITIAL_FORM_STATE);
    setPendingBudget(null);
  };
  const openPhone = () => setIsPhoneModalOpen(true);
  const closePhone = () => setIsPhoneModalOpen(false);

  const handleLeadSubmit = async (overrides = {}) => {
    setIsSubmitting(true);
    setIsError(false);
    
    const finalPayload = {
      ...formData,
      ...overrides,
      intent: selectedIntent?.title || 'General Inquiry',
      intentStatement: selectedIntent?.statement || 'N/A',
      source: "aheadofmarket.com modal",
      submittedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...finalPayload, _subject: `New Lead: ${finalPayload.intent} - ${finalPayload.name}` })
      });
      if (!response.ok) throw new Error("Formspree rejected submission");
      if (db && user) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), { ...finalPayload, createdAt: serverTimestamp() });
      }
      setIsSuccess(true);
    } catch (e) {
      console.error("Lead submission error", e);
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep1Valid = formData.name.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const isStep2Valid = formData.goal !== '' && formData.problem.trim().length >= 15 && formData.placement !== '';
  const isStep3Valid = isStep1Valid && isStep2Valid && formData.timing !== '';

  const handleRoute = (number) => { window.location.href = `tel:${number}`; };

  return (
    <div className="bg-aom-night text-aom-warm-white min-h-screen font-body selection:bg-orange-600 antialiased overflow-hidden">
      <AnimatePresence>
        {!isInitialized && (
          <motion.div key="preloader" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className={`fixed inset-0 bg-aom-night flex flex-col items-center justify-center p-8 z-[1000] ${isLoaderExiting ? 'pointer-events-none' : ''}`}>
            <div className="relative mb-12 flex items-center justify-center">
              <h1 className="text-7xl font-headline font-black italic tracking-tighter text-white/10 relative">
                AOM<span className="text-white/5">.</span>
                <motion.div initial={{ width: 0 }} animate={{ width: `${loadStatus}%` }} className="absolute top-0 left-0 text-white overflow-hidden whitespace-nowrap logo-shine">AOM<span className="text-aom-orange">.</span></motion.div>
              </h1>
            </div>
            <div className="w-48 h-[1px] bg-aom-border relative overflow-hidden rounded-full"><motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-aom-orange shadow-[0_0_10px_#FF4F00]" /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {isInitialized && (
        <main className={`pb-24 text-left h-screen overflow-y-auto scroll-smooth hide-scrollbar ${isModalOpen ? 'snap-none overflow-hidden' : ''}`}>
          <TextureOverlay />
          <PhoneModal isOpen={isPhoneModalOpen} onClose={closePhone} />

          <header className="fixed top-0 left-0 w-full z-[200] px-6 md:px-12 py-4 md:py-6 flex justify-between items-center bg-gradient-to-b from-aom-night/90 to-transparent pointer-events-none">
            <h1 className="text-2xl md:text-3xl font-headline font-black italic tracking-tighter text-aom-warm-white pointer-events-auto">AOM<span className="text-aom-orange">.</span></h1>
            <div className="flex gap-4 pointer-events-auto">
              <button onClick={openPhone} className="hidden md:flex px-5 py-2 bg-aom-charcoal text-aom-stone font-bold text-[10px] uppercase tracking-[0.2em] rounded-sm hover:text-aom-warm-white border border-aom-border transition-all">Call Us</button>
              <button onClick={() => openBrief()} className="px-5 md:px-7 py-2 bg-aom-orange text-white font-headline font-black text-[10px] uppercase tracking-[0.2em] rounded-sm hover:bg-aom-orange-hover shadow-xl shadow-aom-orange/20 border border-white/10 transition-all">Get Started</button>
            </div>
          </header>

          {/* --- NEW HERO --- */}
          <HeroSection />

          {/* --- SERVICES --- */}
          <ServicesGrid />

          {/* --- CONSTRUCTION VERTICAL --- */}
          <ConstructionCallout />

          {/* --- AI TEASER --- */}
          <AITeaser />

          <section className="px-6 md:px-12 py-24 md:py-36 bg-aom-night border-t border-aom-border relative">
            <div className="max-w-screen-2xl mx-auto w-full">
              <FadeIn className="border-b border-aom-border pb-16 mb-20 flex flex-col lg:flex-row items-end justify-between gap-12">
                <div className="max-w-3xl">
                  <span className="text-aom-orange text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block"><ScrambleText text="Market Authority" /></span>
                  <h2 className="text-5xl md:text-7xl font-headline font-black text-aom-warm-white tracking-tighter uppercase italic leading-[0.85]">Phoenix Production<br /><span className="text-outline">Proven Scale</span><span className="text-aom-orange">.</span></h2>
                </div>
                <div className="w-full lg:max-w-md p-7 border border-aom-border bg-aom-charcoal"><ShieldCheck className="text-aom-orange mb-6" size={24} /><p className="text-aom-stone text-sm leading-relaxed">System-driven storytelling for Arizona businesses where reliability is the baseline.</p></div>
              </FadeIn>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FadeIn><VibeStat icon={Building2} kicker="Phoenix Impact" valueNode={<span><CountUp to={63} /><span className="text-aom-orange">+</span></span>} sub="Supporting teams across industrial services, hospitality, and STEAM." /></FadeIn>
                <FadeIn delay={0.1}><VibeStat icon={PlaneTakeoff} kicker="Regional Reach" valueNode={<span><CountUp to={34} /><span className="text-aom-orange">+</span></span>} sub="Executing projects across the nation for Arizona-based market leaders." accent /></FadeIn>
                <FadeIn delay={0.2}><VibeStat icon={Clapperboard} kicker="Assets Shipped" valueNode={<span><CountUp to={100} /><span className="text-aom-orange">+</span></span>} sub={<span>Archive verified: <span className="text-aom-orange">{videoTotal}</span> projects found in current build.</span>} /></FadeIn>
              </div>
              <FadeIn className="mt-16"><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{TESTIMONIALS.map((t, i) => <TestimonialCard key={i} t={t} />)}</div></FadeIn>
            </div>
          </section>

          <section id="work" className="pt-24 pb-[200px] md:py-36 bg-aom-night relative z-10 overflow-hidden border-t border-aom-border">
            <div className="px-6 md:px-12 flex flex-col md:flex-row justify-between items-end mb-16 md:mb-24 gap-12 border-b border-aom-border pb-16 text-aom-warm-white">
              <div><h2 className="text-[clamp(3.5rem,10vw,8rem)] font-headline font-black tracking-tighter uppercase italic leading-[0.8]">The<br /><span className="text-outline">Portfolio</span><span className="text-aom-orange">.</span></h2></div>
              <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2">{['marketing', 'builders'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 md:px-10 py-3 md:py-4 text-[9px] md:text-[11px] font-headline font-black uppercase tracking-[0.15em] md:tracking-[0.3em] rounded-sm transition-all border shrink-0 ${activeTab === tab ? 'bg-aom-warm-white text-aom-night border-aom-warm-white' : 'bg-transparent border-aom-border text-aom-dim hover:text-aom-warm-white'}`}>{tab}</button>)}</div>
            </div>
            <div className="space-y-20 md:space-y-36">
              <InteractiveGallery items={shuffledData[activeTab].campaigns} onPlay={setSelectedVideo} />
              <InteractiveGallery items={shuffledData.feed} onPlay={setSelectedVideo} isVertical={true} />
            </div>
          </section>

          <section id="packages" className="px-6 md:px-12 py-24 md:py-36 bg-aom-night border-t border-aom-border text-aom-warm-white">
            <div className="max-w-screen-2xl mx-auto w-full">
              <FadeIn className="flex flex-col md:flex-row items-end justify-between gap-12 mb-16 border-b border-aom-border pb-16">
                <div><span className="text-aom-orange text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block">Identify Your Needs</span><h2 className="text-5xl md:text-7xl font-headline font-black tracking-tighter uppercase italic leading-[0.85]">Choose Your<br /><span className="text-outline">Execution Path</span><span className="text-aom-orange">.</span></h2></div>
              </FadeIn>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">{ENGAGEMENT_IDEAS.map(idea => ( <IdeaCard key={idea.id} idea={idea} isSelected={selectedIntent?.id === idea.id} onSelect={() => openBrief(idea)} /> ))}</div>
            </div>
          </section>

          <section className="px-6 md:px-12 py-36 bg-aom-night border-t border-aom-border overflow-hidden text-aom-warm-white">
            <div className="max-w-screen-2xl mx-auto w-full">
              <div className="mb-20">
                <div className="max-w-xl">
                  <span className="text-aom-orange text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block">Why Us</span>
                  <h2 className="text-5xl md:text-7xl font-headline font-black tracking-tighter uppercase italic leading-[0.85]">The reason<br /><span className="text-outline">this</span> works<span className="text-aom-orange">.</span></h2>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{TRUST_METRICS.map(m => <div key={m.label} className="p-8 border border-aom-border bg-aom-charcoal rounded-sm hover:border-aom-orange/30 transition-all"><m.icon className="text-aom-orange mb-8" size={24} /><p className="text-[10px] font-mono uppercase tracking-[0.35em] text-aom-dim mb-3">{m.label}</p><h4 className="text-xl font-headline font-black italic text-aom-warm-white uppercase">{m.value}</h4><p className="text-aom-stone text-xs mt-4 leading-relaxed">{m.sub}</p></div>)}</div>
            </div>
          </section>

          <footer className="px-6 md:px-12 py-24 md:py-48 border-t border-aom-border bg-aom-night text-center pb-64 text-aom-warm-white">
            <div className="max-w-screen-2xl mx-auto w-full">
              <h2 className="text-6xl md:text-[10rem] font-headline font-black tracking-tighter mb-24 uppercase italic leading-[0.8]">Ready to <span className="text-aom-orange">Scale?</span></h2>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button onClick={() => openBrief()} className="px-16 py-6 bg-aom-orange text-white font-headline font-black uppercase tracking-[0.4em] text-xs hover:bg-aom-orange-hover transition-all clip-path-slant shadow-2xl shadow-aom-orange/20">Start Brief</button>
                <button onClick={openPhone} className="px-16 py-6 bg-aom-charcoal text-aom-stone font-headline font-black uppercase tracking-[0.4em] text-xs hover:text-aom-warm-white transition-all clip-path-slant border border-aom-border">Call Us</button>
              </div>
              <div className="mt-48 grid grid-cols-1 md:grid-cols-2 gap-20 text-left border-t border-aom-border pt-16">
                <div><p className="text-aom-orange font-headline font-black uppercase text-[10px] tracking-widest mb-4">Production</p><button onClick={() => handleRoute(MAIN_PHONE)} className="text-aom-warm-white text-3xl font-headline font-black italic tracking-tighter">Call Production</button></div>
                <div><p className="text-aom-orange font-headline font-black uppercase text-[10px] tracking-widest mb-4">Email</p><a href="mailto:hello@aom-inhouse.com" className="text-aom-warm-white text-3xl font-headline font-black italic tracking-tighter underline decoration-aom-orange underline-offset-8">hello@aom-inhouse.com</a></div>
              </div>
            </div>
          </footer>


          <AnimatePresence>
            {selectedVideo && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/98 flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl">
                <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); setSelectedVideo(null); }} className="absolute top-6 right-6 md:top-10 md:right-10 text-aom-warm-white p-3 md:p-4 bg-aom-charcoal rounded-full z-50 hover:bg-aom-orange/20 transition-all"><X size={28} /></button>
                <div className="w-[96vw] h-[90vh] md:w-[92vw] md:h-[88vh] bg-aom-night shadow-2xl relative border border-aom-border">
                  <iframe 
                    ref={playerFrameRef}
                    src={getGumletPlayerEmbed(selectedVideo.url)} 
                    className="w-full h-full border-none" 
                    allow="autoplay; fullscreen" 
                    allowFullScreen
                    title={selectedVideo.title} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {isInquiryOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
                <div className="w-full max-w-xl p-8 md:p-12 border border-white/5 bg-[#0a0a0a] relative shadow-2xl rounded-xl overflow-y-auto max-h-[90vh]">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-600/10 via-transparent to-orange-600/5 pointer-events-none rounded-xl" />
                  <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden rounded-t-xl z-30">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(step/3) * 100}%` }}
                      className="h-full bg-orange-600 shadow-[0_0_15px_#FF4F00]"
                    />
                  </div>
                  <button onClick={closeBrief} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors z-40" disabled={isSubmitting}><X size={24} /></button>
                  {!isSuccess && !isError ? (
                    <div className="space-y-10 relative z-10">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Start Brief<span className="text-orange-600">.</span></h2>
                            <span className="text-[10px] font-mono text-zinc-600 font-bold tracking-widest uppercase">Step {step} of 3</span>
                        </div>
                        {selectedIntent && step === 1 && ( <div className="inline-flex items-center gap-2 bg-orange-600/10 border border-orange-600/20 px-3 py-1.5 rounded-sm"><span className="text-orange-600 text-[9px] font-black uppercase tracking-widest">{selectedIntent.title}</span></div> )}
                      </div>
                      <AnimatePresence mode="wait">
                        {step === 1 && (
                          <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-2 block">Your Name</label>
                                    <input type="text" placeholder="FULL NAME" className="w-full bg-transparent border-b border-white/10 py-4 outline-none focus:border-orange-600 uppercase font-bold text-sm text-white placeholder:text-zinc-800 transition-colors" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-2 block">Direct Email</label>
                                    <input type="email" placeholder="EMAIL@DOMAIN.COM" className="w-full bg-transparent border-b border-white/10 py-4 outline-none focus:border-orange-600 uppercase font-bold text-sm text-white placeholder:text-zinc-800 transition-colors" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                                </div>
                            </div>
                            <button onClick={() => setStep(2)} disabled={!isStep1Valid} className={`w-full py-5 font-black italic uppercase shadow-xl transition-all text-sm tracking-widest ${isStep1Valid ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}>Next Step</button>
                            <p className="text-[10px] text-zinc-600 font-mono text-center uppercase tracking-widest">A creative lead will reply within 24 hours.</p>
                          </motion.div>
                        )}
                        {step === 2 && (
                          <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                             <div className="p-4 border border-orange-600/20 bg-orange-600/5 rounded-sm">
                                <p className="text-[8px] font-mono text-orange-600/60 uppercase tracking-widest mb-3 flex items-center gap-2"><Sparkles size={10}/> Logic Preview</p>
                                <div className="flex gap-4">
                                  <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Goal</p><p className="text-[10px] text-white uppercase italic font-black tracking-tighter">{formData.goal || 'PENDING'}</p></div>
                                  <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Platform</p><p className="text-[10px] text-white uppercase italic font-black tracking-tighter">{formData.placement || 'PENDING'}</p></div>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 block">Primary Objective</label>
                                    <div className="flex flex-wrap gap-2">
                                        {GOAL_OPTIONS.map(g => (
                                            <button key={g} onClick={() => setFormData({...formData, goal: g})} className={`px-4 py-2 border text-[10px] font-black uppercase transition-all tracking-widest ${formData.goal === g ? 'bg-orange-600 text-white border-orange-600 shadow-[0_0_15px_rgba(255,79,0,0.3)]' : 'border-white/5 bg-white/5 text-zinc-500 hover:border-zinc-700'}`}>{g}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 block">Current Bottleneck</label>
                                    <textarea maxLength={180} placeholder="Example: We have great work but no case study video that wins industrial contracts." className="w-full bg-zinc-900/50 border border-white/5 p-4 outline-none focus:border-orange-600 uppercase font-bold text-xs text-white h-24 resize-none placeholder:text-zinc-800 transition-colors" value={formData.problem} onChange={(e) => setFormData({...formData, problem: e.target.value})} />
                                    <div className="flex justify-between mt-2">
                                        {formData.problem.length < 15 && <span className="text-[9px] font-mono text-orange-500/60 uppercase animate-pulse">Min. 15 characters required</span>}
                                        <span className="text-[9px] font-mono text-zinc-700 ml-auto">{formData.problem.length}/180</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 block">Asset Placement</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PLACEMENT_OPTIONS.map(p => (
                                            <button key={p} onClick={() => setFormData({...formData, placement: p})} className={`px-4 py-2 border text-[10px] font-black uppercase transition-all tracking-widest ${formData.placement === p ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-white/5 bg-white/5 text-zinc-500 hover:border-zinc-700'}`}>{p}</button>
                                        ))}
                                    </div>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                <button onClick={() => setStep(1)} className="px-8 py-5 border border-white/5 bg-zinc-900 text-zinc-500 font-black italic uppercase text-xs tracking-widest hover:text-white transition-all">Back</button>
                                <button onClick={() => setStep(3)} disabled={!isStep2Valid} className={`flex-grow py-5 font-black italic uppercase shadow-xl transition-all text-sm tracking-widest ${isStep2Valid ? 'bg-orange-600 text-white hover:bg-orange-500' : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'}`}>Set Logistics</button>
                             </div>
                          </motion.div>
                        )}
                        {step === 3 && (
                          <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                             <div className="p-4 border border-orange-600/20 bg-orange-600/5 rounded-sm">
                                <p className="text-[8px] font-mono text-orange-600/60 uppercase tracking-widest mb-3 flex items-center gap-2"><Clock3 size={10}/> Strategy Summary</p>
                                <div className="grid grid-cols-3 gap-4">
                                  <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Goal</p><p className="text-[10px] text-white uppercase italic font-black tracking-tighter truncate">{formData.goal}</p></div>
                                  <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Timing</p><p className="text-[10px] text-white uppercase italic font-black tracking-tighter">{formData.timing || 'PENDING'}</p></div>
                                  <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Tier</p><p className="text-[10px] text-white uppercase italic font-black tracking-tighter">{formData.budget || 'PENDING'}</p></div>
                                </div>
                             </div>
                             <div className="space-y-8">
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 block">Preferred Timeline</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {TIMING_OPTIONS.map(t => (
                                            <button key={t} onClick={() => setFormData({...formData, timing: t})} className={`px-4 py-3 border text-[9px] font-black uppercase transition-all tracking-widest text-left ${formData.timing === t ? 'bg-orange-600 text-white border-orange-600 shadow-[0_0_15px_rgba(255,79,0,0.3)]' : 'border-white/5 bg-white/5 text-zinc-500 hover:border-zinc-700'}`}>{t}</button>
                                        ))}
                                    </div>
                                    {!formData.timing && <p className="text-[9px] font-mono text-orange-500/60 uppercase mt-3 italic text-left">Select timing to enable budget tiers</p>}
                                </div>
                                <div>
                                    <label className="text-[9px] font-mono font-black text-zinc-600 uppercase tracking-[0.3em] mb-4 block text-left">Select Budget Tier <span className="text-zinc-700 italic font-mono lowercase tracking-normal font-normal">(Submits Brief)</span></label>
                                    <div className="space-y-2">
                                        {BUDGET_OPTIONS.map(o => {
                                          const isActive = pendingBudget === o && isSubmitting;
                                          return (
                                            <button 
                                              key={o} 
                                              onClick={() => { 
                                                const b = o;
                                                setFormData(prev => ({...prev, budget: b}));
                                                setPendingBudget(b); 
                                                handleLeadSubmit({ budget: b }); 
                                              }} 
                                              disabled={isSubmitting || !formData.timing} 
                                              className={`w-full p-4 border transition-all uppercase font-black italic text-left text-xs tracking-widest flex justify-between items-center ${!formData.timing ? 'opacity-30 cursor-not-allowed bg-zinc-950 border-white/5 text-zinc-800' : 'bg-white/5 border-white/5 text-white hover:bg-orange-600 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(255,79,0,0.2)]'}`}
                                            >
                                                {o} {isActive && <Loader2 className="animate-spin" size={14} />}
                                            </button>
                                          );
                                        })}
                                    </div>
                                </div>
                             </div>
                             <div className="flex gap-4">
                                <button onClick={() => setStep(2)} className="px-8 py-5 border border-white/5 bg-zinc-900 text-zinc-500 font-black italic uppercase text-xs tracking-widest hover:text-white transition-all">Back</button>
                                <div className="flex-grow flex items-center justify-center text-[10px] text-zinc-700 font-mono uppercase tracking-widest animate-pulse italic">
                                  {!formData.timing ? "Waiting for timing..." : "Select tier to finish"}
                                </div>
                             </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : isError ? (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 relative z-10">
                        <AlertCircle size={64} className="mx-auto text-red-600 mb-8" />
                        <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-4">Submission Failed</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed mb-10 max-w-xs mx-auto uppercase font-mono font-bold tracking-widest">A network conflict occurred. Please retry with your selected tier ({pendingBudget}).</p>
                        <div className="space-y-4">
                            <button onClick={() => handleLeadSubmit({ budget: pendingBudget })} className="w-full bg-orange-600 py-4 font-black italic uppercase shadow-xl hover:bg-orange-500 transition-all text-sm tracking-widest text-white flex items-center justify-center gap-3"><Loader2 className={isSubmitting ? "animate-spin" : "hidden"} size={16} /> Retry Submission</button>
                            <button onClick={() => { closeBrief(); openPhone(); }} className="w-full bg-white/5 border border-white/10 py-4 font-black italic uppercase text-zinc-400 hover:text-white transition-all text-sm tracking-widest">Call Us</button>
                        </div>
                    </motion.div>
                  ) : (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 relative z-10">
                        <CheckCircle2 size={64} className="mx-auto text-orange-600 mb-8" />
                        <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter">Brief Received<span className="text-orange-600">.</span></h3>
                        <div className="mt-8 p-6 border border-white/5 bg-white/5 text-left rounded-sm space-y-4">
                            <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><Target size={10} className="text-orange-600"/> Engagement Logic Verified:</p>
                            <div className="grid grid-cols-2 gap-4 border-l-2 border-orange-600 pl-4">
                                <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Goal</p><p className="text-xs font-black uppercase italic text-white leading-tight tracking-tighter">{formData.goal}</p></div>
                                <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Placement</p><p className="text-xs font-black uppercase italic text-white leading-tight tracking-tighter">{formData.placement}</p></div>
                                <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Timing</p><p className="text-xs font-black uppercase italic text-white leading-tight tracking-tighter">{formData.timing}</p></div>
                                <div><p className="text-[8px] text-zinc-600 uppercase font-bold">Budget</p><p className="text-xs font-black uppercase italic text-white leading-tight tracking-tighter">{formData.budget}</p></div>
                            </div>
                        </div>
                        <p className="text-zinc-500 text-[10px] mt-10 leading-relaxed font-mono uppercase tracking-widest max-w-sm mx-auto">We've archived your brief. A creative lead will review and contact you via <span className="text-white">{formData.email}</span> shortly.</p>
                        <button onClick={closeBrief} className="mt-12 w-full px-8 py-4 bg-white text-black font-black uppercase text-xs tracking-widest italic hover:bg-zinc-200 transition-all shadow-2xl">Return to Work</button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}
    </div>
  );
}

