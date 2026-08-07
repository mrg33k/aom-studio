import React from 'react';

/**
 * CV6 kit Chat — Summary Block. Digests something long (email, thread, doc)
 * into scannable bullets + checkable action items + suggested next moves.
 * Faithful to ui_kits/agent-chat/summary.html.
 *
 * Props:
 *   bullets[]    = { text: string, isWarn?: boolean }  // Main digest points
 *   actions[]    = { id: string, text: string, done?: boolean }  // Checkable action items
 *   metadata     = { count?: number, timeLabel?: string }  // e.g. "3 messages · 2 days"
 *   chips[]      = { id: string, label: string, icon?: 'edit' | 'add' | 'link', isPrimary?: boolean }
 *   onActionToggle(actionId, isDone)  // Callback when user clicks checkbox
 *   onChipClick(chipId)  // Callback when user clicks action chip
 */

const ICONS = {
  star: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3l1.7 5.1 5.3 1.9-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9Z" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '1px' }}>
      <path d="m5 12 4 4L19 7" />
    </svg>
  ),
  edit: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  link: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

const CHIP_ICONS = {
  edit: ICONS.edit,
  add: ICONS.plus,
  link: ICONS.link,
};

export function SummaryBlock({
  headline = '',
  bullets = [
    { text: 'Wants to expand the pilot to three teams (CS + Ops, ~40 seats)' },
    { text: 'Needs revised pricing by Friday to lock budget' },
    { text: 'Hopes the pilot discount carries over' },
    { text: 'Risk: their Q3 start vs. our rollout timeline', isWarn: true },
  ],
  actions = [
    { id: 'a1', text: 'Send revised 3-team pricing by Friday', done: false },
    { id: 'a2', text: 'Confirm the rollout timeline works for Q3', done: false },
    { id: 'a3', text: 'Pull current pricing sheet', done: true },
  ],
  metadata = { count: 3, timeLabel: '2 days' },
  chips = [
    { id: 'c1', label: 'Draft the reply', icon: 'edit', isPrimary: true },
    { id: 'c2', label: 'Add to Tracker' },
    { id: 'c3', label: 'Open thread' },
  ],
  onActionToggle,
  onChipClick,
}) {
  const handleActionClick = (actionId, currentDone) => {
    if (onActionToggle) onActionToggle(actionId, !currentDone);
  };

  const handleChipClick = (chipId) => {
    if (onChipClick) onChipClick(chipId);
  };

  return (
    <div className="csum">
      {/* Header: Summary title + metadata */}
      <div className="csum-h">
        <span style={{ color: 'var(--accent)' }}>{ICONS.star}</span>
        <span className="se">Summary</span>
        {metadata.count || metadata.timeLabel ? (
          <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'var(--muted)' }}>
            {metadata.count ? `${metadata.count} messages · ` : ''}
            {metadata.timeLabel ? `${metadata.timeLabel}` : ''}
          </span>
        ) : null}
      </div>

      {/* Bullet points */}
      <div className="csum-body">
        {headline ? <div className="sheadline">{headline}</div> : null}
        {bullets.map((bullet, idx) => (
          <div key={idx} className={`sbullet ${bullet.isWarn ? 'is-warn' : ''}`}>
            <span className="sd" />
            <div>{bullet.text}</div>
          </div>
        ))}
      </div>

      {/* Action items section */}
      <div className="cact">
        <div className="eyebrow" style={{ marginBottom: '6px' }}>Action items</div>
        {actions.map((action) => (
          <div
            key={action.id}
            className={`aitem ${action.done ? 'is-done' : ''}`}
            onClick={() => handleActionClick(action.id, action.done)}
            style={{ cursor: 'pointer' }}
          >
            <span className="ck">
              {action.done ? ICONS.check : null}
            </span>
            <span style={action.done ? { color: 'var(--muted)', textDecoration: 'line-through' } : {}}>
              {action.text}
            </span>
          </div>
        ))}
      </div>

      {/* Action chips */}
      {chips && chips.length > 0 && (
        <div className="chips">
          {chips.map((chip) => (
            <button
              key={chip.id}
              className={`chip-btn ${chip.isPrimary ? 'is-primary' : ''}`}
              onClick={() => handleChipClick(chip.id)}
            >
              {chip.icon && CHIP_ICONS[chip.icon]}
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
