import React from 'react';

// Ported verbatim from the CV6 design system (components/core/Card.jsx).

/**
 * The base surface · a frosted (in glass theme) panel with hair border and soft
 * shadow. Most content blocks sit on a Card. Pass `glassy` (default true) so it
 * blurs under the glass theme only.
 */
export function Card({ glassy = true, pad = 16, radius = 'var(--radius-card)', children, style = {} }) {
  return (
    <div
      className={glassy ? 'glassy' : undefined}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--hair)',
        borderRadius: radius,
        boxShadow: 'var(--shadow-card)',
        padding: pad,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
