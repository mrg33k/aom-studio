// R38 homepage content, V6.1 LOCKED copy (2026-08-13), console tokens, R2 clarify 2026-08-14.
// Voice law: positive, light, spelled-out plain talk. One flowing thought per
// sentence. Money appears exactly once (THE MATH). Numbers live beside the
// client's name only. CTA is "Tell us what you need" (brief is retired).
// R2: every secondary line earns its place or is cut. No em dashes. Sentences rewritten.

export const T = {
  paper: '#F5F3EE',
  paperSoft: '#EDE9E1',
  carbon: '#0A0A08',
  orange: '#F04404',
  orangeLabel: '#C43800',
};

export const HERO = {
  eyebrow: 'Phoenix, Arizona',
  // Hand-placed lines; the last line renders in the italic body register.
  h1Lines: ["We're the marketing", 'department for companies'],
  h1Emphasis: "that don't have one.",
  sub: 'We plan it, film it, build it, and run it every month out of Phoenix. Your jobs, your website, your ads, and your reviews.',
  cta: 'Tell us what you need',
  ctaSub: 'See the work',
};

export const DEPT = {
  kick: 'The five parts',
  open: "You've got a company to run. We handle the marketing.",
  para: 'We plan it, we film it, we build it, and we run it. At the end of the month you get one page that shows what happened.',
  // Density layer: evidence marginalia — fills the band without touching locked body copy.
  ledger: [
    { n: '01', label: 'The plan',    meta: '90-day paper · weekly or biweekly', detail: 'A one-page plan for the next three months. No deck.' },
    { n: '02', label: 'The filming', meta: 'On your jobs · photo + drone + video', detail: 'If the work is happening, we are there.' },
    { n: '03', label: 'The website', meta: 'Build + keep current · you own it', detail: 'Your domain, your name, your files.' },
    { n: '04', label: 'The ads',     meta: 'Weekly management · you pay Google', detail: 'The account is yours. We run it.' },
    { n: '05', label: 'The reviews', meta: 'Same voice as you', detail: 'We write back the way you would.' },
  ],
  modules: [
    { label: 'The plan',    body: 'Every 90 days we put the next three months on paper you can read. We meet every week or every other week, your call.' },
    { label: 'The filming', body: 'We come to your jobs for photos, drone, and video. If the work is happening, we are there to film it.' },
    { label: 'The website', body: 'We build it and keep it current. You are in the room as much as you want to be.' },
    { label: 'The ads',     body: 'We set them up and manage them every week. The ad account is yours and you pay Google directly.' },
    { label: 'The reviews', body: 'When one comes in, we write back the way you would.' },
  ],
};

export const NINETY = {
  kick: 'The first 90 days',
  body: 'The first few weeks we set things up and make everything look right. By the end of the first month you hear it from customers and from people around town. After that the wheels are rolling and we get tactical.',
  steps: [
    { d: 'Days 1-14',  what: 'Set up and make it look right', note: 'Site, profiles, shoot calendar.' },
    { d: 'Days 15-30', what: 'You hear it from customers',     note: 'First jobs filmed, first posts live.' },
    { d: 'Days 31-90', what: 'Wheels rolling, get tactical',   note: 'Ads on, report one page at month end.' },
  ],
};

export const MONTH = {
  kick: 'A month with us',
  tail: "Then we do it again. That's what a department is.",
  body: 'Work goes live as it is ready. At the end of the month you get one page that shows what ran and what it did.',
  weeks: [
    { wk: 'Week 1', what: 'Plan the month.',      out: 'One-page plan · shot list locked' },
    { wk: 'Week 2', what: 'Shoot on your jobs.',  out: 'Photos, drone, video on site' },
    { wk: 'Week 3', what: 'Build and launch.',    out: 'Site, edits, ad sets live' },
    { wk: 'Week 4', what: 'Run and report.',      out: 'Manage, answer reviews, one-page report' },
  ],
};

export const FILMS = {
  kick: 'Two films',
  h2: 'Shot on our clients’ jobs.',
  items: [
    {
      reel: '698a58aefc23d3d76fa7cdd6',
      label: 'Ambition Mechanical, Phoenix',
      title: 'On the roof for an emergency hospital install.',
    },
    {
      reel: '698a5e91873071aec5c9fc36',
      label: 'Tree Guardian USA, Documentary',
      title: 'A company story, told long-form.',
    },
  ],
};

export const WORK = {
  kick: 'By what we made',
  h2: 'Every industry. A soft spot for construction.',
  lede: 'We do this for every industry. Construction just has our heart.',
};

export const ALACARTE = {
  kick: 'Just need one thing?',
  body: 'Not everybody needs the whole department. If you want a crew for a day, a website, or someone to run your ads, we do that too.',
  link: 'Crew for a day, a website, or ads. You pick.',
  items: [
    { title: 'A crew for a day',      detail: 'Shoot + edit, back in two days', meta: 'Photo · drone · video · cut' },
    { title: 'A website',             detail: 'Build or rebuild, you own it',  meta: 'Design · build · keep current' },
    { title: 'Somebody to run your ads', detail: 'Weekly management, you pay Google', meta: 'Your account · weekly tuning' },
  ],
};

export const MATH = {
  kick: 'In house versus us',
  h2: 'What it would cost you to do this yourself.',
  body: 'If you hired this yourself, a videographer and someone on the website and someone running the ads, it comes out around $12,000 a month. We are $3,000. There is no contract and everything we make is yours to keep. The plan, the photos, the site, and the ad account.',
  punch: 'One month in-house buys four months of us.',
  rows: [
    { role: 'Videographer',    inhouse: '$4,000+', us: 'Included' },
    { role: 'Web person',      inhouse: '$4,000+', us: 'Included' },
    { role: 'Ads manager',     inhouse: '$3,500+', us: 'Included' },
    { role: 'The plan + the reviews', inhouse: '·', us: 'Included' },
  ],
  foot: 'Around $12k in-house vs $3k with us. No contract. Everything we make is yours.',
};

export const PROOF = {
  kick: 'One client, one year',
  label: 'Ambition Mechanical, Phoenix',
  body: 'Ambition Mechanical in Phoenix has been with us a year. 46 shoots and 399 photos, and after a few months the phone started ringing. You are welcome to ask them.',
  aside: 'You will talk to the same person you started with. If they miss you, they call you back.',
  stats: [
    { v: '46',  k: 'Shoots this year',  d: 'On their jobs, not in a studio' },
    { v: '399', k: 'Photos delivered',  d: 'Edited, tagged, yours to keep' },
    { v: '12',  k: 'Months with us',    d: 'No contract the whole time' },
  ],
};

export const CLOSING = {
  h2: 'Ready when you are.',
  cta: 'Tell us what you need',
  footnote: 'Just need a crew for a day? Tell us what you need.',
};

export const NAV = {
  brand: 'Ahead of Market',
  cta: 'Tell us what you need',
  menus: [
    {
      label: 'What we do',
      cols: [
        {
          kick: 'The department',
          links: [
            { t: 'The plan',    s: 'A 90-day plan you can read.',        href: '#department' },
            { t: 'The filming', s: 'Shot on your jobs. We come to you.', href: '#films' },
            { t: 'The website', s: 'Your domain and your name. You own it.', href: '#work' },
          ],
        },
        {
          kick: 'Just one thing',
          links: [
            { t: 'A crew for a day', s: 'Filmed and edited, back in two days.', href: '#one-thing' },
          ],
        },
      ],
    },
    {
      label: 'The work',
      cols: [
        {
          kick: 'Browse',
          links: [
            { t: 'The reels',            s: 'Every reel is a real client job.', href: '#work' },
            { t: 'Filmed by us',         s: 'Two films, one minute each.',      href: '#films' },
          ],
        },
        {
          kick: 'Proof',
          links: [
            { t: 'One client, one year', s: 'A year with Ambition Mechanical, Phoenix.', href: '#proof' },
          ],
        },
      ],
    },
  ],
  flat: [{ label: 'The math', href: '#math' }],
};
