import React, { useState, useEffect } from 'react';

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * HubScreen — Between-phase action hub.
 *
 * The "Oregon Trail moment": appears after each investigation phase completes
 * and before the next phase begins. Lets cadets review their situation, spend
 * optional resources, or just continue forward.
 *
 * Props:
 *   phaseContext   {string}   Summary of where the cadet is, e.g. "Phoenix complete. 2 regions remain."
 *   currentResources {Object|null} investigationResources from game state
 *   regionsCompleted {number} how many investigation regions are done
 *   regionsTotal   {number}  total investigation regions (3 for ch1)
 *   completedPhaseIds {string[]} list of completed phase IDs for map display
 *   onContinue     {function} advances to the next phase
 *   onOpenKit      {function} opens the Mission Kit overlay in HUD
 */
export default function HubScreen({
  phaseContext,
  currentResources,
  regionsCompleted,
  regionsTotal,
  completedPhaseIds,
  onContinue,
  onOpenKit,
}) {
  const [pace, setPace] = useState('thorough'); // 'thorough' | 'efficient'
  const [showMap, setShowMap] = useState(false);
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

  // Phase map pills
  const regionPhases = [
    { id: 'ch1_phoenix_arrive', label: 'PHOENIX' },
    { id: 'ch1_mumbai_arrive', label: 'MUMBAI' },
    { id: 'ch1_sao_paulo_arrive', label: 'SÃO PAULO' },
  ];

  // Per-card gradient backgrounds — unique to each option
  const cardGradients = {
    continue:        'linear-gradient(135deg, rgba(0,229,204,0.12) 0%, rgba(0,90,80,0.18) 60%, rgba(7,11,20,0.85) 100%)',
    kit:             'linear-gradient(135deg, rgba(255,183,3,0.10) 0%, rgba(120,70,0,0.15) 60%, rgba(7,11,20,0.85) 100%)',
    map:             'linear-gradient(135deg, rgba(26,144,255,0.10) 0%, rgba(10,40,100,0.18) 60%, rgba(7,11,20,0.85) 100%)',
    pace:            'linear-gradient(135deg, rgba(160,80,255,0.10) 0%, rgba(60,10,100,0.15) 60%, rgba(7,11,20,0.85) 100%)',
    field_interview: 'linear-gradient(135deg, rgba(255,80,80,0.09) 0%, rgba(100,20,20,0.14) 60%, rgba(7,11,20,0.85) 100%)',
    lab_analysis:    'linear-gradient(135deg, rgba(0,180,255,0.10) 0%, rgba(0,60,120,0.15) 60%, rgba(7,11,20,0.85) 100%)',
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
      action: () => setShowMap((v) => !v),
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
  ];

  return (
    <div style={styles.root}>
      {/* ── Keyframes for card entrance flicker ── */}
      <style>{`
        @keyframes hub-card-flicker {
          0%   { opacity: 0;   }
          25%  { opacity: 0.3; }
          100% { opacity: 1;   }
        }
        @media (prefers-reduced-motion: reduce) {
          .hub-card { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
      {/* ── Space background ── */}
      <img
        src="/mission-water/chapter-1/backgrounds/ch1_intro_earth.jpg"
        alt=""
        style={styles.bgImage}
        aria-hidden="true"
      />
      <div style={styles.bgOverlay} />

      {/* ── Main scrollable content ── */}
      <div style={styles.scrollLayer}>
        <div style={styles.centerFrame}>

          {/* Header — fades in immediately on mount */}
          <div style={{
            ...styles.header,
            opacity:    headerReady ? 1 : 0,
            transform:  headerReady ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 350ms ease, transform 350ms ease',
          }}>
            <div style={styles.headerAccentLine} />
            <div style={styles.headerKicker}>MISSION HUB</div>
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

              return (
                <div
                  key={opt.id}
                  className="hub-card"
                  style={{
                    opacity: 0,
                    animation: 'hub-card-flicker 200ms ease forwards',
                    animationDelay: `${200 + idx * 80}ms`,
                  }}
                >
                <div
                  onClick={isLocked ? undefined : opt.action}
                  onMouseEnter={() => !isLocked && setHoveredCard(opt.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    ...styles.card,
                    background: isLocked ? 'rgba(10,22,40,0.7)' : (cardGradients[opt.id] || styles.card.background),
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

                  {/* Map expansion */}
                  {opt.id === 'map' && showMap && (
                    <div style={styles.mapContainer}>
                      <div style={styles.mapPills}>
                        {regionPhases.map((rp) => {
                          const done = (completedPhaseIds || []).some(
                            (id) => id === rp.id || id === rp.id.replace('_arrive', '_findings')
                          );
                          // Current if not done but previous regions are done
                          const isCurrent = !done && (completedPhaseIds || []).length > 0
                            && !regionPhases.filter((x) => x.id !== rp.id).every(
                              (x) => !(completedPhaseIds || []).includes(x.id)
                            );
                          return (
                            <div
                              key={rp.id}
                              style={{
                                ...styles.mapPill,
                                ...(done ? styles.mapPillDone : {}),
                                ...(isCurrent ? styles.mapPillCurrent : {}),
                                ...(!done && !isCurrent ? styles.mapPillUpcoming : {}),
                              }}
                            >
                              {done && <span style={styles.mapPillCheck}>✓</span>}
                              {isCurrent && <span style={styles.mapPillDot} />}
                              {rp.label}
                            </div>
                          );
                        })}
                      </div>
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
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Blippy lower-left — slides in from right at 400ms ── */}
      <div style={{
        ...styles.blippy,
        opacity:    blippyReady ? 1 : 0,
        transform:  blippyReady ? 'translateX(0) scale(1)' : 'translateX(40px) scale(0.8)',
        transition: 'opacity 300ms ease-out, transform 300ms ease-out',
      }}>
        <div style={styles.blippyBubble}>
          <span style={styles.blippyText}>{blippyText}</span>
        </div>
        <BlippyAvatar />
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

// Simple SVG Blippy avatar placeholder
function BlippyAvatar() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={styles.blippysvg}>
      {/* Body */}
      <ellipse cx="40" cy="50" rx="24" ry="22" fill="#0A1628" stroke="#00E5CC" strokeWidth="1.5" />
      {/* Head */}
      <circle cx="40" cy="28" r="18" fill="#0A1628" stroke="#00E5CC" strokeWidth="1.5" />
      {/* Eyes */}
      <ellipse cx="33" cy="26" rx="3.5" ry="4" fill="#00E5CC" />
      <ellipse cx="47" cy="26" rx="3.5" ry="4" fill="#00E5CC" />
      {/* Pupils */}
      <circle cx="33" cy="27" r="1.5" fill="#070B14" />
      <circle cx="47" cy="27" r="1.5" fill="#070B14" />
      {/* Antenna */}
      <line x1="40" y1="10" x2="40" y2="2" stroke="#00E5CC" strokeWidth="1.5" />
      <circle cx="40" cy="2" r="2" fill="#00E5CC" />
      {/* Arms */}
      <line x1="16" y1="46" x2="6" y2="38" stroke="#00E5CC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="64" y1="46" x2="74" y2="38" stroke="#00E5CC" strokeWidth="1.5" strokeLinecap="round" />
      {/* Legs */}
      <line x1="32" y1="70" x2="28" y2="78" stroke="#00E5CC" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="48" y1="70" x2="52" y2="78" stroke="#00E5CC" strokeWidth="1.5" strokeLinecap="round" />
      {/* Smile */}
      <path d="M 33 33 Q 40 39 47 33" stroke="#00E5CC" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
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
    fontFamily: 'Rajdhani, sans-serif',
  },

  bgImage: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
  },

  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(7, 11, 20, 0.55)',
  },

  scrollLayer: {
    position: 'absolute',
    inset: 0,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 120px',
  },

  centerFrame: {
    width: '100%',
    maxWidth: 860,
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    textAlign: 'center',
    paddingTop: 16,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
  },

  headerAccentLine: {
    width: 48,
    height: 2,
    background: CYAN,
    boxShadow: `0 0 10px ${CYAN}`,
    marginBottom: 2,
  },

  headerAccentLineFull: {
    width: '100%',
    maxWidth: 480,
    height: 1,
    background: `linear-gradient(90deg, transparent, rgba(0,229,204,0.4), transparent)`,
    marginTop: 4,
  },

  headerKicker: {
    fontFamily: 'Orbitron, sans-serif',
    fontWeight: 900,
    fontSize: 22,
    letterSpacing: '0.35em',
    color: CYAN,
    textTransform: 'uppercase',
    textShadow: `0 0 20px rgba(0,229,204,0.6), 0 0 40px rgba(0,229,204,0.2)`,
  },

  headerContext: {
    fontFamily: 'Rajdhani, sans-serif',
    fontWeight: 600,
    fontSize: 16,
    color: 'rgba(232,240,248,0.75)',
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 14,
    // Mobile: single column via @media not available inline, use JS style below
  },

  card: {
    background: 'rgba(10, 22, 40, 0.85)',
    border: `1px solid ${BORDER_CYAN}`,
    borderRadius: 4,
    padding: '18px 20px',
    cursor: 'pointer',
    minHeight: 120,
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },

  cardPrimary: {
    border: `2px solid ${CYAN}`,
    background: 'rgba(0, 229, 204, 0.06)',
  },

  cardHover: {
    borderColor: CYAN,
    boxShadow: `0 0 18px rgba(0, 229, 204, 0.25)`,
  },

  cardLocked: {
    opacity: 0.5,
    borderColor: 'rgba(232, 240, 248, 0.12)',
    cursor: 'not-allowed',
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

  // ── Map ───────────────────────────────────────────────────────────
  mapContainer: {
    marginTop: 4,
  },

  mapPills: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },

  mapPill: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    letterSpacing: '0.2em',
    padding: '5px 12px',
    borderRadius: 2,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    textTransform: 'uppercase',
  },

  mapPillDone: {
    background: 'rgba(0, 229, 204, 0.15)',
    border: `1px solid ${CYAN}`,
    color: CYAN,
  },

  mapPillCurrent: {
    background: 'rgba(0, 229, 204, 0.06)',
    border: `1px solid ${CYAN}`,
    color: TEXT_PRIMARY,
    animation: 'pulse 1.5s ease-in-out infinite',
  },

  mapPillUpcoming: {
    background: 'rgba(232, 240, 248, 0.04)',
    border: '1px solid rgba(232, 240, 248, 0.15)',
    color: 'rgba(232, 240, 248, 0.4)',
  },

  mapPillCheck: {
    color: CYAN,
    fontSize: 10,
  },

  mapPillDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: CYAN,
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

  // ── Blippy ───────────────────────────────────────────────────────
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

  blippysvg: {
    flexShrink: 0,
  },
};
