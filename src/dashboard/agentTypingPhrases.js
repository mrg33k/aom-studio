// Agent typing phrases -- shown while the agent thinks.
// Each agent gets personality-specific lines. Falls back to DEFAULT.

export const DEFAULT_TYPING_PHRASES = [
  'Actually doing shit...',
  'Im not ChatGPT...',
  'Bro chill its loading...',
  'Hold on lemme cook...',
  'Reading your mind...',
]

export const AGENT_TYPING_PHRASES = {
  bobby: [
    'Hold on lemme cook...',
    'Actually building this...',
    'Writing the code...',
    'Im not ChatGPT...',
    'Debugging rn...',
    'Bro chill its loading...',
    'Making it work...',
    'Actually doing shit...',
  ],
  elon: [
    'Running the numbers...',
    'Actually doing shit...',
    'Plotting the next move...',
    'Im not ChatGPT...',
    'Hold on lemme cook...',
    'Orchestrating...',
    'Scheming...',
    'Reading your mind...',
  ],
  cleo: [
    'Watching the footage...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Syncing the audio...',
    'Im not ChatGPT...',
    'Cutting the reel...',
    'Bro chill its loading...',
    'Reading your mind...',
  ],
  steffen: [
    'Vibing with the colors...',
    'Hold on lemme cook...',
    'Actually doing shit...',
    'Making it look fire...',
    'Im not ChatGPT...',
    'Reading your mind...',
    'Design takes vision...',
    'Bro chill its loading...',
  ],
  steve: [
    'Reading the brief...',
    'Actually doing shit...',
    'Im not ChatGPT...',
    'Running the audit...',
    'Hold on lemme cook...',
    'Analyzing the numbers...',
    'Bro chill its loading...',
    'Reading your mind...',
  ],
  alex: [
    'Building the strategy...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Im not ChatGPT...',
    'Reading your mind...',
    'Connecting the dots...',
    'Bro chill its loading...',
    'Running the play...',
  ],
  tony: [
    'Creating content...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Scheduling the posts...',
    'Im not ChatGPT...',
    'Bro chill its loading...',
    'Building the feed...',
    'Reading your mind...',
  ],
  jacob: [
    'Writing the email...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Im not ChatGPT...',
    'Prospecting...',
    'Reading your mind...',
    'Bro chill its loading...',
    'Finding the lead...',
  ],
  mom: [
    'Coordinating the team...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Routing the task...',
    'Im not ChatGPT...',
    'Running the show...',
    'Bro chill its loading...',
    'Reading your mind...',
  ],
  paige: [
    'Checking client health...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Im not ChatGPT...',
    'Reading your mind...',
    'Tracking deliverables...',
    'Bro chill its loading...',
    'Running the numbers...',
  ],
  elmo: [
    'Running QA...',
    'Actually doing shit...',
    'Hold on lemme cook...',
    'Screenshotting...',
    'Im not ChatGPT...',
    'Bro chill its loading...',
    'Finding the bugs...',
    'Reading your mind...',
  ],
  colton: [
    'Hold on lemme cook...',
    'Actually building this...',
    'Im not ChatGPT...',
    'Debugging rn...',
    'Bro chill its loading...',
    'Making it work...',
    'Actually doing shit...',
    'Writing the code...',
  ],
  pixel: [
    'Actually doing shit...',
    'Im not ChatGPT...',
    'Bro chill its loading...',
    'Hold on lemme cook...',
    'Reading your mind...',
  ],
}

/**
 * Get typing phrases for a given agent slug.
 * Falls back to DEFAULT_TYPING_PHRASES if agent not in list.
 */
export function getTypingPhrases(agentSlug) {
  return AGENT_TYPING_PHRASES[agentSlug] || DEFAULT_TYPING_PHRASES
}
