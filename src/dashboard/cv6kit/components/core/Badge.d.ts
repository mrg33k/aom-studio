import React from 'react';

export interface BadgeProps {
  /** weak = accent-weak counter · solid = white-on-accent unread · chip = neutral count */
  tone?: 'weak' | 'solid' | 'chip';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Small count / status pill. */
export function Badge(props: BadgeProps): JSX.Element;
