// Slug → Gmail q= mapping for the 7 Mail Room buckets.
// Returns { q, postFilter } — postFilter is optional, applied to fetched
// messages by /list.js for buckets that can't be expressed in Gmail's q=
// alone (Awaiting Reply needs thread-tail inspection).

const NOISE = [
  '-from:me',
  '-category:promotions',
  '-category:social',
  '-category:updates',
  '-category:forums',
  '-label:list',
].join(' ')

export const BUCKET_SLUGS = [
  'awaiting-reply',
  'today',
  'clients',
  'threads',
  'prospects',
  'sent',
  'all',
]

export function buildBucketQuery(slug, ctx = {}) {
  const { account_email, client_emails = [], prospect_emails = [] } = ctx
  switch (slug) {
    case 'today':
      return { q: `${NOISE} newer_than:1d` }
    case 'all':
      return { q: `${NOISE} newer_than:10d` }
    case 'sent':
      return { q: `from:${account_email} newer_than:10d` }
    case 'awaiting-reply':
      return { q: `${NOISE} newer_than:30d`, postFilter: 'awaiting' }
    case 'threads':
      return { q: `from:${account_email} newer_than:30d`, postFilter: 'threads' }
    case 'clients': {
      if (!client_emails.length) return { q: 'in:inbox -in:all-mail', postFilter: 'empty' }
      const fromExpr = client_emails.map(e => `from:${e}`).join(' OR ')
      return { q: `${NOISE} (${fromExpr}) newer_than:30d` }
    }
    case 'prospects': {
      if (!prospect_emails.length) return { q: 'in:inbox -in:all-mail', postFilter: 'empty' }
      const fromExpr = prospect_emails.map(e => `from:${e}`).join(' OR ')
      return { q: `${NOISE} (${fromExpr}) newer_than:30d` }
    }
    default:
      throw new Error(`unknown bucket: ${slug}`)
  }
}
