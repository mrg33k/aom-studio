import React from 'react';

export interface ButtonProps {
  /** Visual hierarchy. primary = accent fill; secondary = bordered surface; ghost = transparent; accentWeak = tinted accent. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'accentWeak';
  /** sm 34px · md 42px · lg 50px */
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  /** Stretch to container width. */
  full?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * The standard Corner action button.
 * @startingPoint section="Core" subtitle="Accent / secondary / ghost action button" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
