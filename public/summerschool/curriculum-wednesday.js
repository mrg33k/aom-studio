/* Summer School — WEDNESDAY curriculum (built 2026-05-28)
 *
 * Week-level frame: one named trick per day, four subjects per day, ~12 modules each.
 * Wednesday's trick = CHUNKING (spelling + reading hard words).
 *
 * Morning four subjects:
 *   1. Reading      — Chunking trick + Moziah Bridges / Mo's Bows passage
 *   2. Math         — Percent Change (Lesson 3, formula + trick)
 *   3. Roblox Dev   — Day 2: Opening Studio, the 4 panels, first Lua variable
 *   4. BAG          — Day 3: Level Design (what does Level 1 actually look like?)
 *
 * Afternoon three subjects:
 *   5. MPC ONE      — Day 2: Step Sequencer (enter beats visually, make the 4-bar)
 *   6. Photography  — Day 1: Rule of Thirds, leading lines, grid on the Lumix G9
 *   7. Drawing      — Day 2: Warm-up shapes + first real drawing from observation
 *
 * Videos — all researched and verified before writing:
 *   Math:        PSS9G_sMPH8   — "Percentage change word problems" (Khan Academy, 2023)
 *   Roblox Dev:  9MUgLaF22Yo  — "Roblox Studio Basics – Scripting Tutorial #1" (2024)
 *   MPC ONE:     uuNyLLg-cXs  — "Getting Started with MPC One | Using the Step Sequencer"
 *                                (Akai Professional, official)
 *   Photography: 21cxZa0laOA  — "Unit: Photography for Kids | Lesson 1: Rule of Thirds"
 *
 * Pedagogy: one named trick today (Chunking). It comes back every time Ethan reads
 * a long word he doesn't recognise. The pieces stack across the week.
 *
 * Total blocks: 84 subject blocks + 3 frame = 87. Budget ≈ 4h 30min.
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.wednesday = {
  weekOf: '2026-06-09',
  day: 'wednesday',
  theme: 'CHUNKING',
  themeDesc: 'One trick today — Chunking. Big words are small words in a trenchcoat.',

  welcomeContent: {
    dayLabel: 'Day 3',
    showParentNote: false,
    bullets: [
      "<strong>The Chunking trick</strong> — break big words into pieces: prefix + root + suffix. Once you know the chunks, you can read and spell ANY word.",
      "The story of <strong>Moziah Bridges</strong> — a 9-year-old from Memphis who made bow ties because he was bored with the ones in stores. He ended up with an NBA deal.",
      "Today's math: <strong>Percent Change</strong> — the formula for how much something grew or shrank. One trick to remember which number goes on the bottom.",
      "<strong>Roblox Studio, Day 2</strong> — you're opening the actual tool. Four panels to know. Your first line of Lua code.",
      "<strong>Build-A-Game Day 3</strong> — Level Design. What does Level 1 of your game actually look like? Three zones, sketched on paper.",
      "Plus: Step Sequencer on the MPC, Rule of Thirds in photography, and drawing from observation."
    ],
    howItWorks: "One trick today (Chunking). It works on every subject — reading, spelling, Lua code names, camera settings. The chunks are everywhere once you see them."
  },

  /* ===== Kid-founder anchor passage ===== */
  passage: {
    title: 'Moziah Bridges was 9 when he started Mo\'s Bows',
    hero: 'He wanted a cool bow tie, couldn\'t find one, and built a $600K business with his grandmother\'s fabric scraps.',
    paragraphs: [
      "In the summer of 2011, a 9-year-old kid named Moziah Bridges walked into every store in Memphis, Tennessee looking for a cool bow tie. What he found was the same boring selection everywhere — stiff fabrics, dull colors, patterns that hadn't changed since 1987. So he decided to make his own.",
      "Moziah had zero sewing experience. But his grandmother Martice had decades of it, and a garage full of fabric scraps she'd saved over the years. She taught him the basics: how to cut, how to pin, how to run a straight stitch on the machine. Within a few months, Moziah was making bow ties that looked nothing like the ones in the stores — bright colors, wild patterns, ties that actually had personality.",
      "He started selling them to neighbors for $5. Then to strangers at local markets for $10. Then he built a website — Misbowties.com — and orders started coming in from across the country. By age 10, Mo's Bows had its own Etsy shop and had been featured in magazines. He was pulling thousands of dollars out of a folding table in his grandmother's garage.",
      "When Moziah was 11, his mom submitted an application to Shark Tank — ABC's show where entrepreneurs pitch to billionaire investors. He got on. He walked out in front of five investors, asked for $50,000 for 20% of his company, and gave the pitch of his life. Daymond John — the founder of FUBU and one of the savviest fashion minds alive — told him he was too talented to give away 20%. Instead of investing, John offered to mentor Moziah for free. No money taken. Just the knowledge of one of the best business minds in fashion.",
      "By the time Moziah was 16, Mo's Bows had done over $600,000 in sales. He had a licensing deal with the NBA to put team logos on his ties. His bow ties were sold in Cole Haan and Neiman Marcus. Not bad for a kid who just wanted a bow tie that didn't look boring. When people ask him about success, his answer is always the same: start by solving your own problem. The best businesses don't begin with market research. They begin with frustration."
    ],
    questions: [
      {
        q: "Why did Moziah start making bow ties?",
        choices: ["He wanted to compete with a rival", "He couldn't find cool ones in stores", "His grandmother told him to start a business"],
        right: 1
      },
      {
        q: "Who taught Moziah to sew?",
        choices: ["A teacher at school", "A YouTube tutorial", "His grandmother Martice"],
        right: 2
      },
      {
        q: "On Shark Tank, what did Daymond John offer instead of money?",
        choices: ["A job at FUBU", "Free mentorship and his knowledge", "A deal to put Mo's Bows in his stores"],
        right: 1
      },
      {
        q: "What's the main point the passage is making?",
        choices: [
          "You need wealthy investors to build a business",
          "The best businesses start by solving your own problem",
          "Sewing is the most valuable skill you can learn"
        ],
        right: 1
      }
    ],
    srComprehension: [
      { q: "How old was Moziah when he started Mo's Bows?", choices: ["7", "9", "11"], right: 1 },
      { q: "How much had Mo's Bows made in sales by the time he was 16?", choices: ["$60,000", "$600,000+", "$6 million"], right: 1 },
      { q: "What major sports org did he get a licensing deal with?", choices: ["NFL", "MLB", "NBA"], right: 2 }
    ]
  },

  /* ===== Math: Percent Change ===== */
  mathLesson: {
    number: 3,
    domain: 'Rates and Percentages',
    title: 'Percent Change',
    goal: 'Find how much something grew or shrank as a percentage of the ORIGINAL value.',
    // Verified 2026-05-28: Khan Academy "Percentage change word problems" (2023).
    // The concept cards before this video set up the formula so the video
    // locks it in through real applied examples.
    videoId: 'PSS9G_sMPH8',
    summary: [
      "PERCENT CHANGE tells you how much something grew or shrank — as a percent of the original. It answers: 'bigger or smaller, and by how much relative to where it started?'",
      "The formula: % change = (new value − old value) ÷ old value × 100. If the answer is positive, it INCREASED. If it's negative, it DECREASED.",
      "Here's the TRICK: the bottom is ALWAYS the old number. People get this backwards all the time. New on top, old on the bottom. Always. Example: price went from $40 to $50. % change = (50 − 40) ÷ 40 × 100 = 10 ÷ 40 × 100 = 25%. The price increased by 25%.",
      "Works the other way too: price went from $50 to $40. % change = (40 − 50) ÷ 50 × 100 = −10 ÷ 50 × 100 = −20%. The price DECREASED by 20%. Notice: same two numbers, different original. That's why the trick matters — which was the original?"
    ],
    questions: [
      { q: 'In the percent change formula, what always goes on the BOTTOM?', a: ['The new value', 'The difference', 'The old (original) value'], right: 2 },
      { q: 'A game had 400 players. Now it has 500. What\'s the % change?', a: ['10%', '25%', '20%'], right: 1 },
      { q: 'Headphones dropped from $80 to $60. What\'s the percent decrease?', a: ['25%', '20%', '33%'], right: 0 }
    ],
    practice: [
      { p: 'A Robux package went from 400 to 320. What\'s the percent decrease?', a: 20, unit: '%' },
      { p: 'A store had 150 customers Monday. Tuesday it had 180. Percent increase?', a: 20, unit: '%' },
      { p: 'Score went from 70 to 91. Percent increase?', a: 30, unit: '%' },
      { p: 'Game daily players: 2,000 → 2,500. Percent increase?', a: 25, unit: '%' },
      { p: 'A shirt costs $36, was $45. Percent decrease?', a: 20, unit: '%' }
    ]
  },

  /* ===== Today's one named trick: Chunking (spelling) ===== */
  tricks: {
    reading: {
      name: 'The Chunking trick',
      subject: 'reading',
      hatedBecause: 'Long words feel impossible. You see a wall of letters and your brain freezes.',
      trick: 'Big words are just small words (or word-parts) stuck together. Break any long word into CHUNKS: prefix + root + suffix. Once you see the chunks, you can read it — and spell it. "Un-believe-able" = un (not) + believe (a word you know) + able (can be done). "Impossible" = im (not) + possible. "Disconnected" = dis (not) + connect + ed. Once you know 8 common prefixes and 8 common suffixes, you can decode hundreds of new words on sight.',
      demoText: 'Try it: "entrepreneur." Looks scary. But chunk it: entre + preneur. Or try the French root: entre (between/among) + prendre (to take). An entrepreneur is someone who takes initiative. Once you know the chunk, the word is yours forever.',
      tryPrompt: 'Look at this word: "unbelievable." What are the three chunks?',
      tryAnswerHint: 'un- (not) + believe (the root word) + -able (can be done). Put it together: "not something that can be believed." Makes total sense.',
      showoffPrompt: 'Find the hardest word in today\'s Mo\'s Bows passage and chunk it out loud.',
    }
  },

  /* ===== Handwriting page ===== */
  handwriting: {
    title: 'Write the Chunking trick on paper',
    intro: 'Grab a pen and paper. Write out the Chunking rule + 3 example words broken into chunks. Take your time — neat lines.',
    lines: [
      'The CHUNKING trick: big words = prefix + root + suffix.',
      'un + believe + able = unbelievable (not something you can believe)',
      'im + possible = impossible (not possible)',
      'dis + connect + ed = disconnected (not connected, in the past)'
    ],
    why: 'Writing the pattern by hand with examples cements it. Next time you hit a monster word, your hand will already know what to do.',
    showoffPrompt: 'Take a photo of your paper. Upload it below.',
  },

  /* ===== Roblox Dev micro-lesson ===== */
  robloxLesson: {
    title: 'Opening Roblox Studio for the first time',
    paragraphs: [
      'If Roblox is the game, Roblox Studio is the toolbox. It\'s a free app — separate from the game — where you build everything: terrain, objects, scripts, lighting, physics. Every game on Roblox was made here.',
      'When you open Studio you\'ll see four key panels. The WORKSPACE is your 3D world — the stage where your game lives. The EXPLORER shows a list of every object in your world (parts, scripts, lights, sounds). PROPERTIES shows you the details of whatever you\'ve selected (color, size, material, position). And OUTPUT is where the code talks back — print messages, warnings, errors all appear here.',
      'The most basic thing in Roblox Studio is a PART — a 3D box. Everything in every Roblox game is made of parts, combined and shaped. You can change a part\'s color, size, shape (cube, sphere, wedge), material, and position. Stacked and arranged parts become buildings, terrain, obstacles, anything.',
      'Scripts are where the game gets smart. A script is a file full of Lua code that runs when the game plays. Lua is the language Roblox uses — it\'s simple enough to learn in a summer and powerful enough to build anything on the platform. Your first line of Lua is always: print("Hello, Roblox!"). Run it — the Output panel writes back. That\'s your code talking to the machine for the first time.'
    ],
    questions: [
      { q: 'What panel shows you a list of every object in your scene?', a: ['Output', 'Explorer', 'Properties'], right: 1 },
      { q: 'What\'s the most basic building block in Roblox Studio?', a: ['A Script', 'A Part', 'A Light'], right: 1 },
      { q: 'What panel would you check to see if your code has an error?', a: ['Explorer', 'Workspace', 'Output'], right: 2 }
    ],
    aiSeed: 'Heads up: Roblox now has an AI assistant inside Studio called Roblox Assistant. You can describe what you want ("make a leaderboard that tracks coins") and it will generate Lua code for you to use. It\'s not perfect — you still need to understand what the code does. But knowing how to prompt it well is already a superpower in 2024.'
  },

  /* ===== Build-A-Game Day 3 beat ===== */
  bagBeat: {
    day: 'wed',
    key: 'level-design',
    title: 'Day 3: Design Level 1',
    intro: 'You\'ve named your game (Day 1) and pitched it (Day 2). Today you design Level 1 — the first actual playable space.',
    whatIsLevel: 'A level is the container where the action happens. Level 1 has one job above all others: teach the player how to play WITHOUT saying "here are the instructions."',
    template: [
      { label: 'Tutorial Zone', hint: 'The first section. SAFE — no way to fail. The player tries the basic mechanic for the first time. No pressure, no enemies, no time limit. Just learn the move.' },
      { label: 'Challenge Zone', hint: 'The middle section. First real obstacle. Something that can go wrong. Forces the player to use what they just learned. Hard enough to feel like a test, easy enough to beat on the second try.' },
      { label: 'Reward Zone', hint: 'The end of the level. Something satisfying — a door opens, coins explode, the character celebrates. Payoff that makes the player want to go straight to Level 2.' }
    ],
    why: 'Every well-designed first level in history uses this structure: learn it safe, test it, reward it. Mario 1-1. Minecraft day one. The Doors tutorial area. Doom E1M1. Same shape every time.',
    help: 'Draw the three zones on paper. Label them. Write ONE sentence describing what happens in each zone for YOUR game specifically.'
  },

  /* ===== Typing target ===== */
  typingTarget: "She couldn't find it in stores, so she made it herself. That's how the best businesses start.",

  /* ===== Word tiles vocab pool ===== */
  tileVocab: [
    { word: 'fabric',        clue: 'Cloth or material used to make clothes' },
    { word: 'mentor',        clue: 'Someone experienced who teaches and guides you' },
    { word: 'investor',      clue: 'A person who gives money to a business hoping to get more back' },
    { word: 'entrepreneur',  clue: 'Someone who starts their own business' },
    { word: 'determination', clue: 'Refusing to quit, no matter what' },
    { word: 'personality',   clue: 'The mix of qualities that makes someone unique' },
    { word: 'impossible',    clue: 'Not able to be done (chunk it: im + possible)' },
    { word: 'competition',   clue: 'When two or more people try to win the same thing' },
    { word: 'application',   clue: 'A formal request — like applying to be on a TV show' },
    { word: 'unbelievable',  clue: 'So surprising it\'s hard to believe (chunk: un + believe + able)' },
    { word: 'permission',    clue: 'Being allowed to do something' },
    { word: 'frustration',   clue: 'The feeling when something keeps not working (chunk: frustrate + ion)' }
  ],

  /* ============================================================
   * WEDNESDAY BLOCK PLAN
   * 84 subject blocks + 3 frame = 87 total
   * Budget ≈ 4h 30min
   * ============================================================ */

  blocks: [

    // ===== FRAME 1: Welcome =====
    { id: 'welcome-wed', kind: 'drill', type: 'welcome', title: 'Welcome to Wednesday', minutes: 2 },

    // ============================================================
    // READING — 12 modules (Chunking trick + Mo's Bows)
    // ============================================================

    { id: 'r-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 01 of 12',
      title: 'The Chunking trick',
      body: [
        'Today\'s trick is called <strong>Chunking</strong>. Use it every time you see a big word you don\'t recognise.',
        'Here it is: break the word into parts — <strong>prefix + root + suffix</strong>. Each part carries meaning. Once you see the parts, the whole word opens up.',
        '<strong>Prefix</strong> = the front chunk that changes the meaning. <strong>Root</strong> = the main word. <strong>Suffix</strong> = the end chunk that changes how it\'s used.',
        'Example: <strong>un-believe-able</strong>. Prefix "un" means NOT. Root "believe" is a word you already know. Suffix "-able" means "can be done." Put them together: not something that can be believed. That\'s what "unbelievable" means — and now you\'ll never misspell it.'
      ],
      check: {
        q: 'What\'s the first move with the Chunking trick?',
        choices: [
          'Sound it out letter by letter',
          'Break the word into prefix + root + suffix',
          'Look it up in a dictionary'
        ],
        right: 1
      },
      cta: 'Got it' },

    { id: 'r-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 02 of 12',
      title: '8 prefixes that unlock hundreds of words',
      body: [
        'Learn these 8 prefixes and you can decode hundreds of words you\'ve never seen:',
        '<strong>un-</strong> = not (unhappy, unknown) &nbsp;&nbsp; <strong>re-</strong> = again (rebuild, rewrite)',
        '<strong>dis-</strong> = not (disconnect, disagree) &nbsp;&nbsp; <strong>im-/in-</strong> = not (impossible, invisible)',
        '<strong>pre-</strong> = before (preview, preorder) &nbsp;&nbsp; <strong>mis-</strong> = wrong (misspell, misread)',
        '<strong>over-</strong> = too much (overflow, overpower) &nbsp;&nbsp; <strong>sub-</strong> = under/below (submarine, subzero)',
        'These 8 prefixes appear in THOUSANDS of English words. You already know them — now you can name them.'
      ],
      check: {
        q: '"Impossible" starts with "im-" which means:',
        choices: [
          'Before',
          'Again',
          'Not'
        ],
        right: 2
      },
      cta: 'Prefixes locked' },

    { id: 'r-03', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 03 of 12',
      title: '8 suffixes that finish the picture',
      body: [
        'Now the back chunk. These 8 suffixes appear everywhere:',
        '<strong>-able / -ible</strong> = can be done (readable, visible)',
        '<strong>-tion / -sion</strong> = the act of (creation, decision)',
        '<strong>-ing</strong> = doing it right now (reading, running)',
        '<strong>-ly</strong> = how it\'s done (quickly, slowly)',
        '<strong>-ness</strong> = state of being (happiness, darkness)',
        '<strong>-ful</strong> = full of (powerful, grateful)',
        '<strong>-less</strong> = without (powerless, careless)',
        '<strong>-ed</strong> = in the past (connected, finished)',
        'Now you have 16 chunks — 8 prefixes + 8 suffixes. Most long English words are made of these attached to a root.'
      ],
      check: {
        q: '"Determination" ends in "-tion" which means:',
        choices: [
          'The act of',
          'Without',
          'Full of'
        ],
        right: 0
      },
      cta: 'Suffixes locked' },

    { id: 'r-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 04 of 12',
      title: 'Try it on the vocab words',
      body: [
        'Let\'s chunk three words from today\'s vocab:',
        '<strong>unbelievable</strong> = un (not) + believe (root) + able (can be done) → not believable ✓',
        '<strong>disconnected</strong> = dis (not) + connect (root) + ed (past tense) → was not connected ✓',
        '<strong>determination</strong> = de + termine (root: to set limits) + ation (act of) → the act of setting your own limits / committing ✓',
        'Notice: you didn\'t need a dictionary for any of those. The chunks told you.'
      ],
      check: {
        q: 'Chunk this word: "misunderstood." The prefix "mis-" means:',
        choices: [
          'More than',
          'Wrong',
          'Before'
        ],
        right: 1
      },
      cta: 'I see how it works' },

    { id: 'r-05', kind: 'topic', type: 'reading', minutes: 5, slice: [0, 1], title: 'Mo\'s Bows — paragraph 1' },
    { id: 'r-06', kind: 'topic', type: 'reading', minutes: 5, slice: [1, 2], title: 'Mo\'s Bows — paragraph 2 (the grandmother)' },
    { id: 'r-07', kind: 'topic', type: 'reading', minutes: 5, slice: [2, 3], title: 'Mo\'s Bows — paragraph 3 (the business grows)' },
    { id: 'r-08', kind: 'topic', type: 'reading', minutes: 6, slice: [3, 4], title: 'Mo\'s Bows — paragraph 4 (Shark Tank)' },
    { id: 'r-09', kind: 'topic', type: 'reading', minutes: 5, slice: [4, 5], title: 'Mo\'s Bows — paragraph 5 (the lesson)' },

    { id: 'r-10', kind: 'topic', type: 'concept', minutes: 5, subject: 'Reading', tag: 'Reading · 10 of 12',
      title: 'Chunk drill — harder words from the passage',
      body: [
        'Three words from the Mo\'s Bows passage. Chunk each one:',
        '<strong>entrepreneur</strong> — try: entre (among/between) + preneur (taker/one who takes initiative). A person who takes initiative and starts something.',
        '<strong>personality</strong> — try: person (root) + al (relating to) + ity (state of). The state of what relates to who you are.',
        '<strong>application</strong> — try: applic (apply) + ation (act of). The act of applying — like applying to Shark Tank.'
      ],
      check: {
        q: '"Application" contains "-ation" which means:',
        choices: [
          'Without',
          'The act of',
          'Before'
        ],
        right: 1
      },
      cta: 'Got the chunks' },

    { id: 'r-11', kind: 'topic', type: 'speedread', minutes: 5, title: 'Speed-Read drill — the whole story' },

    { id: 'r-12', kind: 'topic', type: 'handwriting', minutes: 6, title: 'Write the Chunking trick on paper' },

    // ============================================================
    // MATH — 12 modules (Percent Change)
    // ============================================================

    { id: 'm-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 01 of 12',
      title: 'What percent change actually measures',
      body: [
        '<strong>Percent change</strong> answers: "how much did something grow or shrink — compared to where it STARTED?"',
        'Price went from $40 to $50. It grew by $10. But is $10 a big deal? Depends — $10 on a $40 item is a 25% jump. $10 on a $4,000 TV is basically nothing.',
        'That\'s why percent change matters: it tells you how significant a change is <em>relative to the original</em>. Not just how big the number is.'
      ],
      check: {
        q: 'Why is percent change more useful than just saying "it went up $10"?',
        choices: [
          '$10 is always exactly 10%',
          'It tells you how significant the change is relative to where you started',
          'It doesn\'t matter — both say the same thing'
        ],
        right: 1
      },
      cta: 'Makes sense' },

    { id: 'm-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 02 of 12',
      title: 'The formula',
      body: [
        'Here\'s the formula: <strong>% change = (new − old) ÷ old × 100</strong>',
        'Three steps: <strong>1.</strong> Subtract old from new to get the change. <strong>2.</strong> Divide by old. <strong>3.</strong> Multiply by 100 to get a percent.',
        'Positive answer = INCREASE. Negative answer = DECREASE.',
        'Example: price went from $40 to $50. % change = (50 − 40) ÷ 40 × 100 = 10 ÷ 40 × 100 = <strong>25%</strong>. Increased by 25%.'
      ],
      check: {
        q: 'Price goes from $40 to $50. What\'s step 1 of the formula?',
        choices: [
          '50 ÷ 40',
          '50 − 40 = 10 (the change)',
          '40 − 50 = −10'
        ],
        right: 1
      },
      cta: 'Got the formula' },

    { id: 'm-03', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 03 of 12',
      title: 'The trick: old goes on the bottom. Always.',
      body: [
        'The most common mistake: putting the wrong number on the bottom.',
        'Here\'s the trick: <strong>the bottom is ALWAYS the OLD number.</strong> New on top, old on the bottom. No exceptions.',
        'Why? Because percent change is asking: "how big is this change compared to WHERE WE STARTED?" Where we started = old. So old is always the reference point — always the bottom.',
        'Price: $40 → $50. Old = 40. New = 50. Formula: (50 − 40) ÷ <strong>40</strong> × 100 = 25%.',
        'Reverse: $50 → $40. Old = 50. New = 40. Formula: (40 − 50) ÷ <strong>50</strong> × 100 = −20%. DIFFERENT answer. Different original = different percent.'
      ],
      check: {
        q: 'In the percent change formula, the OLD number goes:',
        choices: [
          'On top',
          'Doesn\'t matter',
          'On the bottom — always'
        ],
        right: 2
      },
      cta: 'Old goes on the bottom' },

    { id: 'm-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 04 of 12',
      title: 'Increase vs decrease — reading the sign',
      body: [
        'After you run the formula, the sign tells you what happened:',
        '<strong>Positive answer</strong> = INCREASE (the new is bigger than the old).',
        '<strong>Negative answer</strong> = DECREASE (the new is smaller than the old).',
        'Example: headphones dropped from $80 to $60. % change = (60 − 80) ÷ 80 × 100 = −20 ÷ 80 × 100 = <strong>−25%</strong>. The − sign tells you it decreased. It decreased by 25%.',
        'Easy check: if new > old, answer will be positive. If new < old, answer will be negative. Check your sign before you write your answer.'
      ],
      check: {
        q: 'Your follower count dropped from 500 to 400. The percent change will be:',
        choices: [
          'Positive — it increased',
          'Negative — it decreased',
          'Zero — no change'
        ],
        right: 1
      },
      cta: 'Got the sign rule' },

    { id: 'm-05', kind: 'topic', type: 'mathlesson', step: 'video', minutes: 6,
      title: 'Watch the Khan Academy lesson' },

    { id: 'm-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 06 of 12',
      title: 'Apply it — Robux price change',
      body: [
        '<strong>Roblox economics.</strong> A Robux package went from 400 Robux for $4.99 to 320 Robux for the same price. So you\'re getting fewer Robux.',
        'Treat the number of Robux as the value. Old = 400, New = 320.',
        '% change = (320 − 400) ÷ 400 × 100 = −80 ÷ 400 × 100 = <strong>−20%</strong>.',
        'The package lost 20% of its value. Roblox quietly gave you 20% less for the same money.'
      ],
      check: {
        q: 'A different package went from 800 Robux to 1,000. Percent change?',
        choices: [
          '20%',
          '25%',
          '15%'
        ],
        right: 1
      },
      cta: 'Got it' },

    { id: 'm-07', kind: 'topic', type: 'mathlesson', step: 'q-1', minutes: 3, title: 'Math check — the formula' },
    { id: 'm-08', kind: 'topic', type: 'mathlesson', step: 'q-23', minutes: 4, title: 'Math check — percent increase and decrease' },

    { id: 'm-09', kind: 'topic', type: 'mathlesson', step: 'practice-1', minutes: 5, title: 'Practice — problems 1 + 2' },
    { id: 'm-10', kind: 'topic', type: 'mathlesson', step: 'practice-2', minutes: 5, title: 'Practice — problems 3 + 4' },
    { id: 'm-11', kind: 'topic', type: 'mathlesson', step: 'practice-3', minutes: 4, title: 'Practice — problem 5' },

    { id: 'm-12', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 12 of 12',
      title: 'Apply the trick — your game\'s player growth',
      body: [
        '<strong>Your game launches.</strong> Day 1: 200 players. Day 7: 350 players.',
        'How much did your player base grow, in percent? % change = (350 − 200) ÷ 200 × 100 = 150 ÷ 200 × 100 = <strong>75%</strong>. Nice week.',
        'Now week 2: players dropped from 350 to 280. % change = (280 − 350) ÷ 350 × 100 = −70 ÷ 350 × 100 = <strong>−20%</strong>. The game lost 20% of players.',
        'That\'s the kind of number Roblox devs watch every week. Now you know how to calculate it.'
      ],
      check: {
        q: 'Players went from 1,000 to 750. Percent decrease?',
        choices: [
          '25%',
          '30%',
          '20%'
        ],
        right: 0
      },
      cta: 'Math done for today' },

    // ============================================================
    // ROBLOX DEV — 12 modules (Studio intro + first Lua)
    // ============================================================

    { id: 'rb-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 01 of 12',
      title: 'Roblox Studio — the toolbox behind every game',
      body: [
        'Roblox Studio is free. Any Roblox player can download it. Every game on Roblox — from Adopt Me (4 billion plays) to Doors (1 billion plays) — was built entirely inside this tool.',
        'Yesterday we talked about why leaderboards exist. Today we go inside the machine and start building.',
        'First step: just learn the four panels.'
      ],
      check: {
        q: 'Where do you find Roblox Studio?',
        choices: [
          'Inside the Roblox game itself',
          'A free download, separate from the game',
          'You have to pay for it'
        ],
        right: 1
      },
      cta: 'Let\'s go' },

    { id: 'rb-02', kind: 'topic', type: 'video', minutes: 10, subject: 'Roblox Dev', tag: 'Roblox · 02 of 12',
      title: 'Watch: Roblox Studio Basics',
      video: {
        title: 'Roblox Studio Basics — Scripting Tutorial #1 (2024)',
        ytId: '9MUgLaF22Yo',
        summary: [
          'Roblox Studio has four main panels you\'ll use constantly: Workspace (the 3D scene), Explorer (list of all objects), Properties (the details of a selected object), and Output (where code errors and print messages appear).',
          'The most basic object in Studio is a PART — a 3D shape. You can change its size, color, material, and shape. All Roblox games are made of parts.',
          'Scripts are files of Lua code attached to objects. When the game runs, the script runs. Your first line: print("Hello, Roblox!") — outputs a message in the Output panel to confirm the script is running.',
          'A variable stores information under a name. local speed = 50 creates a variable called "speed" that holds the number 50. Now you can write speed anywhere in your script instead of typing 50 over and over.'
        ],
        questions: [
          { q: 'Which panel shows you a list of every object in the scene?', a: ['Output', 'Properties', 'Explorer'], right: 2 },
          { q: 'What is the most basic building block in Roblox Studio?', a: ['A Script', 'A Part', 'A Model'], right: 1 },
          { q: 'What does print("Hello") do?', a: ['Deletes a part', 'Shows "Hello" in the Output panel', 'Names the game Hello'], right: 1 },
          { q: 'What is a variable?', a: ['A type of part', 'A panel in Studio', 'A name that stores a value'], right: 2 },
          { q: 'Where do you check if your script has an error?', a: ['Explorer', 'Output', 'Workspace'], right: 1 }
        ]
      }
    },

    { id: 'rb-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 03 of 12',
      title: 'The four panels, one more time',
      body: [
        '<strong>Workspace</strong> — your 3D world. Drag parts into it, position them, build your map.',
        '<strong>Explorer</strong> — a list of every object in the world. Like a file browser but for game objects.',
        '<strong>Properties</strong> — select any part and Properties shows you its color, size, position, material. Change anything here.',
        '<strong>Output</strong> — your codebase talking to you. print() messages appear here. So do errors. Always have this open.'
      ],
      check: {
        q: 'You want to change a part\'s color. Which panel do you use?',
        choices: [
          'Output',
          'Explorer',
          'Properties'
        ],
        right: 2
      },
      cta: 'Four panels, locked in' },

    { id: 'rb-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 04 of 12',
      title: 'Parts — the building block of everything',
      body: [
        'A PART is a 3D shape. Default is a box, but you can change it to a sphere, cylinder, or wedge.',
        'Every building, obstacle, floor, wall, and platform in every Roblox game is a part (or a collection of parts grouped together). Want a house? Stack parts. Want a ramp? Use a wedge part and angle it.',
        'Think of it like LEGO — the pieces are simple, but what you make from them is only limited by your patience and imagination.'
      ],
      check: {
        q: 'You want to build a ramp in Roblox Studio. Which part shape would you use?',
        choices: [
          'Sphere',
          'Wedge',
          'Cylinder'
        ],
        right: 1
      },
      cta: 'Parts — got it' },

    { id: 'rb-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 05 of 12',
      title: 'Your first line of Lua',
      body: [
        'Lua is the programming language Roblox uses. Every script in every Roblox game is Lua. It\'s lightweight, easy to learn, and powerful enough to run Adopt Me (4 billion plays) at scale.',
        'Your very first line — the one every programmer writes first:',
        '<code>print("Hello, Roblox!")</code>',
        'Run it. Look at the Output panel. It says: Hello, Roblox! That\'s your code talking back to you. That\'s the machine doing exactly what you told it. That feeling is the thing.'
      ],
      check: {
        q: 'After you run print("Hello, Roblox!"), where does the message appear?',
        choices: [
          'On the player\'s screen in-game',
          'In the Output panel',
          'In the Explorer panel'
        ],
        right: 1
      },
      cta: 'First line written' },

    { id: 'rb-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 06 of 12',
      title: 'Variables — boxes that hold information',
      body: [
        'A variable is a box with a name. You put information in the box. You use the name to get it back.',
        '<code>local playerName = "Ethan"</code>',
        'This creates a box called <strong>playerName</strong> that holds the text "Ethan". Now anywhere in your script, you can write <strong>playerName</strong> and Lua gives you "Ethan".',
        '<code>local speed = 16</code>',
        'Now speed = 16. If you want to change how fast your character runs, you change the number in ONE place — not everywhere in the script. That\'s why variables are powerful.'
      ],
      check: {
        q: 'What does "local speed = 16" create?',
        choices: [
          'A part named speed',
          'A variable called speed that holds the number 16',
          'A print statement'
        ],
        right: 1
      },
      cta: 'Variables make sense' },

    { id: 'rb-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 07 of 12',
      title: 'Three types of values',
      body: [
        'Variables can hold three basic types of values:',
        '<strong>Numbers</strong> — local coins = 100 (math works on these: +, -, ×, ÷)',
        '<strong>Strings</strong> — local message = "You found the key!" (text, always in quotes)',
        '<strong>Booleans</strong> — local isDead = false (only two values: true or false. Perfect for yes/no state)',
        'Most game logic uses all three. Coins are numbers. Dialogue is strings. "Is the door open?" is a boolean.'
      ],
      check: {
        q: 'local isDead = false — what TYPE of value is false?',
        choices: [
          'Number',
          'String',
          'Boolean'
        ],
        right: 2
      },
      cta: 'Three types, got it' },

    { id: 'rb-08', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 08 of 12',
      title: 'Quick check — three things that go wrong',
      body: [
        'Three rookie Lua mistakes to avoid:',
        '<strong>1.</strong> Forgetting the quotes around strings: <code>local name = Ethan</code> ← Lua throws an error. Use <code>"Ethan"</code>.',
        '<strong>2.</strong> Typos in variable names: <code>local speeed = 16</code> then using <code>speed</code> ← Lua can\'t find it. Names must match exactly.',
        '<strong>3.</strong> Capital letters: Lua is case-sensitive. <code>local Speed = 16</code> and <code>speed</code> are two different variables.'
      ],
      check: {
        q: 'Which of these will cause a Lua error?',
        choices: [
          'local name = "Ethan"',
          'local name = Ethan',
          'local name = true'
        ],
        right: 1
      },
      cta: 'Noted' },

    { id: 'rb-09', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Dev', tag: 'Roblox · 09 of 12',
      title: 'What these variables would look like in your game',
      body: [
        'Think about the game you named and pitched. What variables would you need?',
        'If your game tracks coins: <code>local coins = 0</code>',
        'If your game has a player name displayed: <code>local playerName = "Player"</code>',
        'If your game tracks whether the boss is alive: <code>local bossAlive = true</code>',
        'Every mechanic in every game is powered by variables changing values. That\'s what scripts do.'
      ],
      check: {
        q: 'In your game, you want to track if a door is locked. Which type would you use?',
        choices: [
          'Number — local locked = 1',
          'Boolean — local isLocked = true',
          'String — local locked = "yes"'
        ],
        right: 1
      },
      cta: 'I can see it in my game' },

    { id: 'rb-10', kind: 'topic', type: 'typing', minutes: 4, subject: 'Roblox Dev', tag: 'Roblox · 10 of 12',
      title: 'Type it fast',
      typingTarget: 'local coins = 0  local playerName = "Ethan"  print("Hello, Roblox!")' },

    { id: 'rb-11', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Dev', tag: 'Roblox · 11 of 12',
      title: 'Chunking applied to Lua',
      body: [
        'The Chunking trick works on code too.',
        'Look at this line: <code>local maxSpeed = 50</code>',
        'Chunk it: <strong>local</strong> (keyword: this variable lives in this script only) + <strong>maxSpeed</strong> (name: readable, describes what it is) + <strong>= 50</strong> (value: 50)',
        'Every line of code has structure. Once you can chunk code into pieces, you can read any script — even ones you didn\'t write.'
      ],
      check: {
        q: 'In "local maxSpeed = 50", what does "local" tell Lua?',
        choices: [
          'The variable can only be a number',
          'This variable lives in this script only — don\'t share it',
          'The name must have capital letters'
        ],
        right: 1
      },
      cta: 'Chunking code — love it' },

    { id: 'rb-12', kind: 'topic', type: 'writing-mini', minutes: 5, subject: 'Roblox Dev', tag: 'Roblox · 12 of 12',
      title: 'Write 3 variables for your game',
      eyebrow: 'Apply it · Roblox Dev',
      label: 'Write 3 variables for your game',
      prompt: 'Think about the game you named and pitched. Write 3 variables your game would need. Write each one as a real Lua line (local name = value). Say in one sentence why each variable matters for your game.',
      minSentences: 3 },

    // ============================================================
    // BUILD-A-GAME — 12 modules (Day 3: Level Design)
    // ============================================================

    { id: 'bag-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Level Design', tag: 'Level Design · 01 of 12',
      title: 'Day 3: Design Level 1',
      body: [
        'You named the game (Day 1) and pitched it (Day 2). Today you design Level 1.',
        'A level is the container where the action happens — the map, the space, the world the player moves through.',
        'Level 1\'s ONE job: <strong>teach the player how to play without saying "here are the instructions."</strong> The best games never have a tutorial screen. The level IS the tutorial.'
      ],
      check: {
        q: 'What\'s Level 1\'s one job?',
        choices: [
          'Be the hardest challenge in the game',
          'Teach the player how to play — without a instructions screen',
          'Show off the best graphics'
        ],
        right: 1
      },
      cta: 'I see the job' },

    { id: 'bag-02', kind: 'topic', type: 'concept', minutes: 3, subject: 'Level Design', tag: 'Level Design · 02 of 12',
      title: 'The 3-zone rule',
      body: [
        'Every well-designed Level 1 in history uses the same structure. Three zones:',
        '<strong>Zone 1 — Tutorial Zone:</strong> Safe. No way to fail. The player tries the core mechanic for the first time. No enemies. No timer. Just learn the move.',
        '<strong>Zone 2 — Challenge Zone:</strong> First real obstacle. Something that can go wrong. The player has to use what they just learned. Hard enough to feel like a test, easy enough to beat on the second try.',
        '<strong>Zone 3 — Reward Zone:</strong> The payoff. A door opens. Coins explode. The character does a little celebration. Something satisfying that makes the player want to go to Level 2 immediately.'
      ],
      check: {
        q: 'What happens in Zone 1 (Tutorial Zone)?',
        choices: [
          'The hardest enemies appear',
          'Safe — player tries the core mechanic with no way to fail',
          'The boss fight'
        ],
        right: 1
      },
      cta: '3 zones, locked in' },

    { id: 'bag-03', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 03 of 12',
      title: 'Zone 1 in depth — teach without telling',
      body: [
        'The tutorial zone uses the environment to teach. No pop-ups. No instruction text. Just smart design.',
        'Example: a platformer game where you need to jump over gaps. Zone 1 has a small gap — too small to fall in, but big enough to notice. The player jumps over it. They learned to jump. Done.',
        'The visual signals the action. The size of the gap tells the player exactly how much jump they need. No words required.',
        'For YOUR game: what\'s the ONE thing the player needs to know how to do in Zone 1? That becomes the design challenge.'
      ],
      check: {
        q: 'How does a tutorial zone "teach without telling"?',
        choices: [
          'A giant text box appears with the instructions',
          'The environment itself is designed so the player naturally discovers the mechanic',
          'An NPC walks the player through every step'
        ],
        right: 1
      },
      cta: 'Got the concept' },

    { id: 'bag-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 04 of 12',
      title: 'Zone 2 in depth — the first real test',
      body: [
        'Zone 2 takes what Zone 1 taught and makes it MATTER. Now there\'s a consequence.',
        'Platformer: Zone 2 has a gap that\'s actually dangerous. Fall in = start over. Same jump mechanics — but now it counts.',
        'The key: Zone 2 should be beatable on the SECOND TRY for most players. First try = learn what can go wrong. Second try = apply the fix. Third try = frustration.',
        'If Zone 2 takes 10 tries, the level is broken. If it takes 0 tries, it\'s too easy. Design for "I can see what I need to do, I just have to do it."'
      ],
      check: {
        q: 'How many tries should Zone 2 take most players?',
        choices: [
          '0 — it should be easy',
          '1-2 tries — learn then apply',
          '10+ — games should be hard'
        ],
        right: 1
      },
      cta: 'Zone 2 — got it' },

    { id: 'bag-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 05 of 12',
      title: 'Zone 3 in depth — the reward must FEEL like a reward',
      body: [
        'Zone 3 is the payoff. And the payoff has to actually feel good.',
        'Bad reward: a text box that says "Level Complete." Cold. No juice.',
        'Good reward: the door swings open with a satisfying sound. Coins explode outward. The character raises their arms. The music swells for 2 seconds.',
        'The player went through Zone 1 and Zone 2. They earned something. Give it to them in a way they can FEEL. Sound + animation + visual change, all at once.',
        'Even a small reward done right creates the "I want to do that again" feeling. That\'s what keeps people playing.'
      ],
      check: {
        q: 'What makes a reward in Zone 3 feel satisfying?',
        choices: [
          'A plain text box saying "Done"',
          'Sound + animation + visual change — all at once, done with intent',
          'Making the player wait 5 seconds before continuing'
        ],
        right: 1
      },
      cta: 'Reward design locked' },

    { id: 'bag-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 06 of 12',
      title: 'Real examples — Mario, Doors, Bloxburg',
      body: [
        '<strong>Mario 1-1 (1985):</strong> Zone 1 = flat ground, first Goomba far away (learn to jump, no stakes). Zone 2 = first pit + fast Goombas (stakes introduced). Zone 3 = the flagpole (jump to the top for more points — optional mastery reward).',
        '<strong>Doors (Roblox):</strong> Zone 1 = first few doors, no monster, just the mechanic. Zone 2 = Rush appears for the first time (you learn to hide). Zone 3 = checkpoint room, calming music, safe to breathe.',
        '<strong>Bloxburg:</strong> Zone 1 = your empty plot of land, the build tool, one wall placed for you. Zone 2 = earning your first $100 at a job. Zone 3 = buying your first piece of furniture.',
        'Same 3-zone shape every time. Different games, same structure.'
      ],
      check: {
        q: 'Which of these is a Zone 1 moment?',
        choices: [
          'The first Roblox Rush (monster) appearing',
          'Flat ground with a faraway enemy — safe learning',
          'The boss of the final level'
        ],
        right: 1
      },
      cta: 'I see it in real games' },

    { id: 'bag-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 07 of 12',
      title: 'What Zone 1 looks like for YOUR game',
      body: [
        'You pitched your game yesterday. Now apply the 3-zone structure to it.',
        'Ask: <strong>What is the ONE core mechanic of my game?</strong> (The thing the player does every 10 seconds.)',
        'Zone 1 = the player does that mechanic once, safely, with no way to fail. Design the environment so they HAVE to do the mechanic to progress.',
        'If your mechanic is "collect coins," Zone 1 has a coin the player almost can\'t miss. If it\'s "dodge obstacles," Zone 1 has one slow obstacle with a huge gap around it.',
        'Simple. Safe. One mechanic introduced.'
      ],
      check: {
        q: 'Your game\'s core mechanic is "shooting targets." Zone 1 should:',
        choices: [
          'Have 20 fast-moving targets coming from all directions',
          'Have one big stationary target — easy to hit, no penalty for missing',
          'Start with the boss fight to set expectations'
        ],
        right: 1
      },
      cta: 'I know what Zone 1 is for my game' },

    { id: 'bag-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 08 of 12',
      title: 'What the player SEES when they spawn',
      body: [
        'Level design isn\'t just what you build — it\'s the <strong>first image</strong> the player sees when they appear in the world.',
        'That first image should answer two questions instantly: <em>Where am I?</em> and <em>What do I do first?</em>',
        'Bad: player spawns in the middle of a flat empty room with six identical doors. They\'re lost.',
        'Good: player spawns facing a lit corridor, one door at the far end clearly marked with a glowing light. They know exactly where to go.',
        'The first 3 seconds of a player\'s experience in your level determines whether they stay or quit.'
      ],
      check: {
        q: 'The player\'s FIRST image when they spawn should immediately answer:',
        choices: [
          '"How long will this game take?"',
          '"Where am I?" and "What do I do first?"',
          '"Who made this game?"'
        ],
        right: 1
      },
      cta: 'First image matters' },

    { id: 'bag-09', kind: 'topic', type: 'writing-mini', minutes: 6, subject: 'Level Design', tag: 'Level Design · 09 of 12',
      title: 'Sketch your three zones',
      eyebrow: 'Apply it · Level Design',
      label: 'Sketch your three zones',
      prompt: 'Draw three boxes on paper, side by side. Label them Zone 1, Zone 2, Zone 3. In each box, write 2-3 sentences describing exactly what happens in that zone for YOUR game. What does the player do? What can go wrong? What\'s the reward at the end?',
      minSentences: 3 },

    { id: 'bag-10', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 10 of 12',
      title: 'The pacing trick: leave breathing room',
      body: [
        'One mistake every first-time level designer makes: packing too much into Zone 2.',
        'Zone 2 has ONE challenge. Not three. Not five. ONE.',
        'After Zone 2, give the player a moment to breathe before Zone 3. An easy section. A room to explore with no danger. Music that calms down.',
        'Pacing is tension and release. Tense → release → tense → BIG release. Relentless intensity isn\'t hard — it\'s exhausting. Nobody wants to feel exhausted.'
      ],
      check: {
        q: 'Good level pacing is:',
        choices: [
          'Maximum difficulty from start to finish',
          'Tension and release — challenge followed by a breathing moment',
          'Easy throughout — players should never die'
        ],
        right: 1
      },
      cta: 'Pacing understood' },

    { id: 'bag-11', kind: 'topic', type: 'concept', minutes: 4, subject: 'Level Design', tag: 'Level Design · 11 of 12',
      title: 'What name does your Level 1 have?',
      body: [
        'Every great Roblox game names its levels, areas, or chapters. Not "Level 1." Something that tells the player where they are and sets the tone.',
        'Doors: "Floor 1." Simple, numeric, but the hotel aesthetic does the storytelling.',
        'Brookhaven: neighborhoods have visual names — the suburbs look different from downtown.',
        'Your Level 1 needs a name that fits the world you pitched. A jungle-themed game: "The Overgrowth." A space game: "The Launch Bay." A mystery game: "The Entrance Hall."',
        '<em>What is your Level 1 called?</em>'
      ],
      check: {
        q: 'A level name\'s job is to:',
        choices: [
          'Just be a number',
          'Tell the player where they are and set the tone for what\'s coming',
          'Be as long as possible'
        ],
        right: 1
      },
      cta: 'Name chosen' },

    { id: 'bag-12', kind: 'topic', type: 'writing-mini', minutes: 6, subject: 'Level Design', tag: 'Level Design · 12 of 12',
      title: 'Write the Level 1 design doc',
      eyebrow: 'Apply it · Level Design',
      label: 'Write your Level 1 design doc',
      prompt: 'Write a short paragraph for Level 1 of your game. Include: the name of the level, what the player sees when they spawn, what the core mechanic is, and what the reward at the end feels like. Write it as if you\'re describing it to someone who\'s going to build it for you.',
      minSentences: 4 },

    // ============================================================
    // AFTERNOON SUBJECT 1: MPC ONE Day 2
    // ============================================================

    { id: 'mpc-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 01 of 12',
      title: 'Day 2 — the Step Sequencer',
      body: [
        'Yesterday you learned the pads, kits, BPM, and quantize. Today: the <strong>Step Sequencer</strong>.',
        'Live-tapping is one way to enter beats. But it requires fast hands and good timing, even with quantize.',
        'The Step Sequencer lets you <strong>enter beats visually</strong> — click the steps you want on, leave the others off. No timing required. See the pattern, click the pattern, hear it play.'
      ],
      check: {
        q: 'What\'s the advantage of the Step Sequencer over live-tapping?',
        choices: [
          'It makes better-sounding beats',
          'You enter beats visually — no timing required',
          'It\'s louder'
        ],
        right: 1
      },
      cta: 'Ready' },

    { id: 'mpc-02', kind: 'topic', type: 'video', minutes: 10, subject: 'MPC ONE', tag: 'MPC · 02 of 12',
      title: 'Watch: MPC One Step Sequencer (Akai Official)',
      video: {
        title: 'Getting Started with MPC One | Using the Step Sequencer — Akai Professional (official)',
        ytId: 'uuNyLLg-cXs',
        summary: [
          'The Step Sequencer shows each sound on its own row. Each row has 16 steps = one bar of 4/4 music. A lit step plays that sound on that beat. A dark step is silence.',
          'Classic boom-bap pattern: kick on steps 1 + 9 (beats 1 and 3), snare on steps 5 + 13 (beats 2 and 4), hi-hat on steps 1-3-5-7-9-11-13-15 (every 8th note).',
          'You can change velocity (how hard the pad hit) per step — click a lit step and dial the velocity up or down. Quiet hi-hats, loud kick, snare somewhere in between.',
          'The Step Sequencer is perfect for entering patterns you can already hear in your head. It\'s visual, precise, and you can hear changes instantly.'
        ],
        questions: [
          { q: 'How many steps = one bar in the Step Sequencer?', a: ['8', '16', '32'], right: 1 },
          { q: 'In boom-bap, the snare hits on which steps?', a: ['1 and 9', '5 and 13 (beats 2 and 4)', '1 and 5'], right: 1 },
          { q: 'What does a LIT step do?', a: ['Silence on that beat', 'Plays that sound on that beat', 'Deletes the track'], right: 1 },
          { q: 'How do you change how hard one step hits?', a: ['Delete and re-enter it', 'Adjust the velocity on that step', 'Change the kit'], right: 1 },
          { q: 'Step Sequencer vs live-tapping: key difference is?', a: ['Step sequencer is louder', 'Step sequencer is visual — no timing required', 'They\'re identical'], right: 1 }
        ]
      }
    },

    { id: 'mpc-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 03 of 12',
      title: '16 steps = one bar of music',
      body: [
        '4/4 time = 4 beats per bar. Each beat divides into 4 sub-beats (16th notes). So one bar = 16 steps.',
        'In the sequencer: step 1 = beat 1. Step 5 = beat 2. Step 9 = beat 3. Step 13 = beat 4.',
        'Count it out: 1-e-and-a — 2-e-and-a — 3-e-and-a — 4-e-and-a. Those 16 syllables are your 16 steps.'
      ],
      check: {
        q: 'In the Step Sequencer, step 9 lands on which beat of the bar?',
        choices: [
          'Beat 1',
          'Beat 2',
          'Beat 3'
        ],
        right: 2
      },
      cta: '16 steps, got it' },

    { id: 'mpc-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 04 of 12',
      title: 'Enter the classic boom-bap pattern',
      body: [
        'This is the pattern behind half of hip-hop. Enter it in the Step Sequencer:',
        '<strong>Kick drum:</strong> steps 1 and 9 only (boom on beats 1 and 3)',
        '<strong>Snare:</strong> steps 5 and 13 only (bap on beats 2 and 4)',
        '<strong>Hi-hat:</strong> steps 1, 3, 5, 7, 9, 11, 13, 15 (every other step — every 8th note)',
        'Loop it. That\'s boom-bap. J Dilla, Pete Rock, No I.D., Dr. Dre — all variations on this foundation.'
      ],
      check: {
        q: 'In the boom-bap pattern, where does the kick drum go?',
        choices: [
          'Steps 5 and 13',
          'Steps 1 and 9',
          'All 16 steps'
        ],
        right: 1
      },
      cta: 'Pattern locked' },

    { id: 'mpc-05', kind: 'topic', type: 'speedread', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 05 of 12',
      title: 'Speed-read: Dr. Dre and the step sequencer',
      passage: {
        paragraphs: [
          'Dr. Dre is one of the best-selling music producers of all time. His sound — The Chronic, Snoop\'s debut, Eminem\'s first two albums, 2Pac\'s California Love — defined West Coast hip-hop. He used Akai MPC machines to program nearly every drum pattern he\'s ever made.',
          'His signature wasn\'t the samples he chose or the melodies he built. It was his drum patterns. Specifically, the precise placement of kicks and snares and hi-hats — and the occasional note he pulled OUT of the pattern to create space.',
          'Space is the secret. An open 4th beat — silence where you expect a snare — makes the listener\'s brain fill in the sound. That little gap makes the whole loop feel more alive. Dre mastered the art of knowing exactly which steps NOT to fill.',
          'He\'s been doing this since the early 1990s and still records today. More than three decades. The machine is different, the software is more powerful — but the fundamentals he learned on the Akai Step Sequencer in 1991 still drive every beat he makes.'
        ],
        srComprehension: [
          { q: 'What was Dr. Dre\'s drum signature?', choices: ['Very loud kicks', 'Precise placement of drums AND knowing which steps to leave EMPTY', 'Always using the same kit'], right: 1 },
          { q: 'What does leaving a step empty do?', choices: ['Breaks the beat', 'Makes the listener\'s brain fill in the sound — makes it feel alive', 'Ends the loop'], right: 1 },
          { q: 'What machine did Dre use for his drum patterns?', choices: ['A piano', 'The Akai MPC', 'A guitar pedal'], right: 1 }
        ]
      }
    },

    { id: 'mpc-06', kind: 'topic', type: 'typing', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 06 of 12',
      title: 'Type it fast',
      typingTarget: 'Kick on 1 and 9. Snare on 5 and 13. Hi-hat every other step. That is boom-bap.' },

    { id: 'mpc-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 07 of 12',
      title: 'Velocity — the volume of each hit',
      body: [
        'Every step has a velocity — how hard it hits. In a real drum kit, you never hit every drum the same. Some hi-hats are ghost notes (almost silent). The snare on beat 2 might be harder than the one on beat 4.',
        'In the Step Sequencer, select a lit step and you can dial its velocity. Low velocity = quiet hit. High velocity = loud hit.',
        'A simple trick to make your beat feel more human: set all your hi-hats to around 60-70 velocity, then set every other one slightly lower (50). Now the hi-hats have a natural "accent" — like a real drummer\'s wrist motion.'
      ],
      check: {
        q: 'Why vary velocity on hi-hat steps?',
        choices: [
          'It changes the BPM',
          'It adds a natural accent, making the beat feel more human',
          'It turns the hi-hat into a snare'
        ],
        right: 1
      },
      cta: 'Velocity trick noted' },

    { id: 'mpc-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 08 of 12',
      title: 'Add a variation on bar 4',
      body: [
        'The boom-bap pattern loops. But if every bar is identical, it gets boring after 30 seconds.',
        'Standard move: on bar 4, change something small. Pull the snare from step 13 (beat 4). Add a kick on step 14. Drop a quick hi-hat flam on 15+16.',
        'That tiny change — on just the last beat of the last bar — makes the listener feel the loop turn over. Like a wave cresting before it breaks. It says: "you\'re about to be back at bar 1 — get ready."',
        'It\'s called a <strong>fill</strong>. One bar variation, same loop underneath. Most hip-hop does this every 4 or 8 bars.'
      ],
      check: {
        q: 'What does a "fill" on bar 4 accomplish?',
        choices: [
          'Stops the beat entirely',
          'Makes the listener feel the loop turning over — a wave cresting',
          'Changes the kit'
        ],
        right: 1
      },
      cta: 'Fill idea locked' },

    { id: 'mpc-09', kind: 'topic', type: 'writing-mini', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 09 of 12',
      title: 'Spec your Step Sequencer pattern',
      eyebrow: 'Quick Write · MPC',
      label: 'Spec your Step Sequencer pattern',
      prompt: 'Write the pattern you\'re going to enter into the Step Sequencer. Format: Genre + BPM + which steps get the kick + which steps get the snare + hi-hat pattern. Two to three sentences. Then go do it.',
      minSentences: 2 },

    { id: 'mpc-10', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 10 of 12',
      title: 'The "Dilla rule" — when to turn quantize OFF',
      body: [
        'Yesterday we said: use quantize the first 100 times. Today, one exception.',
        'J Dilla\'s signature was <strong>intentionally late notes</strong> — his snare would hit slightly after beat 2, not exactly on it. That slight drag created a "drunk" feel, like the beat was breathing.',
        'With the Step Sequencer, you can fake the Dilla rule: enter your snare on step 5, then nudge it a small amount late using the nudge function. Just a fraction of a step. Try it on ONE note. Compare looped vs not nudged.',
        'You\'ll hear it. That\'s taste. That\'s the difference between a technically-correct pattern and a groove.'
      ],
      check: {
        q: 'What\'s the "Dilla rule" for making a beat feel alive?',
        choices: [
          'Make everything perfectly on-grid',
          'Nudge certain notes slightly late — intentional drag creates feel',
          'Use more instruments'
        ],
        right: 1
      },
      cta: 'Got the rule' },

    { id: 'mpc-11', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 11 of 12',
      title: 'Save the beat — and name it',
      body: [
        'Once you have your pattern running and it sounds good — save it.',
        'In the MPC ONE: press MENU → Save Project. Give it a name that means something. Not "Beat 1" — something like "ChunkyWed_BPM90" or "EthanFirst" or whatever you\'ll recognise when you open it again next week.',
        'Pro habit: every time you work on a beat, save it with a version number. Beat_v1, Beat_v2. Never save over your old version — you\'ll regret it. Some of the best beats come from going back to v2 and finishing it.'
      ],
      check: {
        q: 'Why not save over your previous version when you update a beat?',
        choices: [
          'The MPC won\'t let you',
          'Some of the best work comes from going back to an older version',
          'It takes too much memory'
        ],
        right: 1
      },
      cta: 'Saving habit locked' },

    { id: 'mpc-12', kind: 'topic', type: 'writing-mini', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 12 of 12',
      title: 'Make the beat — then describe it',
      eyebrow: 'Apply it · MPC',
      label: 'Make the beat — then describe it',
      prompt: 'Enter the boom-bap pattern in the Step Sequencer. Set your BPM. Adjust velocities. Add a bar-4 fill. Save it with a name. Then write one sentence: what does the beat sound like? (Genre, feel, speed, anything you noticed.)',
      minSentences: 1 },

    // ============================================================
    // AFTERNOON SUBJECT 2: PHOTOGRAPHY Day 1
    // ============================================================

    { id: 'ph-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Photography', tag: 'Photo · 01 of 12',
      title: 'Photography isn\'t about the camera',
      body: [
        'The most common lie: "I\'d take great photos if I had a better camera."',
        'The truth: the world\'s most-liked Instagram photos have been taken on iPhones. Most professional food photography is shot on $200 prime lenses.',
        '<strong>Great photos are about seeing</strong> — noticing light, noticing composition, noticing the moment before it happens.',
        'Today you\'ll learn the #1 composition rule. Then you\'ll shoot 3 photos that prove you understand it. The camera is just the tool.'
      ],
      check: {
        q: 'What makes a great photo?',
        choices: [
          'An expensive camera',
          'Seeing — noticing light, composition, and the right moment',
          'Expensive editing software'
        ],
        right: 1
      },
      cta: 'Ready' },

    { id: 'ph-02', kind: 'topic', type: 'video', minutes: 8, subject: 'Photography', tag: 'Photo · 02 of 12',
      title: 'Watch: Photography for Kids — Rule of Thirds',
      video: {
        title: 'Photography for Kids | Lesson 1: Rule of Thirds',
        ytId: '21cxZa0laOA',
        summary: [
          'The Rule of Thirds: divide your frame into a 3×3 grid (2 horizontal lines, 2 vertical lines). Place your subject along those lines or at the 4 intersection points — NOT in the dead center.',
          'Center-framing = boring. The subject is isolated. Your eyes have nowhere to travel.',
          'Rule of Thirds = interesting. The subject has breathing room on one side. Your eyes explore the frame. You notice background, foreground, context.',
          'Most cameras (including the Lumix G9) have a grid overlay option you can turn on. Enable it and you\'ll automatically start seeing the thirds.'
        ],
        questions: [
          { q: 'The Rule of Thirds divides your frame into a...', a: ['2×2 grid', '3×3 grid', '4×4 grid'], right: 1 },
          { q: 'Where should your subject go?', a: ['Dead center', 'Along the grid lines or at the intersection points', 'In the corner'], right: 1 },
          { q: 'Why does center-framing feel boring?', a: ['The colors are wrong', 'The subject is isolated with nowhere for the eyes to travel', 'The camera can\'t focus on the center'], right: 1 },
          { q: 'How can you see the Rule of Thirds while shooting?', a: ['Edit the photo after', 'Turn on the grid overlay in your camera settings', 'Print the grid on the lens'], right: 1 },
          { q: 'Rule of Thirds makes a photo more interesting because...', a: ['It adds a filter', 'The subject has breathing room — eyes explore the whole frame', 'It fixes exposure'], right: 1 }
        ]
      }
    },

    { id: 'ph-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Photography', tag: 'Photo · 03 of 12',
      title: 'The 3×3 grid — see it everywhere',
      body: [
        'Imagine your viewfinder divided by 2 lines running across and 2 lines running down. That\'s a 3×3 grid — 9 equal sections.',
        'The 4 points where the lines cross are called <strong>power points</strong>. Place your subject on a power point and the photo immediately has more visual tension than center-framing.',
        'The horizon line (sky meets land) should sit along one of the two horizontal lines — not cutting the photo exactly in half. Half-and-half = flat. Rule-of-Thirds horizon = dynamic.'
      ],
      check: {
        q: 'Where are the "power points" in the Rule of Thirds grid?',
        choices: [
          'Dead center',
          'The 4 intersection points of the grid lines',
          'The outer edges'
        ],
        right: 1
      },
      cta: 'I see the grid' },

    { id: 'ph-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Photography', tag: 'Photo · 04 of 12',
      title: 'Leading lines',
      body: [
        'Leading lines are lines in the scene that guide the viewer\'s eye toward the subject.',
        'A road going toward the horizon. A fence running to a barn. A river curving to a bridge. Stairs angled toward a window.',
        'The line does the work — the viewer\'s eye follows the line automatically, like a train on a track, and arrives at your subject.',
        'Look for leading lines in every scene before you shoot. Roads, rivers, fences, shadows, stairways, buildings — lines are everywhere once you start looking.'
      ],
      check: {
        q: 'What do leading lines do in a photograph?',
        choices: [
          'Add color contrast',
          'Guide the viewer\'s eye to the subject',
          'Fix the exposure'
        ],
        right: 1
      },
      cta: 'Leading lines locked' },

    { id: 'ph-05', kind: 'topic', type: 'speedread', minutes: 4, subject: 'Photography', tag: 'Photo · 05 of 12',
      title: 'Speed-read: Steve McCurry',
      passage: {
        paragraphs: [
          'Steve McCurry is a photographer who has shot in over 100 countries. His most famous photograph — "Afghan Girl," taken in 1984 — appeared on the cover of National Geographic and became one of the most recognized photographs of the 20th century.',
          'The photo is a portrait of a 12-year-old Afghan refugee named Sharbat Gula. Her eyes — sea-green, direct, unsettling — dominate the frame. McCurry positioned her face slightly off-center, on the right power point of the Rule of Thirds grid. Her gaze crosses the frame to the left, toward open space.',
          'The result is a photo that has tension. The eyes say: I am here, I see you, I have survived. The open space to her left gives the photo room to breathe — and the viewer\'s eye somewhere to go after it locks on her face.',
          'McCurry didn\'t use the grid consciously in that moment. He used it because he\'d taken so many photographs that Rule of Thirds framing was instinct. That\'s the goal — not to think "am I following the rule?" but to see that way naturally.'
        ],
        srComprehension: [
          { q: 'Where was "Afghan Girl" published?', choices: ['TIME Magazine', 'National Geographic', 'Sports Illustrated'], right: 1 },
          { q: 'Where was the subject positioned in the frame?', choices: ['Dead center', 'On the right power point — Rule of Thirds', 'Bottom-left corner'], right: 1 },
          { q: 'The goal of learning composition rules is:', choices: ['To follow them robotically forever', 'To internalize them until they become natural instinct', 'To break them on purpose'], right: 1 }
        ]
      }
    },

    { id: 'ph-06', kind: 'topic', type: 'typing', minutes: 3, subject: 'Photography', tag: 'Photo · 06 of 12',
      title: 'Type it fast',
      typingTarget: 'Divide the frame into thirds. Place the subject on a power point. Never put the horizon in the middle.' },

    { id: 'ph-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Photography', tag: 'Photo · 07 of 12',
      title: 'Turn on the grid on the Lumix G9',
      body: [
        'The Panasonic Lumix G9 has a grid overlay — it draws the Rule of Thirds lines right in your viewfinder so you can see them while composing.',
        'How to enable it: MENU → Custom (pencil icon) → Monitor Display → Guide Line → 3×3.',
        'Now the grid lines appear on screen whenever you\'re shooting. Use them. Align your subject to a power point before pressing the shutter.',
        'After 50 shots with the grid on, your eye will start seeing the thirds even with the grid turned off.'
      ],
      check: {
        q: 'Where do you find the grid overlay setting on the Lumix G9?',
        choices: [
          'There is no grid — you have to do it mentally',
          'MENU → Custom → Monitor Display → Guide Line → 3×3',
          'It\'s turned on by default'
        ],
        right: 1
      },
      cta: 'Settings noted' },

    { id: 'ph-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Photography', tag: 'Photo · 08 of 12',
      title: 'Assignment 1 — shoot a still object using Rule of Thirds',
      body: [
        'Pick any object near you: a cup, a shoe, a book, something from your desk.',
        'First: take a photo with the object dead center. Look at it.',
        'Then: move the object to one of the four power points. Shoot again. Compare the two.',
        'You\'ll see the difference immediately. That difference IS the rule made visible.',
        '<em>Take both shots. Then continue.</em>'
      ],
      check: {
        q: 'Which photo is more interesting after you try this?',
        choices: [
          'The dead-center one',
          'The Rule-of-Thirds one',
          'They\'re identical'
        ],
        right: 1
      },
      cta: 'Both shots taken' },

    { id: 'ph-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Photography', tag: 'Photo · 09 of 12',
      title: 'Assignment 2 — shoot a person using Rule of Thirds',
      body: [
        'Ask someone at home to stand still for 10 seconds.',
        'Frame them on the RIGHT power point. Make sure their face is on a power point — eyes on the upper intersection if possible.',
        'Leave space on the LEFT side of the frame (in the direction they\'re looking or facing). This is called "look room" or "nose room."',
        'Shoot. Look at it. The empty space in front of them isn\'t wasted space — it\'s breathing room that makes the photo feel alive.'
      ],
      check: {
        q: 'Why leave space in the direction the person is facing?',
        choices: [
          'Just a random rule',
          '"Look room" gives the photo breathing space — makes it feel alive',
          'It\'s required for auto-focus to work'
        ],
        right: 1
      },
      cta: 'Portrait shot' },

    { id: 'ph-10', kind: 'topic', type: 'concept', minutes: 4, subject: 'Photography', tag: 'Photo · 10 of 12',
      title: 'Assignment 3 — find a leading line outside',
      body: [
        'Go outside or look out a window. Find ONE leading line: a road, a fence, a shadow, a crack in the pavement, rooftops, a row of trees.',
        'Compose the shot so the line enters from a corner of the frame and guides toward your main subject (or toward the horizon).',
        'Turn the grid on. Line it up. Shoot.',
        'This is the third and hardest assignment today. Leading lines aren\'t as obvious as a cup on a table. You have to look. But once you see one, the shot almost composes itself.'
      ],
      check: {
        q: 'Where should a leading line enter the frame?',
        choices: [
          'From the center',
          'From a corner, guiding the eye toward the subject',
          'It doesn\'t matter'
        ],
        right: 1
      },
      cta: 'Leading line shot taken' },

    { id: 'ph-11', kind: 'topic', type: 'concept', minutes: 4, subject: 'Photography', tag: 'Photo · 11 of 12',
      title: 'Review your three photos',
      body: [
        'Look at all three shots on your camera or phone. For each one, ask:',
        '<strong>1.</strong> Is the subject on a power point (not dead center)?',
        '<strong>2.</strong> Is there breathing room in the frame?',
        '<strong>3.</strong> Would someone\'s eye travel through the frame naturally?',
        'Pick the one you think is strongest. Be ready to say WHY.',
        'You just shot your first three intentionally-composed photographs. Most people take thousands of photos before they think about any of this.'
      ],
      check: {
        q: 'What\'s the best sign a photo is working?',
        choices: [
          'The subject is in the center',
          'Someone\'s eye naturally travels through the frame and arrives at the subject',
          'The photo is bright'
        ],
        right: 1
      },
      cta: 'Photos reviewed' },

    { id: 'ph-12', kind: 'topic', type: 'writing-mini', minutes: 5, subject: 'Photography', tag: 'Photo · 12 of 12',
      title: 'Show your best shot — describe why it works',
      eyebrow: 'Apply it · Photography',
      label: 'Show your best shot',
      prompt: 'Show Mom or Dad your best photo from today. Then write 2-3 sentences: which rule did you use (Rule of Thirds, leading lines, or both)? Where is the subject in the frame? Why does the empty space make the photo stronger?',
      minSentences: 2 },

    // ============================================================
    // AFTERNOON SUBJECT 3: DRAWING Day 2
    // ============================================================

    { id: 'dr-01', kind: 'topic', type: 'concept', minutes: 3, subject: 'Drawing', tag: 'Drawing · 01 of 12',
      title: 'Day 2 — warm up, then draw something real',
      body: [
        'Yesterday: everything is basic shapes. Pros draw structure before surface. Look longer than you draw.',
        'Today: we warm up, then you actually draw a real object using only what you learned.',
        'Day 2 of any skill is where most people quit. The first session was exciting and new. Day 2 is work. This is the session that matters.'
      ],
      check: {
        q: 'Why does Day 2 of any skill matter more than Day 1?',
        choices: [
          'Day 2 is usually easier',
          'Day 1 was excitement. Day 2 is work — and doing it anyway is what separates people who improve from people who don\'t',
          'Day 1 doesn\'t count'
        ],
        right: 1
      },
      cta: 'Day 2, let\'s go' },

    { id: 'dr-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Drawing', tag: 'Drawing · 02 of 12',
      title: 'Warm-up — 5 shapes in 2 minutes',
      body: [
        'Get paper and a pen. Draw these 5 shapes in order — one smooth confident stroke each, no erasing:',
        '<strong>1.</strong> A circle (slow, continuous stroke, don\'t lift the pen)',
        '<strong>2.</strong> A square (four strokes, corners crisp)',
        '<strong>3.</strong> A triangle (three strokes, meeting at the tips)',
        '<strong>4.</strong> A smooth curve — like a wide S',
        '<strong>5.</strong> A straight horizontal line — slow and steady, no wobble',
        'These are the building blocks. Warm the hand up before you draw the real thing.'
      ],
      check: {
        q: 'Why do artists warm up before drawing seriously?',
        choices: [
          'It\'s a superstition',
          'Hand and eye get warmed up — first marks on cold hands are stiff; warmed-up hands flow',
          'It makes the paper smoother'
        ],
        right: 1
      },
      cta: '5 shapes drawn' },

    { id: 'dr-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'Drawing', tag: 'Drawing · 03 of 12',
      title: 'Review: the 3 rules from yesterday',
      body: [
        '<strong>1. Everything is shapes.</strong> Nothing is too complicated to decompose into circles, squares, triangles, lines, curves.',
        '<strong>2. Structure before surface.</strong> Draw the basic shape first. Add detail on top. Don\'t try to draw the surface and the structure at the same time.',
        '<strong>3. Look longer than you draw.</strong> Ratio: 2 seconds looking, 1 second drawing. Your hand executes what your eye figured out — not the other way around.'
      ],
      check: {
        q: 'What\'s the look-to-draw ratio for pros?',
        choices: [
          '1 second looking, 2 seconds drawing',
          '2 seconds looking, 1 second drawing',
          '50/50 — equal time on both'
        ],
        right: 1
      },
      cta: '3 rules back in my head' },

    { id: 'dr-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Drawing', tag: 'Drawing · 04 of 12',
      title: 'Apply it: decompose a sneaker',
      body: [
        'Pick up a sneaker near you or picture one clearly in your head. Don\'t draw yet — just SEE the shapes.',
        '<strong>Sole:</strong> a flat elongated oval / thick rectangle.',
        '<strong>Upper:</strong> a curved shape that wraps over the top — almost like a half-moon with a flat bottom.',
        '<strong>Laces area:</strong> a rectangle with lines across it.',
        '<strong>Toe box:</strong> a rounded rectangle at the front.',
        'Four shapes. That\'s a sneaker. Now draw each one. Don\'t try to draw "a sneaker" — draw four shapes in the right arrangement.'
      ],
      check: {
        q: 'The correct approach for drawing a sneaker is:',
        choices: [
          'Draw the outline of the whole shoe at once from memory',
          'Decompose it into 4-5 shapes, draw each shape in position',
          'Copy it line-by-line from a photo'
        ],
        right: 1
      },
      cta: 'Sneaker decomposed' },

    { id: 'dr-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Drawing', tag: 'Drawing · 05 of 12',
      title: 'Line weight — closer = heavier',
      body: [
        'One technique that makes drawings pop without shading: vary your line weight.',
        '<strong>Heavy lines:</strong> close to the viewer, the outline of the main subject.',
        '<strong>Light lines:</strong> far from the viewer, background details, interior lines.',
        'When you outline the sneaker, use a confident heavy line for the outer edge. Use lighter, thinner lines for the laces, the sole detail, the stitching. The contrast creates depth.',
        'This is how comic artists and concept artists make flat drawings look three-dimensional — no shading, just thick-to-thin.'
      ],
      check: {
        q: 'Heavy lines make something feel:',
        choices: [
          'Far away',
          'Close — in front',
          'Angry'
        ],
        right: 1
      },
      cta: 'Line weight noted' },

    { id: 'dr-06', kind: 'topic', type: 'speedread', minutes: 4, subject: 'Drawing', tag: 'Drawing · 06 of 12',
      title: 'Speed-read: Hayao Miyazaki',
      passage: {
        paragraphs: [
          'Hayao Miyazaki is the director of Spirited Away, Princess Mononoke, and My Neighbor Totoro — three of the greatest animated films ever made. He has been drawing for over 60 years. He draws every day.',
          'Here\'s the part people don\'t know: Miyazaki sketches in pencil every morning before he does anything else. Not finished artwork. Just loose sketches — characters, landscapes, ideas. Pages of them, every day, without expectation.',
          'He says: "I\'m not drawing to produce a masterpiece every time. I\'m drawing to stay in conversation with my own hand." Most sketches go nowhere. But over six decades, thousands of those nowhere sketches quietly became the visual language of his films.',
          'The lesson isn\'t that you\'ll become Miyazaki. The lesson is that the greatest visual artist of the 20th century draws every morning because it keeps the connection between eye and hand alive. Daily practice isn\'t about talent. It\'s about maintenance.'
        ],
        srComprehension: [
          { q: 'What does Miyazaki do every morning?', choices: ['Watches movies', 'Sketches in pencil — loose drawings without expectation', 'Plans his films in detail'], right: 1 },
          { q: 'Why does he sketch every day?', choices: ['To produce masterpieces', 'To stay in conversation with his own hand — keep the eye-hand connection alive', 'To impress people'], right: 1 },
          { q: 'The lesson from Miyazaki\'s daily drawing practice:', choices: ['You need talent first', 'Daily practice is maintenance — keeps skills alive', 'Only draw when you have a specific goal'], right: 1 }
        ]
      }
    },

    { id: 'dr-07', kind: 'topic', type: 'typing', minutes: 3, subject: 'Drawing', tag: 'Drawing · 07 of 12',
      title: 'Type it fast',
      typingTarget: 'Look longer than you draw. Draw the structure first. Heavy lines in front, light lines behind.' },

    { id: 'dr-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Drawing', tag: 'Drawing · 08 of 12',
      title: 'Draw a cartoon face from basic shapes',
      body: [
        'Let\'s draw a simple cartoon face. Step by step:',
        '<strong>1.</strong> Large circle — the head.',
        '<strong>2.</strong> Two small ovals — the eyes (slightly above center).',
        '<strong>3.</strong> Tiny triangle or dot — the nose (center of face).',
        '<strong>4.</strong> A curve — the mouth (below the nose).',
        '<strong>5.</strong> Optional: two ear shapes on the sides (half-circles).',
        'That\'s 5 shapes. Look at it — that\'s a face. Structure before surface. Add detail last (eyebrows, pupils, hair) only after the structure is right.'
      ],
      check: {
        q: 'In the cartoon face, you draw the detail (eyebrows, hair) when?',
        choices: [
          'First — get the details right before the structure',
          'Last — only after the basic shape structure is right',
          'At the same time as everything else'
        ],
        right: 1
      },
      cta: 'Cartoon face drawn' },

    { id: 'dr-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Drawing', tag: 'Drawing · 09 of 12',
      title: 'Make the face YOUR character',
      body: [
        'Your cartoon face is a blank template. Now give it character. Three changes, maximum:',
        '<strong>Eyes:</strong> change the shape. Big round eyes = friendly. Narrow slanted eyes = determined or sneaky. Half-closed = relaxed.',
        '<strong>Mouth:</strong> change the curve. Big smile = happy. Straight line = serious. Small smirk to one side = confident.',
        '<strong>One detail:</strong> glasses, a scar, a beard, big ears, a distinctive hairstyle — ONE thing that makes this face recognizable from any other.',
        'Three changes. Now you have a character, not a template. That\'s character design.'
      ],
      check: {
        q: 'What\'s ONE thing that makes a face feel like a unique character vs a template?',
        choices: [
          'Having all the standard features',
          'One distinctive detail — glasses, a scar, a hairstyle — that makes it recognizable',
          'Being as detailed as possible'
        ],
        right: 1
      },
      cta: 'My character has a face' },

    { id: 'dr-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Drawing', tag: 'Drawing · 10 of 12',
      title: 'Apply it — decompose another person\'s face',
      body: [
        'Look at a real person\'s face near you (or a photo). Before drawing, SEE the shapes:',
        'Head shape = oval? round? more square? Most people have slightly different head shapes.',
        'Eye placement = about halfway down the face (people always place them higher — it\'s the most common mistake).',
        'Nose = about halfway between eyes and chin.',
        'Mouth = about one-third of the way from nose to chin.',
        'Measure with your eyes before you draw a single line.'
      ],
      check: {
        q: 'Where are the eyes actually located on a real face?',
        choices: [
          'Near the top of the head',
          'About halfway down the face — lower than most people draw them',
          'In the bottom third'
        ],
        right: 1
      },
      cta: 'Measured with my eyes' },

    { id: 'dr-11', kind: 'topic', type: 'concept', minutes: 4, subject: 'Drawing', tag: 'Drawing · 11 of 12',
      title: 'Thick-thin rule applied to your face',
      body: [
        'Apply line weight to your character drawing:',
        '<strong>Outer outline of the head:</strong> heavy, confident line.',
        '<strong>Eyes, nose, mouth:</strong> medium line.',
        '<strong>Interior details (hair texture, wrinkles, glasses frame detail):</strong> thin, light line.',
        'This is how every manga, every American comic, every character design sheet works. Heavy on the outside, lighter as you go in. It creates an automatic three-dimensionality.',
        'Try it on your character: trace over your drawing with this rule applied. See if it changes how it reads.'
      ],
      check: {
        q: 'In a character drawing, which lines should be heaviest?',
        choices: [
          'Interior details — hair, eyebrows, wrinkles',
          'The outer outline of the face',
          'All lines should be the same weight'
        ],
        right: 1
      },
      cta: 'Line weight applied' },

    { id: 'dr-12', kind: 'topic', type: 'writing-mini', minutes: 6, subject: 'Drawing', tag: 'Drawing · 12 of 12',
      title: 'Draw your game\'s main character',
      eyebrow: 'Apply it · Drawing',
      label: 'Draw your game\'s main character',
      prompt: 'Draw the main character or player avatar from the game you\'ve been designing all week. Basic shapes only. Give them ONE distinctive feature (the thing that makes them recognizable). Apply thick-thin line weight. When done, take a photo and show it to Mom or Dad.',
      minSentences: 1 },

    // ===== FRAME 2: Show Mom or Dad =====
    { id: 'showoff-wed', kind: 'topic', type: 'showdad', title: 'Show Mom or Dad what you made today', minutes: 6 },

    // ===== FRAME 3: Report Card =====
    { id: 'report-wed', kind: 'drill', type: 'report-card', title: 'Wednesday — report card', minutes: 2 }

  ]
};
