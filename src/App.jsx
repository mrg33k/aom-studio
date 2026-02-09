import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import * as THREE from 'three';
import {
  X,
  Play,
  MoveRight,
  ChevronRight,
  Clock,
  CheckCircle2,
  Terminal,
  Activity,
  Globe,
  AlertCircle,
  Smartphone,
  Film,
  Target,
  Database,
  Lock,
  Loader2,
  Sparkles,
  Camera,
  Layers,
  Monitor,
  Briefcase,
  CheckSquare
} from 'lucide-react';

// --- FIREBASE INFRASTRUCTURE (SAFE MODE) ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';

// Initialize with safety check
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

// --- BRAND CONSTANTS ---
const ORANGE = "#FF4F00";

/* ============================================================
   GUMLET HELPERS (watch -> embed + autoplay + thumbnails)
   - Watch URLs are NOT playable video sources.
   - We convert https://gumlet.tv/watch/{id} -> https://play.gumlet.io/embed/{id}
   - Player params (autoplay/background/loop/etc) are supported via query params. :contentReference[oaicite:1]{index=1}
   ============================================================ */

const getGumletId = (url = "") => {
  const m =
    url.match(/gumlet\.tv\/watch\/([a-zA-Z0-9]+)/) ||
    url.match(/play\.gumlet\.io\/embed\/([a-zA-Z0-9]+)/);
  return m?.[1] || null;
};

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
};

const getGumletEmbedSrc = (watchOrEmbedUrl = "", params = {}) => {
  const id = getGumletId(watchOrEmbedUrl);
  const base = id ? `https://play.gumlet.io/embed/${id}` : watchOrEmbedUrl;
  return `${base}${buildQuery(params)}`;
};

// Gumlet oEmbed can return thumbnail_url for a watch link. :contentReference[oaicite:2]{index=2}
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
        // fail silently; card falls back to gradient
      }
    })();

    return () => { alive = false; };
  }, [watchUrl]);

  return thumb;
};

/* ============================================================
   MASTER PORTFOLIO LIBRARY (V19)
   - Structured to sell outcomes
   - Uses your Gumlet WATCH links; player converts them automatically
   ============================================================ */

const PORTFOLIO = [
  // --- FEATURED / TOP ---
  {
    id: "reel",
    title: "AOM Reel",
    sub: "High-level capability reel",
    url: "https://gumlet.tv/watch/698a6215aec3d4e420c317f7/",
    audience: ["agencies", "builders", "founders"],
    format: "Reel",
    tags: ["Featured", "Range", "Proof"],
    featured: true,
    blurb: "A fast read on what we actually deliver when the stakes are real."
  },

  // Moments
  {
    id: "journey-gary-lee",
    title: "Journey To Gary Lee",
    sub: "Story + execution",
    url: "https://gumlet.tv/watch/698a6296fc23d3d76fa8d992/",
    audience: ["agencies", "founders"],
    format: "Brand Film",
    tags: ["Featured", "Story"],
    featured: true,
    blurb: "Narrative without losing clarity."
  },
  {
    id: "gitex-dubai",
    title: "Gitex Dubai",
    sub: "Event coverage that feels like a campaign",
    url: "https://gumlet.tv/watch/698a6227fc23d3d76fa8cd57/",
    audience: ["agencies", "founders"],
    format: "Event",
    tags: ["Event", "Scale"],
    featured: false,
    blurb: "Capture the moment, keep it usable for sales and recruiting."
  },
  {
    id: "rainbow-rider",
    title: "Rainbow Rider Hot Air Balloon",
    sub: "Experience content",
    url: "https://gumlet.tv/watch/698a6106aec3d4e420c2fd85/",
    audience: ["agencies", "founders"],
    format: "Brand Film",
    tags: ["Experience"],
    featured: false,
    blurb: "Sell the feeling without looking like an ad."
  },

  // Restaurant / Hospitality
  {
    id: "pretty-penny",
    title: "Pretty Penny Restaurant",
    sub: "Restaurant brand piece",
    url: "https://gumlet.tv/watch/698a5d24aec3d4e420c2a0a0/",
    audience: ["agencies", "founders"],
    format: "Brand Film",
    tags: ["Food", "Brand"],
    featured: true,
    blurb: "Atmosphere, menu, identity. No cringe."
  },
  {
    id: "ducor-event",
    title: "DuCœur Event Recap",
    sub: "Hospitality recap",
    url: "https://gumlet.tv/watch/698a53a4aec3d4e420c17ee0/",
    audience: ["agencies", "founders"],
    format: "Event",
    tags: ["Recap"],
    featured: false,
    blurb: "Event content that earns its spot on the website."
  },
  {
    id: "cook-craft-bg",
    title: "Cook & Craft Website Background",
    sub: "Site hero background asset",
    url: "https://gumlet.tv/watch/698a53a9873071aec5c8b9d7/",
    audience: ["agencies", "founders"],
    format: "Asset",
    tags: ["Website", "Brand System"],
    featured: false,
    blurb: "An asset built to hold attention where it matters."
  },
  {
    id: "virtu-hospitality",
    title: "Virtu Hospitality Scottsdale",
    sub: "Hospitality brand content",
    url: "https://gumlet.tv/watch/698a5ef5fc23d3d76fa87ef4/",
    audience: ["agencies", "founders"],
    format: "Brand Film",
    tags: ["Hospitality"],
    featured: false,
    blurb: "Premium without trying too hard."
  },

  // Business / Trust
  {
    id: "az-arts",
    title: "Arizona Citizens Of The Arts Foundation",
    sub: "Nonprofit trust piece",
    url: "https://gumlet.tv/watch/698a64e5873071aec5ca99ac/",
    audience: ["founders", "agencies"],
    format: "Case Study",
    tags: ["Trust", "Mission"],
    featured: false,
    blurb: "Credibility-first storytelling that doesn’t feel like begging."
  },
  {
    id: "cynshine",
    title: "Cindy - Cynshine Pilates",
    sub: "Founder-led service story",
    url: "https://gumlet.tv/watch/698a63e5aec3d4e420c34783/",
    audience: ["founders", "agencies"],
    format: "Brand Film",
    tags: ["Founder", "Service"],
    featured: false,
    blurb: "Founder content that feels natural and confident."
  },
  {
    id: "rw-investments",
    title: "RW Investment Firm",
    sub: "Trust asset for finance",
    url: "https://gumlet.tv/watch/698a5edeaec3d4e420c2c8be/",
    audience: ["founders", "agencies"],
    format: "Trust Asset",
    tags: ["Finance", "Credibility"],
    featured: true,
    blurb: "For industries where trust is the product."
  },
  {
    id: "ulisgold",
    title: "Ulisgold Pilates",
    sub: "Studio brand asset",
    url: "https://gumlet.tv/watch/698a5ebcaec3d4e420c2c573/",
    audience: ["founders", "agencies"],
    format: "Brand Film",
    tags: ["Wellness", "Brand"],
    featured: false,
    blurb: "Clean identity piece. No yelling."
  },

  // Tech / SaaS
  {
    id: "abstrakt",
    title: "What is Abstrakt?",
    sub: "Explainer for automated sales software",
    url: "https://gumlet.tv/watch/698a5faffc23d3d76fa8909f/",
    audience: ["founders", "agencies"],
    format: "Explainer",
    tags: ["SaaS", "Clarity"],
    featured: true,
    blurb: "Explainers that don’t feel like onboarding punishment."
  },
  {
    id: "reelay",
    title: "Reelay Explainer Video",
    sub: "Product clarity + positioning",
    url: "https://gumlet.tv/watch/698a5aa5aec3d4e420c263c4/",
    audience: ["founders", "agencies"],
    format: "Explainer",
    tags: ["SaaS", "Product"],
    featured: false,
    blurb: "Built to reduce confusion and increase intent."
  },
  {
    id: "intelliplay",
    title: "Intelliplay Explainer Video",
    sub: "Product + capability story",
    url: "https://gumlet.tv/watch/698a5386aec3d4e420c17a69/",
    audience: ["founders", "agencies"],
    format: "Explainer",
    tags: ["Tech", "Product"],
    featured: false,
    blurb: "When you have a lot to explain, we make it feel simple."
  },
  {
    id: "iaapa-2026",
    title: "IAAPA 2026 Full Recap",
    sub: "Event recap built for reuse",
    url: "https://gumlet.tv/watch/698a5391aec3d4e420c17bd3/",
    audience: ["founders", "agencies"],
    format: "Event",
    tags: ["Recap", "Cutdowns"],
    featured: false,
    blurb: "Shoot once, reuse everywhere."
  },

  // Real estate / Agency
  {
    id: "noble",
    title: "Noble Real-Estate Agency",
    sub: "Agency identity piece",
    url: "https://gumlet.tv/watch/698a5b86fc23d3d76fa82ece/",
    audience: ["agencies", "builders"],
    format: "Brand Film",
    tags: ["Real Estate", "Positioning"],
    featured: false,
    blurb: "A clean brand asset for a market where everyone looks the same."
  },

  // Builders / Industrial
  {
    id: "to-have-host",
    title: "To Have and To Host",
    sub: "Builder / property piece",
    url: "https://gumlet.tv/watch/698a68b7fc23d3d76fa970ef/",
    audience: ["builders"],
    format: "Brand Film",
    tags: ["Builders", "Trust"],
    featured: true,
    blurb: "Premium without being pretentious."
  },
  {
    id: "abraza-hvac",
    title: "Abraza Healthcare: HVAC Emergency Response",
    sub: "Operations story under pressure",
    url: "https://gumlet.tv/watch/698a58aefc23d3d76fa7cdd6/",
    audience: ["builders", "founders"],
    format: "Case Study",
    tags: ["Operations", "Reliability"],
    featured: false,
    blurb: "Documentation and trust. Not fluff."
  },
  {
    id: "memorial-towers",
    title: "Memorial Towers Crane Day Chillers",
    sub: "Industrial documentation",
    url: "https://gumlet.tv/watch/698a584faec3d4e420c20fef/",
    audience: ["builders"],
    format: "Documentation",
    tags: ["Industrial", "Process"],
    featured: false,
    blurb: "Clear documentation that makes competent teams look competent."
  },
  {
    id: "refined-gardens",
    title: "Refined Gardens Dieon",
    sub: "Brand authority asset",
    url: "https://gumlet.tv/watch/698a57fb873071aec5c94350/",
    audience: ["builders", "agencies"],
    format: "Brand Film",
    tags: ["Featured", "Authority"],
    featured: true,
    blurb: "Built to sell premium work without saying ‘premium’ 40 times."
  },

  // Social / Verticals
  {
    id: "primrose-update",
    title: "Primrose Ambition Mechanical Update",
    sub: "Vertical update",
    url: "https://gumlet.tv/watch/698a581daec3d4e420c20b94/",
    audience: ["builders"],
    format: "Social",
    tags: ["9:16", "Update"],
    featured: false,
    blurb: "Fast, clear updates that clients actually watch."
  },
  {
    id: "tiffanys-walkthrough",
    title: "Tiffanys Fashion Square Walkthrough",
    sub: "End-of-project vertical",
    url: "https://gumlet.tv/watch/698a580bfc23d3d76fa7bd7c/",
    audience: ["builders"],
    format: "Social",
    tags: ["9:16", "Walkthrough"],
    featured: false,
    blurb: "Good for approvals, recruiting, and making the work look serious."
  },
  {
    id: "nook-asmr",
    title: "NOOK 10 Year Anniversary ASMR",
    sub: "Vertical social cut",
    url: "https://gumlet.tv/watch/698a5a8b873071aec5c99c6f/",
    audience: ["agencies", "founders"],
    format: "Social",
    tags: ["9:16", "Food"],
    featured: false,
    blurb: "Scroll-stopper content that still fits the brand."
  },
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
  </>
);

const RevealHeading = ({ children, className }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-15%" });

  return (
    <div ref={ref} className={`overflow-hidden contain-paint ${className}`}>
      <motion.div
        variants={{
          hidden: { y: "100%", opacity: 0 },
          visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
        }}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {children}
      </motion.div>
    </div>
  );
};

const StrategicVortexBG = () => {
  const mountRef = useRef(null);
  useEffect(() => {
    let scene, camera, renderer, lines, points;
    const mount = mountRef.current;
    if (!mount) return;

    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
      camera.position.set(0, 10, 20);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);

      const size = 80;
      const divisions = 40;
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i <= divisions; i++) {
        const v = (i / divisions) * size - size / 2;
        vertices.push(-size / 2, 0, v, size / 2, 0, v);
        vertices.push(v, 0, -size / 2, v, 0, size / 2);
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

      lines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: ORANGE,
          transparent: true,
          opacity: 0.35,
          linewidth: 1
        })
      );
      scene.add(lines);

      const pVertices = [];
      for (let i = 0; i < 600; i++) pVertices.push(
        THREE.MathUtils.randFloatSpread(100),
        THREE.MathUtils.randFloatSpread(40),
        THREE.MathUtils.randFloatSpread(100)
      );
      const pGeometry = new THREE.BufferGeometry();
      pGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pVertices, 3));
      points = new THREE.Points(
        pGeometry,
        new THREE.PointsMaterial({ color: ORANGE, size: 0.06, transparent: true, opacity: 0.4 })
      );
      scene.add(points);

      const animate = () => {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.0002;
        const pos = lines.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const x = pos[i], z = pos[i + 2];
          pos[i + 1] = Math.sin(x * 0.05 + time) * Math.cos(z * 0.05 + time) * 3;
        }
        lines.geometry.attributes.position.needsUpdate = true;
        points.rotation.y += 0.0001;
        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mount && renderer?.domElement) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

/* ============================================================
   PORTFOLIO CARD (Gumlet thumbnail + hover autoplay preview)
   - Hover: loads iframe only while hovered (background autoplay loop)
   - Click: opens modal player
   ============================================================ */

const GumletCard = ({ item, isVertical = false, onPlay }) => {
  const thumb = useGumletThumbnail(item.url);
  const [hovered, setHovered] = useState(false);

  const previewSrc = useMemo(() => {
    return getGumletEmbedSrc(item.url, {
      background: true,
      autoplay: true,
      loop: true,
      disable_player_controls: true
    });
  }, [item.url]);

  return (
    <article
      onClick={() => onPlay(item)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "relative group overflow-hidden border border-white/5 bg-zinc-900/50 h-full cursor-pointer transition-all duration-300 hover:border-orange-600/60 rounded-md",
        isVertical ? "aspect-[9/16]" : "aspect-video shadow-lg"
      ].join(" ")}
    >
      {/* Base thumbnail */}
      <div className="absolute inset-0">
        {thumb ? (
          <img
            src={thumb}
            alt={item.title}
            className="w-full h-full object-cover opacity-45 group-hover:opacity-100 group-hover:scale-[1.02] transition-all duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black opacity-80" />
        )}
      </div>

      {/* Hover preview iframe (only mounted while hovered) */}
      {hovered && (
        <div className="absolute inset-0 z-10">
          <iframe
            title={`${item.title} preview`}
            src={previewSrc}
            className="w-full h-full"
            style={{ border: "none" }}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/15" />
        </div>
      )}

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <div className="w-12 h-12 rounded-full bg-orange-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl translate-y-4 group-hover:translate-y-0">
          <Play size={18} className="fill-white text-white ml-1" />
        </div>
      </div>

      {/* Meta */}
      <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-40">
        <div className="flex justify-between items-start">
          <div className="flex flex-wrap gap-1.5">
            {[item.format, ...(item.tags || [])].slice(0, 4).map(tag => (
              <span
                key={tag}
                className="text-[9px] font-medium px-2 py-1 bg-black/80 border border-white/5 text-zinc-300 rounded-sm backdrop-blur-sm"
              >
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

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-85 group-hover:opacity-60 transition-opacity z-20" />
    </article>
  );
};

// --- MAIN APP ---
export default function App() {
  const [loadStatus, setLoadStatus] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
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
            <h1 className="text-4xl font-bold italic tracking-tighter text-white mb-3">AOM<span className="text-orange-600">.</span></h1>
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
      <TextureOverlay />

      {/* --- ADMIN DASHBOARD --- */}
      {isAdmin && (
        <div className="fixed inset-0 z-[900] bg-black/98 backdrop-blur-3xl p-6 md:p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-12 border-b border-orange-600/20 pb-8">
              <h2 className="text-3xl font-bold text-white">Client Inquiries</h2>
              <button onClick={() => setIsAdmin(false)} className="text-sm font-mono text-zinc-400 hover:text-white">CLOSE</button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {leads.map(lead => (
                <div key={lead.id} className="p-6 bg-zinc-900/50 border border-white/5 rounded-lg flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2">
                    <div className="text-orange-500 font-bold text-xl">{lead.name || 'Unknown Contact'}</div>
                    <div className="text-sm text-zinc-400">{lead.email} • {lead.phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium text-sm mb-1">{lead.lens}</div>
                    <div className="text-xs font-mono text-zinc-500">{lead.createdAt ? new Date(lead.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- CREATIVE BRIEF MODAL --- */}
      <AnimatePresence>
        {isInquiryOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-hidden">
            <div className="w-full max-w-lg p-8 md:p-12 border border-white/10 bg-[#0a0a0a] relative shadow-2xl rounded-xl">
              <button onClick={() => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); }} className="absolute top-6 right-6 text-zinc-500 hover:text-white"><X size={24} /></button>

              {!isSuccess ? (
                <div className="space-y-8 text-left">
                  <div>
                    <span className="text-orange-600 text-xs font-bold tracking-widest uppercase">Start Project</span>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight mt-2 text-white">Let's build this.</h2>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="min-h-[250px]">
                      {step === 1 && (
                        <div className="space-y-3">
                          <p className="text-zinc-400 text-sm mb-6">I am a...</p>
                          {["Real Estate Developer", "Founder / Tech", "Marketing Agency"].map(opt => (
                            <button key={opt} onClick={() => { setFormData({ ...formData, lens: opt }); setStep(2); }} className="w-full p-4 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white transition-all rounded-lg flex justify-between items-center text-left group">
                              <span className="font-medium">{opt}</span>
                              <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />
                            </button>
                          ))}
                        </div>
                      )}

                      {step === 2 && (
                        <div className="space-y-6">
                          <p className="text-zinc-400 text-sm mb-4">Contact Details</p>
                          <div className="space-y-3">
                            <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors" />
                            <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors" />
                            <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors" />
                          </div>
                          {formError && <div className="text-orange-500 text-xs mt-2">{formError}</div>}
                          <button onClick={() => (formData.name && formData.email) ? setStep(3) : setFormError("Please complete all fields.")} className="w-full bg-orange-600 text-white font-bold py-4 rounded-lg hover:bg-orange-700 transition-colors mt-4">Next Step</button>
                        </div>
                      )}

                      {step === 3 && (
                        <div className="space-y-3">
                          <p className="text-zinc-400 text-sm mb-6">What do you need?</p>
                          {["Full Campaign (Brand + Assets)", "Documentary Series", "Ongoing Content Partnership"].map(opt => (
                            <button key={opt} onClick={() => { setFormData({ ...formData, path: opt }); handleInquirySubmit(); }} className="w-full p-4 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white transition-all rounded-lg flex justify-between items-center text-left group">
                              <span className="font-medium">{opt}</span>
                              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight size={18} className="text-zinc-600 group-hover:text-white" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle2 size={64} className="mx-auto text-orange-600 mb-6" />
                  <h2 className="text-3xl font-bold text-white mb-4">Received.</h2>
                  <p className="text-zinc-400 text-sm mb-8">We've got your info. Expect a personal reach-out within 24 hours.</p>
                  <button onClick={() => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); }} className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors">Close</button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- STUDIO PLAYER (GUMLET EMBED) --- */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-xl">
            <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-start pointer-events-none">
              <div className="flex flex-col text-left max-w-4xl">
                <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">{selectedVideo.title}</h2>
                {selectedVideo.sub && <p className="text-zinc-400 text-sm mt-2">{selectedVideo.sub}</p>}
              </div>
              <button onClick={() => setSelectedVideo(null)} className="pointer-events-auto bg-white/10 p-3 rounded-full hover:bg-white/20 text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="w-full max-w-6xl aspect-video bg-zinc-950 rounded-lg overflow-hidden shadow-2xl border border-white/5 relative">
              <iframe
                title="Gumlet video player"
                src={getGumletEmbedSrc(selectedVideo.url, { autoplay: true })}
                className="w-full h-full"
                style={{ border: "none" }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
                allowFullScreen
                loading="eager"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NAVIGATION --- */}
      <header className="fixed top-0 left-0 w-full z-[200] px-6 py-6 md:px-12 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent backdrop-blur-sm">
        <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <h1 className="text-2xl md:text-3xl font-bold italic tracking-tighter text-white hover:text-orange-600 transition-colors">
            AOM<span className="text-orange-600">.</span>
          </h1>
        </div>
        <nav className="flex gap-8 items-center">
          <a href="#work" className="hidden md:block text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Work</a>
          <a href="#system" className="hidden md:block text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">Process</a>
          <button onClick={() => setIsInquiryOpen(true)} className="px-6 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-sm hover:bg-orange-600 hover:text-white transition-all">
            Get Started
          </button>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="min-h-[90vh] flex flex-col justify-center px-6 md:px-12 lg:px-24 relative overflow-hidden pt-20 w-full max-w-[100vw]">
        <StrategicVortexBG />
        <div className="max-w-screen-xl mx-auto w-full relative z-10 text-left">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>
            <div className="inline-flex items-center gap-4 mb-8 border-l-2 border-orange-600 pl-4">
              <p className="text-orange-500 font-bold text-xs uppercase tracking-widest">Video Infrastructure for Market Leaders</p>
            </div>
            <h2 className="text-[clamp(3rem,7vw,7rem)] font-bold leading-[0.95] tracking-tight text-white max-w-4xl">
              We handle the production. <br />
              <span className="text-zinc-500">You handle the scale.</span>
            </h2>
          </motion.div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-end">
            <div>
              <p className="text-base md:text-lg text-zinc-400 leading-relaxed max-w-md">
                A turnkey production partner for Phoenix founders and developers. We build the high-impact assets that drive your business forward.
              </p>
            </div>
            <div className="flex justify-start md:justify-end">
              <button onClick={() => setIsInquiryOpen(true)} className="group flex items-center gap-4 text-white hover:text-orange-500 transition-colors">
                <span className="text-xl md:text-2xl font-bold border-b border-white/20 pb-1 group-hover:border-orange-500">Start Your Project</span>
                <MoveRight size={24} className="group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE PORTFOLIO ARCHIVE (UPGRADED) --- */}
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

            <div className="w-full lg:w-[520px]">
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
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Featured for {audienceLabel[audience]}
                </h4>
              </div>
              <div className="text-xs text-zinc-500 hidden md:block">
                Brand assets • explainers • trust pieces • campaign cutdowns
              </div>
            </div>

            {featuredWork.length === 0 ? (
              <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-zinc-400">
                No featured work matches these filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {featuredWork.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3">
                    <div className="flex-1">
                      <GumletCard item={item} onPlay={setSelectedVideo} isVertical={item.format === "Social"} />
                    </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-stretch">
                {libraryWork.map((item) => (
                  <div key={item.id} className="h-full">
                    <GumletCard
                      item={item}
                      isVertical={item.format === "Social"}
                      onPlay={setSelectedVideo}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>

      {/* --- THE PROCESS --- */}
      <section id="system" className="px-6 md:px-12 lg:px-24 py-24 bg-zinc-950 border-t border-white/5">
        <div className="max-w-screen-xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-block px-3 py-1 bg-orange-600/10 border border-orange-600/20 rounded-full mb-6">
              <span className="text-orange-500 text-xs font-bold uppercase tracking-wider">How We Deliver</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-8">
              Reliability is our <br />
              <span className="text-zinc-500">primary asset.</span>
            </h2>
            <div className="space-y-12">
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Briefcase size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Business-First Strategy</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                    We map the assets you need to sell, recruit, and grow before we ever pick up a camera.
                  </p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <CheckSquare size={20} className="text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Turnkey Execution</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
                    From scripting to final delivery, we own the process. Clear timelines. Clean updates. Zero chaos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Keep your original process video (Dropbox) */}
          <div className="relative h-[600px] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-60"
              onClick={() => setSelectedVideo({
                url: "https://gumlet.tv/watch/698a57fb873071aec5c94350/",
                title: "Sample: Refined Gardens",
                sub: "Brand authority asset"
              })}
            >
              {/* You can keep this as Dropbox or swap it to Gumlet if you have a direct stream URL */}
              <source src="https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1" />
            </video>
            <div className="absolute bottom-8 left-8 right-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Active Production</span>
              </div>
              <p className="text-zinc-400 text-xs">Phoenix, AZ • AOM Studio System</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="px-6 md:px-12 py-24 border-t border-white/5 bg-black">
        <div className="max-w-screen-xl mx-auto w-full text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-8">Ready to scale your brand?</h2>
          <button onClick={() => setIsInquiryOpen(true)} className="px-8 py-4 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-all text-lg shadow-lg shadow-orange-900/20">
            Get A Proposal
          </button>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 text-left border-t border-white/5 pt-12">
            <div>
              <h6 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Studio</h6>
              <p className="text-white text-lg font-medium">Phoenix, Arizona</p>
              <p className="text-zinc-400 text-sm mt-1">Serving Scottsdale & Tempe</p>
            </div>
            <div>
              <h6 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Contact</h6>
              <a href="mailto:hello@aom-inhouse.com" className="text-white text-lg font-medium hover:text-orange-500 transition-colors">hello@aom-inhouse.com</a>
            </div>
            <div>
              <h6 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Connect</h6>
              <div className="flex gap-6">
                {['Instagram', 'LinkedIn', 'Vimeo'].map(s => <a key={s} href="#" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">{s}</a>)}
              </div>
            </div>
          </div>
          <div className="mt-12 text-left text-zinc-600 text-xs flex justify-between items-center">
            <span>© 2024 Ahead of Market. All rights reserved. Strategy Before Story.</span>
            <span className="font-mono text-orange-600/80">SYSTEM_V19</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
