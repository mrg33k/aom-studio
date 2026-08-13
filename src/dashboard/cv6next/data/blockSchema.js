/**
 * Block Schema for CV6 Chat Message Blocks
 *
 * Messages can optionally carry a `blocks` array with structured content.
 * Each block represents a piece of rich output the agent emitted — a success,
 * a data table, a question for the user, code, etc.
 *
 * The blocks array is independent of the plain-text `message.text`:
 * - If blocks exist, they render AFTER the text (appended, not replacing it)
 * - If no blocks, plain text is rendered as-is
 * - Both paths stay wired, making the system additive (never breaks plain-text chat)
 *
 * @typedef {Object} Block
 *
 * @property {number} [stepIndex] - For result blocks attached to a goal step.
 *   If a block has no explicit step block (type='step'), it still attaches to
 *   a step by index; if omitted, defaults to 0. Used to group results under steps.
 *
 * @property {string} type - The block type. One of:
 *   - 'step': A goal-thread step (title, detail, state: pending|active|working|done).
 *   - 'success': A success indicator (title, optional detail).
 *   - 'snag': A warning/problem (title, optional detail).
 *   - 'question': A question requiring user input (text, options[]).
 *   - 'choice': Tappable choice chips (prompt, choices[]).
 *   - 'data': A spreadsheet/table (title, columns[], rows[], optional totals, optional chart).
 *   - 'summary': A digest (bullets[], actions[], optional meta, optional chips[]).
 *   - 'email': An email surfaced in chat (from, subject, quote, attachments[], actions[]).
 *   - 'artifact': A screenshot or live-site card (url, name, kind).
 *   - 'audio': A voice note (transcript, wave[], duration).
 *   - 'video': A video clip (title, duration, poster).
 *   - 'code': Code snippet (file, lang, code, optional explain, optional added/removed).
 *   - 'thinking': Agent internal working state (label).
 *   - 'replies': Quick-reply chips (prompt, options[]).
 *   - 'confirm': Confirm/cancel gate (text, confirmLabel, cancelLabel, optional note).
 *   - 'gallery': Photo gallery/image collection (images[], optional caption, optional overflow).
 *
 * Schema for each type below.
 */

/**
 * @typedef {Object} StepBlock
 * @property {number} stepIndex
 * @property {'step'} type
 * @property {string} title - The step name or goal.
 * @property {string} [detail] - Optional subtext.
 * @property {'pending' | 'active' | 'working' | 'done'} [state] - Default 'pending'.
 */

/**
 * @typedef {Object} SuccessBlock
 * @property {number} [stepIndex]
 * @property {'success'} type
 * @property {string} [title] - Default 'Done'.
 * @property {string} [detail] - Optional explanation.
 */

/**
 * @typedef {Object} SnagBlock
 * @property {number} [stepIndex]
 * @property {'snag'} type
 * @property {string} [title] - Default 'Snag'.
 * @property {string} [detail] - Optional explanation.
 */

/**
 * @typedef {Object} QuestionBlock
 * @property {number} [stepIndex]
 * @property {'question'} type
 * @property {string} text - The question text.
 * @property {Array<{id: string, label: string}>} [options] - Tappable reply options.
 * @property {boolean} [allowFreeReply] - If true, user can type a free answer.
 */

/**
 * @typedef {Object} ChoiceBlock
 * @property {number} [stepIndex]
 * @property {'choice'} type
 * @property {string} [prompt] - Optional text above the chips.
 * @property {Array<{id: string, title: string, label: string, style?: 'primary'|'alt'}>} choices
 */

/**
 * @typedef {Object} ChoiceEchoBlock
 * @property {number} [stepIndex]
 * @property {'choiceEcho'} type
 * @property {string} [title] - Default 'Your choice'.
 * @property {string} [detail] - The selected choice echoed back to the user.
 */

/**
 * @typedef {Object} DataBlock
 * @property {number} [stepIndex]
 * @property {'data'} type
 * @property {string} [title] - Default 'Data'.
 * @property {string[]} columns - Column headers.
 * @property {Array<string[]>} rows - Rows of cells (each cell is a string).
 * @property {string[]} [totals] - Optional total row.
 * @property {boolean} [chart] - If true, show a bar chart of the first numeric column.
 */

/**
 * @typedef {Object} SummaryBlock
 * @property {number} [stepIndex]
 * @property {'summary'} type
 * @property {string} [headline] - The bottom line, one sentence. IS line one (BLUF; added 2026-08-06, typedef caught up 2026-08-12).
 * @property {Array<string | {text: string, warn?: boolean}>} bullets - Scan-friendly bullet points.
 * @property {Array<string | {text: string, done?: boolean}>} [actions] - Checkable action items.
 * @property {string} [meta] - Optional metadata (e.g., "4 items").
 * @property {string[]} [chips] - Optional action chips below the summary.
 */

/**
 * @typedef {Object} EmailBlock
 * @property {number} [stepIndex]
 * @property {'email'} type
 * @property {string} from - Sender's email or name.
 * @property {string} [org] - Optional organization.
 * @property {string} subject - Email subject.
 * @property {string} [quote] - Quoted text from the email.
 * @property {Array<{name: string, size?: string, url?: string}>} [attachments] - Files in the email.
 * @property {string} [flagged] - Optional flag label (e.g., "Urgent").
 * @property {string[]} [actions] - Reply action chips.
 * @property {string} [initials] - Avatar initials (auto-derived from 'from' if omitted).
 */

/**
 * @typedef {Object} ArtifactBlock
 * @property {number} [stepIndex]
 * @property {'artifact'} type
 * @property {string} name - The artifact name (file name, project name, etc.).
 * @property {string} [url] - URL to the artifact or screenshot.
 * @property {'live' | 'screenshot'} [kind] - Default 'screenshot'.
 */

/**
 * @typedef {Object} AudioBlock
 * @property {number} [stepIndex]
 * @property {'audio'} type
 * @property {string} [transcript] - The spoken text.
 * @property {number[]} [wave] - Waveform bar heights (1-100) for visualization.
 * @property {string} [duration] - Duration label (e.g., "2:34").
 */

/**
 * @typedef {Object} VideoBlock
 * @property {number} [stepIndex]
 * @property {'video'} type
 * @property {string} [title] - Video title or name.
 * @property {string} [duration] - Duration label (e.g., "3:45").
 * @property {string} [poster] - Poster frame URL (optional).
 */

/**
 * @typedef {Object} CodeBlock
 * @property {number} [stepIndex]
 * @property {'code'} type
 * @property {string} code - The source code.
 * @property {string} [file] - Filename or identifier.
 * @property {string} [lang] - Language (e.g., 'jsx', 'sql').
 * @property {string} [explain] - Plain-English explanation.
 * @property {number} [added] - Lines added (diff indicator).
 * @property {number} [removed] - Lines removed (diff indicator).
 */

/**
 * @typedef {Object} ThinkingBlock
 * @property {number} [stepIndex]
 * @property {'thinking'} type
 * @property {string} [label] - What the agent is working on (e.g., "Analyzing trends…").
 */

/**
 * @typedef {Object} RepliesBlock
 * @property {number} [stepIndex]
 * @property {'replies'} type
 * @property {string} [prompt] - Prompt text above the chips.
 * @property {Array<string | {label: string, primary?: boolean}>} options - Reply choices.
 */

/**
 * @typedef {Object} ConfirmBlock
 * @property {number} [stepIndex]
 * @property {'confirm'} type
 * @property {string} [text] - Confirmation text.
 * @property {string} [confirmLabel] - Default 'Confirm & send'.
 * @property {string} [cancelLabel] - Default 'Cancel'.
 * @property {string} [note] - Optional note below the buttons.
 */

/**
 * @typedef {Object} GalleryBlock
 * @property {number} [stepIndex]
 * @property {'gallery'} type
 * @property {Array<{url?: string, label?: string}>} images - Images to display.
 * @property {string} [caption] - Optional caption below the gallery.
 * @property {number} [overflow] - Number of additional images (auto-calculated on render).
 */

export const BLOCK_TYPES = [
  'step',
  'success',
  'snag',
  'question',
  'choice',
  'choiceEcho',
  'data',
  'summary',
  'email',
  'artifact',
  'audio',
  'video',
  'code',
  'thinking',
  'replies',
  'confirm',
  'gallery',
];

/**
 * Demo block factory helpers for testing.
 * Each function returns a properly-typed block with sensible defaults.
 */

export function createStepBlock(index, title, state = 'pending', detail = '') {
  return { stepIndex: index, type: 'step', title, state, detail };
}

export function createSuccessBlock(index, title = 'Done', detail = '') {
  return { stepIndex: index, type: 'success', title, detail };
}

export function createSnagBlock(index, title = 'Snag', detail = '') {
  return { stepIndex: index, type: 'snag', title, detail };
}

export function createQuestionBlock(index, text, options = []) {
  return { stepIndex: index, type: 'question', text, options };
}

export function createDataBlock(index, title, columns, rows, totals = null) {
  return { stepIndex: index, type: 'data', title, columns, rows, totals };
}

export function createSummaryBlock(index, bullets = [], actions = [], chips = [], headline = '') {
  return headline
    ? { stepIndex: index, type: 'summary', headline, bullets, actions, chips }
    : { stepIndex: index, type: 'summary', bullets, actions, chips };
}

export function createCodeBlock(index, code, file = 'code', lang = 'js', explain = '') {
  return { stepIndex: index, type: 'code', code, file, lang, explain };
}

export function createChoiceBlock(index, prompt = '', choices = []) {
  return { stepIndex: index, type: 'choice', prompt, choices };
}

export function createChoiceEchoBlock(index, title = 'Your choice', detail = '') {
  return { stepIndex: index, type: 'choiceEcho', title, detail };
}

export function createGalleryBlock(index, images = [], caption = '') {
  return { stepIndex: index, type: 'gallery', images, caption };
}
