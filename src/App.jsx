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
  Maximize2,
  Volume2,
  Smartphone,
  Film
} from 'lucide-react';

// --- BRAND CONSTANTS ---
const ORANGE = "#FF4F00";

// --- EXPANDED PORTFOLIO DATA ---
const PORTFOLIO_DATA = {
  builders: {
    cinematic: [
      { title: "Ambition: Refined Gardens", sub: "Brand Episode", url: "https://dl.dropboxusercontent.com/scl/fi/i642p6xrm6zpxastfwa2p/REFINED-GARDENS-DIEON.mp4?rlkey=utze6r9xvj4l634sy7klusa5g&raw=1", tags: ["4K", "Architecture"] },
      { title: "The Rebuild: Thelma", sub: "Documentary Episode", url: "https://dl.dropboxusercontent.com/scl/fi/pmgtkouq5jkb7chs9xphz/EPISODE-1-THELMA-FF.mov?rlkey=4l5u8xxkw8cxybpnmydhllbmn&raw=1", tags: ["Doc", "Industrial"] },
      { title: "Malapai Construction", sub: "Doc Preview", url: "https://dl.dropboxusercontent.com/scl/fi/nsg96q5xd1v7jh4gha51h/Malapai-1.mov?rlkey=5abjqtb3zrjcytifndkfgpdcs&raw=1", tags: ["Process", "6K"] },
      { title: "The Noble Agency", sub: "Sizzle Film", url: "https://dl.dropboxusercontent.com/scl/fi/36hxds9dpn1xtcndlcfi9/Noble-Edit-Sizzle.mov?rlkey=3u41bycqn3jqivadsewqkl7m2&raw=1", tags: ["Real Estate"] },
      { title: "Du Coeur", sub: "Walkthrough Film", url: "https://dl.dropboxusercontent.com/scl/fi/zqbatp2vzu13xboe4mn9j/Sam-DuCoeur-Walkthrough.m4v?rlkey=t5emcnmd9er5yqp8cqjcya1e4&raw=1", tags: ["Luxury"] },
      { title: "AZ Cleantech", sub: "Sector Story", url: "https://dl.dropboxusercontent.com/scl/fi/46ov8xdfv1qy7e3vr7d9b/AZCLEANTECH-FINAL.mov?rlkey=khseypkzvpcvzhlthn3mgjn3z&raw=1", tags: ["Industrial"] }
    ],
    mobile: [
      { title: "Malapai Vertical", sub: "Doc Intro", url: "https://dl.dropboxusercontent.com/scl/fi/vq26nf476bebupfv6jwqp/Malapai-Vertical.mov?rlkey=tjar17zqb7czhx5m93v34xoqk&raw=1", tags: ["9:16"] },
      { title: "Malapai: Lafayette", sub: "Project Update", url: "https://dl.dropboxusercontent.com/scl/fi/ey6te42ahdx4t9udzieao/Malapai-Lafayette-update.mov?rlkey=xsbhgqi3j1voxpwx86090b6q8&raw=1", tags: ["Social"] },
      { title: "Refined Gardens", sub: "Mobile Cut", url: "https://dl.dropboxusercontent.com/scl/fi/3val6y22ma1ju8f5cqqqe/REFINED-GARDENS-MOBILE.mp4?rlkey=infjowq6zp8cqirrdesg1e0wn&raw=1", tags: ["9:16"] },
      { title: "Arrowhead Grenadier", sub: "INEOS Mobile", url: "https://dl.dropboxusercontent.com/scl/fi/8a0mig4l8bd8yf3khtigq/ARROWHEAD-UPDATE-MOBILE.mp4?rlkey=hylucrr5d7x3q62ul03g63byz&raw=1", tags: ["Brand"] }
    ]
  },
  founders: {
    cinematic: [
      { title: "Reelay", sub: "Product Explainer", url: "https://dl.dropboxusercontent.com/scl/fi/8wfqw1mw9scrahx04x8ks/Reelay-EXPLAINER-1920x1080.mp4?rlkey=hf1ycl8zftd08x32m3asm820g&raw=1", tags: ["SaaS", "VC"] },
      { title: "NGOTS", sub: "Business Highlight", url: "https://dl.dropboxusercontent.com/scl/fi/jk5wjgqeylw3khbz2ac7y/NGOTS.mp4?rlkey=xky4j0lmms9y8r1qr7w3cl4k8&raw=1", tags: ["Strategy"] },
      { title: "Intelliplay", sub: "Product Film", url: "https://dl.dropboxusercontent.com/scl/fi/m92mdkme20vwzb3791cnx/Intelliplay-FF.mov?rlkey=aasi46x1u610tqfpx75dw6qgd&raw=1", tags: ["Tech", "UX"] },
      { title: "Founders Retreat", sub: "Event Film", url: "https://dl.dropboxusercontent.com/scl/fi/2btjzczt66p8aj3iprvy/Retreat-2022.m4v?rlkey=fpjcvxrkj4qtsf2p4fx701v0l&raw=1", tags: ["Community"] }
    ],
    mobile: [
      { title: "Abstrakt SDR", sub: "Vertical Explainer", url: "https://dl.dropboxusercontent.com/scl/fi/311qjnptwbffo0jrlk26c/What-is-Abstrakt-VERT-9x16.mp4?rlkey=8e4eisivpr7ol6rh3leajkfw8&raw=1", tags: ["SaaS"] },
      { title: "Intelliplay IAAPA", sub: "Event Recap", url: "https://dl.dropboxusercontent.com/scl/fi/juc0yicl7bdoj16k51aci/IAAPA-DAY-2.mov?rlkey=nwbelita2wdmw1mhlvc340f6o&raw=1", tags: ["9:16"] }
    ]
  },
  marketing: {
    cinematic: [
      { title: "Letter To The World", sub: "Trailer", url: "https://dl.dropboxusercontent.com/scl/fi/t1jzugta90mp2up4na6zb/Letter-To-The-World-Trailer-FF.mov?rlkey=bz84d3eocnkpd34tnt8fmaxof&raw=1", tags: ["Epic"] },
      { title: "Cook & Craft", sub: "Brand Film", url: "https://dl.dropboxusercontent.com/scl/fi/9tb5f2m9fahqh1uqh1m5q/Website-Background-C-C.mov?rlkey=dippv72znkzrjdpziae6mzz7p&raw=1", tags: ["Food", "Brand"] },
      { title: "N2 Media", sub: "Brand Reel", url: "https://dl.dropboxusercontent.com/scl/fi/67tbiugc7b9ofwkpxqc3g/n2-Reel.m4v?rlkey=awjlbtw5l833m5co5ci7lbd0o&raw=1", tags: ["Agency"] },
      { title: "RW Investments", sub: "Brand Story", url: "https://dl.dropboxusercontent.com/scl/fi/rl5tnpm2lmet6mcful57b/RW-Investments-1-Minute.mp4?rlkey=3be7n7j2k0se7ye81a2de2k0s&raw=1", tags: ["Finance"] },
      { title: "Ulisgold Pilates", sub: "Studio Brand", url: "https://dl.dropboxusercontent.com/scl/fi/nd4hjftihygeux09zcr1x/ULISGOLD-GRADED-V2.mov?rlkey=cco8bu4qtmehs098mmcebrkxg&raw=1", tags: ["Lifestyle"] }
    ],
    mobile: [
      { title: "NOOK Kitchen", sub: "10 Year Anniversary", url: "https://dl.dropboxusercontent.com/scl/fi/gjua2slterlpr4r7hhfjo/Happy-10-Year-Reel-1.mov?rlkey=3ml7y0gg6t89df051y3bxtfui&raw=1", tags: ["Social"] },
      { title: "Combat Veterans", sub: "Event Promo", url: "https://dl.dropboxusercontent.com/scl/fi/cqosg1t3bck3d4hwuc5ks/Veterans-Day-Event-Promo.mp4?rlkey=271kjtoooigctix6ir10w8zbs&raw=1", tags: ["Promo"] },
      { title: "Lagos", sub: "Event Recap", url: "https://dl.dropboxusercontent.com/scl/fi/zte1jt418r58sej21dvnb/EVENT-RECAP-2MIN.mp4?rlkey=are24a517v12jwtgtt4yv3rq0&raw=1", tags: ["Vibe"] },
      { title: "Pretzel Feature", sub: "Cook & Craft", url: "https://dl.dropboxusercontent.com/scl/fi/n2quyck4ku4iypl8hzgzp/REloaded-PRetz-le.mov?rlkey=k3t1sponipiokel6jvigpwgoj&raw=1", tags: ["Product"] },
      { title: "Adobe AI", sub: "Sponsored Review", url: "https://dl.dropboxusercontent.com/scl/fi/nmcas20p1fg53tuoejyeb/Adobe-2.mov?rlkey=x1176327cigm96iq1v7pdwgw2&raw=1", tags: ["Tech"] },
      { title: "Aiper", sub: "Home Show", url: "https://dl.dropboxusercontent.com/scl/fi/maq2vbldzb3olt8u3auc5/AIPER-Maricopa-Home-Show-60-Second.mov?rlkey=elsmbih3a280pqegdqjqnfmrp&raw=1", tags: ["Event"] },
      { title: "Ambassador Cigar", sub: "Atmosphere", url: "https://dl.dropboxusercontent.com/scl/fi/vcqef5250n2phrguoheor/Video-Jun-25-2023-12-44-50-AM.mp4?rlkey=893ojsbyh7hty8ppshry3nuik&raw=1", tags: ["Luxury"] },
      { title: "Influencer Day", sub: "Cook & Craft", url: "https://dl.dropboxusercontent.com/scl/fi/69m6kg7pmrk7fjo3bd4yi/CC-Influencer-Day.mov?rlkey=jnf2lhdi97dl6fy9c2xdahbxe&raw=1", tags: ["Social"] }
    ]
  }
};

const VERTICAL_VIDEOS = PORTFOLIO_DATA.builders.mobile; // Default for scroller

// --- ANIMATION VARIANTS ---
const revealText = {
  hidden: { y: "110%", opacity: 0, skewY: 8 },
  visible: { 
    y: 0, 
    opacity: 1, 
    skewY: 0,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
  }
};

// --- SUB-COMPONENTS ---

const GrainOverlay = () => (
  <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.04] contrast-125">
    <svg className="h-full w-full">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  </div>
);

const RevealHeading = ({ children, className }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  
  return (
    <div ref={ref} className={`overflow-hidden contain-paint ${className}`}>
      <motion.div
        variants={revealText}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {children}
      </motion.div>
    </div>
  );
};

// --- THREE.JS BACKGROUND ---
const StrategicVortexBG = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    let scene, camera, renderer, lines, points;
    const mount = mountRef.current;

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
      
      const material = new THREE.LineBasicMaterial({ 
        color: new THREE.Color(ORANGE), 
        transparent: true, 
        opacity: 0.18 
      });
      lines = new THREE.LineSegments(geometry, material);
      scene.add(lines);

      const pGeometry = new THREE.BufferGeometry();
      const pVertices = [];
      for (let i = 0; i < 900; i++) {
        pVertices.push(THREE.MathUtils.randFloatSpread(150), THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(150));
      }
      pGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pVertices, 3));
      const pMaterial = new THREE.PointsMaterial({ 
        color: new THREE.Color(ORANGE), 
        size: 0.05, 
        transparent: true, 
        opacity: 0.25 
      });
      points = new THREE.Points(pGeometry, pMaterial);
      scene.add(points);

      const animate = () => {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.00028;
        const pos = lines.geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const x = pos[i];
          const z = pos[i + 2];
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

// --- STUDIO CINEMA PLAYER MODAL ---
const StudioPlayer = ({ video, onClose }) => (
  <AnimatePresence>
    {video && (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[700] bg-black/98 flex flex-col items-center justify-center p-4 md:p-8 backdrop-blur-3xl"
      >
        <div className="absolute top-0 left-0 w-full p-8 md:p-12 flex justify-between items-center pointer-events-none">
          <div className="flex flex-col">
            <span className="text-orange-600 font-mono text-[10px] uppercase tracking-[0.5em] font-black italic">Now_Screening</span>
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-white mt-2">{video.title}</h2>
          </div>
          <div className="hidden md:flex flex-col items-end opacity-40">
            <span className="text-[10px] font-mono text-white uppercase tracking-widest">Studio_Cinema // 24FPS</span>
            <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Status: Active_Master</span>
          </div>
        </div>

        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-6xl aspect-video bg-zinc-950 border border-white/10 relative shadow-[0_0_100px_rgba(0,0,0,1)]"
        >
          <video autoPlay controls className="w-full h-full object-contain">
            <source src={video.url} />
          </video>
        </motion.div>

        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 flex justify-center">
          <button 
            onClick={onClose}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105"
          >
            <div className="w-12 h-12 rounded-full border border-orange-600 flex items-center justify-center bg-black group-hover:bg-orange-600 transition-colors">
              <X size={20} className="text-white" />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.5em] font-black group-hover:text-orange-600 transition-colors">Terminate_Session</span>
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const InquiryProtocol = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', lens: '', scale: '', launch: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => phone.replace(/\D/g, '').length === 10;

  const handleNext = () => {
    if (step === 2) {
      if (!formData.name.trim()) return setError("Name Required");
      if (!validateEmail(formData.email)) return setError("Valid Email Required");
      if (!validatePhone(formData.phone)) return setError("10-Digit Mobile Required");
    }
    setError('');
    if (step < 4) setStep(step + 1);
    else {
      setIsSubmitting(true);
      setTimeout(() => { setIsSubmitting(false); setIsSuccess(true); }, 2000);
    }
  };

  const handleReset = () => {
    setStep(1); setIsSuccess(false); setError('');
    setFormData({ name: '', email: '', phone: '', lens: '', scale: '', launch: '' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-black/98 backdrop-blur-3xl overflow-hidden"
        >
          <div className="absolute top-8 right-8 md:top-12 md:right-12">
            <button onClick={handleReset} className="p-3 border border-white/10 text-zinc-500 hover:text-white rounded-full transition-all">
              <X size={24} />
            </button>
          </div>
          <div className="w-full max-w-2xl p-8 md:p-16 relative overflow-y-auto max-h-[90vh] border border-white/5 bg-[#080808] shadow-2xl">
            {!isSuccess ? (
              <div className="space-y-12">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-orange-600 font-mono text-[10px] uppercase tracking-[0.5em] font-black italic">AOM_PROJECT_INQUIRY</span>
                    <span className="font-mono text-[10px] mt-2 text-zinc-600">PHASE: 0{step} // 04</span>
                  </div>
                  <div className="flex-grow h-[1px] relative overflow-hidden bg-white/5">
                    <motion.div animate={{ width: `${(step / 4) * 100}%` }} className="absolute inset-0 bg-orange-600 shadow-[0_0_10px_#FF4F00]" />
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={step} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}>
                    {step === 1 && (
                      <div className="space-y-10">
                        <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">The Lens<span className="text-orange-600">.</span></h2>
                        <div className="grid grid-cols-1 gap-3">
                          {["Real Estate Builder", "Startup Founder", "Brand Strategist"].map(opt => (
                            <button key={opt} onClick={() => { setFormData({...formData, lens: opt}); setStep(2); }} className="w-full p-6 border border-white/5 bg-white/[0.01] hover:bg-orange-600/5 text-left flex justify-between items-center group transition-all">
                              <span className="text-xl font-bold uppercase italic tracking-tight">{opt}</span>
                              <ChevronRight size={20} className="text-zinc-800 group-hover:text-orange-600 transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {step === 2 && (
                      <div className="space-y-10">
                        <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">Details<span className="text-orange-600">.</span></h2>
                        <div className="space-y-4">
                          <input autoFocus type="text" placeholder="NAME / BRAND" className="w-full border border-white/10 p-5 text-sm font-bold uppercase focus:border-orange-600 focus:outline-none transition-all bg-black text-white" onChange={(e) => setFormData({...formData, name: e.target.value})} value={formData.name} />
                          <input type="email" placeholder="EMAIL ADDRESS" className="w-full border border-white/10 p-5 text-sm font-bold uppercase focus:border-orange-600 focus:outline-none transition-all bg-black text-white" onChange={(e) => setFormData({...formData, email: e.target.value})} value={formData.email} />
                          <input type="tel" placeholder="10-DIGIT MOBILE" className="w-full border border-white/10 p-5 text-sm font-bold uppercase focus:border-orange-600 focus:outline-none transition-all bg-black text-white" onChange={(e) => setFormData({...formData, phone: e.target.value})} value={formData.phone} />
                          {error && <motion.div animate={{ x: [-5, 5, -5, 0] }} className="flex items-center gap-2 text-orange-600 font-mono text-[9px] uppercase tracking-widest mt-4"><AlertCircle size={14} /> {error}</motion.div>}
                          <button onClick={handleNext} className="w-full bg-orange-600 text-white font-black uppercase italic py-6 hover:bg-white hover:text-black transition-all mt-6 text-[10px] tracking-widest font-black">Verify & Continue</button>
                        </div>
                      </div>
                    )}
                    {step >= 3 && (
                        <div className="space-y-10">
                            <h2 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">{step === 3 ? 'Scope' : 'Launch'}<span className="text-orange-600">.</span></h2>
                            <div className="grid grid-cols-1 gap-3">
                            {(step === 3 ? ["Flagship Campaign", "Production Retainer", "Strategic Partnership"] : ["Immediate (Q1)", "Planned (Q2)", "Exploratory"]).map(opt => (
                                <button key={opt} onClick={() => { 
                                    if (step === 3) { setFormData({...formData, scale: opt}); setStep(4); }
                                    else { setFormData({...formData, launch: opt}); handleNext(); }
                                }} className="w-full p-6 border border-white/5 bg-white/[0.01] hover:bg-orange-600/5 text-left flex justify-between items-center group transition-all">
                                    <span className="text-xl font-bold uppercase italic tracking-tight">{opt}</span>
                                    <ChevronRight size={20} className="text-zinc-800 group-hover:text-orange-600 transition-colors" />
                                </button>
                            ))}
                            </div>
                        </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle2 size={80} className="mx-auto text-orange-600 mb-8" />
                <h2 className="text-5xl font-black uppercase italic mb-6 tracking-tighter">Received<span className="text-orange-600">.</span></h2>
                <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-12 max-w-sm mx-auto leading-relaxed">Brief received for {formData.name}. We will reach out within 24 hours.</p>
                <button onClick={handleReset} className="px-12 py-5 bg-orange-600 text-white font-black uppercase italic tracking-[0.2em] text-[10px] hover:bg-white hover:text-black transition-all">Terminate_Session</button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const VideoModule = ({ url, title, sub, tags, isVertical = false, onPlay }) => (
    <div 
        onClick={() => onPlay({ url, title })}
        className={`relative group overflow-hidden border border-white/5 bg-zinc-950 h-full cursor-pointer ${isVertical ? 'aspect-[9/16]' : 'aspect-video shadow-2xl'}`}
    >
        <video autoPlay muted loop playsInline className="w-full h-full object-cover opacity-20 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[3000ms] ease-out">
        <source src={url} />
        </video>
        <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none z-20">
        <div className="flex justify-between items-start">
            <div className="flex gap-2">
            {tags.map(tag => (
                <span key={tag} className="text-[7px] font-mono px-2 py-0.5 bg-black/90 border border-white/5 text-zinc-500 uppercase font-black tracking-widest">
                {tag}
                </span>
            ))}
            </div>
            <Activity size={12} className="text-orange-600 animate-pulse" />
        </div>
        <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={10} className="fill-white text-white ml-0.5" />
               </div>
               <h3 className={`font-black uppercase italic tracking-tighter leading-none group-hover:text-orange-500 transition-colors ${isVertical ? 'text-2xl' : 'text-3xl'}`}>{title}</h3>
            </div>
            <p className="text-[9px] font-mono text-orange-600 uppercase tracking-[0.2em] font-black">{sub}</p>
        </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 group-hover:opacity-40 transition-opacity" />
    </div>
);

export default function App() {
  const [loadStatus, setLoadStatus] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState('builders');
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [activeVerticalIndex, setActiveVerticalIndex] = useState(0);

  useEffect(() => {
    if (loadStatus < 100) {
      const timer = setTimeout(() => setLoadStatus(prev => prev + 2), 25);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => setIsInitialized(true), 600);
    }
  }, [loadStatus]);

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 bg-[#020202] flex flex-col items-center justify-center p-8 z-[1000]">
        <div className="w-full max-w-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center mb-12"
          >
            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-2">AOM<span className="text-orange-600">.</span></h1>
            <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.7em] font-black">Strategic_Production</span>
          </motion.div>
          <div className="flex justify-between mb-3 px-1">
            <span className="text-orange-600 font-mono text-[8px] uppercase tracking-[0.4em] font-black italic">Vortex_Calibration</span>
            <span className="text-white font-mono text-[9px] font-black">{loadStatus}%</span>
          </div>
          <div className="h-[1px] bg-white/5 w-full relative overflow-hidden">
            <motion.div animate={{ width: `${loadStatus}%` }} className="absolute inset-0 bg-orange-600 shadow-[0_0_15px_#FF4F00]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#020202] text-zinc-100 selection:bg-orange-600 selection:text-white font-sans overflow-x-hidden antialiased max-w-[100vw]">
      <GrainOverlay />
      
      {/* HUD OVERLAY */}
      <div className="fixed inset-0 pointer-events-none z-[100] border-[1px] border-white/[0.04]" />
      <div className="fixed inset-0 pointer-events-none z-[100] opacity-[0.03]"
        style={{ backgroundImage: `radial-gradient(#444 1.5px, transparent 1.5px)`, backgroundSize: '80px 80px' }}
      />

      <InquiryProtocol isOpen={isInquiryOpen} onClose={() => setIsInquiryOpen(false)} />
      <StudioPlayer video={selectedVideo} onClose={() => setSelectedVideo(null)} />

      {/* HEADER */}
      <header className="fixed top-0 left-0 w-full z-[200] px-6 py-8 md:px-12 lg:px-24 flex justify-between items-center bg-gradient-to-b from-black/95 to-transparent backdrop-blur-[6px]">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none hover:text-orange-600 transition-colors cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            AOM<span className="text-orange-600">.</span>
          </h1>
          <span className="text-[8px] font-mono uppercase tracking-[0.5em] mt-1.5 italic font-black text-zinc-700">Studio_Level_System</span>
        </div>
        <div className="flex items-center gap-10">
          <nav className="hidden lg:flex gap-10 text-[9px] font-mono uppercase tracking-[0.4em] font-black text-zinc-600">
            <a href="#work" className="hover:text-orange-500 transition-all tracking-tighter">The_Work</a>
            <a href="#system" className="hover:text-orange-500 transition-all tracking-tighter">Method</a>
            <div className="flex items-center gap-2 text-orange-600">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse" />
                <span className="text-[8px] tracking-[0.2em]">Live_Status</span>
            </div>
          </nav>
          <button onClick={() => setIsInquiryOpen(true)} className="group relative px-8 py-4 bg-orange-600 text-white font-black uppercase italic tracking-[0.2em] text-[10px] overflow-hidden">
            <span className="relative z-10 flex items-center gap-3 uppercase italic font-black tracking-widest"><Terminal size={14} /> Start_Project</span>
            <motion.div initial={{ x: "-100%" }} whileHover={{ x: "0%" }} className="absolute inset-0 bg-white" />
            <style>{`.group:hover span { color: black !important; transition: color 0.3s; }`}</style>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24 relative overflow-hidden pt-[max(25vh,200px)] w-full max-w-[100vw]">
        <StrategicVortexBG />
        
        <div className="max-w-screen-2xl mx-auto w-full relative z-10">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-5 mb-10 relative z-20 overflow-hidden">
              <div className="w-16 h-[1.5px] bg-orange-600 shadow-[0_0_15px_#FF4F00]" />
              <p className="text-orange-600 font-mono text-[10px] uppercase tracking-[0.6em] font-black italic">Strategic Narrative Engineering Studio</p>
            </div>
            <div className="relative overflow-hidden w-full contain-paint">
              <h2 className="text-[clamp(3rem,10.5vw,12rem)] font-black leading-[0.8] tracking-tighter uppercase italic italic-heavy drop-shadow-2xl relative z-10 mt-2 max-w-[95%]">
                Strategy <br />
                <span className="text-transparent stroke-text stroke-white/20" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.1)' }}>Before</span> <br />
                Story<span className="text-orange-600 not-italic">.</span>
              </h2>
            </div>
          </motion.div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-12 gap-12 items-end">
            <div className="md:col-span-6">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-2.5 h-2.5 bg-orange-600 rounded-full animate-pulse shadow-[0_0_15px_#FF4F00]" />
                 <span className="text-[10px] font-mono uppercase tracking-[0.5em] font-black italic text-zinc-600">AOM_SYSTEM_026</span>
              </div>
              <p className="text-sm md:text-lg font-mono uppercase leading-relaxed tracking-wider italic font-black max-w-xl text-zinc-500 text-balance">
                Strategic production systems for physical-world developers and digital-world founders. Cinematic infrastructure designed to scale conviction.
              </p>
            </div>
            <div className="md:col-span-6 flex justify-end">
               <button onClick={() => setIsInquiryOpen(true)} className="flex flex-col items-end group">
                 <div className="flex items-center gap-10 mb-5">
                    <span className="text-4xl md:text-7xl font-black italic uppercase tracking-tighter group-hover:text-orange-600 transition-all duration-500 underline decoration-orange-600/10 underline-offset-[16px]">Start Project</span>
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-2 border-orange-600 flex items-center justify-center group-hover:bg-orange-600 transition-all duration-500 shadow-[0_0_40px_rgba(255,79,0,0.25)]">
                       <MoveRight size={32} className="text-white group-hover:scale-125 transition-transform duration-500" />
                    </div>
                 </div>
                 <span className="text-[10px] font-mono uppercase tracking-[0.6em] mr-28 italic font-black text-zinc-700">Initialize Production Onboarding</span>
               </button>
            </div>
          </div>
        </div>
      </section>

      {/* THE WORK (MODAL-ENABLED) */}
      <section id="work" className="px-6 md:px-12 lg:px-24 py-32 relative z-10 bg-[#020202] overflow-hidden w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row justify-between items-end mb-24 gap-12 border-b border-white/5 pb-12">
            <div className="max-w-3xl">
              <RevealHeading className="mb-8">
                <h3 className="text-[11px] font-mono text-orange-600 uppercase tracking-[0.8em] font-black italic">The_Strategic_Archive // V.13</h3>
              </RevealHeading>
              <RevealHeading>
                <h2 className="text-7xl md:text-[8.5vw] font-black uppercase italic tracking-tighter leading-[0.8]">
                  The <br /><span className="text-transparent stroke-text stroke-white/20" style={{ WebkitTextStroke: '1.5px white' }}>Work.</span>
                </h2>
              </RevealHeading>
            </div>
            <div className="flex p-1.5 border border-white/10 shadow-3xl bg-zinc-950 overflow-x-auto max-w-full no-scrollbar">
              {['builders', 'founders', 'marketing'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 text-[10px] font-mono uppercase tracking-[0.3em] transition-all duration-500 font-black whitespace-nowrap ${activeTab === tab ? 'bg-orange-600 text-white shadow-[0_0_40px_rgba(255,79,0,0.4)]' : 'text-zinc-800 hover:text-white'}`}>
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-32 mt-20">
              
              {/* 🎬 CINEMATIC MASTERS (16:9) */}
              <div className="space-y-12">
                <div className="flex items-center gap-6">
                   <Film size={20} className="text-orange-600" />
                   <h4 className="text-[10px] font-mono uppercase tracking-[0.5em] font-black italic">Cinematic_Masters // 16:9_HD</h4>
                   <div className="flex-grow h-[1px] bg-white/5" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {PORTFOLIO_DATA[activeTab].cinematic.map((vid, idx) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>

              {/* 📱 MOBILE SYSTEMS (9:16) */}
              <div className="space-y-12">
                <div className="flex items-center gap-6">
                   <Smartphone size={20} className="text-orange-600" />
                   <h4 className="text-[10px] font-mono uppercase tracking-[0.5em] font-black italic">Mobile_Systems // 9:16_Vertical</h4>
                   <div className="flex-grow h-[1px] bg-white/5" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                  {PORTFOLIO_DATA[activeTab].mobile.map((vid, idx) => (
                    <VideoModule key={vid.title} onPlay={setSelectedVideo} isVertical={true} title={vid.title} sub={vid.sub} tags={vid.tags} url={vid.url} />
                  ))}
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* SYSTEMS (WITH INTERACTIVE VERTICAL STREAM) */}
      <section id="system" className="px-6 md:px-12 lg:px-24 py-48 border-t border-white/[0.04] relative z-10 bg-gradient-to-b from-[#020202] to-[#080808] overflow-hidden w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-24 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <RevealHeading className="mb-12">
               <div className="flex items-center gap-8">
                  <div className="px-5 py-2 bg-orange-600 text-[11px] font-black uppercase tracking-[0.2em] italic shadow-2xl">AOM_METHOD</div>
                  <span className="h-[1px] w-32 bg-white/10" />
               </div>
            </RevealHeading>
            <RevealHeading>
              <h2 className="text-6xl md:text-[7.5vw] font-black uppercase italic tracking-tighter leading-[0.75] mb-16 max-w-[95%]">
                Systems <br />Over <br /><span className="text-orange-600">Assets.</span>
              </h2>
            </RevealHeading>
            <div className="space-y-24">
              {["Strategic Blueprint", "Production Engine"].map((title, i) => (
                <RevealHeading key={title}>
                    <div className="flex gap-10 group">
                    <span className="text-5xl font-black italic group-hover:text-orange-600 transition-all duration-500 text-zinc-900">0{i+1}</span>
                    <div>
                        <h4 className="text-3xl font-bold uppercase italic mb-6 tracking-tight">{title}</h4>
                        <p className="text-sm md:text-base leading-relaxed max-w-xl uppercase tracking-wider italic font-black text-zinc-500">
                            {i === 0 ? "We architect the production logic before the first frame is captured. Strategic outcomes drive our aesthetic decisions." : "High-speed, high-fidelity capture systems engineered for operators who scale. Precision production is our baseline."}
                        </p>
                    </div>
                    </div>
                </RevealHeading>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 relative">
            <div className="h-full min-h-[700px] border border-white/5 bg-black relative group overflow-hidden shadow-[0_0_120px_rgba(0,0,0,0.6)] rounded-sm">
               <AnimatePresence mode="wait">
                  <motion.video 
                    key={activeVerticalIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 0.5, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    autoPlay muted loop playsInline 
                    className="w-full h-full object-cover group-hover:opacity-100 group-hover:scale-105 transition-all duration-[5000ms] ease-out cursor-pointer"
                    onClick={() => setSelectedVideo({ url: VERTICAL_VIDEOS[activeVerticalIndex].url, title: VERTICAL_VIDEOS[activeVerticalIndex].title })}
                  >
                    <source src={VERTICAL_VIDEOS[activeVerticalIndex].url} />
                  </motion.video>
               </AnimatePresence>
               
               {/* Vertical Navigation Overlay */}
               <div className="absolute inset-0 z-30 flex flex-col justify-between p-10 pointer-events-none">
                  <div className="flex justify-between items-start pointer-events-auto">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                           <div className="w-3 h-3 bg-orange-600 rounded-full animate-pulse" />
                           <span className="text-[10px] font-mono text-white uppercase tracking-[0.5em] font-black italic">Vertical_Doc_Stream</span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest italic font-black">Ref: {VERTICAL_VIDEOS[activeVerticalIndex].tag}</span>
                     </div>
                     <div className="flex gap-2">
                        <button 
                           onClick={() => setActiveVerticalIndex(prev => (prev === 0 ? VERTICAL_VIDEOS.length - 1 : prev - 1))}
                           className="w-10 h-10 border border-white/10 flex items-center justify-center bg-black/50 hover:bg-orange-600 transition-colors"
                        >
                           <ChevronLeft size={16} />
                        </button>
                        <button 
                           onClick={() => setActiveVerticalIndex(prev => (prev === VERTICAL_VIDEOS.length - 1 ? 0 : prev + 1))}
                           className="w-10 h-10 border border-white/10 flex items-center justify-center bg-black/50 hover:bg-orange-600 transition-colors"
                        >
                           <ChevronRight size={16} />
                        </button>
                     </div>
                  </div>
                  
                  <div className="pointer-events-auto">
                     <h4 className="text-4xl font-black uppercase italic text-white tracking-tighter mb-4">{VERTICAL_VIDEOS[activeVerticalIndex].title}</h4>
                     <div className="flex gap-1 h-1 w-full bg-white/5">
                        {VERTICAL_VIDEOS.map((_, i) => (
                           <div key={i} className={`h-full flex-grow transition-all duration-500 ${i === activeVerticalIndex ? 'bg-orange-600' : 'bg-white/10'}`} />
                        ))}
                     </div>
                  </div>
               </div>

               <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-[2.5px] bg-orange-600/20 shadow-[0_0_40px_#FF4F00] z-20" />
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-6 md:px-12 lg:px-24 py-64 border-t border-white/[0.04] bg-[#020202] relative overflow-hidden transition-all duration-1000 w-full max-w-[100vw]">
        <div className="max-w-screen-2xl mx-auto w-full relative z-10 flex flex-col items-center text-center">
          <RevealHeading>
            <h2 className="text-[11vw] font-black uppercase italic tracking-tighter leading-none mb-24 max-w-[95%]">
              Ahead <br /><span className="text-transparent stroke-text stroke-white/10" style={{ WebkitTextStroke: '2px #FF4F00' }}>Of It.</span>
            </h2>
          </RevealHeading>
          <button onClick={() => setIsInquiryOpen(true)} className="flex items-center gap-12 text-4xl md:text-[5.5vw] font-black uppercase italic tracking-tighter hover:text-orange-600 transition-all duration-500 group underline decoration-orange-600/20 underline-offset-[20px]">
            Start Project <MoveRight size={80} className="group-hover:translate-x-10 transition-transform duration-500" />
          </button>
        </div>
        <div className="max-w-screen-2xl mx-auto w-full mt-48 grid grid-cols-1 md:grid-cols-4 gap-16 text-left pt-32 border-t border-white/10 relative z-10">
           {["Studio_Base", "Direct_Line", "Booking_Status", "Connect"].map((title, i) => (
             <div key={title} className={i === 3 ? "flex flex-col items-start md:items-end" : ""}>
                <h6 className="text-[10px] font-mono text-orange-600 uppercase tracking-[1em] mb-12 font-black italic">{title}</h6>
                {i === 0 && <p className="text-2xl font-black uppercase italic tracking-tighter">Phoenix, AZ</p>}
                {i === 1 && <p className="text-2xl font-black uppercase italic tracking-tighter underline underline-offset-4 decoration-white/10">hello@aom-inhouse.com</p>}
                {i === 2 && <p className="text-2xl font-black uppercase italic tracking-tighter">Booking Q2 2026</p>}
                {i === 3 && (
                    <div className="flex gap-8">
                    {['INSTA', 'VIMEO', 'LINKEDIN'].map(s => (
                        <div key={s} className="transition-all duration-500 cursor-pointer font-black text-[10px] font-mono tracking-[0.4em] text-zinc-800 hover:text-orange-600">{s}</div>
                    ))}
                    </div>
                )}
             </div>
           ))}
        </div>
      </footer>

      {/* TICKER */}
      <div className="fixed bottom-0 left-0 w-full h-12 border-t border-white/10 z-[300] flex items-center overflow-hidden shadow-2xl bg-black max-w-[100vw]">
        <div className="bg-orange-600 h-full px-8 flex items-center flex-shrink-0 relative overflow-hidden">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white relative z-10 italic">AOM_PRODUCTION_ENGAGED</span>
          <motion.div animate={{ x: ["-100%", "100%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-white/30 skew-x-12" />
        </div>
        <div className="flex-grow flex overflow-hidden whitespace-nowrap bg-black">
          <motion.div animate={{ x: ["0%", "-50%"] }} transition={{ duration: 75, repeat: Infinity, ease: "linear" }} className="flex text-[10px] font-mono uppercase tracking-[0.65em] py-3 font-black italic text-zinc-800">
            <span className="mx-24 font-black">REAL ESTATE PRODUCTION // STRATEGY BEFORE STORY // CONTENT SYSTEMS FOR FOUNDERS // SCALE THROUGH STORY // </span>
            <span className="mx-24 text-orange-600 italic">PHOENIX VIDEO PRODUCTION // NARRATIVE INFRASTRUCTURE // AHEAD OF THE MARKET // </span>
            <span className="mx-24 text-orange-600 italic font-black">AHEAD OF THE MARKET // AHEAD OF THE MARKET // </span>
          </motion.div>
        </div>
        <div className="h-full px-8 hidden md:flex items-center flex-shrink-0 border-l border-white/5 bg-zinc-950 gap-8">
          <div className="flex items-center gap-2.5 text-zinc-700">
            <Globe size={13} className="text-orange-600" />
            <span className="text-[10px] font-mono font-black italic uppercase tracking-[0.25em]">Global_Ops</span>
          </div>
          <div className="flex items-center gap-2.5 text-zinc-700">
            <Clock size={13} className="text-orange-600" />
            <span className="text-[10px] font-mono font-black italic uppercase tracking-[0.25em]">14:34_PHX</span>
          </div>
        </div>
      </div>
    </div>
  );
}
