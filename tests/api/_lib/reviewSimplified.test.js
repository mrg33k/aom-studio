// Regression guard — review simplified (Patrik 2026-07-18): the review loop is
// download-or-send-changes. Approve/Dismiss buttons must stay gone from the live
// Files/review surface (organize.html + Organize JSX), send-changes and download
// must remain, and download must clear a waiting item's review flag (silent
// approve) so the NEEDS REVIEW badge drains. Restore-on-dismissed stays for
// legacy decided rows.
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const tpl = readFileSync(path.join(root, 'src/dashboard/cv6next/templates/organize.html'), 'utf8')
const desktop = readFileSync(path.join(root, 'src/dashboard/cv6next/OrganizeDesktop.jsx'), 'utf8')
const mobile = readFileSync(path.join(root, 'src/dashboard/cv6next/OrganizeMobile.jsx'), 'utf8')

test('organize template has no Approve or Dismiss verdict buttons', () => {
  assert.ok(!tpl.includes('data-action="approve"'), 'Approve button must not come back')
  assert.ok(!tpl.includes('data-action="dismiss"'), 'Dismiss button must not come back')
})

test('organize template keeps send-changes and download on both surfaces', () => {
  const changes = tpl.split('data-action="requestChanges"').length - 1
  const download = tpl.split('data-action="download"').length - 1
  assert.ok(changes >= 2, `requestChanges on desktop AND mobile (found ${changes})`)
  assert.ok(download >= 2, `download on desktop AND mobile (found ${download})`)
})

test('legacy dismissed rows keep their Restore affordance', () => {
  assert.ok(tpl.includes('data-action="restoreDismiss"'), 'restore stays for old dismissed rows')
})

test('JSX surfaces drop the approve/dismiss action mappings', () => {
  for (const [name, src] of [['OrganizeDesktop', desktop], ['OrganizeMobile', mobile]]) {
    assert.ok(!/^\s*approve: \(/m.test(src), `${name}: approve mapping gone`)
    assert.ok(!/^\s*dismiss: \(/m.test(src), `${name}: dismiss mapping gone`)
  }
})

test('download clears a waiting item review flag (silent approve)', () => {
  for (const [name, src] of [['OrganizeDesktop', desktop], ['OrganizeMobile', mobile]]) {
    const dl = src.slice(src.indexOf('download: (id) => {'))
    assert.ok(dl.includes('review.actions.approve(id)'), `${name}: download drains the waiting badge`)
    assert.ok(dl.indexOf('review.actions.approve(id)') < dl.indexOf('},'), `${name}: approve is inside the download handler`)
  }
})

test('keyboard approve shortcut is gone with the button', () => {
  assert.ok(!desktop.includes("e.key === 'a'"), 'the a-to-approve key handler left with the Approve button')
  assert.ok(!desktop.includes("['a', 'approve']"), 'the a hint chip left too')
})
