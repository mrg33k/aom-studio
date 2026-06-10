import React, { useState, useEffect, useRef } from 'react';

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── StarCanvas (space background — DESIGN.md Layer 1, same as RoleSelect) ───
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function StarCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rand = mulberry32(0xbeac0742);
    const LAYERS = [
      { count: 180, minR: 0.4, maxR: 1.1, minA: 0.25, maxA: 0.65, spd: 0.012 },
      { count: 70,  minR: 0.9, maxR: 2.0, minA: 0.50, maxA: 1.00, spd: 0.022 },
    ];
    let W = 0, H = 0, raf;
    let stars = [];
    function buildStars(w, h) {
      stars = [];
      for (const L of LAYERS) {
        for (let i = 0; i < L.count; i++) {
          stars.push({
            x: rand() * w, y: rand() * h,
            r: L.minR + rand() * (L.maxR - L.minR),
            a: L.minA + rand() * (L.maxA - L.minA),
            spd: L.spd * (0.7 + rand() * 0.6),
            dx: (rand() - 0.5) * 0.006,
          });
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.y -= s.spd; s.x += s.dx;
        if (s.y < -2) s.y = H + 2;
        if (s.x < -2) s.x = W + 2;
        if (s.x > W + 2) s.x = -2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      canvas.width = width; canvas.height = height;
      W = width; H = height;
      buildStars(W, H);
    });
    ro.observe(canvas);
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

/**
 * HubScreen — Between-phase action hub.
 *
 * R17: Same-world visual pass — starfield + scanlines replace the photo bg,
 * Cleo hub card art wired in (public/mission-water/hub/), real Blippy replaces
 * the SVG placeholder, MISSION MAP is now a real overlay built on the
 * holographic globe art with correct region states.
 *
 * Props:
 *   phaseContext   {string}   Summary of where the cadet is
 *   currentResources {Object|null} investigationResources from game state
 *   regionsCompleted {number} how many investigation regions are done
 *   regionsTotal   {number}  total investigation regions (3 for ch1)
 *   completedPhaseIds {string[]} list of completed phase IDs for map display
 *   nextPhaseId    {string|null} the phase the cadet is heading to (drives map "current")
 *   activeChapter  {number}  current chapter number (1, 2, 3)
 *   onContinue     {function} advances to the next phase
 *   onOpenKit      {function} opens the Mission Kit overlay in HUD
 *   onJumpToPhase  {function} jumps to a chapter's intro phase
 */
export default function HubScreen({
  phaseContext,
  currentResources,
  regionsCompleted,
  regionsTotal,
  completedPhaseIds,
  nextPhaseId = null,
  activeChapter = 1,
  onContinue,
  onOpenKit,
  onJumpToPhase,
}) {
  const [pace, setPace] = useState('thorough'); // 'thorough' | 'efficient'
  // DEV-ONLY deep-link for the /screens board: ?hubview=map opens the map overlay
  const [showMap, setShowMap] = useState(() =>
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('hubview') === 'map'
  );
  const [showManifest, setShowManifest] = useState(false); // R16: MISSION MANIFEST overlay
  const [fieldInterviewResult, setFieldInterviewResult] = useState(null);
  const [labAnalysisResult, setLabAnalysisResult] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  // ─── Entrance animation state ─────────────────────────────────────────────
  const [headerReady, setHeaderReady] = useState(REDUCED);
  const [blippyReady, setBlippyReady] = useState(REDUCED);

  useEffect(() => {
    if (REDUCED) return;
    const t0 = setTimeout(() => setHeaderReady(true), 0);
    const t1 = setTimeout(() => setBlippyReady(true), 400);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, []);

  // Resource token counts
  const communityTokens = currentResources?.community_partnerships ?? 0;
  const samplingTokens = currentResources?.sampling_kits ?? 0;

  // Blippy contextual lines based on progress
  const blippyLines = (() => {
    const ratio = regionsTotal > 0 ? regionsCompleted / regionsTotal : 0;
    if (ratio >= 0.66) {
      // Late stage: final region ahead
      return [
        "Final region ahead — council reveal incoming.",
        "Strong data so far, Cadet. The Council will want answers.",
        "Almost there. Make this last region count.",
      ];
    } else if (ratio >= 0.33) {
      // Mid stage: resources looking tight
      return [
        "Resources looking tight. Spend wisely.",
        "Halfway through the investigation, Cadet. Momentum counts.",
        "The data's building. Keep the pressure on.",
      ];
    }
    // Early stage
    return [
      "Keep pushing, Cadet.",
      "Strong start. Let's see what the next region reveals.",
      "The Council is watching. Don't let them down.",
    ];
  })();

  // Rotate through lines based on regions completed
  const blippyText = blippyLines[regionsCompleted % blippyLines.length];

  const spendFieldInterview = () => {
    if (communityTokens <= 0) return;
    // We don't actually decrement here — MissionWaterGame would need to track this.
    // For now, just show the inline result. The visual feedback is the key experience.
    setFieldInterviewResult(
      "A local rancher stops you. \"We used to rely on that aquifer for everything. Now we drill twice as deep and get half as much.\""
    );
  };

  const spendLabAnalysis = () => {
    if (samplingTokens <= 0) return;
    setLabAnalysisResult(
      "Water sample analysis: PFAS contamination detected at elevated levels. This data strengthens your case for the council."
    );
  };

  // Cleo hub card art (public/mission-water/hub/) — committed 63fa3ae7, wired R17
  const cardArt = {
    continue:        '/mission-water/hub/hub_continue.jpg',
    kit:             '/mission-water/hub/hub_review_kit.jpg',
    map:             '/mission-water/hub/hub_mission_map.jpg',
    pace:            '/mission-water/hub/hub_change_pace.jpg',
    field_interview: '/mission-water/hub/hub_field_interview.jpg',
    lab_analysis:    '/mission-water/hub/hub_lab_analysis.jpg',
    manifest:        null, // full-width text card, no art
  };

  const hubOptions = [
    {
      id: 'continue',
      icon: '▶',
      title: 'CONTINUE INVESTIGATION',
      description: 'Advance to the next investigation site. No resources spent.',
      free: true,
      primary: true,
      action: onContinue,
    },
    {
      id: 'kit',
      icon: '◈',
      title: 'REVIEW MISSION KIT',
      description: 'Check your remaining resources and earned discoveries.',
      free: true,
      action: () => {
        if (typeof onOpenKit === 'function') onOpenKit();
      },
    },
    {
      id: 'map',
      icon: '⌖',
      title: 'CHECK MISSION MAP',
      description: 'Review your investigation progress across all regions.',
      free: true,
      action: () => setShowMap(true),
    },
    {
      id: 'pace',
      icon: pace === 'thorough' ? '⏸' : '◉',
      title: 'CHANGE INVESTIGATION PACE',
      description:
        pace === 'thorough'
          ? 'THOROUGH — Deep analysis. Currently active.'
          : 'EFFICIENT — Fast scan. Currently active.',
      free: true,
      action: () => setPace((p) => (p === 'thorough' ? 'efficient' : 'thorough')),
    },
    {
      id: 'field_interview',
      icon: '◉',
      title: 'FIELD INTERVIEW',
      description: communityTokens > 0
        ? `Spend 1 community partnership token to speak with a local contact. (${communityTokens} remaining)`
        : 'No community partnership tokens remaining.',
      free: false,
      tokenType: 'community_partnerships',
      tokenCost: 1,
      tokenAvail: communityTokens,
      action: spendFieldInterview,
      result: fieldInterviewResult,
    },
    {
      id: 'lab_analysis',
      icon: '⬡',
      title: 'LAB ANALYSIS',
      description: samplingTokens > 0
        ? `Spend 1 sampling kit to run a water quality analysis. (${samplingTokens} remaining)`
        : 'No sampling kits remaining.',
      free: false,
      tokenType: 'sampling_kits',
      tokenCost: 1,
      tokenAvail: samplingTokens,
      action: spendLabAnalysis,
      result: labAnalysisResult,
    },
    {
      id: 'manifest',
      icon: '◫',
      title: 'MISSION MANIFEST',
      description: 'Chapter progress, badge inventory, mission stats, and chapter navigation.',
      free: true,
      fullWidth: true,
      action: () => setShowManifest(true),
    },
  ];

  return (
    <div style={styles.root}>
      {/* ── Keyframes for card entrance flicker + map pulse ── */}
      <style>{`
        @keyframes hub-card-flicker {
          0%   { opacity: 0;   }
          25%  { opacity: 0.3; }
          100% { opacity: 1;   }
        }
        @keyframes hub-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(0,229,204,0.45); }
          70%  { box-shadow: 0 0 0 8px rgba(0,229,204,0);  }
          100% { box-shadow: 0 0 0 0 rgba(0,229,204,0);    }
        }
        @keyframes hub-site-ping {
          0%   { transform: scale(0.6); opacity: 0.9; }
          100% { transform: scale(2.2); opacity: 0;   }
        }
        @media (prefers-reduced-motion: reduce) {
          .hub-card { animation: none !important; opacity: 1 !important; }
          .hub-map-current { animation: none !important; }
          .hub-site-ping { animation: none !important; opacity: 0 !important; }
        }
      `}</style>

      {/* ── Space background — starfield + scanlines, same world as RoleSelect ── */}
      <div style={styles.bgSpace}>
        <StarCanvas />
      </div>
      <div style={styles.scanlines} />

      {/* ── Main scrollable content ── */}
      <div style={styles.scrollLayer}>
        <div style={styles.centerFrame}>

          {/* Header — canon pattern: cyan kicker / white Orbitron title / dim sub */}
          <div style={{
            ...styles.header,
            opacity:    headerReady ? 1 : 0,
            transform:  headerReady ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 350ms ease, transform 350ms ease',
          }}>
            <div style={styles.headerKicker}>MISSION WATER — INVESTIGATION CHECKPOINT</div>
            <div style={styles.headerTitle}>MISSION HUB</div>
            <div style={styles.headerContext}>{phaseContext}</div>
            <div style={styles.headerAccentLineFull} />
            {/* Progress dots */}
            {regionsTotal > 0 && (
              <div style={styles.progressRow}>
                {Array.from({ length: regionsTotal }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.progressDot,
                      ...(i < regionsCompleted ? styles.progressDotDone : styles.progressDotPending),
                    }}
                  >
                    {i < regionsCompleted ? '●' : '○'}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Card grid: 2 columns on desktop, 1 column on mobile */}
          <div style={styles.cardGrid}>
            {hubOptions.map((opt, idx) => {
              const isLocked = !opt.free && (opt.tokenAvail ?? 0) <= 0;
              const isHovered = hoveredCard === opt.id;
              const hasResult = !!opt.result;
              const art = cardArt[opt.id];

              return (
                <div
                  key={opt.id}
                  className="hub-card"
                  style={{
                    opacity: 0,
                    animation: 'hub-card-flicker 200ms ease forwards',
                    animationDelay: `${200 + idx * 80}ms`,
                    ...(opt.fullWidth ? { gridColumn: '1 / -1' } : {}),
                  }}
                >
                <div
                  onClick={isLocked ? undefined : opt.action}
                  onMouseEnter={() => !isLocked && setHoveredCard(opt.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    ...styles.card,
                    ...(opt.primary ? styles.cardPrimary : {}),
                    ...(isLocked ? styles.cardLocked : {}),
                    ...(isHovered && !isLocked ? styles.cardHover : {}),
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                  }}
                  role="button"
                  tabIndex={isLocked ? -1 : 0}
                  aria-disabled={isLocked}
                  onKeyDown={(e) => {
                    if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      opt.action();
                    }
                  }}
                >
                  {/* Cleo art banner — dimmed, fades into the panel below */}
                  {art && (
                    <div style={styles.cardArtWrap} aria-hidden="true">
                      <img
                        src={art}
                        alt=""
                        loading="lazy"
                        style={{
                          ...styles.cardArtImg,
                          filter: isLocked
                            ? 'grayscale(1) brightness(0.45)'
                            : isHovered ? 'brightness(0.95)' : 'brightness(0.75)',
                        }}
                      />
                      <div style={styles.cardArtFade} />
                    </div>
                  )}

                  <div style={styles.cardBody}>
                    <div style={styles.cardHeader}>
                      <span style={styles.cardIcon}>{opt.icon}</span>
                      <span style={{
                        ...styles.cardTitle,
                        ...(opt.primary ? styles.cardTitlePrimary : {}),
                      }}>
                        {opt.title}
                      </span>
                      {isLocked && <span style={styles.lockedBadge}>LOCKED</span>}
                      {!opt.free && !isLocked && (
                        <span style={styles.costBadge}>−1 {tokenLabel(opt.tokenType)}</span>
                      )}
                    </div>

                    <p style={{
                      ...styles.cardDesc,
                      ...(isLocked ? styles.cardDescLocked : {}),
                    }}>
                      {opt.description}
                    </p>

                    {/* Inline result for field interview / lab analysis */}
                    {hasResult && (
                      <div style={styles.inlineResult}>
                        <div style={styles.inlineResultLine} />
                        <p style={styles.inlineResultText}>{opt.result}</p>
                      </div>
                    )}

                    {/* Pace toggle state */}
                    {opt.id === 'pace' && (
                      <div style={styles.paceToggle}>
                        <span style={{
                          ...styles.pacePill,
                          ...(pace === 'thorough' ? styles.pacePillActive : styles.pacePillDim),
                        }}>
                          THOROUGH
                        </span>
                        <span style={styles.paceSlash}>/</span>
                        <span style={{
                          ...styles.pacePill,
                          ...(pace === 'efficient' ? styles.pacePillActive : styles.pacePillDim),
                        }}>
                          EFFICIENT
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MISSION MAP overlay (R17 — holographic globe + region states) ── */}
      {showMap && (
        <MissionMap
          completedPhaseIds={completedPhaseIds || []}
          nextPhaseId={nextPhaseId}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* ── MISSION MANIFEST overlay (R16) ── */}
      {showManifest && (
        <MissionManifest
          activeChapter={activeChapter}
          completedPhaseIds={completedPhaseIds || []}
          regionsCompleted={regionsCompleted}
          regionsTotal={regionsTotal}
          currentResources={currentResources}
          onJumpToPhase={onJumpToPhase}
          onClose={() => setShowManifest(false)}
        />
      )}

      {/* ── Blippy lower-left — real Blippy art, same treatment as RoleSelect ── */}
      {!showManifest && !showMap && (
        <div style={{
          ...styles.blippy,
          opacity:    blippyReady ? 1 : 0,
          transform:  blippyReady ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.8)',
          transition: 'opacity 300ms ease-out, transform 300ms ease-out',
        }}>
          <div style={styles.blippyCircle}>
            <img
              src="/mission-water/welcome/blippy_welcome_pose.png"
              alt="Blippy"
              style={styles.blippyImg}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div style={styles.blippyBubble}>
            <span style={styles.blippyText}>{blippyText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MissionMap overlay (R17) ─────────────────────────────────────────────────
//
// The holographic globe (Cleo, hub_mission_map.jpg) with the three Ch1
// investigation sites pinned over it. Region state:
//   done     — arrive phase in history and not the current target
//   current  — region of nextPhaseId (where the cadet is heading / investigating)
//   upcoming — everything else

const MAP_REGIONS = [
  // x/y = pin position over the globe art (percent of the image box),
  // matched to the glow points Cleo painted into hub_mission_map.jpg
  { key: 'ch1_phoenix',   label: 'PHOENIX',    sub: 'ARIZONA, USA',    x: 29.5, y: 30 },
  { key: 'ch1_sao_paulo', label: 'SÃO PAULO',  sub: 'BRAZIL',          x: 54.5, y: 67 },
  { key: 'ch1_mumbai',    label: 'MUMBAI',     sub: 'INDIA',           x: 76,   y: 32 },
];

function regionOfPhase(phaseId) {
  if (!phaseId) return null;
  const m = MAP_REGIONS.find((r) => phaseId.startsWith(r.key));
  return m ? m.key : null;
}

function MissionMap({ completedPhaseIds, nextPhaseId, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  const currentRegion = regionOfPhase(nextPhaseId);

  const stateOf = (regionKey) => {
    if (regionKey === currentRegion) return 'current';
    const arrived = completedPhaseIds.includes(`${regionKey}_arrive`);
    const reviewed = completedPhaseIds.includes(`${regionKey}_findings`);
    if (arrived || reviewed) return 'done';
    return 'upcoming';
  };

  const stateColor = { done: CYAN, current: '#FFFFFF', upcoming: 'rgba(232,240,248,0.4)' };

  return (
    <div
      style={styles.mapOverlayRoot}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.mapBackdrop} onClick={onClose} />

      <div style={{
        ...styles.mapPanel,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}>
        {/* Header */}
        <div style={styles.mapHeaderRow}>
          <div>
            <div style={styles.mapKicker}>ORBITAL TRACKING — CHAPTER 01</div>
            <div style={styles.mapTitle}>MISSION MAP</div>
          </div>
          <button onClick={onClose} style={styles.mapCloseBtn}>CLOSE</button>
        </div>

        {/* Globe with site pins */}
        <div style={styles.mapGlobeWrap}>
          <img
            src="/mission-water/hub/hub_mission_map.jpg"
            alt="Holographic Earth with investigation sites"
            style={styles.mapGlobeImg}
          />
          {MAP_REGIONS.map((r) => {
            const st = stateOf(r.key);
            return (
              <div key={r.key} style={{ ...styles.mapPin, left: `${r.x}%`, top: `${r.y}%` }}>
                {st === 'current' && (
                  <span className="hub-site-ping" style={styles.mapPinPing} />
                )}
                <span style={{
                  ...styles.mapPinDot,
                  background: st === 'upcoming' ? 'rgba(232,240,248,0.7)' : CYAN,
                  boxShadow: st === 'upcoming' ? '0 0 6px rgba(232,240,248,0.5)' : `0 0 10px ${CYAN}`,
                }} />
                <span style={{
                  ...styles.mapPinLabel,
                  color: st === 'upcoming' ? 'rgba(232,240,248,0.85)' : stateColor[st],
                  textShadow: st === 'upcoming'
                    ? '0 1px 4px rgba(7,11,20,0.9), 0 0 10px rgba(7,11,20,0.9)'
                    : '0 1px 4px rgba(7,11,20,0.9), 0 0 8px rgba(0,229,204,0.6)',
                }}>
                  {r.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Region status rows */}
        <div style={styles.mapLegendCol}>
          {MAP_REGIONS.map((r) => {
            const st = stateOf(r.key);
            return (
              <div
                key={r.key}
                className={st === 'current' ? 'hub-map-current' : ''}
                style={{
                  ...styles.mapLegendRow,
                  borderColor: st === 'current' ? CYAN
                    : st === 'done' ? 'rgba(0,229,204,0.35)'
                    : 'rgba(232,240,248,0.12)',
                  background: st === 'current' ? 'rgba(0,229,204,0.08)'
                    : st === 'done' ? 'rgba(0,229,204,0.04)'
                    : 'transparent',
                  animation: st === 'current' && !REDUCED ? 'hub-pulse 2s ease-out infinite' : 'none',
                }}
              >
                <span style={{ ...styles.mapLegendStatus, color: stateColor[st] }}>
                  {st === 'done' ? '✓' : st === 'current' ? '◉' : '○'}
                </span>
                <span style={{ ...styles.mapLegendLabel, color: st === 'upcoming' ? 'rgba(232,240,248,0.45)' : '#FFFFFF' }}>
                  {r.label}
                </span>
                <span style={styles.mapLegendSub}>{r.sub}</span>
                <span style={{
                  ...styles.mapLegendState,
                  color: st === 'done' ? CYAN : st === 'current' ? '#FFFFFF' : 'rgba(232,240,248,0.35)',
                }}>
                  {st === 'done' ? 'ANALYZED' : st === 'current' ? 'IN PROGRESS' : 'AWAITING'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MissionManifest overlay ──────────────────────────────────────────────────

const CHAPTER_DATA = [
  {
    n: 1,
    title: 'Earth Is Running Out',
    subtitle: 'Water crisis investigation across 3 global sites',
    startPhase: 'ch1_intro',
    badgeCount: 3,
    milestones: ['Phoenix analyzed', 'Mumbai analyzed', 'São Paulo analyzed', 'Council briefed'],
  },
  {
    n: 2,
    title: 'The Journey to the Moon',
    subtitle: 'Shuttle mission — charting a path to lunar water',
    startPhase: 'ch2_intro',
    badgeCount: 4,
    milestones: ['Light Side traversal', 'Terminator crossing', 'Far Dark navigation', 'Water Ice discovery'],
  },
  {
    n: 3,
    title: 'The Moon Holds the Answer',
    subtitle: 'Lunar base — extraction and settlement',
    startPhase: null, // locked
    badgeCount: 0,
    milestones: ['Lunar landing', 'Ice extraction', 'Base established', 'Mission complete'],
  },
];

function MissionManifest({
  activeChapter,
  completedPhaseIds,
  regionsCompleted,
  regionsTotal,
  currentResources,
  onJumpToPhase,
  onClose,
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  // Determine chapter states
  const getChapterState = (n) => {
    if (n < activeChapter) return 'done';
    if (n === activeChapter) return 'active';
    if (n === activeChapter + 1) return 'available';
    return 'locked';
  };

  const arriveIds = ['ch1_phoenix_arrive', 'ch1_mumbai_arrive', 'ch1_sao_paulo_arrive'];
  const completedArrive = arriveIds.filter(id => completedPhaseIds.includes(id)).length;

  // Get badge count earned in chapter 1 based on completed arrive phases
  const ch1BadgesEarned = completedArrive; // 1 badge per region investigated

  const resources = currentResources || {};
  const communityTokens = resources.community_partnerships ?? 0;
  const samplingKits = resources.sampling_kits ?? 0;
  const dataAccess = resources.data_access ?? 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(7,11,20,0.7)',
        backdropFilter: 'blur(4px)',
      }} onClick={onClose} />

      {/* Panel — slides in from right */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: 'min(480px, 95vw)',
        height: '100%',
        overflowY: 'auto',
        background: 'rgba(5,8,18,0.97)',
        borderLeft: '1px solid rgba(0,229,204,0.25)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
        padding: '32px 28px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(40px)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 9, letterSpacing: '0.35em', color: CYAN, textTransform: 'uppercase', marginBottom: 8 }}>
              MISSION MANIFEST
            </div>
            <div style={{ fontFamily: '"Orbitron", sans-serif', fontWeight: 700, fontSize: 20, color: '#FFFFFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              CHAPTER COMPASS
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0,229,204,0.3)',
              color: CYAN,
              fontFamily: '"Orbitron", sans-serif',
              fontSize: 12,
              letterSpacing: '0.15em',
              padding: '8px 14px',
              borderRadius: 2,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,229,204,0.5), transparent)' }} />

        {/* Chapter rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 9, letterSpacing: '0.3em', color: 'rgba(200,216,240,0.5)', textTransform: 'uppercase', marginBottom: 4 }}>
            CHAPTERS
          </div>
          {CHAPTER_DATA.map((ch) => {
            const state = getChapterState(ch.n);
            const isActive = state === 'active';
            const isDone = state === 'done';
            const isAvailable = state === 'available';
            const isLocked = state === 'locked';
            const badgesEarned = ch.n === 1 ? ch1BadgesEarned : (isDone ? ch.badgeCount : 0);
            const progressPct = ch.n === 1
              ? Math.round((regionsCompleted / Math.max(regionsTotal, 1)) * 100)
              : isDone ? 100 : 0;

            return (
              <div key={ch.n} style={{
                border: `1px solid ${isActive ? 'rgba(0,229,204,0.5)' : isDone ? 'rgba(0,229,204,0.25)' : isAvailable ? 'rgba(255,183,3,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 4,
                padding: '16px 18px',
                background: isActive ? 'rgba(0,229,204,0.06)' : isDone ? 'rgba(0,229,204,0.03)' : isAvailable ? 'rgba(255,183,3,0.05)' : 'transparent',
                opacity: isLocked ? 0.45 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}>
                {/* Chapter header */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 10, letterSpacing: '0.18em', color: AMBER, flexShrink: 0 }}>
                    0{ch.n}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: '"Rajdhani", sans-serif', fontWeight: 700, fontSize: 15, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                      {ch.title}
                    </div>
                    <div style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 12, color: 'rgba(200,216,240,0.55)', marginTop: 3 }}>
                      {ch.subtitle}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: '"Orbitron", sans-serif',
                    fontSize: 8,
                    letterSpacing: '0.18em',
                    color: isActive ? CYAN : isDone ? CYAN : isAvailable ? AMBER : 'rgba(255,255,255,0.3)',
                    flexShrink: 0,
                  }}>
                    {isActive ? '— ACTIVE' : isDone ? '— REPLAY' : isAvailable ? '— START' : '— SOON'}
                  </div>
                </div>

                {/* Progress bar (active chapter only) */}
                {(isActive || isDone) && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(200,216,240,0.5)' }}>
                        PROGRESS
                      </span>
                      <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 8, letterSpacing: '0.15em', color: CYAN }}>
                        {progressPct}%
                      </span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(0,229,204,0.12)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: CYAN, borderRadius: 2, boxShadow: `0 0 6px ${CYAN}`, transition: 'width 600ms ease' }} />
                    </div>
                  </div>
                )}

                {/* Milestone list (active chapter) */}
                {isActive && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {ch.milestones.map((ms, i) => {
                      const done = ch.n === 1 ? i < regionsCompleted : false;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: done ? CYAN : 'rgba(200,216,240,0.25)', lineHeight: 1 }}>
                            {done ? '✓' : '○'}
                          </span>
                          <span style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 13, color: done ? 'rgba(200,216,240,0.85)' : 'rgba(200,216,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {ms}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Badge count */}
                {ch.badgeCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(200,216,240,0.4)' }}>BADGES</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: ch.badgeCount }).map((_, i) => (
                        <span key={i} style={{
                          width: 18, height: 18, borderRadius: '50%',
                          border: `1px solid ${i < badgesEarned ? AMBER : 'rgba(255,183,3,0.2)'}`,
                          background: i < badgesEarned ? 'rgba(255,183,3,0.15)' : 'transparent',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8, color: i < badgesEarned ? AMBER : 'rgba(255,183,3,0.2)',
                        }}>
                          {i < badgesEarned ? '★' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Jump button */}
                {!isLocked && typeof onJumpToPhase === 'function' && ch.startPhase && (
                  <button
                    onClick={() => { onJumpToPhase(ch.startPhase); onClose(); }}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'transparent',
                      border: `1px solid ${isActive ? 'rgba(0,229,204,0.35)' : isAvailable ? 'rgba(255,183,3,0.45)' : 'rgba(0,229,204,0.25)'}`,
                      color: isActive ? CYAN : AMBER,
                      fontFamily: '"Orbitron", sans-serif',
                      fontSize: 9,
                      letterSpacing: '0.2em',
                      padding: '7px 14px',
                      borderRadius: 2,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isDone ? 'REPLAY CHAPTER' : isActive ? 'RESTART CHAPTER' : 'START CHAPTER'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(0,229,204,0.3), transparent)' }} />

        {/* Resource inventory */}
        <div>
          <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 9, letterSpacing: '0.3em', color: 'rgba(200,216,240,0.5)', textTransform: 'uppercase', marginBottom: 14 }}>
            FIELD INVENTORY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Community Partnerships', value: communityTokens, max: 5, icon: '◉', color: 'rgba(255,120,60,0.8)' },
              { label: 'Sampling Kits', value: samplingKits, max: 5, icon: '⬡', color: 'rgba(0,180,255,0.8)' },
              { label: 'Data Access Tokens', value: dataAccess, max: 5, icon: '◈', color: AMBER },
            ].map((res) => (
              <div key={res.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontFamily: '"Rajdhani", sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(200,216,240,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {res.icon} {res.label}
                  </span>
                  <span style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 10, color: res.color }}>
                    {res.value}/{res.max}
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${(res.value / res.max) * 100}%`, background: res.color, borderRadius: 2, transition: 'width 400ms ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conrad Foundation footer */}
        <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(0,229,204,0.08)' }}>
          <div style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 8, letterSpacing: '0.15em', color: 'rgba(200,216,240,0.3)', lineHeight: 1.8, textTransform: 'uppercase' }}>
            Built for Nancy Conrad.<br/>Conrad Foundation × Ahead of Market.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function tokenLabel(type) {
  if (!type) return '';
  if (type === 'community_partnerships') return 'PARTNER';
  if (type === 'sampling_kits') return 'KIT';
  if (type === 'data_access') return 'DATA';
  return type.toUpperCase().slice(0, 4);
}

// ─── styles ──────────────────────────────────────────────────────────────────

const CYAN = '#00E5CC';
const AMBER = '#FFB703';
const SPACE_DARK = '#070B14';
const PANEL_BG = '#0A1628';
const TEXT_PRIMARY = '#E8F0F8';
const TEXT_DIM = 'rgba(232, 240, 248, 0.55)';
const BORDER_CYAN = 'rgba(0, 229, 204, 0.2)';

const styles = {
  root: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    overflow: 'hidden',
    background: SPACE_DARK,
    fontFamily: 'Rajdhani, sans-serif',
  },

  bgSpace: {
    position: 'absolute',
    inset: 0,
    background: SPACE_DARK,
  },

  scanlines: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.18) 3px, rgba(0,0,0,0.18) 4px)',
    zIndex: 1,
  },

  scrollLayer: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 120px',
    zIndex: 2,
  },

  centerFrame: {
    width: '100%',
    maxWidth: 860,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },

  // ── Header — canon pattern (matches RoleSelect / BudgetPlanning) ──
  header: {
    textAlign: 'center',
    paddingTop: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },

  headerKicker: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    letterSpacing: '0.3em',
    color: CYAN,
    textTransform: 'uppercase',
  },

  headerTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontWeight: 700,
    fontSize: 26,
    letterSpacing: '0.08em',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  headerAccentLineFull: {
    width: '100%',
    maxWidth: 480,
    height: 1,
    background: `linear-gradient(90deg, transparent, rgba(0,229,204,0.4), transparent)`,
    marginTop: 4,
  },

  headerContext: {
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 600,
    fontSize: 15,
    color: TEXT_DIM,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },

  // ── Progress dots ────────────────────────────────────────────────
  progressRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginTop: 4,
  },

  progressDot: {
    fontFamily: 'monospace',
    fontSize: 16,
    lineHeight: 1,
  },

  progressDotDone: {
    color: CYAN,
    textShadow: `0 0 8px ${CYAN}`,
  },

  progressDotPending: {
    color: 'rgba(232,240,248,0.3)',
  },

  // ── Card grid ────────────────────────────────────────────────────
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 14,
  },

  card: {
    background: PANEL_BG,
    border: `1px solid ${BORDER_CYAN}`,
    borderRadius: 4,
    cursor: 'pointer',
    minHeight: 120,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  cardPrimary: {
    border: `2px solid ${CYAN}`,
    boxShadow: '0 0 18px rgba(0,229,204,0.18)',
  },

  cardHover: {
    borderColor: CYAN,
    boxShadow: `0 0 18px rgba(0, 229, 204, 0.25)`,
  },

  cardLocked: {
    opacity: 0.55,
    borderColor: 'rgba(232, 240, 248, 0.12)',
    cursor: 'not-allowed',
  },

  // Cleo art banner on each card
  cardArtWrap: {
    position: 'relative',
    width: '100%',
    height: 92,
    flexShrink: 0,
    overflow: 'hidden',
  },

  cardArtImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block',
    transition: 'filter 0.15s ease',
  },

  cardArtFade: {
    position: 'absolute',
    inset: 0,
    background: `linear-gradient(to bottom, rgba(10,22,40,0.1) 0%, rgba(10,22,40,0.25) 60%, ${PANEL_BG} 100%)`,
    pointerEvents: 'none',
  },

  cardBody: {
    padding: '14px 20px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },

  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  cardIcon: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    lineHeight: 1,
    flexShrink: 0,
    color: CYAN,
    textShadow: `0 0 8px rgba(0,229,204,0.5)`,
    width: 28,
    textAlign: 'center',
  },

  cardTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.2em',
    color: TEXT_PRIMARY,
    textTransform: 'uppercase',
    flex: 1,
  },

  cardTitlePrimary: {
    color: CYAN,
  },

  lockedBadge: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 8,
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.35)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 2,
    padding: '2px 6px',
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  costBadge: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 8,
    letterSpacing: '0.12em',
    color: AMBER,
    border: `1px solid rgba(255, 183, 3, 0.4)`,
    borderRadius: 2,
    padding: '2px 6px',
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  cardDesc: {
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 400,
    fontSize: 14,
    lineHeight: 1.5,
    color: TEXT_DIM,
    margin: 0,
  },

  cardDescLocked: {
    color: 'rgba(232, 240, 248, 0.3)',
  },

  // ── Inline result ─────────────────────────────────────────────────
  inlineResult: {
    marginTop: 4,
  },

  inlineResultLine: {
    height: 1,
    background: `rgba(0, 229, 204, 0.25)`,
    marginBottom: 10,
  },

  inlineResultText: {
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.6,
    color: TEXT_PRIMARY,
    margin: 0,
    fontStyle: 'italic',
  },

  // ── Mission Map overlay ───────────────────────────────────────────
  mapOverlayRoot: {
    position: 'fixed',
    inset: 0,
    zIndex: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  mapBackdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(7,11,20,0.8)',
  },

  mapPanel: {
    position: 'relative',
    zIndex: 1,
    width: 'min(680px, 96vw)',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: 'rgba(5,8,18,0.97)',
    border: '1px solid rgba(0,229,204,0.25)',
    borderRadius: 4,
    boxShadow: '0 0 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,229,204,0.08)',
    padding: '24px 26px 26px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },

  mapHeaderRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },

  mapKicker: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    letterSpacing: '0.35em',
    color: CYAN,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  mapTitle: {
    fontFamily: 'Orbitron, sans-serif',
    fontWeight: 700,
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },

  mapCloseBtn: {
    background: 'transparent',
    border: '1px solid rgba(0,229,204,0.3)',
    color: CYAN,
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 12,
    letterSpacing: '0.15em',
    padding: '8px 14px',
    borderRadius: 2,
    cursor: 'pointer',
    flexShrink: 0,
  },

  mapGlobeWrap: {
    position: 'relative',
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    border: '1px solid rgba(0,229,204,0.15)',
  },

  mapGlobeImg: {
    width: '100%',
    display: 'block',
  },

  mapPin: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    pointerEvents: 'none',
  },

  mapPinPing: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: '50%',
    border: `2px solid ${CYAN}`,
    animation: 'hub-site-ping 1.6s ease-out infinite',
  },

  mapPinDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },

  mapPinLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },

  mapLegendCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  mapLegendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1px solid',
    borderRadius: 4,
    padding: '10px 14px',
  },

  mapLegendStatus: {
    fontSize: 12,
    width: 16,
    textAlign: 'center',
    flexShrink: 0,
  },

  mapLegendLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  mapLegendSub: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    letterSpacing: '0.1em',
    color: 'rgba(232,240,248,0.4)',
    textTransform: 'uppercase',
    flex: 1,
  },

  mapLegendState: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 8,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  // ── Pace toggle ────────────────────────────────────────────────────
  paceToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },

  pacePill: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    letterSpacing: '0.15em',
    padding: '4px 10px',
    borderRadius: 2,
    border: `1px solid`,
    textTransform: 'uppercase',
    transition: 'all 0.15s ease',
  },

  pacePillActive: {
    color: CYAN,
    borderColor: CYAN,
    background: 'rgba(0, 229, 204, 0.1)',
  },

  pacePillDim: {
    color: 'rgba(232, 240, 248, 0.35)',
    borderColor: 'rgba(232, 240, 248, 0.15)',
    background: 'transparent',
  },

  paceSlash: {
    color: TEXT_DIM,
    fontSize: 13,
  },

  // ── Blippy — real art in cyan porthole (matches RoleSelect) ───────
  blippy: {
    position: 'fixed',
    bottom: 24,
    left: 24,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 250,
    maxWidth: 320,
  },

  blippyCircle: {
    flexShrink: 0,
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: `2px solid ${CYAN}`,
    overflow: 'hidden',
    background: 'rgba(0,229,204,0.06)',
    boxShadow: `0 0 12px rgba(0,229,204,0.20)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  blippyImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  blippyBubble: {
    background: 'rgba(7, 11, 20, 0.92)',
    border: `1px solid ${CYAN}`,
    borderRadius: '8px 8px 8px 0',
    padding: '10px 14px',
    maxWidth: 220,
  },

  blippyText: {
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 600,
    fontSize: 13,
    color: TEXT_PRIMARY,
    lineHeight: 1.5,
  },
};
