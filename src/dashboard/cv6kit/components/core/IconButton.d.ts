import React from 'react';

export interface IconButtonProps {
  /** surface = bordered well · accent = filled command look · ghost = bare */
  tone?: 'surface' | 'accent' | 'ghost';
  /** px square; defaults to 40 */
  size?: number;
  /** show the unread dot in the top-right */
  badge?: boolean;
  title?: string;
  onClick?: () => void;
  /** the icon glyph (inline SVG, ~18px) */
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Square icon affordance for toolbars and headers. */
export function IconButton(props: IconButtonProps): JSX.Element;
