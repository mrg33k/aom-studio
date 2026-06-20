import React from 'react';

export interface RoomRowProps {
  /** leading glyph (inline SVG, ~18px) for project rooms */
  leading?: React.ReactNode;
  /** OR a presence dot for agent rows */
  status?: 'online' | 'working' | 'attention' | 'idle' | null;
  name: string;
  subtitle?: string | null;
  /** mono tag on the right, e.g. "AGENT" */
  tag?: string | null;
  /** plain count (e.g. mission count) */
  count?: number | string | null;
  /** unread badge (solid) */
  unread?: number | null;
  chevron?: boolean;
  active?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** A row in All Rooms or a project room-picker. */
export function RoomRow(props: RoomRowProps): JSX.Element;
