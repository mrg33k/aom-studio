import React, { useEffect, useRef, useState } from 'react';

/**
 * Blippy — THE persistent floating companion (R18c "buttery mechanics").
 *
 * Patrik: "walking off the cliff randomly... she moves like a chess piece.
 * we want buttery mechanics."
 *
 * What changed from the per-screen mounts:
 *   - ONE instance, mounted at the MissionWaterGame root, alive across every
 *     screen. No remounts, no teleports, no in-flow dock that could drop him
 *     below the fold. position: fixed — he physically cannot leave the screen.
 *   - He HOVERS: a continuous idle bob (he's a robot on thrusters, not legs).
 *   - Size is FLUID (clamp on viewport width) — he scales smoothly as the
 *     window changes instead of jumping between breakpoints.
 *   - Screen changes get squash-and-stretch (a soft hop) and the speech
 *     bubble crossfades to the new guiding line.
 *   - First mount: he glides up from below with a spring ease.
 *   - In-game the bubble auto-dims after a few seconds so he guides without
 *     nagging; every other screen keeps it up.
 *   - prefers-reduced-motion: no hover, no hop — static and accessible.
 *
 * Props:
 *   screenKey {string}  'welcome'|'name'|'role'|'budget'|'hub'|'game'
 *   text      {string}  the guiding line for the current screen
 *
 * Mission: conrad-foundation:interactive-game · DESIGN.md §Blippy
 */

const REDUCED = typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BLIPPY_SRC = '/mission-water/welcome/blippy_v2_welcome_pose.png';
const BLIPPY_FALLBACK = '/mission-water/welcome/blippy_welcome_pose.png';

const BLIPPY_CSS = `
  .mw-blippy {
    position: fixed;
    left: 22px;
    bottom: 18px;
    z-index: 260; /* above every screen, below the hub/manifest overlays */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    pointer-events: none;
  }

  /* Entrance — glide up from below with a spring overshoot */
  @keyframes mw-blippy-enter {
    0%   { transform: translateY(130%); opacity: 0; }
    60%  { transform: translateY(-6%);  opacity: 1; }
    100% { transform: translateY(0); opacity: 1; }
  }
  .mw-blippy-enter { animation: mw-blippy-enter 900ms cubic-bezier(0.22, 1, 0.36, 1) both; }

  /* Idle hover — continuous, gentle, alive */
  @keyframes mw-blippy-hover {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50%      { transform: translateY(-7px) rotate(-1.2deg); }
  }
  .mw-blippy-body {
    animation: mw-blippy-hover 3.6s ease-in-out infinite;
    will-change: transform;
  }

  /* Screen-change hop — soft squash & stretch */
  @keyframes mw-blippy-hop {
    0%   { transform: scale(1, 1); }
    30%  { transform: scale(1.06, 0.92) translateY(2px); }
    60%  { transform: scale(0.95, 1.07) translateY(-8px); }
    100% { transform: scale(1, 1) translateY(0); }
  }
  .mw-blippy-hop { animation: mw-blippy-hop 650ms cubic-bezier(0.34, 1.3, 0.64, 1); }

  /* Fluid size — scales smoothly with the window, never jumps a breakpoint */
  .mw-blippy-img {
    height: clamp(104px, 14vw, 200px);
    width: auto;
    display: block;
    filter: drop-shadow(0 0 16px rgba(0,229,204,0.35));
    transition: height 600ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .mw-blippy-game .mw-blippy-img { height: clamp(90px, 9.5vw, 148px); }

  /* Speech bubble — bold guiding line, crossfades between screens */
  @keyframes mw-blippy-bubble-in {
    0%   { opacity: 0; transform: translateY(8px) scale(0.96); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  .mw-blippy-bubble {
    position: relative;
    background: rgba(7,11,20,0.94);
    border: 1px solid rgba(0,229,204,0.55);
    border-radius: 10px;
    padding: 11px 15px;
    max-width: clamp(160px, 19vw, 250px);
    box-shadow: 0 0 18px rgba(0,229,204,0.18);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: clamp(12px, 1.15vw, 15px);
    line-height: 1.45;
    color: #FFFFFF;
    text-align: center;
    animation: mw-blippy-bubble-in 350ms ease both;
    transition: opacity 600ms ease;
  }
  .mw-blippy-bubble-dim { opacity: 0; }
  .mw-blippy-tail {
    position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 7px solid transparent; border-right: 7px solid transparent;
    border-top: 8px solid rgba(0,229,204,0.55);
  }

  @media (prefers-reduced-motion: reduce) {
    .mw-blippy-enter, .mw-blippy-body, .mw-blippy-hop, .mw-blippy-bubble {
      animation: none !important;
    }
  }
`;

export default function Blippy({ screenKey = 'welcome', text }) {
  const [hopKey, setHopKey] = useState(0);
  const [bubbleDim, setBubbleDim] = useState(false);
  const prevScreen = useRef(screenKey);

  // Screen change → one soft hop (squash & stretch), bubble un-dims
  useEffect(() => {
    if (prevScreen.current !== screenKey) {
      prevScreen.current = screenKey;
      setHopKey((k) => k + 1);
    }
  }, [screenKey]);

  // In-game: let the guiding line breathe, then dim it so Blippy guides
  // without nagging over the mission. Other screens keep the line up.
  useEffect(() => {
    setBubbleDim(false);
    if (screenKey !== 'game') return undefined;
    const t = setTimeout(() => setBubbleDim(true), 8000);
    return () => clearTimeout(t);
  }, [screenKey, text]);

  return (
    <div className={`mw-blippy mw-blippy-enter${screenKey === 'game' ? ' mw-blippy-game' : ''}`}>
      <style>{BLIPPY_CSS}</style>
      {text ? (
        <div
          key={text}
          className={`mw-blippy-bubble${bubbleDim ? ' mw-blippy-bubble-dim' : ''}`}
        >
          {text}
          <div className="mw-blippy-tail" />
        </div>
      ) : null}
      <div key={hopKey} className={hopKey && !REDUCED ? 'mw-blippy-hop' : ''}>
        <div className="mw-blippy-body">
          <img
            className="mw-blippy-img"
            src={BLIPPY_SRC}
            alt="Blippy, your mission companion"
            onError={(e) => {
              if (!e.target.dataset.fbk) {
                e.target.dataset.fbk = '1';
                e.target.src = BLIPPY_FALLBACK;
              } else {
                e.target.style.display = 'none';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
