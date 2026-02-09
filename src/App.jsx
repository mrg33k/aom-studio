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

// --- FIREBASE INFRASTRUCTURE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'aom-studio';

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
      lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.28 }));
      scene.add(lines);
      const pVertices = [];
      for (let i = 0; i < 900; i++) pVertices.push(THREE.MathUtils.randFloatSpread(150), THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(150));
      const pGeometry = new THREE.BufferGeometry();
      pGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pVertices, 3));
      points = new THREE.Points(pGeometry, new THREE.PointsMaterial({ color: ORANGE, size: 0.05, transparent: true, opacity: 0.3 }));
      scene.add(points);
      const animate = () => {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.00028;
        const pos = lines.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const x = pos[i], z = pos[i + 2];
          pos[i + 1] = Math.sin(x * 0.08 + time) * Math.cos(z * 0.08 + time) * 6;
        }
        lines.geometry.attributes.position.needsUpdate = true;
        points.rotation.y += 0.00018;
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
  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

const VideoModule = ({ url, title, sub, tags, isVertical = false, onPlay }) => (
    <article onClick={() => onPlay({ url, title })} className={`relative group overflow-hidden border border-white/5 bg-zinc-950 h-full cursor-pointer transition-all duration-500 hover:border-orange-600/40 rounded-sm ${isVertical ? 'aspect-[9/16]' : 'aspect-video shadow-2xl'}`}>
        <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-25 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[4000ms] ease-out">
            <source src={url} />
        </video>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-16 h-16 rounded-full border-2 border-orange-600 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-500 shadow-[0_0_30px_rgba(255,79,0,0.3)]">
                <Play size={24} className="fill-orange-600 text-orange-600 ml-1" />
            </div>
        </div>

        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between pointer-events-none z-20">
            <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => <span key={tag} className="text-[7px] font-mono px-2 py-0.5 bg-black/90 border border-white/10 text-zinc-400 uppercase font-black tracking-widest">{tag}</span>)}
                </div>
                <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
            </div>
            <div className="max-w-[85%]">
                <h3 className={`font-black uppercase italic tracking-tighter leading-none text-white group-hover:text-orange-500 transition-colors ${isVertical ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'}`}>{title}</h3>
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.2em] font-black mt-2 group-hover:text-zinc-200 transition-colors">{sub}</p>
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
  
  // Form State
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', lens: '', path: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        setUser(u);
        const params = new URLSearchParams(window.location.search);
        if (params.get('view') === 'leads') setIsAdmin(true);
    });
    return () => unsubscribe();
  }, []);

  // Admin Fetch
  useEffect(() => {
    if (!user || !isAdmin) return;
    const leadsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'leads'));
    const unsubscribe = onSnapshot(leadsQuery, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeads(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    }, (err) => console.error("Snapshot error:", err));
    return () => unsubscribe();
  }, [user, isAdmin]);

  // Loading Logic
  useEffect(() => {
    if (loadStatus < 100) {
      const timer = setTimeout(() => setLoadStatus(prev => prev + 2.5), 20);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setIsInitialized(true), 600);
    }
  }, [loadStatus]);

  const handleInquirySubmit = async () => {
    if (!user) return setFormError("Auth Connection Lost. Retrying...");
    setIsSubmitting(true);
    setFormError('');
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), {
            ...formData,
            createdAt: serverTimestamp(),
            source: 'AOM_V17_FLUID'
        });
        setIsSuccess(true);
    } catch (err) {
        setFormError("Submission failed. Ensure fields are valid.");
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
                <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.8em] font-black">Refining_Narrative_Architecture</span>
            </motion.div>
            <div className="h-[2px] bg-white/5 w-full relative overflow-hidden mt-16 rounded-full">
                <motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-orange-600 shadow-[0_0_20px_#FF4F00]" />
            </div>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-[#020202] text-zinc-100 selection:bg-orange-600 selection:text-white font-sans overflow-x-hidden antialiased max-w-[100vw]">
      <TextureOverlay />
      
      {/* --- ADMIN DASHBOARD --- */}
      {isAdmin && (
          <div className="fixed inset-0 z-[900] bg-black/98 backdrop-blur-3xl p-6 md:p-12 overflow-y-auto">
              <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-center mb-16 border-b border-white/10 pb-10">
                      <div className="flex items-center gap-6">
                          <Database size={32} className="text-orange-600" />
                          <h2 className="text-5xl font-black uppercase italic tracking-tighter text-white">Lead Archive</h2>
                      </div>
                      <button onClick={() => setIsAdmin(false)} className="px-6 py-2 border border-white/10 text-white hover:bg-white hover:text-black uppercase font-mono text-[10px] font-black transition-all">Close_Archive</button>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                      {leads.map(lead => (
                          <div key={lead.id} className="p-8 bg-zinc-900/50 border border-white/5 hover:border-orange-600/30 transition-all flex flex-col md:flex-row justify-between gap-8">
                              <div className="space-y-4 text-left">
                                  <div className="text-orange-600 font-black uppercase italic text-3xl">{lead.name || 'ANONYMOUS'}</div>
                                  <div className="flex flex-wrap gap-6 text-[11px] font-mono text-zinc-400">
                                      <div className="flex items-center gap-2"><Globe size={12}/> {lead.email}</div>
                                      <div className="flex items-center gap-2"><Activity size={12}/> {lead.phone}</div>
                                  </div>
                              </div>
                              <div className="flex flex-col items-end gap-2 text-right">
                                  <span className="text-white font-black uppercase italic text-xs px-3 py-1 bg-white/5">{lead.lens} // {lead.path}</span>
                                  <span className="text-zinc-600 text-[10px] font-mono">{lead.createdAt ? new Date(lead.createdAt.seconds * 1000).toLocaleString() : 'PENDING'}</span>
                              </div>
                          </div>
                      ))}
                      {leads.length === 0 && <div className="text-zinc-800 font-mono italic text-center py-32 text-2xl uppercase tracking-widest">No Transmissions Logged.</div>}
                  </div>
              </div>
          </div>
      )}

      {/* --- THE CREATIVE BRIEF --- */}
      <AnimatePresence>
      {isInquiryOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl overflow-hidden">
          <div className="w-full max-w-2xl p-8 md:p-16 border border-white/5 bg-[#080808] relative shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <button onClick={() => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); }} className="absolute top-8 right-8 text-zinc-500 hover:text-white transition-colors"><X size={32} /></button>
            
            {!isSuccess ? (
                <div className="space-y-12 text-left">
                    <div className="flex flex-col border-b border-white/10 pb-10 text-left">
                        <span className="text-orange-600 font-mono text-[10px] uppercase tracking-[0.8em] font-black italic">Inquiry_Pipeline</span>
                        <h2 className="text-5xl md:text-6xl font-black uppercase italic tracking-tighter mt-6 leading-none text-white">Creative Brief<span className="text-orange-600">.</span></h2>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} className="min-h-[350px]">
                            {step === 1 && (
                                <div className="space-y-4">
                                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-10">Choose Your Objective</p>
                                    {["The Builder", "The Founder", "The Agency"].map(opt => (
                                        <button key={opt} onClick={() => { setFormData({...formData, lens: opt}); setStep(2); }} className="w-full p-8 border border-white/5 bg-white/[0.01] text-left hover:border-orange-600/60 hover:bg-orange-600/5 transition-all flex justify-between items-center group">
                                            <span className="text-2xl font-bold uppercase italic tracking-tight text-zinc-400 group-hover:text-white">{opt}</span>
                                            <ChevronRight size={24} className="text-zinc-900 group-hover:text-orange-600 transition-colors" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 text-left">
                                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-4">Contact Logic</p>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <input type="text" placeholder="FULL NAME / ORGANIZATION" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border border-white/10 p-6 bg-black text-white focus:border-orange-600 outline-none transition-all uppercase font-bold text-lg placeholder:text-zinc-900" />
                                        </div>
                                        <input type="email" placeholder="ACTIVE EMAIL" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full border border-white/10 p-6 bg-black text-white focus:border-orange-600 outline-none transition-all uppercase font-bold text-lg placeholder:text-zinc-900" />
                                        <input type="tel" placeholder="MOBILE FREQUENCY" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full border border-white/10 p-6 bg-black text-white focus:border-orange-600 outline-none transition-all uppercase font-bold text-lg placeholder:text-zinc-900" />
                                    </div>
                                    {formError && <div className="text-orange-600 text-[10px] font-mono uppercase tracking-widest bg-orange-600/5 p-4 border border-orange-600/20">{formError}</div>}
                                    <button onClick={() => (formData.name && formData.email) ? setStep(3) : setFormError("Missing Required Identity Data")} className="w-full bg-orange-600 text-white font-black uppercase italic py-8 hover:bg-white hover:text-black transition-all text-sm tracking-[0.4em]">Establish_Parameters</button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-4">
                                    <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-10">Select Scope Path</p>
                                    {["Cinematic Campaign", "Documentary Series", "Production Retainer"].map(opt => (
                                        <button key={opt} onClick={() => { setFormData({...formData, path: opt}); handleInquirySubmit(); }} className="w-full p-8 border border-white/5 bg-white/[0.01] text-left hover:border-orange-600/60 hover:bg-orange-600/5 transition-all flex justify-between items-center group">
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-bold uppercase italic tracking-tight text-zinc-400 group-hover:text-white">{opt}</span>
                                                <span className="text-[10px] font-mono text-zinc-700 mt-2 uppercase tracking-widest group-hover:text-orange-600">Scale_System</span>
                                            </div>
                                            {isSubmitting ? <Loader2 size={24} className="animate-spin text-orange-600" /> : <ChevronRight size={24} className="text-zinc-900 group-hover:text-orange-600" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            ) : (
                <div className="text-center py-20">
                    <CheckCircle2 size={120} className="mx-auto text-orange-600 mb-12 shadow-[0_0_80px_rgba(255,79,0,0.3)]" />
                    <h2 className="text-6xl font-black uppercase italic mb-8 tracking-tighter text-white">Verified<span className="text-orange-600">.</span></h2>
                    <p className="text-zinc-500 font-mono text-[12px] uppercase tracking-[0.6em] mb-16 max-w-sm mx-auto leading-relaxed">Brief Engaged. Strategic assessment in progress. Transmission within 24 hours.</p>
                    <button onClick={() => { setIsInquiryOpen(false); setIsSuccess(false); setStep(1); }} className="px-20 py-8 border border-orange-600 text-orange-600 font-black uppercase italic tracking-[0.3em] text-xs hover:bg-orange-600 hover:text-white transition-all">Close_Brief</button>
                </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* --- STUDIO PLAYER --- */}
      <AnimatePresence>
        {selectedVideo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-black/99 flex flex-col items-center justify-center p-6 md:p-16 backdrop-blur-3xl">
                <div className="absolute top-0 left-0 w-full p-10 md:p-16 flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col text-left">
                        <span className="text-orange-600 font-mono text-[10px] uppercase tracking-[0.6em] font-black italic">AOM_MASTER_FEED</span>
                        <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-white mt-4 leading-none">{selectedVideo.title}</h2>
                    </div>
                    <div className="hidden lg:flex flex-col items-end opacity-40 text-zinc-500 font-mono text-[10px] uppercase tracking-widest text-right">
                        <span>4K_CINEMA_LOG</span>
                        <span>BITRATE: 400MBPS</span>
                    </div>
                </div>
                <video autoPlay controls className="w-full max-w-7xl aspect-video bg-zinc-950 border border-white/10 relative shadow-[0_0_200px_rgba(0,0,0,1)] object-contain">
                    <source src={selectedVideo.url} />
                </video>
                <div className="absolute bottom-0 left-0 w-full p-16 flex justify-center">
                    <button onClick={() => setSelectedVideo(null)} className="group flex flex-col items-center gap-6">
                        <div className="w-20 h-20 rounded-full border-2 border-orange-600 flex items-center justify-center bg-black group-hover:bg-orange-600 transition-colors">
                            <X size={32} className="text-white" />
                        </div>
                        <span className="text-[11px] font-mono text-zinc-600 uppercase tracking-[0.6em] font-black group-hover:text-orange-600 transition-colors">Terminate_Stream</span>
                    </button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 w-full z-[200] px-6 py-10 md:px-12 lg:px-24 flex justify-between items-center bg-gradient-to-b from-black to-transparent backdrop-blur-[10px]">
        <div className="flex flex-col cursor-pointer text-left" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white hover:text-orange-600 transition-all">
            AOM<span className="text-orange-600">.</span>
          </h1>
          <span className="text-[10px] font-mono uppercase tracking-[0.7em] mt-3 italic font-black text-zinc-800">Creative_Engine_V17</span>
        </div>
        <nav className="hidden lg:flex gap-16 text-[11px] font-mono uppercase tracking-[0.6em] font-black text-zinc-600 items-center">
          <a href="#work" className="hover:text-orange-500 transition-all">Portfolio</a>
          <a href="#system" className="hover:text-orange-500 transition-all">The_Craft</a>
          <button onClick={() => setIsInquiryOpen(true)} className="group relative px-12 py-6 bg-orange-600 text-white font-black uppercase italic tracking-[0.4em] text-[12px] overflow-hidden">
            <span className="relative z-10 flex items-center gap-4 uppercase italic font-black"><Camera size={18} /> Start Project</span>
            <motion.div initial={{ x: "-100%" }} whileHover={{ x: "0%" }} className="absolute inset-0 bg-white" />
          </button>
        </nav>
      </header>

      {/* --- HERO --- */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24 relative overflow-hidden pt-[max(30vh,250px)] w-full max-w-[100vw]">
        <StrategicVortexBG />
        <div className="max-w-screen-2xl mx-auto w-full relative z-10 text-left">
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-8 mb-16">
              <div className="w-24 h-[2px] bg-orange-600 shadow-[0_0_20px_#FF4F00]" />
              <p className="text-orange-600 font-mono text-[12px] uppercase tracking-[1em] font-black italic">Strategic Narrative Production Studio</p>
            </div>
            <h2 className="text-[clamp(4rem,12vw,15rem)] font-black leading-[0.78] tracking-tighter uppercase italic italic-heavy drop-shadow-2xl mt-6 max-w-[100%] text-white">
              Strategy <br />
              <span className="stroke-text">Before</span> <br />
              Story<span className="text-orange-600 not-italic">.</span>
            </h2>
          </motion.div>
          
          <div className="mt-24 grid grid-cols-1 md:grid-cols-12 gap-20 items-end">
            <div className="md:col-span-7">
              <p className="text-base md:text-2xl font-mono uppercase leading-relaxed tracking-[0.1em] italic font-black max-w-3xl text-zinc-500 text-balance text-left">
                Building cinematic infrastructure in <span className="text-white font-black">Phoenix, Arizona</span>. We architect the stories that define high-stakes founders and developers.
              </p>
            </div>
            <div className="md:col-span-5 flex justify-end">
               <button onClick={() => setIsInquiryOpen(true)} className="flex flex-col items-end group">
                    <div className="flex items-center gap-16 mb-8">
                        <span className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter group-hover:text-orange-600 transition-all duration-500 underline decoration-orange-600/20 underline-offset-[32px] text-zinc-100">Start Project</span>
                        <div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-2 border-orange-600 flex items-center justify-center bg-black group-hover:bg-orange-600 transition-all duration-500 shadow-[0_0_60px_rgba(255,79,0,0.35)]">
                            <MoveRight size={56} className="text-white group-hover:scale-125 transition-transform" />
                        </div>
                    </div>
                    <span className="text-[12px] font-mono uppercase tracking-[1em] mr-44 italic font-black text-zinc-800">Creative Onboarding Engaged</span>
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE PORTFOLIO --- */}
      <section id="work" className="px-6 md:px-12 lg:px-24 py-48 relative z-10 bg-[#020202] overflow-hidden w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full text-left">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-40 gap-20 border-b border-white/5 pb-20">
            <div className="max-w-4xl text-left">
              <RevealHeading className="mb-12">
                <h3 className="text-[13px] font-mono text-orange-600 uppercase tracking-[1.2em] font-black italic">The_Narrative_Archive // PHX_AZ</h3>
              </RevealHeading>
              <RevealHeading>
                <h2 className="text-[8rem] md:text-[10vw] font-black uppercase italic tracking-tighter leading-[0.8] text-white">
                  The <br /><span className="stroke-text">Portfolio.</span>
                </h2>
              </RevealHeading>
            </div>
            <div className="flex p-2 border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.5)] bg-zinc-950/80 backdrop-blur-3xl overflow-x-auto no-scrollbar max-w-full">
              {['builders', 'founders', 'marketing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-14 py-6 text-[12px] font-mono uppercase tracking-[0.5em] transition-all duration-500 font-black whitespace-nowrap ${activeTab === tab ? 'bg-orange-600 text-white shadow-[0_0_60px_rgba(255,79,0,0.4)]' : 'text-zinc-800 hover:text-white'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-48 mt-24">
              <div className="space-y-20">
                <div className="flex items-center gap-10">
                   <Film size={28} className="text-orange-600" />
                   <h4 className="text-[13px] font-mono uppercase tracking-[0.7em] font-black italic text-zinc-500">Cinematic_Storytelling // 16:9</h4>
                   <div className="flex-grow h-[1px] bg-white/5" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 xl:gap-14">
                  {PORTFOLIO_DATA[activeTab].cinematic.map((vid) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>
              <div className="space-y-20">
                <div className="flex items-center gap-10">
                   <Smartphone size={28} className="text-orange-600" />
                   <h4 className="text-[13px] font-mono uppercase tracking-[0.7em] font-black italic text-zinc-500">Social_Systems // 9:16_Vertical</h4>
                   <div className="flex-grow h-[1px] bg-white/5" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-10">
                  {PORTFOLIO_DATA[activeTab].mobile.map((vid) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} isVertical={true} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* --- THE CRAFT --- */}
      <section id="system" className="px-6 md:px-12 lg:px-24 py-64 border-t border-white/[0.04] relative z-10 bg-gradient-to-b from-[#020202] to-[#0a0a0a] overflow-hidden w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-32 items-stretch text-left">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <RevealHeading className="mb-14">
               <div className="flex items-center gap-12">
                  <div className="px-8 py-4 bg-orange-600 text-[13px] font-black uppercase tracking-[0.4em] italic shadow-4xl text-white">STUDIO_METHOD</div>
                  <span className="h-[2px] w-48 bg-white/10" />
               </div>
            </RevealHeading>
            <RevealHeading>
              <h2 className="text-[8rem] md:text-[9.5vw] font-black uppercase italic tracking-tighter leading-[0.75] mb-24 max-w-[95%] text-white">
                Systems <br />Over <br /><span className="text-orange-600">Assets.</span>
              </h2>
            </RevealHeading>
            <div className="space-y-40">
              <div className="flex gap-14 group">
                <span className="text-8xl font-black italic group-hover:text-orange-600 transition-all duration-700 text-zinc-900/50">01</span>
                <div className="text-left">
                    <h4 className="text-4xl md:text-5xl font-bold uppercase italic mb-8 tracking-tight text-white">Narrative Architecture</h4>
                    <p className="text-lg md:text-2xl leading-relaxed max-w-xl uppercase tracking-widest italic font-black text-zinc-500">We blueprint the business logic of your story before the first frame is captured. Strategic outcomes drive our deliverables.</p>
                </div>
              </div>
              <div className="flex gap-14 group">
                <span className="text-8xl font-black italic group-hover:text-orange-600 transition-all duration-700 text-zinc-900/50">02</span>
                <div className="text-left">
                    <h4 className="text-4xl md:text-5xl font-bold uppercase italic mb-8 tracking-tight text-white">The Production Engine</h4>
                    <p className="text-lg md:text-2xl leading-relaxed max-w-xl uppercase tracking-widest italic font-black text-zinc-500">High-speed, high-fidelity capture systems designed for those who scale. Precision is the baseline of the studio.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-6 relative h-full min-h-[900px] border border-white/5 bg-black group overflow-hidden shadow-[0_0_200px_rgba(0,0,0,1)] rounded-sm">
               <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-40 group-hover:opacity-100 transition-all duration-[8000ms] cursor-pointer" onClick={() => setSelectedVideo({ url: "https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1", title: "Phoenix Studio Environment" })}>
                  <source src="https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1" />
               </video>
               <div className="absolute inset-0 z-30 flex flex-col justify-between p-16 pointer-events-none">
                  <div className="flex items-center gap-6">
                     <div className="w-5 h-5 bg-orange-600 rounded-full animate-pulse shadow-[0_0_30px_#FF4F00]" />
                     <span className="text-[13px] font-mono text-white uppercase tracking-[0.8em] font-black italic">Live_Production_Feed</span>
                  </div>
                  <Sparkles size={50} className="text-orange-600/20 self-center opacity-0 group-hover:opacity-100 transition-all duration-1000 scale-50 group-hover:scale-100" />
               </div>
               <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 18, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-[4px] bg-orange-600/40 z-20 shadow-[0_0_40px_#FF4F00]" />
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="px-6 md:px-12 lg:px-24 py-80 border-t border-white/[0.04] bg-[#020202] relative overflow-hidden transition-all w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
          <RevealHeading>
            <h2 className="text-[14vw] font-black uppercase italic tracking-tighter leading-none mb-40 max-w-[95%] text-white">
              Ahead <br /><span className="stroke-text" style={{ WebkitTextStroke: '4px #FF4F00' }}>Of It.</span>
            </h2>
          </RevealHeading>
          <button onClick={() => setIsInquiryOpen(true)} className="flex items-center gap-20 text-5xl md:text-[8vw] font-black uppercase italic tracking-tighter hover:text-orange-600 transition-all duration-500 group underline decoration-orange-600/20 underline-offset-[36px] text-white">
            Connect Studio <MoveRight size={120} className="group-hover:translate-x-16 transition-transform duration-500" />
          </button>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full mt-80 grid grid-cols-1 md:grid-cols-4 gap-32 text-left pt-48 border-t border-white/10 relative z-10">
           {["The_Base", "Inquiry", "Schedule", "Connection"].map((title, i) => (
             <div key={title} className={i === 3 ? "flex flex-col items-start md:items-end text-left" : "text-left"}>
                <h6 className="text-[12px] font-mono text-orange-600 uppercase tracking-[1.2em] mb-14 font-black italic">{title}</h6>
                {i === 0 && <p className="text-3xl font-black uppercase italic tracking-tighter text-white">Phoenix, AZ</p>}
                {i === 1 && <p className="text-3xl font-black uppercase italic tracking-tighter text-white underline underline-offset-8 decoration-white/10 hover:text-orange-600 transition-all">hello@aom-inhouse.com</p>}
                {i === 2 && <p className="text-3xl font-black uppercase italic tracking-tighter text-white">Booking Q2 2026</p>}
                {i === 3 && (
                    <div className="flex gap-12">
                        {['INSTA', 'VIMEO', 'LINKEDIN'].map(s => <div key={s} className="transition-all duration-500 cursor-pointer font-black text-[12px] font-mono tracking-[0.6em] text-zinc-900 hover:text-orange-600">{s}</div>)}
                    </div>
                )}
             </div>
           ))}
        </div>
      </footer>

      {/* --- HUD LOGIC --- */}
      <div className="fixed bottom-0 left-0 w-full h-16 border-t border-white/10 z-[300] flex items-center overflow-hidden shadow-4xl bg-black max-w-[100vw]">
        <div className="bg-orange-600 h-full px-12 flex items-center flex-shrink-0 relative overflow-hidden">
          <span className="text-[12px] font-black uppercase tracking-[0.4em] text-white relative z-10 italic">AOM_SYSTEM_ENGAGED</span>
        </div>
        <div className="flex-grow flex overflow-hidden whitespace-nowrap bg-black">
          <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 90, repeat: Infinity, ease: "linear" }} className="flex text-[12px] font-mono uppercase tracking-[1em] py-5 font-black italic text-zinc-900">
            <span className="mx-32 font-black">PHOENIX VIDEO PRODUCTION // STRATEGY BEFORE STORY // CONTENT SYSTEMS FOR FOUNDERS // </span>
            <span className="mx-32 text-orange-600 italic">CREATIVE ARCHITECTURE // NARRATIVE INFRASTRUCTURE // AHEAD OF THE MARKET // </span>
          </motion.div>
        </div>
        <div className="h-full px-12 hidden md:flex items-center flex-shrink-0 border-l border-white/5 bg-zinc-950 gap-12">
            <div className="flex items-center gap-4">
                <Globe size={16} className="text-orange-600" />
                <span className="text-[12px] font-mono font-black italic uppercase tracking-[0.4em] text-zinc-700">Studio_Operational</span>
            </div>
            <div className="flex items-center gap-4">
                <Clock size={16} className="text-orange-600" />
                <span className="text-[12px] font-mono font-black italic uppercase tracking-[0.4em] text-zinc-700">14:34_PHX</span>
            </div>
        </div>
      </div>
    </main>
  );
}
