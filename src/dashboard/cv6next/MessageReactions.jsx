// MessageReactions — lightweight emoji reactions on messages.
// Hover/long-press shows 5 quick-react emojis. Reactions stored as metadata.reactions
// array on the message row. Renders reaction pills below messages that have them.
// smoothness-blitz #23

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { authFetch } from '../lib/authFetch';

const QUICK_EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F914}', '\u{1F389}'];

// The reaction pill: one emoji + count, tappable to toggle your own.
function ReactionPill({ emoji, count, reacted, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${emoji} ${count}`}
      aria-pressed={reacted ? 'true' : 'false'}
      className="cv6-reaction-pill"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 26, padding: '0 8px', borderRadius: 13,
        border: reacted ? '1px solid var(--accent)' : '1px solid var(--divider)',
        background: reacted ? 'var(--accent-weak)' : 'var(--surface-2)',
        color: 'var(--fg)', fontSize: 13, fontFamily: 'var(--font-sans)',
        cursor: 'pointer', flex: 'none', lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 14 }}>{emoji}</span>
      {count > 1 ? <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{count}</span> : null}
    </button>
  );
}

// The quick-react picker: appears on hover or long-press.
function QuickPicker({ onPick, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose?.(); };
    document.addEventListener('mousedown', onClick, true);
    return () => document.removeEventListener('mousedown', onClick, true);
  }, [onClose]);
  return (
    <div ref={ref} className="cv6-reaction-picker" style={{
      position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
      display: 'flex', gap: 2, padding: '4px 6px', borderRadius: 20,
      background: 'var(--surface)', border: '1px solid var(--hair)',
      boxShadow: '0 8px 24px -8px rgba(0,0,0,.4)', zIndex: 5,
      animation: 'cv6FadeIn .12s ease both',
    }}>
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => { onPick(emoji); onClose?.(); }}
          aria-label={`React with ${emoji}`}
          style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'transparent', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background .1s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover, rgba(255,255,255,.08))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// The main component: renders existing reactions + the hover trigger.
export default function MessageReactions({ messageId, reactions: initialReactions, worldId }) {
  const [reactions, setReactions] = useState(() => {
    const r = Array.isArray(initialReactions) ? initialReactions : [];
    return r;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef(null);

  // Group reactions by emoji: { emoji, count, reacted (did this user react?) }
  const grouped = reactions.reduce((acc, r) => {
    const existing = acc.find((g) => g.emoji === r.emoji);
    if (existing) { existing.count += 1; if (r.self) existing.reacted = true; }
    else acc.push({ emoji: r.emoji, count: 1, reacted: !!r.self });
    return acc;
  }, []);

  const toggleReaction = useCallback(async (emoji) => {
    if (!messageId) return;
    const existing = reactions.find((r) => r.emoji === emoji && r.self);
    let next;
    if (existing) {
      next = reactions.filter((r) => !(r.emoji === emoji && r.self));
    } else {
      next = [...reactions, { emoji, self: true, ts: new Date().toISOString() }];
    }
    setReactions(next);
    // Persist to Supabase via the messages metadata
    try {
      await authFetch('/api/dashboard/message-reaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_id: messageId,
          emoji,
          action: existing ? 'remove' : 'add',
          client_id: worldId || '',
        }),
      });
    } catch {
      // Revert on failure
      setReactions(reactions);
    }
  }, [messageId, reactions, worldId]);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(true);
  };
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => { setHovered(false); setPickerOpen(false); }, 300);
  };

  if (!messageId) return null;

  const hasReactions = grouped.length > 0;
  const showTrigger = hovered && !pickerOpen;

  return (
    <div
      className="cv6-reactions-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: hasReactions ? 4 : 0, minHeight: hovered ? 26 : (hasReactions ? 26 : 0) }}
    >
      {grouped.map((g) => (
        <ReactionPill
          key={g.emoji}
          emoji={g.emoji}
          count={g.count}
          reacted={g.reacted}
          onToggle={() => toggleReaction(g.emoji)}
        />
      ))}
      {showTrigger ? (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Add reaction"
          style={{
            width: 26, height: 26, borderRadius: 13,
            border: '1px solid var(--divider)', background: 'var(--surface-2)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: 'var(--muted)', flex: 'none',
          }}
        >
          +
        </button>
      ) : null}
      {pickerOpen ? <QuickPicker onPick={toggleReaction} onClose={() => setPickerOpen(false)} /> : null}
    </div>
  );
}
