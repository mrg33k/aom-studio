/* Summer School — FRIDAY curriculum (rebuilt 2026-06-07 for Week 3, week of 2026-06-08)
 *
 * REPLACES the 126-block "TEACH IT BACK" Friday (Soft Lies / Problem+Solution /
 * MPC / Roblox). Patrik 2026-06-07: "Friday was extra long last week." That
 * Friday ran 126 blocks. This one is deliberately short (~23 blocks) — a
 * reflective end-of-week character day.
 *
 * Theme: "IT'S NOT ALL ABOUT YOU." Patrik's priority this week: Ethan is in a
 * very "pick-me" / only-child state — needing to be the center, wanting to win
 * and be chosen. This day is built to gently work on that: being genuinely
 * happy when others win, sharing the spotlight, listening, being a good sport.
 * Real videos to WATCH + teach-back WORK on each idea.
 *
 * Char-count gates removed app-wide (modules.js, 2026-06-07): he adds until
 * it's enough; Patrik gates on review. No "/ 150 characters" anywhere.
 *
 * Subjects (grouped, not round-robin — reads better for a themed day):
 *   Character (the star) → humility, happy-for-others, good sport, listening
 *   Reading (anchor)     → "reading people" — inference about feelings (builds on Wed)
 *   Writing              → gratitude + honest reflection (builds on persuasive Wed)
 *   Math (anchor)        → CUBES word-problem lock-in (builds on Wed)
 *
 * Videos verified via YouTube oembed 2026-06-07 (all 200 OK, real titles):
 *   l-gQLqv9f4o  A Pep Talk from Kid President to You — SoulPancake
 *   1Evwgu369Jw  Brené Brown on Empathy — The RSA
 *   m5yCOSHeYn4  Kid President's 20 Things We Should Say More Often — SoulPancake
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.friday = {
  weekOf: '2026-06-08',
  day: 'friday',
  theme: "IT'S NOT ALL ABOUT YOU",
  themeDesc: "The thing that makes people actually want you around: you make it about THEM sometimes. Today is about being happy when others win, sharing the spotlight, listening, and being a good sport.",
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 5 — Friday',
    showParentNote: true,
    bullets: [
      "<strong>Character — It's not all about you.</strong> The biggest social superpower there is: being genuinely happy when someone ELSE wins, and not always needing to be the center. We watch Kid President, then do real work on it.",
      "<strong>Reading — Reading people.</strong> You learned inference this week (clues + what you know). Today you point it at PEOPLE — figuring out how someone feels when they don't say it.",
      "<strong>Writing — Say the good stuff.</strong> Gratitude and honest reflection. Writing a real thank-you, and being honest about a time you made it all about you.",
      "<strong>Math — Word problems.</strong> Quick lock-in on the CUBES strategy from Wednesday, so it sticks."
    ],
    howItWorks: "Every block ends with you typing in your own words. No character count anymore — just keep adding until you've really explained it, then send it to Mom & Dad. Spelling still gets checked. This is a SHORT Friday on purpose."
  },

  typingTarget: 'I can be happy for other people when they win.',

  tileVocab: [
    { word: 'humble',   clue: "Not bragging; not needing to be the best out loud" },
    { word: 'empathy',  clue: "Feeling WITH someone what they're feeling" },
    { word: 'generous', clue: "Willing to give — attention, credit, or things" },
    { word: 'gracious', clue: "Kind and classy, especially when you didn't win" },
    { word: 'listen',   clue: "Actually hearing someone, not just waiting to talk" },
    { word: 'support',  clue: "Cheering for someone else's win" }
  ],

  blocks: [
    // welcome → Character (video + concepts + teach-backs) → Reading → Writing → Math → report card
    // Grouped by subject (not round-robin) — a calm, themed Friday. ~23 blocks total.

    { id: 'welcome-fri', kind: 'drill', type: 'welcome', title: 'Welcome to Friday', minutes: 2 },

    // ===== SUBJECT 1 — CHARACTER (the star) =====
    { id: 'fri-c-00-video', kind: 'topic', type: 'video-typed', minutes: 7, subject: 'Character', tag: 'Character · Kickoff video',
      title: 'Kickoff video — A Pep Talk',
      video: { title: 'A Pep Talk from Kid President to You', ytId: 'l-gQLqv9f4o', creditLine: 'SoulPancake — Kid President' },
      typedQuestions: [
        { q: "Kid President says the world needs you to stop being boring and DO something good. In your own words, what's one good thing you could do for someone else this weekend?" },
        { q: "He says 'we were all made to be awesome' — meaning everyone, not just you. Why does that matter for how you treat the people around you?" }
      ],
      cta: 'Done' },

    { id: 'fri-c-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Character', tag: 'Character · 01 of 07',
      title: "It's not all about you",
      body: [
        "Here's a thing that's easy to miss: the people everyone loves to be around are usually the ones who make it about <strong>other people</strong>, not themselves.",
        "It's totally normal to want attention. Everybody does. But there's a difference between wanting it and <strong>needing</strong> it — needing to be the one who wins, the one who's picked, the one everyone's looking at.",
        "When you can let someone else have the spotlight and feel good about it, people trust you more, like you more, and — funny enough — end up giving you more attention anyway. Trying less to be the center is how you become someone people actually want around."
      ],
      typedCheck: { q: "In your own words: what's the difference between WANTING attention and NEEDING to be the center?" },
      cta: 'Got it' },

    { id: 'fri-c-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Character', tag: 'Character · 02 of 07',
      title: "Be happy when someone else wins",
      body: [
        "This is the hard one. When a friend wins, gets picked first, or gets the praise — the first feeling that pops up is sometimes a little sting. That's jealousy, and everybody feels it. It's not bad to feel it. It's what you DO next that counts.",
        "The skill: notice the sting, then choose to be genuinely happy for them anyway. Say it out loud. \"That's awesome, congrats.\" And mean it.",
        "Here's the secret nobody tells you: <strong>someone else winning doesn't mean you lost.</strong> There's not a limited amount of good stuff in the world. Their win takes nothing from you. Being able to cheer for other people is a superpower most adults never even learn."
      ],
      typedCheck: { q: "Why does someone else winning NOT mean you lost? Explain it in your own words." },
      cta: 'Got it' },

    { id: 'fri-c-03', kind: 'topic', type: 'concept', minutes: 4, subject: 'Character', tag: 'Character · 03 of 07',
      title: "The spotlight isn't a pizza",
      body: [
        "When there's a pizza, every slice someone else takes means less for you. A lot of people treat ATTENTION like a pizza — like if someone else gets some, there's less left for them. So they grab for it.",
        "But attention isn't a pizza. It's more like a campfire — if you help someone else's fire light up, the whole place gets brighter and warmer, including for you.",
        "When you hype up a friend, ask someone a good question, or let someone else tell their story — you don't lose anything. You actually become the person the campfire forms around."
      ],
      typedCheck: { q: "Why is attention more like a campfire than a pizza? Use your own words." },
      cta: 'Got it' },

    { id: 'fri-c-04', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Character', tag: 'Character · 04 of 07',
      title: "Teach it back — a time you wanted to be the center",
      prompt: "Be honest — this one's just between you and Mom & Dad. Think of a time recently when you really wanted to be the center of attention, or you were bummed that someone else got picked or got the spotlight. What happened? What were you feeling? Looking back, what could you have done differently to be happy for them?",
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'fri-c-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Character', tag: 'Character · 05 of 07',
      title: "Being a good sport (winning AND losing)",
      body: [
        "A good sport when they LOSE: doesn't sulk, doesn't blame, says \"good game\" and means it. Tries again next time without making everyone feel bad.",
        "A good sport when they WIN — this part matters just as much: doesn't rub it in, doesn't gloat, doesn't say \"I'm the best.\" Wins quietly and lifts up the person who lost. \"That was close, you played great.\"",
        "Gloating when you win feels good for about 5 seconds and then makes people not want to play with you. Being gracious when you win makes people want you on their team forever."
      ],
      typedCheck: { q: "What should a good sport do when they WIN, not just when they lose?" },
      cta: 'Got it' },

    { id: 'fri-c-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Character', tag: 'Character · 06 of 07',
      title: "How to make someone else feel like the star",
      body: [
        "You can make another person feel great with almost no effort. Three moves:",
        "<strong>1. Ask, then actually listen.</strong> \"How was your day? What happened next?\" — and don't jump in with your own story.",
        "<strong>2. Give credit.</strong> \"That was your idea, it was a good one.\" People remember who shared the spotlight with them.",
        "<strong>3. Hype them up.</strong> Say the nice thing out loud instead of just thinking it. \"You're really good at that.\"",
        "Do this and people will light up around you — and you won't have had to grab for a single thing."
      ],
      typedCheck: { q: "Name the three moves for making someone else feel like the star." },
      cta: 'Got it' },

    { id: 'fri-c-07', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Character', tag: 'Character · 07 of 07',
      title: "Teach it back — your plan to make someone the star",
      prompt: "Pick a real person (a friend, your sister or brother if you had one, a cousin, a teammate, Mom or Dad). Write a plan: this weekend, how will you make THEM feel like the star? What will you ask them? What will you hype them up about? What will you let them have the spotlight on? Make it real and specific.",
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    // ===== SUBJECT 2 — READING (Reading People — inference about feelings) =====
    { id: 'fri-r-00-video', kind: 'topic', type: 'video-typed', minutes: 7, subject: 'Reading', tag: 'Reading · Kickoff video',
      title: 'Kickoff video — Empathy',
      video: { title: 'Brené Brown on Empathy', ytId: '1Evwgu369Jw', creditLine: 'The RSA' },
      typedQuestions: [
        { q: "The video says empathy is feeling WITH someone, and sympathy is feeling sorry for them from a distance. In your own words, what's the difference?" },
        { q: "It says empathy is usually just being there and listening — not trying to fix it or make it about you. Why is 'at least you...' the wrong thing to say to someone who's down?" }
      ],
      cta: 'Done' },

    { id: 'fri-r-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 01 of 03',
      title: "Reading people is just inference",
      body: [
        "This week you learned inference: clue + what you already know = a smart guess about what the author didn't say.",
        "You can point that exact same skill at REAL PEOPLE. Someone goes quiet, crosses their arms, gives short answers. Clue + what you know = they're probably upset, even if they said \"I'm fine.\"",
        "The kids and adults who are great with people are usually just really good at reading these clues — and then caring about what they read."
      ],
      typedCheck: { q: "How is figuring out how a real person feels the same skill as making an inference in a book?" },
      cta: 'Got it' },

    { id: 'fri-r-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 02 of 03',
      title: "Clues people give off",
      body: [
        "<strong>Face:</strong> a real smile reaches the eyes; a fake one doesn't. Looking down or away can mean sad or embarrassed.",
        "<strong>Body:</strong> crossed arms, turned away, slumped shoulders — closed off or down. Leaning in, open hands — engaged.",
        "<strong>Voice:</strong> short answers, flat tone, or going quiet usually means something's off.",
        "<strong>What they DON'T do:</strong> the friend who usually talks a lot suddenly saying nothing is a loud clue.",
        "Stack the clues, make the inference, and then — the important part — actually check in with them."
      ],
      typedCheck: { q: "Name two clues a person gives off that tell you how they're really feeling." },
      cta: 'Got it' },

    { id: 'fri-r-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Reading', tag: 'Reading · 03 of 03',
      title: "Teach it back — read this person",
      prompt: "Read this: \"At recess, Sam usually runs straight to the basketball court. Today he sat on the bench by himself, hood up, and didn't look at anyone. When his friend asked if he wanted to play, he just shrugged.\" — What can you infer about how Sam feels? List the clues you used. Then: what's one kind thing you could do for Sam?",
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    // ===== SUBJECT 3 — WRITING (Gratitude + honest reflection) =====
    { id: 'fri-w-00-video', kind: 'topic', type: 'video-typed', minutes: 6, subject: 'Writing', tag: 'Writing · Kickoff video',
      title: 'Kickoff video — 20 Things We Should Say More Often',
      video: { title: "Kid President's 20 Things We Should Say More Often", ytId: 'm5yCOSHeYn4', creditLine: 'SoulPancake — Kid President' },
      typedQuestions: [
        { q: "Pick TWO things from the video that you should say more often. Write them down and say who you'd say them to." },
        { q: "Most of the things on his list are about other people, not about himself. Why do you think saying these things out loud actually matters?" }
      ],
      cta: 'Done' },

    { id: 'fri-w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 03',
      title: "Gratitude in writing",
      body: [
        "A thank-you that names something SPECIFIC hits way harder than a generic one.",
        "Weak: \"Thanks for everything.\" Strong: \"Thank you for staying up to help me finish my project even though you were tired — it meant a lot.\"",
        "The move: say WHAT they did, and say what it MEANT to you. Two parts. That's a thank-you someone actually remembers."
      ],
      typedCheck: { q: "What are the two parts of a thank-you that actually lands?" },
      cta: 'Got it' },

    { id: 'fri-w-02', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Writing', tag: 'Writing · 02 of 03',
      title: "Write a real thank-you",
      prompt: "Write a real thank-you note to someone who's done something for you lately (Mom, Dad, a friend, a coach, a teacher). Name the SPECIFIC thing they did, and say what it meant to you. Make it real — we might actually give it to them.",
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'fri-w-03', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Writing', tag: 'Writing · 03 of 03',
      title: "Honest reflection — the win you almost grabbed",
      prompt: "Write honestly about a time you wanted credit, or wanted to win so bad you forgot about the other people. No one's mad — this is just being honest with yourself, which is the bravest kind of writing. What happened? If you could replay it, how would you handle it like the person you want to become?",
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    // ===== SUBJECT 4 — MATH (CUBES lock-in) =====
    { id: 'fri-m-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 01 of 03',
      title: "CUBES — quick refresh",
      body: [
        "On Wednesday you learned CUBES for word problems. Quick refresh so it sticks:",
        "<strong>C</strong>ircle the numbers. <strong>U</strong>nderline the question. <strong>B</strong>ox the action words. <strong>E</strong>valuate which operation. <strong>S</strong>olve and check.",
        "The whole point: slow down, read the WHOLE question, then do the math. Don't grab the first numbers you see and start multiplying."
      ],
      typedCheck: { q: "Write out what each letter in CUBES stands for." },
      cta: 'Got it' },

    { id: 'fri-m-02', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Math', tag: 'Math · 02 of 03',
      title: "Type CUBES — three times perfect",
      prompt: 'Three times in a row, no typos.',
      target: 'Circle, Underline, Box, Evaluate, Solve.',
      reps: 3, cta: 'Done' },

    { id: 'fri-m-03', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Math', tag: 'Math · 03 of 03',
      title: "Solve it with CUBES",
      prompt: "Problem: \"Ethan and 3 friends are sharing a prize of $48 equally. Then Ethan decides to give $2 of his share to his little cousin. How much does Ethan have left?\" — Walk through every CUBES step: Circle (the numbers), Underline (what's asked), Box (action words), Evaluate (which operations, in order), Solve (the answer). Show your thinking.",
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'report-card-fri', kind: 'drill', type: 'report-card', title: 'Friday — show Mom & Dad', minutes: 2 }
  ]
};
