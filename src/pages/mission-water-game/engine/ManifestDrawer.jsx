import React, { useEffect, useState } from 'react';
import { BADGE_ART, DISCOVERY_LABELS } from './badges.js';
import { SUPPLY_DEFS, SUPPLY_MAX, isWeakened } from './PhaseManager.js';

/**
 * ManifestDrawer — THE persistent mission tracker (R18b).
 *
 * Patrik: "Mission manifest and mission kit should be together and available
 * on every screen — very important for tracking the game play element of what
 * supplies are needed."
 *
 * One right-side drawer merging the old hub MISSION MANIFEST (chapters +
 * progress) and the old HUD MISSION KIT (tokens + badges), plus the R18b
 * survival layer (supplies + credits). Reachable from a fixed `◫ MANIFEST`
 * tab on EVERY screen, welcome → game. The tab doubles as a warning light:
 * it shows credits and goes amber/red when supplies run low.
 *
 * Props:
 *   runState        {Object}      the live run state (supplies/credits/tokens/discoveries/history)
 *   activeChapter   {number}
 *   regionsCompleted{number}
 *   regionsTotal    {number}
 *   canJump         {bool}        chapter jump allowed (only once the game has started)
 *   onJumpToPhase   {function}
 *   preFlight       {bool}        true before deployment — shows the loadout as "pre-flight"
 */

const CYAN = '#00E5CC';
const AMBER = '#FFB703';
const RED = '#FF4444';
const TEXT_SOFT = '#C8D8F0';

const TOKEN_DEFS = [
  { key: 'sampling_kits',          label: 'SAMPLING KITS', color: '#00E5CC' },
  { key: 'data_access',            label: 'DATA ACCESS',   color: '#1A90FF' },
  { key: 'community_partnerships', label: 'PARTNERSHIPS',  color: '#FFB703' },
  { key: 'media_coverage',         label: 'MEDIA REACH',   color: '#C877FF' },
];
const TOKEN_MAX = 4;

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
 subtitle: 'Shuttle mission, charting a path to lunar water',
    startPhase: 'ch2_intro',
    badgeCount: 4,
    milestones: ['Light Side traversal', 'Terminator crossing', 'Far Dark navigation', 'Water Ice discovery'],
  },
  {
    n: 3,
    title: 'The Moon Holds the Answer',
 subtitle: 'Lunar base, extraction and settlement',
    startPhase: null, // locked
    badgeCount: 0,
    milestones: ['Lunar landing', 'Ice extraction', 'Base established', 'Mission complete'],
  },
];

function supplyColor(v) {
  if (v <= 0) return RED;
  if (v <= 2) return AMBER;
  return CYAN;
}

// ─── The persistent tab (always visible, top-right) ──────────────────────────

export function ManifestTab({ runState, onOpen }) {
  const supplies = runState?.supplies || null;
  const credits = runState?.credits ?? 0;
  const weakened = isWeakened(runState || {});
  const low = supplies
    ? SUPPLY_DEFS.some((d) => (supplies[d.key] ?? 3) <= 2)
    : false;
  const lightColor = weakened ? RED : low ? AMBER : CYAN;

  return (
    <button
      onClick={onOpen}
      aria-label="Open mission manifest"
      style={{
        position: 'fixed',
        top: 14,
        right: 16,
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        background: 'rgba(10,22,40,0.92)',
        border: `1px solid ${weakened ? 'rgba(255,68,68,0.6)' : 'rgba(0,229,204,0.4)'}`,
        borderRadius: 3,
        cursor: 'pointer',
        outline: 'none',
        boxShadow: weakened
          ? '0 0 14px rgba(255,68,68,0.3)'
          : '0 0 10px rgba(0,229,204,0.15)',
        fontFamily: '"Orbitron", monospace',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: lightColor, boxShadow: `0 0 6px ${lightColor}`,
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.22em',
        color: CYAN, textTransform: 'uppercase',
      }}>
        ◫ MANIFEST
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
        color: AMBER,
      }}>
        {credits} CR
      </span>
    </button>
  );
}

// ─── The drawer ───────────────────────────────────────────────────────────────

export default function ManifestDrawer({
  runState,
  activeChapter = 1,
  regionsCompleted = 0,
  regionsTotal = 3,
  canJump = false,
  onJumpToPhase,
  preFlight = false,
  onClose,
}) {
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

  const supplies = runState?.supplies || { food: 0, power: 0, spare_parts: 0, tools: 0 };
  const tokens = runState?.investigationResources || null;
  const credits = runState?.credits ?? 0;
  const discoveryIds = runState?.discoveries || [];
  const completedPhaseIds = runState?.history || [];
  const weakened = isWeakened(runState || {});

  const arriveIds = ['ch1_phoenix_arrive', 'ch1_mumbai_arrive', 'ch1_sao_paulo_arrive'];
  const ch1BadgesEarned = arriveIds.filter((id) => completedPhaseIds.includes(id)).length;

  const getChapterState = (n) => {
    if (n < activeChapter) return 'done';
    if (n === activeChapter) return 'active';
    if (n === activeChapter + 1) return 'available';
    return 'locked';
  };

  const allBadgeIds = Object.keys(BADGE_ART);

  const S = sectionStyles;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 450,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        fontFamily: '"Rajdhani", sans-serif',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(7,11,20,0.72)' }}
        onClick={onClose}
      />

      {/* Panel — slides in from right */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: 'min(460px, 95vw)',
        height: '100%',
        overflowY: 'auto',
        background: 'rgba(5,8,18,0.97)',
        borderLeft: '1px solid rgba(0,229,204,0.25)',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
        padding: '28px 26px 70px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(40px)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
 <div style={S.kicker}>MISSION MANIFEST{preFlight ? ', PRE-FLIGHT' : ''}</div>
            <div style={S.title}>SUPPLIES &amp; PROGRESS</div>
          </div>
          <button onClick={onClose} style={S.closeBtn}>CLOSE</button>
        </div>

        <div style={S.dividerStrong} />

        {/* ── SUPPLIES ── */}
        <div>
          <div style={S.sectionLabel}>
            SURVIVAL SUPPLIES
 {weakened && <span style={S.weakenedFlag}>⚠ RUNNING ON EMPTY, RESTOCK AT THE SUPPLY STORE</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SUPPLY_DEFS.map(({ key, label }) => {
              const val = Math.max(0, Math.min(SUPPLY_MAX, supplies[key] ?? 0));
              const color = supplyColor(val);
              return (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={S.rowLabel}>{label}</span>
                    <span style={{ ...S.rowValue, color }}>
                      {val}<span style={S.rowMax}>/{SUPPLY_MAX}</span>
                    </span>
                  </div>
                  <div style={S.meterTrack}>
                    <div style={{
                      height: '100%',
                      width: `${(val / SUPPLY_MAX) * 100}%`,
                      background: color,
                      borderRadius: 2,
                      boxShadow: val > 0 ? `0 0 6px ${color}80` : 'none',
                      transition: 'width 300ms ease, background 300ms ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CREDITS ── */}
        <div style={S.creditsRow}>
          <span style={S.sectionLabel}>MISSION CREDITS</span>
          <span style={S.creditsValue}>{credits} CR</span>
        </div>
        <div style={S.creditsHint}>
          Earned by completing regions and discoveries. Spend them at the hub SUPPLY STORE.
        </div>

        <div style={S.divider} />

        {/* ── FIELD TOKENS ── */}
        <div>
 <div style={S.sectionLabel}>FIELD TOKENS, SKILLS</div>
          {tokens ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {TOKEN_DEFS.map(({ key, label, color }) => {
                const val = Math.max(0, Math.min(TOKEN_MAX, tokens[key] ?? 0));
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ ...S.rowLabel, width: 120, flexShrink: 0 }}>{label}</span>
                    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                      {Array.from({ length: TOKEN_MAX }, (_, i) => (
                        <div key={i} style={{
                          width: 16, height: 16, borderRadius: 3,
                          background: i < val ? color : 'rgba(255,255,255,0.08)',
                          boxShadow: i < val ? `0 0 6px ${color}80` : 'none',
                        }} />
                      ))}
                    </div>
                    <span style={{ ...S.rowValue, color: val === 0 ? RED : color, width: 30, textAlign: 'right' }}>
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
 <div style={S.emptyNote}>Tokens are assigned at deployment, confirm your loadout to see them here.</div>
          )}
        </div>

        <div style={S.divider} />

        {/* ── BADGES ── */}
        <div>
 <div style={S.sectionLabel}>DISCOVERY BADGES, {discoveryIds.length}/{allBadgeIds.length}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))', gap: 10 }}>
            {allBadgeIds.map((id) => {
              const earned = discoveryIds.includes(id);
              const label = DISCOVERY_LABELS[id] || id;
              return (
                <div key={id} title={label} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: earned ? 1 : 0.22,
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: '50%',
                    background: 'conic-gradient(#FFB703 0deg, #A07800 60deg, #FFB703 120deg, #A07800 180deg, #FFB703 240deg, #A07800 300deg, #FFB703 360deg)',
                    padding: 3,
                    boxShadow: earned ? '0 0 12px rgba(255,183,3,0.5)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <img
                      src={BADGE_ART[id]}
                      alt={label}
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: 'rgba(7,11,20,0.95)' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <div style={S.badgeLabel}>{label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={S.divider} />

        {/* ── CHAPTERS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={S.sectionLabel}>CHAPTERS</div>
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
                padding: '14px 16px',
                background: isActive ? 'rgba(0,229,204,0.06)' : isDone ? 'rgba(0,229,204,0.03)' : isAvailable ? 'rgba(255,183,3,0.05)' : 'transparent',
                opacity: isLocked ? 0.45 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 10, letterSpacing: '0.18em', color: AMBER, flexShrink: 0 }}>
                    0{ch.n}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                      {ch.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(200,216,240,0.55)', marginTop: 2 }}>
                      {ch.subtitle}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: '"Orbitron", monospace',
                    fontSize: 8,
                    letterSpacing: '0.18em',
                    color: isActive || isDone ? CYAN : isAvailable ? AMBER : 'rgba(255,255,255,0.3)',
                    flexShrink: 0,
                  }}>
 {isActive ? ', ACTIVE' : isDone ? ', REPLAY' : isAvailable ? ', START' : ', SOON'}
                  </div>
                </div>

                {(isActive || isDone) && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(200,216,240,0.5)' }}>PROGRESS</span>
                      <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, letterSpacing: '0.15em', color: CYAN }}>{progressPct}%</span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(0,229,204,0.12)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${progressPct}%`, background: CYAN, borderRadius: 2, boxShadow: `0 0 6px ${CYAN}`, transition: 'width 600ms ease' }} />
                    </div>
                  </div>
                )}

                {isActive && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {ch.milestones.map((ms, i) => {
                      const done = ch.n === 1 ? i < regionsCompleted : false;
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: done ? CYAN : 'rgba(200,216,240,0.25)', lineHeight: 1 }}>
                            {done ? '✓' : '○'}
                          </span>
                          <span style={{ fontSize: 12, color: done ? 'rgba(200,216,240,0.85)' : 'rgba(200,216,240,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {ms}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {ch.badgeCount > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(200,216,240,0.4)' }}>BADGES</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {Array.from({ length: ch.badgeCount }).map((_, i) => (
                        <span key={i} style={{
                          width: 16, height: 16, borderRadius: '50%',
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

                {!isLocked && canJump && typeof onJumpToPhase === 'function' && ch.startPhase && (
                  <button
                    onClick={() => { onJumpToPhase(ch.startPhase); onClose(); }}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'transparent',
                      border: `1px solid ${isActive ? 'rgba(0,229,204,0.35)' : 'rgba(255,183,3,0.45)'}`,
                      color: isActive ? CYAN : AMBER,
                      fontFamily: '"Orbitron", monospace',
                      fontSize: 9,
                      letterSpacing: '0.2em',
                      padding: '6px 13px',
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

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 18, borderTop: '1px solid rgba(0,229,204,0.08)' }}>
          <div style={{ fontFamily: '"Orbitron", monospace', fontSize: 8, letterSpacing: '0.15em', color: 'rgba(200,216,240,0.3)', lineHeight: 1.8, textTransform: 'uppercase' }}>
            Built for Nancy Conrad.<br />Conrad Foundation × Ahead of Market.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const sectionStyles = {
  kicker: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.35em',
    color: CYAN,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: '"Orbitron", monospace',
    fontWeight: 700,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid rgba(0,229,204,0.3)',
    color: CYAN,
    fontFamily: '"Orbitron", monospace',
    fontSize: 11,
    letterSpacing: '0.15em',
    padding: '8px 14px',
    borderRadius: 2,
    cursor: 'pointer',
    flexShrink: 0,
  },
  dividerStrong: {
    height: 1,
    background: 'linear-gradient(90deg, rgba(0,229,204,0.5), transparent)',
  },
  divider: {
    height: 1,
    background: 'linear-gradient(90deg, rgba(0,229,204,0.25), transparent)',
  },
  sectionLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: '0.28em',
    color: 'rgba(200,216,240,0.55)',
    textTransform: 'uppercase',
    marginBottom: 12,
    display: 'block',
  },
  weakenedFlag: {
    display: 'block',
    marginTop: 6,
    fontFamily: '"Orbitron", monospace',
    fontSize: 8,
    letterSpacing: '0.15em',
    color: RED,
  },
  rowLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 9,
    letterSpacing: '0.18em',
    color: 'rgba(200,216,240,0.75)',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  rowMax: {
    fontSize: 9,
    opacity: 0.5,
  },
  meterTrack: {
    height: 5,
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
  },
  creditsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  creditsValue: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: AMBER,
    textShadow: '0 0 10px rgba(255,183,3,0.4)',
  },
  creditsHint: {
    fontSize: 12,
    color: 'rgba(200,216,240,0.45)',
    marginTop: -16,
  },
  emptyNote: {
    fontSize: 13,
    color: 'rgba(200,216,240,0.45)',
  },
  badgeLabel: {
    fontFamily: '"Orbitron", monospace',
    fontSize: 6,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'rgba(200,216,240,0.6)',
    textTransform: 'uppercase',
    textAlign: 'center',
    lineHeight: 1.3,
    maxWidth: 68,
    wordBreak: 'break-word',
  },
};