import React, { useEffect, useRef, useState } from 'react';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';
import MessageAttachments from './MessageAttachments.jsx';
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
  return (
    <div className={`cv6-msg-extras cv6-msg-extras--${variant}`} style={{ marginTop: 8, width: '100%' }}>
      {allowBlocks && blocks.length ? (
        renderBlocks === 'goalBody'
          ? <GoalThreadBody goal={goal} blocks={blocks} header={false} />
          : <AgentBlocks goal={goal} blocks={blocks} />
      ) : null}
      {allowAttachments && attachments.length ? <MessageAttachments attachments={attachments} onReview={onReviewAttachment} /> : null}
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
}) {
  if (!message) return null;
  const bubbleClass = message.isUser ? 'pb-me' : 'pb';
  const hasText = !!String(message.text || '').trim();
  const extras = hasMessageExtras(message, { allowBlocks, allowAttachments, allowLinkCards, allowChips });
  return (
    <span data-cv6-message-turn="" data-message-id={message.id || undefined} data-variant={variant} style={{ display: 'contents' }}>
      {hasText ? (
        <div className={`${bubbleClass}${message.failed ? ' is-failed' : ''}`}>
          <ChatMessageRenderer content={message.text} />
        </div>
      ) : null}
      <MessageFailedNote message={message} />
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
    </span>
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

function MobileMessageTurn({ message, onAction }) {
  const ref = useRef(null);
  const [clamped, setClamped] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && !open) setClamped(el.scrollHeight > 168 + 4);
  }, [message.text, open]);

  // User message: right-aligned accent bubble. No avatar (it's the user). Time below.
  // Surgical JSX change: CSS cannot reorder the name/time header below the text bubble.
  if (message.isUser) {
    return (
      <div
        data-cv6-message-turn=""
        data-message-id={message.id || undefined}
        data-variant="mobile"
        data-userturn=""
        style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}
      >
        <div style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div
            ref={ref}
            className={`cv6-mob-bubble cv6-mob-bubble--user${clamped && !open ? ' is-clamped' : ''}${message.failed ? ' is-failed' : ''}`}
            style={open ? { maxHeight: 'none' } : undefined}
          >
            <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.text}
            </div>
          </div>
          <MessageFailedNote message={message} />
          {clamped ? (
            <button className="longmsg-more cv6-mob-more-user" onClick={() => setOpen((v) => !v)}>
              {open ? 'Show less' : 'Show more'}
            </button>
          ) : null}
          {message.time ? (
            <span className="cv6-mob-ts" style={{ marginTop: 3 }}>{message.time}</span>
          ) : null}
        </div>
      </div>
    );
  }

  // Agent message: left-aligned dark card with avatar. Time below the card.
  return (
    <div
      data-cv6-message-turn=""
      data-message-id={message.id || undefined}
      data-variant="mobile"
      style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' }}
    >
      <MobileAvatar message={message} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {message.agentName ? (
          <div className="cv6-mob-name">{message.agentName}</div>
        ) : null}
        <div
          ref={ref}
          className={`cv6-mob-bubble cv6-mob-bubble--agent${clamped && !open ? ' is-clamped' : ''}`}
          style={open ? { maxHeight: 'none' } : undefined}
        >
          <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--fg)', wordBreak: 'break-word' }}>
            <ChatMessageRenderer content={message.text} />
          </div>
        </div>
        {clamped ? (
          <button className="longmsg-more" onClick={() => setOpen((v) => !v)}>
            {open ? 'Show less' : 'Show more'}
          </button>
        ) : null}
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
      </div>
    </div>
  );
}

function MobileGoalTurn({ message, goal, blocks, live = false }) {
  const renderedBlocks = live ? (blocks || message.blocks || []) : settleHistoricalBlocks(blocks || message.blocks);
  return (
    <div data-cv6-message-turn="" data-message-id={message.id || undefined} data-variant="mobile-goal" data-cv6-live-work={live ? '' : undefined} className={live ? 'cv6-live-work' : undefined} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
      <MobileAvatar message={message} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{message.agentName}</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>{message.time}</span>
        </div>
        <GoalThreadBody goal={goal} blocks={renderedBlocks} header={false} />
        {!message.isUser && message.linkCards?.length ? <ResultLinkCards cards={message.linkCards} /> : null}
      </div>
    </div>
  );
}

function MobileMessageThread({
  messages,
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
  let prevAgentKey = null;
  list.forEach((message, i) => {
    if (message?.isFile && renderAttachments === 'mobileGallery') {
      // Same-sender guard as ChatLifecycle's renderItems: never fold the user's
      // own upload into the agent's "sent N files" card, or vice versa.
      if (fileRun.length && (fileRun[0].isUser !== message.isUser || fileRun[0].agentName !== message.agentName)) flushFiles(i);
      fileRun.push(message);
      return;
    }
    flushFiles(i);
    // Specialist handoff divider: when a different agent takes the thread
    if (!message?.isUser && message?.agentName) {
      if (prevAgentKey && prevAgentKey !== message.agentName) {
        out.push(
          <div key={`handoff-${i}`} className="cv6-handoff-divider" aria-hidden="true">
            <span className="cv6-handoff-line" />
            <span className="cv6-handoff-label">{message.agentName}</span>
            <span className="cv6-handoff-line" />
          </div>
        );
      }
      prevAgentKey = message.agentName;
    } else if (message?.isUser) {
      prevAgentKey = null;
    }
    if (message?.blocks?.length) {
      out.push(<MobileGoalTurn key={message.id || i} message={message} goal={goal} />);
    } else {
      out.push(<MobileMessageTurn key={message?.id || i} message={message} onAction={onAction} />);
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
  onReviewAttachment,
  onOpenFile,
  onReviewFiles,
  MobileFileGallery,
  empty = 'No conversation yet.',
}) {
  const list = Array.isArray(messages) ? messages : [];

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
          {groups.map((group, i) => {
            const prev = i > 0 ? groups[i - 1] : null;
            const showHandoff = prev && !prev.isUser && !group.isUser && prev.key !== group.key;
            return (
              <React.Fragment key={`${group.key}-${i}`}>
                {showHandoff ? (
                  <div className="cv6-handoff-divider" aria-hidden="true">
                    <span className="cv6-handoff-line" />
                    <span className="cv6-handoff-label">{group.items[0]?.agentName || 'Agent'}</span>
                    <span className="cv6-handoff-line" />
                  </div>
                ) : null}
                <Cv6MessageGroup
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
                />
              </React.Fragment>
            );
          })}
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