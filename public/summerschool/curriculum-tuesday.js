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

  // ===== TUESDAY BLOCK PLAN — 40 atomic modules, 4 subjects × 10 each =====
  // Each card = one tap, one short focused unit, one Continue. Patrik 2026-05-26:
  // "10 modules 4 subjects per day to help him lock it all in so 40 modules per day."
  //
  // Subject buckets (10 each):
  //   Reading      — Spine Words trick + Robert Nay passage paragraph-by-paragraph
  //   Math         — Constant of Proportionality (intro, video, 4 summary reads, Qs, practice)
  //   Roblox Dev   — Why leaderboards (intro, 4 paragraphs, 3 Qs, AI seed, reflection)
  //   BAG (pitch)  — Day 2 pitch broken into 10 micro-modules
  //
  // Plus 3 frame blocks (welcome / show-mom-dad / report-card) that bookend the day.
  // Total = 43 cards. Per-module timer is 3-4 min default; auto-extends +2 if needed.

  // Reusable concept card body for "did it land?" reflection prompts on each subject's last module
  spineWordsTrickText: 'Before reading the passage, SCAN it first. Look for names, numbers, dates, the big words. Those are the SPINE — they tell you what the passage is about before you read a word of it. Then when you read for real, your brain already has the shape — you\'re just filling in details.',

  blocks: [
    // ===== FRAME 1: Welcome =====
    { id: 'welcome-tue', kind: 'drill', type: 'welcome', title: 'Welcome to Tuesday', minutes: 2 },

    // ============================================================
    // READING — 10 modules
    // ============================================================
    { id: 'r-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 01 of 10',
      title: 'The Spine Words trick',
      body: [
        'Today\'s trick is called <strong>Spine Words</strong>. It works on any reading — books, articles, even a wall of text in a video game tutorial.',
        'Here it is: Before you read a paragraph, <strong>SCAN it first</strong>. Look for the names, the numbers, the dates, the bold words. Those are the SPINE — they tell you what the paragraph is about before you read it.',
        'Then when you read for real, you\'re filling in details on a shape you already know. Reading goes about 2x faster and you remember way more.'
      ],
      cta: 'Got it' },

    { id: 'r-02', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 02 of 10',
      title: 'Spine Words — demo on Robert Nay',
      body: [
        'Watch the trick work on this paragraph you\'re about to read:',
        '<em>Spine words = <strong>Robert Nay · 14 · Bubble Ball · Corona SDK · 2 million downloads · Angry Birds · App Store</strong></em>',
        'Just from those, you already half-know the story: a 14-year-old made a game called Bubble Ball using a tool called Corona SDK, it got 2 million downloads, and it beat Angry Birds on the App Store.',
        'Now when you read the paragraph, you\'re confirming what you already half-know. That\'s the move.'
      ],
      cta: 'I see it' },

    { id: 'r-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 03 of 10',
      title: 'Try it once',
      body: [
        'Look at this next paragraph for 5 seconds. Just scan. Don\'t read for meaning yet — just spot the spine words.',
        '<em>"In late 2010, Angry Birds was the number one free game on the iPhone App Store. It had been there for months. Rovio, the company that made it, had over 100 employees. Their game had been downloaded more than 50 million times."</em>',
        'What are the SPINE words? Read it, scan it, then tap "show the answer" below to check yourself.'
      ],
      reveal: { prompt: 'Your turn — what\'s the spine?', answer: 'Late 2010 · Angry Birds · #1 free game · iPhone App Store · Rovio · 100 employees · 50 million downloads. Numbers, names, dates — that\'s the spine.' },
      cta: 'I tried it' },

    { id: 'r-04', kind: 'topic', type: 'reading', minutes: 4, slice: [0, 1], title: 'Robert Nay — paragraph 1' },
    { id: 'r-05', kind: 'topic', type: 'reading', minutes: 4, slice: [1, 2], title: 'Robert Nay — paragraph 2' },
    { id: 'r-06', kind: 'topic', type: 'reading', minutes: 5, slice: [2, 3], title: 'Robert Nay — paragraph 3 (the build)' },
    { id: 'r-07', kind: 'topic', type: 'reading', minutes: 5, slice: [3, 4], title: 'Robert Nay — paragraph 4 (the release)' },
    { id: 'r-08', kind: 'topic', type: 'reading', minutes: 5, slice: [4, 5], title: 'Robert Nay — paragraph 5 (the point)' },

    { id: 'r-09', kind: 'topic', type: 'speedread', minutes: 4, title: 'Speed-Read drill — the whole story' },

    { id: 'r-10', kind: 'topic', type: 'handwriting', minutes: 5, title: 'Write the Spine Words trick on paper' },

    // ============================================================
    // MATH — 10 modules (Constant of Proportionality)
    // ============================================================
    { id: 'm-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 01 of 10',
      title: 'What does "proportional" even mean?',
      body: [
        '<strong>Proportional</strong> means two things grow together at a fixed rate. If you double one, you double the other.',
        'Pizza shop: 1 slice for $2. 2 slices for $4. 3 slices for $6. The price grows at a fixed rate of $2 per slice — that\'s proportional.',
        'Today\'s lesson: find that fixed rate. They call it the <strong>constant of proportionality</strong>, or just <strong>k</strong>.'
      ],
      cta: 'Ready' },

    { id: 'm-02', kind: 'topic', type: 'mathlesson', step: 'video', minutes: 6,
      title: 'Watch the Khan Academy lesson' },

    { id: 'm-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 03 of 10',
      title: 'The equation: y = kx',
      body: [
        'Every proportional relationship can be written the same way: <strong>y = kx</strong>.',
        'The <strong>y</strong> is one quantity. The <strong>x</strong> is the other. The <strong>k</strong> is the constant that ties them together.',
        'Pizza shop again: if y is dollars and x is slices, then y = 2x (because $2 per slice). The k is 2.'
      ],
      cta: 'Makes sense' },

    { id: 'm-04', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 04 of 10',
      title: 'The trick to find k fast',
      body: [
        'Here\'s the move: ask yourself, <strong>"what is y when x is 1?"</strong> That number IS k.',
        'If 3 slices cost $6, then 1 slice costs $2 — so k = 2.',
        'If 5 hours of work pays $75, then 1 hour pays $15 — so k = 15.',
        'The constant is always y at x = 1. Find that, you find k.'
      ],
      cta: 'Got the trick' },

    { id: 'm-05', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 05 of 10',
      title: 'Once you know k, you know everything',
      body: [
        'Want to know what 9 slices cost? y = 2 × 9 = $18.',
        'Want to know what 12 hours of work pays? y = 15 × 12 = $180.',
        'The constant k unlocks the whole table. Speed (miles per hour), price (dollars per pound), wage (dollars per hour) — all k. All findable by asking what y is when x is 1.'
      ],
      cta: 'Show me the test' },

    { id: 'm-06', kind: 'topic', type: 'mathlesson', step: 'q-1', minutes: 3, title: 'Math check — what does k mean?' },
    { id: 'm-07', kind: 'topic', type: 'mathlesson', step: 'q-23', minutes: 4, title: 'Math check — find k from a real example' },

    { id: 'm-08', kind: 'topic', type: 'mathlesson', step: 'practice-1', minutes: 4, title: 'Practice — problems 1 + 2' },
    { id: 'm-09', kind: 'topic', type: 'mathlesson', step: 'practice-2', minutes: 4, title: 'Practice — problems 3 + 4' },
    { id: 'm-10', kind: 'topic', type: 'mathlesson', step: 'practice-3', minutes: 3, title: 'Practice — problem 5' },

    // ============================================================
    // ROBLOX DEV — 10 modules (Why every game has a leaderboard)
    // ============================================================
    { id: 'rb-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 01 of 10',
      title: 'Open any Roblox game — what do you see first?',
      body: [
        'Open literally any Roblox game. Within 30 seconds, you\'ll see a <strong>leaderboard</strong> — the top players, the high scores, the current round\'s ranking.',
        'It\'s not an accident. Every studio puts one in on purpose. Today we figure out why — and what it means for the game you\'re going to build.'
      ],
      cta: 'Why?' },

    { id: 'rb-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 02 of 10',
      title: 'Three jobs a leaderboard does',
      body: [
        '<strong>1. It gives every player a GOAL the moment they spawn.</strong> Even if you\'re not the best, you can see what better looks like.',
        '<strong>2. It makes the game COMPETITIVE without forcing anyone to compete.</strong> You can ignore the leaderboard if you want. The people who care, care.',
        '<strong>3. It makes players come BACK.</strong> "I was rank 8 yesterday — I want to hit rank 5 today." That\'s the loop.'
      ],
      cta: 'Three jobs, locked in' },

    { id: 'rb-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 03 of 10',
      title: 'What a leaderboard actually IS (technically)',
      body: [
        'Behind the scenes a Roblox leaderboard is just a piece of <strong>game-state</strong> — a table that tracks every player\'s score, sorted high-to-low, refreshed every few seconds.',
        'That\'s it. A table, sorted, refreshed. Not magic. You can write one in Roblox Studio in a few lines of Lua.'
      ],
      cta: 'Got it' },

    { id: 'rb-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 04 of 10',
      title: 'The big move: what you measure becomes what they optimize for',
      body: [
        'You — the developer — decide what counts as score. Kills. Coins. Distance traveled. Time alive. Pets adopted.',
        '<strong>Whatever you measure becomes what players optimize for.</strong>',
        'Make it kills, and you\'re building a combat game. Make it kindness (points for helping other players), and you\'re building something totally different. The leaderboard IS the game design, condensed into one column of numbers.'
      ],
      cta: 'That\'s heavy' },

    { id: 'rb-05', kind: 'topic', type: 'concept', minutes: 2, subject: 'Roblox Dev', tag: 'Roblox · 05 of 10',
      title: 'Quick check — three jobs',
      body: ['What\'s ONE of the three jobs a leaderboard does?'],
      reveal: { prompt: 'Pick the answer in your head, then tap to check.', answer: 'Gives every player a goal the moment they spawn. (Also: makes the game competitive without forcing it; makes them come back.)' },
      cta: 'Got that one' },

    { id: 'rb-06', kind: 'topic', type: 'concept', minutes: 2, subject: 'Roblox Dev', tag: 'Roblox · 06 of 10',
      title: 'Quick check — what is it, technically?',
      body: ['What is a leaderboard, technically?'],
      reveal: { prompt: 'Try to answer it before tapping.', answer: 'A piece of game-state — a table of players sorted by score, refreshed every few seconds. That\'s it.' },
      cta: 'Got it' },

    { id: 'rb-07', kind: 'topic', type: 'concept', minutes: 2, subject: 'Roblox Dev', tag: 'Roblox · 07 of 10',
      title: 'Quick check — the deeper point',
      body: ['What\'s the deeper point about WHAT you choose to put on the leaderboard?'],
      reveal: { prompt: 'Take your shot, then check.', answer: 'Whatever you measure becomes what players optimize for. The leaderboard IS the game design.' },
      cta: 'Locked in' },

    { id: 'rb-08', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 08 of 10',
      title: 'A quick word about AI in studios',
      body: [
        'Heads up: a lot of Roblox studios now use AI to help generate placeholder leaderboard art, suggest balance changes, even draft NPC dialogue. You\'ll see more of this everywhere.',
        'The kids who learn to <strong>prompt AI well</strong> right now will have a giant advantage in 5 years. Not "let AI do the thinking" — but "talk to AI like a teammate you give clear instructions to."',
        'We\'ll come back to this throughout the summer.'
      ],
      cta: 'Noted' },

    { id: 'rb-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 09 of 10',
      title: 'Your turn — what would your leaderboard measure?',
      body: [
        'Think about the game you named yesterday. If you put a leaderboard in it, what would it measure?',
        'Could be: kills, coins, parkour speed, levels cleared, pets fed, friends helped, secret areas found. There\'s no wrong answer — but the answer SHAPES the game.',
        'Write your answer down — on paper or in your head — and tap continue. We\'ll come back to it Friday.'
      ],
      cta: 'Decided' },

    { id: 'rb-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 10 of 10',
      title: 'Roblox check — wrap',
      body: [
        'You just learned why every Roblox game has a leaderboard, what it really is (a sorted table of scores), and the rule that whatever you measure becomes what players go after.',
        'That\'s pro-level game-design thinking. Most kids playing Roblox have no idea this is how it works.'
      ],
      cta: 'On to the pitch' },

    // ============================================================
    // BUILD-A-GAME — 10 modules (Day 2: Pitch your game)
    // ============================================================
    { id: 'bag-01', kind: 'topic', type: 'concept', minutes: 2, subject: 'Pitch', tag: 'Pitch · 01 of 10',
      title: 'Day 2: pitch the game you named yesterday',
      body: [
        'Yesterday you named your game. Today you pitch it.',
        'A pitch is a short, exciting way to sell your idea. The point: someone wants to play your game by the time you stop talking.',
        'We\'re going to write it in 5 parts. One part per card.'
      ],
      cta: 'Let\'s pitch it' },

    { id: 'bag-02', kind: 'topic', type: 'concept', minutes: 2, subject: 'Pitch', tag: 'Pitch · 02 of 10',
      title: 'Why pitch?',
      body: [
        'Real Roblox studios pitch their games to publishers BEFORE they build them — if the pitch is bad, the game never gets made.',
        'It also forces you to know what makes your game special. If you can\'t pitch it, you don\'t really know what it is yet.',
        'By Friday you\'ll have a real game-design doc. Today\'s pitch is the first piece of it.'
      ],
      cta: 'Why locked in' },

    { id: 'bag-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Pitch', tag: 'Pitch · 03 of 10',
      title: 'Part 1 — The opener',
      body: [
        'First sentence: pull them in fast. Something that makes someone want to hear more.',
        'Examples: "Imagine a Roblox game where the ground is lava but it\'s also a dance floor." / "What if every weapon in the game cost real friendship points to use?"',
        '(We\'re going to come back to this Thursday and upgrade it with a special trick. For today, just make it interesting.)',
        '<em>Write your opener on paper or in your head, then tap continue.</em>'
      ],
      cta: 'Opener written' },

    { id: 'bag-04', kind: 'topic', type: 'concept', minutes: 3, subject: 'Pitch', tag: 'Pitch · 04 of 10',
      title: 'Part 2 — The world',
      body: [
        'One sentence on WHERE the game takes place. Be specific.',
        'Bad: "A world."  Better: "A city built on the back of a giant flying turtle."  Better: "A high school where the lockers are portals."',
        'The more specific, the more your brain (and the player\'s brain) can SEE it.',
        '<em>Write the world.</em>'
      ],
      cta: 'World written' },

    { id: 'bag-05', kind: 'topic', type: 'concept', minutes: 3, subject: 'Pitch', tag: 'Pitch · 05 of 10',
      title: 'Part 3 — What you do',
      body: [
        'One sentence on the ACTION. What does the player actually do moment-to-moment?',
        'Examples: "You parkour across rooftops collecting glowing orbs." / "You run a lemonade stand and hire other players as employees." / "You hunt ghosts with a camera that has a real shutter delay."',
        'The action is the heart of the game.',
        '<em>Write what you do.</em>'
      ],
      cta: 'Action written' },

    { id: 'bag-06', kind: 'topic', type: 'concept', minutes: 3, subject: 'Pitch', tag: 'Pitch · 06 of 10',
      title: 'Part 4 — What makes it different',
      body: [
        'One sentence on why this isn\'t just another game like all the others.',
        'Maybe it\'s the visual style. Maybe it\'s a mechanic nobody\'s tried. Maybe it\'s the AUDIENCE (a game for siblings to play together; a game for people who hate combat).',
        'Different = memorable.',
        '<em>Write what makes yours different.</em>'
      ],
      cta: 'Different written' },

    { id: 'bag-07', kind: 'topic', type: 'concept', minutes: 3, subject: 'Pitch', tag: 'Pitch · 07 of 10',
      title: 'Part 5 — The hook line',
      body: [
        'One last sentence that makes someone want to play it RIGHT NOW.',
        'Could be a tagline ("Live every minute like it\'s your last."). Could be a promise ("You will never play another obby again."). Could be a question ("What would you risk for one more level?").',
        '<em>Write the hook line.</em>'
      ],
      cta: 'Hook written' },

    { id: 'bag-08', kind: 'topic', type: 'concept', minutes: 3, subject: 'Pitch', tag: 'Pitch · 08 of 10',
      title: 'Read it out loud — just once',
      body: [
        'Read all 5 sentences out loud, in order, like you\'re telling someone about a movie that\'s about to come out.',
        'If a sentence sounds clunky out loud, that\'s your brain telling you to rewrite it. (We\'ll add a trick for HOW to read it aloud on Friday — for today, just hear it.)',
        '<em>Read it twice if you want.</em>'
      ],
      cta: 'Read it' },

    { id: 'bag-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Pitch', tag: 'Pitch · 09 of 10',
      title: 'Write the whole pitch on paper',
      body: [
        'Now write all 5 sentences on a piece of paper. Take your time. Neat. The act of writing it down with your hand cements it in your brain in a way typing never does.',
        'When it\'s on paper, you\'ve got a pitch deck for one game — your game. That\'s a real piece of work.'
      ],
      cta: 'Done — on paper' },

    { id: 'bag-10', kind: 'topic', type: 'bag', minutes: 4, title: 'Pitch it to Mom or Dad' },

    // ===== FRAME 2: Show Mom or Dad (free-form display + photo) =====
    { id: 'showoff-tue', kind: 'topic', type: 'showdad', title: 'Show Mom or Dad what you learned', minutes: 6 },

    // ===== FRAME 3: Report card =====
    { id: 'report-tue', kind: 'drill', type: 'report-card', title: 'Tuesday — report card', minutes: 2 }
  ]
};
