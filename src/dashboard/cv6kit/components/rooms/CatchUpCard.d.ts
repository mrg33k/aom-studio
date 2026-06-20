import React from 'react';

export interface CatchUpCardProps {
  project: string;
  /** e.g. "→ Mission /007" */
  mission: string;
  /** mono timestamp, e.g. "now" / "18m" */
  time: string;
  text: string;
  /** project glyph stroke colour */
  glyphColor?: string;
  style?: React.CSSProperties;
}

/** The triage unit in the Catch Up swipe deck. */
export function CatchUpCard(props: CatchUpCardProps): JSX.Element;
