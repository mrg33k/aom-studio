// cv6next — PinLayer: interactive overlay for dropping and displaying pins on the viewer.
// Renders a click-sensitive area that creates new pins; displays existing pins with numbering.
// Positioned absolutely over the viewer (doc/image/video/website).
// Usage: wrap the viewer, pass onClick handler and pins array.

import React, { useRef, useCallback } from 'react';

export function PinLayer({ pins = [], onAddPin, onOpenPin, children, className = '' }) {
  const containerRef = useRef(null);

  const handleClick = useCallback((e) => {
    // Only create a pin on click if the click is on the empty space (not a button/pin).
    if (e.target === containerRef.current || e.target === e.currentTarget) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onAddPin?.(x, y, rect.width, rect.height);
    }
  }, [onAddPin]);

  return (
    <div
      ref={containerRef}
      className={`pin-layer ${className}`}
      style={{
        position: 'relative',
        cursor: 'crosshair',
        overflow: 'hidden',
      }}
      onClick={handleClick}
    >
      {children}

      {/* Render each pin as a numbered circle at its x/y position */}
      {pins.map((pin) => (
        <div
          key={pin.id}
          className="pin"
          style={{
            position: 'absolute',
            left: `${pin.x}%`,
            top: `${pin.y}%`,
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onOpenPin?.(pin.id);
          }}
          title={pin.text}
        >
          {pin.n}
        </div>
      ))}

      {/* Click hint overlay (will fade or hide after first use — keep it simple for now) */}
      {pins.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(0,0,0,.55)',
            borderRadius: 16,
            padding: '6px 12px',
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#fff',
            pointerEvents: 'none',
          }}
        >
          Click anywhere to comment
        </div>
      )}
    </div>
  );
}
