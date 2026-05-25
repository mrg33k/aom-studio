/* Summer School — Week 1 curriculum data
 * Placeholder content where final content is pending Patrik's review.
 * Each day = central passage + topic content + vocab/spelling pulled from passage.
 */

window.CURRICULUM = {
  weekOf: '2026-06-09',

  monday: {
    theme: 'BUILD STUFF',
    themeDesc: 'Making things with code, hardware, and games.',

    // central passage — all drills feed off this
    passage: {
      title: 'How Roblox Studios Work',
      hero: 'A teen-led studio behind one of Roblox\'s biggest hits',
      paragraphs: [
        "If you have ever bought an accessory in Roblox, you have used Robux. Robux are not real money — they are tokens that only work inside the platform. But the road they travel is long, and at every stop, somebody takes a cut.",
        "When you spend ten dollars to buy eight hundred Robux, Apple or Google take roughly thirty percent just to let the purchase happen on your phone. Roblox, the company, keeps another share. By the time those Robux turn into a real payment for the studio that built your favorite game, the studio might receive less than twenty-five percent of what you originally paid.",
        "This is why studios maximize in-game purchases. They need a lot of small sales to add up to a real paycheck. Some of the biggest Roblox games earn their creators millions a year, but only because hundreds of millions of players each spend a few dollars. The kids who started Adopt Me began as players. They taught themselves to code, joined forces, and built something the whole platform fell in love with."
      ],
      questions: [
        {
          q: "What are Robux?",
          choices: ["Real money that works anywhere", "Tokens that only work inside Roblox", "A type of game"],
          right: 1
        },
        {
          q: "Roughly what percentage does the studio receive of your original $10?",
          choices: ["Less than 25%", "About 50%", "Around 90%"],
          right: 0
        },
        {
          q: "Why do studios push small in-game purchases?",
          choices: ["Because players hate big payments", "Because lots of small sales add up to a real paycheck", "Because Roblox forces them to"],
          right: 1
        },
        {
          q: "What's the main idea of this passage?",
          choices: [
            "Roblox is a bad platform for developers",
            "Money flows through several middlemen before it reaches a Roblox game's actual creators",
            "Apple and Google should change their fees"
          ],
          right: 1
        }
      ],
      // Speed-Read comprehension (asked after RSVP finishes)
      srComprehension: [
        { q: "How much of your $10 typically goes to Apple or Google for the phone purchase?", choices: ["About 30%", "About 10%", "All of it"], right: 0 },
        { q: "What's another name the passage uses for Roblox's developers?", choices: ["Coders", "Studios", "Artists"], right: 1 },
        { q: "Whose game does the passage mention as one that was started by kids?", choices: ["Adopt Me", "Minecraft", "Fortnite"], right: 0 }
      ]
    },

    // Arduino "what if you changed this" quiz — 3 questions
    arduinoWhatIf: [
      { q: 'If you changed `delay(3000)` to `delay(500)` for the green light, what would happen?', choices: ['Green would stay on for 500 seconds', 'Green would only stay on for half a second', 'The code would error'], right: 1 },
      { q: 'If you removed `pinMode(red, OUTPUT)`, what would happen to the red LED?', choices: ['It would still work normally', 'It might not turn on properly because the chip doesn\'t know it\'s an output', 'It would explode'], right: 1 },
      { q: 'How many digital pins does an Arduino UNO have available?', choices: ['3', '13', '100'], right: 1 }
    ],

    // Inspirational quiz — 3 questions about Mikaila Ulmer
    inspirationalQuiz: [
      { q: "How old was Mikaila when she pitched on Shark Tank?", choices: ["8", "12", "15"], right: 1 },
      { q: "Where did her recipe come from?", choices: ["A cookbook", "Her great-grandmother", "She invented it"], right: 1 },
      { q: "What inspired her to use honey and help bees?", choices: ["School project", "Being stung twice in one week", "Her mom"], right: 1 }
    ],

    vocab: ['accessory', 'platform', 'currency', 'studio', 'license', 'maximize'],
    spelling: ['platform', 'currency', 'studio', 'percent', 'design', 'release', 'audience', 'maximize', 'creator', 'license'],

    money: {
      name: 'The 3-Bucket Rule',
      lesson: "Every dollar you get — allowance, birthday money, lemonade-stand profits — goes into three buckets. Save (long-term), Spend (today), and Give (someone who needs it more than you).",
      buckets: [
        { name: 'Save', pct: 50, what: 'for something bigger later' },
        { name: 'Spend', pct: 40, what: 'for now, your choice' },
        { name: 'Give', pct: 10, what: 'someone who needs it' }
      ],
      scenario: { amount: 30, prompt: 'You got $30. Split it across the three buckets.' }
    },

    arduino: {
      dykTitle: "Your Zeus Car's brain runs traffic lights",
      dyk: "The Arduino UNO chip inside your Zeus Car kit is the same family of chip that runs real traffic lights, vending machines, and even art installations in museums. With just 13 digital pins and a few lines of code, you can blink LEDs, read sensors, control motors. The code below would turn four LEDs into a working traffic-light pattern.",
      code: "int red = 8, yellow = 9, green = 10;\n\nvoid setup() {\n  pinMode(red,    OUTPUT);\n  pinMode(yellow, OUTPUT);\n  pinMode(green,  OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(green, HIGH);  delay(3000);\n  digitalWrite(green, LOW);\n  digitalWrite(yellow, HIGH); delay(1000);\n  digitalWrite(yellow, LOW);\n  digitalWrite(red, HIGH);    delay(3000);\n  digitalWrite(red, LOW);\n}",
      predict: {
        q: "What does the loop() function above do?",
        choices: [
          "Blinks all three LEDs at the same time, forever",
          "Cycles green for 3 seconds, yellow for 1 second, red for 3 seconds, repeating",
          "Only turns on the green LED once"
        ],
        right: 1
      },
      writingPrompt: "What's one thing in your room you'd want to make programmable? Why?"
    },

    inspirational: {
      title: "She was 12 when she started",
      paragraph: "Mikaila Ulmer was 12 years old when she walked into Shark Tank and pitched her honey-sweetened lemonade business. She walked out with a $60,000 investment from Daymond John. The recipe came from her great-grandmother. The idea — using honey instead of sugar, and donating part of every bottle to save honeybees — came from getting stung twice in one week and deciding to learn about the bees instead of being afraid of them. By the time she was 15, her lemonade was in Whole Foods stores across the country."
    },

    math: {
      kind: 'quickfire',
      problems: [
        { p: '8 × 7', a: 56 },
        { p: '12 + 19', a: 31 },
        { p: '90 - 47', a: 43 },
        { p: '6 × 9', a: 54 },
        { p: '100 / 4', a: 25 },
        { p: '14 × 3', a: 42 },
        { p: '85 - 28', a: 57 },
        { p: '7 × 11', a: 77 }
      ]
    },

    // 7th grade Maricopa concept #1 — Ratios & Unit Rates
    mathLesson: {
      number: 1,
      domain: 'Ratios & Proportional Relationships',
      title: 'Unit Rates',
      goal: 'Find the rate per one unit when you know a quantity over time, distance, or money.',
      videoId: 'qGTYSAeLTOE',  // Khan Academy: Intro to rates — verified embeddable
      // Fallback if the video can't embed — same content in text form
      summary: [
        "A RATE is just a comparison between two different quantities. Like '60 miles in 1 hour' or '$12 for 4 pounds of grapes'. The two numbers don't have the same unit — that's what makes it a rate (and not just a ratio).",
        "A UNIT RATE is a rate where the second number is exactly 1. '60 miles per 1 hour' is the unit rate version of '120 miles in 2 hours' or '300 miles in 5 hours'. They all describe the same speed; the unit rate just expresses it per ONE.",
        "To find a unit rate, you divide. $12 for 4 pounds → divide both sides by 4 → $3 for 1 pound → $3 per pound is the unit rate. 210 miles in 3.5 hours → divide both by 3.5 → 60 miles per 1 hour → 60 mph.",
        "Unit rates make comparison easy. If one store sells apples at $6 for 4 lbs and another at $9 for 5 lbs, you find the unit rate of each — $1.50/lb vs $1.80/lb — and the first one's the better deal. You use unit rates every day without thinking about it: miles per gallon, dollars per hour, words per minute. Anytime someone says 'per' that's a unit rate."
      ],
      questions: [
        { q: 'A unit rate compares one quantity to how many of the other?', a: ['Zero', 'One', 'Ten'], right: 1 },
        { q: 'If 4 apples cost $6, what is the unit rate per apple?', a: ['$1.00', '$1.25', '$1.50'], right: 2 },
        { q: 'A car drives 180 miles in 3 hours. What is the unit rate?', a: ['50 mph', '60 mph', '90 mph'], right: 1 }
      ],
      practice: [
        { p: '$12 for 4 lbs of grapes. Price per lb?', a: 3, unit: '$' },
        { p: '210 miles in 3.5 hours. Speed per hour?', a: 60, unit: ' mph' },
        { p: '15 pages read in 5 minutes. Pages per minute?', a: 3, unit: ' pages/min' }
      ]
    },

    // Topic video — Roblox dev day
    topicVideo: {
      title: 'How a Roblox studio actually ships a game',
      ytId: 'KdaCdfXMSCk',
      // Fallback summary if the video can't embed (same content in text)
      summary: [
        "Most Roblox studios that build hit games aren't massive companies — they're tight teams of 2 to 6 people. Adopt Me, one of the platform's biggest games ever, started with two teenagers who taught themselves to code.",
        "The biggest single cost for a Roblox studio is usually the developers' own time. Server fees come up too, but Roblox handles most of the infrastructure. The license itself is free — anyone can publish a game.",
        "When you spend $10 on Robux, Roblox the company keeps roughly 30% before the studio sees anything. Apple or Google take another big slice for processing the purchase on your phone. By the time the money reaches the studio that actually built your game, less than 25% of your original $10 is left for them. That's why studios push lots of small in-game purchases — they need volume to make it work."
      ],
      questions: [
        { q: 'About how many people are typically on a small Roblox studio team?', a: ['1 person', '2-6 people', '50+ people'], right: 1 },
        { q: 'What\'s one of the biggest costs for a Roblox studio?', a: ['Server fees', 'Their developers\' time', 'Roblox license'], right: 1 },
        { q: 'What percent does Roblox typically keep from a Robux purchase before the studio sees anything?', a: ['About 5%', 'About 30%', 'Most of it'], right: 1 }
      ]
    },

    bagBeat: {
      day: 'mon',
      key: 'name',
      title: 'Name your game',
      prompt: 'You\'re starting your own Roblox studio. What\'s the name of your first game? Write 3-5 sentences pitching it: what\'s it called, what genre, what makes it different.',
      help: 'Write your pitch on paper. When you\'re done, grab Mom or Dad to read it.'
    },

    typingTarget: "Studios maximize in-game purchases because small sales add up to real paychecks.",

    // ORDERED BLOCK LIST — the actual day plan
    // Doubled from 25 → 48 blocks for a real 3-4 hour day (was ~1 hour).
    // Drills (typing/spelling/word tiles/speed-read/word run) repeat more
    // to lock in retention. Topic content stays the same; he encounters it
    // multiple times in different formats.
    blocks: [
      { id: 'welcome',     kind: 'drill', type: 'welcome',      title: 'Welcome',                  minutes: 2  },
      { id: 'reading-1',   kind: 'topic', type: 'reading',      title: 'Reading — chunk 1',        minutes: 10, slice: [0, 1] },
      { id: 'typing-1',    kind: 'drill', type: 'typing',       title: 'Typing Sprint #1',         minutes: 4  },
      { id: 'mathlesson',  kind: 'topic', type: 'mathlesson',   title: 'Math — Unit Rates (new)',  minutes: 18 },
      { id: 'tiles-1',     kind: 'drill', type: 'tiles',        title: 'Word Tiles — round 1',     minutes: 6, words: ['robux'] },
      { id: 'money-1',     kind: 'topic', type: 'money',        title: 'Money Move — 3 buckets',   minutes: 10, part: 'concept' },
      { id: 'speedread-1', kind: 'drill', type: 'speedread',    title: 'Speed-Read — pass 1',      minutes: 5  },
      { id: 'spelling-1',  kind: 'drill', type: 'spelling',     title: 'Spelling — round 1',       minutes: 8, words: ['platform','currency','studio'] },
      { id: 'video-1',     kind: 'topic', type: 'video',        title: 'Video — Roblox studio',    minutes: 10 },
      { id: 'tiles-2',     kind: 'drill', type: 'tiles',        title: 'Word Tiles — round 2',     minutes: 6, words: ['studio'] },
      { id: 'arduino',     kind: 'topic', type: 'arduino',      title: 'Arduino — Zeus Car DYK',   minutes: 8  },
      { id: 'typing-2',    kind: 'drill', type: 'typing',       title: 'Typing Sprint #2',         minutes: 4  },
      { id: 'reading-2',   kind: 'topic', type: 'reading',      title: 'Reading — chunk 2',        minutes: 10, slice: [1, 2] },
      { id: 'wordrun-1',   kind: 'drill', type: 'wordrun',      title: 'Word Run — level 1',       minutes: 10, word: 'studio' },
      { id: 'math-1',      kind: 'drill', type: 'math',         title: 'Math Game — quickfire',    minutes: 8  },
      { id: 'money-2',     kind: 'topic', type: 'money',        title: 'Money Move — split $30',   minutes: 8, part: 'scenario' },
      { id: 'tiles-3',     kind: 'drill', type: 'tiles',        title: 'Word Tiles — round 3',     minutes: 6, words: ['currency'] },
      { id: 'speedread-2', kind: 'drill', type: 'speedread',    title: 'Speed-Read — pass 2 (+20 WPM)', minutes: 5  },
      { id: 'arduino-2',   kind: 'topic', type: 'arduino-code', title: 'Code Snippet — predict',   minutes: 6  },
      { id: 'spelling-2',  kind: 'drill', type: 'spelling',     title: 'Spelling — round 2',       minutes: 8, words: ['percent','design','release'] },
      { id: 'typing-3',    kind: 'drill', type: 'typing',       title: 'Typing Sprint #3',         minutes: 4  },
      { id: 'reading-3',   kind: 'topic', type: 'reading',      title: 'Reading — chunk 3',       minutes: 10, slice: [2, 3] },
      { id: 'mid-showdad', kind: 'topic', type: 'showdad',      title: 'Mid-day check-in',         minutes: 5  },
      { id: 'wordrun-2',   kind: 'drill', type: 'wordrun',      title: 'Word Run — level 2',       minutes: 10, word: 'currency' },
      { id: 'inspire-1',   kind: 'topic', type: 'inspire',      title: 'A young creator',          minutes: 5  },
      { id: 'tiles-4',     kind: 'drill', type: 'tiles',        title: 'Word Tiles — round 4',     minutes: 6, words: ['platform'] },
      { id: 'spelling-3',  kind: 'drill', type: 'spelling',     title: 'Spelling — round 3',       minutes: 8, words: ['audience','maximize','creator'] },
      { id: 'math-2',      kind: 'drill', type: 'math',         title: 'Math Game — quickfire #2', minutes: 8  },
      { id: 'speedread-3', kind: 'drill', type: 'speedread',    title: 'Speed-Read — pass 3 (+40 WPM)', minutes: 5  },
      { id: 'arduino-w',   kind: 'topic', type: 'writing-mini', title: 'Arduino — micro write',    minutes: 5  },
      { id: 'typing-4',    kind: 'drill', type: 'typing',       title: 'Typing Sprint #4',         minutes: 4  },
      { id: 'wordrun-3',   kind: 'drill', type: 'wordrun',      title: 'Word Run — level 3',       minutes: 10, word: 'platform' },
      { id: 'spelling-4',  kind: 'drill', type: 'spelling',     title: 'Spelling — round 4',       minutes: 8, words: ['license','studio','currency'] },
      { id: 'tiles-5',     kind: 'drill', type: 'tiles',        title: 'Word Tiles — round 5',     minutes: 6, words: ['design'] },
      { id: 'speedread-4', kind: 'drill', type: 'speedread',    title: 'Speed-Read — pass 4 (+60 WPM)', minutes: 5  },
      { id: 'typing-5',    kind: 'drill', type: 'typing',       title: 'Typing Sprint #5',         minutes: 4  },
      { id: 'spelling-5',  kind: 'drill', type: 'spelling',     title: 'Spelling — round 5',       minutes: 8, words: ['accessory','currency','design'] },
      { id: 'tiles-6',     kind: 'drill', type: 'tiles',        title: 'Word Tiles — round 6',     minutes: 6, words: ['license'] },
      { id: 'wordrun-4',   kind: 'drill', type: 'wordrun',      title: 'Word Run — level 4',       minutes: 10, word: 'creator' },
      { id: 'math-3',      kind: 'drill', type: 'math',         title: 'Math Game — quickfire #3', minutes: 8  },
      { id: 'speedread-5', kind: 'drill', type: 'speedread',    title: 'Speed-Read — pass 5 (max)', minutes: 5  },
      { id: 'typing-6',    kind: 'drill', type: 'typing',       title: 'Typing Sprint #6',         minutes: 4  },
      { id: 'bag-mon',     kind: 'topic', type: 'bag',          title: 'Build-A-Game — Day 1',     minutes: 25 },
      { id: 'showdad',     kind: 'topic', type: 'showdad',      title: 'Show Mom or Dad',          minutes: 10 },
      { id: 'splash',      kind: 'drill', type: 'splash',       title: 'End of day',               minutes: 2  }
    ]
  }
};
