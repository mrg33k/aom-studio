import React from 'react';

/**
 * CV6 kit Chat — ChoicesBlock + ThinkingState
 *
 * ChoicesBlock: Quick-reply / decision button chips, and optional confirm card
 * (for irreversible actions, renders a .cblk with explicit confirm/cancel buttons).
 * Choices can be marked recommended; the recommended one highlights as primary.
 *
 * Props:
 *   choices[]      = { id, label, recommended?, onClick? }
 *   onChoose(id)   = callback when a choice is tapped
 *   confirmMode?   = { title, body, confirmLabel, cancelLabel } — renders as confirm card instead of chips
 *   onConfirm?     = callback for confirm button
 *   onCancel?      = callback for cancel button
 *
 * ThinkingState: Honest working/thinking indicator with animated dots.
 *
 * Props:
 *   label          = The action being performed (e.g. "Checking the rollout calendar…")
 *   agentName?     = Agent name or initials (for colored avatar)
 *   color?         = Avatar background color (e.g. "rgba(163,230,53,.2)")
 */

export function ChoicesBlock({
  choices = [],
  onChoose,
  confirmMode = null,
  onConfirm,
  onCancel,
}) {
  const handleChoice = (choiceId) => {
    if (onChoose) onChoose(choiceId);
  };

  // Confirm card mode (for irreversible actions)
  if (confirmMode) {
    const { title, body, confirmLabel = 'Confirm & send', cancelLabel = 'Cancel' } = confirmMode;
    return (
      <div className="cblk" style={{ borderColor: 'var(--accent-weak)' }}>
        <div className="cblk-b" style={{ marginBottom: 11 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="chip-btn is-primary"
            onClick={onConfirm}
            style={{ flex: 1, justifyContent: 'center', height: 40 }}
          >
            {confirmLabel}
          </button>
          <button className="chip-btn" onClick={onCancel} style={{ flex: 'none', height: 40 }}>
            {cancelLabel}
          </button>
        </div>
      </div>
    );
  }

  // Quick-reply chips mode
  return (
    <div className="chips">
      {choices.map((choice) => (
        <button
          key={choice.id}
          className={`chip-btn ${choice.recommended ? 'is-primary' : ''}`}
          onClick={() => handleChoice(choice.id)}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

/**
 * ThinkingState: Animated thinking indicator with label
 *
 * Renders as a bubble-like thinking state with animated dots.
 * Props:
 *   label          = What the agent is working on (e.g. "Checking the rollout calendar…")
 *   agentName?     = Optional agent display name (for variant styling)
 *   agentInitials? = Avatar initials (if showing an avatar variant)
 *   bgColor?       = Avatar background (e.g. "rgba(163,230,53,.2)")
 *   textColor?     = Avatar text color (e.g. "#A3E635")
 */

export function ThinkingState({
  label = 'Working…',
  agentName = null,
  agentInitials = null,
  bgColor = null,
  textColor = null,
}) {
  const hasAvatar = agentInitials && bgColor && textColor;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: hasAvatar ? 9 : 0 }}>
      {hasAvatar && (
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: bgColor,
            color: textColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            flex: 'none',
          }}
        >
          {agentInitials}
        </div>
      )}
      <div className="thinking">
        <span className="dot3">
          <i />
          <i />
          <i />
        </span>
        <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{label}</span>
      </div>
    </div>
  );
}

/**
 * SAMPLE COMPONENT SHOWCASE (for standalone preview)
 * Renders the element kit as design-system cards inside a [data-cv6kit] scope.
 */

export function ChoicesBlockShowcase() {
  const [selectedChoice, setSelectedChoice] = React.useState(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [thinkingLabel, setThinkingLabel] = React.useState('Checking the rollout calendar…');

  return (
    <div data-cv6kit className="cc" style={{ background: 'var(--ground)', width: '100%' }}>
      <style>{'@keyframes think{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'}</style>

      <div className="cc-cap">
        <span className="k">Choices &amp; thinking</span>
        <span className="d">
          Whenever the next move is the human's, hand them tappable choices. And when the agent is
          working, say so honestly. no silent gaps, no filler.
        </span>
      </div>

      {/* Quick replies example */}
      <div className="turn">
        <div className="tav">EL</div>
        <div className="tbody">
          <div className="bubble">Pricing draft is ready. How do you want to send it?</div>
          <ChoicesBlock
            choices={[
              { id: 'send-me', label: 'Send as me' },
              { id: 'schedule', label: 'Schedule for 8am', recommended: true },
              { id: 'edit', label: 'Let me edit first' },
            ]}
            onChoose={(id) => setSelectedChoice(id)}
          />
        </div>
      </div>

      {selectedChoice && (
        <div className="turn">
          <div className="tav" style={{ background: 'rgba(52, 211, 153, 0.2)', color: 'var(--success)' }}>
            P
          </div>
          <div className="tbody">
            <div className="umsg">You chose: {selectedChoice}</div>
          </div>
        </div>
      )}

      {/* Confirm card example */}
      <div className="turn">
        <div className="tav">EL</div>
        <div className="tbody">
          <ChoicesBlock
            confirmMode={{
              title: 'Confirm send',
              body: (
                <>
                  This will email <strong>dana@acme.com</strong> on your behalf and add a follow-up
                  to Tracker.
                </>
              ),
              confirmLabel: 'Confirm & send',
              cancelLabel: 'Cancel',
            }}
            onConfirm={() => setConfirmOpen(false)}
            onCancel={() => setConfirmOpen(false)}
          />
          <div style={{ fontSize: '11px', color: 'var(--faint)', paddingLeft: '2px', marginTop: 8 }}>
            Anything irreversible gets an explicit confirm; the human is always in the loop.
          </div>
        </div>
      </div>

      {/* Thinking state — simple */}
      <div className="turn">
        <div className="tav">EL</div>
        <div className="tbody">
          <ThinkingState label={thinkingLabel} />
        </div>
      </div>

      {/* Thinking state — with agent variant (Rex) */}
      <div className="turn">
        <div className="tav" style={{ background: 'rgba(163,230,53,.2)', color: '#A3E635' }}>
          RX
        </div>
        <div className="tbody">
          <ThinkingState label="Rex is writing the changelog…" agentInitials="RX" bgColor="rgba(163,230,53,.2)" textColor="#A3E635" />
        </div>
      </div>
    </div>
  );
}
