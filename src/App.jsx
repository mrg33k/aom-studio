/* ============================
   APP.JS PATCH (GUMLET WATCH -> EMBED)
   Only edits App.js.
   What you’re doing:
   1) Add helper funcs + hook
   2) Replace VideoModule component
   3) Update selectedVideo modal to use Gumlet iframe
   4) Replace PORTFOLIO_DATA with PORTFOLIO (watch links ok)
   5) Replace the Portfolio section with the filterable library
   ============================ */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import * as THREE from 'three';
import {
  X, Play, MoveRight, ChevronRight, Loader2, CheckCircle2,
  Smartphone, Film, Sparkles, Layers, Briefcase, CheckSquare
} from 'lucide-react';

// Firebase imports unchanged...
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';

let app, auth, db;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'aom-studio';

try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("AOM System: Database Connection Pending", e);
}

const ORANGE = "#FF4F00";

/* ============================
   1) GUMLET HELPERS (ADD)
   ============================ */

// Extract Gumlet video_id from:
 // https://gumlet.tv/watch/{id}
 // https://play.gumlet.io/embed/{id}
const getGumletId = (url = "") => {
  const m = url.match(/gumlet\.tv\/watch\/([a-zA-Z0-9]+)/) || url.match(/play\.gumlet\.io\/embed\/([a-zA-Z0-9]+)/);
  return m?.[1] || null;
};

const getGumletEmbedSrc = (watchOrEmbedUrl = "") => {
  const id = getGumletId(watchOrEmbedUrl);
  return id ? `https://play.gumlet.io/embed/${id}` : watchOrEmbedUrl;
};

// Lightweight thumbnail via oEmbed (no dashboard IDs needed).
// Gumlet oEmbed: https://api.gumlet.com/v1/oembed?url={video_url}
const useGumletThumbnail = (watchUrl) => {
  const [thumb, setThumb] = useState(null);

  useEffect(() => {
    let alive = true;
    const id = getGumletId(watchUrl);
    if (!id) return;

    (async () => {
      try {
        const endpoint = `https://api.gumlet.com/v1/oembed?url=${encodeURIComponent(watchUrl)}`;
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setThumb(data?.thumbnail_url || null);
      } catch {
        // Silent fail: card will fall back to gradient background
      }
    })();

    return () => { alive = false; };
  }, [watchUrl]);

  return thumb;
};

/* ============================
   2) PORTFOLIO LIBRARY (REPLACE YOUR PORTFOLIO_DATA WITH THIS)
   - url fields are watch links (fine)
   ============================ */

const PORTFOLIO = [
  { id:"reel", title:"AOM Reel", sub:"High-level capability reel", url:"https://gumlet.tv/watch/698a6215aec3d4e420c317f7/", audience:["agencies","builders","founders"], format:"Reel", tags:["Featured","Range","Proof"], featured:true, blurb:"A fast read on what we actually deliver when the stakes are real." },

  // Moments
  { id:"journey-gary-lee", title:"Journey To Gary Lee", sub:"Story + execution", url:"https://gumlet.tv/watch/698a6296fc23d3d76fa8d992/", audience:["agencies","founders"], format:"Brand Film", tags:["Featured","Story"], featured:true, blurb:"For brands that need narrative without losing clarity." },
  { id:"gitex", title:"Gitex Dubai", sub:"Event coverage that feels like a campaign", url:"https://gumlet.tv/watch/698a6227fc23d3d76fa8cd57/", audience:["agencies","founders"], format:"Event", tags:["Event","Scale"], featured:false, blurb:"Capture the moment, but keep it usable for sales and recruiting." },
  { id:"rainbow", title:"Rainbow Rider Hot Air Balloon", sub:"Experience content", url:"https://gumlet.tv/watch/698a6106aec3d4e420c2fd85/", audience:["agencies","founders"], format:"Brand Film", tags:["Experience"], featured:false, blurb:"A clean way to sell a feeling without looking like an ad." },

  // Restaurant / Hospitality
  { id:"pretty-penny", title:"Pretty Penny Restaurant", sub:"Restaurant brand piece", url:"https://gumlet.tv/watch/698a5d24aec3d4e420c2a0a0/", audience:["agencies","founders"], format:"Brand Film", tags:["Food","Brand"], featured:true, blurb:"Atmosphere, menu, identity. No cringe, no stock vibes." },
  { id:"ducor-event", title:"DuCœur Event Recap", sub:"Hospitality recap", url:"https://gumlet.tv/watch/698a53a4aec3d4e420c17ee0/", audience:["agencies","founders"], format:"Event", tags:["Recap"], featured:false, blurb:"Event content that earns its spot on the website." },
  { id:"cook-craft-bg", title:"Cook & Craft Website Background", sub:"Site hero background asset", url:"https://gumlet.tv/watch/698a53a9873071aec5c8b9d7/", audience:["agencies","founders"], format:"Asset", tags:["Website","Brand System"], featured:false, blurb:"Not a video. An asset built to hold attention where it matters." },
  { id:"virtu", title:"Virtu Hospitality Scottsdale", sub:"Hospitality brand content", url:"https://gumlet.tv/watch/698a5ef5fc23d3d76fa87ef4/", audience:["agencies","founders"], format:"Brand Film", tags:["Hospitality"], featured:false, blurb:"Premium without trying too hard. Which is the point." },

  // Business / Trust
  { id:"az-arts", title:"Arizona Citizens Of The Arts Foundation", sub:"Nonprofit trust piece", url:"https://gumlet.tv/watch/698a64e5873071aec5ca99ac/", audience:["founders","agencies"], format:"Case Study", tags:["Trust","Mission"], featured:false, blurb:"Credibility-first storytelling that doesn’t feel like begging." },
  { id:"cynshine", title:"Cindy - Cynshine Pilates", sub:"Founder-led service story", url:"https://gumlet.tv/watch/698a63e5aec3d4e420c34783/", audience:["founders","agencies"], format:"Brand Film", tags:["Founder","Service"], featured:false, blurb:"Founder content that feels natural and confident." },
  { id:"rw", title:"RW Investment Firm", sub:"Trust asset for finance", url:"https://gumlet.tv/watch/698a5edeaec3d4e420c2c8be/", audience:["founders","agencies"], format:"Trust Asset", tags:["Finance","Credibility"], featured:true, blurb:"For industries where trust is the product." },
  { id:"ulisgold", title:"Ulisgold Pilates", sub:"Studio brand asset", url:"https://gumlet.tv/watch/698a5ebcaec3d4e420c2c573/", audience:["founders","agencies"], format:"Brand Film", tags:["Wellness","Brand"], featured:false, blurb:"A clean identity piece that sells without yelling." },

  // Tech / SaaS
  { id:"abstrakt", title:"What is Abstrakt?", sub:"Explainer for automated sales software", url:"https://gumlet.tv/watch/698a5faffc23d3d76fa8909f/", audience:["founders","agencies"], format:"Explainer", tags:["SaaS","Clarity"], featured:true, blurb:"Explainers that don’t feel like onboarding punishment." },
  { id:"reelay", title:"Reelay Explainer Video", sub:"Product clarity + positioning", url:"https://gumlet.tv/watch/698a5aa5aec3d4e420c263c4/", audience:["founders","agencies"], format:"Explainer", tags:["SaaS","Product"], featured:false, blurb:"Built to reduce confusion and increase intent." },
  { id:"intelliplay", title:"Intelliplay Explainer Video", sub:"Product + capability story", url:"https://gumlet.tv/watch/698a5386aec3d4e420c17a69/", audience:["founders","agencies"], format:"Explainer", tags:["Tech","Product"], featured:false, blurb:"When you have a lot to explain, we make it feel simple." },
  { id:"iaapa", title:"IAAPA 2026 Full Recap", sub:"Event recap built for reuse", url:"https://gumlet.tv/watch/698a5391aec3d4e420c17bd3/", audience:["founders","agencies"], format:"Event", tags:["Recap","Cutdowns"], featured:false, blurb:"Shoot once, reuse everywhere. Like adults." },

  // Real estate / Agency
  { id:"noble", title:"Noble Real-Estate Agency", sub:"Agency identity piece", url:"https://gumlet.tv/watch/698a5b86fc23d3d76fa82ece/", audience:["agencies","builders"], format:"Brand Film", tags:["Real Estate","Positioning"], featured:false, blurb:"A clean brand asset for a market where everyone looks the same." },

  // Builders / Industrial
  { id:"to-have-host", title:"To Have and To Host", sub:"Builder / property piece", url:"https://gumlet.tv/watch/698a68b7fc23d3d76fa970ef/", audience:["builders"], format:"Brand Film", tags:["Builders","Trust"], featured:true, blurb:"Proof you can be premium without being pretentious." },
  { id:"abraza", title:"Abraza Healthcare: HVAC Emergency Response", sub:"Operations story under pressure", url:"https://gumlet.tv/watch/698a58aefc23d3d76fa7cdd6/", audience:["builders","founders"], format:"Case Study", tags:["Operations","Reliability"], featured:false, blurb:"For teams that need documentation and trust, not fluff." },
  { id:"memorial", title:"Memorial Towers Crane Day Chillers", sub:"Industrial documentation", url:"https://gumlet.tv/watch/698a584faec3d4e420c20fef/", audience:["builders"], format:"Documentation", tags:["Industrial","Process"], featured:false, blurb:"Clear documentation that makes competent teams look competent." },
  { id:"refined", title:"Refined Gardens Dieon", sub:"Brand authority asset", url:"https://gumlet.tv/watch/698a57fb873071aec5c94350/", audience:["builders","agencies"], format:"Brand Film", tags:["Featured","Authority"], featured:true, blurb:"Built to sell premium work without saying ‘premium’ 40 times." },

  // Social / Verticals
  { id:"primrose", title:"Primrose Ambition Mechanical Update", sub:"Vertical update", url:"https://gumlet.tv/watch/698a581daec3d4e420c20b94/", audience:["builders"], format:"Social", tags:["9:16","Update"], featured:false, blurb:"Fast, clear updates that clients actually watch." },
  { id:"tiffanys", title:"Tiffanys Fashion Square Walkthrough", sub:"End-of-project vertical", url:"https://gumlet.tv/watch/698a580bfc23d3d76fa7bd7c/", audience:["builders"], format:"Social", tags:["9:16","Walkthrough"], featured:false, blurb:"Good for approvals, recruiting, and making the work look serious." },
  { id:"nook", title:"NOOK 10 Year Anniversary ASMR", sub:"Vertical social cut", url:"https://gumlet.tv/watch/698a5a8b873071aec5c99c6f/", audience:["agencies","founders"], format:"Social", tags:["9:16","Food"], featured:false, blurb:"Scroll-stopper content that still fits the brand." },
];

/* ============================
   Existing subcomponents (TextureOverlay, RevealHeading, StrategicVortexBG) can stay.
   Keep your StrategicVortexBG and TextureOverlay as-is.
   ============================ */

/* ============================
   3) REPLACE VideoModule WITH A GUMLET CARD (no <video> tag)
   - Uses thumbnail + gradient
   - Click opens modal (iframe embed)
   ============================ */

const GumletCard = ({ item, isVertical = false, onPlay }) => {
  const thumb = useGumletThumbnail(item.url);

  return (
    <article
      onClick={() => onPlay(item)}
      className={`relative group overflow-hidden border border-white/5 bg-zinc-900/50 h-full cursor-pointer transition-all duration-300 hover:border-orange-600/60 rounded-md ${
        isVertical ? 'aspect-[9/16]' : 'aspect-video shadow-lg'
      }`}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="w-full h-full object-cover opacity-45 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black opacity-80" />
        )}
      </div>

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div className="w-12 h-12 rounded-full bg-orange-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl translate-y-4 group-hover:translate-y-0">
          <Play size={18} className="fill-white text-white ml-1" />
        </div>
      </div>

      {/* Meta */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-1.5">
            {[item.format, ...(item.tags || [])].slice(0, 4).map(tag => (
              <span key={tag} className="text-[9px] font-medium px-2 py-1 bg-black/80 border border-white/5 text-zinc-300 rounded-sm backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="max-w-[95%]">
          <h3 className={`font-bold tracking-tight text-white leading-tight ${isVertical ? 'text-lg' : 'text-xl'}`}>
            {item.title}
          </h3>
          <p className="text-[10px] font-mono text-zinc-400 mt-1.5 uppercase tracking-wider">
            {item.sub}
          </p>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-50 transition-opacity" />
    </article>
  );
};

/* ============================
   4) MAIN APP (ADD FILTER STATE + UPDATE MODAL PLAYER)
   ============================ */

export default function App() {
  const [loadStatus, setLoadStatus] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isInquiryOpen, setIsInquiryOpen] = useState(false);

  // Changed: store clicked portfolio item directly
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', lens: '', path: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Portfolio filters
  const [audience, setAudience] = useState("builders"); // builders | founders | agencies
  const [formatFilter, setFormatFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const audienceLabel = { builders: "Builders", founders: "Founders", agencies: "Agencies" };
  const FORMATS = ["All", "Reel", "Brand Film", "Case Study", "Explainer", "Event", "Documentation", "Trust Asset", "Asset", "Social"];

  const visibleWork = useMemo(() => {
    return PORTFOLIO
      .filter(v => v.audience?.includes(audience))
      .filter(v => (formatFilter === "All" ? true : v.format === formatFilter))
      .filter(v => {
        if (!searchTerm.trim()) return true;
        const s = searchTerm.toLowerCase();
        return (
          v.title.toLowerCase().includes(s) ||
          (v.sub || "").toLowerCase().includes(s) ||
          (v.format || "").toLowerCase().includes(s) ||
          (v.tags || []).join(" ").toLowerCase().includes(s)
        );
      });
  }, [audience, formatFilter, searchTerm]);

  const featuredWork = useMemo(() => visibleWork.filter(v => v.featured), [visibleWork]);
  const libraryWork = useMemo(() => visibleWork.filter(v => !v.featured), [visibleWork]);

  // Auth/init effects unchanged...
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return;
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth System Error:", err);
      }
    };
    initAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'leads') setIsAdmin(true);
      });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin || !db) return;
    const leadsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'leads'));
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeads(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error("Database Link Error:", err));
    return () => unsubscribe();
  }, [user, isAdmin]);

  useEffect(() => {
    if (loadStatus < 100) {
      const timer = setTimeout(() => setLoadStatus(prev => prev + 4), 20);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setIsInitialized(true), 400);
    }
  }, [loadStatus]);

  const handleInquirySubmit = async () => {
    if (!user || !db) return setFormError("System Offline. Email hello@aom-inhouse.com");
    setIsSubmitting(true);
    setFormError('');
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
        ...formData,
        createdAt: serverTimestamp(),
        source: 'AOM_V19_CLIENT'
      });
      setIsSuccess(true);
    } catch (err) {
      setFormError("Connection Error. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-8 z-[1000]">
        <div className="w-full max-w-xs text-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-4xl font-bold italic tracking-tighter text-white mb-3">
              AOM<span className="text-orange-600">.</span>
            </h1>
          </motion.div>
          <div className="h-[2px] bg-white/10 w-full relative overflow-hidden mt-8 rounded-full">
            <motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-orange-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-[#020202] text-zinc-100 selection:bg-orange-600 selection:text-white font-sans overflow-x-hidden antialiased max-w-[100vw] text-left">
      {/* Keep your TextureOverlay, Admin, Inquiry modal, Hero, Process, Footer as you already have.
          Only changes below are: the Player modal + Portfolio section + tile component usage. */}

      {/* --- STUDIO PLAYER (UPDATED: Gumlet iframe embed) --- */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[700] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-xl"
          >
            <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-start pointer-events-none">
              <div className="flex flex-col text-left max-w-4xl">
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">{selectedVideo.title}</h2>
                <p className="text-zinc-400 text-sm mt-2">{selectedVideo.sub}</p>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="pointer-events-auto bg-white/10 p-3 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="w-full max-w-6xl aspect-video bg-zinc-950 rounded-lg overflow-hidden shadow-2xl border border-white/5 relative">
              <div className="absolute inset-0">
                <iframe
                  title="Gumlet video player"
                  src={getGumletEmbedSrc(selectedVideo.url)}
                  loading="lazy"
                  className="w-full h-full"
                  style={{ border: "none" }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PORTFOLIO (V19) REPLACE YOUR WHOLE #work SECTION WITH THIS --- */}
      <section id="work" className="px-6 md:px-12 lg:px-24 py-24 bg-[#050505] relative z-10">
        <div className="max-w-screen-xl mx-auto w-full">

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 border-b border-white/5 pb-10">
            <div className="max-w-2xl">
              <h3 className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-3">Proof Library</h3>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[0.95]">
                Work that holds up <span className="text-zinc-500">under scrutiny.</span>
              </h2>
              <p className="text-zinc-400 text-base md:text-lg leading-relaxed mt-6">
                This isn’t a highlight page. It’s a catalog of assets built to sell, recruit, win trust, and keep your brand consistent while you scale.
              </p>
            </div>

            <div className="w-full lg:w-auto">
              {/* Audience tabs */}
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {["agencies", "builders", "founders"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setAudience(tab); setFormatFilter("All"); setSearchTerm(""); }}
                    className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap ${
                      audience === tab ? "bg-white text-black" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {audienceLabel[tab]}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="mt-4 flex gap-3 items-center">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search titles, tags, formats..."
                    className="w-full bg-transparent outline-none text-sm text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="text-xs font-mono text-zinc-500 whitespace-nowrap">
                  {visibleWork.length} items
                </div>
              </div>

              {/* Format filters */}
              <div className="mt-3 flex gap-2 flex-wrap">
                {FORMATS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFormatFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                      formatFilter === f ? "bg-orange-600 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Featured */}
          <div className="mt-12">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-orange-600" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Featured for {audienceLabel[audience]}</h4>
              </div>
              <div className="text-xs text-zinc-500 hidden md:block">
                Built as: brand assets, explainers, trust pieces, and campaign cutdowns.
              </div>
            </div>

            {featuredWork.length === 0 ? (
              <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-zinc-400">
                No featured work matches these filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredWork.map((item) => (
                  <div key={item.id} className="space-y-3">
                    <GumletCard item={item} onPlay={setSelectedVideo} />
                    <p className="text-zinc-500 text-sm leading-relaxed">{item.blurb}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Library */}
          <div className="mt-16">
            <div className="flex items-center gap-3 mb-6">
              <Layers size={18} className="text-orange-600" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Library</h4>
            </div>

            {libraryWork.length === 0 ? (
              <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-zinc-400">
                Nothing matches this search/filter combo.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {libraryWork.map((item) => (
                  <GumletCard
                    key={item.id}
                    item={item}
                    isVertical={item.format === "Social"}
                    onPlay={setSelectedVideo}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* Everything else in your App stays the same: nav, hero, inquiry modal, process, footer, etc. */}
    </main>
  );
}
