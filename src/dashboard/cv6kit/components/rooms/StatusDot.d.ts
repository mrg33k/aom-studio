import React from 'react';

export interface StatusDotProps {
  status?: 'online' | 'working' | 'attention' | 'idle';
  /** px diameter (default 9) */
  size?: number;
  /** force the glow on/off; defaults to on for `online` only */
  glow?: boolean | null;
  style?: React.CSSProperties;
}

/** Presence / room-activity dot. */
export function StatusDot(props: StatusDotProps): JSX.Element;
