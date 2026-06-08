/* Summer School — FRIDAY curriculum (rebuilt 2026-06-07 for week of 2026-06-08)
 *
 * Week 3 Friday: teach-back day. Short, deliberate, no clicking through.
 * Target: 45-60 minutes.
 *
 * Structure: welcome + 3 teach-back blocks + report card = 5 blocks.
 *
 *   Specials teach-back  — voice memo on only child syndrome / pick-me
 *   Math teach-back      — explain a math concept from the week in own words
 *   Reading teach-back   — explain this week's reading trick + give one real example
 *
 * No multiple-choice. No "next" button without an artifact. No timer-only blocks.
 * No "Plan on 2-3 hours." This is 45-60 minutes max.
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.friday = {
  weekOf: '2026-06-09',
  day: 'friday',
  theme: 'TEACH IT BACK',
  themeDesc: 'If you can teach it, you know it. If you can\'t, you don\'t — and that\'s fine, we\'ll go again.',
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 5 — Friday',
    showParentNote: true,
    bullets: [
      "<strong>Friday is teach-back day.</strong> Less clicking, more explaining. Target: 45-60 minutes.",
      "<strong>Specials teach-back.</strong> Voice memo: what did you learn this week about only child syndrome and pick-me behavior? What did you notice in yourself?",
      "<strong>Math teach-back.</strong> Pick one math concept from this week and explain it in your own words — like you're teaching it to someone who has never heard of it.",
      "<strong>Reading teach-back.</strong> Explain this week's reading trick and give one real example of using it — from a book, a conversation, or something you watched."
    ],
    howItWorks: "No clicking through. Each block has one thing you have to actually do — a voice memo or written explanation. The Continue button doesn't unlock until you do the real thing. Spell-check is on. Read your answers before you submit. Show Mom & Dad when you're done."
  },

  typingTarget: 'Friday is when I prove I actually learned something.',

  tileVocab: [
    { word: 'teach-back',  clue: 'Explaining something you learned to someone else — the real test of whether you got it' },
    { word: 'inference',   clue: 'Figuring out what something means from clues, not just what it says' },
    { word: 'percent',     clue: 'Out of a hundred — a way to compare amounts' },
    { word: 'pick-me',     clue: 'Performing to get someone\'s attention instead of just being yourself' },
    { word: 'confidence',  clue: 'Trusting yourself — real confidence is quiet, not loud' }
  ],

  blocks: [
    // ===== WELCOME =====
    { id: 'welcome-fri', kind: 'drill', type: 'welcome', minutes: 2 },

    // ===== TEACH-BACK 1 — Specials (Only Child / Pick-Me) =====
    { id: 'fri-sp-tb', kind: 'topic', type: 'teach-back', minutes: 10, subject: 'Specials', tag: 'Specials · Teach-Back',
      title: 'Teach it back — Only child syndrome & pick-me',
      prompt: 'Record a 60–90 second voice memo. Cover: (1) What is pick-me behavior in your own words. (2) Where does it come from — what does growing up as the center of attention at home have to do with it? (3) Did you catch yourself doing it this week? Be honest. Your first answer is probably not the real one.',
      spellCheck: true,
      savedAs: 'writingPiece',
      cta: 'Submit' },

    // ===== TEACH-BACK 2 — Math =====
    { id: 'fri-m-tb', kind: 'topic', type: 'teach-back', minutes: 10, subject: 'Math', tag: 'Math · Teach-Back',
      title: 'Teach it back — a math concept from this week',
      prompt: 'Pick one math thing you learned this week — percentages, the 3 fast facts (50%/25%/10%), how to build other percents from 10%, or how to do tips in your head. Write it out like you are teaching it to someone who has never heard of it before. Use an example with real numbers. Write until there is nothing left to explain.',
      spellCheck: true,
      savedAs: 'writingPiece',
      cta: 'Submit' },

    // ===== TEACH-BACK 3 — Reading =====
    { id: 'fri-r-tb', kind: 'topic', type: 'teach-back', minutes: 10, subject: 'Reading', tag: 'Reading · Teach-Back',
      title: 'Teach it back — this week\'s reading trick',
      prompt: 'Explain this week\'s reading trick in your own words. What is it called? How does it work? When do you use it? Then give ONE real example — from a book you read, a conversation you had, a show you watched, or something someone said that you had to read between the lines to understand. The example is the proof that you actually get it.',
      spellCheck: true,
      savedAs: 'writingPiece',
      cta: 'Submit' },

    // ===== FRAME — Report card =====
    { id: 'report-card-fri', kind: 'drill', type: 'report-card', title: 'Friday — show Mom & Dad', minutes: 2 }
  ]
};
