import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  X, ChevronRight, Loader2,
  Activity, Target, Layers, Zap, Smartphone, Clapperboard, CheckCircle2,
  Volume2, ArrowRight, Radio, ArrowDownRight,
  ShieldCheck, Clock3, Users, Building2, BadgeCheck, Star, Sparkles, Coins, ScrollText,
  Lightbulb, Rocket, Repeat, Crown, Fingerprint, Mic2,
  Download, Calendar, TrendingUp, PlaneTakeoff, Globe, Navigation, MapPin, Truck,
  Phone, Video, Mic, Monitor, Cpu, Headphones, Speaker, MousePointer2, Mail, Landmark
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
const MAIN_PHONE = "6023732164";
const RENTAL_REALESTATE_PHONE = "4806954462";
const BUDGET_OPTIONS = ["$2k - $5k", "$5k - $10k", "$10k - $25k", "$25k+"];
const TIMELINE_OPTIONS = ["Immediately", "Next 30 Days", "Next 3 Months", "Researching"];
const CHARS = "-_~*+[]!@#%&";

// --- SEO & SEARCH STRATEGY ---
const SEO_DATA = {
  title: "AOM | Phoenix Video Production & Content Strategy",
  description: "AOM is a premier Phoenix video production company specializing in B2B content, real estate media, and SaaS promo videos. We build authority assets for founders in Scottsdale, Phoenix, and Tempe.",
  keywords: "Phoenix video production, Scottsdale videographer, B2B video marketing, Real estate video Arizona, SaaS promo video, corporate video Phoenix",
  image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200&h=630&fit=crop", 
  url: "https://aom-inhouse.com",
  twitterHandle: "@aom_inhouse"
};

// --- DATA: TESTIMONIALS & FAQ ---
const TESTIMONIALS = [
  {
    quote: "We closed 3 new industrial contracts in 60 days after launching our case study video. The production cost paid for itself 8x over.",
    metric: "8x ROI in 60 days",
    name: "Hunter Bjork",
    company: "ISA ENERGY",
    industry: "Industrial Energy"
  },
  {
    quote: "Before AOM, we were posting randomly. Now we have a repeatable system that fills our pipeline. Our outreach finally has teeth.",
    metric: "150% pipeline growth",
    name: "Sumit Seth",
    company: "Naamly",
    industry: "SaaS"
  },
  {
    quote: "They didn't just shoot beautiful footage. They mapped every asset to a business outcome: investor meetings and web conversion.",
    metric: "3 venue launches",
    name: "Gio Osso",
    company: "Virtu Hospitality Group",
    industry: "Hospitality"
  }
];

const FAQS = [
  {
    q: "What happens after I hit “Start Brief”?",
    a: "You submit your scope, budget, and timing. We reply with a fast scope call and a simple plan for deliverables."
  },
  {
    q: "Do you handle strategy or just production?",
    a: "Both. Strategy first. If the asset doesn’t move trust or attention, it’s just expensive footage."
  },
  {
    q: "How fast can you turn edits?",
    a: "Social selects can be 24–72 hours. Hero edits typically land on a planned cadence."
  }
];

// --- ENGAGEMENT INTENTS ---
const ENGAGEMENT_IDEAS = [
  {
    id: "launch",
    icon: Rocket,
    title: "The Big Launch",
    statement: "We are bringing a new development or product to market and need a full asset suite.",
    price: "$10k - $25k",
    includes: ["3-5 hero videos", "15-30 social cuts", "Website hero loop", "Brand style guide"],
    timeline: "4-6 weeks",
    bestFor: "Product launches, major developments, fundraising announcements"
  },
  {
    id: "engine",
    icon: Repeat,
    title: "Content Engine",
    statement: "We need a system that delivers consistent video volume and social growth every month.",
    price: "$3k/mo",
    includes: ["Monthly capture session", "1 Hero Asset", "8-12 Social Cuts", "Thumbnail Suite"],
    timeline: "Ongoing",
    bestFor: "Brands needing consistent social presence"
  },
  {
    id: "authority",
    icon: Crown,
    title: "Founder Authority",
    statement: "I need to establish personal credibility and trust with investors or talent quickly.",
    price: "$5k+",
    includes: ["Founder story doc", "Leadership interview series", "LinkedIn native assets", "Press kit photos"],
    timeline: "2-3 weeks",
    bestFor: "Founders raising capital or recruiting top talent"
  },
  {
    id: "proof",
    icon: Fingerprint,
    title: "Social Proof",
    statement: "We have great projects but no cinematic case studies. We need to prove our expertise.",
    price: "$5k+",
    includes: ["Client testimonial interviews", "Project b-roll capture", "Data visualization graphics", "Case study PDF"],
    timeline: "3-4 weeks",
    bestFor: "Service businesses needing to close larger contracts"
  },
  {
    id: "event",
    icon: Mic2,
    title: "Event Capture",
    statement: "We have a major activation or conference coming up. We need high-energy recap assets.",
    price: "$3k+",
    includes: ["Multi-cam event coverage", "Same-day highlight reel", "Full panel recordings", " attendee vox pops"],
    timeline: "1-2 weeks",
    bestFor: "Conferences, grand openings, activations"
  },
  {
    id: "custom",
    icon: Lightbulb,
    title: "The Wildcard",
    statement: "We have a specific vision that doesn't fit in a box. We need a creative partner.",
    price: "Tailored",
    includes: ["Custom creative strategy", "Technical execution plan", "Unique deliverables", "Consulting"],
    timeline: "Flexible",
    bestFor: "Experimental projects, rebrands, complex productions"
  }
];

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

// --- PORTFOLIO DATA ---
const PORTFOLIO_DATA = {
  marketing: {
    campaigns: [
      { title: "AOM Reel 2024", sub: "Phoenix Master Production", url: "https://gumlet.tv/watch/698a6215aec3d4e420c317f7/", tags: ["Master", "Showreel"] },
      { title: "Journey To Gary Vee", sub: "Cinematic Narrative", url: "https://gumlet.tv/watch/698a6296fc23d3d76fa8d992/", tags: ["Narrative"] },
      { title: "Pretty Penny", sub: "Restaurant Brand Film", url: "https://gumlet.tv/watch/698a5d24aec3d4e420c2a0a0/", tags: ["Food", "Brand"] },
      { title: "Virtu Hospitality", sub: "Scottsdale Luxury Media", url: "https://gumlet.tv/watch/698a5ef5fc23d3d76fa87ef4/", tags: ["Luxury", "Food"] },
    ],
    social: [
      { title: "Lagos White Party", sub: "Social Promo", url: "https://gumlet.tv/watch/698a596eaec3d4e420c22a9a/", tags: ["9:16", "Promo"] },
      { title: "Nook 10 Year", sub: "Creative ASMR", url: "https://gumlet.tv/watch/698a5a8b873071aec5c99c6f/", tags: ["9:16", "Creative"] },
    ]
  },
  builders: {
    campaigns: [
      { title: "To Have and To Host", sub: "Construction Showreel", url: "https://gumlet.tv/watch/698a68b7fc23d3d76fa970ef/", tags: ["Residential", "Build"] },
      { title: "Memorial Towers", sub: "Industrial Scale Film", url: "https://gumlet.tv/watch/698a584faec3d4e420c20fef/", tags: ["Industrial", "Scale"] },
    ],
    social: [
      { title: "Tiffanys Fashion Square", sub: "Retail Construction Walkthrough", url: "https://gumlet.tv/watch/698a580bfc23d3d76fa7bd7c/", tags: ["9:16", "Luxury"] },
    ]
  },
  founders: {
    campaigns: [
      { title: "What is Abstrakt?", sub: "SaaS Explainer Video", url: "https://gumlet.tv/watch/698a5faffc23d3d76fa8909f/", tags: ["SaaS", "B2B"] },
      { title: "Reelay Explainer", sub: "Software Demo Film", url: "https://gumlet.tv/watch/698a5aa5aec3d4e420c263c4/", tags: ["Software", "Tech"] },
    ],
    social: [
      { title: "IAAPA Day 2", sub: "Tech Event Recap", url: "https://gumlet.tv/watch/698a5391873071aec5c8b654/", tags: ["9:16", "Event"] },
    ]
  }
};

// --- REUSABLE COMPONENTS ---

const TextureOverlay = () => (
  <>
    <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] contrast-125 mix-blend-overlay">
      <svg className="h-full w-full" aria-hidden="true">
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
      @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .animate-marquee { animation: marquee 40s linear infinite; }
      @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .animate-scroll { animation: scroll 80s linear infinite; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .animate-scan { animation: scan 4.5s linear infinite; }
      @keyframes scan { 0% { transform: translateY(-120%); opacity: 0; } 100% { transform: translateY(140%); opacity: 0; } }
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
    const timeout = setTimeout(() => {
      setSubIndex((prev) => prev + (reverse ? -1 : 1));
    }, reverse ? 30 : 60);
    return () => clearTimeout(timeout);
  }, [subIndex, index, reverse, words]);
  useEffect(() => {
    const timeout = setTimeout(() => setBlink((prev) => !prev), 500);
    return () => clearTimeout(timeout);
  }, [blink]);
  return <span className={`${className}`}>{words[index].substring(0, subIndex)}<span className={`ml-1 text-orange-600 ${blink ? "opacity-100" : "opacity-0"}`}>_</span></span>;
};

const FadeIn = ({ children, className = "", delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay }} className={className}>
    {children}
  </motion.div>
);

const InfiniteMarquee = ({ children, speed = 40, className = "" }) => (
  <div className={`overflow-hidden relative flex w-full group ${className}`}>
     <div className="flex gap-4 animate-scroll whitespace-nowrap pause-on-hover" style={{ animationDuration: `${speed}s` }}>
       {children}
       {children}
     </div>
  </div>
);

const CountUp = ({ to = 0, duration = 900, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-25%" });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
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
  }, [inView, to, duration]);
  return <span ref={ref} className={className}>{val}</span>;
};

const VibeStat = memo(({ icon: Icon, kicker, valueNode, sub, accent = false }) => (
  <div className={`relative p-8 md:p-10 border rounded-sm overflow-hidden shadow-2xl transition-all duration-300 ${accent ? "border-orange-600/50 bg-orange-950/15" : "border-white/10 bg-zinc-900/25"}`}>
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-orange-600/10 blur-3xl rounded-full" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 border border-white/10 bg-black/40 flex items-center justify-center">
          {Icon && <Icon className="text-orange-600" size={22} />}
        </div>
        <div className="text-[9px] font-mono uppercase tracking-[0.35em] text-zinc-600">
          <ScrambleText text={kicker} hover={false} />
        </div>
      </div>
      <div className="mt-10">
        <div className="text-[clamp(2.5rem,5vw,4.25rem)] font-black italic tracking-tighter leading-[0.85] text-white">{valueNode}</div>
        <p className="text-zinc-400 text-sm mt-5 leading-relaxed max-w-md">{sub}</p>
      </div>
    </div>
  </div>
));

const IdeaCard = memo(({ idea, isSelected, onSelect }) => (
  <button onClick={() => onSelect(idea)} className={`relative p-8 md:p-10 border rounded-sm shadow-2xl overflow-hidden flex flex-col h-full text-left transition-all duration-300 group ${isSelected ? "border-orange-600 bg-orange-950/20" : "border-white/10 bg-zinc-900/30 hover:border-white/30 hover:bg-zinc-900/60"}`}>
    <div className="flex items-center justify-between mb-8">
      <div className={`w-12 h-12 border flex items-center justify-center transition-colors ${isSelected ? "border-orange-600 bg-orange-600 text-white" : "border-white/10 bg-black/40 text-zinc-400 group-hover:text-white"}`}>
        <idea.icon size={20} />
      </div>
      {isSelected && <CheckCircle2 size={24} className="text-orange-600" />}
    </div>
    <div className="flex-grow">
      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-500 mb-3">{idea.title}</p>
      <h3 className={`text-xl md:text-2xl font-medium leading-snug transition-colors ${isSelected ? "text-white" : "text-zinc-300 group-hover:text-white"}`}>"{idea.statement}"</h3>
    </div>
    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-end">
      <div>
        <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-1">Starting At</p>
        <p className="text-lg font-black italic text-orange-600 tracking-tight">{idea.price}</p>
      </div>
      <div className={`w-8 h-8 rounded-full border border-white/10 flex items-center justify-center transition-all ${isSelected ? "bg-white text-black border-white rotate-0" : "bg-transparent text-zinc-600 -rotate-45 group-hover:text-white group-hover:border-white/50"}`}><ArrowRight size={14} /></div>
    </div>
  </button>
));

const TestimonialCard = memo(({ t }) => (
  <div className="p-10 border border-white/10 bg-zinc-900/30 rounded-sm shadow-2xl hover:border-orange-600/40 transition-colors">
    <div className="flex items-center justify-between mb-4"><Sparkles size={16} className="text-orange-600" /></div>
    <div className="inline-flex items-center gap-2 bg-orange-600/20 border border-orange-600/40 px-3 py-1.5 rounded-sm mb-6">
      <TrendingUp size={12} className="text-orange-500" />
      <span className="text-orange-500 font-black text-xs uppercase tracking-widest">{t.metric}</span>
    </div>
    <p className="text-white text-xl md:text-2xl font-black italic tracking-tight leading-snug">"{t.quote}"</p>
    <div className="mt-10 pt-6 border-t border-white/10 flex justify-between items-end">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white">{t.name}</p>
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-zinc-500 mt-2">{t.company}</p>
      </div>
    </div>
  </div>
));

const FAQItem = memo(({ item, open, onToggle }) => (
  <div className="border border-white/10 bg-black/30">
    <button onClick={onToggle} className="w-full flex items-center justify-between gap-6 px-6 md:px-8 py-6 text-left hover:bg-orange-600/10 transition-colors">
      <span className="text-white font-black italic uppercase tracking-tight text-lg md:text-xl">{item.q}</span>
      <ChevronRight className={`text-orange-600 transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
          <div className="px-6 md:px-8 pb-8 text-zinc-400 text-sm leading-relaxed">{item.a}</div>
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
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setShouldLoad(true); }, { rootMargin: '200px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <article ref={ref} onClick={() => onPlay({ url, title })} className={`group relative overflow-hidden border border-white/5 bg-zinc-900/50 h-full cursor-pointer transition-all duration-300 hover:border-orange-600/60 rounded-sm shrink-0 ${isVertical ? 'aspect-[9/16] w-[280px]' : 'aspect-video w-[450px] shadow-lg'}`}>
      <div className="absolute inset-0 bg-zinc-950">
        {shouldLoad && embedUrl && (
          <iframe src={embedUrl} loading="lazy" className="w-full h-full border-none opacity-60 grayscale-[0.3] group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 transform group-hover:scale-105" title={title} allow="autoplay; encrypted-media" style={{ pointerEvents: 'none' }} />
        )}
      </div>
      <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20 bg-gradient-to-t from-black/95 via-black/10 to-transparent">
        <div className="flex justify-between items-start"><div className="flex flex-wrap gap-1.5">{tags.slice(0, 2).map(t => <span key={t} className="text-[9px] font-black px-2 py-1 bg-black/80 border border-white/5 text-zinc-300 rounded-sm uppercase tracking-widest">{t}</span>)}</div></div>
        <div className="max-w-[95%]">
          <h3 className={`font-black tracking-tight text-white leading-[0.9] transition-colors group-hover:text-orange-500 uppercase italic ${isVertical ? 'text-lg' : 'text-2xl'}`}>{title}</h3>
          <p className="text-[10px] font-mono text-zinc-400 mt-2 uppercase tracking-widest italic flex items-center gap-2"><span className="w-1 h-1 bg-orange-600 rounded-full" />{sub}</p>
        </div>
      </div>
    </article>
  );
};

// --- UPDATED MODAL: SEAMLESS INTENT ROUTING ---
const PhoneModal = ({ isOpen, onClose }) => {
  const [view, setView] = useState('list');

  // Reset view on open/close
  useEffect(() => {
    if (!isOpen) setTimeout(() => setView('list'), 300);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRoute = (number) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
        <div className="w-full max-w-lg p-12 border border-white/10 bg-[#0a0a0a] relative shadow-2xl rounded-xl overflow-hidden">
          <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-20"><X size={24} /></button>
          
          <AnimatePresence mode="wait">
            {view === 'list' ? (
              <motion.div key="list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-orange-600/10 border border-orange-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Phone size={32} className="text-orange-600" />
                  </div>
                  <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Connect<span className="text-orange-600">.</span></h2>
                  <p className="text-zinc-600 text-[10px] font-mono font-bold uppercase tracking-[0.3em] mt-4">Select Department To Initiate Call</p>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Scheduling", icon: Calendar, sub: "Inquiries & Logistics", number: MAIN_PHONE },
                    { label: "Creative", icon: Target, sub: "Vision & Strategy", number: MAIN_PHONE },
                    { label: "Support", icon: ShieldCheck, sub: "Operations & Billing", number: RENTAL_REALESTATE_PHONE },
                    { label: "Rentals", icon: Video, sub: "Gear & Studio Hire", number: RENTAL_REALESTATE_PHONE },
                    { label: "Accounting", icon: Landmark, sub: "Invoicing & Vendors", type: 'accounting' }
                  ].map(item => (
                    <button 
                      key={item.label} 
                      onClick={() => item.type === 'accounting' ? setView('accounting') : handleRoute(item.number)}
                      className="w-full p-5 border border-white/5 bg-white/5 hover:border-orange-600/40 hover:bg-orange-600/5 transition-all group flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-4">
                        <item.icon size={18} className="text-zinc-500 group-hover:text-orange-600 transition-colors" />
                        <div>
                          <p className="text-white font-black uppercase tracking-widest text-sm italic">{item.label}</p>
                          <p className="text-zinc-500 text-[10px] font-mono mt-0.5">{item.sub}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-zinc-800 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="accounting" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-orange-600/10 border border-orange-600/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail size={32} className="text-orange-600" />
                  </div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Accounting Notice</h2>
                </div>

                <div className="p-8 border border-orange-600/20 bg-orange-600/5 text-center rounded-sm">
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6 font-medium">
                    Please send an email to <span className="text-orange-500 font-bold">hello@aom-inhouse.com</span> to accompany your call so we have your request in writing.
                  </p>
                  
                  <button 
                    onClick={() => handleRoute(RENTAL_REALESTATE_PHONE)}
                    className="w-full bg-orange-600 py-4 text-white font-black italic uppercase tracking-widest text-sm hover:bg-orange-500 transition-all shadow-xl flex items-center justify-center gap-3"
                  >
                    <Phone size={16} className="fill-white" /> Call Accounting Now
                  </button>
                </div>

                <button 
                  onClick={() => setView('list')}
                  className="w-full mt-6 text-zinc-600 hover:text-white text-[10px] font-mono uppercase tracking-widest transition-colors"
                >
                  ← Back to departments
                </button>
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
  const [activeTab, setActiveTab] = useState('marketing');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [openFAQ, setOpenFAQ] = useState(0);
  const [user, setUser] = useState(null);
  const [strategyFeed, setStrategyFeed] = useState([]);
  const [formData, setFormData] = useState({ name: '', email: '', budget: '' });
  const [step, setStep] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (loadStatus < 100) {
      const timer = setTimeout(() => setLoadStatus(prev => prev + 4), 20);
      return () => clearTimeout(timer);
    } else {
      setIsInitialized(true);
      const allSocials = [...PORTFOLIO_DATA.builders.social, ...PORTFOLIO_DATA.founders.social, ...PORTFOLIO_DATA.marketing.social];
      setStrategyFeed(shuffleArray(allSocials));
    }
  }, [loadStatus]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
      else await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const openBrief = () => setIsInquiryOpen(true);
  const closeBrief = () => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); };
  const openPhone = () => setIsPhoneModalOpen(true);
  const closePhone = () => setIsPhoneModalOpen(false);

  if (!isInitialized) return <div className="fixed inset-0 bg-[#020202] flex items-center justify-center p-8 z-[1000]"><div className="w-64 h-[2px] bg-white/10 relative overflow-hidden rounded-full"><motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-orange-600" /></div></div>;

  return (
    <main className="bg-[#020202] text-zinc-100 min-h-screen font-sans selection:bg-orange-600 overflow-x-hidden antialiased pb-16">
      <TextureOverlay />
      <PhoneModal isOpen={isPhoneModalOpen} onClose={closePhone} />
      
      {/* HUD HEADER */}
      <header className="fixed top-0 left-0 w-full z-[200] px-12 py-8 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
        <h1 className="text-4xl font-black italic tracking-tighter text-white">AOM<span className="text-orange-600">.</span></h1>
        <div className="flex gap-4">
          <button onClick={openPhone} className="hidden md:flex px-6 py-2.5 bg-zinc-900 text-zinc-400 font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:text-white border border-white/5 transition-all">Call</button>
          <button onClick={openBrief} className="px-8 py-2.5 bg-orange-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-orange-500 shadow-xl border border-white/10 transition-all">Get Started</button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="min-h-screen flex flex-col justify-center px-12 md:px-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          <iframe src="https://play.gumlet.io/embed/698a6215aec3d4e420c317f7?autoplay=true&muted=true&loop=true&background=true" className="w-full h-full object-cover grayscale" title="Phoenix Video Production Master Reel" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        </div>
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <div className="inline-flex items-center gap-4 mb-12 border-l-4 border-orange-600 pl-6"><p className="text-orange-600 font-mono font-bold text-[11px] uppercase tracking-[0.4em]">Phoenix Video Production // Arizona Branding</p></div>
            <h2 className="text-[clamp(3.5rem,7.5vw,9rem)] font-black leading-[0.85] tracking-tighter text-white uppercase italic">PHOENIX TEAMS <br /><TypewriterCycle words={["CLOSE FASTER", "RECRUIT BETTER", "RAISE CAPITAL", "OWN ATTENTION", "BUILD TRUST", "SCALE FASTER"]} /><br /><span className="text-outline">WITH VIDEO</span></h2>
          </motion.div>
          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-20 items-end border-t border-white/10 pt-16">
            <p className="text-xl md:text-1xl text-zinc-300 leading-relaxed max-w-xl font-medium">AOM is a <strong>video production company in Phoenix</strong> building repeatable content systems for founders, developers, and SaaS teams.<span className="text-orange-500 font-black block mt-4">No agencies. No delays. Just outcomes.</span></p>
            <div className="flex justify-start md:justify-end"><button onClick={openBrief} className="group flex items-center gap-6 text-white hover:text-orange-500 transition-colors"><span className="text-4xl font-black uppercase italic tracking-tighter border-b-2 border-white/10 pb-2 group-hover:border-orange-500 transition-all">Start Project</span><Zap size={40} className="group-hover:scale-125 transition-transform text-orange-600" /></button></div>
          </div>
        </div>
      </section>

      {/* VIBE CHECK SECTION */}
      <section className="px-6 md:px-12 py-32 bg-black border-t border-white/5 relative overflow-hidden">
        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <FadeIn className="border-b border-white/10 pb-12 mb-14">
            <div className="flex flex-col lg:flex-row items-end justify-between gap-10">
              <div className="max-w-3xl">
                <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block"><ScrambleText text="Market Authority" hover={false} /></span>
                <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">Phoenix Production<br /><span className="text-outline">Proven Scale</span><span className="text-orange-600">.</span></h2>
                <p className="text-zinc-400 text-sm md:text-base mt-8 leading-relaxed max-w-2xl">Operating as a story-driven <strong>video production company in Phoenix</strong>. We focus on outcome-driven content for Real Estate, SaaS, and Industrial brands where reliability is the baseline.</p>
              </div>
              <div className="w-full lg:max-w-xl"><div className="p-6 md:p-7 border border-white/10 bg-zinc-900/20"><div className="flex items-center gap-3"><ShieldCheck className="text-orange-600" size={18} /><p className="text-[11px] font-black uppercase tracking-[0.25em] text-white">The Quality Standard</p></div><p className="text-zinc-500 text-sm mt-5 leading-relaxed">We specialize in turnkey content engines for businesses in Scottsdale and the greater Phoenix area.</p></div></div>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <FadeIn className="lg:col-span-4"><VibeStat icon={Building2} kicker="Phoenix Impact" valueNode={<span><CountUp to={63} duration={1000} className="text-white" /><span className="text-orange-600">+</span></span>} sub="Supporting Arizona teams across, industrial services, hospitality, and STEAM." /></FadeIn>
            <FadeIn className="lg:col-span-4" delay={0.1}><VibeStat icon={PlaneTakeoff} kicker="Regional Reach" valueNode={<span><CountUp to={34} duration={1100} className="text-white" /><span className="text-orange-600">+</span></span>} sub="Executing video production projects across the nation and even the globe for market leaders." accent /></FadeIn>
            <FadeIn className="lg:col-span-4" delay={0.2}><VibeStat icon={Clapperboard} kicker="Assets Shipped" valueNode={<span><CountUp to={100} duration={1200} className="text-white" /><span className="text-orange-600">+</span></span>} sub="Professional video deliverables shipped to date—optimized for LinkedIn, web conversion, and sales cycles." /></FadeIn>
          </div>
          {/* REFINED CTA BOX - RESTORED */}
          <FadeIn className="mt-10 border border-white/10 bg-zinc-900/10 p-8 md:p-12 relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-16">
              <div className="max-w-xl text-center md:text-left">
                <p className="text-orange-600 text-[9px] font-mono font-bold uppercase tracking-[0.45em] mb-4"><ScrambleText text="Next Phase" hover={false} /></p>
                <h3 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white leading-[1.1]">Enterprise look. <span className="text-outline">Lean crew</span>.</h3>
                <p className="text-zinc-500 text-sm mt-4 leading-relaxed max-w-md mx-auto md:mx-0">Choose your path below to start building your authority engine. No drama. No delays.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                <button onClick={openBrief} className="px-8 py-3.5 bg-orange-600 text-white font-black italic uppercase tracking-[0.2em] text-[10px] rounded-sm hover:bg-orange-500 transition-all shadow-[0_0_30px_rgba(255,79,0,0.2)] flex items-center justify-center gap-2.5 border border-white/10"><Zap size={14} className="fill-white" />Initiate Brief</button>
                <button onClick={openPhone} className="px-8 py-3.5 bg-zinc-900 text-white font-black italic uppercase tracking-[0.2em] text-[10px] rounded-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2.5 border border-white/5"><Phone size={14} className="text-orange-600" />Direct Call</button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* WORK / PORTFOLIO SECTION */}
      <section id="work" className="px-12 py-32 bg-[#050505] relative z-10 overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-12 border-b border-white/5 pb-12">
          <div><h2 className="text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8]">The<br /><span className="text-outline">Portfolio</span><span className="text-orange-600">.</span></h2></div>
          <div className="flex gap-2">{['marketing', 'builders', 'founders'].map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] rounded-sm transition-all border ${activeTab === tab ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-zinc-600 hover:text-white'}`}>{tab}</button>)}</div>
        </div>
        <div className="space-y-32">
          <InfiniteMarquee speed={120}>{PORTFOLIO_DATA[activeTab].campaigns.map((v, i) => <div key={i} className="mx-4"><VideoModule onPlay={setSelectedVideo} {...v} /></div>)}</InfiniteMarquee>
          <InfiniteMarquee speed={80}>{strategyFeed.map((v, i) => <div key={i} className="mx-2"><VideoModule onPlay={setSelectedVideo} isVertical={true} {...v} /></div>)}</InfiniteMarquee>
        </div>
      </section>

      {/* PROCESS SECTION: REVISED 4-STEP GRID */}
      <section id="system" className="px-6 md:px-12 py-36 bg-black border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full">
          <div className="max-w-4xl mb-24">
            <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-10 block"><ScrambleText text="Our Process" /></span>
            <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">Strategy comes <br /><span className="text-outline">before</span> the camera.</h2>
            <p className="text-zinc-400 text-lg md:text-xl mt-8 leading-relaxed max-w-2xl font-medium">A reliable delivery engine doesn't happen by accident. We map the entire asset lifecycle from day zero.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5">
            {/* Step 01 */}
            <div className="bg-black p-10 md:p-16 group hover:bg-zinc-900/40 transition-colors">
              <div className="flex items-center justify-between mb-12">
                <div className="w-16 h-16 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:bg-orange-600 transition-colors shadow-2xl">
                  <Target size={28} className="text-white" />
                </div>
                <span className="text-4xl font-black italic text-zinc-800 group-hover:text-orange-600/20 transition-colors">01</span>
              </div>
              <h4 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">The Story</h4>
              <p className="text-zinc-400 text-lg leading-relaxed font-medium">We map out the narrative architecture before picking up a camera. Every frame is built with a high-intent business objective in mind.</p>
            </div>

            {/* Step 02 */}
            <div className="bg-black p-10 md:p-16 group hover:bg-zinc-900/40 transition-colors border-l-0 md:border-l border-white/5">
              <div className="flex items-center justify-between mb-12">
                <div className="w-16 h-16 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:bg-orange-600 transition-colors shadow-2xl">
                  <Layers size={28} className="text-white" />
                </div>
                <span className="text-4xl font-black italic text-zinc-800 group-hover:text-orange-600/20 transition-colors">02</span>
              </div>
              <h4 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">The Production</h4>
              <p className="text-zinc-400 text-lg leading-relaxed font-medium">Capture operations with cinema-grade workflows. You get a lean, efficient crew that respects your business operations and high stakes.</p>
            </div>

            {/* Step 03 */}
            <div className="bg-black p-10 md:p-16 group hover:bg-zinc-900/40 transition-colors border-t border-white/5">
              <div className="flex items-center justify-between mb-12">
                <div className="w-16 h-16 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:bg-orange-600 transition-colors shadow-2xl">
                  <Repeat size={28} className="text-white" />
                </div>
                <span className="text-4xl font-black italic text-zinc-800 group-hover:text-orange-600/20 transition-colors">03</span>
              </div>
              <h4 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">The Edit</h4>
              <p className="text-zinc-400 text-lg leading-relaxed font-medium">We produce the high-impact hero asset, then slice for social, web, and internal use. Your output becomes a repeatable content engine using <strong>DaVinci Resolve</strong> for superior color and narrative precision.</p>
            </div>

            {/* Step 04 */}
            <div className="bg-black p-10 md:p-16 group hover:bg-zinc-900/40 transition-colors border-t border-white/5 border-l-0 md:border-l">
              <div className="flex items-center justify-between mb-12">
                <div className="w-16 h-16 bg-zinc-900 border border-white/10 flex items-center justify-center group-hover:bg-orange-600 transition-colors shadow-2xl">
                  <Truck size={28} className="text-white" />
                </div>
                <span className="text-4xl font-black italic text-zinc-800 group-hover:text-orange-600/20 transition-colors">04</span>
              </div>
              <h4 className="text-3xl font-black text-white mb-6 uppercase italic tracking-tighter group-hover:text-orange-500 transition-colors">The Delivery</h4>
              <p className="text-zinc-400 text-lg leading-relaxed font-medium">Assets are shipped on a defined cadence through our portal. No drama, no delays—just polished assets ready to move the needle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ENGAGEMENT IDEAS - FULL SUITE RESTORED */}
      <section id="packages" className="px-6 md:px-12 py-36 bg-[#050505] border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full">
          <FadeIn className="flex flex-col md:flex-row items-end justify-between gap-12 mb-16 border-b border-white/10 pb-12">
            <div><span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-6 block"><ScrambleText text="How We Partner" /></span><h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase italic leading-[0.85]">Identify<br /><span className="text-outline">Your Needs</span><span className="text-orange-600">.</span></h2></div>
            <div className="max-w-xl"><p className="text-zinc-400 text-sm md:text-base leading-relaxed">We solve business problems through <strong>corporate video production in Phoenix</strong>. Select the statement that sounds like you to get started.</p></div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">{ENGAGEMENT_IDEAS.map(idea => <IdeaCard key={idea.id} idea={idea} isSelected={selectedIntent?.id === idea.id} onSelect={setSelectedIntent} />)}</div>
        </div>
      </section>

      {/* GEAR RENTALS & TECH TOOLKIT */}
      <section id="gear" className="px-6 md:px-12 py-36 bg-black relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/20 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-900/40 blur-[120px]" />
        </div>

        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <div className="flex flex-col lg:flex-row gap-20 items-start">
            <div className="lg:w-1/2">
              <span className="text-orange-600 text-[11px] font-mono font-bold uppercase tracking-[0.5em] mb-10 block"><ScrambleText text="The Toolkit" /></span>
              <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase italic leading-[0.8] mb-12">The<br /><span className="text-outline">Industrial</span><br />Arsenal<span className="text-orange-600">.</span></h2>
              
              <div className="p-10 border border-orange-600/20 bg-orange-600/5 rounded-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                  <Video size={48} className="text-orange-600" />
                </div>
                <p className="text-orange-600 font-mono font-bold text-[10px] uppercase tracking-[0.4em] mb-4 italic">Star of the Show</p>
                <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-6">Ronin 4D 6K/8K Suite</h3>
                <p className="text-zinc-400 text-lg leading-relaxed mb-10 max-w-xl">
                  Cinema-grade stabilization with a fully integrated LiDAR system. We rent our Ronin 4D kit (full essentials, minus wireless monitors). Whether you need the gear or the operators, we deliver the precision.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button onClick={() => window.location.href = `tel:${RENTAL_REALESTATE_PHONE}`} className="px-8 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest hover:bg-zinc-200 transition-all flex items-center gap-2">
                    <Download size={14} /> Rent Gear: 480-695-4462
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { 
                  icon: Mic, 
                  title: "Audio Precision", 
                  desc: "Wireless lav suites + professional boom mics. Hire us as a dedicated audio person or as part of a lean field crew." 
                },
                { 
                  icon: MousePointer2, 
                  title: "Resolve Grading", 
                  desc: "Industry-standard DaVinci Resolve workflow. Superior color science and cinematic narrative assembly for every project." 
                },
                { 
                  icon: Cpu, 
                  title: "BTS & Ops", 
                  desc: "Hire us as your Camera Operator for high-stakes shoots or dedicated Behind-The-Scenes (BTS) coverage." 
                },
                { 
                  icon: Headphones, 
                  title: "Audio Talent", 
                  desc: "On-site monitoring and capture. We manage the soundscape so you can focus on the performance." 
                }
              ].map((tool, idx) => (
                <div key={idx} className="p-8 border border-white/5 bg-zinc-900/30 hover:border-orange-600/20 transition-all">
                  <tool.icon size={28} className="text-orange-600 mb-8" />
                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">{tool.title}</h4>
                  <p className="text-zinc-500 text-sm leading-relaxed">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* REASSURANCE / FAQ */}
      <section id="reassurance" className="px-6 md:px-12 py-36 bg-black border-t border-white/5">
        <div className="max-w-screen-2xl mx-auto w-full">
          <FadeIn className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-24">{TESTIMONIALS.map((t, i) => <TestimonialCard key={i} t={t} />)}</FadeIn>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="flex items-center gap-3 mb-8"><ShieldCheck className="text-orange-600" size={18} /><h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">FAQ</h3></div>
              <div className="space-y-3">{FAQS.map((f, i) => <FAQItem key={i} item={f} open={openFAQ === i} onToggle={() => setOpenFAQ(openFAQ === i ? -1 : i)} />)}</div>
            </div>
            <div className="border border-white/10 bg-black/30 p-10 rounded-sm">
              <div className="flex items-center gap-3"><BadgeCheck className="text-orange-600" size={18} /><h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Fit Check</h3></div>
              <p className="text-zinc-400 text-sm md:text-base mt-6 leading-relaxed">This is a good fit if you want assets that make you look established, remove friction in sales, and create consistent output without babysitting a production.</p>
              <div className="mt-10 space-y-4">
                {[{ icon: ShieldCheck, title: "You value reliability", body: "You want a process, not a roulette wheel." }, { icon: Target, title: "You want intent", body: "Every asset has a job: trust, convert, recruit, launch." }].map(x => (
                  <div key={x.title} className="flex items-start gap-4 p-5 border border-white/10 bg-zinc-900/20"><x.icon className="text-orange-600 mt-1" size={18} /><div><p className="text-white font-black uppercase tracking-[0.18em] text-[11px]">{x.title}</p><p className="text-zinc-500 text-sm mt-2 leading-relaxed">{x.body}</p></div></div>
                ))}
              </div>
              <button onClick={openBrief} className="mt-10 w-full px-10 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black italic uppercase tracking-[0.25em] text-[11px] hover:from-orange-500 transition-all shadow-2xl border border-white/10">Start a Project</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-12 py-48 border-t border-white/5 bg-[#020202] text-left">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-24">
          <div className="lg:col-span-8">
            <h2 className="text-[clamp(4rem,10vw,10rem)] font-black text-white tracking-tighter uppercase italic leading-[0.8]">Ready to <br /><span className="text-orange-600">Scale?</span></h2>
            <div className="mt-20 flex flex-wrap gap-12">
              <div><p className="text-orange-600 font-black uppercase text-xs tracking-widest mb-4">Production</p><button onClick={() => window.location.href = `tel:${MAIN_PHONE}`} className="text-white text-3xl font-black italic tracking-tighter hover:text-orange-600 transition-colors">602-373-2164</button></div>
              <div><p className="text-orange-600 font-black uppercase text-xs tracking-widest mb-4">Rentals & RE</p><button onClick={() => window.location.href = `tel:${RENTAL_REALESTATE_PHONE}`} className="text-white text-3xl font-black italic tracking-tighter hover:text-orange-600 transition-colors">480-695-4462</button></div>
              <div><p className="text-orange-600 font-black uppercase text-xs tracking-widest mb-4">Contact</p><a href="mailto:hello@aom-inhouse.com" className="text-white text-3xl font-black italic tracking-tighter hover:text-orange-500 transition-colors">HELLO@AOM-INHOUSE.COM</a></div>
            </div>
          </div>
          <div className="lg:col-span-4 border-l border-white/10 pl-12">
            <p className="text-orange-600 font-black uppercase text-xs tracking-widest mb-8">Service Areas</p>
            <ul className="space-y-4 text-zinc-400 font-mono text-sm uppercase tracking-widest">
              <li className="flex items-center gap-2"><MapPin size={14} className="text-orange-600" /> Phoenix, Scottsdale, Tempe</li>
              <li className="flex items-center gap-2"><MapPin size={14} className="text-orange-600" /> Nationwide Travel</li>
            </ul>
            <div className="mt-16"><button onClick={openBrief} className="w-full py-6 bg-orange-600 text-white font-black uppercase tracking-[0.4em] text-sm hover:bg-orange-500 transition-all clip-path-slant shadow-2xl">Start Brief</button></div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AnimatePresence>
        {isInquiryOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
            <div className="w-full max-w-lg p-12 border border-white/10 bg-[#0a0a0a] relative shadow-2xl rounded-xl">
              <button onClick={closeBrief} className="absolute top-6 right-6 text-zinc-500"><X size={24} /></button>
              {!isSuccess ? (
                <div className="space-y-8">
                  <h2 className="text-4xl font-black text-white italic uppercase">Start Project<span className="text-orange-600">.</span></h2>
                  {step === 1 ? (
                    <div className="space-y-6">
                      <input type="text" placeholder="NAME" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-white/20 py-4 outline-none focus:border-orange-600 uppercase font-bold" />
                      <input type="email" placeholder="EMAIL" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border-b border-white/20 py-4 outline-none focus:border-orange-600 uppercase font-bold" />
                      <button onClick={() => setStep(2)} className="w-full bg-orange-600 py-4 font-black italic uppercase shadow-xl hover:bg-orange-500 transition-all">Next</button>
                    </div>
                  ) : (
                    <div className="space-y-4">{BUDGET_OPTIONS.map(o => <button key={o} onClick={() => setIsSuccess(true)} className="w-full p-4 border border-white/10 hover:bg-orange-600 transition-all uppercase font-bold italic text-left">{o}</button>)}</div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12"><CheckCircle2 size={48} className="mx-auto text-orange-600 mb-6" /><h3 className="text-3xl font-black italic text-white uppercase">Sent<span className="text-orange-600">.</span></h3><button onClick={closeBrief} className="mt-8 px-8 py-2 bg-white text-black font-black uppercase text-xs">Close</button></div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {selectedVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-black/98 flex items-center justify-center p-10 backdrop-blur-3xl">
            <button onClick={() => setSelectedVideo(null)} className="absolute top-10 right-10 text-white p-4 bg-white/5 rounded-full"><X size={36} /></button>
            <div className="w-full max-w-[1400px] aspect-video bg-black shadow-2xl relative"><iframe src={getGumletPlayerEmbed(selectedVideo.url)} className="w-full h-full border-none" allow="autoplay; fullscreen" title={selectedVideo.title} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      <SystemTicker onOpenBrief={openBrief} onOpenPhone={openPhone} />
    </main>
  );
}

const TICKER_TEXTS = ["PHOENIX VIDEO PRODUCTION", "PARTNER VERIFIED // THE RIGHT TEAM", "REAL ESTATE MEDIA", "TURNKEY CONTENT SCALE", "AHEAD OF MARKET // EST 2021", "SCOTTSDALE BRAND NARRATIVE"];
const SystemTicker = ({ onOpenBrief, onOpenPhone }) => (
  <div className="fixed bottom-0 left-0 w-full z-[100] h-12 bg-black border-t border-zinc-800 flex items-center">
    <div className="flex-1 overflow-hidden relative h-full flex items-center bg-black/90">
      <div className="flex whitespace-nowrap animate-marquee items-center">{[...Array(4)].flatMap(() => TICKER_TEXTS).map((text, i) => <div key={i} className="flex items-center mx-6"><Radio size={12} className="text-orange-600 animate-pulse mr-3" /><span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-[0.3em] flex items-center">{text}</span></div>)}</div>
    </div>
    <div className="h-full flex items-center pr-0 pl-0 relative z-20">
      <button onClick={onOpenPhone} className="h-full px-6 bg-zinc-900 text-zinc-400 font-black italic uppercase tracking-[0.15em] text-[10px] hover:text-white transition-all flex items-center gap-2 border-l border-zinc-800"><Phone size={14} /><span className="hidden sm:inline">Call</span></button>
      <button onClick={onOpenBrief} className="h-full px-8 bg-orange-600 text-white font-black italic uppercase tracking-[0.15em] text-xs transition-all flex items-center gap-3 border-l border-orange-400/30 group"><Zap size={16} className="fill-white" /><span>Start Project</span></button>
    </div>
  </div>
);
