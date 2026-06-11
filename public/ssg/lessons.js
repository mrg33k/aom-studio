// lessons.js — the day's curriculum (R42: content lives here, the engine
// lives in game.js). New day = author a new entry; same village, new lessons.
// The Wizard agent will eventually WRITE these from the iso-wizard project.
//
// Shape per day: { note: [...lines], lessons: { mara, marn, pip, wick },
// review: {...} }. Lesson waves are strings OR video objects
// ({video, lead, sub, minWatch}). `perk` names an engine reward
// (game.js PERK_FNS): smash2 | magnet | shards | cheapBlocks.
(() => {
  const THURSDAY = {
    note: [
      'Good morning, adventurer! The whole village needs you today:',
      '1. Mara the Baker — a recipe disaster at the bakery. Look for the smoking chimney.',
      '2. Old Marn — his flour mix needs checking at the windmill. Follow the road east to the blades.',
      '3. Pip the Storyteller — at the north house with the flower boxes. He has a trick to teach you.',
      '4. Wick the Tinker — at the south house. Follow the smell of burning.',
      '5. Then come find me on Emerald Isle. I will be waiting.',
      '— W.',
    ],
    lessons: {
      mara: {
        title: 'Mara the Baker',
        waves: [
          'Oh thank goodness, a helper! My new oven boy wrote my bread recipe as ONE giant sentence. Nobody can follow it.',
          { video: 'bvUh3FrhFY8', lead: 'My cousin in the city made a moving picture about this exact thing. Watch it — properly!', sub: 'watch closely — Mara is testing you after', minWatch: 30 },
          'See? A recipe is a HOW-TO: writing that tells you EXACTLY how to do something. Step by step. In order.',
          'Every good how-to has FOUR parts. One: a clear TITLE — "How to bake a village loaf." Two: the MATERIALS — everything you need, gathered before you start.',
          'Three: the STEPS — numbered, in order, ONE action per step. Four: the RESULT — one sentence saying what you should have at the end. A warm loaf!',
          'Title, materials, steps, result. Same four parts in every recipe, manual, and tutorial ever written.',
        ],
        replayFrom: 2,
        subText: 'listen closely — she talks fast',
        subAsk: 'show Mara you were listening',
        question: 'What are the four parts of a how-to, in order?',
        answers: [
          'Title, materials, steps, result',
          'Steps, pictures, title, taste test',
          'Materials, result, title, steps',
        ],
        correct: 0,
        wrongLine: 'Hah! NO. Did you listen, or were you sniffing my bread? A baker reads the recipe TWICE before touching the flour. Again — and this time, listen like the loaf depends on it.',
        passToast: 'Mara’s hearty loaf — your smash arm hits TWICE as hard!',
        perk: 'smash2',
        sendTo: 'Old Marn is at the windmill — follow the road east, you can’t miss the blades. Tell him Mara sent you.',
      },
      marn: {
        title: 'Old Marn the Miller',
        waves: [
          'Hmph. Mara sent you? Fine. My mill runs on RATIOS — and my apprentice ruined three sacks of flour because he never learned what one is.',
          { video: 'bIKmw0aTmYc', lead: 'A traveling scholar left this picture-lesson at the mill. Watch the whole thing — I’ll know if you didn’t.', sub: 'watch closely — Marn hates repeating himself', minWatch: 30 },
          'So. A ratio compares two amounts: "for every X of THIS, there are Y of THAT."',
          'My village loaf mix is 2 scoops of wheat for every 1 scoop of rye. That’s a ratio. "5 wins for every 1 loss" — also a ratio.',
          'You can write the same ratio three ways. Words: "2 to 1." Colon: "2:1." Fraction: "2/1." All three mean the same mix.',
          'Get the ratio wrong and the bread comes out like a brick. Ask my apprentice.',
        ],
        replayFrom: 2,
        subText: 'listen closely — Marn hates repeating himself',
        subAsk: 'show Old Marn you were listening',
        question: 'My mix is 2 scoops wheat for every 1 scoop rye. Which of these says that ratio?',
        answers: [
          '2:1 — two wheat to one rye',
          '1:2 — one wheat to two rye',
          '21 — twenty-one scoops total',
        ],
        correct: 0,
        wrongLine: 'BAH! That’s exactly what the apprentice said before he made bread you could build a wall with. Stand still and LISTEN this time — I’m not milling your mistakes twice.',
        passToast: 'Marn’s milling trick — loot leaps to you from farther away!',
        perk: 'magnet',
        sendTo: 'Pip the Storyteller is lazing at the north house — the one with the flower boxes. He asked for you by name.',
      },
      pip: {
        title: 'Pip the Storyteller',
        waves: [
          'Ah, the famous helper! Sit, sit. Here’s a storyteller’s secret: every writer has a REASON for writing. Every single one. We call it the author’s purpose — and it’s easy as PIE.',
          { video: 'pGmR1HiW9H0', lead: 'A friend of mine put the whole trick in a moving picture. Watch — there’ll be questions!', sub: 'watch closely — Pip is testing you after', minWatch: 30 },
          'P is PERSUADE — the writer wants to convince you of something. "Vote for me!" "Buy this sword!"',
          'I is INFORM — the writer wants to teach you facts. "Foxes hunt mice under the snow."',
          'E is ENTERTAIN — the writer wants to make you FEEL something. A joke, an adventure, a scary tale. Like mine!',
          'Name the purpose and you read smarter — you know what the writer is trying to DO to you. That’s the whole trick.',
        ],
        replayFrom: 2,
        subText: 'listen closely — Pip talks in riddles',
        subAsk: 'show Pip you caught the trick',
        question: 'What do the three letters in PIE stand for?',
        answers: [
          'Persuade, Inform, Entertain',
          'Plot, Idea, Ending',
          'Pictures, Ink, Edges',
        ],
        correct: 0,
        wrongLine: 'Ohhh no no no — you fell for it! That’s exactly what a careless reader would say. A storyteller’s apprentice listens TWICE. Once more, from the top — and this time catch the trick.',
        passToast: 'Pip’s lucky feather — crystals spill TWO extra shards!',
        perk: 'shards',
        sendTo: 'Wick the Tinker is at the south house — follow the smoke, she’s burning something again. Better hurry.',
      },
      wick: {
        title: 'Wick the Tinker',
        waves: [
          'HA! Pip sent you? Good timing — my apprentice just glued two wires together with TREE SAP. Tree sap! Listen close, because this is real maker knowledge: it’s called SOLDERING.',
          { video: '3jAw41LRBxU', lead: 'I traded a moon-lamp for this picture-lesson. Watch every second of it:', sub: 'watch closely — Wick is testing you after', minWatch: 30 },
          'Soldering joins two pieces of metal PERMANENTLY. You melt a soft metal called solder onto the joint — it flows, it cools, and the parts become one.',
          'That’s the difference between wires TOUCHING (fragile, falls apart) and wires JOINED (permanent, and electricity flows right through).',
          'And respect the iron: it runs about 700 degrees. It will bite you faster than a forest wolf. Adult nearby, always, the first times.',
        ],
        replayFrom: 2,
        subText: 'listen closely — Wick does not repeat herself for free',
        subAsk: 'show Wick you’ve got maker sense',
        question: 'What does soldering do to two pieces of metal?',
        answers: [
          'Melts solder onto them so they bond into one permanent joint',
          'Ties them together with hot string',
          'Makes them touch really hard so they stick',
        ],
        correct: 0,
        wrongLine: 'TREE SAP ANSWER! That’s a tree sap answer if I ever heard one. You’re better than my apprentice — prove it. Listen again, and this time use the word "melt" in your head.',
        passToast: 'Wick’s tinker trick — building costs HALF the rocks!',
        perk: 'cheapBlocks',
        sendTo: 'That’s everyone! Now go see the Wizard on Emerald Isle — he’s been waiting all day. The east road leads home.',
      },
    },
    review: {
      waves: [
        'You actually did it. Mara’s recipe, Marn’s ratios, Pip’s PIE, Wick’s solder — the whole village is talking about you tonight.',
        'One last question before your reward, adventurer. Answer like a scholar.',
      ],
      subText: 'the wizard is listening',
      subAsk: 'show the wizard the day meant something',
      question: 'A poster in the square says "Vote Pip for Festival King!" What is the author’s purpose?',
      answers: [
        'Persuade — it’s trying to win you over',
        'Inform — it’s teaching you facts',
        'Entertain — it’s telling a story',
      ],
      correct: 0,
      wrongLine: 'Hm! Think again. Is that poster teaching you facts… or trying to WIN something from you? Walk the day with me once more — quickly.',
    },
  };

  // FRIDAY — Week 3 "TEACH IT BACK" (from summerschool curriculum-friday.js):
  // role reversal — no new lessons, no videos. The villagers ask HIM to teach
  // THEM the week's concepts. One gradeable check each; every pass points at
  // the REAL artifact (say it out loud to Dad — the game routes, Dad grades).
  const FRIDAY = {
    note: [
      'Adventurer — today is different. Today the village learns from YOU.',
      'If you can teach it, you know it. If you can’t, you don’t — and that’s fine, we’ll go again.',
      '1. Pip wants to understand why people perform for attention. Teach him.',
      '2. Old Marn has forgotten his percentages. Teach him.',
      '3. Mara keeps missing what her customers REALLY mean. Teach her the reading trick.',
      '4. Wick’s new apprentice needs YOUR soldering lesson. Teach them.',
      '5. Then come tell me what teaching felt like. — W.',
    ],
    lessons: {
      pip: {
        title: 'Pip the Storyteller',
        waves: [
          'Helper! I need YOUR head today. I watched a young bard at the festival do anything for applause — louder, sillier, desperate for eyes on him. There’s a name for that, isn’t there?',
          'You learned it this week: PICK-ME behavior. Teach it to me. What is it? Where does it come from — what does being the center of attention at home have to do with it?',
          'Think your answer through like you’re going to say it OUT LOUD. Because after this, you will — to your dad. Sixty seconds, no notes.',
        ],
        replayFrom: 1,
        subText: 'Pip is taking notes for once',
        subAsk: 'teach him — what IS it?',
        question: 'What is pick-me behavior?',
        answers: [
          'Performing to get someone’s attention instead of just being yourself',
          'Picking the best player first for your team',
          'Asking politely to be chosen',
        ],
        correct: 0,
        wrongLine: 'Hmm — no, that’s not it. Think about the bard: he wasn’t being HIMSELF, he was performing for eyes. Walk it through again and teach me properly.',
        passToast: 'Pip gets it now! Real check: say it to Dad out loud — 60 seconds, no notes.',
        perk: 'shards',
        sendTo: 'Old Marn is at the windmill pretending he remembers percentages. He doesn’t. Go teach him.',
      },
      marn: {
        title: 'Old Marn the Miller',
        waves: [
          'Don’t tell the village… but I’ve gone and forgotten my percentages. The grain tax is due and I can’t work out a tenth of anything. Teach me, quick.',
          'You know the fast facts: 50% is half. 25% is half of half. And 10%? Slide the number one step smaller — 10% of 250 is 25, 10% of 80 is 8.',
          'From 10% you can build ANYTHING — 20% is two of them, 5% is half of one. Now prove you can teach it.',
        ],
        replayFrom: 1,
        subText: 'Marn is actually listening to YOU',
        subAsk: 'teach him — with real numbers',
        question: 'The grain tax is 10% of my 250 sacks. How many sacks do I owe?',
        answers: [
          '25 sacks — slide 250 one step smaller',
          '50 sacks — half of everything',
          '10 sacks — it says 10, so 10',
        ],
        correct: 0,
        wrongLine: 'BAH — if I pay THAT the mill goes hungry! Think: 10% means one step smaller. 250 becomes…? Teach it to me again, properly this time.',
        passToast: 'Marn’s tax is paid! Real check: teach one percent trick to Dad with your own numbers.',
        perk: 'magnet',
        sendTo: 'Mara keeps missing what her customers really mean. Go teach her the reading trick — she’s at the bakery.',
      },
      mara: {
        title: 'Mara the Baker',
        waves: [
          'Dear, I need your week’s cleverest trick. A customer said "oh, the bread is… rustic" and smiled all wrong. She meant something she didn’t SAY, didn’t she?',
          'You learned this: INFERENCE — figuring out what something really means from clues, not just the words. Reading between the lines.',
          'The clues: her face, the pause, the word she picked. "Rustic" with that smile means "burnt," doesn’t it! Teach me how you knew.',
        ],
        replayFrom: 1,
        subText: 'Mara is hanging on your words',
        subAsk: 'teach her — what is the trick called and how does it work?',
        question: 'What is an inference?',
        answers: [
          'Figuring out what something means from clues, not just what it says',
          'Reading a sentence twice to memorize it',
          'Guessing randomly when you don’t know',
        ],
        correct: 0,
        wrongLine: 'Hah! No no — it’s not guessing, dear, and it’s not memorizing. It’s the CLUES. The face, the pause, the chosen word. Teach it to me again.',
        passToast: 'Mara reads her customers now! Real check: give Dad ONE real example of reading between the lines.',
        perk: 'smash2',
        sendTo: 'Wick’s new apprentice is about to glue wires with tree sap AGAIN. Go teach them soldering — south house.',
      },
      wick: {
        title: 'Wick the Tinker',
        waves: [
          'YOU. Perfect. New apprentice starts today and I’m busy — so YOU give the soldering lesson. Yesterday you learned it; today you teach it. That’s how knowing works.',
          'Remember the heart of it: solder MELTS, flows into the joint, cools, and the two metals become ONE. Permanent. Conductive. Not tree sap.',
          'And the safety line — say it like you mean it: 700 degrees, bites faster than a forest wolf, adult nearby the first times.',
        ],
        replayFrom: 1,
        subText: 'the apprentice is watching you',
        subAsk: 'give the lesson — what does soldering DO?',
        question: 'Your wires keep falling apart. What do you teach the apprentice to do?',
        answers: [
          'Solder them — melt solder so the metals bond into one permanent joint',
          'Wrap them in tree sap and hope',
          'Press them together really hard',
        ],
        correct: 0,
        wrongLine: 'WHAT. Did I hear TREE SAP?! The apprentice almost believed you! Again — and use the word MELT like you were taught.',
        passToast: 'The apprentice can solder! Real check: teach Dad the whole thing in your own words.',
        perk: 'cheapBlocks',
        sendTo: 'That’s the whole village taught by YOU. Come tell the Wizard what teaching felt like — Emerald Isle.',
      },
    },
    review: {
      waves: [
        'So. Pip understands attention, Marn paid his tax, Mara reads her customers, and an apprentice can solder — all because YOU taught them.',
        'Here’s the secret, adventurer: if you can teach a thing, you truly know it. One last proof.',
      ],
      subText: 'the wizard is listening',
      subAsk: 'one last proof',
      question: 'You tip 10% on a 50-coin meal at the village inn. How many coins is the tip?',
      answers: [
        '5 coins — 50, one step smaller',
        '10 coins — it says 10',
        '25 coins — half of 50',
      ],
      correct: 0,
      wrongLine: 'Careful — the innkeeper is smiling at you. 10% means one step smaller. 50 becomes…? Walk it through once more.',
    },
  };

  // pick the day's content by weekday; THURSDAY doubles as the default until
  // more days are authored
  const BY_WEEKDAY = {
    thu: THURSDAY,
    fri: FRIDAY,
  };
  const wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const day = BY_WEEKDAY[wd] || THURSDAY;
  // LOCAL date key (not UTC — UTC would flip the "day" mid-evening)
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  window.ISO_DAY = {
    key, // day-keys lesson progress: new day = fresh lessons automatically
    ...day,
  };
})();
