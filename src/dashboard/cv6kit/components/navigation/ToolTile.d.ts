import React from 'react';

export interface ToolTileProps {
  /** inline SVG icon (~22px tile / ~19px rail), stroke="currentColor" recommended */
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  /** compact = desktop top-bar nav (shrunk, all 8 fit) · tile = large tools row · rail = mobile side rail */
  layout?: 'compact' | 'tile' | 'rail';
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** A navigation tool entry, in either the desktop tools row or mobile rail. */
export function ToolTile(props: ToolTileProps): JSX.Element;
