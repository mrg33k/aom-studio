// Wolfpack pieces — parametrized by window.OM_CONFIG = {w, h}
// Tweak "bg": footage preview | green screen (for keying in Resolve) | black
const { useComposition, Shot, Easing, animate, clamp } = window;

const BLUE = "#4c9cd4", INK = "#101216";
const CFG = window.OM_CONFIG || { w: 1080, h: 1920 };
const W = CFG.w, H = CFG.h, MAXR = Math.hypot(W, H) / 2 + 40;
const LS = (Math.min(W, H) / 1080) * (CFG.logoScale || 1);

const MOTION = {
  enter: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutCubic }),
  slam:  (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutBack }),
  burst: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeInOutQuart }),
};

function shake(T, at, amp) {
  const dt = T - at;
  if (dt < 0 || dt > 0.5) return { x: 0, y: 0 };
  const decay = (1 - dt / 0.5) ** 2 * amp;
  return { x: Math.sin(dt * 90) * decay, y: Math.cos(dt * 70) * decay * 0.7 };
}

function Footage({ T, playing }) {
  const ref = React.useRef(null);
  const [src, setSrc] = React.useState(null);
  React.useEffect(() => {
    let url = null, dead = false;
    fetch("uploads/proxy-kinetic-v6.mp4").then((r) => r.blob()).then((b) => {
      if (dead) return;
      url = URL.createObjectURL(b);
      setSrc(url);
    }).catch(() => {});
    return () => { dead = true; if (url) URL.revokeObjectURL(url); };
  }, []);
  React.useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) { if (v.paused) v.play().catch(() => {}); }
    else if (!v.paused) v.pause();
  }, [playing]);
  React.useEffect(() => {
    const v = ref.current;
    if (!v || !v.duration) return;
    const target = T % v.duration;
    if (Math.abs(v.currentTime - target) > (playing ? 0.4 : 0.12)) v.currentTime = target;
  }, [T]);
  return (
    <div style={{ position: "absolute", inset: 0, background: "#0d1219", overflow: "hidden" }}>
      {src && <video ref={ref} src={src} muted playsInline loop preload="auto"
        style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
    </div>
  );
}

function Background({ T, playing, mode }) {
  if (mode === "transparent") return null;
  if (mode === "green screen") return <div style={{ position: "absolute", inset: 0, background: "#00b140" }} />;
  if (mode === "black") return <div style={{ position: "absolute", inset: 0, background: "#000" }} />;
  return <Footage T={T} playing={playing} />;
}

function Ring({ r, w, color, o }) {
  return <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2,
    marginLeft: -r, marginTop: -r, borderRadius: "50%", border: `${w}px solid ${color}`, opacity: o }} />;
}

// ---- Stinger (circle expand) ----
function Stinger({ T, CUES }) {
  const tIn = CUES.StingerIn, tOut = CUES.StingerOut;
  const impact = tIn + 0.42;
  const rIn = MOTION.burst(0, MAXR, tIn, tIn + 0.42)(T);
  const rOut = MOTION.burst(MAXR, 0, tOut, tOut + 0.45)(T);
  const r = T < tOut ? rIn : rOut;
  const blueR = T < tOut ? MOTION.burst(0, MAXR, tIn - 0.07, tIn + 0.4)(T) : rOut + 90;
  const markS = MOTION.slam(2.6, 1, impact - 0.06, impact + 0.3)(T);
  const markO = MOTION.enter(0, 1, impact - 0.06, impact + 0.08)(T);
  const markRot = MOTION.slam(-10, 0, impact - 0.06, impact + 0.35)(T);
  const wordY = MOTION.slam(60, 0, impact + 0.12, impact + 0.42)(T);
  const wordO = MOTION.enter(0, 1, impact + 0.12, impact + 0.3)(T);
  const outS = MOTION.burst(1, 0.4, tOut, tOut + 0.4)(T);
  const outO = MOTION.enter(1, 0, tOut + 0.15, tOut + 0.4)(T);
  const sh = shake(T, impact, 16);
  const ring1 = MOTION.burst(120 * LS, 640 * LS, impact, impact + 0.5)(T);
  const ring1o = MOTION.enter(0.9, 0, impact, impact + 0.5)(T);
  return (
    <Shot from={tIn - 0.1} to={tOut + 0.5}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", transform: `translate(${sh.x}px,${sh.y}px)` }}>
        <div style={{ position: "absolute", left: "50%", top: "50%", width: blueR * 2, height: blueR * 2,
          marginLeft: -blueR, marginTop: -blueR, borderRadius: "50%", background: BLUE }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2,
          marginLeft: -r, marginTop: -r, borderRadius: "50%", background: "#ffffff", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H,
            transform: `translate(${r - W / 2}px, ${r - H / 2}px)`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 * LS }}>
            <div style={{ transform: `scale(${markS * outS}) rotate(${markRot}deg)`, opacity: markO * outO }}>
              <img src="assets/logo-mark-tight.png" style={{ width: 560 * LS, display: "block" }} />
            </div>
            <img src="assets/logo-word.png" style={{ width: 660 * LS, transform: `translateY(${wordY}px) scale(${outS})`, opacity: wordO * outO }} />
          </div>
        </div>
        <Ring r={ring1} w={10} color={INK} o={ring1o} />
      </div>
    </Shot>
  );
}

// ---- Center pop (brand recognition) ----
function CenterPop({ T, CUES }) {
  const t0 = CUES.Pop + 0.4, t1 = CUES.Pop + 2.3;
  const inS = MOTION.slam(0, 1, t0, t0 + 0.35)(T);
  const outS = MOTION.burst(1, 0, t1, t1 + 0.3)(T);
  const s = T < t1 ? inS : outS;
  const rot = MOTION.slam(14, 0, t0, t0 + 0.4)(T);
  const wobble = 1 + 0.025 * Math.sin((T - t0) * 9) * Math.exp(-(T - t0) * 2.5);
  const ringR = MOTION.burst(140 * LS, 480 * LS, t0 + 0.08, t0 + 0.6)(T);
  const ringO = MOTION.enter(0.85, 0, t0 + 0.08, t0 + 0.6)(T);
  const wordY = MOTION.slam(50, 0, t0 + 0.18, t0 + 0.5)(T);
  const wordO = T < t1 ? MOTION.enter(0, 1, t0 + 0.18, t0 + 0.45)(T) : outS;
  const sh = shake(T, t0 + 0.3, 8);
  return (
    <Shot from={t0 - 0.05} to={t1 + 0.35}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 34 * LS,
        transform: `translate(${sh.x}px,${sh.y}px)` }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
          <Ring r={ringR} w={8} color="#ffffff" o={ringO} />
          <div style={{ width: 460 * LS, height: 460 * LS, borderRadius: "50%", background: "rgba(255,255,255,.96)",
            boxShadow: "0 20px 80px rgba(0,0,0,.45)", display: "grid", placeItems: "center",
            transform: `scale(${s * wobble}) rotate(${rot}deg)` }}>
            <img src="assets/logo-mark-tight.png" style={{ width: 400 * LS }} />
          </div>
        </div>
        <div style={{ transform: `translateY(${wordY}px) scale(${s})`, opacity: wordO,
          filter: "drop-shadow(0 3px 14px rgba(0,0,0,.65))" }}>
          <img src="assets/logo-word-white.png" style={{ width: 520 * LS, display: "block" }} />
        </div>
      </div>
    </Shot>
  );
}

function makeApp(Overlay) {
  return function App() {
    const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS || { bg: "footage" });
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <window.CompositionStage width={W} height={H} bg={t.bg === "transparent" ? "transparent" : "#0d1219"}
          scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
          <Piece Overlay={Overlay} bg={t.bg} />
        </window.CompositionStage>
        <window.TweaksPanel>
          <window.TweakSection label="Background" />
          <window.TweakRadio label="Behind the logo" value={t.bg}
            options={["footage", "green screen", "black", "transparent"]}
            onChange={(v) => setTweak("bg", v)} />
        </window.TweaksPanel>
      </div>
    );
  };
}
function Piece({ Overlay, bg }) {
  const { T, CUES, playing } = useComposition();
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Archivo', sans-serif" }}>
      <Background T={T} playing={playing} mode={bg} />
      <Overlay T={T} CUES={CUES} />
    </div>
  );
}
window.StingerApp = makeApp(Stinger);
window.PopApp = makeApp(CenterPop);
