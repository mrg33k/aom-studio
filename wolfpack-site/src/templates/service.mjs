import { asset, escapeHtml } from '../lib/html.mjs'
import { findService } from '../data/services.mjs'

const iconPaths = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  jet: '<path d="M3 12h7"/><path d="m10 8.5 6 3.5-6 3.5Z"/><path d="M18 7.5 21 6M18 12h3M18 16.5 21 18"/>',
  cable: '<circle cx="9" cy="12" r="6"/><circle cx="9" cy="12" r="1.6"/><path d="M15 12h6M18 9.5v5"/>',
}

export function svcIcon(name, className) {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`
}

export function svcHeroTitle(lines) {
  return `<h1 class="svc2-hero-title">${lines.map(line => (
    `<span>${line.text ? escapeHtml(line.text) : ''}${line.accent ? `<em class="svc2-accent">${escapeHtml(line.accent)}</em>` : ''}</span>`
  )).join('')}</h1>`
}

export function svcHeroCtas(primaryLabel = 'Request a walkthrough', phoneLabel = '602-550-5452 / Call now') {
  return `<div class="svc2-hero-ctas">
    <a class="btn-blue" href="#contact">${escapeHtml(primaryLabel)}${svcIcon('arrow', 'btn-icon')}</a>
    <a class="btn-ghost" href="tel:6025505452">${escapeHtml(phoneLabel)}</a>
  </div>`
}

export function svcOffer(offer) {
  return `<section class="svc2-offer">
    <img class="svc2-offer-wm" src="${asset('brand/wolfpack-icon-knockout.png')}" alt="" aria-hidden="true">
    <div class="wrap svc2-offer-inner">
      <h2 class="svc2-offer-title">${offer.lines.map(escapeHtml).join('<br>')}</h2>
      <div class="svc2-offer-ctas">
        <a class="btn-ink" href="#contact">${escapeHtml(offer.cta)}${svcIcon('arrow', 'btn-icon')}</a>
        <a class="btn-white" href="tel:6025505452">602-550-5452</a>
      </div>
    </div>
  </section>`
}

function hero(record) {
  return `<section class="svc2-hero">
    <img class="svc2-hero-photo" src="${asset(record.heroImage)}" alt="${escapeHtml(record.heroAlt)}" fetchpriority="high">
    <div class="svc2-hero-shade" aria-hidden="true"></div>
    <div class="svc2-hero-inner wrap">
      <p class="svc2-eyebrow">${escapeHtml(record.eyebrow)}</p>
      ${svcHeroTitle(record.heroLines)}
      <div class="svc2-hero-row">
        <p class="svc2-hero-sub">${escapeHtml(record.heroSub)}</p>
        ${svcHeroCtas()}
      </div>
    </div>
  </section>`
}

function sectionHead(num, titleHtml) {
  return `<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">${titleHtml}</h2></div>`
}

function shotClass(index, total) {
  if (total === 1) return 'svc2-shot svc2-shot-full'
  if (index === 0) return 'svc2-shot svc2-shot-main'
  if (total === 2) return 'svc2-shot svc2-shot-tall'
  return 'svc2-shot'
}

function shotsSection(record, num) {
  const figures = record.photos.map((photo, index) => `<figure class="${shotClass(index, record.photos.length)}">
    <img src="${asset(photo.image)}" alt="${escapeHtml(photo.alt)}" loading="lazy">
    <figcaption class="svc2-shot-caption"><span class="svc2-shot-num">${String(index + 1).padStart(3, '0')}</span><span class="svc2-shot-label">${escapeHtml(photo.label)}</span></figcaption>
  </figure>`).join('')

  return `<section class="svc2-section">
    <div class="wrap">
      ${sectionHead(num, 'On the job.')}
      <div class="svc2-shot-grid">${figures}</div>
    </div>
  </section>`
}

function beforeAfterSection(record, num) {
  const { heading, headingDim, groups } = record.beforeAfters
  const groupsHtml = groups.map(group => `<div class="svc2-ba-group">
    <p class="svc2-ba-kind">${escapeHtml(group.kind)}</p>
    <div class="svc2-ba-pair">
      <figure class="svc2-ba-fig"><span class="ba-tag ba-tag-before">Before</span><img src="${asset(group.before)}" alt="${escapeHtml(group.beforeCap)}" loading="lazy"><figcaption class="svc2-ba-cap">${escapeHtml(group.beforeCap)}</figcaption></figure>
      <figure class="svc2-ba-fig"><span class="ba-tag ba-tag-after">After</span><img src="${asset(group.after)}" alt="${escapeHtml(group.afterCap)}" loading="lazy"><figcaption class="svc2-ba-cap">${escapeHtml(group.afterCap)}</figcaption></figure>
    </div>
  </div>`).join('')

  return `<section class="svc2-section svc2-band">
    <div class="wrap">
      ${sectionHead(num, `${escapeHtml(heading)}<br><span class="dim">${escapeHtml(headingDim)}</span>`)}
      ${groupsHtml}
    </div>
  </section>`
}

function benefitsSection(record, num) {
  const { heading, intro, cards } = record.benefits
  const cardsHtml = cards.length ? `<div class="svc2-why-grid">${cards.map(card => `<div class="svc2-why-card">
    <b class="svc2-why-title">${escapeHtml(card.title)}</b>
    <p class="svc2-why-desc">${escapeHtml(card.desc)}</p>
  </div>`).join('')}</div>` : ''

  return `<section class="svc2-section">
    <div class="wrap">
      ${sectionHead(num, escapeHtml(heading))}
      <p class="svc2-lead">${escapeHtml(intro)}</p>
      ${cardsHtml}
    </div>
  </section>`
}

function versusCard(side, winning) {
  const badge = side.badge ? `<span class="svc2-vs-badge">${escapeHtml(side.badge)}</span>` : ''
  return `<div class="svc2-vs-card${winning ? ' svc2-vs-win' : ''}">
    ${badge}
    ${svcIcon(side.icon, `svc2-vs-icon${winning ? ' svc2-vs-icon-win' : ''}`)}
    <h3 class="svc2-vs-title">${escapeHtml(side.title)}</h3>
    <ul class="svc2-vs-points">${side.points.map(point => `<li>${escapeHtml(point)}</li>`).join('')}</ul>
  </div>`
}

function versusSection(record, num) {
  const { headingPre, headingAccent, headingPost, losing, winning } = record.versus
  const title = `${escapeHtml(headingPre)}<span class="svc2-accent">${escapeHtml(headingAccent)}</span>${escapeHtml(headingPost)}`

  return `<section class="svc2-section">
    <div class="wrap">
      <div class="section-head"><span class="section-num">${num}</span><h2 class="section-title svc2-vs-heading">${title}</h2></div>
      <div class="svc2-vs-grid">
        ${versusCard(losing, false)}
        ${versusCard(winning, true)}
      </div>
    </div>
  </section>`
}

function stepsSection(record, num) {
  const { heading, items } = record.steps
  return `<section class="svc2-section svc2-band">
    <div class="wrap">
      ${sectionHead(num, escapeHtml(heading))}
      <div class="process-grid svc2-steps-grid">
        ${items.map((step, index) => `<div class="process-step"><span class="process-num">${String(index + 1).padStart(2, '0')}</span><b class="process-title">${escapeHtml(step.title)}</b><p class="process-desc">${escapeHtml(step.desc)}</p></div>`).join('')}
      </div>
    </div>
  </section>`
}

export function renderService(page) {
  const record = findService(page.slug)
  if (!record) throw new Error(`No service record for slug "${page.slug}"`)

  const sections = []
  if (record.photos?.length) sections.push(num => shotsSection(record, num))
  if (record.beforeAfters) sections.push(num => beforeAfterSection(record, num))
  if (record.benefits) sections.push(num => benefitsSection(record, num))
  if (record.versus) sections.push(num => versusSection(record, num))
  if (record.steps) sections.push(num => stepsSection(record, num))

  const body = sections.map((section, index) => section(String(index + 1).padStart(2, '0'))).join('\n')
  return [hero(record), body, svcOffer(record.offer)].join('\n')
}
