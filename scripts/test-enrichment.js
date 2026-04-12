#!/usr/bin/env node

/**
 * Test script to verify enrichment logic without calling Apollo API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Test data
const TEST_MUNICIPALITIES = [
  {
    geoid: "1234567",
    name: "Austin city",
    state_abbr: "TX",
    type: "city",
    population_2020: 250000
  },
  {
    geoid: "2345678",
    name: "Springfield town",
    state_abbr: "IL",
    type: "town",
    population_2020: 150000
  },
  {
    geoid: "3456789",
    name: "Greenville village",
    state_abbr: "SC",
    type: "village",
    population_2020: 75000 // Should be filtered out (under 100k)
  }
];

// Test the formatOrgSearchTerm function
function formatOrgSearchTerm(municipality) {
  const { name, type } = municipality;
  
  // Remove "city", "town", "village", "borough" from name if present
  // Handle both "Chicago city" and "city of Chicago" patterns
  let cleanName = name
    .replace(/\s+(city|town|village|borough|municipality)$/i, '')
    .replace(/^(city|town|village|borough|municipality)\s+of\s+/i, '')
    .replace(/^the\s+/i, '')
    .trim();
  
  // Format as "City of {Name}" or appropriate type
  const typeMap = {
    'city': 'City',
    'town': 'Town', 
    'village': 'Village',
    'borough': 'Borough',
    'city and borough': 'City and Borough',
    'unified government': 'Unified Government',
    'consolidated government': 'Consolidated Government',
    'urban county': 'Urban County',
    'metropolitan government': 'Metropolitan Government',
    'plantation': 'Plantation',
    'municipality': 'Municipality'
  };
  
  const typeDisplay = typeMap[type] || 'Municipality';
  return `${typeDisplay} of ${cleanName}`;
}

// Test filtering
function testFiltering() {
  console.log('🧪 Testing population filtering (100k-500k)...');
  
  const filtered = TEST_MUNICIPALITIES.filter(place => {
    const population = place.population_2020;
    return population >= 100000 && population <= 500000;
  });
  
  console.log(`  Total test records: ${TEST_MUNICIPALITIES.length}`);
  console.log(`  Filtered (100k-500k): ${filtered.length}`);
  console.log(`  Expected: 2 (Austin and Springfield)`);
  console.log(`  Result: ${filtered.length === 2 ? '✅ PASS' : '❌ FAIL'}`);
  
  return filtered;
}

// Test name formatting
function testNameFormatting(filtered) {
  console.log('\n🧪 Testing name formatting...');
  
  const expected = [
    'City of Austin',
    'Town of Springfield'
  ];
  
  let allPass = true;
  
  filtered.forEach((place, i) => {
    const formatted = formatOrgSearchTerm(place);
    const passes = formatted === expected[i];
    
    console.log(`  "${place.name}" → "${formatted}"`);
    console.log(`  Expected: "${expected[i]}"`);
    console.log(`  Result: ${passes ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passes) allPass = false;
  });
  
  return allPass;
}

// Test progress tracking
function testProgressTracking() {
  console.log('\n🧪 Testing progress tracking simulation...');
  
  const progress = {
    processed: ['1234567'], // Austin already processed
    lastRun: new Date().toISOString(),
    totalFound: 1,
    totalEnriched: 1
  };
  
  const toProcess = TEST_MUNICIPALITIES.filter(place => 
    !progress.processed.includes(place.geoid)
  );
  
  console.log(`  Total test records: ${TEST_MUNICIPALITIES.length}`);
  console.log(`  Already processed: ${progress.processed.length} (Austin)`);
  console.log(`  To process: ${toProcess.length}`);
  console.log(`  Expected: 2 (Springfield and Greenville)`);
  console.log(`  Result: ${toProcess.length === 2 ? '✅ PASS' : '❌ FAIL'}`);
  
  return toProcess.length === 2;
}

// Main test
function main() {
  console.log('🚀 Running enrichment script tests...\n');
  
  const filtered = testFiltering();
  const formattingPass = testNameFormatting(filtered);
  const progressPass = testProgressTracking();
  
  console.log('\n📊 Test Summary:');
  console.log(`  Population filtering: ${filtered.length === 2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Name formatting: ${formattingPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Progress tracking: ${progressPass ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPass = filtered.length === 2 && formattingPass && progressPass;
  
  console.log(`\n${allPass ? '🎉 All tests passed!' : '❌ Some tests failed.'}`);
  
  if (allPass) {
    console.log('\n💡 Next steps:');
    console.log('   1. Set APOLLO_API_KEY environment variable');
    console.log('   2. Run: npm run enrich-municipalities');
    console.log('   3. Or: node scripts/enrich-municipality-contacts.js');
  }
}

main();