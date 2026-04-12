#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the JSON file
const dataPath = join(__dirname, 'public', 'arsenal-municipality-data.json');
const rawData = readFileSync(dataPath, 'utf8');
const data = JSON.parse(rawData);

// Get the places array
const places = data.places;

// Filter municipalities with population between 100,000 and 500,000 (inclusive)
const filtered = places.filter(place => {
  const population = place.population_2020;
  return population >= 100000 && population <= 500000;
});

// Count the filtered municipalities
const count = filtered.length;

// Output only the count as requested
console.log(`Count: ${count}`);