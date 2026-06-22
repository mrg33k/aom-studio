/**
 * Agent Chat element kit — barrel.
 *
 * The typed-block vocabulary the agent speaks in (Corner CV6's core surface).
 * Each block is a faithful port of its ui_kits/agent-chat/*.html card, styled by
 * the scoped chat.css (imported via kit.css). Compose these inside a [data-cv6kit]
 * ancestor; the agent reaches for the block that lets the human act fastest.
 *
 * The base turn scaffold (avatar + stacked blocks) comes from Turn.jsx; each typed
 * block is sourced from its dedicated file (the canonical, single-purpose version).
 */

// Base turn scaffold + plain bubbles + a file row.
export { Turn, Bubble, UserMsg, FileRow } from './Turn.jsx';

// Typed blocks — one canonical source each.
export { default as CommBlock } from './CommBlock.jsx';
export { SummaryBlock } from './SummaryBlock.jsx';
export { DataBlock } from './DataBlock.jsx';
export { EmailBlock } from './EmailBlock.jsx';
export { GalleryBlock } from './GalleryBlock.jsx';
export { AudioBlock, VideoBlock } from './MediaBlock.jsx';
export { CodeBlock } from './CodeBlock.jsx';
export { ChoicesBlock, ThinkingState } from './ChoicesBlock.jsx';
export { ReviewRespondBlock } from './ReviewRespondBlock.jsx';

export { AgentMessage } from './AgentMessage.jsx';
