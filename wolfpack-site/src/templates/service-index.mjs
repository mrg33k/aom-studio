import { asset, escapeHtml } from '../lib/html.mjs'
import { serviceIndex } from '../data/services.mjs'
import { svcHeroTitle, svcIcon, svcOffer } from './service.mjs'

function intro() {
  return `<section class="svc2-index-hero">
    <div class="wrap">
      <p class="svc2-eyebrow">${escapeHtml(serviceIndex.eyebrow)}</p>
      ${svcHeroTitle(serviceIndex.heroLines)}
      <p class="svc2-index-sub">${escapeHtml(serviceIndex.heroSub)}</p>
    </div>
  </section>`
}

function cardGrid() {
  const cards = serviceIndex.cards.map((card, index) => `<a class="svc2-card" href="${card.href}">
    <span class="svc2-card-media"><img src="${asset(card.image)}" alt="" loading="${index < 2 ? 'eager' : 'lazy'}"></span>
    <span class="svc2-card-body">
      <span class="svc2-card-head"><span class="svc2-card-num">${String(index + 1).padStart(2, '0')}</span><b class="svc2-card-name">${escapeHtml(card.name)}</b></span>
      <span class="svc2-card-desc">${escapeHtml(card.desc)}</span>
      <span class="svc2-card-more">View service${svcIcon('arrow', 'svc2-card-arrow')}</span>
    </span>
  </a>`).join('')

  return `<section class="svc2-index-grid-band">
    <div class="wrap">
      <div class="svc2-card-grid">${cards}</div>
    </div>
  </section>`
}

export function renderServiceIndex() {
  return [intro(), cardGrid(), svcOffer(serviceIndex.offer)].join('\n')
}
