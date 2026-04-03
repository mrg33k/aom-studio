/**
 * AOM Visitor Tracker
 * Drop-in script for any site. Tracks visitors, identifies companies,
 * captures identity on form submissions.
 *
 * Usage: <script src="/aom-tracker.js" data-site="ambition" data-endpoint="https://ambition-teal.vercel.app/api/track-visitor"></script>
 */
(function () {
  'use strict'

  var script = document.currentScript
  var SITE = (script && script.getAttribute('data-site')) || 'unknown'
  var ENDPOINT = (script && script.getAttribute('data-endpoint')) || '/api/track-visitor'

  // Generate or retrieve visitor ID
  function getVisitorId() {
    var key = '_aom_vid'
    var id = null
    try {
      id = localStorage.getItem(key)
    } catch (e) {}
    if (!id) {
      id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
      try {
        localStorage.setItem(key, id)
      } catch (e) {}
    }
    return id
  }

  var VID = getVisitorId()

  // Send event to API
  function send(event, extra) {
    var payload = {
      visitorId: VID,
      site: SITE,
      page: window.location.pathname,
      referrer: document.referrer || '',
      title: document.title || '',
      event: event,
      meta: extra || {},
    }

    // Use sendBeacon for reliability (survives page close)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, JSON.stringify(payload))
    } else {
      var xhr = new XMLHttpRequest()
      xhr.open('POST', ENDPOINT, true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.send(JSON.stringify(payload))
    }
  }

  // Track session start
  var sessionKey = '_aom_session'
  var lastSession = null
  try {
    lastSession = sessionStorage.getItem(sessionKey)
  } catch (e) {}

  if (!lastSession) {
    send('session_start')
    try {
      sessionStorage.setItem(sessionKey, Date.now().toString())
    } catch (e) {}
  }

  // Track page view
  send('page_view')

  // Track SPA route changes (pushState / popstate)
  var lastPath = window.location.pathname
  function checkRouteChange() {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname
      send('page_view')
    }
  }

  // Intercept pushState and replaceState
  var origPush = history.pushState
  var origReplace = history.replaceState
  history.pushState = function () {
    origPush.apply(this, arguments)
    checkRouteChange()
  }
  history.replaceState = function () {
    origReplace.apply(this, arguments)
    checkRouteChange()
  }
  window.addEventListener('popstate', checkRouteChange)

  // Auto-capture identity from form submissions
  document.addEventListener('submit', function (e) {
    var form = e.target
    if (!form) return

    var emailInput = form.querySelector('input[type="email"], input[name*="email"], input[name*="Email"]')
    var nameInput = form.querySelector('input[name*="name"], input[name*="Name"], input[name*="firstName"]')

    if (emailInput && emailInput.value) {
      send('identify', {
        email: emailInput.value,
        name: nameInput ? nameInput.value : null,
      })
    }
  }, true)

  // Auto-capture identity from mailto clicks (they typed their info in the contact drawer)
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href]') : null
    if (!link) return
    var href = link.getAttribute('href') || ''

    // Track phone clicks
    if (href.indexOf('tel:') === 0) {
      send('phone_click', { number: href.replace('tel:', '') })
    }

    // Track email clicks
    if (href.indexOf('mailto:') === 0) {
      send('email_click', { address: href.replace('mailto:', '').split('?')[0] })
    }

    // Track outbound clicks
    if (href.indexOf('http') === 0 && href.indexOf(window.location.hostname) === -1) {
      send('outbound_click', { url: href })
    }
  }, true)

  // Expose global for manual identity capture
  window.__aomTracker = {
    identify: function (email, name) {
      send('identify', { email: email, name: name || null })
    },
    track: function (event, meta) {
      send(event, meta || {})
    },
  }
})()
