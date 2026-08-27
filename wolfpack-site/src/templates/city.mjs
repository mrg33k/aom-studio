// City service-area pages (kind 'city') — one layout for all 15 cities, from
// the approved "Scottsdale.dc.html" comp (design-v2-2026-08-27). City name,
// hero copy, and body copy come from src/data/cities.mjs, which mirrors each
// city's live page verbatim.
import { asset, escapeHtml } from '../lib/html.mjs'
import { cities, findCity } from '../data/cities.mjs'
import { svcHeroCtas, svcHeroTitle, svcOffer } from './service.mjs'

const iconPaths = {
  truck: '<path d="M2.5 16V7.5h11V16"/><path d="M13.5 10h4l3 3.5V16"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>',
}

function icon(name) {
  return `<svg class="city-icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`
}

function cityLink(slug, className) {
  const target = findCity(slug)
  return `<a class="${className}" href="/${target.slug}/">${escapeHtml(target.name)}</a>`
}

function hero(city) {
  return `<section class="svc2-hero">
    <img class="svc2-hero-photo" src="${asset('work/01-hydro-jetting-a.jpg')}" alt="${escapeHtml(city.copy.heroAlt)}" fetchpriority="high">
    <div class="svc2-hero-shade" aria-hidden="true"></div>
    <div class="svc2-hero-inner wrap">
      <p class="svc2-eyebrow">${escapeHtml(city.copy.eyebrow)}</p>
      ${svcHeroTitle(city.copy.heroLines)}
      <div class="svc2-hero-row">
        <p class="svc2-hero-sub">${escapeHtml(city.copy.heroSub)}</p>
        ${svcHeroCtas()}
      </div>
    </div>
  </section>`
}

function whySection(city) {
  return `<section class="svc2-section">
    <div class="wrap">
      <div class="section-head"><span class="section-num">01</span><h2 class="section-title">${escapeHtml(city.copy.whyHeading)}<br><span class="dim">${escapeHtml(city.copy.whyHeadingDim)}</span></h2></div>
      <div class="city-grid">
        ${city.copy.whyCards.map(card => `<div class="city-card">
          ${icon(card.icon)}
          <b class="city-card-title">${escapeHtml(card.title)}</b>
          <p class="city-card-desc">${escapeHtml(card.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>`
}

function areaSection(city) {
  const others = cities.filter(other => other.slug !== city.slug)
  return `<section class="svc2-section svc2-band">
    <div class="wrap">
      <div class="section-head"><span class="section-num">02</span><h2 class="section-title">${escapeHtml(city.copy.areaHeading)}<br><span class="dim">${escapeHtml(city.copy.areaHeadingDim)}</span></h2></div>
      <p class="city-lead">${escapeHtml(city.copy.areaLead)}</p>
      <div class="city-chips">
        ${others.map(other => cityLink(other.slug, 'city-chip')).join('')}
      </div>
      <p class="city-nearby"><span class="city-nearby-label">Nearby</span>${city.nearbyCities.map(slug => cityLink(slug, 'city-nearby-link')).join('<span aria-hidden="true"> · </span>')}</p>
    </div>
  </section>`
}

export function renderCity(page) {
  const city = findCity(page.slug)
  if (!city) throw new Error(`No city record for slug "${page.slug}"`)
  return [hero(city), whySection(city), areaSection(city), svcOffer(city.copy.offer)].join('\n')
}
