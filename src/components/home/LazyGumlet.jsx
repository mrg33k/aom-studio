import React, { useState, useEffect, useRef } from 'react';

/**
 * LazyGumlet -- mounts a Gumlet iframe only when the wrapper is near the viewport.
 *
 * - Shows a lightweight placeholder bg until intersection.
 * - rootMargin defaults to "300px" so we start the load slightly before scroll-in.
 * - eager={true} bypasses the observer and mounts immediately (use for hero
 *   tiles that should show the moment the page paints).
 *
 * Pass any iframe className/style to override the defaults; we handle the
 * cover-fit math (16:9 iframe centered + cropped).
 */
export default function LazyGumlet({
  id,
  eager = false,
  rootMargin = '300px',
  className = '',
  style = {},
  filter = 'grayscale(0.05) contrast(1.1)',
  cover = true,
  poster = '#161616',
  portrait = false, // true = source video is 9:16 vertical (Reels/TikTok)
  bleed = 1.08, // scale-up to hide Gumlet's hairline player chrome
  offsetY = 0, // px; negative shifts the video up (crops more off the top — hides the title overlay on raw, unfiltered heroes)
}) {
  const [mounted, setMounted] = useState(eager);
  const ref = useRef(null);

  useEffect(() => {
    if (mounted || !ref.current || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMounted(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [mounted, rootMargin]);

  // Cover-fit iframe via the canonical `aspect-ratio + min-* + auto` pattern.
  // The browser picks whichever dimension needs the larger scale to cover both
  // axes. Critically, this works whether the FRAME is wider OR taller than the
  // source aspect — the previous height:100%/width:auto version broke when the
  // frame was wider than 16:9 (Rail row stretching its 16:10 frame to match the
  // text column's height ended up wider than source → side bars).
  // The BLEED scale on top hides Gumlet's player chrome (a few px of border).
  const sourceAR = portrait ? '9 / 16' : '16 / 9';
  const coverStyle = cover
    ? {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 'auto',
        height: 'auto',
        aspectRatio: sourceAR,
        minWidth: '100%',
        minHeight: '100%',
        transform: `translate(-50%, calc(-50% + ${offsetY}px)) scale(${bleed})`,
        transformOrigin: 'center',
        border: 'none',
        filter,
      }
    : { width: '100%', height: '100%', border: 'none', filter };

  return (
    <div
      ref={ref}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: poster, ...style }}
    >
      {mounted && (
        <iframe
          src={`https://play.gumlet.io/embed/${id}?autoplay=true&muted=true&loop=true&preload=false&controls=false&disable_player_controls=true`}
          style={coverStyle}
          loading="lazy"
          allow="autoplay"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
