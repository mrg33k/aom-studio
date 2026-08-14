// GET /api/dashboard/voice-context-lookup?q=imessage
// Searches the codebase index for relevant files, scripts, and architecture.
// Used by Rex voice (Gemini function calling) to check what exists before speccing tasks.

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contextIndex = JSON.parse(readFileSync(join(__dirname, 'context-index.json'), 'utf-8'));

export default async function handler(req, res) {
  try {
    await verifyTenant('aom', req);
  } catch (e) {
    if (e instanceof TenantAuthError) return res.status(e.status).json({ error: e.message });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=300');

  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) return res.status(400).json({ error: 'q parameter required' });

  const terms = query.split(/\s+/).filter(Boolean);

  // Score each entry by how many terms match
  const scored = contextIndex.map(entry => {
    const searchable = [
      entry.name || '',
      entry.path || '',
      entry.desc || '',
      entry.section || '',
      entry.line || '',
      entry.type || '',
    ].join(' ').toLowerCase();

    let score = 0;
    for (const term of terms) {
      if (searchable.includes(term)) score++;
      // Bonus for exact name match
      if ((entry.name || '').toLowerCase().includes(term)) score += 2;
    }
    return { ...entry, score };
  }).filter(e => e.score > 0);

  // Sort by score descending, take top 15
  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, 15).map(({ score, ...rest }) => rest);

  return res.status(200).json({
    query,
    count: results.length,
    results,
  });
}
