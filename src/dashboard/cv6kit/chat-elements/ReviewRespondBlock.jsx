import React from 'react';

/**
 * CV6 kit Chat — Review & Respond Block.
 * Renders a sent artifact (screenshot, link, or webpage) with a Review affordance
 * and pinned user comments as replies. Part of the Agent Chat element kit.
 *
 * Props:
 *   artifactKind   - 'screenshot' | 'link' | 'webpage' (determines icon and styling)
 *   title          - artifact title/filename (e.g. 'home-final.png')
 *   url            - url for link/webpage artifacts
 *   previewSrc     - background image or placeholder src for canvas preview
 *   pins           - array of { number, x%, y% } for pin positions
 *   subtitle       - description line (e.g. '1 comment' or '2 pins · desktop & mobile')
 *   replies        - array of pinned replies { pinNumber, artifactRef, text }
 *   onReview       - callback when Review button clicked
 *   note           - optional help text below (for webpages: "open in Review canvas...")
 */

const ICONS = {
  screenshot: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  ),
  link: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  ),
  eye: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  ),
};

export function ReviewRespondBlock({
  artifactKind = 'screenshot',
  title = 'design.png',
  url = '',
  previewSrc = '',
  pins = [],
  subtitle = '1 comment',
  replies = [],
  onReview = () => {},
  note = '',
  agentInitials = 'EL',
}) {
  const kindLabel = artifactKind === 'screenshot' ? 'Screenshot' : artifactKind === 'webpage' ? 'Live site' : 'Link';

  return (
    <div className="turn">
      <div className="tav" style={{ background: 'rgba(52,211,153,.2)', color: 'var(--success)' }}>
        {agentInitials}
      </div>
      <div className="tbody">
        <div className="bubble">
          Here's the finished design. Want to mark anything up?
        </div>

        {/* Artifact container */}
        <div className="cartifact">
          {/* Canvas preview */}
          <div
            className={`cart-canvas ${artifactKind === 'screenshot' ? 'is-shot' : ''}`}
            style={previewSrc ? { backgroundImage: `url(${previewSrc})` } : {}}
          >
            {/* Pin markers */}
            {pins.map((pin) => (
              <div
                key={`pin-${pin.number}`}
                className="cart-pin"
                style={{
                  top: `${pin.y}%`,
                  left: `${pin.x}%`,
                }}
              >
                {pin.number}
              </div>
            ))}
          </div>

          {/* Browser chrome for link/webpage */}
          {artifactKind === 'webpage' && (
            <div className="cart-omni">
              <span className="lights">
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className="url">{url || 'cv6-preview.corner.so'}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </div>
          )}

          {/* Artifact bar (kind + subtitle + Review button) */}
          <div className="cart-bar">
            <span className="cart-kind">
              {ICONS[artifactKind] || ICONS.screenshot}
              {kindLabel}
            </span>
            <span style={{ flex: 1, fontSize: '11.5px', color: 'var(--muted)' }}>
              {title} · {subtitle}
            </span>
            <button className="review-btn" onClick={onReview}>
              {ICONS.eye}
              Review
            </button>
          </div>
        </div>

        {/* Optional note below */}
        {note && (
          <div style={{ fontSize: '11px', color: 'var(--faint)', paddingLeft: '2px' }}>
            {note}
          </div>
        )}

        {/* Pinned replies (user's comments on the artifact) */}
        {replies.map((reply) => (
          <div
            key={`reply-${reply.pinNumber}`}
            className="replyto"
            style={{
              alignSelf: 'flex-end',
              maxWidth: '86%',
              background: 'var(--accent)',
              borderColor: 'transparent',
            }}
          >
            <span className="q" style={{ background: 'rgba(255,255,255,.6)' }}></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,.85)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50% 50% 50% 2px',
                    background: 'rgba(255,255,255,.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '9px',
                  }}
                >
                  {reply.pinNumber}
                </span>
                On {reply.artifactRef || title}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#fff',
                  lineHeight: 1.4,
                  marginTop: '3px',
                }}
              >
                {reply.text || 'Make this a touch shorter so two fit above the fold.'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
