#!/usr/bin/env node

/**
 * enrich-municipality-contacts.js
 *
 * Enriches municipalities (50k+ population) with contact data from Apollo.io
 * 
 * Steps:
 * 1. Filter 19,475 records to municipalities with 50k+ population
 * 2. Format each municipality name into an org search term
 * 3. Hit Apollo's People Search API with title filters
 * 4. Write matched contacts back onto the original JSON records
 * 5. Use checkpoint file for re-runs
 * 
 * Run: node scripts/enrich-municipality-contacts.js
 * Requires: APOLLO_API_KEY environment variable
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Configuration
const DATA_FILE = path.join(ROOT, 'public', 'arsenal-municipality-data.json');
const PROGRESS_FILE = path.join(__dirname, '.enrich-progress.json');
const APOLLO_API_KEY = process.env.APOLLO_API_KEY;

if (!APOLLO_API_KEY) {
  console.error('❌ APOLLO_API_KEY environment variable is required');
  console.error('   Set it: export APOLLO_API_KEY=your_key_here');
  process.exit(1);
}

// Title filters for municipal government roles
const TITLE_FILTERS = [
  'city manager',
  'town manager',
  'village manager',
  'borough manager',
  'mayor',
  'city administrator',
  'town administrator',
  'village administrator',
  'borough administrator',
  'city clerk',
  'town clerk',
  'village clerk',
  'borough clerk',
  'city planner',
  'town planner',
  'village planner',
  'borough planner',
  'economic development director',
  'community development director',
  'public works director',
  'finance director',
  'city attorney',
  'town attorney',
  'village attorney',
  'borough attorney'
];

// Format municipality name for Apollo search
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

// Apollo People Search API call (two-step: search then bulk_match to reveal)
async function searchApolloContacts(orgName, stateAbbr) {
  const APOLLO_HEADERS = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Api-Key': APOLLO_API_KEY
  };

  try {
    // Step 1: search for people (returns obfuscated data + IDs)
    const searchResp = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
      method: 'POST',
      headers: APOLLO_HEADERS,
      body: JSON.stringify({
        q_organization_name: orgName,
        organization_locations: [stateAbbr],
        page: 1,
        per_page: 10,
        person_titles: TITLE_FILTERS
      })
    });

    if (!searchResp.ok) {
      console.error(`  Apollo search error: ${searchResp.status} ${searchResp.statusText}`);
      return [];
    }

    const searchData = await searchResp.json();
    if (!searchData.people || !Array.isArray(searchData.people) || searchData.people.length === 0) {
      return [];
    }

    // Step 2: bulk_match to reveal full names and emails
    const ids = searchData.people.map(p => ({ id: p.id }));
    const matchResp = await fetch('https://api.apollo.io/api/v1/people/bulk_match', {
      method: 'POST',
      headers: APOLLO_HEADERS,
      body: JSON.stringify({ reveal_personal_emails: true, details: ids })
    });

    if (!matchResp.ok) {
      console.error(`  Apollo bulk_match error: ${matchResp.status} ${matchResp.statusText}`);
      return [];
    }

    const matchData = await matchResp.json();
    if (!matchData.matches || !Array.isArray(matchData.matches)) {
      return [];
    }

    return matchData.matches
      .filter(person => {
        const email = person.email;
        return email && !email.includes('***') && email.includes('@');
      })
      .map(person => ({
        name: person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
        title: person.title || '',
        email: person.email || '',
        phone: (person.phone_numbers && person.phone_numbers[0]?.sanitized_number) || person.phone || '',
        linkedin_url: person.linkedin_url || '',
        source: 'apollo'
      }));

  } catch (error) {
    console.error(`  Apollo search failed: ${error.message}`);
    return [];
  }
}

// Load progress checkpoint
function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`Could not load progress file: ${error.message}`);
  }
  
  return {
    processed: [],
    lastRun: null,
    totalFound: 0,
    totalEnriched: 0
  };
}

// Save progress checkpoint
function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  } catch (error) {
    console.error(`Failed to save progress: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.log('📊 Loading municipality data...');
  
  // Load data
  const rawData = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(rawData);
  const places = data.places;
  
  console.log(`📊 Total municipalities: ${places.length.toLocaleString()}`);
  
  // Filter to 50k+ population
  const targetPlaces = places.filter(place => {
    const population = place.population_2020;
    return population >= 50000;
  });
  
  console.log(`🎯 Target municipalities (50k+): ${targetPlaces.length.toLocaleString()}`);
  
  // Load progress
  const progress = loadProgress();
  progress.lastRun = new Date().toISOString();
  
  // Filter out already processed
  const toProcess = targetPlaces.filter(place => 
    !progress.processed.includes(place.geoid)
  );
  
  console.log(`⚡ To process: ${toProcess.length.toLocaleString()} (${progress.processed.length} already processed)`);
  
  if (toProcess.length === 0) {
    console.log('✅ All target municipalities already processed.');
    return;
  }
  
  // Process in batches with delay to respect rate limits
  const BATCH_SIZE = 5;
  const DELAY_MS = 2000; // 2 seconds between batches
  
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(toProcess.length/BATCH_SIZE)} (${batch.length} items)`);
    
    // Process each municipality in batch
    for (const place of batch) {
      console.log(`  🔍 ${place.name}, ${place.state_abbr} (${place.population_2020.toLocaleString()} pop)`);
      
      const orgSearchTerm = formatOrgSearchTerm(place);
      console.log(`     Searching: "${orgSearchTerm}"`);
      
      const contacts = await searchApolloContacts(orgSearchTerm, place.state_abbr);
      
      if (contacts.length > 0) {
        console.log(`     ✅ Found ${contacts.length} contact(s)`);

        place.contacts = contacts;
        place.contact_name = contacts[0].name;
        place.contact_title = contacts[0].title;
        place.contact_email = contacts[0].email;
        place.contact_phone = contacts[0].phone;
        place.contact_source = 'apollo';
        place.contact_enriched_at = new Date().toISOString();

        progress.totalEnriched += contacts.length;
      } else {
        console.log(`     ❌ No contacts found`);
        place.contacts = [];
        place.contact_enriched_at = new Date().toISOString();
        place.contact_source = 'apollo_attempted';
      }
      
      // Mark as processed
      progress.processed.push(place.geoid);
      progress.totalFound = progress.processed.length;
      
      // Save progress after each item
      saveProgress(progress);
    }
    
    // Delay between batches (except after last batch)
    if (i + BATCH_SIZE < toProcess.length) {
      console.log(`\n⏳ Waiting ${DELAY_MS/1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  // Write updated data back to file
  console.log('\n💾 Saving updated data...');
  data.places = places; // Update with modified places
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('\n✅ Enrichment complete!');
  console.log(`📊 Summary:`);
  console.log(`   Total target municipalities: ${targetPlaces.length}`);
  console.log(`   Processed: ${progress.totalFound}`);
  console.log(`   Enriched with contacts: ${progress.totalEnriched}`);
  console.log(`   Success rate: ${((progress.totalEnriched / progress.totalFound) * 100).toFixed(1)}%`);
  
  // Update metadata
  if (!data.metadata.enrichment) {
    data.metadata.enrichment = {};
  }
  data.metadata.enrichment.last_run = new Date().toISOString();
  data.metadata.enrichment.target_population_band = '50k+';
  data.metadata.enrichment.target_count = targetPlaces.length;
  data.metadata.enrichment.processed_count = progress.totalFound;
  data.metadata.enrichment.enriched_count = progress.totalEnriched;
  data.metadata.enrichment.source = 'Apollo.io People Search API';
  data.metadata.enrichment.title_filters = TITLE_FILTERS;
  
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log('\n📝 Metadata updated.');
}

// Run with error handling
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});