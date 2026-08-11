import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * AOM home 2026 — the motion system.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: nothing on this page moves for decoration.
 * A move is allowed only if it does one of three jobs:
 *   1. REVEALS STRUCTURE  — shows the reader how a thing is built (the spine drawing itself).
 *   2. PACES AN ARGUMENT  — separates two clauses in time so the second one lands (the hero).
 *   3. MAKES A NUMBER REAL — a figure that counts is a figure someone counted (the proof).
 * Anything else gets a plain fade, or nothing at all. The reader is a sceptical contractor;
 * motion that shows off costs trust, it does not buy it.
 *
 * One curve, one duration family, everything fires ONCE and never replays.
 * Everything here collapses to "already visible, no movement" under prefers-reduced-motion.
 * No dependency — IntersectionObserver plus CSS transitions.
 */

export const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)'; // one curve for the whole page
export const DUR = { quick: 380, base: 620, slow: 900, draw: 1400 };

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Fires once when `threshold` of the element has been on screen. */
export function useInView({ threshold = 0.25, rootMargin = '0px 0px -8% 0px' } = {}) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (seen) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return; }
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) { setSeen(true); io.disconnect(); }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold, rootMargin]);

  return [ref, seen];
}

/**
 * The default move. Rise + fade, once.
 * `y` is deliberately small — 18px. A big travel reads as a slide deck, and this page spent
 * two rounds escaping exactly that.
 */
export function Reveal({
  children, delay = 0, y = 18, duration = DUR.base, threshold = 0.2,
  as: Tag = 'div', style, className,
}) {
  const [ref, seen] = useInView({ threshold });
  const reduced = prefersReducedMotion();
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: seen ? 1 : 0,
        transform: seen || reduced ? 'none' : `translateY(${y}px)`,
        transition: reduced ? 'none'
          : `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms`,
        willChange: seen ? 'auto' : 'opacity, transform',
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

/**
 * A masked wipe — the line is uncovered rather than moved. Use for a single display line whose
 * arrival is the point (the trades statement, a band headline). Never on a paragraph.
 */
export function WipeIn({ children, delay = 0, duration = DUR.slow, as: Tag = 'div', style }) {
  const [ref, seen] = useInView({ threshold: 0.4 });
  const reduced = prefersReducedMotion();
  return (
    <Tag ref={ref} style={{ overflow: 'hidden', ...style }}>
      <div
        style={{
          clipPath: seen || reduced ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
          transition: reduced ? 'none' : `clip-path ${duration}ms ${EASE} ${delay}ms`,
        }}
      >
        {children}
      </div>
    </Tag>
  );
}

/**
 * Children arrive in sequence. Use where the ACCUMULATION is the argument — the offer's list
 * is long on purpose, and watching it stack is what makes the length land.
 * `step` stays small; a slow stagger on eight rows is a stall, not a rhythm.
 */
export function Stagger({ children, step = 70, delay = 0, y = 14, duration = DUR.quick, style, as: Tag = 'div' }) {
  const items = React.Children.toArray(children);
  return (
    <Tag style={style}>
      {items.map((child, i) => (
        <Reveal key={i} delay={delay + i * step} y={y} duration={duration} threshold={0.12}>
          {child}
        </Reveal>
      ))}
    </Tag>
  );
}

/**
 * A rule that draws itself. THE story move on this page: the process spine is the month
 * passing, so the line has to travel. `axis="x"` for the desktop spine, `"y"` for the phone.
 */
export function DrawLine({
  axis = 'x', thickness = 1, color, duration = DUR.draw, delay = 0, threshold = 0.3, style,
}) {
  const [ref, seen] = useInView({ threshold });
  const reduced = prefersReducedMotion();
  const horizontal = axis === 'x';
  return (
    <div
      ref={ref}
      style={{
        background: color,
        transformOrigin: horizontal ? 'left center' : 'center top',
        transform: seen || reduced ? 'scale(1,1)' : (horizontal ? 'scaleX(0)' : 'scaleY(0)'),
        transition: reduced ? 'none' : `transform ${duration}ms ${EASE} ${delay}ms`,
        [horizontal ? 'height' : 'width']: thickness,
        [horizontal ? 'width' : 'height']: '100%',
        ...style,
      }}
    />
  );
}

/**
 * A figure that counts. ONLY for the proof section's 46 and 399.
 * The whole strategy of that section is "small numbers, real ones, and you are welcome to ask
 * them" — a number that counts up reads as a number somebody actually tallied. Do not use this
 * on the price or on the ledger: a cynic reading a price that animates assumes it is a pitch.
 */
export function CountUp({ value, duration = DUR.slow, style, as: Tag = 'span' }) {
  const target = parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;
  const [ref, seen] = useInView({ threshold: 0.5 });
  const [n, setN] = useState(prefersReducedMotion() ? target : 0);
  const raf = useRef(0);

  useEffect(() => {
    if (!seen || prefersReducedMotion()) { setN(target); return; }
    let start = null;
    const tick = (t) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / duration);
      // ease-out so it settles rather than snapping — a number that overshoots looks fake
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [seen, target, duration]);

  return <Tag ref={ref} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>{n}</Tag>;
}

/**
 * A very slow settle on a full-bleed photograph — 1.06 to 1.0 over five seconds, once.
 * The job site comes to rest. Anything faster is a Ken Burns effect and reads as stock.
 */
export function PhotoSettle({ children, duration = 5200, style }) {
  const [on, setOn] = useState(false);
  const reduced = prefersReducedMotion();
  useEffect(() => { const t = setTimeout(() => setOn(true), 60); return () => clearTimeout(t); }, []);
  return (
    <div style={{ overflow: 'hidden', ...style }}>
      <div
        style={{
          height: '100%', width: '100%',
          transform: reduced || on ? 'scale(1)' : 'scale(1.06)',
          transition: reduced ? 'none' : `transform ${duration}ms ${EASE}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Hook form, for sections that need the flag without a wrapper element. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => prefersReducedMotion());
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, []);
  return reduced;
}
