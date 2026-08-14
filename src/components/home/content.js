// Shared content for the 3 Superside-shaped homepage variants

export const REEL_IDS = [
  '698a6296fc23d3d76fa8d992', // Journey To Gary Vee
  '698a5b86fc23d3d76fa82ece', // Noble Real Estate
  '698a6106aec3d4e420c2fd85', // Rainbow Rider
  '698a5d24aec3d4e420c2a0a0', // Pretty Penny
  '698a5ef5fc23d3d76fa87ef4', // Virtu Hospitality
  '698a64e5873071aec5ca99ac', // AZ Arts Foundation
  '698a63e5aec3d4e420c34783', // Cynshine Pilates
  '698a6127873071aec5ca3b36', // ASU:Peoria Forward
  '698a6177873071aec5ca4374', // Keep it Cut
  '698a5fcdfc23d3d76fa893b8', // United Food Bank
];

// Hero deck — vertical 9:16 social reels from the AOM portfolio.
// Vertical aspect fills the tall hero cards naturally (no horizontal cropping).
export const HERO_DECK = [
  { id: '698a596eaec3d4e420c22a9a', client: 'Lagos White Party',   tag: 'Event promo' },
  { id: '698a5946873071aec5c96163', client: 'Lagos Recap',         tag: 'Highlight' },
  { id: '698a5a8b873071aec5c99c6f', client: 'Nook 10 Year',        tag: 'Creative' },
  { id: '698a5391fc23d3d76fa7306c', client: "PA'LA x HARUMI",      tag: 'Collab feature' },
  { id: '698a53bcfc23d3d76fa736e4', client: 'Cook & Craft',        tag: 'Food feature' },
  { id: '698a5c0afc23d3d76fa83ba6', client: 'Killer Whale Club',   tag: 'Nightlife' },
  { id: '698a580bfc23d3d76fa7bd7c', client: "Tiffany's",           tag: 'Walkthrough' },
  { id: '698a581daec3d4e420c20b94', client: 'Primrose Ambition',   tag: 'Build update' },
  { id: '698a5a7d873071aec5c99b08', client: 'NGOTS Restoration',   tag: 'Service' },
  { id: '698a5391873071aec5c8b654', client: 'IAAPA Day 2',         tag: 'Event recap' },
];

export const CLIENT_LOGOS = [
  'Ambition Mechanical', 'ISA Energy', 'Skylar', 'Brandon Wiley',
  'Kohrs', 'Pala', 'S3C', 'Space Rising',
];

// RECENT_WORK: real projects active in the last ~30 days. Each entry pairs the
// client with what we shipped, so the trust strip reads as proof of motion,
// not a vanity logo wall.
export const RECENT_WORK = [
  { client: 'Skylar',              tag: 'Music video edit',  when: 'This week' },
  { client: "PA'LA",               tag: 'Content campaign',  when: 'This week' },
  { client: 'Ambition Mechanical', tag: 'Brand film',        when: 'This week' },
  { client: 'ISA Energy',          tag: 'Brand film',        when: 'This week' },
  { client: 'Kohrs',               tag: 'Content retainer',  when: 'Last week' },
  { client: 'Brandon Wiley',       tag: 'Documentary',       when: 'Last week' },
  { client: 'Space Rising',        tag: 'Platform + brand',  when: 'Last week' },
  { client: 'Valor to Victory',    tag: 'Brand identity',    when: 'Last week' },
  { client: 'S3C',                 tag: 'Brand + platform',  when: 'This month' },
  { client: 'Sourcing Directory',  tag: 'Platform build',    when: 'This month' },
  { client: 'Included Health',     tag: 'Event film',        when: 'This month' },
  { client: 'Intelliplay',         tag: 'Media retainer',    when: 'This month' },
];

export const FEATURE_CARDS = [
  {
    eyebrow: 'Online',
    title: 'Hire us online.',
    body: 'Send us a few files and a sentence about what you need. We reply within 24 hours. You get a rough draft in 48 to 72 hours.',
  },
  {
    eyebrow: 'In person',
    title: 'Hire us in person.',
    body: "Come visit or have us come to you. We plan it together, shoot or design it, and you leave with a real deliverable.",
  },
];

// HOW_IT_WORKS: Two paths to hire AOM, broken down step by step.
// Designed to be read by someone who has never hired a media team.
export const HOW_IT_WORKS = [
  {
    eyebrow: 'Online',
    title: 'Hire us online.',
    summary: 'Start with a sentence. Send what you have. We may hop on a quick Zoom if it helps us scope it right.',
    icon: 'upload',
    steps: [
      { n: 1, label: 'Tell us what you need', body: 'A sentence is fine. "Make me a 30 second ad." "Fix the homepage." "Build me a brand." A short Zoom call works too if there is a lot to gather.' },
      { n: 2, label: 'Send us your files', body: 'Photos, raw footage, an old website, a logo file. Whatever you already have we will use.' },
      { n: 3, label: "We reply in 24 hours", body: 'A real person. With a price, a timeline, and any questions left open.' },
      { n: 4, label: 'Rough draft in 48 to 72 hours', body: 'You see the work fast. Then we polish until you love it.' },
    ],
  },
  {
    eyebrow: 'In person',
    title: 'Hire us in person.',
    summary: 'Want to shake hands first? Walk in or call us in.',
    icon: 'handshake',
    steps: [
      { n: 1, label: 'Book a visit', body: 'Come to our space or we come to yours. Coffee on us.' },
      { n: 2, label: 'Plan it together', body: 'We figure out the story, the look, and the timeline in one sitting.' },
      { n: 3, label: 'We shoot or design it', body: 'Cameras, designers, writers. Whatever the job needs.' },
      { n: 4, label: 'You leave with the work', body: 'Same week, most of the time. Edits handled remotely after.' },
    ],
  },
];

export const STATS = [
  { value: '24h',  label: 'Reply window' },
  { value: '48h',  label: 'First draft, most jobs' },
  { value: '50+',  label: 'Brands shipped' },
  { value: '10+',  label: 'Years doing this' },
];

// WHAT_WE_MAKE: a Superside-shape grid of services. Each card is image-dominant
// with a small label. The image is pulled from a real piece in our portfolio
// (still poster from a Gumlet reel OR a project asset we already have). Cards
// are square-ish and arranged in a 2-col responsive grid above the Articles
// timeline.
//
// `reel` = pull the live video poster from Gumlet (autoplay muted on hover).
// `image` = use a static image from /public.
// Provide one or the other.
export const WHAT_WE_MAKE = [
  {
    eyebrow: 'Brand',
    title: 'Brand identity',
    body: 'A name, logo, voice, and visual system for your company. Built to last past one campaign.',
    href: '/services/brand-identity',
    image: '/projects/s3c.jpg',
  },
  {
    eyebrow: 'Film',
    title: 'Brand film',
    body: 'A two to three minute film for your homepage, pitches, and events. Filmed in a day or two.',
    href: '/services/brand-film',
    reel: '698a68b7fc23d3d76fa970ef',
  },
  {
    eyebrow: 'Film',
    title: 'Documentary',
    body: 'A long-form documentary about a founder, a project, or a company. Three to fifteen minutes.',
    href: '/services/documentary',
    reel: '698a5e91873071aec5c9fc36',
  },
  {
    eyebrow: 'Web',
    title: 'Homepage rebuild',
    body: 'A new homepage that loads fast, says one thing, and is built around what your buyer needs first.',
    href: '/services/homepage-rebuild',
    image: '/projects/ambition.jpg',
  },
  {
    eyebrow: 'Web',
    title: 'Custom web platform',
    body: 'A directory, marketplace, member portal, or product surface. Multi-tenant when you need it.',
    href: '/services/web-platform',
    image: '/projects/corner.jpg',
  },
  {
    eyebrow: 'Content',
    title: 'Content campaign',
    body: 'A run of short videos for social, ads, and the homepage. Filmed across one or two production days.',
    href: '/services/content-campaign',
    reel: '698a5391fc23d3d76fa7306c',
  },
  {
    eyebrow: 'Film',
    title: 'Product video',
    body: 'A video that explains what your product does in two minutes or less. Animated, live action, or both.',
    href: '/services/product-video',
    reel: '698a5aa5aec3d4e420c263c4',
  },
  {
    eyebrow: 'Marketing',
    title: 'Google Ads',
    body: 'Paid media for service businesses. Service-area targeting, call tracking, copy that earns the right calls.',
    href: '/services/google-ads',
    image: '/projects/ambition-performance.jpg',
  },
  {
    eyebrow: 'Film',
    title: 'Event film',
    body: 'An event recap or short sizzle. Filmed at the event, cut afterward, used for next-year recruiting.',
    href: '/services/event-film',
    reel: '698a5b05873071aec5c9a7cd',
  },
  {
    eyebrow: 'Editorial',
    title: 'Photography & look book',
    body: 'Photography, copy, and a publishable book of your brand. For companies that want to feel like a magazine.',
    href: '/services/editorial',
    image: '/projects/space-rising.jpg',
  },
];

export const SERVICES = [
  { group: 'Brand',  items: ['Brand identity', 'Voice & messaging', 'Brand guidelines', 'Naming'] },
  { group: 'Motion', items: ['Brand film', 'Documentary cut', 'Motion design', 'Editorial cut'] },
  { group: 'Web',    items: ['Homepage rebuild', 'Custom build', 'Campaign sites', 'Product surfaces'] },
  { group: 'Story',  items: ['Strategy', 'Story direction', 'Content engine', 'Ongoing retainer'] },
];

// ARTICLES: portfolio-as-article. Each entry is a real reel on the site, audited
// by Gemini Vision. Headlines describe what the project actually is. Tone is plain,
// not clever. Visitor self-identifies through the `forAudience` line.
//
// `forAudience` says who this kind of project is good for, in normal language.
// `type` drives the chip filter (website | brand | video).
// `aspect` drives the Rail media frame (horizontal | vertical).
export const ARTICLES = [
  // ─── Apr 2026 ───
  {
    slug: 'ambition-google-ads',
    publishedAt: '2026-04-25', month: 'Apr 2026', readTime: '6 min',
    type: 'brand', industry: 'HVAC & trades', discipline: 'Google Ads',
    headline: 'Running Google Ads for an HVAC company.',
    dek: 'We run paid search for Ambition Mechanical Services. Service-area targeting, call tracking, and ad copy built for the kinds of jobs they want more of, not just any click.',
    forAudience: 'Good for trades and service businesses that need real calls coming in for the right work, not vanity traffic.',
    aspect: 'horizontal', client: 'Ambition Mechanical',
    image: '/projects/ambition-performance.jpg',
    keywords: ['hvac google ads', 'paid search for trades', 'service business marketing'],
  },
  {
    slug: 'corner-creative-platform',
    publishedAt: '2026-04-20', month: 'Apr 2026', readTime: '7 min',
    type: 'website', industry: 'Internal product', discipline: 'Platform · In dev',
    headline: 'Building a creative platform for in-house teams.',
    dek: 'Corner is what we are building for in-house creative teams and small agencies. Brief, review, hand off, and ship in one place. Currently in private development.',
    forAudience: 'Good for in-house creative teams and small agencies that have outgrown email threads and a stack of single-purpose tools.',
    aspect: 'horizontal', client: 'Corner (Ahead of Market)',
    image: '/projects/corner.jpg',
    keywords: ['creative ops platform', 'in-house creative software', 'agency project management'],
  },
  {
    slug: 'ambition-abrazo-hvac-emergency',
    publishedAt: '2026-04-18', month: 'Apr 2026', readTime: '4 min',
    type: 'video', industry: 'HVAC & trades', discipline: 'Brand film',
    headline: 'Filmed an HVAC crew during an emergency hospital install.',
    dek: 'A 35-second brand film for Ambition Mechanical Services. We were on the roof while the crew swapped a 75-ton chiller at the hospital, so we kept the camera rolling. No staging.',
    forAudience: 'Good for trades and service businesses where the work itself is what people want to see.',
    reel: '698a58aefc23d3d76fa7cdd6', aspect: 'horizontal', client: 'Ambition Mechanical',
    keywords: ['hvac brand film', 'trades content marketing', 'industrial service video'],
  },
  {
    slug: 'isa-energy-brand-bible',
    publishedAt: '2026-04-12', month: 'Apr 2026', readTime: '6 min',
    type: 'brand', industry: 'Deep tech & energy', discipline: 'Brand bible',
    headline: 'Built a brand bible for a quantum energy startup.',
    dek: 'ISA Energy is building category-defining tech. We made the brand identity, the visual language, and the bible the team works from. The brand film is currently in post.',
    forAudience: 'Good for deep-tech and category-defining startups that need a brand investors and partners take seriously before the product is widely understood.',
    aspect: 'horizontal', client: 'ISA Energy',
    image: '/images/isa-energy/beat-2-2.png',
    keywords: ['startup brand identity', 'deep tech branding', 'investor positioning'],
  },
  {
    slug: 'to-have-and-to-host-founder-film',
    publishedAt: '2026-04-08', month: 'Apr 2026', readTime: '4 min',
    type: 'video', industry: 'Hospitality & events', discipline: 'Brand film',
    headline: 'Filmed a hospitality founder hosting her own dinner party.',
    dek: 'A 49-second brand film for To Have and to Host. Editorial pacing, hand-held, no script. The founder shows up halfway through, after the room sells the company.',
    forAudience: 'Good for founder-led service brands and event companies that want a brand video without a sit-down interview.',
    reel: '698a68b7fc23d3d76fa970ef', aspect: 'horizontal', client: 'To Have and to Host',
    keywords: ['founder brand film', 'event company marketing', 'lifestyle brand video'],
  },
  {
    slug: 'pala-harumi-collab',
    publishedAt: '2026-04-02', month: 'Apr 2026', readTime: '3 min',
    type: 'video', industry: 'Restaurants', discipline: 'Social cut',
    headline: 'Cut a 28-second collab for two Phoenix restaurants.',
    dek: "A vertical piece for the Pa'la x Harumi pop-up. Made for Instagram and TikTok, the version regulars wanted to share.",
    forAudience: 'Good for restaurants doing collab nights and special events where social needs to do real work.',
    reel: '698a5391fc23d3d76fa7306c', aspect: 'vertical', client: "PA'LA x Harumi",
    keywords: ['restaurant collab video', 'pop up dinner film', 'restaurant social cut'],
  },
  // ─── Mar 2026 ───
  {
    slug: 'ernie-stevens-tribute',
    publishedAt: '2026-03-22', month: 'Mar 2026', readTime: '5 min',
    type: 'video', industry: 'Tribal & nonprofit', discipline: 'Tribute film',
    headline: 'Made a tribute film for a Native American leader.',
    dek: 'A 2-minute piece honoring Ernie Stevens Jr., a longtime advocate for tribal sovereignty. Shot in a single day, made for council, family, and the next generation.',
    forAudience: 'Good for tribal nations and nonprofits with leaders or elders whose stories have not been recorded yet.',
    reel: '698a5a6cfc23d3d76fa812a7', aspect: 'horizontal', client: 'NABI Nation',
    keywords: ['nonprofit tribute video', 'tribal storytelling', 'leadership documentary'],
  },
  {
    slug: 's3c-coalition-brand-and-platform',
    publishedAt: '2026-03-18', month: 'Mar 2026', readTime: '6 min',
    type: 'brand', industry: 'B2B & trade coalitions', discipline: 'Brand + Platform',
    headline: 'Branded a trade coalition and built their member platform.',
    dek: "S3C is the Semiconductor Services and Supply Coalition for Arizona shops working with Intel and TSMC. We made the brand identity and built the member platform on the sourcing directory architecture.",
    forAudience: 'Good for industry associations, trade coalitions, and B2B membership groups that need a real brand and a place for members to live.',
    aspect: 'horizontal', client: 'S3C',
    image: '/projects/s3c.jpg',
    keywords: ['trade coalition branding', 'b2b membership platform', 'industry association marketing'],
  },
  {
    slug: 'space-rising-launch-site',
    publishedAt: '2026-03-14', month: 'Mar 2026', readTime: '5 min',
    type: 'website', industry: 'Industry platforms', discipline: 'Brand + Launch site',
    headline: 'Branded a space-industry congress and shipped the launch site.',
    dek: 'Space Rising is a coordination platform for the space industry. Built on the sourcing-directory architecture and live for the Phoenix Space Rising Congress.',
    forAudience: 'Good for industry events, sector platforms, and any organization launching a website tied to a real-world event date.',
    aspect: 'horizontal', client: 'Space Rising',
    image: '/projects/space-rising.jpg',
    keywords: ['industry event platform', 'launch site for events', 'sector platform design'],
  },
  {
    slug: 'az-arts-foundation-brand-film',
    publishedAt: '2026-03-12', month: 'Mar 2026', readTime: '4 min',
    type: 'video', industry: 'Arts & culture', discipline: 'Brand film',
    headline: 'Made a brand film for a 50-year arts foundation.',
    dek: 'A 2-minute brand piece for Arizona Citizens for the Arts. We pulled it from existing event coverage and a single interview day. No talking heads in the cut.',
    forAudience: 'Good for arts organizations and cultural nonprofits with decades of programming and a board that wants something funders will sit through.',
    reel: '698a64e5873071aec5ca99ac', aspect: 'horizontal', client: 'Arizona Citizens for the Arts',
    keywords: ['arts nonprofit video', 'foundation brand film', 'cultural organization marketing'],
  },
  {
    slug: 'sourcing-directory-platform',
    publishedAt: '2026-03-08', month: 'Mar 2026', readTime: '6 min',
    type: 'website', industry: 'B2B platform', discipline: 'Platform build',
    headline: 'Built a multi-tenant directory for industrial buyers.',
    dek: 'Sourcing Directory is a B2B marketplace for procurement. Member auth, search, jobs, articles and admin built so multiple trade groups and coalitions can run on the same architecture.',
    forAudience: 'Good for trade groups, industry coalitions, and procurement organizations that need a directory their members actually use.',
    aspect: 'horizontal', client: 'Sourcing Directory',
    image: '/projects/brands-hub.jpg',
    keywords: ['b2b directory platform', 'multi-tenant directory', 'industrial marketplace site'],
  },
  {
    slug: 'startupaz-founders-retreat',
    publishedAt: '2026-03-04', month: 'Mar 2026', readTime: '5 min',
    type: 'video', industry: 'Founder communities', discipline: 'Event film',
    headline: 'Cut a recap film for a Phoenix founders retreat.',
    dek: 'A 3-minute piece for the StartupAZ Collective Retreat. Founder interviews, panel coverage, room shots from the days at NAU. Used to recruit the next year.',
    forAudience: 'Good for founder communities, accelerators, and startup organizations covering their own events for next-year recruiting.',
    reel: '698a5b05873071aec5c9a7cd', aspect: 'horizontal', client: 'StartupAZ Collective',
    keywords: ['founder retreat video', 'startup event film', 'community recruiting'],
  },
  // ─── Feb 2026 ───
  {
    slug: 'tree-guardian-disaster-recovery',
    publishedAt: '2026-02-24', month: 'Feb 2026', readTime: '6 min',
    type: 'video', industry: 'Service & B2B', discipline: 'Documentary',
    headline: 'Followed a disaster recovery crew through a real recovery.',
    dek: 'A 3-minute documentary for Tree Guardian USA. We filmed during actual recovery work with cranes, wind damage and calls coming in. Cut for the homepage and the sales team.',
    forAudience: 'Good for service businesses where buyers want to see how you handle the hard days, not just the easy ones.',
    reel: '698a5e91873071aec5c9fc36', aspect: 'horizontal', client: 'Tree Guardian USA',
    keywords: ['service business video', 'b2b documentary', 'emergency response marketing'],
  },
  {
    slug: 'rainbow-ryders-experience-film',
    publishedAt: '2026-02-12', month: 'Feb 2026', readTime: '3 min',
    type: 'video', industry: 'Tourism & experience', discipline: 'Brand film',
    headline: 'Filmed a sunrise hot air balloon ride.',
    dek: 'A 60-second brand film for Rainbow Ryders. We shot a sunrise lift and cut it for paid social and the homepage hero.',
    forAudience: 'Good for tourism and experience operators where the product is something people feel, not something you describe in writing.',
    reel: '698a6106aec3d4e420c2fd85', aspect: 'horizontal', client: 'Rainbow Ryders',
    keywords: ['tourism brand video', 'experience marketing', 'hospitality film'],
  },
  {
    slug: 'az-cleantech-sector-narrative',
    publishedAt: '2026-02-04', month: 'Feb 2026', readTime: '5 min',
    type: 'video', industry: 'Industry advocacy', discipline: 'Sector film',
    headline: 'Made a sector film about Arizona cleantech.',
    dek: 'A 1:47 piece for the AZ Cleantech Meetup. We interviewed organizers and founders at the event. Cut as a story about the sector, not just an event recap.',
    forAudience: 'Good for industry advocacy groups and sector communities who want a film that means something past a single event.',
    reel: '698a57da873071aec5c93fa0', aspect: 'horizontal', client: 'AZ Cleantech',
    keywords: ['cleantech video', 'industry advocacy film', 'sector narrative'],
  },
  // ─── Jan 2026 ───
  {
    slug: 'reelay-saas-explainer',
    publishedAt: '2026-01-22', month: 'Jan 2026', readTime: '4 min',
    type: 'video', industry: 'SaaS & software', discipline: 'Explainer',
    headline: 'Wrote and animated a meeting platform explainer.',
    dek: 'A 2-minute animated explainer for Reelay. Two minutes, three core features, and a clear call to action at the end.',
    forAudience: 'Good for SaaS and B2B software teams that need an explainer that lands what the product does before the demo CTA.',
    reel: '698a5aa5aec3d4e420c263c4', aspect: 'horizontal', client: 'Reelay',
    keywords: ['saas explainer video', 'b2b software marketing', 'product story video'],
  },
  {
    slug: 'virtu-hospitality-sizzle',
    publishedAt: '2026-01-14', month: 'Jan 2026', readTime: '3 min',
    type: 'video', industry: 'Restaurants', discipline: 'Hospitality film',
    headline: 'Cut a 45-second sizzle for a Scottsdale restaurant.',
    dek: 'A hospitality piece for virtù Honest Craft. Knife work, plates, the bar, the room. No host, no menu narration.',
    forAudience: 'Good for restaurants and chef-led concepts where the food and the room are the story.',
    reel: '698a5ef5fc23d3d76fa87ef4', aspect: 'horizontal', client: 'virtù Honest Craft',
    keywords: ['restaurant brand video', 'hospitality film', 'chef driven marketing'],
  },
  {
    slug: 'n2-news-the-local',
    publishedAt: '2026-01-06', month: 'Jan 2026', readTime: '5 min',
    type: 'video', industry: 'Media & streaming', discipline: 'Explainer',
    headline: 'Made an explainer for a local streaming platform.',
    dek: 'A 3-minute piece introducing The Local, a streaming product from N2 News. Animated, narrated, built to land what it is for press and partners.',
    forAudience: 'Good for media companies and streaming platforms launching something new that needs explaining.',
    reel: '698a5b26aec3d4e420c27039', aspect: 'horizontal', client: 'N2 News',
    keywords: ['streaming platform explainer', 'media product video', 'launch explainer'],
  },
  // ─── Dec 2025 ───
  {
    slug: 'united-food-bank-brand-film',
    publishedAt: '2025-12-15', month: 'Dec 2025', readTime: '5 min',
    type: 'video', industry: 'Mission nonprofits', discipline: 'Brand film',
    headline: 'Made a brand film for a food bank.',
    dek: 'A 3-minute piece for United Food Bank. We talked to volunteers and families on the line across two service days. Used for year-end fundraising.',
    forAudience: 'Good for food banks, mission nonprofits, and donor-driven organizations that want a film for year-end fundraising.',
    reel: '698a5fcdfc23d3d76fa893b8', aspect: 'horizontal', client: 'United Food Bank',
    keywords: ['nonprofit brand video', 'food bank marketing', 'fundraising film'],
  },
  {
    slug: 'noble-real-estate-event',
    publishedAt: '2025-12-08', month: 'Dec 2025', readTime: '4 min',
    type: 'video', industry: 'Real estate', discipline: 'Event film',
    headline: 'Cut an event film for a real estate brokerage.',
    dek: 'A 3-minute piece for The Noble Agency. We covered their internal event with realtors and advisors. Used as the centerpiece of their next-quarter recruiting.',
    forAudience: 'Good for real estate brokerages and professional services groups recruiting talent.',
    reel: '698a5b86fc23d3d76fa82ece', aspect: 'horizontal', client: 'The Noble Agency',
    keywords: ['real estate brokerage video', 'agency recruiting film', 'professional services marketing'],
  },
  {
    slug: 'asu-peoria-forward',
    publishedAt: '2025-12-02', month: 'Dec 2025', readTime: '5 min',
    type: 'video', industry: 'Education & civic', discipline: 'Program film',
    headline: 'Made a program film for a university and city partnership.',
    dek: 'A 3-minute piece for the Peoria Forward program at ASU. Interviews with founders in the program, footage from the space, and the city perspective.',
    forAudience: 'Good for universities, civic partnerships, and economic development groups telling the story of a program.',
    reel: '698a6127873071aec5ca3b36', aspect: 'horizontal', client: 'ASU Peoria Forward',
    keywords: ['university video', 'civic partnership film', 'economic development marketing'],
  },
  // ─── Nov 2025 ───
  {
    slug: 'yas-gary-vee-documentary',
    publishedAt: '2025-11-22', month: 'Nov 2025', readTime: '6 min',
    type: 'video', industry: 'Founders & personal brand', discipline: 'Documentary',
    headline: 'Filmed a founder pitching Gary Vaynerchuk.',
    dek: 'A 3-minute documentary for Daniel Fessler at Young Artist Society. We followed him from Phoenix to NYC, into the VaynerX office, through the meeting, and out.',
    forAudience: 'Good for founders and personal brands who need a film that shows the journey and the result.',
    reel: '698a6296fc23d3d76fa8d992', aspect: 'horizontal', client: 'Young Artist Society',
    keywords: ['founder documentary', 'personal brand film', 'nonprofit storytelling'],
  },
  {
    slug: 'intelliplay-product-story',
    publishedAt: '2025-11-12', month: 'Nov 2025', readTime: '4 min',
    type: 'video', industry: 'Hardware & attractions', discipline: 'Product video',
    headline: 'Made a product video for a smart band platform.',
    dek: 'A 68-second piece for Intelliplay. We showed the band on kids, the parent dashboard, and the operator side. Cut for the website and trade-show booth.',
    forAudience: 'Good for hardware companies and attractions tech that need a product video showing what it is and what it does.',
    reel: '698a5386aec3d4e420c17a69', aspect: 'horizontal', client: 'Intelliplay',
    keywords: ['hardware product video', 'attractions tech marketing', 'product story film'],
  },
  {
    slug: 'cynshine-pilates-founder-film',
    publishedAt: '2025-11-04', month: 'Nov 2025', readTime: '3 min',
    type: 'video', industry: 'Wellness & studios', discipline: 'Brand film',
    headline: 'Filmed a pilates studio with its founder and members.',
    dek: 'A 76-second brand film for CynShine. The founder, the method, the studio, and her members. Real teaching, no voiceover.',
    forAudience: 'Good for studios and wellness brands where the founder is what people are buying into.',
    reel: '698a63e5aec3d4e420c34783', aspect: 'horizontal', client: 'CynShine Pilates',
    keywords: ['wellness brand video', 'pilates studio film', 'founder service video'],
  },
  // ─── Oct 2025 ───
  {
    slug: 'keep-it-cut-recruiting',
    publishedAt: '2025-10-22', month: 'Oct 2025', readTime: '4 min',
    type: 'video', industry: 'Small business & retail', discipline: 'Brand film',
    headline: 'Cut a recruiting film for a barbershop chain.',
    dek: 'A 2:32 piece for Keep It Cut. Stylists from multiple shops on what they like about the work. Used for recruiting and the careers page.',
    forAudience: 'Good for small businesses with multiple locations recruiting talent, especially personal-service brands.',
    reel: '698a6177873071aec5ca4374', aspect: 'horizontal', client: 'Keep It Cut',
    keywords: ['small business video', 'recruiting film', 'barbershop marketing'],
  },
];

// CUSTOMER_STORIES: a few projects in detail. Each entry's `reel` is the
// actual video on screen — verified against the Gemini audit.
export const CUSTOMER_STORIES = [
  {
    client: 'Ambition Mechanical',
    eyebrow: 'Project · HVAC',
    title: 'A short brand video for an HVAC company.',
    body: 'A 35-second piece for Ambition Mechanical Services. We filmed during an emergency hospital install while the crew swapped a 75-ton chiller on the roof.',
    reel: '698a58aefc23d3d76fa7cdd6',
    tags: ['Brand film', 'Trades'],
    duration: '2 weeks',
  },
  {
    client: 'To Have and to Host',
    eyebrow: 'Project · Hospitality',
    title: 'A brand film for a hospitality founder.',
    body: 'A 49-second piece for To Have and to Host. We filmed an actual dinner party at her place and built the video around it.',
    reel: '698a68b7fc23d3d76fa970ef',
    tags: ['Brand film', 'Founder'],
    duration: '4 weeks',
  },
  {
    client: 'Arizona Citizens for the Arts',
    eyebrow: 'Project · Nonprofit',
    title: 'A brand film for a 50-year arts foundation.',
    body: 'A 2-minute piece for Arizona Citizens for the Arts. We pulled it from existing event coverage and a single interview day.',
    reel: '698a64e5873071aec5ca99ac',
    tags: ['Brand film', 'Nonprofit'],
    duration: '5 weeks',
  },
  {
    client: 'Tree Guardian USA',
    eyebrow: 'Project · Service business',
    title: 'A documentary for a disaster recovery company.',
    body: 'A 3-minute piece for Tree Guardian USA. We filmed during actual recovery work with cranes, wind damage and calls coming in.',
    reel: '698a5e91873071aec5c9fc36',
    tags: ['Documentary', 'B2B'],
    duration: '6 weeks',
  },
];

// Tag = what the audit confirmed is actually on screen, not a marketing label.
export const CASE_TILES = [
  { client: 'Young Artist Society', tag: 'Documentary',        reel: '698a6296fc23d3d76fa8d992' },
  { client: 'The Noble Agency',     tag: 'Brokerage event',    reel: '698a5b86fc23d3d76fa82ece' },
  { client: 'Pretty Penny',         tag: 'Restaurant film',    reel: '698a5d24aec3d4e420c2a0a0' },
  { client: 'CynShine Pilates',     tag: 'Brand film',         reel: '698a63e5aec3d4e420c34783' },
  { client: 'AZ Citizens for Arts', tag: 'Brand film',         reel: '698a64e5873071aec5ca99ac' },
  { client: 'Keep It Cut',          tag: 'Brand film',         reel: '698a6177873071aec5ca4374' },
];

export const COMPARISON = {
  cols: ['AOM', 'In-house team', 'Generic agency', 'Freelancers'],
  rows: [
    { label: 'Speed',       cells: ['Days, not months', 'Constrained by capacity', 'Account-managed slow', 'Depends on the freelancer'] },
    { label: 'Quality',     cells: ['Senior-level',     'Variable',                 'Account-team-led',       'Variable'] },
    { label: 'Story craft', cells: ['Built in',         'Strategy gap',             'Outsourced',             'Per-deliverable'] },
    { label: 'Online + in person', cells: ['Both',      'In person only',           'In person only',         'Online only'] },
    { label: 'Always-on retainer', cells: ['Yes',       'Yes (you employ them)',     'High overhead',          'No'] },
  ],
};

export const TESTIMONIALS = [
  { quote: "AOM didn't just shoot a film, they figured out our story and shipped it.", author: 'Patrick · Ambition Mechanical', role: 'Owner' },
  { quote: 'They moved twice as fast as the agency we were quoted by, for half the budget.', author: 'Brandon · BW Group', role: 'Founder' },
  { quote: "It felt like a creative team that was already on staff. They got us instantly.", author: 'Skylar Founder', role: 'Founder' },
  { quote: "We sent files on a Tuesday. Had a rough cut by Thursday. That's never happened to us before.", author: 'ISA Energy', role: 'Marketing' },
  { quote: "If you can write a brief, they can ship a brand. We have receipts.", author: 'Kohrs', role: 'Owner' },
  { quote: 'Editorial-grade thinking applied to a contractor. We didn\'t know that was possible.', author: 'Construction client', role: 'Owner' },
];

export const PLATFORM_FEATURES = [
  {
    title: 'A creative command center.',
    body: 'Brief, review, and approve from one place. No long email threads. No lost feedback.',
  },
  {
    title: 'Built-in brand intelligence.',
 body: 'Your brand lives in our system. Every deliverable comes back consistent, no drift.',
  },
  {
    title: 'Workflow that keeps up.',
    body: 'Subscription, project, or walk-in days. Flex up and down without renegotiating.',
  },
  {
    title: 'Real humans, on the line.',
    body: 'A partner answers your message. Not a chatbot. Not a queue. A name.',
  },
];

export const PILLARS = [
 { title: 'Scalable', body: 'Three lanes, subscription, project, walk-in, used together or apart.' },
  { title: 'Flexible',  body: 'Swap services month to month. The retainer flexes with the season.' },
  { title: 'Responsive', body: 'Reply within 24 hours. Always. We hold ourselves to it.' },
 { title: 'Seamless', body: 'Brand, story, motion, web, one team, no handoffs.' },
];