// Contact page (kind 'contact') — no design comp exists; built from the site's
// own design language. Copy is verbatim from the live
// public/wolfpack-site/contact/index.html, and the request form reuses the
// contact drawer's content structure (need options + name/company/phone)
// inline, posting to /api/lead with the same honeypot and timing fields.
import { escapeHtml } from '../lib/html.mjs'
import { cities } from '../data/cities.mjs'
import { svcHeroTitle, svcIcon } from './service.mjs'

const iconPaths = {
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-10.4a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10.4" r="2.4"/>',
  doc: '<path d="M6 3.5h8l4 4v13H6Z"/><path d="M14 3.5v4h4"/><path d="M9 12h6M9 15.5h6"/>',
  building: '<path d="M3.5 20.5h17M5.5 20.5V4.5h9v16M14.5 9.5h4v11"/><path d="M8 8h3.5M8 11.5h3.5M8 15h3.5"/>',
  alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  camera: '<circle cx="11" cy="11" r="6"/><circle cx="11" cy="11" r="2.2"/><path d="m15.5 15.5 5 5"/>',
  jet: '<path d="M3 12h7"/><path d="m10 8.5 6 3.5-6 3.5Z"/><path d="M18 7.5 21 6M18 12h3M18 16.5 21 18"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
}

function icon(name, className) {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name]}</svg>`
}

const ways = [
  ['phone', 'Emergency', '602-550-5452 · Live answer, 24 hours.', 'tel:6025505452'],
  ['mail', 'Email', 'Service@wolfpackcompanies.com · We reply the same business day.', 'mailto:Service@wolfpackcompanies.com'],
  ['pin', 'Service area', 'Greater Phoenix · Statewide on request.', '#area'],
  ['doc', 'Compliance documents', 'COI & additional insured · Same day.', '/property-managers/#compliance'],
]

const needOptions = [
  ['building', 'New Install', 'Ground-up or tenant improvement'],
  ['alert', 'A line is down', 'Emergency, need someone now'],
  ['camera', 'Request a Walkthrough', 'Come see the property first'],
  ['jet', 'We need service', 'Repair, maintenance, or jetting'],
  ['building', 'I manage multiple properties', 'Portfolio contract discussion'],
  ['doc', 'Something else', 'Tell us what you need'],
]

function hero() {
  return `<section class="cpage-hero">
    <div class="wrap">
      <p class="svc2-eyebrow">Contact</p>
      ${svcHeroTitle([
        { text: 'Line backed up?' },
        { text: 'Call. ', accent: 'We answer.' },
      ])}
      <div class="svc2-hero-row">
        <p class="svc2-hero-sub">24/7 emergency service across the Valley. For portfolio contracts, request a walkthrough.</p>
        <div class="svc2-hero-ctas">
          <a class="btn-blue" href="#request">Request a walkthrough${svcIcon('arrow', 'btn-icon')}</a>
          <a class="btn-ghost" href="tel:6025505452">602-550-5452 / Call now</a>
        </div>
      </div>
    </div>
  </section>`
}

function waysSection() {
  return `<section class="svc2-section">
    <div class="wrap">
      <div class="section-head"><h2 class="section-title">Two ways in.<br><span class="dim">Pick the fast one.</span></h2></div>
      <div class="cpage-ways">
        ${ways.map(([iconName, title, desc, href]) => `<a class="cpage-way" href="${href}">
          ${icon(iconName, 'cpage-way-icon')}
          <span class="cpage-way-copy"><b class="cpage-way-title">${escapeHtml(title)}</b><span class="cpage-way-desc">${escapeHtml(desc)}</span></span>
        </a>`).join('')}
      </div>
    </div>
  </section>`
}

function requestSection() {
  return `<section id="request" class="svc2-section svc2-band">
    <div class="wrap">
      <div class="section-head"><h2 class="section-title">What can we<br><span class="dim">do for you?</span></h2></div>
      <p class="cpage-form-sub">Three fields. We come back same business day.</p>
      <form class="lead-form cpage-form" id="cpage-lead-form" method="post" action="/api/lead" data-lead-form>
        <input type="hidden" name="sourcePage" value="/contact/">
        <input type="hidden" name="startedAt" value="">
        <div class="honeypot" aria-hidden="true"><label for="cpage-website">Website</label><input id="cpage-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
        <div class="cpage-form-grid">
          <fieldset class="need-grid cpage-need-grid">
            <legend>Choose what you need</legend>
            ${needOptions.map(([iconName, label, detail]) => `<label class="need-option">
              <input type="radio" name="need" value="${escapeHtml(label)}" required>
              ${icon(iconName, 'need-icon')}
              <span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail)}</small></span>
            </label>`).join('')}
          </fieldset>
          <div class="cpage-fields">
            <div class="contact-fields">
              <label>Name<input type="text" name="name" autocomplete="name" required></label>
              <label>Company<input type="text" name="company" autocomplete="organization"></label>
              <label>Phone<input type="tel" name="phone" autocomplete="tel" required></label>
            </div>
            <button class="lead-submit cpage-submit" type="submit">Send request</button>
            <p class="form-status" data-lead-status role="status" aria-live="polite"></p>
            <p class="form-fallback">If the line will not wait, call <a href="tel:6025505452">602-550-5452</a>.</p>
          </div>
        </div>
      </form>
      <div class="cpage-success" data-cpage-success hidden tabindex="-1">
        <div class="lead-success-mark"><svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths.check}</svg></div>
        <p class="cpage-success-title">Got it.</p>
        <p class="cpage-success-sub">We come back the same business day. If the line will not wait, call <a href="tel:6025505452"><strong>602-550-5452</strong></a> and a person answers.</p>
      </div>
    </div>
  </section>
  ${formScript()}`
}

// The shared site.js binds its submit handler to the FIRST [data-lead-form] in
// the document. On this page that would be the inline form, which would leave
// the site-wide contact drawer without a handler. So: strip the attribute
// before the deferred site.js runs (keeping the drawer bound), then after
// site.js has executed, restore the attribute and bind the same /api/lead
// submit behavior (JSON post, honeypot passthrough, honest success and error
// states) to the inline form.
function formScript() {
  return `<script>
(() => {
  const form = document.getElementById('cpage-lead-form')
  if (!form) return
  form.removeAttribute('data-lead-form')
  document.addEventListener('DOMContentLoaded', () => {
    form.setAttribute('data-lead-form', '')
    const startedAt = form.querySelector('[name="startedAt"]')
    if (startedAt && !startedAt.value) startedAt.value = String(Date.now())
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (!form.reportValidity()) return
      const status = form.querySelector('[data-lead-status]')
      const submit = form.querySelector('[type="submit"]')
      const fields = Object.fromEntries(new FormData(form))
      if (status) { status.textContent = ''; status.removeAttribute('data-tone') }
      if (submit) submit.disabled = true
      try {
        const response = await fetch('https://www.aheadofmarket.com/api/wolfpack-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...fields, sourcePage: location.pathname, startedAt: Number(fields.startedAt) })
        })
        if (!response.ok) throw new Error('delivery-failed')
        form.hidden = true
        const success = document.querySelector('[data-cpage-success]')
        if (success) { success.hidden = false; success.focus() }
      } catch {
        if (status) {
          status.setAttribute('data-tone', 'error')
          status.textContent = 'That did not go through. Call 602-550-5452 or email Service@wolfpackcompanies.com and a person answers.'
        }
      } finally {
        if (submit) submit.disabled = false
      }
    })
  })
})()
</script>`
}

function areaSection() {
  return `<section id="area" class="svc2-section">
    <div class="wrap">
      <div class="section-head"><h2 class="section-title">Across Greater Phoenix.<br><span class="dim">Statewide on request.</span></h2></div>
      <div class="city-chips">
        ${cities.map(city => `<a class="city-chip" href="/${city.slug}/">${escapeHtml(city.name)}</a>`).join('')}
      </div>
      <p class="city-lead">From Apache Junction to Litchfield Park, and most of Arizona on request.</p>
    </div>
  </section>`
}

export function renderContact() {
  return [hero(), waysSection(), requestSection(), areaSection()].join('\n')
}
