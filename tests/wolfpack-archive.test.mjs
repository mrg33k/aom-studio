import test from 'node:test'
import assert from 'node:assert/strict'
import { assetGroupKey, canonicalAssetKey, pickLargestVariant, extensionFor, loadPage, srcsetUrls } from '../scripts/archive-wolfpack-current-site.mjs'

test('groups GoDaddy width variants as one source asset', () => {
  const a = new URL('https://img1.wsimg.com/isteam/ip/id/photo.jpg/:/rs=w:450,m')
  const b = new URL('https://img1.wsimg.com/isteam/ip/id/photo.jpg/:/rs=w:1920,m')
  assert.equal(canonicalAssetKey(a), canonicalAssetKey(b))
})

test('keeps the largest GoDaddy variant', () => {
  const urls = ['https://img1.wsimg.com/x/:/rs=w:450,m', 'https://img1.wsimg.com/x/:/rs=w:1920,m']
  assert.match(pickLargestVariant(urls), /w:1920/)
})

test('uses response type when the CDN URL has no suffix', () => {
  assert.equal(extensionFor('image/webp', new URL('https://img1.wsimg.com/x')), '.webp')
})

test('loads pages without requiring an idle network', async () => {
  const calls = []
  await loadPage({
    goto: async (...args) => calls.push(args),
    waitForTimeout: async (milliseconds) => calls.push(['wait', milliseconds]),
  }, 'https://wolfpackcompanies.com/')
  assert.deepEqual(calls, [
    ['https://wolfpackcompanies.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 }],
    ['wait', 1_000],
  ])
})

test('keeps GoDaddy transform commas inside each srcset URL', () => {
  const urls = srcsetUrls('https://img1.wsimg.com/a/:/rs=w:365,h:365,cg:true,m, https://img1.wsimg.com/a/:/rs=w:1536,h:1536,cg:true,m')
  assert.deepEqual(urls, [
    'https://img1.wsimg.com/a/:/rs=w:365,h:365,cg:true,m',
    'https://img1.wsimg.com/a/:/rs=w:1536,h:1536,cg:true,m',
  ])
})

test('keeps non-GoDaddy performance image URLs distinct', () => {
  const a = new URL('https://maps.googleapis.com/maps/vt?x=1&y=1')
  const b = new URL('https://maps.googleapis.com/maps/vt?x=1&y=2')
  assert.notEqual(assetGroupKey(a), assetGroupKey(b))
})
