import React from 'react';

// Ported verbatim from the CV6 design system (components/core/Button.jsx).

/**
 * Corner CV6 primary action control.
 * Variants map to the product's button hierarchy; press = a subtle shrink, never a colour flash.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft = null,
  iconRight = null,
  full = false,
  disabled = false,
  onClick,
  children,
  style = {},
}) {
  const [pressed, setPressed] = React.useState(false);

  const sizes = {
    sm: { height: 34, padding: '0 12px', font: 13, radius: 'var(--radius-control)' },
    md: { height: 42, padding: '0 16px', font: 13, radius: 'var(--radius-button)' },
    lg: { height: 50, padding: '0 18px', font: 14.5, radius: 'var(--radius-button)' },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: { background: 'var(--accent)', color: '#fff', border: '1px solid transparent' },
    secondary: { background: 'var(--surface-2)', color: 'var(--fg)', border: '1px solid var(--hair)' },
    ghost: { background: 'transparent', color: 'var(--muted)', border: '1px solid transparent' },
    accentWeak: { background: 'var(--accent-weak)', color: 'var(--accent)', border: '1px solid var(--accent-weak)' },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        width: full ? '100%' : 'auto',
        height: s.height,
        padding: s.padding,
        borderRadius: s.radius,
        fontFamily: 'var(--font-sans)',
        fontSize: s.font,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'transform var(--dur-press) var(--ease-out)',
        transform: pressed && !disabled ? 'scale(var(--press-scale-lg))' : 'scale(1)',
        ...v,
        ...style,
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

export default Button;
