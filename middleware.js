// Vercel Edge Middleware -- per-page OG meta tags for social share previews.
// Social crawlers (Facebook, Twitter, LinkedIn, iMessage, Slack, Discord) get
// a minimal HTML page with correct meta tags. Real browsers get the SPA.

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|Googlebot|bingbot|Applebot|iMessageLinkPreview/i;

// Supabase edge-compatible fetch for company data
async function fetchCompanyForSEO(slug) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/directory_companies?slug=eq.${encodeURIComponent(slug)}&status=eq.active&select=name,description,vertical,city,state,website,photos&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data && data[0] ? data[0] : null;
  } catch {
    return null;
  }
}

const OG_IMAGE = 'https://www.aheadofmarket.com/og-image.png';

// Per-page metadata. Entries here override the generic index.html tags for social crawlers.
const PAGE_META = {
  '/': {
    title: 'AOM | We Make Companies Impossible to Ignore',
    description: 'AOM builds the content, websites, and systems that make companies impossible to ignore. Video production, social media, AI-powered workflows, and web — for construction companies, founders, and brands that do real work.',
    urlBase: 'https://www.aheadofmarket.com',
    siteName: 'AOM | Ahead of Market',
  },
  '/about': {
    title: 'About AOM | The Team Behind the Work',
    description: 'AOM is a Phoenix-based creative and AI advisory studio. We make companies impossible to ignore through video, social media, web, and AI-powered business systems.',
    urlBase: 'https://www.aheadofmarket.com',
    siteName: 'AOM | Ahead of Market',
  },
  '/ai': {
    title: 'AI Tools for Business | Free AI Prompts by AOM',
    description: 'Free AI-powered tools for small business owners. Get instant prompts for client communications, hiring, sales outreach, operations, and content — built by AOM.',
    urlBase: 'https://www.aheadofmarket.com',
    siteName: 'AOM | Ahead of Market',
  },
  '/ai-guide': {
    title: 'AI Tools for Business | Free AI Prompts by AOM',
    description: 'Free AI-powered tools for small business owners. Get instant prompts for client communications, hiring, sales outreach, operations, and content — built by AOM.',
    urlBase: 'https://www.aheadofmarket.com',
    siteName: 'AOM | Ahead of Market',
  },
  '/directory': {
    title: 'US Municipality Directory | 19,475 Cities & Towns',
    description: 'Search, filter, and export data on 19,475 US municipalities. Population, location, type, and more. Built for government affairs teams.',
    image: 'https://www.aheadofmarket.com/og-directory.png',
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
    title: 'Corner — Your AI Team in a Dashboard',
    description: 'Corner is the AI-powered business dashboard by AOM. Agents that run video, social, outreach, and strategy — in one place, for businesses that move.',
    image: 'https://www.aheadofmarket.com/corner-og.png',
    siteName: 'Corner by AOM',
    urlBase: 'https://www.aheadofmarket.com',
  },
  '/dashboard': {
    title: 'Corner — Your AI Team in a Dashboard',
    description: 'Corner is the AI-powered business dashboard by AOM. Agents that run video, social, outreach, and strategy — in one place, for businesses that move.',
    image: 'https://www.aheadofmarket.com/corner-og.png',
    siteName: 'Corner by AOM',
    urlBase: 'https://www.aheadofmarket.com',
  },
  '/cv4': {
    title: 'Corner — Your AI Team in a Dashboard',
    description: 'Corner is the AI-powered business dashboard by AOM. Agents that run video, social, outreach, and strategy — in one place, for businesses that move.',
    image: 'https://www.aheadofmarket.com/corner-og.png',
    siteName: 'Corner by AOM',
    urlBase: 'https://www.aheadofmarket.com',
  },
  // CV6 is the live Corner surface and CVG its sibling; both were missing here,
  // so a share of either fell through to the AOM card. (aom:favicon-system)
  '/cv6': {
    title: 'Corner — Your AI Team in a Dashboard',
    description: 'Corner is the AI-powered business dashboard by AOM. Agents that run video, social, outreach, and strategy — in one place, for businesses that move.',
    image: 'https://www.aheadofmarket.com/corner-og.png',
    siteName: 'Corner by AOM',
    urlBase: 'https://www.aheadofmarket.com',
  },
  '/cvg': {
    title: 'Corner — Your AI Team in a Dashboard',
    description: 'Corner is the AI-powered business dashboard by AOM. Agents that run video, social, outreach, and strategy — in one place, for businesses that move.',
    image: 'https://www.aheadofmarket.com/corner-og.png',
    siteName: 'Corner by AOM',
    urlBase: 'https://www.aheadofmarket.com',
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
  '/brands': {
    title: 'Brand Portfolio | AOM',
    description: 'Brand identity work by Ahead of Market. Full visual systems for S3C, Ambition Mechanical, Valor to Victory, and more.',
  },
  '/brands/s3c': {
    title: 'S3C Brand Exploration',
    description: 'Logo concepts for the Semiconductor Services & Supply Coalition',
  },
  '/brands/v2v': {
    title: 'Valor to Victory Brand Identity',
    description: 'Brand identity concepts for Valor to Victory — veteran nonprofit focused on homeownership and financial empowerment through VA loans.',
  },
  '/brands/space-rising': {
    title: 'Space Rising Brand Guidelines',
    description: 'Brand identity guidelines for Space Rising and Arizona Space Congress',
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
  '/briefs/isa-energy-shoot-script': {
    title: 'ISA Energy | Brand Video Bible',
    description: '3 acts, 9 beats, 4 interview subjects. Sedona Apr 2, 2026.',
    image: 'https://www.aheadofmarket.com/og-isa-energy.png',
  },
};

function buildHtml(meta, fullUrl, schemaJson) {
  const siteName = meta.siteName || 'sourcing.directory';
  const ogUrl = meta.urlBase ? `${meta.urlBase}${new URL(fullUrl).pathname}` : fullUrl;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <!-- Per-page canonical. index.html hardcodes the root, which told search
       engines every route was a duplicate of the homepage. -->
  <link rel="canonical" href="${ogUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${siteName}" />
  <meta property="og:title" content="${meta.title}" />
  <meta property="og:description" content="${meta.description}" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:image" content="${meta.image || OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${meta.title}" />
  <meta name="twitter:description" content="${meta.description}" />
  <meta name="twitter:image" content="${meta.image || OG_IMAGE}" />
  ${schemaJson ? `<script type="application/ld+json">${schemaJson}</script>` : ''}
</head>
<body>
  <h1>${meta.title}</h1>
  <p>${meta.description}</p>
  <a href="${ogUrl}">Visit page</a>
</body>
</html>`;
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const ua = request.headers.get('user-agent') || '';

  // Only intercept for social crawlers/bots
  if (!BOT_UA.test(ua)) {
    return; // Let the request pass through to the SPA
  }

  const fullUrl = `https://sourcing.directory${url.pathname}`;

  // Handle /sourcing/:tenantSlug/:slug -- company profile pages (dynamic SEO)
  // Pattern: /sourcing/{tenantSlug}/{companySlug} -- exactly 3 segments
  const sourcing3 = url.pathname.match(/^\/sourcing\/([^/]+)\/([^/]+)$/);
  if (sourcing3) {
    const [, tenantSlug, companySlug] = sourcing3;
    // Skip non-profile routes like /sourcing/sc3/jobs etc.
    const reservedSlugs = ['jobs', 'marketplace', 'events', 'articles', 'signup', 'login', 'portal', 'checkout', 'settings', 'post'];
    if (!reservedSlugs.includes(companySlug)) {
      const company = await fetchCompanyForSEO(companySlug);
      if (company) {
        const verticalLabels = { semiconductor: 'Semiconductor', space: 'Space & Aerospace', biotech: 'Biotech', defense: 'Defense' };
        const vertical = verticalLabels[company.vertical] || company.vertical || 'Industrial';
        const location = [company.city, company.state].filter(Boolean).join(', ');
        const title = `${company.name} | ${vertical} Supplier | sourcing.directory`;
        const description = company.description
          ? company.description.slice(0, 155)
          : `${company.name} -- ${vertical} supplier${location ? ` in ${location}` : ''}. View certifications, capabilities, and contact info.`;
        const photos = company.photos || [];
        const ogImage = Array.isArray(photos) && photos[0] ? photos[0] : OG_IMAGE;

        const schema = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: company.name,
          description: company.description || description,
          url: company.website || fullUrl,
          ...(location ? { address: { '@type': 'PostalAddress', addressLocality: company.city, addressRegion: company.state } } : {}),
        });

        const html = buildHtml({ title, description, image: ogImage }, fullUrl, schema);
        return new Response(html, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
        });
      }
    }
  }

  // Handle /sourcing directory page
  if (url.pathname === '/sourcing' || url.pathname.match(/^\/sourcing\/[^/]+$/)) {
    const dirSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Industrial Supplier Directory | sourcing.directory',
      description: 'Find verified semiconductor, aerospace, biotech, and defense suppliers in Arizona.',
    });
    const meta = {
      title: 'Industrial Supplier Directory | sourcing.directory',
      description: 'Find verified semiconductor, aerospace, biotech, and defense suppliers in Arizona. Certified companies, direct connections.',
    };
    const html = buildHtml(meta, fullUrl, dirSchema);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
    });
  }

  // Find matching static page meta (try exact match, then prefix match for nested routes)
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

  const html = buildHtml(meta, fullUrl, null);
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
    '/',
    '/about',
    '/ai',
    '/ai-guide',
    '/directory',
    '/skills',
    '/briefs/:path*',
    '/corner',
    '/dashboard',
    '/dashboard/:path*',
    '/cv4',
    '/cv4/:path*',
    '/brand/:path*',
    '/brands/:path*',
    '/case-study',
    '/social',
    '/finance',
    '/roi-calculator',
    '/demo',
    '/guides/:path*',
    '/sourcing',
    '/sourcing/:path*',
  ],
};
