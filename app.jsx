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

// --- MASTER PORTFOLIO LIBRARY ---
// V18 Update: Replaced "Cinematic" tags with "Brand" and "Asset" language
const PORTFOLIO_DATA = {
  builders: {
    campaigns: [
      { title: "Refined Gardens", sub: "Brand Authority Asset", url: "https://dl.dropboxusercontent.com/scl/fi/i642p6xrm6zpxastfwa2p/REFINED-GARDENS-DIEON.mp4?rlkey=utze6r9xvj4l634sy7klusa5g&raw=1", tags: ["Brand", "High-Value"] },
      { title: "The Rebuild: Thelma", sub: "Project Documentation", url: "https://dl.dropboxusercontent.com/scl/fi/pmgtkouq5jkb7chs9xphz/EPISODE-1-THELMA-FF.mov?rlkey=4l5u8xxkw8cxybpnmydhllbmn&raw=1", tags: ["Doc", "Trust"] },
      { title: "Malapai Construction", sub: "Process Overview", url: "https://dl.dropboxusercontent.com/scl/fi/nsg96q5xd1v7jh4gha51h/Malapai-1.mov?rlkey=5abjqtb3zrjcytifndkfgpdcs&raw=1", tags: ["Operations", "Scale"] },
      { title: "The Noble Agency", sub: "Market Sizzle", url: "https://dl.dropboxusercontent.com/scl/fi/36hxds9dpn1xtcndlcfi9/Noble-Edit-Sizzle.mov?rlkey=3u41bycqn3jqivadsewqkl7m2&raw=1", tags: ["Real Estate"] },
      { title: "Du Coeur", sub: "Property Walkthrough", url: "https://dl.dropboxusercontent.com/scl/fi/zqbatp2vzu13xboe4mn9j/Sam-DuCoeur-Walkthrough.m4v?rlkey=t5emcnmd9er5yqp8cqjcya1e4&raw=1", tags: ["Luxury"] },
      { title: "AZ Cleantech", sub: "Sector Profile", url: "https://dl.dropboxusercontent.com/scl/fi/46ov8xdfv1qy7e3vr7d9b/AZCLEANTECH-FINAL.mov?rlkey=khseypkzvpcvzhlthn3mgjn3z&raw=1", tags: ["Industrial"] }
    ],
    social: [
      { title: "Malapai Narrative", sub: "Vertical Intro", url: "https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1", tags: ["9:16"] },
      { title: "Refined Gardens", sub: "Social Cut", url: "https://dl.dropboxusercontent.com/scl/fi/3val6y22ma1ju8f5cqqqe/REFINED-GARDENS-MOBILE.mp4?rlkey=infjowq6zp8cqirrdesg1e0wn&raw=1", tags: ["9:16"] },
      { title: "Malapai Lafayette", sub: "Site Update", url: "https://dl.dropboxusercontent.com/scl/fi/ey6te42ahdx4t9udzieao/Malapai-Lafayette-update.mov?rlkey=xsbhgqi3j1voxpwx86090b6q8&raw=1", tags: ["Update"] },
      { title: "Arrowhead Grenadier", sub: "Product Feature", url: "https://dl.dropboxusercontent.com/scl/fi/8a0mig4l8bd8yf3khtigq/ARROWHEAD-UPDATE-MOBILE.mp4?rlkey=hylucrr5d7x3q62ul03g63byz&raw=1", tags: ["INEOS"] }
    ]
  },
  founders: {
    campaigns: [
      { title: "Reelay Product", sub: "Software Demo", url: "https://dl.dropboxusercontent.com/scl/fi/8wfqw1mw9scrahx04x8ks/Reelay-EXPLAINER-1920x1080.mp4?rlkey=hf1ycl8zftd08x32m3asm820g&raw=1", tags: ["SaaS", "Conversion"] },
      { title: "NGOTS", sub: "Company Profile", url: "https://dl.dropboxusercontent.com/scl/fi/jk5wjgqeylw3khbz2ac7y/NGOTS.mp4?rlkey=xky4j0lmms9y8r1qr7w3cl4k8&raw=1", tags: ["Strategy"] },
      { title: "Intelliplay Vision", sub: "Tech Capability", url: "https://dl.dropboxusercontent.com/scl/fi/m92mdkme20vwzb3791cnx/Intelliplay-FF.mov?rlkey=aasi46x1u610tqfpx75dw6qgd&raw=1", tags: ["UX", "Vision"] },
      { title: "Founders Retreat", sub: "Event Coverage", url: "https://dl.dropboxusercontent.com/scl/fi/2btjzczt66p8aj3iprvy/Retreat-2022.m4v?rlkey=fpjcvxrkj4qtsf2p4fx701v0l&raw=1", tags: ["Culture"] },
      { title: "RW Investments", sub: "Trust Asset", url: "https://dl.dropboxusercontent.com/scl/fi/rl5tnpm2lmet6mcful57b/RW-Investments-1-Minute.mp4?rlkey=3be7n7j2k0se7ye81a2de2k0s&raw=1", tags: ["Finance"] }
    ],
    social: [
      { title: "Abstrakt SDR", sub: "Vertical Explainer", url: "https://dl.dropboxusercontent.com/scl/fi/311qjnptwbffo0jrlk26c/What-is-Abstrakt-VERT-9x16.mp4?rlkey=8e4eisivpr7ol6rh3leajkfw8&raw=1", tags: ["9:16"] },
      { title: "Intelliplay IAAPA", sub: "Event Recap", url: "https://dl.dropboxusercontent.com/scl/fi/juc0yicl7bdoj16k51aci/IAAPA-DAY-2.mov?rlkey=nwbelita2wdmw1mhlvc340f6o&raw=1", tags: ["Social"] }
    ]
  },
  marketing: {
    campaigns: [
      { title: "Letter To The World", sub: "Brand Anthem", url: "https://dl.dropboxusercontent.com/scl/fi/t1jzugta90mp2up4na6zb/Letter-To-The-World-Trailer-FF.mov?rlkey=bz84d3eocnkpd34tnt8fmaxof&raw=1", tags: ["Impact"] },
      { title: "Cook & Craft", sub: "Restaurant Identity", url: "https://dl.dropboxusercontent.com/scl/fi/9tb5f2m9fahqh1uqh1m5q/Website-Background-C-C.mov?rlkey=dippv72znkzrjdpziae6mzz7p&raw=1", tags: ["Food"] },
      { title: "N2 Media", sub: "Agency Reel", url: "https://dl.dropboxusercontent.com/scl/fi/67tbiugc7b9ofwkpxqc3g/n2-Reel.m4v?rlkey=awjlbtw5l833m5co5ci7lbd0o&raw=1", tags: ["B2B"] },
      { title: "Ulisgold Pilates", sub: "Studio Brand", url: "https://dl.dropboxusercontent.com/scl/fi/nd4hjftihygeux09zcr1x/ULISGOLD-GRADED-V2.mov?rlkey=cco8bu4qtmehs098mmcebrkxg&raw=1", tags: ["Wellness"] }
    ],
    social: [
      { title: "NOOK Kitchen", sub: "10 Year Promo", url: "https://dl.dropboxusercontent.com/scl/fi/gjua2slterlpr4r7hhfjo/Happy-10-Year-Reel-1.mov?rlkey=3ml7y0gg6t89df051y3bxtfui&raw=1", tags: ["Social"] },
      { title: "Combat Veterans", sub: "Event Promo", url: "https://dl.dropboxusercontent.com/scl/fi/cqosg1t3bck3d4hwuc5ks/Veterans-Day-Event-Promo.mp4?rlkey=271kjtoooigctix6ir10w8zbs&raw=1", tags: ["Non-Profit"] },
      { title: "Cook & Craft Influencer", sub: "Social Recap", url: "https://dl.dropboxusercontent.com/scl/fi/69m6kg7pmrk7fjo3bd4yi/CC-Influencer-Day.mov?rlkey=jnf2lhdi97dl6fy9c2xdahbxe&raw=1", tags: ["9:16"] },
      { title: "Adobe AI Review", sub: "Tech Review", url: "https://dl.dropboxusercontent.com/scl/fi/nmcas20p1fg53tuoejyeb/Adobe-2.mov?rlkey=x1176327cigm96iq1v7pdwgw2&raw=1", tags: ["Content"] }
    ]
  }
};

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
      camera.position.set(0, 10, 20); // Moved camera closer for less massive feel
      camera.lookAt(0, 0, 0);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      const size = 80; // Reduced size
      const divisions = 40;
      const geometry = new THREE.BufferGeometry();
      const vertices = [];
      for (let i = 0; i <= divisions; i++) {
        const v = (i / divisions) * size - size / 2;
        vertices.push(-size / 2, 0, v, size / 2, 0, v);
        vertices.push(v, 0, -size / 2, v, 0, size / 2);
      }
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ 
        color: ORANGE, 
        transparent: true, 
        opacity: 0.35, 
        linewidth: 1
      }));
      scene.add(lines);

      const pVertices = [];
      for (let i = 0; i < 600; i++) pVertices.push(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(100));
      const pGeometry = new THREE.BufferGeometry();
      pGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pVertices, 3));
      points = new THREE.Points(pGeometry, new THREE.PointsMaterial({ color: ORANGE, size: 0.06, transparent: true, opacity: 0.4 }));
      scene.add(points);

      const animate = () => {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.0002;
        const pos = lines.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const x = pos[i], z = pos[i + 2];
          pos[i + 1] = Math.sin(x * 0.05 + time) * Math.cos(z * 0.05 + time) * 3; // Reduced wave height
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
      if (mount && renderer.domElement) mount.removeChild(renderer.domElement);
    };
  }, []);
  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

const VideoModule = ({ url, title, sub, tags, isVertical = false, onPlay }) => (
    <article onClick={() => onPlay({ url, title })} className={`relative group overflow-hidden border border-white/5 bg-zinc-900/50 h-full cursor-pointer transition-all duration-300 hover:border-orange-600/60 rounded-md ${isVertical ? 'aspect-[9/16]' : 'aspect-video shadow-lg'}`}>
        <video muted loop playsInline className="w-full h-full object-cover opacity-40 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500 ease-out" onMouseOver={e => e.target.play()} onMouseOut={e => e.target.pause()}>
            <source src={url} />
        </video>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-12 h-12 rounded-full bg-orange-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300 shadow-xl translate-y-4 group-hover:translate-y-0">
                <Play size={18} className="fill-white text-white ml-1" />
            </div>
        </div>

        <div className="absolute inset-0 p-5 flex flex-col justify-between pointer-events-none z-20">
            <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => <span key={tag} className="text-[9px] font-medium px-2 py-1 bg-black/80 border border-white/5 text-zinc-300 rounded-sm backdrop-blur-sm">{tag}</span>)}
                </div>
            </div>
            <div className="max-w-[95%]">
                <h3 className={`font-bold tracking-tight text-white leading-tight ${isVertical ? 'text-lg' : 'text-xl'}`}>{title}</h3>
                <p className="text-[10px] font-mono text-zinc-400 mt-1.5 uppercase tracking-wider">{sub}</p>
            </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-50 transition-opacity" />
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
            source: 'AOM_V18_CLIENT'
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
                                        <button key={opt} onClick={() => { setFormData({...formData, lens: opt}); setStep(2); }} className="w-full p-4 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white transition-all rounded-lg flex justify-between items-center text-left group">
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
                                        <input type="text" placeholder="Name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors" />
                                        <input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors" />
                                        <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-transparent border-b border-white/20 py-3 text-white focus:border-orange-600 outline-none transition-colors" />
                                    </div>
                                    {formError && <div className="text-orange-500 text-xs mt-2">{formError}</div>}
                                    <button onClick={() => (formData.name && formData.email) ? setStep(3) : setFormError("Please complete all fields.")} className="w-full bg-orange-600 text-white font-bold py-4 rounded-lg hover:bg-orange-700 transition-colors mt-4">Next Step</button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-3">
                                    <p className="text-zinc-400 text-sm mb-6">What do you need?</p>
                                    {["Full Campaign (Brand + Assets)", "Documentary Series", "Ongoing Content Partnership"].map(opt => (
                                        <button key={opt} onClick={() => { setFormData({...formData, path: opt}); handleInquirySubmit(); }} className="w-full p-4 border border-white/5 bg-white/5 hover:bg-orange-600 hover:text-white transition-all rounded-lg flex justify-between items-center text-left group">
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

      {/* --- STUDIO PLAYER --- */}
      <AnimatePresence>
        {selectedVideo && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[700] bg-black/95 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-xl">
                <div className="absolute top-0 left-0 w-full p-6 md:p-10 flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col text-left">
                        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white">{selectedVideo.title}</h2>
                    </div>
                    <button onClick={() => setSelectedVideo(null)} className="pointer-events-auto bg-white/10 p-3 rounded-full hover:bg-white/20 text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="w-full max-w-6xl aspect-video bg-zinc-950 rounded-lg overflow-hidden shadow-2xl border border-white/5 relative">
                    <video autoPlay controls className="w-full h-full object-contain">
                        <source src={selectedVideo.url} />
                    </video>
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

      {/* --- THE PORTFOLIO ARCHIVE --- */}
      <section id="work" className="px-6 md:px-12 lg:px-24 py-24 bg-[#050505] relative z-10">
        <div className="max-w-screen-xl mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8 border-b border-white/5 pb-8">
            <div>
              <h3 className="text-orange-600 text-xs font-bold uppercase tracking-widest mb-2">Proven Results</h3>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">The Work.</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {['builders', 'founders', 'marketing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${activeTab === tab ? 'bg-white text-black' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="space-y-24">
              {/* CAMPAIGNS BLOCK */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                   <Film size={20} className="text-orange-600" />
                   <h4 className="text-sm font-bold text-white uppercase tracking-wider">Core Brand Assets</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {PORTFOLIO_DATA[activeTab].campaigns.map((vid) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>
              {/* SOCIAL BLOCK */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                   <Smartphone size={20} className="text-orange-600" />
                   <h4 className="text-sm font-bold text-white uppercase tracking-wider">Social & Vertical</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {PORTFOLIO_DATA[activeTab].social.map((vid) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} isVertical={true} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
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
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">We don't just shoot pretty footage. We map out the assets you need to sell, recruit, and grow before we ever pick up a camera.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <CheckSquare size={20} className="text-white" />
                </div>
                <div>
                    <h4 className="text-xl font-bold text-white mb-2">Turnkey Execution</h4>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">From scripting to final delivery, we own the process. You get consistent updates, clear timelines, and zero headaches.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="relative h-[600px] bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
               <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-60" onClick={() => setSelectedVideo({ url: "https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1", title: "Phoenix Studio Environment" })}>
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
          <div className="mt-12 text-left text-zinc-600 text-xs">
            © 2024 Ahead of Market. All rights reserved. Strategy Before Story.
          </div>
        </div>
      </footer>
    </main>
  );
}
