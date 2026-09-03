document.documentElement.setAttribute('data-js', 'true')

// Lead delivery endpoint. Interim: hosted on the aom-studio project, which holds the
// Resend key; flip back to '/api/lead' once RESEND_API_KEY is set on wolfpack-companies.
const LEAD_ENDPOINT = 'https://www.aheadofmarket.com/api/wolfpack-lead'

// High-intent CTA clicks (call, Google review) ping AOM for a same-hour heads-up.
// sendBeacon so the ping survives the navigation; server dedupes per visitor.
const CTA_ENDPOINT = 'https://www.aheadofmarket.com/api/wolfpack-cta'
document.addEventListener('click', event => {
  const el = event.target.closest ? event.target.closest('a') : null
  if (!el || !el.href) return
  let cta = null
  if (el.href.indexOf('tel:') === 0) cta = 'call'
  else if (el.href.indexOf('search.google.com/local/writereview') !== -1) cta = 'review'
  if (!cta) return
  const payload = JSON.stringify({ cta, page: location.pathname })
  try {
    if (!navigator.sendBeacon || !navigator.sendBeacon(CTA_ENDPOINT, new Blob([payload], { type: 'text/plain' }))) {
      fetch(CTA_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: payload, keepalive: true })
    }
  } catch { /* notification ping must never break the click */ }
}, true)

const themeKey = 'wp-v2-theme'
const savedTheme = (() => {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(themeKey) : null
  } catch {
    return null
  }
})()

if (savedTheme === 'dark' || savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

function updateThemeControl() {
  const light = document.documentElement.getAttribute?.('data-theme') === 'light'
  document.querySelectorAll?.('[data-theme-toggle]').forEach(button => {
    button.setAttribute('aria-pressed', String(light))
    button.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme')
  })
}

updateThemeControl()

let leadReturnFocus

function leadDialog() {
  return document.querySelector?.('#lead-dialog')
}

function showLeadPanel(step) {
  const dialog = leadDialog()
  if (!dialog) return
  dialog.querySelectorAll('[data-lead-panel]').forEach(panel => {
    panel.hidden = panel.getAttribute('data-lead-panel') !== String(step)
  })
  const progress = dialog.querySelector('[data-lead-progress]')
  if (progress) progress.style.width = `${step * 50}%`
}

function openLeadDialog(trigger) {
  const dialog = leadDialog()
  if (!dialog?.showModal || dialog.open) return
  leadReturnFocus = trigger
  const startedAt = dialog.querySelector('[name="startedAt"]')
  if (startedAt && !startedAt.value) startedAt.value = String(Date.now())
  showLeadPanel(0)
  const continueButton = dialog.querySelector('[data-lead-continue]')
  if (continueButton) continueButton.disabled = !dialog.querySelector('[name="need"]:checked')
  dialog.showModal()
  document.body?.classList.add('dialog-open')
  document.dispatchEvent(new CustomEvent('wolfpack:lead-open', { detail: { dialog } }))
}

function closeLeadDialog() {
  const dialog = leadDialog()
  if (dialog?.open) dialog.close()
}

document.addEventListener('click', event => {
  const menuButton = event.target.closest?.('.menu-button')
  if (menuButton) {
    const mobileNav = document.querySelector?.('#mobile-navigation')
    const open = menuButton.getAttribute('aria-expanded') !== 'true'
    menuButton.setAttribute('aria-expanded', String(open))
    if (mobileNav) mobileNav.hidden = !open
    return
  }

  const themeButton = event.target.closest?.('[data-theme-toggle]')
  if (themeButton) {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    try { window.localStorage.setItem(themeKey, next) } catch {}
    updateThemeControl()
    return
  }

  const leadTrigger = event.target.closest?.('[data-lead-open], a[href="#contact"]')
  if (leadTrigger) {
    event.preventDefault()
    const openMenuButton = document.querySelector?.('.menu-button[aria-expanded="true"]')
    if (openMenuButton) {
      openMenuButton.setAttribute('aria-expanded', 'false')
      const mobileNav = document.querySelector?.('#mobile-navigation')
      if (mobileNav) mobileNav.hidden = true
    }
    openLeadDialog(leadTrigger)
    return
  }

  if (event.target.closest?.('[data-lead-close]')) {
    closeLeadDialog()
    return
  }

  if (event.target.closest?.('[data-lead-continue]')) {
    if (leadDialog()?.querySelector('[name="need"]:checked')) {
      showLeadPanel(1)
      leadDialog()?.querySelector('[name="name"]')?.focus()
    }
    return
  }

  if (event.target.closest?.('[data-lead-back]')) {
    showLeadPanel(0)
    return
  }

  const dialog = leadDialog()
  if (event.target === dialog) closeLeadDialog()
})

document.addEventListener('change', event => {
  if (event.target?.name === 'need') {
    const continueButton = leadDialog()?.querySelector('[data-lead-continue]')
    if (continueButton) continueButton.disabled = false
  }
})

document.querySelectorAll?.('.service-menu').forEach(menu => {
  if (!window.matchMedia?.('(hover: hover)').matches) return
  menu.addEventListener('mouseenter', () => { menu.open = true })
  menu.addEventListener('mouseleave', () => { menu.open = false })
})

document.querySelector?.('[data-lead-form]')?.addEventListener('submit', async event => {
  event.preventDefault()
  const form = event.target
  const dialog = leadDialog()
  const status = form.querySelector('[data-lead-status]')
  const submit = form.querySelector('[type="submit"]')
  const fields = Object.fromEntries(new FormData(form))
  if (!String(fields.name || '').trim() || !String(fields.phone || '').trim()) {
    form.querySelector('[name="name"], [name="phone"]')?.reportValidity?.()
    return
  }
  if (status) { status.textContent = ''; status.removeAttribute('data-tone') }
  if (submit) submit.disabled = true
  try {
    const response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fields, sourcePage: location.pathname, startedAt: Number(fields.startedAt) })
    })
    if (!response.ok) throw new Error('delivery-failed')
    showLeadPanel(2)
    dialog?.querySelector('.lead-success')?.focus?.()
  } catch {
    if (status) {
      status.setAttribute('data-tone', 'error')
      status.textContent = 'That did not go through. Call 602-550-5452 or email Service@wolfpackcompanies.com and a person answers.'
    }
  } finally {
    if (submit) submit.disabled = false
  }
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || leadDialog()?.open) return
  const menuButton = document.querySelector?.('.menu-button[aria-expanded="true"]')
  const mobileNav = document.querySelector?.('#mobile-navigation')
  if (!menuButton || !mobileNav) return
  menuButton.setAttribute('aria-expanded', 'false')
  mobileNav.hidden = true
  menuButton.focus()
})

leadDialog()?.addEventListener('close', () => {
  document.body?.classList.remove('dialog-open')
  document.dispatchEvent(new CustomEvent('wolfpack:lead-close', { detail: { dialog: leadDialog() } }))
  leadReturnFocus?.focus?.()
  leadReturnFocus = undefined
})

const reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const loaderSeen = (() => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage?.getItem('wp-loader-seen')
  } catch {
    return false
  }
})()

const loader = document.querySelector?.('[data-loader]')
if (loader) {
  if (reducedMotion || loaderSeen) {
    loader.remove()
  } else {
    loader.hidden = false
    try { window.sessionStorage.setItem('wp-loader-seen', '1') } catch {}
    setTimeout(() => loader.remove(), 2600)
  }
}

document.querySelectorAll?.('[data-count-to]').forEach(el => {
  if (reducedMotion) return
  const target = Number(el.getAttribute('data-count-to'))
  const format = el.getAttribute('data-count-format')
  const render = value => {
    el.textContent = format === 'money' ? `$${value.toFixed(1)}M` : `${Math.round(value)}+`
  }
  const start = performance.now()
  const duration = 1400
  const tick = now => {
    const p = Math.min(1, (now - start) / duration)
    render(target * (1 - Math.pow(1 - p, 3)))
    if (p < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
})

const peekImage = document.querySelector?.('[data-svc-peek-image]')
if (peekImage) {
  const peekNum = document.querySelector('[data-svc-peek-num]')
  const peekName = document.querySelector('[data-svc-peek-name]')
  document.querySelectorAll('[data-svc-row]').forEach(row => {
    row.addEventListener('mouseenter', () => {
      peekImage.src = row.getAttribute('data-svc-image')
      peekImage.alt = row.getAttribute('data-svc-name')
      if (peekNum) peekNum.textContent = row.getAttribute('data-svc-num')
      if (peekName) peekName.textContent = row.getAttribute('data-svc-name')
    })
  })
}

const quoteSlides = [...(document.querySelectorAll?.('[data-quote-slide]') || [])]
if (quoteSlides.length) {
  const quotePhotos = [...document.querySelectorAll('[data-quote-photo]')]
  const quoteCount = document.querySelector('[data-quote-count]')
  let quoteIndex = 0
  const pad = value => String(value + 1).padStart(2, '0')
  const showQuote = index => {
    quoteIndex = (index + quoteSlides.length) % quoteSlides.length
    quoteSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === quoteIndex))
    quotePhotos.forEach((photo, i) => photo.classList.toggle('is-active', i === quoteIndex))
    if (quoteCount) quoteCount.textContent = `${pad(quoteIndex)} / ${String(quoteSlides.length).padStart(2, '0')}`
  }
  document.querySelector('[data-quote-prev]')?.addEventListener('click', () => showQuote(quoteIndex - 1))
  document.querySelector('[data-quote-next]')?.addEventListener('click', () => showQuote(quoteIndex + 1))
}
