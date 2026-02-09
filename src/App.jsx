import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import * as THREE from 'three';
import { 
  X,
  Play,
  MoveRight,
  ChevronRight,
  ChevronLeft,
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
  Monitor
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

// --- MASTER PORTFOLIO LIBRARY ---
const PORTFOLIO_DATA = {
  builders: {
    cinematic: [
      { title: "Ambition: Refined Gardens", sub: "Brand Narrative", url: "https://dl.dropboxusercontent.com/scl/fi/i642p6xrm6zpxastfwa2p/REFINED-GARDENS-DIEON.mp4?rlkey=utze6r9xvj4l634sy7klusa5g&raw=1", tags: ["4K", "Architecture"] },
      { title: "The Rebuild: Thelma", sub: "Documentary Series", url: "https://dl.dropboxusercontent.com/scl/fi/pmgtkouq5jkb7chs9xphz/EPISODE-1-THELMA-FF.mov?rlkey=4l5u8xxkw8cxybpnmydhllbmn&raw=1", tags: ["Doc", "Industrial"] },
      { title: "Malapai Construction", sub: "The Craft of Building", url: "https://dl.dropboxusercontent.com/scl/fi/nsg96q5xd1v7jh4gha51h/Malapai-1.mov?rlkey=5abjqtb3zrjcytifndkfgpdcs&raw=1", tags: ["Process", "6K"] },
      { title: "The Noble Agency", sub: "Sizzle Film", url: "https://dl.dropboxusercontent.com/scl/fi/36hxds9dpn1xtcndlcfi9/Noble-Edit-Sizzle.mov?rlkey=3u41bycqn3jqivadsewqkl7m2&raw=1", tags: ["Real Estate"] },
      { title: "Du Coeur", sub: "Luxury Walkthrough", url: "https://dl.dropboxusercontent.com/scl/fi/zqbatp2vzu13xboe4mn9j/Sam-DuCoeur-Walkthrough.m4v?rlkey=t5emcnmd9er5yqp8cqjcya1e4&raw=1", tags: ["High-End"] },
      { title: "AZ Cleantech", sub: "Sector Story", url: "https://dl.dropboxusercontent.com/scl/fi/46ov8xdfv1qy7e3vr7d9b/AZCLEANTECH-FINAL.mov?rlkey=khseypkzvpcvzhlthn3mgjn3z&raw=1", tags: ["Industrial"] }
    ],
    mobile: [
      { title: "Malapai Narrative", sub: "Vertical Intro", url: "https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1", tags: ["9:16"] },
      { title: "Refined Gardens", sub: "Mobile Cut", url: "https://dl.dropboxusercontent.com/scl/fi/3val6y22ma1ju8f5cqqqe/REFINED-GARDENS-MOBILE.mp4?rlkey=infjowq6zp8cqirrdesg1e0wn&raw=1", tags: ["9:16"] },
      { title: "Malapai Lafayette", sub: "Project Update", url: "https://dl.dropboxusercontent.com/scl/fi/ey6te42ahdx4t9udzieao/Malapai-Lafayette-update.mov?rlkey=xsbhgqi3j1voxpwx86090b6q8&raw=1", tags: ["Update"] },
      { title: "Arrowhead Grenadier", sub: "Mobile Update", url: "https://dl.dropboxusercontent.com/scl/fi/8a0mig4l8bd8yf3khtigq/ARROWHEAD-UPDATE-MOBILE.mp4?rlkey=hylucrr5d7x3q62ul03g63byz&raw=1", tags: ["INEOS"] }
    ]
  },
  founders: {
    cinematic: [
      { title: "Reelay Product", sub: "Software Explainer", url: "https://dl.dropboxusercontent.com/scl/fi/8wfqw1mw9scrahx04x8ks/Reelay-EXPLAINER-1920x1080.mp4?rlkey=hf1ycl8zftd08x32m3asm820g&raw=1", tags: ["SaaS", "VC"] },
      { title: "NGOTS", sub: "Business Highlight", url: "https://dl.dropboxusercontent.com/scl/fi/jk5wjgqeylw3khbz2ac7y/NGOTS.mp4?rlkey=xky4j0lmms9y8r1qr7w3cl4k8&raw=1", tags: ["Highlight"] },
      { title: "Intelliplay Vision", sub: "UX Capability", url: "https://dl.dropboxusercontent.com/scl/fi/m92mdkme20vwzb3791cnx/Intelliplay-FF.mov?rlkey=aasi46x1u610tqfpx75dw6qgd&raw=1", tags: ["Tech", "UX"] },
      { title: "Founders Retreat", sub: "Event Narrative", url: "https://dl.dropboxusercontent.com/scl/fi/2btjzczt66p8aj3iprvy/Retreat-2022.m4v?rlkey=fpjcvxrkj4qtsf2p4fx701v0l&raw=1", tags: ["Network"] },
      { title: "RW Investments", sub: "Finance Legacy", url: "https://dl.dropboxusercontent.com/scl/fi/rl5tnpm2lmet6mcful57b/RW-Investments-1-Minute.mp4?rlkey=3be7n7j2k0se7ye81a2de2k0s&raw=1", tags: ["Brand"] }
    ],
    mobile: [
      { title: "Abstrakt SDR", sub: "Vertical Explainer", url: "https://dl.dropboxusercontent.com/scl/fi/311qjnptwbffo0jrlk26c/What-is-Abstrakt-VERT-9x16.mp4?rlkey=8e4eisivpr7ol6rh3leajkfw8&raw=1", tags: ["9:16"] },
      { title: "Intelliplay IAAPA", sub: "Event Recap", url: "https://dl.dropboxusercontent.com/scl/fi/juc0yicl7bdoj16k51aci/IAAPA-DAY-2.mov?rlkey=nwbelita2wdmw1mhlvc340f6o&raw=1", tags: ["Social"] }
    ]
  },
  marketing: {
    cinematic: [
      { title: "Letter To The World", sub: "Epic Trailer", url: "https://dl.dropboxusercontent.com/scl/fi/t1jzugta90mp2up4na6zb/Letter-To-The-World-Trailer-FF.mov?rlkey=bz84d3eocnkpd34tnt8fmaxof&raw=1", tags: ["Cinema"] },
      { title: "Cook & Craft", sub: "Brand Identity", url: "https://dl.dropboxusercontent.com/scl/fi/9tb5f2m9fahqh1uqh1m5q/Website-Background-C-C.mov?rlkey=dippv72znkzrjdpziae6mzz7p&raw=1", tags: ["Food"] },
      { title: "N2 Media", sub: "Brand Reel", url: "https://dl.dropboxusercontent.com/scl/fi/67tbiugc7b9ofwkpxqc3g/n2-Reel.m4v?rlkey=awjlbtw5l833m5co5ci7lbd0o&raw=1", tags: ["Reel"] },
      { title: "Ulisgold Pilates", sub: "Studio Narrative", url: "https://dl.dropboxusercontent.com/scl/fi/nd4hjftihygeux09zcr1x/ULISGOLD-GRADED-V2.mov?rlkey=cco8bu4qtmehs098mmcebrkxg&raw=1", tags: ["Wellness"] }
    ],
    mobile: [
      { title: "NOOK Kitchen", sub: "10 Year Social", url: "https://dl.dropboxusercontent.com/scl/fi/gjua2slterlpr4r7hhfjo/Happy-10-Year-Reel-1.mov?rlkey=3ml7y0gg6t89df051y3bxtfui&raw=1", tags: ["Social"] },
      { title: "Combat Veterans", sub: "Promo Cut", url: "https://dl.dropboxusercontent.com/scl/fi/cqosg1t3bck3d4hwuc5ks/Veterans-Day-Event-Promo.mp4?rlkey=271kjtoooigctix6ir10w8zbs&raw=1", tags: ["Event"] },
      { title: "Cook & Craft Influencer", sub: "Recap", url: "https://dl.dropboxusercontent.com/scl/fi/69m6kg7pmrk7fjo3bd4yi/CC-Influencer-Day.mov?rlkey=jnf2lhdi97dl6fy9c2xdahbxe&raw=1", tags: ["9:16"] },
      { title: "Adobe AI Review", sub: "Technical Review", url: "https://dl.dropboxusercontent.com/scl/fi/nmcas20p1fg53tuoejyeb/Adobe-2.mov?rlkey=x1176327cigm96iq1v7pdwgw2&raw=1", tags: ["Tech"] }
    ]
  }
};

// --- SUB-COMPONENTS ---

const TextureOverlay = () => (
  <>
    <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.05] contrast-150 mix-blend-overlay">
      <svg className="h-full w-full">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
    <div className="fixed inset-0 pointer-events-none z-[998] opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
  </>
);

const RevealHeading = ({ children, className }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  
  return (
    <div ref={ref} className={`overflow-hidden contain-paint ${className}`}>
      <motion.div
        variants={{ 
          hidden: { y: "110%", skewY: 5 }, 
          visible: { y: 0, skewY: 0, transition: { duration: 1, ease: [0.16, 1, 0.3, 1] } } 
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
      camera.position.set(0, 15, 25);
      camera.lookAt(0, 0, 0);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      const size = 100;
      const divisions = 45;
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i <= divisions; i++) {
        const v = (i / divisions) * size - size / 2;
        vertices.push(-size / 2, 0, v, size / 2, 0, v);
        vertices.push(v, 0, -size / 2, v, 0, size / 2);
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      // V17.2 BOOST: High Visibility Grid
      lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ 
        color: ORANGE, 
        transparent: true, 
        opacity: 0.65, // Increased opacity significantly
        linewidth: 2
      }));
      scene.add(lines);

      const pVertices = [];
      for (let i = 0; i < 1000; i++) pVertices.push(THREE.MathUtils.randFloatSpread(150), THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(150));
      const pGeometry = new THREE.BufferGeometry();
      pGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pVertices, 3));
      points = new THREE.Points(pGeometry, new THREE.PointsMaterial({ color: ORANGE, size: 0.09, transparent: true, opacity: 0.5 }));
      scene.add(points);

      const animate = () => {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.00035;
        const pos = lines.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const x = pos[i], z = pos[i + 2];
          pos[i + 1] = Math.sin(x * 0.08 + time) * Math.cos(z * 0.08 + time) * 6.5;
        }
        lines.geometry.attributes.position.needsUpdate = true;
        points.rotation.y += 0.0002;
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
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none filter blur-[0.3px]" />;
};

const VideoModule = ({ url, title, sub, tags, isVertical = false, onPlay }) => (
    <article onClick={() => onPlay({ url, title })} className={`relative group overflow-hidden border border-white/5 bg-zinc-950 h-full cursor-pointer transition-all duration-500 hover:border-orange-600/60 rounded-sm ${isVertical ? 'aspect-[9/16]' : 'aspect-video shadow-2xl'}`}>
        <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-25 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[4000ms] ease-out">
            <source src={url} />
        </video>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-16 h-16 rounded-full border-2 border-orange-600 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500 shadow-[0_0_30px_rgba(255,79,0,0.5)]">
                <Play size={24} className="fill-orange-600 text-orange-600 ml-1" />
            </div>
        </div>

        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between pointer-events-none z-20">
            <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => <span key={tag} className="text-[7px] font-mono px-2 py-0.5 bg-black/90 border border-white/10 text-zinc-400 uppercase font-black tracking-widest">{tag}</span>)}
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-pulse shadow-[0_0_10px_#FF4F00]" />
            </div>
            <div className="max-w-[90%]">
                <h3 className={`font-black uppercase italic tracking-tighter leading-none text-white group-hover:text-orange-500 transition-colors ${isVertical ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>{title}</h3>
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-black mt-2 group-hover:text-white transition-colors">{sub}</p>
            </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-90 group-hover:opacity-40 transition-opacity" />
    </article>
);

// --- MAIN APP ---
export default function App() {
  const [loadStatus, setLoadStatus] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('builders');
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

  // Authentication (Safe Mode)
  useEffect(() => {
    const initAuth = async () => {
      if (!auth) return; // Skip if auth failed to init
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

  // Admin Fetch (Safe Mode)
  useEffect(() => {
    if (!user || !isAdmin || !db) return;
    const leadsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'leads'));
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeads(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error("Database Link Error:", err));
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Loading Logic
  useEffect(() => {
    if (loadStatus < 100) {
      const timer = setTimeout(() => setLoadStatus(prev => prev + 3), 20);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setIsInitialized(true), 600);
    }
  }, [loadStatus]);

  const handleInquirySubmit = async () => {
    if (!user || !db) return setFormError("Offline. Email hello@aom-inhouse.com");
    setIsSubmitting(true);
    setFormError('');
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
            ...formData,
            createdAt: serverTimestamp(),
            source: 'AOM_V17.2_STABLE'
        });
        setIsSuccess(true);
    } catch (err) {
        setFormError("Transmission Error. Please retry.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-8 z-[1000]">
        <div className="w-full max-w-sm text-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white mb-2">AOM<span className="text-orange-600">.</span></h1>
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.8em] font-black italic">System_Calibration_v17.2</span>
            </motion.div>
            <div className="h-[2px] bg-white/5 w-full relative overflow-hidden mt-16 rounded-full">
                <motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-orange-600 shadow-[0_0_20px_#FF4F00]" />
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
          <div className="fixed inset-0 z-[900] bg-black/98 backdrop-blur-3xl p-6 md:p-16 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-center mb-16 border-b border-orange-600/20 pb-12">
                      <div className="flex items-center gap-8">
                          <Database size={36} className="text-orange-600" />
                          <h2 className="text-6xl font-black uppercase italic tracking-tighter text-white">Project_Log</h2>
                      </div>
                      <button onClick={() => setIsAdmin(false)} className="px-8 py-3 bg-white text-black font-black uppercase italic text-xs hover:bg-orange-600 hover:text-white transition-all">Close_Archive</button>
                  </div>
                  <div className="grid grid-cols-1 gap-6 text-left">
                      {leads.map(lead => (
                          <div key={lead.id} className="p-10 bg-zinc-900/40 border border-white/5 hover:border-orange-600/40 transition-all flex flex-col md:flex-row justify-between gap-10">
                              <div className="space-y-6">
                                  <div className="text-orange-600 font-black uppercase italic text-4xl leading-none">{lead.name || 'ANONYMOUS'}</div>
                                  <div className="flex flex-wrap gap-8 text-[12px] font-mono text-zinc-400">
                                      <div className="flex items-center gap-3"><Globe size={14}/> {lead.email}</div>
                                      <div className="flex items-center gap-3"><Activity size={14}/> {lead.phone}</div>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end gap-3 text-right">
                                  <span className="text-white font-black uppercase italic text-sm px-4 py-1.5 bg-orange-600/10 border border-orange-600/20">{lead.lens} // {lead.path}</span>
                                  <span className="text-zinc-600 text-[11px] font-mono">{lead.createdAt ? new Date(lead.createdAt.seconds * 1000).toLocaleString() : 'PENDING'}</span>
                              </div>
                          </div>
                      ))}
                      {leads.length === 0 && <div className="text-zinc-800 font-mono italic text-center py-40 text-3xl uppercase tracking-[0.5em]">Log_Clear.</div>}
                  </div>
              </div>
          </div>
      )}

      {/* --- CREATIVE BRIEF MODAL --- */}
      <AnimatePresence>
      {isInquiryOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl overflow-hidden">
          <div className="w-full max-w-2xl p-10 md:p-20 border border-white/5 bg-[#080808] relative shadow-[0_0_150px_rgba(0,0,0,1)]">
            <button onClick={() => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); }} className="absolute top-10 right-10 text-zinc-600 hover:text-white transition-all"><X size={36} /></button>
            
            {!isSuccess ? (
                <div className="space-y-12 text-left">
                    <div className="flex flex-col border-b border-white/10 pb-10 text-left">
                        <span className="text-orange-600 font-mono text-[10px] uppercase tracking-[0.8em] font-black italic">Inquiry_Pipeline</span>
                        <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mt-8 leading-none text-white">Creative Brief<span className="text-orange-600">.</span></h2>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={step} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }} className="min-h-[380px]">
                            {step === 1 && (
                                <div className="space-y-6">
                                    <p className="text-zinc-600 font-mono text-[11px] uppercase tracking-[0.5em] mb-12">Select Narrative Perspective</p>
                                    {["The Builder", "The Founder", "The Agency"].map(opt => (
                                        <button key={opt} onClick={() => { setFormData({...formData, lens: opt}); setStep(2); }} className="w-full p-10 border border-white/5 bg-white/[0.01] text-left hover:border-orange-600/50 hover:bg-orange-600/10 transition-all flex justify-between items-center group">
                                            <span className="text-3xl font-bold uppercase italic tracking-tight text-zinc-500 group-hover:text-white transition-colors">{opt}</span>
                                            <ChevronRight size={28} className="text-zinc-900 group-hover:text-orange-600 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-10">
                                    <p className="text-zinc-600 font-mono text-[11px] uppercase tracking-[0.5em] mb-4">Identity Linkage</p>
                                    <div className="space-y-4">
                                        <input type="text" placeholder="FULL NAME / BRAND" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-b border-white/10 p-8 bg-transparent text-white focus:border-orange-600 outline-none transition-all uppercase font-black text-2xl placeholder:text-zinc-900" />
                                        <input type="email" placeholder="ACTIVE EMAIL" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border-b border-white/10 p-8 bg-transparent text-white focus:border-orange-600 outline-none transition-all uppercase font-black text-2xl placeholder:text-zinc-900" />
                                        <input type="tel" placeholder="MOBILE FREQUENCY" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border-b border-white/10 p-8 bg-transparent text-white focus:border-orange-600 outline-none transition-all uppercase font-black text-2xl placeholder:text-zinc-900" />
                                    </div>
                                    {formError && <div className="text-orange-600 text-[10px] font-mono uppercase tracking-widest bg-orange-600/5 p-5 border border-orange-600/20">{formError}</div>}
                                    <button onClick={() => (formData.name && formData.email) ? setStep(3) : setFormError("DATA_REQUIREMENT_MISSING")} className="w-full bg-orange-600 text-white font-black uppercase italic py-10 hover:bg-white hover:text-black transition-all text-xs tracking-[1em] shadow-4xl">Establish_Parameters</button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6">
                                    <p className="text-zinc-600 font-mono text-[11px] uppercase tracking-[0.5em] mb-12">Target Production Path</p>
                                    {["Cinematic Campaign", "Documentary Series", "Creative Partnership"].map(opt => (
                                        <button key={opt} onClick={() => { setFormData({...formData, path: opt}); handleInquirySubmit(); }} className="w-full p-10 border border-white/5 bg-white/[0.01] text-left hover:border-orange-600/50 hover:bg-orange-600/10 transition-all flex justify-between items-center group">
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-bold uppercase italic tracking-tight text-zinc-500 group-hover:text-white transition-colors">{opt}</span>
                                                <span className="text-[10px] font-mono text-zinc-700 mt-2 uppercase tracking-[0.4em] group-hover:text-orange-500 transition-colors">Strategic_Service</span>
                                            </div>
                                            {isSubmitting ? <Loader2 size={32} className="animate-spin text-orange-600" /> : <ChevronRight size={32} className="text-zinc-900 group-hover:text-orange-600 transition-colors" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            ) : (
                <div className="text-center py-24">
                    <CheckCircle2 size={150} className="mx-auto text-orange-600 mb-16 shadow-[0_0_100px_rgba(255,79,0,0.35)]" />
                    <h2 className="text-7xl font-black uppercase italic mb-12 tracking-tighter text-white">Linked<span className="text-orange-600">.</span></h2>
                    <p className="text-zinc-500 font-mono text-[13px] uppercase tracking-[0.8em] mb-20 max-w-sm mx-auto leading-relaxed">Brief established. Strategic assessment in progress. AOM lead will intercept within 24 hours.</p>
                    <button onClick={() => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); }} className="px-24 py-10 border-2 border-orange-600 text-orange-600 font-black uppercase italic tracking-[0.5em] text-xs hover:bg-orange-600 hover:text-white transition-all">Close_Brief</button>
                </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- STUDIO PLAYER --- */}
      <AnimatePresence>
        {selectedVideo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-black/99 flex flex-col items-center justify-center p-10 md:p-24 backdrop-blur-3xl">
                <div className="absolute top-0 left-0 w-full p-12 md:p-20 flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col text-left">
                        <span className="text-orange-600 font-mono text-[11px] uppercase tracking-[0.8em] font-black italic">AOM_MASTER_FEED</span>
                        <h2 className="text-5xl md:text-8xl font-black uppercase italic tracking-tighter text-white mt-6 leading-none">{selectedVideo.title}</h2>
                    </div>
                </div>
                <video autoPlay controls className="w-full max-w-7xl aspect-video bg-zinc-950 border border-white/10 relative shadow-[0_0_250px_rgba(0,0,0,1)] object-contain">
                    <source src={selectedVideo.url} />
                </video>
                <div className="absolute bottom-0 left-0 w-full p-20 flex justify-center">
                    <button onClick={() => setSelectedVideo(null)} className="group flex flex-col items-center gap-8 transition-transform hover:scale-110">
                        <div className="w-24 h-24 rounded-full border-2 border-orange-600 flex items-center justify-center bg-black group-hover:bg-orange-600 transition-colors shadow-4xl">
                            <X size={40} className="text-white" />
                        </div>
                        <span className="text-[12px] font-mono text-zinc-600 uppercase tracking-[0.8em] font-black group-hover:text-orange-600 transition-colors">Close_Stream</span>
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- NAVIGATION --- */}
      <header className="fixed top-0 left-0 w-full z-[200] px-8 py-12 md:px-16 lg:px-24 flex justify-between items-center bg-gradient-to-b from-black via-black/80 to-transparent backdrop-blur-[15px]">
        <div className="flex flex-col cursor-pointer text-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none text-white hover:text-orange-600 transition-all">
            AOM<span className="text-orange-600">.</span>
          </h1>
          <span className="text-[11px] font-mono uppercase tracking-[0.8em] mt-4 italic font-black text-zinc-800">Creative_Engine_V17.2</span>
        </div>
        <nav className="hidden lg:flex gap-20 text-[12px] font-mono uppercase tracking-[0.8em] font-black text-zinc-600 items-center">
          <a href="#work" className="hover:text-orange-500 transition-all">Archive</a>
          <a href="#system" className="hover:text-orange-500 transition-all">The_Method</a>
          <button onClick={() => setIsInquiryOpen(true)} className="group relative px-14 py-8 bg-orange-600 text-white font-black uppercase italic tracking-[0.5em] text-[13px] overflow-hidden shadow-4xl">
            <span className="relative z-10 flex items-center gap-6 uppercase italic font-black"><Camera size={22} /> Start Project</span>
            <motion.div initial={{ x: "-100%" }} whileHover={{ x: "0%" }} className="absolute inset-0 bg-white" />
          </button>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="min-h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 relative overflow-hidden pt-[max(35vh,300px)] w-full max-w-[100vw]">
        <StrategicVortexBG />
        <div className="max-w-screen-2xl mx-auto w-full relative z-10 text-left">
          <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-10 mb-20">
              <div className="w-28 h-[2.5px] bg-orange-600 shadow-[0_0_30px_#FF4F00]" />
              <p className="text-orange-600 font-mono text-[13px] uppercase tracking-[1.2em] font-black italic">Strategic Narrative Hub</p>
            </div>
            <h2 className="text-[clamp(4.5rem,13.5vw,18rem)] font-black leading-[0.76] tracking-tighter uppercase italic italic-heavy drop-shadow-[0_0_80px_rgba(0,0,0,1)] mt-8 max-w-[100%] text-white">
              Strategy <br />
              <span className="stroke-text" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.15)' }}>Before</span> <br />
              Story<span className="text-orange-600 not-italic">.</span>
            </h2>
          </motion.div>
          
          <div className="mt-32 grid grid-cols-1 md:grid-cols-12 gap-24 items-end">
            <div className="md:col-span-7">
              <p className="text-lg md:text-3xl font-mono uppercase leading-relaxed tracking-[0.15em] italic font-black max-w-4xl text-zinc-500 text-balance text-left">
                Engineered cinematic infrastructure in <span className="text-white font-black">Phoenix, Arizona</span>. We architect the narratives that scale market leaders.
              </p>
            </div>
            <div className="md:col-span-5 flex justify-end">
               <button onClick={() => setIsInquiryOpen(true)} className="flex flex-col items-end group">
                    <div className="flex items-center gap-20 mb-10">
                        <span className="text-6xl md:text-9xl font-black italic uppercase tracking-tighter group-hover:text-orange-600 transition-all duration-700 underline decoration-orange-600/20 underline-offset-[40px] text-zinc-100">Start Project</span>
                        <div className="w-28 h-28 md:w-44 md:h-44 rounded-full border-2 border-orange-600 flex items-center justify-center bg-black group-hover:bg-orange-600 transition-all duration-700 shadow-[0_0_80px_rgba(255,79,0,0.4)]">
                            <MoveRight size={70} className="text-white group-hover:scale-125 transition-transform" />
                        </div>
                    </div>
                    <span className="text-[13px] font-mono uppercase tracking-[1.2em] mr-56 italic font-black text-zinc-800">Production Onboarding_INIT</span>
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE PORTFOLIO ARCHIVE --- */}
      <section id="work" className="px-8 md:px-16 lg:px-24 py-56 relative z-10 bg-[#020202] overflow-hidden w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full text-left">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-48 gap-24 border-b border-white/5 pb-24">
            <div className="max-w-5xl text-left">
              <RevealHeading className="mb-16 text-left">
                <h3 className="text-[15px] font-mono text-orange-600 uppercase tracking-[1.5em] font-black italic">The_Narrative_Archive // PHX_AZ</h3>
              </RevealHeading>
              <RevealHeading className="text-left">
                <h2 className="text-[9rem] md:text-[12vw] font-black uppercase italic tracking-tighter leading-[0.8] text-white">
                  The <br /><span className="stroke-text" style={{ WebkitTextStroke: '3px rgba(255,255,255,0.1)' }}>Portfolio.</span>
                </h2>
              </RevealHeading>
            </div>
            <div className="flex p-3 border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.6)] bg-zinc-950/90 backdrop-blur-4xl overflow-x-auto no-scrollbar max-w-full">
              {['builders', 'founders', 'marketing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-20 py-8 text-[13px] font-mono uppercase tracking-[0.6em] transition-all duration-700 font-black whitespace-nowrap ${activeTab === tab ? 'bg-orange-600 text-white shadow-[0_0_80px_rgba(255,79,0,0.5)]' : 'text-zinc-800 hover:text-white'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.8 }} className="space-y-64 mt-32">
              {/* CINEMATIC BLOCK */}
              <div className="space-y-24">
                <div className="flex items-center gap-12">
                   <Film size={36} className="text-orange-600" />
                   <h4 className="text-[15px] font-mono uppercase tracking-[1em] font-black italic text-zinc-600">Cinematic_Storytelling // 16:9</h4>
                   <div className="flex-grow h-[1.5px] bg-white/5" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 xl:gap-20">
                  {PORTFOLIO_DATA[activeTab].cinematic.map((vid) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>
              {/* MOBILE BLOCK */}
              <div className="space-y-24">
                <div className="flex items-center gap-12">
                   <Smartphone size={36} className="text-orange-600" />
                   <h4 className="text-[15px] font-mono uppercase tracking-[1em] font-black italic text-zinc-600">Vertical_Systems // 9:16</h4>
                   <div className="flex-grow h-[1.5px] bg-white/5" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-12">
                  {PORTFOLIO_DATA[activeTab].mobile.map((vid) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} isVertical={true} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* --- THE CRAFT / METHOD --- */}
      <section id="system" className="px-8 md:px-16 lg:px-24 py-80 border-t border-white/[0.04] relative z-10 bg-gradient-to-b from-[#020202] to-[#0d0d0d] overflow-hidden w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-48 items-stretch text-left">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <RevealHeading className="mb-20">
               <div className="flex items-center gap-16">
                  <div className="px-10 py-5 bg-orange-600 text-[15px] font-black uppercase tracking-[0.5em] italic shadow-4xl text-white">STUDIO_METHOD</div>
                  <span className="h-[3px] w-56 bg-white/10" />
               </div>
            </RevealHeading>
            <RevealHeading>
              <h2 className="text-[9rem] md:text-[11vw] font-black uppercase italic tracking-tighter leading-[0.75] mb-32 max-w-[100%] text-white">
                Systems <br />Over <br /><span className="text-orange-600">Assets.</span>
              </h2>
            </RevealHeading>
            <div className="space-y-56">
              <div className="flex gap-20 group">
                <span className="text-[10rem] font-black italic group-hover:text-orange-600 transition-all duration-1000 text-zinc-950">01</span>
                <div className="text-left">
                    <h4 className="text-5xl md:text-7xl font-bold uppercase italic mb-10 tracking-tight text-white leading-none">Narrative Architecture</h4>
                    <p className="text-xl md:text-3xl leading-relaxed max-w-2xl uppercase tracking-[0.1em] italic font-black text-zinc-500">We blueprint the business logic of your story before the first frame is captured. Strategic outcomes drive our cinematic deliverables.</p>
                </div>
              </div>
              <div className="flex gap-20 group">
                <span className="text-[10rem] font-black italic group-hover:text-orange-600 transition-all duration-1000 text-zinc-950">02</span>
                <div className="text-left">
                    <h4 className="text-5xl md:text-7xl font-bold uppercase italic mb-10 tracking-tight text-white leading-none">High-Speed Engine</h4>
                    <p className="text-xl md:text-3xl leading-relaxed max-w-2xl uppercase tracking-[0.1em] italic font-black text-zinc-500">Precision capture systems engineered for market leaders who operate at scale. Technical excellence is the baseline of the AOM studio.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 relative h-full min-h-[1000px] border border-white/5 bg-black group overflow-hidden shadow-[0_0_300px_rgba(0,0,0,1)] rounded-sm">
               <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-30 group-hover:opacity-100 transition-all duration-[10000ms] cursor-pointer" onClick={() => setSelectedVideo({ url: "https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1", title: "Phoenix Studio Environment" })}>
                  <source src="https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1" />
               </video>
               <div className="absolute inset-0 z-30 flex flex-col justify-between p-20 pointer-events-none">
                  <div className="flex items-center gap-10">
                     <div className="w-8 h-8 bg-orange-600 rounded-full animate-pulse shadow-[0_0_50px_#FF4F00]" />
                     <span className="text-[16px] font-mono text-white uppercase tracking-[1em] font-black italic">Live_Production_Feed</span>
                  </div>
                  <Sparkles size={80} className="text-orange-600/10 self-center opacity-0 group-hover:opacity-100 transition-all duration-1500 scale-50 group-hover:scale-100" />
               </div>
               <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-[6px] bg-orange-600/30 z-20 shadow-[0_0_60px_#FF4F00]" />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="px-8 md:px-16 lg:px-24 py-96 border-t border-white/[0.04] bg-[#020202] relative overflow-hidden transition-all w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
          <RevealHeading>
            <h2 className="text-[16vw] font-black uppercase italic tracking-tighter leading-none mb-48 max-w-[100%] text-white">
              Ahead <br /><span className="stroke-text" style={{ WebkitTextStroke: '5px #FF4F00' }}>Of It.</span>
            </h2>
          </RevealHeading>
          <button onClick={() => setIsInquiryOpen(true)} className="flex items-center gap-24 text-6xl md:text-[9vw] font-black uppercase italic tracking-tighter hover:text-orange-600 transition-all duration-700 group underline decoration-orange-600/10 underline-offset-[48px] text-white">
            Engage Studio <MoveRight size={150} className="group-hover:translate-x-24 transition-transform duration-700" />
          </button>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full mt-96 grid grid-cols-1 md:grid-cols-4 gap-40 text-left pt-64 border-t border-white/10 relative z-10">
           {["The_Core", "Connect", "Booking", "Signal"].map((title, i) => (
             <div key={title} className={i === 3 ? "flex flex-col items-start md:items-end text-left" : "text-left"}>
                <h6 className="text-[14px] font-mono text-orange-600 uppercase tracking-[1.5em] mb-20 font-black italic">{title}</h6>
                {i === 0 && <p className="text-4xl font-black uppercase italic tracking-tighter text-white">Phoenix, AZ</p>}
                {i === 1 && <p className="text-4xl font-black uppercase italic tracking-tighter text-white underline underline-offset-[12px] decoration-white/10 hover:text-orange-600 transition-all">hello@aom-inhouse.com</p>}
                {i === 2 && <p className="text-4xl font-black uppercase italic tracking-tighter text-white">Q2-Q3 2026</p>}
                {i === 3 && (
                    <div className="flex gap-16">
                        {['INSTA', 'VIMEO', 'LINKEDIN'].map(s => <div key={s} className="transition-all duration-700 cursor-pointer font-black text-[14px] font-mono tracking-[0.8em] text-zinc-900 hover:text-orange-600">{s}</div>)}
                    </div>
                )}
             </div>
           ))}
        </div>
      </footer>

      {/* --- HUD --- */}
      <div className="fixed bottom-0 left-0 w-full h-20 border-t border-white/10 z-[300] flex items-center overflow-hidden shadow-[0_-20px_100px_rgba(0,0,0,1)] bg-black max-w-[100vw]">
        <div className="bg-orange-600 h-full px-16 flex items-center flex-shrink-0 relative overflow-hidden">
          <span className="text-[14px] font-black uppercase tracking-[0.5em] text-white relative z-10 italic">AOM_SYSTEM_ENGAGED</span>
          <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-white/20 skew-x-12" />
        </div>
        <div className="flex-grow flex overflow-hidden whitespace-nowrap bg-black">
          <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }} className="flex text-[14px] font-mono uppercase tracking-[1.2em] py-6 font-black italic text-zinc-900">
            <span className="mx-40 font-black">PHOENIX VIDEO PRODUCTION // STRATEGY BEFORE STORY // CONTENT SYSTEMS FOR FOUNDERS // </span>
            <span className="mx-40 text-orange-600 italic">CREATIVE ARCHITECTURE // NARRATIVE INFRASTRUCTURE // AHEAD OF THE MARKET // </span>
          </motion.div>
        </div>
        <div className="h-full px-16 hidden md:flex items-center flex-shrink-0 border-l border-white/5 bg-zinc-950 gap-16">
            <div className="flex items-center gap-5">
                <Globe size={20} className="text-orange-600" />
                <span className="text-[14px] font-mono font-black italic uppercase tracking-[0.5em] text-zinc-700">Studio_Operational</span>
            </div>
            <div className="flex items-center gap-5">
                <Clock size={20} className="text-orange-600" />
                <span className="text-[14px] font-mono font-black italic uppercase tracking-[0.5em] text-zinc-700">14:34_PHX</span>
            </div>
        </div>
      </div>
    </main>
  );
}
