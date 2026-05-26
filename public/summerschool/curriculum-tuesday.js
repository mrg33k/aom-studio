/* Summer School — TUESDAY curriculum (reshaped 2026-05-26)
 *
 * Week-level frame: one named trick per day, four subjects per day, ~40 internal
 * beats. Tuesday's trick = SPINE WORDS (reading). The other three named tricks
 * (Chunking, Question Opener, Slow-Fast-Slow) move to Wed/Thu/Fri.
 *
 * Tuesday's four subjects:
 *   1. Reading      — Spine Words trick + Robert Nay passage in three chunks
 *   2. Math         — Constant of Proportionality (video + summary + practice)
 *   3. Roblox Dev   — Why every Roblox game has a leaderboard (concept)
 *   4. Entrepreneurship — Build-A-Game Day 2: pitch the game named Monday
 *
 * Math video: rzDQ_ZIpi84 (Khan Academy 7th grade, "Constant of proportionality
 * from tables"). Verified embeddable 2026-05-26. Replaces the previous dead
 * video ID (1qO3KP9XpNo returned "Video unavailable").
 *
 * Pedagogy: one trick today, applied across reading + writing-on-paper.
 * Pitch opener is just "pull them in" today; Thursday we'll come back to it
 * with the named Question Opener trick and upgrade the opener.
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.tuesday = {
  weekOf: '2026-06-09',
  day: 'tuesday',
  theme: 'SPINE WORDS',
  themeDesc: 'One trick today — Spine Words. Plus math, code, and the pitch.',

  // ===== Day-specific welcome content =====
  // The welcome renderer reads this if present and tailors the orientation
  // to today. Without this, the welcome block would render Monday's intro
  // (Mikaila / Arduino / Unit Rates) on Tuesday.
  welcomeContent: {
    dayLabel: 'Day 2',
    showParentNote: false,
    bullets: [
      "<strong>The Spine Words trick</strong> — scan a passage for names, numbers, and big words FIRST. Reading goes 2x faster.",
      "The story of <strong>Robert Nay</strong> — a 14-year-old who taught himself to code at the public library and beat Angry Birds.",
      "Today's 7th-grade math concept — <strong>Constant of Proportionality</strong> — the trick to find k by asking what y is when x is 1.",
      "Why every Roblox game has a <strong>leaderboard</strong> — and what choosing the score says about the game you're really making.",
      "<strong>Build-A-Game Day 2</strong> — pitch the game you named yesterday. By Friday you'll have a real game-design doc.",
      "Plus drills throughout the day — all themed around what you just read."
    ],
    howItWorks: "One trick today (Spine Words). It comes back tomorrow when you meet the next one. The pieces stack."
  },

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

  // ===== Math: Constant of Proportionality =====
  // Trick: "When y = kx, k is what y equals when x = 1. Look for k by asking 'what's y when x is 1?'"
  mathLesson: {
    number: 2,
    domain: 'Ratios & Proportional Relationships',
    title: 'Constant of Proportionality',
    goal: 'Find the constant k in a proportional relationship y = kx.',
    // Verified embed 2026-05-26: Khan Academy 7th grade, "Constant of
    // proportionality from tables" — matches the table examples in the
    // summary below (pizza slices, hours of work). Previous ID
    // 1qO3KP9XpNo returned "Video unavailable" — replaced.
    videoId: 'rzDQ_ZIpi84',
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

  // ===== Today's one named trick: Spine Words (reading) =====
  // The other three named tricks (Chunking / Question Opener / Slow-Fast-Slow)
  // belong to Wed / Thu / Fri respectively. One trick per day = it sticks.
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
    }
  },

  // ===== Handwriting page (slimmed to today's one trick) =====
  // He copies the Spine Words rule onto paper. Photographs. Uploads.
  // One trick today — fewer lines, more focus.
  handwriting: {
    title: 'Today\'s trick — write it on paper',
    intro: 'Grab a piece of paper and a pen. Write down the Spine Words trick in your own words. Take your time — neat lines. When you\'re done, take a photo and upload it below.',
    lines: [
      'The SPINE WORDS trick: before I read, I SCAN for names, numbers, and bold words. Those are the SPINE — they tell me what the passage is about. Then when I read for real, I\'m filling in details, not searching for them.'
    ],
    why: 'Writing it by hand makes it stick in your brain in a way typing never does. Plus your handwriting gets reps.',
    showoffPrompt: 'Take a photo of your paper. Upload it below.',
  },

  // ===== Roblox dev micro-lesson =====
  // Real concept: leaderboards. Why every Roblox game has one.
  // Concept-only today; the Studio walkthrough comes later this week.
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
  // Pitch the game named Monday. Today the opener just needs to be interesting.
  // Thursday's Question Opener trick will come back and upgrade it.
  bagBeat: {
    day: 'tue',
    key: 'pitch',
    title: 'Day 2: Pitch your game',
    intro: 'Yesterday you named your game. Today you pitch it. Get someone excited about it in under 30 seconds.',
    whatIsPitch: 'A pitch is a short, exciting way to sell your idea. The point is to make someone want to play your game by the time you stop talking.',
    template: [
      { label: 'Opener', hint: 'Pull them in fast. One sentence that makes someone want to hear more. (We\'ll come back Thursday and upgrade this with a special trick.)' },
      { label: 'The world', hint: 'One sentence on where the game takes place. Be specific.' },
      { label: 'What you do', hint: 'One sentence on the action — what does the player actually do moment-to-moment?' },
      { label: 'What makes it different', hint: 'One sentence on why this isn\'t just another game like all the others.' },
      { label: 'The hook line', hint: 'One last sentence that makes someone want to play it RIGHT NOW.' }
    ],
    why: 'Tomorrow we\'ll add a Level 1 design to it. By Friday you\'ll have a real game-design doc.',
    help: 'Write each part on paper. Then read your pitch out loud once. (Bonus stars if you record it.)'
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

  // ===== TUESDAY BLOCK PLAN — ~40 internal beats across 4 subjects =====
  // Subject breakdown:
  //   Reading (Spine Words trick + Robert Nay in 3 chunks) ≈ 14 beats
  //   Math (video + summary + 3 concept Qs + 5 practice)   ≈ 9 beats
  //   Roblox Dev (4 paragraphs + 3 Qs + AI seed)           ≈ 5 beats
  //   Entrepreneurship (BAG Day 2 pitch)                   ≈ 6 beats
  //   Frame (welcome + handwriting + show-dad + splash)    ≈ 6 beats
  //                                                       = ~40 beats
  blocks: [
    { id: 'welcome-tue',    kind: 'drill', type: 'welcome',          title: 'Welcome to Tuesday',                minutes: 2  },

    { id: 'trick-reading',  kind: 'topic', type: 'trick-arc',        title: 'Reading — Spine Words',             minutes: 12, trickKey: 'reading' },
    { id: 'reading-1',      kind: 'topic', type: 'reading',          title: 'Robert Nay — chunk 1',              minutes: 10, slice: [0, 2] },

    { id: 'mathlesson-tue', kind: 'topic', type: 'mathlesson',       title: 'Math — Constant of Proportionality', minutes: 18 },

    { id: 'reading-2',      kind: 'topic', type: 'reading',          title: 'Robert Nay — chunk 2',              minutes: 10, slice: [2, 4] },

    { id: 'bag-tue',        kind: 'topic', type: 'bag',              title: 'Build-A-Game Day 2 — pitch',        minutes: 18 },

    { id: 'reading-3',      kind: 'topic', type: 'reading',          title: 'Robert Nay — chunk 3 (the point)',  minutes: 10, slice: [4, 5] },

    { id: 'roblox-lesson',  kind: 'topic', type: 'roblox-lesson',    title: 'Roblox — why every game has a leaderboard', minutes: 12 },

    { id: 'handwriting-tue',kind: 'topic', type: 'handwriting',      title: 'Write the Spine Words trick on paper', minutes: 8 },

    { id: 'showoff-tue',    kind: 'topic', type: 'showdad',          title: 'Show Mom or Dad what you learned',  minutes: 8 },

    { id: 'splash-tue',     kind: 'drill', type: 'splash',           title: 'End of Tuesday',                    minutes: 2  }
  ]
};
