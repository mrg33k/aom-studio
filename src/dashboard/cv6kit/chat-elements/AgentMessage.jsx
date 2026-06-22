import React from 'react';
import { Turn, Bubble, UserMsg } from './Turn.jsx';
import CommBlock from './CommBlock.jsx';
import { SummaryBlock } from './SummaryBlock.jsx';
import { DataBlock } from './DataBlock.jsx';
import { EmailBlock } from './EmailBlock.jsx';
import { GalleryBlock } from './GalleryBlock.jsx';
import { AudioBlock, VideoBlock } from './MediaBlock.jsx';
import { CodeBlock } from './CodeBlock.jsx';
import { ChoicesBlock, ThinkingState } from './ChoicesBlock.jsx';
import { ReviewRespondBlock } from './ReviewRespondBlock.jsx';

/**
 * AgentMessage — the dispatcher that turns one typed message into its element.
 *
 * The agent speaks in elements, never walls of text. A message is { type, ...data }.
 * This renders the right block for the type, wrapped in the agent Turn scaffold
 * (avatar + name + stacked blocks). A user message renders as a UserMsg bubble.
 *
 * type → block:
 *   text                       → Bubble (prose fallback)
 *   success | question | snag  → CommBlock
 *   summary                    → SummaryBlock
 *   data                       → DataBlock
 *   email                      → EmailBlock
 *   gallery                    → GalleryBlock
 *   audio                      → AudioBlock
 *   video                      → VideoBlock
 *   code                       → CodeBlock
 *   choices                    → ChoicesBlock
 *   thinking                   → ThinkingState
 *   review                     → ReviewRespondBlock
 *   user                       → UserMsg (right-aligned, no Turn)
 */
function renderBlock(message) {
  const { type } = message || {};
  switch (type) {
    case 'success':
    case 'question':
    case 'snag':
      return <CommBlock kind={type} {...message} />;
    case 'summary':
      return <SummaryBlock {...message} />;
    case 'data':
      return <DataBlock {...message} />;
    case 'email':
      return <EmailBlock {...message} />;
    case 'gallery':
      return <GalleryBlock {...message} />;
    case 'audio':
      return <AudioBlock {...message} />;
    case 'video':
      return <VideoBlock {...message} />;
    case 'code':
      return <CodeBlock {...message} />;
    case 'choices':
      return <ChoicesBlock {...message} />;
    case 'thinking':
      return <ThinkingState {...message} />;
    case 'review':
      return <ReviewRespondBlock {...message} />;
    case 'text':
    default:
      return <Bubble>{message?.body || message?.text || ''}</Bubble>;
  }
}

export function AgentMessage({ message = {}, agent = {} }) {
  // A user turn is right-aligned, no avatar scaffold.
  if (message.role === 'user' || message.type === 'user') {
    return <UserMsg>{message.body || message.text || ''}</UserMsg>;
  }
  // One agent turn can carry one or several stacked blocks.
  const blocks = Array.isArray(message.blocks) ? message.blocks : [message];
  return (
    <Turn
      avatar={agent.initials || message.initials || 'EL'}
      name={agent.name || message.name || 'Agent'}
      status={message.status || null}
      time={message.time || null}
    >
      {blocks.map((b, i) => (
        <React.Fragment key={i}>{renderBlock(b)}</React.Fragment>
      ))}
    </Turn>
  );
}

export default AgentMessage;
