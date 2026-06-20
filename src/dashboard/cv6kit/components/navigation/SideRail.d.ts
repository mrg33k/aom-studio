import React from 'react';

export interface SideRailItem {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export interface SideRailProps {
  items: SideRailItem[];
  /** key of the active item */
  active?: string;
  onSelect?: (key: string) => void;
  /** profile/menu-button tap */
  onMenu?: () => void;
  /** which utility buttons to stack at the bottom */
  utilities?: Array<'search' | 'theme' | 'alerts'>;
  style?: React.CSSProperties;
}

/**
 * Mobile side menu — profile is the menu button, nav fills the middle, utilities pin to the bottom.
 * @startingPoint section="Navigation" subtitle="Mobile Discord-style side menu" viewport="72x844"
 */
export function SideRail(props: SideRailProps): JSX.Element;
