// MessageReactions — lightweight emoji reactions on messages.
// Hover/long-press shows 5 quick-react emojis. Reactions stored as metadata.reactions
// array on the message row. Renders reaction pills below messages that have them.
// smoothness-blitz #23

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { authFetch } from '../lib/authFetch';
import { convexMutation, convexPlaneActive } from './data/convexClient.js';
import { convexReadIdentity, convexViewerIdentity } from './data/convexIdentity.js';

const QUICK_EMOJIS = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F914}', '\u{1F389}'];
let reactionActorPromise = null;
function reactionActor() {
  if (!reactionActorPromise) {
    reactionActorPromise = convexViewerIdentity()
      .then((viewer) => String(convexReadIdentity(viewer) || '').trim().toLowerCase())
      .catch(() => '');
  }
  return reactionActorPromise;
}

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
export default function MessageReactions({ messageId, reactions: initialReactions, worldId, message, onReply }) {
  const [reactions, setReactions] = useState(() => {
    const r = Array.isArray(initialReactions) ? initialReactions : [];
    return r;
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copyState, setCopyState] = useState('');
  const [actor, setActor] = useState('');

  useEffect(() => { setReactions(Array.isArray(initialReactions) ? initialReactions : []); }, [initialReactions]);
  useEffect(() => {
    if (!convexPlaneActive()) return undefined;
    let alive = true;
    reactionActor().then((identity) => { if (alive) setActor(identity); });
    return () => { alive = false; };
  }, []);

  // Group reactions by emoji: { emoji, count, reacted (did this user react?) }
  const grouped = reactions.reduce((acc, r) => {
    const existing = acc.find((g) => g.emoji === r.emoji);
    const mine = !!r.self || (!!actor && String(r.actor || '').toLowerCase() === actor);
    if (existing) { existing.count += 1; if (mine) existing.reacted = true; }
    else acc.push({ emoji: r.emoji, count: 1, reacted: mine });
    return acc;
  }, []);

  const toggleReaction = useCallback(async (emoji) => {
    if (!messageId) return;
    let actorKey = actor;
    if (convexPlaneActive() && !actorKey) {
      actorKey = await reactionActor();
      if (actorKey) setActor(actorKey);
    }
    const existing = reactions.find((r) => r.emoji === emoji && (r.self || (actorKey && String(r.actor || '').toLowerCase() === actorKey)));
    let next;
    if (existing) {
      next = reactions.filter((r) => !(r.emoji === emoji && r.self));
    } else {
      next = [...reactions, { emoji, self: true, actor: actorKey, ts: new Date().toISOString() }];
    }
    setReactions(next);
    // Persist to Supabase via the messages metadata
    try {
      if (convexPlaneActive()) {
        if (!actorKey) throw new Error('No signed-in reaction identity');
        const saved = await convexMutation('messages:toggleReaction', { messageId: String(messageId), emoji, actor: actorKey });
        setReactions(Array.isArray(saved) ? saved : next);
      } else {
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
      }
    } catch {
      // Revert on failure
      setReactions(reactions);
    }
  }, [actor, messageId, reactions, worldId]);

  const replyTarget = message?.id ? {
    type: 'message',
    id: String(message.id),
    label: message.agentName || (message.isUser ? 'You' : 'message'),
    snippet: String(message.text || '').replace(/\s+/g, ' ').trim().slice(0, 240),
  } : null;
  const reply = () => { if (replyTarget && onReply) onReply(replyTarget); setMoreOpen(false); };
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(String(message?.text || ''));
      setCopyState('Copied');
    } catch { setCopyState('Copy failed'); }
    window.setTimeout(() => setCopyState(''), 1400);
  };

  if (!messageId) return null;

  const hasReactions = grouped.length > 0;
  return (
    <div className="cv6-reactions-wrap" style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: hasReactions ? 4 : 0, minHeight: hasReactions ? 26 : 0 }}>
      {grouped.map((g) => (
        <ReactionPill
          key={g.emoji}
          emoji={g.emoji}
          count={g.count}
          reacted={g.reacted}
          onToggle={() => toggleReaction(g.emoji)}
        />
      ))}
      <div className="cv6-message-actions" role="toolbar" aria-label="Message actions" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false); }}>
        <button type="button" className="cv6-message-action" aria-label="Add reaction" onClick={() => { setMoreOpen(false); setPickerOpen((open) => !open); }}><span aria-hidden="true">☺</span><em>React</em></button>
        {replyTarget && onReply ? <button type="button" className="cv6-message-action cv6-message-reply-btn" aria-label={`Reply to message from ${replyTarget.label}`} aria-keyshortcuts="Shift+T" onClick={reply}><span aria-hidden="true">↩</span><em>Reply</em></button> : null}
        <button type="button" className="cv6-message-action" aria-label="Copy message" onClick={copyMessage}><span aria-hidden="true">⧉</span><em>{copyState || 'Copy'}</em></button>
        <button type="button" className="cv6-message-action" aria-label="More message actions" aria-expanded={moreOpen ? 'true' : 'false'} onClick={() => { setPickerOpen(false); setMoreOpen((open) => !open); }}><span aria-hidden="true">•••</span><em>More</em></button>
        {pickerOpen ? <QuickPicker onPick={toggleReaction} onClose={() => setPickerOpen(false)} /> : null}
        {moreOpen ? (
          <div className="cv6-message-more" role="menu" aria-label="More message actions">
            <button type="button" role="menuitem" onClick={copyMessage}>Copy message</button>
            {replyTarget && onReply ? <button type="button" role="menuitem" onClick={reply}>Reply</button> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
