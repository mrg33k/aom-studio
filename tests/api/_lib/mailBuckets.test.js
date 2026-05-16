import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBucketQuery, BUCKET_SLUGS } from '../../../api/_lib/mailBuckets.js'

test('BUCKET_SLUGS has 7 in spec order', () => {
  assert.deepEqual(BUCKET_SLUGS, [
    'awaiting-reply','today','clients','threads','prospects','sent','all',
  ])
})

test('today bucket uses newer_than:1d + real-human noise filter', () => {
  const q = buildBucketQuery('today', { account_email: 'a@b.c' })
  assert.match(q.q, /newer_than:1d/)
  assert.match(q.q, /-category:promotions/)
  assert.match(q.q, /-from:me/)
})

test('sent bucket queries from:<account_email>', () => {
  const q = buildBucketQuery('sent', { account_email: 'hello@aom-inhouse.com' })
  assert.match(q.q, /from:hello@aom-inhouse\.com/)
})

test('all bucket = newer_than:10d real-human', () => {
  const q = buildBucketQuery('all', { account_email: 'a@b.c' })
  assert.match(q.q, /newer_than:10d/)
})

test('awaiting-reply carries postFilter=awaiting', () => {
  const q = buildBucketQuery('awaiting-reply', { account_email: 'a@b.c' })
  assert.equal(q.postFilter, 'awaiting')
})

test('clients with no seed returns postFilter=empty', () => {
  const q = buildBucketQuery('clients', { account_email: 'a@b.c' })
  assert.equal(q.postFilter, 'empty')
})

test('unknown slug throws', () => {
  assert.throws(() => buildBucketQuery('frobnicate', {}), /unknown bucket/)
})
