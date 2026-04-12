# Municipality Contact Enrichment Script

## Overview

This script enriches US municipality data with contact information for key government officials using the Apollo.io API. It targets municipalities with populations between 100,000 and 500,000 (784 total).

## Prerequisites

1. **Apollo.io API Key**: You need a valid Apollo.io API key with access to the People Search API.
2. **Node.js**: The script requires Node.js (ES modules).

## Setup

1. Set your Apollo API key as an environment variable:
   ```bash
   export APOLLO_API_KEY=your_apollo_api_key_here
   ```

2. Make the script executable:
   ```bash
   chmod +x scripts/enrich-municipality-contacts.js
   ```

## Usage

Run the script from the project root:
```bash
node scripts/enrich-municipality-contacts.js
```

Or directly:
```bash
./scripts/enrich-municipality-contacts.js
```

## What It Does

1. **Filters**: Selects 784 municipalities with population 100k-500k from the 19,475 total.
2. **Formats**: Converts municipality names to search terms (e.g., "Austin city" → "City of Austin").
3. **Searches**: Queries Apollo.io People Search API for municipal government roles:
   - City/Town/Village/Borough Managers
   - Mayors
   - Administrators
   - Clerks
   - Planners
   - Directors (Economic Development, Public Works, Finance)
   - Attorneys
4. **Updates**: Adds contact fields to the JSON data:
   - `contact_name`
   - `contact_title`
   - `contact_email`
   - `contact_phone`
   - `contact_source` (always "apollo")
   - `contact_enriched_at` (timestamp)

## Progress Tracking

The script uses a checkpoint file: `scripts/.enrich-progress.json`

- Tracks which GEOIDs have been processed
- Allows re-runs to skip already-processed municipalities
- Stores statistics about the enrichment process

## Rate Limiting

The script includes built-in rate limiting:
- Processes in batches of 5 municipalities
- 2-second delay between batches
- Respects Apollo.io API rate limits

## Output

Updated data is written back to: `public/arsenal-municipality-data.json`

The metadata section is updated with enrichment statistics:
```json
"enrichment": {
  "last_run": "2026-04-10T12:00:00.000Z",
  "target_population_band": "100k-500k",
  "target_count": 784,
  "processed_count": 784,
  "enriched_count": 450,
  "source": "Apollo.io People Search API",
  "title_filters": ["city manager", "town manager", ...]
}
```

## Notes

- **Email Redaction**: Apollo's free tier may return redacted emails (`j***@domain.com`). The script filters these out.
- **Success Rate**: Expect 50-70% success rate depending on Apollo data coverage.
- **Data Persistence**: Contacts are written directly to the JSON file, making them available to the frontend immediately.

## Integration with Frontend

The enriched contact fields are automatically displayed in:
- Municipality detail modal
- Table view (Contact column)
- CSV exports

## Troubleshooting

**Error: "APOLLO_API_KEY environment variable is required"**
- Set the environment variable: `export APOLLO_API_KEY=your_key`

**Error: API rate limits**
- The script includes delays; if you still hit limits, increase `DELAY_MS` in the script.

**No contacts found for a municipality**
- Apollo may not have data for smaller or less common municipalities
- Try manual search on Apollo.io website to verify coverage

## Related Files

- `public/arsenal-municipality-data.json` - Main data file
- `scripts/.enrich-progress.json` - Progress checkpoint
- `src/pages/MunicipalityDirectory.jsx` - Frontend component that uses the data