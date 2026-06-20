import React from 'react';

export interface CardProps {
  /** apply the .glassy class so it blurs under the glass theme (default true) */
  glassy?: boolean;
  /** padding in px (default 16) */
  pad?: number;
  /** border-radius (default --radius-card / 16px) */
  radius?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Base frosted surface panel — surface fill, hair border, soft shadow. */
export function Card(props: CardProps): JSX.Element;
