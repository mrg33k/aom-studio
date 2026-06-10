import React from 'react';

/**
 * Blippy — the ONE mission companion, used by every screen.
 *
 * R18a (Patrik): "same blippy across each screen... same size as he is on the
 * home screen... He can move positions and even flip. He should have something
 * to guide each screen. His tool tips... bolder bigger text without being too
 * much. Try putting him near the action."
 *
 *   - Always the full-body cartoon PNG. Never a circle crop.
 *   - 200px tall on desktop (the WelcomeScreen reference size); shrinks
 *     responsively (150px ≤980px, 110px ≤600px). `size="sm"` for in-game HUD.
 *   - `flip` mirrors him so he can face the action from either side.
 *   - Speech bubble: bolder, bigger, white text — the guiding line for the
 *     screen he's on.
 *
 * Props:
 *   text     {string}  guiding line (omit for no bubble)
 *   flip     {bool}    mirror horizontally (facing left)
 *   size     {'md'|'sm'} md = welcome reference; sm = in-game compact
 *   visible  {bool}    entrance fade hook (default true)
 *   style    {object}  extra styles on the wrapper (positioning lives in the parent)
 *
 * Mission: conrad-foundation:interactive-game · DESIGN.md §Blippy
 */

const CYAN = '#00E5CC';
const BLIPPY_SRC = '/mission-water/welcome/blippy_v2_welcome_pose.png';
const BLIPPY_FALLBACK = '/mission-water/welcome/blippy_welcome_pose.png';

const BLIPPY_CSS = `
  .mw-blippy { display: flex; flex-direction: column; align-items: center; gap: 9px; pointer-events: none; }
  .mw-blippy-img {
    height: 200px; width: auto; display: block;
    filter: drop-shadow(0 0 16px rgba(0,229,204,0.35));
  }
  .mw-blippy-sm .mw-blippy-img { height: 150px; }
  .mw-blippy-bubble {
    position: relative;
    background: rgba(7,11,20,0.94);
    border: 1px solid rgba(0,229,204,0.55);
    border-radius: 10px;
    padding: 11px 15px;
    max-width: 250px;
    box-shadow: 0 0 18px rgba(0,229,204,0.18);
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 15px;
    line-height: 1.45;
    color: #FFFFFF;
    text-align: center;
  }
  .mw-blippy-sm .mw-blippy-bubble { font-size: 13px; max-width: 210px; padding: 9px 13px; }
  .mw-blippy-tail {
    position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 7px solid transparent; border-right: 7px solid transparent;
    border-top: 8px solid rgba(0,229,204,0.55);
  }
  @media (max-width: 1160px) {
    .mw-blippy-img { height: 150px; }
    .mw-blippy-bubble { max-width: 195px; font-size: 14px; }
  }
  @media (max-width: 680px) {
    .mw-blippy-img { height: 110px; }
    .mw-blippy-bubble { max-width: 160px; font-size: 12px; padding: 8px 11px; }
  }
`;

export default function Blippy({ text, flip = false, size = 'md', visible = true, dock = null, style }) {
  // dock={px}: render IN the page flow (under the centered panel) by default,
  // and float fixed lower-left only when the viewport is at least `px` wide —
  // i.e. only when the centered panel has real free margin. The main box stays
  // dead-centered at every width; Blippy never forces it sideways and never
  // covers its content.
  const dockClass = dock ? ` mw-blippy-docked-${dock}` : '';
  return (
    <div
      className={`mw-blippy${size === 'sm' ? ' mw-blippy-sm' : ''}${dockClass}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(14px)',
        transition: 'opacity 350ms ease-out, transform 350ms ease-out',
        ...style,
      }}
    >
      <style>{BLIPPY_CSS}</style>
      {dock ? (
        <style>{`
          .mw-blippy-docked-${dock} { margin: 16px 0 6px; }
          @media (min-width: ${dock}px) {
            .mw-blippy-docked-${dock} { position: fixed; left: 28px; bottom: 24px; margin: 0; z-index: 6; }
          }
        `}</style>
      ) : null}
      {text ? (
        <div className="mw-blippy-bubble">
          {text}
          <div className="mw-blippy-tail" />
        </div>
      ) : null}
      <img
        className="mw-blippy-img"
        src={BLIPPY_SRC}
        alt="Blippy, your mission companion"
        style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
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
  );
}
