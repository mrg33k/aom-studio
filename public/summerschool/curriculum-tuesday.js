/* Summer School — TUESDAY curriculum
 *
 * Day 2 in the genius track. Spine: reading, writing, math, Roblox/coding +
 * a kid-founder story + 4 named "tricks" he can carry forward.
 *
 * Trick-arc pedagogy: every spelling/writing/reading/presenting block teaches
 * ONE named technique, demos it, has him try it once, then uses it on the
 * thing he actually hates. Tomorrow recalls today's tricks.
 *
 * Curriculum source notes:
 *   - Robert Nay / Bubble Ball facts verified via Wikipedia, HuffPost (2011),
 *     Kotaku (2011), and Forbes 30 Under 30 2012 listing.
 *   - Khan Academy video qGTYSAeLTOE = "Intro to rates" (already shipped Monday).
 *     For Tuesday's deeper math, queueing constant-of-proportionality variant —
 *     will verify embeddability in the walker before ship.
 *   - Roblox-dev micro-lesson uses leaderboard concept (universal in Roblox
 *     games, instantly relatable, intro to game-state thinking).
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.tuesday = {
  weekOf: '2026-06-09',
  day: 'tuesday',
  theme: 'TRICK DAY',
  themeDesc: '4 new tricks for things you hated yesterday.',

  // ===== The kid-founder anchor passage =====
  // Real story, age-appropriate, lands the "you can ship something at 14" punch
  passage: {
    title: 'Robert Nay was 14 when he beat Angry Birds',
    hero: 'A kid from Spanish Fork, Utah taught himself to code at the public library, shipped a game, and hit #1.',
    paragraphs: [
      "In late 2010, Angry Birds was the number one free game on the iPhone App Store. It had been there for months. Rovio, the company that made it, had over 100 employees. Their game had been downloaded more than 50 million times.",
      "Then a kid from Spanish Fork, Utah knocked it out of first place. His name was Robert Nay. He was 14 years old, and he had never written a single line of code before.",
      "When his friends bet him he couldn't make an iPhone game, he didn't argue with them. He walked to the public library and started reading every book on programming he could find. One month later, he had taught himself enough to build something called Bubble Ball — a physics puzzle game where you guide a small blue ball through obstacles by placing ramps and walls. He used a tool called Corona SDK to write the code. The whole game was about 4,000 lines, written on his family's computer with help from his mom.",
      "He released Bubble Ball on December 22, 2010. Two weeks later it had been downloaded 2 million times. It hit number one on the App Store's free games list, pushing Angry Birds to number two. Within a year, Bubble Ball had over 16 million downloads. Forbes put Robert on their 30 Under 30 list when he was 15. He was the youngest person on it.",
      "Here's what's wild: he didn't have any special programming background. He didn't go to a fancy school. He just decided to make the thing, walked into a library, and put in the work. One month of self-teaching turned into the biggest free game in the world. The trick wasn't talent. The trick was deciding to start before he was ready."
    ],

    // 4 comprehension questions — at least 2 require inference, not lookup
    questions: [
      {
        q: "Before he built Bubble Ball, how much programming experience did Robert Nay have?",
        choices: ["None", "Three years of school programming classes", "He'd built two games before"],
        right: 0
      },
      {
        q: "How long did it take him to teach himself enough to build the game?",
        choices: ["One week", "One month", "One year"],
        right: 1
      },
      {
        q: "Bubble Ball reached #1 on the App Store. What game did it push out of #1?",
        choices: ["Candy Crush", "Angry Birds", "Minecraft"],
        right: 1
      },
      {
        q: "What's the main point the passage is making about why Robert succeeded?",
        choices: [
          "He had special programming talent his friends didn't have",
          "His mom did most of the work for him",
          "He decided to start before he felt ready and put in the work"
        ],
        right: 2
      }
    ],

    // Speed-Read comprehension — separate, faster questions for RSVP pass
    srComprehension: [
      { q: "How many downloads did Bubble Ball get in its first two weeks?", choices: ["200,000", "2 million", "20 million"], right: 1 },
      { q: "What software tool did Robert use to build the game?", choices: ["Roblox Studio", "Corona SDK", "Unity"], right: 1 },
      { q: "Where did Robert teach himself to code?", choices: ["At a coding camp", "The public library", "Online with a tutor"], right: 1 }
    ]
  },

  // ===== Spelling words for Tuesday — pulled from today's passage =====
  // Bigger pool, no in-round repeats. Drilled with the Chunking trick.
  spelling: {
    pool: ['library', 'physics', 'puzzle', 'obstacles', 'downloaded', 'programming', 'platform', 'puzzle', 'million', 'company', 'fifteen', 'youngest', 'special', 'background', 'taught', 'released'],
    // Distinct lists per round — no repeats within a round
    round1: ['library', 'physics', 'puzzle', 'obstacles', 'million', 'fifteen'],
    round2: ['programming', 'downloaded', 'youngest', 'company', 'special', 'background'],
    round3: ['taught', 'released', 'library', 'programming', 'puzzle', 'company']
  },

  // ===== Math: Constant of Proportionality =====
  // Trick: "When y = kx, k is what y equals when x = 1. Look for k by asking 'what's y when x is 1?'"
  mathLesson: {
    number: 2,
    domain: 'Ratios & Proportional Relationships',
    title: 'Constant of Proportionality',
    goal: 'Find the constant k in a proportional relationship y = kx.',
    // Will verify in walker; falls back to summary if embed fails
    videoId: '1qO3KP9XpNo',
    summary: [
      "When two things are PROPORTIONAL, they grow together at a fixed rate. If you double one, you double the other. That fixed rate has a name: the constant of proportionality. We call it k.",
      "Every proportional relationship can be written as y = kx. The 'y' is one quantity. The 'x' is the other. The 'k' is the constant that ties them together. For example: if a pizza shop sells 3 slices for $6, that's $2 per slice. The constant is 2. The equation is y = 2x, where y is dollars and x is slices.",
      "Here's the TRICK to find k fast: ask yourself, 'what is y when x is 1?' That number IS k. If 3 slices cost $6, then 1 slice costs $2 — so k = 2. If 5 hours of work pays $75, then 1 hour pays $15 — so k = 15. The constant is always y at x = 1.",
      "Once you know k, you know everything. Want to know what 9 slices cost? y = 2 × 9 = $18. Want to know how long 12 hours of work pays? y = 15 × 12 = $180. The constant k unlocks the whole table. Every proportional relationship works this way — speed (miles per hour), price (dollars per pound), wage (dollars per hour). All k. All findable by asking what y is when x is 1."
    ],
    questions: [
      { q: 'In the equation y = kx, what does k represent?', a: ['A random number', 'The constant of proportionality', 'The result'], right: 1 },
      { q: '3 muffins cost $9. What is k (cost per muffin)?', a: ['$1', '$3', '$9'], right: 1 },
      { q: 'A car drives 240 miles in 4 hours. Using the trick, what is k (speed per hour)?', a: ['40 mph', '60 mph', '120 mph'], right: 1 }
    ],
    practice: [
      { p: '5 books cost $35. What is the constant (price per book)?', a: 7, unit: '$' },
      { p: 'A printer makes 60 pages in 3 minutes. What is k (pages per minute)?', a: 20, unit: ' pages/min' },
      { p: '8 oranges cost $4. What is k (price per orange)?', a: 0.5, unit: '$' },
      { p: 'A runner covers 12 miles in 2 hours. What is k (mph)?', a: 6, unit: ' mph' },
      { p: '4 bags of chips weigh 800 grams. What is k (grams per bag)?', a: 200, unit: 'g' }
    ]
  },

  // ===== The 4 named tricks for hated subjects =====
  // Each one becomes its own trick-arc block. Tomorrow's lessons recall them.
  tricks: {
    reading: {
      name: 'The Spine Words trick',
      subject: 'reading',
      hatedBecause: 'Big walls of text feel like a slog. Your eyes glaze over by paragraph 2.',
      trick: 'Before reading the passage, SCAN it first. Look for the bolded words, the names, the numbers, the dates. Those are the SPINE — they tell you what the passage is about before you read a word of it. Then when you read for real, your brain already has the shape — you\'re just filling in details. Reading goes 2x faster and you remember more.',
      demoText: 'Try it on this paragraph: spine words = "Robert Nay", "14", "Bubble Ball", "Corona SDK", "2 million downloads", "Angry Birds", "App Store". You already know the story before you read it: a 14-year-old made a game called Bubble Ball using a tool called Corona SDK, it got 2 million downloads, and it beat Angry Birds on the App Store. Now reading the paragraph is just confirming what you already half-know.',
      tryPrompt: 'Look at the next paragraph for 5 seconds. Just scan. What are the SPINE words?',
      tryAnswerHint: 'Names, places, numbers, the big bold idea.',
      showoffPrompt: 'Read chunk 3 of the Robert Nay passage. Use the Spine Words trick FIRST. Time yourself.',
    },

    spelling: {
      name: 'The Chunking trick',
      subject: 'spelling',
      hatedBecause: 'Long words look like one giant blob. You guess at them.',
      trick: 'Break the word into THREE-LETTER BITES. Sound out each chunk. Then put them back together. Try it: "accessory" = ac-ces-so-ry. "Library" = lib-rar-y. "Programming" = pro-gram-ming. Once you can chunk it, you can spell it.',
      demoText: 'Watch: O-B-S-T-A-C-L-E-S. Chunked: OB-STA-CLES. Three bites. Now you can spell obstacles without guessing.',
      tryPrompt: 'Chunk this word into bites you can pronounce: "downloaded"',
      tryAnswerHint: 'DOWN-LOAD-ED. Three chunks.',
      showoffPrompt: 'Spell 6 hard words from the passage using the Chunking trick.',
    },

    writing: {
      name: 'The Question Opener trick',
      subject: 'writing',
      hatedBecause: 'Staring at a blank page sucks. You don\'t know how to start.',
      trick: 'Open your writing with a QUESTION. Any question. The reader has to keep reading to find the answer — that\'s the hook. "What if a 14-year-old could beat Angry Birds?" "Why does every Roblox game have a leaderboard?" "How much would you pay to be the best at one thing?" Questions pull the reader in. Statements don\'t.',
      demoText: 'Boring opener: "I made a game called Skyfall." Question opener: "What if you could parkour across rooftops with your friends in real time?" Same game, totally different pull.',
      tryPrompt: 'Rewrite this opener as a question: "Roblox studios make money from in-game purchases."',
      tryAnswerHint: 'Try: "How does a Roblox studio actually make money — and how much of your $10 do they really see?"',
      showoffPrompt: 'Write a 5-sentence pitch for your Roblox game. The FIRST sentence must be a question.',
    },

    presenting: {
      name: 'The Slow-Fast-Slow trick',
      subject: 'presenting',
      hatedBecause: 'Talking out loud feels awkward. You rush through to get it over with.',
      trick: 'When you read or present out loud, change your speed on purpose. SLOW down on the FIRST sentence (gives weight). SPEED UP through the boring middle (you don\'t lose people). SLOW DOWN again on the punch line (lands the point). Same words, totally different impact. Try it on any sentence — you\'ll hear it.',
      demoText: 'Fast monotone: "Robert Nay was 14 when he beat Angry Birds with a game he made in a month."  \nSlow-fast-slow: "Robert Nay was 14... when he beat Angry Birds... with a game he made — IN ONE MONTH." Big difference. Same sentence.',
      tryPrompt: 'Read this out loud twice. Once flat. Once with slow-fast-slow: "He didn\'t have any special background. He just decided to start before he was ready."',
      tryAnswerHint: 'Pause for a half-beat after "background" and before "start." Slow down on "before he was ready."',
      showoffPrompt: 'Record yourself reading your Roblox pitch out loud using the Slow-Fast-Slow trick.',
    }
  },

  // ===== Handwriting page =====
  // He copies the 4 trick names + rules onto paper. Photographs. Uploads.
  // Cements the tricks AND practices handwriting.
  handwriting: {
    title: 'Today\'s 4 tricks — write them on paper',
    intro: 'Grab a piece of paper and a pen. Write the 4 tricks you learned today. Take your time. When you\'re done, take a photo and upload it below.',
    lines: [
      'Reading: the SPINE WORDS trick — scan for names, numbers, bold words FIRST.',
      'Spelling: the CHUNKING trick — break long words into 3-letter bites.',
      'Writing: the QUESTION OPENER trick — start with a question, the reader has to keep going.',
      'Presenting: the SLOW-FAST-SLOW trick — slow on first sentence, fast through middle, slow on punch.'
    ],
    why: 'Writing them by hand makes them stick in your brain in a way typing never does. Plus your handwriting gets reps.',
    showoffPrompt: 'Take a photo of your paper. Upload it below.',
  },

  // ===== Roblox dev micro-lesson =====
  // Real concept: leaderboards. Why every Roblox game has one.
  // No embedded video tonight; concept only. Verified Roblox Education video
  // hunt is a Wednesday queue item.
  robloxLesson: {
    title: 'Why every Roblox game has a leaderboard',
    paragraphs: [
      'Open any Roblox game. Within 30 seconds, you\'ll see a leaderboard — the top players, the high scores, the current round\'s ranking. It\'s not an accident that they all have one. It\'s a deliberate game-design choice.',
      'Leaderboards do three things. First, they give every player a GOAL the moment they spawn — even if you\'re not the best, you can see what better looks like. Second, they make the game COMPETITIVE without forcing anyone to compete — you can ignore the leaderboard if you want. Third, they make players come BACK — "I was rank 8 yesterday, I want to hit rank 5 today."',
      'Behind the scenes, a Roblox leaderboard is just a piece of game-state — a table that tracks every player\'s score, sorted from high to low, refreshed every few seconds. As a developer you can decide what counts as score: kills, coins collected, distance traveled, time alive, pets adopted. Whatever you measure becomes what players optimize for. That\'s a powerful thing — and a responsibility.',
      'When you build your own Roblox game, the leaderboard you choose tells your players what the game is REALLY about. Make it kills, and you\'re building a combat game. Make it kindness (points for helping other players), and you\'re building something different. The leaderboard IS the game design, condensed into one column of numbers.'
    ],
    questions: [
      { q: 'What\'s ONE of the three jobs a leaderboard does?', a: ['Makes the game harder', 'Gives every player a goal the moment they spawn', 'Hides the score from new players'], right: 1 },
      { q: 'What is a leaderboard, technically?', a: ['A piece of game-state — a table of players sorted by score', 'A separate app players download', 'A Roblox staff feature only certain games get'], right: 0 },
      { q: 'What\'s the deeper point about WHAT you choose to put on the leaderboard?', a: ['It doesn\'t really matter, players ignore it', 'Whatever you measure becomes what players optimize for', 'Roblox forces you to use score'], right: 1 }
    ],
    // AI seed (Patrik 2026-05-25): tiny line about AI being part of the toolkit
    aiSeed: 'Heads up: a lot of Roblox studios now use AI to help generate placeholder leaderboard art, suggest balance changes, even draft NPC dialogue. You\'ll see more of this everywhere. The kids who learn to PROMPT AI well right now will have a giant advantage in 5 years.'
  },

  // ===== Build-A-Game Day 2 beat =====
  bagBeat: {
    day: 'tue',
    key: 'pitch',
    title: 'Day 2: Pitch your game with the Question Opener trick',
    intro: 'Yesterday you named your game. Today you pitch it — using one of the tricks you learned this morning.',
    whatIsPitch: 'Reminder: a pitch is a short, exciting way to sell your idea. The point is to make someone want to play your game in under 30 seconds.',
    template: [
      { label: 'Opener (must be a QUESTION)', hint: 'Use the Question Opener trick. Pull the reader in with something they have to read further to answer. "What if..." / "Why does..." / "How would you..."' },
      { label: 'The world', hint: 'One sentence on where the game takes place. Be specific.' },
      { label: 'What you do', hint: 'One sentence on the action — what does the player actually do moment-to-moment?' },
      { label: 'What makes it different', hint: 'One sentence on why this isn\'t just another game like all the others.' },
      { label: 'The hook line', hint: 'One last sentence that makes someone want to play it RIGHT NOW.' }
    ],
    why: 'Tomorrow we\'ll add a Level 1 design to it. By Friday you\'ll have a real game-design doc.',
    help: 'Write each part on paper. Then RECORD YOURSELF READING THE PITCH out loud using the Slow-Fast-Slow trick. (Bonus stars if you do.)'
  },

  // ===== Today's typing target =====
  typingTarget: "He didn't have any special background. He just decided to start before he was ready.",

  // ===== Word Tiles vocab pool — no repeats, distinct per round =====
  tileVocab: [
    { word: 'library',    clue: 'A building full of books, free to use' },
    { word: 'physics',    clue: 'The science of how things move and push' },
    { word: 'puzzle',     clue: 'A problem you solve for fun' },
    { word: 'platform',   clue: 'The website or app where games live' },
    { word: 'company',    clue: 'A group of people who run a business together' },
    { word: 'released',   clue: 'When a new game becomes available to play' },
    { word: 'million',    clue: 'A thousand thousand' },
    { word: 'youngest',   clue: 'The one with the smallest age' },
    { word: 'special',    clue: 'Different from the others in a good way' },
    { word: 'background', clue: 'What you came from or learned before' },
    { word: 'obstacles',  clue: 'Things in your way you have to get past' },
    { word: 'downloaded', clue: 'Got from the internet onto your device' }
  ],

  // ===== TUESDAY BLOCK PLAN (~14 blocks, ~3.5 hours) =====
  // Trimmed from Monday's 47. Every block earns its keep. Trick blocks anchor
  // the day, real content fills the rest, drills are tied to today's content
  // (not abstract repetition).
  blocks: [
    { id: 'welcome-tue',    kind: 'drill', type: 'welcome',          title: 'Welcome to Tuesday',                minutes: 2  },

    { id: 'trick-reading',  kind: 'topic', type: 'trick-arc',        title: 'Reading trick — Spine Words',       minutes: 10, trickKey: 'reading' },
    { id: 'reading-1',      kind: 'topic', type: 'reading',          title: 'Robert Nay — chunk 1',              minutes: 10, slice: [0, 2] },

    { id: 'trick-spelling', kind: 'topic', type: 'trick-arc',        title: 'Spelling trick — Chunking',         minutes: 10, trickKey: 'spelling' },
    { id: 'spelling-1',     kind: 'drill', type: 'spelling',         title: 'Spelling — apply Chunking',         minutes: 10, words: ['library','physics','puzzle','obstacles','million','fifteen'] },

    { id: 'mathlesson-tue', kind: 'topic', type: 'mathlesson',       title: 'Math — Constant of Proportionality', minutes: 18 },

    { id: 'reading-2',      kind: 'topic', type: 'reading',          title: 'Robert Nay — chunk 2',              minutes: 10, slice: [2, 4] },

    { id: 'trick-writing',  kind: 'topic', type: 'trick-arc',        title: 'Writing trick — Question Opener',   minutes: 10, trickKey: 'writing' },
    { id: 'bag-tue',        kind: 'topic', type: 'bag',              title: 'Build-A-Game Day 2 — pitch',        minutes: 20 },

    { id: 'reading-3',      kind: 'topic', type: 'reading',          title: 'Robert Nay — chunk 3 (the point)',  minutes: 10, slice: [4, 5] },

    { id: 'roblox-lesson',  kind: 'topic', type: 'roblox-lesson',    title: 'Roblox — why every game has a leaderboard', minutes: 12 },

    { id: 'handwriting-tue',kind: 'topic', type: 'handwriting',      title: 'Write the 4 tricks on paper',       minutes: 10 },

    { id: 'trick-present',  kind: 'topic', type: 'trick-arc',        title: 'Presenting trick — Slow-Fast-Slow', minutes: 10, trickKey: 'presenting' },

    { id: 'showoff-tue',    kind: 'topic', type: 'showdad',          title: 'Showoff — tell your 4 tricks',      minutes: 10 },

    { id: 'splash-tue',     kind: 'drill', type: 'splash',           title: 'End of Tuesday',                    minutes: 2  }
  ]
};
