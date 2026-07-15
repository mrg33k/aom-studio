import test from 'node:test'
import assert from 'node:assert/strict'
import { cornerLogoLoaderMarkup } from '../src/dashboard/cv6kit/cornerLogoLoaderMarkup.js'
import { setActionPressed } from '../src/dashboard/cv6kit/templateEngine.js'

test('cornerLogoLoaderMarkup emits the shared mark without a generic spinner', () => {
  const html = cornerLogoLoaderMarkup('Loading <file>…', {
    compact: true,
    paper: true,
    waitAttribute: 'data-pdf-wait',
  })

  assert.match(html, /cv6-logo-loader__mark/)
  assert.match(html, /cv6-logo-loader__fill/)
  assert.match(html, /data-pdf-wait/)
  assert.match(html, /Loading &lt;file&gt;…/)
  assert.doesNotMatch(html, /aspin|spinner|<svg/i)
})

test('setActionPressed stamps and clears the template action state', () => {
  const classes = new Set()
  const attributes = new Map()
  const el = {
    classList: {
      toggle(name, on) { if (on) classes.add(name); else classes.delete(name) },
    },
    setAttribute(name, value) { attributes.set(name, value) },
  }

  setActionPressed(el, true)
  assert.equal(attributes.get('data-cv6-pressed'), 'true')
  assert.equal(classes.has('is-pressed'), true)

  setActionPressed(el, false)
  assert.equal(attributes.get('data-cv6-pressed'), 'false')
  assert.equal(classes.has('is-pressed'), false)
})
