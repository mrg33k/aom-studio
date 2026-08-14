// R38 homepage content — V6.1 LOCKED copy (2026-08-13), console tokens.
// Voice law: positive, light, spelled-out plain talk. One flowing thought per
// sentence. Money appears exactly once (THE MATH). Numbers live beside the
// client's name only. CTA is "Tell us what you need" — "brief" is retired.

export const T = {
  paper: '#F5F3EE',
  paperSoft: '#EDE9E1',
  carbon: '#0A0A08',
  orange: '#F04404',
  orangeLabel: '#C43800',
};

export const HERO = {
  eyebrow: 'Phoenix, Arizona — One department, one fee',
  // Hand-placed lines; the last line renders in the italic body register.
  h1Lines: ["We're the marketing", 'department for companies'],
  h1Emphasis: "that don't have one.",
  sub: "We run the marketing for companies that don't have a marketing department. Plan, film, build, run, answer — month after month, out of Phoenix.",
  cta: 'Tell us what you need',
  ctaSub: 'See the work',
};

export const DEPT = {
  kick: 'The department',
  open: "You've got a company to run. We handle the marketing.",
  para: "We plan it, we film it, we build it, and we run it. We're out on your jobs through the month, we keep the website current, we run the ads, and we answer the reviews. At the end of the month you see all of it on one page.",
  modules: [
    { label: 'The plan',    body: 'Every 90 days we write out where this is going, on paper you can read. Then we meet every week or every other week — whatever works for you.' },
    { label: 'The filming', body: 'We come film your jobs — photos, drone, and a plan for a good video. Whatever hour the work happens.' },
    { label: 'The website', body: 'We build it and keep it current, and you can be as much a part of the process as you want.' },
    { label: 'The ads',     body: 'We set them up and run them week by week. The account is yours and you pay Google directly.' },
    { label: 'The reviews', body: 'When one comes in, we write back the way you would.' },
  ],
};

export const NINETY = {
  kick: 'The first 90 days',
  body: "The first few weeks, we're setting things up and making everything look right. By the end of the first month, you start hearing about it — from customers, from the office, from people around town. From there, it's all wheels rolling and we get tactical.",
};

export const MONTH = {
  kick: 'A month with us',
  tail: "Then we do it again. That's what a department is.",
  body: "Everything goes live as it's ready, and at the end of the month you get one page with the numbers on it.",
  weeks: [
    { wk: 'Week 1', what: 'Plan.' },
    { wk: 'Week 2', what: 'Shoot.' },
    { wk: 'Week 3', what: 'Build and launch.' },
    { wk: 'Week 4', what: 'Run and report.' },
  ],
};

export const FILMS = {
  kick: 'Filmed by us',
  h2: 'Shot on our clients’ jobs.',
  items: [
    {
      reel: '698a58aefc23d3d76fa7cdd6',
      label: 'Ambition Mechanical — Phoenix',
      title: 'On the roof for an emergency hospital install.',
    },
    {
      reel: '698a5e91873071aec5c9fc36',
      label: 'Tree Guardian USA — Documentary',
      title: 'A company story, told long-form.',
    },
  ],
};

export const WORK = {
  kick: 'The work',
  h2: 'Every industry. A soft spot for construction.',
  lede: "Here's the work, sorted by what we made. We do this for everyone — construction just has our heart.",
};

export const ALACARTE = {
  kick: 'Just need one thing?',
  body: "Not everybody needs the whole department. If you want a crew for a day, a website, or somebody to run your ads — we do that too.",
  link: 'See what that looks like',
};

export const MATH = {
  kick: 'The math, in the open',
  h2: 'What it would cost you to do this yourself.',
  body: "If you hired all of this yourself — a videographer, someone on the website, someone running the ads — it comes out around $12,000 a month. We're $3,000. There's no contract, and everything we make is yours to keep: the plan, the photos, the site, the ad account.",
  punch: 'One month in-house buys four months of us.',
};

export const PROOF = {
  kick: 'One client, one year',
  label: 'Ambition Mechanical — Phoenix',
  body: 'Ambition Mechanical in Phoenix has been with us a year. 46 shoots, 399 photos — and after a few months, the phone started ringing. You’re welcome to ask them.',
  aside: 'You can call the same person you started with, any time. They’ll answer, or they’ll call you back.',
};

export const CLOSING = {
  h2: 'Ready when you are.',
  cta: 'Tell us what you need',
  footnote: 'Looking for a video crew rather than a marketing department? Say so and tell us what you need.',
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
            { t: 'The website', s: 'Yours — your domain, your name.',    href: '#work' },
          ],
        },
        {
          kick: 'And the rest',
          links: [
            { t: 'The ads',     s: 'Paid at cost, in your account.',     href: '#math' },
            { t: 'The reviews', s: 'Answered in your voice.',            href: '#proof' },
            { t: 'A crew for a day', s: 'Filmed, edited, back in two days.', href: '#one-thing' },
          ],
        },
      ],
    },
    {
      label: 'The work',
      cols: [
        {
          kick: 'See it',
          links: [
            { t: 'The reels',            s: 'Real jobs, real clients.',      href: '#work' },
            { t: 'Filmed by us',         s: 'Two films worth your minute.',  href: '#films' },
          ],
        },
        {
          kick: 'Proof',
          links: [
            { t: 'One client, one year', s: 'Ambition Mechanical, Phoenix.', href: '#proof' },
          ],
        },
      ],
    },
  ],
  flat: [{ label: 'The math', href: '#math' }],
};
