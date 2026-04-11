#!/usr/bin/env node
// Seed env_vars table from environment variables.
// Run manually: node scripts/seed-env-vars.js
// Reads secrets from process.env (Vercel env or local .env). Never commits secrets.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=minimal',
};

// Define what to seed. Values come from env vars, never hardcoded.
const seeds = [
  {
    scope: 'project',
    scope_id: 'sourcing',
    client_id: 'aom',
    key: 'SUPABASE_URL',
    env: 'SOURCING_SUPABASE_URL',
    fallback: 'https://kzzvjtthknsozktmpvak.supabase.co', // public URL, not a secret
  },
  {
    scope: 'project',
    scope_id: 'sourcing',
    client_id: 'aom',
    key: 'SUPABASE_SERVICE_KEY',
    env: 'SOURCING_SUPABASE_SERVICE_KEY',
  },
  {
    scope: 'project',
    scope_id: 'sourcing',
    client_id: 'aom',
    key: 'ALLOWED_TABLES',
    value: 'directory_companies,directory_members,directory_certifications,directory_tenants,directory_reports,directory_listings,directory_organizations,user_notification_preferences',
  },
];

async function seed() {
  let ok = 0;
  let failed = 0;

  for (const s of seeds) {
    const value = s.value || process.env[s.env] || s.fallback;
    if (!value) {
      console.error(`SKIP: ${s.key} -- env var ${s.env} not set and no fallback`);
      failed++;
      continue;
    }

    const row = {
      scope: s.scope,
      scope_id: s.scope_id,
      key: s.key,
      value,
      client_id: s.client_id,
      updated_at: new Date().toISOString(),
    };

    const url = `${SUPABASE_URL}/rest/v1/env_vars?on_conflict=scope,scope_id,key,client_id`;
    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(row) });

    if (r.ok) {
      console.log(`OK: ${s.scope}/${s.scope_id}/${s.key}`);
      ok++;
    } else {
      const text = await r.text();
      console.error(`FAIL: ${s.key} -- ${r.status} ${text}`);
      failed++;
    }
  }

  console.log(`\nDone. ${ok} seeded, ${failed} failed.`);

  // Verify: list all keys (names only)
  const verify = await fetch(
    `${SUPABASE_URL}/rest/v1/env_vars?select=scope,scope_id,key,updated_at&order=key.asc`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  if (verify.ok) {
    const rows = await verify.json();
    console.log('\nAll env_vars (names only):');
    for (const row of rows) {
      console.log(`  ${row.scope}/${row.scope_id}: ${row.key} (updated ${row.updated_at})`);
    }
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
