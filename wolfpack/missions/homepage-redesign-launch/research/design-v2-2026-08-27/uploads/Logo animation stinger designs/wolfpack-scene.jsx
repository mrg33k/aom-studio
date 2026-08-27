// Wolfpack Companies — stinger + brand bug
const { useComposition, Shot, Easing, animate, clamp } = window;

const BLUE = "#4c9cd4", INK = "#101216";

const MOTION = {
  enter: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutCubic }),
  pop:   (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeOutBack }),
  sweep: (from, to, start, end) => animate({ from, to, start, end, ease: Easing.easeInOutQuart }),
};

// Fake underlying content the stinger cuts between
function DemoContent({ T, CUES }) {
  const drift = 1.02 + 0.015 * Math.sin(T * 0.5);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(135deg,#1b2530,#0d1219)" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${drift})`,
        background: "radial-gradient(900px 500px at 30% 40%, rgba(76,156,212,.18), transparent 65%), radial-gradient(700px 600px at 75% 70%, rgba(255,255,255,.05), transparent 60%)" }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.35)", fontFamily: "'Archivo', sans-serif" }}>
          <div style={{ fontSize: 30, letterSpacing: "0.35em", fontWeight: 600 }}>YOUR CONTENT</div>
          <div style={{ fontSize: 20, letterSpacing: "0.12em", marginTop: 14, opacity: 0.7 }}>the stinger covers the cut between scenes</div>
        </div>
      </div>
    </div>
  );
}

// Full-screen stinger: skewed panels sweep in, logo rides the cover, panels sweep out
function Stinger({ T, CUES }) {
  const tIn = CUES.WipeIn, tHold = CUES.Hold, tOut = CUES.WipeOut, tEnd = CUES.Bug;
  // panel travel: x from -130% (offscreen left) to 0 (cover) to 130% (offscreen right)
  const panelX = (lead) => {
    const inX = MOTION.sweep(-130, 0, tIn + lead, tIn + lead + 0.55)(T);
    const outX = MOTION.sweep(0, 130, tOut + lead, tOut + lead + 0.55)(T);
    return T < tOut ? inX : outX;
  };
  const blackX = panelX(0), blueX = panelX(0.12), whiteX = panelX(0.24);
  // logo: pops once white panel covers, exits with the sweep
  const covered = tIn + 0.85;
  const popS = MOTION.pop(0.35, 1, covered - 0.15, covered + 0.45)(T);
  const popO = MOTION.enter(0, 1, covered - 0.15, covered + 0.2)(T);
  const exitX = MOTION.sweep(0, 1400, tOut + 0.05, tOut + 0.6)(T);
  const exitO = MOTION.enter(1, 0, tOut + 0.35, tOut + 0.6)(T);
  const holdZoom = 1 + 0.03 * clamp((T - covered) / Math.max(0.001, tEnd - covered), 0, 1);
  const wordY = MOTION.enter(46, 0, covered + 0.1, covered + 0.6)(T);
  const wordO = MOTION.enter(0, 1, covered + 0.1, covered + 0.55)(T);
  const skew = "skewX(-14deg)";
  const panel = (x, bg, z) => (
    <div style={{ position: "absolute", top: "-10%", bottom: "-10%", left: "-20%", right: "-20%",
      background: bg, zIndex: z, transform: `translateX(${x}%) ${skew}` }} />
  );
  return (
    <Shot from={tIn - 0.01} to={tOut + 0.85}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {panel(blackX, INK, 1)}
        {panel(blueX, BLUE, 2)}
        {panel(whiteX, "#ffffff", 3)}
        <div style={{ position: "absolute", inset: 0, zIndex: 4, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 26,
          transform: `translateX(${exitX}px) scale(${holdZoom})`, opacity: exitO }}>
          <img src="assets/logo-mark.png" style={{ width: 430, transform: `scale(${popS})`, opacity: popO }} />
          <img src="assets/logo-word.png" style={{ width: 500, transform: `translateY(${wordY}px)`, opacity: wordO }} />
        </div>
      </div>
    </Shot>
  );
}

// Small corner bug for brand recognition mid-video
function Bug({ T, CUES, corner }) {
  const t0 = CUES.Bug + 0.5, t1 = CUES.Bug + 4.2;
  const inP = MOTION.pop(0, 1, t0, t0 + 0.6)(T);
  const outP = MOTION.sweep(1, 0, t1, t1 + 0.45)(T);
  const p = T < t1 ? inP : outP;
  const reveal = clamp((inP - 0.5) * 2, 0, 1);
  const pulse = 1 + 0.02 * Math.sin((T - t0) * 2.2);
  const isRight = corner.includes("right"), isBottom = corner.includes("bottom");
  const off = 120 * (1 - p);
  const pos = {
    [isBottom ? "bottom" : "top"]: 44,
    [isRight ? "right" : "left"]: 44,
  };
  return (
    <div style={{ position: "absolute", ...pos, zIndex: 6, opacity: p,
      transform: `translateX(${isRight ? off : -off}px) scale(${pulse})`, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,.94)",
        boxShadow: "0 8px 30px rgba(0,0,0,.35)", display: "grid", placeItems: "center" }}>
        <img src="assets/logo-mark.png" style={{ width: 84, marginTop: -4 }} />
      </div>
      <div style={{ overflow: "hidden" }}>
        <div style={{ fontFamily: "'Archivo', sans-serif", color: "#fff", textShadow: "0 2px 10px rgba(0,0,0,.5)",
          transform: `translateX(${-110 * (1 - reveal)}px)`, opacity: reveal }}>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.14em" }}>WOLFPACK</div>
          <div style={{ fontSize: 17, letterSpacing: "0.3em", opacity: 0.8 }}>COMPANIES LLC</div>
        </div>
      </div>
    </div>
  );
}

function WolfpackPiece({ bugCorner }) {
  const { T, CUES } = useComposition();
  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: "'Archivo', sans-serif" }}>
      <DemoContent T={T} CUES={CUES} />
      <Bug T={T} CUES={CUES} corner={bugCorner || "bottom-right"} />
      <Stinger T={T} CUES={CUES} />
    </div>
  );
}
window.WolfpackPiece = WolfpackPiece;

function WolfpackApp() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <window.CompositionStage width={1920} height={1080} bg="#0d1219"
        scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <WolfpackPiece bugCorner={t.bugCorner} />
      </window.CompositionStage>
      <window.TweaksPanel>
        <window.TweakSection label="Brand bug" />
        <window.TweakRadio label="Corner" value={t.bugCorner}
          options={["bottom-right", "bottom-left", "top-right"]}
          onChange={(v) => setTweak("bugCorner", v)} />
        <window.TweakSection label="Editor" />
        <window.TweakToggle label="Motion editor" value={t.motionEditor}
          onChange={(v) => setTweak("motionEditor", v)} />
      </window.TweaksPanel>
    </div>
  );
}
window.WolfpackApp = WolfpackApp;
