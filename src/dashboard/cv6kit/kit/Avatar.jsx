import React from 'react';

// Ported verbatim from the CV6 design system (components/core/Avatar.jsx).

/**
 * Round identity avatar. Default renders the brand gradient with an initial;
 * pass `src` for an image. Sizes are free-form px.
 */
export function Avatar({ initial = 'P', src = null, size = 40, ring = false, style = {} }) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: src ? `center/cover url(${src})` : 'var(--avatar)',
      boxShadow: ring ? '0 0 0 2px var(--accent)' : 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontFamily: 'var(--font-sans)',
      fontSize: Math.round(size * 0.36),
      fontWeight: 600,
      flex: 'none',
      ...style,
    }}>
      {!src && initial}
    </div>
  );
}

export default Avatar;
