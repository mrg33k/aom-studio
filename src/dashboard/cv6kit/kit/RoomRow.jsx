import React from 'react';
import { StatusDot } from './StatusDot.jsx';
import { Badge } from './Badge.jsx';

// Ported verbatim from the CV6 design system (components/rooms/RoomRow.jsx).
// This is THE row for a conversations list / All Rooms / a room picker.

/**
 * One row in All Rooms / a room picker. Leads with either a status dot (agents)
 * or a project glyph; trails with a count, unread badge, or chevron. Active rows
 * tint with accent-weak.
 */
export function RoomRow({
  leading = null,        // inline SVG glyph; if omitted and `status` set, a StatusDot is used
  status = null,
  name,
  subtitle = null,
  tag = null,            // e.g. "AGENT"
  count = null,
  unread = null,
  chevron = false,
  active = false,
  onClick,
  style = {},
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: subtitle ? '11px 12px' : '10px 12px',
        borderRadius: 'var(--radius-pill)',
        background: active ? 'var(--accent-weak)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {leading || (status && <StatusDot status={status} />)}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          color: 'var(--fg)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{name}</div>
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
        )}
      </div>
      {tag && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.08em', color: 'var(--faint)' }}>{tag}</span>
      )}
      {count != null && (
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{count}</span>
      )}
      {unread != null && <Badge tone="solid">{unread}</Badge>}
      {chevron && (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
      )}
    </div>
  );
}

export default RoomRow;
