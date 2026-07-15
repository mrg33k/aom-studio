import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { actionLabelFor } from '../src/dashboard/cv6kit/templateEngine.js'

test('shared bar actions use one accessible-name vocabulary', () => {
  assert.equal(actionLabelFor('search'), 'Search')
  assert.equal(actionLabelFor('openCommandK'), 'Search')
  assert.equal(actionLabelFor('openNav'), 'Menu')
  assert.equal(actionLabelFor('openProfile'), 'Profile')
  assert.equal(actionLabelFor('nav', 'back'), 'Back')
  assert.equal(actionLabelFor('closeThread'), 'Back')
  assert.equal(actionLabelFor('backToList'), 'Back')
})

test('the active CV6 stylesheet owns one desktop and mobile bar geometry', async () => {
  const css = await readFile(new URL('../src/dashboard/cv6next/cv6.css', import.meta.url), 'utf8')
  assert.match(css, /--cv6-topbar-height:80px/)
  assert.match(css, /--cv6-mobile-header-height:60px/)
  assert.match(css, /--cv6-bar-control-size:44px/)
  assert.match(css, /\.topbar[\s\S]*height:var\(--cv6-topbar-height\)/)
  assert.match(css, /\.mhdr[\s\S]*height:var\(--cv6-mobile-header-height\)/)
  assert.match(css, /:focus-visible[\s\S]*outline:2px solid var\(--accent\)/)
})
