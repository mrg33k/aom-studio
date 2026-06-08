/* Summer School — THURSDAY curriculum (built 2026-05-30 for week of 2026-06-08)
 *
 * NEW FILE. Thursday wasn't built yet — added this week. Same Friday-style
 * teach-back structure. 46 blocks: welcome + 4 kickoffs + 10 × 4 subjects
 * + report-card. Block IDs prefixed "thu-".
 *
 * Theme: "MAKE IT REAL" — the day you turn this week\'s ideas into hands-on
 *        skill. Less talking about, more doing.
 *   Reading  → Author\'s Purpose (PIE — Persuade, Inform, Entertain)
 *   Writing  → How-To Writing (procedural — clear steps in order)
 *   Math     → Ratios (the math behind comparisons)
 *   Maker    → Soldering Basics (safety + your first joint)
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.thursday = {
  weekOf: '2026-06-08',
  day: 'thursday',
  theme: 'MAKE IT REAL',
  themeDesc: 'Stop talking about it, start doing it. Pick apart a writer\'s purpose, write a real how-to, find ratios in the world, learn how to solder a real joint.',
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 4 — Thursday',
    showParentNote: true,
    bullets: [
      "<strong>Reading — Author\'s Purpose (PIE).</strong> Every writer has a reason: Persuade, Inform, or Entertain. Once you can name it, you read smarter forever.",
      "<strong>Writing — How-To Writing.</strong> The most useful kind of writing there is. Clear steps. Right order. No skipping. You\'ll write a real how-to today.",
      "<strong>Math — Ratios.</strong> 2 cookies for every 3 kids — that\'s a ratio. They\'re everywhere once you see them, and they unlock 7th-grade math.",
      "<strong>Maker — Soldering.</strong> Safety first, then the first real joint. The single biggest unlock in electronics. You\'ll need adult supervision in person — today is the theory."
    ],
    howItWorks: "Same rule. Every block ends with you typing. Spell-check catches misspelled words. Read your answer, send it to Mom & Dad. No clicking past."
  },

  typingTarget: 'Today I make it real. Less talking about, more doing.',

  tileVocab: [
    { word: 'purpose',  clue: 'The reason somebody is doing or writing something' },
    { word: 'procedure', clue: 'A step-by-step way of doing something' },
    { word: 'ratio',    clue: 'A way to compare two amounts' },
    { word: 'solder',   clue: 'A soft metal that melts to join wires together' },
    { word: 'sequence', clue: 'Things in a specific order' },
    { word: 'circuit',  clue: 'A complete loop electricity flows through' }
  ],

  blocks: [
    // ===== INTERLEAVED ORDER =====
    // welcome → 4 kickoff videos (reading/writing/math/4th)
    //         → round-robin 10 rotations
    //         → report card
    // Total: 1 + 4 + 40 + 1 = 46 blocks.

    { id: 'welcome-thu', kind: 'drill', type: 'welcome', title: 'Welcome to Thursday', minutes: 2 },

    // ===== KICKOFF VIDEOS =====
    { id: 'thu-r-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Reading', tag: 'Reading · Kickoff video',
      title: 'Kickoff video — Author\'s Purpose with PIE',
      video: { title: 'Finding the Authors Purpose with P.I.E.', ytId: 'pGmR1HiW9H0', creditLine: 'Whimsical Teacher Tube' },
      typedQuestions: [
        { q: 'What do the three letters in PIE stand for? Write each one out. Keep going until you have said everything that matters -- your first answer is probably not enough.' },
        { q: 'Pick one — Persuade, Inform, or Entertain. Give one real example of something you\'ve read that was written for that purpose. Say everything you know about this -- don't stop when you think you're done.' }
      ],
      cta: 'Done' },

    { id: 'thu-w-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Writing', tag: 'Writing · Kickoff video',
      title: 'Kickoff video — How-To (Procedural) Writing',
      video: { title: 'How to Write: How-To (Procedural) Writing', ytId: 'bvUh3FrhFY8', creditLine: 'Small Act Big Impact' },
      typedQuestions: [
        { q: 'What makes a how-to different from a story? Use the word "steps" or "order" somewhere. Write until it is complete. Your first sentence is not the answer.' },
        { q: 'Name one thing you know how to do well enough that you could write a how-to about it. Why that one? Don't stop at one sentence. Keep explaining until there is nothing left to say.' }
      ],
      cta: 'Done' },

    { id: 'thu-m-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Math', tag: 'Math · Kickoff video',
      title: 'Kickoff video — Introduction to Ratios',
      video: { title: 'Introduction to ratios — Ratios, rates, and percentages — 6th grade', ytId: 'bIKmw0aTmYc', creditLine: 'Khan Academy' },
      typedQuestions: [
        { q: 'What is a ratio, in your own words? Give one example from the video or your own life. Be thorough -- write until you have actually said what you mean.' },
        { q: 'The video showed three ways to write a ratio. Name two of them (like "2 to 3" or "2:3" or "2/3"). Push past your first answer. The real answer comes after that.' }
      ],
      cta: 'Done' },

    { id: 'thu-k-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Maker', tag: 'Maker · Kickoff video',
      title: 'Kickoff video — How to Solder (Beginner\'s Guide)',
      video: { title: 'HOW TO SOLDER! (Beginner\'s Guide)', ytId: '3jAw41LRBxU', creditLine: 'HackMakeMod' },
      typedQuestions: [
        { q: 'Name TWO safety rules the video showed for soldering. Why does each one matter? Write until you feel like you really explained it -- do not stop at your first thought.' },
        { q: 'What\'s the basic technique for making a good solder joint, in your own words? Keep going until you have said everything that matters -- your first answer is probably not enough.' }
      ],
      cta: 'Done' },

    // ===== SUBJECT 1 — READING (Author\'s Purpose / PIE) =====
    { id: 'thu-r-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 01 of 10',
      title: 'PIE — every writer has a reason',
      body: [
        'Every author writes for a reason. Three big ones cover almost everything you\'ll ever read. Easy to remember because they spell <strong>PIE</strong>:',
        '<strong>P — Persuade.</strong> Try to change your mind. (Ads. Speeches. Opinion essays.)',
        '<strong>I — Inform.</strong> Tell you facts. (Textbooks. News articles. Wikipedia.)',
        '<strong>E — Entertain.</strong> Make you feel something. (Novels. Comic books. Most movies.)',
        'Once you can name the purpose, you read smarter — you know what the author is doing to you.'
      ],
      typedCheck: { q: 'What do the three letters in PIE stand for? Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'thu-w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 10',
      title: 'What is a how-to?',
      body: [
        'A <strong>how-to</strong> (also called procedural writing) tells the reader EXACTLY how to do something. Step by step. In order. So they can do it themselves.',
        'Examples: recipe ("how to make pancakes"), assembly instructions ("how to build the IKEA shelf"), a tutorial ("how to draw a dragon"), an explainer ("how to tie a bowtie").',
        'It\'s the most USEFUL kind of writing in real life. Every job uses it. Every parent uses it. Every YouTuber making a tutorial is doing it.'
      ],
      typedCheck: { q: 'What is the goal of a how-to piece of writing? What does the reader learn? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'thu-m-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 01 of 10',
      title: 'What is a ratio?',
      body: [
        'A <strong>ratio</strong> compares two amounts. "For every X of THIS, there are Y of THAT."',
        '"There are 2 cookies for every 3 kids." That\'s a ratio.',
        '"3 cups of flour for every 2 cups of sugar." That\'s a ratio.',
        '"5 wins for every 1 loss." That\'s a ratio.',
        'Whenever you say "for every... there are..." — you\'re using a ratio.'
      ],
      typedCheck: { q: 'What does a ratio compare? Give one example. Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'thu-k-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Maker', tag: 'Maker · 01 of 10',
      title: 'What is soldering?',
      body: [
        '<strong>Soldering</strong> is how you permanently join two pieces of metal — usually wires or component leads — using a soft metal called solder that melts at a low temperature.',
        'You touch a hot soldering iron to the joint, feed in a little solder, the solder melts and flows, and when it cools it forms a solid metal bond between the parts.',
        'It\'s the difference between "wires touching each other" (fragile) and "wires actually joined" (permanent and conductive). Soldering is the single biggest unlock in electronics.'
      ],
      typedCheck: { q: 'What does soldering do to two pieces of metal? Use the word "melt" or "bond" somewhere. Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'thu-r-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 02 of 10',
      title: 'P — Persuade',
      body: [
        '<strong>Persuasive writing</strong> wants you to think, feel, or do something different by the end.',
        'Signs: strong opinions stated as facts. Words like "should," "must," "the best." Emotional examples. A clear call to action at the end.',
        'Where you see it: ads, op-eds, election speeches, that one Amazon review that talked you into buying the wrong shoes.'
      ],
      typedCheck: { q: 'Name two clues that tell you a piece of writing is trying to PERSUADE you. Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'thu-w-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 02 of 10',
      title: 'The 4 parts of a how-to',
      body: [
        '<strong>1. Title.</strong> Clear: "How to make a paper airplane." Not clever.',
        '<strong>2. Materials.</strong> What does the reader need to gather before they start? List it ALL.',
        '<strong>3. Steps.</strong> Numbered. In order. One action per step.',
        '<strong>4. Result.</strong> One sentence saying what the reader should have at the end.',
        'That\'s the shape. Recipes, tutorials, manuals — same four parts every time.'
      ],
      typedCheck: { q: 'What are the four parts of a how-to, in order? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'thu-m-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 02 of 10',
      title: 'Three ways to write a ratio',
      body: [
        'Same ratio, three formats. Memorize them.',
        '<strong>Words:</strong> "2 to 3" (or "2 for every 3")',
        '<strong>Colon:</strong> "2:3" (read it: "2 to 3")',
        '<strong>Fraction:</strong> "2/3" (yes, ratios look like fractions — that\'s not a coincidence)',
        'All three mean the same thing. Pick the one that fits where you\'re writing.'
      ],
      typedCheck: { q: 'Write the ratio "5 to 4" in TWO different formats (colon and fraction). Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'thu-k-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Maker', tag: 'Maker · 02 of 10',
      title: 'Safety first — the rules',
      body: [
        'Soldering irons get to about <strong>700°F</strong>. They will burn you instantly. Take the safety stuff seriously.',
        '<strong>1. Adult present.</strong> Don\'t solder alone the first few times.',
        '<strong>2. Eye protection.</strong> Solder can pop and splatter. Glasses on.',
        '<strong>3. Ventilation.</strong> Open a window or use a fume extractor. Don\'t breathe the smoke.',
        '<strong>4. Hold by the plastic only.</strong> Never touch the metal tip with bare skin until it\'s fully cool.',
        '<strong>5. Stand the iron in its holder when not soldering.</strong> Never put it on the table.',
        '<strong>6. Tie back long hair</strong> and roll up sleeves.'
      ],
      typedCheck: { q: 'Name three safety rules for soldering and why each one matters. Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'thu-r-03', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 03 of 10',
      title: 'I — Inform',
      body: [
        '<strong>Informational writing</strong> exists to teach you facts about a topic. The author isn\'t trying to change your opinion; they\'re trying to grow your knowledge.',
        'Signs: lots of facts, numbers, dates. Headings and sections to organize information. Neutral tone — no strong opinions on either side.',
        'Where you see it: textbooks, science articles, Wikipedia, how-to guides, recipe steps, instruction manuals.'
      ],
      typedCheck: { q: 'How is the TONE of informational writing different from persuasive writing? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'thu-w-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 03 of 10',
      title: 'Teach it back — the 4 parts',
      prompt: 'In your own words, explain the 4 parts of a how-to. Then pick a how-to you\'ve used recently (recipe, video tutorial, instructions) and say if it had all four parts or what was missing.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-m-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Math', tag: 'Math · 03 of 10',
      title: 'Teach it back — what is a ratio?',
      prompt: 'In your own words, explain what a ratio is and what it does. Give one example of a ratio you\'d see in real life (sports, cooking, money, anything). Write your example in two formats.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-k-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Maker', tag: 'Maker · 03 of 10',
      title: 'Teach it back — the safety rules',
      prompt: 'In your own words, list the safety rules for soldering. Then say WHY each one matters — what bad thing could happen if you skipped it?',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-r-04', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Reading', tag: 'Reading · 04 of 10',
      title: 'Teach it back — explain PIE',
      prompt: 'In your own words, explain the PIE framework. Give one example of something written to Persuade, one to Inform, and one to Entertain. Use real examples (a movie, a textbook, an ad you saw).',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-w-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 04 of 10',
      title: 'The golden rule — one action per step',
      body: [
        'Bad: "Step 1: Get a piece of paper, fold it in half, then fold the corners down."',
        'Good: "Step 1: Get a piece of paper. Step 2: Fold it in half. Step 3: Fold both top corners down to the center crease."',
        'Why? Because if the reader skips ahead or loses their place, mashed-together steps are confusing. One step = one action.',
        'When in doubt, BREAK steps into smaller ones. Never combine.'
      ],
      typedCheck: { q: 'Why should each step in a how-to be just one action, not multiple? Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'thu-m-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 04 of 10',
      title: 'Order matters',
      body: [
        'Be careful — the ORDER of numbers in a ratio matters.',
        '"3 dogs to 2 cats" is 3:2.',
        '"3 cats to 2 dogs" is 3:2 ALSO — but it means a totally different thing.',
        'Always read the words FIRST. Then write the numbers in the same order.',
        '"For every 4 apples, there are 6 oranges" → apples first, oranges second → 4:6.'
      ],
      typedCheck: { q: 'Why does the order of the numbers in a ratio matter? Give an example. Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'thu-k-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Maker', tag: 'Maker · 04 of 10',
      title: 'The tools you need',
      body: [
        '<strong>Soldering iron</strong> — the hot pencil. Temperature-controlled is best.',
        '<strong>Solder</strong> — the wire-like metal you melt. Look for lead-free, "rosin core" type. (Avoid lead solder when learning — fumes are nastier.)',
        '<strong>Solder stand</strong> — where the hot iron rests when not in your hand.',
        '<strong>Wet sponge or brass coil</strong> — to clean the tip between joints.',
        '<strong>Safety glasses + ventilation.</strong>',
        '<strong>Helping hands</strong> (clamp with alligator clips) — holds your work so you have two free hands.',
        'You don\'t need a $200 kit. A $40 starter setup does fine.'
      ],
      typedCheck: { q: 'Name three tools you need to solder. What does each one do? Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'thu-r-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 05 of 10',
      title: 'E — Entertain',
      body: [
        '<strong>Entertaining writing</strong> wants you to feel something — laugh, gasp, cry, get lost in a world.',
        'Signs: characters, plot, dialogue, made-up scenes (or true scenes told dramatically). Vivid descriptions. Tension. Surprise.',
        'Where you see it: novels, comic books, song lyrics, sketches, most movie scripts. Sometimes informational stuff WANTS to feel entertaining — that\'s a mix.'
      ],
      typedCheck: { q: 'What\'s the writer trying to do when their purpose is ENTERTAIN? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'thu-w-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 05 of 10',
      title: 'Transition words — "first," "then," "after"',
      body: [
        'Good how-tos use <strong>transition words</strong> to make order clear. They tell the reader exactly where in the sequence you are.',
        'Starters: "First," "To begin," "Start by."',
        'Middles: "Next," "Then," "After that," "Now."',
        'Ends: "Finally," "Last," "When you\'re done."',
        'Sprinkle them in. Even if you also number the steps. Belt AND suspenders for clarity.'
      ],
      typedCheck: { q: 'Name three transition words and what part of the sequence they belong in (start/middle/end). Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'thu-m-05', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 05 of 10',
      title: 'Equivalent ratios',
      body: [
        'Just like fractions, ratios can be <strong>equivalent</strong> (the same value in different numbers).',
        '<strong>2:3</strong> = <strong>4:6</strong> = <strong>6:9</strong> = <strong>10:15</strong>.',
        'How? You multiplied (or divided) BOTH sides by the same number. 2×2=4 and 3×2=6 → 4:6. Same ratio, doubled.',
        'This trick is huge. If you have "3 cookies for every 4 kids" and 12 kids show up, you need 9 cookies (3×3 : 4×3). Same ratio, scaled up.'
      ],
      typedCheck: { q: 'If the ratio is 2:5 and you multiply both sides by 4, what\'s the equivalent ratio? Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'thu-k-05', kind: 'topic', type: 'concept', minutes: 5, subject: 'Maker', tag: 'Maker · 05 of 10',
      title: 'The basic technique',
      body: [
        'Step-by-step, the way pros teach it:',
        '<strong>1. Tin the tip.</strong> When the iron heats up, melt a tiny bit of solder onto the tip. It should look shiny silver.',
        '<strong>2. Touch the iron to BOTH parts.</strong> The wire AND the pad (or both wires). Heat them up for 1-2 seconds.',
        '<strong>3. Feed solder INTO the joint</strong> — not onto the iron. The hot parts melt the solder.',
        '<strong>4. Remove solder first, then the iron.</strong> Let the joint cool without moving it (3-5 seconds).',
        '<strong>5. Clean the tip on the sponge.</strong> Repeat for the next joint.'
      ],
      typedCheck: { q: 'In step 3 of soldering, do you feed solder onto the iron or into the joint? Why? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'thu-r-06', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Reading', tag: 'Reading · 06 of 10',
      title: 'Type PIE — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Persuade, Inform, Entertain.',
      reps: 3, cta: 'Done' },

    { id: 'thu-w-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Writing', tag: 'Writing · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'One action per step. Use transition words to show the order.',
      reps: 3, cta: 'Done' },

    { id: 'thu-m-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Math', tag: 'Math · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'A ratio compares two amounts for every fixed group.',
      reps: 3, cta: 'Done' },

    { id: 'thu-k-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Maker', tag: 'Maker · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Heat the joint, feed solder into the joint, then remove the iron.',
      reps: 3, cta: 'Done' },

    { id: 'thu-r-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 07 of 10',
      title: 'A piece can have more than one purpose',
      body: [
        'Most things you read AREN\'T just one purpose. They mix.',
        'A nature documentary informs you (facts about lions) AND entertains you (dramatic music, slow-mo chases).',
        'A news article informs you (what happened) BUT a few of them quietly persuade you (which side they make sound better).',
        'A novel entertains you (story) BUT also persuades you to think about something the author cares about.',
        'When you read smart, ask: "what\'s the MAIN purpose, and is there a SECOND purpose hiding in there?"'
      ],
      typedCheck: { q: 'Give one example of a piece of media (movie, show, article) that has TWO purposes mixed. Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'thu-w-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 07 of 10',
      title: 'Use "you" and present tense',
      body: [
        'How-tos always talk directly to the reader: "you," "your." Not "the person," not "someone."',
        'And they\'re in present tense — as if the reader is doing it RIGHT NOW.',
        '<strong>Wrong:</strong> "The student should have folded the paper."',
        '<strong>Right:</strong> "Fold the paper in half. You should see two equal halves."',
        'Direct. Present-tense. Like you\'re standing next to them coaching it.'
      ],
      typedCheck: { q: 'Why use "you" and present tense in a how-to? What\'s the feel? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'thu-m-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 07 of 10',
      title: 'Ratios in everyday life',
      body: [
        'Ratios are everywhere once you see them.',
        '<strong>Recipes:</strong> 1 cup rice to 2 cups water (1:2).',
        '<strong>Sports:</strong> A team\'s record. 8 wins, 2 losses → 8:2 = 4:1 (simplified).',
        '<strong>Money:</strong> Exchange rates. 1 US dollar = about 19 Mexican pesos (1:19).',
        '<strong>Mixing:</strong> Paint that says "2 parts blue to 1 part white" (2:1).',
        'Try spotting three of these in your day today.'
      ],
      typedCheck: { q: 'Name two places ratios show up in everyday life, not from school. Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'thu-k-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Maker', tag: 'Maker · 07 of 10',
      title: 'What a good joint looks like',
      body: [
        'After it cools, look at the joint. A GOOD solder joint is:',
        '<strong>Shiny.</strong> Silver, not dull gray.',
        '<strong>Smooth.</strong> Even surface, no spikes or bumps.',
        '<strong>Volcano-shaped.</strong> Flows from the wire down to the pad like a tiny hill.',
        'BAD signs: dull (cold joint), ball-shaped (didn\'t flow), too much solder (a blob), or too little (gap visible). Bad joints break later. Redo them.'
      ],
      typedCheck: { q: 'Name two visual signs of a GOOD solder joint and one sign of a BAD one. Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'thu-r-08', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Reading', tag: 'Reading · 08 of 10',
      title: 'Practice — identify the purpose',
      prompt: 'Pick any three things you\'ve read or watched in the last week (a book, a YouTube video, a TikTok, an article, a sign, a text — anything). For each one, name the PRIMARY purpose (P, I, or E) and explain one clue that tells you so.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-w-08', kind: 'topic', type: 'teach-back', minutes: 10, subject: 'Writing', tag: 'Writing · 08 of 10',
      title: 'Write a real how-to',
      prompt: 'Pick something you can actually do. Tying shoes, making a sandwich, opening Roblox Studio, anything. Write a real how-to. Include all 4 parts: Title, Materials (if any), Steps (numbered, one action each), Result. Use at least 3 transition words. Aim for 5-8 steps total.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-m-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Math', tag: 'Math · 08 of 10',
      title: 'Solve and explain',
      prompt: 'Problem: A smoothie recipe says "2 cups of milk for every 3 bananas." You\'re making a bigger batch with 9 bananas. How much milk do you need? Show your work step by step. Use equivalent ratios to solve it. Then explain in one sentence why your method works.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-k-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Maker', tag: 'Maker · 08 of 10',
      title: 'Common mistakes',
      body: [
        '<strong>1. Cold joint.</strong> You didn\'t heat the parts long enough. Solder looks dull and bumpy. Wires can come loose.',
        '<strong>2. Too much solder.</strong> Looks like a blob. Can short-circuit nearby joints. Use less next time.',
        '<strong>3. Solder bridge.</strong> Accidentally connecting two joints that shouldn\'t be connected. Use a solder sucker or wick to remove.',
        '<strong>4. Burning the part.</strong> Held the iron on too long. Always feed and remove fast — joint heats in seconds.',
        '<strong>5. Forgetting to clean the tip.</strong> A dirty tip won\'t transfer heat well. Wipe it on the sponge between joints.'
      ],
      typedCheck: { q: 'Pick ONE common mistake and explain how to avoid it. Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'thu-r-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 09 of 10',
      title: 'Why knowing the purpose matters',
      body: [
        'When you know what an author is trying to do TO you, you can defend yourself.',
        'Persuasive writing? Stay alert — they\'re trying to get you to agree with them. Are their reasons solid, or are they playing on your feelings?',
        'Informational? Trust the facts but check if they\'re from a real source.',
        'Entertaining? Enjoy it — but don\'t take its made-up world as the real one.',
        'Without naming the purpose, you can\'t do any of that. PIE gives you a thinking tool for everything you\'ll ever read.'
      ],
      typedCheck: { q: 'Why is it useful to know an author\'s PURPOSE before you take their writing seriously? Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'thu-w-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 09 of 10',
      title: 'Test your how-to on someone',
      body: [
        'Real test: hand your how-to to someone who DOESN\'T know how to do the thing. Watch them try to follow it. Don\'t help.',
        'Every place they get confused = a step you missed or wrote badly. Every place they had to guess = something you forgot to mention.',
        'Pro writers always test their how-tos this way. The reader IS the test.'
      ],
      typedCheck: { q: 'How do you really know if your how-to is clear enough? What\'s the test? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'thu-m-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 09 of 10',
      title: 'Ratios → rates → unit rates',
      body: [
        'A <strong>rate</strong> is a special kind of ratio comparing two DIFFERENT units. "60 miles in 1 hour" (miles per hour).',
        'A <strong>unit rate</strong> is a rate where the second number is 1. "60 miles per 1 hour" → 60 mph.',
        'Unit rates are super useful because they make comparison easy. Two cars: one goes "150 miles in 3 hours" (50 mph). The other goes "180 miles in 4 hours" (45 mph). The first car\'s faster — easy to see in unit rate, harder to see in raw ratio.'
      ],
      typedCheck: { q: 'What\'s the difference between a rate and a unit rate? Why is a unit rate useful? Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'thu-k-09', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Maker', tag: 'Maker · 09 of 10',
      title: 'Plan YOUR first solder project',
      prompt: 'Imagine you\'re about to solder for the first time. Type out: (1) what safety gear you\'ll have, (2) what tools you\'ll need, (3) the five-step technique in order, (4) what a good joint looks like when you\'re done. Be specific — you should be able to use this list as your own checklist before touching the iron.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'thu-r-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 10 of 10',
      title: 'Lock it in — Reading done',
      body: [
        'You know PIE now. Persuade, Inform, Entertain. Plus the trick: some things mix.',
        'Practice this week: every time you read anything substantial, name the purpose first. 10 seconds of naming saves you from being tricked.'
      ],
      typedCheck: { q: 'What\'s the 10-second move to make every time you read something substantial? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Done' },

    // ===== SUBJECT 2 — WRITING (How-To / Procedural) =====
    { id: 'thu-w-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 10 of 10',
      title: 'Lock it in — Writing done',
      body: [
        'You learned the 4 parts (title, materials, steps, result), the one-action-per-step rule, transition words, and the "you + present tense" voice.',
        'Try this: this week, teach someone in your house something using a how-to YOU wrote. Watch them follow it. You\'ll instantly see what to fix.'
      ],
      typedCheck: { q: 'What\'s ONE skill you\'ll write a how-to about and test on someone this week? Push past your first answer. The real answer comes after that.' },
      cta: 'Done' },

    // ===== SUBJECT 3 — MATH (Ratios) =====
    { id: 'thu-m-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 10 of 10',
      title: 'Lock it in — Math done',
      body: [
        'You\'ve got ratios (compare two amounts), three formats (words, colon, fraction), equivalent ratios (multiply both sides), and the leap into rates and unit rates.',
        'This is the foundation of a TON of 7th-grade math: proportions, percentages, scaling, even some algebra. Get it solid now, save yourself headaches later.'
      ],
      typedCheck: { q: 'Where in your life this week will you go look for a real ratio? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Done' },

    // ===== SUBJECT 4 — MAKER (Soldering Basics) =====
    { id: 'thu-k-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Maker', tag: 'Maker · 10 of 10',
      title: 'Lock it in — Maker done',
      body: [
        'You know the theory: what soldering is, the safety rules, the tools, the technique, the good/bad joint signs, and the common mistakes.',
        'Next step is hands-on with an adult. Get a $40 starter kit (try MakerHart or any beginner kit on Amazon). Practice on scrap wire before any real project.',
        'Once you can solder, every electronics project — Arduino, Raspberry Pi, custom Roblox controllers, anything — opens up to you.'
      ],
      typedCheck: { q: 'What\'s your next step toward actually getting to solder for the first time? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Done' },

    { id: 'report-card-thu', kind: 'drill', type: 'report-card', title: 'Thursday — show Mom & Dad', minutes: 2 }
  ]
};
