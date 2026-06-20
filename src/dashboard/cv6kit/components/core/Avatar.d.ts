import React from 'react';

export interface AvatarProps {
  /** initial shown when no image */
  initial?: string;
  /** image url; overrides the gradient */
  src?: string | null;
  /** px diameter; default 40 */
  size?: number;
  /** accent ring (used when the avatar is the menu button) */
  ring?: boolean;
  style?: React.CSSProperties;
}

/** Round identity avatar — brand gradient + initial, or an image. */
export function Avatar(props: AvatarProps): JSX.Element;
