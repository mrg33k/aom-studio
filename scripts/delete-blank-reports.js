#!/usr/bin/env node
// One-time cleanup: delete 5 blank reports (file_url=null) from Space Rising Arizona tenant.
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/delete-blank-reports.js
// Or rely on the defaults below (from env.prod).

const SUPABASE_URL = process.env.SOURCING_SUPABASE_URL || 'https://kzzvjtthknsozktmpvak.supabase.co';
const SUPABASE_KEY = process.env.SOURCING_SUPABASE_SERVICE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing SOURCING_SUPABASE_SERVICE_KEY in env');
  process.exit(1);
}

const SPACE_RISING_TENANT_ID = '91dac63a-9ae2-49ea-b15d-4209c55f225f';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

async function run() {
  // 1. Fetch the 5 blank reports (no file_url) for Space Rising Arizona
  const listUrl = `${SUPABASE_URL}/rest/v1/directory_reports?tenant_id=eq.${SPACE_RISING_TENANT_ID}&file_url=is.null&select=id,title,file_url`;
  console.log('Fetching blank reports for Space Rising Arizona...');
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    const text = await listRes.text();
    console.error('Fetch failed:', listRes.status, text);
    process.exit(1);
  }
  const reports = await listRes.json();
  console.log(`Found ${reports.length} blank report(s):`);
  for (const r of reports) {
    console.log(`  - ${r.id} | "${r.title}"`);
  }

  if (reports.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  // 2. Delete them all (no file_url means no storage cleanup needed)
  const ids = reports.map(r => r.id);
  const deleteUrl = `${SUPABASE_URL}/rest/v1/directory_reports?tenant_id=eq.${SPACE_RISING_TENANT_ID}&file_url=is.null`;
  console.log('\nDeleting...');
  const delRes = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { ...headers, 'Prefer': 'return=representation' },
  });

  if (!delRes.ok) {
    const text = await delRes.text();
    console.error('Delete failed:', delRes.status, text);
    process.exit(1);
  }

  const deleted = await delRes.json();
  console.log(`Deleted ${deleted.length} report(s):`);
  for (const r of deleted) {
    console.log(`  ✓ "${r.title}"`);
  }

  // 3. Verify
  const verifyRes = await fetch(listUrl, { headers });
  const remaining = await verifyRes.json();
  console.log(`\nVerification: ${remaining.length} blank reports remaining (expected 0).`);
  if (remaining.length !== 0) {
    console.error('ERROR: Some blank reports were not deleted.');
    process.exit(1);
  }
  console.log('Done. All 5 blank reports permanently deleted.');
}

run().catch(err => { console.error(err); process.exit(1); });
