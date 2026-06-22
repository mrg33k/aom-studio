/**
 * ActivityDock — a floating glass pill showing a running background job
 * (recording, agent work, file processing, etc.) that follows you across screens.
 *
 * Props (two modes):
 *
 * FLOAT MODE (single job):
 *   job: { kind, label, detail }
 *     - kind: 'recording' | 'working' | 'secondary' | 'drafting'
 *     - label: main text (e.g., "Recording · 08:42")
 *     - detail: sub-text (e.g., "Corner · Dashboard")
 *   onOpen: callback when pill body is tapped (navigate to job)
 *   onExpand: callback when chevron is tapped (show control sheet)
 *   variant: 'float' (full-width glass pill under header) | 'rail' (card in Command rail)
 *   trailing: 'action' | 'status' — determines right-side control
 *
 * RAIL MODE (jobs array):
 *   jobs: [{ kind, label, detail }, ...]
 *   onSelectJob: callback when a job card is tapped
 *   variant: 'rail'
 *
 * The component is responsive: on float it's position:absolute full-width under
 * the header; on rail it's a horizontal flex container of stacked cards.
 */

import { memo } from 'react';

// Color per job kind — tints icon tile and (for float) the pill bg/border
const KIND_COLORS = {
  recording: {
    accentColor: '#F87171', // red
    bgColor: 'rgba(248, 113, 113, .16)',
    borderColor: 'rgba(248, 113, 113, .34)',
    tagLabel: 'RECORDING',
    tagColor: '#F87171',
    tagBgColor: 'rgba(248, 113, 113, .2)',
  },
  working: {
    accentColor: 'var(--accent)',
    bgColor: 'var(--accent-weak)',
    borderColor: 'rgba(91,155,255,.3)', // accent-weak
    tagLabel: 'LIVE',
    tagColor: 'var(--accent)',
    tagBgColor: 'var(--accent-weak)',
  },
  secondary: {
    accentColor: '#A855F7', // violet
    bgColor: 'rgba(168, 85, 247, .16)',
    borderColor: 'rgba(168, 85, 247, .34)',
    tagLabel: 'LIVE',
    tagColor: '#A855F7',
    tagBgColor: 'rgba(168, 85, 247, .2)',
  },
  drafting: {
    accentColor: 'var(--success)',
    bgColor: 'var(--success-weak)',
    borderColor: 'rgba(70, 224, 168, .3)',
    tagLabel: 'REVIEW',
    tagColor: 'var(--success)',
    tagBgColor: 'var(--success-weak)',
  },
};

// Icon component for each job kind
function JobIcon({ kind, color }) {
  if (kind === 'recording') {
    return (
      <span
        style={{
          display: 'inline-block',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: color,
          animation: 'recPulse 1.4s infinite',
        }}
      />
    );
  }

  if (kind === 'drafting') {
    // Pencil/edit icon
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    );
  }

  // Spinner for 'working' and 'secondary'
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ animation: 'spin 1.05s linear infinite' }}
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}

// Single job dock — both float and rail use this
function DockCard({ job, onOpen, onExpand, variant = 'float', showTrailingAction = true }) {
  const { kind = 'working', label = '', detail = '' } = job;
  const colors = KIND_COLORS[kind] || KIND_COLORS.working;

  const isFloat = variant === 'float';
  const isRecording = kind === 'recording';

  // Float variant: position:absolute full-width glass pill
  if (isFloat) {
    return (
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
          background: colors.bgColor,
          border: `1px solid ${colors.borderColor}`,
          backdropFilter: 'blur(16px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
          boxShadow: '0 12px 30px -10px rgba(0,0,0,.6)',
          zIndex: 9,
        }}
      >
        {/* Icon tile */}
        <span
          className="ad-ico"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 'none',
            background: colors.bgColor,
            color: colors.accentColor,
          }}
        >
          <JobIcon kind={kind} color={colors.accentColor} />
        </span>

        {/* Body: title + detail */}
        <div className="ad-body" style={{ flex: 1, minWidth: 0 }}>
          <div className="ad-title" style={{
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--fg)',
            lineHeight: '1.2',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </div>
          <div className="ad-sub" style={{
            fontSize: '11px',
            color: 'var(--muted)',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {detail}
          </div>
        </div>

        {/* Chevron button (expand control sheet) */}
        <button
          onClick={onExpand}
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
          aria-label="Expand controls"
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

        {/* Trailing: action (Finish) or status pill */}
        {showTrailingAction && (
          isRecording ? (
            <button
              onClick={onOpen}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '9px',
                border: 'none',
                background: colors.accentColor,
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
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: colors.tagColor,
              background: colors.tagBgColor,
              padding: '3px 8px',
              borderRadius: '8px',
              flex: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {colors.tagLabel}
            </span>
          )
        )}
      </div>
    );
  }

  // Rail variant: a card in a horizontal rail
  return (
    <div
      className="actdock"
      onClick={onOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        height: '56px',
        padding: '0 10px 0 13px',
        borderRadius: '14px',
        background: 'var(--surface)',
        border: '1px solid var(--hair)',
        boxShadow: 'var(--shadow-card)',
        flex: 'none',
        cursor: 'pointer',
        width: 240,
      }}
    >
      {/* Icon tile */}
      <span
        className="ad-ico"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          background: colors.bgColor,
          color: colors.accentColor,
        }}
      >
        <JobIcon kind={kind} color={colors.accentColor} />
      </span>

      {/* Body: title + detail */}
      <div className="ad-body" style={{ flex: 1, minWidth: 0 }}>
        <div className="ad-title" style={{
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--fg)',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {label}
        </div>
        <div className="ad-sub" style={{
          fontSize: '11px',
          color: 'var(--muted)',
          marginTop: '1px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {detail}
        </div>
      </div>
    </div>
  );
}

export const ActivityDock = memo(function ActivityDock({
  // Single job (float mode)
  job,
  onOpen,
  onExpand,
  // Multiple jobs (rail mode)
  jobs,
  onSelectJob,
  // Shared
  variant = 'float',
  showTrailingAction = true,
}) {
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

      {/* Float: single dock under header */}
      {variant === 'float' && job && (
        <DockCard
          job={job}
          onOpen={onOpen}
          onExpand={onExpand}
          variant="float"
          showTrailingAction={showTrailingAction}
        />
      )}

      {/* Rail: stack of job cards in Command */}
      {variant === 'rail' && jobs && jobs.length > 0 && (
        <div
          className="actrail"
          style={{
            display: 'flex',
            gap: '10px',
            overflow: 'visible',
          }}
        >
          {jobs.map((j, idx) => (
            <DockCard
              key={idx}
              job={j}
              onOpen={() => onSelectJob?.(idx)}
              onExpand={() => onSelectJob?.(idx)}
              variant="rail"
              showTrailingAction={false}
            />
          ))}
        </div>
      )}
    </>
  );
});

ActivityDock.displayName = 'ActivityDock';
