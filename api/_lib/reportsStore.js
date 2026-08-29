// Server-side client for the weekly-reports data plane, which lives on the
// corner-convex deployment (convex/reports.ts there). Same plain-fetch contract
// the dashboard uses in src/dashboard/cv6next/data/convexClient.js.

const CONVEX_URL = process.env.REPORTS_CONVEX_URL || 'https://neat-pony-216.convex.cloud';

export const REPORT_CLIENTS = ['wolfpack', 'ambition', 'kohrs', 'ella'];

async function convexCall(kind, path, args) {
  const res = await fetch(`${CONVEX_URL}/api/${kind}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, args: args || {}, format: 'json' }),
  });
  if (!res.ok) throw new Error(`convex ${kind} ${path}: HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.status !== 'success') {
    throw new Error(`convex ${kind} ${path}: ${(data && (data.errorMessage || data.status)) || 'malformed response'}`);
  }
  return data.value;
}

export function convexQuery(path, args) {
  return convexCall('query', path, args);
}

export function convexMutation(path, args) {
  return convexCall('mutation', path, args);
}
