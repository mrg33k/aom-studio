/* Summer School — FRIDAY curriculum (built 2026-05-29, expanded 3x)
 *
 * 2nd pass 2026-05-29: Patrik: "Each section needs to be 3 times longer.
 * I got to question 12 in only a few minutes." Expanded 4 subjects from
 * 10 modules each to 30 each. More concept depth, more teach-backs
 * interspersed so typing time actually slows him down, more typing-precise
 * reps, more spelling-drill rounds.
 *
 * Total: 30 × 4 subjects + welcome + report-card = 122 blocks.
 *
 * unlockAll: true — Patrik: "none of the modules should be locked." All
 * 122 cards are tappable from the start. The gates are inside each block
 * (typing + spelling), not at the hub level.
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
      "<strong>Writing — Soft Lies.</strong> 30 modules. The full landscape — what they are, where they show up (friendships, family, online, in your own head), how trust math works, how to spot them and stop them.",
      "<strong>Spelling — Problem + Solution.</strong> 30 modules. The rule, the action words you'll use the rest of your life, breaking big problems into smaller ones, the two-solution rule, who to bring problems to.",
      "<strong>MPC ONE.</strong> 30 modules. Real beat homework. Note values, BPM, velocity, the boom-clap, hi-hats, ghost notes, fills, listening assignments. You'll record actual audio for each sequence.",
      "<strong>Roblox Coding.</strong> 30 modules. You said you don't know coding — today you do. Variables, strings, numbers, math, if/then, else, loops, comments, functions, events."
    ],
    howItWorks: "Every block has a typing gate at the end. Character count + spell-check. No skipping. If you write thin or misspell common words, the Continue button stays locked until you fix it. That's how we know you got it. Plan on 2-3 hours of real work."
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

    // ============================================================
    // SUBJECT 1 — WRITING (Soft Lies) — 30 modules
    // ============================================================

    { id: 'w-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Writing', tag: 'Writing · Kickoff video',
      title: 'Kickoff video — The Effects of Lying',
      video: { title: 'Kickoff video — The Effects of Lying', ytId: 'wbftlDzIALA', creditLine: 'TEDxKids@ElCajon — Georgia Haukom' },
      typedQuestions: [
        { q: 'What did Georgia say lying actually does to your life over time — in your own words? Pick one specific cost she mentioned or one you thought of yourself.', minChars: 160 },
        { q: 'Did anything she said remind you of a soft lie YOU said recently? Be specific — what was it, and what did you think when she described that pattern?', minChars: 140 }
      ],
      cta: 'Done' },


    { id: 'w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 30',
      title: 'What is a soft lie?',
      body: [
        'A <strong>soft lie</strong> is a lie that doesn\'t feel like a lie. It sounds small. It sounds polite. But over time, soft lies do real damage — to other people, and to you.',
        'A soft lie is when you say something true-sounding to <strong>avoid the hard thing in front of you</strong>. The hard thing might be admitting you didn\'t do it. Or saying you don\'t understand. Or telling someone you\'re upset. Or doing actual work instead of pretending you did.'
      ],
      typedCheck: { q: 'A soft lie is told to avoid what?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Writing', tag: 'Writing · 02 of 30',
      title: 'Six examples of soft lies',
      body: [
        '<strong>"Yeah, I get it."</strong> When you don\'t really. This is the big one. This is the one we\'re here for. Saying \"I get it\" so the conversation moves on, when you haven\'t actually learned it.',
        '<strong>"I\'m fine."</strong> When you\'re not. Soft lie to avoid the harder conversation about what\'s actually wrong.',
        '<strong>"I cleaned my room."</strong> When you shoved everything in the closet.',
        '<strong>"I forgot."</strong> When you remembered but didn\'t want to do it.',
        '<strong>"I tried."</strong> When you didn\'t really try.',
        '<strong>"Almost done."</strong> When you haven\'t really started.'
      ],
      typedCheck: { q: 'Which of these examples is the "big one" — the soft lie this whole day is about?', minChars: 60 },
      cta: 'I see it' },

    { id: 'w-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 03 of 30',
      title: 'Teach it back — what is a soft lie?',
      prompt: 'In your own words, type out what a soft lie is. Don\'t copy what I wrote — say it the way YOU would explain it to a friend who never heard of it.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 04 of 30',
      title: 'Why "I get it" is the worst one',
      body: [
        '\"Yeah, I get it\" feels harmless. The conversation moves on. Nobody got hurt. Right?',
        'Wrong. Every time you say it without meaning it, three things happen at once: you fall behind because you didn\'t actually learn it. The person you said it to trusts you less the NEXT time you say something. And worst of all, you start to believe yourself — you can\'t tell the difference between what you really know and what you said you knew.',
        'That last one is the trap. People who fall into it spend years making decisions on a map that isn\'t real.'
      ],
      typedCheck: { q: 'What\'s the worst thing about saying "I get it" when you don\'t?', minChars: 60 },
      cta: 'Heavy' },

    { id: 'w-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 05 of 30',
      title: 'Three ways soft lies damage your life',
      body: [
        '<strong>1. Trust erodes.</strong> People stop believing what you say — even the true parts. Once trust drops, it takes years to earn back.',
        '<strong>2. Problems get deferred.</strong> The soft lie buys you 5 minutes and costs you 5 days. The math you said you got? You\'ll still have to learn it eventually — but now you have to un-learn the fake confidence first.',
        '<strong>3. You lie to yourself.</strong> After enough soft lies, you can\'t tell what you actually know. You make decisions on a fake map.'
      ],
      typedCheck: { q: 'A soft lie "buys you 5 minutes and costs you" what?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-06', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Writing', tag: 'Writing · 06 of 30',
      title: 'Teach it back — name a soft lie YOU said',
      prompt: 'Type out a soft lie YOU said recently. Not someone else — you. Then say what the hard thing was that you were trying to avoid. Be honest. This is just between us.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-07', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Writing', tag: 'Writing · 07 of 30',
      title: 'Type the promise — three times perfect',
      prompt: 'Type this sentence exactly. Three times in a row. No typos. If you mess up, the count starts over.',
      target: 'I will tell the truth even when it is harder than the lie.',
      reps: 3, cta: 'Done' },

    { id: 'w-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 08 of 30',
      title: 'How to catch yourself before a soft lie',
      body: [
        'The moment right before a soft lie has a feeling to it. It\'s small but it\'s there. It feels like rushing — the conversation feels heavy and you want it to stop.',
        'That feeling is your warning bell. When you notice it, take ONE breath. Then say the harder thing instead. \"Actually, I don\'t totally get it — can you say it one more way?\" That\'s the move.',
        'It feels embarrassing the first 5 times. After that it feels like nothing. And it changes the whole rest of your life.'
      ],
      typedCheck: { q: 'What\'s the move when you feel the soft-lie urge?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-09', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Writing', tag: 'Writing · 09 of 30',
      title: 'Write your one move',
      prompt: 'Next time you feel the urge to say "I get it" when you don\'t — what will you say instead? Type out the exact words you\'ll use. Make it short enough you\'ll actually say it.',
      minChars: 120, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-10', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 10 of 30',
      title: 'Soft lies in friendships',
      body: [
        'You and your friends use soft lies on each other all the time. "I love it!" about something you don\'t love. "I\'m busy" when you just don\'t want to hang out. "I didn\'t see your message" when you saw it and waited.',
        'These feel like the polite thing to do. They feel like protecting your friend\'s feelings. But here\'s the trap: when you and your friends always tell each other soft lies, you stop knowing what each other actually thinks. The whole friendship runs on fake reads.',
        'The strongest friendships are the ones where people tell each other the truth — kindly, but truthfully. "Honestly, I don\'t love that game — wanna pick something else?"'
      ],
      typedCheck: { q: 'What happens when friends always tell each other soft lies?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-11', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 11 of 30',
      title: 'Soft lies in family',
      body: [
        'Family is where soft lies get the most use — because you\'re around the same people every day and the small frictions add up. "Yeah I brushed my teeth." "I already did my chores." "I\'m almost done with my homework." "I wasn\'t on the phone."',
        'The trap with family: they\'re the people who NEED to trust your word the most. If your mom or dad can\'t trust what you say about little things (chores, screen time, homework), they can\'t trust you about big things either (where you\'re going, who you\'re with, what\'s really going on at school).',
        'The kids who get the most freedom from their parents are NOT the smoothest liars. They\'re the ones whose word can be trusted on small stuff, which earned them trust on big stuff.'
      ],
      typedCheck: { q: 'How do kids actually earn more freedom from their parents?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-12', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 12 of 30',
      title: 'Teach it back — a soft lie you\'ve heard in family',
      prompt: 'Type out a soft lie you\'ve heard someone in your family say — could be a parent, a sibling, a cousin. Don\'t name who. Just describe the lie and what hard thing they were probably avoiding. Then say what they could have said instead.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-13', kind: 'topic', type: 'concept', minutes: 5, subject: 'Writing', tag: 'Writing · 13 of 30',
      title: 'Soft lies you tell yourself (the worst kind)',
      body: [
        'The soft lies you tell other people are bad. The soft lies you tell YOURSELF are way worse. They\'re the ones nobody calls you out on. So they just sit there and shape your whole life.',
        '"I\'ll start tomorrow." "I would have made the team if I tried." "I don\'t care about that anyway." "It\'s not a big deal." "I\'m not good at this." "Other people just have it easier."',
        'Every one of those sentences is a soft lie to yourself. They sound true. They feel safe. But they\'re you giving yourself permission to not try. Permission to not grow. Permission to stay exactly where you are.',
        'The kids who get really good at anything (music, sports, code, drawing, whatever) all have one thing in common: they stopped letting themselves get away with self-soft-lies.'
      ],
      typedCheck: { q: 'What\'s the danger of soft lies you tell YOURSELF?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-14', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 14 of 30',
      title: 'The "I\'ll do it later" trap',
      body: [
        '"I\'ll do it later" is one of the most expensive sentences in the English language. It\'s a soft lie nine times out of ten.',
        'Here\'s how the trap works: saying "later" gives your brain a small reward right now. You feel like you\'ve "decided" — the responsibility shifts off your shoulders. But your brain treats the rest of the day like it already DID the thing. So by the time later comes, your motivation is already spent.',
        'The honest version: "I don\'t want to do this right now." That sentence at least tells the truth. From there you can decide: do it anyway, or genuinely schedule it for a specific later time you\'ll actually keep.'
      ],
      typedCheck: { q: 'Why is "I\'ll do it later" usually a soft lie?', minChars: 60 },
      cta: 'Heavy' },

    { id: 'w-15', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 15 of 30',
      title: 'Teach it back — an "I\'ll do it later" YOU said',
      prompt: 'Type out a specific "I\'ll do it later" you said in the last week — about a chore, homework, MPC practice, anything. What was it? Did "later" actually arrive? If it didn\'t, what was the real reason?',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-16', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Writing', tag: 'Writing · 16 of 30',
      title: 'Type it — I will not say I tried when I did not',
      prompt: 'Three times in a row, no typos. If you mess up, the count starts over.',
      target: 'I will not say I tried when I did not try.',
      reps: 3, cta: 'Done' },

    { id: 'w-17', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 17 of 30',
      title: 'Soft lies online (likes, comments, fake nice)',
      body: [
        'Online is where soft lies happen 50 times a day without you noticing. Hitting like on a post you didn\'t actually look at. "Cool!" comments you don\'t mean. Sending heart emojis to things that don\'t make you feel anything.',
        'Some of this is just being polite. But when EVERY post gets fake praise, nothing real gets through. Your friend who posts something they actually care about can\'t tell the real reactions from the polite ones.',
        'Honest move: don\'t hit like unless you actually looked. Don\'t comment "🔥🔥" unless something actually impressed you. Silence is more respectful than fake praise.'
      ],
      typedCheck: { q: 'What\'s the cost of fake praise on every post?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-18', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 18 of 30',
      title: 'How to spot when others use soft lies on YOU',
      body: [
        'You can\'t stop other people from using soft lies on you. But you can get better at noticing.',
        'Signs someone\'s feeding you a soft lie: their answer is way faster than the question deserved. They use a phrase that\'s suspiciously polite ("I\'m good, all good, totally fine"). They look away or change the subject right after.',
        'When you notice — don\'t catch them out loud. Just file it. You don\'t have to call every soft lie. But knowing the ground you\'re standing on isn\'t real lets you ask better questions later.'
      ],
      typedCheck: { q: 'What\'s the move when you spot someone using a soft lie on you?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-19', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 19 of 30',
      title: 'Teach it back — someone who told YOU a soft lie',
      prompt: 'Type out a time someone told YOU a soft lie. What did they say? What was probably the truth? Did you call them out, or just file it? How did that go?',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-20', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 20 of 30',
      title: 'The trust math — small lies compound',
      body: [
        'Trust math works like compound interest, but in reverse.',
        'One soft lie? Costs you almost nothing. Two? Almost nothing. Twenty? Now the person starts wondering what else you\'ve been wrong about. Two hundred? They\'ve quietly recategorized you as someone they don\'t fully trust.',
        'You almost never feel the line where it flips. There\'s no announcement. They just start checking your work behind your back. They stop asking for your opinion. They include you less in important things. By the time you notice, you\'ve been there for months.',
        'The flip side is also true. Every truth told — especially the uncomfortable ones — compounds in your favor.'
      ],
      typedCheck: { q: 'How does trust math work?', minChars: 60 },
      cta: 'Heavy' },

    { id: 'w-21', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 21 of 30',
      title: 'What honest sounds like',
      body: [
        'Honest doesn\'t mean blunt. It doesn\'t mean rude. It doesn\'t mean dumping everything you think on everyone you meet.',
        'Honest sounds like: "I don\'t know yet, but I\'ll find out." "I haven\'t started — can I get to it tomorrow morning instead?" "I disagree with that part, but I see what you mean about the rest." "I\'m not really listening right now, can we talk about it after dinner?"',
        'Notice the shape: honest answers usually take more words than soft lies. They\'re slower. They cost a little discomfort up front. But they buy real trust over time.'
      ],
      typedCheck: { q: 'What shape do honest answers usually have?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-22', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Writing', tag: 'Writing · 22 of 30',
      title: 'Teach it back — the honest version of last week\'s "I get it"',
      prompt: 'Last week you said "I get it" about a lesson and clicked through. What was the honest version you could have said instead? Type out the exact words. Then say what the harder, truer conversation might have sounded like after.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-23', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Writing', tag: 'Writing · 23 of 30',
      title: 'Type it — I would rather be uncomfortable',
      prompt: 'Three times in a row, no typos.',
      target: 'I would rather be uncomfortable than lie.',
      reps: 3, cta: 'Done' },

    { id: 'w-24', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 24 of 30',
      title: 'Apologizing for a past soft lie',
      body: [
        'You\'ve told soft lies. So has everyone. Some of them you can let slide. Some of them are worth going back and cleaning up.',
        'The format that works: name the lie specifically, say what was true, and don\'t add a long explanation. "Hey — last week when I said I cleaned my room, it wasn\'t actually clean. I shoved stuff. I should have just told you. I\'ll do it for real this weekend."',
        'Notice what the apology does NOT include: excuses, blame, "but you also...", or a promise to never do it again (you probably will, you\'re human). Just: I lied. Here\'s the truth. Here\'s what\'s next.'
      ],
      typedCheck: { q: 'What should a real apology for a soft lie NOT include?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-25', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Writing', tag: 'Writing · 25 of 30',
      title: 'Teach it back — write a real apology',
      prompt: 'Pick one specific soft lie you told in the last month — to a parent, friend, sibling, teacher, anyone. Now write the apology, using the format from the last block: name the lie, say what was true, name what\'s next. No excuses, no blame. Type it as if you\'re about to send it.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-26', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 26 of 30',
      title: 'The brain effect — how lies become habit',
      body: [
        'Every time you do something, your brain wires that action a little stronger. Soft lies are no different. The 50th time you say "I\'m fine" without meaning it, your brain doesn\'t even check whether you\'re fine anymore. The sentence just runs on autopilot.',
        'This is why catching yourself early matters. If you catch your soft-lie urge after 5 reps, you can undo it pretty fast. After 5,000 reps, the wiring is permanent. You\'ll lie to your future spouse, your future kids, your future boss without even noticing.',
        'You\'re 12. Your wiring is still soft. Every soft lie you catch right now is a permanent change to who you become.'
      ],
      typedCheck: { q: 'Why does catching soft lies right now (at 12) matter so much?', minChars: 60 },
      cta: 'Locked in' },

    { id: 'w-27', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 27 of 30',
      title: 'Why honest people get more chances in life',
      body: [
        'Honest people get more chances because other people stop having to check their work.',
        'When someone\'s word is good, the people around them save energy. They don\'t have to verify. They don\'t have to brace for surprises. They can hand over bigger things — bigger projects, more money, more responsibility — because the cost of being wrong about that person\'s word is low.',
        'Smooth liars look like they\'re winning early — they get out of more trouble, they avoid more chores, they keep more options open. By 30, they\'re working twice as hard for half as many real opportunities, because the people around them quietly took them off the "trust this person with big stuff" list.'
      ],
      typedCheck: { q: 'Why do smooth liars do worse by age 30?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-28', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 28 of 30',
      title: 'Teach it back — someone honest you admire',
      prompt: 'Type about one person you know who is honest — a parent, teacher, coach, friend, sibling, family friend. What makes them feel trustworthy? Give a specific example of something honest they said or did. Then say what you want to take from how they operate.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'w-29', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 29 of 30',
      title: 'The promise',
      body: [
        'You can\'t un-learn this. Now that you know what a soft lie is, you\'ll hear yourself say them.',
        'That\'s OK. Catching yourself IS the work. The first 100 times you catch a soft lie before you say it, that\'s 100 reps of building real honesty. Most adults never even start.',
        'You\'re going to slip. We all do. The goal isn\'t perfect. The goal is noticing the next one, and the one after that.'
      ],
      typedCheck: { q: 'What\'s the goal?', minChars: 60 },
      cta: 'Got it' },

    { id: 'w-30', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 30 of 30',
      title: 'Lock it in — Writing subject done',
      body: [
        'You just finished 30 modules on soft lies. You typed for over an hour. You named your own soft lies in writing. You wrote an apology. You typed three promise-sentences perfectly.',
        'That\'s not knowledge anymore — that\'s muscle. Soft lies will keep showing up. You just got way better at spotting them in the moment.',
        'Writing subject locked in.'
      ],
      typedCheck: { q: 'After 30 modules of this, what do you have that you didn\'t before?', minChars: 60 },
      cta: 'Lock it in' },

    // ============================================================
    // SUBJECT 2 — SPELLING (Problem + Solution) — 30 modules
    // ============================================================

    { id: 's-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Spelling', tag: 'Spelling · Kickoff video',
      title: 'Kickoff video — Don\'t Bring Me Problems, Bring Me Solutions',
      video: { title: 'Kickoff video — Don\'t Bring Me Problems, Bring Me Solutions', ytId: 'xqZ0Typ5Y9w', creditLine: 'Nordic Business Forum — Adam Grant' },
      typedQuestions: [
        { q: "What is Adam Grant's main point about why people should bring solutions, not just problems? Say it in your own words.", minChars: 140 },
        { q: "Think of one problem you've brought to a parent or teacher recently. If you had to redo it using Adam's rule, what would you say differently?", minChars: 160 }
      ],
      cta: 'Done' },


    { id: 's-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 01 of 30',
      title: 'Never bring a problem without a solution',
      body: [
        'When something goes wrong, most people walk up to someone and say <em>"there\'s a problem."</em> And then they stop. They wait for the other person to figure it out.',
        'That\'s half-work. And in the real world, it makes people not want to deal with you.',
        'The rule for the rest of your life: <strong>whenever you bring a problem to someone, bring at least one proposed solution with it.</strong> Even if your solution is wrong. Even if you\'re not sure. The act of trying to solve it before you ask is what builds your brain.'
      ],
      typedCheck: { q: 'When you bring a problem to someone, you should also bring what?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 02 of 30',
      title: 'Wrong vs Right',
      body: [
        '<strong>Wrong:</strong> "My headphones broke."<br><strong>Right:</strong> "My headphones broke. I think I can use the old pair in the drawer until we figure out new ones — does that work?"',
        '<strong>Wrong:</strong> "I don\'t get the math homework."<br><strong>Right:</strong> "I don\'t get the math homework. I tried problem 3 and got stuck on the second step where you have to divide. Can we look at that part?"',
        'Notice what the "right" versions do: they name the problem, they show you tried, and they propose a path forward. That\'s the move every time.'
      ],
      typedCheck: { q: 'The "right" versions all do three things — which one is NOT one of them?', minChars: 60 },
      cta: 'Clean' },

    { id: 's-03', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 03 of 30',
      title: 'Spell the problem-solving words (round 1)',
      intro: 'Type these 8 words exactly. They\'re the words you\'ll use the rest of your life when you talk about problems and solutions.',
      words: ['problem', 'solution', 'attempt', 'decision', 'possible', 'mistake', 'challenge', 'judgment'],
      cta: 'Done' },

    { id: 's-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 04 of 30',
      title: 'Why this builds your brain',
      body: [
        'Every time you propose a solution — even a bad one — your brain gets a little better at solving problems.',
        'The kids who learn this rule early get treated like adults early. They get more responsibility. They get listened to. Adults at real jobs are expected to do this every single day.',
        'The flip side: the kids who only bring problems and wait for the answer become adults who only bring problems. People stop including them in important things.'
      ],
      typedCheck: { q: 'What happens to kids who learn this rule early?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-05', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Spelling', tag: 'Spelling · 05 of 30',
      title: 'Teach it back — the rule in your words',
      prompt: 'Type out the rule in your own words. Not "never bring a problem without a solution" — say it how YOU would say it. Then say why it matters.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-06', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 06 of 30',
      title: 'Spell the action words (round 2)',
      intro: '8 more words. These are the verbs you\'ll use when you propose a solution.',
      words: ['suggest', 'consider', 'develop', 'address', 'improve', 'prevent', 'struggle', 'respect'],
      cta: 'Done' },

    { id: 's-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 07 of 30',
      title: 'Three things this gets you in the real world',
      body: [
        '<strong>1. People listen to you.</strong> When you walk up with a problem AND a proposed fix, you\'ve done half the thinking. The other person can focus on whether your fix is right, not on whether they have to solve it.',
        '<strong>2. You build a track record.</strong> Even when your fix is wrong, you show you\'re a person who tries. People remember that.',
        '<strong>3. You get to choose.</strong> The person who proposes the first solution usually shapes the conversation. If you bring nothing, someone else picks for you.'
      ],
      typedCheck: { q: 'Who usually shapes the conversation when there\'s a problem on the table?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-08', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Spelling', tag: 'Spelling · 08 of 30',
      title: 'Teach it back — your real problem + your real solution',
      prompt: 'Type ONE real problem you have right now (school, MPC, friends, gaming, anything). Then type at least one solution you could try. The solution doesn\'t have to be the right one — it has to be a real attempt. "I don\'t know" doesn\'t count.',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-09', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Spelling', tag: 'Spelling · 09 of 30',
      title: 'Type the rule — three times perfect',
      prompt: 'Type this sentence exactly, three times in a row.',
      target: 'When I bring a problem I will always bring a solution too.',
      reps: 3, cta: 'Done' },

    { id: 's-10', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 10 of 30',
      title: 'The lazy version vs the strong version',
      body: [
        '<strong>Lazy version:</strong> "I\'m bored." (Problem stated, no solution. Waiting for someone else to fix your boredom.)',
        '<strong>Strong version:</strong> "I\'m bored — I was thinking about either practicing MPC for 20 minutes or finishing the Lego thing on my desk. Which would be better?" (Problem named, two solutions proposed, you\'re asking for help picking, not asking someone to fix it.)',
        'Notice that the strong version makes you MORE fun to be around. People want to help you when you\'ve already done some of the work. They get tired of you when you keep handing them blank problems.'
      ],
      typedCheck: { q: 'What makes the "strong version" different from the lazy one?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-11', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 11 of 30',
      title: 'Spell the thinking words (round 3)',
      intro: '8 more words — the verbs for the thinking part. You\'ll use these when you\'re working through a problem before bringing it to someone.',
      words: ['analyze', 'evaluate', 'compare', 'examine', 'question', 'reflect', 'observe', 'understand'],
      cta: 'Done' },

    { id: 's-12', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 12 of 30',
      title: 'What "I don\'t know" actually means',
      body: [
        '"I don\'t know" is the most common almost-soft-lie in the problem-solving world. Sometimes it means "I genuinely have no idea." But way more often it means: "I haven\'t thought about it for 30 seconds."',
        'Try this next time you\'re about to say "I don\'t know": stop and ask yourself one question. "If I HAD to guess, what would I guess?" That guess is your first solution. It might be wrong. It\'s still better than "I don\'t know" because it gives the other person something to push on.',
        'The conversion is: "I don\'t know" → "If I had to guess, I\'d try X."'
      ],
      typedCheck: { q: 'How do you convert "I don\'t know" into a real proposal?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-13', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Spelling', tag: 'Spelling · 13 of 30',
      title: 'Teach it back — convert an "I don\'t know"',
      prompt: 'Think of a time you recently said "I don\'t know" about something. Type out what the question was. Then do the conversion: "If I had to guess, I\'d try ___." Make your guess real, even if you\'re not sure it would work.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-14', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 14 of 30',
      title: 'How to break a big problem into smaller ones',
      body: [
        'Some problems are too big to solve in one move. "I don\'t like school." "My team always loses." "I never finish things I start."',
        'You can\'t bring a SOLUTION to "I don\'t like school" because the problem is too big. The move is to break it into pieces small enough to actually solve. "What part of school is the worst?" → "Math." → "What part of math?" → "Word problems." → "Why word problems?" → "I can\'t figure out what they\'re asking."',
        'Now you have a real problem ("I can\'t figure out what word problems are asking") with a real solution shape ("Practice reading word problems out loud and underlining the question").',
        'A big problem is just lots of small problems wearing a trench coat.'
      ],
      typedCheck: { q: 'What\'s the move when a problem feels too big to solve?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-15', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Spelling', tag: 'Spelling · 15 of 30',
      title: 'Type it — a big problem is just lots of small ones',
      prompt: 'Three times in a row, no typos.',
      target: 'A big problem is just lots of small problems wearing a trench coat.',
      reps: 3, cta: 'Done' },

    { id: 's-16', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 16 of 30',
      title: 'Spell the outcome words (round 4)',
      intro: 'These are the words for the result side — what happens after you try a solution.',
      words: ['result', 'consequence', 'success', 'failure', 'progress', 'achieve', 'complete', 'finish'],
      cta: 'Done' },

    { id: 's-17', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 17 of 30',
      title: 'Solutions don\'t have to be right — they have to be real',
      body: [
        'A lot of kids freeze up because they don\'t propose a solution unless they\'re sure it\'s the right one. That\'s a mistake.',
        'A real solution doesn\'t have to work. It has to be a real attempt — a thing you actually thought through, even if you\'re wrong. "I think we should try X" is a real attempt. "I don\'t know if this would work but maybe X" is also a real attempt.',
        'What\'s NOT a real attempt: "Whatever." "I guess." "It doesn\'t matter." Those are sneaky soft lies — they LOOK like solutions but they\'re you giving up while pretending not to.'
      ],
      typedCheck: { q: 'What counts as a "real" attempt at a solution?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-18', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Spelling', tag: 'Spelling · 18 of 30',
      title: 'Teach it back — a "bad" solution you\'d still propose',
      prompt: 'Pick a real problem you don\'t know how to solve. Now propose a solution you think is probably wrong — but is a real attempt. Then say why you\'d still bring it up instead of staying silent.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-19', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 19 of 30',
      title: 'The two-solution rule',
      body: [
        'Power-up version of the main rule: whenever you can, bring TWO solutions instead of one. "Here\'s the problem. I see two paths — A or B. I\'d lean toward A because of X, but B has Y going for it. What do you think?"',
        'This works better than one solution for two reasons. First, it forces YOU to think harder — you can\'t just lock onto your first idea. Second, the person you\'re talking to feels like a partner instead of a judge. They\'re comparing your two paths, not deciding whether your one is good enough.',
        'You\'ll find that pretty often, neither A nor B is what gets picked — but a smarter third option comes out of the conversation. That only happens because you brought two.'
      ],
      typedCheck: { q: 'Why does bringing TWO solutions usually work better than one?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-20', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Spelling', tag: 'Spelling · 20 of 30',
      title: 'Teach it back — your problem with TWO solutions',
      prompt: 'Take the problem you wrote about in block 08. Now type out TWO different solutions for it. Say which one you\'d lean toward and why. Say what the other one has going for it.',
      minChars: 260, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-21', kind: 'topic', type: 'spelling-drill', minutes: 5, subject: 'Spelling', tag: 'Spelling · 21 of 30',
      title: 'Spell the communication words (round 5)',
      intro: 'These are the words for actually proposing — when you walk up to someone with a solution, these are the verbs you use.',
      words: ['suggest', 'recommend', 'propose', 'request', 'mention', 'explain', 'describe', 'clarify'],
      cta: 'Done' },

    { id: 's-22', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 22 of 30',
      title: 'When the problem is bigger than you',
      body: [
        'Some problems really ARE too big for you to solve, even with the breaking-down trick. Bullying. A friend in real trouble. A family thing. A teacher who\'s being unfair to a whole class. These are problems you should still bring forward — but with a different shape.',
        'For big-than-you problems, the "solution" you bring is: "Here\'s what I think we should do FIRST." Not "here\'s the fix." Just the next step. "I think we should talk to the principal." "I think we should tell Mom and let her decide." "I think we should sit down with the coach as a team."',
        'Even on a problem you can\'t solve, you can propose the next step. That\'s still the rule working.'
      ],
      typedCheck: { q: 'For a problem that\'s bigger than you, what does the "solution" look like?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-23', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 23 of 30',
      title: 'Who to bring a problem to',
      body: [
        'Picking who to bring a problem to is half the work. Bring the wrong problem to the wrong person and you\'ll get bad advice and waste both your time.',
        'A few rules of thumb: parents for anything safety-related, money-related, or that affects the family. Friends for stuff about other friends, school social stuff, and how you\'re feeling. Teachers for school stuff specifically and things happening at school. Coaches for team stuff.',
        'When you don\'t know who to bring it to, that\'s a problem in itself — and the solution is to ask one trusted person "who would be the right person to bring this to?" That\'s your real first move.'
      ],
      typedCheck: { q: 'When you don\'t know who to bring a problem to, what\'s the first move?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-24', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Spelling', tag: 'Spelling · 24 of 30',
      title: 'Teach it back — parent vs friend problem',
      prompt: 'Type out a problem you\'d bring to a parent, and a different one you\'d bring to a friend. For each, say WHY that person is the right one to bring it to.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-25', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Spelling', tag: 'Spelling · 25 of 30',
      title: 'Type the promise — three times perfect',
      prompt: 'Three times in a row.',
      target: 'I will not bring a problem to anyone without bringing a solution.',
      reps: 3, cta: 'Done' },

    { id: 's-26', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 26 of 30',
      title: 'Following up — what happens after you propose',
      body: [
        'You bring the problem AND the solution. Great. The conversation happens. A path gets picked. Now what?',
        'Most people stop here and forget about it. The real rule has one more part: <strong>follow up.</strong> A day or a week later, circle back to the person you talked to. "Hey, that thing we talked about with the headphones — I ended up using the old pair like we said. Worked fine. Thanks." Or: "Hey, I tried that math approach but it didn\'t work — I think I need to take another look together. Got 10 minutes this weekend?"',
        'The follow-up is the secret weapon. It makes the person trust you for next time. It teaches you what worked and what didn\'t. Most kids skip it. Most adults skip it. The few people who do it stand out forever.'
      ],
      typedCheck: { q: 'What\'s the secret weapon after you propose and a path gets picked?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-27', kind: 'topic', type: 'concept', minutes: 4, subject: 'Spelling', tag: 'Spelling · 27 of 30',
      title: 'When your solution turns out to be wrong',
      body: [
        'Your solution will be wrong sometimes. That\'s fine. The rule isn\'t "always be right." The rule is "always propose."',
        'When your solution doesn\'t work, the move is: don\'t hide it. Don\'t pretend the problem went away. Don\'t blame the solution on someone else. Go back to the person you proposed it to and say: "I tried X, it didn\'t work. Here\'s what I learned. I think we should try Y now."',
        'You just turned a wrong solution into another real attempt. The cycle keeps going. People notice this. They start to trust your judgment because you take responsibility for both the proposals AND the misses.'
      ],
      typedCheck: { q: 'What\'s the move when your proposed solution turns out to be wrong?', minChars: 60 },
      cta: 'Got it' },

    { id: 's-28', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Spelling', tag: 'Spelling · 28 of 30',
      title: 'Teach it back — a time your first solution didn\'t work',
      prompt: 'Think of a recent time you tried something and it didn\'t work. Type out what the problem was, what you tried first, why it didn\'t work, and what your next attempt could be. If you\'re still figuring out the next attempt, just say so and write your best current guess.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 's-29', kind: 'topic', type: 'concept', minutes: 3, subject: 'Spelling', tag: 'Spelling · 29 of 30',
      title: 'The lifetime gift of this rule',
      body: [
        'This rule is going to do more for your life than almost any single thing you learn in school. People who follow it get promoted faster, get listened to more, build deeper friendships, become better partners and parents, and just generally have more interesting things happen to them.',
        'It\'s not magic. It\'s just that the people who actually try to solve their own problems before asking — and who follow up afterwards — are RARE. There\'s less competition for being that person than you\'d think.',
        'You\'re 12. Most people don\'t figure this out until they\'re 30. You\'ve got an 18-year head start now if you take it.'
      ],
      typedCheck: { q: 'Why is following this rule so powerful in life?', minChars: 60 },
      cta: 'Heavy' },

    { id: 's-30', kind: 'topic', type: 'concept', minutes: 3, subject: 'Spelling', tag: 'Spelling · 30 of 30',
      title: 'Lock it in — Spelling subject done',
      body: [
        'You just spelled 32 problem-solving words exactly. You typed three different promise-sentences perfectly. You wrote out a real problem, then wrote it again with two solutions, then wrote about a time your first attempt didn\'t work.',
        'You don\'t just KNOW the rule anymore. You\'ve practiced it five different ways. Next time something breaks or goes sideways, you already know what to do.',
        'Spelling subject locked in.'
      ],
      typedCheck: { q: 'Next time something goes wrong, what\'s your first move?', minChars: 60 },
      cta: 'Done' },

    // ============================================================
    // SUBJECT 3 — MPC ONE (Beat-Making) — 30 modules
    // ============================================================

    { id: 'm-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'MPC ONE', tag: 'MPC · Kickoff video',
      title: 'Kickoff video — Your First Rock Drum Beat',
      video: { title: 'Kickoff video — Your First Rock Drum Beat', ytId: 'kclUtptKsT8', creditLine: 'Drumeo' },
      typedQuestions: [
        { q: 'Where did the teacher say the KICK lands and where does the SNARE land? Use the numbers 1, 2, 3, and 4 in your answer.', minChars: 120 },
        { q: "What's one thing the video showed you that you're going to try on the MPC today? Be specific — a counting trick, a hand pattern, anything.", minChars: 140 }
      ],
      cta: 'Done' },


    { id: 'm-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 01 of 30',
      title: 'What is a beat?',
      body: [
        'Almost every song you\'ve ever heard runs on the same invisible grid. It\'s called <strong>4/4 time</strong>.',
        'Music gets divided into <strong>bars</strong>. Each bar has 4 beats: <strong>1, 2, 3, 4</strong>. Then it loops. 1, 2, 3, 4. 1, 2, 3, 4. Forever.',
        'A "beat" — the kind you make on the MPC — is just a pattern of drum sounds placed on that 1-2-3-4 grid. Different sounds on different beats = different song.'
      ],
      typedCheck: { q: 'How many beats are in one bar in 4/4 time?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 02 of 30',
      title: 'The rule — kicks 1 and 3, snares 2 and 4',
      body: [
        'The simplest beat in the world is this: <strong>kicks on the 1 and the 3. Snares on the 2 and the 4.</strong> That\'s it.',
        'Spelled out: <code>KICK . SNARE . KICK . SNARE .</code> — every bar.',
        'You\'ve heard this pattern in probably 80% of every song on the radio, on TikTok, on Roblox, on YouTube. It\'s the foundation. Today you learn to PLAY it instead of just hear it.'
      ],
      typedCheck: { q: 'Where do the snares go in the basic pattern?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-03', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 03 of 30',
      title: 'Why the metronome matters',
      body: [
        'A metronome is a clicking timer that marks each beat. <strong>Tick. Tick. Tick. Tick.</strong>',
        'You play WITH the click. If your kick lands at the same moment as the click on 1 and 3, you\'re "on the grid." If it lands a hair before or after, you\'re "rushing" or "dragging."',
        'The whole point of today\'s homework is to put your kicks and snares EXACTLY where the metronome says they should be. That\'s the skill. Everything fancy in music sits on top of that one skill.'
      ],
      typedCheck: { q: 'What does "on the grid" mean?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-04', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 04 of 30',
      title: 'Teach it back — where the kicks and snares go',
      prompt: 'Type out where the kicks and snares go in a basic 4/4 beat. Use the words "kick", "snare", "1", "2", "3", "4". Then say what the metronome is for.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-05', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 05 of 30',
      title: 'Note values — whole, half, quarter, eighth',
      body: [
        'In music, notes are measured by how long they last inside one bar. The names sound weird but the math is simple.',
        '<strong>Whole note</strong> — the whole bar. 4 beats long. Hit it once on beat 1, let it ring all the way through.',
        '<strong>Half note</strong> — half a bar. 2 beats long. Two of them fit per bar.',
        '<strong>Quarter note</strong> — one beat. Four of them fit per bar (1, 2, 3, 4). This is the level your kicks and snares live at.',
        '<strong>Eighth note</strong> — half a beat. Eight of them fit per bar (1-and-2-and-3-and-4-and). This is the level your hi-hats live at.'
      ],
      typedCheck: { q: 'A quarter note is how long?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 06 of 30',
      title: 'BPM — what it is, why 90 is medium',
      body: [
        '<strong>BPM</strong> stands for "beats per minute." It\'s how fast or slow a song moves.',
        '60 BPM = one beat per second, like a slow ballad. 120 BPM = two beats per second, like most pop music. 90 BPM = right in between, which is why it\'s a great speed to learn on. Slow enough to actually land each hit. Fast enough to feel like real music.',
        'Hip-hop usually lives between 80-100 BPM. Trap hits around 140-160. EDM sits around 128. When you set the metronome to 90, you\'re practicing in the same pocket as most rap songs ever made.'
      ],
      typedCheck: { q: 'What does BPM stand for?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-07', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 07 of 30',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Kicks on the 1 and the 3, snares on the 2 and the 4.',
      reps: 3, cta: 'Done' },

    { id: 'm-08', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 08 of 30',
      title: 'Sequence 1 — just kicks',
      body: [
        '<strong>Go to your MPC. Do this.</strong>',
        'Set the metronome to <strong>90 BPM</strong>. Pick a pad, assign it a kick sound. Hit the kick pad ONLY on the 1 and the 3 of each bar. Do 4 bars.',
        'Pattern: <code>K . . . K . . . K . . . K . . .</code> (across 4 bars).',
        'Record it. The goal: every kick lands at the same moment as the metronome click on 1 and on 3.'
      ],
      typedCheck: { q: 'What\'s the BPM you set the metronome to for Sequence 1?', minChars: 60 },
      cta: 'On it' },

    { id: 'm-09', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 09 of 30',
      title: 'After Sequence 1 — what happened?',
      prompt: 'Type a few sentences about Sequence 1. Was the kick landing on the click? Were you rushing? Did your hand feel tight or loose? Be honest.',
      minChars: 140, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-10', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 10 of 30',
      title: 'Velocity — soft hits vs hard hits',
      body: [
        'On the MPC, how HARD you hit a pad changes how loud and how heavy the sound is. That\'s called <strong>velocity</strong>. Soft tap = quiet sound. Hard hit = loud sound.',
        'Velocity is what separates a robot-sounding beat from a beat that feels alive. If every kick is exactly the same volume, it sounds mechanical. If some are slightly heavier and some are softer, it sounds like a real drummer.',
        'For Sequence 1 we want all 4 kicks the same volume — that\'s the discipline. But starting in later sequences, we\'ll mess with velocity on purpose.'
      ],
      typedCheck: { q: 'What\'s velocity on the MPC?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-11', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 11 of 30',
      title: 'Sequence 2 — add snares on 2 and 4',
      body: [
        'Same BPM. Keep the kicks on 1 and 3 from Sequence 1.',
        'Pick a second pad, assign a snare sound. Hit the snare ONLY on the 2 and the 4 of each bar.',
        'Pattern: <code>K . S . K . S . K . S . K . S .</code>',
        'This is the "boom-CLAP-boom-CLAP" feel — the backbone of almost every modern song. Record 4 bars.'
      ],
      typedCheck: { q: 'On Sequence 2, where do the snares land?', minChars: 60 },
      cta: 'On it' },

    { id: 'm-12', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 12 of 30',
      title: 'After Sequence 2 — how did it feel?',
      prompt: 'Did adding the snares feel natural? Did you lose the kicks when you added the snare hand? What did the "boom-CLAP" pattern sound like compared to just kicks?',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-13', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 13 of 30',
      title: 'The "boom-clap" feel — what genres use it',
      body: [
        'That boom-CLAP-boom-CLAP pattern you just played is the most common drum pattern in music history. Some examples:',
        '<strong>Hip-hop:</strong> Pretty much every classic — Dre, J Dilla, Kanye, Kendrick. Same kick/snare placement.',
        '<strong>Pop:</strong> Most Top 40 songs. Listen for it next time you hear something on the radio.',
        '<strong>Rock:</strong> Same backbone, usually faster BPM. Foo Fighters, Green Day.',
        '<strong>R&B:</strong> Same kick/snare with more space and softer hits.',
        'When you go listen to any song with this in mind, you\'ll hear it. You\'ll never un-hear it.'
      ],
      typedCheck: { q: 'How widespread is the boom-CLAP pattern?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-14', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 14 of 30',
      title: 'Hi-hats — 8th notes explained',
      body: [
        'Hi-hats are the cymbals that sit on top of the beat — they\'re what makes a drum pattern feel "moving." Without hi-hats, the pattern feels naked.',
        'The standard place for hi-hats is on every 8th note. Remember, 8th notes are half a beat — there are 8 of them per bar.',
        'Counting it out loud: "one-AND-two-AND-three-AND-four-AND." Hit the hi-hat on every number AND every "and."',
        'On top of your kicks (1 and 3) and snares (2 and 4), the hi-hats fill in the spaces AND double the main beats: <code>K-h-S-h-K-h-S-h</code> per bar.'
      ],
      typedCheck: { q: 'How many 8th notes are in one bar?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-15', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 15 of 30',
      title: 'Sequence 3 — add hi-hats on every 8th',
      body: [
        'Same BPM. Keep the kicks and snares.',
        'Pick a third pad, assign a closed hi-hat sound. Hit the hi-hat on every 8th note — 8 hi-hat hits per bar.',
        'Pattern: <code>K h S h K h S h</code> (per bar).',
        'If 8 hats per bar feels too fast, slow the metronome to 80 to lock it in, then bring it back to 90. Record 4 bars.'
      ],
      typedCheck: { q: 'On every WHAT do the hi-hats land in Sequence 3?', minChars: 60 },
      cta: 'On it' },

    { id: 'm-16', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 16 of 30',
      title: 'After Sequence 3 — how did it feel?',
      prompt: 'Was the hi-hat steady? Did the kicks and snares stay on the grid when you added the hat? Did the whole pattern start to sound like a "real" beat?',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-17', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 17 of 30',
      title: '16th notes — splitting the 8ths in half',
      body: [
        '8th notes split each beat into 2 pieces. <strong>16th notes</strong> split each beat into 4 pieces. There are 16 of them per bar.',
        'Counting it: "one-e-and-a, two-e-and-a, three-e-and-a, four-e-and-a." That\'s 16 even hits per bar.',
        '16th notes are where things get fast and detailed. Trap hi-hats run on 16ths (sometimes faster). Snare rolls before a drop run on 16ths. They\'re the "tickity-tickity" feel.',
        'You don\'t need to play 16ths today. But knowing they exist will help you hear them in other songs.'
      ],
      typedCheck: { q: 'How many 16th notes are in one bar?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-18', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 18 of 30',
      title: 'Ghost notes — soft hits between the main ones',
      body: [
        '<strong>Ghost notes</strong> are super-soft hits between the loud ones. You can barely hear them, but they\'re the secret to making a beat feel human.',
        'Example: between the snare on beat 2 and the snare on beat 4, a drummer might add a ghost-snare on the "and" of beat 3. So quiet it almost disappears — but it adds a tiny groove.',
        'Velocity control on the MPC is where ghost notes happen. A normal snare hit might be velocity 100. A ghost note might be velocity 30. Same pad, way softer.',
        'You don\'t need ghost notes today. They\'re a level-2 move. But great producers use them everywhere.'
      ],
      typedCheck: { q: 'What makes a "ghost note" different from a regular hit?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-19', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 19 of 30',
      title: 'Type it — the metronome is the truth',
      prompt: 'Three times in a row, no typos.',
      target: 'The metronome is the truth my hits chase.',
      reps: 3, cta: 'Done' },

    { id: 'm-20', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 20 of 30',
      title: 'Open hat vs closed hat',
      body: [
        'A closed hi-hat is the short "tss" sound — the cymbal is closed tight so the hit dies fast. That\'s what you used in Sequence 3.',
        'An <strong>open hi-hat</strong> is the longer "tssssss" sound — the cymbal is open so the hit rings out. It\'s like a closed hat but the sound bleeds into the next beat.',
        'The classic move: open hat on the "and" of beat 4 — right before the bar loops. The open hat rings out, gets cut off when the next bar starts, and gives the beat a small lift every loop. Almost every modern drum pattern uses this.',
        'On the MPC: you usually have a closed hat pad and an open hat pad as two different pads.'
      ],
      typedCheck: { q: 'What\'s the classic spot for an open hi-hat in a beat?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-21', kind: 'topic', type: 'concept', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 21 of 30',
      title: 'Sequence 4 — make it yours (the creative add)',
      body: [
        'Same BPM. Keep the full foundation: kicks on 1 and 3, snares on 2 and 4, hi-hats on every 8th note.',
        'Add ONE thing of your choice. Just one. Pick from:',
        '<strong>Velocity change.</strong> Some hits louder, some softer. Try making the hi-hats on off-beats softer than the ones on the beats.',
        '<strong>A fill.</strong> At the end of bar 4, instead of the usual snare on 4, add 2 or 3 extra snare hits.',
        '<strong>Open hat swap.</strong> Replace one of your closed hats with an open hat (the classic spot: the "and" of beat 4).',
        'Record 4 bars.'
      ],
      typedCheck: { q: 'How many creative things should you add in Sequence 4?', minChars: 60 },
      cta: 'On it' },

    { id: 'm-22', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 22 of 30',
      title: 'Teach it back — what you added in Sequence 4 and why',
      prompt: 'Type out what you added in Sequence 4. Was it a velocity change, a fill, or an open hat? Why did you pick that one? Did it make the beat feel different — better, worse, weirder?',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-23', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 23 of 30',
      title: 'Fills — what they are, when to use them',
      body: [
        'A <strong>fill</strong> is a short busy section at the end of a phrase that signals "something\'s about to happen." Usually goes at the end of every 4 or 8 bars, right before a chorus, a drop, or a new section.',
        'A simple fill: replace the normal beat-4 snare with three quick snare hits in a row. Or add a tom roll. Or break the hi-hat pattern for one beat.',
        'Fills are like punctuation in writing. Without them, the beat just loops forever and the listener gets bored. With them, you create rhythm at a bigger scale — a "verse paragraph" → fill → "chorus paragraph" → fill, etc.',
        'Rule of thumb: too many fills makes the beat feel chaotic. Save them for the end of phrases.'
      ],
      typedCheck: { q: 'What\'s a fill for, musically?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-24', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 24 of 30',
      title: 'Listening assignment — clap along to a song',
      body: [
        '<strong>Go pick a song you like — anything.</strong> Hip-hop, pop, rock, anything with drums.',
        'Play it. Listen for the kick and the snare. The kick will sound deep and chest-thumping. The snare will sound sharper and slappy.',
        'Now clap along, but ONLY clap when you hear the snare. You should be clapping on the 2 and the 4 of every bar.',
        'If you can hold that clap through the whole song without losing your place, you\'ve internalized the foundation of 4/4 time.'
      ],
      typedCheck: { q: 'When you clap along to a song, where do you clap?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-25', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 25 of 30',
      title: 'Teach it back — pick a song with clear kick-snare',
      prompt: 'Pick a song where you can clearly hear the kick and snare. Type out the song name and artist. Then describe what the kick sounds like and what the snare sounds like. Did you clap along on 2 and 4 — and could you hold it through the whole song?',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-26', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 26 of 30',
      title: 'How drummers count out loud',
      body: [
        'Real drummers count under their breath while they play. It keeps their place locked in.',
        'For quarter notes: <em>"one, two, three, four"</em>',
        'For 8th notes: <em>"one-AND-two-AND-three-AND-four-AND"</em>',
        'For 16th notes: <em>"one-e-and-a, two-e-and-a, three-e-and-a, four-e-and-a"</em>',
        'When you\'re learning a new pattern, count out loud. Yes, it feels dumb. It works anyway. After enough reps the count moves into your head and you don\'t need to say it.'
      ],
      typedCheck: { q: 'How do you count 8th notes out loud?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-27', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 27 of 30',
      title: 'Practicing slow vs practicing fast',
      body: [
        'The biggest mistake new producers make: they crank the BPM up too fast. They want the beat to sound finished, so they play at the speed of the song they\'re trying to make.',
        'Don\'t. Practice slow. Way slower than feels natural. If the final beat is at 90 BPM, practice the pattern at 60 BPM first. Get every hit dead-on the click. Then bring the tempo up 5 BPM at a time.',
        'This is how pros practice. It feels like nothing\'s happening. But every slow rep is hard-wiring the pattern into your hands. After enough slow reps, the speed comes for free.'
      ],
      typedCheck: { q: 'How should you practice a new pattern?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-28', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 28 of 30',
      title: 'Teach it back — what you want to get better at',
      prompt: 'Pick ONE specific thing about the MPC you want to get better at by next Friday. Not "everything." One thing — landing kicks on the click, smoother hi-hats, using two hands instead of one, adding velocity, anything. Type out what it is and how you\'ll practice it.',
      minChars: 200, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'm-29', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 29 of 30',
      title: 'What pro producers do every day',
      body: [
        'Every pro producer you\'ve ever heard of has a daily warm-up routine. It usually starts with the exact same boring thing you did today: kicks on 1 and 3, snares on 2 and 4, metronome on.',
        'They do this for 5-10 minutes before they touch any new beat. Because the foundation is everything. If your foundation gets shaky, every fancy thing on top of it sounds wrong.',
        'Once a week from now on, do this warm-up. 5 minutes. Just the basics. The pros aren\'t doing magic. They\'re just doing the boring thing forever.'
      ],
      typedCheck: { q: 'What\'s the boring thing pro producers do every day before touching new beats?', minChars: 60 },
      cta: 'Got it' },

    { id: 'm-30', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 30 of 30',
      title: 'Lock it in — MPC subject done',
      body: [
        'You just learned: the 4/4 grid, BPM, note values (whole/half/quarter/8th/16th), velocity, ghost notes, open vs closed hats, fills, how to clap along to any song, how to count out loud, and how to practice slow.',
        'You played four sequences with your actual hands on the MPC. You wrote about each one. You picked one thing to get better at this week.',
        'You\'re not pretending to know beats anymore. You actually do.',
        'MPC subject locked in.'
      ],
      typedCheck: { q: 'What\'s the foundation of every beat you\'ll ever make?', minChars: 60 },
      cta: 'Done' },

    // ============================================================
    // SUBJECT 4 — ROBLOX CODING (Lua intro) — 30 modules
    // ============================================================

    { id: 'c-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Roblox Coding', tag: 'Coding · Kickoff video',
      title: 'Kickoff video — Intro to Lua in Roblox',
      video: { title: 'Kickoff video — Intro to Lua in Roblox', ytId: 'LpSe6zut3ME', creditLine: 'B Ricey — How to SCRIPT in Roblox #1' },
      typedQuestions: [
        { q: "What is a script and what does Lua have to do with Roblox? Explain it like you're telling a friend who's never opened Roblox Studio.", minChars: 140 },
        { q: "What's one thing from this video you want to try in Roblox Studio yourself? Could be a print statement, a variable, anything.", minChars: 120 }
      ],
      cta: 'Done' },


    { id: 'c-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 01 of 30',
      title: 'What is code?',
      body: [
        'You told me you don\'t know coding. By the end of today\'s coding subject, you\'ll know more than most adults.',
        '<strong>Code is just instructions.</strong> A list of orders you give to a computer, one line at a time. The computer reads each line, does what it says, then moves to the next line. That\'s it. That\'s coding.',
        'Roblox uses a language called <strong>Lua</strong>. Say it out loud — "LOO-uh". When you build a Roblox game, you write Lua to make stuff happen.'
      ],
      typedCheck: { q: 'What language does Roblox use for code?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 02 of 30',
      title: 'Variables — a box that holds something',
      body: [
        'A <strong>variable</strong> is a box that holds a value. You name the box, you put something in it, and later you can use what\'s in it.',
        'Example: <code>local score = 0</code> — that line creates a box called "score" and puts the number 0 in it.',
        'Later when the player gets a point, you can change what\'s in the box: <code>score = score + 1</code>. Now the box holds 1.',
        'Almost everything in a Roblox game is variables: the player\'s health, their coins, what level they\'re on.'
      ],
      typedCheck: { q: 'What is a variable?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-03', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 03 of 30',
      title: 'Type your first variable',
      prompt: 'Type this exactly — three times in a row. Code is unforgiving: one wrong character breaks the whole thing.',
      target: 'local score = 0',
      reps: 3, cta: 'Done' },

    { id: 'c-04', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 04 of 30',
      title: 'Teach it back — what is a variable?',
      prompt: 'In your own words, type out what a variable is. Then give one example of what a variable could hold in a Roblox game.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 05 of 30',
      title: 'print() — your first command',
      body: [
        '<code>print()</code> is the first command every coder ever learns. It takes whatever you put inside the parentheses and shows it on the screen.',
        '<code>print("hello world")</code> — that line tells the computer: "show the words hello world on the screen."',
        'In Roblox Studio, when you run that line, you see "hello world" in the Output window. Every programmer ever has typed those exact words.'
      ],
      typedCheck: { q: 'What does print() do?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-06', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 06 of 30',
      title: 'Type "hello world" — perfect',
      prompt: 'Type this exactly — three times in a row. The parentheses matter. The quotes matter. The lowercase matters.',
      target: 'print("hello world")',
      reps: 3, cta: 'Done' },

    { id: 'c-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 07 of 30',
      title: 'Numbers in Lua',
      body: [
        'Lua handles numbers without making a big deal of it. You can put a whole number, a decimal, a negative — whatever — into a variable.',
        '<code>local age = 12</code> — whole number.',
        '<code>local price = 9.99</code> — decimal.',
        '<code>local debt = -5</code> — negative.',
        'No special syntax. No "integer" vs "float" choice like in other languages. Lua just figures out what kind of number you handed it.'
      ],
      typedCheck: { q: 'How do you tell Lua what kind of number a variable holds?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-08', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 08 of 30',
      title: 'Type a number variable',
      prompt: 'Three times in a row, no typos.',
      target: 'local age = 12',
      reps: 3, cta: 'Done' },

    { id: 'c-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 09 of 30',
      title: 'Strings — text in Lua',
      body: [
        'A <strong>string</strong> is just text. The word comes from "string of characters" — a row of letters strung together.',
        'You make a string by wrapping it in double quotes: <code>local name = "Ethan"</code> or <code>local message = "hello there"</code>.',
        'The quotes are how Lua knows it\'s text and not a variable name. <code>name</code> without quotes is a variable. <code>"name"</code> with quotes is the actual word "name".',
        'You can also use single quotes if you want: <code>local greeting = \'hi\'</code>. Single or double — pick one and be consistent.'
      ],
      typedCheck: { q: 'How do you tell Lua something is a string and not a variable name?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-10', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 10 of 30',
      title: 'Type a string variable',
      prompt: 'Three times in a row, no typos. The quotes matter.',
      target: 'local name = "Ethan"',
      reps: 3, cta: 'Done' },

    { id: 'c-11', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 11 of 30',
      title: 'Math operators (+, -, *, /)',
      body: [
        'Lua does math with the same symbols you use in school, mostly.',
        '<code>+</code> for plus. <code>-</code> for minus. <code>*</code> for times (NOT × — that\'s the math-class symbol). <code>/</code> for divided by (NOT ÷).',
        'You can use math anywhere Lua expects a number. <code>local total = 5 + 3</code> stores 8. <code>local doubled = score * 2</code> stores twice whatever score is.',
        'Order of operations works the same as math class: parentheses first, then multiply/divide, then add/subtract.'
      ],
      typedCheck: { q: 'What symbol does Lua use for multiplication?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-12', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 12 of 30',
      title: 'Type some math',
      prompt: 'Three times in a row, exactly.',
      target: 'local total = 5 + 3',
      reps: 3, cta: 'Done' },

    { id: 'c-13', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 13 of 30',
      title: 'Teach it back — number vs string',
      prompt: 'Type out the difference between a number and a string in Lua. Give an example of each. Explain why the quotes around a string matter.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-14', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 14 of 30',
      title: 'if / then — making decisions',
      body: [
        '<strong>if/then</strong> lets your code DECIDE. You give it a condition. If the condition is true, the code runs. If it\'s false, the code skips.',
        'Example: <code>if score > 10 then print("you win") end</code>. That line means: if score is bigger than 10, show "you win". Otherwise, skip it.',
        'Every if/then needs an <code>end</code> at the bottom to close it off. Forget the end and the whole thing breaks.',
        'Every game decision in Roblox is an if/then. If the player touches the wall, take 5 health away. If the timer hits zero, end the round. All if/thens stacked up.'
      ],
      typedCheck: { q: 'What goes at the bottom of every if/then block in Lua?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-15', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 15 of 30',
      title: 'Type an if/then',
      prompt: 'Three times in a row, exactly. The "end" matters.',
      target: 'if score > 10 then print("you win") end',
      reps: 3, cta: 'Done' },

    { id: 'c-16', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 16 of 30',
      title: 'Teach it back — what does if/then do?',
      prompt: 'Type out what if/then does in code. Then give one example of an if/then you\'d use in a Roblox game you\'d want to make.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-17', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 17 of 30',
      title: 'else — the other path',
      body: [
        '<strong>else</strong> is the "otherwise" half of an if/then. If the condition is true, do this. ELSE, do that instead.',
        'Example: <code>if score > 10 then print("you win") else print("keep trying") end</code>. Score above 10 → "you win". Score 10 or less → "keep trying".',
        'You can also chain with <code>elseif</code>: <code>if x > 0 then print("positive") elseif x < 0 then print("negative") else print("zero") end</code>. Three paths, one runs based on the value of x.',
        'Every game with branching outcomes uses if/else somewhere.'
      ],
      typedCheck: { q: 'What does else do in an if/then statement?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-18', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 18 of 30',
      title: 'Type if / else',
      prompt: 'Three times in a row, exactly.',
      target: 'if x > 0 then print("yes") else print("no") end',
      reps: 3, cta: 'Done' },

    { id: 'c-19', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 19 of 30',
      title: 'Loops — for and while',
      body: [
        'A <strong>loop</strong> tells the computer to do something over and over until you tell it to stop.',
        '<strong>for loop</strong> — runs a set number of times. <code>for i = 1, 10 do print(i) end</code> prints 1, 2, 3, 4, 5, 6, 7, 8, 9, 10. The variable i starts at 1, goes up to 10, and runs the body each time.',
        '<strong>while loop</strong> — runs as long as a condition is true. <code>while health > 0 do takeDamage() end</code> keeps running as long as health is above 0.',
        'Both end with the word <code>end</code>, just like if/then.'
      ],
      typedCheck: { q: 'What\'s the difference between for and while loops?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-20', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 20 of 30',
      title: 'Type a for loop',
      prompt: 'Three times in a row, exactly.',
      target: 'for i = 1, 10 do print(i) end',
      reps: 3, cta: 'Done' },

    { id: 'c-21', kind: 'topic', type: 'teach-back', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 21 of 30',
      title: 'Teach it back — what\'s a loop for?',
      prompt: 'Type out what a loop is for, in your own words. Give one example of something in a Roblox game that would need a loop.',
      minChars: 160, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-22', kind: 'topic', type: 'concept', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 22 of 30',
      title: 'Comments — notes for humans',
      body: [
        '<strong>Comments</strong> are notes in your code that the computer ignores. They\'re for YOU and other humans reading the code later.',
        'In Lua, a comment starts with two dashes: <code>-- this is a comment</code>. Everything after the dashes on that line is ignored when the code runs.',
        'Why use comments? Because three months from now when you open your old code, you will have NO idea what you were doing. Comments are your future self a small gift.',
        'Good comment: <code>-- give the player 10 extra coins for finishing the level</code>. Bad comment: <code>-- add 10 to coins</code> (you can read that from the code itself).'
      ],
      typedCheck: { q: 'What\'s a comment for?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-23', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Roblox Coding', tag: 'Coding · 23 of 30',
      title: 'Type a comment',
      prompt: 'Three times in a row, exactly. The two dashes matter.',
      target: '-- this is a comment',
      reps: 3, cta: 'Done' },

    { id: 'c-24', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 24 of 30',
      title: 'Functions — reusable code blocks',
      body: [
        'A <strong>function</strong> is a chunk of code you give a name to so you can use it over and over without writing it again.',
        'Simplest version: <code>function sayHi() print("hi") end</code>. That defines a function called sayHi. To use it: <code>sayHi()</code> — those parentheses are how you "call" (run) the function.',
        'Functions can take inputs (called <strong>parameters</strong>): <code>function greet(name) print("hi " .. name) end</code>. Now <code>greet("Ethan")</code> prints "hi Ethan". The two dots <code>..</code> mean "join strings together."',
        'Why functions? Because if you do the same thing in 5 places, you can write the function once and call it 5 times. Change one line, all 5 spots update.'
      ],
      typedCheck: { q: 'Why use functions?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-25', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 25 of 30',
      title: 'Type a simple function',
      prompt: 'Three times in a row, exactly.',
      target: 'function sayHi() print("hi") end',
      reps: 3, cta: 'Done' },

    { id: 'c-26', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Roblox Coding', tag: 'Coding · 26 of 30',
      title: 'Teach it back — why are functions useful?',
      prompt: 'In your own words, type out what a function is and why you\'d use one. Give an example of something you\'d turn into a function in a Roblox game.',
      minChars: 180, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-27', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 27 of 30',
      title: 'Events in Roblox — when things happen',
      body: [
        'An <strong>event</strong> in Roblox is a thing that happens that your code can react to. Player joins the game. Player touches a part. Player clicks a button. Round timer hits zero.',
        'You wire your code to events with a special pattern: <code>part.Touched:Connect(function(other) print("touched!") end)</code>. That says: "when this part gets touched, run this function."',
        'Common Roblox events: <code>Players.PlayerAdded</code> (someone joined), <code>Players.PlayerRemoving</code> (someone left), <code>part.Touched</code> (something hit a part), <code>button.MouseButton1Click</code> (button clicked).',
        'Events are the heart of Roblox programming. Most game code is "when X happens, do Y."'
      ],
      typedCheck: { q: 'What\'s an event in Roblox?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-28', kind: 'topic', type: 'concept', minutes: 5, subject: 'Roblox Coding', tag: 'Coding · 28 of 30',
      title: 'Putting it together — a tiny game script',
      body: [
        'Here\'s what a tiny but real Roblox script looks like, using everything you\'ve learned:',
        '<code>-- start the player at 100 health<br>local health = 100<br><br>-- when the player touches a lava part, take 10 health<br>lava.Touched:Connect(function()<br>&nbsp;&nbsp;health = health - 10<br>&nbsp;&nbsp;print("Ouch! Health: " .. health)<br>&nbsp;&nbsp;if health <= 0 then<br>&nbsp;&nbsp;&nbsp;&nbsp;print("Game over!")<br>&nbsp;&nbsp;end<br>end)</code>',
        'Look at it. You can read every line. Variable. Comment. Event. Math. String concatenation. if/then. end.',
        'You just went from "I don\'t know coding" to "I can read this script and tell you what it does." That happened today.'
      ],
      typedCheck: { q: 'What does this tiny script do when the player touches lava?', minChars: 60 },
      cta: 'Got it' },

    { id: 'c-29', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Roblox Coding', tag: 'Coding · 29 of 30',
      title: 'Teach it back — what would YOU build?',
      prompt: 'You now know variables, strings, numbers, math, print(), if/then/else, loops, comments, functions, and events. That\'s enough to build a real (small) game. Type out what kind of Roblox game you\'d want to make. What would the player do? What would the leaderboard track? Where would you use an if/then? Where would you use a function?',
      minChars: 240, spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'c-30', kind: 'topic', type: 'concept', minutes: 3, subject: 'Roblox Coding', tag: 'Coding · 30 of 30',
      title: 'Lock it in — Coding subject done',
      body: [
        'You learned 11 different coding concepts today. You typed 11 different code lines exactly, three times each. You wrote about variables, the difference between numbers and strings, what if/then does, what loops are for, why functions matter, and what you\'d actually build.',
        'You can\'t say you don\'t know coding anymore. You know coding. You can open Roblox Studio tomorrow and start a real script.',
        'Coding subject locked in.'
      ],
      typedCheck: { q: 'What can you say now that you couldn\'t say this morning?', minChars: 60 },
      cta: 'Done' },

    { id: 'report-card-fri', kind: 'drill', type: 'report-card', title: 'Friday — show Mom & Dad', minutes: 2 }
  ]
};
