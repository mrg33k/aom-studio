/* Summer School — MONDAY curriculum (built 2026-05-29 for week of 2026-06-08)
 *
 * Patrik 2026-05-29 #7: "build out the week... shrink to about 40 modules
 * maybe 45... 10 modules per subject." Keeping Friday's structure — kickoff
 * video, interleaved subjects, typed gates, verify-before-send, copy/paste
 * blocked. 10 modules × 4 subjects = 40 atomic blocks + welcome + 4 kickoffs
 * + report-card = 46 total.
 *
 * Monday theme: "SHARPEN THE TOOLS" — building habits used the rest of week.
 *   Reading      → The Re-Tell trick (summarize what you read in 1-2 sentences)
 *   Writing      → SMART goal-setting
 *   Math         → Percentages (from proportionality to percent)
 *   MPC ONE      → Triplets + 3/4 time (different feel from Friday's 4/4)
 *
 * Block IDs prefixed with "mon-" to avoid collisions across days.
 */

window.CURRICULUM = window.CURRICULUM || {};
window.CURRICULUM.monday = {
  weekOf: '2026-06-08',
  day: 'monday',
  theme: 'SHARPEN THE TOOLS',
  themeDesc: 'New week. Build the habits you\'ll use the rest of the way. 40 modules — 10 per subject.',
  unlockAll: true,

  welcomeContent: {
    dayLabel: 'Day 1 — Monday',
    showParentNote: true,
    bullets: [
      "<strong>Reading — The Re-Tell trick.</strong> The fastest way to know if you actually understood what you read: say it back in one sentence. Doesn't sound hard until you try it.",
      "<strong>Writing — SMART Goals.</strong> Every goal has 5 parts. Skip one, the goal falls apart. Today you'll build one real goal for THIS week using the formula.",
      "<strong>Math — Percentages.</strong> What \"percent\" actually means, the fast facts (50%, 25%, 10%), and how to figure out tips and discounts in your head.",
      "<strong>MPC ONE — Triplets &amp; 3/4 time.</strong> Friday was 4/4 (boom-clap). Today is the OTHER feel — three-against-two. Once you can play it, your beats stop sounding boxed-in."
    ],
    howItWorks: "Same rule as Friday. Every block ends with you typing. Spell-check catches misspelled words. Read your answer, then send it to Mom & Dad. No clicking past — the keyboard is the proof."
  },

  typingTarget: 'I will sharpen the tools I use every day so they keep working when it matters.',

  tileVocab: [
    { word: 'summary',    clue: 'A short version of something longer' },
    { word: 'specific',   clue: 'Saying exactly what — not "stuff" or "things"' },
    { word: 'percent',    clue: 'Out of one hundred' },
    { word: 'triplet',    clue: 'Three notes in the time of two' },
    { word: 'measurable', clue: 'You can tell when you did it' },
    { word: 'deadline',   clue: 'When the goal has to be done by' }
  ],

  blocks: [
    // ===== INTERLEAVED ORDER =====
    // welcome → 4 kickoff videos (reading/writing/math/MPC)
    //         → round-robin 10 rotations of (r, w, m, mp)
    //         → report card
    // Total: 1 + 4 + 40 + 1 = 46 blocks.

    { id: 'welcome-mon', kind: 'drill', type: 'welcome', title: 'Welcome to Monday', minutes: 2 },

    // ===== KICKOFF VIDEOS (4) — Reading, Writing, Math, MPC =====
    { id: 'mon-r-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Reading', tag: 'Reading · Kickoff video',
      title: 'Kickoff video — How to Summarize',
      video: { title: 'Summarizing a Story — Step by Step For Kids', ytId: 'wVmPnqWpLiI', creditLine: 'The Mr Saad Show' },
      typedQuestions: [
        { q: 'What is summarizing, in your own words? Use the words "short" and "important" somewhere in your answer. Write until you feel like you really explained it -- do not stop at your first thought.' },
        { q: 'Pick something you read or watched recently (book, video, anything). What would a one-sentence summary of it sound like? Keep going until you have said everything that matters -- your first answer is probably not enough.' }
      ],
      cta: 'Done' },

    { id: 'mon-w-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Writing', tag: 'Writing · Kickoff video',
      title: 'Kickoff video — SMART Goals for Kids and Teens',
      video: { title: 'SMART Goals for Kids and Teens — Goal Setting for Students', ytId: 'Q5hR34g3kLc', creditLine: 'Mental Health Center Kids' },
      typedQuestions: [
        { q: 'What do the 5 letters in SMART stand for? Write each one out. Say everything you know about this -- don't stop when you think you're done.' },
        { q: 'What\'s the difference between a goal and a wish, the way the video explained it? Write until it is complete. Your first sentence is not the answer.' }
      ],
      cta: 'Done' },

    { id: 'mon-m-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'Math', tag: 'Math · Kickoff video',
      title: 'Kickoff video — Finding a Percentage',
      video: { title: 'Finding a percentage — Decimals — Pre-Algebra', ytId: 'FaDtge_vkbg', creditLine: 'Khan Academy' },
      typedQuestions: [
        { q: 'What does "percent" mean? Use the word "hundred" somewhere in your answer. Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
        { q: 'What\'s one method the video showed for finding a percentage of a number? Walk through it. Be thorough -- write until you have actually said what you mean.' }
      ],
      cta: 'Done' },

    { id: 'mon-mp-00-video', kind: 'topic', type: 'video-typed', minutes: 8, subject: 'MPC ONE', tag: 'MPC · Kickoff video',
      title: 'Kickoff video — Introducing Triplets',
      video: { title: 'Rhythm Busters — Introducing Triplets! (Music Theory for Kids)', ytId: 'qsLod8U2vLc', creditLine: 'Music with Meg' },
      typedQuestions: [
        { q: 'What is a triplet? How many notes is it, and what makes it different from regular 8th notes? Push past your first answer. The real answer comes after that.' },
        { q: 'How does the video say to count triplets out loud? (Hint: "one-trip-let" style.) Write the counting. Write until you feel like you really explained it -- do not stop at your first thought.' }
      ],
      cta: 'Done' },

    // ===== SUBJECT 1 — READING (The Re-Tell Trick) =====
    { id: 'mon-r-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 01 of 10',
      title: 'What is the Re-Tell trick?',
      body: [
        'The <strong>Re-Tell trick</strong> is the fastest way to find out if you actually understood what you just read.',
        'Here it is: after you finish a paragraph or a chapter, <strong>say it back in one sentence.</strong> Out loud. Without looking. If you can do it, you got it. If you can\'t, your eyes read the words but your brain wasn\'t really there.',
        'Sounds easy. It isn\'t. Try it on the next paragraph you read today.'
      ],
      typedCheck: { q: 'In your own words, what does the Re-Tell trick make you do right after you read something? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'mon-w-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 01 of 10',
      title: 'A goal vs a wish',
      body: [
        '"I want to get better at MPC." That\'s a wish. Sounds like a goal — it isn\'t.',
        'A wish is something you say out loud and then nothing happens. A goal is a wish you\'ve done some work on: you know exactly what success looks like, you know how you\'ll measure it, and you\'ve given yourself a deadline.',
        'Today we\'re going to turn one of your wishes into a real goal using the SMART formula. After this, you\'ll never confuse the two again.'
      ],
      typedCheck: { q: 'What\'s the difference between a wish and a goal, in your own words? Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'mon-m-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 01 of 10',
      title: 'What is a percent?',
      body: [
        'The word "percent" comes from two old words: "per" (for each) + "cent" (hundred). So <strong>"percent" literally means "out of one hundred."</strong>',
        '50% means 50 out of every 100. 25% means 25 out of every 100. 100% means 100 out of every 100 — the whole thing.',
        'Once you remember that one definition, percents stop being scary. Every percent question is really just a question about how many out of 100.'
      ],
      typedCheck: { q: 'What does the word "percent" literally mean? Use the word "hundred" in your answer. Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'mon-mp-01', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 01 of 10',
      title: 'What is a triplet?',
      body: [
        'Friday you learned 8th notes — 2 notes per beat. <strong>A triplet squeezes 3 notes into the same time as 2.</strong>',
        'So on one beat, instead of "1-and" (2 notes) you play "1-trip-let" (3 notes). Same amount of time. More notes packed in.',
        'That little change makes the rhythm feel completely different. Triplets are what make blues swing, what makes shuffles bounce, what makes a lot of hip-hop hi-hats feel rolling instead of stiff.'
      ],
      typedCheck: { q: 'A triplet plays how many notes in the same time as how many regular notes? Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'mon-r-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 02 of 10',
      title: 'Why summarizing actually works',
      body: [
        'When you read passively, your eyes move over the words but your brain stays half-asleep. You hit the end of the page and realize you don\'t remember any of it.',
        'When you HAVE to summarize at the end, your brain knows it\'s coming. So while you read, it\'s already grabbing the important stuff and dropping the rest. That little bit of pressure is what turns "reading" into "learning."',
        'This trick alone — done every day — will lift your reading comprehension grade in school within a month.'
      ],
      typedCheck: { q: 'Why does knowing you have to summarize make your brain pay more attention while you read? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'mon-w-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Writing', tag: 'Writing · 02 of 10',
      title: 'SMART — the five parts',
      body: [
        'Every good goal has 5 parts. Miss one, the goal falls apart.',
        '<strong>S — Specific.</strong> Say exactly what.<br>',
        '<strong>M — Measurable.</strong> You can tell when you did it.<br>',
        '<strong>A — Achievable.</strong> It\'s actually possible for you to do.<br>',
        '<strong>R — Relevant.</strong> It connects to something you actually care about.<br>',
        '<strong>T — Time-bound.</strong> There\'s a deadline.'
      ],
      typedCheck: { q: 'List the five letters in SMART and what each one stands for. Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'mon-m-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 02 of 10',
      title: 'The fast facts — 50%, 25%, 10%',
      body: [
        'You should know these three by heart. They\'re the building blocks of every percent calculation you\'ll ever do.',
        '<strong>50%</strong> = half. 50% of 80 = 40. 50% of 200 = 100. Just cut it in half.',
        '<strong>25%</strong> = a quarter. 25% of 80 = 20. (Half, then half again.)',
        '<strong>10%</strong> = a tenth. 10% of 80 = 8. (Just move the decimal one spot to the left.)',
        'Once you have these three, you can build any other percent fast.'
      ],
      typedCheck: { q: 'What\'s the trick to find 10% of any number? (Hint: the decimal point.). Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'mon-mp-02', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 02 of 10',
      title: 'Why triplets sound different',
      body: [
        'Regular 8th notes go: "ONE-and-TWO-and-THREE-and-FOUR-and." Even spacing. Square feeling.',
        'Triplets go: "ONE-trip-let-TWO-trip-let-THREE-trip-let-FOUR-trip-let." Three per beat. Rolling, bouncing feel.',
        'Your ear hears the difference even if you don\'t know what to call it. Listen to a blues song and a pop song back to back — the blues will feel "swung," the pop will feel "straight." That\'s triplets vs 8ths.'
      ],
      typedCheck: { q: 'Describe in your own words how triplets sound different from regular 8th notes. Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'mon-r-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Reading', tag: 'Reading · 03 of 10',
      title: 'Teach it back — the Re-Tell trick in your own words',
      prompt: 'Explain the Re-Tell trick the way you would tell a friend who never heard of it. Why is it useful? When should they use it?',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-w-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Writing', tag: 'Writing · 03 of 10',
      title: 'Teach it back — what does SMART stand for?',
      prompt: 'In your own words, type out what SMART stands for and why each letter matters. Don\'t just list them — explain each one in a sentence.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-m-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'Math', tag: 'Math · 03 of 10',
      title: 'Teach it back — what does percent mean?',
      prompt: 'In your own words, explain what a percent is and give one example. Use the word "hundred" somewhere. Then explain how to find 10% of any number quickly.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-mp-03', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 03 of 10',
      title: 'Teach it back — what is a triplet?',
      prompt: 'In your own words, type out what a triplet is. Use the words "three" and "two" in your answer. Then say one type of music where you\'d hear triplets a lot.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-r-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 04 of 10',
      title: 'The Who-What-Why formula',
      body: [
        'When you sit down to summarize and your brain goes blank, use this formula. It works every time.',
        '<strong>Who:</strong> Who was the story (or article) about?<br><strong>What:</strong> What did they do, or what happened to them?<br><strong>Why:</strong> Why did it matter — what was the point?',
        'Answer those three in one sentence and you have a summary. "Robert Nay, a 14-year-old who taught himself to code, beat Angry Birds — because he decided to start before he was ready."'
      ],
      typedCheck: { q: 'What are the three parts of the Who-What-Why formula? Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'mon-w-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 04 of 10',
      title: 'S — Specific',
      body: [
        '"Get better at the MPC" is not specific. Better at WHAT? Faster hands? Cleaner timing? More patterns memorized?',
        'A specific version: "Be able to play kicks on 1 and 3, snares on 2 and 4, hi-hats on 8ths — all together at 90 BPM — without drifting for 4 bars."',
        'Now you know EXACTLY what you\'re practicing. There\'s no wiggle room. Either you can do that thing or you can\'t.'
      ],
      typedCheck: { q: 'Why is "get better at MPC" not a specific enough goal? What\'s missing? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'mon-m-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 04 of 10',
      title: '5% is half of 10%',
      body: [
        'Once you know 10%, finding 5% is dead easy: just cut 10% in half.',
        '10% of 60 is 6. So 5% of 60 is 3.',
        '10% of $40 is $4. So 5% of $40 is $2.',
        'This matters because tips, taxes, and small discounts often live in the 5%-10% range. You can do them in your head.'
      ],
      typedCheck: { q: 'If 10% of a number is 12, what is 5% of that same number? How did you figure it out? Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'mon-mp-04', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 04 of 10',
      title: '3/4 time — the waltz feel',
      body: [
        'Friday you played in 4/4 — 4 beats per bar. Today\'s second new thing: <strong>3/4 time.</strong> Only 3 beats per bar.',
        'You count it: <strong>1-2-3, 1-2-3, 1-2-3, 1-2-3.</strong> Like a waltz. The "1" is the strong beat — that\'s where you\'d put a kick.',
        'Most pop and rap is 4/4. Waltzes, a lot of country, and some songs you\'ve heard in Disney movies are 3/4. Different feel entirely.'
      ],
      typedCheck: { q: 'How many beats per bar are in 3/4 time? Which beat is the strong one? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Got it' },

    { id: 'mon-r-05', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Reading', tag: 'Reading · 05 of 10',
      title: 'Type the formula — three times perfect',
      prompt: 'Three times in a row, no typos. The commas matter.',
      target: 'Who did what, and why did it matter?',
      reps: 3, cta: 'Done' },

    { id: 'mon-w-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 05 of 10',
      title: 'M — Measurable',
      body: [
        'If you can\'t measure it, you can\'t tell if you got there. "Be better at math" — better HOW? "Read more" — more than what?',
        'Measurable goals have a NUMBER in them: a count, a percent, a time. "Read 4 chapters by Friday." "Score 80% or better on the next math quiz." "Practice MPC for 15 minutes a day for 5 days in a row."',
        'When the deadline hits, you can just check: did the number happen, yes or no.'
      ],
      typedCheck: { q: 'What kind of word usually shows up in a measurable goal? Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'mon-m-05', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 05 of 10',
      title: 'Building other percents from 10%',
      body: [
        'Once you can do 10% instantly, you can build almost any percent by adding or subtracting.',
        '<strong>20% = 10% + 10%.</strong> So 20% of 50 = 5 + 5 = 10.',
        '<strong>15% = 10% + 5%.</strong> So 15% of 60 = 6 + 3 = 9. (Tip math!)',
        '<strong>30% = 10% × 3.</strong> So 30% of 50 = 5 × 3 = 15.',
        'Start with 10%, then add or multiply. No calculator needed.'
      ],
      typedCheck: { q: 'How would you find 20% of any number using the 10% trick? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'mon-mp-05', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 05 of 10',
      title: 'How to count triplets out loud',
      body: [
        'This is the boring-looking trick that actually fixes your triplets fast: <strong>say them out loud while you play.</strong>',
        '"one-trip-let, two-trip-let, three-trip-let, four-trip-let."',
        'Three syllables per beat. Hit a pad on every syllable: ONE-trip-let-TWO-trip-let. You\'ll hear the bounce within a few reps.',
        'Real drummers and producers count under their breath constantly. It looks silly. It works.'
      ],
      typedCheck: { q: 'Write out the words you say to count one bar of triplets in 4/4. Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'mon-r-06', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 06 of 10',
      title: 'How to find the main idea fast',
      body: [
        'Most paragraphs have a "topic sentence" — usually the first or last sentence, sometimes both. That one sentence tells you what the whole paragraph is about.',
        'When you\'re trying to Re-Tell, look there first. Topic sentence + 1-2 supporting details = your summary, done.',
        'Watch for signal words too: "the main reason," "in conclusion," "the key point" — those almost always announce the big idea coming next.'
      ],
      typedCheck: { q: 'Where in a paragraph is the topic sentence usually found? Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'mon-w-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'Writing', tag: 'Writing · 06 of 10',
      title: 'Type the five parts — three times perfect',
      prompt: 'Three times in a row, no typos. The commas matter.',
      target: 'Specific, Measurable, Achievable, Relevant, Time-bound.',
      reps: 3, cta: 'Done' },

    { id: 'mon-m-06', kind: 'topic', type: 'typing-precise', minutes: 4, subject: 'Math', tag: 'Math · 06 of 10',
      title: 'Type the rule — three times perfect',
      prompt: 'Three times in a row, no typos.',
      target: 'Percent means out of one hundred.',
      reps: 3, cta: 'Done' },

    { id: 'mon-mp-06', kind: 'topic', type: 'typing-precise', minutes: 5, subject: 'MPC ONE', tag: 'MPC · 06 of 10',
      title: 'Type the counting — three times perfect',
      prompt: 'Three times in a row, no typos. The dashes and commas matter.',
      target: 'one-trip-let, two-trip-let, three-trip-let, four-trip-let.',
      reps: 3, cta: 'Done' },

    { id: 'mon-r-07', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Reading', tag: 'Reading · 07 of 10',
      title: 'Practice — summarize this paragraph',
      prompt: 'Read this paragraph and summarize it in ONE sentence in your own words: "Bees do something amazing every day. When a bee finds a great flower patch, she flies back to the hive and does a little dance — yes, an actual dance — that tells the other bees exactly where to go. The angle of the dance points in the direction of the flowers, and the speed tells them how far. Other bees watch the dance, then fly straight to the spot. Scientists call it the waggle dance, and it\'s one of the most precise communication systems in nature." — Now type your one-sentence summary.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-w-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 07 of 10',
      title: 'A + R — Achievable and Relevant',
      body: [
        '<strong>Achievable</strong> means honest with yourself. "Win a Grammy this month" — not achievable. "Record one clean 16-bar beat this week" — achievable. Pick stretches you can actually reach.',
        '<strong>Relevant</strong> means it connects to something you actually care about. If you don\'t care about the goal, you won\'t do the work. "Memorize all the state capitals" might be measurable, but if you don\'t care about geography, it dies on day 2.',
        'Goals that fail almost always fail on these two letters. Either too big to reach, or too disconnected to bother.'
      ],
      typedCheck: { q: 'What usually causes a goal to die — wrong on Specific, or wrong on Achievable + Relevant? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Got it' },

    { id: 'mon-m-07', kind: 'topic', type: 'concept', minutes: 4, subject: 'Math', tag: 'Math · 07 of 10',
      title: 'Real life — tax, tips, discounts',
      body: [
        'Percents aren\'t just math-class stuff. They\'re everywhere money lives.',
        '<strong>Sales tax</strong> in Arizona is roughly 8%. So a $30 shirt actually costs about $32.40 after tax.',
        '<strong>Tip</strong> at a restaurant is usually 15-20%. On a $30 meal, that\'s $4.50 to $6.',
        '<strong>Discount</strong> signs at stores ("25% off!") mean a quarter off the price. $80 shoes at 25% off = $80 - $20 = $60.',
        'Once you can do these in your head, you\'re ahead of probably 80% of adults.'
      ],
      typedCheck: { q: 'A $40 item is 25% off. How much do you pay? Show how you figured it out. Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Got it' },

    { id: 'mon-mp-07', kind: 'topic', type: 'concept', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 07 of 10',
      title: 'Practice — triplets on a single pad',
      body: [
        '<strong>Go to the MPC. Do this.</strong>',
        'Set the metronome to <strong>80 BPM</strong> (slower than Friday — triplets need room).',
        'Pick ONE pad. Doesn\'t matter what sound. Hit it on every triplet syllable: "ONE-trip-let, TWO-trip-let, THREE-trip-let, FOUR-trip-let." 12 hits per bar.',
        'Do 4 bars. Listen for whether the hits are even — that\'s the whole point. No "and-uh," no rushing the last one.',
        'When it locks in, you\'ll feel a steady rolling bounce instead of a jerky pattern.'
      ],
      typedCheck: { q: 'How many triplet hits will you do per bar at 4/4? Why that number? Be thorough -- write until you have actually said what you mean.' },
      cta: 'On it' },

    { id: 'mon-r-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Reading', tag: 'Reading · 08 of 10',
      title: 'Common summarizing mistakes',
      body: [
        '<strong>Mistake 1:</strong> Copying a full sentence from the text. That\'s not a summary — that\'s just a quote. Real summaries use your own words.',
        '<strong>Mistake 2:</strong> Re-telling EVERY detail. A summary cuts most of the details and keeps only the big idea + maybe one supporting fact.',
        '<strong>Mistake 3:</strong> Adding your own opinion. The summary says what the text said, not what you think about it.',
        'Quick test for a good summary: someone who hasn\'t read it should be able to know what the text was about from your sentence.'
      ],
      typedCheck: { q: 'Which of the three mistakes is the one you think you\'d most likely make? Why? Push past your first answer. The real answer comes after that.' },
      cta: 'Got it' },

    { id: 'mon-w-08', kind: 'topic', type: 'concept', minutes: 4, subject: 'Writing', tag: 'Writing · 08 of 10',
      title: 'T — Time-bound',
      body: [
        'A goal without a deadline is just a daydream. Your brain treats "someday" as "never" because there\'s no pressure.',
        'Give every goal a real date. "By Friday at 5pm." "By the end of June." "Before the next family dinner." The date doesn\'t have to be far away — for a week-long goal, this Friday works fine.',
        'When the date comes, you find out: did you do it, or didn\'t you? Both answers are useful. Hitting it builds momentum. Missing it teaches you whether the goal was wrong or you were lazy. Either way you learn something.'
      ],
      typedCheck: { q: 'Why does a goal need a deadline, even a short one? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Got it' },

    { id: 'mon-m-08', kind: 'topic', type: 'concept', minutes: 5, subject: 'Math', tag: 'Math · 08 of 10',
      title: 'Worked example — 20% tip on $30',
      body: [
        'You\'re at lunch. The bill is $30. You want to leave a 20% tip. What do you do?',
        '<strong>Step 1:</strong> Find 10%. $30 → $3 (move the decimal one spot left).',
        '<strong>Step 2:</strong> Double it for 20%. $3 + $3 = $6.',
        '<strong>Total to leave:</strong> $30 + $6 = $36.',
        'That\'s it. Two steps in your head, no phone needed. Same recipe works on any bill.'
      ],
      typedCheck: { q: 'What are the two steps to find a 20% tip on any bill, using the 10% trick? Keep going until you have said everything that matters -- your first answer is probably not enough.' },
      cta: 'Got it' },

    { id: 'mon-mp-08', kind: 'topic', type: 'teach-back', minutes: 6, subject: 'MPC ONE', tag: 'MPC · 08 of 10',
      title: 'After the triplet practice — what felt different?',
      prompt: 'You just played 12 triplet hits per bar. Type a few sentences about what that felt like compared to Friday\'s straight 8th notes. Did the spacing feel wrong at first? Did you rush? Did the bounce show up after a few bars?',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-r-09', kind: 'topic', type: 'teach-back', minutes: 7, subject: 'Reading', tag: 'Reading · 09 of 10',
      title: 'Teach it back — summarize something YOU watched',
      prompt: 'Pick a movie, show, or YouTube video you watched recently. Summarize the whole thing in 2 sentences. Use Who-What-Why. No spoiling the ending if it\'s a movie — but tell us what it was really about.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-w-09', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Writing', tag: 'Writing · 09 of 10',
      title: 'Write ONE SMART goal for this week',
      prompt: 'Pick one real thing you want to do this week — MPC, reading, school, Roblox, anything. Write it as a SMART goal. Hit all 5 letters: Specific, Measurable, Achievable, Relevant, Time-bound. Make sure there\'s a number AND a deadline.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-m-09', kind: 'topic', type: 'teach-back', minutes: 8, subject: 'Math', tag: 'Math · 09 of 10',
      title: 'Teach it back — calculate 15% of 60',
      prompt: 'Calculate 15% of 60. Show your steps (this is important — don\'t just write the answer). Use the 10% trick + the 5% trick. Then explain in your own words why this method works.',
      spellCheck: true, savedAs: 'writingPiece', cta: 'Submit' },

    { id: 'mon-mp-09', kind: 'topic', type: 'concept', minutes: 4, subject: 'MPC ONE', tag: 'MPC · 09 of 10',
      title: 'Songs that use triplets and 3/4',
      body: [
        'Once you know what triplets sound like, you\'ll hear them everywhere. A few easy ones to listen for:',
        '<strong>Triplets:</strong> Any blues song. Most early Beatles. Tons of trap hi-hats. The drum pattern in old-school hip-hop ballads.',
        '<strong>3/4 time:</strong> "My Favorite Things" (Sound of Music). Most waltzes. "Piano Man" by Billy Joel. "Manic Depression" by Jimi Hendrix.',
        'Pull one up on your phone after this. Try clapping along on beat 1 only — you\'ll hear how 3/4 wraps around different from 4/4.'
      ],
      typedCheck: { q: 'Pick one song or kind of music you\'ll go listen to today to hear triplets or 3/4 time. Name it. Say everything you know about this -- don't stop when you think you're done.' },
      cta: 'Got it' },

    { id: 'mon-r-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Reading', tag: 'Reading · 10 of 10',
      title: 'Lock it in — Reading done',
      body: [
        'You\'ve got the Re-Tell trick now. Use it every day this week — on what you read in school, what you watch, even what someone tells you.',
        'When you can\'t Re-Tell it in one sentence, that\'s your signal to go back and re-read. You\'re not slow. You\'re just doing what most kids never figure out: noticing the difference between "I read it" and "I got it."'
      ],
      typedCheck: { q: 'When you can\'t summarize what you read in one sentence, what does that tell you to do? Write until it is complete. Your first sentence is not the answer.' },
      cta: 'Done' },

    // ===== SUBJECT 2 — WRITING (SMART Goals) =====
    { id: 'mon-w-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Writing', tag: 'Writing · 10 of 10',
      title: 'Lock it in — Writing done',
      body: [
        'You just wrote a real goal — specific, measurable, with a number and a deadline. Now the work is doing it. Friday we\'ll come back and see if you hit it.',
        'The SMART formula isn\'t magic. It just forces you to be honest about what you\'re actually committing to. Most people skip this step and wonder why their goals don\'t stick. You don\'t have to be one of them.'
      ],
      typedCheck: { q: 'What\'s the rest of the work after writing a SMART goal? Don't stop at one sentence. Keep explaining until there is nothing left to say.' },
      cta: 'Done' },

    // ===== SUBJECT 3 — MATH (Percentages) =====
    { id: 'mon-m-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'Math', tag: 'Math · 10 of 10',
      title: 'Lock it in — Math done',
      body: [
        'You learned what percent means, the three fast facts (50%, 25%, 10%), how to build other percents from 10%, and how to do tips and discounts in your head.',
        'Practice this week: every time you see a percent sign in real life — at a store, on a receipt, in a video — do the math in your head before someone else does. It gets fast in about a week.'
      ],
      typedCheck: { q: 'What\'s your plan for practicing percentages this week in real life? Be thorough -- write until you have actually said what you mean.' },
      cta: 'Done' },

    // ===== SUBJECT 4 — MPC ONE (Triplets + 3/4 time) =====
    { id: 'mon-mp-10', kind: 'topic', type: 'concept', minutes: 3, subject: 'MPC ONE', tag: 'MPC · 10 of 10',
      title: 'Lock it in — MPC done',
      body: [
        'You added two new feels to your toolkit today: triplets (3-against-2) and 3/4 time (waltz).',
        'Together with Friday\'s 4/4 boom-clap, you can now play in pretty much every common groove in modern music. Tuesday we\'ll layer them — using triplet hi-hats on top of the 4/4 backbone.',
        'Daily warm-up reminder: 5 minutes of basic kick/snare every day this week. Then triplets for 5 more. Then whatever you feel like.'
      ],
      typedCheck: { q: 'What\'s your MPC warm-up plan this week, in one sentence? Push past your first answer. The real answer comes after that.' },
      cta: 'Done' },

    // ===== SUBJECT 5 — SPECIALS (Only Child Syndrome / Pick-Me Behavior) =====
    { id: 'mon-sp-01', kind: 'topic', type: 'concept', minutes: 5, subject: 'Specials', tag: 'Specials · 1 of 4',
      title: 'What "pick me" actually means',
      body: [
        'You\'ve probably heard "pick me" used as an insult. But before it became a meme, it was a real thing people do.',
        'Pick-me behavior is when you work really hard — usually too hard — to get someone\'s attention or approval. You change how you talk, what you say, what you like, just because you want them to notice you or like you.',
        'The problem isn\'t wanting people to like you. That\'s normal. The problem is when you NEED it so badly that you start being fake to get it. You stop being yourself and start performing a version of you that you think they want.'
      ],
      typedCheck: { q: 'In your own words, what is pick-me behavior and why is it a problem? Write until you feel like you really explained it -- do not stop at your first thought.' },
      cta: 'Done' },

    { id: 'mon-sp-02', kind: 'topic', type: 'concept', minutes: 5, subject: 'Specials', tag: 'Specials · 2 of 4',
      title: 'Where it comes from — the only child dynamic',
      body: [
        'Pick-me behavior often starts at home, especially for kids who grew up as an only child or as the center of their family\'s world.',
        'When you\'re the only kid, or the youngest, or the one everyone focused on — you get used to being the center. Adults make a big deal of everything you do. You get attention without having to earn it.',
        'Then you go out into the world and realize: other people don\'t automatically make you the center. They\'re busy with their own stuff. So you might start performing — doing more, saying more, being louder, being funnier — trying to recreate that center feeling.',
        'Understanding where it comes from is not an excuse. It\'s just information. You can\'t fix something you don\'t understand.'
      ],
      typedCheck: { q: 'Why do you think kids who grew up as the center of attention at home sometimes struggle when they\'re around other people? Write until you have actually worked this out on paper.' },
      cta: 'Done' },

    { id: 'mon-sp-03', kind: 'topic', type: 'concept', minutes: 5, subject: 'Specials', tag: 'Specials · 3 of 4',
      title: 'Real confidence is quiet',
      body: [
        'Here\'s the thing about people who are actually confident: they don\'t perform. They don\'t need to.',
        'When you\'re genuinely good at something, you don\'t have to announce it. When you\'re genuinely secure, you don\'t need to fish for compliments. When you actually like who you are, you don\'t have to change to impress people who barely know you.',
        'Pick-me behavior is loud because insecurity is loud. Real confidence is quiet. It sits back and lets the work speak.',
        'The flip: the energy you spend trying to get attention from people who aren\'t giving it to you? That\'s energy you could spend getting actually good at something. Then you don\'t need to chase people — they come to you.'
      ],
      typedCheck: { q: 'What\'s the difference between real confidence and pick-me behavior? Don\'t just give a definition -- give an example of each that you\'ve actually seen.' },
      cta: 'Done' },

    { id: 'mon-sp-04', kind: 'topic', type: 'concept', minutes: 5, subject: 'Specials', tag: 'Specials · 4 of 4',
      title: 'What to do instead',
      body: [
        'You can\'t decide to just "stop caring what people think" — that\'s not how it works and anyone who tells you that is giving you bad advice.',
        'What you CAN do: notice when you\'re performing. Notice when you\'re changing yourself for someone who hasn\'t done the same for you. Notice when you\'re chasing attention from someone who never gives it.',
        'Then ask: would I be acting this way if no one was watching? If the answer is no — you\'re performing, not being.',
        'The longer game: build real skills. Be genuinely good at things you care about. Have honest conversations instead of trying to manage how people see you. The people worth keeping in your life will notice the real version faster than any performance.'
      ],
      typedCheck: { q: 'What is one thing you could do this week to catch yourself when you\'re performing instead of being yourself? Push past your first answer. The real answer comes after that.' },
      cta: 'Done' },

    // ===== FRAME — Report card =====
    { id: 'report-card-mon', kind: 'drill', type: 'report-card', title: 'Monday — show Mom & Dad', minutes: 2 }
  ]
};
