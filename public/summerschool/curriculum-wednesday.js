/* Summer School — WEDNESDAY curriculum (built 2026-05-30 for week of 2026-06-08)
 *
 * REPLACES the prior Wednesday (Chunking trick / multiple-choice / pre-pivot)
 * which Ethan completed week-of 2026-05-27. This week (2026-06-08) Wednesday
 * uses the Friday-style teach-back structure.
 *
 * 46 blocks. Same structure: welcome + 4 kickoffs + 10 modules × 4 subjects
 * + report-card. Block IDs prefixed "wed-".
 *
 * Theme: "CONNECT WITH PEOPLE" — the skills that win when you have to deal
 *        with other humans.
 *   Reading           → Inference (reading between the lines)
 *   Writing           → Persuasive Writing (convincing someone with words)
 *   Math              → Word Problems strategy (CUBES + translate to numbers)
 *   Entrepreneurship  → The 3-Bucket Money Rule (Save / Spend / Give)
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.wednesday = {
  weekOf: '2026-06-08',
  day: 'wednesday',
  theme: 'CONNECT WITH PEOPLE',
  themeDesc: 'The skills that win when you\'re dealing with humans — reading what they didn\'t say, convincing them, listening to what they need, handling money around them.',
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 3 — Wednesday',
    showParentNote: true,
    bullets: [
      "<strong>Reading — Inference.</strong> The fanciest reading skill there is: figuring out what an author MEANT, not just what they SAID. Once you get this, every book gets deeper.",
      "<strong>Writing — Persuasive Writing.</strong> How to write something that changes someone's mind. Used in everything from school essays to selling lemonade.",
      "<strong>Math — Word Problems.</strong> The thing every kid hates. Today you learn CUBES — a step-by-step strategy that turns words into numbers without panic.",
      "<strong>Entrepreneurship — 3-Bucket Money Rule.</strong> Save, Spend, Give. The simplest money system that'll save you a thousand wrong decisions over the next 20 years."
    ],
    howItWorks: "Same rule. Every block ends with you typing. Character count + spell-check. Read your answer, send it to Mom & Dad. No clicking past."
  },

  typingTarget: 'I will read between the lines, persuade with reasons, and split my money three ways.',

  tileVocab: [
    { word: 'inference', clue: 'A smart guess from clues + what you already know' },
    { word: 'persuade',  clue: 'Convincing someone to think or do something' },
    { word: 'argument',  clue: 'Reasons you\'re giving to back up your point' },
    { word: 'equation',  clue: 'A math sentence with an equals sign' },
    { word: 'budget',    clue: 'A plan for what to do with your money' },
    { word: 'generous',  clue: 'Willing to give to others' }
  ],

  blocks: [
    // ===== INTERLEAVED ORDER =====
    // welcome → 4 kickoff videos (reading/writing/math/4th)
    //         → round-robin 10 rotations
    //         → report card
    // Total: 1 + 4 + 40 + 1 = 46 blocks.

    { id: 'welcome-wed', kind: 'drill', type: 'welcome', title: 'Welcome to Wednesday', minutes: 2 },

    // ===== KICKOFF VIDEOS =====
    { id: 'wed-r-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Reading', tag: 'Reading · Kickoff video',
      title: 'Kickoff video — Making Inferences',
      video: { title: 'Making Inferences for Kids — What is an inference?', ytId: 'M3ZKbnBw7NY', creditLine: 'Learn Bright' },
      typedQuestions: [
        { q: 'What is an inference, in your own words? Use the word "clues" somewhere in your answer.', minChars: 140 },
        { q: 'What two things does the video say you combine to make an inference?', minChars: 120 }
      ],
      cta: 'Done' },

    { id: 'wed-w-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Writing', tag: 'Writing · Kickoff video',
      title: 'Kickoff video — What is Persuasive Writing?',
      video: { title: 'Persuasive Writing for Kids — Episode 1: What is It?', ytId: 'hD9arWXIddM', creditLine: 'Teaching Without Frills' },
      typedQuestions: [
        { q: 'What is persuasive writing, in your own words? What\'s the writer trying to do to the reader?', minChars: 140 },
        { q: 'Name one place in real life where persuasive writing actually matters. Why does it matter there?', minChars: 140 }
      ],
      cta: 'Done' },

    { id: 'wed-m-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Math', tag: 'Math · Kickoff video',
      title: 'Kickoff video — CUBES for Word Problems',
      video: { title: 'CUBES — Solving Math Word Problems (Video Lesson)', ytId: 'vdF88CW1XHQ', creditLine: 'IPDAE' },
      typedQuestions: [
        { q: 'What do the five letters in CUBES stand for? Spell each one out.', minChars: 120 },
        { q: 'Which CUBES step do you think you\'ve been skipping the most before today? Why?', minChars: 140 }
      ],
      cta: 'Done' },

    { id: 'wed-e-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Entrepreneurship', tag: 'Entrepreneurship · Kickoff video',
      title: 'Kickoff video — Saving and Spending',
      video: { title: 'Economics for Kids: Saving and Spending', ytId: 'NfurkrZEn3Q', creditLine: 'Teaching Without Frills' },
      typedQuestions: [
        { q: 'What\'s the difference between saving and spending the way the video defined it?', minChars: 140 },
        { q: 'Give one example from your own life of something you\'d save for and one thing you\'d spend on.', minChars: 140 }
      ],
      cta: 'Done' },

    // ===== SUBJECT 1 — READING (Inference) =====
    { id: 'wed-r-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 01 of 10',
      title: 'What is an inference?',
      body: [
        'An <strong>inference</strong> is a smart guess about something the author didn\'t say directly. You combine <strong>clues from the text</strong> with <strong>what you already know about the world</strong>, and you fill in the gap.',
        'Example: "Sarah grabbed her umbrella and ran for the bus." The story doesn\'t say "it was raining." But you INFER it was raining — because (a) clue: she grabbed an umbrella, and (b) you know: people grab umbrellas when it rains.',
        'Good readers do this without thinking. Great readers know they\'re doing it and can do it on purpose.'
      ],
      typedCheck: { q: 'What two things do you combine to make an inference? Use the word "clues" somewhere.', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 10',
      title: 'What is persuasive writing?',
      body: [
        '<strong>Persuasive writing</strong> is writing that tries to change the reader\'s mind. You have an opinion. You want them to share it. Your job is to give them reasons strong enough that they do.',
        'It\'s different from a story (which tells what happened) or an explanation (which tells how something works). Persuasive writing argues a point.',
        'Examples: asking your parents to get a dog, writing a school petition, an Amazon review trying to warn people about a bad product. Anywhere you want someone to agree.'
      ],
      typedCheck: { q: 'What is the writer trying to do to the reader in persuasive writing?', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-m-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 01 of 10',
      title: 'Why word problems feel hard',
      body: [
        'Word problems don\'t hand you the math. They hide it inside words. That\'s the whole reason kids find them harder than plain "5 + 3 = ?" problems.',
        'The good news: there\'s a step-by-step strategy that works on almost any word problem ever written. It\'s called <strong>CUBES</strong>.',
        'Five letters, five steps. By the end of today\'s subject, you\'ll trust the process more than you\'ll trust your panic.'
      ],
      typedCheck: { q: 'Why do most kids find word problems harder than plain number problems?', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-e-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 01 of 10',
      title: 'The 3-Bucket Money Rule',
      body: [
        'Whenever you get money — allowance, birthday cash, your own earnings — you split it into THREE buckets:',
        '<strong>Save.</strong> Money for a bigger thing later. Goes into a piggy bank or savings account.',
        '<strong>Spend.</strong> Money for stuff you want now. Snacks, small things, a movie.',
        '<strong>Give.</strong> Money for someone else. A gift, a donation, a friend in need.',
        'That\'s it. One rule, three buckets. Used by smart adults all over the world.'
      ],
      typedCheck: { q: 'What are the three buckets every dollar gets split into?', minChars: 60 },
      cta: 'Got it' },

    { id: 'wed-r-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 02 of 10',
      title: 'Why authors don\'t spell everything out',
      body: [
        'You might wonder: why don\'t writers just SAY what they mean? Why make us infer?',
        'Two reasons. First, telling everything is BORING. "He was sad. She was angry. He went home." That\'s not a story; that\'s a recipe.',
        'Second, when YOU figure something out, you remember it 10x better than if someone told you. The author leaves space on purpose so your brain has to lean in.'
      ],
      typedCheck: { q: 'Why do good authors leave things for the reader to infer instead of just stating them?', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-w-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 02 of 10',
      title: 'The three-part structure',
      body: [
        '<strong>1. Position.</strong> State your opinion clearly in one sentence. "Kids should get more recess time at school."',
        '<strong>2. Reasons (at least 3).</strong> Each one backed by a fact, example, or evidence. "Recess improves focus." "Kids who move more learn better." "Schools that added recess saw test scores go up."',
        '<strong>3. Conclusion.</strong> Restate your position and tell the reader what to do. "More recess = better learning. Tell the principal it\'s time to add 15 minutes."',
        'That\'s it. Position, reasons, conclusion. Same shape every time.'
      ],
      typedCheck: { q: 'What are the three parts of a persuasive piece, in order?', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-m-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 02 of 10',
      title: 'CUBES — the five steps',
      body: [
        '<strong>C — Circle</strong> the numbers in the problem.',
        '<strong>U — Underline</strong> the question being asked.',
        '<strong>B — Box</strong> the math action words (sum, difference, times, per, each, etc).',
        '<strong>E — Evaluate</strong> what operation you need (add, subtract, multiply, divide).',
        '<strong>S — Solve</strong> and check.',
        'Five steps. Same order every time. Practice them on three problems and you\'ll see them in your sleep.'
      ],
      typedCheck: { q: 'What do the five letters in CUBES stand for? Write them all out.', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-e-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 02 of 10',
      title: 'Why three buckets and not just spend?',
      body: [
        'If you spend everything immediately, you have nothing for bigger goals (Save) and nothing to share when it matters (Give).',
        'Kids who only spend grow into adults who can\'t buy a car, can\'t buy a house, and never have money to help anyone else. Not because they didn\'t earn enough — because they never trained themselves to split.',
        'Starting young, with small amounts, builds the muscle. Every $10 split now teaches your brain how to split $10,000 later.'
      ],
      typedCheck: { q: 'What happens to adults who never train themselves to save and give as kids?', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-r-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Reading', tag: 'Reading · 03 of 10',
      title: 'Teach it back — what is an inference?',
      prompt: 'In your own words, explain what an inference is. Give one example from a book, movie, or show — something the story didn\'t say directly but you figured out anyway.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-w-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 03 of 10',
      title: 'Teach it back — the three parts',
      prompt: 'Type out the three parts of a persuasive piece in your own words. Then say which one you think is the hardest to do well, and why.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-m-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Math', tag: 'Math · 03 of 10',
      title: 'Teach it back — CUBES in your own words',
      prompt: 'In your own words, type out what each letter in CUBES means and why each step helps you avoid mistakes on word problems.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-e-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 03 of 10',
      title: 'Teach it back — the 3-Bucket rule',
      prompt: 'In your own words, explain the 3-Bucket Money Rule. Use the words "save," "spend," and "give." Then say why splitting matters more than how much you have.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-r-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 04 of 10',
      title: 'The "Clue + What I Know" formula',
      body: [
        'When you can\'t figure out what an author means, use this:',
        '<strong>CLUE:</strong> "What did the text actually say?"<br><strong>WHAT I KNOW:</strong> "What do I know from real life that connects to this?"<br><strong>INFERENCE:</strong> "Combining those, what\'s probably true?"',
        'Example. Text: "Marco\'s hands were shaking when he opened the envelope." Clue: shaking hands. What I know: hands shake when you\'re nervous or scared. Inference: Marco was nervous about what was inside.'
      ],
      typedCheck: { q: 'Write out the three parts of the inference formula in order.', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-w-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 04 of 10',
      title: 'A strong opinion sentence',
      body: [
        'Your first sentence states the opinion. It has to be clear and bold.',
        '<strong>Weak:</strong> "I kind of think dogs are nice." (Wishy-washy. Reader stops caring.)',
        '<strong>Strong:</strong> "Every family should have a dog." (Clear. Confident. Reader knows where you stand.)',
        'Even if you\'re not totally sure, write like you are. Save the doubts for your private journal.'
      ],
      typedCheck: { q: 'What\'s wrong with the sentence "I kind of think dogs are nice" as an opinion statement?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-m-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 04 of 10',
      title: 'Math action words to watch for',
      body: [
        'Word problems use certain words to signal what math you should do. Learn these.',
        '<strong>Add:</strong> sum, total, in all, combined, more than, increased by, plus, both.',
        '<strong>Subtract:</strong> difference, less than, decreased by, left over, fewer, take away, minus.',
        '<strong>Multiply:</strong> times, product, each, per, of (in fractions), groups of, rate.',
        '<strong>Divide:</strong> per, quotient, split, shared equally, ratio, each gets, average.',
        'When you BOX these in step B of CUBES, you basically write the equation for yourself.'
      ],
      typedCheck: { q: 'Name two action words that mean "subtract" and two that mean "multiply."', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-e-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 04 of 10',
      title: 'How much to put in each bucket',
      body: [
        'Simplest starter split: <strong>50% Spend, 30% Save, 20% Give</strong>. That\'s for every dollar.',
        '$10 allowance? $5 Spend, $3 Save, $2 Give.',
        '$100 birthday money? $50 Spend, $30 Save, $20 Give.',
        'You can tweak it. Saving for something specific (a game, a bike)? Bump Save to 50%. Found a real cause you care about? Bump Give to 30%. The percentages are guidelines, not laws. The HABIT of splitting is the law.'
      ],
      typedCheck: { q: 'In the 50/30/20 starter split, which bucket gets 50%? Why does that one start biggest?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-r-05', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Reading', tag: 'Reading · 05 of 10',
      title: 'Type the formula — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Clue plus what I already know equals an inference.',
      reps: 3, cta: 'Done' },

    { id: 'wed-w-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 05 of 10',
      title: 'Reasons backed by evidence',
      body: [
        'Saying "you should do X because I want you to" doesn\'t persuade anyone. You need EVIDENCE.',
        'Three good kinds of evidence: <strong>facts</strong> (numbers, statistics), <strong>examples</strong> (a real case from life), and <strong>expert quotes</strong> (something a person who knows the topic said).',
        '"Dogs lower stress" → fact. "My grandma got a dog after her surgery and recovered faster" → example. "The American Heart Association says pet owners have lower blood pressure" → expert quote.',
        'Mix all three types in a piece. Way more powerful than just opinions stacked on opinions.'
      ],
      typedCheck: { q: 'Name two kinds of evidence you can use to back up a reason in persuasive writing.', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-m-05', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 05 of 10',
      title: 'Worked example — using CUBES',
      body: [
        'Problem: <em>Maya has 24 stickers. She gives away 3 stickers to each of her 5 friends. How many stickers does Maya have left?</em>',
        '<strong>C</strong>ircle: 24, 3, 5.',
        '<strong>U</strong>nderline: "How many stickers does Maya have LEFT" — the question.',
        '<strong>B</strong>ox the action words: "to EACH of her 5 friends" (each → multiply), "have LEFT" (left → subtract).',
        '<strong>E</strong>valuate: first multiply 3 × 5 = 15 (total given away). Then subtract: 24 − 15.',
        '<strong>S</strong>olve: 24 − 15 = 9. Maya has 9 stickers left.',
        'CUBES turned a confusing sentence into two clean math operations.'
      ],
      typedCheck: { q: 'In the example, what math operations did CUBES tell you to do, in what order?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-e-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 05 of 10',
      title: 'The Save bucket — what it\'s for',
      body: [
        'The Save bucket is for stuff that\'s bigger than one week\'s worth of money. A new game ($60). A scooter ($120). The next MPC accessory ($200).',
        'You SET A GOAL: "I want X. It costs $Y. So I need to save $Z per week to get there." Then your Save bucket actually has a job.',
        'Saving without a goal is boring — money just sits there. Saving WITH a goal is exciting — every dollar you drop in gets you closer to a thing you want.'
      ],
      typedCheck: { q: 'What\'s the trick to make saving feel exciting instead of boring?', minChars: 70 },
      cta: 'Got it' },

    { id: 'wed-r-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 06 of 10',
      title: 'Inferences about characters\' feelings',
      body: [
        'The most common inference job in books and shows: figure out how a character FEELS, when nobody says it.',
        'Authors give you clues like: facial expressions ("she crossed her arms"), word choice ("he muttered"), actions ("he slammed the door"), what they DON\'T do ("she didn\'t look up").',
        'Each clue is a tiny piece of evidence about what\'s going on inside the character. Stack the clues, infer the feeling.'
      ],
      typedCheck: { q: 'Name two kinds of clues authors give to hint at how a character feels.', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-w-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Writing', tag: 'Writing · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'A strong opinion needs strong reasons backed by evidence.',
      reps: 3, cta: 'Done' },

    { id: 'wed-m-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Math', tag: 'Math · 06 of 10',
      title: 'Type CUBES — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Circle, Underline, Box, Evaluate, Solve.',
      reps: 3, cta: 'Done' },

    { id: 'wed-e-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Every dollar goes into three buckets: Save, Spend, Give.',
      reps: 3, cta: 'Done' },

    { id: 'wed-r-07', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Reading', tag: 'Reading · 07 of 10',
      title: 'Practice — what\'s the inference?',
      prompt: 'Read this short scene and type out what you infer: "Jake walked into the lunchroom, scanned every table, then walked back out without sitting down. He pulled his hood up and went to eat alone outside." — What can you infer about Jake? List the clues you used.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-w-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 07 of 10',
      title: 'Anticipate the other side',
      body: [
        'Great persuasive writers don\'t pretend the other side doesn\'t exist. They name it AND knock it down.',
        '"Some people say dogs are too expensive. But the average vet bill is less than a single family vacation, and a dog provides 10+ years of company. The cost is real, but it\'s spread out, and the value is huge."',
        'This trick (called a <strong>counter-argument</strong>) makes you sound smarter and fairer. The reader thinks: "Oh, this person actually thought about it."'
      ],
      typedCheck: { q: 'Why does naming the other side\'s argument make your own writing stronger, not weaker?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-m-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 07 of 10',
      title: 'The biggest mistake kids make',
      body: [
        'Number one word-problem mistake: <strong>solving before reading the whole question</strong>.',
        'Kids see "24 stickers" and "3 friends" and immediately do 24 ÷ 3 = 8 — without underlining what was actually asked. Half the time, that\'s the wrong operation entirely.',
        'CUBES step U (UNDERLINE the question) exists specifically to slow you down on this exact mistake. Read the whole question. THEN start the math.'
      ],
      typedCheck: { q: 'What\'s the most common mistake kids make on word problems, and which CUBES step fixes it?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-e-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 07 of 10',
      title: 'The Spend bucket — guilt-free money',
      body: [
        'This is YOUR money to enjoy. No saving guilt, no donation pressure — once you\'ve already put money in the other two buckets, the Spend bucket is yours, no apologies.',
        'Snacks. A small game upgrade. A treat. A movie with friends. Whatever you want.',
        'The whole point: smart money rules shouldn\'t make life NO fun. Spending is part of the system — you just don\'t spend ALL of it.'
      ],
      typedCheck: { q: 'Why is the Spend bucket important? What would happen if you only saved and gave?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-r-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 08 of 10',
      title: 'Inferences in real life — not just books',
      body: [
        'Inference isn\'t a school skill. You do it every day. Friend acts weird at lunch → you infer something\'s wrong. Mom keeps glancing at the clock → you infer she\'s late for something.',
        'People who are GOOD at reading inferences in books tend to also be good at reading PEOPLE. Same brain skill.',
        'Practice on the page makes you sharper off the page.'
      ],
      typedCheck: { q: 'How is inferring something from a book similar to inferring something from how a real person is acting?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-w-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Writing', tag: 'Writing · 08 of 10',
      title: 'Write a mini persuasive piece',
      prompt: 'Topic: "Kids should be allowed to choose what they eat for lunch." Write a SHORT persuasive piece: opening opinion sentence, two reasons (each with a piece of evidence or example), one sentence anticipating what the other side might say, and a closing line. 4-6 sentences total.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-m-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Math', tag: 'Math · 08 of 10',
      title: 'Practice — solve this with CUBES',
      prompt: 'Problem: "Ethan saves $4 per week from his allowance. He wants to buy a video game that costs $48. How many weeks does he need to save?" Type out: Circle (what numbers), Underline (what\'s asked), Box (action words), Evaluate (which operation), Solve (the answer). Walk through each CUBES step.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-e-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 08 of 10',
      title: 'The Give bucket — why it matters',
      body: [
        'Giving feels weird the first few times. You worked for the money, why give it away?',
        'Two reasons. First: giving makes you happier than spending the same amount on yourself. That\'s actually measured by scientists. Your brain releases happy chemicals when you help others.',
        'Second: giving trains you to think beyond yourself. Adults who never give become stuck in their own heads. Adults who give regularly are connected to their community, harder to break, and happier overall.',
        'Pick a real cause you care about. Save up Give-bucket money. Then give it to that cause.'
      ],
      typedCheck: { q: 'What\'s one real cause or person you\'d want to give some of your Give bucket to? Why that one?', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-r-09', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Reading', tag: 'Reading · 09 of 10',
      title: 'Teach it back — an inference YOU made about a real person',
      prompt: 'Think of a time you inferred something about how someone real was feeling — without them telling you. Could be a parent, friend, sibling, teacher. What were the clues? What did you infer? Were you right?',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-w-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 09 of 10',
      title: 'Words that persuade',
      body: [
        'Certain words quietly tilt the reader toward your side. Use them.',
        '<strong>Linking words:</strong> "because," "therefore," "since," "for example" — these connect reasons to your position.',
        '<strong>Confidence words:</strong> "clearly," "obviously," "of course," "no question" — use sparingly. Too many and you sound bossy.',
        '<strong>Inclusion words:</strong> "we," "us," "together" — they invite the reader onto your team.',
        'Avoid: "maybe," "kind of," "I guess." Those bleed conviction.'
      ],
      typedCheck: { q: 'Name one word from EACH category (linking, confidence, inclusion) you\'d use in persuasive writing.', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-m-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 09 of 10',
      title: 'Always check — does the answer make sense?',
      body: [
        'After you solve, sanity check. If a word problem asks "how many cars" and your answer is 7.5, something\'s wrong (you can\'t have half a car).',
        'If it asks "how much money" and your answer is "negative $20," something\'s wrong (unless someone owes money).',
        'If it asks "how long until..." and your answer is "before the start time," something\'s wrong.',
        'This 5-second check catches half of all word-problem mistakes. Use it every time.'
      ],
      typedCheck: { q: 'What kind of answer should make you stop and re-check? Give one example.', minChars: 80 },
      cta: 'Got it' },

    { id: 'wed-e-09', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 09 of 10',
      title: 'Plan YOUR money this week',
      prompt: 'Pretend you got $20 today. Split it into the three buckets using your own percentages. Type out: how much in Save (and what you\'re saving for), how much in Spend (and what kinds of things), how much in Give (and to who or what cause). Make it real — use actual things you\'d save for, spend on, or give to.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'wed-r-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 10 of 10',
      title: 'Lock it in — Reading done',
      body: [
        'You now know inference is just "clue + what I know = smart guess." That formula works on books, movies, conversations, and life.',
        'Pay attention this week to ONE inference a day. Note when you do it. The more you notice, the better you get.'
      ],
      typedCheck: { q: 'What\'s your plan to notice yourself making inferences this week?', minChars: 70 },
      cta: 'Done' },

    // ===== SUBJECT 2 — WRITING (Persuasive) =====
    { id: 'wed-w-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 10 of 10',
      title: 'Lock it in — Writing done',
      body: [
        'You learned the three-part structure (position → reasons → conclusion), evidence types (facts, examples, expert quotes), how to handle the other side, and the word choices that tilt the reader.',
        'This skill works on everything from "let me get a new game" to a college admissions essay. Build it now and it pays you forever.'
      ],
      typedCheck: { q: 'Pick ONE thing you\'d want to persuade a parent or teacher about this week. What\'s your opening opinion sentence?', minChars: 80 },
      cta: 'Done' },

    // ===== SUBJECT 3 — MATH (Word Problems — CUBES) =====
    { id: 'wed-m-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 10 of 10',
      title: 'Lock it in — Math done',
      body: [
        'You have the CUBES strategy, the action-word list, the worked example, and the sanity check. That\'s the whole word-problem playbook.',
        'Practice this week: every word problem you see in homework, force yourself through ALL five CUBES steps even if you think you know the answer. Build the habit now; it pays for years.'
      ],
      typedCheck: { q: 'What\'s your plan for using CUBES on every word problem this week, even easy ones?', minChars: 70 },
      cta: 'Done' },

    // ===== SUBJECT 4 — ENTREPRENEURSHIP (3-Bucket Money Rule) =====
    { id: 'wed-e-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Entrepreneurship', tag: 'Entrepreneurship · 10 of 10',
      title: 'Lock it in — Entrepreneurship done',
      body: [
        'You learned the 3-Bucket Rule: Save, Spend, Give. You picked your own percentages. You wrote a real plan for $20.',
        'This week: any money you get — allowance, gift, whatever — split it. Use real jars or envelopes if you want. Use a notes app if you don\'t. The HABIT of splitting is what matters; the system is just there to make it easy.'
      ],
      typedCheck: { q: 'What\'s the one habit you want to lock in this week with your money?', minChars: 70 },
      cta: 'Done' },

    { id: 'report-card-wed', kind: 'drill', type: 'report-card', title: 'Wednesday — show Mom & Dad', minutes: 2 }
  ]
};
