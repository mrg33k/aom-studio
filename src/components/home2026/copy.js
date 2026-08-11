// FROZEN COPY v1 — aheadofmarket.com home page.
// Source of truth: corner/users/aom/projects/aheadofmarket.com/missions/home/copy-frozen-v1.md
// This file is a VERBATIM transcription. Do not edit a string here to fix the page.
// To change a word: edit the frozen file, bump the version, regenerate this, re-run the copy diff.

export const COPY_VERSION = 'v1';

export const NAV = ['WORK', 'WHAT WE DO', 'CASE STUDIES', 'FILM', 'CONTACT'];

export const S1_HERO = {
  eyebrow: 'PHOENIX, ARIZONA — MARKETING RUN IN-HOUSE FOR CONTRACTORS',
  h1a: 'YOUR WORK IS GOOD.',
  h1b: 'NOBODY OUTSIDE THE JOB SITE HAS SEEN IT.',
  body: 'We photograph your jobs, build the site, and run the ads. One department, one monthly fee, reporting in phone calls.',
  cta: 'SEE WHAT A MONTH LOOKS LIKE',
  strip: ['01 PHOTO', '02 VIDEO', '03 WEBSITE', '04 ADS', '05 THE PHONE RINGS'],
};

export const S2_TRADES = {
  h2: 'MECHANICAL. PLUMBING. ELECTRICAL. ROOFING. CONCRETE. FIRE PROTECTION.',
  body1: 'If you run crews, this was built for you.',
  body2: "If you sell software, it wasn't.",
};

export const S3_HOW = {
  eyebrow: 'HOW IT ACTUALLY RUNS',
  h2: 'ONE DAY ON YOUR SITE. THIRTY DAYS OF WORK.',
  stations: [
    { n: '01', title: 'WE SHOW UP', body: 'One shoot day a month on an active job. You pick the site and the day. Our camera works around your crew, not the reverse.' },
    { n: '02', title: 'YOU GET THE PHOTOS', body: 'Black and white and colour, full resolution, inside a week. Yours to keep, including if you fire us.' },
    { n: '03', title: 'THE SITE GETS BUILT', body: 'A page for every service you want more of and every city you serve. That is how you turn up in searches you are invisible in.' },
    { n: '04', title: 'THE ADS GO ON', body: 'Google Search and Local Services Ads, fenced to your service area. Every call recorded and tagged to the ad that caused it.' },
    { n: '05', title: 'YOU SEE THE NUMBER', body: 'One page, first week of the month. Calls, where they came from, which became jobs. You can check it against your own phone log.' },
  ],
};

export const S4_OFFER = {
  eyebrow: 'ONE PRICE. NO TIERS. NO SETUP FEE.',
  h2a: 'EVERYTHING A MARKETING DEPARTMENT DOES.',
  h2b: 'FOR LESS THAN ONE SALARY.',
  price: '$3,000',
  priceSub: 'A MONTH. THIRTY DAYS NOTICE. CANCEL ANY TIME.',
  group1Label: 'IN YOUR FIRST MONTH',
  group1: [
    'A MARKETING DEPARTMENT PLAN, WRITTEN FOR YOUR COMPANY',
    'A LANDING PAGE, BUILT AND LIVE',
    'A VIDEO, SHOT ON YOUR JOB AND CUT',
    'BRAND GUIDELINES — YOUR COLOURS, TYPE AND LOGO, WRITTEN DOWN',
    'YOUR GOOGLE BUSINESS PROFILE REBUILT',
  ],
  group2Label: 'AND THEN, EVERY MONTH',
  group2: [
    'A SHOOT DAY ON YOUR JOBS — PHOTO AND VIDEO',
    'EVERY USABLE FRAME, BLACK AND WHITE AND COLOUR, YOURS FOREVER',
    'SHORT VIDEOS CUT FROM THE SHOOT',
    'A PAGE FOR EVERY SERVICE AND EVERY CITY YOU SERVE',
    'GOOGLE ADS AND LOCAL SERVICES ADS, RUN AND MANAGED',
    'EVERY CALL RECORDED AND TAGGED TO ITS SOURCE',
    'YOUR SOCIAL POSTED FOR YOU',
    'ONE REPORT A MONTH YOU CAN CHECK AGAINST YOUR OWN PHONE LOG',
  ],
  terms: 'NO CONTRACT. NO SETUP FEE. YOU KEEP THE PLAN, THE PHOTOS, THE SITE AND THE AD ACCOUNT IF YOU LEAVE.',
};

export const S5_BILLBOARD = {
  h2: 'MARKETING GETS YOUR STORY TOLD. PROMOTION GETS IT SEEN.',
  sub: 'WE DO BOTH, IN THAT ORDER',
};

export const S6_PROOF = {
  eyebrow: 'AMBITION MECHANICAL — PHOENIX, ARIZONA',
  h2a: 'FOUR CALLS LAST MONTH.',
  h2b: 'ALL FOUR BECAME',
  h2c: 'SERVICE CALLS.',
  body: 'Google Ads, first full month running. Small numbers, real ones, and you are welcome to ask them.',
  // Each figure prints ONCE — label above, number below.
  stats: [
    { label: 'SHOOTS ON THEIR JOBS', value: '46' },
    { label: 'PHOTOS DELIVERED', value: '399' },
  ],
  cta: 'READ THE WHOLE CASE STUDY',
};

export const S7_MATH = {
  eyebrow: 'DO THE MATH BEFORE YOU CALL US',
  h2: 'ONE MONTH ON YOUR OWN COSTS FOUR MONTHS OF US.',
  head: ['HIRING IT IN-HOUSE', 'A MONTH', 'A YEAR'],
  rows: [
    ['ONE MARKETING MANAGER, SALARIED AND LOADED', '$8,833', '$106,000'],
    ['A VIDEOGRAPHER, 12 SHOOT DAYS', '$900', '$10,800'],
    ['PHOTO EDITING', '$400', '$4,800'],
    ['A WEBSITE BUILT', '$542', '$6,500'],
    ['ADS MANAGED BY AN AGENCY', '$850', '$10,200'],
    ['CAMERA, LENSES, LIGHTS', '$583', '$7,000'],
    ['SOFTWARE — ADOBE, CALL TRACKING, HOSTING', '$300', '$3,600'],
  ],
  totalTheirs: ['THEIR TOTAL', '$12,408', '$148,900'],
  totalOurs: ['AHEAD OF MARKET, ALL OF IT', '$3,000', '$36,000'],
  punchline: 'WHAT ONE MONTH COSTS YOU IN-HOUSE BUYS FOUR MONTHS OF US.',
  footnote: 'YOUR AD BUDGET IS SEPARATE. YOU PAY GOOGLE DIRECT, AT COST, AND THE ACCOUNT STAYS YOURS.',
};

export const S8_QUESTIONS = {
  eyebrow: 'FOR WHOEVER IS CHECKING US OUT FIRST',
  h2: 'THE QUESTIONS YOU WOULD ASK BEFORE CALLING.',
  // TYPE RULE: questions + answers are BODY grotesque, sentence case. Only the h2 is display.
  qa: [
    { q: 'Do we own the photos?', a: 'Yes. All of them, full resolution, forever. Including if you leave.' },
    { q: 'What happens if we stop?', a: 'You keep the photos, the website and the ad account. Thirty days notice. Nothing is held hostage.' },
    { q: 'Do you need my crew to stop working?', a: 'No. We work around the job. If we are ever in the way, tell us and we move.' },
    { q: 'Are you doing this for a competitor of mine?', a: 'No. One contractor per trade per metro. If we already work with a mechanical contractor here, we will say so.' },
    { q: 'How long before the phone rings?', a: 'Ads, usually inside the first month. Search, three to six. Anyone promising faster than that is guessing.' },
    { q: 'Who do I actually talk to?', a: 'The person who shoots your jobs is the person who answers your email.' },
  ],
};

export const S9_RANGE = {
  eyebrow: 'ALSO OUT OF THIS OFFICE',
  h2: 'NOT ONLY A CONTRACTOR SHOP.',
  items: [
    { title: 'CORNER', body: 'Our own app, in the App Store.' },
    { title: 'FILM AND BTS', body: 'Crews for brands and agencies.' },
    { title: 'WEBSITES', body: 'Built to load fast and rank.' },
  ],
  footnote: 'LOOKING FOR A VIDEO CREW RATHER THAN A MARKETING DEPARTMENT? THAT IS A DIFFERENT PAGE.',
};

export const MODAL = {
  step1: {
    label: 'STEP 1 OF 3',
    h: 'WHO ARE YOU?',
    fields: [
      { key: 'name', label: 'YOUR NAME', placeholder: 'FIRST AND LAST' },
      { key: 'email', label: 'EMAIL', placeholder: 'YOU@COMPANY.COM' },
    ],
    cta: 'NEXT',
  },
  step2: {
    label: 'STEP 2 OF 3',
    h: 'WHAT DO YOU RUN?',
    groups: [
      { key: 'trade', label: 'YOUR TRADE', options: ['MECHANICAL', 'PLUMBING', 'ELECTRICAL', 'ROOFING', 'CONCRETE', 'OTHER'] },
      { key: 'crews', label: 'HOW MANY CREWS', options: ['1-2', '3-5', '6-10', '10+'] },
    ],
    back: 'BACK',
    cta: 'NEXT',
  },
  step3: {
    label: 'STEP 3 OF 3',
    h: 'WHAT DO YOU WANT MORE OF?',
    groups: [
      { key: 'want', label: '', options: ['SERVICE CALLS', 'BIGGER JOBS', 'BETTER PHOTOS', 'ALL OF IT'] },
      { key: 'when', label: 'WHEN', options: ['NOW', 'THIS QUARTER', 'JUST LOOKING'] },
    ],
    back: 'BACK',
    cta: 'SEND IT',
  },
  // Required states the frozen file flags as missing-from-copy; written here so the build
  // cannot ship two thirds of a design.
  success: {
    h: 'GOT IT.',
    body: 'The person who shoots your jobs reads this. You will hear back inside one business day, from a real address, not a no-reply.',
    cta: 'CLOSE',
  },
  error: {
    h: "THAT DIDN'T SEND.",
    body: 'Our end, not yours. Try once more, or email patrik@aheadofmarket.com and it lands in the same place.',
    cta: 'TRY AGAIN',
  },
};
