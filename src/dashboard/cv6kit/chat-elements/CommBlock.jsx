import React from 'react';

/**
 * CV6 kit Chat — Communication Block (success / question / snag).
 * The three typed blocks an agent reaches for when it needs to speak clearly.
 *
 * Props:
 *   kind          = 'success' | 'question' | 'snag'
 *   title         = string (e.g. "DONE · STEP 2 OF 4", "QUESTION", "SNAG")
 *   body          = string or React node (main message text)
 *   options       = [{ id, label, recommended: bool }] (for question/snag; optional)
 *   recommendedId = string (which option id is recommended, for snag)
 *   onChoose      = (optionId) => void (callback when option tapped)
 *   actions       = [{ id, label, isPrimary: bool }] (action buttons; optional)
 *   onAction      = (actionId) => void (callback when action tapped)
 *   paths         = [{ icon, label }] (for snag: the "two ways forward" list)
 *
 * Sample usage:
 *   <CommBlock
 *     kind="success"
 *     title="DONE · STEP 2 OF 4"
 *     body="Patched resolve_repo_path() and the docs-only build routes again. Diff is small and reversible."
 *     actions={[{ id: 'view', label: 'View diff', isPrimary: true }, { id: 'next', label: 'Next step' }]}
 *     onAction={(id) => console.log('Action:', id)}
 *   />
 */

const SVG_CHECK = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 13 4 4L19 7"/>
  </svg>
);

const SVG_QUESTION = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .8-1 1.6"/>
    <path d="M12 17h.01"/>
  </svg>
);

const SVG_WARN = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4M12 17h.01"/>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>
  </svg>
);

const SVG_CHECK_SUCCESS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 13 4 4L19 7"/>
  </svg>
);

const SVG_DASH_MUTED = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8v8"/>
  </svg>
);

function CommBlock({
  kind = 'success',
  title = 'TITLE',
  body = 'Message body',
  options = [],
  recommendedId = null,
  onChoose = null,
  actions = [],
  onAction = null,
  paths = [],
}) {
  const iconGlyph = kind === 'success' ? SVG_CHECK : kind === 'question' ? SVG_QUESTION : SVG_WARN;
  const blockClass = `cblk is-${kind}`;

  return (
    <div className={blockClass}>
      {/* Header: icon + title */}
      <div className="cblk-h">
        <span className="ci">{iconGlyph}</span>
        <span className="ct">{title}</span>
      </div>

      {/* Body: main message text */}
      <div className="cblk-b">{body}</div>

      {/* Paths (snag only): the "two ways forward" list */}
      {kind === 'snag' && paths && paths.length > 0 && (
        <div>
          {paths.map((path, idx) => (
            <div key={idx} className="cpath">
              {path.iconRecommended ? SVG_CHECK_SUCCESS : SVG_DASH_MUTED}
              <span>{path.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Option chips (question / snag) */}
      {(kind === 'question' || kind === 'snag') && options && options.length > 0 && (
        <div className="chips">
          {options.map((opt) => (
            <button
              key={opt.id}
              className={`chip-btn${opt.recommended ? ' is-primary' : ''}`}
              onClick={() => onChoose && onChoose(opt.id)}
              style={{ borderStyle: opt.isFreeReply ? 'dashed' : 'solid' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Action buttons (success / other) */}
      {actions && actions.length > 0 && (
        <div className="chips">
          {actions.map((act) => (
            <button
              key={act.id}
              className={`chip-btn${act.isPrimary ? ' is-primary' : ''}`}
              onClick={() => onAction && onAction(act.id)}
            >
              {act.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CommBlock;
