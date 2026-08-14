import React, { useState, useEffect } from 'react';
import StarCanvas from './StarCanvas.jsx';
import { SUPPLY_DEFS, SUPPLY_MAX } from './PhaseManager.js';

// ─── prefers-reduced-motion ───────────────────────────────────────────────────
const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * HubScreen — Between-phase action hub.
 *
 * R18b: the Oregon Trail checkpoint. Field Interview / Lab Analysis actually
 * spend tokens (and tools) now, the pace toggle drives real drain + bonus,
 * and the new SUPPLY STORE converts Mission Credits into supplies. The old
 * kit + manifest cards collapsed into the persistent MANIFEST tab.
 *
 * Props:
 *   phaseContext   {string}   Summary of where the cadet is
 *   currentResources {Object|null} investigation tokens from run state
 *   supplies       {Object|null} survival supplies from run state
 *   credits        {number}   Mission Credits balance
 *   pace           {string}   'thorough' | 'efficient' (lives in run state)
 *   regionsCompleted {number} how many investigation regions are done
 *   regionsTotal   {number}  total investigation regions (3 for ch1)
 *   completedPhaseIds {string[]} list of completed phase IDs for map display
 *   nextPhaseId    {string|null} the phase the cadet is heading to (drives map "current")
 *   activeChapter  {number}  current chapter number (1, 2, 3)
 *   onContinue     {function} advances to the next phase
 *   onSpend        {function} spend on a hub action ('field_interview'|'lab_analysis')
 *   onBuySupply    {function} buy one unit of a supply from the store
 *   onTogglePace   {function} flip thorough/efficient
 *   onOpenManifest {function} open the persistent MANIFEST drawer
 *   onJumpToPhase  {function} jumps to a chapter's intro phase
 */
export default function HubScreen({
  phaseContext,
  currentResources,
  supplies = null,
  credits = 0,
  pace = 'thorough',
  regionsCompleted,
  regionsTotal,
  completedPhaseIds,
  nextPhaseId = null,
  activeChapter = 1,
  onContinue,
  onSpend,
  onBuySupply,
  onTogglePace,
  onOpenManifest,
  onJumpToPhase,
}) {
  // DEV-ONLY deep-link for the /screens board: ?hubview=map|store opens overlays
  const [showMap, setShowMap] = useState(() =>
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('hubview') === 'map'
  );
  const [showStore, setShowStore] = useState(() =>
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('hubview') === 'store'
  );
  const [fieldInterviewResult, setFieldInterviewResult] = useState(null);
  const [labAnalysisResult, setLabAnalysisResult] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  // ─── Entrance animation state ─────────────────────────────────────────────
  // R18a staged entrance: world first (fade from black reveals the starfield),
  // THEN the header, then the cards. Bg breathes in before any box appears.
  const [worldReady,  setWorldReady]  = useState(REDUCED);
  const [headerReady, setHeaderReady] = useState(REDUCED);

  useEffect(() => {
    if (REDUCED) return;
    const t0 = setTimeout(() => setWorldReady(true),  30);
    const t1 = setTimeout(() => setHeaderReady(true), 750);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, []);

  // Resource token + supply counts
  const communityTokens = currentResources?.community_partnerships ?? 0;
  const samplingTokens = currentResources?.sampling_kits ?? 0;
  const toolsSupply = supplies?.tools ?? 0;

  // (Blippy's hub guiding line lives in MissionWaterGame now — the one
  // persistent companion speaks for every screen.)

  const spendFieldInterview = () => {
    if (communityTokens <= 0) return;
    if (typeof onSpend === 'function') onSpend('field_interview');
    setFieldInterviewResult(
      "A local rancher stops you. \"We used to rely on that aquifer for everything. Now we drill twice as deep and get half as much.\""
    );
  };

  const spendLabAnalysis = () => {
    if (samplingTokens <= 0 || toolsSupply <= 0) return;
    if (typeof onSpend === 'function') onSpend('lab_analysis');
    setLabAnalysisResult(
      "Water sample analysis: PFAS contamination detected at elevated levels. This data strengthens your case for the council."
    );
  };

  // Cleo hub card art (public/mission-water/hub/) — committed 63fa3ae7, wired R17
  const cardArt = {
    continue:        '/mission-water/hub/hub_continue.jpg',
    map:             '/mission-water/hub/hub_mission_map.jpg',
    pace:            '/mission-water/hub/hub_change_pace.jpg',
    field_interview: '/mission-water/hub/hub_field_interview.jpg',
    lab_analysis:    '/mission-water/hub/hub_lab_analysis.jpg',
    store:           '/mission-water/hub/hub_supply_store.jpg',
  };

  const hubOptions = [
    {
      id: 'continue',
      icon: '▶',
      title: 'CONTINUE INVESTIGATION',
 description: 'Advance to the next site. Travel burns food, power, and spare parts on region hops.',
      free: true,
      primary: true,
      action: onContinue,
    },
    {
      id: 'store',
      icon: '⊞',
      title: 'SUPPLY STORE',
      description: `${credits} CR available. Restock food, power, spare parts and tools between legs.`,
      free: true,
      action: () => setShowStore(true),
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
 ? 'THOROUGH, deep analysis: +5 CR per region, but +1 extra food at each site analysis.'
 : 'EFFICIENT, fast scan: normal rations, no region bonus.',
      free: true,
      action: () => { if (typeof onTogglePace === 'function') onTogglePace(); },
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
      description: samplingTokens > 0 && toolsSupply > 0
        ? `Spend 1 sampling kit + 1 tools to run a water quality analysis. (${samplingTokens} kit${samplingTokens === 1 ? '' : 's'}, ${toolsSupply} tools left)`
        : samplingTokens <= 0
          ? 'No sampling kits remaining.'
 : 'No tools left, restock at the Supply Store.',
      free: false,
      tokenType: 'sampling_kits',
      tokenCost: 1,
      tokenAvail: Math.min(samplingTokens, toolsSupply),
      action: spendLabAnalysis,
      result: labAnalysisResult,
    },
  ];

  return (
    <div style={styles.root}>
      {/* ── Keyframes for card entrance flicker + map pulse + grid ── */}
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
        /* R18a — fixed 2-column grid, equal card heights, 1 column on mobile */
        .hub-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .hub-grid .hub-card { display: flex; }
        .hub-grid .hub-card > div { width: 100%; }
        @media (max-width: 680px) {
          .hub-grid { grid-template-columns: 1fr; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hub-card { animation: none !important; opacity: 1 !important; }
          .hub-map-current { animation: none !important; }
          .hub-site-ping { animation: none !important; opacity: 0 !important; }
        }
      `}</style>

      {/* ── Space background — starfield + scanlines, same world as RoleSelect ── */}
      <div style={styles.bgSpace}>
        <StarCanvas seed={0xbeac0742} />
      </div>
      <div style={styles.scanlines} />

      {/* ── R18a staged entrance: fade from black reveals the world FIRST ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        opacity: worldReady ? 0 : 1,
        transition: 'opacity 700ms ease',
        pointerEvents: 'none',
        zIndex: 60,
      }} />

      {/* ── Main scrollable content — frame stays dead-centered ── */}
      <div style={styles.scrollLayer}>
        <div style={styles.centerFrame}>

          {/* Header — canon pattern: cyan kicker / white Orbitron title / dim sub */}
          <div style={{
            ...styles.header,
            opacity:    headerReady ? 1 : 0,
            transform:  headerReady ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 350ms ease, transform 350ms ease',
          }}>
 <div style={styles.headerKicker}>MISSION WATER, INVESTIGATION CHECKPOINT</div>
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

          {/* Card grid: fixed 2 columns on desktop, 1 column on mobile (R18a) */}
          <div className="hub-grid">
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
                    // Cards land AFTER the world + header (R18a staged entrance)
                    animation: 'hub-card-flicker 220ms ease forwards',
                    animationDelay: `${1000 + idx * 90}ms`,
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

      {/* ── SUPPLY STORE overlay (R18b — credits → supplies) ── */}
      {showStore && (
        <SupplyStore
          supplies={supplies}
          credits={credits}
          onBuySupply={onBuySupply}
          onClose={() => setShowStore(false)}
        />
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
 <div style={styles.mapKicker}>ORBITAL TRACKING, CHAPTER 01</div>
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

// ─── SupplyStore overlay (R18b) ───────────────────────────────────────────────
//
// Mission Credits → survival supplies. Centered instrument panel, one row per
// supply with a meter, the unit price, and a BUY control. Tokens are NOT for
// sale — skill is set at deployment; this store only keeps the cadet alive.

function SupplyStore({ supplies, credits, onBuySupply, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const s = supplies || {};

  return (
    <div
      style={styles.mapOverlayRoot}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={styles.mapBackdrop} onClick={onClose} />

      <div style={{
        ...styles.mapPanel,
        width: 'min(560px, 96vw)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.97)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}>
        {/* Header */}
        <div style={styles.mapHeaderRow}>
          <div>
 <div style={styles.mapKicker}>QUARTERMASTER, BETWEEN-LEG RESUPPLY</div>
            <div style={styles.mapTitle}>SUPPLY STORE</div>
          </div>
          <button onClick={onClose} style={styles.mapCloseBtn}>CLOSE</button>
        </div>

        {/* Credits readout */}
        <div style={styles.storeCreditsRow}>
          <span style={styles.storeCreditsLabel}>MISSION CREDITS</span>
          <span style={styles.storeCreditsValue}>{credits} CR</span>
        </div>

        {/* Supply rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SUPPLY_DEFS.map(({ key, label, price }) => {
            const val = Math.max(0, Math.min(SUPPLY_MAX, s[key] ?? 0));
            const full = val >= SUPPLY_MAX;
            const canBuy = !full && credits >= price;
            const valColor = val <= 0 ? '#FF4444' : val <= 2 ? AMBER : CYAN;
            return (
              <div key={key} style={styles.storeRow}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={styles.storeRowLabel}>{label}</span>
                    <span style={{ ...styles.storeRowValue, color: valColor }}>
                      {val}<span style={{ fontSize: 9, opacity: 0.5 }}>/{SUPPLY_MAX}</span>
                    </span>
                  </div>
                  <div style={styles.storeMeterTrack}>
                    <div style={{
                      height: '100%',
                      width: `${(val / SUPPLY_MAX) * 100}%`,
                      background: valColor,
                      borderRadius: 2,
                      boxShadow: val > 0 ? `0 0 6px ${valColor}80` : 'none',
                      transition: 'width 250ms ease, background 250ms ease',
                    }} />
                  </div>
                </div>
                <div style={styles.storePrice}>{price} CR</div>
                <button
                  onClick={canBuy ? () => onBuySupply(key) : undefined}
                  disabled={!canBuy}
                  style={{
                    ...styles.storeBuyBtn,
                    opacity: canBuy ? 1 : 0.3,
                    cursor: canBuy ? 'pointer' : 'not-allowed',
                  }}
                >
                  {full ? 'FULL' : 'BUY +1'}
                </button>
              </div>
            );
          })}
        </div>

        <div style={styles.storeFootnote}>
          Credits come from completed regions and discoveries. Tokens are not for sale — skill is set at deployment.
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

  // Cleo art banner on each card — R18a: taller so the art actually reads
  cardArtWrap: {
    position: 'relative',
    width: '100%',
    height: 150,
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

  // ── Supply Store overlay (R18b) ────────────────────────────────────
  storeCreditsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    border: '1px solid rgba(255,183,3,0.3)',
    borderRadius: 4,
    padding: '10px 14px',
    background: 'rgba(255,183,3,0.05)',
  },
  storeCreditsLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    letterSpacing: '0.25em',
    color: 'rgba(200,216,240,0.6)',
    textTransform: 'uppercase',
  },
  storeCreditsValue: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: AMBER,
    textShadow: '0 0 10px rgba(255,183,3,0.4)',
  },
  storeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    border: '1px solid rgba(0,229,204,0.15)',
    borderRadius: 4,
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
  },
  storeRowLabel: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 10,
    letterSpacing: '0.18em',
    color: TEXT_PRIMARY,
    textTransform: 'uppercase',
  },
  storeRowValue: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  storeMeterTrack: {
    height: 5,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
  },
  storePrice: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: AMBER,
    flexShrink: 0,
    width: 48,
    textAlign: 'right',
  },
  storeBuyBtn: {
    fontFamily: 'Orbitron, sans-serif',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: CYAN,
    background: 'transparent',
    border: `1px solid rgba(0,229,204,0.45)`,
    borderRadius: 3,
    padding: '8px 12px',
    flexShrink: 0,
    transition: 'opacity 120ms ease',
  },
  storeFootnote: {
    fontFamily: 'Rajdhani, sans-serif',
    fontSize: 12,
    color: 'rgba(200,216,240,0.45)',
    lineHeight: 1.5,
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

};