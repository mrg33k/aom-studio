import { asset, escapeHtml } from '../lib/html.mjs'

const sectionIcons = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  jet: '<path d="M3 12h7"/><path d="m10 8.5 6 3.5-6 3.5Z"/><path d="M18 7.5 21 6M18 12h3M18 16.5 21 18"/>',
  camera: '<circle cx="11" cy="11" r="6"/><circle cx="11" cy="11" r="2.2"/><path d="m15.5 15.5 5 5"/>',
  building: '<path d="M3.5 20.5h17M5.5 20.5V4.5h9v16M14.5 9.5h4v11"/><path d="M8 8h3.5M8 11.5h3.5M8 15h3.5"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="15" rx="1.5"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/><path d="m9 14 2 2 4-4"/>',
  valve: '<circle cx="12" cy="12" r="4"/><path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5"/>',
  boiler: '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M9.5 8h5M9.5 12h5"/><path d="M12 15.5v2.5"/>',
  slab: '<path d="M3 15.5h18"/><path d="M6 15.5V9M18 15.5V9"/><path d="M9 20.5c1-2.5 2-4 3-4s2 1.5 3 4"/><path d="M12 3.5v4"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5.2l3.2 2"/>',
}

function icon(name, className = 'svc-icon') {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${sectionIcons[name]}</svg>`
}

const homeServices = [
  ['hydro-jetting', 'Hydro jetting', 'High-pressure jetting clears grease, roots, scale and debris from any commercial line.', 'work/02-hydro-jetting-b.jpg', 'jet'],
  ['drain-cleaning', 'Drain cleaning & camera', 'Clear blockages and inspect every inch with high-definition video.', 'work/05-drain-camera-a.jpg', 'camera'],
  ['air-compressor', 'Air compressor installation', 'Commercial and industrial compressor systems, sized and installed.', 'work/08-air-compressor-a.jpg', 'building'],
  ['property-managers', 'Maintenance contracts', 'Prevent problems. Protect your buildings.', 'work/10-maintenance-a.jpg', 'calendar'],
  ['backflow-testing', 'Backflow testing', 'Certified testing and repair to keep you compliant.', 'work/12-backflow-a.jpg', 'valve'],
  ['water-heaters', 'Water heaters & boilers', 'Installation, repair and routine maintenance.', 'work/14-water-heater-a.jpg', 'boiler'],
  ['leak-detection', 'Under-slab leak detection', 'Non-invasive leak location to protect your assets.', 'work/17-leak-detection-a.jpg', 'slab'],
  ['emergency', '24/7 emergency', 'Day or night, we are ready when you need us.', 'work/20-emergency-b.jpg', 'clock'],
]

const quotes = [
  {
    name: 'The Ritz Carlton', where: 'Paradise Valley', img: 'gc/ritz-carlton.jpg', cite: 'Larry Cota, VKW',
    text: 'They are always punctual, offer on-demand service, and have boundless knowledge of the plumbing trade.',
  },
  {
    name: 'Target', where: 'Multiple remodels', img: 'gc/target.jpg', cite: 'Jennifer Goode, ESI',
    text: 'Wolfpack has successfully completed multiple Target remodels. We appreciate the quality of their work as well as the timeliness, attention to safety, and professionalism they bring to our projects.',
  },
  {
    name: 'Edison Midtown', where: 'Seven floors', img: 'gc/edison-midtown.jpg', cite: 'J.R. Reeter, Ameris Inc.',
    text: 'Wolfpack has become an integral part of our team, managing the plumbing needs across all seven floors of Edison Midtown.',
  },
]

function loader() {
  return `<div class="brand-loader" data-loader hidden aria-hidden="true">
    <i class="brand-loader-blue"></i>
    <i class="brand-loader-white"></i>
    <span class="brand-loader-art">
      <img class="brand-loader-mark" src="${asset('loader-mark.png')}" alt="">
      <img class="brand-loader-word" src="${asset('loader-word.png')}" alt="">
    </span>
  </div>`
}

function hero() {
  return `<section class="home-hero">
    <img class="home-hero-photo" src="${asset('work/01-hydro-jetting-v2-brand.jpg')}" alt="Wolfpack crew jetting a commercial line" fetchpriority="high">
    <div class="home-hero-shade" aria-hidden="true"></div>
    <img class="home-hero-wm home-hero-wm-k" src="${asset('brand/wolfpack-icon-knockout.png')}" alt="" aria-hidden="true">
    <img class="home-hero-wm home-hero-wm-b" src="${asset('brand/wolfpack-icon-knockout.png')}" alt="" aria-hidden="true">
    <div class="home-hero-inner wrap">
      <h1 class="home-hero-title"><span>Hydro jetting</span><span>dominates clogs.</span><span><em class="stroke">Experience</em> <em class="fill">clears</em></span><span class="fill">the rest.</span></h1>
      <div class="home-hero-row">
        <p class="home-hero-sub">Drain and sewer jetting for property managers running more than one building. 24/7 emergency response.</p>
        <div class="home-hero-ctas">
          <a class="btn-blue" href="#contact">Request a walkthrough${icon('arrow', 'btn-icon')}</a>
          <a class="btn-ghost" href="tel:6025505452">24/7 &middot; Call now</a>
        </div>
      </div>
      <div class="home-stats">
        <div class="home-stat"><span class="home-stat-value"><b data-count-to="5.5" data-count-format="money">$5.5M</b><i>+</i></span><span class="home-stat-label">Completed contracts</span></div>
        <div class="home-stat"><span class="home-stat-value home-stat-blue"><b>24/7</b></span><span class="home-stat-label">Emergency response</span></div>
        <div class="home-stat"><span class="home-stat-value"><b data-count-to="15" data-count-format="plus">15+</b></span><span class="home-stat-label">Cities served</span></div>
        <div class="home-stat"><span class="home-stat-value"><i class="home-stat-roc">ROC</i><b>326629</b></span><span class="home-stat-label">Arizona licensed contractor</span></div>
      </div>
    </div>
  </section>`
}

function marqueeGroup(hidden) {
  const names = ['Target', 'The Ritz Carlton', 'Edison Midtown']
  const run = `<span class="marquee-label">Trusted by</span>${names.map(name => `<span class="marquee-name">${name}</span><span class="marquee-star" aria-hidden="true">&#10022;</span>`).join('')}`
  return `<div class="marquee-group"${hidden ? ' aria-hidden="true"' : ''}>${run}${run}</div>`
}

function marquee() {
  return `<div class="client-marquee"><div class="marquee-track">${marqueeGroup(false)}${marqueeGroup(true)}</div></div>`
}

function servicesSection() {
  const first = homeServices[0]
  return `<section id="services" class="home-services-band">
    <div class="wrap">
      <div class="section-head"><h2 class="section-title">Every line. One contractor.<br><span class="dim">One invoice.</span></h2></div>
      <div class="home-services">
        <div class="svc-list">
          ${homeServices.map(([slug, name, desc, img, iconName], index) => `<a class="svc-row" href="/${slug}/" data-svc-row data-svc-image="${asset(img)}" data-svc-name="${escapeHtml(name)}">
            ${icon(iconName)}
            <span class="svc-copy"><span class="svc-name">${escapeHtml(name)}</span><span class="svc-desc">${escapeHtml(desc)}</span></span>
          </a>`).join('')}
        </div>
        <div class="svc-peek">
          <div class="svc-peek-frame">
            <img data-svc-peek-image src="${asset(first[3])}" alt="" loading="lazy">
            <div class="svc-peek-caption"><span class="svc-peek-name" data-svc-peek-name>${escapeHtml(first[1])}</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>`
}

function quoteSection() {
  return `<section id="proof" class="home-proof">
    <div class="wrap">
      <div class="section-head"><span class="section-label">What clients say</span></div>
      <div class="quote-layout">
        <div class="quote-media">
          ${quotes.map((quote, index) => `<figure class="quote-photo${index === 0 ? ' is-active' : ''}" data-quote-photo><img src="${asset(quote.img)}" alt="${escapeHtml(quote.name)}" loading="lazy"><figcaption class="quote-where">${escapeHtml(quote.where)}</figcaption></figure>`).join('')}
        </div>
        <div class="quote-body">
          ${quotes.map((quote, index) => `<div class="quote-slide${index === 0 ? ' is-active' : ''}" data-quote-slide>
            <h3 class="quote-name">${escapeHtml(quote.name)}</h3>
            <blockquote class="quote-text">&ldquo;${escapeHtml(quote.text)}&rdquo;</blockquote>
            <p class="quote-cite">${escapeHtml(quote.cite)}</p>
          </div>`).join('')}
          <div class="quote-controls">
            <button class="quote-arrow quote-arrow-prev" type="button" data-quote-prev aria-label="Previous testimonial">${icon('arrow', 'quote-arrow-icon')}</button>
            <button class="quote-arrow" type="button" data-quote-next aria-label="Next testimonial">${icon('arrow', 'quote-arrow-icon')}</button>
          </div>
        </div>
      </div>
    </div>
  </section>`
}

function workSection() {
  const figures = [
    ['work/01-hydro-jetting-a.jpg', 'Crew jetting a commercial cleanout', '001', 'Commercial cleanout', 'Phoenix', 'work-fig-main'],
    ['work/04-hydro-jetting-d.jpg', 'Jetter unit on site', '002', 'Jetter unit', 'Phoenix', ''],
    ['work/19-emergency-a.jpg', 'Emergency response at night', '003', 'Nozzle at work', 'In the line', ''],
  ]
  return `<section id="work" class="home-work">
    <div class="wrap">
      <div class="section-head section-head-split">
        <div class="section-head"><h2 class="section-title">Real jobs.<br><span class="dim">Real results.</span></h2></div>
        <p class="section-side">Every job closes with camera verification and a documented report.</p>
      </div>
      <div class="work-grid">
        ${figures.map(([img, alt, num, label, place, extra]) => `<figure class="work-fig ${extra}">
          <img src="${asset(img)}" alt="${escapeHtml(alt)}" loading="lazy">
          <figcaption class="work-caption"><span class="work-label">${escapeHtml(label)}</span><span class="work-place">${escapeHtml(place)}</span></figcaption>
        </figure>`).join('')}
      </div>
      <div class="before-after">
        <div class="ba-copy">
          <p class="ba-eyebrow">Before / After</p>
          <h3 class="ba-title">Cast iron main, scoured back to bare wall</h3>
          <p class="ba-desc">Decades of grease and scale, cleared by 4,000 PSI jetting &mdash; verified on camera before we leave the site.</p>
        </div>
        <div class="ba-pair">
          <figure class="ba-fig"><span class="ba-tag ba-tag-before">Before</span><img src="${asset('pipe-castiron-before.jpg')}" alt="Cast iron pipe before hydro jetting" loading="lazy"></figure>
          <figure class="ba-fig"><span class="ba-tag ba-tag-after">After</span><img src="${asset('pipe-castiron-after.jpg')}" alt="Cast iron pipe after hydro jetting" loading="lazy"></figure>
        </div>
      </div>
    </div>
  </section>`
}

function processSection() {
  const steps = [
    ['01', 'You call', 'We answer 24/7. Emergency or scheduled, we book the walkthrough.'],
    ['02', 'We camera', 'HD video inspection identifies the real problem before any work starts.'],
    ['03', 'We clear', 'High-pressure hydro jetting restores full flow. No guesswork.'],
    ['04', 'We report', 'Camera verification plus a documented report for your records.'],
  ]
  return `<section id="process" class="home-process">
    <div class="wrap">
      <div class="section-head"><h2 class="section-title">How we get it done</h2></div>
      <div class="process-grid">
        ${steps.map(([num, title, desc]) => `<div class="process-step"><span class="process-num">${num}</span><b class="process-title">${escapeHtml(title)}</b><p class="process-desc">${escapeHtml(desc)}</p></div>`).join('')}
      </div>
    </div>
  </section>`
}

function offerSection() {
  return `<section class="home-offer">
    <img class="home-offer-wm" src="${asset('brand/wolfpack-icon-knockout.png')}" alt="" aria-hidden="true">
    <div class="wrap home-offer-inner">
      <h2 class="home-offer-title">One contact<br>for every address<br>you manage.</h2>
      <div class="home-offer-ctas">
        <a class="btn-ink" href="#contact">Request a site walkthrough${icon('arrow', 'btn-icon')}</a>
        <a class="btn-white" href="tel:6025505452">602-550-5452</a>
      </div>
    </div>
  </section>`
}

export function renderHome() {
  return [loader(), hero(), marquee(), servicesSection(), quoteSection(), workSection(), processSection(), offerSection()].join('\n')
}
