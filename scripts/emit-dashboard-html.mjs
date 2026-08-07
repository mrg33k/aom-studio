// Emit dist/dashboard.html — the dashboard's own entry document (Patrik 2026-08-06).
//
// WHY THIS EXISTS. "Add to Home Screen" on iOS takes the app's URL and name from the
// manifest and the apple-mobile-web-app-title THAT ARE IN THE DOCUMENT SAFARI PARSED.
// index.html ships the AOM marketing manifest (start_url "/") and swaps in the Corner
// one from a <head> script after load. Safari does not wait for that: Patrik's share
// sheet offered "AOM · https://www.aheadofmarket.com/" from the dashboard.
//
// Moguls does not have this problem because its manifest is baked into the served HTML.
// This gives /dashboard the same property. The head script still runs and writes the
// identical values, so it is idempotent — this just means the correct answer is already
// there before a single line of JavaScript executes.
//
// The alternative — "make the swap run earlier" — is not a fix. There is no point early
// enough: the share sheet can be opened at any moment, including before hydration.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'dist/index.html');
const OUT = resolve(root, 'dist/dashboard.html');

// Keep these in step with the 'corner' entry in index.html's SURFACES table.
const REPLACEMENTS = [
  [/(<link rel="manifest" href=")[^"]*(" data-fav="manifest")/, '$1/corner/manifest.json$2'],
  [/(<link rel="apple-touch-icon" href=")[^"]*(" data-fav="apple")/, '$1/brand/favicon/corner-180.png$2'],
  [/(<meta name="theme-color" content=")[^"]*(" data-fav="theme")/, '$1#0A0F1E$2'],
  [/(<meta name="apple-mobile-web-app-title" content=")[^"]*(" data-fav="title")/, '$1Corner$2'],
  [/(<link rel="canonical" href=")[^"]*(" data-fav="canonical")/, '$1https://www.aheadofmarket.com/dashboard$2'],
  [/<title>[^<]*<\/title>/, '<title>Corner — Your AI Team in a Dashboard</title>'],
];

const html = await readFile(SRC, 'utf8');
let out = html;
const missed = [];

for (const [pattern, replacement] of REPLACEMENTS) {
  if (!pattern.test(out)) { missed.push(String(pattern)); continue; }
  out = out.replace(pattern, replacement);
}

// Fail the build rather than ship a dashboard.html that quietly kept the AOM manifest —
// a silent miss here looks exactly like the bug it is meant to fix.
if (missed.length) {
  console.error('emit-dashboard-html: index.html no longer matches these patterns:');
  for (const m of missed) console.error('  ' + m);
  process.exit(1);
}

await writeFile(OUT, out, 'utf8');
console.log('emit-dashboard-html: wrote dist/dashboard.html with the Corner manifest baked in');
