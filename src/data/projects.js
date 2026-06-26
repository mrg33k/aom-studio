// Project / case-study records that power the /work/<slug> pages.
// Each published record renders through src/pages/ProjectPage.jsx and targets
// its own search keywords. Stories are Patrik's own, lightly expanded for SEO.
// draft:true = seeded for the rollout list + related links, not yet a live page.

export const PROJECTS = [
  // ---------------- CONSTRUCTION ----------------
  {
    slug: 'to-have-and-to-host',
    draft: false,
    title: 'To Have and To Host',
    client: 'Lori (private host)',
    category: 'Construction',
    icp: 'Home builders & hosts',
    location: 'Phoenix, Arizona',
    year: '2024',
    heroVideoId: '698a68b7fc23d3d76fa970ef',
    films: ['698a68b7fc23d3d76fa970ef'],
    tag: 'Luxury home build',
    lede: 'A dinner party thrown inside an unfinished house, filmed to prove a point: a great host does not wait for everything to be perfect.',
    sections: [
      {
        h: 'How it started',
        body: 'We were already on site filming Jay Hoven Construction build a custom home. Lori, the owner of the house, watched those construction videos, asked Jay who shot them, and called us. She had an idea most people would never try.',
      },
      {
        h: 'The idea',
        body: 'Lori wanted to host a full dinner party inside her own home while it was still a construction site. Bare studs, no finishes, just her hosting. Her bet was simple: if she could throw something beautiful in a bare-bones space, her friends would trust her with the bigger, more expensive parties later.',
      },
      {
        h: 'What we shot',
        body: 'We came in early, before the guests arrived, to catch the empty house and the light. We covered the evening as it actually happened, sat Lori down for a talking-heads interview, and flew drone over the build. We also grabbed the kind of frames a host can post for months.',
      },
      {
        h: 'Where it ran',
        body: 'Lori used the drone shots and clips across her social. The film became the foundation of her new website, and it put a local creative business in front of exactly the people she wanted to work with. One evening, filmed once, that keeps working for her.',
      },
    ],
    outcomes: [
      'Talking-heads interview film',
      'Aerial / drone coverage of the build',
      'Social-ready vertical clips',
      'The anchor video for the client website',
    ],
    pull: 'A referral became a film, and the film became the start of a brand.',
    related: ['memorial-towers', 'abrazo-healthcare', 'refined-gardens'],
    seoTitle: 'To Have and To Host | Luxury Home Build & Event Film | Ahead of Market',
    seoDesc: 'A Phoenix host threw a dinner party inside her unfinished custom home. We filmed the night. The video became the foundation of her brand. Construction and event storytelling by Ahead of Market.',
  },

  // Seeded for rollout (content drafts pending). Order = build priority.
  { slug: 'memorial-towers', draft: true, title: 'Memorial Towers', category: 'Construction', icp: 'Mechanical contractors', location: 'Phoenix, Arizona', heroVideoId: '698a584faec3d4e420c20fef', tag: 'Mechanical install', lede: 'Crane days, 4am time-lapses, and the full breadth of a major mechanical install for Ambition Mechanical.' },
  { slug: 'abrazo-healthcare', draft: true, title: 'Abrazo Healthcare', category: 'Construction', icp: 'Mechanical contractors', location: 'Phoenix, Arizona', heroVideoId: '698a58aefc23d3d76fa7cdd6', tag: 'Emergency job', lede: 'An emergency mechanical job at a major Phoenix medical campus, documented for recruiting, hiring, and LinkedIn.' },
  { slug: 'refined-gardens', draft: true, title: 'Refined Gardens', category: 'Construction', icp: 'Mechanical contractors', location: 'Phoenix, Arizona', heroVideoId: '698a57fb873071aec5c94350', tag: 'Multi-stage build', lede: 'An AC install documented from early stages to finish, cut for the website and for ads on LinkedIn and Instagram.' },
  { slug: 'tree-guardian', draft: true, title: 'Tree Guardian', category: 'Construction', icp: 'Field services', location: 'Florida (storm)', heroVideoId: '698a5e91873071aec5c9fc36', tag: 'Documentary', lede: 'Ten days following a tree-removal rescue fleet through a hurricane. Crashed drones, eight GoPros, ran out of snacks day one.' },
  { slug: 'az-cleantech', draft: true, title: 'AZ Cleantech', category: 'Construction', icp: 'Founders & community', location: 'Phoenix, Arizona', heroVideoId: '698a57da873071aec5c93fa0', tag: 'Community', lede: 'Telling the story of the founders driving a sustainable future for Arizona, from Cleantech into Silicon Oasis.' },

  // ---------------- BRANDS ----------------
  { slug: 'journey-to-gary-vee', draft: true, title: 'Journey to Gary Vee', category: 'Brands', icp: 'Nonprofits & founders', location: 'New York', heroVideoId: '698a6296fc23d3d76fa8d992', tag: 'Origin story', lede: 'Where it all started. A nonprofit founder pitches Gary Vaynerchuk in his office, filmed live. The reason we built an agency at all.' },
  { slug: 'virtu-hospitality', draft: true, title: 'Virtu Hospitality', category: 'Brands', icp: 'Restaurants & hospitality', location: 'Scottsdale, Arizona', heroVideoId: '698a5ef5fc23d3d76fa87ef4', tag: 'Hospitality', lede: 'How a brunch favor turned into being the official media team for a standout Scottsdale food and hospitality brand.' },
  { slug: 'noble-real-estate', draft: true, title: 'Noble Real Estate', category: 'Brands', icp: 'Agencies & teams', location: 'Phoenix, Arizona', heroVideoId: '698a5b86fc23d3d76fa82ece', tag: 'Team film', lede: 'The Noble Edit: capturing a real estate agency\'s yearly celebration for social, website, and email.' },
  { slug: 'pretty-penny', draft: true, title: 'Pretty Penny', category: 'Brands', icp: 'Restaurants & hospitality', location: 'Phoenix, Arizona', heroVideoId: '698a5d24aec3d4e420c2a0a0', tag: 'Restaurant', lede: 'Three years of content for a small, mighty restaurant on Roosevelt Row. Late-night shoots, the full menu, the whole team.' },
  { slug: 'aiper-phoenix-home-show', draft: true, title: 'Aiper at the Phoenix Home Show', category: 'Brands', icp: 'Consumer brands & events', location: 'Phoenix, Arizona', heroVideoId: '698a58ae873071aec5c953ea', tag: 'Trade show', lede: 'Overnight turnarounds, wide and vertical cuts, for one of the largest pool-cleaning brands in the world.' },
  { slug: 'united-food-bank', draft: true, title: 'United Food Bank', category: 'Brands', icp: 'Nonprofits', location: 'Phoenix, Arizona', heroVideoId: '698a5fcdfc23d3d76fa893b8', tag: 'Nonprofit', lede: 'A five-year media partnership: year-end films and community testimonials that drive fundraising.' },

  // ---------------- FOUNDERS ----------------
  { slug: 'abstrakt', draft: true, title: 'Abstrakt', category: 'Founders', icp: 'SaaS & startups', location: 'Phoenix, Arizona', heroVideoId: '698a5faffc23d3d76fa8909f', tag: 'Explainer', lede: 'An intentionally awkward animated explainer that still sells today, years after we made it.' },
  { slug: 'reelay', draft: true, title: 'Reelay', category: 'Founders', icp: 'SaaS & startups', location: 'Remote', heroVideoId: '698a5aa5aec3d4e420c263c4', tag: 'Animation', lede: 'Static designer images brought to life as motion, resized for social, web, email, and pre-roll.' },
  { slug: 'intelliplay', draft: true, title: 'Intelliplay', category: 'Founders', icp: 'Product & hardware', location: 'Chicago / Florida', heroVideoId: '698a5386aec3d4e420c17a69', tag: 'Product story', lede: 'A product film for the Brass Ring Awards, then four days filming their IAAPA booth. Our photos ended up on their tent.' },
  { slug: 'gitex-dubai', draft: true, title: 'Gitex Dubai', category: 'Founders', icp: 'Founders & community', location: 'Dubai', heroVideoId: '698a6227fc23d3d76fa8cd57', tag: 'Event film', lede: 'Nine Phoenix entrepreneurs fly to Dubai to present among thousands of businesses. Seven days, one legendary memory.' },
  { slug: 'iaapa-2026', draft: true, title: 'IAAPA 2026', category: 'Founders', icp: 'Product & events', location: 'Florida', heroVideoId: '698a5391aec3d4e420c17bd3', tag: 'Conference', lede: 'A 24-hour-turnaround follow-up: daily social cuts and keeper films across the family entertainment industry\'s biggest show.' },
  { slug: 'nabi', draft: true, title: 'NABI: A Glimmer of Hope', category: 'Founders', icp: 'Nonprofits & community', location: 'Arizona', heroVideoId: '', tag: 'Documentary', lede: 'A documentary on Native American youth using basketball to rise above expectations. A fundraising and education piece.' },
];

export const PUBLISHED = PROJECTS.filter((p) => !p.draft);
export const bySlug = (slug) => PROJECTS.find((p) => p.slug === slug);
