/* Summer School — FRIDAY curriculum (built 2026-05-29)
 *
 * The teach-back pivot. Patrik 2026-05-29 (/goal): Ethan was clicking through
 * Tuesday's lessons without learning. From here on, every block ends with a
 * REAL writing artifact (typed teach-back), gated on:
 *   - minimum character count (must actually write)
 *   - spelling check (must spell correctly)
 *   - exact-match for code/typing drills
 *
 * Four subjects, 10 modules each:
 *   1. WRITING        — Soft Lies (life skill, taught through writing exercises)
 *   2. SPELLING       — Problem-without-Solution (taught through spelling drills + writing)
 *   3. MPC ONE        — 4 sequenced beats (kicks → snares → hi-hats → creative)
 *   4. ROBLOX CODING  — Intro (variables, print, if/then, loops — Lua basics)
 *
 * Plus welcome + report card. Total = 42 blocks.
 *
 * unlockAll: true — Patrik: "none of the modules should be locked." All 42
 * cards are tappable from the start. The gates are inside each block (typing
 * + spelling), not at the hub level.
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.friday = {
  weekOf: '2026-06-09',
  day: 'friday',
  theme: 'TEACH IT BACK',
  themeDesc: 'New rule: every block you finish, you teach back what you learned by typing it in your own words.',
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 5 — Friday',
    showParentNote: true,
    bullets: [
      "<strong>New rule.</strong> Last lesson you told me you were clicking through. Today the lessons can't be clicked through. You have to type what you learned, in your own words. The keyboard is the proof.",
      "<strong>Writing — Soft Lies.</strong> What they are, why \"yeah, I get it\" when you don't is the big one, why they wreck your life over time.",
      "<strong>Spelling — Problem + Solution.</strong> The rule for the rest of your life: never bring a problem without a solution. Plus real spelling drills on the words that matter.",
      "<strong>MPC ONE.</strong> Real beat homework. Kicks on the 1 and 3. Snares on the 2 and 4. Hi-hats on every 8th. Then make it yours.",
      "<strong>Roblox Coding.</strong> You said you don't know coding — today you do. Lua basics: variables, print, if/then, loops."
    ],
    howItWorks: "Every block has a typing gate at the end. Character count + spell-check. No skipping. If you write thin or misspell common words, the Continue button stays locked until you fix it. That's how we know you got it."
  },

  typingTarget: 'I will tell the truth even when it is harder than the lie.',

  tileVocab: [
    { word: 'truthful', clue: 'Telling the truth, not lying' },
    { word: 'problem',  clue: 'Something that needs to be solved' },
    { word: 'solution', clue: 'An answer to a problem' },
    { word: 'variable', clue: 'A box that holds a value in code' },
    { word: 'metronome',clue: 'The clicking timer that helps you stay on the beat' },
    { word: 'pattern',  clue: 'Something that repeats in a regular way' }
  ],

  blocks: [
    { id: 'welcome-fri', kind: 'drill', type: 'welcome', title: 'Welcome to Friday', minutes: 2 },

    // ===== SUBJECT 1 — WRITING (Soft Lies) =====
    { id: 'w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 10',
      title: 'What is a soft lie?',
      body: [
        'A <strong>soft lie</strong> is a lie that doesn\'t feel like a lie. It sounds small. It sounds polite. But over time, soft lies do real damage — to other people, and to you.',
        'A soft lie is when you say something true-sounding to <strong>avoid the hard thing in front of you</strong>. The hard thing might be admitting you didn\'t do it. Or saying you don\'t understand. Or telling someone you\'re upset. Or doing actual work instead of pretending you did.'
      ],
      check: { q: 'A soft lie is told to avoid what?',
        choices: ['Telling the truth on a test', 'A hard thing right in front of you', 'Doing your handwriting neatly'],
        right: 1 },
      cta: 'Got it' },

    { id: 'w-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Writing', tag: 'Writing · 02 of 10',
      title: 'Six examples of soft lies',
      body: [
        '<strong>"Yeah, I get it."</strong> When you don\'t really. This is the big one. This is the one we\'re here for. Saying \"I get it\" so the conversation moves on, when you haven\'t actually learned it.',
        '<strong>"I\'m fine."</strong> When you\'re not. Soft lie to avoid the harder conversation about what\'s actually wrong.',
        '<strong>"I cleaned my room."</strong> When you shoved everything in the closet.',
        '<strong>"I forgot."</strong> When you remembered but didn\'t want to do it.',
        '<strong>"I tried."</strong> When you didn\'t really try.',
        '<strong>"Almost done."</strong> When you haven\'t really started.'
      ],
      check: { q: 'Which of these examples is the "big one" — the soft lie this whole day is about?',
        choices: ['"I forgot"', '"Yeah, I get it"', '"I cleaned my room"'],
        right: 1 },
      cta: 'I see it' },

    { id: 'w-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 03 of 10',
      title: 'Teach it back — what is a soft lie?',
      prompt: 'In your own words, type out what a soft lie is. Don\'t copy what I wrote — say it the way YOU would explain it to a friend who never heard of it.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 04 of 10',
      title: 'Why "I get it" is the worst one',
      body: [
        '\"Yeah, I get it\" feels harmless. The conversation moves on. Nobody got hurt. Right?',
        'Wrong. Every time you say it without meaning it, three things happen at once: you fall behind because you didn\'t actually learn it. The person you said it to trusts you less the NEXT time you say something. And worst of all, you start to believe yourself — you can\'t tell the difference between what you really know and what you said you knew.',
        'That last one is the trap. People who fall into it spend years making decisions on a map that isn\'t real.'
      ],
      check: { q: 'What\'s the worst thing about saying "I get it" when you don\'t?',
        choices: ['You waste five minutes', 'You start lying to yourself and can\'t tell what you really know', 'The teacher gets mad'],
        right: 1 },
      cta: 'Heavy' },

    { id: 'w-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 05 of 10',
      title: 'Three ways soft lies damage your life',
      body: [
        '<strong>1. Trust erodes.</strong> People stop believing what you say — even the true parts. Once trust drops, it takes years to earn back.',
        '<strong>2. Problems get deferred.</strong> The soft lie buys you 5 minutes and costs you 5 days. The math you said you got? You\'ll still have to learn it eventually — but now you have to un-learn the fake confidence first.',
        '<strong>3. You lie to yourself.</strong> After enough soft lies, you can\'t tell what you actually know. You make decisions on a fake map.'
      ],
      check: { q: 'A soft lie "buys you 5 minutes and costs you" what?',
        choices: ['Nothing — it works out', '5 days', 'A dollar'], right: 1 },
      cta: 'Got it' },

    { id: 'w-06', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Writing', tag: 'Writing · 06 of 10',
      title: 'Teach it back — name a soft lie YOU said',
      prompt: 'Type out a soft lie YOU said recently. Not someone else — you. Then say what the hard thing was that you were trying to avoid. Be honest. This is just between us.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-07', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Writing', tag: 'Writing · 07 of 10',
      title: 'Type the promise — three times perfect',
      prompt: 'Type this sentence exactly. Three times in a row. No typos. If you mess up, the count starts over.',
      target: 'I will tell the truth even when it is harder than the lie.',
      reps: 3, cta: 'Done' },

    { id: 'w-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 08 of 10',
      title: 'How to catch yourself before a soft lie',
      body: [
        'The moment right before a soft lie has a feeling to it. It\'s small but it\'s there. It feels like rushing — the conversation feels heavy and you want it to stop.',
        'That feeling is your warning bell. When you notice it, take ONE breath. Then say the harder thing instead. \"Actually, I don\'t totally get it — can you say it one more way?\" That\'s the move.',
        'It feels embarrassing the first 5 times. After that it feels like nothing. And it changes the whole rest of your life.'
      ],
      check: { q: 'What\'s the move when you feel the soft-lie urge?',
        choices: ['Push through and say it anyway', 'Take one breath, then say the harder true thing instead', 'Change the subject'],
        right: 1 },
      cta: 'Got it' },

    { id: 'w-09', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Writing', tag: 'Writing · 09 of 10',
      title: 'Write your one move',
      prompt: 'Next time you feel the urge to say "I get it" when you don\'t — what will you say instead? Type out the exact words you\'ll use. Make it short enough you\'ll actually say it.',
      minChars: 120, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 10 of 10',
      title: 'The promise',
      body: [
        'You can\'t un-learn this. Now that you know what a soft lie is, you\'ll hear yourself say them.',
        'That\'s OK. Catching yourself IS the work. The first 100 times you catch a soft lie before you say it, that\'s 100 reps of building real honesty. Most adults never even start.',
        'Friday\'s writing subject is done. You earned it the hard way — by typing.'
      ],
      check: { q: 'What does it take to start building real honesty?',
        choices: ['Never feeling the soft-lie urge again', 'Catching the soft lie before you say it, over and over', 'Telling everyone about it'],
        right: 1 },
      cta: 'Lock it in' },

    // ===== SUBJECT 2 — SPELLING (Problem + Solution) =====
    { id: 's-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 01 of 10',
      title: 'Never bring a problem without a solution',
      body: [
        'When something goes wrong, most people walk up to someone and say <em>"there\'s a problem."</em> And then they stop. They wait for the other person to figure it out.',
        'That\'s half-work. And in the real world, it makes people not want to deal with you.',
        'The rule for the rest of your life: <strong>whenever you bring a problem to someone, bring at least one proposed solution with it.</strong> Even if your solution is wrong. Even if you\'re not sure. The act of trying to solve it before you ask is what builds your brain.'
      ],
      check: { q: 'When you bring a problem to someone, you should also bring what?',
        choices: ['An apology', 'At least one proposed solution', 'A snack'], right: 1 },
      cta: 'Got it' },

    { id: 's-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 02 of 10',
      title: 'Wrong vs Right',
      body: [
        '<strong>Wrong:</strong> "My headphones broke."<br><strong>Right:</strong> "My headphones broke. I think I can use the old pair in the drawer until we figure out new ones — does that work?"',
        '<strong>Wrong:</strong> "I don\'t get the math homework."<br><strong>Right:</strong> "I don\'t get the math homework. I tried problem 3 and got stuck on the second step where you have to divide. Can we look at that part?"',
        'Notice what the "right" versions do: they name the problem, they show you tried, and they propose a path forward. That\'s the move every time.'
      ],
      check: { q: 'The "right" versions all do three things — which one is NOT one of them?',
        choices: ['Name the problem', 'Show you tried', 'Blame someone else'], right: 2 },
      cta: 'Clean' },

    { id: 's-03', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 03 of 10',
      title: 'Spell the problem-solving words',
      intro: 'Type these 8 words exactly. They\'re the words you\'ll use the rest of your life when you talk about problems and solutions. Each one has to be spelled right to pass.',
      words: ['problem', 'solution', 'attempt', 'decision', 'possible', 'mistake', 'challenge', 'judgment'],
      cta: 'Done' },

    { id: 's-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 04 of 10',
      title: 'Why this builds your brain',
      body: [
        'Every time you propose a solution — even a bad one — your brain gets a little better at solving problems.',
        'The kids who learn this rule early get treated like adults early. They get more responsibility. They get listened to. Adults at real jobs are expected to do this every single day.',
        'The flip side: the kids who only bring problems and wait for the answer become adults who only bring problems. People stop including them in important things.'
      ],
      check: { q: 'What happens to kids who learn this rule early?',
        choices: ['They get treated like adults early and get more responsibility', 'Nothing changes — adults still ignore them', 'They get more screen time'],
        right: 0 },
      cta: 'Got it' },

    { id: 's-05', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Spelling', tag: 'Spelling · 05 of 10',
      title: 'Teach it back — the rule in your words',
      prompt: 'Type out the rule in your own words. Not "never bring a problem without a solution" — say it how YOU would say it. Then say why it matters.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-06', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 06 of 10',
      title: 'Spell the action words',
      intro: 'Round two — 8 more words. These are the verbs you\'ll use when you propose a solution.',
      words: ['suggest', 'consider', 'develop', 'address', 'improve', 'prevent', 'struggle', 'respect'],
      cta: 'Done' },

    { id: 's-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 07 of 10',
      title: 'Three things this gets you in the real world',
      body: [
        '<strong>1. People listen to you.</strong> When you walk up with a problem AND a proposed fix, you\'ve done half the thinking. The other person can focus on whether your fix is right, not on whether they have to solve it.',
        '<strong>2. You build a track record.</strong> Even when your fix is wrong, you show you\'re a person who tries. People remember that.',
        '<strong>3. You get to choose.</strong> The person who proposes the first solution usually shapes the conversation. If you bring nothing, someone else picks for you.'
      ],
      check: { q: 'Who usually shapes the conversation when there\'s a problem on the table?',
        choices: ['The loudest person', 'The person who proposes the first solution', 'Whoever brought up the problem first'],
        right: 1 },
      cta: 'Got it' },

    { id: 's-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Spelling', tag: 'Spelling · 08 of 10',
      title: 'Teach it back — your real problem + your real solution',
      prompt: 'Type ONE real problem you have right now (school, MPC, friends, gaming, anything). Then type at least one solution you could try. The solution doesn\'t have to be the right one — it has to be a real attempt. "I don\'t know" doesn\'t count.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-09', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Spelling', tag: 'Spelling · 09 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Type this sentence exactly, three times in a row. No typos. If you mess up, the count starts over.',
      target: 'When I bring a problem I will always bring a solution too.',
      reps: 3, cta: 'Done' },

    { id: 's-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Spelling', tag: 'Spelling · 10 of 10',
      title: 'Lock it in',
      body: [
        'You just typed the rule 3 times perfect. You spelled 16 problem-solving words. You wrote out a real problem and a real solution from your own life.',
        'That\'s how this rule becomes yours. Next time something breaks or goes sideways, you already know what to do: name it, try to solve it, then ask.',
        'Spelling subject done.'
      ],
      check: { q: 'Next time something goes wrong, what\'s your first move?',
        choices: ['Name it, try to solve it, then ask', 'Tell the nearest adult immediately', 'Wait and hope it fixes itself'],
        right: 0 },
      cta: 'Done' },

    // ===== SUBJECT 3 — MPC ONE (Beat-Making) =====
    { id: 'm-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 01 of 10',
      title: 'What is a beat?',
      body: [
        'Almost every song you\'ve ever heard runs on the same invisible grid. It\'s called <strong>4/4 time</strong>.',
        'Music gets divided into <strong>bars</strong>. Each bar has 4 beats: <strong>1, 2, 3, 4</strong>. Then it loops. 1, 2, 3, 4. 1, 2, 3, 4. Forever.',
        'A "beat" — the kind you make on the MPC — is just a pattern of drum sounds placed on that 1-2-3-4 grid. Different sounds on different beats = different song.'
      ],
      check: { q: 'How many beats are in one bar in 4/4 time?',
        choices: ['Three', 'Four', 'Eight'], right: 1 },
      cta: 'Got it' },

    { id: 'm-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 02 of 10',
      title: 'The rule — kicks 1 and 3, snares 2 and 4',
      body: [
        'The simplest beat in the world is this: <strong>kicks on the 1 and the 3. Snares on the 2 and the 4.</strong> That\'s it.',
        'Spelled out: <code>KICK . SNARE . KICK . SNARE .</code> — every bar.',
        'You\'ve heard this pattern in probably 80% of every song on the radio, on TikTok, on Roblox, on YouTube. It\'s the foundation. Today you learn to PLAY it instead of just hear it.'
      ],
      check: { q: 'Where do the snares go in the basic pattern?',
        choices: ['On the 1 and the 3', 'On the 2 and the 4', 'Wherever you want'], right: 1 },
      cta: 'Got it' },

    { id: 'm-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 03 of 10',
      title: 'Why the metronome matters',
      body: [
        'A metronome is a clicking timer that marks each beat. <strong>Tick. Tick. Tick. Tick.</strong>',
        'You play WITH the click. If your kick lands at the same moment as the click on 1 and 3, you\'re "on the grid." If it lands a hair before or after, you\'re "rushing" or "dragging."',
        'The whole point of today\'s homework is to put your kicks and snares EXACTLY where the metronome says they should be. That\'s the skill. Everything fancy in music sits on top of that one skill.'
      ],
      check: { q: 'What does "on the grid" mean?',
        choices: ['Playing whenever feels right', 'Your hits land at the same moment as the metronome click', 'Playing only on whole notes'],
        right: 1 },
      cta: 'Got it' },

    { id: 'm-04', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 04 of 10',
      title: 'Teach it back — where the kicks and snares go',
      prompt: 'Type out where the kicks and snares go in a basic 4/4 beat. Use the words "kick", "snare", "1", "2", "3", "4". Then say what the metronome is for.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-05', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 05 of 10',
      title: 'Sequence 1 — just kicks',
      body: [
        '<strong>Go to your MPC. Do this.</strong>',
        'Set the metronome to <strong>90 BPM</strong>. Pick a pad, assign it a kick sound. Hit the kick pad ONLY on the 1 and the 3 of each bar. Do 4 bars.',
        'Pattern: <code>K . . . K . . . K . . . K . . .</code> (across 4 bars).',
        'Record it. We\'ll listen to it together. The goal: every kick lands at the same moment as the metronome click on 1 and on 3.'
      ],
      check: { q: 'What\'s the BPM you set the metronome to for Sequence 1?',
        choices: ['60', '90', '120'], right: 1 },
      cta: 'On it' },

    { id: 'm-06', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 06 of 10',
      title: 'After Sequence 1 — type what happened',
      prompt: 'Did you do Sequence 1? Type a few sentences saying what felt easy and what felt hard. Was the kick landing on the click? Were you rushing? Be honest — this is how we improve.',
      minChars: 120, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-07', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 07 of 10',
      title: 'Sequence 2 — add snares on 2 and 4',
      body: [
        'Same BPM. Keep the kicks on 1 and 3 from Sequence 1.',
        'Pick a second pad, assign a snare sound. Hit the snare ONLY on the 2 and the 4 of each bar.',
        'Pattern: <code>K . S . K . S . K . S . K . S .</code>',
        'This is the "boom-CLAP-boom-CLAP" feel — the backbone of almost every modern song. Record 4 bars.'
      ],
      check: { q: 'On Sequence 2, where do the snares land?',
        choices: ['On 1 and 3', 'On 2 and 4', 'Everywhere'], right: 1 },
      cta: 'On it' },

    { id: 'm-08', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 08 of 10',
      title: 'After Sequence 2 — how did it feel?',
      prompt: 'Type a few sentences about Sequence 2. Did adding the snares feel natural? Did you lose the kicks when you added them? What did the "boom-CLAP" pattern sound like compared to just kicks?',
      minChars: 140, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-09', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 09 of 10',
      title: 'Sequence 3 — hi-hats on every 8th',
      body: [
        'Same BPM. Keep the kicks and snares.',
        'Pick a third pad, assign a closed hi-hat sound. Hit the hi-hat on every <strong>8th note</strong> — that\'s 8 hi-hat hits per bar, twice as fast as the kicks and snares.',
        'Pattern: <code>K h S h K h S h</code> (per bar) — hat between AND on top of every kick and snare.',
        'If 8 hats per bar feels too fast, slow the metronome to 80 to lock it in, then bring it back to 90 once it\'s clean. Record 4 bars.'
      ],
      check: { q: 'On every WHAT do the hi-hats land in Sequence 3?',
        choices: ['Every beat (4 per bar)', 'Every 8th note (8 per bar)', 'Every 16th note (16 per bar)'], right: 1 },
      cta: 'On it' },

    { id: 'm-10', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 10 of 10',
      title: 'Teach it back — the whole MPC block',
      prompt: 'Type out the basic 4/4 beat in your own words. Explain where the kicks go, where the snares go, where the hi-hats go, and why the metronome matters. Then say what part of today\'s MPC homework was the hardest and why.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    // ===== SUBJECT 4 — ROBLOX CODING (Lua intro) =====
    { id: 'c-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 01 of 10',
      title: 'What is code?',
      body: [
        'You told me you don\'t know coding. By the end of today\'s coding subject, you\'ll know more than most adults.',
        '<strong>Code is just instructions.</strong> A list of orders you give to a computer, one line at a time. The computer reads each line, does what it says, then moves to the next line. That\'s it. That\'s coding.',
        'Roblox uses a language called <strong>Lua</strong>. Say it out loud — "LOO-uh". When you build a Roblox game, you write Lua to make stuff happen.'
      ],
      check: { q: 'What language does Roblox use for code?',
        choices: ['Python', 'Lua', 'JavaScript'], right: 1 },
      cta: 'Got it' },

    { id: 'c-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 02 of 10',
      title: 'Variables — a box that holds something',
      body: [
        'A <strong>variable</strong> is a box that holds a value. You name the box, you put something in it, and later you can use what\'s in it.',
        'Example: <code>local score = 0</code> — that line creates a box called "score" and puts the number 0 in it.',
        'Later when the player gets a point, you can change what\'s in the box: <code>score = score + 1</code>. Now the box holds 1.',
        'Almost everything in a Roblox game is variables: the player\'s health, their coins, what level they\'re on, where they are in the world.'
      ],
      check: { q: 'What is a variable?',
        choices: ['A box that holds a value, with a name you choose', 'A type of Roblox part', 'A sound effect'],
        right: 0 },
      cta: 'Got it' },

    { id: 'c-03', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 03 of 10',
      title: 'Type your first variable',
      prompt: 'Type this exactly — three times in a row. Code is unforgiving: one wrong character breaks the whole thing. The keyword "local" matters. The "=" matters. The spaces matter.',
      target: 'local score = 0',
      reps: 3, cta: 'Done' },

    { id: 'c-04', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 04 of 10',
      title: 'Teach it back — what is a variable?',
      prompt: 'In your own words, type out what a variable is. Then give one example of what a variable could hold in a Roblox game.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 05 of 10',
      title: 'print() — your first command',
      body: [
        '<code>print()</code> is the first command every coder ever learns. It takes whatever you put inside the parentheses and shows it on the screen.',
        '<code>print("hello world")</code> — that line tells the computer: "show the words hello world on the screen."',
        'In Roblox Studio, when you run that line, you see "hello world" in the Output window. It\'s small, but it\'s your code talking to you for the first time. Every programmer ever has typed those exact words.'
      ],
      check: { q: 'What does print() do?',
        choices: ['Sends something to a real printer', 'Shows whatever\'s inside the parentheses on the screen', 'Deletes a variable'],
        right: 1 },
      cta: 'Got it' },

    { id: 'c-06', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 06 of 10',
      title: 'Type "hello world" — perfect',
      prompt: 'Type this exactly — three times in a row. The parentheses matter. The quotes matter. The lowercase matters.',
      target: 'print("hello world")',
      reps: 3, cta: 'Done' },

    { id: 'c-07', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 07 of 10',
      title: 'if / then — making things happen on a condition',
      body: [
        '<strong>if/then</strong> lets your code DECIDE. You give it a condition. If the condition is true, the code runs. If it\'s false, the code skips.',
        'Example: <code>if score > 10 then print("you win") end</code>. That line means: if the score is bigger than 10, show "you win". Otherwise, skip it.',
        'Every game decision in Roblox is an if/then. If the player touches the wall, take 5 health away. If the timer hits zero, end the round. If a kid clicks the buy button AND they have enough coins, give them the item. All if/thens stacked up.'
      ],
      check: { q: 'What does if/then let your code do?',
        choices: ['Make a decision based on a condition', 'Loop forever', 'Save the game to a file'], right: 0 },
      cta: 'Got it' },

    { id: 'c-08', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 08 of 10',
      title: 'Teach it back — what does if/then do?',
      prompt: 'Type out what if/then does in code. Then give one example of an if/then you\'d use in a Roblox game you\'d want to make.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 09 of 10',
      title: 'Loops — doing something over and over',
      body: [
        'A <strong>loop</strong> tells the computer to do something over and over until you tell it to stop.',
        'Example: <code>for i = 1, 10 do print(i) end</code>. That tells the computer: "starting at 1, going up to 10, print the number each time." It prints 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.',
        'Loops are how Roblox games do anything that repeats: spawning enemies, refreshing the leaderboard every 5 seconds, checking if any player is touching the lava block. Without loops, your code would only run once and stop.'
      ],
      check: { q: 'What\'s a loop for?',
        choices: ['Running the same thing over and over until you stop', 'Saving the game', 'Naming a variable'],
        right: 0 },
      cta: 'Got it' },

    { id: 'c-10', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Roblox Coding', tag: 'Coding · 10 of 10',
      title: 'Teach it back — what would YOU build?',
      prompt: 'You now know variables, print(), if/then, and loops. Those four things are enough to build a real game. Type out what kind of Roblox game you\'d want to make someday. What would the player do? What would the leaderboard track? Where would you use an if/then?',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'report-card-fri', kind: 'drill', type: 'report-card', title: 'Friday — show Mom & Dad', minutes: 2 }
  ]
};
