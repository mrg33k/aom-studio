import { asset, escapeHtml } from '../lib/html.mjs'

// ── Google Analytics (GA4) ──────────────────────────────────────────
// SWAP THIS with the real Wolfpack GA4 measurement ID once the property
// is created in analytics.google.com under the AOM Google account.
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'
import { renderHome } from './home.mjs'
import { renderService } from './service.mjs'
import { renderServiceIndex } from './service-index.mjs'
import { renderPropertyManagers } from './property-managers.mjs'
import { renderGeneralContractors } from './general-contractors.mjs'
import { renderCity } from './city.mjs'
import { renderContact } from './contact.mjs'

const defaultSite = {
  name: 'Wolfpack Companies',
  url: 'https://wolfpackcompanies.com/',
}

const services = [
  { slug: 'hydro-jetting', label: 'Hydro Jetting', shortLabel: 'Hydro Jetting' },
  { slug: 'drain-cleaning', label: 'Drain Cleaning & Camera', shortLabel: 'Drain & Camera' },
  { slug: 'air-compressor', label: 'Air Compressor Install', shortLabel: 'Air Compressor' },
  { slug: 'property-managers', label: 'Maintenance Contracts', shortLabel: 'Maintenance' },
  { slug: 'backflow-testing', label: 'Backflow Testing', shortLabel: 'Backflow' },
  { slug: 'water-heaters', label: 'Water Heaters & Boilers', shortLabel: 'Water Heaters' },
  { slug: 'leak-detection', label: 'Under-Slab Leak Detection', shortLabel: 'Leak Detection' },
  { slug: 'emergency', label: '24/7 Emergency Response', shortLabel: '24/7 Emergency' },
]

const railServices = [
  services[0], services[1], services[2], services[4],
  services[5], services[6], services[7], services[3],
]

const cities = [
  ['phoenix', 'Phoenix'], ['scottsdale', 'Scottsdale'], ['tempe', 'Tempe'],
  ['mesa', 'Mesa'], ['chandler', 'Chandler'], ['gilbert', 'Gilbert'],
  ['glendale', 'Glendale'], ['peoria', 'Peoria'], ['surprise', 'Surprise'],
  ['goodyear', 'Goodyear'], ['avondale', 'Avondale'],
  ['paradise-valley', 'Paradise Valley'], ['apache-junction', 'Apache Junction'],
  ['litchfield-park', 'Litchfield Park'], ['san-tan-valley', 'San Tan Valley'],
]

function canonicalUrl(page, site) {
  return `${site.url}${page.slug ? `${page.slug}/` : ''}`
}

function current(page, slug) {
  return page.slug === slug ? ' aria-current="page"' : ''
}

function serviceIsCurrent(page) {
  return page.slug === 'services' || services.some(service => service.slug === page.slug)
}

function serviceLinks(page, className = '') {
  return services.map(service => (
    `<a${className ? ` class="${className}"` : ''} href="/${service.slug}/"${current(page, service.slug)}>${escapeHtml(service.label)}</a>`
  )).join('')
}

function brandImages() {
  return `<span class="brand-icon">
    <img class="brand-image-dark" src="${asset('brand/wolfpack-icon-knockout.png')}" width="1059" height="1243" alt="">
    <img class="brand-image-light" src="${asset('brand/wolfpack-icon.png')}" width="1059" height="1243" alt="">
  </span>
  <span class="brand-wordmark">
    <img class="brand-image-dark" src="${asset('brand/wolfpack-wordmark-knockout.png')}" width="1322" height="275" alt="Wolfpack Companies">
    <img class="brand-image-light" src="${asset('brand/wolfpack-wordmark.png')}" width="1322" height="275" alt="Wolfpack Companies">
  </span>`
}

export function renderHead(page, site = defaultSite) {
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description || page.title)
  const canonical = canonicalUrl(page, site)
  const ogImage = `${site.url.replace(/\/$/, '')}${asset('og.jpg')}`

  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0A0C10">
  <title>${title} | ${escapeHtml(site.name)}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeHtml(site.name)}">
  <meta property="og:title" content="${title} | ${escapeHtml(site.name)}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Wolfpack Companies — commercial plumbing, Phoenix AZ, 24/7, 602-550-5452">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} | ${escapeHtml(site.name)}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wdth,wght@0,62..125,400..900&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${asset('site.css')}">
  <script src="${asset('site.js')}" defer></script>
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');</script>`
}

export function renderHeader(page) {
  const servicesCurrent = serviceIsCurrent(page) ? ' aria-current="page"' : ''

  return `<header class="site-header" data-site-header>
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="header-main wrap">
      <a class="brand" href="/" aria-label="Wolfpack Companies home">${brandImages()}</a>
      <nav class="desktop-nav" aria-label="Primary">
        <a class="nav-link" href="/"${current(page, '')}>Home</a>
        <details class="service-menu">
          <summary class="nav-link"${servicesCurrent}>Services</summary>
          <div class="service-menu-panel">${serviceLinks(page, 'service-menu-link')}</div>
        </details>
        <a class="nav-link" href="/property-managers/"${current(page, 'property-managers')}>Property Managers</a>
        <a class="nav-link" href="/general-contractors/"${current(page, 'general-contractors')}>General Contractors</a>
        <a class="nav-link" href="/contact/" data-lead-open${current(page, 'contact')}>Contact</a>
      </nav>
      <button class="theme-button" type="button" data-theme-toggle aria-label="Switch to light theme" aria-pressed="false">
        <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>
        <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/></svg>
      </button>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobile-navigation">
        <span class="menu-button-label">Menu</span><span class="menu-bars" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <a class="header-call" href="tel:6025505452"><strong>602-550-5452</strong><span>24/7 emergency</span></a>
    </div>
    <nav id="mobile-navigation" class="mobile-nav" aria-label="Mobile" hidden>
      <a class="mobile-primary-link" href="/"${current(page, '')}>Home</a>
      <span class="mobile-nav-label">Services</span>
      ${serviceLinks(page, 'mobile-service-link')}
      <a class="mobile-primary-link" href="/property-managers/"${current(page, 'property-managers')}>Property Managers</a>
      <a class="mobile-primary-link" href="/general-contractors/"${current(page, 'general-contractors')}>General Contractors</a>
      <a class="mobile-primary-link" href="/contact/" data-lead-open${current(page, 'contact')}>Contact</a>
      <button class="mobile-theme-toggle" type="button" data-theme-toggle aria-label="Switch to light theme" aria-pressed="false">
        <svg class="theme-icon theme-icon-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/></svg>
        <svg class="theme-icon theme-icon-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9"/></svg>
        <span>Light or dark mode</span>
      </button>
      <a class="mobile-call" href="tel:6025505452">Call 602-550-5452</a>
    </nav>
    <nav class="service-rail" aria-label="Services">${railServices.map(service => (
      `<a href="/${service.slug}/"${current(page, service.slug)}>${escapeHtml(service.shortLabel)}</a>`
    )).join('')}</nav>
  </header>`
}

export function renderFooter() {
  return `<footer class="site-footer">
    <div class="footer-layout wrap">
      <div class="footer-brand">
        <a class="brand footer-logo" href="/" aria-label="Wolfpack Companies home">${brandImages()}</a>
        <p class="footer-cities">${cities.map(([slug, label]) => `<a href="/${slug}/">${label}</a>`).join('<span aria-hidden="true"> · </span>')}</p>
      </div>
      <div class="footer-links">
        <div class="footer-column">
          <h2>Services</h2>
          ${services.map(service => `<a href="/${service.slug}/">${escapeHtml(service.label)}</a>`).join('')}
        </div>
        <div class="footer-column">
          <h2>Company</h2>
          <a href="/">Home</a>
          <a href="/property-managers/">Property &amp; Facility Managers</a>
          <a href="/general-contractors/">General Contractors</a>
          <a href="/contact/" data-lead-open>Contact</a>
        </div>
        <div class="footer-column footer-contact">
          <h2>Contact</h2>
          <a class="footer-phone" href="tel:6025505452">602-550-5452</a>
          <a href="mailto:Service@wolfpackcompanies.com">Service@wolfpackcompanies.com</a>
        </div>
      </div>
    </div>
    <p class="footer-legal wrap"><span>&copy; 2026 Wolfpack Companies LLC</span><span>AZ ROC #326629</span><span>Licensed · Bonded · Insured</span></p>
  </footer>`
}

const needIcons = {
  building: '<path d="M3.5 20.5h17M5.5 20.5V4.5h9v16M14.5 9.5h4v11"/><path d="M8 8h3.5M8 11.5h3.5M8 15h3.5"/>',
  alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  camera: '<circle cx="11" cy="11" r="6"/><circle cx="11" cy="11" r="2.2"/><path d="m15.5 15.5 5 5"/>',
  jet: '<path d="M3 12h7"/><path d="m10 8.5 6 3.5-6 3.5Z"/><path d="M18 7.5 21 6M18 12h3M18 16.5 21 18"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
}

function needIcon(name) {
  return `<svg class="need-icon" viewBox="0 0 24 24" aria-hidden="true">${needIcons[name]}</svg>`
}

export function renderLeadDialog(sourcePage) {
  const needOptions = [
    ['building', 'New Install', 'Ground-up or tenant improvement'],
    ['alert', 'A line is down', 'Emergency, need someone now'],
    ['camera', 'Request a Walkthrough', 'Come see the property first'],
    ['jet', 'We need service', 'Repair, maintenance, or jetting'],
    ['building', 'I manage multiple properties', 'Portfolio contract discussion'],
    ['doc', 'Something else', 'Tell us what you need'],
  ]

  return `<dialog class="lead-dialog" id="lead-dialog" aria-labelledby="lead-dialog-title">
    <div class="lead-dialog-bar">
      <div class="lead-dialog-brand"><img src="${asset('brand/wolfpack-icon-knockout.png')}" width="1059" height="1243" alt=""><span id="lead-dialog-title">Contact Wolfpack</span>
        <button class="dialog-close" type="button" data-lead-close aria-label="Close request form"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </div>
      <div class="lead-dialog-contact">
        <a href="tel:6025505452"><svg class="need-icon" viewBox="0 0 24 24" aria-hidden="true">${needIcons.phone}</svg><strong>602-550-5452</strong></a>
        <a href="mailto:Service@wolfpackcompanies.com"><svg class="need-icon" viewBox="0 0 24 24" aria-hidden="true">${needIcons.mail}</svg><span>Email</span></a>
      </div>
    </div>
    <div class="lead-progress" aria-hidden="true"><i data-lead-progress></i></div>
    <form class="lead-form" id="lead-form" method="post" action="/api/lead" data-lead-form>
      <input type="hidden" name="sourcePage" value="${escapeHtml(sourcePage)}">
      <input type="hidden" name="startedAt" value="">
      <div class="honeypot" aria-hidden="true"><label for="lead-website">Website</label><input id="lead-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
      <div class="lead-panel" data-lead-panel="0">
        <h2 class="lead-heading">What can we<br>do for you?</h2>
        <fieldset class="need-grid">
          <legend>Choose what you need</legend>
          ${needOptions.map(([icon, label, detail]) => `<label class="need-option">
            <input type="radio" name="need" value="${escapeHtml(label)}" required>
            ${needIcon(icon)}
            <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>
          </label>`).join('')}
        </fieldset>
        <div class="lead-actions"><button class="lead-submit" type="button" data-lead-continue disabled>Continue</button></div>
      </div>
      <div class="lead-panel" data-lead-panel="1" hidden>
        <h2 class="lead-heading">Where do we<br>reach you?</h2>
        <p class="lead-sub">Three fields. We come back same business day.</p>
        <div class="contact-fields">
          <label>Name<input type="text" name="name" autocomplete="name" required></label>
          <label>Company<input type="text" name="company" autocomplete="organization"></label>
          <label>Phone<input type="tel" name="phone" autocomplete="tel" required></label>
        </div>
        <div class="lead-actions">
          <button class="lead-submit" type="submit">Send request</button>
          <button class="lead-back" type="button" data-lead-back>&larr; Back</button>
        </div>
        <p class="form-status" data-lead-status role="status" aria-live="polite"></p>
        <p class="form-fallback">If the line will not wait, call <a href="tel:6025505452">602-550-5452</a>.</p>
      </div>
      <div class="lead-panel lead-success" data-lead-panel="2" hidden>
        <div class="lead-success-mark"><svg viewBox="0 0 24 24" aria-hidden="true">${needIcons.check}</svg></div>
        <h2 class="lead-heading">Got it.</h2>
        <p class="lead-sub">We come back the same business day. If the line will not wait, call <a href="tel:6025505452"><strong>602-550-5452</strong></a> and a person answers.</p>
      </div>
    </form>
  </dialog>`
}

const bodyRenderers = {
  home: renderHome,
  service: renderService,
  services: renderServiceIndex,
  'property-managers': renderPropertyManagers,
  'general-contractors': renderGeneralContractors,
  city: renderCity,
  contact: renderContact,
}

function renderBody(page) {
  const renderer = bodyRenderers[page.kind]
  if (renderer) return renderer(page)
  return `<div class="page-placeholder">
    <div class="wrap">
      <p class="eyebrow">Wolfpack Companies</p>
      <h1>${escapeHtml(page.title)}</h1>
    </div>
  </div>`
}

export function renderPage(page, site = defaultSite) {
  const sourcePage = page.slug ? `/${page.slug}/` : '/'

  return `<!doctype html>
<html lang="en">
<head>
  ${renderHead(page, site)}
</head>
<body>
  ${renderHeader(page)}
  <main id="main">
    ${renderBody(page)}
  </main>
  ${renderFooter()}
  ${renderLeadDialog(sourcePage)}
</body>
</html>
`
}
