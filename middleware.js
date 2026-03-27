// Vercel Edge Middleware -- per-page OG meta tags for social share previews.
// Social crawlers (Facebook, Twitter, LinkedIn, iMessage, Slack, Discord) get
// a minimal HTML page with correct meta tags. Real browsers get the SPA.

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|Applebot|iMessageLinkPreview/i;

const OG_IMAGE = 'https://www.aheadofmarket.com/og-image.png';

// Per-page metadata. Homepage excluded (uses index.html defaults).
const PAGE_META = {
  '/directory': {
    title: 'US Municipality Directory | 19,475 Cities & Towns',
    description: 'Search, filter, and export data on 19,475 US municipalities. Population, location, type, and more. Built for government affairs teams.',
  },
  '/skills': {
    title: 'Skills | What Our AI Agents Can Do',
    description: 'Browse the full library of AI-powered skills AOM agents use daily. Video editing, brand design, outreach, strategy, and more.',
  },
  '/briefs': {
    title: 'Briefs | Strategy & Research Library',
    description: 'Deep-dive strategy briefs on AI advisory, partnerships, sales, and growth. Built by AOM agents, reviewed by humans.',
  },
  '/corner': {
    title: 'Corner | AI Dashboard for Business',
    description: 'Your AI team in a dashboard. Agents that handle video, social media, outreach, and strategy. Built by AOM.',
  },
  '/brand/v4': {
    title: 'AOM Brand Guidelines v4',
    description: 'The official AOM brand guide. Colors, typography, logo usage, and design system.',
  },
  '/brands/ambition': {
    title: 'Ambition Mechanical Brand Guidelines',
    description: 'Brand guide for Ambition Mechanical. Navy, red, white. Barlow Condensed + Inter. Industrial energy.',
  },
  '/brands/included-health': {
    title: 'Included Health Brand Reference',
    description: 'Brand reference for Included Health. Colors, typography, and visual identity guidelines.',
  },
  '/case-study': {
    title: 'Case Study | AOM in Action',
    description: 'See how AOM delivers results. Real projects, real numbers, real impact.',
  },
  '/social': {
    title: 'Social Media Management | AOM',
    description: 'Social media content that actually works. Strategy, filming, editing, posting. Built for construction companies and founders.',
  },
  '/finance': {
    title: 'Finance Tracker | AOM Internal',
    description: 'Internal financial tracking dashboard for AOM operations.',
  },
  '/roi-calculator': {
    title: 'ROI Calculator | See Your Return',
    description: 'Calculate your expected return on investment from AOM services. Video, social, web, and AI advisory.',
  },
  '/demo': {
    title: 'Demo | See Corner in Action',
    description: 'Interactive demo of Corner, the AI-powered business dashboard by AOM.',
  },
  '/guides/ambition-crown': {
    title: 'Crown Restaurant | Ambition Production Guide',
    description: 'Production guide for the Crown Restaurant social media content. Shot list, branding, and delivery specs.',
  },
  '/guides/ambition-memorial-tower': {
    title: 'Memorial Tower | Ambition Production Guide',
    description: 'Production guide for Memorial Tower content. Titles, branding, and delivery specs.',
  },
};

export default function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';

  // Only intercept for social crawlers/bots
  if (!BOT_UA.test(ua)) {
    return; // Let the request pass through to the SPA
  }

  // Find matching page meta (try exact match, then prefix match for nested routes)
  let meta = PAGE_META[url.pathname];
  if (!meta) {
    // Check prefix matches for /brands/*, /briefs/*, /guides/*
    for (const [path, m] of Object.entries(PAGE_META)) {
      if (url.pathname.startsWith(path) && path !== '/') {
        meta = m;
        break;
      }
    }
  }

  // If no custom meta, let the default index.html handle it
  if (!meta) {
    return;
  }

  const fullUrl = `https://aheadofmarket.com${url.pathname}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Ahead of Market" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:url" content="${fullUrl}" />
  <meta property="og:image" content="${OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${meta.title}" />
  <meta name="twitter:description" content="${meta.description}" />
  <meta name="twitter:image" content="${OG_IMAGE}" />
</head>
<body>
  <h1>${meta.title}</h1>
  <p>${meta.description}</p>
  <a href="${fullUrl}">Visit page</a>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export const config = {
  matcher: [
    '/directory',
    '/skills',
    '/briefs/:path*',
    '/corner',
    '/brand/:path*',
    '/brands/:path*',
    '/case-study',
    '/social',
    '/finance',
    '/roi-calculator',
    '/demo',
    '/guides/:path*',
  ],
};
