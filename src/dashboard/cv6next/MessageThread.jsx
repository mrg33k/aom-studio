import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';
import MessageAttachments from './MessageAttachments.jsx';
import MessageReactions from './MessageReactions.jsx';
import ResultLinkCards from './ResultLinkCard.jsx';
import { Result } from './BlockRenderer.jsx';
import {
  SendCtx,
  ReviewCtx,
  AgentBlocks,
  GoalThreadBody,
  WorkingTurn,
  liveStepsToBlocks,
  ActionChips,
} from './ChatGoalThread.jsx';

export function groupMessagesBySender(list) {
  const groups = [];
  for (const m of Array.isArray(list) ? list : []) {
    const key = m?.isUser ? '__you' : (m?.agentName || 'agent');
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, isUser: !!m?.isUser, items: [m] });
  }
  return groups;
}

// ── The message that did not send (corner:bridge frontend-visibility D3) ──────
// A failed send used to delete its own bubble: your words appeared, then vanished,
// with no reason and nothing to tap — on desktop, nothing said anything at all. The
// bubble now stays exactly where you put it, marked, with the cause and one tap to
// send it again. `onRetry` rides on the message itself (it is a client-only outbox
// entry, never a server row), so every thread renderer gets it for free.
const FAIL_REASONS = {
 offline: 'Not sent, you were offline',
 signed_out: 'Not sent, your session expired, refresh to sign back in',
 timeout: 'Not sent, the connection timed out',
 server: 'Not sent, Corner could not accept it',
};
export function MessageFailedNote({ message }) {
  if (!message?.failed) return null;
  return (
    <div className="cv6-msg-failed" role="alert">
      <span className="cv6-msg-failed-text">{FAIL_REASONS[message.failReason] || FAIL_REASONS.server}</span>
      {message.onRetry ? (
        <button type="button" className="cv6-msg-failed-retry" onClick={() => message.onRetry()}>Try again</button>
      ) : null}
    </div>
  );
}

function scrollToReply(messageId) {
  if (!messageId || typeof document === 'undefined') return;
  const target = [...document.querySelectorAll('[data-message-id]')]
    .find((node) => node.getAttribute('data-message-id') === String(messageId));
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  target.classList.add('cv6-reply-highlight');
  window.setTimeout(() => target.classList.remove('cv6-reply-highlight'), 1400);
}

function replyTargetForMessage(message) {
  if (!message?.id) return null;
  return {
    type: 'message',
    id: String(message.id),
    label: message.agentName || (message.isUser ? 'You' : 'message'),
    snippet: String(message.text || '').replace(/\s+/g, ' ').trim().slice(0, 240),
  };
}

function ThreadSummary({ parent, replies, onOpen }) {
  if (!parent?.id || !Array.isArray(replies) || !replies.length || typeof onOpen !== 'function') return null;
  const participants = [];
  for (const reply of replies) {
    const key = reply.agentName || (reply.isUser ? 'You' : 'Message');
    if (!participants.some((item) => item.key === key)) participants.push({ key, initials: reply.agentInitials || key.slice(0, 2).toUpperCase(), tint: reply.agentTint || 'muted' });
  }
  const latest = replies[replies.length - 1];
  return (
    <button type="button" className="cv6-thread-summary" aria-label={`Open thread with ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`} onClick={() => onOpen(replyTargetForMessage(parent))}>
      <span className="cv6-thread-faces" aria-hidden="true">{participants.slice(0, 3).map((person) => <i key={person.key} className={`is-${person.tint}`}>{person.initials}</i>)}</span>
      <strong>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</strong>
      <span>{latest?.time ? `Last reply ${latest.time}` : 'Open thread'}</span>
    </button>
  );
}

function ReplyQuote({ message, original }) {
  const preview = message?.replyPreview || null;
  const messageId = message?.replyTo || preview?.message_id || '';
  if (!messageId) return null;
  const sender = preview?.sender || original?.agentName || (original?.isUser ? 'You' : 'Message');
  const snippet = preview?.snippet || original?.text || 'Original message';
  return (
    <button
      type="button"
      className="cv6-reply-quote"
      data-testid="cv6-reply-quote"
      onClick={() => scrollToReply(messageId)}
      title="Jump to original message"
    >
      <strong>{sender}</strong>
      <span>{String(snippet).replace(/\s+/g, ' ').trim().slice(0, 140)}</span>
    </button>
  );
}

function hasMessageExtras(m, { allowBlocks, allowAttachments, allowLinkCards, allowChips }) {
  return (
    (allowBlocks && Array.isArray(m?.blocks) && m.blocks.length) ||
    (allowAttachments && Array.isArray(m?.attachments) && m.attachments.length) ||
    (allowLinkCards && Array.isArray(m?.linkCards) && m.linkCards.length) ||
    (allowChips && Array.isArray(m?.chips) && m.chips.length)
  );
}

// Persisted message blocks are history, never the room's live activity surface.
// Some older agent messages were saved while their newest step still said
// active/working, which left a moving progress bar attached to that old message
// while WorkingTurn rendered the real current one at the tail. Settle only those
// stale step states at render time (without mutating message data) so a room owns
// at most one live progress bar: the explicit live-work turn below the newest item.
export function settleHistoricalBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => {
    if (block?.type !== 'step' || !['active', 'working'].includes(block.state)) return block;
    return { ...block, state: 'done', progress: null };
  });
}

export function Cv6MessageExtras({
  message,
  goal,
  variant = 'desktop',
  renderBlocks = 'agentBlocks',
  allowBlocks = true,
  allowAttachments = true,
  allowLinkCards = true,
  allowChips = true,
  chipsPrimaryFirst = true,
  onReviewAttachment,
}) {
  if (!message) return null;
  const blocks = settleHistoricalBlocks(message.blocks);
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const linkCards = Array.isArray(message.linkCards) ? message.linkCards : [];
  const chips = Array.isArray(message.chips) ? message.chips : [];
  if (!hasMessageExtras(message, { allowBlocks, allowAttachments, allowLinkCards, allowChips })) return null;
  // Inline image previews (#22): split image attachments from non-image so images
  // render as clickable thumbnails and non-images keep the file-chip treatment.
  const imageAtts = allowAttachments ? attachments.filter(att =>
    att.url && (att.mime?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name || ''))
  ) : [];
  const nonImageAtts = allowAttachments ? attachments.filter(att => !imageAtts.includes(att)) : [];
  return (
    <div className={`cv6-msg-extras cv6-msg-extras--${variant}`} style={{ marginTop: 8, width: '100%' }}>
      {allowBlocks && blocks.length ? (
        renderBlocks === 'goalBody'
          ? <GoalThreadBody goal={goal} blocks={blocks} header={false} />
          : <AgentBlocks goal={goal} blocks={blocks} />
      ) : null}
      {imageAtts.length ? (
        <div className="cv6-inline-images" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {imageAtts.map((att, i) => (
            <img key={att.url || i} src={att.url} alt={att.name || 'Image'} loading="lazy"
              onClick={() => window.open(att.url, '_blank', 'noopener')}
              style={{ maxWidth: 280, maxHeight: 280, borderRadius: 12, cursor: 'zoom-in', objectFit: 'cover' }} />
          ))}
        </div>
      ) : null}
      {nonImageAtts.length ? <MessageAttachments attachments={nonImageAtts} onReview={onReviewAttachment} /> : null}
      {allowLinkCards && linkCards.length ? <ResultLinkCards cards={linkCards} /> : null}
      {allowChips && chips.length ? <ActionChips actions={chips} primaryFirst={chipsPrimaryFirst} /> : null}
    </div>
  );
}

export function Cv6MessageTurn({
  message,
  goal,
  variant = 'desktop',
  renderBlocks = 'agentBlocks',
  allowBlocks = true,
  allowAttachments = true,
  allowLinkCards = true,
  allowChips = true,
  chipsPrimaryFirst = true,
  onReviewAttachment,
  onReply,
  replyOriginal,
  threadReplies,
}) {
  if (!message) return null;
  const bubbleClass = message.isUser ? 'pb-me' : 'pb';
  const hasText = !!String(message.text || '').trim();
  const extras = hasMessageExtras(message, { allowBlocks, allowAttachments, allowLinkCards, allowChips });
  return (
    <div className="cv6-message-turn-shell" data-cv6-message-turn="" data-message-id={message.id || undefined} data-variant={variant}>
      <ReplyQuote message={message} original={replyOriginal} />
      {hasText ? (
        <div className={`${bubbleClass}${message.failed ? ' is-failed' : ''}`}>
          <ChatMessageRenderer content={message.text} />
        </div>
      ) : null}
      <MessageFailedNote message={message} />
      {message.isUser && message.receipt ? (
        <div style={{ fontSize: 10.5, color: 'var(--faint)', textAlign: 'right', marginTop: 2, opacity: 0.7 }}>Sent</div>
      ) : null}
      {extras ? (
        <Cv6MessageExtras
          message={message}
          goal={goal}
          variant={variant}
          renderBlocks={renderBlocks}
          allowBlocks={allowBlocks}
          allowAttachments={allowAttachments}
          allowLinkCards={allowLinkCards}
          allowChips={allowChips}
          chipsPrimaryFirst={chipsPrimaryFirst}
          onReviewAttachment={onReviewAttachment}
        />
      ) : null}
      <MessageReactions messageId={message.id} reactions={message.reactions} message={message} onReply={onReply} />
      <ThreadSummary parent={message} replies={threadReplies} onOpen={onReply} />
    </div>
  );
}

export function Cv6MessageGroup({
  group,
  goal,
  variant = 'desktop',
  renderBlocks = 'agentBlocks',
  allowBlocks = true,
  allowAttachments = true,
  allowLinkCards = true,
  allowChips = true,
  chipsPrimaryFirst = true,
  onReviewAttachment,
  onReply,
  messageById,
  repliesByParent,
}) {
  if (!group?.items?.length) return null;
  const head = group.items[0];
  const lastTime = group.items[group.items.length - 1]?.time;
  if (group.isUser) {
    return (
      <div className="grp" data-cv6-message-group="user" data-variant={variant}>
        <span className={`ava is-${head.agentTint || 'accent'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{head.agentInitials || '·'}</span>
        <div className="stack">
          {group.items.map((m, i) => (
            <Cv6MessageTurn
              key={m.id || i}
              message={m}
              goal={goal}
              variant={variant}
              renderBlocks={renderBlocks}
              allowBlocks={allowBlocks}
              allowAttachments={allowAttachments}
              allowLinkCards={allowLinkCards}
              allowChips={allowChips}
              chipsPrimaryFirst={chipsPrimaryFirst}
              onReviewAttachment={onReviewAttachment}
              onReply={onReply}
              threadReplies={repliesByParent?.get(String(m.id || '')) || []}
              replyOriginal={messageById?.get(String(m.replyTo || m.replyPreview?.message_id || ''))}
            />
          ))}
          {lastTime ? <div className="ts">{lastTime}</div> : null}
        </div>
      </div>
    );
  }
  return (
    <div className="grp" data-cv6-message-group="agent" data-variant={variant}>
      <span className={`ava is-${head.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{head.agentInitials || '·'}</span>
      <div className="stack">
        {head.agentName ? <div className="gname">{head.agentName}</div> : null}
        {group.items.map((m, i) => (
          <Cv6MessageTurn
            key={m.id || i}
            message={m}
            goal={goal}
            variant={variant}
            renderBlocks={renderBlocks}
            allowBlocks={allowBlocks}
            allowAttachments={allowAttachments}
            allowLinkCards={allowLinkCards}
            allowChips={allowChips}
            chipsPrimaryFirst={chipsPrimaryFirst}
            onReviewAttachment={onReviewAttachment}
            onReply={onReply}
            threadReplies={repliesByParent?.get(String(m.id || '')) || []}
            replyOriginal={messageById?.get(String(m.replyTo || m.replyPreview?.message_id || ''))}
          />
        ))}
        {lastTime ? <div className="ts">{lastTime}</div> : null}
      </div>
    </div>
  );
}

function defaultAskGoal(messages, goal) {
  if (goal?.title) return goal;
  for (let i = (messages || []).length - 1; i >= 0; i -= 1) {
    if (messages[i]?.isUser && messages[i].text) return { title: messages[i].text };
  }
  return goal;
}

function MobileAvatar({ message }) {
  const tint = message.agentTint === 'accent' ? 'var(--accent)' : `var(--${message.agentTint || 'muted'}, var(--muted))`;
  return (
    <div className="cv6-mobile-turn-avatar" style={{ width: 30, height: 30, borderRadius: '50%', background: message.isUser ? 'var(--accent-weak)' : 'var(--surface-2)', color: message.isUser ? 'var(--accent)' : tint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flex: 'none' }}>
      {message.agentInitials}
    </div>
  );
}

function MobileMessageTurn({ message, onAction, onReply, replyOriginal, threadReplies }) {
  // User message: right-aligned accent bubble. No avatar (it's the user). Time below.
  // Surgical JSX change: CSS cannot reorder the name/time header below the text bubble.
  if (message.isUser) {
    return (
      <div
        data-cv6-message-turn=""
        data-message-id={message.id || undefined}
        data-variant="mobile"
        data-userturn=""
        className="cv6-message-turn-shell"
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}
      >
        <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <ReplyQuote message={message} original={replyOriginal} />
          <div
            className={`cv6-mob-bubble cv6-mob-bubble--user${message.failed ? ' is-failed' : ''}`}
          >
            <div style={{ fontSize: 15.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.text}
            </div>
          </div>
          <MessageFailedNote message={message} />
          {message.isUser && message.receipt ? (
            <div style={{ fontSize: 10.5, color: 'var(--faint)', textAlign: 'right', marginTop: 2, opacity: 0.7 }}>Sent</div>
          ) : null}
          {message.time ? (
            <span className="cv6-mob-ts" style={{ marginTop: 3 }}>{message.time}</span>
          ) : null}
          <ThreadSummary parent={message} replies={threadReplies} onOpen={onReply} />
        </div>
        <MessageReactions messageId={message.id} reactions={message.reactions} message={message} onReply={onReply} />
      </div>
    );
  }

  // Agent message: left-aligned dark card with avatar. Time below the card.
  return (
    <div
      data-cv6-message-turn=""
      data-message-id={message.id || undefined}
      data-variant="mobile"
      className="cv6-message-turn-shell"
      style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}
    >
      <MobileAvatar message={message} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {message.agentName ? (
          <div className="cv6-mob-name">{message.agentName}</div>
        ) : null}
        <ReplyQuote message={message} original={replyOriginal} />
        <div
          className="cv6-mob-bubble cv6-mob-bubble--agent"
        >
          <div style={{ fontSize: 15.5, lineHeight: 1.5, color: 'var(--fg)', wordBreak: 'break-word' }}>
            <ChatMessageRenderer content={message.text} />
          </div>
        </div>
        {message.time ? (
          <span className="cv6-mob-ts" style={{ marginTop: 3 }}>{message.time}</span>
        ) : null}
        {message.blocks?.length ? (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {message.blocks.map((block, i) => (
              <Result key={i} block={block} onAction={onAction} />
            ))}
          </div>
        ) : null}
        {message.linkCards?.length ? <ResultLinkCards cards={message.linkCards} /> : null}
        <ThreadSummary parent={message} replies={threadReplies} onOpen={onReply} />
      </div>
      <MessageReactions messageId={message.id} reactions={message.reactions} message={message} onReply={onReply} />
    </div>
  );
}

function MobileGoalTurn({ message, goal, blocks, live = false, onReply, replyOriginal, threadReplies }) {
  const renderedBlocks = live ? (blocks || message.blocks || []) : settleHistoricalBlocks(blocks || message.blocks);
  return (
    <div data-cv6-message-turn="" data-message-id={message.id || undefined} data-variant="mobile-goal" data-cv6-live-work={live ? '' : undefined} className={`cv6-message-turn-shell${live ? ' cv6-live-work' : ''}`} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <MobileAvatar message={message} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{message.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{message.time}</span>
        </div>
        <ReplyQuote message={message} original={replyOriginal} />
        <GoalThreadBody goal={goal} blocks={renderedBlocks} header={false} />
        {!message.isUser && message.linkCards?.length ? <ResultLinkCards cards={message.linkCards} /> : null}
        {!live ? <ThreadSummary parent={message} replies={threadReplies} onOpen={onReply} /> : null}
      </div>
      {!live ? <MessageReactions messageId={message.id} reactions={message.reactions} message={message} onReply={onReply} /> : null}
    </div>
  );
}

function MobileMessageThread({
  messages,
  newMessageId,
  goal,
  room,
  mode,
  liveSteps,
  awaiting,
  renderLiveWork,
  renderAttachments,
  MobileFileGallery,
  onAction,
  onOpenFile,
  onReviewFiles,
  empty,
  hasNewMessages,
  onReply,
  messageById,
  repliesByParent,
}) {
  const list = Array.isArray(messages) ? messages : [];
  const liveBlocks = liveStepsToBlocks(liveSteps);
  const showLive = !!awaiting;
  const askGoal = defaultAskGoal(list, goal);
  const out = [];
  let fileRun = [];
  const flushFiles = (key) => {
    if (!fileRun.length) return;
    if (renderAttachments === 'mobileGallery' && MobileFileGallery) {
      out.push(
        <MobileFileGallery
          key={`files-${key}`}
          files={fileRun}
          sender={fileRun[0]}
          onOpen={onOpenFile}
          onReview={onReviewFiles}
        />,
      );
    }
    fileRun = [];
  };
  list.forEach((message, i) => {
    if (newMessageId && String(message?.id || '') === String(newMessageId)) {
      flushFiles(`new-${i}`);
      out.push(
        <div key={`new-${message.id || i}`} className="cv6-new-divider" role="separator" aria-label="New messages">
          <span />
          <strong>New</strong>
          <span />
        </div>,
      );
    }
    if (message?.isFile && renderAttachments === 'mobileGallery') {
      // Same-sender guard as ChatLifecycle's renderItems: never fold the user's
      // own upload into the agent's "sent N files" card, or vice versa.
      if (fileRun.length && (fileRun[0].isUser !== message.isUser || fileRun[0].agentName !== message.agentName)) flushFiles(i);
      fileRun.push(message);
      return;
    }
    flushFiles(i);
    const replyOriginal = messageById?.get(String(message?.replyTo || message?.replyPreview?.message_id || ''));
    if (message?.blocks?.length) {
      out.push(<MobileGoalTurn key={message.id || i} message={message} goal={goal} onReply={onReply} replyOriginal={replyOriginal} threadReplies={repliesByParent?.get(String(message.id || '')) || []} />);
    } else {
      out.push(<MobileMessageTurn key={message?.id || i} message={message} onAction={onAction} onReply={onReply} replyOriginal={replyOriginal} threadReplies={repliesByParent?.get(String(message.id || '')) || []} />);
    }
  });
  flushFiles('end');
  if (!out.length && !showLive) {
    return <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>{empty}</div>;
  }
  return (
    <div data-cv6-message-thread="" data-variant="mobile" data-mode={mode} data-cv6-new-messages={hasNewMessages || undefined}>
      {out}
      {showLive && renderLiveWork === 'goalBody' ? (
        <MobileGoalTurn
          message={{ agentName: room?.name, agentInitials: room?.initials || '·', agentTint: 'accent', time: '' }}
          goal={askGoal}
          blocks={liveBlocks}
          live
        />
      ) : null}
      {showLive && renderLiveWork === 'workingTurn' ? <WorkingTurn room={room} liveSteps={liveSteps} goal={askGoal} /> : null}
    </div>
  );
}

export function Cv6MessageThread({
  messages,
  newMessageId = '',
  goal,
  room,
  variant = 'desktop',
  mode = 'plain',
  liveSteps,
  awaiting = false,
  renderLiveWork = 'workingTurn',
  renderBlocks = 'agentBlocks',
  renderAttachments = 'messageAttachments',
  allowBlocks = true,
  allowAttachments = true,
  allowChips = true,
  allowLinkCards = true,
  chipsPrimaryFirst = true,
  onAction,
  onReply,
  onReviewAttachment,
  onOpenFile,
  onReviewFiles,
  MobileFileGallery,
  repliesByParentOverride,
  empty = 'No conversation yet.',
}) {
  const list = Array.isArray(messages) ? messages : [];
  const messageById = useMemo(
    () => new Map(list.filter((message) => message?.id).map((message) => [String(message.id), message])),
    [list],
  );
  const localRepliesByParent = useMemo(() => {
    const map = new Map();
    for (const message of list) {
      const parentId = String(message?.replyTo || message?.replyPreview?.message_id || '');
      if (!parentId) continue;
      if (!map.has(parentId)) map.set(parentId, []);
      map.get(parentId).push(message);
    }
    return map;
  }, [list]);
  const repliesByParent = repliesByParentOverride || localRepliesByParent;

  // ── SMOOTHNESS: new-message entrance animation ──
  // Track previous message count so only genuinely NEW messages animate in.
  // Initial mount (prevCount 0 → N) does NOT animate; subsequent additions do.
  const prevCountRef = useRef(0);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  useEffect(() => {
    const cur = list.length;
    if (cur > prevCountRef.current && prevCountRef.current > 0) {
      setHasNewMessages(true);
      const t = setTimeout(() => setHasNewMessages(false), 200);
      return () => clearTimeout(t);
    }
    prevCountRef.current = cur;
  }, [list.length]);
  // Sync ref on every render (the effect runs after paint, so the ref update
  // needs to happen for the NEXT comparison).
  useEffect(() => { prevCountRef.current = list.length; });

  if (variant === 'mobile') {
    return (
      <SendCtx.Provider value={onAction || (() => {})}>
        <ReviewCtx.Provider value={(file) => {
          if (!file) return;
          if (onReviewFiles) onReviewFiles([file]);
          else onReviewAttachment?.(file);
        }}>
          <MobileMessageThread
            messages={list}
            newMessageId={newMessageId}
            goal={goal}
            room={room}
            mode={mode}
            liveSteps={liveSteps}
            awaiting={awaiting}
            renderLiveWork={renderLiveWork}
            renderAttachments={renderAttachments}
            MobileFileGallery={MobileFileGallery}
            onAction={onAction}
            onOpenFile={onOpenFile}
            onReviewFiles={onReviewFiles}
            empty={empty}
            hasNewMessages={hasNewMessages}
            onReply={onReply}
            messageById={messageById}
            repliesByParent={repliesByParent}
          />
        </ReviewCtx.Provider>
      </SendCtx.Provider>
    );
  }
  const groups = groupMessagesBySender(list);
  const liveBlocks = liveStepsToBlocks(liveSteps);
  const showLive = !!awaiting;
  const askGoal = defaultAskGoal(list, goal);
  if (!groups.length && !showLive) {
    return <div style={{ color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: '28px 0' }}>{empty}</div>;
  }
  return (
    <SendCtx.Provider value={onAction || (() => {})}>
      <ReviewCtx.Provider value={(file) => { if (file) onReviewAttachment?.(file); }}>
        <div className="pconv" data-cv6-message-thread="" data-variant={variant} data-mode={mode} data-cv6-new-messages={hasNewMessages || undefined}>
          {groups.map((group, i) => (
            <Cv6MessageGroup
              key={`${group.key}-${i}`}
              group={group}
              goal={goal}
              variant={variant}
              renderBlocks={renderBlocks}
              allowBlocks={allowBlocks}
              allowAttachments={allowAttachments}
              allowLinkCards={allowLinkCards}
              allowChips={allowChips}
              chipsPrimaryFirst={chipsPrimaryFirst}
              onReviewAttachment={onReviewAttachment}
              onReply={onReply}
              messageById={messageById}
              repliesByParent={repliesByParent}
            />
          ))}
          {showLive && renderLiveWork === 'goalBody' ? (
            <div data-cv6-live-work="" className="cv6-live-work" style={{ marginTop: 16 }}>
              <GoalThreadBody goal={askGoal} blocks={liveBlocks} header={false} />
            </div>
          ) : null}
          {showLive && renderLiveWork === 'workingTurn' ? <WorkingTurn room={room} liveSteps={liveSteps} goal={askGoal} /> : null}
        </div>
      </ReviewCtx.Provider>
    </SendCtx.Provider>
  );
}
