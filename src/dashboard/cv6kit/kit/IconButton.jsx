import React from 'react';

// Ported verbatim from the CV6 design system (components/core/IconButton.jsx).

/**
 * Square icon button · toolbar / header affordance.
 * `tone="accent"` gives the filled command-key look (white glyph on accent, soft ring).
 */
export function IconButton({
  tone = 'surface',
  size = 40,
  badge = false,
  title,
  onClick,
  children,
  style = {},
}) {
  const [pressed, setPressed] = React.useState(false);

  const tones = {
    surface: { background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--hair)', boxShadow: 'none' },
    accent: { background: 'var(--accent)', color: '#fff', border: '1px solid transparent', boxShadow: 'var(--ring-accent)' },
    ghost: { background: 'transparent', color: 'var(--muted)', border: '1px solid transparent', boxShadow: 'none' },
  };
  const t = tones[tone] || tones.surface;

  return (
    <button
      title={title}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: 'var(--radius-control)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'transform var(--dur-press) var(--ease-out)',
        transform: pressed ? 'scale(var(--press-scale))' : 'scale(1)',
        ...t,
        ...style,
      }}
    >
      {children}
      {badge && (
        <span style={{
          position: 'absolute', top: 9, right: 10, width: 7, height: 7,
          borderRadius: '50%', background: 'var(--accent)',
          border: '2px solid var(--ground)',
        }} />
      )}
    </button>
  );
}

export default IconButton;
