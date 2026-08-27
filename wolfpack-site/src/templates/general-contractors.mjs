// General Contractors page (kind 'general-contractors') — layout from the
// approved "General Contractors.dc.html" comp (design-v2-2026-08-27);
// project data verbatim from the live
// public/wolfpack-site/general-contractors/index.html. Photo-to-project
// pairings follow the comp's mapping of src/assets/gc/*.jpg.
import { asset, escapeHtml } from '../lib/html.mjs'
import { svcHeroTitle, svcIcon } from './service.mjs'

const stats = [
  { value: '$5.5M+', label: 'Completed Contracts', blue: false },
  { value: '12', label: 'Major Projects', blue: true },
  { value: '7+', label: 'Years in the Valley', blue: false },
  { value: '148', label: 'Hotel Units (Largest)', blue: false },
]

const projects = [
  {
    img: 'gc/target.jpg', tag: 'Retail', name: 'Target Corporation Remodels',
    addr: 'Phoenix · Surprise · Peoria · Mesa · Christown',
    gc: 'Engineered Structures Inc', when: 'April 2022 – December 2023',
    scope: '5 existing Target full remodels. All restrooms, deli, cold/freezer cases, new Starbucks.',
  },
  {
    img: 'gc/candlewood-suites.jpg', tag: 'Hotel', name: 'Candlewood Suites Hotel',
    addr: '1744 S Crismon Rd, Mesa, AZ 85209',
    gc: 'Overland Construction', when: 'October 2023 – Ongoing', bond: 'Bonded project',
    scope: '104-unit hotel, all suites, ground up build, wood framed.',
  },
  {
    img: 'gc/edison-midtown.jpg', tag: 'Luxury Condos', name: 'Edison Midtown Phase II',
    addr: '3131 N Central Ave, Phoenix, AZ 85012',
    gc: 'Ameris Construction, LLC', when: 'October 2023 – May 2024',
    scope: '60-unit luxury condos, podium construction, wood framed.',
  },
  {
    img: 'gc/la-quinta.jpg', tag: 'Hotel', name: 'La Quinta Hotel',
    addr: '9050 W McDowell Rd, Phoenix, AZ 85037',
    gc: 'Troon Enterprises', when: 'May 2023 – Ongoing',
    scope: '95-unit hotel, ground up build, wood framed.',
  },
  {
    img: 'gc/home2-suites.jpg', tag: 'Hotel', name: 'Home2 Suites by Hilton',
    addr: '141 E Jackson St, Phoenix, AZ 85004',
    gc: 'Ram Construction AZ', when: 'August 2022 – October 2023',
    scope: '148-unit hotel, all suites, metal framed. Labor only contract.',
  },
  {
    img: 'gc/ritz-carlton.jpg', tag: 'Resort', name: 'Ritz-Carlton Paradise Valley',
    addr: '7000 E Lincoln Dr, Paradise Valley, AZ 85253',
    gc: 'VKW Construction, LLC', when: 'October 2024 – January 2025',
    scope: 'Canyon restrooms install and trim.',
  },
  {
    img: 'gc/westin-kierland.jpg', tag: 'Resort', name: 'The Westin Kierland Resort',
    addr: '6902 E Greenway Pkwy, Scottsdale, AZ 85254',
    gc: 'G4 Builders, LLC', when: 'October 2024 – December 2024',
    scope: 'Dreamweaver Bar renovation.',
  },
  {
    img: 'gc/trellis-colter.jpg', tag: 'Residential', name: 'Trellis @ Colter',
    addr: '1617 W Colter St, Phoenix, AZ 85015',
    gc: 'H&B Builders', when: 'August 2021 – January 2022',
    scope: '10-unit, 3 story townhomes, ground up construction, wood framed.',
  },
  {
    img: 'gc/impact-ortho.jpg', tag: 'Medical', name: 'Impact Ortho Training Center',
    addr: '6400 E McDowell Rd, Scottsdale, AZ 85257',
    gc: 'Tepcon Construction Inc.', when: 'July 2023 – February 2024',
    scope: 'TI of shell building for new medical training facility.',
  },
  {
    img: 'gc/holiday-inn.jpg', tag: 'Hotel', name: 'Holiday Inn',
    addr: '3131 N Scottsdale Rd, Scottsdale, AZ 85257',
    gc: 'Hotel Rehabs', when: 'June 2025 – August 2025',
    scope: 'Hotel renovation and plumbing.',
  },
  {
    img: 'gc/beatitudes.jpg', tag: 'Commercial', name: 'Beatitudes Boilers & Storage Tanks',
    addr: '1610 W Glendale Ave, Phoenix, AZ 85021',
    when: 'October 2024 – December 2024',
    scope: 'Boiler and storage tank installation for senior living campus.',
  },
  {
    img: 'gc/chromalloy.jpg', tag: 'Industrial', name: 'Chromalloy',
    addr: 'Buckeye Area, AZ',
    gc: 'Wolfpack Companies',
    scope: 'Replacement of (2) 250hp air compressors and (1) 75hp compressor. (2) desiccant air dryers and 1600-gallon tank.',
  },
]

function metaRow(label, value) {
  if (!value) return ''
  return `<span class="gc-proj-meta"><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`
}

function hero() {
  return `<section class="gc-hero">
    <div class="wrap">
      <p class="svc2-eyebrow">General Contracting Portfolio</p>
      ${svcHeroTitle([
        { text: 'Completed projects' },
        { text: 'over ', accent: '$100,000.' },
      ])}
      <div class="svc2-hero-row">
        <p class="svc2-hero-sub gc-hero-sub">Hotels, luxury condos, retail remodels, medical facilities. The same crews, licensing, and documentation that stand behind the plumbing.</p>
        <div class="svc2-hero-ctas">
          <a class="btn-blue" href="#contact">Tell us about your project${svcIcon('arrow', 'btn-icon')}</a>
          <a class="btn-ghost" href="tel:6025505452">602-550-5452 / Call now</a>
        </div>
      </div>
      <div class="gc-stats">
        ${stats.map(stat => `<div class="gc-stat">
          <div class="gc-stat-value${stat.blue ? ' gc-stat-blue' : ''}">${escapeHtml(stat.value)}</div>
          <div class="gc-stat-label">${escapeHtml(stat.label)}</div>
        </div>`).join('')}
      </div>
    </div>
  </section>`
}

function projectsSection() {
  return `<section class="svc2-section">
    <div class="wrap">
      <div class="section-head"><span class="section-num">01</span><h2 class="section-title">Hotels. Condos. Retail. Medical.<br><span class="dim">Done right.</span></h2></div>
      <div class="gc-grid">
        ${projects.map(project => `<article class="gc-proj">
          <div class="gc-proj-media">
            <img src="${asset(project.img)}" alt="${escapeHtml(project.name)}" loading="lazy">
            <span class="gc-proj-tag">${escapeHtml(project.tag)}</span>
          </div>
          <div class="gc-proj-body">
            <h3 class="gc-proj-name">${escapeHtml(project.name)}</h3>
            <p class="gc-proj-addr">${escapeHtml(project.addr)}</p>
            <div class="gc-proj-rows">
              ${metaRow('GC', project.gc)}
              ${metaRow('When', project.when)}
              ${metaRow('Bond', project.bond)}
            </div>
            <p class="gc-proj-scope">${escapeHtml(project.scope)}</p>
          </div>
        </article>`).join('')}
      </div>
    </div>
  </section>`
}

function offerSection() {
  return `<section class="svc2-offer">
    <img class="svc2-offer-wm" src="${asset('brand/wolfpack-icon-knockout.png')}" alt="" aria-hidden="true">
    <div class="wrap svc2-offer-inner">
      <h2 class="svc2-offer-title">Bring Wolfpack onto<br>your next project.</h2>
      <p class="gc-offer-sub">Licensed, bonded, insured. AZ ROC #326629. We scope it, quote it, and show up.</p>
      <div class="svc2-offer-ctas">
        <a class="btn-ink" href="#contact">Tell us about your project${svcIcon('arrow', 'btn-icon')}</a>
        <a class="btn-white" href="tel:6025505452">602-550-5452</a>
      </div>
    </div>
  </section>`
}

export function renderGeneralContractors() {
  return [hero(), projectsSection(), offerSection()].join('\n')
}
