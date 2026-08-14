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
  const _worldRaw = req.query?.world && String(req.query.world).trim();
  if (!_worldRaw) return res.status(401).json({ error: 'Missing client' });
  const world = _worldRaw.toLowerCase();
  let tenantId = null;
  try {
    tenantId = await verifyTenant(world, req);
  } catch (err) {
    if (err instanceof TenantAuthError) {
      return res.status(err.status).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Auth verification failed' });
  }

  // ── Studio tunnel first (Vercel prod has no disk) ───────────────────────────
  // The running Claude Code sessions live on the studio machine under
  // ~/.claude/jobs, which Vercel can't see. The rag tunnel reads them for us.
  // Local-fs below is the dev fallback (vercel dev on the studio box).
  const RAG_TUNNEL_URL = process.env.RAG_TUNNEL_URL || 'https://rag.aheadofmarket.com';
  try {
    const ragRes = await fetch(`${RAG_TUNNEL_URL}/command-deck-sessions`, {
      headers: { 'User-Agent': 'aom-vercel-proxy' },
    });
    if (ragRes.ok) {
      const data = await ragRes.json();
      return res.status(200).json({
        sessions: Array.isArray(data?.sessions) ? data.sessions : [],
        workers: Array.isArray(data?.workers) ? data.workers : [],
      });
    }
  } catch (err) {
    // network error -> local fallback
  }

  // ── Read ~/.claude/jobs directory (local dev fallback) ──────────────────────
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

        // Only include blocked or stalled sessions (state field is the source).
        const stateVal = String(state.state || '');
        if (stateVal !== 'blocked' && stateVal !== 'stalled') continue;

        sessions.push({
          name: state.name || entry.name,
          state: stateVal,
          intent: state.intent || '',
          detail: state.detail || '',
          needs: state.needs || '',
          suggestedReply: state.suggestedReply || '',
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
