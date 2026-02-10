import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  X, ChevronRight, Loader2,
  Activity, Target, Layers, Zap, Smartphone, Clapperboard, CheckCircle2,
  Volume2, ArrowRight, Radio,
  ShieldCheck, Clock3, Users, Building2, BadgeCheck, Star, Sparkles, Coins, ScrollText
} from 'lucide-react';

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

// --- BRAND CONSTANTS ---
const ORANGE = "#FF4F00";
const BUDGET_OPTIONS = ["$2k - $5k", "$5k - $10k", "$10k - $25k", "$25k+"];
const TIMELINE_OPTIONS = ["Immediately", "Next 30 Days", "Next 3 Months", "Researching"];
const CHARS = "-_~*+[]!@#%&";

// --- GUMLET VIDEO UTILITIES ---
const getGumletId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:gumlet\.tv\/watch\/|play\.gumlet\.io\/embed\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const getGumletBackgroundEmbed = (url) => {
  const id = getGumletId(url);
  if (!id) return null;
  return `https://play.gumlet.io/embed/${id}?autoplay=true&muted=true&loop=true&background=true`;
};

const getGumletPlayerEmbed = (url) => {
  const id = getGumletId(url);
  return id ? `https://play.gumlet.io/embed/${id}?autoplay=true` : url;
};

// --- UTILITY: SHUFFLE ENGINE ---
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// --- MASTER PORTFOLIO LIBRARY ---
const PORTFOLIO_DATA = {
  builders: {
    campaigns: [
      { title: "To Have and To Host", sub: "Builder Showcase", url: "https://gumlet.tv/watch/698a68b7fc23d3d76fa970ef/", tags: ["Residential", "Build"] },
      { title: "Abrazo Healthcare", sub: "HVAC Emergency Response", url: "https://gumlet.tv/watch/698a58aefc23d3d76fa7cdd6/", tags: ["Operations", "Service"] },
      { title: "Memorial Towers", sub: "Crane Day Chillers", url: "https://gumlet.tv/watch/698a584faec3d4e420c20fef/", tags: ["Industrial", "Scale"] },
      { title: "Refined Gardens Dieon", sub: "Brand Authority", url: "https://gumlet.tv/watch/698a57fb873071aec5c94350/", tags: ["Landscaping", "Build"] },
      { title: "Tree Guardian", sub: "Documentary Episode", url: "https://gumlet.tv/watch/698a5e91873071aec5c9fc36/", tags: ["Doc", "Process"] },
      { title: "Arizona Cleantech", sub: "Sector Narrative", url: "https://gumlet.tv/watch/698a57da873071aec5c93fa0/", tags: ["Industrial", "Green"] }
    ],
    social: [
      { title: "Primrose Ambition", sub: "Mechanical Update", url: "https://gumlet.tv/watch/698a581daec3d4e420c20b94/", tags: ["9:16", "Build"] },
      { title: "Tiffanys Fashion Square", sub: "Luxury Walkthrough", url: "https://gumlet.tv/watch/698a580bfc23d3d76fa7bd7c/", tags: ["9:16", "Luxury"] },
      { title: "NGOTS Restoration", sub: "Service Spotlight", url: "https://gumlet.tv/watch/698a5a7d873071aec5c99b08/", tags: ["9:16", "Industrial"] },
    ]
  },
  founders: {
    campaigns: [
      { title: "What is Abstrakt?", sub: "Automated Sales", url: "https://gumlet.tv/watch/698a5faffc23d3d76fa8909f/", tags: ["SaaS", "B2B"] },
      { title: "Reelay Explainer", sub: "SaaS Clarity", url: "https://gumlet.tv/watch/698a5aa5aec3d4e420c263c4/", tags: ["Software", "Tech"] },
      { title: "Intelliplay Demo", sub: "Product Story", url: "https://gumlet.tv/watch/698a5386aec3d4e420c17a69/", tags: ["UX", "Product"] },
      { title: "N2 Local News", sub: "Platform Re-imagined", url: "https://gumlet.tv/watch/698a5b26aec3d4e420c27039/", tags: ["Media", "Tech"] },
      { title: "NEB Docs / HUUB", sub: "SaaS Case Study", url: "https://gumlet.tv/watch/698a63acfc23d3d76fa8f585/", tags: ["GovTech", "Doc"] },
      { title: "ASU Peoria Forward", sub: "Innovation Hub", url: "https://gumlet.tv/watch/698a6127873071aec5ca3b36/", tags: ["Edu", "Tech"] },
      { title: "Gitex Dubai", sub: "Global Tech Expo", url: "https://gumlet.tv/watch/698a6227fc23d3d76fa8cd57/", tags: ["International"] },
      { title: "Founders Retreat", sub: "Cultural Highlight", url: "https://gumlet.tv/watch/698a5b05873071aec5c9a7cd/", tags: ["Founders", "Culture"] },
      { title: "IAAPA 2026", sub: "Event Recap", url: "https://gumlet.tv/watch/698a5391aec3d4e420c17bd3/", tags: ["Event", "Scale"] },
      { title: "ISA Validation", sub: "Research Study", url: "https://gumlet.tv/watch/698a52b6fc23d3d76fa70d75/", tags: ["Data", "Proof"] }
    ],
    social: [
      { title: "IAAPA Day 2", sub: "Event Recap", url: "https://gumlet.tv/watch/698a5391873071aec5c8b654/", tags: ["9:16", "Event"] },
      { title: "HUUB x Miss Dessert", sub: "Biz Spotlight", url: "https://gumlet.tv/watch/698a63ac873071aec5ca7db1/", tags: ["9:16", "Case Study"] }
    ]
  },
  marketing: {
    campaigns: [
      { title: "AOM Reel 2024", sub: "Master Production", url: "https://gumlet.tv/watch/698a6215aec3d4e420c317f7/", tags: ["Master", "Showreel"] },
      { title: "Journey To Gary Lee", sub: "Cinematic Story", url: "https://gumlet.tv/watch/698a6296fc23d3d76fa8d992/", tags: ["Narrative"] },
      { title: "Rainbow Rider", sub: "Experience Asset", url: "https://gumlet.tv/watch/698a6106aec3d4e420c2fd85/", tags: ["Vibe", "Brand"] },
      { title: "Pretty Penny", sub: "Restaurant Identity", url: "https://gumlet.tv/watch/698a5d24aec3d4e420c2a0a0/", tags: ["Food", "Brand"] },
      { title: "Virtu Hospitality", sub: "Scottsdale Premium", url: "https://gumlet.tv/watch/698a5ef5fc23d3d76fa87ef4/", tags: ["Luxury", "Food"] },
      { title: "Du Coeur Event", sub: "Recap Narrative", url: "https://gumlet.tv/watch/698a53a4aec3d4e420c17ee0/", tags: ["Events"] },
      { title: "Cook & Craft Hero", sub: "Web Background", url: "https://gumlet.tv/watch/698a53a9873071aec5c8b9d7/", tags: ["Web", "Loop"] },
      { title: "AZ Arts Foundation", sub: "Trust Piece", url: "https://gumlet.tv/watch/698a64e5873071aec5ca99ac/", tags: ["Non-Profit"] },
      { title: "Cynshine Pilates", sub: "Founder Story", url: "https://gumlet.tv/watch/698a63e5aec3d4e420c34783/", tags: ["Wellness"] },
      { title: "Sherpa Hospitality", sub: "Corporate ID", url: "https://gumlet.tv/watch/698a63acaec3d4e420c341f8/", tags: ["Corp", "Brand"] },
      { title: "Natl Comedy Theater", sub: "Venue Promo", url: "https://gumlet.tv/watch/698a63acaec3d4e420c341f8/", tags: ["Entertainment"] },
      { title: "RW Investment Firm", sub: "Trust Asset", url: "https://gumlet.tv/watch/698a5edeaec3d4e420c2c8be/", tags: ["Finance"] },
      { title: "Ulisgold Pilates", sub: "Studio Brand", url: "https://gumlet.tv/watch/698a5ebcaec3d4e420c2c573/", tags: ["Wellness"] },
      { title: "Keep it Cut", sub: "Recruiting Film", url: "https://gumlet.tv/watch/698a6177873071aec5ca4374/", tags: ["HR", "Culture"] },
      { title: "United Food Bank", sub: "Year End Impact", url: "https://gumlet.tv/watch/698a5fcdfc23d3d76fa893b8/", tags: ["Non-Profit"] },
      { title: "UFB Volunteer", sub: "Community Doc", url: "https://gumlet.tv/watch/698a5fc4fc23d3d76fa892d9/", tags: ["Doc"] },
      { title: "Noble Real Estate", sub: "Agency Brand", url: "https://gumlet.tv/watch/698a5b86fc23d3d76fa82ece/", tags: ["Real Estate"] },
      { title: "Jason Amador", sub: "GCU x NABI", url: "https://gumlet.tv/watch/698a5a6caec3d4e420c25e1a/", tags: ["Sports", "Doc"] },
      { title: "Ernie Stevens Jr", sub: "Tribute Film", url: "https://gumlet.tv/watch/698a5a6cfc23d3d76fa812a7/", tags: ["Heritage"] },
      { title: "Aiper Pool Party", sub: "Event Promo", url: "https://gumlet.tv/watch/698a58c0aec3d4e420c21b78/", tags: ["Consumer"] },
      { title: "Aiper Homeshow", sub: "Trade Show", url: "https://gumlet.tv/watch/698a58ae873071aec5c953ea/", tags: ["B2B", "Event"] }
    ],
    social: [
      { title: "Lagos White Party", sub: "Event Promo", url: "https://gumlet.tv/watch/698a596eaec3d4e420c22a9a/", tags: ["9:16", "Promo"] },
      { title: "Lagos Recap", sub: "Event Highlight", url: "https://gumlet.tv/watch/698a5946873071aec5c96163/", tags: ["9:16", "Vibe"] },
      { title: "Nook 10 Year", sub: "ASMR Piece", url: "https://gumlet.tv/watch/698a5a8b873071aec5c99c6f/", tags: ["9:16", "Creative"] },
      { title: "PA’LA x HARUMI", sub: "Collab Feature", url: "https://gumlet.tv/watch/698a5391fc23d3d76fa7306c/", tags: ["9:16", "Food"] },
      { title: "Cook & Craft Pretzel", sub: "Food Feature", url: "https://gumlet.tv/watch/698a53bcfc23d3d76fa736e4/", tags: ["9:16", "Food"] },
      { title: "Killer Whale Club", sub: "Nightlife Promo", url: "https://gumlet.tv/watch/698a5c0afc23d3d76fa83ba6/", tags: ["9:16", "Vibe"] },
    ]
  }
};

// --- CLIENT DEPTH: TRUST DATA ---
const TRUST_METRICS = [
  { icon: ShieldCheck, label: "Predictable Delivery", value: "Tight timelines", sub: "Structured pre-pro + capture + edit pipeline" },
  { icon: Clock3, label: "Fast Turnarounds", value: "24–72hr", sub: "For selects + social cuts when needed" },
  { icon: Users, label: "Lean Crew", value: "Cinema-grade", sub: "Efficient staffing, zero chaos, high output" },
  { icon: BadgeCheck, label: "Brand Consistency", value: "Repeatable", sub: "Systems for matching style across assets" },
];

const TRUST_LOGOS = [
  "REAL_ESTATE", "HOSPITALITY", "SAAS", "NONPROFIT", "EVENTS", "EDU", "HEALTHCARE", "INDUSTRIAL"
];

const PACKAGES = [
  {
    name: "Authority Sprint",
    tag: "Best for: founders who need credibility fast",
    price: "from $2–5k",
    bullets: [
      "Strategy call + messaging map",
      "1 shoot block (half-day)",
      "1 hero video + 3 social cuts",
      "Color + sound polish"
    ],
    note: "Great when you need to look legit by next week.",
    highlight: false
  },
  {
    name: "Content Engine",
    tag: "Best for: teams that need output every month",
    price: "from $5–10k",
    bullets: [
      "Monthly capture block",
      "1 flagship asset + 8–12 verticals",
      "B-roll library buildout",
      "Thumbnails + export formats"
    ],
    note: "Turns your operations into a pipeline of content.",
    highlight: true
  },
  {
    name: "Campaign System",
    tag: "Best for: developers + agencies shipping big launches",
    price: "from $10–25k+",
    bullets: [
      "Pre-pro + shot design + schedule",
      "Multi-location capture",
      "Campaign edit package",
      "Website hero loops + socials"
    ],
    note: "When the market is watching and you cannot miss.",
    highlight: false
  }
];

const TESTIMONIALS = [
  {
    quote: "They moved like an internal team. Fast, organized, and the final assets made us look bigger overnight.",
    name: "Operations Lead",
    company: "Phoenix Builder"
  },
  {
    quote: "We stopped guessing what to post. The system created repeatable content and our outreach finally had teeth.",
    name: "Founder",
    company: "B2B SaaS"
  },
  {
    quote: "The difference was strategy. They didn’t just shoot. They built the narrative and made it usable across channels.",
    name: "Marketing Director",
    company: "Hospitality Group"
  }
];

const FAQS = [
  {
    q: "What happens after I hit “Initialize Brief”?",
    a: "You submit the lens, budget range, and timing. We reply with next steps, a fast scope call, and a simple plan for deliverables."
  },
  {
    q: "Do you handle strategy or just production?",
    a: "Both. Strategy first, always. If the asset doesn’t move trust or attention, it’s just expensive footage."
  },
  {
    q: "How fast can you turn edits?",
    a: "Depends on scope. Social selects can be 24–72 hours when needed. Hero edits typically land on a planned cadence."
  },
  {
    q: "Can you match a brand look across multiple shoots?",
    a: "Yes. We build a repeatable style system (camera, lighting, color targets, typography rules) so your assets feel unified."
  },
  {
    q: "Do you do website work too?",
    a: "If the scope calls for it, yes. Especially hero loops, structure, and conversion-focused layout."
  }
];

// --- SUB-COMPONENTS ---

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
    <style dangerouslySetInnerHTML={{
      __html: `
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      .clip-path-slant { clip-path: polygon(0 0, 100% 0, 95% 100%, 0% 100%); }
      .text-outline { -webkit-text-stroke: 1px white; color: transparent; }
      .text-outline-orange { -webkit-text-stroke: 1px #FF4F00; color: transparent; }
      @media (min-width: 768px) {
        .text-outline { -webkit-text-stroke: 2px white; }
        .text-outline-orange { -webkit-text-stroke: 2px #FF4F00; }
      }
      @keyframes marquee {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-marquee { animation: marquee 40s linear infinite; }
      .cursor-blink { animation: blink 1s step-end infinite; }
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    `}} />
  </>
);

// --- INTERACTIVE TYPOGRAPHY ---

const ScrambleText = ({ text, className = "", hover = true }) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef(null);

  const startScramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text.split("").map((letter, index) => {
          if (index < iteration) return text[index];
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join("")
      );
      if (iteration >= text.length) clearInterval(intervalRef.current);
      iteration += 1 / 3;
    }, 30);
  };

  return (
    <span
      className={`inline-block ${className}`}
      onMouseEnter={hover ? startScramble : undefined}
    >
      {displayText}
    </span>
  );
};

// Cycling Typewriter Effect (Delete & Retype)
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

    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);

  useEffect(() => {
    const timeout = setTimeout(() => setBlink((prev) => !prev), 500);
    return () => clearTimeout(timeout);
  }, [blink]);

  return (
    <span className={`${className}`}>
      {words[index].substring(0, subIndex)}
      <span className={`ml-1 text-orange-600 ${blink ? "opacity-100" : "opacity-0"}`}>_</span>
    </span>
  );
};

const RevealHeading = ({ children, className }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div
        variants={{
          hidden: { y: "110%", rotateZ: 2 },
          visible: { y: 0, rotateZ: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } }
        }}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {children}
      </motion.div>
    </div>
  );
};

// --- SYSTEM TICKER COMPONENT ---
const TICKER_TEXTS = [
  "PHOENIX_VIDEO_PRODUCTION: ONLINE",
  "PARTNER_VERIFIED: THE_RIGHT_TEAM",
  "REAL_ESTATE_MEDIA_OPS: ACTIVE",
  "TURNKEY_CONTENT_SCALE: READY",
  "AHEAD_OF_MARKET: ESTABLISHED",
  "SCOTTSDALE_BRAND_NARRATIVE: LIVE",
  "CAPITAL_ALLOCATION_MEDIA: DEPLOYING",
  "COMMERCIAL_DEVELOPMENT_ASSETS: VERIFIED"
];

const SystemTicker = ({ onOpenBrief }) => (
  <div className="fixed bottom-0 left-0 w-full z-[100] h-12 bg-black border-t border-zinc-800 flex items-center shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
    <div className="flex-1 overflow-hidden relative h-full flex items-center bg-black/90 backdrop-blur-sm">
      <div className="flex whitespace-nowrap animate-marquee items-center">
        {[...Array(4)].flatMap(() => TICKER_TEXTS).map((text, i) => (
          <div key={i} className="flex items-center mx-6">
            <Radio size={12} className="text-orange-600 animate-pulse mr-3" />
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.3em] flex items-center">
              {text} <span className="text-orange-600 mx-4 opacity-50 text-[8px]">//</span>
            </span>
          </div>
        ))}
      </div>
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black to-transparent z-10" />
    </div>

    <div className="h-full flex items-center pr-0 pl-0 relative z-20">
      <button
        onClick={onOpenBrief}
        className="h-full px-8 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-[0.15em] text-xs hover:from-orange-500 hover:to-orange-400 transition-all flex items-center gap-3 shadow-[0_0_25px_rgba(255,79,0,0.4)] border-l border-orange-400/30 group"
      >
        <Zap size={16} className="fill-white group-hover:scale-110 transition-transform" />
        <span>Initialize Brief</span>
      </button>
    </div>
  </div>
);

// --- LIVING GRID VIDEO MODULE ---
const VideoModule = ({ url, title, sub, tags, isVertical = false, onPlay }) => {
  const embedUrl = getGumletBackgroundEmbed(url);

  return (
    <article
      onClick={() => onPlay({ url, title })}
      className={`group relative overflow-hidden border border-white/5 bg-zinc-900/50 h-full cursor-pointer transition-all duration-300 hover:border-orange-600/60 rounded-sm ${isVertical ? 'aspect-[9/16]' : 'aspect-video shadow-lg'}`}
    >
      <div className="absolute inset-0 bg-zinc-950">
        {embedUrl && (
          <iframe
            src={embedUrl}
            loading="lazy"
            className="w-full h-full border-none opacity-60 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-105"
            title={title}
            allow="autoplay; encrypted-media"
            style={{ pointerEvents: 'none' }}
          />
        )}
      </div>
      <div className="absolute inset-0 z-10 bg-transparent" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div className="w-12 h-12 rounded-full bg-orange-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl translate-y-4 group-hover:translate-y-0">
          <Volume2 size={18} className="text-white ml-0.5" />
        </div>
      </div>
      <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20 bg-gradient-to-t from-black/95 via-black/10 to-transparent">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span key={tag} className="text-[9px] font-black px-2 py-1 bg-black/80 border border-white/5 text-zinc-300 rounded-sm backdrop-blur-sm uppercase tracking-widest">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="max-w-[95%]">
          <h3 className={`font-black tracking-tight text-white leading-[0.9] transition-colors group-hover:text-orange-500 uppercase italic ${isVertical ? 'text-xl' : 'text-2xl'}`}>
            {title}
          </h3>
          <p className="text-[10px] font-mono text-zinc-400 mt-2 uppercase tracking-widest italic flex items-center gap-2">
            <span className="w-1 h-1 bg-orange-600 rounded-full" />
            {sub}
          </p>
        </div>
      </div>
    </article>
  );
};

// --- CLIENT DEPTH COMPONENTS ---
const SectionShell = ({ id, children, className = "" }) => (
  <section id={id} className={`px-6 md:px-12 py-36 relative ${className}`}>
    {children}
  </section>
);

const StatCard = memo(({ icon: Icon, label, value, sub }) => (
  <div className="p-8 border border-white/10 bg-zinc-900/30 rounded-sm shadow-2xl hover:border-orange-600/40 transition-colors">
    <div className="flex items-center justify-between">
      <div className="w-12 h-12 border border-white/10 bg-black/40 flex items-center justify-center">
        <Icon className="text-orange-600" size={22} />
      </div>
      <Star className="text-zinc-700" size={18} />
    </div>
    <div className="mt-8">
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">{label}</p>
      <h4 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white mt-3">{value}</h4>
      <p className="text-zinc-400 text-sm mt-4 leading-relaxed">{sub}</p>
    </div>
  </div>
));

const LogoTicker = memo(() => (
  <div className="border border-white/10 bg-black/40 overflow-hidden relative">
    <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent z-10" />
    <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent z-10" />

    <div className="flex whitespace-nowrap animate-marquee py-6">
      {[...Array(4)].flatMap(() => TRUST_LOGOS).map((t, i) => (
        <div key={`${t}-${i}`} className="mx-10 flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
          <Building2 size={16} className="text-orange-600" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-[0.35em] text-zinc-400">{t}</span>
          <span className="text-orange-600/30 text-[10px] mx-4">//</span>
        </div>
      ))}
    </div>
  </div>
));

const PackageCard = memo(({ pkg, onOpenBrief }) => (
  <div className={`relative p-10 border rounded-sm shadow-2xl overflow-hidden transition-colors ${pkg.highlight ? "border-orange-600/60 bg-gradient-to-b from-orange-600/10 via-black/30 to-black/20" : "border-white/10 bg-zinc-900/30 hover:border-white/30"}`}>
    {pkg.highlight && (
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-orange-600/20 blur-3xl rounded-full" />
    )}

    <div className="flex items-start justify-between gap-6">
      <div>
        <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white">{pkg.name}</h3>
        <p className="mt-3 text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">{pkg.tag}</p>
      </div>
      <div className="text-right">
        <div className="inline-flex items-center gap-2 px-3 py-2 border border-white/10 bg-black/40">
          <Coins size={14} className="text-orange-600" />
          <span className="text-[11px] font-black uppercase tracking-[0.25em] text-white">{pkg.price}</span>
        </div>
      </div>
    </div>

    <div className="mt-10 space-y-3">
      {pkg.bullets.map((b) => (
        <div key={b} className="flex items-start gap-3">
          <CheckCircle2 size={16} className="text-orange-600 mt-0.5" />
          <p className="text-zinc-300 text-sm leading-relaxed">{b}</p>
        </div>
      ))}
    </div>

    <div className="mt-10 flex items-center justify-between gap-6">
      <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest">{pkg.note}</p>
      <button
        onClick={onOpenBrief}
        className="px-6 py-3 bg-white text-black font-black uppercase tracking-[0.25em] text-[11px] hover:bg-zinc-200 transition-colors"
      >
        Start
      </button>
    </div>
  </div>
));

const ProcessStep = memo(({ idx, title, body, icon: Icon }) => (
  <div className="relative pl-10 md:pl-14">
    <div className="absolute left-0 top-1.5 w-6 h-6 md:w-7 md:h-7 bg-orange-600/20 border border-orange-600/40 flex items-center justify-center">
      <span className="text-[10px] font-black text-orange-500">{String(idx).padStart(2, "0")}</span>
    </div>
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 border border-white/10 bg-black/40 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-orange-600" />
      </div>
      <div>
        <h4 className="text-2xl font-black italic uppercase tracking-tighter text-white">{title}</h4>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed max-w-xl">{body}</p>
      </div>
    </div>
  </div>
));

const TestimonialCard = memo(({ t }) => (
  <div className="p-10 border border-white/10 bg-zinc-900/30 rounded-sm shadow-2xl hover:border-orange-600/40 transition-colors">
    <div className="flex items-center justify-between">
      <Sparkles size={16} className="text-orange-600" />
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => <Star key={i} size={14} className="text-orange-600/50" />)}
      </div>
    </div>
    <p className="text-white text-xl md:text-2xl font-black italic tracking-tight mt-8 leading-snug">
      “{t.quote}”
    </p>
    <div className="mt-10 pt-6 border-t border-white/10">
      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white">{t.name}</p>
      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500 mt-2">{t.company}</p>
    </div>
  </div>
));

const FAQItem = memo(({ item, open, onToggle }) => (
  <div className="border border-white/10 bg-black/30">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-6 px-6 md:px-8 py-6 text-left hover:bg-orange-600/10 transition-colors"
    >
      <span className="text-white font-black italic uppercase tracking-tight text-lg md:text-xl">{item.q}</span>
      <ChevronRight className={`text-orange-600 transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="px-6 md:px-8 pb-8 text-zinc-400 text-sm leading-relaxed">
            {item.a}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
));

const MidCTA = memo(({ onOpenBrief }) => (
  <div className="border border-white/10 bg-gradient-to-r from-black via-black/60 to-orange-950/10 p-10 md:p-14 relative overflow-hidden">
    <div className="absolute -top-12 -right-12 w-64 h-64 bg-orange-600/20 blur-3xl rounded-full" />
    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-10">
      <div className="max-w-2xl">
        <p className="text-orange-600 text-[10px] font-mono font-bold uppercase tracking-[0.45em]">
          <ScrambleText text="Client Perspective Layer" hover={false} />
        </p>
        <h3 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white mt-6 leading-[0.9]">
          Clear scope.<br /><span className="text-outline">Clean execution</span>.
        </h3>
        <p className="text-zinc-400 text-sm md:text-base mt-6 leading-relaxed">
          If you’re tired of “creative” that ships late, looks inconsistent, or doesn’t convert, this is the opposite of that.
        </p>
      </div>
      <button
        onClick={onOpenBrief}
        className="px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-[0.25em] text-[11px] hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(255,79,0,0.35)] border border-white/10"
      >
        Initialize Brief
      </button>
    </div>
  </div>
));

// --- MAIN APP ---
export default function App() {
  const [loadStatus, setLoadStatus] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('builders');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [portfolioData, setPortfolioData] = useState(PORTFOLIO_DATA);
  const [strategyFeed, setStrategyFeed] = useState([]);

  // Form State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', lens: '', budget: '', timeline: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // FAQ state
  const [openFAQ, setOpenFAQ] = useState(0);

  // Mouse Parallax for Hero
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) - 0.5,
        y: (e.clientY / window.innerHeight) - 0.5
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth System Error", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- RANDOMIZATION ON INIT ---
  useEffect(() => {
    if (loadStatus < 100) {
      const timer = setTimeout(() => setLoadStatus(prev => prev + 4), 20);
      return () => clearTimeout(timer);
    } else {
      const randomizedPortfolio = { ...PORTFOLIO_DATA };
      Object.keys(randomizedPortfolio).forEach(key => {
        randomizedPortfolio[key] = {
          campaigns: shuffleArray([...PORTFOLIO_DATA[key].campaigns]),
          social: shuffleArray([...PORTFOLIO_DATA[key].social])
        };
      });
      setPortfolioData(randomizedPortfolio);

      const allSocials = [
        ...PORTFOLIO_DATA.builders.social,
        ...PORTFOLIO_DATA.founders.social,
        ...PORTFOLIO_DATA.marketing.social
      ];
      setStrategyFeed(shuffleArray(allSocials));

      setTimeout(() => setIsInitialized(true), 400);
    }
  }, [loadStatus]);

  const handleInquirySubmit = async (finalPhaseData = {}) => {
    setIsSubmitting(true);
    setFormError('');
    const fullLead = { ...formData, ...finalPhaseData };

    try {
      if (db && user) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
          ...fullLead,
          createdAt: serverTimestamp(),
          source: 'AOM_V30_FULL_ARCHIVE'
        });
      }
      const response = await fetch("https://formspree.io/f/xbdalqvg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `AOM BRIEF: ${fullLead.name} - ${fullLead.lens}`,
          ...fullLead
        }),
      });
      if (response.ok) setIsSuccess(true);
      else throw new Error("Sync Error");
    } catch (err) {
      setFormError("System Timeout. Please email hello@aom-inhouse.com");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeBrief = () => {
    setIsInquiryOpen(false);
    setIsSuccess(false);
    setStep(1);
    setFormError('');
  };

  const openBrief = () => setIsInquiryOpen(true);

  const activeCampaigns = useMemo(() => portfolioData?.[activeTab]?.campaigns ?? [], [portfolioData, activeTab]);
  const activeSocial = useMemo(() => portfolioData?.[activeTab]?.social ?? [], [portfolioData, activeTab]);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-8 z-[1000]">
        <div className="w-full max-w-xs text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-4xl font-black italic tracking-tighter text-white mb-3">AOM<span className="text-orange-600">.</span></h1>
          </motion.div>
          <div className="h-[2px] bg-white/10 w-full relative overflow-hidden mt-8 rounded-full">
            <motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-orange-600 shadow-[0_0_15px_rgba(255,79,0,0.8)]" />
          </div>
          <div className="mt-4 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
            <ScrambleText text="Initializing Protocol..." />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-[#020202] text-zinc-100 min-h-screen font-sans selection:bg-orange-600 overflow-x-hidden antialiased text-left cursor-default pb-16">
      <TextureOverlay />

      {/* --- SYSTEM TICKER (FIXED BOTTOM) --- */}
      <SystemTicker onOpenBrief={openBrief} />

      {/* --- CREATIVE BRIEF MODAL --- */}
      <AnimatePresence>
        {isInquiryOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
            <div className="w-full max-w-lg p-8 md:p-12 border border-white/10 bg-[#0a0a0a] relative shadow-2xl rounded-xl my-auto">
              <button onClick={closeBrief} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24} /></button>

              {!isSuccess ? (
                <div className="space-y-8">
                  <div>
                    <span className="text-orange-600 text-xs font-mono font-bold tracking-widest uppercase mb-2 block">
                      <ScrambleText text="Start Project Protocol" />
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tighter mt-2 text-white italic uppercase">Let's build<br />this<span className="text-orange-600">.</span></h2>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="min-h-[300px] flex flex-col justify-center">
                      {step === 1 && (
                        <div className="space-y-3">
                          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-6">Identification:</p>
                          {["Real Estate Developer", "Founder / Tech", "Marketing Agency"].map(opt => (
                            <button
                              key={opt}
                              onClick={() => { setFormData({ ...formData, lens: opt }); setStep(2); }}
                              className="w-full p-5 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all rounded-sm flex justify-between items-center text-left group"
                            >
                              <span className="font-bold uppercase tracking-tight italic text-lg">{opt}</span>
                              <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
                            </button>
                          ))}
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-6">
                          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-4">Contact_Data:</p>
                          <div className="space-y-4">
                            <input type="text" placeholder="IDENTITY NAME" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors font-bold uppercase tracking-widest placeholder:text-zinc-700" />
                            <input type="email" placeholder="EMAIL ADDRESS" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors font-bold uppercase tracking-widest placeholder:text-zinc-700" />
                            <input type="tel" placeholder="PHONE (OPTIONAL)" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors font-bold uppercase tracking-widest placeholder:text-zinc-700" />
                          </div>
                          {formError && <div className="text-orange-500 text-xs mt-2 font-mono uppercase">{formError}</div>}
                          <button onClick={() => (formData.name && formData.email) ? setStep(3) : setFormError("REQUIRED FIELDS MISSING")} className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-widest py-4 rounded-sm hover:from-orange-500 hover:to-orange-400 transition-all mt-6 shadow-[0_0_20px_rgba(255,79,0,0.4)]">Next Phase</button>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-3">
                          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-6">Capital Allocation:</p>
                          {BUDGET_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              onClick={() => { setFormData({ ...formData, budget: opt }); setStep(4); }}
                              className="w-full p-5 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all rounded-sm flex justify-between items-center text-left group"
                            >
                              <span className="font-bold italic text-xl tracking-tighter">{opt}</span>
                              <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
                            </button>
                          ))}
                        </div>
                      )}

                      {step === 4 && (
                        <div className="space-y-3">
                          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest mb-6">Execution Velocity:</p>
                          {TIMELINE_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              disabled={isSubmitting}
                              onClick={() => handleInquirySubmit({ timeline: opt })}
                              className="w-full p-5 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white hover:border-orange-600 transition-all rounded-sm flex justify-between items-center text-left group"
                            >
                              <span className="font-bold uppercase tracking-widest text-sm">{opt}</span>
                              {isSubmitting ? <Loader2 size={18} className="animate-spin text-white" /> : <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />}
                            </button>
                          ))}
                          <button onClick={() => setStep(3)} className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest hover:text-white mt-8 self-start font-mono">← Return</button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 size={64} className="mx-auto text-orange-600 mb-6" />
                  <h2 className="text-4xl font-black text-white mb-4 italic uppercase tracking-tighter">Received<span className="text-orange-600">.</span></h2>
                  <p className="text-zinc-400 text-sm mb-8 font-mono uppercase tracking-widest">Protocol Initialized. Standby for contact.</p>
                  <button onClick={closeBrief} className="px-10 py-3 bg-white text-black font-black uppercase tracking-widest rounded-sm hover:bg-zinc-200 transition-colors">Close Terminal</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- HUD NAVIGATION --- */}
      <header className="fixed top-0 left-0 w-full z-[200] px-6 py-6 md:px-12 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm pointer-events-none">
        <div className="cursor-pointer group pointer-events-auto" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white transition-colors group-hover:text-orange-600">
            AOM<span className="text-orange-600">.</span>
          </h1>
        </div>
        <nav className="flex gap-10 items-center pointer-events-auto">
          <a href="#work" className="hidden md:block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors">
            <ScrambleText text="Work" />
          </a>
          <a href="#system" className="hidden md:block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors">
            <ScrambleText text="Infrastructure" />
          </a>
          <a href="#proof" className="hidden md:block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors">
            <ScrambleText text="Proof" />
          </a>
          <a href="#packages" className="hidden md:block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors">
            <ScrambleText text="Packages" />
          </a>
          <button onClick={openBrief} className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-sm hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_0_15px_rgba(255,79,0,0.4)] hover:scale-105 active:scale-95 border border-white/10">
            <ScrambleText text="Start Brief" />
          </button>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-24 relative overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <iframe
            src="https://play.gumlet.io/embed/698a6215aec3d4e420c317f7?autoplay=true&muted=true&loop=true&background=true"
            className="w-full h-full object-cover opacity-30 scale-125 pointer-events-none grayscale-[0.2]"
            allow="autoplay; encrypted-media"
            title="AOM Master Reel Background"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-black/40" />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10 text-left">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2 }}
            style={{ x: mousePos.x * -20, y: mousePos.y * -20 }}
          >
            <div className="inline-flex items-center gap-4 mb-12 border-l-4 border-orange-600 pl-6">
              <p className="text-orange-600 font-mono font-bold text-[11px] uppercase tracking-[0.4em]">
                <ScrambleText text="Operating Infrastructure // Phoenix_AZ" />
              </p>
            </div>

            <h2 className="text-[clamp(3.5rem,7.5vw,9rem)] font-black leading-[0.85] tracking-tighter text-white uppercase italic drop-shadow-2xl">
              WE HANDLE <br />
              <TypewriterCycle
                words={[
                  "THE PLANNING",
                  "THE WEBSITE",
                  "THE SOCIAL",
                  "THE PHOTOS",
                  "THE PRODUCTION",
                  "THE EDITING",
                  "THE SHOTS",
                  "THE COLOR-GRADING",
                  "THE VIBES"
                ]}
              />
              <span className="text-zinc-600 italic block mt-2">YOU OWN</span>
              <span className="text-outline">THE MARKET</span>
            </h2>
          </motion.div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-20 items-end border-t border-white/10 pt-16">
            <p className="text-xl md:text-2xl text-zinc-300 leading-relaxed max-w-xl font-medium drop-shadow-md">
              Ahead of Market is a turnkey production partner for Phoenix founders and developers. We build the high-impact assets that drive authority.
            </p>
            <div className="flex justify-start md:justify-end">
              <button onClick={openBrief} className="group flex items-center gap-6 text-white hover:text-orange-500 transition-colors">
                <span className="text-3xl md:text-4xl font-black uppercase tracking-tighter border-b-2 border-white/10 pb-2 group-hover:border-orange-500 italic drop-shadow-lg">Initiate Protocol</span>
                <Zap size={40} className="group-hover:scale-125 transition-transform text-orange-600 drop-shadow-lg" />
              </button>
            </div>
          </div>

          {/* Mini trust line: client reassurance right in hero */}
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl border-t border-white/5 pt-10">
            {[
              { icon: ShieldCheck, title: "No chaos", body: "Defined pre-pro + shoot plan. Clean timeline." },
              { icon: ScrollText, title: "Clear scope", body: "Assets mapped to outcomes, not vibes." },
              { icon: Activity, title: "Repeatable output", body: "Systems so content doesn’t die after one shoot." },
            ].map((x) => (
              <div key={x.title} className="p-6 border border-white/10 bg-black/30 hover:border-orange-600/30 transition-colors">
                <div className="flex items-center gap-3">
                  <x.icon size={16} className="text-orange-600" />
                  <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white">{x.title}</p>
                </div>
                <p className="text-zinc-500 text-sm mt-4 leading-relaxed">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- THE PORTFOLIO ARCHIVE --- */}
      <section id="work" className="px-6 md:px-12 py-32 bg-[#050505] relative z-10">
        <div className="max-w-screen-2xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12 border-b border-white/5 pb-12">
            <div>
              <RevealHeading className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block">
                <ScrambleText text="Asset Repository v30.0" />
              </RevealHeading>

              <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.8] italic">
                The<br />
                <span className="text-outline">Outputs</span>
                <span className="text-orange-600">.</span>
              </h2>
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {['builders', 'founders', 'marketing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] rounded-sm transition-all border ${activeTab === tab ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-zinc-600 hover:border-white/40 hover:text-white'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }} className="space-y-32">
              <div className="space-y-12">
                <div className="flex items-center gap-4">
                  <Clapperboard size={24} className="text-orange-600" />
                  <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em] italic">Cinematic_Volume_01</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                  {activeCampaigns.map((vid, idx) => (
                    <VideoModule key={idx} onPlay={setSelectedVideo} {...vid} />
                  ))}
                </div>
              </div>

              <div className="space-y-12">
                <div className="flex items-center gap-4">
                  <Smartphone size={24} className="text-orange-600" />
                  <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em] italic">Vertical_Social_Stream</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-1">
                  {activeSocial.map((vid, idx) => (
                    <VideoModule key={idx} onPlay={setSelectedVideo} isVertical={true} {...vid} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* --- CLIENT PROOF LAYER --- */}
      <SectionShell id="proof" className="bg-black border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-12 border-b border-white/10 pb-12 mb-16">
            <div>
              <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block">
                <ScrambleText text="Proof Layer // Client Assurance" />
              </span>
              <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                The reason<br />
                <span className="text-outline">this</span> works<span className="text-orange-600">.</span>
              </h2>
              <p className="text-zinc-400 text-base md:text-lg max-w-2xl mt-10 leading-relaxed">
                You’re not buying “a video.” You’re buying an operating system for trust, attention, and authority. This section exists because humans love uncertainty and we’re forced to accommodate that.
              </p>
            </div>
            <div className="w-full lg:max-w-lg">
              <LogoTicker />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TRUST_METRICS.map((m) => (
              <StatCard key={m.label} {...m} />
            ))}
          </div>

          <div className="mt-16">
            <MidCTA onOpenBrief={openBrief} />
          </div>
        </div>
      </SectionShell>

      {/* --- PACKAGES --- */}
      <SectionShell id="packages" className="bg-[#050505] border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full">
          <div className="flex flex-col md:flex-row items-end justify-between gap-12 mb-16 border-b border-white/10 pb-12">
            <div>
              <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block">
                <ScrambleText text="Buying Paths // Optional" />
              </span>
              <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                Choose a<br />
                <span className="text-outline">lane</span><span className="text-orange-600">.</span>
              </h2>
            </div>
            <div className="max-w-xl">
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                These are starting points, not handcuffs. We scope based on your lens, timeline, and what you actually need to ship.
              </p>
              <div className="mt-6 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500">
                <BadgeCheck className="text-orange-600" size={14} />
                Transparent deliverables. No mystery meat.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {PACKAGES.map((p) => (
              <PackageCard key={p.name} pkg={p} onOpenBrief={openBrief} />
            ))}
          </div>
        </div>
      </SectionShell>

      {/* --- PROCESS --- */}
      <SectionShell id="process" className="bg-black border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          <div>
            <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-8 block">
              <ScrambleText text="What Happens Next" />
            </span>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-[0.9]">
              Simple.<br />
              <span className="text-outline">Structured</span>.<br />
              Repeatable<span className="text-orange-600">.</span>
            </h2>
            <p className="text-zinc-400 text-sm md:text-base mt-10 leading-relaxed max-w-xl">
              Clients care about two things: not wasting time and not looking stupid. This process covers both.
            </p>

            <div className="mt-10 p-8 border border-white/10 bg-zinc-900/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-orange-600" size={18} />
                <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white">Operational safeguards</p>
              </div>
              <ul className="mt-6 space-y-3 text-zinc-400 text-sm">
                {[
                  "Pre-pro checklist + shot map",
                  "Clear deliverables + export formats",
                  "On-set efficiency + timeline control",
                  "Consistent post pipeline and review"
                ].map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-orange-600 mt-0.5" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-14 border-l border-white/10 pl-6 md:pl-10">
            <ProcessStep
              idx={1}
              icon={Target}
              title="Blueprint"
              body="We lock objectives, story spine, deliverables, and what the asset must do (trust, sales, recruiting, launch, etc.)."
            />
            <ProcessStep
              idx={2}
              icon={Layers}
              title="Capture"
              body="Efficient crew, cinema-grade workflow, and a plan that respects your business operations."
            />
            <ProcessStep
              idx={3}
              icon={Activity}
              title="Edit + Systems"
              body="We produce the hero, then slice for social and web. Your output becomes a repeatable content engine."
            />
            <div className="pt-6">
              <button
                onClick={openBrief}
                className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-[0.25em] text-[11px] hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(255,79,0,0.35)] border border-white/10"
              >
                Initialize Brief
              </button>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* --- THE INFRASTRUCTURE --- */}
      <section id="system" className="px-6 md:px-12 py-40 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
          <div>
            <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-10 block">
              <ScrambleText text="Operating Protocol" />
            </span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-20 uppercase italic leading-[0.85]">
              Strategy is our <br />
              <span className="text-outline">Primary</span> Asset.
            </h2>
            <div className="space-y-20">
              <div className="flex gap-10 group cursor-default">
                <div className="w-20 h-20 bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-600 transition-colors shadow-2xl">
                  <Target size={32} className="text-white" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">Phase 01: The Blueprint</h4>
                  <p className="text-zinc-400 text-lg leading-relaxed font-medium">We map out the assets you need to sell and grow before we pick up a camera. Every frame is built with high-intent objective.</p>
                </div>
              </div>
              <div className="flex gap-10 group cursor-default">
                <div className="w-20 h-20 bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-600 transition-colors shadow-2xl">
                  <Layers size={32} className="text-white" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">Phase 02: Turnkey Capture</h4>
                  <p className="text-zinc-400 text-lg leading-relaxed font-medium">Capture operations at scale with cinema-grade workflows. You get consistent updates, clear timelines, and zero friction.</p>
                </div>
              </div>
            </div>
          </div>

          {/* --- REEL PREVIEW DECK --- */}
          <div className="relative w-full aspect-square lg:aspect-auto lg:h-[700px] bg-zinc-900/50 rounded-sm overflow-hidden border border-white/10 shadow-2xl flex flex-col group">
            <div className="absolute top-0 left-0 w-full z-20 p-6 bg-gradient-to-b from-black/90 to-transparent flex justify-between items-start pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white">Active_Campaigns</span>
              </div>
              <div className="flex items-center gap-2 text-white/50">
                <span className="text-[9px] font-mono uppercase tracking-widest hidden sm:inline-block">Swipe to navigate</span>
                <ArrowRight size={14} />
              </div>
            </div>
            <div className="flex-1 overflow-x-auto flex items-center gap-4 p-8 no-scrollbar cursor-grab active:cursor-grabbing">
              {strategyFeed.map((vid, idx) => (
                <div key={idx} className="relative min-w-[300px] h-[90%] snap-center shrink-0 transform transition-transform duration-500 hover:scale-105 hover:z-10 border border-white/5 bg-zinc-950">
                  <VideoModule {...vid} isVertical={true} onPlay={setSelectedVideo} />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 pointer-events-none border-[0.5px] border-white/5 rounded-sm" />
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS + FAQ --- */}
      <SectionShell id="reassurance" className="bg-[#050505] border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-16 border-b border-white/10 pb-12">
            <div>
              <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block">
                <ScrambleText text="Objection Removal Layer" />
              </span>
              <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">
                Clients<br />
                <span className="text-outline">say</span> this<span className="text-orange-600">.</span>
              </h2>
            </div>
            <div className="max-w-xl">
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                Social proof and clarity. Two things the internet keeps pretending it doesn’t need.
              </p>
              <button onClick={openBrief} className="mt-8 inline-flex items-center gap-3 px-8 py-3 bg-white text-black font-black uppercase tracking-[0.25em] text-[11px] hover:bg-zinc-200 transition-colors">
                <Zap size={16} className="text-black" />
                Start Brief
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>

          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <ShieldCheck className="text-orange-600" size={18} />
                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">FAQ</h3>
                <span className="text-orange-600/40 text-[10px] font-mono uppercase tracking-[0.35em]">Read this before overthinking</span>
              </div>
              <div className="space-y-3">
                {FAQS.map((f, idx) => (
                  <FAQItem
                    key={f.q}
                    item={f}
                    open={openFAQ === idx}
                    onToggle={() => setOpenFAQ(openFAQ === idx ? -1 : idx)}
                  />
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-black/30 p-10 rounded-sm">
              <div className="flex items-center gap-3">
                <BadgeCheck className="text-orange-600" size={18} />
                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Fit Check</h3>
              </div>
              <p className="text-zinc-400 text-sm md:text-base mt-6 leading-relaxed">
                This is a good fit if you want assets that make you look established, remove friction in sales, and create consistent output without babysitting a production.
              </p>

              <div className="mt-10 space-y-4">
                {[
                  { icon: ShieldCheck, title: "You value reliability", body: "You want a process, not a roulette wheel." },
                  { icon: Target, title: "You want intent", body: "Every asset has a job: trust, convert, recruit, launch." },
                  { icon: Sparkles, title: "You care about taste", body: "Cinematic quality, but built for business." },
                ].map((x) => (
                  <div key={x.title} className="flex items-start gap-4 p-5 border border-white/10 bg-zinc-900/20">
                    <x.icon className="text-orange-600 mt-1" size={18} />
                    <div>
                      <p className="text-white font-black uppercase tracking-[0.18em] text-[11px]">{x.title}</p>
                      <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{x.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={openBrief}
                className="mt-10 w-full px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-[0.25em] text-[11px] hover:from-orange-500 hover:to-orange-400 transition-all shadow-[0_0_30px_rgba(255,79,0,0.35)] border border-white/10"
              >
                Initialize Brief
              </button>
            </div>
          </div>
        </div>
      </SectionShell>

      {/* --- FOOTER --- */}
      <footer className="px-6 md:px-12 py-48 border-t border-white/5 bg-[#020202] relative overflow-hidden text-center pb-64">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-screen-2xl mx-auto w-full">
          <h2 className="text-6xl md:text-[10rem] font-black text-white tracking-tighter mb-24 uppercase italic leading-[0.8] relative z-10">Ready to <span className="text-orange-600">Execute?</span></h2>
          <button onClick={openBrief} className="relative z-10 px-24 py-10 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black uppercase tracking-[0.4em] text-sm hover:from-orange-500 hover:to-orange-400 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_80px_rgba(255,79,0,0.3)] clip-path-slant border border-white/10">
            Initialize Brief
          </button>

          <div className="mt-48 grid grid-cols-1 md:grid-cols-3 gap-20 text-left border-t border-white/5 pt-16 relative z-10">
            <div>
              <h6 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-6 italic">Facility_Data</h6>
              <p className="text-white text-3xl font-black italic tracking-tighter">PHOENIX_AZ</p>
              <p className="text-zinc-600 text-[10px] font-mono mt-1 uppercase tracking-widest italic italic">Operational Headquarters</p>
            </div>
            <div>
              <h6 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-6 italic">Comm_Link</h6>
              <a href="mailto:hello@aom-inhouse.com" className="text-white text-4xl font-black italic tracking-tighter hover:text-orange-500 transition-colors underline decoration-white/10 decoration-1 underline-offset-8">HELLO@AOM-INHOUSE.COM</a>
            </div>
            <div className="text-right flex flex-col justify-end">
              <div className="flex gap-8 justify-end text-[11px] font-black text-zinc-600 uppercase tracking-widest italic italic">
                {['INSTAGRAM', 'LINKEDIN', 'VIMEO'].map(s => <a key={s} href="#" className="hover:text-white transition-colors"><ScrambleText text={s} hover={true} /></a>)}
              </div>
              <p className="text-zinc-700 text-[10px] font-mono mt-8 uppercase tracking-[0.2em]">SYSTEM_CHECKSUM_V30.0 © 2024</p>
            </div>
          </div>
        </div>
      </footer>

      {/* --- STUDIO PLAYER MODAL --- */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/98 flex items-center justify-center p-4 md:p-10 backdrop-blur-3xl">
            <div className="absolute top-10 right-10 flex gap-4">
              <button onClick={() => setSelectedVideo(null)} className="text-white hover:rotate-90 transition-all p-6 bg-white/5 hover:bg-orange-600/20 rounded-full border border-white/5">
                <X size={36} />
              </button>
            </div>
            <div className="w-full max-w-[1400px] aspect-video border border-white/5 bg-black shadow-2xl relative group/player overflow-hidden rounded-sm">
              <iframe
                src={getGumletPlayerEmbed(selectedVideo.url)}
                className="w-full h-full border-none"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={selectedVideo.title}
              />
              <div className="absolute -bottom-16 left-0 w-full flex justify-between items-center text-zinc-700 font-mono text-[10px] uppercase tracking-[0.4em] px-4 italic italic">
                <div className="flex items-center gap-3">
                  <Activity size={10} className="text-orange-600 animate-pulse" />
                  <span>System_Broadcast: {selectedVideo.title}</span>
                </div>
                <span>Relay: GUMLET_V30_PROD</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
