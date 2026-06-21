/**
 * ActivityDock — a floating glass pill showing a running background job
 * (recording, agent work, file processing, etc.) that follows you across screens.
 *
 * Props:
 *   job: { kind, label, detail, progress, icon?, color?, bgColor?, borderColor? }
 *     - kind: 'recording' | 'working' | 'done' | 'blocked'
 *     - label: main text (e.g., "Recording · 08:42")
 *     - detail: sub-text (e.g., "Corner · Dashboard")
 *     - progress: optional number 0-100 for progress indicators
 *     - icon: optional JSX to render in the icon tile (defaults to a pulse/spinner based on kind)
 *     - color: icon color (var name, e.g., 'var(--fg)')
 *     - bgColor: background color (var or hex, defaults by kind)
 *     - borderColor: border color (var or hex, defaults by kind)
 *   onOpen: callback when pill is tapped
 *   onStop: callback when stop/collapse button is tapped
 *   showLiveTag: whether to render a LIVE | REVIEW badge (default: true for active jobs)
 *   tag: optional { label, color, bgColor } override for the status tag
 */

import { memo } from 'react';

// Default styling by job kind
const KIND_DEFAULTS = {
  recording: {
    bgColor: 'rgba(248, 113, 113, .16)',
    borderColor: 'rgba(248, 113, 113, .34)',
    accentColor: '#F87171',
    tagColor: '#F87171',
    tagBgColor: '#F87171',
  },
  working: {
    bgColor: 'var(--accent-weak)',
    borderColor: 'var(--accent-weak)',
    accentColor: 'var(--accent)',
    tagColor: 'var(--accent)',
    tagBgColor: 'var(--accent-weak)',
  },
  done: {
    bgColor: 'var(--success-weak)',
    borderColor: 'var(--success-weak)',
    accentColor: 'var(--success)',
    tagColor: 'var(--success)',
    tagBgColor: 'var(--success-weak)',
  },
  blocked: {
    bgColor: 'var(--warn-weak)',
    borderColor: 'var(--warn-weak)',
    accentColor: 'var(--warn)',
    tagColor: 'var(--warn)',
    tagBgColor: 'var(--warn-weak)',
  },
};

// Default icon per job kind
function DefaultIcon({ kind, color }) {
  if (kind === 'recording') {
    return (
      <span
        style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color || '#F87171',
          animation: 'recPulse 1.4s infinite',
        }}
      />
    );
  }

  // Spinner for 'working', 'done', 'blocked'
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color || 'var(--accent)'}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 1.05s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}

export const ActivityDock = memo(function ActivityDock({
  job = {},
  onOpen,
  onStop,
  showLiveTag = true,
  tag,
}) {
  const { kind = 'working', label = '', detail = '', progress } = job;
  const defaults = KIND_DEFAULTS[kind] || KIND_DEFAULTS.working;

  // Resolve colors
  const bgColor = job.bgColor || defaults.bgColor;
  const borderColor = job.borderColor || defaults.borderColor;
  const accentColor = job.color || defaults.accentColor;
  const tagColor = tag?.color || defaults.tagColor;
  const tagBgColor = tag?.bgColor || defaults.tagBgColor;

  // Default tag label by kind
  const tagLabel = tag?.label || (kind === 'recording' ? 'RECORDING' : 'LIVE');

  // For recording: show collapse + Finish buttons. For others: collapse + tag.
  const isRecording = kind === 'recording';

  return (
    <>
      <style>{`
        @keyframes recPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        className="actdock is-float"
        style={{
          position: 'absolute',
          left: '12px',
          right: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '11px',
          height: '50px',
          padding: '0 10px 0 13px',
          borderRadius: '14px',
          background: bgColor,
          border: `1px solid ${borderColor}`,
          backdropFilter: 'blur(16px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
          boxShadow: '0 12px 30px -10px rgba(0,0,0,.6)',
          zIndex: 9,
        }}
      >
        {/* Icon tile */}
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            background: isRecording ? 'transparent' : accentColor,
            color: accentColor,
          }}
        >
          {job.icon || <DefaultIcon kind={kind} color={accentColor} />}
        </span>

        {/* Body: title + subtitle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--fg)',
              lineHeight: '1.2',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--muted)',
              marginTop: '1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {detail}
          </div>
        </div>

        {/* Collapse button (chevron up) */}
        <button
          onClick={onOpen}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            border: 'none',
            background: 'rgba(255,255,255,.07)',
            color: 'var(--fg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
          aria-label="Collapse or expand"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--faint)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 15 6-6 6 6" />
          </svg>
        </button>

        {/* Right side: either tag + finish button OR tag only */}
        {isRecording ? (
          <button
            onClick={onStop}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '9px',
              border: 'none',
              background: '#F87171',
              color: '#fff',
              fontSize: '11.5px',
              fontWeight: '600',
              fontFamily: 'var(--font-sans)',
              flex: 'none',
              cursor: 'pointer',
            }}
          >
            Finish
          </button>
        ) : (
          showLiveTag && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: tagColor,
                background: tagBgColor,
                padding: '3px 8px',
                borderRadius: '8px',
                flex: 'none',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {tagLabel}
            </span>
          )
        )}
      </div>
    </>
  );
});

ActivityDock.displayName = 'ActivityDock';
