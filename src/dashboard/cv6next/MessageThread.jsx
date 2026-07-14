import React from 'react';
import ChatMessageRenderer from '../components/ChatMessageRenderer.jsx';
import MessageAttachments from './MessageAttachments.jsx';
import ResultLinkCards from './ResultLinkCard.jsx';
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

function hasMessageExtras(m, { allowBlocks, allowAttachments, allowLinkCards, allowChips }) {
  return (
    (allowBlocks && Array.isArray(m?.blocks) && m.blocks.length) ||
    (allowAttachments && Array.isArray(m?.attachments) && m.attachments.length) ||
    (allowLinkCards && Array.isArray(m?.linkCards) && m.linkCards.length) ||
    (allowChips && Array.isArray(m?.chips) && m.chips.length)
  );
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
  onReviewAttachment,
}) {
  if (!message) return null;
  const blocks = Array.isArray(message.blocks) ? message.blocks : [];
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
      {allowChips && chips.length ? <ActionChips actions={chips} /> : null}
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
  onReviewAttachment,
}) {
  if (!message) return null;
  const bubbleClass = message.isUser ? 'pb-me' : 'pb';
  const hasText = !!String(message.text || '').trim();
  const extras = hasMessageExtras(message, { allowBlocks, allowAttachments, allowLinkCards, allowChips });
  return (
    <span data-cv6-message-turn="" data-variant={variant} style={{ display: 'contents' }}>
      {hasText ? (
        <div className={bubbleClass}>
          <ChatMessageRenderer content={message.text} />
        </div>
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
  onReviewAttachment,
}) {
  if (!group?.items?.length) return null;
  const head = group.items[0];
  const lastTime = group.items[group.items.length - 1]?.time;
  if (group.isUser) {
    return (
      <div className="me" data-cv6-message-group="user" data-variant={variant}>
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
            onReviewAttachment={onReviewAttachment}
          />
        ))}
        {lastTime ? <div className="ts">{lastTime}</div> : null}
      </div>
    );
  }
  return (
    <div className="grp" data-cv6-message-group="agent" data-variant={variant}>
      <span className={`av is-${head.agentTint || 'violet'}`} style={{ width: 30, height: 30, fontSize: 11, flex: 'none', borderRadius: 9 }}>{head.agentInitials || '·'}</span>
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
  allowBlocks = true,
  allowAttachments = true,
  allowChips = true,
  allowLinkCards = true,
  onAction,
  onReviewAttachment,
  empty = 'No conversation yet.',
}) {
  const list = Array.isArray(messages) ? messages : [];
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
        <div className="pconv" data-cv6-message-thread="" data-variant={variant} data-mode={mode}>
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
              onReviewAttachment={onReviewAttachment}
            />
          ))}
          {showLive && renderLiveWork === 'goalBody' ? (
            <div style={{ marginTop: 16 }}>
              <GoalThreadBody goal={askGoal} blocks={liveBlocks} header={false} />
            </div>
          ) : null}
          {showLive && renderLiveWork !== 'goalBody' ? <WorkingTurn room={room} liveSteps={liveSteps} goal={askGoal} /> : null}
        </div>
      </ReviewCtx.Provider>
    </SendCtx.Provider>
  );
}
