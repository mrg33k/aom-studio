// Property Managers page (kind 'property-managers') — layout from the approved
// "Property Managers.dc.html" comp (design-v2-2026-08-27); copy verbatim from
// the live public/wolfpack-site/property-managers/index.html.
import { asset, escapeHtml } from '../lib/html.mjs'
import { svcHeroTitle, svcOffer } from './service.mjs'

const iconPaths = {
  alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>',
  chart: '<path d="M4 20.5h16"/><rect x="6" y="12" width="3" height="6"/><rect x="11" y="8" width="3" height="10"/><rect x="16" y="14" width="3" height="4"/>',
  hardhat: '<path d="M3.5 17.5h17"/><path d="M6 17.5v-3a6 6 0 0 1 12 0v3"/><path d="M10 9V5.5h4V9"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
}

function icon(name, className) {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`
}

function sectionHead(num, titleHtml) {
  return `<div class="section-head"><span class="section-num">${num}</span><h2 class="section-title">${titleHtml}</h2></div>`
}

const problems = [
  ['alert', 'A tenant is complaining right now'],
  ['doc', 'You are chasing a vendor for paperwork'],
  ['chart', 'The budget is unpredictable'],
  ['hardhat', 'Every building has a different guy'],
]

const promises = [
  { value: '24/7', blue: true, label: 'Live answer', desc: 'We answer the phone, day or night.' },
  { value: '3 Hr', blue: false, label: 'On-site response', desc: 'On site within 3 hours for contracted properties.' },
  { value: '5.0', blue: false, label: 'Google rating', desc: 'Rated 5.0 by the property managers we serve.' },
]

const checks = [
  ['Certificate of insurance', 'Same day'],
  ['Additional insured endorsement', 'Same day'],
  ['W-9', 'On request'],
  ['AZ ROC license', '#326629'],
  ['OSHA certification', 'Current'],
  ['Bond', 'Active'],
]

const steps = [
  ['Walkthrough', 'We walk every address in the portfolio and log what is actually there.'],
  ['One agreement', 'One contract covers the estate. No re-quoting building by building.'],
  ['Scheduled service', 'Cadence set per address from real volume, not a blanket rule.'],
  ['Documentation per address', 'Every visit documented against the property for inspection and audit.'],
]

function hero() {
  return `<section class="svc2-hero">
    <img class="svc2-hero-photo" src="${asset('work/10-maintenance-a.jpg')}" alt="Wolfpack walking a property with a facility manager" fetchpriority="high">
    <div class="svc2-hero-shade" aria-hidden="true"></div>
    <div class="svc2-hero-inner wrap">
      <p class="svc2-eyebrow">For property &amp; facility managers</p>
      ${svcHeroTitle([
        { text: 'You manage' },
        { text: 'multiple buildings.' },
        { text: 'You should manage' },
        { accent: 'one plumber.' },
      ])}
      <div class="svc2-hero-row">
        <p class="svc2-hero-sub">One point of contact for the whole portfolio. Insurance paperwork without the chase. Documentation per address.</p>
        <div class="svc2-hero-ctas">
          <a class="btn-blue" href="tel:6025505452">602-550-5452 / Call now</a>
          <a class="btn-ghost" href="#compliance">See the compliance pack</a>
        </div>
      </div>
    </div>
  </section>`
}

function problemsSection() {
  return `<section class="svc2-section">
    <div class="wrap">
      ${sectionHead('01', 'The problem is rarely<br><span class="dim">the plumbing.</span>')}
      <div class="pm-grid">
        ${problems.map(([iconName, title]) => `<div class="pm-card">
          ${icon(iconName, 'pm-icon')}
          <b class="pm-card-title">${escapeHtml(title)}</b>
        </div>`).join('')}
      </div>
    </div>
  </section>`
}

function promiseSection() {
  return `<section class="svc2-section svc2-band">
    <div class="wrap">
      ${sectionHead('02', 'A promise with a number on it.')}
      <div class="pm-stats">
        ${promises.map(stat => `<div class="pm-stat">
          <div class="pm-stat-value${stat.blue ? ' pm-stat-blue' : ''}">${escapeHtml(stat.value)}</div>
          <b class="pm-stat-label">${escapeHtml(stat.label)}</b>
          <p class="pm-stat-desc">${escapeHtml(stat.desc)}</p>
        </div>`).join('')}
      </div>
    </div>
  </section>`
}

function complianceSection() {
  return `<section id="compliance" class="svc2-section">
    <div class="wrap pm-comp">
      <div class="pm-comp-media">
        <img src="${asset('work/13-backflow-b.jpg')}" alt="Wolfpack technician documenting a compliance test" loading="lazy">
      </div>
      <div>
        <div class="section-head"><span class="section-num">03</span><h2 class="section-title pm-comp-title">The endorsement is the part everyone gets wrong.</h2></div>
        <div class="pm-checks">
          ${checks.map(([name, when]) => `<div class="pm-check">
            ${icon('check', 'pm-check-icon')}
            <span><b class="pm-check-name">${escapeHtml(name)}</b><span class="pm-check-when">${escapeHtml(when)}</span></span>
          </div>`).join('')}
        </div>
      </div>
    </div>
  </section>`
}

function howSection() {
  return `<section class="svc2-section svc2-band">
    <div class="wrap">
      ${sectionHead('04', 'One contact. Every address.')}
      <div class="process-grid svc2-steps-grid">
        ${steps.map(([title, desc], index) => `<div class="process-step"><span class="process-num">${String(index + 1).padStart(2, '0')}</span><b class="process-title">${escapeHtml(title)}</b><p class="process-desc">${escapeHtml(desc)}</p></div>`).join('')}
      </div>
    </div>
  </section>`
}

export function renderPropertyManagers() {
  return [
    hero(),
    problemsSection(),
    promiseSection(),
    complianceSection(),
    howSection(),
    svcOffer({ lines: ['Request a site', 'walkthrough.'], cta: 'Start the walkthrough' }),
  ].join('\n')
}
