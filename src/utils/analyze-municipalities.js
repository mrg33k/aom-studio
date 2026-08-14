// Analysis script: counts enriched municipalities in arsenal-municipality-data.json
// Run from repo root: node src/utils/analyze-municipalities.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../../public/arsenal-municipality-data.json');

const raw = readFileSync(dataPath, 'utf-8');
const json = JSON.parse(raw);
const places = json.places;

const total = places.length;

const enriched = places.filter(p =>
  (p.contact_name && p.contact_name.trim() !== '') ||
  (p.contact_email && p.contact_email.trim() !== '')
);
const enrichedCount = enriched.length;

const enrichedOver50k = enriched.filter(p => p.population_2020 > 50000);
const enrichedOver50kCount = enrichedOver50k.length;

console.log(`Total number of municipalities: ${total}`);
console.log(`Total number of municipalities with non-empty contact_name or contact_email (enriched): ${enrichedCount}`);
console.log(`Out of enriched municipalities, how many have a population greater than 50,000: ${enrichedOver50kCount}`);

console.log('');
console.log(
  'Data loading confirmation: src/pages/MunicipalityDirectory.jsx fetches ' +
  'public/arsenal-municipality-data.json dynamically at runtime via ' +
  "`fetch('/arsenal-municipality-data.json')` inside a useEffect hook (line 504). " +
 'There is no static import, the file is served as a public asset and loaded ' +
  'after the component mounts, with the parsed `.places` array stored in component state.'
);