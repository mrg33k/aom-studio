// Wolfpack v2 — vertical 9:16, circle-expand stinger + center pop, over user footage
const { useComposition, Shot, Easing, animate, clamp } = window;

const BLUE = "#4c9cd4", INK = "#101216";
const W = 1080, H = 1920, MAXR = Math.hypot(W, H) / 2 + 40;

const MOTION = {
  enter: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutCubic }),
  slam:  (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutBack }),
  burst: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeInOutQuart }),
};

// decaying shake after an impact moment
function shake(T, at, amp) {
  const dt = T - at;
  if (dt < 0 || dt > 0.5) return { x: 0, y: 0 };
  const decay = (1 - dt / 0.5) ** 2 * amp;
  return { x: Math.sin(dt * 90) * decay, y: Math.cos(dt * 70) * decay * 0.7 };
}

// User footage, kept in sync with the authored clock
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

function Ring({ r, w, color, o }) {
  return <div style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2,
    marginLeft: -r, marginTop: -r, borderRadius: "50%", border: `${w}px solid ${color}`, opacity: o }} />;
}

// Circle-expand stinger: blue disc bursts out, white swallows frame, logo slams in, circle collapses out
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
  const ring1 = MOTION.burst(120, 640, impact, impact + 0.5)(T);
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
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
            <div style={{ transform: `scale(${markS * outS}) rotate(${markRot}deg)`, opacity: markO * outO }}>
              <img src="assets/logo-mark.png" style={{ width: 620, display: "block" }} />
            </div>
            <img src="assets/logo-word.png" style={{ width: 660, transform: `translateY(${wordY}px) scale(${outS})`, opacity: wordO * outO }} />
          </div>
        </div>
        <Ring r={ring1} w={10} color={INK} o={ring1o} />
      </div>
    </Shot>
  );
}

// Center pop: quick logo slam mid-video for brand recognition
function CenterPop({ T, CUES }) {
  const t0 = CUES.Pop + 0.4, t1 = CUES.Pop + 2.1;
  const inS = MOTION.slam(0, 1, t0, t0 + 0.35)(T);
  const outS = MOTION.burst(1, 0, t1, t1 + 0.3)(T);
  const s = T < t1 ? inS : outS;
  const rot = MOTION.slam(14, 0, t0, t0 + 0.4)(T);
  const wobble = 1 + 0.025 * Math.sin((T - t0) * 9) * Math.exp(-(T - t0) * 2.5);
  const ringR = MOTION.burst(140, 460, t0 + 0.08, t0 + 0.6)(T);
  const ringO = MOTION.enter(0.85, 0, t0 + 0.08, t0 + 0.6)(T);
  const sh = shake(T, t0 + 0.3, 8);
  return (
    <Shot from={t0 - 0.05} to={t1 + 0.35}>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center",
        transform: `translate(${sh.x}px,${sh.y}px)` }}>
        <Ring r={ringR} w={8} color="#ffffff" o={ringO} />
        <div style={{ width: 460, height: 460, borderRadius: "50%", background: "rgba(255,255,255,.96)",
          boxShadow: "0 20px 80px rgba(0,0,0,.45)", display: "grid", placeItems: "center",
          transform: `scale(${s * wobble}) rotate(${rot}deg)` }}>
          <img src="assets/logo-mark.png" style={{ width: 340, marginTop: -14 }} />
        </div>
      </div>
    </Shot>
  );
}

function WolfpackPiece() {
  const { T, CUES, playing } = useComposition();
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Archivo', sans-serif" }}>
      <Footage T={T} playing={playing} />
      <CenterPop T={T} CUES={CUES} />
      <Stinger T={T} CUES={CUES} />
    </div>
  );
}
window.WolfpackPiece = WolfpackPiece;

function WolfpackApp() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <window.CompositionStage width={1080} height={1920} bg="#0d1219"
        scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <WolfpackPiece />
      </window.CompositionStage>
      <window.TweaksPanel>
        <window.TweakSection label="Editor" />
        <window.TweakToggle label="Motion editor" value={t.motionEditor}
          onChange={(v) => setTweak("motionEditor", v)} />
      </window.TweaksPanel>
    </div>
  );
}
window.WolfpackApp = WolfpackApp;
