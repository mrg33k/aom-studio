import React, { useState, useEffect } from 'react';

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * HubScreen — Between-phase action hub.
 *
 * R16: Added MISSION MANIFEST overlay (7th option) with chapter progress,
 * badge inventory, and resource stats. Sidebar replaced entirely by this overlay.
 *
 * Props:
 *   phaseContext   {string}   Summary of where the cadet is
 *   currentResources {Object|null} investigationResources from game state
 *   regionsCompleted {number} how many investigation regions are done
 *   regionsTotal   {number}  total investigation regions (3 for ch1)
 *   completedPhaseIds {string[]} list of completed phase IDs for map display
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
  activeChapter = 1,
  onContinue,
  onOpenKit,
  onJumpToPhase,
}) {
  const [pace, setPace] = useState('thorough'); // 'thorough' | 'efficient'
  const [showMap, setShowMap] = useState(false);
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
    manifest:        'linear-gradient(135deg, rgba(255,183,3,0.12) 0%, rgba(120,70,0,0.18) 60%, rgba(7,11,20,0.85) 100%)',
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
    {
      id: 'manifest',
      icon: '◫',
      title: 'MISSION MANIFEST',
      description: 'Chapter progress, badge inventory, mission stats, and chapter navigation.',
      free: true,
      action: () => setShowManifest(true),
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

      {/* ── Blippy lower-left — slides in from right at 400ms ── */}
      {!showManifest && (
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
      )}
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
