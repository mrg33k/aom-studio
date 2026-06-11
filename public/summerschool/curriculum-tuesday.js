/* Summer School — TUESDAY curriculum (built 2026-05-30 for week of 2026-06-08)
 *
 * REPLACES the prior Tuesday (Spine Words / multiple-choice / 48-block) which
 * Ethan completed week-of 2026-05-26. This week (2026-06-08) Tuesday switches
 * to the Friday-style teach-back structure.
 *
 * 46 blocks. Same structure as Friday/Monday: welcome + 4 kickoffs +
 * 10 modules × 4 subjects + report-card. Block IDs prefixed "tue-".
 *
 * Theme: "BUILD SOMETHING" — turning what you know into things that exist.
 *   Reading       → Speed-Read trick (word chunking + the pointer)
 *   Writing       → The Hook (great opening sentences)
 *   Math          → Fractions ↔ Decimals (a fraction is just division)
 *   Roblox Coding → Strings + concatenation (continuing Lua from Friday)
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.tuesday = {
  weekOf: '2026-06-08',
  day: 'tuesday',
  theme: 'BUILD SOMETHING',
  themeDesc: 'Turn what you\'re learning into something that exists. Read faster, write a hook, convert fractions, write Lua that talks back.',
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 2 — Tuesday',
    showParentNote: true,
    bullets: [
      "<strong>Reading — Speed Read.</strong> Stop reading word-by-word. Today you learn to chunk 2-3 words at a time. Done right, your reading speed doubles within a week.",
      "<strong>Writing — The Hook.</strong> The first sentence is the whole game. Today you study what makes a great hook and write three of your own.",
      "<strong>Math — Fractions to Decimals.</strong> A fraction is just a division problem in disguise. Once you see it, conversions stop being scary forever.",
      "<strong>Roblox Coding — Strings &amp; Concatenation.</strong> You typed print(\"hello world\") on Friday. Today you learn the two-dot trick that lets your code talk to whoever\'s playing."
    ],
    howItWorks: "Same rule. Every block ends with you typing. Spell-check catches misspelled words. Read your answer, send it to Mom & Dad. No clicking past."
  },

  typingTarget: 'I will build something today, not just consume it.',

  tileVocab: [
    { word: 'chunk',         clue: 'A small group, taken together as one' },
    { word: 'pointer',       clue: 'Something you use to guide your eyes' },
    { word: 'hook',          clue: 'The first line that grabs the reader' },
    { word: 'fraction',      clue: 'A number written as one over another (like 1/2)' },
    { word: 'decimal',       clue: 'A number with a dot, like 0.5' },
    { word: 'concatenation', clue: 'Joining strings together end-to-end' }
  ],

  blocks: [
    // ===== INTERLEAVED ORDER =====
    // welcome → 4 kickoff videos (reading/writing/math/4th)
    //         → round-robin 10 rotations
    //         → report card
    // Total: 1 + 4 + 40 + 1 = 46 blocks.

    { id: 'welcome-tue', kind: 'drill', type: 'welcome', title: 'Welcome to Tuesday', minutes: 2 },

    // ===== KICKOFF VIDEOS =====
    { id: 'tue-r-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Reading', tag: 'Reading · Kickoff video',
      title: 'Kickoff video — Become a Speed Reader in 10 Minutes',
      video: { title: 'Become a Speed Reader in 10 Minutes', ytId: 'KUpLxO7wJU4', creditLine: 'Jim Kwik' },
      typedQuestions: [
        { q: 'What\'s ONE specific speed-reading technique Jim Kwik showed? Describe it in your own words. Write until you feel like you really explained it -- do not stop at your first thought.' },
        { q: 'What does "sub-vocalization" mean and why does it slow you down? Use the words "inner voice" somewhere. Keep going until you have said everything that matters -- your first answer is probably not enough.' }
      ],
      cta: 'Done' },

    { id: 'tue-w-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Writing', tag: 'Writing · Kickoff video',
      title: 'Kickoff video — How to Write a Narrative Hook',
      video: { title: 'How to Write a Narrative Hook for Middle School (grades 4 & 5)', ytId: '7y4WzgfrrNo', creditLine: 'Write with Robin' },
      typedQuestions: [
        { q: `What is a "hook" in writing, in your own words? Why does the first line matter so much? Say everything you know about this -- don't stop when you think you're done.` },
        { q: 'Name two of the hook TYPES she showed. (Like: starting with action, asking a question, surprising fact, etc.) Pick the two you\'d most want to use. Write until it is complete. Your first sentence is not the answer.' }
      ],
      cta: 'Done' },

    { id: 'tue-m-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Math', tag: 'Math · Kickoff video',
      title: 'Kickoff video — Rewriting a Fraction as a Decimal',
      video: { title: 'Basic example of rewriting a fraction as a decimal — Decimals — Pre-Algebra', ytId: 'XHLgY7Z3cb8', creditLine: 'Khan Academy' },
      typedQuestions: [
        { q: `What\'s the basic move for converting a fraction to a decimal, the way the video showed? Don't stop at one sentence. Keep explaining until there is nothing left to say.` },
        { q: 'Try it: convert 3/5 to a decimal. Show the steps the way the video would. Be thorough -- write until you have actually said what you mean.' }
      ],
      cta: 'Done' },

    { id: 'tue-c-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Roblox Coding', tag: 'Coding · Kickoff video',
      title: 'Kickoff video — Strings and Concatenation in Roblox Lua',
      video: { title: 'Roblox Scripting: Strings and Concatenation! Very Easy! (Learning Lua Part: 6)', ytId: 'LwbBbBrqlaE', creditLine: 'RoGuruu' },
      typedQuestions: [
        { q: 'What is concatenation? What symbol does Lua use to do it? Push past your first answer. The real answer comes after that.' },
        { q: 'Why is concatenation useful in a Roblox game? Give one example of where you\'d need it. Write until you feel like you really explained it -- do not stop at your first thought.' }
      ],
      cta: 'Done' },

    // ===== SUBJECT 1 — READING (Speed-Read) =====
    { id: 'tue-r-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 01 of 10',
      title: 'What is speed reading?',
      body: [
        '<strong>Speed reading</strong> is exactly what it sounds like — reading faster than you usually do — but with a catch. The goal isn\'t just speed. The goal is speed PLUS comprehension. Reading 3x faster but understanding nothing is worse than slow reading.',
        'Real speed reading uses tricks to make your EYES move faster while your BRAIN keeps up. Word chunking. A pointer. Cutting out the inner voice that reads everything out loud in your head.',
        'Once you can do it, you can read a chapter in the time most kids read a page. School gets way easier.'
      ],
      typedCheck: { q: 'What\'s the catch with speed reading? Comprehension matters how much? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'tue-w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 10',
      title: 'What is a hook?',
      body: [
        'A <strong>hook</strong> is the first sentence (or two) of anything you write. Its only job is to make the reader want the next sentence.',
        'You\'ve got about 8 seconds. If the opening doesn\'t catch them, they\'re gone — closed the book, scrolled past, clicked away.',
        'A great hook respects the reader. It doesn\'t waste their time with throat-clearing. It throws them into something interesting from word one.'
      ],
      typedCheck: { q: `What is a hook? What\'s its only job? Say everything you know about this -- don't stop when you think you're done.` },
      cta: 'Got it' },

    { id: 'tue-m-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 01 of 10',
      title: 'A fraction is just a division problem',
      body: [
        'Big idea that almost nobody teaches: <strong>every fraction is just division.</strong>',
        '<strong>1/2</strong> means "1 divided by 2." Do that division: 1 ÷ 2 = 0.5. So 1/2 = 0.5.',
        '<strong>3/4</strong> means "3 divided by 4." 3 ÷ 4 = 0.75. So 3/4 = 0.75.',
        'Once you see this, converting any fraction to a decimal is just doing the division it was hiding.'
      ],
      typedCheck: { q: 'What does the fraction 1/2 actually mean as a division problem? Show the answer. Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'tue-c-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 01 of 10',
      title: 'Strings — quick recap',
      body: [
        'On Friday you learned: a <strong>string</strong> is text wrapped in quotes. <code>"Ethan"</code>, <code>"hello world"</code>, <code>"score is 10"</code> — all strings.',
        'Strings are how your code talks to players: chat messages, leaderboard labels, tooltip text, anything readable.',
        'Today\'s new trick is joining strings together. Two strings → one bigger string. That\'s called <strong>concatenation</strong>. Big word, easy concept.'
      ],
      typedCheck: { q: `What is a string in Lua? What goes around it? Don't stop at one sentence. Keep explaining until there is nothing left to say.` },
      cta: 'Got it' },

    { id: 'tue-r-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Reading', tag: 'Reading · 02 of 10',
      title: 'Word chunking — read groups, not single words',
      body: [
        'Your eyes can see way more than one word at a time. Most readers fix on ONE word, then jump to the next, then the next. That\'s slow.',
        '<strong>Chunking</strong> is reading 2-3 words as one group: "the small dog" — one chunk. "ran across the yard" — one chunk. Same paragraph, half the eye-jumps.',
        'It feels weird at first. Words come at you faster than you can "say them in your head." That\'s actually the point — you\'re finally reading at the speed your brain can think.'
      ],
      typedCheck: { q: 'What does word chunking mean? How many words do you read at a time? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'tue-w-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 02 of 10',
      title: 'Why hooks matter — the 8 seconds rule',
      body: [
        'Studies show: when people start reading something new, they decide within about 8 seconds whether to keep going. Eight. Seconds.',
        'So the first sentence is the entire game. Get them past it and you\'ve earned 8 more seconds for the second sentence. And so on, until you\'ve earned the whole thing.',
        'This is true for stories, essays, emails, text messages. People have always been impatient. They\'re just more impatient now.'
      ],
      typedCheck: { q: 'How long do you have to hook a reader, according to most studies? Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'tue-m-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 02 of 10',
      title: '1/2 = 0.5 — the most basic conversion',
      body: [
        'Half of anything is 0.5 of it. Half a dollar = $0.50. Half a pizza = 0.5 pizzas. Half a day = 0.5 days (12 hours).',
        'When you see "1/2" in a math problem and need a decimal, write 0.5. Instant. No calculator.',
        'This one\'s the foundation. The other fast facts (1/4, 1/5, 1/10) are built off it.'
      ],
      typedCheck: { q: 'If you have half a pizza, what\'s that as a decimal? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'tue-c-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 02 of 10',
      title: 'The two-dot operator (..)',
      body: [
        'Lua uses <strong>two dots (..)</strong> to glue strings together. That\'s it. Two dots. Nothing fancier.',
        '<code>"Hello" .. "World"</code> → <code>"HelloWorld"</code> (no space — see what happened? the dots glue exactly).',
        '<code>"Hello " .. "World"</code> → <code>"Hello World"</code> (notice the space inside the first string).',
        'The dots don\'t add anything between the strings. Whatever you want in between has to be IN one of the strings.'
      ],
      typedCheck: { q: 'What does .. (two dots) do in Lua? What happens if you forget a space between the words? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'tue-r-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Reading', tag: 'Reading · 03 of 10',
      title: 'Teach it back — what is word chunking?',
      prompt: 'In your own words, explain what word chunking is and why it makes you read faster. Give one example of a chunk (like "the small dog" or "ran across the yard").',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-w-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 03 of 10',
      title: 'Teach it back — why does the hook matter?',
      prompt: 'Explain in your own words what a hook is and why the first sentence matters more than the others. Use the word "seconds" or "reader" somewhere.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-m-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Math', tag: 'Math · 03 of 10',
      title: 'Teach it back — why does 1/2 equal 0.5?',
      prompt: 'Explain in your own words why 1/2 = 0.5. Use the words "division" and "half" somewhere in your answer.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-c-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Roblox Coding', tag: 'Coding · 03 of 10',
      title: 'Teach it back — what is concatenation?',
      prompt: 'In your own words, explain what concatenation is and how Lua does it. Use the word "string" somewhere and mention the two-dot operator.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-r-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 04 of 10',
      title: 'Use a pointer to drag your eyes',
      body: [
        'Your eyes wander. They drift back to re-read words you already saw. That \"backwards drift\" alone slows readers by about 30%.',
        'Fix: use your finger (or a pen, or your cursor on a screen) as a <strong>pointer</strong>. Drag it under the line you\'re reading, just slightly faster than feels comfortable. Your eyes will follow.',
        'Sounds ridiculous. Looks weird. Works in about 60 seconds. Try it on the next page you read.'
      ],
      typedCheck: { q: `Why does using a pointer help? What does it stop your eyes from doing? Say everything you know about this -- don't stop when you think you're done.` },
      cta: 'Got it' },

    { id: 'tue-w-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 04 of 10',
      title: 'Hook Type 1 — start in the middle of action',
      body: [
        'Don\'t set up the scene. Don\'t explain who everyone is. Just <strong>drop the reader into something happening</strong>.',
        '"The bus was on fire when I got on." — there\'s no introduction. Something\'s already wrong, and you have to know what.',
        '"I had three minutes to find the key before the door locked." — clock\'s already ticking. We don\'t even know the kid\'s name yet, doesn\'t matter.',
        'Action hooks work because they raise questions the reader needs answered.'
      ],
      typedCheck: { q: 'What does an "action hook" do? What does it NOT do? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'tue-m-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 04 of 10',
      title: 'The fast facts',
      body: [
        'Memorize these four. They cover most everyday fractions.',
        '<strong>1/2 = 0.5</strong><br><strong>1/4 = 0.25</strong> (a quarter — like 25¢)<br><strong>1/5 = 0.2</strong> (one fifth)<br><strong>1/10 = 0.1</strong> (one tenth)',
        'Once you know these, you can build others. 3/4 = 0.75 (three quarters). 2/5 = 0.4 (two fifths). 7/10 = 0.7 (seven tenths). Same recipe.'
      ],
      typedCheck: { q: `What\'s 3/4 as a decimal? How did you figure it out from the fast facts? Don't stop at one sentence. Keep explaining until there is nothing left to say.` },
      cta: 'Got it' },

    { id: 'tue-c-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 04 of 10',
      title: 'Joining a variable with a string',
      body: [
        'This is where concatenation gets useful. You can glue a variable\'s VALUE onto a fixed string.',
        '<code>local name = "Ethan"</code><br><code>print("Hello, " .. name)</code> → shows: <em>Hello, Ethan</em>',
        'Notice: "Hello, " has the comma AND a space at the end. Then the variable\'s value (the word Ethan) gets glued on.',
        'Now imagine a Roblox game with 100 players. Each one sees: <em>Hello, [their own name]</em>. One line of code, personalized for everyone.'
      ],
      typedCheck: { q: 'In <code>"Hello, " .. name</code>, why does the first string end with a comma and space? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'tue-r-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 05 of 10',
      title: 'Stop the inner voice (sub-vocalization)',
      body: [
        'When you read, do you "say" each word in your head? That\'s called <strong>sub-vocalization</strong>. Almost everyone does it. It\'s also the single biggest thing keeping you slow.',
        'Why? Because your inner voice can only say about 200 words per minute. But your EYES can scan over 1000 words per minute. The voice is the bottleneck.',
        'The fix: read so fast the voice gives up trying to keep up. Your eyes see the words, your brain understands them, no voice involved. Takes a week of practice.'
      ],
      typedCheck: { q: 'What is sub-vocalization? Why does it slow you down? Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'tue-w-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 05 of 10',
      title: 'Hook Type 2 — ask a question',
      body: [
        'A good opening question makes the reader\'s brain start working before they even know it.',
        '"Have you ever wondered why the sky turns red right before a storm?" — now they\'re curious.',
        '"Where\'s Papa going with that ax?" — the opening line of Charlotte\'s Web. That one question hooks generations of kids.',
        'The trick: the question has to be one the reader actually wants the answer to. "Have you ever heard of plants?" is bad. "Why do houseplants sometimes scream?" is great.'
      ],
      typedCheck: { q: 'What makes a question-hook actually work? Use the word "curious" or "answer". Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'tue-m-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 05 of 10',
      title: 'Convert ANY fraction — top divided by bottom',
      body: [
        'For fractions that AREN\'T in the fast-fact list, you do the actual division: <strong>top number divided by bottom number.</strong>',
        '<strong>3/8</strong> = 3 ÷ 8 = 0.375. (Three eighths.)',
        '<strong>5/8</strong> = 5 ÷ 8 = 0.625. (Five eighths.)',
        '<strong>7/16</strong> = 7 ÷ 16 = 0.4375.',
        'Use long division or a calculator. Either way, the recipe is the same: top divided by bottom.'
      ],
      typedCheck: { q: 'How do you convert ANY fraction to a decimal? What\'s the recipe? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'tue-c-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 05 of 10',
      title: 'The spaces problem',
      body: [
        'New coders trip on this constantly: spaces don\'t magically appear when you concatenate.',
        '<code>"Score is" .. 10</code> → <em>Score is10</em> (looks broken, right?)',
        '<code>"Score is " .. 10</code> → <em>Score is 10</em> (one extra space inside the quotes — fixed).',
        'Rule of thumb: when joining, look at the END of the left string and the START of the right one. If there\'s no space, your output will have no space.'
      ],
      typedCheck: { q: `Where does the space have to go to make the joined string look right? Say everything you know about this -- don't stop when you think you're done.` },
      cta: 'Got it' },

    { id: 'tue-r-06', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Reading', tag: 'Reading · 06 of 10',
      title: 'Type it — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'I read in chunks, not one word at a time.',
      reps: 3, cta: 'Done' },

    { id: 'tue-w-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 06 of 10',
      title: 'Hook Type 3 — surprising fact',
      body: [
        'A surprising fact makes the reader\'s brain stop. "Wait, what?" Now they have to read on to find out if you\'re messing with them.',
        '"Octopuses have three hearts and blue blood." Cool — you\'d keep reading.',
        '"More people are killed by cows every year than by sharks." Surprising — you\'re curious now.',
        'Find a real thing about your topic that almost nobody knows. Lead with that.'
      ],
      typedCheck: { q: 'Why does a surprising fact work as a hook? What does it make the reader do? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'tue-m-06', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Math', tag: 'Math · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'A fraction is just a division problem.',
      reps: 3, cta: 'Done' },

    { id: 'tue-c-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 06 of 10',
      title: 'Type it exactly — three times perfect',
      prompt: 'Three times in a row. Code is unforgiving: the quotes, the comma+space, and the two dots all matter.',
      target: 'print("Hello, " .. name)',
      reps: 3, cta: 'Done' },

    { id: 'tue-r-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 07 of 10',
      title: 'When to speed-read — and when NOT to',
      body: [
        'Speed reading works great for: textbook chapters, news articles, blog posts, anything where you mostly need the gist.',
        'Speed reading is BAD for: poetry (sound matters), novels you\'re reading for fun (the prose IS the point), math problems (one missed word and you solve the wrong thing), and code (every character matters).',
        'Smart readers shift speed based on what they\'re reading. Fast for skimming a 30-page reading assignment. Slow for the part the teacher said would be on the test.'
      ],
      typedCheck: { q: `Name one type of reading speed-reading is NOT good for. Why? Don't stop at one sentence. Keep explaining until there is nothing left to say.` },
      cta: 'Got it' },

    { id: 'tue-w-07', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Writing', tag: 'Writing · 07 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'The first sentence has to make you keep reading.',
      reps: 3, cta: 'Done' },

    { id: 'tue-m-07', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 07 of 10',
      title: 'Worked example — 3/8 step by step',
      body: [
        'Convert 3/8 to a decimal. Here\'s the long division version.',
        '3 ÷ 8 = ? Since 8 doesn\'t go into 3, write 0. then keep going.',
        'Add a decimal and a zero. 30 ÷ 8 = 3 (because 8 × 3 = 24). Carry the remainder: 30 - 24 = 6.',
        'Add another zero. 60 ÷ 8 = 7 (because 8 × 7 = 56). Remainder 4.',
        'Add another zero. 40 ÷ 8 = 5. No remainder. Done.',
        '<strong>3/8 = 0.375.</strong>',
        'You\'ll do this without thinking after about 10 reps.'
      ],
      typedCheck: { q: 'What did the worked example get for 3/8? Walk through one step of the long division. Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'tue-c-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 07 of 10',
      title: 'Multiple .. in one line',
      body: [
        'You can chain as many .. as you want in a single line.',
        '<code>print("Player " .. name .. " has " .. score .. " points")</code>',
        'If name = "Ethan" and score = 42, that prints: <em>Player Ethan has 42 points</em>',
        'Three .. in one line, four strings/variables joined. Lua reads them left to right and glues each piece on.'
      ],
      typedCheck: { q: 'How many .. operators are in <code>"Player " .. name .. " has " .. score</code> and how many pieces does that join? Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'tue-r-08', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Reading', tag: 'Reading · 08 of 10',
      title: 'Try it — speed-read this passage',
      prompt: 'Use a pointer (finger on screen) and chunk this paragraph. Move slightly faster than feels comfortable. "Honeybees can recognize human faces. Scientists discovered that bees, despite having tiny brains with fewer than a million neurons, can distinguish one human face from another. They use the same general technique humans do — combining features like the eyes, nose, and mouth into a pattern. This means insects, which most people think of as simple, can do something most computers still struggle with." — Now type ONE sentence summarizing what it said. Be fast.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-w-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Writing', tag: 'Writing · 08 of 10',
      title: 'Write 3 different hooks for the same story idea',
      prompt: 'Story idea: A kid finds a key in the woods that opens a locked door nobody noticed before. Write THREE different opening hooks for this story: one using action, one using a question, one using a surprising fact. One sentence each. Make them different.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-m-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Math', tag: 'Math · 08 of 10',
      title: 'Teach it back — convert 7/10 and 3/4',
      prompt: 'Convert BOTH 7/10 and 3/4 to decimals. Show your work for each — don\'t just write the answer. Then say in one sentence why both of these can be done from the fast-facts table without long division.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-c-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 08 of 10',
      title: 'Numbers in strings — Lua handles it',
      body: [
        'Some languages won\'t let you mix numbers and strings without converting. Lua is friendly: it converts numbers to strings automatically when you concatenate.',
        '<code>local score = 42</code><br><code>print("Score: " .. score)</code> → <em>Score: 42</em>',
        'Lua sees the .. and quietly turns the number 42 into the string "42" so it can be glued on. You don\'t have to do anything special.',
        '(If you want to be explicit about it, use <code>tostring(score)</code> — but for normal use, just do the .. and trust Lua.)'
      ],
      typedCheck: { q: 'Does Lua make you manually convert a number to a string before joining it? What does it do for you? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'tue-r-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 09 of 10',
      title: 'Practice — 5 minutes a day',
      body: [
        'Speed reading is a muscle. You build it by reading slightly faster than feels comfortable, every day, for short bursts.',
        '<strong>The drill:</strong> Pick a paragraph. Read it once at normal speed. Read it AGAIN faster, using a pointer. Then a third time, faster still. The third read is your training speed.',
        '5 minutes a day for two weeks and your reading rate doubles. Most adults never bother. You\'d have an advantage forever.'
      ],
      typedCheck: { q: 'How long do you need to practice speed reading each day to get faster? For how many weeks? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'tue-w-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 09 of 10',
      title: 'Famous hooks worth studying',
      body: [
        '<em>"Where\'s Papa going with that ax?"</em> — Charlotte\'s Web. Question hook. You can\'t un-hear it.',
        '<em>"It was a bright cold day in April, and the clocks were striking thirteen."</em> — 1984. Surprising fact (13 strikes?) + intriguing setting.',
        '<em>"Call me Ishmael."</em> — Moby Dick. Action + directness. Five words. Goes hard.',
        'Read the first line of any book you love. Then ask: what TYPE of hook is it doing? You\'ll start spotting the pattern.'
      ],
      typedCheck: { q: `Pick one of these famous hooks. What type is it (action, question, or surprising fact)? Say everything you know about this -- don't stop when you think you're done.` },
      cta: 'Got it' },

    { id: 'tue-m-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 09 of 10',
      title: 'Real life — money is mostly fractions in decimal form',
      body: [
        'Money is the easiest place to see fractions and decimals as the same thing.',
        '<strong>$0.25 = a quarter = 1/4 of a dollar.</strong> Quarter, twenty-five cents, 0.25 — all the same number.',
        '<strong>$0.50 = half a dollar = 1/2.</strong>',
        '<strong>$0.75 = three quarters = 3/4.</strong>',
        'Next time you see a price tag, do the fraction in your head. $2.75 = 2 and 3/4 dollars. You already know all of this; you just didn\'t know you knew it.'
      ],
      typedCheck: { q: 'A quarter is $0.25. What fraction of a dollar is it? Connect the decimal to the fraction. Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'tue-c-09', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Roblox Coding', tag: 'Coding · 09 of 10',
      title: 'Teach it back — write a Roblox welcome message',
      prompt: 'Write the Lua code for a welcome message in a Roblox game. It should: store a player name in a variable, store their level in a variable, and print one sentence that uses concatenation to combine both — something like "Welcome, [name]! You\'re level [level]." Show the FULL code (3 lines or so). Explain in one sentence what each line does.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'tue-r-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 10 of 10',
      title: 'Lock it in — Reading done',
      body: [
        'Three tricks today: word chunking, the pointer, and killing the inner voice. Together they\'re the whole game.',
        'Don\'t use speed reading on everything. Save it for the stuff you have to get through fast — homework readings, articles, blog posts. Slow down for the good stuff.'
      ],
      typedCheck: { q: `Which of the three speed-reading tricks are you going to try first? Why that one? Don't stop at one sentence. Keep explaining until there is nothing left to say.` },
      cta: 'Done' },

    // ===== SUBJECT 2 — WRITING (The Hook) =====
    { id: 'tue-w-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 10 of 10',
      title: 'Lock it in — Writing done',
      body: [
        'You just wrote three different hooks for the same story. That\'s a real skill — most adults can\'t do that.',
        'From here on out: anytime you write ANYTHING (story, essay, email, even a text), pause on the first sentence. Ask: "would this make me keep reading?" If not, rewrite it.'
      ],
      typedCheck: { q: 'What\'s the question to ask yourself about every first sentence you write from now on? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Done' },

    // ===== SUBJECT 3 — MATH (Fractions ↔ Decimals) =====
    { id: 'tue-m-challenge', kind: 'topic', type: 'concept', minutes: 8, subject: 'Math', tag: 'Math · Challenge',
      title: 'Challenge — 5 fraction/decimal problems',
      body: [
        'Work all five. Show your division or your reasoning.',
        '<strong>1.</strong> Convert 3/8 to a decimal. Show your division.',
        '<strong>2.</strong> Write 0.625 as a fraction in simplest form.',
        '<strong>3.</strong> Which is bigger: 5/6 or 0.81? Prove it.',
        '<strong>4.</strong> Convert 7/12 to a decimal. Round to the nearest hundredth.',
        '<strong>5.</strong> You ran 3/4 of a mile. Your friend ran 0.7 miles. Who ran more?'
      ],
      typedCheck: { q: 'Pick two of the five problems above. Show your full work — not just the answer, but every step. Explain your reasoning.' },
      cta: 'Done' },

    { id: 'tue-m-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 10 of 10',
      title: 'Lock it in — Math done',
      body: [
        'You learned the big idea (fractions are division problems), the fast facts (1/2, 1/4, 1/5, 1/10), how to convert any fraction with division, and where this shows up in real life (money).',
        'Practice this week: anytime you see a fraction in school or anywhere else, convert it to a decimal in your head. Anytime you see a decimal, convert it to a fraction. Back and forth gets fast within a few days.'
      ],
      typedCheck: { q: 'What\'s your plan for practicing fractions and decimals this week? Push past your first answer. The real answer comes after that.' },
      cta: 'Done' },

    // ===== SUBJECT 4 — ROBLOX CODING (Strings + Concatenation) =====
    { id: 'tue-c-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Coding', tag: 'Coding · 10 of 10',
      title: 'Lock it in — Coding done',
      body: [
        'You learned the .. operator, how to concatenate variables with strings, the spaces problem, chaining multiple .., and number-to-string auto-conversion.',
        'Now you can write Roblox code that talks to your players by name, shows their score, tells them what just happened — anything readable. That\'s 80% of game UI right there.',
        'Tomorrow we keep building. Today you took a real step from "I can print" to "I can write code that says useful things."'
      ],
      typedCheck: { q: 'What\'s one thing you can build now in a Roblox game that you couldn\'t before today? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Done' },

    { id: 'report-card-tue', kind: 'drill', type: 'report-card', title: 'Tuesday — show Mom & Dad', minutes: 2 }
  ]
};
