import React from 'react';

export interface MessageBubbleProps {
  from?: 'agent' | 'me';
  /** agent only: display name */
  author?: string;
  /** agent only: 2-letter avatar initials */
  initials?: string;
  /** mono timestamp */
  time?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** A conversation message — labelled agent line or the user's accent bubble. */
export function MessageBubble(props: MessageBubbleProps): JSX.Element;
