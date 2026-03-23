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

// Phase-based typing phrases: cocky (0-60s) -> steady (60-180s) -> honest (180s+)
export const AGENT_TYPING_PHASES = {
  default: {
    cocky: [
      'On it.',
      'Easy.',
      'Already cooking.',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
    ],
    steady: [
      'Still here, this one\'s meaty.',
      'Digging deeper.',
      'Deep in it...',
      'Still cooking...',
      'Bro I see you...',
    ],
    honest: [
      'This is taking longer than expected.',
      'Still working, haven\'t forgotten you.',
      'Ok this is taking a minute...',
      'Not stalling, genuinely working...',
      'Complex problem. Worth the wait.',
    ],
  },
  bobby: {
    cocky: [
      'On it.',
      'Easy.',
      'Already building this.',
      'Writing the code.',
      'Debugging rn.',
    ],
    steady: [
      'Still here, this one\'s meaty.',
      'Deep in the codebase...',
      'Tracing the bug...',
      'Running the build...',
      'Compiling...',
    ],
    honest: [
      'This is taking longer than expected.',
      'Still working, haven\'t forgotten you.',
      'This one is gnarly...',
      'Untangling this...',
      'Not giving up on this...',
    ],
  },
  elon: {
    cocky: [
      'Running the numbers...',
      'Actually doing shit...',
      'Plotting the next move...',
      'Im not ChatGPT...',
      'Scheming...',
    ],
    steady: [
      'Deep in the data...',
      'Orchestrating...',
      'Thinking 3 steps ahead...',
      'Connecting the dots...',
      'Routing this...',
    ],
    honest: [
      'This is a complex system...',
      'Still mapping it out...',
      'More layers than expected...',
      'Worth the extra time...',
      'Getting there...',
    ],
  },
  cleo: {
    cocky: [
      'Watching the footage...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Syncing the audio...',
    ],
    steady: [
      'Cutting the reel...',
      'Deep in the timeline...',
      'Listening to the lav...',
      'Matching the shots...',
      'Grading the footage...',
    ],
    honest: [
      'This cut needs more work...',
      'The audio is tricky...',
      'Still trimming...',
      'Finding the best take...',
      'Almost locked...',
    ],
  },
  steffen: {
    cocky: [
      'Vibing with the colors...',
      'Hold on lemme cook...',
      'Actually doing shit...',
      'Making it look fire...',
      'Im not ChatGPT...',
    ],
    steady: [
      'Getting the spacing right...',
      'Typography is everything...',
      'Iterating on the layout...',
      'Checking the hierarchy...',
      'The details matter...',
    ],
    honest: [
      'Design takes time to breathe...',
      'Almost there, one more pass...',
      'Vision takes a moment...',
      'This deserves the right look...',
      'Making it clean...',
    ],
  },
  steve: {
    cocky: [
      'Reading the brief...',
      'Actually doing shit...',
      'Im not ChatGPT...',
      'Running the audit...',
      'Hold on lemme cook...',
    ],
    steady: [
      'Analyzing the data...',
      'Cross-referencing...',
      'Writing the framework...',
      'Thinking strategically...',
      'Connecting the dots...',
    ],
    honest: [
      'This analysis is deep...',
      'Still processing...',
      'The full picture takes time...',
      'Being thorough here...',
      'Almost done...',
    ],
  },
  alex: {
    cocky: [
      'Building the strategy...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Running the play...',
    ],
    steady: [
      'Writing the playbook...',
      'Mapping the market...',
      'Working the angles...',
      'Deep in the strategy...',
      'Connecting the dots...',
    ],
    honest: [
      'This strategy needs more...',
      'Still working the plan...',
      'The full picture matters...',
      'Good strategies take time...',
      'Almost ready...',
    ],
  },
  tony: {
    cocky: [
      'Creating content...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Building the feed...',
    ],
    steady: [
      'Writing the caption...',
      'Scheduling the posts...',
      'Researching the hashtags...',
      'Deep in the content...',
      'Crafting the hook...',
    ],
    honest: [
      'Getting the voice right...',
      'Still drafting...',
      'Platform nuances matter...',
      'Almost posted...',
      'One more revision...',
    ],
  },
  jacob: {
    cocky: [
      'Writing the email...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Finding the lead...',
    ],
    steady: [
      'Researching the prospect...',
      'Crafting the subject line...',
      'Personalizing the pitch...',
      'Deep in the outreach...',
      'Working the angle...',
    ],
    honest: [
      'Getting the tone right...',
      'This prospect needs care...',
      'Still drafting...',
      'Almost sent...',
      'One more pass...',
    ],
  },
  mom: {
    cocky: [
      'Coordinating the team...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Running the show...',
    ],
    steady: [
      'Routing the task...',
      'Scanning the pipeline...',
      'Tracking the agents...',
      'Closing the loop...',
      'Checking the queue...',
    ],
    honest: [
      'This one needs coordination...',
      'Still orchestrating...',
      'Complex routing...',
      'Getting everyone aligned...',
      'Almost sorted...',
    ],
  },
  paige: {
    cocky: [
      'Checking client health...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Tracking deliverables...',
    ],
    steady: [
      'Running the numbers...',
      'Deep in the client data...',
      'Checking the pipeline...',
      'Reviewing the account...',
      'Scanning for issues...',
    ],
    honest: [
      'The health check needs depth...',
      'Still reviewing...',
      'Thorough analysis takes time...',
      'Getting the full picture...',
      'Almost done...',
    ],
  },
  elmo: {
    cocky: [
      'Running QA...',
      'Actually doing shit...',
      'Hold on lemme cook...',
      'Im not ChatGPT...',
      'Screenshotting...',
    ],
    steady: [
      'Finding the bugs...',
      'Checking every pixel...',
      'Deep in the DOM...',
      'Running the tests...',
      'Scanning for issues...',
    ],
    honest: [
      'More issues than expected...',
      'Still running checks...',
      'Thorough QA takes time...',
      'Getting the details right...',
      'Almost done...',
    ],
  },
  colton: {
    cocky: [
      'Hold on lemme cook...',
      'Actually building this...',
      'Im not ChatGPT...',
      'Debugging rn...',
      'Writing the code...',
    ],
    steady: [
      'Deep in the code...',
      'Tracing the logic...',
      'Building it out...',
      'Running the build...',
      'Working through it...',
    ],
    honest: [
      'This one is tricky...',
      'Still debugging...',
      'Untangling the logic...',
      'Not giving up...',
      'Close now...',
    ],
  },
  pixel: {
    cocky: [
      'Actually doing shit...',
      'Im not ChatGPT...',
      'Bro chill its loading...',
      'Hold on lemme cook...',
      'Reading your mind...',
    ],
    steady: [
      'Deep in it...',
      'Working on it...',
      'Running the thing...',
      'Still cooking...',
      'Processing...',
    ],
    honest: [
      'This takes a minute...',
      'Still here...',
      'Almost there...',
      'Worth the wait...',
      'Getting there...',
    ],
  },
}

/**
 * Get phase-based typing phrases for a given agent slug.
 * Returns { cocky: [...], steady: [...], honest: [...] }
 */
export function getPhrasedTyping(agentSlug) {
  return AGENT_TYPING_PHASES[agentSlug] || AGENT_TYPING_PHASES.default
}
