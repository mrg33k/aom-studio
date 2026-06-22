import React from 'react';

/**
 * CV6 kit Chat — Email Block. Renders an email element inside a chat turn:
 * header (from/subject), quote context, optional attachments, flags, and action chips.
 * Faithful to ui_kits/agent-chat/email.html. Composes under .turn/.tbody/.bubble.
 *
 * Props:
 *   from              = { name, company, initials, avatarBg? } e.g. { name: 'Dana Whitfield', company: 'Acme', initials: 'DW', avatarBg: 'rgba(244,114,182,.18)' }
 *   subject           = string (e.g. 'Re: Q2 partnership scope')
 *   body              = string (the quoted text from the email)
 *   attachments       = [ { name, size, type? } ]? (e.g. [ { name: 'current-pricing.pdf', size: '180 KB' } ])
 *   flags             = [ string ]? (e.g. [ 'revenue-impacting', 'time-sensitive' ])
 *   threadCount       = number? (e.g. 3, shows "View thread · 3")
 *   actionChips       = [ { label, isPrimary?, icon? } ]? (e.g. [ { label: 'Draft a reply', isPrimary: true } ])
 */
export function EmailBlock({
  from = { name: 'Dana Whitfield', company: 'Acme', initials: 'DW', avatarBg: 'rgba(244,114,182,.18)' },
  subject = 'Re: Q2 partnership scope',
  body = 'Great results so far, we\'d love to bring CS and Ops in too, so three teams total. Could you get me revised pricing before Friday? We\'re locking budget this week.',
  attachments = [{ name: 'current-pricing.pdf', size: '180 KB' }],
  flags = ['revenue-impacting', 'time-sensitive'],
  threadCount = 3,
  actionChips = [
    { label: 'Draft a reply', isPrimary: true },
    { label: 'Summarize thread' },
    { label: 'Add to Tracker' },
  ],
  onOpenAttachment,
  onViewThread,
  onChipClick,
}) {
  const avatarColor = from.avatarBg || 'rgba(244,114,182,.18)';
  const textColor = from.avatarTextColor || '#F8A8D0';

  const ICON_DRAFT = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );

  const ICON_FILE = (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--pink-400)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
    </svg>
  );

  const ICON_FLAG = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22V4h13l-2 4 2 4H4" />
    </svg>
  );

  const ICON_CHEVRON = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );

  return (
    <div className="cmail">
      {/* Header: avatar, from/subject, tag */}
      <div className="cmail-h">
        <span
          className="ma"
          style={{
            background: avatarColor,
            color: textColor,
          }}
        >
          {from.initials || 'XX'}
        </span>
        <div style={{ flex: '1', minWidth: 0 }}>
          <div className="mfrom">
            {from.name}{from.company ? ` · ${from.company}` : ''}
          </div>
          <div className="msub">{subject}</div>
        </div>
        <span className="cmail-tag">Email</span>
      </div>

      {/* Quote context */}
      <div className="cmail-q">{body}</div>

      {/* Attachments (optional) */}
      {attachments && attachments.length > 0 && (
        <div style={{ padding: '0 14px 12px' }}>
          {attachments.map((att, i) => (
            <div key={i} className="frowm">
              <div className="fg">
                {ICON_FILE}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--fg)' }}>
                  {att.name}
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--faint)' }}>
                  {att.size}
                </div>
              </div>
              <button
                className="pillbtn"
                onClick={() => onOpenAttachment && onOpenAttachment(att)}
                style={{ flex: 'none' }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer: flags and view-thread link */}
      <div className="cmail-f">
        {ICON_FLAG}
        <span style={{ flex: 1, fontSize: '11px', color: 'var(--faint)' }}>
          {flags && flags.length > 0 ? `Flagged: ${flags.join(' · ')}` : 'No flags'}
        </span>
        {threadCount !== undefined && (
          <button
            onClick={() => onViewThread && onViewThread()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              padding: 0,
            }}
          >
            View thread · {threadCount}
            {ICON_CHEVRON}
          </button>
        )}
      </div>

      {/* Action chips */}
      {actionChips && actionChips.length > 0 && (
        <div className="chips">
          {actionChips.map((chip, i) => (
            <button
              key={i}
              className={`chip-btn ${chip.isPrimary ? 'is-primary' : ''}`}
              onClick={() => onChipClick && onChipClick(chip)}
            >
              {chip.icon && <span>{chip.icon}</span>}
              {chip.isPrimary && ICON_DRAFT}
              {chip.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
