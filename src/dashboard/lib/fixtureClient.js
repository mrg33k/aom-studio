// Fake Supabase client backed by JSON fixtures.
//
// Activated when VITE_USE_FIXTURES === '1' (see ./supabase.js).
// Run `npm run snapshot` to refresh the fixtures from prod.
//
// Implements just enough of @supabase/supabase-js for the dashboard's
// read path: `.from(table).select(cols).eq/in/order/limit/range/single/maybeSingle`.
// Mutations are no-ops; realtime is a no-op; auth returns a synthetic user.

// eager: true so JSON is inlined at build time; conditional gate in supabase.js
// keeps this module out of the prod bundle.
const fixtureMap = import.meta.glob('../__fixtures__/latest/*.json', {
  eager: true,
  import: 'default',
})

const fixtures = {}
for (const [path, data] of Object.entries(fixtureMap)) {
  const m = path.match(/\/([a-z_]+)\.json$/)
  if (!m) continue
  fixtures[m[1]] = Array.isArray(data) ? data : []
}

function passesFilter(row, f) {
  const v = row[f.col]
  switch (f.op) {
    case 'eq': return v === f.val
    case 'neq': return v !== f.val
    case 'in': return f.vals.includes(v)
    case 'gt': return v > f.val
    case 'gte': return v >= f.val
    case 'lt': return v < f.val
    case 'lte': return v <= f.val
    case 'is': return f.val === null ? v == null : v === f.val
    case 'like': return typeof v === 'string' && new RegExp(f.val.replace(/%/g, '.*')).test(v)
    case 'ilike': return typeof v === 'string' && new RegExp(f.val.replace(/%/g, '.*'), 'i').test(v)
    default: return true
  }
}

function makeQuery(table) {
  const state = {
    filters: [],
    orderBy: null,
    limit: null,
    range: null,
    single: false,
    maybeSingle: false,
  }
  const resolve = () => {
    let rows = (fixtures[table] || []).slice()
    rows = rows.filter(r => state.filters.every(f => passesFilter(r, f)))
    if (state.orderBy) {
      const { col, asc } = state.orderBy
      rows.sort((a, b) => {
        if (a[col] === b[col]) return 0
        if (a[col] == null) return asc ? -1 : 1
        if (b[col] == null) return asc ? 1 : -1
        return (a[col] < b[col] ? -1 : 1) * (asc ? 1 : -1)
      })
    }
    if (state.range) {
      const [a, b] = state.range
      rows = rows.slice(a, b + 1)
    }
    if (state.limit != null) rows = rows.slice(0, state.limit)
    if (state.single) {
      if (rows.length === 0) return { data: null, error: { message: 'No rows', code: 'PGRST116' } }
      return { data: rows[0], error: null }
    }
    if (state.maybeSingle) return { data: rows[0] || null, error: null }
    return { data: rows, error: null, count: rows.length }
  }
  const q = {
    select() { return q },
    eq(col, val) { state.filters.push({ op: 'eq', col, val }); return q },
    neq(col, val) { state.filters.push({ op: 'neq', col, val }); return q },
    in(col, vals) { state.filters.push({ op: 'in', col, vals }); return q },
    gt(col, val) { state.filters.push({ op: 'gt', col, val }); return q },
    gte(col, val) { state.filters.push({ op: 'gte', col, val }); return q },
    lt(col, val) { state.filters.push({ op: 'lt', col, val }); return q },
    lte(col, val) { state.filters.push({ op: 'lte', col, val }); return q },
    is(col, val) { state.filters.push({ op: 'is', col, val }); return q },
    like(col, val) { state.filters.push({ op: 'like', col, val }); return q },
    ilike(col, val) { state.filters.push({ op: 'ilike', col, val }); return q },
    not() { return q },
    or() { return q },
    order(col, opts) { state.orderBy = { col, asc: opts?.ascending !== false }; return q },
    limit(n) { state.limit = n; return q },
    range(a, b) { state.range = [a, b]; return q },
    single() { state.single = true; return q },
    maybeSingle() { state.maybeSingle = true; return q },
    then(onFulfilled, onRejected) {
      try { return Promise.resolve(resolve()).then(onFulfilled, onRejected) }
      catch (e) { return Promise.reject(e).catch(onRejected) }
    },
  }
  // Mutations: no-op but keep the chain alive
  const noopChain = {
    select() { return Promise.resolve({ data: null, error: null }) },
    eq() { return noopChain },
    match() { return noopChain },
    then(r) { return Promise.resolve({ data: null, error: null }).then(r) },
  }
  q.insert = () => Promise.resolve({ data: null, error: null })
  q.update = () => noopChain
  q.delete = () => noopChain
  q.upsert = () => Promise.resolve({ data: null, error: null })
  return q
}

function syntheticUser() {
  const tu = fixtures.tenant_users || []
  const patrik = tu.find(u => u.slug === 'patrik') || tu[0]
  return {
    id: patrik?.auth_user_id || patrik?.user_id || '00000000-0000-0000-0000-000000000000',
    email: patrik?.email || 'hello@aom-inhouse.com',
    user_metadata: {
      full_name: patrik?.name || 'Patrik Matheson',
      world: 'aom',
      onboarded: true,
      has_completed_onboarding: true,
    },
    app_metadata: {},
  }
}

const syntheticSession = () => ({
  user: syntheticUser(),
  access_token: 'fixture-token',
  refresh_token: 'fixture-refresh',
})

const fakeChannel = {
  on() { return fakeChannel },
  subscribe(cb) {
    if (typeof cb === 'function') queueMicrotask(() => cb('SUBSCRIBED'))
    return fakeChannel
  },
  unsubscribe() { return Promise.resolve({ error: null }) },
}

export const fixtureClient = {
  from: makeQuery,
  channel: () => fakeChannel,
  removeChannel: () => Promise.resolve({ error: null }),
  removeAllChannels: () => Promise.resolve(),
  rpc: () => Promise.resolve({ data: null, error: null }),
  auth: {
    async getSession() {
      return { data: { session: syntheticSession() }, error: null }
    },
    async getUser() {
      return { data: { user: syntheticUser() }, error: null }
    },
    onAuthStateChange(cb) {
      queueMicrotask(() => cb('SIGNED_IN', syntheticSession()))
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
    async signOut() { return { error: null } },
    async updateUser() { return { data: { user: syntheticUser() }, error: null } },
    async signInWithOAuth() { return { data: { url: null }, error: null } },
  },
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: { message: 'Mutations disabled in fixture mode' } }),
      download: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
}

export function fixtureSummary() {
  return Object.fromEntries(Object.entries(fixtures).map(([t, rows]) => [t, rows.length]))
}
