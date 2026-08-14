// AOM home 2026 — shared design tokens.
// Mission: aheadofmarket.com:home. Every section file imports from here.
// NOTHING in a section file may hardcode a colour, a font stack, or an off-scale space.

export const C = {
 ink: '#000000', // obsidian, dark sections
  inkSoft: '#0B0B0B',    // dark section wells
 bone: '#F3EEE5', // bone paper, light sections
  boneSoft: '#E8E1D5',   // bone rules / hairlines
  bronze: '#B58A38',     // THE single accent. Never a second accent colour.
  bronzeDim: '#8A6A2B',
  onInk: '#F3EEE5',
  onInkMute: 'rgba(243,238,229,0.62)',
  onBone: '#111111',
  onBoneMute: 'rgba(17,17,17,0.62)',
  ruleOnInk: 'rgba(243,238,229,0.18)',
  ruleOnBone: 'rgba(17,17,17,0.16)',
};

// Display = condensed grotesque (the Druk-class face). Anton is the licensed-free stand-in.
// Body = Hanken Grotesk. Eyebrows/labels/figures = JetBrains Mono.
export const F = {
  display: "'Anton','Archivo Black','Inter Tight',system-ui,sans-serif",
  body: "'Hanken Grotesk','Inter',system-ui,-apple-system,sans-serif",
  mono: "'JetBrains Mono','Space Mono',ui-monospace,monospace",
};

// ONE spacing scale. 8px base. Sections use SP.band / SP.section only.
export const SP = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 40, 8: 56, 9: 72, 10: 96, 11: 128, 12: 160,
};

// Type scale — clamp()ed, at most 8 steps in use across the whole page.
export const T = {
 d1: 'clamp(56px, 9.2vw, 148px)', // hero headline, the loudest thing on the page
  d2: 'clamp(38px, 5.4vw, 84px)',    // section headlines
  d3: 'clamp(28px, 3.4vw, 52px)',    // band headlines / station titles
  d4: 'clamp(20px, 2.1vw, 30px)',    // sub-display
  b1: 'clamp(17px, 1.35vw, 21px)',   // lead body
  b2: 'clamp(15px, 1.05vw, 17px)',   // body
  lbl: 'clamp(10px, 0.78vw, 12px)',  // mono eyebrow / label
};

export const LS = { display: '-0.02em', label: '0.22em', body: '0' };
// Anton has tall caps and almost no internal leading, so anything under ~0.92 makes the
// ascenders of a wrapped line crash into the descenders above it. 0.86 shipped and collided
// on the hero at both widths. Do not tighten these without looking at a wrapped line.
export const LH = { display: 0.94, head: 0.98, body: 1.55 };

export const MAXW = 1320;      // page measure
export const GUTTER = 'clamp(20px, 4vw, 72px)';
export const BP = { mob: '(max-width: 768px)' };

// Shared primitives — use these, do not re-invent per section.
import React from 'react';

export function Section({ tone = 'ink', short = false, id, style, children }) {
  const dark = tone === 'ink';
  return (
    <section
      id={id}
      style={{
        background: dark ? C.ink : C.bone,
        color: dark ? C.onInk : C.onBone,
        padding: short ? `${SP[9]}px ${GUTTER}` : `${SP[11]}px ${GUTTER}`,
        position: 'relative',
        ...style,
      }}
    >
      <div style={{ maxWidth: MAXW, margin: '0 auto', width: '100%' }}>{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = 'ink', style }) {
  return (
    <div
      style={{
        fontFamily: F.mono,
        fontSize: T.lbl,
        letterSpacing: LS.label,
        textTransform: 'uppercase',
        /* Bright bronze reads 2.7:1 on bone — below AA for label sizes. The dim
           bronze token holds 4.3:1 there; ink sections keep the bright accent. */
        color: tone === 'bone' ? C.bronzeDim : C.bronze,
        marginBottom: SP[5],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Display({ as: Tag = 'h2', size = T.d2, tone = 'ink', style, children }) {
  return (
    <Tag
      style={{
        fontFamily: F.display,
        fontWeight: 400,
        fontSize: size,
        lineHeight: LH.head,
        letterSpacing: LS.display,
        textTransform: 'uppercase',
        margin: 0,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

export function Body({ size = T.b2, tone = 'ink', style, children }) {
  return (
    <p
      style={{
        fontFamily: F.body,
        fontSize: size,
        lineHeight: LH.body,
        margin: 0,
        color: tone === 'ink' ? C.onInkMute : C.onBoneMute,
        ...style,
      }}
    >
      {children}
    </p>
  );
}

export function Rule({ tone = 'ink', style }) {
  return (
    <div
      style={{
        height: 1,
        background: tone === 'ink' ? C.ruleOnInk : C.ruleOnBone,
        width: '100%',
        ...style,
      }}
    />
  );
}

// The one CTA. Every call to action on the page opens the brief modal.
export function Cta({ onClick, tone = 'ink', children, style }) {
  const dark = tone === 'ink';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: F.mono,
        fontSize: T.lbl,
        letterSpacing: LS.label,
        textTransform: 'uppercase',
        background: C.bronze,
        color: '#0B0B0B',
        border: 'none',
        padding: `${SP[4]}px ${SP[6]}px`,
        cursor: 'pointer',
        display: 'inline-block',
        transition: 'background 160ms ease, transform 160ms ease',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bronzeDim; }}
      onMouseLeave={e => { e.currentTarget.style.background = C.bronze; }}
    >
      {children}
    </button>
  );
}