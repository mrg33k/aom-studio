// GET /api/dashboard/claude-sessions
//
// Returns blocked or stalled Claude session metadata from ~/.claude/jobs.
// Reads state.json from each session subdirectory, filters for blocked/stalled,
// and returns structured data for display in CommandDeck.
//
// Response:
// {
//   sessions: [
//     {
//       name: "session-id",
//       state: "blocked|stalled|working|done",
//       detail: "reason or status message",
//       needs: "what it's waiting on",
//       suggestedReply: "suggested response text",
//       blocked: boolean,
//       stalled: boolean
//     }
//   ]
// }

import fs from 'fs';
import path from 'path';
import os from 'os';
import { verifyTenant, TenantAuthError } from '../_lib/verifyTenant.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  // ── Verify tenant (required for dashboard access) ────────────────────────────
  let tenantId = null;
  try {
    tenantId = await verifyTenant(req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // ── Read ~/.claude/jobs directory ──────────────────────────────────────────
  const jobsDir = path.join(os.homedir(), '.claude', 'jobs');

  let sessions = [];
  try {
    if (!fs.existsSync(jobsDir)) {
      return res.status(200).json({ sessions: [] });
    }

    const entries = fs.readdirSync(jobsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sessionDir = path.join(jobsDir, entry.name);
      const stateFile = path.join(sessionDir, 'state.json');

      try {
        if (!fs.existsSync(stateFile)) continue;

        const raw = fs.readFileSync(stateFile, 'utf8');
        const state = JSON.parse(raw);

        // Only include blocked or stalled sessions
        if (!state.blocked && !state.stalled) continue;

        sessions.push({
          name: entry.name,
          state: state.state || 'unknown',
          detail: state.detail || '',
          needs: state.needs || '',
          suggestedReply: state.suggestedReply || '',
          blocked: !!state.blocked,
          stalled: !!state.stalled,
        });
      } catch (err) {
        // Skip sessions with unparseable state.json; log silently.
        continue;
      }
    }

    // Sort by name (or date descending if needed in future)
    sessions.sort((a, b) => b.name.localeCompare(a.name));

    return res.status(200).json({ sessions });
  } catch (err) {
    console.error('[claude-sessions] Error reading jobs dir:', err);
    return res.status(500).json({ error: 'Failed to read sessions' });
  }
}
